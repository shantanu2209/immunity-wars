/**
 * E2 — the four-metric panel.
 *
 * WHAT THIS IS FOR, stated before anything else, because the name "balance metrics" invites the
 * wrong reading:
 *
 *   > This panel detects ENGINE CHANGE. It does not measure difficulty.
 *
 * The reference bot plays about six of the game's fourteen seats and wins ~0% on Normal where
 * humans win essentially every game (`docs/FINDINGS.md` §1). A win rate pinned at 0.0% cannot
 * fall, so it is incapable of failing usefully and is reported here, never gated. What the panel
 * can answer is "did the rules change under us?", which is a real question CI can act on.
 *
 * THE REPORTING CONSTRAINT IS THE TYPE, NOT A CONVENTION.
 *
 * There is no bare number in this module's output. A metric is a `MetricValue` carrying its
 * generator, that generator's version, the games behind it, the seed range and the content pack —
 * and `render()` is the only way to turn one into text, so the qualifier travels with the figure
 * into whatever slide it ends up on. `src/reporting.test.ts` asserts that, with a control that
 * strips the label and watches the assertion fire.
 *
 * `docs/FINDINGS.md` #6 fixes the required wording, and it is required because a reader who takes
 * a bot-conditional figure as a statement about human play draws a false conclusion:
 *
 *   > Win rate under the reference bot, vN, at N games per difficulty.
 *
 * METRIC DEFINITIONS ARE FIXED HERE, BEFORE MEASURING. A redefinition silently invalidates every
 * band derived from the old one, and nothing in a green panel would say so.
 */

import { PACK_ID, PACK_VERSION, RULES_VERSION } from '@immunity-wars/content';
import type { Engine } from '@immunity-wars/equivalence/types';

import { PORT, playGame, seedAt, type GameRecord } from './play.js';

/** The generator every Task E figure is conditional on. Established by E0a, at 3,000 games. */
export const GENERATOR = 'reference bot';
export const GENERATOR_VERSION = 'v1';

/**
 * The four gated metrics, and the one that is reported but never gated.
 *
 * Chosen from the ten candidates measured in `docs/FINDINGS.md` § "Task E metrics" on tightness of
 * cross-batch variance. `winRate` was excluded there for being unable to fall.
 */
export interface PanelMetrics {
  /** Per-game mean of `g.turn` at the end. NOTE: censored at the top — see the closeout. */
  readonly avgTurnsSurvived: number;
  /** BATCH-POOLED, the way `simulate()` pools it: sum(trunk) / sum(trunk + branch). */
  readonly trunkKillPct: number;
  /** Per-game mean of the sum of `g.made` across all seven families. */
  readonly avgAntibodiesMade: number;
  /** Per-game mean of the count of organs below maximum integrity. */
  readonly avgOrgansDamaged: number;
  /**
   * REPORTED, NEVER GATED. The field name carries the qualifier so a value pasted somewhere else
   * drags its condition along with it. docs/FINDINGS.md #1 and #6.
   */
  readonly winRateUnderReferenceBot: number;
  /** Games that neither won nor lost before the turn guard. Not folded into anything. */
  readonly unfinished: number;
}

export const GATED_METRICS = [
  'avgTurnsSurvived',
  'trunkKillPct',
  'avgAntibodiesMade',
  'avgOrgansDamaged',
] as const;

export type GatedMetric = (typeof GATED_METRICS)[number];

const mean = (xs: readonly number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

/** Reduce one batch of games to the panel. Raw counts in, rates out — no smoothing, no clamping. */
export function metricsOfBatch(games: readonly GameRecord[]): PanelMetrics {
  const trunk = games.reduce((a, g) => a + g.killedTrunk, 0);
  const branch = games.reduce((a, g) => a + g.killedBranch, 0);
  const kills = trunk + branch;
  return {
    avgTurnsSurvived: mean(games.map((g) => g.endTurn)),
    trunkKillPct: kills ? trunk / kills : 0,
    avgAntibodiesMade: mean(games.map((g) => g.antibodiesMade)),
    avgOrgansDamaged: mean(games.map((g) => g.organsDamaged)),
    winRateUnderReferenceBot: mean(games.map((g) => (g.won ? 1 : 0))),
    unfinished: games.filter((g) => g.unfinished).length,
  };
}

/** Where a figure came from. Every published number carries one; there is no constructor without. */
export interface Provenance {
  readonly generator: string;
  readonly generatorVersion: string;
  readonly difficulty: string;
  readonly gamesPerBatch: number;
  readonly batches: number;
  /** Sample INDICES, not raw seeds: the seed is `seedAt(index)`. See play.ts and FINDINGS #33. */
  readonly seedIndexFrom: number;
  readonly seedIndexTo: number;
  readonly seedSchedule: string;
  readonly packId: string;
  readonly packVersion: string;
  readonly rulesVersion: string;
}

export interface MetricValue {
  readonly metric: string;
  readonly mean: number;
  /** Standard deviation ACROSS BATCHES, which is what a ±3 sd band on one batch needs. */
  readonly sd: number;
  readonly provenance: Provenance;
}

/**
 * The only way to turn a MetricValue into text.
 *
 * Every rendered line names the generator, its version and the games behind it. That is the
 * mechanism `docs/FINDINGS.md` #6 asks for, moved from "remember to add a caveat" into the code
 * path a number has to pass through.
 */
export function render(v: MetricValue): string {
  const p = v.provenance;
  const games = p.gamesPerBatch * p.batches;
  return (
    `${v.metric} = ${v.mean.toFixed(4)} ±${v.sd.toFixed(4)} sd ` +
    `— under the ${p.generator} ${p.generatorVersion}, ` +
    `${games} games (${p.batches}x${p.gamesPerBatch}) on ${p.difficulty}`
  );
}

/** Sample standard deviation (n-1). Zero for fewer than two batches, which callers must not gate on. */
export function sampleSd(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) * (x - m), 0) / (xs.length - 1));
}

export interface BatchRun {
  readonly difficulty: string;
  readonly batches: readonly PanelMetrics[];
  readonly provenance: Provenance;
}

/**
 * Play `batches x gamesPerBatch` games and reduce each batch to the panel.
 *
 * The engine is a parameter for the reason `play.ts` states — a negative control runs a
 * deliberately-mutated engine, and a harness that reached for a module-level import would measure
 * the correct one while believing it measured the broken one (`docs/FINDINGS.md` #28).
 */
export function measure(
  difficulty: string,
  batches: number,
  gamesPerBatch: number,
  indexBase: number,
  engine: Engine = PORT,
): BatchRun {
  const out: PanelMetrics[] = [];
  let index = indexBase;
  for (let b = 0; b < batches; b += 1) {
    const games: GameRecord[] = [];
    for (let i = 0; i < gamesPerBatch; i += 1) {
      games.push(playGame({ seed: seedAt(index), difficulty, engine }));
      index += 1;
    }
    out.push(metricsOfBatch(games));
  }
  return {
    difficulty,
    batches: out,
    provenance: {
      generator: GENERATOR,
      generatorVersion: GENERATOR_VERSION,
      difficulty,
      gamesPerBatch,
      batches,
      seedIndexFrom: indexBase,
      seedIndexTo: index - 1,
      seedSchedule: 'splitmix32(index) — NOT an arithmetic step; see FINDINGS #33',
      packId: PACK_ID,
      packVersion: PACK_VERSION,
      rulesVersion: RULES_VERSION,
    },
  };
}

export function valueOf(run: BatchRun, metric: GatedMetric): MetricValue {
  const xs = run.batches.map((b) => b[metric]);
  return { metric, mean: mean(xs), sd: sampleSd(xs), provenance: run.provenance };
}

/** The mean of one whole arm — the quantity a gate actually compares. */
export function armMean(run: BatchRun, metric: GatedMetric): number {
  return mean(run.batches.map((b) => b[metric]));
}

/**
 * K INDEPENDENT ARMS of the same engine, which is how the band's width is measured rather than
 * assumed.
 *
 * The obvious shortcut is to take the spread of one arm's batches and divide by sqrt(batches).
 * Measured against 8 independent arms, that shortcut UNDERSTATES the true arm-to-arm spread by up
 * to 1.5x — worst on `avgTurnsSurvived` at Normal — and a band 1.5x too narrow is a build that
 * fails on seeds. So the null distribution is measured directly: run the same engine K times on
 * disjoint seed blocks and look at how much the arm means actually move.
 *
 * Expensive and worth it. This is the only number in Task E that a build will be gated on.
 */
export interface Calibration {
  readonly difficulty: string;
  readonly arms: number;
  readonly armMeans: Readonly<Record<GatedMetric, readonly number[]>>;
  readonly provenance: Provenance;
}

export function calibrate(
  difficulty: string,
  arms: number,
  batches: number,
  gamesPerBatch: number,
  indexBase: number,
  engine: Engine = PORT,
  onArm?: (i: number) => void,
): Calibration {
  const perArm = batches * gamesPerBatch;
  const collected: Record<string, number[]> = {};
  for (const m of GATED_METRICS) collected[m] = [];
  let last: BatchRun | null = null;

  for (let a = 0; a < arms; a += 1) {
    const run = measure(difficulty, batches, gamesPerBatch, indexBase + a * perArm, engine);
    for (const m of GATED_METRICS) collected[m]?.push(armMean(run, m));
    last = run;
    onArm?.(a);
  }
  if (!last) throw new Error('calibrate: zero arms is not a calibration');

  return {
    difficulty,
    arms,
    armMeans: collected as unknown as Calibration['armMeans'],
    provenance: {
      ...last.provenance,
      seedIndexFrom: indexBase,
      seedIndexTo: indexBase + arms * perArm - 1,
    },
  };
}

export function calibratedValue(c: Calibration, metric: GatedMetric): MetricValue {
  const xs = c.armMeans[metric];
  return { metric, mean: mean(xs), sd: sampleSd(xs), provenance: c.provenance };
}

/**
 * ============================================================================================
 * THE ANALYTIC SAMPLING FLOOR ON sd(arm)
 * ============================================================================================
 *
 * An arm mean is the mean of `batches x gamesPerBatch` per-game values with EQUAL batch sizes, so
 * it is exactly the mean of `perArm` games. If those games are independent, then
 *
 *     sd(arm mean) = sd(one game) / sqrt(perArm)
 *
 * exactly. That is the variance of a mean — not an assumption about normality, not an
 * approximation, and not something a larger calibration can move. Arm means CANNOT be more stable
 * than that.
 *
 * SO A MEASURED sd(arm) BELOW THIS FLOOR IS PROOF THE CALIBRATION UNDER-SAMPLED. Not evidence,
 * proof: it is a claim that a mean of N independent draws varies less than N independent draws
 * allow. Nothing in this repository could previously see that, and it was not hypothetical — the
 * shipped 8-arm bands sat at **0.72x** their floor on Normal, which is why an unchanged engine
 * came back at 2.6 and 2.7 sigma against a two-past-3-sigma rule (`docs/TASK_E_CLOSEOUT.md`
 * section 10.4, `docs/FINDINGS.md` #35).
 *
 * WHY ONLY THREE OF THE FOUR METRICS. The argument holds for a metric that is the MEAN OF A
 * PER-GAME VALUE and for nothing else. `trunkKillPct` is a ratio of two sums over the batch —
 * sum(trunk) / sum(trunk + branch) — so it is not a sample mean of a per-game quantity and the
 * sqrt(N) argument simply does not apply to it. It therefore keeps its measured sd. Inventing a
 * floor for it would be a number that looks rigorous and is not, which is the exact failure mode
 * this project keeps finding.
 *
 * WHAT APPLYING THE FLOOR COSTS: measured at the shipped arm shape, nothing. Every "must FAIL"
 * control still fails on both difficulties and the demonstrated blind spot goes from 1 breach to
 * 0. The table is in `docs/TASK_E_CLOSEOUT.md` section 10.5. It was measured at the shipped scale
 * deliberately — at control scale the same comparison gives a confident and WRONG answer
 * (`../property/README.md`, the scale rule).
 */

/** The metrics that are a mean of a per-game value, and so have an analytic floor. */
export const FLOORED_METRICS = [
  'avgTurnsSurvived',
  'avgAntibodiesMade',
  'avgOrgansDamaged',
] as const;

export type FlooredMetric = (typeof FLOORED_METRICS)[number];

/**
 * The per-game value behind each floored metric.
 *
 * These MUST agree with `metricsOfBatch` above. If a metric's definition changes there and not
 * here, the floor would be computed from a different quantity than the band it is applied to —
 * a silent category error, so `floor.test.ts` pins the correspondence by measuring both.
 */
export const PER_GAME_VALUE: Record<FlooredMetric, (g: GameRecord) => number> = {
  avgTurnsSurvived: (g) => g.endTurn,
  avgAntibodiesMade: (g) => g.antibodiesMade,
  avgOrgansDamaged: (g) => g.organsDamaged,
};

export interface SamplingFloor {
  /** sd(one game)/sqrt(perArm) per floored metric. `trunkKillPct` is deliberately absent. */
  readonly floors: Readonly<Record<FlooredMetric, number>>;
  /** sd of the raw per-game value, kept so a reader can see where the floor came from. */
  readonly perGameSd: Readonly<Record<FlooredMetric, number>>;
  readonly games: number;
  readonly perArm: number;
  readonly seedIndexFrom: number;
  readonly seedIndexTo: number;
}

/**
 * Measure the floor from `games` fresh games.
 *
 * `indexBase` must be outside every block the calibration uses. Sharing seeds with the arms would
 * make the floor and the measured sd partly the same sample, and the comparison between them is
 * the entire point.
 */
export function samplingFloor(
  difficulty: string,
  perArm: number,
  games: number,
  indexBase: number,
  engine: Engine = PORT,
): SamplingFloor {
  const collected: Record<string, number[]> = {};
  for (const m of FLOORED_METRICS) collected[m] = [];

  for (let i = 0; i < games; i += 1) {
    const r = playGame({ seed: seedAt(indexBase + i), difficulty, engine });
    for (const m of FLOORED_METRICS) collected[m]?.push(PER_GAME_VALUE[m](r));
  }

  const floors: Record<string, number> = {};
  const perGameSd: Record<string, number> = {};
  const k = Math.sqrt(perArm);
  for (const m of FLOORED_METRICS) {
    const s = sampleSd(collected[m] ?? []);
    perGameSd[m] = s;
    floors[m] = s / k;
  }

  return {
    floors: floors as SamplingFloor['floors'],
    perGameSd: perGameSd as SamplingFloor['perGameSd'],
    games,
    perArm,
    seedIndexFrom: indexBase,
    seedIndexTo: indexBase + games - 1,
  };
}

/** The floor for one metric, or `undefined` where the argument does not apply. */
export function floorFor(f: SamplingFloor | undefined, metric: GatedMetric): number | undefined {
  if (!f) return undefined;
  return (FLOORED_METRICS as readonly string[]).includes(metric)
    ? f.floors[metric as FlooredMetric]
    : undefined;
}
