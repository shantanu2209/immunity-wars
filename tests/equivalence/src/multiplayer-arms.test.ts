/**
 * THE MULTIPLAYER ARMS PHASE 3 OWED (docs/COVERAGE_DEFERRED.md, "Phase 3 — multiplayer"), each held
 * to legacy. Twelve were left once the undo tests (DEVIATIONS #8) had covered eight, and they are
 * of two kinds, found by reading every caller (28 September 2026):
 *
 * - **Five a game played together reaches**, through `applyAction`: a player who is not captain
 *   handing out points, the captain handing out more than the pool, a pool of exactly one point, a
 *   player who is not captain ending the turn, and a player with no points trying to act. Played
 *   through both engines on five seeds, byte-identical.
 * - **Seven no game reaches**, held to legacy's own functions by direct calls: `apOwnerOf`, which
 *   nothing in either engine calls; `apAvail` alone, which is only ever called together; and
 *   `spendAP` for no player, which the room never sends, since it gives every action its sender. A
 *   hand-built action in a hand-built state does reach that one (docs/FINDINGS.md #99, the last
 *   block). Legacy's functions are exposed for this test by the harness's source mutation, which adds
 *   three names to legacy's exports and changes nothing else.
 */
import { describe, expect, it } from 'vitest';

import * as port from '@immunity-wars/engine';
import { apAvail, apOwnerOf, spendAP } from '@immunity-wars/engine/internal';

import { loadLegacy, loadMutatedLegacy } from './engine.js';
import { canonical } from './hash.js';
import { installRng, restoreRng } from './rng.js';
import type { Action, Engine, GameState } from './types.js';

const legacy = loadLegacy();
const portEngine = port as unknown as Engine;

const TOGETHER = {
  difficulty: 'normal',
  science: false,
  multiplayer: true,
  captain: 'P1',
  players: ['P1', 'P2', 'P3'],
};

type Step = Action | ((g: GameState) => void);

function play(E: Engine, seed: number, steps: Step[]): { g: GameState; results: unknown[] } {
  installRng(seed);
  try {
    const g = E.newGame(TOGETHER) as GameState;
    const results: unknown[] = [];
    for (const s of steps) {
      if (typeof s === 'function') s(g);
      else results.push(E.applyAction(g, s));
    }
    return { g, results };
  } finally {
    restoreRng();
  }
}

const OPEN: Action[] = [
  { action: 'draw', pid: 'P1' },
  { action: 'beginCommand', pid: 'P1' },
];

/**
 * A state with its undo snapshots' budgets set aside: the one field DEVIATIONS #8 adds, together. An
 * action is snapshotted before it is checked, so even a refused move leaves a snapshot behind.
 */
function withoutSnapshotBudgets(g: GameState): unknown {
  const copy = JSON.parse(JSON.stringify(g)) as GameState & { undo?: Record<string, unknown>[] };
  for (const s of copy.undo ?? []) delete s['apBudget'];
  return copy;
}

/** Both engines, the same seed and steps: the same state, and the same answer to every action. */
function same(seed: number, steps: Step[]): { g: GameState; results: unknown[] } {
  const l = play(legacy, seed, steps);
  const p = play(portEngine, seed, steps);
  expect(canonical(withoutSnapshotBudgets(p.g)), `seed ${String(seed)}`).toBe(canonical(l.g));
  expect(p.results.map((r) => canonical(r))).toEqual(l.results.map((r) => canonical(r)));
  return p;
}

const SEEDS = [1, 2, 3, 4, 5];
const lastError = (r: { results: unknown[] }): string | undefined =>
  (r.results.at(-1) as { error?: string } | undefined)?.error;

describe('the multiplayer arms a game played together reaches, byte-identical to legacy', () => {
  it('refuses a player who is not captain handing out points', () => {
    for (const seed of SEEDS) {
      const r = same(seed, [...OPEN, { action: 'allocateAP', pid: 'P2', toPid: 'P3', amount: 1 }]);
      expect(lastError(r)).toBe('Only the captain allocates Action Points.');
    }
  });

  it('refuses the captain handing out more than the pool holds', () => {
    for (const seed of SEEDS) {
      const r = same(seed, [...OPEN, { action: 'allocateAP', pid: 'P1', toPid: 'P2', amount: 99 }]);
      expect(lastError(r)).toBe('Not enough unallocated AP.');
    }
  });

  it('refuses a player who is not captain ending the turn', () => {
    for (const seed of SEEDS) {
      const r = same(seed, [
        ...OPEN,
        { action: 'confirmAllocation', pid: 'P1' },
        { action: 'endCommand', pid: 'P2' },
      ]);
      expect(lastError(r)).toBe('Only the captain ends the turn.');
    }
  });

  it('says "1 Action Point", singular, when the pool is exactly one', () => {
    // The engine floors a turn's points at 1; a crisis modifier far below zero reaches the floor.
    const floor = (g: GameState): void => {
      const s = g as unknown as { fx: Record<string, unknown> | null };
      s.fx = { ...(s.fx ?? {}), apMod: -99 };
    };
    for (const seed of SEEDS) {
      const r = same(seed, [
        { action: 'draw', pid: 'P1' },
        floor,
        { action: 'beginCommand', pid: 'P1' },
      ]);
      expect((r.g as unknown as { apPool: number }).apPool).toBe(1);
      const log = JSON.stringify((r.g as unknown as { log: unknown[] }).log);
      expect(log).toContain('1 Action Point to distribute');
    }
  });

  it('refuses a player with no points of their own', () => {
    for (const seed of SEEDS) {
      // Every point stays with the captain, so P2 has none; the move is a legal one otherwise.
      const opened = play(portEngine, seed, [
        ...OPEN,
        { action: 'confirmAllocation', pid: 'P1' },
      ]).g;
      const d = portEngine.moveDestinations(opened, 'nk')[0] as unknown as Record<string, unknown>;
      const r = same(seed, [
        ...OPEN,
        { action: 'confirmAllocation', pid: 'P1' },
        {
          action: 'move',
          cell: 'nk',
          pid: 'P2',
          zone: d['zone'],
          lane: d['lane'],
          organ: d['organ'],
          step: d['step'],
        },
      ]);
      expect(lastError(r)).toBe('No Action Points.');
    }
  });
});

describe("the arms only a direct call reaches, held to legacy's own functions", () => {
  // Legacy keeps these three internal; the harness adds their names to its exports, and nothing else.
  const exposed = loadMutatedLegacy({
    name: 'expose apOwnerOf, apAvail and spendAP',
    find: 'module.exports={ setKnobs,',
    replace: 'module.exports={ apOwnerOf, apAvail, spendAP, setKnobs,',
  }) as unknown as {
    newGame: (c: object) => GameState;
    apOwnerOf: typeof apOwnerOf;
    apAvail: typeof apAvail;
    spendAP: typeof spendAP;
  };
  const games = (): { alone: [GameState, GameState]; together: [GameState, GameState] } => ({
    alone: [
      exposed.newGame({ difficulty: 'normal', science: false }),
      port.newGame({ difficulty: 'normal', science: false }) as unknown as GameState,
    ],
    together: [exposed.newGame(TOGETHER), port.newGame(TOGETHER) as unknown as GameState],
  });

  it('apOwnerOf: nobody alone; nobody for no action or no player; the player together', () => {
    const { alone, together } = games();
    const cases: [GameState, GameState, Action | null][] = [
      [alone[0], alone[1], { action: 'move', pid: 'P2' }],
      [together[0], together[1], null],
      [together[0], together[1], { action: 'move' }],
      [together[0], together[1], { action: 'move', pid: 'P2' }],
    ];
    for (const [l, p, a] of cases)
      expect(apOwnerOf(p as never, a as never)).toBe(exposed.apOwnerOf(l as never, a as never));
    expect(apOwnerOf(together[1] as never, { action: 'move', pid: 'P2' } as never)).toBe('P2');
  });

  it("apAvail alone is the table's own points", () => {
    const { alone } = games();
    expect(apAvail(alone[1] as never, 'P1')).toBe(exposed.apAvail(alone[0] as never, 'P1'));
    expect(apAvail(alone[1] as never, 'P1')).toBe((alone[1] as unknown as { ap: number }).ap);
  });

  it('spendAP together never takes a player below none, one with no budget included, as legacy', () => {
    const { together } = games();
    const [l, p] = together;
    for (const g of [l, p])
      (g as unknown as { apBudget: Record<string, number> }).apBudget = { P1: 3, P2: 0 };
    exposed.spendAP(l as never, 'P2', 1);
    spendAP(p as never, 'P2', 1);
    exposed.spendAP(l as never, 'P3', 1);
    spendAP(p as never, 'P3', 1);
    expect(canonical(p.apBudget)).toBe(canonical(l.apBudget));
    expect(p.apBudget).toEqual({ P1: 3, P2: 0, P3: 0 });
  });

  // THE ONE DIFFERENCE, kept by ruling (docs/DEVIATIONS.md #9, from FINDINGS #98): for no player,
  // legacy writes a budget under the key "null", and the port, which has guarded it since Task B4,
  // writes nothing. No game reaches it, since the room gives every action its sender (the last block
  // shows a hand-built action in a hand-built state can), and neither touches a real player's points.
  it('spendAP for no player: legacy writes a budget named "null", the port writes nothing', () => {
    const { together } = games();
    const [l, p] = together;
    for (const g of [l, p])
      (g as unknown as { apBudget: Record<string, number> }).apBudget = { P1: 3, P2: 0 };
    exposed.spendAP(l as never, null, 1);
    spendAP(p as never, null, 1);
    expect(l.apBudget).toEqual({ P1: 3, P2: 0, null: 0 });
    expect(p.apBudget).toEqual({ P1: 3, P2: 0 });
  });
});

describe('a hand-built action, in a hand-built state, reaches spendAP for no player (FINDINGS #99)', () => {
  // Found on 30 September 2026, checking this file's claim that no action could. An action with no
  // player that names a cell holding a free action passes the points check on that free action,
  // while the action charges a different cell, so it reaches `spendAP` for no player, and the free
  // action is not used up. No game can: nothing grants a free action (FINDINGS #29), so the state is
  // given one by hand, and the room gives every action its sender. Pinned as found, the ruled
  // difference (DEVIATIONS #9) included. Granting free actions would NOT make this fail, since it
  // hands the state its own; #29 carries the warning instead.
  it("an action with no player reaches it, let through by another cell's free action", () => {
    const family = 'ENV';
    const noPointsNkFree = (g: GameState): void => {
      const s = g as unknown as { free: Record<string, number>; apBudget: Record<string, number> };
      s.free = { nk: 1 };
      s.apBudget = { P1: 0, P2: 0, P3: 0 };
    };
    for (const seed of SEEDS) {
      const steps: Step[] = [
        ...OPEN,
        { action: 'confirmAllocation', pid: 'P1' },
        noPointsNkFree,
        { action: 'produce', cell: 'nk', family },
      ];
      const l = play(legacy, seed, steps);
      const p = play(portEngine, seed, steps);
      expect(p.results.map((r) => canonical(r))).toEqual(l.results.map((r) => canonical(r)));
      expect(lastError(p)).toBeUndefined();
      const lg = l.g as unknown as { apBudget: Record<string, number> };
      const pg = p.g as unknown as {
        apBudget: Record<string, number>;
        free: Record<string, number>;
        made: Record<string, number>;
      };
      expect(lg.apBudget).toEqual({ P1: 0, P2: 0, P3: 0, null: 0 });
      expect(pg.apBudget).toEqual({ P1: 0, P2: 0, P3: 0 });
      expect(pg.made[family]).toBe(1);
      expect(pg.free).toEqual({ nk: 1 });
      // Past the budget named "null", the two states are the same to the byte.
      delete lg.apBudget['null'];
      expect(canonical(withoutSnapshotBudgets(p.g)), `seed ${String(seed)}`).toBe(canonical(l.g));
    }
  });
});
