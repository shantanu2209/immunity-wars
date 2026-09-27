/**
 * DEVIATIONS #8 — undo gives a player's Action Points back in a game played together, and the
 * evidence it is confined (docs/FINDINGS.md #95).
 *
 * Ruled by Shantanu on 27 September 2026 (*"Go with A"*). Played together, a player spends from their
 * own budget (`apBudget`), and legacy's undo snapshot never held the budgets: an undo put the piece
 * back and kept its point spent, which defeats the only reason a player asks for it.
 *
 * The corpus is single-player, so its silence is not evidence of confinement — the argument
 * DEVIATIONS #4 and #7 make. So this file supplies both halves directly:
 *
 * - **What changed:** after a move and an undo, legacy's budget stays one short and the port's is
 *   back; the piece is back in both.
 * - **What did not:** alone, a snapshot never carries the budgets, and a move and its undo are
 *   legacy's to the byte. Together, with the snapshots' budgets set aside, every path, moves and
 *   ends of turn included, is byte-identical to legacy. The snapshots are the only other place the
 *   change shows, and they are exactly where it was made.
 */

import { describe, expect, it } from 'vitest';

import * as port from '@immunity-wars/engine';

import { loadLegacy } from './engine.js';
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
const ALONE = { difficulty: 'normal', science: false };

type Cfg = Record<string, unknown>;

function play(
  E: Engine,
  cfg: Cfg,
  seed: number,
  actions: Action[],
): { g: GameState; results: unknown[] } {
  installRng(seed);
  try {
    const g = E.newGame(cfg) as GameState;
    const results = actions.map((a) => E.applyAction(g, a));
    return { g, results };
  } finally {
    restoreRng();
  }
}

const OPEN: Action[] = [
  { action: 'draw', pid: 'P1' },
  { action: 'beginCommand', pid: 'P1' },
  { action: 'allocateAP', pid: 'P1', toPid: 'P2', amount: 2 },
  { action: 'confirmAllocation', pid: 'P1' },
];

/** The first move off the bloodstream for `cell`, read from the port's own state after `before`. */
function firstMove(cfg: Cfg, seed: number, before: Action[], cell: string, pid?: string): Action {
  const { g } = play(portEngine, cfg, seed, before);
  const d = portEngine
    .moveDestinations(g, cell)
    .find((x) => (x as unknown as { zone?: string }).zone !== 'hub') as unknown as
    Record<string, unknown> | undefined;
  if (!d) throw new Error(`no move for ${cell} at seed ${String(seed)}`);
  return {
    action: 'move',
    cell,
    zone: d['zone'],
    lane: d['lane'],
    organ: d['organ'],
    step: d['step'],
    ...(pid ? { pid } : {}),
  };
}

const budget = (g: GameState, pid: string): number =>
  (g.apBudget as Record<string, number>)[pid] ?? 0;

/** A state with its undo snapshots' budgets set aside: the one field the port adds, together. */
function withoutSnapshotBudgets(g: GameState): unknown {
  const copy = JSON.parse(JSON.stringify(g)) as GameState & { undo?: Record<string, unknown>[] };
  for (const s of copy.undo ?? []) delete s['apBudget'];
  return copy;
}

describe('DEVIATIONS #8: undo gives the points back in a game played together', () => {
  it("legacy's undo keeps the point spent; the port's gives it back, and the piece is back in both", () => {
    for (const seed of [3, 5, 8]) {
      const move = firstMove(TOGETHER, seed, OPEN, 'nk', 'P2');
      const undo: Action = { action: 'undo', pid: 'P2' };
      const l = play(legacy, TOGETHER, seed, [...OPEN, move, undo]);
      const p = play(portEngine, TOGETHER, seed, [...OPEN, move, undo]);
      const opened = play(portEngine, TOGETHER, seed, OPEN).g;
      expect(budget(p.g, 'P2'), `seed ${String(seed)}`).toBe(budget(opened, 'P2'));
      expect(budget(l.g, 'P2'), `seed ${String(seed)}`).toBe(budget(opened, 'P2') - 1);
      expect(canonical(p.g.cells)).toBe(canonical(opened.cells));
      expect(canonical(l.g.cells)).toBe(canonical(p.g.cells));
    }
  });

  it('saves the budgets in a snapshot together, and never alone', () => {
    const together = play(portEngine, TOGETHER, 3, OPEN).g;
    portEngine.pushUndo(together);
    expect(Object.keys((together.undo as unknown[]).at(-1) as object)).toContain('apBudget');
    const alone = play(portEngine, ALONE, 3, [{ action: 'draw' }, { action: 'beginCommand' }]).g;
    portEngine.pushUndo(alone);
    expect(Object.keys((alone.undo as unknown[]).at(-1) as object)).not.toContain('apBudget');
  });
});

describe('DEVIATIONS #8 is confined: nothing else moved', () => {
  it('alone, a move and its undo are byte-identical to legacy', () => {
    const open: Action[] = [{ action: 'draw' }, { action: 'beginCommand' }];
    for (const seed of [1, 2, 3, 4, 5]) {
      const move = firstMove(ALONE, seed, open, 'macrophage');
      const seq = [...open, move, { action: 'undo' }];
      const l = play(legacy, ALONE, seed, seq);
      const p = play(portEngine, ALONE, seed, seq);
      expect(canonical(p.g), `seed ${String(seed)}`).toBe(canonical(l.g));
      expect(p.results.map((r) => canonical(r))).toEqual(l.results.map((r) => canonical(r)));
    }
  });

  it("together, with the snapshots' budgets set aside, every path without an undo is byte-identical to legacy", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const move = firstMove(TOGETHER, seed, OPEN, 'nk', 'P2');
      const sequences: Action[][] = [
        OPEN,
        [...OPEN, move],
        [...OPEN, move, { action: 'endCommand', pid: 'P1' }],
        [...OPEN, move, { ...move }],
      ];
      for (const seq of sequences) {
        const l = play(legacy, TOGETHER, seed, seq);
        const p = play(portEngine, TOGETHER, seed, seq);
        expect(canonical(withoutSnapshotBudgets(p.g)), `seed ${String(seed)}`).toBe(canonical(l.g));
        expect(p.results.map((r) => canonical(r))).toEqual(l.results.map((r) => canonical(r)));
      }
    }
  });
});
