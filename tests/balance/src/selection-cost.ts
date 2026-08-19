/**
 * P2.1 — THE COMPUTE SIDE OF THE SELECTION-SCOPED VIEW.
 *
 * THE RULING THIS TESTS. Decision C was settled as **selection-scoped**: the view becomes a
 * function of `(game state, selection)` rather than of game state alone, so `moveDestinations` is
 * carried for the SELECTED cell rather than for all seven. That keeps the boundary rule absolute —
 * no query is exposed, so there is no exception to argue about in Phase 3.
 *
 * THE CONDITION ATTACHED TO IT, and it is the whole reason this file exists:
 *
 *   > Selection changes are frequent and local. If every selection rebuilds the whole view, we
 *   > have traded payload for compute. Measure it and report before building. If it is expensive,
 *   > fall back to expose-two and say so.
 *
 * That is the right worry and it is not obviously safe. A selection change is a TAP, so it is
 * governed by `docs/PHASE2_BRIEF.md` v1.1 §4: tap to visible response under 100ms, and per-redraw
 * main-thread work under 32ms, ideally 16ms.
 *
 * ============================================================================================
 * WHAT THIS MEASURES, AND THE HALF IT CANNOT SEE
 * ============================================================================================
 *
 * This times the DATA half only — producing the projection the renderer is handed. It does not
 * time React, layout, paint, or the SVG board, none of which exist yet. So a pass here is
 * necessary and not sufficient, and the budget it is checked against is the redraw budget MINUS
 * whatever rendering costs. That is stated rather than left for someone to assume the number
 * covers the whole tap.
 *
 * It runs in Node on a development PC. Per §4's rule that every number carries the device it was
 * measured on, the report prints the device and also prints what the figure becomes under the
 * 4-6x CPU throttling §4 uses for screening.
 *
 * ============================================================================================
 * TIMING METHOD, because a badly-timed microbenchmark is worse than none
 * ============================================================================================
 *
 *   - Every closure is warmed before it is timed. An unwarmed first call measures the JIT.
 *   - Each measurement is REPS calls divided by REPS, because one call can be shorter than the
 *     clock's useful resolution.
 *   - Results are reported as a distribution over many real states, never as a mean over one.
 *     Task E's discipline, and for its reason: a mean cannot size a budget.
 *   - The work is consumed via a sink the optimiser cannot discard, so a dead-code-eliminated
 *     call cannot be measured as infinitely fast. That failure mode would report the most
 *     flattering possible answer, which is exactly the direction this project distrusts.
 */

import type { Engine, GameState } from '@immunity-wars/equivalence/types';
import { CELL_KEYS, FAMILIES } from '@immunity-wars/equivalence/query-shapes';

import { answersFor } from './query-payload.js';

/** Kept alive so no call under test can be optimised away as dead. */
export let SINK = 0;

function consume(v: unknown): void {
  SINK = (SINK + (v === undefined ? 1 : JSON.stringify(v).length)) % 1_000_003;
}

const REPS = 40;
const WARMUP = 10;

/** Nanoseconds for one call, averaged over REPS, after warmup. */
export function timeOne(fn: () => unknown): number {
  for (let i = 0; i < WARMUP; i += 1) consume(fn());
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < REPS; i += 1) consume(fn());
  const t1 = process.hrtime.bigint();
  return Number(t1 - t0) / REPS;
}

/**
 * The three fields the UI reads from `productionBreakdown` on EVERY family, every render.
 *
 * Measured from `v2_ui.html`: the always-on antibody panel (line 1900) and the produce picker
 * (line 717) read `net`, `boosted` and `reduced` and nothing else. The remaining six fields —
 * `base`, `effects`, `capRate`, `capped`, `blocked`, `storage` — are read by exactly one
 * function, `prodBreakdownHTML` (line 1923), which renders a TOOLTIP.
 *
 * That distinction is the same one the whole decision turned on, one level down: the summary is
 * needed for every subject at once, the detail is needed for one subject at a time.
 */
export interface ProductionSummary {
  net: number;
  boosted: boolean;
  reduced: boolean;
}

export function productionSummary(pb: Record<string, unknown>): ProductionSummary {
  return {
    net: Number(pb['net'] ?? 0),
    boosted: Boolean(pb['boosted']),
    reduced: Boolean(pb['reduced']),
  };
}

export interface SelectionTimings {
  readonly difficulty: string;
  readonly turn: number;
  readonly invaders: number;
  /** Rebuild the whole projection. The pessimistic selection-change cost. */
  readonly viewStateNs: number;
  /** `moveDestinations` for ONE cell — the selection-scoped extra. */
  readonly oneCellNs: number;
  /** `moveDestinations` for all seven — what a non-scoped precompute pays every action. */
  readonly sevenCellsNs: number;
  /** The three summary fields for all seven families. Needed on every render. */
  readonly prodSummaryNs: number;
  /** The full breakdown for ONE family — the tooltip. */
  readonly prodDetailOneNs: number;
  /** The full breakdown for all seven — what precomputing it whole would cost. */
  readonly prodDetailAllNs: number;
  /** The other 20 queries, precomputed. */
  readonly restNs: number;
}

export function timeSelection(
  engine: Engine,
  g: GameState,
  difficulty: string,
  rest: readonly string[],
): SelectionTimings {
  const ns = engine as unknown as Record<string, unknown>;
  const md = ns['moveDestinations'] as (s: GameState, c: string) => unknown;
  const pbf = ns['productionBreakdown'] as (s: GameState, f: string) => Record<string, unknown>;
  const cell = CELL_KEYS[0] ?? 'macrophage';

  return {
    difficulty,
    turn: g.turn,
    invaders: g.invaders.length,
    viewStateNs: timeOne(() => engine.viewState(g)),
    oneCellNs: timeOne(() => md(g, cell)),
    sevenCellsNs: timeOne(() => CELL_KEYS.map((c) => md(g, c))),
    prodSummaryNs: timeOne(() => FAMILIES.map((f) => productionSummary(pbf(g, f)))),
    prodDetailOneNs: timeOne(() => pbf(g, FAMILIES[0] ?? 'ENV')),
    prodDetailAllNs: timeOne(() => FAMILIES.map((f) => pbf(g, f))),
    // Through `answersFor`, not a bare call: 12 of these take a subject, and calling a
    // per-invader query with only the state would time the wrong work — usually LESS of it.
    restNs: timeOne(() => rest.map((n) => answersFor(ns, n, g))),
  };
}
