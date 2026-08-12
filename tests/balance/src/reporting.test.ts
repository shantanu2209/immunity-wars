/**
 * The reporting constraint, enforced rather than remembered.
 *
 * `docs/FINDINGS.md` #6 fixes the wording every balance figure must travel with:
 *
 *   > Win rate under the reference bot, vN, at N games per difficulty.
 *
 * It is required because a reader who takes a bot-conditional figure as a statement about human
 * play draws a false conclusion, and these are the first numbers from this project that will be
 * quoted outside the repository — grant applications, judges, the portfolio site. The bot wins
 * ~0% on Normal where humans win essentially every game.
 *
 * A caveat in a document travels separately from the number it qualifies. A caveat in the RENDERER
 * does not: a figure cannot be produced without it. That is what these tests hold in place, and
 * the last one is the control — it strips the qualifier and requires the check to notice, because
 * a check that has never failed is not known to work.
 */

import { describe, expect, it } from 'vitest';

import { GATED_METRICS, GENERATOR, GENERATOR_VERSION, measure, render, valueOf, type MetricValue } from './metrics.js';

/** Tiny — this suite is about the shape of the output, not the size of the sample. */
const run = measure('normal', 3, 6, 0);

const REQUIRED = [
  `under the ${GENERATOR} ${GENERATOR_VERSION}`,
  'games',
  'on normal',
];

describe('every published figure carries the conditions that produced it', () => {
  it('renders the generator, its version, the game count and the difficulty — on every metric', () => {
    for (const metric of GATED_METRICS) {
      const line = render(valueOf(run, metric));
      for (const fragment of REQUIRED) {
        expect(line, `"${line}" is missing "${fragment}"`).toContain(fragment);
      }
      expect(line).toContain(metric);
    }
  });

  /**
   * The provenance is on the value, not bolted on by the renderer, so a figure cannot be
   * constructed without it. If these ever become optional, a caller could produce a bare number
   * and the renderer would have nothing to attach.
   */
  it('provenance is carried by the value itself', () => {
    const v = valueOf(run, 'avgTurnsSurvived');
    expect(v.provenance.generator).toBe(GENERATOR);
    expect(v.provenance.generatorVersion).toBe(GENERATOR_VERSION);
    expect(v.provenance.gamesPerBatch).toBe(6);
    expect(v.provenance.batches).toBe(3);
    expect(v.provenance.difficulty).toBe('normal');
    expect(v.provenance.packId).toBeTruthy();
    expect(v.provenance.rulesVersion).toBeTruthy();
    expect(v.provenance.seedIndexTo).toBeGreaterThan(v.provenance.seedIndexFrom);
    expect(v.provenance.seedSchedule).toContain('splitmix32');
  });

  /**
   * The win rate exists ONLY under a name that carries its condition, so a value pasted into a
   * slide drags the qualifier along in its own field name. `docs/FINDINGS.md` #1 and #6.
   */
  it('the win rate has no unqualified name anywhere in the panel', () => {
    const keys = Object.keys(run.batches[0] ?? {});
    expect(keys).toContain('winRateUnderReferenceBot');
    expect(keys).not.toContain('winRate');
    expect(GATED_METRICS as readonly string[]).not.toContain('winRateUnderReferenceBot');
  });

  /**
   * THE CONTROL. Everything above asserts that a rendered line contains the qualifier — and a
   * check like that passes trivially if the fragments it looks for are ones every string happens
   * to contain, or if the assertion is never actually applied.
   *
   * So: render a value whose provenance has had the generator stripped, and require the same
   * check to fail. If this test ever goes green in both directions, the three above are decoration.
   */
  it('CONTROL: a figure rendered without its generator fails the same check', () => {
    const good = valueOf(run, 'avgTurnsSurvived');
    const stripped: MetricValue = {
      ...good,
      provenance: { ...good.provenance, generator: '', generatorVersion: '' },
    };

    const line = render(stripped);
    const missing = REQUIRED.filter((fragment) => !line.includes(fragment));
    expect(
      missing,
      'a figure with no generator still satisfied the qualifier check — the check is vacuous',
    ).not.toHaveLength(0);
  });
});
