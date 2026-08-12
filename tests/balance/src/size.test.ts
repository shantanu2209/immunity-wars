/**
 * E1's negative controls — the size instrument made to fail on purpose.
 *
 * Everything the size report says rests on the sampler actually measuring the live projection of
 * the engine under measurement. Both halves of that sentence have failed silently in this
 * repository before:
 *
 *   - a checker that read a MODULE-LEVEL import instead of the engine under test
 *     (`docs/FINDINGS.md` #28, and Task C5b before it), and
 *   - a runner that copied state through JSON before any predicate saw it, erasing exactly what
 *     was being measured (`tests/property/README.md`).
 *
 * Per the rule this project added at E0a, these do not stop at "the control fires" — where a
 * magnitude is meaningful it is asserted, so a control that fires trivially cannot pass for one
 * that fires strongly.
 */

import { describe, expect, it } from 'vitest';

import { loadLegacy, loadMutatedLegacy } from '@immunity-wars/equivalence/engine';
import { withSeed } from '@immunity-wars/equivalence/rng';
import type { Engine } from '@immunity-wars/equivalence/types';

import { PORT, playGame } from './play.js';
import { SizeSampler, distribution, fitLine, isEmptyValue, percentileRank, sizeOf } from './size.js';
import { fullDeckEnvelope, invaderCurve } from './size-envelope.js';



describe('E1 control: the sampler measures the LIVE state', () => {
  /**
   * The first thing that could be wrong and would never announce itself: a sampler that snapshots
   * once, or copies defensively, and then reports a number unrelated to the state in front of it.
   * Adding invaders must move the measurement, and must move it by roughly the per-invader cost
   * rather than by some token amount.
   */
  it('state size responds to the state, at the expected magnitude', () => {
    const curve = invaderCurve(PORT, 'hard', [0, 50]);
    const empty = curve[0];
    const fifty = curve[1];
    expect(empty && fifty).toBeTruthy();
    if (!empty || !fifty) return;

    expect(fifty.invaders).toBe(50);
    const perInvader = (fifty.size.utf8 - empty.size.utf8) / 50;
    // A real invader record is a few hundred bytes. A sampler reporting a constant, or measuring
    // something other than the projection, cannot land in this range.
    expect(perInvader).toBeGreaterThan(150);
    expect(perInvader).toBeLessThan(1500);
  });

  it('the constructed deck envelope fills seen/memory to the content ceiling', () => {
    const e = fullDeckEnvelope(PORT, 'hard');
    expect(e.invaders).toBeGreaterThan(90);
    expect(e.size.utf8).toBeGreaterThan(20_000);
  });
});

/**
 * THE FINDINGS #28 CONTROL, and the one that matters most here.
 *
 * `SizeSampler.record` takes the engine as an argument and calls ITS `viewState`. If it ever
 * reached for a module-level import instead, every negative control that runs a mutated engine
 * would silently measure the correct projection and report nothing — which is precisely the
 * failure Task D found in three property invariants.
 *
 * So: mutate legacy's `viewState` to drop the `log` field, and require the sampler to notice both
 * that the field is gone and that the state got materially smaller. `log` is chosen because the
 * distribution pass measures it at ~38% of all bytes, so a sampler reading the wrong projection
 * cannot accidentally produce a matching number.
 */
describe('E1 control: the sampler reads the engine under measurement, not an import', () => {
  /**
   * A real played game, not a hand-built state. The log fills to its 40-entry cap over a game and
   * is ~38% of the projection there; a state built from a few draws has a short log and would let
   * this control pass on a magnitude that proves much less.
   */
  const sample = (engine: Engine): SizeSampler => {
    const s = new SizeSampler();
    s.startGame();
    playGame({
      seed: 0xe1,
      difficulty: 'hard',
      engine,
      onAction: (g) => s.record(engine, g, 1, 'hard'),
    });
    return s;
  };

  it('a viewState with a field removed measures smaller, and loses the field', () => {
    const base = sample(loadLegacy());
    const mutant = sample(
      loadMutatedLegacy({
        name: 'viewState drops the log',
        find: 'log:g.log.slice(0,40), difficulty:g.difficulty',
        replace: 'difficulty:g.difficulty',
      }),
    );

    const baseState = base.states.at(-1);
    const mutantState = mutant.states.at(-1);
    expect(baseState && mutantState).toBeTruthy();
    if (!baseState || !mutantState) return;

    expect(Object.keys(baseState.fields)).toContain('log');
    expect(
      Object.keys(mutantState.fields),
      'the sampler still saw a log field after the engine under measurement stopped emitting ' +
        'one — it is reading a module-level import, not the engine it was handed (FINDINGS #28)',
    ).not.toContain('log');

    // Magnitude, not just direction: log is ~38% of the projection in the measured distribution.
    const shrink = 1 - mutantState.size.utf8 / baseState.size.utf8;
    expect(shrink).toBeGreaterThan(0.1);
  });
});

describe('E1 control: churn discriminates', () => {
  /**
   * The churn measure is the one E1 addition that exists to answer a design question rather than
   * to report a size, so a churn number that is always ~0 or always ~100% would be worse than
   * having none. Both ends are pinned.
   */
  it('an unchanged state produces a near-empty delta; a changed one does not', () => {
    const s = new SizeSampler();
    s.startGame();
    withSeed(0xe1, () => {
      const g = PORT.newGame({ difficulty: 'hard', science: false });
      s.record(PORT, g, 1, 'hard'); // first — no delta
      s.record(PORT, g, 1, 'hard'); // identical — delta must be empty
      PORT.forceInjectType(g, 'bacteria');
      s.record(PORT, g, 1, 'hard'); // changed — delta must not be empty
    });

    const [first, same, changed] = s.states;
    expect(first?.delta).toBeNull();
    expect(same?.changedKeys).toBe(0);
    expect(changed?.changedKeys).toBeGreaterThan(0);
    expect((changed?.delta?.utf8 ?? 0)).toBeGreaterThan(100);
  });
});

describe('E1: the summary statistics do what they claim', () => {
  it('distribution reports ordered percentiles and is empty-safe', () => {
    const d = distribution([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(d.n).toBe(10);
    expect(d.p50).toBeLessThanOrEqual(d.p90);
    expect(d.p90).toBeLessThanOrEqual(d.p99);
    expect(d.p99).toBeLessThanOrEqual(d.max);
    expect(distribution([])).toEqual({ n: 0, mean: 0, p50: 0, p90: 0, p99: 0, max: 0 });
  });

  it('percentileRank places a value in its own distribution', () => {
    expect(percentileRank([1, 2, 3, 4], 2)).toBeCloseTo(0.5);
    expect(percentileRank([1, 2, 3, 4], 4)).toBeCloseTo(1);
  });

  it('fitLine recovers a known slope — the per-invader bound depends on it', () => {
    const { slope, intercept } = fitLine([
      [0, 100],
      [10, 600],
      [20, 1100],
    ]);
    expect(slope).toBeCloseTo(50);
    expect(intercept).toBeCloseTo(100);
  });

  /**
   * The census's whole job is saying a field is never exercised, so its notion of "empty" has to
   * be strict. If `0` or `false` counted as populated, every multiplayer field would read as
   * filled and the census would report nothing.
   */
  it('isEmptyValue is strict enough for the census to mean anything', () => {
    for (const v of [null, undefined, false, 0, '', [], {}]) expect(isEmptyValue(v)).toBe(true);
    for (const v of [1, true, 'x', [0], { a: 1 }]) expect(isEmptyValue(v)).toBe(false);
  });

  it('sizeOf counts chars, utf8 bytes and gzip bytes distinctly', () => {
    const s = sizeOf({ msg: 'नमस्ते' });
    expect(s.utf8).toBeGreaterThan(s.chars);
    expect(s.gzip).toBeGreaterThan(0);
  });
});
