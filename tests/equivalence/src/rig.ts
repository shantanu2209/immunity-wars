/**
 * The equivalence rig: record against legacy, replay against a candidate, compare.
 *
 * The comparison contract has three levels, checked after EVERY action:
 *
 *   1. state   — hash of the full game state, including log HTML, the undo stack and stats
 *   2. rng     — Math.random draw count (catches wrong dice and wrong evaluation order, and
 *                localises a divergence to a single action)
 *   3. result  — applyAction's return value: {ok}, the exact error string, or the frames array
 *
 * Level 2 is what makes this stronger than state-diffing alone. See src/rng.ts.
 */

import { botGame } from './bot.js';
import { hashValue } from './hash.js';
import { installRng, restoreRng, drawCount } from './rng.js';
import type { Action, Engine, GameState } from './types.js';

export interface Step {
  stateHash: string;
  draws: number;
  resultHash: string;
}

export interface Trace {
  readonly seed: number;
  readonly difficulty: string;
  readonly actions: readonly Action[];
  readonly steps: readonly Step[];
  readonly finished: { won: boolean; lost: boolean; turn: number };
}

export type EngineFactory = () => Engine;

function newGameFor(E: Engine, difficulty: string): GameState {
  return E.newGame({ difficulty, science: false });
}

/**
 * Drive the bot against one engine and record everything it did.
 *
 * The bot only ever sees THIS engine. The action list it produces becomes a fixed artefact,
 * which is what makes the later replay a genuine oracle rather than two engines each doing
 * whatever they think best.
 */
export function record(
  factory: EngineFactory,
  seed: number,
  difficulty: string,
  maxTurns: number,
): Trace {
  const E = factory();
  installRng(seed);
  try {
    const g = newGameFor(E, difficulty);
    const actions: Action[] = [];
    const steps: Step[] = [];
    botGame(
      E,
      g,
      (a) => {
        const r = E.applyAction(g, a);
        actions.push(a);
        steps.push({ stateHash: hashValue(g), draws: drawCount(), resultHash: hashValue(r) });
        return r;
      },
      maxTurns,
    );
    return {
      seed,
      difficulty,
      actions,
      steps,
      finished: { won: g.won, lost: Boolean(g.lost), turn: g.turn },
    };
  } finally {
    restoreRng();
  }
}

/** Replay a fixed action list against an engine, recording the same three levels. */
export function replay(
  factory: EngineFactory,
  seed: number,
  difficulty: string,
  actions: readonly Action[],
): Step[] {
  const E = factory();
  installRng(seed);
  try {
    const g = newGameFor(E, difficulty);
    const steps: Step[] = [];
    for (const a of actions) {
      const r = E.applyAction(g, a);
      steps.push({ stateHash: hashValue(g), draws: drawCount(), resultHash: hashValue(r) });
    }
    return steps;
  } finally {
    restoreRng();
  }
}

export type DivergenceLevel = 'state' | 'rng' | 'result';

export interface Divergence {
  readonly seed: number;
  readonly difficulty: string;
  readonly index: number;
  readonly level: DivergenceLevel;
  readonly action: Action;
  readonly actions: readonly Action[];
}

/**
 * Order matters, and it is chosen for diagnostic value rather than arbitrarily.
 *
 *   rng    first — a draw-count mismatch explains a state mismatch, never the reverse.
 *   state  next  — endCommand returns {ok:true, frames:[...]} and every frame embeds a full
 *                  viewState, so a state divergence ALSO shows up as a result divergence at
 *                  the same index. Reporting it as "result" would name the symptom and hide
 *                  the cause. Checking state first means "result" is reserved for what only
 *                  a result can carry: a wrong ok/error.
 *   result last  — a differing rejection reason with identical state.
 */
function classify(a: Step, b: Step): DivergenceLevel | null {
  if (a.draws !== b.draws) return 'rng';
  if (a.stateHash !== b.stateHash) return 'state';
  if (a.resultHash !== b.resultHash) return 'result';
  return null;
}

/** Compare a recorded trace against a candidate engine. Returns null when identical. */
export function compareTrace(trace: Trace, candidate: EngineFactory): Divergence | null {
  const got = replay(candidate, trace.seed, trace.difficulty, trace.actions);
  const n = Math.min(got.length, trace.steps.length);
  for (let i = 0; i < n; i += 1) {
    const want = trace.steps[i];
    const have = got[i];
    if (!want || !have) continue;
    const level = classify(want, have);
    if (level) {
      return {
        seed: trace.seed,
        difficulty: trace.difficulty,
        index: i,
        level,
        action: trace.actions[i] ?? { action: '<unknown>' },
        actions: trace.actions,
      };
    }
  }
  return null;
}

/**
 * One full check: generate a game against legacy, replay it into the candidate.
 *
 * Streaming by design — record, replay, discard. Batching 1,500 games pushed peak RSS from
 * 215 MB to 877 MB in measurement, for no benefit.
 */
export function checkGame(
  legacy: EngineFactory,
  candidate: EngineFactory,
  seed: number,
  difficulty: string,
  maxTurns: number,
): Divergence | null {
  return compareTrace(record(legacy, seed, difficulty, maxTurns), candidate);
}
