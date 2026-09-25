/**
 * THE ROOM'S RULES, as one pure reducer (docs/PHASE3_BRIEF.md §5, P3.1).
 *
 * `step(room, inbound, now)` returns the next room and what to send. It is the only way a room
 * changes. No sockets, no clock, no storage: see `types.ts` for why, and for what Gate B requires
 * of this file.
 *
 * THE RULES, each with the line of the brief it comes from:
 *
 * - The captain is the first member to join (§5). The engine already gives the captain the
 *   allocation and End turn powers, so this is the engine's notion and not a second one.
 * - A disconnection keeps the member and their seats, marked away. **Nothing is forfeited by
 *   dropping** (§5) — that is the whole of ruling 4, and it is why `disconnect` and `leave` are
 *   different messages.
 * - The captain may reassign an away member's seats. A PRESENT member's seats are theirs: the
 *   captain cannot take a seat from someone who is sitting in it, because the ruling is about a
 *   table deciding not to wait, not about a captain overruling a player.
 * - Captain succession is the next member in JOIN ORDER who is connected, and the old captain
 *   does not get it back on return (§5, recommendation taken). Deterministic, so every client
 *   agrees without a vote.
 * - Rejoining with the same ref restores the member and any seats still theirs.
 * - The last connected member leaving starts the grace period; `sweep` discards the room after it.
 *
 * WHAT THIS FILE DOES NOT DECIDE: whether an ACTION is legal. That is the engine's, through
 * `applyAction`, exactly as it is in single player. The room checks only that the sender owns the
 * seat the action is for — ownership is the room's business and legality is the engine's, and
 * keeping those apart is what stops a second copy of the rules growing here.
 */
import { applyAction, newGame, viewState } from '@immunity-wars/engine';
import type { Action, GameState } from '@immunity-wars/engine';

import { SEATS, type ErrorCode, type RoomProjection, type Seat } from '@immunity-wars/protocol';
import { advanceIdsPast, precompute, scopeAll } from '@immunity-wars/session-core';

import {
  GRACE_MS,
  type Inbound,
  type Member,
  type Outbound,
  type RoomState,
  type Step,
} from './types.js';

/** A room with nobody in it yet. The code is the caller's to mint; the room never invents one. */
export function createRoom(code: string, now: number): RoomState {
  return {
    code,
    members: [],
    captain: null,
    phase: 'lobby',
    game: null,
    nextJoinOrder: 1,
    emptySince: now,
  };
}

const find = (room: RoomState, ref: string): Member | undefined =>
  room.members.find((m) => m.ref === ref);

const seatHolder = (room: RoomState, seat: string): Member | undefined =>
  room.members.find((m) => m.seats.includes(seat));

/** Everyone with a connection open right now. */
const connected = (room: RoomState): readonly Member[] => room.members.filter((m) => m.connected);

/**
 * WHAT A CLIENT SEES OF THE ROOM, and it contains no ref (P3.2, FINDINGS #77). A ref is the only
 * credential a rejoin needs; P3.1 broadcast every member's, so any member could take over any
 * other's seats by "rejoining" as them. Members are named by their public id, their join order.
 */
export function project(room: RoomState): RoomProjection {
  const taken = new Set(room.members.flatMap((m) => m.seats));
  const idOf = (ref: string | null): number | null =>
    ref === null ? null : (find(room, ref)?.joinOrder ?? null);
  return {
    code: room.code,
    phase: room.phase,
    captain: idOf(room.captain),
    members: room.members.map((m) => ({
      id: m.joinOrder,
      name: m.name,
      connected: m.connected,
      seats: m.seats as Seat[],
    })),
    freeSeats: SEATS.filter((s) => !taken.has(s)),
  };
}

/** Tells one connection its own public id: the only way a client learns which member it is. */
const you = (room: RoomState, ref: string): Outbound => ({
  to: ref,
  message: { kind: 'joined', id: find(room, ref)?.joinOrder ?? 0 },
});

const broadcast = (room: RoomState): Outbound => ({
  to: 'all',
  message: { kind: 'room', room: project(room) },
});

const reject = (room: RoomState, ref: string, code: ErrorCode, detail?: string): Step => ({
  room,
  out: [
    {
      to: ref,
      message: detail === undefined ? { kind: 'error', code } : { kind: 'error', code, detail },
    },
  ],
});

/** The answer to one action, to the member who sent it and nobody else (protocol v2, P3.4). */
const answer = (
  ref: string,
  id: number,
  refusal?: { readonly code: ErrorCode; readonly detail?: string },
): Outbound => ({
  to: ref,
  message:
    refusal === undefined
      ? { kind: 'result', id, ok: true }
      : refusal.detail === undefined
        ? { kind: 'result', id, ok: false, code: refusal.code }
        : { kind: 'result', id, ok: false, code: refusal.code, detail: refusal.detail },
});

const refuse = (
  room: RoomState,
  ref: string,
  id: number,
  code: ErrorCode,
  detail?: string,
): Step => ({
  room,
  out: [answer(ref, id, detail === undefined ? { code } : { code, detail })],
});

/**
 * THE AUTHORITATIVE VIEW, WITH WHAT `LocalSession` COMPUTES BESIDE IT (P3.4, ruled 24 September
 * 2026). The selection-independent queries, and the scoped answers for every cell and family, from
 * the same builder `LocalSession` calls — so a relay client reads exactly what a single-player one
 * reads, and serves its own selection without asking. Nothing here depends on who is looking: the
 * engine's queries take the game, not a player, which is what lets one message go to everyone.
 */
function viewFor(game: GameState, to: 'all' | string = 'all'): Outbound {
  const view = viewState(game) as Readonly<Record<string, unknown>>;
  const g = game as unknown as Record<string, unknown>;
  return {
    to,
    message: { kind: 'view', view, queries: precompute(g, view), scoped: scopeAll(g) },
  };
}

/**
 * EVERY ENGINE CALL GOES THROUGH HERE (FINDINGS #56, on a relay). The engine's invader-id counter
 * lives in its module, not in the game, and `newGame` in ANY room resets it — so before touching a
 * game, the counter is advanced past the highest id that game holds. `ids.test.ts` is the proof
 * this is needed: without it, two rooms in one process hand out one id to two pathogens.
 */
function apply(
  game: GameState,
  action: Record<string, unknown>,
): {
  ok: boolean;
  error?: string;
  frames?: readonly unknown[];
} {
  advanceIdsPast(game as unknown as Record<string, unknown>);
  return applyAction(game, action as unknown as Action) as {
    ok: boolean;
    error?: string;
    frames?: readonly unknown[];
  };
}

/**
 * THE GAME AS IT STANDS, to one member arriving after it started (P3.4). A rejoining player has no
 * view at all until someone acts, and in a room waiting on them nobody will; a new member placed by
 * the captain into an away member's seat needs the board they are being handed.
 */
const current = (room: RoomState, ref: string): Outbound[] =>
  room.game === null ? [] : [viewFor(room.game as GameState, ref)];

const isSeat = (s: string): s is Seat => (SEATS as readonly string[]).includes(s);

/**
 * THE CAPTAIN, after any change to who is connected.
 *
 * Reads join order and connection only, so two clients handed the same room state name the same
 * captain without exchanging a word. The current captain keeps it while connected; otherwise the
 * earliest-joined connected member takes it; an empty room has none.
 */
function withCaptain(room: RoomState): RoomState {
  const current = room.captain === null ? undefined : find(room, room.captain);
  if (current?.connected === true) return room;
  const next = [...connected(room)].sort((a, b) => a.joinOrder - b.joinOrder)[0];
  const captain = next?.ref ?? null;
  return captain === room.captain ? room : { ...room, captain };
}

/** `emptySince` tracks the moment the last connection went, and clears when one returns. */
function withEmptiness(room: RoomState, now: number): RoomState {
  const someone = connected(room).length > 0;
  if (someone) return room.emptySince === null ? room : { ...room, emptySince: null };
  return room.emptySince === null ? { ...room, emptySince: now } : room;
}

const settle = (room: RoomState, now: number): RoomState => withCaptain(withEmptiness(room, now));

const replace = (room: RoomState, ref: string, f: (m: Member) => Member): RoomState => ({
  ...room,
  members: room.members.map((m) => (m.ref === ref ? f(m) : m)),
});

/**
 * THE ENGINE NEVER SEES A REF (P3.2, FINDINGS #77). Its player id is the member's PUBLIC id, as
 * `m<id>`, because the engine projects `captain`, `owner` and `apBudget` keyed by player id into
 * every view — and every view goes to every client. Handing it refs, as P3.1 did, broadcast every
 * member's credential in every view; the wire suite found it on its first run against real views,
 * where the constructed view the protocol suite uses could not have.
 */
const pidOf = (m: Member): string => `m${String(m.joinOrder)}`;

/**
 * The game's owner map, in the engine's vocabulary: seat key to the player id that holds it. The
 * engine projects it and does not enforce it; ownership is enforced here, in `step`.
 */
const ownerMap = (room: RoomState): Record<string, string> => {
  const owner: Record<string, string> = {};
  for (const m of room.members) for (const s of m.seats) owner[s] = pidOf(m);
  return owner;
};

/**
 * ACTIONS ONLY THE ROOM SENDS. `handOverCaptaincy` is how the engine learns the room has a new
 * captain (FINDINGS #78, DEVIATIONS #7); a player who could send it could make themselves captain,
 * so it is refused from every client, and the engine separately refuses it from anyone but the
 * current captain.
 */
const ROOM_ONLY: ReadonlySet<string> = new Set(['handOverCaptaincy']);

/**
 * THE ENGINE HEARS ABOUT A NEW CAPTAIN (FINDINGS #78, ruled 21 September 2026). The room decides
 * who the captain is; the engine keeps its own copy, given once at `newGame`, and enforces it for
 * the allocation, Begin command and End turn. Without this, a captain dropping mid-game stalled the
 * table until they came back — the exact stall ruling 4 exists to prevent.
 *
 * Sent as the engine's current captain, because only the captain may hand over. Returns the view
 * everyone needs, since `captain` is in the view; nothing when there is nothing to change.
 */
function syncCaptain(room: RoomState): Outbound[] {
  if (room.phase !== 'playing' || room.game === null || room.captain === null) return [];
  const captain = find(room, room.captain);
  if (!captain) return [];
  const g = room.game as GameState;
  const to = pidOf(captain);
  if (g.captain === to) return [];
  const result = apply(g, { action: 'handOverCaptaincy', pid: g.captain, toPid: to });
  if (!result.ok) return [];
  return [viewFor(g)];
}

/** The seat an action is for, or null when the action is nobody's seat in particular. */
function seatOf(action: Record<string, unknown>): string | null {
  const cell = action['cell'];
  if (typeof cell === 'string') return cell;
  const organ = action['organ'];
  if (typeof organ === 'string') return `res_${organ}`;
  return null;
}

export function step(room: RoomState, msg: Inbound, now: number): Step {
  switch (msg.kind) {
    case 'join': {
      const existing = find(room, msg.ref);
      if (existing) {
        // REJOINING (§5): the same ref restores the member and any seats still theirs. The name
        // is taken again, because the person may be on another device with another name typed.
        const back = settle(
          replace(room, msg.ref, (m) => ({ ...m, connected: true, name: msg.name })),
          now,
        );
        return {
          room: back,
          out: [
            you(back, msg.ref),
            broadcast(back),
            ...current(back, msg.ref),
            ...syncCaptain(back),
          ],
        };
      }
      if (room.phase === 'ended') return reject(room, msg.ref, 'gameEnded');
      // A NEWCOMER WAITS FOR THE NEXT GAME (ruled 25 September 2026, brief review R2, FINDINGS #86).
      // The engine fixes its players at `newGame`, so someone arriving later could be seated but
      // never given Action Points, nor the captaincy. Rejoining, above, is not affected.
      if (room.phase === 'playing') return reject(room, msg.ref, 'lobbyClosed');
      const member: Member = {
        ref: msg.ref,
        name: msg.name,
        joinOrder: room.nextJoinOrder,
        connected: true,
        seats: [],
      };
      const next = settle(
        { ...room, members: [...room.members, member], nextJoinOrder: room.nextJoinOrder + 1 },
        now,
      );
      // Only the lobby admits newcomers, and the lobby has no board or engine captain to send.
      return { room: next, out: [you(next, msg.ref), broadcast(next)] };
    }

    case 'disconnect': {
      // AWAY, NOT GONE. Seats stay theirs; the captaincy moves if it was theirs.
      if (!find(room, msg.ref)) return { room, out: [] };
      const next = settle(
        replace(room, msg.ref, (m) => ({ ...m, connected: false })),
        now,
      );
      return { room: next, out: [broadcast(next), ...syncCaptain(next)] };
    }

    case 'leave': {
      // A DECISION, not an accident: the member goes and their seats are freed for the table.
      if (!find(room, msg.ref)) return { room, out: [] };
      const next = settle({ ...room, members: room.members.filter((m) => m.ref !== msg.ref) }, now);
      return { room: next, out: [broadcast(next), ...syncCaptain(next)] };
    }

    case 'claimSeat': {
      const me = find(room, msg.ref);
      if (!me) return reject(room, msg.ref, 'notInRoom');
      if (room.phase !== 'lobby') return reject(room, msg.ref, 'lobbyClosed');
      if (!isSeat(msg.seat)) return reject(room, msg.ref, 'noSuchSeat');
      const holder = seatHolder(room, msg.seat);
      if (holder && holder.ref !== msg.ref) return reject(room, msg.ref, 'seatTaken', holder.name);
      if (me.seats.includes(msg.seat)) return { room, out: [] };
      const next = replace(room, msg.ref, (m) => ({ ...m, seats: [...m.seats, msg.seat] }));
      return { room: next, out: [broadcast(next)] };
    }

    case 'releaseSeat': {
      const me = find(room, msg.ref);
      if (!me) return reject(room, msg.ref, 'notInRoom');
      if (room.phase !== 'lobby') return reject(room, msg.ref, 'lobbyClosed');
      if (!me.seats.includes(msg.seat)) return { room, out: [] };
      const next = replace(room, msg.ref, (m) => ({
        ...m,
        seats: m.seats.filter((s) => s !== msg.seat),
      }));
      return { room: next, out: [broadcast(next)] };
    }

    case 'assignSeat': {
      // THE TABLE'S CHOICE (ruling 4): the captain hands an AWAY member's seat on, or frees it.
      if (room.captain !== msg.ref) return reject(room, msg.ref, 'notCaptain');
      if (!isSeat(msg.seat)) return reject(room, msg.ref, 'noSuchSeat');
      const holder = seatHolder(room, msg.seat);
      if (holder?.connected === true)
        return reject(room, msg.ref, 'seatHeldByPresent', holder.name);
      const to =
        msg.to === null ? null : (room.members.find((m) => m.joinOrder === msg.to) ?? null);
      if (msg.to !== null && to === null) return reject(room, msg.ref, 'noSuchMember');
      if (to && !to.connected) return reject(room, msg.ref, 'memberAway', to.name);
      const cleared: RoomState = {
        ...room,
        members: room.members.map((m) => ({ ...m, seats: m.seats.filter((s) => s !== msg.seat) })),
      };
      const next =
        to === null
          ? cleared
          : replace(cleared, to.ref, (m) => ({ ...m, seats: [...m.seats, msg.seat] }));
      return { room: next, out: [broadcast(next)] };
    }

    case 'start': {
      if (room.captain !== msg.ref) return reject(room, msg.ref, 'notCaptain');
      if (room.phase !== 'lobby') return reject(room, msg.ref, 'alreadyStarted');
      const seated = room.members.filter((m) => m.seats.length > 0);
      if (seated.length === 0) return reject(room, msg.ref, 'nobodySeated');
      const captainMember = find(room, msg.ref);
      if (!captainMember) return reject(room, msg.ref, 'notInRoom');
      // The engine is told who owns what and who is captain. Nothing about the rules changes.
      const game = newGame({
        difficulty: msg.difficulty,
        multiplayer: true,
        captain: pidOf(captainMember),
        owner: ownerMap(room),
        players: room.members.map(pidOf),
      });
      const next: RoomState = { ...room, phase: 'playing', game };
      return { room: next, out: [broadcast(next), viewFor(game)] };
    }

    case 'action': {
      // Every refusal here is a `result` for this action's id, to the sender alone, so a client
      // can tell its own answer apart from views that other players' actions cause.
      const me = find(room, msg.ref);
      if (!me) return refuse(room, msg.ref, msg.id, 'notInRoom');
      if (room.phase !== 'playing' || room.game === null)
        return refuse(room, msg.ref, msg.id, 'notStarted');
      const name = msg.action['action'];
      if (typeof name === 'string' && ROOM_ONLY.has(name))
        return refuse(room, msg.ref, msg.id, 'roomOnly');
      // UNDO IS SINGLE-PLAYER IN v1 (FINDINGS #79). The engine keeps one undo stack per game, so
      // in a room an undo would unwind whichever move came last, possibly another player's.
      if (name === 'undo') return refuse(room, msg.ref, msg.id, 'undoIsSinglePlayer');
      // OWNERSHIP IS THE ROOM'S; LEGALITY IS THE ENGINE'S. The seat check is here because the
      // room knows who holds what; everything else goes to `applyAction` unaltered.
      const seat = seatOf(msg.action);
      if (seat !== null && !me.seats.includes(seat))
        return refuse(room, msg.ref, msg.id, 'notYourPiece');
      const game = room.game as GameState;
      // The sender's PUBLIC id, stamped after the spread so an action cannot carry another's.
      const result = apply(game, { ...msg.action, pid: pidOf(me) });
      // The ENGINE's refusal: its own text rides as the detail, and the client renders it through
      // the engine catalogue exactly as single player does.
      if (!result.ok) return refuse(room, msg.ref, msg.id, 'engine', result.error ?? '');
      const out: Outbound[] = [];
      // BURST FIRST, THEN THE VIEW, for the reason `LocalSession` states: a subscriber that skips
      // the animation must still land on the right state, and the burst's tail equals the view.
      if (result.frames && result.frames.length > 0)
        out.push({ to: 'all', message: { kind: 'burst', frames: result.frames } });
      out.push(viewFor(game));
      const g = game as unknown as Record<string, unknown>;
      const over = g['won'] === true || Boolean(g['lost']);
      const next: RoomState = over ? { ...room, phase: 'ended' } : room;
      if (over) out.push(broadcast(next));
      // THE RESULT LAST, so a sender whose `sendAction` resolves on it already holds EVERYTHING the
      // action caused, as a `LocalSession` caller does when its promise resolves: the new view, and
      // the room's end when it ended the game. Until 25 September 2026 the room's end came after
      // the result, and the first run against the live relay acted on a resolved promise, sent the
      // next draw into an ended room, and was refused.
      out.push(answer(msg.ref, msg.id));
      return { room: next, out };
    }

    default:
      return { room, out: [] };
  }
}

/**
 * THE GRACE PERIOD (§5). Called by the adapter on a timer: a room whose last connected member
 * left more than `GRACE_MS` ago is discarded, and `null` means "forget this room".
 *
 * Separate from `step` because it is the one rule driven by time passing rather than by anyone
 * doing anything, and because a reducer that discarded itself inside an unrelated message would
 * be a surprise to read.
 */
export function sweep(room: RoomState, now: number, graceMs: number = GRACE_MS): RoomState | null {
  if (room.emptySince === null) return room;
  return now - room.emptySince >= graceMs ? null : room;
}
