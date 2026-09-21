/**
 * THE ROOM — Phase 3's rules for who is in the game, written as data and a pure reducer
 * (docs/PHASE3_BRIEF.md §5, P3.1).
 *
 * ============================================================================================
 * WHY THIS PACKAGE HAS NO NETWORK IN IT, AND NO CLOCK
 * ============================================================================================
 *
 * Gate B of the brief requires the platform to be replaceable, and requires it PROVEN rather than
 * intended: "the room's rules are a plain module with no Cloudflare types in it, and the platform
 * adapter is small enough to rewrite in a day". A module that takes a message and returns the next
 * state plus what to send is a module that runs under plain Node in a test, which is the proof.
 *
 * So, deliberately:
 *
 * - **No sockets.** The reducer returns `Outbound[]` — addressed messages the adapter sends. It
 *   never holds a connection, and "connected" is a field the adapter maintains by telling the room
 *   when a connection opens or closes.
 * - **No clock.** Every entry point takes `now`. The grace period after the last player leaves is
 *   a comparison against a number the caller supplies, so a test can move time without waiting and
 *   the platform decides where time comes from.
 * - **No randomness of its own.** Room codes are minted by the caller. The engine's dice are the
 *   engine's business and stay there (`FINDINGS.md` #40).
 *
 * ============================================================================================
 * WHAT A `ref` IS, AND WHAT IT IS NOT
 * ============================================================================================
 *
 * An opaque, device-minted string — `PlayerRef` as `packages/session` mints it. **It
 * authenticates nothing.** Anyone who has it can claim to be that member, which is acceptable
 * precisely because a room is entered by an invite code shared between people who know each other
 * (brief §4, ruling 2), and would be unacceptable in a public room, which is one more reason there
 * is not one. Nothing here may treat a ref as proof of anything.
 *
 * `name` is typed for one room and lives only as long as the room does. It is never stored. Users
 * are under 18 and India's DPDP Act treats them as children: the room keeps no record that
 * outlives the game (`CLAUDE.md`, "No personal data").
 */

import type { ErrorCode, RoomProjection } from '@immunity-wars/protocol';

/**
 * The fourteen seats and the refusal codes are the PROTOCOL's (P3.2): the client and the relay
 * share one copy of each, so they cannot disagree about what a seat is called.
 */
export { CELL_SEATS, ORGAN_SEATS, SEATS } from '@immunity-wars/protocol';
export type { RoomProjection } from '@immunity-wars/protocol';

/** One person in the room. Members survive a disconnection; they are removed only by leaving. */
export interface Member {
  /** Device-minted, opaque, authenticates nothing. */
  readonly ref: string;
  /** Typed for this room, never stored. */
  readonly name: string;
  /**
   * The order this member FIRST joined in, which never changes and is never reused. Captain
   * succession reads it, so it must be stable across a disconnection (brief §5).
   */
  readonly joinOrder: number;
  /** Whether a connection is open right now. A member with no connection is AWAY, not gone. */
  readonly connected: boolean;
  readonly seats: readonly string[];
}

export type RoomPhase = 'lobby' | 'playing' | 'ended';

export interface RoomState {
  readonly code: string;
  readonly members: readonly Member[];
  /** The captain's ref, or null in an empty room. */
  readonly captain: string | null;
  readonly phase: RoomPhase;
  /** The engine's state once the game starts. Held, never handed out (seam 1's rule). */
  readonly game: unknown;
  /** Next join order to hand out. Monotonic, never reused. */
  readonly nextJoinOrder: number;
  /**
   * When the room last became empty of CONNECTED members, or null while someone is here. The
   * grace period is measured from this (brief §5: a family losing Wi-Fi for ninety seconds should
   * not destroy a forty-minute game).
   */
  readonly emptySince: number | null;
}

/** How long a room with nobody connected is held before it is discarded. Brief §5: 10 minutes. */
export const GRACE_MS = 10 * 60 * 1000;

/**
 * What a client may say to a room.
 *
 * `disconnect` and `leave` are DIFFERENT and the difference is the whole of the drop-out ruling
 * (brief §4, ruling 4): a disconnection is an accident and keeps the member's seats, while leaving
 * is a decision and gives them up.
 */
export type Inbound =
  | { readonly kind: 'join'; readonly ref: string; readonly name: string }
  | { readonly kind: 'disconnect'; readonly ref: string }
  | { readonly kind: 'leave'; readonly ref: string }
  | { readonly kind: 'claimSeat'; readonly ref: string; readonly seat: string }
  | { readonly kind: 'releaseSeat'; readonly ref: string; readonly seat: string }
  | {
      /** The captain hands an away member's seats to someone present, or takes them back. */
      readonly kind: 'assignSeat';
      readonly ref: string;
      readonly seat: string;
      /**
       * Who gets it, by PUBLIC id (their join order), or null to free it. Not a ref: refs never
       * reach clients (P3.2, FINDINGS #77), so a client could not name one if it wanted to.
       */
      readonly to: number | null;
    }
  | { readonly kind: 'start'; readonly ref: string; readonly difficulty: string }
  | { readonly kind: 'action'; readonly ref: string; readonly action: Record<string, unknown> };

/** What the room says back. The adapter turns these into frames on a socket and nothing more. */
export type Message =
  /** Who you are in this room: your public id, sent to one connection after it joins. */
  | { readonly kind: 'joined'; readonly id: number }
  | { readonly kind: 'room'; readonly room: RoomProjection }
  | { readonly kind: 'view'; readonly view: unknown }
  | { readonly kind: 'burst'; readonly frames: readonly unknown[] }
  /**
   * A refusal, as a CODE the client words through its catalogue. `detail` is the engine's own
   * text when the engine refused, and otherwise a hint for the wording (a holder's name).
   */
  | { readonly kind: 'error'; readonly code: ErrorCode; readonly detail?: string };

/** One message and who it goes to: everyone in the room, or one member. */
export interface Outbound {
  readonly to: 'all' | string;
  readonly message: Message;
}

export interface Step {
  readonly room: RoomState;
  readonly out: readonly Outbound[];
}
