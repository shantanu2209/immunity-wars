/**
 * FINDINGS #80: THE ID WORKAROUND READS THE UNDO SNAPSHOTS UNDER THE KEY THE ENGINE WRITES.
 *
 * `advanceIdsPast` must advance the engine's invader-id counter past every id a game still holds,
 * including one that survives only in an undo snapshot: an invader killed this phase, which an undo
 * would bring back. It read the snapshots as `snap.invaders` while the engine writes `snap.inv`, so
 * that half never read anything.
 *
 * The snapshot here is the ENGINE's, taken by its own `pushUndo` on a real game, not one written by
 * hand: a hand-written snapshot would only test the key its author believed in, which is exactly the
 * belief that was wrong.
 */
import { applyAction, newGame, pushUndo } from '@immunity-wars/engine';
import type { Action, GameState } from '@immunity-wars/engine';
import { resetUid, uid } from '@immunity-wars/engine/internal';
import { describe, expect, it } from 'vitest';

import { advanceIdsPast } from './ids.js';

type Raw = Record<string, unknown>;
const num = (id: unknown): number => Number(/^i(\d+)$/.exec(String(id))?.[1] ?? 0);

const act = (g: GameState, action: string): void => {
  applyAction(g, { action } as unknown as Action);
};

/** A real single-player game, played turn by turn until at least three invaders are in the body. */
function withInvaders(): GameState {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const g = newGame({ difficulty: 'hard' }) as GameState;
    const raw = g as unknown as Raw;
    for (let turn = 0; turn < 20 && !raw['won'] && !raw['lost']; turn += 1) {
      act(g, 'draw');
      if ((raw['invaders'] as unknown[]).length >= 3) return g;
      act(g, 'beginCommand');
      act(g, 'endCommand');
    }
  }
  throw new Error('no game reached three invaders');
}

describe('advanceIdsPast', () => {
  it("advances past an id that only the engine's own undo snapshot still holds", () => {
    const g = withInvaders();
    const raw = g as unknown as Raw;
    pushUndo(g);
    // The TWO highest ids are killed after the snapshot, so only an undo still holds them.
    const body = [...(raw['invaders'] as { id: string }[])].sort((a, b) => num(a.id) - num(b.id));
    const top = body[body.length - 1];
    raw['invaders'] = body.slice(0, -2);
    const bodyMax = Math.max(0, ...(raw['invaders'] as { id: string }[]).map((iv) => num(iv.id)));
    // NOT VACUOUS, and why two: `advanceIdsPast` spends one id reading the counter, so an id just one
    // above the body's highest is passed by accident. The first version of this test killed one
    // invader of a game that had only one, and passed on the unfixed code for exactly that reason.
    expect(num(top?.id)).toBeGreaterThan(bodyMax + 1);

    resetUid(); // a fresh process: the counter starts again at zero
    advanceIdsPast(raw);
    expect(num(uid())).toBeGreaterThan(num(top?.id));
  });

  // The half that always worked, held too: the body's own ids and a resident's infection.
  it("advances past the body's ids and a resident's infection", () => {
    resetUid();
    advanceIdsPast({
      invaders: [{ id: 'i5' }],
      undo: [],
      residents: { liver: { infectedBy: 'i12' } },
    });
    expect(num(uid())).toBeGreaterThan(12);
  });

  it('never lowers the counter, which every game in the process shares', () => {
    resetUid();
    for (let i = 0; i < 40; i += 1) uid();
    advanceIdsPast({ invaders: [{ id: 'i3' }], undo: [], residents: {} });
    expect(num(uid())).toBeGreaterThan(40);
  });
});
