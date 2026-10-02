/**
 * FINDINGS #56, ON A RELAY: many rooms, one process, one invader-id counter.
 *
 * The engine hands out invader ids from a module-level counter that `newGame` resets. In single
 * player that bit only on resume, and `LocalSession` works around it there. A relay is worse: it
 * hosts many rooms in one process, so a game STARTING in one room resets the counter for every
 * other room mid-game, and that room's next arrivals reuse ids already in its body. Every id-keyed
 * action — an attack ring, the memory response — can then act on the wrong pathogen.
 *
 * Played exactly as a relay would: two rooms, interleaved, a new game started in the second while
 * the first is under way.
 *
 * ON SEEDED DICE, SINCE 2 OCTOBER 2026 (FINDINGS #122). The games were played on the page's own
 * dice, and this test's control, a counter shared between rooms again, was measured to go
 * unnoticed in 63 games of 1,000. In 56 of them the first table, on Hard with nobody playing, lost
 * its game on the very turn the second table began, before the shared counter had been restarted;
 * in the other 7 every id handed out again was one whose first holder had already gone. So the
 * verdict was a roll of the dice, 15 times in 16 the right one. Now the dice are seeded, the same
 * games are played on every run, and the second table brings its first pathogens BEFORE the first
 * table's next turn, so every arrival that is checked comes after the other table began.
 */
import { describe, expect, it, vi } from 'vitest';

import { createRoom, step } from './room.js';
import type { Inbound, RoomState } from './types.js';

function openRoom(code: string): { say: (m: Inbound) => void; room: () => RoomState } {
  let room = createRoom(code, 0);
  return {
    say: (m) => {
      room = step(room, m, 0).room;
    },
    room: () => room,
  };
}

function seatAndStart(r: ReturnType<typeof openRoom>): void {
  r.say({ kind: 'join', ref: 'a', name: 'A' });
  r.say({ kind: 'claimSeat', ref: 'a', seat: 'bcell' });
  r.say({ kind: 'start', ref: 'a', difficulty: 'hard' });
}

function playTurn(r: ReturnType<typeof openRoom>): void {
  for (const action of ['draw', 'beginCommand', 'confirmAllocation', 'endCommand'])
    r.say({ kind: 'action', id: 1, ref: 'a', action: { action } });
}

const ids = (room: RoomState): string[] =>
  (((room.game as { invaders?: { id: string }[] } | null)?.invaders ?? []) as { id: string }[]).map(
    (iv) => iv.id,
  );

const num = (id: string): number => Number(/^i(\d+)$/.exec(id)?.[1] ?? 0);

/** The engine's only dice are `Math.random`. A small seeded generator (mulberry32) in its place. */
function seededDice(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Eight pairs of games, the same on every run. */
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * One pair of games. Returns how many pathogens reached the first table after the second table
 * began, each of them checked.
 */
function playTwoRooms(seed: number): number {
  const first = openRoom('FIRST');
  seatAndStart(first);
  for (let t = 0; t < 3; t += 1) playTurn(first);
  // Every id the first table has been seen to hold, and the highest of them.
  const seen = new Set(ids(first.room()));
  let highest = Math.max(0, ...[...seen].map(num));
  expect(
    highest,
    `seed ${String(seed)}: the first table held nothing after three turns`,
  ).toBeGreaterThan(0);

  // A second table starts a game, in the same process, while the first is mid-game.
  const second = openRoom('SECOND');
  seatAndStart(second);

  let arrivals = 0;
  for (let t = 0; t < 4 && first.room().phase === 'playing'; t += 1) {
    // The second table first: its pathogens arrive, and then the first table's next ones do.
    playTurn(second);
    playTurn(first);
    const now = ids(first.room());
    const counts = new Map<string, number>();
    for (const id of now) counts.set(id, (counts.get(id) ?? 0) + 1);
    for (const [id, n] of counts) {
      // DETERMINISTIC, where a duplicate check alone is not: a reused id is only VISIBLE as a
      // duplicate if the pathogen that first had it is still alive. So the invariant checked is the
      // stronger one: an id the table has not held before is higher than every id it has held.
      expect(n, `seed ${String(seed)}: ${id} held twice in FIRST: ${now.join(',')}`).toBe(1);
      if (seen.has(id)) continue;
      arrivals += 1;
      expect(
        num(id),
        `seed ${String(seed)}: ${id} reissued after the other table began: ${now.join(',')}`,
      ).toBeGreaterThan(highest);
    }
    for (const id of now) seen.add(id);
    highest = Math.max(highest, ...now.map(num));
  }
  return arrivals;
}

describe('invader ids stay unique within a room while other rooms start games', () => {
  it('holds across two rooms interleaved in one process', () => {
    const arrivals: number[] = [];
    for (const seed of SEEDS) {
      const dice = vi.spyOn(Math, 'random').mockImplementation(seededDice(seed));
      try {
        arrivals.push(playTwoRooms(seed));
      } finally {
        dice.mockRestore();
      }
    }
    // Not vacuous, and said game by game: the first table did receive new pathogens after the
    // second table began. A game that ended too soon to receive any would have checked nothing.
    expect(
      arrivals.filter((n) => n > 0).length,
      `ARRIVALS AFTER THE SECOND TABLE BEGAN, BY GAME: ${arrivals.join(', ')}`,
    ).toBe(SEEDS.length);
  });
});
