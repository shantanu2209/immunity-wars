/**
 * P2.1 — HOW BIG IS A PRECOMPUTING ViewState?
 *
 * THE DECISION THIS IS FOR. `docs/PHASE2_BRIEF.md` v1.1 §3 holds P2.1 on one open question: the
 * 22 engine queries the UI calls every render to decide what is clickable have no home. Either
 * `Session` exposes them (A), or the view precomputes them (B), or the boundary rule takes an
 * exception (C). Shantanu's lean was A, on the reasoning that precomputing inflates the payload
 * Task E measured for the Phase 3 relay. That is reasoning, and the reference counts in
 * `pnpm seam:homes` are not a proxy for it — a name read 40 times may answer in a boolean.
 *
 * So this measures it. It reuses E1's instrument wholesale (`sizeOf`, `distribution`, `fitLine`,
 * `censoring`) and E's game driver (`playGame`), because the question is a Task-E question asked
 * about a different payload, and a second harness would be a second thing to trust.
 *
 * ============================================================================================
 * WHAT A "PRECOMPUTED ANSWER" ACTUALLY IS, AND WHY THE SHAPE IS THE WHOLE MEASUREMENT
 * ============================================================================================
 *
 * A per-invader query is not one answer. The UI asks `canTag` about EVERY invader, because it is
 * deciding which invaders to draw as tappable. So a precomputing view carries one answer per
 * invader, per query — and the same for the seven cells, the seven organs and the seven antibody
 * families. That multiplication is the thing a reference count cannot see, and it is why option
 * B's cost scales with the board while much of `viewState` does not.
 *
 * THE ENCODING IS DELIBERATELY THE ONE MOST FAVOURABLE TO OPTION B. Answers are stored as
 * PARALLEL ARRAYS in the order the view already lists invaders, cells, organs and families —
 * not as objects keyed by invader id. A keyed encoding is what someone would more likely build,
 * and it is strictly larger. Measuring the smallest plausible encoding means a result against
 * option B is not an artefact of how it was encoded, which is E1's own reasoning about deltas:
 * pick the version most favourable to the option under test, and if it still loses, it is not
 * close. `keyedOverhead` reports what the realistic encoding would add.
 *
 * ============================================================================================
 * WHICH WAY THE CENSORING CUTS — MEASURED, AND IT IS THE OPPOSITE OF WHAT WAS EXPECTED
 * ============================================================================================
 *
 * This file was written expecting the measured RATIO to be a floor, on the reasoning that the bot
 * dies early, 6 of the 22 queries answer per invader, and so the sampled states would be the
 * cheap ones. **That was wrong, and the fitted slopes say so:**
 *
 *   viewState        ~363 bytes per invader
 *   precompute block  ~33 bytes per invader
 *
 * A per-invader ANSWER is a boolean or a small number; a per-invader RECORD in the view is a full
 * object. So the view grows an order of magnitude faster than the block, and the ratio FALLS as
 * the board fills. The bot's small early states therefore OVERSTATE the ratio, not understate it.
 *
 * The absolute figure is the one that survives this, and it is the one to quote: the block is
 * roughly flat in invader count, because the two queries that dominate it are per-cell and
 * per-family rather than per-invader. Everything here still rests on E1's censoring table, which
 * is why that table leads the report — but the direction of the bias is now measured rather than
 * guessed, and the guess was backwards.
 *
 * ============================================================================================
 * WHAT PRECOMPUTING ACTUALLY BUYS AND PAYS FOR — the crux, stated before the numbers
 * ============================================================================================
 *
 * A precomputing view does not know which cell the player has selected, so it must carry
 * `moveDestinations` for ALL SEVEN cells. The legacy UI computes it for the one selected cell,
 * on demand. That asymmetry is not an artefact of this measurement — it IS what precomputation
 * means, and it is why the cost concentrates where it does. Read §4 of the report with that in
 * mind: the question is not "is precomputing expensive" but "which queries are expensive to
 * answer for every possible subject at once".
 */

import type { Engine, GameState, Invader } from '@immunity-wars/equivalence/types';
import {
  CELL_KEYS,
  FAMILIES,
  SHAPE_OF,
  STATE_FREE,
  UI_QUERIES,
  type Shape,
} from '@immunity-wars/equivalence/query-shapes';

import { sizeOf, type Size } from './size.js';

type QueryFn = (...args: unknown[]) => unknown;

/**
 * The answers one query contributes to a precomputing view, for one state.
 *
 * Returned as the bare value for a state-only query and as a parallel array otherwise. A query
 * the engine does not publish returns `undefined` and is counted as a MISSING query rather than
 * as a zero-byte one — a query silently costing nothing is the failure mode this whole file
 * exists to avoid.
 */
export function answersFor(
  engine: Record<string, unknown>,
  name: string,
  g: GameState,
): { value: unknown; missing: boolean } {
  const fn = engine[name] as QueryFn | undefined;
  if (typeof fn !== 'function') return { value: undefined, missing: true };
  const shape: Shape = SHAPE_OF[name] ?? 'state';

  // `attackable`, `famOf` and `branchLen` take the subject ALONE, not (state, subject). Calling
  // them with the state first would produce a wrong answer OF THE RIGHT TYPE — no throw, no
  // NaN, just a boolean computed about the wrong thing — so this is named explicitly rather
  // than inferred.
  //
  // It is also cross-checked against the function's own arity, and the check is the point: an
  // arity heuristic alone would break silently the day someone gives a two-parameter query a
  // default, and a named list alone would break silently the day a signature changes. Requiring
  // them to agree means either change is loud.
  const stateless = (STATE_FREE as readonly string[]).includes(name);
  if (stateless !== (fn.length === 1) && SHAPE_OF[name] !== 'state') {
    throw new Error(
      `${name}: STATE_FREE says stateless=${String(stateless)} but fn.length=${fn.length}. ` +
        'One of the two is now wrong, and calling it either way would give a wrong answer of ' +
        'the right type. Fix query-shapes.ts before trusting any number from this report.',
    );
  }
  const call = (subject: unknown): unknown => (stateless ? fn(subject) : fn(g, subject));

  switch (shape) {
    case 'state':
      return { value: fn(g), missing: false };
    case 'invader':
      return { value: g.invaders.map((iv: Invader) => call(iv)), missing: false };
    case 'cell':
      return { value: CELL_KEYS.map((ck) => call(ck)), missing: false };
    case 'organ':
      return { value: g.organList.map((o: string) => call(o)), missing: false };
    case 'family':
      return { value: FAMILIES.map((f) => call(f)), missing: false };
  }
}

/** Everything a precomputing view would carry, for one state. */
export interface PrecomputeSample {
  readonly difficulty: string;
  readonly seed: number;
  readonly turn: number;
  readonly invaders: number;
  /** `sizeOf(viewState(g))` — E1's baseline, recomputed here so the ratio is same-state. */
  readonly view: Size;
  /** The 22 answers, parallel-array encoded: the smallest plausible precompute. */
  readonly block: Size;
  /** What a realistic id-keyed encoding would add, in utf8 bytes. */
  readonly keyedOverhead: number;
  /** utf8 bytes per query name. */
  readonly perQuery: Readonly<Record<string, number>>;
}

export function samplePrecompute(
  engine: Engine,
  g: GameState,
  seed: number,
  difficulty: string,
): { sample: PrecomputeSample; missing: string[] } {
  const ns = engine as unknown as Record<string, unknown>;
  const block: Record<string, unknown> = {};
  const keyed: Record<string, unknown> = {};
  const perQuery: Record<string, number> = {};
  const missing: string[] = [];

  const invaderIds = g.invaders.map((iv: Invader) => String(iv.id));

  for (const name of UI_QUERIES) {
    const { value, missing: gone } = answersFor(ns, name, g);
    if (gone) {
      missing.push(name);
      continue;
    }
    block[name] = value;
    perQuery[name] = Buffer.byteLength(JSON.stringify(value) ?? 'null', 'utf8');

    // The realistic encoding, for the overhead figure only.
    const shape: Shape = SHAPE_OF[name] ?? 'state';
    if (shape === 'invader' && Array.isArray(value)) {
      keyed[name] = Object.fromEntries(value.map((v, i) => [invaderIds[i] ?? String(i), v]));
    } else if (shape === 'cell' && Array.isArray(value)) {
      keyed[name] = Object.fromEntries(value.map((v, i) => [CELL_KEYS[i] ?? String(i), v]));
    } else if (shape === 'organ' && Array.isArray(value)) {
      keyed[name] = Object.fromEntries(value.map((v, i) => [g.organList[i] ?? String(i), v]));
    } else if (shape === 'family' && Array.isArray(value)) {
      keyed[name] = Object.fromEntries(value.map((v, i) => [FAMILIES[i] ?? String(i), v]));
    } else {
      keyed[name] = value;
    }
  }

  const view = sizeOf(engine.viewState(g));
  const blockSize = sizeOf(block);

  return {
    sample: {
      difficulty,
      seed,
      turn: g.turn,
      invaders: g.invaders.length,
      view,
      block: blockSize,
      keyedOverhead: sizeOf(keyed).utf8 - blockSize.utf8,
      perQuery,
    },
    missing,
  };
}
