/**
 * KARTIK'S RULE CHANGES, EACH SHOWN BOTH WAYS (the engine change queue, `docs/ENGINE_CHANGE_QUEUE.md`;
 * the method ruled on 30 September 2026).
 *
 * Every ruled change is made twice, independently: in the port, and as an edit to the original engine
 * applied in memory (`ruled.ts`). The corpus holds the two together over every recorded game. What the
 * corpus cannot show is that the change is REAL, since two engines that both ignored it would agree
 * as well. So each rule here is run three ways on the same seed and the same moves:
 *
 * - **the port** and **the original as ruled** must both follow the new rule, and agree;
 * - **the original, untouched,** must follow the OLD rule, which is the control: it shows the test
 *   looks at the place the rule changed, and that the change is the queue's.
 */
import { describe, expect, it } from 'vitest';

import * as port from '@immunity-wars/engine';

import { loadLegacy, loadOriginalLegacy } from './engine.js';
import { installRng, restoreRng } from './rng.js';
import type { Engine, GameState } from './types.js';

type Raw = Record<string, unknown>;
type Game = GameState & Raw;

const ENGINES: readonly [string, Engine][] = [
  ['the port', port as unknown as Engine],
  ['the original as ruled', loadLegacy()],
];
const ORIGINAL = loadOriginalLegacy();

/** One seed, one setup, one list of moves, in one engine; the game after, and every answer. */
function run(
  E: Engine,
  seed: number,
  difficulty: string,
  setup: (E: Engine, g: Game) => void,
  moves: (g: Game) => Raw[],
): { g: Game; results: Raw[] } {
  installRng(seed);
  try {
    const g = E.newGame({ difficulty }) as Game;
    setup(E, g);
    const results = moves(g).map((a) => E.applyAction(g, a as never) as unknown as Raw);
    return { g, results };
  } finally {
    restoreRng();
  }
}

const SEEDS = [1, 2, 3, 4, 5];

describe('Q4 (Kartik, FINDINGS #55): an antivenom kill teaches the body no memory', () => {
  const VENOM = "Russell's viper venom";
  const setup = (E: Engine, g: Game): void => {
    E.forceInjectCard(g, VENOM);
    g['phase'] = 'command';
    g['ap'] = 5;
  };
  const moves = (g: Game): Raw[] => {
    const iv = (g['invaders'] as { id: string; disease: string }[]).find(
      (x) => x.disease === VENOM,
    );
    return [{ action: 'antivenom', invaderId: iv?.id }];
  };
  const remembered = (g: Game): boolean =>
    (g['memory'] as Record<string, unknown> | undefined)?.[VENOM] === true;
  const gone = (g: Game): boolean =>
    !(g['invaders'] as { disease: string }[]).some((x) => x.disease === VENOM);

  it('the venom dies and no memory of it is left, in the port and the original as ruled', () => {
    for (const seed of SEEDS)
      for (const [name, E] of ENGINES) {
        const { g, results } = run(E, seed, 'training', setup, moves);
        expect(results[0], `${name}, seed ${String(seed)}`).toEqual({ ok: true });
        expect(gone(g), name).toBe(true);
        expect(remembered(g), name).toBe(false);
      }
  });

  it('CONTROL: the original, untouched, remembered it', () => {
    for (const seed of SEEDS) {
      const { g } = run(ORIGINAL, seed, 'training', setup, moves);
      expect(gone(g)).toBe(true);
      expect(remembered(g), `seed ${String(seed)}`).toBe(true);
    }
  });
});
