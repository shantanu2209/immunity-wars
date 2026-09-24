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

import { CLOSE, CODE_ALPHABET, Hub, mintCode, type Codec, type Link } from './hub.js';

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

function makeHub(codec: Codec = plain()): { hub: Hub; clock: { t: number } } {
  const clock = { t: 1_000_000 };
  let n = 0;
  const hub = new Hub({
    now: () => clock.t,
    mintCode: () => `ROOM${String((n += 1))}`,
    codec,
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
