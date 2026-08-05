/**
 * B3 CHECKPOINT — state construction.
 *
 * The strongest single assertion in the port so far: for thousands of seeds, `newGame` must
 * produce a byte-identical state AND have consumed an identical number of Math.random draws.
 *
 * The draw count is not a nicety. newGame's object literal evaluates
 * `rare: { armed: Math.random() < 0.5 }` BEFORE `deck: shuffle(...)`, so declaring the fields
 * in the more natural order would shift every subsequent die roll in the game while leaving
 * turn-1 state looking perfectly correct. Only the draw count catches that, and it catches it
 * immediately rather than twenty turns later.
 */

import { describe, expect, it } from 'vitest';

import * as port from '@immunity-wars/engine';
import * as internal from '@immunity-wars/engine/internal';

import { loadLegacy } from './engine.js';
import { canonical } from './hash.js';
import { augment, harvest } from './states.js';
import { drawCount, installRng, restoreRng } from './rng.js';
import type { GameState } from './types.js';

const legacy = loadLegacy();
const DIFFICULTIES = ['training', 'normal', 'hard'] as const;

interface Built {
  state: unknown;
  draws: number;
}

function build(
  make: (cfg: Record<string, unknown>) => unknown,
  seed: number,
  cfg: Record<string, unknown>,
): Built {
  installRng(seed);
  try {
    const state = make(cfg);
    return { state, draws: drawCount() };
  } finally {
    restoreRng();
  }
}

describe('B3: newGame is byte-identical and consumes identical randomness', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`${difficulty} — 1,500 seeds, state and draw count`, () => {
      for (let i = 0; i < 1500; i += 1) {
        const cfg = { difficulty, science: false };
        const a = build((c) => legacy.newGame(c), 200000 + i, cfg);
        const b = build((c) => port.newGame(c), 200000 + i, cfg);

        if (a.draws !== b.draws) {
          throw new Error(
            `newGame draw count diverged on seed ${200000 + i} (${difficulty}): ` +
              `legacy=${a.draws} port=${b.draws}. The port consumed randomness out of step — ` +
              `check field order in the state literal (rare before deck).`,
          );
        }
        const ca = canonical(a.state);
        const cb = canonical(b.state);
        if (ca !== cb) {
          // Find the first differing character to make the failure readable.
          let k = 0;
          while (k < ca.length && k < cb.length && ca[k] === cb[k]) k += 1;
          throw new Error(
            `newGame state diverged on seed ${200000 + i} (${difficulty}) at offset ${k}:\n` +
              `  legacy …${ca.slice(Math.max(0, k - 60), k + 90)}\n` +
              `  port   …${cb.slice(Math.max(0, k - 60), k + 90)}`,
          );
        }
      }
    });
  }

  it('honours cfg: multiplayer seats, flags overrides, and science', () => {
    const cfgs: Record<string, unknown>[] = [
      {
        difficulty: 'normal',
        multiplayer: true,
        captain: 'P1',
        players: ['P1', 'P2'],
        owner: { bcell: 'P2' },
      },
      { difficulty: 'hard', flags: { crisisEvents: false } },
      { difficulty: 'hard', flags: { tierB: false } },
      { difficulty: 'training', flags: { lymph: false, specials: false } },
      { difficulty: 'normal', science: true },
      { difficulty: 'not-a-difficulty' }, // falls back to normal
      {},
    ];
    for (const cfg of cfgs) {
      for (let i = 0; i < 40; i += 1) {
        const a = build((c) => legacy.newGame(c), 310000 + i, cfg);
        const b = build((c) => port.newGame(c), 310000 + i, cfg);
        expect(b.draws, `draws for ${JSON.stringify(cfg)} seed ${310000 + i}`).toBe(a.draws);
        expect(canonical(b.state), `state for ${JSON.stringify(cfg)}`).toBe(canonical(a.state));
      }
    }
  });

  it('the deck really is shuffled — the corpus is not passing on a fixed order', () => {
    const orders = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      const g = build((c) => port.newGame(c), 400000 + i, { difficulty: 'normal' })
        .state as unknown as { deck: { dz: string }[] };
      orders.add(g.deck.map((c) => c.dz).join('|'));
    }
    expect(orders.size).toBe(20);
  });
});

describe('B3: makeInvader', () => {
  it('matches legacy for every card, at every difficulty, field order included', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const card of legacy.DECK_MASTER) {
        for (let i = 0; i < 6; i += 1) {
          const seed = 500000 + i;

          installRng(seed);
          const gl = legacy.newGame({ difficulty, science: false });
          const drawsBeforeL = drawCount();
          const ivl = legacy.makeInvader(gl, card);
          const drawsL = drawCount() - drawsBeforeL;
          restoreRng();

          installRng(seed);
          const gp = port.newGame({ difficulty, science: false });
          const drawsBeforeP = drawCount();
          const ivp = port.makeInvader(gp as never, card as never);
          const drawsP = drawCount() - drawsBeforeP;
          restoreRng();

          expect(drawsP, `${card.dz} on ${difficulty}: rollOrgan draw count`).toBe(drawsL);
          expect(canonical(ivp), `${card.dz} on ${difficulty}`).toBe(canonical(ivl));
        }
      }
    }
  });

  it('places worms on a branch and non-worms on a route, as the invariant depends on', () => {
    // The mechanism behind worm safeguard #3 — see src/invariants.test.ts.
    const g = port.newGame({ difficulty: 'hard', science: false });
    for (const card of port.DECK_MASTER) {
      const iv = port.makeInvader(g as never, card);
      expect(iv.zone, card.dz).toBe(card.type === 'worm' ? 'branch' : 'route');
    }
  });
});

describe('B3: respectWormCap and the Force tool', () => {
  it('swaps a capped worm for a non-worm, identically to legacy', () => {
    for (let i = 0; i < 300; i += 1) {
      const seed = 520000 + i;
      const worm = { dz: 'Hookworm', type: 'worm', lane: 'wound' };

      installRng(seed);
      const gl = legacy.newGame({ difficulty: 'hard', science: false });
      (gl as unknown as { wormsSpawned: number }).wormsSpawned = 2;
      const cl = legacy.respectWormCap(gl, worm);
      const stateL = canonical(gl);
      restoreRng();

      installRng(seed);
      const gp = port.newGame({ difficulty: 'hard', science: false });
      (gp as unknown as { wormsSpawned: number }).wormsSpawned = 2;
      const cp = port.respectWormCap(gp as never, worm as never);
      const stateP = canonical(gp);
      restoreRng();

      expect(canonical(cp), `card returned, seed ${seed}`).toBe(canonical(cl));
      expect(stateP, `deck/discard state, seed ${seed}`).toBe(stateL);
    }
  });

  it('returns null when no non-worm card exists anywhere, rather than breaking the cap', () => {
    const g = port.newGame({ difficulty: 'hard', science: false }) as unknown as {
      wormsSpawned: number;
      deck: unknown[];
      discard: unknown[];
    };
    g.wormsSpawned = 2;
    g.deck = [{ dz: 'Hookworm', type: 'worm', lane: 'wound' }];
    g.discard = [];
    expect(
      port.respectWormCap(g as never, { dz: 'Tapeworm', type: 'worm', lane: 'gut' } as never),
    ).toBeNull();
  });

  it('forceInjectCard injects past the cap AND leaves wormsSpawned untouched', () => {
    // Both halves are legacy behaviour. The bypass is intended; the accounting gap is not, and
    // is reproduced deliberately — docs/FINDINGS.md #16.
    for (const seed of [1, 2, 3]) {
      installRng(seed);
      const gl = legacy.newGame({ difficulty: 'hard', science: false });
      (gl as unknown as { wormsSpawned: number }).wormsSpawned = 2;
      legacy.forceInjectCard(gl, 'Hookworm');
      const l = canonical(gl);
      restoreRng();

      installRng(seed);
      const gp = port.newGame({ difficulty: 'hard', science: false });
      (gp as unknown as { wormsSpawned: number }).wormsSpawned = 2;
      port.forceInjectCard(gp as never, 'Hookworm');
      const p = canonical(gp);
      restoreRng();

      expect(p).toBe(l);
      expect((gp as unknown as { wormsSpawned: number }).wormsSpawned).toBe(2);
    }
  });

  it('forceInjectType matches legacy for every invader type', () => {
    const types = [
      'virus',
      'hidden',
      'bacteria',
      'toxin',
      'venom',
      'fungus',
      'worm',
      'malaria',
      'parasite',
    ];
    for (const type of types) {
      installRng(77);
      const gl = legacy.newGame({ difficulty: 'normal', science: false });
      legacy.forceInjectType(gl, type);
      const l = canonical(gl);
      restoreRng();

      installRng(77);
      const gp = port.newGame({ difficulty: 'normal', science: false });
      port.forceInjectType(gp as never, type);
      const p = canonical(gp);
      restoreRng();

      expect(p, type).toBe(l);
    }
  });
});

describe('B3: applyEvent — all nine crisis events', () => {
  const EVENT_KEYS = [
    'immunosuppression',
    'neutropenia',
    'lymphopenia',
    'antibodyShortage',
    'fatigue',
    'coInfection',
    'surge',
    'passiveAntibodies',
    'fever',
  ];

  for (const key of EVENT_KEYS) {
    it(`${key} produces an identical state`, () => {
      for (let i = 0; i < 60; i += 1) {
        const seed = 540000 + i;
        const difficulty = DIFFICULTIES[i % 3];

        installRng(seed);
        const gl = legacy.newGame({ difficulty, science: false });
        const beforeL = drawCount();
        legacy.applyEvent(gl, key);
        const drawsL = drawCount() - beforeL;
        const l = canonical(gl);
        restoreRng();

        installRng(seed);
        const gp = port.newGame({ difficulty, science: false });
        const beforeP = drawCount();
        port.applyEvent(gp as never, key);
        const drawsP = drawCount() - beforeP;
        const p = canonical(gp);
        restoreRng();

        expect(drawsP, `${key} draw count, seed ${seed}`).toBe(drawsL);
        expect(p, `${key} state, seed ${seed}`).toBe(l);
      }
    });
  }
});

describe('B3: viewState', () => {
  const STATES = (() => {
    const h = harvest(legacy, 12);
    return [...h, ...augment(h.filter((_, i) => i % 30 === 0))];
  })();

  it('projects identically across the whole B2 state corpus, field order included', () => {
    for (let i = 0; i < STATES.length; i += 1) {
      const s = STATES[i];
      if (!s) continue;
      const a = legacy.viewState(JSON.parse(JSON.stringify(s)) as GameState);
      const b = port.viewState(JSON.parse(JSON.stringify(s)) as never);
      if (canonical(a) !== canonical(b)) {
        throw new Error(`viewState diverged on state #${i} (turn ${s.turn}, ${s.difficulty})`);
      }
    }
  });

  it('does NOT expose stats — which is why the NaN counters are invisible in play', () => {
    // docs/FINDINGS.md #3. If stats ever appears here, that finding's blast radius changes.
    const g = port.newGame({ difficulty: 'hard', science: false });
    expect(Object.keys(port.viewState(g as never))).not.toContain('stats');
  });

  it('reports a serialised size in the range Task E has to act on', () => {
    // The other half of Task E's brief: this number decides whether the relay can broadcast
    // full state or must send deltas. Recorded here so a regression in state size is visible
    // long before Task E runs.
    const h = harvest(legacy, 3);
    const mid = h[Math.floor(h.length * 0.7)];
    expect(mid).toBeDefined();
    if (!mid) return;
    const bytes = JSON.stringify(port.viewState(mid as never)).length;
    expect(bytes).toBeGreaterThan(1000);
    expect(bytes).toBeLessThan(200000);
  });
});

describe('B3: pushUndo and undo', () => {
  it('round-trips the undoable slice identically to legacy', () => {
    const h = harvest(legacy, 8);
    for (let i = 0; i < h.length; i += 20) {
      const s = h[i];
      if (!s) continue;

      const gl = JSON.parse(JSON.stringify(s)) as GameState;
      legacy.pushUndo(gl);
      gl.invaders = [];
      gl.ap = 99;
      legacy.undo(gl);

      const gp = JSON.parse(JSON.stringify(s)) as GameState;
      port.pushUndo(gp as never);
      gp.invaders = [];
      gp.ap = 99;
      port.undo(gp as never);

      expect(canonical(gp), `state #${i}`).toBe(canonical(gl));
    }
  });

  it('refuses to undo an empty stack, with the same message', () => {
    const gp = port.newGame({ difficulty: 'normal', science: false });
    const gl = legacy.newGame({ difficulty: 'normal', science: false });
    expect(canonical(port.undo(gp as never))).toBe(canonical(legacy.undo(gl)));
  });

  it('caps the stack at 60 entries', () => {
    const g = port.newGame({ difficulty: 'normal', science: false });
    for (let i = 0; i < 70; i += 1) port.pushUndo(g as never);
    expect((g as unknown as { undo: unknown[] }).undo.length).toBe(60);
  });
});

describe('B3: pushLog', () => {
  // scheduleEvents needs no test of its own: legacy does not export it, and newGame with
  // crisisEvents ON already proves it — the events map is part of the byte-identical state and
  // its shuffles are inside the compared draw count.
  it('prepends and caps at 60', () => {
    const g = port.newGame({ difficulty: 'normal', science: false }) as unknown as {
      log: { msg: string }[];
    };
    for (let i = 0; i < 70; i += 1) internal.pushLog(g as never, `entry ${i}`, 'bad');
    expect(g.log.length).toBe(60);
    expect(g.log[0]?.msg).toBe('entry 69');
  });
});
