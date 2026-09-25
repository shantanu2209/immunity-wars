/**
 * THE TABLE, held to its rules before a phone sees it (P3.7 piece B). Whose Action Points, whose
 * pieces, who is captain, what to call people, and the captain's draft of the allocation.
 *
 * That the engine and the room ACCEPT what a player is offered under these rules is held elsewhere,
 * against the real room: `tests/session/src/table-offers.test.ts`.
 */
import type { SessionView } from '@immunity-wars/session';
import { describe, expect, it } from 'vitest';

import {
  ALONE,
  addPoint,
  allocationActions,
  budgetsOf,
  perspectiveOf,
  poolLeft,
  removePoint,
  seenBy,
  type Table,
} from './table';

const table = (me: number, over: Partial<Table['room']> = {}): Table => ({
  me,
  room: {
    code: 'ACDEFG',
    phase: 'playing',
    captain: 1,
    members: [
      { id: 1, name: 'Asha', connected: true, seats: ['macrophage', 'res_liver'] },
      { id: 2, name: 'Ravi', connected: true, seats: ['nk'] },
      { id: 3, name: 'Meera', connected: false, seats: ['bcell'] },
    ],
    freeSeats: [],
    ...over,
  },
});

const view = (game: Record<string, unknown>): SessionView =>
  ({
    game,
    selection: { cell: null, family: null, resident: null },
  }) as unknown as SessionView;

describe('whose Action Points', () => {
  const together = view({
    multiplayer: true,
    ap: 6,
    apBudget: { m1: 1, m2: 3, m3: 0 },
    players: ['m1', 'm2', 'm3'],
  });

  it("are the player's own budget in a game played together, not the table's total", () => {
    expect(seenBy(together, perspectiveOf(table(2))).game['ap']).toBe(3);
    expect(seenBy(together, perspectiveOf(table(1))).game['ap']).toBe(1);
  });

  it('are nothing for a player the engine has no budget for, as the engine reads it', () => {
    expect(seenBy(together, perspectiveOf(table(9))).game['ap']).toBe(0);
  });

  it('are the view itself alone, and in a view that is not a game played together', () => {
    const alone = view({ multiplayer: false, ap: 6 });
    expect(seenBy(alone, ALONE)).toBe(alone);
    expect(seenBy(alone, perspectiveOf(table(2)))).toBe(alone);
    expect(seenBy(together, ALONE)).toBe(together);
  });

  it("are listed for every player by name, for the captain's decision to end the turn", () => {
    expect(budgetsOf(together, perspectiveOf(table(1)))).toEqual([
      { name: 'Asha', ap: 1 },
      { name: 'Ravi', ap: 3 },
      { name: 'Meera', ap: 0 },
    ]);
  });
});

describe('whose pieces', () => {
  it("are the room's seats: a cell or a resident this player holds, and nothing else", () => {
    const seats = perspectiveOf(table(1)).seats;
    expect(seats.mine('macrophage')).toBe(true);
    expect(seats.mine('res_liver')).toBe(true);
    expect(seats.mine('nk')).toBe(false);
    expect(seats.mine('tcell')).toBe(false);
  });

  it("name who plays another player's piece, whether they are away, or that nobody does", () => {
    const seats = perspectiveOf(table(1)).seats;
    expect(seats.theirs('nk')).toContain('Ravi');
    expect(seats.theirs('bcell')).toContain('Meera');
    expect(seats.theirs('bcell')).not.toBe(seats.theirs('nk').replace('Ravi', 'Meera'));
    expect(seats.theirs('tcell')).not.toContain('⟪');
    expect(seats.theirs('tcell')).not.toBe(seats.theirs('nk'));
  });

  it('are every seat alone', () => {
    expect(ALONE.seats.mine('tcell')).toBe(true);
  });
});

describe('the captain', () => {
  it("is the room's captain, by public id, and named for everyone else", () => {
    expect(perspectiveOf(table(1)).captain).toBe(true);
    expect(perspectiveOf(table(2)).captain).toBe(false);
    expect(perspectiveOf(table(2)).captainName).toBe('Asha');
    expect(perspectiveOf(table(2, { captain: 2 })).captain).toBe(true);
  });

  it('is whoever plays alone', () => {
    expect(ALONE.captain).toBe(true);
  });
});

describe('what to call people', () => {
  it("is the name they typed, from the engine's id, and someone who left is still somebody", () => {
    const p = perspectiveOf(table(1));
    expect(p.nameOf('m2')).toBe('Ravi');
    expect(p.nameOf('m7')).not.toContain('m7');
    expect(p.nameOf('m7')).not.toContain('⟪');
  });
});

describe("the captain's draft of the allocation", () => {
  // The engine's state when the phase begins: the whole pool with the captain (ruling 3).
  const start = { m1: 6, m2: 0, m3: 0 };

  it('starts every other player at nothing and the pool with the captain', () => {
    expect(poolLeft({}, start, 'm1')).toBe(6);
  });

  it('gives a point from the pool, and not one more than the pool holds', () => {
    let d = addPoint({}, start, 'm1', 'm2');
    d = addPoint(d, start, 'm1', 'm2');
    expect(d).toEqual({ m2: 2 });
    expect(poolLeft(d, start, 'm1')).toBe(4);
    for (let i = 0; i < 10; i += 1) d = addPoint(d, start, 'm1', 'm3');
    expect(d).toEqual({ m2: 2, m3: 4 });
    expect(poolLeft(d, start, 'm1')).toBe(0);
  });

  it('never gives the captain points from their own pool', () => {
    expect(addPoint({}, start, 'm1', 'm1')).toEqual({});
  });

  it('takes a point back freely, never below what the engine already gives them', () => {
    const sent = { m1: 4, m2: 2, m3: 0 };
    let d = addPoint({}, sent, 'm1', 'm2');
    expect(d).toEqual({ m2: 3 });
    d = removePoint(d, sent, 'm2');
    d = removePoint(d, sent, 'm2');
    expect(d).toEqual({ m2: 2 });
    expect(poolLeft(d, sent, 'm1')).toBe(4);
  });

  it("sends one allocation per player, the difference from the engine's, in the engine's order", () => {
    const players = ['m1', 'm2', 'm3'];
    expect(allocationActions({ m3: 1, m2: 2 }, start, players)).toEqual([
      { action: 'allocateAP', toPid: 'm2', amount: 2 },
      { action: 'allocateAP', toPid: 'm3', amount: 1 },
    ]);
    // Halfway through a Confirm the engine already holds Ravi's two: only Meera's is still owed.
    const halfway = { m1: 4, m2: 2, m3: 0 };
    expect(allocationActions({ m3: 1, m2: 2 }, halfway, players)).toEqual([
      { action: 'allocateAP', toPid: 'm3', amount: 1 },
    ]);
    expect(poolLeft({ m3: 1, m2: 2 }, halfway, 'm1')).toBe(poolLeft({ m3: 1, m2: 2 }, start, 'm1'));
  });
});
