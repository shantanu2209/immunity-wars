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
const file = JSON.parse(
  readFileSync(join(HERE, '..', 'bands.json'), 'utf8'),
) as BandFile;

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
