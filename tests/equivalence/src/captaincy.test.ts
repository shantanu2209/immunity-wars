/**
 * DEVIATIONS #7 — `handOverCaptaincy`, and the evidence it is confined (docs/FINDINGS.md #78).
 *
 * The one engine addition of Phase 3, ruled by Shantanu on 21 September 2026: the room passes the
 * captaincy on when a captain drops, and without a way to tell the engine, a captain dropping
 * mid-game stalled the table. Legacy has no such action.
 *
 * The corpus is single-player and never sends it, so the corpus's silence is not evidence — the
 * same argument DEVIATIONS #4 makes. So this file supplies both halves directly:
 *
 * - **What changed:** legacy refuses the action (it does not exist there); the port hands over,
 *   with the unallocated pool during allocation and without it after.
 * - **What did not:** every other multiplayer path, run with the same seed through both engines,
 *   stays byte-identical — the addition only answers to its own action name.
 */

import { describe, expect, it } from 'vitest';

import * as port from '@immunity-wars/engine';

import { loadLegacy } from './engine.js';
import { canonical } from './hash.js';
import { installRng, restoreRng } from './rng.js';
import type { Action, Engine, GameState } from './types.js';

const legacy = loadLegacy();
const portEngine = port as unknown as Engine;

const CFG = {
  difficulty: 'normal',
  science: false,
  multiplayer: true,
  captain: 'P1',
  players: ['P1', 'P2', 'P3'],
};

function play(E: Engine, seed: number, actions: Action[]): { g: GameState; results: unknown[] } {
  installRng(seed);
  try {
    const g = E.newGame(CFG) as GameState;
    const results = actions.map((a) => E.applyAction(g, a));
    return { g, results };
  } finally {
    restoreRng();
  }
}

const OPEN: Action[] = [
  { action: 'draw', pid: 'P1' },
  { action: 'beginCommand', pid: 'P1' },
];

const hand = (from: string, to: string): Action => ({
  action: 'handOverCaptaincy',
  pid: from,
  toPid: to,
});

describe('DEVIATIONS #7: handOverCaptaincy tells the engine the room has a new captain', () => {
  it('legacy has no such action and refuses it; the port hands over', () => {
    const l = play(legacy, 7, [...OPEN, hand('P1', 'P2')]);
    const p = play(portEngine, 7, [...OPEN, hand('P1', 'P2')]);
    expect((l.results.at(-1) as { ok: boolean }).ok).toBe(false);
    expect((p.results.at(-1) as { ok: boolean }).ok).toBe(true);
    expect(p.g.captain).toBe('P2');
  });

  it('moves the unallocated pool with the captaincy during allocation', () => {
    const { g } = play(portEngine, 11, OPEN);
    const pool = (g.apBudget as Record<string, number>)['P1'] ?? 0;
    expect(pool).toBeGreaterThan(0);
    expect(portEngine.applyAction(g, hand('P1', 'P2')).ok).toBe(true);
    expect((g.apBudget as Record<string, number>)['P2']).toBe(pool);
    expect((g.apBudget as Record<string, number>)['P1']).toBe(0);
    // And the new captain can now do what only a captain can.
    expect(portEngine.applyAction(g, { action: 'confirmAllocation', pid: 'P2' }).ok).toBe(true);
  });

  it("leaves a player's budget alone in command, where it is theirs to spend", () => {
    const { g } = play(portEngine, 13, [
      ...OPEN,
      { action: 'allocateAP', pid: 'P1', toPid: 'P3', amount: 1 },
      { action: 'confirmAllocation', pid: 'P1' },
    ]);
    const before = { ...(g.apBudget as Record<string, number>) };
    expect(portEngine.applyAction(g, hand('P1', 'P2')).ok).toBe(true);
    expect(g.apBudget).toEqual(before);
    expect(portEngine.applyAction(g, { action: 'endCommand', pid: 'P2' }).ok).toBe(true);
  });

  it('refuses anyone but the captain, so no player can seize the captaincy with it', () => {
    const { g } = play(portEngine, 17, OPEN);
    const r = portEngine.applyAction(g, hand('P2', 'P2'));
    expect(r.ok).toBe(false);
    expect(g.captain).toBe('P1');
  });

  it('refuses a player who is not in the game', () => {
    const { g } = play(portEngine, 19, OPEN);
    expect(portEngine.applyAction(g, hand('P1', 'ghost')).ok).toBe(false);
    expect(g.captain).toBe('P1');
  });

  it('is a no-op, and a success, when handed to the captain already holding it', () => {
    const { g } = play(portEngine, 23, OPEN);
    const before = canonical(g);
    expect(portEngine.applyAction(g, hand('P1', 'P1')).ok).toBe(true);
    expect(canonical(g)).toBe(before);
  });
});

describe('DEVIATIONS #7 is confined: nothing else moved', () => {
  it('every other multiplayer path is still byte-identical to legacy', () => {
    const sequences: Action[][] = [
      OPEN,
      [...OPEN, { action: 'allocateAP', pid: 'P1', toPid: 'P2', amount: 2 }],
      [
        ...OPEN,
        { action: 'allocateAP', pid: 'P1', toPid: 'P3', amount: 1 },
        { action: 'returnAP', pid: 'P3', amount: 1 },
        { action: 'confirmAllocation', pid: 'P1' },
      ],
      [...OPEN, { action: 'confirmAllocation', pid: 'P1' }, { action: 'endCommand', pid: 'P1' }],
      [...OPEN, { action: 'confirmAllocation', pid: 'P2' }],
      [
        { action: 'draw', pid: 'P1' },
        { action: 'beginCommand', pid: 'P2' },
      ],
    ];
    for (const seq of sequences) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const l = play(legacy, seed, seq);
        const p = play(portEngine, seed, seq);
        expect(canonical(p.g), `seed ${String(seed)}`).toBe(canonical(l.g));
        expect(p.results.map((r) => canonical(r))).toEqual(l.results.map((r) => canonical(r)));
      }
    }
  });
});
