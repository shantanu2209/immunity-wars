/**
 * B5 CHECKPOINT — resolveSpread, via complete games.
 *
 * Everything before this compared fragments: a query, a constructed state, a single action. This
 * is the first checkpoint where whole games run end to end, so it is the first time the phases
 * interact — bacteria dividing into a march, a worm lodging before organ damage, a rare event
 * firing off a kill that happened three phases earlier.
 *
 * Uses the B0 rig directly (record against legacy, replay into the port, compare state + draw
 * count + result after every action) rather than a bespoke comparison, because the rig already
 * has the shrinker attached.
 */

import { describe, expect, it } from 'vitest';

import * as port from '@immunity-wars/engine';

import { batch } from './corpus.js';
import { loadLegacy } from './engine.js';
import { canonical } from './hash.js';
import { checkGame, record, type EngineFactory } from './rig.js';
import { installRng, restoreRng } from './rng.js';
import { shrink } from './shrink.js';
import type { Engine, GameState } from './types.js';

const legacyFactory: EngineFactory = () => loadLegacy();
const portFactory: EngineFactory = () => port as unknown as Engine;
const legacy = loadLegacy();

/** Report a divergence as a shrunk minimal repro rather than a bare index. */
function requireIdentical(label: string, seeds: number, maxTurns: number): void {
  const cases = batch('bot-per-push').slice(0, seeds * 3);
  for (const c of cases) {
    const divergence = checkGame(legacyFactory, portFactory, c.seed, c.difficulty, maxTurns);
    if (divergence) {
      const report = shrink(legacyFactory, portFactory, divergence, 300);
      throw new Error(`B5 ${label} diverged.\n\n${report.text}`);
    }
  }
}

describe('B5 — complete games are identical', () => {
  it('600 recorded bot games (200 seeds x 3 difficulties), full length', () => {
    requireIdentical('bot games', 200, 200);
  }, 600_000);

  it('the games actually run deep, so this is not passing on turn-1 states', () => {
    let maxTurn = 0;
    let totalActions = 0;
    let ended = 0;
    for (const c of batch('bot-per-push').slice(0, 60)) {
      const t = record(legacyFactory, c.seed, c.difficulty, 200);
      maxTurn = Math.max(maxTurn, t.finished.turn);
      totalActions += t.actions.length;
      if (t.finished.won || t.finished.lost) ended += 1;
    }
    expect(maxTurn).toBeGreaterThan(10);
    expect(totalActions).toBeGreaterThan(3000);
    expect(ended).toBeGreaterThan(50); // games are reaching a real conclusion, not a guard limit
  }, 120_000);
});

/* ------------------------------------------------------------------ *
 * scripted scenarios
 * ------------------------------------------------------------------ */

/**
 * A scenario sets up a specific board, then plays a fixed number of turns through BOTH engines
 * and compares. Set-up happens identically on each side because both start from the same seed
 * and receive the same mutation function.
 */
function scenario(
  name: string,
  setup: (E: Engine, g: GameState) => void,
  opts: {
    difficulty?: string;
    turns?: number;
    seeds?: number;
    flags?: Record<string, boolean>;
  } = {},
): void {
  const difficulty = opts.difficulty ?? 'normal';
  const turns = opts.turns ?? 8;
  const seeds = opts.seeds ?? 12;

  it(
    name,
    () => {
      for (let i = 0; i < seeds; i += 1) {
        const seed = 950000 + i;
        const cfg = { difficulty, science: false, ...(opts.flags ? { flags: opts.flags } : {}) };

        const run = (E: Engine): { states: string[]; results: string[] } => {
          installRng(seed);
          try {
            const g = E.newGame(cfg) as GameState;
            setup(E, g);
            const states: string[] = [];
            const results: string[] = [];
            for (let t = 0; t < turns; t += 1) {
              for (const a of [
                { action: 'draw' },
                { action: 'beginCommand' },
                { action: 'endCommand' },
              ]) {
                const r = E.applyAction(g, a);
                results.push(canonical(r));
                states.push(canonical(g));
                if (g.won || g.lost) break;
              }
              if (g.won || g.lost) break;
            }
            return { states, results };
          } finally {
            restoreRng();
          }
        };

        const a = run(legacy);
        const b = run(port as unknown as Engine);
        expect(b.states.length, `${name}: step count, seed ${seed}`).toBe(a.states.length);
        for (let k = 0; k < a.states.length; k += 1) {
          expect(b.results[k], `${name}: result at step ${k}, seed ${seed}`).toBe(a.results[k]);
          expect(b.states[k], `${name}: state at step ${k}, seed ${seed}`).toBe(a.states[k]);
        }
      }
    },
    120_000,
  );
}

const mk = (E: Engine, g: GameState, over: Record<string, unknown>): unknown => {
  const base = {
    id: `s${String(over.id ?? Math.abs(g.turn))}`,
    tagged: false,
    hp: 1,
    maxhp: 1,
    zone: 'hub',
    step: 0,
    lane: null,
    organ: null,
    stage: null,
    age: 0,
    embed: 0,
  };
  return { ...base, ...over };
};

describe('B5 scenarios — pathogen lifecycles', () => {
  scenario(
    'malaria: sporozoite -> liver embed -> burst into three blood-stage',
    (E, g) => {
      g.invaders = [
        mk(E, g, {
          id: 'm1',
          type: 'malaria',
          disease: 'Malaria',
          stage: 'liver',
          zone: 'branch',
          organ: 'liver',
          step: 0,
          embed: 3,
        }),
      ] as never;
    },
    { turns: 8 },
  );

  scenario('malaria reaching a non-liver organ becomes blood stage instead', (E, g) => {
    g.invaders = [
      mk(E, g, {
        id: 'm2',
        type: 'malaria',
        disease: 'Malaria',
        stage: 'sporozoite',
        zone: 'branch',
        organ: 'spleen',
        step: 1,
      }),
    ] as never;
  });

  scenario('kala-azar moves inside a resident macrophage', (E, g) => {
    g.invaders = [
      mk(E, g, {
        id: 'k1',
        type: 'parasite',
        disease: 'Kala-azar',
        hidesInMac: true,
        zone: 'branch',
        organ: 'spleen',
        step: 1,
        hp: 2,
        maxhp: 2,
      }),
    ] as never;
  });

  scenario(
    'a worm lodges and then chews its organ on the chronic clock',
    (E, g) => {
      g.invaders = [
        mk(E, g, {
          id: 'w1',
          type: 'worm',
          disease: 'Tapeworm',
          zone: 'branch',
          organ: 'brain',
          step: 1,
          hp: 3,
          maxhp: 3,
        }),
      ] as never;
    },
    { turns: 12 },
  );

  scenario(
    'a toxin-maker left untagged emits its toxin after the countdown',
    (E, g) => {
      g.invaders = [
        mk(E, g, {
          id: 't1',
          type: 'bacteria',
          disease: 'Tetanus',
          zone: 'route',
          lane: 'wound',
          step: 4,
        }),
        mk(E, g, {
          id: 't2',
          type: 'bacteria',
          disease: 'Cholera',
          zone: 'route',
          lane: 'gut',
          step: 4,
        }),
        mk(E, g, {
          id: 't3',
          type: 'bacteria',
          disease: 'Gas gangrene',
          zone: 'route',
          lane: 'wound',
          step: 4,
          tagged: true,
        }),
      ] as never;
    },
    { turns: 8 },
  );

  scenario('hidden viruses burst; EUK hidden pathogens spill parasites, not viruses', (E, g) => {
    g.invaders = [
      mk(E, g, {
        id: 'h1',
        type: 'hidden',
        disease: 'Toxoplasmosis',
        zone: 'route',
        lane: 'gut',
        step: 3,
      }),
      mk(E, g, {
        id: 'h2',
        type: 'hidden',
        disease: 'Chagas disease',
        zone: 'route',
        lane: 'bite',
        step: 3,
      }),
      mk(E, g, {
        id: 'h3',
        type: 'hidden',
        disease: 'Chickenpox',
        zone: 'route',
        lane: 'nose',
        step: 3,
      }),
    ] as never;
  });

  scenario(
    'Pathogen X never converts to a hidden virus',
    (E, g) => {
      g.novelSeen = true;
      g.invaders = [
        mk(E, g, {
          id: 'x1',
          type: 'virus',
          disease: 'Pathogen X',
          novel: true,
          zone: 'route',
          lane: 'nose',
          step: 4,
        }),
      ] as never;
    },
    { difficulty: 'hard', turns: 10 },
  );

  scenario('measles wipes antigen presentation on arrival (immune amnesia)', (E, g) => {
    g.presentations = 9;
    g.invaders = [
      mk(E, g, {
        id: 'me1',
        type: 'virus',
        disease: 'Measles',
        amnesia: true,
        zone: 'branch',
        organ: 'lungs',
        step: 1,
      }),
    ] as never;
  });

  scenario(
    'filariasis blocks the lymphatics for the whole game',
    (E, g) => {
      g.invaders = [
        mk(E, g, {
          id: 'f1',
          type: 'worm',
          disease: 'Filariasis',
          blocksLymph: true,
          zone: 'branch',
          organ: 'marrow',
          step: 0,
          lodged: true,
          wormClock: 3,
          hp: 3,
          maxhp: 3,
        }),
      ] as never;
    },
    { turns: 10 },
  );

  scenario('HIV in the bloodstream disables helper licensing', (E, g) => {
    g.presentations = 5;
    g.invaders = [
      mk(E, g, {
        id: 'hiv1',
        type: 'hidden',
        disease: 'HIV',
        killsHelper: true,
        zone: 'hub',
        step: 0,
      }),
    ] as never;
  });
});

describe('B5 scenarios — division, saturation and spread', () => {
  scenario(
    'SPACE_CAP saturates a single tissue space',
    (E, g) => {
      g.invaders = Array.from({ length: 10 }, (_, i) =>
        mk(E, g, {
          id: `b${i}`,
          type: 'bacteria',
          disease: 'Cholera',
          zone: 'route',
          lane: 'gut',
          step: 3,
        }),
      ) as never;
    },
    { difficulty: 'hard', turns: 6 },
  );

  scenario(
    'hard-mode division is guaranteed plus a rolled second copy',
    (E, g) => {
      g.invaders = [
        mk(E, g, {
          id: 'd1',
          type: 'bacteria',
          disease: 'Pneumonia',
          zone: 'route',
          lane: 'nose',
          step: 4,
        }),
      ] as never;
    },
    { difficulty: 'hard', turns: 6 },
  );

  scenario(
    'tagged bacteria never divide',
    (E, g) => {
      g.invaders = Array.from({ length: 4 }, (_, i) =>
        mk(E, g, {
          id: `tg${i}`,
          type: 'bacteria',
          disease: 'Typhoid',
          zone: 'route',
          lane: 'gut',
          step: 4,
          tagged: true,
        }),
      ) as never;
    },
    { difficulty: 'hard', turns: 6 },
  );

  scenario(
    'hard-mode lymphatic spread seeds a copy into the paired route',
    (E, g) => {
      g.invaders = [
        mk(E, g, {
          id: 'l1',
          type: 'bacteria',
          disease: 'Typhoid',
          zone: 'route',
          lane: 'gut',
          step: 3,
        }),
        mk(E, g, {
          id: 'l2',
          type: 'virus',
          disease: 'Influenza',
          zone: 'route',
          lane: 'nose',
          step: 3,
        }),
        mk(E, g, {
          id: 'l3',
          type: 'bacteria',
          disease: 'Tetanus',
          zone: 'route',
          lane: 'wound',
          step: 3,
        }),
      ] as never;
    },
    { difficulty: 'hard', turns: 6 },
  );

  scenario(
    'the blood route has no lymphatic partner, so nothing seeds from it',
    (E, g) => {
      g.invaders = [
        mk(E, g, {
          id: 'bl1',
          type: 'bacteria',
          disease: 'Endocarditis',
          zone: 'route',
          lane: 'blood',
          step: 3,
        }),
      ] as never;
    },
    { difficulty: 'hard', turns: 6 },
  );

  scenario('fast diseases march at their named speed, overriding type', (E, g) => {
    g.invaders = [
      mk(E, g, {
        id: 'fa1',
        type: 'bacteria',
        disease: 'Meningitis',
        zone: 'route',
        lane: 'nose',
        step: 5,
      }),
      mk(E, g, {
        id: 'fa2',
        type: 'bacteria',
        disease: 'Gas gangrene',
        zone: 'route',
        lane: 'wound',
        step: 5,
      }),
      mk(E, g, {
        id: 'fa3',
        type: 'bacteria',
        disease: 'Cholera',
        zone: 'route',
        lane: 'gut',
        step: 5,
      }),
    ] as never;
  });

  scenario('an opportunistic fungus speeds up while the neutrophil is down', (E, g) => {
    const n = g.cells.neutrophil;
    if (n) {
      n.alive = false;
      (n as unknown as Record<string, unknown>).regenAt = 99;
    }
    g.invaders = [
      mk(E, g, {
        id: 'fu1',
        type: 'fungus',
        disease: 'Candida',
        zone: 'route',
        lane: 'gut',
        step: 5,
        hp: 2,
        maxhp: 2,
      }),
    ] as never;
  });
});

describe('B5 scenarios — organs, endgame and upkeep', () => {
  scenario(
    'organ convalescence on Normal regrows integrity',
    (E, g) => {
      const o = g.organs.lungs;
      if (o) o.hp = 1;
    },
    { turns: 8 },
  );

  scenario(
    'hard mode compensates rather than regrowing',
    (E, g) => {
      for (const key of g.organList) {
        const o = g.organs[key];
        if (o) o.hp = 1;
      }
    },
    { difficulty: 'hard', turns: 8 },
  );

  scenario(
    'damaged kidneys leak an antibody every turn',
    (E, g) => {
      const k = g.organs.kidneys;
      if (k) k.hp = 1;
      for (const f of ['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK']) g.ab[f] = 4;
    },
    { turns: 8 },
  );

  scenario(
    'a spent neutrophil and eosinophil regenerate on schedule',
    (E, g) => {
      const n = g.cells.neutrophil;
      const eo = g.cells.eosinophil;
      if (n) {
        n.alive = false;
        (n as unknown as Record<string, unknown>).spentAt = 1;
        (n as unknown as Record<string, unknown>).regenAt = 5;
      }
      if (eo) {
        eo.alive = false;
        (eo as unknown as Record<string, unknown>).regenAt = 5;
      }
    },
    { turns: 10 },
  );

  scenario(
    'a broken marrow stops the neutrophil regenerating at all',
    (E, g) => {
      const n = g.cells.neutrophil;
      if (n) {
        n.alive = false;
        (n as unknown as Record<string, unknown>).regenAt = 3;
      }
      const m = g.organs.marrow;
      if (m) m.hp = 1;
    },
    { turns: 10 },
  );

  scenario(
    'attrition defeat at maxTurn + GRACE_CLEAR',
    (E, g) => {
      g.turn = g.maxTurn + 14;
      g.everInfected = true;
      g.invaders = [
        mk(E, g, {
          id: 'at1',
          type: 'worm',
          disease: 'Hookworm',
          zone: 'branch',
          organ: 'marrow',
          step: 0,
          lodged: true,
          wormClock: 9,
          hp: 3,
          maxhp: 3,
        }),
      ] as never;
    },
    { turns: 4 },
  );

  scenario(
    'victory when the board clears after the onslaught window',
    (E, g) => {
      g.turn = g.maxTurn + 1;
      g.everInfected = true;
      g.invaders = [] as never;
    },
    { turns: 3 },
  );

  scenario(
    'fever freezes the march for a turn',
    (E, g) => {
      g.fx.skipMarch = true;
      g.invaders = [
        mk(E, g, {
          id: 'fv1',
          type: 'virus',
          disease: 'Influenza',
          zone: 'route',
          lane: 'nose',
          step: 3,
        }),
      ] as never;
    },
    { turns: 4 },
  );

  scenario('crisis events are disabled entirely', () => {}, {
    flags: { crisisEvents: false },
    turns: 10,
  });

  scenario('every optional rule flag off at once', () => {}, {
    flags: {
      crisisEvents: false,
      rareEvents: false,
      specials: false,
      toxins: false,
      malaria: false,
      lymph: false,
      dendritic: false,
      helperT: false,
      nkCell: false,
      complement: false,
      residentMove: false,
      tierB: false,
    },
    turns: 10,
  });
});

describe('B5 scenarios — worm caps and the novel pathogen', () => {
  it('an all-worm deck under maximum pressure still respects both caps, identically', () => {
    // The worst case the caps were written for: a deck containing nothing but worms, with the
    // co-infection event firing every turn on top of the normal draw.
    for (let i = 0; i < 12; i += 1) {
      const seed = 960000 + i;
      const run = (E: Engine): string[] => {
        installRng(seed);
        try {
          const g = E.newGame({ difficulty: 'hard', science: false }) as GameState;
          g.deck = Array.from({ length: 60 }, (_, k) => ({
            dz: ['Hookworm', 'Tapeworm', 'Roundworm', 'Whipworm'][k % 4],
            type: 'worm',
            lane: 'wound',
          })) as never;
          g.discard = [] as never;
          const out: string[] = [];
          for (let t = 0; t < 12; t += 1) {
            E.applyEvent(g, 'coInfection');
            E.applyAction(g, { action: 'draw' });
            E.applyAction(g, { action: 'beginCommand' });
            E.applyAction(g, { action: 'endCommand' });
            out.push(canonical(g));
            if (g.won || g.lost) break;
          }
          return out;
        } finally {
          restoreRng();
        }
      };
      const a = run(legacy);
      const b = run(port as unknown as Engine);
      expect(b.length, `step count, seed ${seed}`).toBe(a.length);
      for (let k = 0; k < a.length; k += 1) {
        expect(b[k], `all-worm deck at step ${k}, seed ${seed}`).toBe(a[k]);
      }
    }
  }, 120_000);

  it('the novel pathogen full arc: spawn -> clonal selection -> X antibodies -> neutralise', () => {
    for (let i = 0; i < 12; i += 1) {
      const seed = 962000 + i;
      const run = (E: Engine): string[] => {
        installRng(seed);
        try {
          const g = E.newGame({ difficulty: 'hard', science: false }) as GameState;
          g.novelSeen = true;
          g.invaders = [
            mk(E, g, {
              id: 'px',
              type: 'virus',
              disease: 'Pathogen X',
              novel: true,
              zone: 'route',
              lane: 'nose',
              step: 4,
            }),
          ] as never;
          const out: string[] = [];
          for (let t = 0; t < 10; t += 1) {
            E.applyAction(g, { action: 'draw' });
            E.applyAction(g, { action: 'beginCommand' });
            // Search for the clone, then make X antibodies, then use them.
            E.applyAction(g, { action: 'clonalSelection' });
            E.applyAction(g, { action: 'produce', family: 'X' });
            E.applyAction(g, { action: 'neutralise', invaderId: 'px' });
            out.push(canonical(g));
            E.applyAction(g, { action: 'endCommand' });
            out.push(canonical(g));
            if (g.won || g.lost) break;
          }
          return out;
        } finally {
          restoreRng();
        }
      };
      const a = run(legacy);
      const b = run(port as unknown as Engine);
      expect(b.length, `step count, seed ${seed}`).toBe(a.length);
      for (let k = 0; k < a.length; k += 1) {
        expect(b[k], `Pathogen X arc at step ${k}, seed ${seed}`).toBe(a[k]);
      }
    }
  }, 120_000);
});

describe('B5 scenarios — rare events', () => {
  const RARE_KEYS = [
    'malariaRelapse',
    'dengueADE',
    'tbReactivation',
    'shingles',
    'postFluPneumonia',
    'rheumaticFever',
    'cytokineStorm',
  ];

  for (const key of RARE_KEYS) {
    it(`fireRare(${key}) produces an identical state and plays on identically`, () => {
      for (let i = 0; i < 20; i += 1) {
        const seed = 970000 + i;
        const run = (E: Engine): string[] => {
          installRng(seed);
          try {
            const g = E.newGame({ difficulty: 'normal', science: false }) as GameState;
            g.rare.armed = true;
            g.rare.fired = null;
            // dengueADE needs a dengue to act on.
            g.invaders = [
              mk(E, g, {
                id: 'dq1',
                type: 'virus',
                disease: 'Dengue',
                zone: 'route',
                lane: 'bite',
                step: 4,
              }),
            ] as never;
            E.fireRare(g, key);
            const out = [canonical(g)];
            for (let t = 0; t < 5; t += 1) {
              for (const a of [
                { action: 'draw' },
                { action: 'beginCommand' },
                { action: 'endCommand' },
              ]) {
                E.applyAction(g, a);
                out.push(canonical(g));
                if (g.won || g.lost) break;
              }
              if (g.won || g.lost) break;
            }
            return out;
          } finally {
            restoreRng();
          }
        };
        const a = run(legacy);
        const b = run(port as unknown as Engine);
        expect(b.length, `${key} step count, seed ${seed}`).toBe(a.length);
        for (let k = 0; k < a.length; k += 1) {
          expect(b[k], `${key} at step ${k}, seed ${seed}`).toBe(a[k]);
        }
      }
    }, 120_000);
  }

  it('checkRareTriggers fires the same event for the same board, in the same priority order', () => {
    // checkRareTriggers is NOT exported by legacy, so it cannot be called directly.
    //
    // The first version of this test called it through an optional chain on both engines.
    // Neither exports it, so BOTH calls silently did nothing and the test passed while
    // comparing absolutely nothing — the exact vacuous-pass failure the B0 negative control
    // exists to prevent. It is driven through endCommand instead, which is the only path that
    // reaches it, with the march frozen so the rest of the turn stays quiet.
    const setups: [string, (g: GameState) => void][] = [
      [
        'killedThisTurn >= 4',
        (g) => {
          g.rare.killedThisTurn = 5;
        },
      ],
      [
        'strep killed by antibody',
        (g) => {
          g.rare.seen.strepKilledByAntibody = true;
        },
      ],
      [
        'dengue back after being beaten',
        (g) => {
          g.rare.seen.dengueKilled = true;
        },
      ],
      [
        'malaria reached the liver, long gone',
        (g) => {
          g.rare.malariaLiver = true;
          g.turn = 9;
        },
      ],
      [
        'flu reached the lungs',
        (g) => {
          g.rare.seen.fluInLungs = true;
        },
      ],
      [
        'chickenpox beaten, turn >= 6',
        (g) => {
          g.rare.seen.chickenpoxKilled = true;
          g.turn = 7;
        },
      ],
      [
        'tb beaten and neutrophil down',
        (g) => {
          g.rare.seen.tbKilled = true;
          const n = g.cells.neutrophil;
          if (n) n.alive = false;
        },
      ],
      [
        'tb beaten and marrow damaged',
        (g) => {
          g.rare.seen.tbKilled = true;
          const m = g.organs.marrow;
          if (m) m.hp = 1;
        },
      ],
      [
        'several at once — first match must win',
        (g) => {
          g.rare.killedThisTurn = 6;
          g.rare.seen.strepKilledByAntibody = true;
          g.rare.seen.fluInLungs = true;
          g.rare.seen.chickenpoxKilled = true;
          g.turn = 8;
        },
      ],
      [
        'not armed — nothing may fire',
        (g) => {
          g.rare.armed = false;
          g.rare.killedThisTurn = 9;
          g.rare.seen.strepKilledByAntibody = true;
        },
      ],
      [
        'already fired — nothing may fire again',
        (g) => {
          g.rare.fired = 'shingles';
          g.rare.killedThisTurn = 9;
        },
      ],
    ];

    const fired: string[] = [];
    for (const [label, apply] of setups) {
      for (let i = 0; i < 10; i += 1) {
        const seed = 980000 + i;
        const run = (E: Engine): { state: string; fired: string | null } => {
          installRng(seed);
          try {
            const g = E.newGame({ difficulty: 'normal', science: false }) as GameState;
            g.rare.armed = true;
            g.fx.skipMarch = true; // freeze the march so the rare check is what varies
            g.invaders = [
              mk(E, g, { id: 'dq2', type: 'virus', disease: 'Dengue', zone: 'hub', step: 0 }),
            ] as never;
            apply(g);
            E.applyAction(g, { action: 'draw' });
            E.applyAction(g, { action: 'beginCommand' });
            E.applyAction(g, { action: 'endCommand' });
            return { state: canonical(g), fired: g.rare.fired };
          } finally {
            restoreRng();
          }
        };
        const a = run(legacy);
        const b = run(port as unknown as Engine);
        expect(b.fired, `${label} — which rare event fired, seed ${seed}`).toBe(a.fired);
        expect(b.state, `${label} — full state, seed ${seed}`).toBe(a.state);
        if (a.fired) fired.push(a.fired);
      }
    }

    // The setups have to actually be provoking rare events, or this proves nothing. That is the
    // assertion the vacuous first version was missing.
    expect(new Set(fired).size, 'distinct rare events provoked').toBeGreaterThanOrEqual(4);
  }, 120_000);
});
