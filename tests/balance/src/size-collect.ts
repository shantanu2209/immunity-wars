/**
 * E1 collection — the two passes, and why there are two.
 *
 * | Pass | Generator | Answers |
 * |---|---|---|
 * | **distribution** | reference bot | how big is a state in real play, and how much of it changes |
 * | **envelope** | property-suite runner | which parts of the projection ever carry anything at all |
 *
 * The second pass exists because the reference bot never emits 8 of the engine's 27 actions
 * (`docs/FINDINGS.md` §1.1) — `net`, `resengulf`, `resmove`, `hop`, `recall`, `antivenom`,
 * `orderAntivenom`, `undo`. For SIZE the relevant unit is not actions emitted but **fields
 * populated**: a protocol has to carry the whole projection, including the parts one particular
 * automated player never touches. So the envelope pass reuses
 * `@immunity-wars/property`'s runner rather than reimplementing `injectExtra` here, keeping one
 * generator across the repository.
 *
 * It reuses it through the INVARIANT interface, which is a per-action hook with exactly the right
 * signature and access to the live state. The probe below never reports a violation; it only
 * measures. That is a deliberate reuse of a hook rather than a second driver — the alternative
 * was a parallel copy of the runner, which is the shape `runner.ts`'s own header warns about.
 */

import { DIFF, GRACE_CLEAR } from '@immunity-wars/content';
import type { Engine, GameState } from '@immunity-wars/equivalence/types';
import type { Ctx, Invariant } from '@immunity-wars/property/invariants';
import { runGame } from '@immunity-wars/property/runner';

import { PORT, playGame, type GameRecord } from './play.js';
import { SizeSampler, type TurnWindow } from './size.js';

/** Longest legal game per difficulty, read from the content pack rather than typed in. */
export function turnWindow(difficulty: string): TurnWindow {
  const row = (DIFF as Record<string, { turns: number }>)[difficulty];
  if (!row) throw new Error(`no DIFF entry for ${difficulty}`);
  return {
    maxTurn: row.turns,
    graceClear: GRACE_CLEAR,
    longestLegalGame: row.turns + GRACE_CLEAR,
  };
}

export interface DistributionPass {
  readonly sampler: SizeSampler;
  readonly records: readonly GameRecord[];
}

/**
 * Pass A — the distribution, under the reference bot.
 *
 * Samples after every applied action, and separately records each `endCommand` burst. The state
 * handed to the sampler is LIVE and uncopied: a defensive `JSON.parse(JSON.stringify(g))` on the
 * way in would erase precisely what is being measured.
 */
export function collectDistribution(
  difficulties: readonly string[],
  seeds: number,
  seedAt: (i: number) => number,
  engine: Engine = PORT,
): DistributionPass {
  const sampler = new SizeSampler();
  const records: GameRecord[] = [];

  for (const difficulty of difficulties) {
    for (let i = 0; i < seeds; i += 1) {
      const seed = seedAt(i);
      sampler.startGame();
      records.push(
        playGame({
          seed,
          difficulty,
          engine,
          onStart: (g) => sampler.record(engine, g, seed, difficulty),
          onAction: (g, a, r) => {
            sampler.record(engine, g, seed, difficulty);
            sampler.recordBurst(r, g, seed, difficulty, a);
          },
        }),
      );
    }
  }

  return { sampler, records };
}

/**
 * Pass B — the envelope, under the property suite's generator.
 *
 * Reports nothing and violates nothing. `checked()` is still called on every action, because the
 * property runner's vacuity guard fails a run whose invariant examined zero states — and an
 * envelope pass that silently sampled nothing is exactly the failure that guard exists to catch.
 */
function sizeProbe(sampler: SizeSampler, seed: number, difficulty: string): Invariant {
  return {
    id: 'size-probe',
    title: 'E1 envelope sampler — measures, never violates',
    after: (ctx: Ctx, g: GameState, _a, _r, _pre, report): void => {
      sampler.record(ctx.engine as unknown as Engine, g, seed, difficulty);
      report.checked();
    },
  };
}

export function collectEnvelope(
  difficulties: readonly string[],
  seeds: number,
  seedAt: (i: number) => number,
): SizeSampler {
  const sampler = new SizeSampler();
  for (const difficulty of difficulties) {
    for (let i = 0; i < seeds; i += 1) {
      const seed = seedAt(i);
      sampler.startGame();
      const run = runGame({
        seed,
        difficulty,
        // The bot's own turn guard, so the envelope pass plays whole games rather than the
        // property suite's deliberately short ones.
        maxTurns: 200,
        invariants: [sizeProbe(sampler, seed, difficulty)],
      });
      if ((run.checks['size-probe'] ?? 0) === 0) {
        throw new Error(`envelope pass sampled 0 states for seed ${seed} ${difficulty}`);
      }
    }
  }
  return sampler;
}
