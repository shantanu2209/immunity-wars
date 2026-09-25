/**
 * THE TABLE — a game played together, seen from one player's seat (P3.7 piece B, docs/for-P3.md §6).
 *
 * Pure, so each rule is tested before a phone sees it. The play screen asks this module four
 * things, and single player gets the answer it has always had from each:
 *
 * - **Whose Action Points.** In a game played together the view's `ap` stays at the table's total
 *   while each player spends from their own budget (`apBudget`), so a screen reading `ap` offered
 *   actions a player could not afford (measured by the P3.7 spike). `seenBy` puts the player's own
 *   budget where the screen reads `ap`. This READS the engine's rule, it does not make one: the
 *   engine's `apAvail` gives a player in multiplayer exactly `apBudget[pid]`, or 0.
 * - **Whose pieces.** From the ROOM's seats, never the engine's `owner` map, which a seat handed on
 *   mid-game does not reach (FINDINGS #81, ruled at P3.4).
 * - **Who is captain.** The captain alone draws, begins command, hands out the Action Points and
 *   ends the turn; the engine refuses those from anyone else.
 * - **What to call people.** The engine names players `m1`, `m2`; the room knows the names they
 *   typed.
 */
import { pidOf, type RoomProjection, type Seat } from '@immunity-wars/protocol';
import type { SessionView } from '@immunity-wars/session';

import { t } from '../i18n';
import { seatRows } from '../together/model';
import { EVERY_SEAT, type SeatRule } from './offered';

/** The room as the relay last described it, and which member this device is. */
export interface Table {
  readonly room: RoomProjection;
  readonly me: number;
}

export interface Perspective {
  /** A game played together. */
  readonly together: boolean;
  /** This player's name in the engine, or null alone. */
  readonly pid: string | null;
  /** Whether this device may take the captain's steps: always alone, only the captain together. */
  readonly captain: boolean;
  /** The captain's name, for "waiting for" lines, or null alone. */
  readonly captainName: string | null;
  readonly seats: SeatRule;
  /** A player's name from the engine's id; someone who has left the room is still somebody. */
  readonly nameOf: (pid: string) => string;
}

export const ALONE: Perspective = {
  together: false,
  pid: null,
  captain: true,
  captainName: null,
  seats: EVERY_SEAT,
  nameOf: (pid) => pid,
};

export function perspectiveOf(table: Table | null): Perspective {
  if (table === null) return ALONE;
  const { room, me } = table;
  const byPid = new Map(room.members.map((m) => [pidOf(m.id), m]));
  const holderOf = new Map<string, RoomProjection['members'][number]>();
  for (const m of room.members) for (const s of m.seats) holderOf.set(s, m);
  const mine = new Set<string>(room.members.find((m) => m.id === me)?.seats ?? []);
  const captain = room.members.find((m) => m.id === room.captain) ?? null;
  return {
    together: true,
    pid: pidOf(me),
    captain: room.captain === me,
    captainName: captain?.name ?? null,
    seats: {
      mine: (seat) => mine.has(seat),
      theirs: (seat) => {
        const h = holderOf.get(seat);
        if (!h) return t('table.nobody');
        return t(h.connected ? 'table.theirs' : 'table.theirsAway', { name: h.name });
      },
    },
    nameOf: (pid) => byPid.get(pid)?.name ?? t('table.someone'),
  };
}

/**
 * THE VIEW AS THIS PLAYER SEES IT: their own Action Points where the screen reads `ap`. Alone, or
 * in a view that is not a game played together, the view itself, untouched.
 */
export function seenBy(view: SessionView, p: Perspective): SessionView {
  const g = view.game;
  if (g['multiplayer'] !== true || p.pid === null) return view;
  const budget = g['apBudget'] as Record<string, unknown> | undefined;
  const own = budget?.[p.pid];
  const ap = typeof own === 'number' ? own : 0;
  return g['ap'] === ap ? view : { ...view, game: { ...g, ap } };
}

/** What each player has to spend this turn, for the captain deciding when to end it. */
export function budgetsOf(view: SessionView, p: Perspective): { name: string; ap: number }[] {
  const g = view.game;
  if (g['multiplayer'] !== true) return [];
  const budget = (g['apBudget'] as Record<string, unknown> | undefined) ?? {};
  const players = ((g['players'] as unknown[] | undefined) ?? []).map(String);
  return players.map((pid) => {
    const n = budget[pid];
    return { name: p.nameOf(pid), ap: typeof n === 'number' ? n : 0 };
  });
}

/**
 * THE CAPTAIN'S DRAFT OF THE ALLOCATION (ruled 25 September 2026, ruling 3): every other player
 * starts at nothing and the whole pool is the captain's, which is where the engine puts it when the
 * phase begins. The captain adds and takes away on the draft, freely, and Confirm sends it.
 *
 * WHY A DRAFT, and not an action per tap: the engine lets only a player give their own points back
 * (`returnAP` takes the sender's), so a captain's point sent by mistake could not be taken back.
 * On a draft, minus is free. Confirm then sends one `allocateAP` per player, which the engine checks
 * against the pool as it always does, and `confirmAllocation` after them.
 *
 * THE DRAFT HOLDS EACH PLAYER'S PLANNED TOTAL, not the points added, so the number shown does not
 * change when the engine's own budget catches up during Confirm: a view raising a player's budget
 * arrives before the answer to the action that raised it, and a count of points added would show
 * those points twice until the answer came.
 */
export type Draft = Readonly<Record<string, number>>;
/** The engine's budgets, by player. */
export type Budgets = Readonly<Record<string, number>>;

/** What a player will have: the captain's plan for them, or what the engine already gives them. */
export const planned = (draft: Draft, budgets: Budgets, pid: string): number =>
  draft[pid] ?? budgets[pid] ?? 0;

/** What the captain still holds once the draft is sent. */
export function poolLeft(draft: Draft, budgets: Budgets, captain: string): number {
  let extra = 0;
  for (const [pid, n] of Object.entries(draft)) extra += n - (budgets[pid] ?? 0);
  return (budgets[captain] ?? 0) - extra;
}

export function addPoint(draft: Draft, budgets: Budgets, captain: string, pid: string): Draft {
  if (pid === captain || poolLeft(draft, budgets, captain) <= 0) return draft;
  return { ...draft, [pid]: planned(draft, budgets, pid) + 1 };
}

/** Never below what the engine already gives them: a point sent is the player's to give back. */
export function removePoint(draft: Draft, budgets: Budgets, pid: string): Draft {
  const now = planned(draft, budgets, pid);
  if (now <= (budgets[pid] ?? 0)) return draft;
  return { ...draft, [pid]: now - 1 };
}

/** The actions Confirm sends, in the engine's order of players, before `confirmAllocation`. */
export function allocationActions(
  draft: Draft,
  budgets: Budgets,
  players: readonly string[],
): { action: 'allocateAP'; toPid: string; amount: number }[] {
  return players
    .map((pid) => ({ pid, amount: planned(draft, budgets, pid) - (budgets[pid] ?? 0) }))
    .filter((x) => x.amount > 0)
    .map((x) => ({ action: 'allocateAP' as const, toPid: x.pid, amount: x.amount }));
}

/* ------------------------------------------------------------------------------------------ *
 * WHEN SOMEONE DROPS (P3.7 piece C). Dropping is the connection closing; the member stays a
 * member and their seats stay theirs, marked away, visible to everyone (brief §5, Gate A). The
 * captain may hand an away member's seats to anyone present, or the table may wait (ruling 4).
 * ------------------------------------------------------------------------------------------ */

export interface WaitingSeat {
  readonly seat: Seat;
  readonly name: string;
  /** For a resident, the organ it lives in. */
  readonly detail: string | null;
  /** Who holds it and is away, or null when nobody holds it. */
  readonly holder: { readonly id: number; readonly name: string } | null;
}

export interface TableSummary {
  readonly members: readonly {
    readonly id: number;
    readonly name: string;
    readonly you: boolean;
    readonly captain: boolean;
    readonly away: boolean;
    /** The pieces they hold, by name, in the engine's order. */
    readonly pieces: readonly string[];
  }[];
  /** The pieces nobody can move right now: held by someone away, or by nobody. */
  readonly waiting: readonly WaitingSeat[];
  /** Who the captain can hand a waiting piece to: everyone connected. */
  readonly present: readonly { readonly id: number; readonly name: string }[];
}

export function tableSummary(table: Table): TableSummary {
  const { room, me } = table;
  const rows = seatRows(room, me);
  const nameOf = new Map(rows.map((r) => [r.seat as string, r.name]));
  return {
    members: room.members.map((m) => ({
      id: m.id,
      name: m.name,
      you: m.id === me,
      captain: m.id === room.captain,
      away: !m.connected,
      pieces: rows.filter((r) => r.holder?.id === m.id).map((r) => nameOf.get(r.seat) ?? r.seat),
    })),
    waiting: rows
      .filter((r) => r.holder === null || r.holder.away)
      .map((r) => ({
        seat: r.seat,
        name: r.name,
        detail: r.detail,
        holder: r.holder ? { id: r.holder.id, name: r.holder.name } : null,
      })),
    present: room.members.filter((m) => m.connected).map((m) => ({ id: m.id, name: m.name })),
  };
}

/**
 * WHAT CHANGED AT THE TABLE, in words, between two descriptions of the room: who went away, who
 * came back, who is captain now, and which pieces were handed to whom. The play screen says these
 * as they happen, so the table's choices are visible to everyone (Gate A) without anyone having to
 * go and look. Nothing about this player's own connection: their own device says that.
 */
export function tableChanges(prev: Table | null, next: Table): string[] {
  if (prev === null) return [];
  const lines: string[] = [];
  const before = new Map(prev.room.members.map((m) => [m.id, m]));
  for (const m of next.room.members) {
    const was = before.get(m.id);
    if (!was || m.id === next.me || was.connected === m.connected) continue;
    lines.push(t(m.connected ? 'table.nowBack' : 'table.nowAway', { name: m.name }));
  }
  if (next.room.captain !== prev.room.captain && next.room.captain !== null) {
    const captain = next.room.members.find((m) => m.id === next.room.captain);
    if (captain)
      lines.push(
        captain.id === next.me
          ? t('table.youCaptain')
          : t('table.nowCaptain', { name: captain.name }),
      );
  }
  const holderBefore = new Map<string, number>();
  for (const m of prev.room.members) for (const s of m.seats) holderBefore.set(s, m.id);
  const rows = seatRows(next.room, next.me);
  for (const m of next.room.members) {
    for (const s of m.seats) {
      const was = holderBefore.get(s);
      if (was === m.id) continue;
      // A seat the holder took themselves before the game is the lobby's business, not news.
      if (next.room.phase !== 'playing') continue;
      const piece = rows.find((r) => r.seat === s)?.name ?? s;
      lines.push(
        m.id === next.me
          ? t('table.handedYou', { piece })
          : t('table.handedOn', { piece, name: m.name }),
      );
    }
  }
  return lines;
}
