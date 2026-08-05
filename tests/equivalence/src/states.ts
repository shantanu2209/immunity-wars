/**
 * The B2 state corpus.
 *
 * Two sources, and the second exists because of a real gap found while building the first.
 *
 * HARVESTED states come from actual legacy games. They are realistic and they contain
 * combinations nobody would think to write by hand.
 *
 * SYNTHETIC states exist because the harvest inherits the reference bot's blind spots. The bot
 * never moves the Neutrophil, so `netTargets()` is always empty, so the NET never fires, so a
 * SPENT Neutrophil never appears in any harvested state — and `invSpeed()`'s opportunistic
 * fungus branch reads exactly that field. The bot also never repositions a resident, never uses
 * antivenom, and never triggers the lymphatic crossing (docs/FINDINGS.md #1).
 *
 * So the bot's capability holes would silently become the port's COVERAGE holes. The
 * augmentations below reach into those states directly. They are deliberately allowed to build
 * combinations ordinary play would not produce: these are pure queries, so an odd state is a
 * legitimate input, and the awkward ones are where transcription errors hide.
 */

import { botGame } from './bot.js';
import { installRng, restoreRng } from './rng.js';
import type { Engine, GameState, Invader } from './types.js';

const DIFFICULTIES = ['training', 'normal', 'hard'];

const copy = (g: GameState): GameState => JSON.parse(JSON.stringify(g)) as GameState;

/** Snapshot the state after every action of real games. */
export function harvest(legacy: Engine, seeds: number, maxTurns = 14): GameState[] {
  const out: GameState[] = [];
  for (let i = 0; i < seeds; i += 1) {
    for (const difficulty of DIFFICULTIES) {
      installRng(600000 + i);
      try {
        const g = legacy.newGame({ difficulty, science: false });
        botGame(
          legacy,
          g,
          (a) => {
            const r = legacy.applyAction(g, a);
            out.push(copy(g));
            return r;
          },
          maxTurns,
        );
      } finally {
        restoreRng();
      }
    }
  }
  return out;
}

const mk = (over: Partial<Invader> & { id: string; type: string; disease: string }): Invader =>
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

type Mutation = { name: string; apply: (g: GameState) => void };

/**
 * Each mutation names the query branch it exists to reach. If one is ever deleted, the comment
 * says what stops being tested.
 */
const MUTATIONS: Mutation[] = [
  {
    // invSpeed's opportunistic-fungus branch, and neutrophilReadyTurn. UNREACHABLE by the bot.
    name: 'neutrophil spent',
    apply: (g) => {
      const n = g.cells.neutrophil;
      if (n) {
        n.alive = false;
        (n as unknown as Record<string, unknown>).spentAt = g.turn;
        (n as unknown as Record<string, unknown>).regenAt = g.turn + 4;
      }
    },
  },
  {
    // neutrophilReadyTurn's regenAt fallback: spent, but with no spentAt recorded.
    name: 'neutrophil spent, regenAt only',
    apply: (g) => {
      const n = g.cells.neutrophil;
      if (n) {
        n.alive = false;
        delete (n as unknown as Record<string, unknown>).spentAt;
        (n as unknown as Record<string, unknown>).regenAt = g.turn + 3;
      }
    },
  },
  {
    // wormStrikeable's early return for a spent eosinophil.
    name: 'eosinophil spent',
    apply: (g) => {
      const e = g.cells.eosinophil;
      if (e) {
        e.alive = false;
        (e as unknown as Record<string, unknown>).regenAt = g.turn + 4;
      }
    },
  },
  {
    // invSpeed's `suppress.neutrophil > 0` clause.
    name: 'cells suppressed',
    apply: (g) => {
      g.suppress = { neutrophil: 2, tcell: 2 } as GameState['suppress'];
    },
  },
  {
    // damaged(), apFor()'s lung/heart penalties, capFam()'s liver clamp, divideOn()'s spleen
    // clause, marrowBroken(), kidneyLeak() — all at once.
    name: 'every organ damaged',
    apply: (g) => {
      for (const o of g.organList) {
        const org = g.organs[o];
        if (org) {
          org.hp = 1;
          org.clear = 0;
        }
      }
    },
  },
  {
    // damaged()'s hard-mode `compensated` escape: reduced hp, but the penalty has lifted.
    name: 'organs damaged but compensated',
    apply: (g) => {
      for (const o of g.organList) {
        const org = g.organs[o];
        if (org) {
          org.hp = 1;
          (org as unknown as Record<string, unknown>).compensated = true;
        }
      }
    },
  },
  {
    // macDisabled(), and residentEatable()'s infected-resident early return.
    name: 'residents infected by kala-azar',
    apply: (g) => {
      const o = g.organList[0];
      if (!o) return;
      const iv = mk({
        id: 'kala1',
        type: 'parasite',
        disease: 'Kala-azar',
        zone: 'branch',
        organ: o,
        step: 0,
        hidesInMac: true,
        inMac: true,
        hp: 2,
        maxhp: 2,
      });
      g.invaders.push(iv);
      const r = g.residents[o];
      if (r) r.infectedBy = 'kala1';
    },
  },
  {
    // residentEatable()'s positive path — which the bot NEVER reaches, because a resident parked
    // on step 0 can never have an eligible target (docs/FINDINGS.md #5).
    name: 'resident patrolled onto the branch, with prey',
    apply: (g) => {
      const o = g.organList[0];
      if (!o) return;
      const r = g.residents[o];
      if (r) r.step = 1;
      g.invaders.push(
        mk({
          id: 'res-prey1',
          type: 'virus',
          disease: 'Influenza',
          zone: 'branch',
          organ: o,
          step: 1,
        }),
        mk({
          id: 'res-prey2',
          type: 'bacteria',
          disease: 'Pneumonia',
          zone: 'branch',
          organ: o,
          step: 1,
          tagged: true,
        }),
      );
    },
  },
  {
    // netTargets()'s exclusion list, and macrophageEatable()'s type ladder. One invader of every
    // type, co-located with the Neutrophil and Monocyte out in tissue.
    name: 'one of every invader type, co-located with the innate cells',
    apply: (g) => {
      const at = { zone: 'route' as const, lane: 'gut' as const, step: 2 };
      const n = g.cells.neutrophil;
      const m = g.cells.macrophage;
      for (const c of [n, m]) {
        if (c) {
          c.zone = 'route';
          c.lane = 'gut';
          c.organ = null;
          c.step = 2;
          c.alive = true;
        }
      }
      const types: [string, string][] = [
        ['virus', 'Influenza'],
        ['hidden', 'Chickenpox'],
        ['bacteria', 'Cholera'],
        ['toxin', 'Botulism'],
        ['venom', 'Snake venom'],
        ['fungus', 'Candida'],
        ['worm', 'Tapeworm'],
        ['malaria', 'Malaria'],
        ['parasite', 'Giardia'],
      ];
      types.forEach(([type, disease], i) => {
        g.invaders.push(mk({ id: `all-${i}`, type, disease, ...at, hp: 3, maxhp: 3 }));
        g.invaders.push(
          mk({ id: `allt-${i}`, type, disease, ...at, tagged: true, hp: 1, maxhp: 3 }),
        );
      });
    },
  },
  {
    // canNeutralise / snipeTargets / nkTargets malaria staging, and the liver embed.
    name: 'malaria at all three stages',
    apply: (g) => {
      g.invaders.push(
        mk({
          id: 'mal-s',
          type: 'malaria',
          disease: 'Malaria',
          stage: 'sporozoite',
          zone: 'route',
          lane: 'bite',
          step: 3,
        }),
        mk({
          id: 'mal-l',
          type: 'malaria',
          disease: 'Malaria',
          stage: 'liver',
          zone: 'branch',
          organ: 'liver',
          step: 0,
          embed: 2,
        }),
        mk({
          id: 'mal-b',
          type: 'malaria',
          disease: 'Malaria (blood)',
          stage: 'blood',
          zone: 'hub',
          step: 0,
        }),
      );
    },
  },
  {
    // invSpeed()'s ADE branch, and canNeutralise()'s ADE refusal.
    name: 'dengue with antibody-dependent enhancement',
    apply: (g) => {
      g.invaders.push(
        mk({ id: 'ade1', type: 'virus', disease: 'Dengue (ADE)', ade: true, zone: 'hub', step: 0 }),
      );
    },
  },
  {
    // hivActive() — and note it only fires once HIV is OUT of the entry route.
    name: 'HIV in the bloodstream',
    apply: (g) => {
      g.invaders.push(
        mk({ id: 'hiv1', type: 'hidden', disease: 'HIV', killsHelper: true, zone: 'hub', step: 0 }),
      );
    },
  },
  {
    // hivActive()'s negative case: killsHelper present but still on a route.
    name: 'HIV still in the entry route',
    apply: (g) => {
      g.invaders.push(
        mk({
          id: 'hiv2',
          type: 'hidden',
          disease: 'HIV',
          killsHelper: true,
          zone: 'route',
          lane: 'contact',
          step: 4,
        }),
      );
    },
  },
  {
    // lymphBlocked(), which gates a whole limb of moveDestinations.
    name: 'filariasis blocking the lymphatics',
    apply: (g) => {
      g.invaders.push(
        mk({
          id: 'fil1',
          type: 'worm',
          disease: 'Filariasis',
          blocksLymph: true,
          zone: 'branch',
          organ: 'marrow',
          step: 0,
          lodged: true,
          hp: 3,
          maxhp: 3,
        }),
      );
    },
  },
  {
    // moveDestinations()'s lymphatic crossing — the bot never uses `hop` and never parks on the
    // crossing, so this limb is otherwise dead in the harvest.
    name: 'every cell parked on the lymph crossing',
    apply: (g) => {
      const lanes = ['nose', 'gut', 'contact', 'wound', 'bite', 'blood'];
      Object.keys(g.cells).forEach((ck, i) => {
        const c = g.cells[ck];
        if (!c) return;
        c.zone = 'route';
        c.lane = lanes[i % lanes.length] as GameState['cells'][string]['lane'];
        c.organ = null;
        c.step = 3;
      });
    },
  },
  {
    // brainSlow()'s clamp inside moveDestinations.
    name: 'every cell inside the brain',
    apply: (g) => {
      Object.values(g.cells).forEach((c) => {
        c.zone = 'branch';
        c.organ = 'brain';
        c.lane = null;
        c.step = 1;
      });
    },
  },
  {
    // helperWith() for every cell at once, and the Th2 eosinophil speed bonus.
    name: 'helper co-located with every cell',
    apply: (g) => {
      g.presentations = 5;
      Object.values(g.cells).forEach((c) => {
        c.zone = 'hub';
        c.lane = null;
        c.organ = null;
        c.step = 0;
      });
    },
  },
  {
    // helperLicensed()'s unprimed branch, which productionBreakdown reports explicitly.
    name: 'helper present but never primed',
    apply: (g) => {
      g.presentations = 0;
      const h = g.cells.helper;
      const b = g.cells.bcell;
      if (h && b) {
        h.zone = b.zone;
        h.lane = b.lane;
        h.organ = b.organ;
        h.step = b.step;
      }
    },
  },
  {
    // rateFor()'s presentation tiers, at and around every boundary.
    name: 'presentations at tier boundaries',
    apply: (g) => {
      g.presentations = [0, 1, 3, 5, 7, 12][g.turn % 6] ?? 0;
    },
  },
  {
    // rateForFam()'s Training-only affinity bonus, which can exceed the rate ceiling.
    name: 'affinity maturation reached in every class',
    apply: (g) => {
      for (const f of ['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK', 'X']) g.made[f] = 9;
    },
  },
  {
    // capFam()/capFor()'s temporary clamp, and productionBreakdown()'s blocked path.
    name: 'antibody shortage and immunosuppression',
    apply: (g) => {
      g.fx = { capTurns: 3, noProduce: true, apMod: -1, skipMarch: false } as GameState['fx'];
    },
  },
  {
    // apFor()'s surge branch, and Giardia's drain.
    name: 'acute-phase surge with giardia draining',
    apply: (g) => {
      g.fx = { capTurns: 0, noProduce: false, apMod: 2, skipMarch: false } as GameState['fx'];
      g.invaders.push(
        mk({
          id: 'gia1',
          type: 'parasite',
          disease: 'Giardia',
          drain: 1,
          zone: 'hub',
          step: 0,
          hp: 2,
          maxhp: 2,
        }),
      );
    },
  },
  {
    // canProduceFam()/abMatch()'s X-pool gating, both before and after clonal selection.
    name: 'novel pathogen, clone not yet found',
    apply: (g) => {
      g.novelSeen = true;
      g.cloneFound = false;
      g.invaders.push(
        mk({
          id: 'px1',
          type: 'virus',
          disease: 'Pathogen X',
          novel: true,
          zone: 'route',
          lane: 'nose',
          step: 3,
        }),
      );
    },
  },
  {
    name: 'novel pathogen, clone found and antibodies held',
    apply: (g) => {
      g.novelSeen = true;
      g.cloneFound = true;
      g.ab.X = 3;
      g.invaders.push(
        mk({ id: 'px2', type: 'virus', disease: 'Pathogen X', novel: true, zone: 'hub', step: 0 }),
      );
    },
  },
  {
    // Full antibody stores: flips abMatch, canTag and canNeutralise positive across the board.
    name: 'every antibody pool full',
    apply: (g) => {
      for (const f of ['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK', 'X']) g.ab[f] = 5;
    },
  },
  {
    // wormAllowed()'s two independent caps, at and past their limits.
    name: 'worm caps exhausted',
    apply: (g) => {
      g.wormsSpawned = 2;
      g.wormsThisTurn = 1;
    },
  },
  {
    // A lodged worm at step 0 — the shape residentEatable must still refuse.
    name: 'worms lodged at every organ',
    apply: (g) => {
      g.organList.forEach((o, i) => {
        g.invaders.push(
          mk({
            id: `wl-${i}`,
            type: 'worm',
            disease: 'Tapeworm',
            zone: 'branch',
            organ: o,
            step: 0,
            lodged: true,
            wormClock: 3,
            tagged: i % 2 === 0,
            hp: 3,
            maxhp: 3,
          }),
        );
      });
    },
  },
  {
    // antivenomTargets() — the bot never uses antivenom, so venom rarely survives in a harvest.
    name: 'venom in every zone',
    apply: (g) => {
      g.invaders.push(
        mk({ id: 'ven1', type: 'venom', disease: 'Snake venom', zone: 'hub', step: 0 }),
        mk({
          id: 'ven2',
          type: 'venom',
          disease: "Russell's viper venom",
          zone: 'route',
          lane: 'bite',
          step: 2,
        }),
        mk({
          id: 'ven3',
          type: 'venom',
          disease: 'Red scorpion sting',
          zone: 'branch',
          organ: 'heart',
          step: 1,
        }),
      );
    },
  },
  {
    // The engine tolerates PARTIAL invaders — three legacy suites and the server's capture tool
    // build them this way (docs/TASK_B_PLAN.md §2). The port must tolerate them identically.
    name: 'hand-built partial invaders',
    apply: (g) => {
      g.invaders.push(
        {
          id: 'p1',
          zone: 'branch',
          organ: 'lungs',
          step: 1,
          type: 'bacteria',
          disease: 'Tuberculosis',
        } as Invader,
        { id: 'p2', zone: 'hub', step: 0, type: 'virus', disease: 'Influenza' } as Invader,
      );
    },
  },
  {
    // Empty board: every list query's zero case, and Math.min(...[]) hazards in distToOrgan.
    name: 'board completely clear',
    apply: (g) => {
      g.invaders = [];
    },
  },
];

/** Apply every mutation to every base state. */
export function augment(bases: GameState[]): GameState[] {
  const out: GameState[] = [];
  for (const base of bases) {
    for (const m of MUTATIONS) {
      const g = copy(base);
      try {
        m.apply(g);
        out.push(g);
      } catch {
        // A mutation that cannot apply to this particular base is skipped rather than fatal —
        // the point is coverage, not that every combination is meaningful.
      }
    }
  }
  return out;
}

export const MUTATION_NAMES = MUTATIONS.map((m) => m.name);
