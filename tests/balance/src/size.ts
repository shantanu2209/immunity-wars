/**
 * E1 — the serialised-state-size instrument.
 *
 * `PHASE1_BRIEF.md` §5 asks for `JSON.stringify(viewState(g)).length` on a representative
 * mid-game state, to decide whether a Phase 3 relay broadcasts full state or must send deltas.
 * Three things about that specification turned out to be wrong or insufficient, and this module
 * exists to measure what was actually asked about rather than what was written down.
 *
 * 1. **`endCommand` returns a BURST of states, not one.** `resolveSpread` builds a `Frame[]` with
 *    20 `snap()` sites, each frame carrying a full `viewState`. The realistic broadcast unit is
 *    `frames.length x stateSize`. The brief's number is still reported, exactly as specified.
 *
 * 2. **A single "representative" state cannot size a protocol.** Every state is measured; any
 *    single figure quoted carries its percentile rank.
 *
 * 3. **`.length` is UTF-16 code units, not wire bytes.** Hosting cost and the delta decision are
 *    about bytes on a wire, so UTF-8 and compressed sizes are measured alongside.
 *
 * AND THE ONE THAT MATTERS MOST: every figure here is a **FLOOR**. The reference bot dies at
 * turn 8.8 of a legal 45-turn Hard game, state size grows with invader count, and the projection
 * ships six multiplayer fields that are empty in every game a single-player harness can generate.
 * `censoring()` below produces the table that says so, and it leads the report.
 */

import { gzipSync } from 'node:zlib';

import type { Action, Engine, GameState } from '@immunity-wars/equivalence/types';

/** Longest legal game per difficulty: `DIFF[d].turns + GRACE_CLEAR`. Read from content, not typed in. */
export interface TurnWindow {
  readonly maxTurn: number;
  readonly graceClear: number;
  readonly longestLegalGame: number;
}

/** The three ways one JSON payload can be counted. */
export interface Size {
  /** `JSON.stringify(x).length` — the brief's number. UTF-16 code units. */
  readonly chars: number;
  /** What actually goes on a wire, uncompressed. */
  readonly utf8: number;
  /** What actually goes on a wire under gzip. A relay would use permessage-deflate; close enough to size a decision. */
  readonly gzip: number;
}

export function sizeOf(value: unknown): Size {
  const json = JSON.stringify(value) ?? '';
  const buf = Buffer.from(json, 'utf8');
  return { chars: json.length, utf8: buf.byteLength, gzip: gzipSync(buf).byteLength };
}

/** One sampled state, with the context needed to say what kind of state it was. */
export interface StateSample {
  readonly difficulty: string;
  readonly seed: number;
  readonly turn: number;
  readonly phase: string;
  readonly invaders: number;
  readonly size: Size;
  /** Bytes per top-level `viewState` key, for the decomposition. */
  readonly fields: Readonly<Record<string, number>>;
  /**
   * Field-level delta against the previous state of the same game: the serialised size of every
   * top-level key whose value changed. This is the churn measure, and it is the quantity the
   * full-state-vs-deltas decision actually turns on — "is the state big" does not decide it,
   * "is the state big relative to what changes per action" does. Null for a game's first state.
   */
  readonly delta: Size | null;
  readonly changedKeys: number | null;
}

/** One `endCommand` burst. The realistic per-turn broadcast. */
export interface BurstSample {
  readonly difficulty: string;
  readonly seed: number;
  readonly turn: number;
  readonly frames: number;
  readonly size: Size;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Is this field carrying anything?
 *
 * Used only by the field-population census, whose question is "does any generator ever put
 * something here" — so `0`, `false`, `null`, `[]`, `{}` and `''` all count as nothing. That is
 * deliberately strict: it is what makes the census able to say a field is never exercised.
 */
export function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined || v === false || v === 0 || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (isPlainObject(v)) return Object.keys(v).length === 0;
  return false;
}

function fieldSizes(view: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(view)) {
    out[k] = Buffer.byteLength(JSON.stringify(v) ?? 'null', 'utf8');
  }
  return out;
}

/**
 * The field-level delta between two projections.
 *
 * Resend every top-level key whose serialisation changed. This is not the cleverest possible
 * delta — a JSON-patch over the invader array would be smaller — it is the SIMPLEST one a relay
 * would plausibly implement, so it is a conservative estimate of what deltas buy. If even this
 * is dramatically smaller than the full state, the answer is not close.
 */
function fieldDelta(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): { size: Size; changed: number } {
  const changed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next)) {
    if (JSON.stringify(v) !== JSON.stringify(prev[k])) changed[k] = v;
  }
  return { size: sizeOf(changed), changed: Object.keys(changed).length };
}

/**
 * Accumulates samples across many games.
 *
 * Holds raw samples rather than running totals, because the report needs percentiles and a
 * regression, and both need the distribution. At the sampling rates in `size-run.ts` this is a
 * few hundred thousand small records — well inside memory, and it means the tail can be examined
 * rather than summarised away.
 */
export class SizeSampler {
  readonly states: StateSample[] = [];
  readonly bursts: BurstSample[] = [];
  /** Per field: has any generator ever put a non-empty value here? */
  readonly populated = new Map<string, boolean>();
  /** Highest invader count seen in any sampled state — the anchor for the regression bound. */
  maxInvaders = 0;

  private prevView: Record<string, unknown> | null = null;
  private prevSeed: number | null = null;

  /** Call at the start of each game, so the churn measure does not diff across a game boundary. */
  startGame(): void {
    this.prevView = null;
    this.prevSeed = null;
  }

  record(engine: Engine, g: GameState, seed: number, difficulty: string): void {
    const view = engine.viewState(g);
    if (!isPlainObject(view)) throw new Error('viewState did not return an object');

    for (const [k, v] of Object.entries(view)) {
      if (!this.populated.get(k)) this.populated.set(k, !isEmptyValue(v));
    }

    const sameGame = this.prevView !== null && this.prevSeed === seed;
    const d = sameGame && this.prevView ? fieldDelta(this.prevView, view) : null;

    this.states.push({
      difficulty,
      seed,
      turn: g.turn,
      phase: g.phase,
      invaders: g.invaders.length,
      size: sizeOf(view),
      fields: fieldSizes(view),
      delta: d ? d.size : null,
      changedKeys: d ? d.changed : null,
    });

    if (g.invaders.length > this.maxInvaders) this.maxInvaders = g.invaders.length;
    this.prevView = view;
    this.prevSeed = seed;
  }

  /**
   * Record an `endCommand` result if it carried frames.
   *
   * The frames are measured AS RETURNED — including each frame's `label` and `dice`, because
   * that is what a relay forwarding the burst would actually send.
   */
  recordBurst(result: unknown, g: GameState, seed: number, difficulty: string, a: Action): void {
    if (a.action !== 'endCommand') return;
    if (!isPlainObject(result)) return;
    const frames = result['frames'];
    if (!Array.isArray(frames) || frames.length === 0) return;
    this.bursts.push({
      difficulty,
      seed,
      turn: g.turn,
      frames: frames.length,
      size: sizeOf(frames),
    });
  }
}

// -----------------------------------------------------------------------------------------------
// Summary statistics. Percentiles rather than means, because a mean cannot size a protocol.
// -----------------------------------------------------------------------------------------------

export interface Dist {
  readonly n: number;
  readonly mean: number;
  readonly p50: number;
  readonly p90: number;
  readonly p99: number;
  readonly max: number;
}

export function distribution(values: readonly number[]): Dist {
  if (values.length === 0) return { n: 0, mean: 0, p50: 0, p90: 0, p99: 0, max: 0 };
  const s = [...values].sort((a, b) => a - b);
  const at = (q: number): number => s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? 0;
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    n: s.length,
    mean: sum / s.length,
    p50: at(0.5),
    p90: at(0.9),
    p99: at(0.99),
    max: s[s.length - 1] ?? 0,
  };
}

/** The percentile rank of one value within a distribution — what any quoted figure travels with. */
export function percentileRank(values: readonly number[], value: number): number {
  if (values.length === 0) return 0;
  let below = 0;
  for (const v of values) if (v <= value) below += 1;
  return below / values.length;
}

/** Ordinary least squares. Returns bytes-per-invader and the intercept. */
export function fitLine(points: readonly (readonly [number, number])[]): {
  slope: number;
  intercept: number;
} {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  let sx = 0;
  let sy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
  }
  const mx = sx / n;
  const my = sy / n;
  let num = 0;
  let den = 0;
  for (const [x, y] of points) {
    num += (x - mx) * (y - my);
    den += (x - mx) * (x - mx);
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

/**
 * THE CENSORING TABLE — how much of each difficulty's legal game the corpus actually reached.
 *
 * This is the honest core of E1 and it leads the report. Everything else here is conditional on
 * it: the bot dies early, new infections keep arriving until `maxTurn`, and state size grows with
 * invader count — so the sampled states are systematically the SMALL ones and every figure
 * derived from them is a lower bound on what a human session broadcasts.
 */
export interface CensoringRow {
  readonly difficulty: string;
  readonly window: TurnWindow;
  readonly meanEndTurn: number;
  readonly maxEndTurn: number;
  readonly fractionOfWindow: number;
  readonly gamesReachingMaxTurn: number;
  readonly games: number;
}

export function censoring(
  difficulty: string,
  window: TurnWindow,
  endTurns: readonly number[],
): CensoringRow {
  const games = endTurns.length;
  const sum = endTurns.reduce((a, b) => a + b, 0);
  const meanEndTurn = games ? sum / games : 0;
  return {
    difficulty,
    window,
    meanEndTurn,
    maxEndTurn: games ? Math.max(...endTurns) : 0,
    fractionOfWindow: window.longestLegalGame ? meanEndTurn / window.longestLegalGame : 0,
    gamesReachingMaxTurn: endTurns.filter((t) => t > window.maxTurn).length,
    games,
  };
}
