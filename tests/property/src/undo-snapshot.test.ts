/**
 * BRIEF §7 INVARIANT 6, DELIBERATELY NOT WRITTEN AS A PROPERTY.
 *
 * The brief lists "turn number never decreases" among the property-suite invariants, and
 * `TASK_D_HANDOFF.md` notes that "`undo` is the interesting case". It is not, and the reason is
 * worth pinning rather than discovering twice.
 *
 * `pushUndo` (view.ts:24) snapshots FIFTEEN fields, and `turn` is not one of them. Its own header
 * says so: *"Note what is NOT captured: turn, phase, deck, discard, stats, seen, events. Undo
 * rewinds a player's actions within a turn, not the turn itself."* `undo` writes back exactly
 * those fifteen. Nothing else in the engine ever decreases `g.turn`.
 *
 * So a generative assertion that `g.turn` never decreases CANNOT FAIL. It would run tens of
 * thousands of times, pass every time, and mean nothing — which is the exact thing this project
 * has spent Tasks B and C removing. Writing it would have added a ninth green line to the suite
 * and a tenth entry to the list in tests/equivalence/README.md.
 *
 * The regression actually worth guarding is someone ADDING `turn` (or `phase`, or `deck`) to the
 * snapshot — at which point undo really would rewind a turn, and the brief's invariant would
 * become both true and violable at the same moment. That is a key-set assertion, so that is what
 * this is.
 */

import { describe, expect, it } from 'vitest';

import * as portNs from '@immunity-wars/engine';
import type { Engine, GameState } from '@immunity-wars/equivalence/types';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';

const port = portNs as unknown as Engine & {
  pushUndo: (g: GameState) => void;
};

/** Exactly what view.ts:24 captures, in its own order. */
const SNAPSHOT_FIELDS = [
  'inv',
  'cells',
  'residents',
  'ap',
  'antibodies',
  'ab',
  'made',
  'memory',
  'vaccine',
  'clone',
  'cloneFound',
  'presentations',
  'free',
  'organs',
  'log',
] as const;

/** Fields whose presence in the snapshot would make `undo` rewind more than a player's actions. */
const MUST_NOT_BE_CAPTURED = ['turn', 'phase', 'deck', 'discard', 'stats', 'seen', 'events'];

function snapshotOf(difficulty = 'normal'): Record<string, unknown> {
  installRng(910001);
  try {
    const g = port.newGame({ difficulty, science: false });
    port.applyAction(g, { action: 'draw' });
    port.applyAction(g, { action: 'beginCommand' });
    port.pushUndo(g);
    const stack = g.undo as unknown as Record<string, unknown>[];
    const top = stack[stack.length - 1];
    expect(top, 'pushUndo pushed nothing').toBeDefined();
    return top ?? {};
  } finally {
    restoreRng();
  }
}

describe('the undo snapshot captures a turn-safe subset of the state', () => {
  it('captures exactly the fifteen documented fields', () => {
    const keys = Object.keys(snapshotOf()).sort();
    expect(keys).toEqual([...SNAPSHOT_FIELDS].sort());
  });

  it('captures NONE of the fields that would let undo rewind a turn', () => {
    // If this fails, "turn number never decreases" has just become violable, and the right
    // response is to check whether that was intended — not to relax this test. The engine has
    // no other path that lowers g.turn, so this is the whole of the guard.
    const snap = snapshotOf();
    for (const field of MUST_NOT_BE_CAPTURED) {
      expect(
        Object.prototype.hasOwnProperty.call(snap, field),
        `pushUndo now captures "${field}". undo() will restore it, so undo can rewind more ` +
          'than a player\'s actions within a turn. See view.ts:20 and this file\'s header.',
      ).toBe(false);
    }
  });

  it('NEGATIVE CONTROL: the key-set assertion fails when a field is added', () => {
    // The assertion above is a `toEqual` on a sorted key list, which is easy to believe and
    // cheap to get wrong (an `expect.arrayContaining` would pass on a superset and prove
    // nothing). Demonstrated rather than assumed.
    const snap = snapshotOf();
    const tampered = { ...snap, turn: 4 };
    expect(Object.keys(tampered).sort()).not.toEqual([...SNAPSHOT_FIELDS].sort());
    expect(Object.prototype.hasOwnProperty.call(tampered, 'turn')).toBe(true);
  });

  it('the snapshot shape is the same at every difficulty', () => {
    const base = Object.keys(snapshotOf('normal')).sort();
    for (const d of ['training', 'hard']) {
      expect(Object.keys(snapshotOf(d)).sort(), `snapshot differs on ${d}`).toEqual(base);
    }
  });
});
