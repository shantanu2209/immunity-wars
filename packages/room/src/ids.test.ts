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
 */
import { describe, expect, it } from 'vitest';

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

describe('invader ids stay unique within a room while other rooms start games', () => {
  // DETERMINISTIC, where a duplicate check is not: a reused id is only VISIBLE as a duplicate if the
  // pathogen that first had it is still alive. The first version of this test caught the collision
  // in 2 runs of 3 for exactly that reason. So the invariant checked is the stronger one: every id
  // a room hands out after another room's reset is higher than any id it held before the reset.
  it('holds across two rooms interleaved in one process', () => {
    const first = openRoom('FIRST');
    seatAndStart(first);
    for (let t = 0; t < 3; t += 1) playTurn(first);
    const before = ids(first.room());
    const maxBefore = Math.max(0, ...before.map(num));
    expect(maxBefore).toBeGreaterThan(0);

    // A second table starts a game, in the same process, while the first is mid-game.
    const second = openRoom('SECOND');
    seatAndStart(second);

    let arrivals = 0;
    for (let t = 0; t < 4 && first.room().phase === 'playing'; t += 1) {
      playTurn(first);
      playTurn(second);
      const now = ids(first.room());
      const counts = new Map<string, number>();
      for (const id of now) counts.set(id, (counts.get(id) ?? 0) + 1);
      for (const [id, n] of counts) {
        const wasThere = before.includes(id);
        if (!wasThere) arrivals += 1;
        // An id that was there before must not have been handed out again, and a new one must be
        // above everything the room had issued before the other room's reset.
        expect(n, `${id} held twice in FIRST: ${now.join(',')}`).toBe(1);
        if (!wasThere)
          expect(num(id), `${id} reissued after the reset: ${now.join(',')}`).toBeGreaterThan(
            maxBefore,
          );
      }
    }
    // Not vacuous: the first room did receive new pathogens after the reset.
    expect(arrivals).toBeGreaterThan(0);
  });
});
