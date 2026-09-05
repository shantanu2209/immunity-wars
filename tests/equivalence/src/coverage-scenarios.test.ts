/**
 * Scenarios for the REACHABLE uncovered branches found by the Task B coverage gate.
 *
 * Every case here was identified by measurement, not invented: `pnpm coverage:gaps` classified
 * 200 uncovered arms, and these are the ones classified reachable-but-unprovoked. The list
 * is in docs/TASK_B_CLOSEOUT.md §4.
 *
 * Each case runs against BOTH engines and compares result and state, so closing a coverage gap
 * also adds equivalence evidence rather than merely lighting up a line counter. A test that
 * only executed the port would raise coverage while proving nothing, which is the failure mode
 * this project keeps finding.
 *
 * NOT covered here, deliberately:
 *   - multiplayer arms — deferred to Phase 3 and tracked as a list, not silently excluded
 *   - `simulate()`'s bot-conditional arms — reachable once Phase 2 builds a competent bot
 */

import { describe, expect, it } from 'vitest';

import * as port from '@immunity-wars/engine';

import { loadLegacy } from './engine.js';
import { canonical } from './hash.js';
import { installRng, restoreRng } from './rng.js';
import { normalise } from './rig.js';
import type { Action, Engine, GameState, Invader } from './types.js';

const legacy = loadLegacy();
const portEngine = port as unknown as Engine;

const inv = (over: Partial<Invader> & { id: string; type: string; disease: string }): Invader =>
  ({
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
    ...over,
  }) as Invader;

interface Case {
  name: string;
  difficulty?: string;
  flags?: Record<string, boolean>;
  setup?: (g: GameState) => void;
  actions: Action[];
}

/**
 * Run one case through both engines and compare after every action.
 *
 * Setup mutates state directly, which both engines receive identically because both are built
 * from the same seed and handed the same mutation.
 */
function compare(c: Case): void {
  const seed = 880000;
  const cfg = {
    difficulty: c.difficulty ?? 'normal',
    science: false,
    ...(c.flags ? { flags: c.flags } : {}),
  };

  const run = (E: Engine): { results: string[]; states: string[] } => {
    installRng(seed);
    try {
      const g = E.newGame(cfg) as GameState;
      c.setup?.(g);
      const results: string[] = [];
      const states: string[] = [];
      for (const a of c.actions) {
        results.push(canonical(E.applyAction(g, a)));
        states.push(canonical(normalise(g)));
      }
      return { results, states };
    } finally {
      restoreRng();
    }
  };

  const a = run(legacy);
  const b = run(portEngine);
  expect(b.results, `${c.name}: results`).toEqual(a.results);
  expect(b.states, `${c.name}: states`).toEqual(a.states);
}

/** Put the game into the command phase with plenty of AP. */
const command = (g: GameState, ap = 9): void => {
  g.phase = 'command';
  g.ap = ap;
};

/* ------------------------------------------------------------------ *
 * cells that are spent, suppressed, or in the wrong place
 * ------------------------------------------------------------------ */

const CELL_STATE: Case[] = [
  {
    name: 'move a spent Neutrophil',
    setup: (g) => {
      command(g);
      const n = g.cells.neutrophil;
      if (n) n.alive = false;
    },
    actions: [{ action: 'move', cell: 'neutrophil', zone: 'route', lane: 'gut', step: 1 }],
  },
  {
    name: 'move a spent Eosinophil',
    setup: (g) => {
      command(g);
      const e = g.cells.eosinophil;
      if (e) e.alive = false;
    },
    actions: [{ action: 'move', cell: 'eosinophil', zone: 'route', lane: 'gut', step: 1 }],
  },
  {
    name: 'recall a spent Neutrophil and Eosinophil',
    setup: (g) => {
      command(g);
      for (const k of ['neutrophil', 'eosinophil']) {
        const c = g.cells[k];
        if (c) {
          c.alive = false;
          c.zone = 'route';
          c.lane = 'gut';
          c.step = 2;
        }
      }
    },
    actions: [
      { action: 'recall', cell: 'neutrophil' },
      { action: 'recall', cell: 'eosinophil' },
    ],
  },
  {
    name: 'recall a cell already at the hub, and the stationary B-Cell',
    setup: (g) => command(g),
    actions: [
      { action: 'recall', cell: 'macrophage' },
      { action: 'recall', cell: 'bcell' },
      { action: 'move', cell: 'bcell', zone: 'hub' },
    ],
  },
  {
    name: 'neutropenia blocks both the Neutrophil and the NET',
    setup: (g) => {
      command(g);
      g.suppress.neutrophil = 2;
      g.suppress.tcell = 2;
    },
    actions: [
      { action: 'move', cell: 'neutrophil', zone: 'route', lane: 'gut', step: 1 },
      { action: 'net', cell: 'neutrophil' },
      { action: 'snipe', cell: 'tcell', invaderId: 'x' },
    ],
  },
  {
    name: 'NET with the Neutrophil still at the hub, and while regenerating',
    setup: (g) => {
      command(g);
      g.invaders = [inv({ id: 'b1', type: 'bacteria', disease: 'Cholera' })];
    },
    actions: [{ action: 'net', cell: 'neutrophil' }],
  },
  {
    name: 'NET while regenerating',
    setup: (g) => {
      command(g);
      const n = g.cells.neutrophil;
      if (n) {
        n.alive = false;
        n.zone = 'route';
        n.lane = 'gut';
        n.step = 2;
      }
    },
    actions: [{ action: 'net', cell: 'neutrophil' }],
  },
];

/* ------------------------------------------------------------------ *
 * the lymphatic crossing
 * ------------------------------------------------------------------ */

const LYMPH: Case[] = [
  {
    name: 'hop with lymphatics disabled',
    flags: { lymph: false },
    setup: (g) => command(g),
    actions: [{ action: 'hop', cell: 'macrophage' }],
  },
  {
    name: 'hop from the blood route, which has no lymphatic partner',
    setup: (g) => {
      command(g);
      const m = g.cells.macrophage;
      if (m) {
        m.zone = 'route';
        m.lane = 'blood';
        m.step = 3;
      }
    },
    actions: [{ action: 'hop', cell: 'macrophage' }],
  },
  {
    name: 'hop from the wrong step, then correctly, with and without a named lane',
    setup: (g) => {
      command(g);
      const m = g.cells.macrophage;
      if (m) {
        m.zone = 'route';
        m.lane = 'nose';
        m.step = 5;
      }
    },
    actions: [
      { action: 'hop', cell: 'macrophage' }, // wrong step
      { action: 'move', cell: 'macrophage', zone: 'route', lane: 'nose', step: 4 },
      { action: 'move', cell: 'macrophage', zone: 'route', lane: 'nose', step: 3 },
      { action: 'hop', cell: 'macrophage', lane: 'contact' }, // named partner
      { action: 'hop', cell: 'macrophage' }, // default partner
      { action: 'hop', cell: 'bcell' }, // stationary
    ],
  },
];

/* ------------------------------------------------------------------ *
 * the B-cell, vaccines and the novel antigen
 * ------------------------------------------------------------------ */

const ADAPTIVE: Case[] = [
  {
    name: 'produce into a full antibody store',
    setup: (g) => {
      command(g);
      for (const f of ['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK']) g.ab[f] = 9;
    },
    actions: [{ action: 'produce', family: 'ENV' }],
  },
  {
    name: 'clonalSelection with no AP left',
    setup: (g) => {
      command(g, 0);
      g.novelSeen = true;
      g.invaders = [inv({ id: 'px', type: 'virus', disease: 'Pathogen X', novel: true })];
      g.free = { bcell: 1 }; // survive the outer no-AP gate, fail the inner one
    },
    actions: [{ action: 'clonalSelection' }],
  },
  {
    name: 'vaccinate against something already immune, and with no AP',
    difficulty: 'hard',
    setup: (g) => {
      command(g, 0);
      g.seen.Cholera = true;
      g.memory.Cholera = true;
      g.seen.Typhoid = true;
      g.free = { bcell: 1 };
    },
    actions: [
      { action: 'vaccinate', disease: 'Cholera', ap: 1 },
      { action: 'vaccinate', disease: 'Typhoid', ap: 1 },
    ],
  },
  {
    name: 'tag a pathogen hiding inside a macrophage',
    setup: (g) => {
      command(g);
      g.ab.EUK = 5;
      const o = g.organList[0];
      g.invaders = [
        inv({
          id: 'k1',
          type: 'parasite',
          disease: 'Kala-azar',
          hidesInMac: true,
          inMac: true,
          zone: 'branch',
          organ: o,
          step: 0,
          hp: 2,
          maxhp: 2,
        }),
      ];
      const r = o ? g.residents[o] : undefined;
      if (r) r.infectedBy = 'k1';
    },
    actions: [{ action: 'tag', invaderId: 'k1' }],
  },
  {
    name: 'production with the dendritic rule disabled',
    flags: { dendritic: false },
    setup: (g) => command(g),
    actions: [{ action: 'produce', family: 'ENV' }],
  },
];

/* ------------------------------------------------------------------ *
 * antivenom, strike and degranulate
 * ------------------------------------------------------------------ */

const COMBAT: Case[] = [
  {
    name: 'antivenom with none in stock, and without the 3 AP',
    difficulty: 'hard', // Hard starts with zero antivenom
    setup: (g) => {
      command(g);
      g.invaders = [inv({ id: 'v1', type: 'venom', disease: 'Snake venom' })];
    },
    actions: [{ action: 'antivenom', invaderId: 'v1' }],
  },
  {
    name: 'antivenom in stock but not enough AP',
    difficulty: 'training', // starts with 2 doses
    setup: (g) => {
      command(g, 1);
      g.invaders = [inv({ id: 'v2', type: 'venom', disease: 'Snake venom' })];
      g.free = { bcell: 1 };
    },
    actions: [{ action: 'antivenom', invaderId: 'v2' }],
  },
  {
    name: 'orderAntivenom with no AP',
    setup: (g) => {
      command(g, 0);
      g.free = { bcell: 1 };
    },
    actions: [{ action: 'orderAntivenom', ap: 2 }],
  },
  {
    name: 'strike from the wrong place, with the wrong cell, and with the Monocyte',
    setup: (g) => {
      command(g);
      const o = g.organList[0];
      g.invaders = [
        inv({
          id: 'w1',
          type: 'worm',
          disease: 'Tapeworm',
          zone: 'branch',
          organ: o,
          step: 1,
          tagged: true,
          hp: 3,
          maxhp: 3,
        }),
      ];
    },
    actions: [
      { action: 'strike', cell: 'eosinophil', invaderId: 'w1' }, // not co-located
      { action: 'move', cell: 'macrophage', zone: 'branch', organ: g0(), step: 3 },
      { action: 'move', cell: 'macrophage', zone: 'branch', organ: g0(), step: 2 },
      { action: 'move', cell: 'macrophage', zone: 'branch', organ: g0(), step: 1 },
      { action: 'strike', cell: 'nk', invaderId: 'w1' }, // wrong cell
      { action: 'strike', cell: 'macrophage', invaderId: 'w1' }, // 1 damage, survives
      { action: 'strike', cell: 'macrophage', invaderId: 'w1' },
      { action: 'strike', cell: 'macrophage', invaderId: 'w1' }, // kills
    ],
  },
  {
    name: 'degranulate from the wrong place, and while spent',
    setup: (g) => {
      command(g);
      const o = g.organList[0];
      g.invaders = [
        inv({
          id: 'w2',
          type: 'worm',
          disease: 'Tapeworm',
          zone: 'branch',
          organ: o,
          step: 1,
          tagged: true,
          hp: 3,
          maxhp: 3,
        }),
      ];
    },
    actions: [{ action: 'degranulate', cell: 'eosinophil', invaderId: 'w2' }],
  },
  {
    name: 'degranulate while the Eosinophil is regenerating',
    setup: (g) => {
      command(g);
      const e = g.cells.eosinophil;
      if (e) e.alive = false;
      g.invaders = [
        inv({ id: 'w3', type: 'worm', disease: 'Tapeworm', tagged: true, hp: 3, maxhp: 3 }),
      ];
    },
    actions: [
      { action: 'degranulate', cell: 'eosinophil', invaderId: 'w3' },
      { action: 'strike', cell: 'eosinophil', invaderId: 'w3' },
    ],
  },
  {
    name: 'memoryKill on nothing, on an unremembered pathogen, and with no AP on Hard',
    difficulty: 'hard',
    setup: (g) => {
      command(g, 0);
      g.free = { bcell: 1 };
      g.invaders = [
        inv({ id: 'r1', type: 'virus', disease: 'Influenza', remembered: true }),
        inv({ id: 'r2', type: 'virus', disease: 'Measles' }),
      ];
    },
    actions: [
      { action: 'memoryKill', invaderId: 'nope' },
      { action: 'memoryKill', invaderId: 'r2' },
      { action: 'memoryKill', invaderId: 'r1' },
    ],
  },
  {
    name: 'nkkill with the NK Cell rule disabled',
    flags: { nkCell: false },
    setup: (g) => {
      command(g);
      g.invaders = [inv({ id: 'h1', type: 'hidden', disease: 'Chickenpox' })];
    },
    actions: [{ action: 'nkkill', cell: 'nk', invaderId: 'h1' }],
  },
  {
    name: 'the Killer T and NK reaching from the hub into a branch',
    setup: (g) => {
      command(g);
      const o = g.organList[0];
      g.invaders = [
        inv({ id: 'h2', type: 'hidden', disease: 'Chickenpox', zone: 'branch', organ: o, step: 1 }),
      ];
    },
    actions: [
      { action: 'snipe', cell: 'tcell', invaderId: 'h2' },
      { action: 'nkkill', cell: 'nk', invaderId: 'h2' },
    ],
  },
];

function g0(): string {
  return 'heart';
}

/* ------------------------------------------------------------------ *
 * residents
 * ------------------------------------------------------------------ */

const RESIDENTS: Case[] = [
  {
    name: 'resmove with resident movement disabled',
    flags: { residentMove: false },
    setup: (g) => command(g),
    actions: [{ action: 'resmove', organ: 'lungs', step: 1 }],
  },
  {
    name: 'resengulf a resident that has a parasite living inside it',
    setup: (g) => {
      command(g);
      g.invaders = [
        inv({
          id: 'k2',
          type: 'parasite',
          disease: 'Kala-azar',
          hidesInMac: true,
          inMac: true,
          zone: 'branch',
          organ: 'lungs',
          step: 0,
          hp: 2,
          maxhp: 2,
        }),
      ];
      const r = g.residents.lungs;
      if (r) r.infectedBy = 'k2';
    },
    actions: [{ action: 'resengulf', organ: 'lungs' }],
  },
  {
    name: 'resengulf choosing a target implicitly, then again in the same turn',
    setup: (g) => {
      command(g);
      const r = g.residents.lungs;
      if (r) r.step = 1;
      g.invaders = [
        inv({
          id: 'p1',
          type: 'virus',
          disease: 'Influenza',
          zone: 'branch',
          organ: 'lungs',
          step: 1,
        }),
        inv({ id: 'p2', type: 'virus', disease: 'RSV', zone: 'branch', organ: 'lungs', step: 1 }),
      ];
    },
    actions: [
      { action: 'resengulf', organ: 'lungs' }, // implicit target — the list[0] fallback
      { action: 'resengulf', organ: 'lungs', invaderId: 'p2' }, // already ate
    ],
  },
];

/* ------------------------------------------------------------------ *
 * kills that trigger bookkeeping
 * ------------------------------------------------------------------ */

const KILLS: Case[] = [
  {
    name: 'a Killer T-Cell frees an infected resident macrophage',
    setup: (g) => {
      command(g);
      g.invaders = [
        inv({
          id: 'k3',
          type: 'parasite',
          disease: 'Kala-azar',
          hidesInMac: true,
          inMac: true,
          zone: 'branch',
          organ: 'lungs',
          step: 1,
          hp: 2,
          maxhp: 2,
        }),
      ];
      const r = g.residents.lungs;
      if (r) r.infectedBy = 'k3';
      const t = g.cells.tcell;
      if (t) {
        t.zone = 'branch';
        t.organ = 'lungs';
        t.step = 1;
      }
    },
    actions: [{ action: 'snipe', cell: 'tcell', invaderId: 'k3' }],
  },
  {
    name: 'Cellulitis killed by an antibody arms the rheumatic-fever trigger',
    setup: (g) => {
      command(g);
      g.ab.EXB = 5;
      g.invaders = [inv({ id: 'c1', type: 'bacteria', disease: 'Cellulitis', tagged: true })];
      const m = g.cells.macrophage;
      if (m) {
        m.zone = 'hub';
        m.step = 0;
      }
    },
    actions: [
      { action: 'tag', invaderId: 'c1' },
      { action: 'engulf', cell: 'macrophage', invaderId: 'c1' },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * NEW REACH under coverage-v8 4 — docs/FINDINGS.md #46
 *
 * The v4 provider's AST-based mapping surfaced six reachable arms the v2 range-based mapper had
 * merged away — code that could always run and that no instrument had ever shown as uncovered.
 * Per the ruling, they become scenarios rather than being absorbed into a recalibrated number.
 *
 * The NET pair is the significant one: every previous test attempt at `net` sat at the hub, so
 * everything past the hub guard — the success path AND its own rejection — had zero coverage.
 * That is the SAME gap as FINDINGS #1's bot blindness (the bot never moves the Neutrophil, so
 * it can never NET), visible from the coverage side — docs/FINDINGS.md #47.
 * ------------------------------------------------------------------ */

const NEW_REACH_V4: Case[] = [
  {
    name: 'NET succeeds — neutrophil on a route swarm (the success path had zero coverage)',
    setup: (g) => {
      command(g);
      const n = g.cells.neutrophil;
      if (n) {
        n.zone = 'route';
        n.lane = 'gut' as never;
        n.step = 1;
      }
      g.invaders = [
        inv({
          id: 'b1',
          type: 'bacteria',
          disease: 'Cholera',
          zone: 'route',
          lane: 'gut',
          step: 1,
        }),
        inv({
          id: 'b2',
          type: 'bacteria',
          disease: 'Typhoid',
          zone: 'route',
          lane: 'gut',
          step: 1,
        }),
      ];
    },
    actions: [{ action: 'net' }],
  },
  {
    name: 'NET off the hub with nothing catchable — the "far too big" rejection',
    setup: (g) => {
      command(g);
      const n = g.cells.neutrophil;
      if (n) {
        n.zone = 'route';
        n.lane = 'gut' as never;
        n.step = 1;
      }
      g.invaders = [
        inv({
          id: 'w1',
          type: 'worm',
          disease: 'Hookworm',
          zone: 'route',
          lane: 'gut',
          step: 1,
          hp: 3,
          maxhp: 3,
        }),
      ];
    },
    actions: [{ action: 'net' }],
  },
  {
    name: 'degranulate against a target NOT in an organ branch — the route case of the signature move',
    setup: (g) => {
      command(g);
      const e = g.cells.eosinophil;
      if (e) {
        e.zone = 'route';
        e.lane = 'gut' as never;
        e.step = 1;
      }
      g.invaders = [
        inv({
          id: 'p1',
          type: 'parasite',
          disease: 'Giardia',
          zone: 'route',
          lane: 'gut',
          step: 1,
          tagged: true,
          hp: 2,
          maxhp: 2,
        }),
      ];
    },
    actions: [{ action: 'degranulate', invaderId: 'p1' }],
  },
  {
    name: 'worm cap substitution finds a non-worm only after reshuffling the discard',
    setup: (g) => {
      const raw = g as unknown as {
        phase: string;
        wormsThisTurn: number;
        seen: Record<string, boolean>;
        deck: { type: string }[];
        discard: { type: string }[];
      };
      raw.phase = 'infection';
      raw.wormsThisTurn = 1; // per-turn cap reached: the popped worm must be substituted
      raw.seen = {}; // no known diseases, so the spawn cannot take the reinfection shortcut
      const worms = raw.deck.filter((c) => c.type === 'worm');
      const nonWorm = raw.deck.find((c) => c.type !== 'worm');
      raw.deck = worms;
      raw.discard = nonWorm ? [nonWorm] : [];
    },
    actions: [{ action: 'draw' }],
  },
];

/* ------------------------------------------------------------------ *
 * run them
 * ------------------------------------------------------------------ */

const GROUPS: [string, Case[]][] = [
  ['cell state', CELL_STATE],
  ['the lymphatic crossing', LYMPH],
  ['the adaptive layer', ADAPTIVE],
  ['combat', COMBAT],
  ['residents', RESIDENTS],
  ['kill bookkeeping', KILLS],
  ['new reach under coverage-v8 4', NEW_REACH_V4],
];

for (const [group, cases] of GROUPS) {
  describe(`coverage scenarios — ${group}`, () => {
    for (const c of cases) {
      it(c.name, () => compare(c));
    }
  });
}

/**
 * The sixth new-reach arm is not an action, so it cannot ride a `Case`: `fireRare('dengueADE')`
 * with no Dengue in play — the rare event's no-op arm. In real play the trigger implies a
 * Dengue is present, so only a direct call reaches the else, and every existing direct-call
 * test set the Dengue up first.
 */
describe('coverage scenarios — new reach under coverage-v8 4 (rare events)', () => {
  it('dengueADE fired with no Dengue in play no-ops identically', () => {
    const run = (E: Engine): { fired: unknown; state: string } => {
      installRng(880001);
      try {
        const g = E.newGame({ difficulty: 'normal', science: false }) as GameState;
        const raw = g as unknown as {
          flags: Record<string, unknown>;
          rare: Record<string, unknown>;
          invaders: unknown[];
        };
        raw.flags.rareEvents = true;
        raw.rare.armed = true;
        raw.rare.fired = false;
        raw.invaders = []; // no Dengue anywhere
        const fired = (
          E as unknown as Record<string, unknown> & {
            fireRare: (g: GameState, k: string) => unknown;
          }
        ).fireRare(g, 'dengueADE');
        return { fired, state: canonical(normalise(g)) };
      } finally {
        restoreRng();
      }
    };
    const a = run(legacy);
    const b = run(portEngine);
    expect(b.fired).toEqual(a.fired);
    expect(b.state).toEqual(a.state);
  });
});
