/**
 * THE HUB, held to what a relay must never get wrong, each with a way to make it fail on purpose
 * (`tools/ci/selftest.ts`).
 *
 * Fake links and a codec with no compression: nothing here needs a socket, which is the point of
 * the hub being the relay without its platform. `relay.test.ts` plays the same things over real
 * sockets.
 */
import {
  PROTOCOL_VERSION,
  RULES_VERSION,
  decodeServer,
  encode,
  type ClientMessage,
  type ServerMessage,
} from '@immunity-wars/protocol';
import { GRACE_MS } from '@immunity-wars/room';
import { describe, expect, it } from 'vitest';

import {
  CLOSE,
  CODE_ALPHABET,
  Hub,
  LIMITS,
  mintCode,
  type Codec,
  type Limits,
  type Link,
} from './hub.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** No compression, and an unpack that takes as long as `delay` says for each frame. */
const plain = (delay: (text: string) => number = () => 0): Codec => ({
  pack: (text) => Promise.resolve(encoder.encode(text)),
  unpack: (bytes) => {
    const text = decoder.decode(bytes);
    return new Promise((resolve) => setTimeout(() => resolve(text), delay(text)));
  },
});

class FakeLink implements Link {
  readonly raw: string[] = [];
  closedWith: number | null = null;
  send(bytes: Uint8Array): void {
    this.raw.push(decoder.decode(bytes));
  }
  close(code: number): void {
    this.closedWith = code;
  }
  get got(): ServerMessage[] {
    return this.raw.flatMap((t) => {
      const d = decodeServer(t);
      return d.ok ? [d.message] : [];
    });
  }
  lastRoom(): Extract<ServerMessage, { kind: 'room' }>['room'] | undefined {
    const rooms = this.got.flatMap((m) => (m.kind === 'room' ? [m.room] : []));
    return rooms[rooms.length - 1];
  }
}

const frame = (m: ClientMessage): Uint8Array => encoder.encode(encode(m));

function makeHub(
  codec: Codec = plain(),
  limits: Limits = LIMITS,
): { hub: Hub; clock: { t: number } } {
  const clock = { t: 1_000_000 };
  let n = 0;
  const hub = new Hub({
    now: () => clock.t,
    mintCode: () => `ROOM${String((n += 1))}`,
    codec,
    limits,
  });
  return { hub, clock };
}

async function opened(hub: Hub, ref: string, code?: string): Promise<FakeLink> {
  const link = new FakeLink();
  hub.open(link);
  await hub.message(
    link,
    frame(
      code === undefined
        ? { kind: 'create', ref, name: ref }
        : { kind: 'join', code, ref, name: ref },
    ),
  );
  return link;
}

describe('the order a relay keeps', () => {
  it("handles one link's frames in arrival order, even when a later one unpacks first", async () => {
    // The claim takes 30 ms to unpack and the release none. Handled as they FINISH unpacking, the
    // release would come first, find nothing to release, and the claim would then stand: the
    // player asked for a free seat and is left holding it.
    const { hub } = makeHub(plain((t) => (t.includes('"claimSeat"') ? 30 : 0)));
    const a = await opened(hub, 'p_a');
    const code = a.lastRoom()?.code ?? '';
    await Promise.all([
      hub.message(a, frame({ kind: 'claimSeat', seat: 'bcell' })),
      hub.message(a, frame({ kind: 'releaseSeat', seat: 'bcell' })),
    ]);
    expect(hub.roomState(code)?.members[0]?.seats).toEqual([]);
    expect(a.lastRoom()?.freeSeats).toContain('bcell');
  });
});

describe('a member on a new connection', () => {
  it("takes over from the old one, and the old one's close does not mark them away", async () => {
    const { hub } = makeHub();
    const first = await opened(hub, 'p_a');
    const code = first.lastRoom()?.code ?? '';
    const second = await opened(hub, 'p_a', code);
    expect(first.closedWith).toBe(CLOSE.replaced);
    // The platform reports the old socket's close AFTER the new one is in. It must change nothing.
    await hub.closed(first);
    expect(hub.roomState(code)?.members.map((m) => m.connected)).toEqual([true]);
    expect(second.closedWith).toBeNull();
  });

  // The permitting twin: a close that is NOT a takeover must still mark the member away.
  it('is marked away when its only connection closes', async () => {
    const { hub } = makeHub();
    const a = await opened(hub, 'p_a');
    const code = a.lastRoom()?.code ?? '';
    await hub.closed(a);
    expect(hub.roomState(code)?.members.map((m) => m.connected)).toEqual([false]);
  });
});

describe('a peer on another version', () => {
  it("is answered in the relay's own versions, closed, and changes nothing", async () => {
    const { hub } = makeHub();
    const link = new FakeLink();
    hub.open(link);
    const body = { kind: 'create', ref: 'p_old', name: 'Old' };
    await hub.message(
      link,
      encoder.encode(JSON.stringify({ v: PROTOCOL_VERSION + 1, rules: RULES_VERSION, ...body })),
    );
    expect(link.closedWith).toBe(CLOSE.version);
    // What the peer reads is the header: the relay's versions, so it can say which side is behind.
    const header = JSON.parse(link.raw[0] ?? '{}') as { v?: number; rules?: string };
    expect(header).toMatchObject({ v: PROTOCOL_VERSION, rules: RULES_VERSION });
    expect(hub.roomCount).toBe(0);
  });
});

describe('a frame that is not a message', () => {
  it('closes that link alone, and the relay goes on serving', async () => {
    const { hub } = makeHub();
    const bad = new FakeLink();
    hub.open(bad);
    await hub.message(bad, encoder.encode('{"not":"a message"'));
    expect(bad.closedWith).toBe(CLOSE.malformed);
    const good = await opened(hub, 'p_a');
    expect(good.lastRoom()?.members).toHaveLength(1);
  });
});

describe('a join the room refuses', () => {
  // The hub binds a link to its room BEFORE the room rules on the join, so a refused joiner stayed
  // bound and received every broadcast after it: the room, its members' names, the game. Found
  // building the ruling that newcomers wait for the next game (FINDINGS #87).
  it('leaves the refused connection hearing nothing more from the room', async () => {
    const { hub } = makeHub();
    const a = await opened(hub, 'p_a');
    const code = a.lastRoom()?.code ?? '';
    await hub.message(a, frame({ kind: 'claimSeat', seat: 'bcell' }));
    await hub.message(a, frame({ kind: 'start', difficulty: 'training' }));
    const late = await opened(hub, 'p_late', code);
    expect(late.got).toEqual([{ kind: 'error', code: 'lobbyClosed' }]);
    await hub.message(a, frame({ kind: 'action', id: 1, action: { action: 'draw' } }));
    expect(late.got).toHaveLength(1);
  });

  // The permitting twin: an accepted join keeps hearing the room.
  it('keeps an accepted member hearing the room', async () => {
    const { hub } = makeHub();
    const a = await opened(hub, 'p_a');
    const b = await opened(hub, 'p_b', a.lastRoom()?.code ?? '');
    const heard = b.got.length;
    await hub.message(a, frame({ kind: 'claimSeat', seat: 'bcell' }));
    expect(b.got.length).toBeGreaterThan(heard);
  });
});

describe('room codes', () => {
  it('are refused when nobody holds them', async () => {
    const { hub } = makeHub();
    const link = await opened(hub, 'p_a', 'NOSUCH');
    expect(link.got).toEqual([{ kind: 'error', code: 'noSuchRoom' }]);
  });

  it('are typed by people, so case and stray spaces are not part of a code', async () => {
    const { hub } = makeHub();
    const a = await opened(hub, 'p_a');
    const code = a.lastRoom()?.code ?? '';
    const b = await opened(hub, 'p_b', `  ${code.toLowerCase()} `);
    expect(b.lastRoom()?.members).toHaveLength(2);
  });

  it('stop working once the room is discarded after its grace period (Gate A)', async () => {
    const { hub, clock } = makeHub();
    const a = await opened(hub, 'p_a');
    const code = a.lastRoom()?.code ?? '';
    await hub.closed(a);
    // Inside the grace period the room is kept: the permitting half.
    clock.t += GRACE_MS - 1;
    await hub.sweep();
    expect(hub.roomCount).toBe(1);
    clock.t += 1;
    await hub.sweep();
    expect(hub.roomCount).toBe(0);
    const back = await opened(hub, 'p_a', code);
    expect(back.got).toEqual([{ kind: 'error', code: 'noSuchRoom' }]);
  });

  it('are six characters from the unambiguous alphabet, with no modulo bias', () => {
    // 250 to 255 are the bytes a plain modulo would fold onto the first six characters; they are
    // skipped, so the code is the alphabet's first six, taken from 0 to 5.
    const bytes = [250, 251, 252, 253, 254, 255, 0, 1, 2, 3, 4, 5];
    const code = mintCode(() => Uint8Array.from(bytes));
    expect(code).toBe(CODE_ALPHABET.slice(0, 6));
    const random = mintCode((n) => crypto.getRandomValues(new Uint8Array(n)));
    expect(random).toMatch(new RegExp(`^[${CODE_ALPHABET}]{6}$`));
  });
});

/**
 * THE LIMITS (P3.5), each with its permitted twin: a limit that refused everyone would pass every
 * "is refused" test, so each also shows the next person, or the same person later, getting in.
 */
describe('the limits', () => {
  const small: Limits = {
    perAddress: 2,
    total: 3,
    messagesPerSecond: 2,
    burst: 3,
    wrongCodes: 2,
    wrongCodeWindowMs: 60_000,
    joinWithinMs: 30_000,
  };

  it('refuses a connection past the per-address limit, and not one from another address', () => {
    const { hub } = makeHub(plain(), small);
    const [a1, a2, a3, b1] = [new FakeLink(), new FakeLink(), new FakeLink(), new FakeLink()];
    expect(hub.open(a1, 'A')).toBe(true);
    expect(hub.open(a2, 'A')).toBe(true);
    expect(hub.open(a3, 'A')).toBe(false);
    expect(a3.closedWith).toBe(CLOSE.busy);
    expect(hub.open(b1, 'B')).toBe(true);
  });

  it('lets an address back in once one of its connections has closed', async () => {
    const { hub } = makeHub(plain(), small);
    const [a1, a2, a3] = [new FakeLink(), new FakeLink(), new FakeLink()];
    hub.open(a1, 'A');
    hub.open(a2, 'A');
    await hub.closed(a1);
    expect(hub.open(a3, 'A')).toBe(true);
  });

  it('refuses a connection past the whole relay limit, from any address', () => {
    const { hub } = makeHub(plain(), small);
    for (const address of ['A', 'B', 'C']) expect(hub.open(new FakeLink(), address)).toBe(true);
    const late = new FakeLink();
    expect(hub.open(late, 'D')).toBe(false);
    expect(late.closedWith).toBe(CLOSE.busy);
  });

  it('closes a connection that sends past its burst at once, and not one that keeps to the rate', async () => {
    const { hub, clock } = makeHub(plain(), small);
    const flood = await opened(hub, 'p_flood');
    // The create spent one of three; two more fit the burst, and the next does not.
    await hub.message(flood, frame({ kind: 'claimSeat', seat: 'bcell' }));
    await hub.message(flood, frame({ kind: 'claimSeat', seat: 'nk' }));
    expect(flood.closedWith).toBeNull();
    await hub.message(flood, frame({ kind: 'claimSeat', seat: 'tcell' }));
    expect(flood.closedWith).toBe(CLOSE.tooFast);

    const steady = await opened(hub, 'p_steady');
    for (let i = 0; i < 10; i += 1) {
      clock.t += 500; // two a second, the sustained rate
      await hub.message(steady, frame({ kind: 'releaseSeat', seat: 'bcell' }));
    }
    expect(steady.closedWith).toBeNull();
  });

  it('makes an address wait after too many wrong codes, and not a different address', async () => {
    const { hub, clock } = makeHub(plain(), small);
    const room = await opened(hub, 'p_host');
    const code = room.lastRoom()?.code ?? '';
    const guesser = new FakeLink();
    hub.open(guesser, 'G');
    await hub.message(guesser, frame({ kind: 'join', code: 'WRONG1', ref: 'p_g', name: 'G' }));
    await hub.message(guesser, frame({ kind: 'join', code: 'WRONG2', ref: 'p_g', name: 'G' }));
    // Even the RIGHT code is refused now, so a hit cannot be told from a miss.
    clock.t += 1_000;
    await hub.message(guesser, frame({ kind: 'join', code, ref: 'p_g', name: 'G' }));
    expect(guesser.closedWith).toBe(CLOSE.slowDown);
    // As the platform would, once the socket the hub closed is gone.
    await hub.closed(guesser);

    const friend = new FakeLink();
    hub.open(friend, 'F');
    await hub.message(friend, frame({ kind: 'join', code, ref: 'p_f', name: 'F' }));
    expect(friend.lastRoom()?.members).toHaveLength(2);

    // And the same address is let back in once the window has passed.
    clock.t += small.wrongCodeWindowMs;
    const later = new FakeLink();
    hub.open(later, 'G');
    await hub.message(later, frame({ kind: 'join', code, ref: 'p_g', name: 'G' }));
    expect(later.closedWith).toBeNull();
    expect(later.lastRoom()?.members).toHaveLength(3);
  });

  it('closes a connection that never joins a room in time, and not one that did', async () => {
    const { hub, clock } = makeHub(plain(), small);
    const idle = new FakeLink();
    hub.open(idle, 'I');
    const member = await opened(hub, 'p_m');
    clock.t += small.joinWithinMs;
    await hub.sweep();
    expect(idle.closedWith).toBe(CLOSE.joinTimeout);
    expect(member.closedWith).toBeNull();
  });
});
