/**
 * The harness-side game driver.
 *
 * ONE way to play a game for measurement, used by every Task E instrument — the fidelity check,
 * the metric panel, the state-size sampler and every negative control. The reasoning is
 * `tests/property/src/runner.ts`'s, unchanged: a control that exercises a parallel copy of the
 * driver proves the copy works.
 *
 * WHY NOT `simulate()`. The engine's own simulator would be the obvious thing to measure, and it
 * is the wrong thing to measure, for two independent reasons:
 *
 *   1. It returns seven aggregates over N games and exposes nothing per game. Three of the four
 *      panel metrics (`avgTurnsSurvived`, `avgAntibodiesMade`, `avgOrgansDamaged`) are not among
 *      them and cannot be recovered from them.
 *   2. Adding them would be an ENGINE CHANGE. Task E is measurement only, and `simulate()` is
 *      under an equivalence contract with legacy at B6 — changing its shape breaks the proof.
 *
 * So play is driven from outside, by `@immunity-wars/equivalence/bot`, whose decision logic
 * mirrors `simulate()`'s inlined bot. **That mirroring is measured, not assumed** — `fidelity.ts`
 * is the check, and docs/TASK_E_PLAN.md §5 E0a says what each outcome means for how the numbers
 * are labelled.
 *
 * THE ENGINE IS A PARAMETER, never a module-level import (docs/FINDINGS.md #28). A negative
 * control runs a deliberately-mutated engine, and a harness that reached for the port's own
 * `viewState` or `newGame` would measure the correct engine while believing it measured the
 * broken one — the C5b shape, and the exact failure Task D found in three invariants.
 */

import * as portNs from '@immunity-wars/engine';
import { botGame } from '@immunity-wars/equivalence/bot';
import { installRng, drawCount, restoreRng } from '@immunity-wars/equivalence/rng';
import type { Action, Engine, GameState } from '@immunity-wars/equivalence/types';

export const PORT = portNs as unknown as Engine;

/** The three difficulties, in the order every Task E report prints them. */
export const DIFFICULTIES = ['training', 'normal', 'hard'] as const;

/**
 * The seed for sample `i`. **splitmix32, not an arithmetic step, and the difference is measurable.**
 *
 * This was `0x51de + i * 7919` until E2, and that choice quietly broke the bands. Games seeded by
 * consecutive terms of an arithmetic sequence are NOT independent samples: `installRng` uses
 * mulberry32, whose state is the seed, so linearly-spaced seeds give correlated streams. The
 * effect is not subtle —
 *
 * ```
 *   normal, 20 x 100 games, arm A vs a disjoint arm B
 *   seeds                 sd/batch (avgTurnsSurvived)   worst |B - A|
 *   0x51de + i * 7919                    0.4105              4.3 sd   ** outside the band **
 *   splitmix32(i)                        0.2499              1.7 sd
 * ```
 *
 * Two separate harms, in opposite directions. The batch spread was INFLATED by 64%, so bands
 * built from it looked reassuringly wide; and two disjoint seed blocks disagreed by more than
 * three standard errors, so the bands did not reproduce and could not have been gated on.
 *
 * Found by the two-arm reproducibility check in `metrics-run.ts`, which exists for exactly this
 * and fired the first time it was run at full size. See docs/FINDINGS.md #33.
 *
 * PAIRED comparisons — E0a's bot fidelity, and every negative control that runs a base engine and
 * a mutated one over the SAME seeds — are unaffected either way, because the correlation is
 * identical on both sides and cancels.
 */
export function seedAt(i: number): number {
  let z = (i + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  return (z ^ (z >>> 15)) >>> 0;
}

/**
 * `simulate()`'s own turn guard, reproduced exactly.
 *
 * Not a tuning knob. The fidelity check compares this driver against `simulate()`, and a
 * different bound would be a difference in the harness rather than in the bot — which is
 * precisely the kind of artefact that makes a comparison meaningless.
 */
export const TURN_GUARD = 200;

/** Everything one game yields to a measurement. Raw counts only; no rates, no means. */
export interface GameRecord {
  readonly seed: number;
  readonly difficulty: string;
  /** The game ended in a win. */
  readonly won: boolean;
  /** The game ended in a loss. */
  readonly lost: boolean;
  /**
   * Neither won nor lost when the turn guard ran out. Reported, never silently folded into a
   * loss: an unfinished game has no `avgTurnsSurvived` and counting it as one would censor the
   * metric without saying so.
   */
  readonly unfinished: boolean;
  /** `g.turn` when play stopped. The raw material for `avgTurnsSurvived`. */
  readonly endTurn: number;
  readonly lossTurn: number | null;
  readonly lossOrgan: string | null;
  readonly lossReason: string | null;
  readonly killedTrunk: number;
  readonly killedBranch: number;
  readonly organHits: number;
  readonly residentAte: number;
  /** Organs below their maximum integrity at the end. */
  readonly organsDamaged: number;
  /** Sum of `g.made` — every antibody produced across all seven families. */
  readonly antibodiesMade: number;
  readonly invadersLeft: number;
  readonly presentations: number;
  /** Math.random draws consumed. A sharp discriminator between two decision procedures. */
  readonly rngDraws: number;
  /** Actions applied, including rejected ones. */
  readonly actions: number;
}

/**
 * `stats` and `lost` reach the rig's GameState through its index signature as `unknown`, because
 * the rig types only what the bot touches. They are narrowed here rather than cast: a cast would
 * turn a missing field into a runtime `undefined` that silently reads as 0, and a metric quietly
 * reading 0 for every game is the failure mode this project keeps finding.
 */
interface Stats {
  readonly killedTrunk: number;
  readonly killedBranch: number;
  readonly organHits: number;
  readonly residentAte: number;
}

interface Loss {
  readonly turn: number;
  readonly organ: string | null;
  readonly reason?: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function statsOf(g: GameState): Stats {
  const s = g['stats'];
  if (!isRecord(s))
    throw new Error('game state has no stats object — the harness is measuring nothing');
  const num = (k: string): number => {
    const v = s[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new Error(`stats.${k} is ${JSON.stringify(v)}, not a finite number`);
    }
    return v;
  };
  return {
    killedTrunk: num('killedTrunk'),
    killedBranch: num('killedBranch'),
    organHits: num('organHits'),
    residentAte: num('residentAte'),
  };
}

function lossOf(g: GameState): Loss | null {
  const l = g.lost;
  if (!isRecord(l)) return null;
  return {
    turn: typeof l['turn'] === 'number' ? l['turn'] : 0,
    organ: typeof l['organ'] === 'string' ? l['organ'] : null,
    reason: typeof l['reason'] === 'string' ? l['reason'] : undefined,
  };
}

function organsDamaged(g: GameState): number {
  return g.organList.filter((o) => {
    const org = g.organs[o];
    return org ? org.hp < org.max : false;
  }).length;
}

function sumValues(r: Record<string, number> | undefined): number {
  if (!r) return 0;
  let total = 0;
  for (const v of Object.values(r)) if (Number.isFinite(v)) total += v;
  return total;
}

export interface PlayOptions {
  readonly seed: number;
  readonly difficulty: string;
  /** Defaults to the ported engine. Overridden by every negative control. */
  readonly engine?: Engine;
  /** Called after every applied action, with the LIVE state. The state-size sampler's hook. */
  readonly onAction?: (g: GameState, a: Action, result: unknown) => void;
  /** Called once per game before play begins, with the LIVE initial state. */
  readonly onStart?: (g: GameState) => void;
}

/**
 * Play one seeded game to its natural end and return what it yielded.
 *
 * Nothing is copied on the way out that the caller might mistake for a live state, and nothing is
 * copied on the way IN to the hooks — `onAction` sees the real object, because a
 * `JSON.parse(JSON.stringify(g))` here would erase exactly what the size sampler is measuring.
 */
export function playGame(opts: PlayOptions): GameRecord {
  const { seed, difficulty, engine = PORT, onAction, onStart } = opts;

  let actions = 0;
  installRng(seed);
  try {
    const g = engine.newGame({ difficulty, science: false });
    onStart?.(g);

    botGame(
      engine,
      g,
      (a) => {
        const r = engine.applyAction(g, a);
        actions += 1;
        onAction?.(g, a, r);
        return r;
      },
      TURN_GUARD,
    );

    const lost = lossOf(g);
    const stats = statsOf(g);
    return {
      seed,
      difficulty,
      won: Boolean(g.won),
      lost: Boolean(lost),
      unfinished: !g.won && !lost,
      endTurn: g.turn,
      lossTurn: lost ? lost.turn : null,
      lossOrgan: lost ? lost.organ : null,
      lossReason: lost ? (lost.reason ?? null) : null,
      killedTrunk: stats.killedTrunk,
      killedBranch: stats.killedBranch,
      organHits: stats.organHits,
      residentAte: stats.residentAte,
      organsDamaged: organsDamaged(g),
      antibodiesMade: sumValues(g.made),
      invadersLeft: g.invaders.length,
      presentations: g.presentations,
      rngDraws: drawCount(),
      actions,
    };
  } finally {
    restoreRng();
  }
}
