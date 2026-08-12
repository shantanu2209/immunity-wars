/**
 * The generative driver.
 *
 * ONE ENTRY POINT, `runGame`, and everything goes through it — the real properties, the
 * ≥10,000-game tier, and every negative control. That is deliberate and it is the most important
 * structural decision in this suite. A negative control that exercises a parallel copy of the
 * runner proves the copy works; the Task C5b failure was exactly that shape, nineteen green tests
 * against an oracle the test itself had regenerated. If the saboteur can reach the real code
 * path, so can a real bug.
 *
 * SEQUENCE GENERATION reuses `@immunity-wars/equivalence/bot` rather than writing a second bot.
 * The rig's bot is explicitly not a behaviour oracle — its only job is to produce long legal
 * games — which is precisely what a property suite wants. What it does NOT do is emit 8 of the
 * engine's 27 actions (docs/FINDINGS.md §1.1), so its blind spots would become this suite's
 * blind spots. `injectExtra` fills those in from the engine's own query functions, through the
 * bot's own emit hook, so there is still exactly one decision engine.
 */

import * as portNs from '@immunity-wars/engine';
import { botGame } from '@immunity-wars/equivalence/bot';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import { ddmin } from '@immunity-wars/equivalence/shrink';
import type { Action, ActionResult, Engine, GameState } from '@immunity-wars/equivalence/types';

import {
  ALL_INVARIANTS,
  type Ctx,
  type EngineUnderTest,
  type Invariant,
  type Violation,
} from './invariants.js';

const port = portNs as unknown as Engine;

const CELL_KEYS = ['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil'];
const LANES = ['nose', 'gut', 'contact', 'wound', 'bite', 'blood'];

/**
 * A deliberate corruption, for negative controls only.
 *
 * `when` is a PREDICATE, not an action index. An index would shift under `ddmin` and the
 * saboteur would stop firing on the reduced case, so a control could not demonstrate shrinking.
 */
export interface Saboteur {
  readonly name: string;
  when(g: GameState, index: number): boolean;
  apply(g: GameState): void;
}

export interface RunOptions {
  readonly seed: number;
  readonly difficulty: string;
  readonly maxTurns?: number;
  readonly invariants?: readonly Invariant[];
  readonly saboteur?: Saboteur | null;
  /** 0 disables injection — used only to demonstrate that injection is what reaches 8 actions. */
  readonly injectEvery?: number;
  /**
   * Defaults to the ported engine. Overridden by exactly one negative control, which runs a
   * deliberately-mutated engine to show an invariant firing on a WRONG ENGINE rather than on an
   * injected corruption — a different failure mode from the saboteurs, and the one that says the
   * checks are wired to real transitions. Task E's balance harness will want the same hook.
   */
  readonly engine?: Engine;
}

export interface RunResult {
  readonly seed: number;
  readonly difficulty: string;
  readonly actions: readonly Action[];
  readonly violations: readonly Violation[];
  /** Per-invariant count of things actually examined. A zero here fails the run. */
  readonly checks: Readonly<Record<string, number>>;
  readonly states: number;
  /** Every distinct action name applied, for the vacuity report. */
  readonly emitted: readonly string[];
}

/** A small deterministic PRNG for injection choices, independent of the engine's stream. */
function mulberry(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(xs: readonly T[], r: number): T | undefined =>
  xs.length ? xs[Math.floor(r * xs.length) % xs.length] : undefined;

/**
 * Candidate actions the bot never emits.
 *
 * Built from the engine's own target lists so most of them are legal; the ones that are not
 * return `{ok:false}` and are still worth applying, because an invariant must hold across a
 * rejection too. `undo` is here because it is the only action that rewinds state, and the brief's
 * turn invariant was written on the assumption it can rewind a turn (it cannot — see
 * `undo-snapshot.test.ts`).
 */
function injectExtra(g: GameState, r: () => number): Action | null {
  if (g.phase !== 'command') return null;
  const ck = pick(CELL_KEYS, r()) ?? 'macrophage';
  const organ = pick(g.organList, r()) ?? 'lungs';
  const options: Action[] = [
    { action: 'net', cell: 'neutrophil' },
    { action: 'resmove', organ, step: Math.floor(r() * 3) },
    { action: 'resengulf', organ, invaderId: pick(g.invaders, r())?.id ?? 'none' },
    { action: 'hop', cell: ck, lane: pick(LANES, r()) },
    { action: 'recall', cell: ck },
    { action: 'orderAntivenom', ap: 1 },
    { action: 'antivenom', invaderId: pick(g.invaders, r())?.id ?? 'none' },
    { action: 'undo' },
  ];
  return pick(options, r()) ?? null;
}

/**
 * Play one game, checking every invariant after every action.
 *
 * The invariants see the LIVE state object. Nothing is copied on the way in — a
 * `JSON.parse(JSON.stringify(g))` here would destroy NaN, undefined and -0 before any predicate
 * could see them, silently disabling the two serialisation invariants and the NaN half of the AP
 * one. That erasure is what `negative-control.test.ts`'s JSON-hostile saboteur exists to prove
 * has not happened.
 */
export function runGame(opts: RunOptions): RunResult {
  const {
    seed,
    difficulty,
    maxTurns = 18,
    invariants = ALL_INVARIANTS,
    saboteur = null,
    injectEvery = 7,
    engine = port,
  } = opts;

  const actions: Action[] = [];
  const violations: Violation[] = [];
  const checks: Record<string, number> = {};
  const emitted = new Set<string>();
  for (const inv of invariants) checks[inv.id] = 0;

  let states = 0;
  let index = 0;
  const choose = mulberry(seed ^ 0x5bf03635);

  const ctx: Ctx = { engine: engine as unknown as EngineUnderTest };

  const step = (g: GameState, a: Action): ActionResult => {
    const pres = new Map<string, unknown>();
    for (const inv of invariants) {
      if (inv.before) pres.set(inv.id, inv.before(ctx, g, a));
    }

    const r = engine.applyAction(g, a);
    actions.push(a);
    emitted.add(a.action);
    index += 1;
    states += 1;

    if (saboteur && saboteur.when(g, index)) saboteur.apply(g);

    for (const inv of invariants) {
      const report = {
        checked: (n = 1): void => {
          checks[inv.id] = (checks[inv.id] ?? 0) + n;
        },
        violate: (detail: string): void => {
          violations.push({
            invariant: inv.id,
            detail,
            turn: g.turn,
            action: a.action,
          });
        },
      };
      inv.after(ctx, g, a, r, pres.get(inv.id) ?? null, report);
    }
    return r;
  };

  installRng(seed);
  try {
    const g = engine.newGame({ difficulty, science: false });
    botGame(
      engine,
      g,
      (a) => {
        if (injectEvery > 0 && index > 0 && index % injectEvery === 0) {
          const extra = injectExtra(g, choose);
          if (extra) step(g, extra);
        }
        return step(g, a);
      },
      maxTurns,
    );
  } finally {
    restoreRng();
  }

  return { seed, difficulty, actions, violations, checks, states, emitted: [...emitted] };
}

/**
 * Replay a FIXED action list and report whether the invariants still break.
 *
 * This is what `ddmin` reduces against. It does not run the bot: the action list is the input,
 * exactly as `rig.ts`'s `replay` is to the corpus. A reduced list is a different-but-legal game
 * rather than a subsequence of the original — the reasoning is in `shrink.ts`'s header and holds
 * here unchanged.
 */
export function replayGame(
  seed: number,
  difficulty: string,
  actions: readonly Action[],
  invariants: readonly Invariant[] = ALL_INVARIANTS,
  saboteur: Saboteur | null = null,
  engine: Engine = port,
): readonly Violation[] {
  const violations: Violation[] = [];
  const ctx: Ctx = { engine: engine as unknown as EngineUnderTest };
  installRng(seed);
  try {
    const g = engine.newGame({ difficulty, science: false });
    let index = 0;
    for (const a of actions) {
      const pres = new Map<string, unknown>();
      for (const inv of invariants) {
        if (inv.before) pres.set(inv.id, inv.before(ctx, g, a));
      }
      const r = engine.applyAction(g, a);
      index += 1;
      if (saboteur && saboteur.when(g, index)) saboteur.apply(g);
      for (const inv of invariants) {
        const report = {
          checked: (): void => {},
          violate: (detail: string): void => {
            violations.push({ invariant: inv.id, detail, turn: g.turn, action: a.action });
          },
        };
        inv.after(ctx, g, a, r, pres.get(inv.id) ?? null, report);
      }
    }
  } finally {
    restoreRng();
  }
  return violations;
}

export interface ShrunkViolation {
  readonly seed: number;
  readonly difficulty: string;
  readonly invariant: string;
  readonly originalLength: number;
  readonly minimalActions: readonly Action[];
  readonly violation: Violation;
  readonly text: string;
}

/**
 * Reduce a violating run to a minimal reproducing action list.
 *
 * Uses `ddmin` from the equivalence rig — the same minimiser the corpus uses for divergences,
 * lifted behind a predicate at Task D. fast-check's own shrinker is turned OFF for these
 * properties (`endOnFailure: true` in `property.test.ts`), because what it would hand back is a
 * reduced *choice stream*, which nobody can read. This hands back an action list.
 */
export function shrinkViolation(
  run: RunResult,
  invariants: readonly Invariant[] = ALL_INVARIANTS,
  saboteur: Saboteur | null = null,
  budget = 300,
  engine: Engine = port,
): ShrunkViolation | null {
  const first = run.violations[0];
  if (!first) return null;

  const stillViolates = (list: readonly Action[]): boolean =>
    replayGame(run.seed, run.difficulty, list, invariants, saboteur, engine).some(
      (v) => v.invariant === first.invariant,
    );

  const minimal = ddmin(run.actions, stillViolates, budget);
  const after = replayGame(run.seed, run.difficulty, minimal, invariants, saboteur, engine).find(
    (v) => v.invariant === first.invariant,
  );

  const describe = (a: Action): string => {
    const rest = Object.entries(a)
      .filter(([k]) => k !== 'action')
      .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
      .join(',');
    return rest ? `${a.action}{${rest}}` : a.action;
  };

  const violation = after ?? first;
  const text = [
    `INVARIANT VIOLATED  ${violation.invariant}`,
    `seed=${run.seed}  difficulty=${run.difficulty}  turn=${violation.turn}`,
    `shrunk ${run.actions.length} actions -> ${minimal.length}`,
    `minimal repro:`,
    `  ${minimal.map(describe).join(' / ')}`,
    `detail: ${violation.detail}`,
  ].join('\n');

  return {
    seed: run.seed,
    difficulty: run.difficulty,
    invariant: violation.invariant,
    originalLength: run.actions.length,
    minimalActions: minimal,
    violation,
    text,
  };
}
