/**
 * THE ANALYTIC SAMPLING FLOOR, and both directions of it made to fire.
 *
 * The floor's claim is that `sd(arm)` can never legitimately sit below `sd(one game)/sqrt(perArm)`,
 * because an arm mean IS the mean of `perArm` games and a mean of N independent draws cannot vary
 * less than N independent draws allow. `metrics.ts` carries the argument; this file is the part
 * that can go red.
 *
 * A floor that has never widened a band is a floor nobody has falsified, and a floor that widens
 * EVERY band is not a floor, it is a constant. So both directions are pinned:
 *
 *   1. a calibration deliberately starved of arms is caught and widened;
 *   2. a calibration with enough arms is left alone — `floorApplied === false`;
 *   3. `trunkKillPct` is never floored, at any arm count, because the argument does not apply
 *      to a ratio of sums and claiming one would be a number that looks rigorous and is not.
 *
 * WHY THIS IS NOT A SELF-FULFILLING CHECK. The floor is measured from a seed block disjoint from
 * every calibration arm, so the two quantities being compared are genuinely different samples.
 * `metrics-run.ts` uses seed base 1,000,000 for the same reason. A floor computed from the arms
 * themselves would be partly the same measurement and could not contradict it.
 */

import { describe, expect, it } from 'vitest';

import {
  calibrate,
  FLOORED_METRICS,
  floorFor,
  GATED_METRICS,
  metricsOfBatch,
  PER_GAME_VALUE,
  samplingFloor,
} from './metrics.js';
import { bandOf, SIGMA } from './panel.js';
import { playGame, seedAt } from './play.js';

/** Small, because this file is about the floor's behaviour and not about the game. */
const BATCHES = 4;
const GAMES = 25;
const PER_ARM = BATCHES * GAMES;
const FLOOR_BASE = 2_000_000;
const FLOOR_GAMES = 600;

const floor = samplingFloor('normal', PER_ARM, FLOOR_GAMES, FLOOR_BASE);

describe('the analytic sampling floor', () => {
  it('covers exactly the three metrics that are a mean of a per-game value', () => {
    expect(Object.keys(floor.floors).sort()).toEqual([...FLOORED_METRICS].sort());
    expect(FLOORED_METRICS as readonly string[]).not.toContain('trunkKillPct');
    for (const m of FLOORED_METRICS) {
      expect(floor.floors[m], `${m} has a zero floor`).toBeGreaterThan(0);
    }
  });

  /** The floor is sd(one game)/sqrt(perArm) and nothing else. Arithmetic, pinned. */
  it('is sd(one game) divided by sqrt(games per arm)', () => {
    for (const m of FLOORED_METRICS) {
      expect(floor.floors[m]).toBeCloseTo(floor.perGameSd[m] / Math.sqrt(PER_ARM), 12);
    }
  });

  /**
   * THE CORRESPONDENCE, pinned by measurement rather than by comment.
   *
   * The floor for `avgAntibodiesMade` is only the floor for THAT band if `PER_GAME_VALUE` reads the
   * same quantity `metricsOfBatch` averages. If one changes and the other does not, the floor would
   * be computed from a different quantity than the band it widens — a silent category error that
   * every other test here would sail straight past, because both halves would still be internally
   * consistent.
   *
   * So: play a batch, and require the batch metric to equal the mean of the per-game values.
   */
  it('the per-game value behind each floor is the one metricsOfBatch averages', () => {
    const games = Array.from({ length: 40 }, (_, i) =>
      playGame({ seed: seedAt(FLOOR_BASE + 500_000 + i), difficulty: 'normal' }),
    );
    const batch = metricsOfBatch(games);
    for (const m of FLOORED_METRICS) {
      const mean = games.reduce((a, g) => a + PER_GAME_VALUE[m](g), 0) / games.length;
      expect(
        batch[m],
        `${m}: the floor is computed from a different quantity than the band it widens`,
      ).toBeCloseTo(mean, 12);
    }
  });

  /** `floorFor` must refuse trunkKillPct rather than silently returning something plausible. */
  it('offers no floor for trunkKillPct — a ratio of sums, not a sample mean', () => {
    expect(floorFor(floor, 'trunkKillPct')).toBeUndefined();
    for (const m of FLOORED_METRICS) expect(floorFor(floor, m)).toBeGreaterThan(0);
  });

  /**
   * THE CONTROL, direction 1: starve the calibration and require the floor to catch it.
   *
   * Three arms is the fewest `metrics-run.ts` accepts. At that size sd(arm) is uncertain by ~50%,
   * so it lands below its floor often — which is precisely the state the floor exists to refuse.
   * If this ever stops firing, the floor has stopped being reachable and the tests below are
   * decoration.
   */
  it('CONTROL: an under-sampled calibration is caught and the band widened', () => {
    const starved = calibrate('normal', 3, BATCHES, GAMES, 0);
    const widened = GATED_METRICS.map((m) => bandOf(starved, m, floorFor(floor, m))).filter(
      (b) => b.floorApplied,
    );
    expect(
      widened.length,
      'no band was floored at 3 arms. Either the floor is unreachable or sd(arm) at 3 arms has ' +
        'stopped being noisy — measure before assuming the floor is fine.',
    ).toBeGreaterThan(0);

    for (const b of widened) {
      expect(b.sdArm).toBeGreaterThan(b.sdMeasured);
      expect(b.sdFloor).not.toBeNull();
      expect(b.sdArm).toBe(b.sdFloor);
      // The widening must reach the band edges, not just the recorded sd.
      expect(b.hi - b.mean).toBeCloseTo(SIGMA * b.sdArm, 12);
      expect(b.mean - b.lo).toBeCloseTo(SIGMA * b.sdArm, 12);
    }
  });

  /**
   * THE CONTROL, direction 2 — the one that stops the floor being a constant.
   *
   * A floor that fires on everything would widen every band regardless of evidence and the gate
   * would quietly become "3 sigma of the sampling floor", which is a different instrument. So a
   * band measured ABOVE its floor must come through untouched, byte for byte.
   */
  it('CONTROL: a band already above its floor is left exactly alone', () => {
    const c = calibrate('normal', 4, BATCHES, GAMES, 0);
    let checked = 0;
    for (const m of GATED_METRICS) {
      const f = floorFor(floor, m);
      const withFloor = bandOf(c, m, f);
      const without = bandOf(c, m);
      if (withFloor.floorApplied) continue;
      checked += 1;
      expect(withFloor.sdArm).toBe(without.sdArm);
      expect(withFloor.lo).toBe(without.lo);
      expect(withFloor.hi).toBe(without.hi);
    }
    // THE VACUITY GUARD. Every branch above is behind `if (floorApplied) continue`, so if the
    // floor happened to widen all four bands this test would pass having asserted nothing — a
    // green check that examined zero cases, which is the failure this repository keeps finding.
    expect(
      checked,
      'every band was floored, so the "left alone" case was never exercised. This test proved ' +
        'nothing about it — raise the arm count until at least one band sits above its floor.',
    ).toBeGreaterThan(0);
  });

  /** trunkKillPct keeps its measured sd no matter how badly the calibration under-sampled. */
  it('never floors trunkKillPct, even at the smallest calibration', () => {
    const starved = calibrate('normal', 3, BATCHES, GAMES, 0);
    const b = bandOf(starved, 'trunkKillPct', floorFor(floor, 'trunkKillPct'));
    expect(b.sdFloor).toBeNull();
    expect(b.floorApplied).toBe(false);
    expect(b.sdArm).toBe(b.sdMeasured);
  });
});
