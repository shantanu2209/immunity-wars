/**
 * E0a — the bot-fidelity comparator.
 *
 * ONE implementation, used by both tiers: `src/fidelity.test.ts` (small, inside `pnpm test`) and
 * `../fidelity.ts` (the deep run). The property suite's runner header states the reason and it
 * holds here unchanged — a check that exercises a parallel copy of the thing under test proves
 * the copy works.
 *
 * WHAT IS BEING COMPARED, and why it matters to every number Task E publishes:
 *
 * Task E's metrics come from `play.ts`, which drives the engine with
 * `@immunity-wars/equivalence/bot`. `docs/FINDINGS.md`'s existing measurements come from
 * `simulate()`'s inlined bot. The two are *believed* to be the same decision procedure, and they
 * differ textually in at least one place — the NET check reads `netTargets` in one and
 * `invadersWith(neutrophil)` in the other. FINDINGS §1.2 argues that difference is unobservable.
 * An argument is not a measurement, and unverified agreement is how this project has acquired
 * nine documented-but-false claims.
 */

import { drawCount, installRng, restoreRng } from '@immunity-wars/equivalence/rng';

import { PORT, playGame, seedAt, type GameRecord } from './play.js';
import type { Engine } from '@immunity-wars/equivalence/types';

/**
 * The comparable slice of one game.
 *
 * Everything `simulate()` is capable of reporting, plus the RNG draw count — which is the sharp
 * one. Two decision procedures that ever choose differently will almost always roll a different
 * number of dice, and a game consumes thousands of draws, so an exact match across all of them
 * is a much tighter constraint than the six outcome fields on their own.
 */
export interface Outcome {
  readonly won: boolean;
  readonly lossTurn: number | null;
  readonly failOrgan: string | null;
  readonly organHits: number;
  readonly trunkKillPct: number;
  readonly cascade: boolean;
  readonly rngDraws: number;
}

export const FIELDS = [
  'won',
  'lossTurn',
  'failOrgan',
  'organHits',
  'trunkKillPct',
  'cascade',
  'rngDraws',
] as const;

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

export function outcomeOfRecord(r: GameRecord): Outcome {
  const kills = r.killedTrunk + r.killedBranch;
  return {
    won: r.won,
    lossTurn: r.lossTurn,
    failOrgan: r.lossOrgan,
    organHits: r.organHits,
    trunkKillPct: round6(kills ? r.killedTrunk / kills : 0),
    cascade: r.lost && r.organsDamaged >= 2,
    rngDraws: r.rngDraws,
  };
}

/** Play one game with the harness bot. */
export function harnessOutcome(difficulty: string, seed: number, engine: Engine = PORT): Outcome {
  return outcomeOfRecord(playGame({ seed, difficulty, engine }));
}

/**
 * Run `simulate()` for exactly one game under the same seed.
 *
 * N=1 turns every aggregate into a per-game figure: `winRate` is 0 or 1, `avgLossTurn` is that
 * game's loss turn, `cascadePct` is 0 or 1, and `failOrgans` carries at most one key.
 */
export function simulateOutcome(difficulty: string, seed: number, engine: Engine = PORT): Outcome {
  installRng(seed);
  try {
    const res = engine.simulate(difficulty, 1);
    const draws = drawCount();
    const failed = Object.keys((res['failOrgans'] ?? {}) as Record<string, number>);
    const lossTurn = res['avgLossTurn'];
    const first = failed[0];
    return {
      won: res['winRate'] === 1,
      lossTurn: typeof lossTurn === 'number' ? lossTurn : null,
      // simulate() stringifies the organ key, so an attrition loss (organ null) arrives as "null".
      failOrgan: first === undefined || first === 'null' ? null : first,
      organHits: res['avgOrganHits'] as number,
      trunkKillPct: round6(res['trunkKillPct'] as number),
      cascade: res['cascadePct'] === 1,
      rngDraws: draws,
    };
  } finally {
    restoreRng();
  }
}

export function differences(a: Outcome, b: Outcome): string[] {
  const out: string[] = [];
  for (const f of FIELDS) {
    if (a[f] !== b[f]) {
      out.push(`${f}: harness=${JSON.stringify(a[f])} simulate=${JSON.stringify(b[f])}`);
    }
  }
  return out;
}

/**
 * Re-exported so this suite has ONE seed schedule.
 *
 * It changed at E2 from an arithmetic step to splitmix32 — see `play.ts` and docs/FINDINGS.md #33.
 * This check is unaffected in substance: it is a PAIRED comparison, both arms on identical seeds,
 * so seed correlation cancels. The 3,000-game result was re-run on the new schedule and is
 * unchanged.
 */
export { seedAt };

export interface FidelityResult {
  readonly compared: number;
  readonly mismatched: number;
  readonly perDifficulty: Readonly<Record<string, { identical: number; total: number }>>;
  readonly perField: Readonly<Record<string, number>>;
  readonly examples: readonly string[];
}

export function compareFidelity(
  difficulties: readonly string[],
  seeds: number,
  engine: Engine = PORT,
): FidelityResult {
  let compared = 0;
  let mismatched = 0;
  const perDifficulty: Record<string, { identical: number; total: number }> = {};
  const perField: Record<string, number> = {};
  const examples: string[] = [];

  for (const difficulty of difficulties) {
    let identical = 0;
    for (let i = 0; i < seeds; i += 1) {
      const seed = seedAt(i);
      const found = differences(
        harnessOutcome(difficulty, seed, engine),
        simulateOutcome(difficulty, seed, engine),
      );
      compared += 1;
      if (found.length === 0) {
        identical += 1;
      } else {
        mismatched += 1;
        for (const f of found) {
          const key = f.split(':')[0] ?? '?';
          perField[key] = (perField[key] ?? 0) + 1;
        }
        if (examples.length < 5) {
          examples.push(`seed=${seed} ${difficulty}\n    ${found.join('\n    ')}`);
        }
      }
    }
    perDifficulty[difficulty] = { identical, total: seeds };
  }

  return { compared, mismatched, perDifficulty, perField, examples };
}

/**
 * The comparator's own negative control.
 *
 * A comparator that compares nothing also reports zero mismatches, and a clean fidelity run
 * would then prove nothing at all — `docs/FINDINGS.md` #24's shape exactly, an instrument wrong
 * in the region its output never reaches. Pair deliberately MISMATCHED seeds and require it to
 * notice. Returns the differences it found; an empty list means the comparator is broken.
 */
export function comparatorControl(): string[] {
  return differences(harnessOutcome('normal', seedAt(0)), simulateOutcome('normal', seedAt(1)));
}
