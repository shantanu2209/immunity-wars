/**
 * The shipped `bands.json` is loadable, current, and shaped the way the evaluator expects.
 *
 * Cheap insurance against the failure this file is uniquely exposed to: **it is generated data
 * that nothing imports.** The TypeScript compiler cannot see it, so a metric renamed in
 * `metrics.ts` or an arm shape changed in `metrics-run.ts` leaves a bands file that is silently
 * stale — and `check.ts` would go on gating against it, comparing an engine to a reference for a
 * game that no longer exists.
 *
 * These are structure checks, not value checks. Asserting the measured numbers here would pin the
 * bands to themselves and mean nothing; what the numbers are checked against is a held-out arm,
 * in `metrics-run.ts`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { GATED_METRICS, GENERATOR, GENERATOR_VERSION } from './metrics.js';
import { LOUD_SIGMA, SIGMA, mismatchedShape, type Band, type BandFile } from './panel.js';
import { DIFFICULTIES } from './play.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const file = JSON.parse(readFileSync(join(HERE, '..', 'bands.json'), 'utf8')) as BandFile;

describe('bands.json', () => {
  it('covers every difficulty, with every gated metric', () => {
    for (const d of DIFFICULTIES) {
      const entry = file.difficulties[d];
      expect(entry, `no bands for ${d}`).toBeTruthy();
      const names = (entry?.bands ?? []).map((b) => b.metric).sort();
      expect(names).toEqual([...GATED_METRICS].sort());
    }
  });

  /** A band measured on fewer than three arms is not a measurement of spread. */
  it('was calibrated on enough independent arms to be a null distribution', () => {
    for (const d of DIFFICULTIES) {
      expect(file.difficulties[d]?.arms ?? 0).toBeGreaterThanOrEqual(3);
    }
  });

  it('has real width, and lo/hi agree with mean ± 3 sd', () => {
    for (const d of DIFFICULTIES) {
      for (const b of file.difficulties[d]?.bands ?? []) {
        expect(b.sdArm, `${d}/${b.metric} has a zero-width band`).toBeGreaterThan(0);
        expect(b.lo).toBeCloseTo(b.mean - SIGMA * b.sdArm, 9);
        expect(b.hi).toBeCloseTo(b.mean + SIGMA * b.sdArm, 9);
      }
    }
  });

  /**
   * The shipped bands respect the analytic floor — `sdArm` is never below
   * `sd(one game)/sqrt(perArm)`, because a mean of N independent games cannot vary less than N
   * independent games allow (`metrics.ts`, docs/FINDINGS.md #35).
   *
   * This is a STRUCTURE check on the file, like everything else here: it asserts the shipped
   * numbers are internally consistent with the floor recorded alongside them. Whether the floor is
   * itself correct is `floor.test.ts`'s question, and whether it costs detection is
   * `metrics-control.test.ts`'s.
   */
  it('respects the analytic sampling floor, and records both numbers', () => {
    for (const d of DIFFICULTIES) {
      for (const b of file.difficulties[d]?.bands ?? []) {
        expect(b.sdMeasured, `${d}/${b.metric} lost its measured sd`).toBeGreaterThan(0);
        expect(b.sdArm).toBe(Math.max(b.sdMeasured, b.sdFloor ?? 0));
        expect(b.floorApplied).toBe(b.sdArm !== b.sdMeasured);
        if (b.metric === 'trunkKillPct') {
          // A ratio of sums has no sqrt(N) floor. Claiming one would be a number that looks
          // rigorous and is not — the failure mode this project keeps finding.
          expect(b.sdFloor, 'trunkKillPct was given a floor it cannot have').toBeNull();
          expect(b.floorApplied).toBe(false);
        } else {
          expect(b.sdFloor, `${d}/${b.metric} has no floor recorded`).toBeGreaterThan(0);
        }
      }
    }
  });

  /** The floor's own provenance, so the sanity check is reproducible from the file alone. */
  it('records where the floor was measured', () => {
    for (const d of DIFFICULTIES) {
      const f = file.difficulties[d]?.samplingFloor;
      expect(f, `no samplingFloor recorded for ${d}`).toBeTruthy();
      if (!f) continue;
      expect(f.games).toBeGreaterThan(0);
      // The floor is only meaningful for the arm size it divides by. A floor computed for a
      // different perArm than the bands were calibrated at would be a silent category error.
      const first = file.difficulties[d]?.bands[0];
      expect(first).toBeTruthy();
      if (first) expect(f.perArm).toBe(first.batches * first.gamesPerBatch);
      expect(f.seedIndexTo).toBeGreaterThan(f.seedIndexFrom);
    }
  });

  it('is internally consistent about the arm shape it is valid for', () => {
    for (const d of DIFFICULTIES) {
      const bands = (file.difficulties[d]?.bands ?? []) as Band[];
      const first = bands[0];
      expect(first).toBeTruthy();
      if (!first) continue;
      expect(mismatchedShape(bands, first.batches, first.gamesPerBatch)).toBe(false);
    }
  });

  /** The generator is the condition every figure in this file is conditional on. */
  it('records the generator, the thresholds and the seed schedule it was measured with', () => {
    expect(file.generator).toBe(GENERATOR);
    expect(file.generatorVersion).toBe(GENERATOR_VERSION);
    expect(file.sigma).toBe(SIGMA);
    expect(file.loudSigma).toBe(LOUD_SIGMA);
    for (const d of DIFFICULTIES) {
      expect(file.difficulties[d]?.provenance.seedSchedule).toContain('splitmix32');
    }
  });

  /**
   * The win rate is present and is NOT among the gated metrics. If it ever moved into the bands, a
   * build could fail on a number pinned at zero — the exact mistake this panel exists to avoid.
   */
  it('reports the win rate without gating on it', () => {
    for (const d of DIFFICULTIES) {
      const entry = file.difficulties[d];
      expect(entry?.reportedNotGated).toHaveProperty('winRateUnderReferenceBot');
      expect((entry?.bands ?? []).map((b) => String(b.metric))).not.toContain(
        'winRateUnderReferenceBot',
      );
    }
  });
});
