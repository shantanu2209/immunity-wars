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

describe('Q9 (FINDINGS #57): degranulate burns the organ only when the fight is in it', () => {
  const WORM = 'Hookworm';
  /** A coated worm and the Eosinophil together on the worm's branch, at `step`. */
  const at =
    (step: number) =>
    (E: Engine, g: Game): void => {
      const iv = E.forceInjectCard(g, WORM) as unknown as Raw;
      Object.assign(iv, { zone: 'branch', step, tagged: true, lodged: step === 0 });
      const e = (g['cells'] as unknown as Record<string, Raw>)['eosinophil'] as Raw;
      Object.assign(e, { alive: true, zone: 'branch', organ: iv['organ'], lane: null, step });
      g['phase'] = 'command';
      g['ap'] = 5;
    };
  const moves = (g: Game): Raw[] => {
    const iv = (g['invaders'] as { id: string; disease: string }[]).find((x) => x.disease === WORM);
    return [{ action: 'degranulate', cell: 'eosinophil', invaderId: iv?.id }];
  };
  /** The worm's organ's integrity, before and after the strike. */
  const burn = (E: Engine, seed: number, step: number): { before: number; after: number } => {
    let organ = '';
    let before = 0;
    const { g, results } = run(
      E,
      seed,
      'normal',
      (E2, g2) => {
        at(step)(E2, g2);
        const iv = (g2['invaders'] as unknown as Raw[]).find((x) => x['disease'] === WORM) as Raw;
        organ = String(iv['organ']);
        before = Number((g2['organs'] as unknown as Record<string, Raw>)[organ]?.['hp']);
      },
      moves,
    );
    expect(results[0], `the strike was refused: ${JSON.stringify(results[0])}`).toEqual({
      ok: true,
    });
    return {
      before,
      after: Number((g['organs'] as unknown as Record<string, Raw>)[organ]?.['hp']),
    };
  };

  it('a fight on the branch, at step 1, leaves the organ whole, in the port and the original as ruled', () => {
    for (const seed of SEEDS)
      for (const [name, E] of ENGINES) {
        const { before, after } = burn(E, seed, 1);
        expect(after, `${name}, seed ${String(seed)}`).toBe(before);
      }
  });

  it('a fight in the organ, at step 0, still burns it, in all three', () => {
    for (const seed of SEEDS)
      for (const [name, E] of [...ENGINES, ['the original, untouched', ORIGINAL] as const]) {
        const { before, after } = burn(E, seed, 0);
        expect(after, `${name}, seed ${String(seed)}`).toBe(before - 1);
      }
  });

  it('CONTROL: the original, untouched, burned the organ from step 1', () => {
    for (const seed of SEEDS) {
      const { before, after } = burn(ORIGINAL, seed, 1);
      expect(after, `seed ${String(seed)}`).toBe(before - 1);
    }
  });
});

describe('Q1 (Kartik, FINDINGS #4): antibodies may attempt a trypanosome, so its coat can change', () => {
  const DZ = 'Sleeping sickness';
  const setup = (E: Engine, g: Game): void => {
    const iv = E.forceInjectCard(g, DZ) as unknown as Raw;
    Object.assign(iv, { zone: 'hub', step: 0, lane: null, organ: null });
    (g['ab'] as Record<string, number>)['EUK'] = 5;
    g['phase'] = 'command';
    g['ap'] = 5;
  };
  const target = (g: Game): Raw | undefined =>
    (g['invaders'] as unknown as Raw[]).find((x) => x['disease'] === DZ);
  const moves = (g: Game): Raw[] => [{ action: 'neutralise', invaderId: target(g)?.['id'] }];
  const offered = (E: Engine, g: Game): boolean =>
    (E as unknown as { canNeutralise: (g: Game, iv: Raw) => boolean }).canNeutralise(
      g,
      target(g) as Raw,
    );

  it('is offered and accepted in the port and the original as ruled, which agree on every seed', () => {
    let changed = 0;
    let cleared = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const games: Game[] = [];
      for (const [name, E] of ENGINES) {
        const { g, results } = run(
          E,
          seed,
          'normal',
          (E2, g2) => {
            setup(E2, g2);
            expect(offered(E2, g2), `${name} did not offer it`).toBe(true);
          },
          moves,
        );
        expect(results[0], `${name}, seed ${String(seed)}`).toEqual({ ok: true });
        games.push(g);
      }
      const [p, l] = games as [Game, Game];
      expect(JSON.stringify(target(p) ?? null)).toBe(JSON.stringify(target(l) ?? null));
      expect((p['ab'] as Record<string, number>)['EUK']).toBe(4);
      if (target(p)) changed += 1;
      else cleared += 1;
    }
    // Both halves of the roll were seen, so the coat change is real play now, not a dead branch.
    expect(changed, 'the coat never changed').toBeGreaterThan(0);
    expect(cleared, 'the antibodies never cleared it').toBeGreaterThan(0);
  });

  it('CONTROL: the original, untouched, neither offered it nor accepted it', () => {
    for (const seed of SEEDS) {
      const { results } = run(
        ORIGINAL,
        seed,
        'normal',
        (E2, g2) => {
          setup(E2, g2);
          expect(offered(E2, g2)).toBe(false);
        },
        moves,
      );
      expect(results[0]).toEqual({ ok: false, error: 'Antibodies cannot neutralise that.' });
    }
  });
});

describe("Q6 (Kartik, FINDINGS #5): a resident's Recall, back to its organ box in one move", () => {
  const ORGAN = 'liver';
  const resident = (g: Game): Raw =>
    (g['residents'] as unknown as Record<string, Raw>)[ORGAN] as Raw;
  const standing =
    (step: number, infected = false) =>
    (_E: Engine, g: Game): void => {
      Object.assign(resident(g), { step, infectedBy: infected ? 'i99' : null });
      g['phase'] = 'command';
      g['ap'] = 5;
    };
  const recall: Raw = { action: 'resrecall', organ: ORGAN };

  it('returns it for one point, logs it, and undo takes it back, in the port and the original as ruled', () => {
    for (const seed of SEEDS) {
      const logs: string[] = [];
      for (const [name, E] of ENGINES) {
        const { g, results } = run(E, seed, 'normal', standing(2), () => [recall]);
        expect(results[0], `${name}, seed ${String(seed)}`).toEqual({ ok: true });
        expect(resident(g)['step'], name).toBe(0);
        expect(g['ap'], name).toBe(4);
        const log = g['log'] as { msg: string }[];
        logs.push(log[0]?.msg ?? '');
        // A move, so undoable: the resident goes back out and the point comes back.
        expect(E.applyAction(g, { action: 'undo' } as never), name).toMatchObject({ ok: true });
        expect(resident(g)['step'], `${name} after undo`).toBe(2);
        expect(g['ap'], `${name} after undo`).toBe(5);
      }
      expect(logs[0]).toMatch(/returned to the /);
      expect(logs[1]).toBe(logs[0]);
    }
  });

  it('is refused where it cannot be done, alike in both, and changes nothing', () => {
    const immobile = (E: Engine, g: Game): void => {
      standing(2)(E, g);
      (g['flags'] as Raw)['residentMove'] = false;
    };
    for (const [setup, move, error] of [
      [standing(0), recall, 'The resident is already in its organ.'],
      [
        standing(2, true),
        recall,
        'This resident has a parasite living inside it, so it cannot move until you kill the parasite.',
      ],
      [immobile, recall, 'Residents cannot move.'],
      [standing(2), { action: 'resrecall', organ: 'nope' }, 'No such organ.'],
    ] as const)
      for (const [name, E] of ENGINES) {
        const { g, results } = run(E, 1, 'normal', setup, () => [move]);
        expect(results[0], `${name}: ${error}`).toEqual({ ok: false, error });
        expect(g['ap'], `${name}: ${error}`).toBe(5);
      }
  });

  it('CONTROL: the original, untouched, has no such action', () => {
    const { g, results } = run(ORIGINAL, 1, 'normal', standing(2), () => [recall]);
    expect((results[0] as { ok: boolean }).ok).toBe(false);
    expect(resident(g)['step']).toBe(2);
  });
});
