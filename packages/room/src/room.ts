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
  GRACE_MS,
  SEATS,
  type Inbound,
  type Member,
  type Outbound,
  type RoomProjection,
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

export function project(room: RoomState): RoomProjection {
  const taken = new Set(room.members.flatMap((m) => m.seats));
  return {
    code: room.code,
    phase: room.phase,
    captain: room.captain,
    members: room.members.map((m) => ({
      ref: m.ref,
      name: m.name,
      connected: m.connected,
      seats: m.seats,
    })),
    freeSeats: SEATS.filter((s) => !taken.has(s)),
  };
}

const broadcast = (room: RoomState): Outbound => ({
  to: 'all',
  message: { kind: 'room', room: project(room) },
});

const reject = (room: RoomState, ref: string, error: string): Step => ({
  room,
  out: [{ to: ref, message: { kind: 'error', error } }],
});

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
 * The game's owner map, which is the seats in the engine's own vocabulary: seat key to the ref
 * that holds it. The engine reads `owner` to enforce who may act; the room decides what is in it.
 */
const ownerMap = (room: RoomState): Record<string, string> => {
  const owner: Record<string, string> = {};
  for (const m of room.members) for (const s of m.seats) owner[s] = m.ref;
  return owner;
};

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
        return { room: back, out: [broadcast(back)] };
      }
      if (room.phase === 'ended') return reject(room, msg.ref, 'This game has ended.');
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
      return { room: next, out: [broadcast(next)] };
    }

    case 'disconnect': {
      // AWAY, NOT GONE. Seats stay theirs; the captaincy moves if it was theirs.
      if (!find(room, msg.ref)) return { room, out: [] };
      const next = settle(
        replace(room, msg.ref, (m) => ({ ...m, connected: false })),
        now,
      );
      return { room: next, out: [broadcast(next)] };
    }

    case 'leave': {
      // A DECISION, not an accident: the member goes and their seats are freed for the table.
      if (!find(room, msg.ref)) return { room, out: [] };
      const next = settle({ ...room, members: room.members.filter((m) => m.ref !== msg.ref) }, now);
      return { room: next, out: [broadcast(next)] };
    }

    case 'claimSeat': {
      const me = find(room, msg.ref);
      if (!me) return reject(room, msg.ref, 'You are not in this room.');
      if (room.phase !== 'lobby')
        return reject(room, msg.ref, 'Seats are taken before the game starts.');
      if (!SEATS.includes(msg.seat)) return reject(room, msg.ref, 'No such seat.');
      const holder = seatHolder(room, msg.seat);
      if (holder && holder.ref !== msg.ref)
        return reject(room, msg.ref, `${holder.name} has that seat.`);
      if (me.seats.includes(msg.seat)) return { room, out: [] };
      const next = replace(room, msg.ref, (m) => ({ ...m, seats: [...m.seats, msg.seat] }));
      return { room: next, out: [broadcast(next)] };
    }

    case 'releaseSeat': {
      const me = find(room, msg.ref);
      if (!me) return reject(room, msg.ref, 'You are not in this room.');
      if (room.phase !== 'lobby')
        return reject(room, msg.ref, 'Seats are taken before the game starts.');
      if (!me.seats.includes(msg.seat)) return { room, out: [] };
      const next = replace(room, msg.ref, (m) => ({
        ...m,
        seats: m.seats.filter((s) => s !== msg.seat),
      }));
      return { room: next, out: [broadcast(next)] };
    }

    case 'assignSeat': {
      // THE TABLE'S CHOICE (ruling 4): the captain hands an AWAY member's seat on, or frees it.
      if (room.captain !== msg.ref) return reject(room, msg.ref, 'Only the captain assigns seats.');
      if (!SEATS.includes(msg.seat)) return reject(room, msg.ref, 'No such seat.');
      const holder = seatHolder(room, msg.seat);
      if (holder?.connected === true)
        return reject(room, msg.ref, `${holder.name} is here and holding that seat.`);
      const to = msg.to === null ? null : (find(room, msg.to) ?? null);
      if (msg.to !== null && to === null)
        return reject(room, msg.ref, 'That player is not in this room.');
      if (to && !to.connected)
        return reject(room, msg.ref, `${to.name} is away. Give the seat to someone who is here.`);
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
      if (room.captain !== msg.ref) return reject(room, msg.ref, 'Only the captain starts.');
      if (room.phase !== 'lobby') return reject(room, msg.ref, 'The game has already started.');
      const seated = room.members.filter((m) => m.seats.length > 0);
      if (seated.length === 0) return reject(room, msg.ref, 'Take a seat before starting.');
      // The engine is told who owns what and who is captain. Nothing about the rules changes.
      const game = newGame({
        difficulty: msg.difficulty,
        multiplayer: true,
        captain: room.captain,
        owner: ownerMap(room),
        players: room.members.map((m) => m.ref),
      });
      const next: RoomState = { ...room, phase: 'playing', game };
      return {
        room: next,
        out: [broadcast(next), { to: 'all', message: { kind: 'view', view: viewState(game) } }],
      };
    }

    case 'action': {
      const me = find(room, msg.ref);
      if (!me) return reject(room, msg.ref, 'You are not in this room.');
      if (room.phase !== 'playing' || room.game === null)
        return reject(room, msg.ref, 'The game has not started.');
      // OWNERSHIP IS THE ROOM'S; LEGALITY IS THE ENGINE'S. The seat check is here because the
      // room knows who holds what; everything else goes to `applyAction` unaltered.
      const seat = seatOf(msg.action);
      if (seat !== null && !me.seats.includes(seat))
        return reject(room, msg.ref, 'That is not one of your pieces.');
      const game = room.game as GameState;
      const result = applyAction(game, { ...msg.action, pid: msg.ref } as unknown as Action) as {
        ok: boolean;
        error?: string;
        frames?: readonly unknown[];
      };
      if (!result.ok) return reject(room, msg.ref, result.error ?? 'rejected');
      const out: Outbound[] = [];
      // BURST FIRST, THEN THE VIEW, for the reason `LocalSession` states: a subscriber that skips
      // the animation must still land on the right state, and the burst's tail equals the view.
      if (result.frames && result.frames.length > 0)
        out.push({ to: 'all', message: { kind: 'burst', frames: result.frames } });
      out.push({ to: 'all', message: { kind: 'view', view: viewState(game) } });
      const g = game as unknown as Record<string, unknown>;
      const over = g['won'] === true || Boolean(g['lost']);
      const next: RoomState = over ? { ...room, phase: 'ended' } : room;
      if (over) out.push(broadcast(next));
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
