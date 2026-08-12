/**
 * E0a — bot fidelity, the fast tier.
 *
 * The published claim comes from the deep run (`../fidelity.ts`, 1,000 seeds x 3). This tier
 * exists so the check cannot rot unnoticed between deep runs: if someone edits
 * `equivalence/bot` or `packages/engine/src/simulate.ts` and the two stop agreeing, `pnpm test`
 * says so on that commit rather than at the next Task E measurement.
 */

import { describe, expect, it } from 'vitest';

import { comparatorControl, compareFidelity, differences, harnessOutcome, seedAt, simulateOutcome } from './fidelity.js';
import { DIFFICULTIES } from './play.js';

const SEEDS = 25;

describe('E0a: the harness bot and simulate()"s inlined bot are the same decision procedure', () => {
  /**
   * FIRST, and it is not ceremony. Everything below reports agreement, and agreement reported by
   * a comparator that cannot detect a difference is worth nothing. This is the same rule the
   * property suite's negative controls enforce: a check that has never failed is not known to
   * work.
   */
  it('the comparator can detect a difference at all', () => {
    const found = comparatorControl();
    expect(found.length).toBeGreaterThan(0);
  });

  it('agrees on every outcome field and on RNG consumption', () => {
    const result = compareFidelity(DIFFICULTIES, SEEDS);

    // Vacuity guard, matching full-run.ts: a green result over zero games is not a pass.
    expect(result.compared).toBe(SEEDS * DIFFICULTIES.length);

    expect({ mismatched: result.mismatched, examples: result.examples }).toEqual({
      mismatched: 0,
      examples: [],
    });
  });

  /**
   * The draw count on its own, asserted separately because it is the field carrying most of the
   * evidence. Thousands of draws per game must line up exactly; two procedures that ever chose
   * differently would almost certainly roll a different number of dice.
   */
  it('consumes randomness identically, draw for draw', () => {
    for (const difficulty of DIFFICULTIES) {
      const a = harnessOutcome(difficulty, seedAt(3));
      const b = simulateOutcome(difficulty, seedAt(3));
      expect(a.rngDraws).toBeGreaterThan(100);
      expect(differences(a, b)).toEqual([]);
    }
  });
});
