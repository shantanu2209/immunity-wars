/**
 * E2's negative controls — the panel made to fail, and made to fail to fail.
 *
 * The panel's whole claim is that it detects engine change. A band that has never gone red is a
 * band nobody has falsified, so both directions are pinned:
 *
 *   1. changes that SHOULD move it, which must trip ≥2 metrics;
 *   2. brain `branch:3 -> 4`, which `docs/FINDINGS.md` #17 says it CANNOT see, asserted as a
 *      demonstrated blind spot rather than left in prose.
 *
 * The second is the point, and it is the principle in `../README.md`:
 *
 *   > A gate shipping with a demonstrated blind spot is more trustworthy than one shipping with
 *   > only a green light.
 *
 * **These controls already earned their keep.** Written against the band design proposed in
 * `FINDINGS.md` — ±3 sd of one 100-game batch — they failed: an Action Point removed from every
 * turn tripped ZERO metrics on Normal and one on Hard, and the Brain losing half its integrity
 * tripped zero. The panel, not the control, was wrong. `panel.ts`'s header carries the measurement
 * and the correction. Without a control aimed at a known change, that gate would have shipped
 * green and stayed green through anything.
 *
 * Per the rule added at E0a, neither direction stops at a boolean: every assertion here is about
 * the SIZE of the shift in standard errors, so a marginal detection cannot pass for a strong one.
 *
 * BOTH ARMS RUN LEGACY. The port is an ES module and cannot be patched at load, and running the
 * baseline on legacy too means a divergence cannot be port-vs-legacy leaking in. `loadMutatedLegacy`
 * throws unless the mutation matches exactly once, so a stale mutation cannot become an inert
 * no-op and report a false result.
 */

import { describe, expect, it } from 'vitest';

import { loadLegacy, loadMutatedLegacy, type Mutation } from '@immunity-wars/equivalence/engine';

import { calibrate, GATED_METRICS, measure } from './metrics.js';
import {
  aggregate,
  bandOf,
  evaluate,
  mismatchedShape,
  type Band,
  type PanelVerdict,
} from './panel.js';

/**
 * Sized for the fast tier, and every number here was chosen by measurement rather than taste.
 *
 * The shipped bands are 8 arms of 20 x 100. These controls calibrate on 4 arms of 8 x 50 — 1,600
 * games of null per difficulty — which is enough for the AP change and the Brain-integrity change
 * to fail the panel and for `branch:3 -> 4` still not to, while `pnpm test` stays inside ~30s.
 *
 * A smaller calibration gives a WIDER band, so the detection arms are a harder test here than
 * against the shipped bands, not an easier one.
 */
const ARMS = 4;
const BATCHES = 8;
const GAMES = 50;
const INDEX_BASE = 0;

const MUT_AP: Mutation = {
  name: 'DIFF: one fewer AP per turn at every difficulty',
  find: 'const DIFF={ training:{ap:6,turns:15,spawn:"dice"}, normal:{ap:5,turns:20,spawn:"dice"}, hard:{ap:4,turns:30,spawn:"dice"} };',
  replace:
    'const DIFF={ training:{ap:5,turns:15,spawn:"dice"}, normal:{ap:4,turns:20,spawn:"dice"}, hard:{ap:3,turns:30,spawn:"dice"} };',
};

const MUT_BRAIN_HP: Mutation = {
  name: 'ORGANS: brain integrity 2 -> 1',
  find: 'brain:   { name:"Brain",       kind:"vital",   integrity:2, branch:3,',
  replace: 'brain:   { name:"Brain",       kind:"vital",   integrity:1, branch:3,',
};

const MUT_BRAIN_LANE: Mutation = {
  name: 'ORGANS: brain branch 3 -> 4 (FINDINGS #17)',
  find: 'brain:   { name:"Brain",       kind:"vital",   integrity:2, branch:3,',
  replace: 'brain:   { name:"Brain",       kind:"vital",   integrity:2, branch:4,',
};

/**
 * The unmutated bands, computed once per difficulty.
 *
 * Memoised for run time only. It is safe because `measure` is deterministic in (difficulty,
 * batches, games, seed, engine) and every caller here passes the same four — the seeded RNG is
 * installed and restored per game inside `playGame`, so there is no cross-run state to carry.
 */
const baseBands = new Map<string, Band[]>();
function bandsFor(difficulty: string): Band[] {
  let b = baseBands.get(difficulty);
  if (!b) {
    const c = calibrate(difficulty, ARMS, BATCHES, GAMES, INDEX_BASE, loadLegacy());
    b = GATED_METRICS.map((m) => bandOf(c, m));
    baseBands.set(difficulty, b);
  }
  return b;
}

/**
 * Bands from unmutated legacy; the mutant judged against them.
 *
 * The mutant arm uses seed indices BEYOND the calibration block, so it is not one of the arms
 * that built the band. Reusing calibration seeds would make the comparison partly self-referential
 * and flatter the control.
 */
function judge(mutation: Mutation, difficulty: string): PanelVerdict {
  const bands = bandsFor(difficulty);
  const mutant = measure(
    difficulty,
    BATCHES,
    GAMES,
    INDEX_BASE + ARMS * BATCHES * GAMES,
    loadMutatedLegacy(mutation),
  );
  return evaluate(bands, aggregate(mutant.batches));
}

const worst = (v: PanelVerdict): number => Math.max(...v.shifts.map((s) => Math.abs(s.sigmas)));

describe('E2 control: the panel detects changes it should', () => {
  /**
   * The baseline arm, and it is load-bearing twice over: without it a mutant diverging for some
   * unrelated reason would look like a working control, and the zero-sd check below is what stops
   * a degenerate band of width zero reading as "everything breaches".
   */
  it('baseline: an unseen arm of unmutated legacy passes its own panel', () => {
    const bands = bandsFor('normal');
    for (const b of bands) {
      expect(b.sdArm, `${b.metric} has a zero-width band`).toBeGreaterThan(0);
      expect(b.arms).toBe(ARMS);
      expect(b.batches).toBe(BATCHES);
    }
    expect(mismatchedShape(bands, BATCHES, GAMES)).toBe(false);

    // A HELD-OUT arm: seeds past the calibration block, same engine. This is the false-positive
    // check, and it is the one that says the bands measure the engine rather than the seeds.
    const held = measure(
      'normal',
      BATCHES,
      GAMES,
      INDEX_BASE + ARMS * BATCHES * GAMES,
      loadLegacy(),
    );
    const v = evaluate(bands, aggregate(held.batches));
    expect(v.failed, `unmutated legacy tripped its own panel: ${v.reason}`).toBe(false);
  });

  /**
   * One fewer AP per turn: a 20% cut to the game's central resource. If the panel cannot see this
   * it cannot see anything, and under the originally proposed band design it could not.
   */
  it('one fewer AP per turn fails the panel', () => {
    const v = judge(MUT_AP, 'normal');
    const detail = v.shifts.map((s) => `${s.metric} ${s.sigmas.toFixed(1)}σ`).join(', ');
    expect(v.failed, `the panel missed a whole Action Point per turn. shifts: ${detail}`).toBe(
      true,
    );
    // Strength, not only direction. The threshold is 3 and not 6 because THIS calibration is the
    // small one: 4 arms x 400 games gives a wider band than the shipped 8 x 2,000, so the same
    // change reads ~3.8σ here where it reads 14σ against the shipped bands. Asserting 6 here
    // would be importing a number measured somewhere else — the σ scale is a property of the
    // calibration, not of the change.
    expect(worst(v)).toBeGreaterThan(3);
  });

  /** A content change rather than a tuning one — the panel should not only notice DIFF. */
  it('the Brain at integrity 1 instead of 2 fails the panel, on more than one metric', () => {
    const v = judge(MUT_BRAIN_HP, 'normal');
    expect(v.failed).toBe(true);
    expect(v.twoBreached, `only ${v.breaches.length} metric(s) breached: ${v.reason}`).toBe(true);
  });
});

describe('E2 control: THE DEMONSTRATED BLIND SPOT — brain branch:3 -> 4', () => {
  /**
   * `docs/FINDINGS.md` #17 in executable form.
   *
   * Lengthening the Brain's lane back to 4 removes one turn of Eosinophil slack in the
   * two-worms-at-the-Brain state — a real change to whether a specific bad state has a way out,
   * established at B5 with a scripted scenario. The scenario occurs in ~2% of games and what
   * changed is a MARGIN, not an outcome: a metric panel averages over exactly the tail it would
   * need to detect.
   *
   * **THE CLAIM ASSERTED HERE IS NARROWER THAN #17's, because #17's is no longer exactly true.**
   * #17 measured "no metric moved beyond 2 sd" at 10 x 100 games against a wider null. At 2,000
   * games with a calibrated null, `avgTurnsSurvived` moves **+3.2σ** on both Normal and Hard. So
   * what survives is the GATE-level statement — the panel does not FAIL — not "nothing moved".
   * docs/FINDINGS.md #34 records the refinement rather than smoothing it over.
   *
   * That distinction is the whole reason this is asserted as `failed === false` and not as
   * `breaches.length === 0`. Writing the stronger claim would have made this test go red at the
   * shipped sample size, and the temptation would then have been to shrink the sample.
   *
   * IF THIS EVER GOES RED, nothing is broken. The panel became sensitive to something it was not
   * before, and #17/#34 need re-measuring rather than this test needing a fix.
   */
  it('does not FAIL the panel, on Normal or Hard', () => {
    for (const difficulty of ['normal', 'hard']) {
      const v = judge(MUT_BRAIN_LANE, difficulty);
      expect(
        v.failed,
        `The panel FAILED on brain branch:3->4 at ${difficulty} (${v.reason}; shifts ` +
          `${v.shifts.map((s) => `${s.metric} ${s.sigmas.toFixed(1)}σ`).join(', ')}). ` +
          'FINDINGS #17 and #34 say it should not. Either the panel became more sensitive or ' +
          'those findings need re-measuring — do NOT "fix" this test.',
      ).toBe(false);
    }
  });

  /**
   * The blindness is specific, not general bluntness. Same rig, same sizes, one difficulty over:
   * the AP change fails the panel. Without this, "does not fail on branch:3->4" would be
   * indistinguishable from "does not fail on anything".
   */
  it('and the blindness is specific — the same rig fails on a real change, on Hard', () => {
    const v = judge(MUT_AP, 'hard');
    expect(v.failed, `the panel missed an Action Point on hard: ${v.reason}`).toBe(true);
    expect(worst(v)).toBeGreaterThan(3);
  });
});

describe('E2: the evaluator implements the failure rule it claims', () => {
  const band = (metric: string, mean: number, sd: number): Band => ({
    metric: metric as Band['metric'],
    mean,
    sdArm: sd,
    // These fixtures test the FAILURE RULE, not the floor: a synthetic band stands for whatever
    // width the calibration produced, so it declares itself unfloored and sdArm is the whole story.
    sdMeasured: sd,
    sdFloor: null,
    floorApplied: false,
    arms: ARMS,
    batches: BATCHES,
    gamesPerBatch: GAMES,
    lo: mean - 3 * sd,
    hi: mean + 3 * sd,
    rsd: sd / mean,
  });

  const BANDS: Band[] = [
    band('avgTurnsSurvived', 10, 0.25),
    band('trunkKillPct', 0.9, 0.0025),
    band('avgAntibodiesMade', 20, 0.25),
    band('avgOrgansDamaged', 2, 0.025),
  ];

  const observed = (over: Partial<Record<string, number>>) => ({
    avgTurnsSurvived: 10,
    trunkKillPct: 0.9,
    avgAntibodiesMade: 20,
    avgOrgansDamaged: 2,
    winRateUnderReferenceBot: 0,
    unfinished: 0,
    ...over,
  });

  /** One metric a little way out is drift — the case the 2-of-4 half exists to tolerate. */
  it('one metric mildly out is noise, not a failure', () => {
    const v = evaluate(BANDS, observed({ avgTurnsSurvived: 11 })); // 4σ, under the loud threshold
    expect(v.breaches).toHaveLength(1);
    expect(v.twoBreached).toBe(false);
    expect(v.oneLoud).toBe(false);
    expect(v.failed).toBe(false);
  });

  it('two out together is a failure', () => {
    const v = evaluate(BANDS, observed({ avgTurnsSurvived: 11, avgOrgansDamaged: 2.2 }));
    expect(v.breaches).toHaveLength(2);
    expect(v.twoBreached).toBe(true);
    expect(v.failed).toBe(true);
    expect(v.reason).toContain('2 metrics');
  });

  /**
   * The 6σ arm, and the measurement that put it there: on Normal, removing an Action Point per
   * turn moves ONE metric — by 14σ. Under 2-of-4 alone that build passes.
   */
  it('one metric VERY far out is a failure on its own', () => {
    const v = evaluate(BANDS, observed({ avgTurnsSurvived: 12 })); // 8σ
    expect(v.breaches).toHaveLength(1);
    expect(v.twoBreached).toBe(false);
    expect(v.oneLoud).toBe(true);
    expect(v.failed).toBe(true);
    expect(v.reason).toContain('6σ');
  });

  it('inside the band is silent, and the boundary is inclusive', () => {
    expect(evaluate(BANDS, observed({})).failed).toBe(false);
    expect(evaluate(BANDS, observed({ avgTurnsSurvived: 10.75 })).breaches).toHaveLength(0);
    expect(evaluate(BANDS, observed({ avgTurnsSurvived: 10.76 })).breaches).toHaveLength(1);
  });

  it('reports every metric, not only the breaches — a near miss has to be visible', () => {
    const v = evaluate(BANDS, observed({ avgTurnsSurvived: 10.7 }));
    expect(v.shifts).toHaveLength(4);
    expect(v.shifts.find((s) => s.metric === 'avgTurnsSurvived')?.sigmas).toBeCloseTo(2.8, 1);
    expect(v.reason).toBe('no broad shift detected');
  });

  /**
   * `winRate` must never be gateable. If it entered GATED_METRICS a build could fail on a number
   * pinned at zero, which is the exact mistake this panel exists to avoid (FINDINGS #1).
   */
  it('winRate is not gateable', () => {
    expect(GATED_METRICS as readonly string[]).not.toContain('winRateUnderReferenceBot');
    expect(GATED_METRICS).toHaveLength(4);
  });

  /** A band from a different run size must not be silently reused. */
  it('refuses a size mismatch rather than gating on the wrong band', () => {
    expect(mismatchedShape(BANDS, BATCHES, GAMES)).toBe(false);
    expect(mismatchedShape(BANDS, BATCHES + 4, GAMES)).toBe(true);
    expect(mismatchedShape(BANDS, BATCHES, GAMES * 2)).toBe(true);
  });
});
