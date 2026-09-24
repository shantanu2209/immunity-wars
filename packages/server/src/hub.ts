/**
 * THE HUB — every room on one relay, and the connections in them (P3.4).
 *
 * The room's rules are `@immunity-wars/room`'s pure reducer. This file is the part of a relay that
 * is not rules and not platform: it turns frames into room messages, keeps which connection is
 * which member, and sends each outbound message to the connections it is addressed to. It takes
 * a `Link` — anything that can send bytes and close — so the Node adapter (`node.ts`) is a few
 * lines around it, and Gate B's "the adapter is small enough to rewrite in a day" stays true.
 *
 * ============================================================================================
 * ONE MESSAGE AT A TIME, IN ARRIVAL ORDER
 * ============================================================================================
 *
 * Unpacking and packing are asynchronous (the platform's gzip streams). If two frames were handled
 * concurrently, a small one could overtake a large one, and two clients could receive two views in
 * different orders — ending on different states, which is the one failure Gate A exists to rule
 * out. So every frame, every close and every sweep joins one chain and is handled to the last byte
 * sent before the next begins. A relay of family games has no throughput to lose by it.
 * `hub.test.ts` makes a later frame finish unpacking first to show the order holds.
 *
 * ============================================================================================
 * WHAT THE HUB KEEPS, AND FOR HOW LONG
 * ============================================================================================
 *
 * Rooms, in memory, until `sweep` discards them after the grace period. Nothing is written
 * anywhere (brief §5); a name typed for a room dies with it. A ref is bound to a connection at
 * `join` or `create` and never sent back out (FINDINGS #77).
 *
 * ============================================================================================
 * THE LIMITS, AND THE ADDRESSES THEY ARE COUNTED BY (P3.5)
 * ============================================================================================
 *
 * The relay is on the open internet, where anyone can open a socket without knowing a code, so it
 * limits connections, messages and wrong codes (`LIMITS`). They are counted by network address,
 * which is the only handle a relay has on "the same sender", and it is held IN MEMORY ONLY, for as
 * long as the connection or the counting window lasts, and never logged: an IP address is personal
 * data under the DPDP Act.
 *
 * They are GENEROUS on purpose. Indian mobile networks put many unrelated customers behind one
 * shared address, and a family on one Wi-Fi shares one too, so a tight per-address limit would
 * lock real players out. They exist to stop a flood and to slow code guessing, not to meter play.
 */
import {
  CLIENT_FRAME_LIMIT,
  decodeClient,
  encode,
  pack,
  unpack,
  type ClientMessage,
  type ServerMessage,
} from '@immunity-wars/protocol';
import {
  createRoom,
  step,
  sweep,
  type Inbound,
  type Outbound,
  type RoomState,
} from '@immunity-wars/room';

/** One open connection, as the platform gives it: bytes out, and a way to end it. */
export interface Link {
  send(bytes: Uint8Array): void;
  close(code: number, reason: string): void;
}

/**
 * WHY A CONNECTION WAS CLOSED, in the WebSocket application range (4000–4999). Not player text:
 * a client maps each to its catalogue, as it does the protocol's error codes.
 */
export const CLOSE = {
  /** Another protocol or rules version. The frame before the close carries the relay's versions. */
  version: 4001,
  /** A frame that is not gzip, not UTF-8, too large unpacked, or not a message of this version. */
  malformed: 4002,
  /** `join` or `create` on a connection that is already in a room. */
  alreadyJoined: 4003,
  /** The same member joined again on another connection, which takes over from this one. */
  replaced: 4004,
  /** The member left the room, which is a decision and gives up their seats. */
  left: 4005,
  /** Too many connections: from this address, or on the whole relay. */
  busy: 4006,
  /** More messages than any person sends: over the burst, at the sustained rate. */
  tooFast: 4007,
  /** Too many wrong room codes from this address lately: try again in a few minutes. */
  slowDown: 4008,
  /** Connected, and never joined or created a room within the time allowed. */
  joinTimeout: 4009,
} as const;

export interface Limits {
  /** Connections open at once from one address. */
  readonly perAddress: number;
  /** Connections open at once on the whole relay. */
  readonly total: number;
  /** Messages a second one connection may send, sustained. */
  readonly messagesPerSecond: number;
  /** Messages one connection may send in a burst above the sustained rate. */
  readonly burst: number;
  /** Wrong room codes one address may try within `wrongCodeWindowMs`. */
  readonly wrongCodes: number;
  readonly wrongCodeWindowMs: number;
  /** How long a connection may stay open without being in a room. */
  readonly joinWithinMs: number;
}

/**
 * The limits a relay runs with unless a test says otherwise. Recommended to Shantanu on 24
 * September 2026 and built on as the default while the ruling is open (docs/for-P3.md §5).
 */
export const LIMITS: Limits = {
  perAddress: 32,
  total: 1000,
  messagesPerSecond: 10,
  burst: 30,
  wrongCodes: 20,
  wrongCodeWindowMs: 10 * 60 * 1000,
  joinWithinMs: 30 * 1000,
};

export interface HubOptions {
  /** The clock. Injected, so a test can move time and the platform decides where it comes from. */
  readonly now: () => number;
  /** A fresh room code. Injected, because randomness is the platform's, like the clock. */
  readonly mintCode: () => string;
  /**
   * The framing, which is the protocol's `pack` and `unpack` everywhere but in one test: the
   * ordering test replaces it with one whose timing it controls, because the order a relay keeps
   * is only demonstrable when a later frame can be made to finish unpacking first.
   */
  readonly codec?: Codec;
  readonly limits?: Limits;
}

export interface Codec {
  pack(text: string): Promise<Uint8Array>;
  unpack(bytes: Uint8Array, limit: number): Promise<string>;
}

const FRAMING: Codec = { pack, unpack };

interface Binding {
  readonly code: string;
  readonly ref: string;
}

/** What the limits need to know about one open link. The address never leaves this object. */
interface Counted {
  readonly address: string;
  readonly openedAt: number;
  tokens: number;
  refilledAt: number;
}

export class Hub {
  private readonly rooms = new Map<string, RoomState>();
  /** Every open link, and the member it speaks for once it has joined. */
  private readonly links = new Map<Link, Binding | null>();
  private work: Promise<void> = Promise.resolve();
  private readonly codec: Codec;
  private readonly limits: Limits;
  private readonly counted = new Map<Link, Counted>();
  private readonly perAddress = new Map<string, number>();
  private readonly wrongCodes = new Map<string, number[]>();

  constructor(private readonly options: HubOptions) {
    this.codec = options.codec ?? FRAMING;
    this.limits = options.limits ?? LIMITS;
  }

  /**
   * A connection opened, from `address`. Refused, and closed as `busy`, when that address or the
   * whole relay already has as many open as the limits allow. Returns whether it was let in.
   */
  open(link: Link, address = 'local'): boolean {
    const held = this.perAddress.get(address) ?? 0;
    if (this.counted.size >= this.limits.total || held >= this.limits.perAddress) {
      link.close(CLOSE.busy, 'busy');
      return false;
    }
    const now = this.options.now();
    this.perAddress.set(address, held + 1);
    this.counted.set(link, { address, openedAt: now, tokens: this.limits.burst, refilledAt: now });
    this.links.set(link, null);
    return true;
  }

  /** A frame arrived. Queued behind everything before it; see the header. */
  message(link: Link, bytes: Uint8Array): Promise<void> {
    // THE RATE IS JUDGED ON ARRIVAL, before the frame waits its turn: a flood must not be able to
    // fill the queue that everyone else's frames wait in.
    const c = this.counted.get(link);
    if (c) {
      const now = this.options.now();
      const earned = ((now - c.refilledAt) / 1000) * this.limits.messagesPerSecond;
      c.tokens = Math.min(this.limits.burst, c.tokens + earned);
      c.refilledAt = now;
      if (c.tokens < 1) {
        link.close(CLOSE.tooFast, 'tooFast');
        return Promise.resolve();
      }
      c.tokens -= 1;
    }
    return this.enqueue(() => this.handle(link, bytes));
  }

  /** The platform says this connection is gone. The member is AWAY, not gone (ruling 4). */
  closed(link: Link): Promise<void> {
    // Counted down at once, so a closed connection never holds a place another could take.
    const c = this.counted.get(link);
    if (c) {
      this.counted.delete(link);
      const left = (this.perAddress.get(c.address) ?? 1) - 1;
      if (left > 0) this.perAddress.set(c.address, left);
      else this.perAddress.delete(c.address);
    }
    return this.enqueue(async () => {
      const binding = this.links.get(link);
      this.links.delete(link);
      if (!binding) return;
      await this.apply(binding.code, { kind: 'disconnect', ref: binding.ref });
    });
  }

  /**
   * Discards every room whose grace period is over, closes connections that never joined a room
   * in the time allowed, and forgets wrong codes older than their window. The platform decides how
   * often to call it.
   */
  sweep(): Promise<void> {
    return this.enqueue(async () => {
      const now = this.options.now();
      for (const [code, room] of this.rooms) {
        if (sweep(room, now) === null) this.rooms.delete(code);
      }
      for (const [link, c] of this.counted) {
        if (this.links.get(link) === null && now - c.openedAt >= this.limits.joinWithinMs)
          link.close(CLOSE.joinTimeout, 'joinTimeout');
      }
      for (const address of [...this.wrongCodes.keys()]) this.recentWrongCodes(address, now);
      await Promise.resolve();
    });
  }

  /** How many rooms are held. For tests and for the numbers Gate B asks for; never a room's contents. */
  get roomCount(): number {
    return this.rooms.size;
  }

  /** A room's state, for tests that compare a relay game with the same game played locally. */
  roomState(code: string): RoomState | undefined {
    return this.rooms.get(code);
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    // A failure in one task must not stop the chain: every later message would then wait forever.
    const run = this.work.then(task);
    this.work = run.catch(() => undefined);
    return run;
  }

  private async handle(link: Link, bytes: Uint8Array): Promise<void> {
    if (!this.links.has(link)) return;
    let text: string;
    try {
      text = await this.codec.unpack(bytes, CLIENT_FRAME_LIMIT);
    } catch {
      link.close(CLOSE.malformed, 'malformed');
      return;
    }
    const decoded = decodeClient(text);
    if (!decoded.ok) {
      if (decoded.refusal.refused === 'version') {
        // The frame's header carries the relay's versions, which is what the peer reads.
        link.send(await this.codec.pack(encode({ kind: 'error', code: 'version' })));
        link.close(CLOSE.version, 'version');
      } else {
        link.close(CLOSE.malformed, 'malformed');
      }
      return;
    }
    await this.route(link, decoded.message);
  }

  private async route(link: Link, msg: ClientMessage): Promise<void> {
    const binding = this.links.get(link) ?? null;

    if (msg.kind === 'create' || msg.kind === 'join') {
      if (binding) {
        link.close(CLOSE.alreadyJoined, 'alreadyJoined');
        return;
      }
      // CODE GUESSING IS SLOWED, not stopped: an address that has tried too many wrong codes lately
      // is told to wait, whatever code it tries next, so a right guess cannot be told from a wrong one.
      const address = this.counted.get(link)?.address;
      const now = this.options.now();
      if (
        msg.kind === 'join' &&
        address !== undefined &&
        this.recentWrongCodes(address, now) >= this.limits.wrongCodes
      ) {
        link.close(CLOSE.slowDown, 'slowDown');
        return;
      }
      const code = msg.kind === 'create' ? this.newRoom() : normalise(msg.code);
      if (!this.rooms.has(code)) {
        if (address !== undefined)
          this.wrongCodes.set(address, [...(this.wrongCodes.get(address) ?? []), now]);
        await this.sendTo([link], { kind: 'error', code: 'noSuchRoom' });
        return;
      }
      // THE SAME MEMBER ON A NEW CONNECTION TAKES OVER. A phone that loses its network often
      // reconnects before the old socket is known to be dead; the old one is closed and forgotten
      // FIRST, so its close cannot mark as away a member who is here.
      for (const [other, b] of this.links) {
        if (b && b.code === code && b.ref === msg.ref) {
          this.links.set(other, null);
          other.close(CLOSE.replaced, 'replaced');
        }
      }
      this.links.set(link, { code, ref: msg.ref });
      await this.apply(code, { kind: 'join', ref: msg.ref, name: msg.name });
      return;
    }

    if (!binding) {
      // Not in a room: the room would say the same, but there is no room to ask.
      await this.sendTo(
        [link],
        msg.kind === 'action'
          ? { kind: 'result', id: msg.id, ok: false, code: 'notInRoom' }
          : { kind: 'error', code: 'notInRoom' },
      );
      return;
    }

    // The REF IS THE RELAY'S TO STAMP, from the binding; nothing the client sends can name one.
    const inbound: Inbound = { ...msg, ref: binding.ref };
    await this.apply(binding.code, inbound);
    if (msg.kind === 'leave') {
      this.links.set(link, null);
      link.close(CLOSE.left, 'left');
    }
  }

  /** Wrong codes from `address` still inside the window; older ones are forgotten here. */
  private recentWrongCodes(address: string, now: number): number {
    const recent = (this.wrongCodes.get(address) ?? []).filter(
      (t) => now - t < this.limits.wrongCodeWindowMs,
    );
    if (recent.length > 0) this.wrongCodes.set(address, recent);
    else this.wrongCodes.delete(address);
    return recent.length;
  }

  private newRoom(): string {
    // A collision is vanishingly rare at this scale, and checked anyway: two tables must never
    // share a code.
    let code = normalise(this.options.mintCode());
    while (this.rooms.has(code)) code = normalise(this.options.mintCode());
    this.rooms.set(code, createRoom(code, this.options.now()));
    return code;
  }

  private async apply(code: string, inbound: Inbound): Promise<void> {
    const room = this.rooms.get(code);
    if (!room) return;
    const { room: next, out } = step(room, inbound, this.options.now());
    this.rooms.set(code, next);
    await this.deliver(code, out);
  }

  /** Each message packed once, then sent to every link it is addressed to, in order. */
  private async deliver(code: string, out: readonly Outbound[]): Promise<void> {
    for (const o of out) {
      const to: Link[] = [];
      for (const [link, b] of this.links) {
        if (b?.code === code && (o.to === 'all' || o.to === b.ref)) to.push(link);
      }
      await this.sendTo(to, o.message as ServerMessage);
    }
  }

  private async sendTo(links: readonly Link[], message: ServerMessage): Promise<void> {
    if (links.length === 0) return;
    const bytes = await this.codec.pack(encode(message));
    for (const link of links) link.send(bytes);
  }
}

/** Codes are typed by people: case and stray spaces are not part of a code. */
export const normalise = (code: string): string => code.trim().toUpperCase();

/**
 * A ROOM CODE: six characters from an alphabet with nothing that reads as something else — no
 * 0/O, 1/I/L, 5/S, 2/Z, 8/B. Twenty-five characters, so about 244 million codes, drawn with the
 * platform's cryptographic randomness so that a code cannot be predicted from the last one.
 * Knowing a code is the only way into a room (ruling 2), so it must not be guessable in sequence.
 */
export const CODE_ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679';

export function mintCode(random: (n: number) => Uint8Array): string {
  let code = '';
  while (code.length < 6) {
    // Rejection sampling: 256 is not a multiple of 25, and a plain modulo would favour the first
    // six characters of the alphabet.
    for (const b of random(12)) {
      if (b < 250 && code.length < 6) code += CODE_ALPHABET[b % 25] ?? '';
    }
  }
  return code;
}
