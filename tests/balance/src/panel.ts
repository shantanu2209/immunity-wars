/**
 * E2 — the bands, and the 2-of-4 rule.
 *
 * WHAT A GREEN PANEL MEANS, and the wording is not negotiable:
 *
 *   > "No broad shift detected." NEVER "the change was safe."
 *
 * Those two differ by exactly `docs/FINDINGS.md` #17: the brain `branch:3 → 4` change moved no
 * metric beyond 2 sd, and it removed a whole turn of Eosinophil slack in a state that occurs in
 * ~2% of games. **A metric panel averages over exactly the tail it would need to detect.** That
 * blind spot is asserted executably in `metrics-control.test.ts` rather than described here and
 * forgotten.
 *
 * ---
 *
 * ⚠️ THE DESIGN PROPOSED IN `docs/FINDINGS.md` § "Task E metrics" WAS MEASURED AND DOES NOT WORK.
 * Both halves of it changed, each because a check caught it, and both are recorded because the
 * numbers here will be quoted outside this repository.
 *
 * **Change 1 — the band is ±3 sd of the ARM MEAN, not ±3 sd of one 100-game batch.** Implemented
 * as proposed and then made to face known engine changes, the batch band detected nothing:
 *
 * ```
 *   arms of 20 x 100 = 2,000 games       metrics breaching, of 4
 *   change                               ±3 sd of one batch     calibrated band
 *   AP -1 per turn, normal                       0                     1
 *   AP -1 per turn, hard                         1                     2
 *   brain integrity 2 -> 1, normal               0                     3
 *   brain integrity 2 -> 1, hard                 0                     3
 * ```
 *
 * The sd across batches measures how much ONE batch of 100 games bounces. CI does not run one
 * batch; it runs the suite. Judging a 2,000-game aggregate by a one-batch band throws away the
 * √20 the aggregate earned. **A gate that cannot notice a 20% cut to the game's central resource
 * is a gate incapable of failing usefully** — the same objection `FINDINGS.md` #1 raises against
 * win rate, which is what this panel exists to replace.
 *
 * **Change 2 — the band's width is MEASURED from K independent arms, not derived as sd/√batches.**
 * The derivation assumes batches are independent samples. Checked against 8 independent arms, it
 * understates the true arm-to-arm spread by up to **1.5x** (`avgTurnsSurvived`, Normal), and a
 * band 1.5x too narrow is a build that fails on seeds rather than on changes. See `metrics.ts`'s
 * `calibrate`.
 *
 * **The failure rule is two-armed, and that too is measured rather than chosen.** With a properly
 * calibrated null, counting breaches at 3σ alone leaves the AP change undetected on Normal — it
 * moves ONE metric, by 14σ. So:
 *
 *   > FAIL when **two or more** metrics breach ±3σ, **or** when **any one** exceeds ±6σ.
 *
 * ```
 *   change                          breaches@3σ   loudest    verdict
 *   AP -1 per turn, normal                1        14.1σ      FAIL (6σ arm)
 *   AP -1 per turn, hard                  2        38.0σ      FAIL
 *   brain integrity 2 -> 1, normal        3         4.8σ      FAIL
 *   brain integrity 2 -> 1, hard          3         5.8σ      FAIL
 *   brain branch 3 -> 4 (#17)             1         3.2σ      pass  <- the blind spot
 * ```
 *
 * The 6σ arm is what makes a single loud metric actionable without making a single quiet one
 * flaky; 3σ on one metric alone is ~0.3% per metric per run, which is a coin-flip CI gate.
 *
 * ⚠️ **AND THE BLIND SPOT IS NARROWER THAN `FINDINGS.md` #17 SAYS.** At 2,000 games with a
 * calibrated null, `branch:3 → 4` moves `avgTurnsSurvived` by **+3.2σ** on both Normal and Hard.
 * It does not fail the panel — one metric, under 6σ — so the gate-level claim holds. But "no
 * metric moved" was measured at 1,000 games against a wider null and is no longer the right
 * statement. Reported, not smoothed: see docs/FINDINGS.md #34.
 *
 * Wiring any of this into CI is Task F. E2 measures the bands and ships the evaluator.
 */

import {
  calibratedValue,
  GATED_METRICS,
  type Calibration,
  type GatedMetric,
  type MetricValue,
  type PanelMetrics,
} from './metrics.js';

export interface Band {
  readonly metric: GatedMetric;
  readonly mean: number;
  /** MEASURED arm-to-arm standard deviation, from K independent arms. Not derived, not assumed. */
  readonly sdArm: number;
  /** Independent arms behind the sd. Fewer than 3 is not a calibration. */
  readonly arms: number;
  /** The arm size this band is valid for. Comparing a different size is a category error. */
  readonly batches: number;
  readonly gamesPerBatch: number;
  readonly lo: number;
  readonly hi: number;
  /** sdArm/mean — how tight this metric is, in its own units. */
  readonly rsd: number;
}

/** Breach threshold, per metric. */
export const SIGMA = 3;

/** A single metric this far out fails on its own. Measured: see the header's table. */
export const LOUD_SIGMA = 6;

export function bandOf(c: Calibration, metric: GatedMetric): Band {
  const v: MetricValue = calibratedValue(c, metric);
  return {
    metric,
    mean: v.mean,
    sdArm: v.sd,
    arms: c.arms,
    batches: v.provenance.batches,
    gamesPerBatch: v.provenance.gamesPerBatch,
    lo: v.mean - SIGMA * v.sd,
    hi: v.mean + SIGMA * v.sd,
    rsd: v.mean === 0 ? 0 : v.sd / v.mean,
  };
}

export interface Shift {
  readonly metric: GatedMetric;
  readonly observed: number;
  readonly band: Band;
  /** Signed, in units of the aggregate's standard error. The strength measure, not a boolean. */
  readonly sigmas: number;
  readonly breached: boolean;
}

export interface PanelVerdict {
  /** Every metric, always — a report that only lists breaches cannot show a near miss. */
  readonly shifts: readonly Shift[];
  readonly breaches: readonly Shift[];
  /** Two or more past ±3σ. One is noise. */
  readonly twoBreached: boolean;
  /** Any one past ±6σ. A single loud metric is a real change, not drift. */
  readonly oneLoud: boolean;
  readonly failed: boolean;
  readonly reason: string;
}

/**
 * Evaluate an arm mean against a set of bands.
 *
 * `observed` must be the mean of an arm the same size the bands were calibrated with;
 * `mismatchedShape` is what stops a caller silently judging a small run by a band measured on a
 * large one, which would make the gate spuriously trigger-happy.
 */
export function evaluate(bands: readonly Band[], observed: PanelMetrics): PanelVerdict {
  const shifts: Shift[] = [];
  for (const metric of GATED_METRICS) {
    const band = bands.find((b) => b.metric === metric);
    if (!band) continue;
    const value = observed[metric];
    const sigmas =
      band.sdArm === 0 ? (value === band.mean ? 0 : Infinity) : (value - band.mean) / band.sdArm;
    shifts.push({
      metric,
      observed: value,
      band,
      sigmas,
      breached: value < band.lo || value > band.hi,
    });
  }
  const breaches = shifts.filter((s) => s.breached);
  const loud = shifts.filter((s) => Math.abs(s.sigmas) >= LOUD_SIGMA);
  const twoBreached = breaches.length >= 2;
  const oneLoud = loud.length >= 1;
  return {
    shifts,
    breaches,
    twoBreached,
    oneLoud,
    failed: twoBreached || oneLoud,
    reason: twoBreached
      ? `${breaches.length} metrics past ±${SIGMA}σ`
      : oneLoud
        ? `${loud.map((s) => `${s.metric} ${s.sigmas.toFixed(1)}σ`).join(', ')} past ±${LOUD_SIGMA}σ`
        : 'no broad shift detected',
  };
}

/** Guard against judging a run by a band calibrated on a different arm size. */
export function mismatchedShape(
  bands: readonly Band[],
  batches: number,
  gamesPerBatch: number,
): boolean {
  return bands.some((b) => b.batches !== batches || b.gamesPerBatch !== gamesPerBatch);
}

/** Aggregate a set of batches into one panel reading, matching how `bandOf` built the mean. */
export function aggregate(batches: readonly PanelMetrics[]): PanelMetrics {
  const n = batches.length;
  const avg = (pick: (m: PanelMetrics) => number): number =>
    n ? batches.reduce((a, b) => a + pick(b), 0) / n : 0;
  return {
    avgTurnsSurvived: avg((m) => m.avgTurnsSurvived),
    trunkKillPct: avg((m) => m.trunkKillPct),
    avgAntibodiesMade: avg((m) => m.avgAntibodiesMade),
    avgOrgansDamaged: avg((m) => m.avgOrgansDamaged),
    winRateUnderReferenceBot: avg((m) => m.winRateUnderReferenceBot),
    unfinished: batches.reduce((a, b) => a + b.unfinished, 0),
  };
}

/** Bands plus their provenance, as written to `bands.json` for Task F to gate on. */
export interface BandFile {
  readonly note: string;
  readonly generator: string;
  readonly generatorVersion: string;
  readonly sigma: number;
  readonly loudSigma: number;
  readonly rule: string;
  readonly engineRev: string;
  readonly measuredAt: string;
  readonly difficulties: Record<
    string,
    {
      readonly provenance: MetricValue['provenance'];
      readonly arms: number;
      readonly bands: readonly Band[];
      readonly reportedNotGated: Record<string, number>;
    }
  >;
}
