/**
 * The property suite, fast tier.
 *
 * Runs in `pnpm test`. The ≥10,000-game tier the brief's definition of done asks for is
 * `full-run.ts`, on demand — same two-tier arrangement as the equivalence corpus, where
 * `pnpm test` runs the smoke batch and `full-corpus.ts` runs 6,000 games. Wiring either into CI
 * is Task F's.
 *
 * fast-check GENERATES; it does not shrink. `endOnFailure: true` turns its shrinker off, because
 * what it would hand back is a reduced *choice record*, which nobody can read. Minimisation goes
 * through `ddmin` — the same delta-debugger the corpus uses for divergences — so a property
 * failure reports as a minimal ACTION LIST, in the format this project already knows how to
 * read. See `runner.ts`'s `shrinkViolation`.
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ALL_INVARIANTS } from './invariants.js';
import { runGame, shrinkViolation } from './runner.js';

const difficulty = fc.constantFrom('training', 'normal', 'hard');
const seed = fc.integer({ min: 1, max: 2_000_000_000 });
const maxTurns = fc.integer({ min: 4, max: 22 });

describe('property: generated legal play never breaks an invariant', () => {
  it('holds across randomly seeded games', () => {
    fc.assert(
      fc.property(seed, difficulty, maxTurns, (s, d, t) => {
        const run = runGame({ seed: s, difficulty: d, maxTurns: t });
        if (run.violations.length === 0) return true;
        const report = shrinkViolation(run);
        throw new Error(report ? report.text : JSON.stringify(run.violations[0]));
      }),
      {
        numRuns: 120,
        // fast-check's shrinker is OFF on purpose — ddmin does the minimising. See the header.
        endOnFailure: true,
        seed: 20260812,
      },
    );
  });

  it('holds on the difficulties measured separately, so one cannot hide behind another', () => {
    // A single mixed sample can pass while one difficulty is never drawn enough to matter.
    // Hard is where AP is tightest (4/turn) and where worms arrive already lodged.
    for (const d of ['training', 'normal', 'hard']) {
      for (let i = 0; i < 12; i += 1) {
        const run = runGame({ seed: 880000 + i, difficulty: d, maxTurns: 20 });
        if (run.violations.length > 0) {
          const report = shrinkViolation(run);
          throw new Error(report ? report.text : JSON.stringify(run.violations[0]));
        }
      }
    }
  });
});

describe('property: the run is not vacuous', () => {
  it('every invariant examined something, and the counts are reported', () => {
    // The same guard `full-run.ts` applies at the end of the long tier. A green suite whose
    // counts contain a zero is an invariant that never ran, not one that passed.
    const totals: Record<string, number> = {};
    for (const inv of ALL_INVARIANTS) totals[inv.id] = 0;
    let states = 0;
    for (const d of ['training', 'normal', 'hard']) {
      for (let i = 0; i < 6; i += 1) {
        const run = runGame({ seed: 890000 + i, difficulty: d });
        states += run.states;
        for (const [id, n] of Object.entries(run.checks)) totals[id] = (totals[id] ?? 0) + n;
      }
    }
    expect(states).toBeGreaterThan(1000);
    for (const inv of ALL_INVARIANTS) {
      expect(totals[inv.id] ?? 0, `${inv.id} examined nothing`).toBeGreaterThan(0);
    }
  });

  it('is reproducible: the same seed produces the same action list', () => {
    // Without this, a failure report naming a seed would not be actionable.
    const a = runGame({ seed: 891234, difficulty: 'hard' });
    const b = runGame({ seed: 891234, difficulty: 'hard' });
    expect(b.actions).toEqual(a.actions);
    expect(b.states).toBe(a.states);
  });

  it('different seeds produce different games', () => {
    const a = runGame({ seed: 891234, difficulty: 'hard' });
    const b = runGame({ seed: 891235, difficulty: 'hard' });
    expect(b.actions).not.toEqual(a.actions);
  });
});
