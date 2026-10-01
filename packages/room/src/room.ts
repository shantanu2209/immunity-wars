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

import {
  BODY_ACTIONS,
  MAX_MEMBERS,
  SAY_MESSAGES,
  SEATS,
  SEAT_OF_ACTION,
  pidOf,
  residentSeat,
  type ErrorCode,
  type RoomProjection,
  type Seat,
} from '@immunity-wars/protocol';
import { MOVE_CLASS, precompute, scopeAll } from '@immunity-wars/session-core';

import {
  GRACE_MS,
  type Inbound,
  type Member,
  type Outbound,
  type RoomState,
  type Step,
  type UndoRun,
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
    undoRun: null,
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
function viewFor(
  game: GameState,
  to: 'all' | string = 'all',
  undo: { member: number; moves: number } | null = null,
): Outbound {
  const view = viewState(game) as Readonly<Record<string, unknown>>;
  const g = game as unknown as Record<string, unknown>;
  return {
    to,
    message: { kind: 'view', view, queries: precompute(g, view), scoped: scopeAll(g), undo },
  };
}

/** The view's `undo`: whose moves an undo would take back, by public id, and how many. */
function undoOf(room: RoomState): { member: number; moves: number } | null {
  const run = room.undoRun;
  if (!run) return null;
  const m = room.members.find((x) => x.ref === run.ref);
  return m ? { member: m.joinOrder, moves: run.moves } : null;
}

/** The engine's undo stack, read, never written: only the engine's own `undo` pops it. */
const stackOf = (game: GameState): readonly unknown[] =>
  (game as unknown as { undo?: unknown[] }).undo ?? [];

/**
 * UNDO, PLAYED TOGETHER (v4, ruled 27 September 2026, reversing FINDINGS #79's refusal). A member
 * takes back their own moves while they are the last things done at the table, and only then:
 * the room holds that run (`undoRun`), and undoes through the engine's own `undo`, one snapshot at
 * a time, back to the one from just before the first of them. A refused action pushes a snapshot
 * too, and popping one changes nothing, since nothing changed. The Action Points come back with
 * the moves (DEVIATIONS #8).
 */
function undoFor(room: RoomState, me: Member, id: number): Step {
  const run = room.undoRun;
  const game = room.game as GameState;
  if (!run || run.ref !== me.ref || !stackOf(game).includes(run.first))
    return refuse(room, me.ref, id, 'nothingToUndo');
  for (;;) {
    const top = stackOf(game).at(-1);
    if (top === undefined || !apply(game, { action: 'undo', pid: pidOfMember(me) }).ok) break;
    if (top === run.first) break;
  }
  const next: RoomState = { ...room, undoRun: null };
  return { room: next, out: [viewFor(game), answer(me.ref, id)] };
}

/**
 * EVERY ENGINE CALL GOES THROUGH HERE. Until queue Q5 (30 September 2026) it first advanced the
 * engine's invader-id counter past the game's highest id, because the counter lived in the engine's
 * module and `newGame` in ANY room reset it (FINDINGS #56). The counter is the game's own now, so
 * every table counts for itself; `ids.test.ts` still holds two rooms interleaved in one process.
 */
function apply(
  game: GameState,
  action: Record<string, unknown>,
): {
  ok: boolean;
  error?: string;
  frames?: readonly unknown[];
} {
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
  room.game === null ? [] : [viewFor(room.game as GameState, ref, undoOf(room))];

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
const pidOfMember = (m: Member): string => pidOf(m.joinOrder);

/**
 * The game's owner map, in the engine's vocabulary: seat key to the player id that holds it. The
 * engine projects it and does not enforce it; ownership is enforced here, in `step`.
 */
const ownerMap = (room: RoomState): Record<string, string> => {
  const owner: Record<string, string> = {};
  for (const m of room.members) for (const s of m.seats) owner[s] = pidOfMember(m);
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
  const to = pidOfMember(captain);
  if (g.captain === to) return [];
  const result = apply(g, { action: 'handOverCaptaincy', pid: g.captain, toPid: to });
  if (!result.ok) return [];
  return [viewFor(g, 'all', undoOf(room))];
}

/**
 * The seat an action is for, or null when the action is nobody's seat in particular.
 *
 * AN ACTION THAT CAN ONLY BE ONE PIECE'S IS THAT PIECE'S, WHATEVER THE MESSAGE NAMES (FINDINGS #94).
 * The engine needs no `cell` for Produce, Coat, Neutralise or the four attacks, so until 1 October
 * 2026 the room, reading only `cell` and `organ`, let them through from any member; and a message
 * naming a cell its sender did hold would have passed for another's. The table comes first.
 */
function seatOf(action: Record<string, unknown>): string | null {
  const name = action['action'];
  const bound = typeof name === 'string' ? SEAT_OF_ACTION[name] : undefined;
  if (bound !== undefined) return bound;
  const cell = action['cell'];
  if (typeof cell === 'string') return cell;
  const organ = action['organ'];
  if (typeof organ === 'string') return residentSeat(organ);
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
      // A ROOM HOLDS AT MOST FIFTEEN (ruled 26 September 2026). A newcomer only: a member rejoining,
      // above, is never counted out of their own room.
      if (room.members.length >= MAX_MEMBERS) return reject(room, msg.ref, 'roomFull');
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

    case 'say': {
      // THE TABLE'S FIXED MESSAGES ONLY (ruled 25 September 2026). The protocol admits any id of the
      // right shape; the room admits only the ids on the list, so nothing a player types can travel,
      // and the words are each client's own catalogue's. To everyone, the sender included, so every
      // screen's record of the table is the same.
      const me = find(room, msg.ref);
      if (!me) return reject(room, msg.ref, 'notInRoom');
      if (!(SAY_MESSAGES as readonly string[]).includes(msg.message))
        return reject(room, msg.ref, 'noSuchMessage');
      return {
        room,
        out: [{ to: 'all', message: { kind: 'said', from: me.joinOrder, message: msg.message } }],
      };
    }

    case 'start': {
      if (room.captain !== msg.ref) return reject(room, msg.ref, 'notCaptain');
      if (room.phase !== 'lobby') return reject(room, msg.ref, 'alreadyStarted');
      const seated = room.members.filter((m) => m.seats.length > 0);
      if (seated.length === 0) return reject(room, msg.ref, 'nobodySeated');
      // EVERY PLAYER BUT THE CAPTAIN HOLDS A PIECE (ruled 26 September 2026, after the P3.6
      // session). A player with none would be in the game with nothing to command, and Action Points
      // the captain could hand them that they could not spend. The captain may hold none: the
      // allocation, the body and the end of each turn are theirs. A resident counts as a piece.
      const unseated = room.members.find(
        (m) => m.connected && m.ref !== room.captain && m.seats.length === 0,
      );
      if (unseated) return reject(room, msg.ref, 'someoneUnseated', unseated.name);
      const captainMember = find(room, msg.ref);
      if (!captainMember) return reject(room, msg.ref, 'notInRoom');
      // AWAY AND HOLDING NOTHING: LEFT OUT. Counting them would let one closed app keep a room from
      // ever starting, since nobody can be removed from a room. If they come back they are a
      // newcomer to a game under way, and told it has started (R2).
      const players = room.members.filter((m) => m.connected || m.seats.length > 0);
      const table: RoomState = { ...room, members: players };
      // The engine is told who owns what and who is captain. Nothing about the rules changes.
      const game = newGame({
        difficulty: msg.difficulty,
        multiplayer: true,
        captain: pidOfMember(captainMember),
        owner: ownerMap(table),
        players: players.map(pidOfMember),
      });
      const next: RoomState = { ...table, phase: 'playing', game, undoRun: null };
      return { room: next, out: [broadcast(next), viewFor(game)] };
    }

    case 'rematch': {
      // ANOTHER GAME IN THE SAME ROOM (ruled 25 September 2026, confirmed 30 September; protocol
      // v5). The captain takes a room whose game has ended back to its lobby, with the same members
      // and the seats they held. From there the lobby's rules apply as they always do: a newcomer
      // may join, seats may change, and the game starts when the captain starts it.
      if (room.captain !== msg.ref) return reject(room, msg.ref, 'notCaptain');
      if (room.phase === 'playing') return reject(room, msg.ref, 'alreadyStarted');
      // Already back in the lobby, by a second tap: nothing to do, and nothing to refuse.
      if (room.phase === 'lobby') return { room, out: [] };
      const next: RoomState = { ...room, phase: 'lobby', game: null, undoRun: null };
      return { room: next, out: [broadcast(next)] };
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
      // UNDO, the member's own moves while nobody has acted since (`undoFor`, v4).
      if (name === 'undo') return undoFor(room, me, msg.id);
      // OWNERSHIP IS THE ROOM'S; LEGALITY IS THE ENGINE'S. The seat check is here because the
      // room knows who holds what; everything else goes to `applyAction` unaltered.
      const seat = seatOf(msg.action);
      if (seat !== null && !me.seats.includes(seat))
        return refuse(room, msg.ref, msg.id, 'notYourPiece');
      // THE BODY'S ACTIONS ARE THE CAPTAIN'S (FINDINGS #94), as the screens already have them.
      if (typeof name === 'string' && BODY_ACTIONS.has(name) && room.captain !== me.ref)
        return refuse(room, msg.ref, msg.id, 'notCaptain');
      const game = room.game as GameState;
      // The sender's PUBLIC id, stamped after the spread so an action cannot carry another's.
      const result = apply(game, { ...msg.action, pid: pidOfMember(me) });
      // The ENGINE's refusal: its own text rides as the detail, and the client renders it through
      // the engine catalogue exactly as single player does.
      if (!result.ok) return refuse(room, msg.ref, msg.id, 'engine', result.error ?? '');
      // THE UNDO RUN: a move extends the mover's run, or starts theirs from the snapshot the engine
      // has just pushed for it; any other accepted action ends every run. A refusal, above, changed
      // nothing, so it leaves the run alone.
      const run = room.undoRun;
      const first = stackOf(game).at(-1);
      const undoRun: UndoRun | null =
        typeof name === 'string' && MOVE_CLASS.has(name)
          ? run !== null && run.ref === me.ref
            ? { ...run, moves: run.moves + 1 }
            : first === undefined
              ? null
              : { ref: me.ref, first, moves: 1 }
          : null;
      const acted: RoomState = { ...room, undoRun };
      const out: Outbound[] = [];
      // BURST FIRST, THEN THE VIEW, for the reason `LocalSession` states: a subscriber that skips
      // the animation must still land on the right state, and the burst's tail equals the view.
      if (result.frames && result.frames.length > 0)
        out.push({ to: 'all', message: { kind: 'burst', frames: result.frames } });
      out.push(viewFor(game, 'all', undoOf(acted)));
      const g = game as unknown as Record<string, unknown>;
      const over = g['won'] === true || Boolean(g['lost']);
      const next: RoomState = over ? { ...acted, phase: 'ended', undoRun: null } : acted;
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
