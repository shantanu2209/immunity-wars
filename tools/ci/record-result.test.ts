/**
 * The result writer, over the real manifest.
 *
 * This exists because the thing it replaced could not be tested: a `printf` inside a workflow step
 * only runs in CI, and its two defects — an empty `${{ matrix.scale }}` and unescaped JSON — were
 * both invisible in a green run. The first shipped and reached a published page.
 */

import { describe, expect, it } from 'vitest';

import { loadManifest, groupedMatrix } from './matrix.js';
import { resultFor } from './record-result.js';

const manifest = loadManifest();
const NOW = new Date('2026-08-19T02:14:00Z');

describe('recording a suite result', () => {
  /**
   * THE DEFECT THAT SHIPPED. Every suite in every automated tier must produce a non-empty detail.
   * The workflow previously read `matrix.scale` from the GROUPED matrix, which does not carry it,
   * so every result file the first real nightly wrote had `"detail": ""`.
   */
  it('gives every suite in every automated tier a non-empty detail', () => {
    let checked = 0;
    for (const tier of ['per-push', 'nightly'] as const) {
      for (const group of groupedMatrix(manifest, tier)) {
        for (const id of group.suiteIds) {
          const r = resultFor(id, 'pass', tier, NOW, manifest);
          expect(r.detail.length, `${tier}/${id} recorded an empty detail`).toBeGreaterThan(0);
          checked += 1;
        }
      }
    }
    // Vacuity guard: the assertions are three loops deep.
    expect(checked, 'no suite results were checked at all').toBeGreaterThan(0);
  });

  it('takes the detail from the manifest, so the page and suites.json cannot disagree', () => {
    const suite = manifest.suites.find((s) => s.id === 'balance-panel');
    const expected = suite?.tiers.nightly?.scale;
    expect(expected).toBeTruthy();
    expect(resultFor('balance-panel', 'pass', 'nightly', NOW, manifest).detail).toBe(expected);
  });

  /**
   * Serialised with JSON.stringify, never printf. The manifest's scales are prose and may contain
   * any punctuation; `build.ts` treats an unparseable result as MISSING, so a stray quote would
   * have turned a passing suite red with no explanation anywhere.
   */
  it('round-trips through JSON even when the scale contains hostile punctuation', () => {
    const hostile = structuredClone(manifest) as typeof manifest;
    const suite = hostile.suites.find((s) => s.id === 'property');
    if (suite?.tiers.nightly) {
      (suite.tiers.nightly as { scale: string }).scale = 'a "quoted" scale, with \\ and \n newline';
    }
    const record = resultFor('property', 'pass', 'nightly', NOW, hostile);
    const parsed = JSON.parse(JSON.stringify(record)) as { detail: string };
    expect(parsed.detail).toBe('a "quoted" scale, with \\ and \n newline');
  });

  it('records the status and the tier it ran in', () => {
    expect(resultFor('property', 'fail', 'nightly', NOW, manifest).status).toBe('fail');
    expect(resultFor('property', 'pass', 'per-push', NOW, manifest).tier).toBe('per-push');
  });

  /**
   * Drift between the workflow and the manifest must be loud. A job recording a result for a suite
   * that does not exist, or for a tier the suite does not declare, means the two have come apart —
   * and the dashboard would otherwise show a plausible row built from nothing.
   */
  it('CONTROL: refuses a suite that is not in the manifest', () => {
    expect(() => resultFor('no-such-suite', 'pass', 'nightly', NOW, manifest)).toThrow(
      /no suite "no-such-suite"/,
    );
  });

  it('CONTROL: refuses a tier the suite does not declare', () => {
    const suite = manifest.suites.find((s) => s.tiers.manual === undefined);
    expect(
      suite,
      'every suite has a manual tier — pick a different one for this control',
    ).toBeTruthy();
    if (suite) {
      expect(() => resultFor(suite.id, 'pass', 'manual', NOW, manifest)).toThrow(
        /no "manual" tier/,
      );
    }
  });
});
