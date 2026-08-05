/**
 * DEVIATIONS #4 — the `returnAP` pid-validation fix, and the evidence it is confined.
 *
 * The equivalence corpus is single-player, so it never issues `returnAP` and cannot speak to
 * this change at all. Absence of corpus divergence is therefore NOT evidence here — it is just
 * silence. This file supplies the missing half: every legal multiplayer allocation path is
 * compared against legacy directly, and only the unknown-pid path is allowed to differ.
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

function run(
  E: Engine,
  seed: number,
  actions: Action[],
): { state: string; results: string[]; budget: Record<string, number> } {
  installRng(seed);
  try {
    const g = E.newGame(CFG) as GameState;
    const results: string[] = [];
    for (const a of actions) results.push(canonical(E.applyAction(g, a)));
    // apBudget specifically, not the whole state: applyAction records the acting pid in
    // g._actingPid regardless of whether the action succeeded, so searching the serialised state
    // for a pid finds it either way. The question is whether a BUDGET ENTRY was created.
    return {
      state: canonical(g),
      results,
      budget: { ...(g.apBudget as Record<string, number>) },
    };
  } finally {
    restoreRng();
  }
}

const OPEN: Action[] = [
  { action: 'draw', pid: 'P1' },
  { action: 'beginCommand', pid: 'P1' },
];

describe('DEVIATIONS #4: returnAP now validates its pid, exactly as allocateAP always did', () => {
  it('every LEGAL allocation sequence is still identical to legacy', () => {
    const sequences: Action[][] = [
      // give and take back
      [
        ...OPEN,
        { action: 'allocateAP', pid: 'P1', toPid: 'P2', amount: 3 },
        { action: 'returnAP', pid: 'P2', amount: 2 },
      ],
      // return everything
      [
        ...OPEN,
        { action: 'allocateAP', pid: 'P1', toPid: 'P3', amount: 2 },
        { action: 'returnAP', pid: 'P3', amount: 2 },
      ],
      // return zero — the exact shape that used to write NaN, but for a REAL player
      [
        ...OPEN,
        { action: 'allocateAP', pid: 'P1', toPid: 'P2', amount: 1 },
        { action: 'returnAP', pid: 'P2', amount: 0 },
      ],
      // return more than held — must still be refused, with the same string
      [
        ...OPEN,
        { action: 'allocateAP', pid: 'P1', toPid: 'P2', amount: 1 },
        { action: 'returnAP', pid: 'P2', amount: 9 },
      ],
      // a player who was allocated nothing returning zero
      [...OPEN, { action: 'returnAP', pid: 'P3', amount: 0 }],
      // the captain cannot return to themselves
      [...OPEN, { action: 'returnAP', pid: 'P1', amount: 1 }],
      // out of phase
      [{ action: 'returnAP', pid: 'P2', amount: 1 }],
      // through to command
      [
        ...OPEN,
        { action: 'allocateAP', pid: 'P1', toPid: 'P2', amount: 2 },
        { action: 'returnAP', pid: 'P2', amount: 1 },
        { action: 'confirmAllocation', pid: 'P1' },
      ],
    ];

    for (let i = 0; i < sequences.length; i += 1) {
      const seq = sequences[i];
      if (!seq) continue;
      for (let s = 0; s < 5; s += 1) {
        const a = run(legacy, 990000 + s, seq);
        const b = run(portEngine, 990000 + s, seq);
        expect(b.results, `sequence ${i}, seed ${990000 + s}: results`).toEqual(a.results);
        expect(b.state, `sequence ${i}, seed ${990000 + s}: state`).toBe(a.state);
      }
    }
  });

  it('the ONLY divergence is the unknown pid, and legacy really did write NaN', () => {
    const seq: Action[] = [...OPEN, { action: 'returnAP', pid: 'ghost', amount: 0 }];

    const a = run(legacy, 991000, seq);
    const b = run(portEngine, 991000, seq);

    // Legacy: accepted, and poisoned the budget map.
    expect(a.results[2]).toBe(canonical({ ok: true }));
    expect(Number.isNaN(a.budget.ghost), 'legacy writes a NaN budget entry').toBe(true);

    // Port: refused, with allocateAP's own wording, and no budget entry created.
    expect(b.results[2]).toBe(canonical({ ok: false, error: 'Unknown player.' }));
    expect('ghost' in b.budget, 'the port creates no budget entry at all').toBe(false);
    // Every real player's budget is untouched by the refusal.
    expect(b.budget.P1).toBe(a.budget.P1);
    expect(b.budget.P2).toBe(a.budget.P2);
    expect(b.budget.P3).toBe(a.budget.P3);
  });

  it('an unknown pid returning a NON-zero amount was already refused, and still is', () => {
    // The old guard caught this case — (undefined || 0) < 1 is true — so it is not a behaviour
    // change. Asserted so the fix is known to be narrow rather than assumed to be.
    const seq: Action[] = [...OPEN, { action: 'returnAP', pid: 'ghost', amount: 3 }];
    const a = run(legacy, 992000, seq);
    const b = run(portEngine, 992000, seq);
    expect(a.results[2]).toBe(
      canonical({ ok: false, error: "You don't have that much AP to return." }),
    );
    expect(b.results[2]).toBe(canonical({ ok: false, error: 'Unknown player.' }));
    // Different STRING, same refusal — and the port's is the one allocateAP already used.
    expect('ghost' in a.budget, 'legacy created no budget entry on this path either').toBe(false);
    expect('ghost' in b.budget).toBe(false);
  });

  it('allocateAP is unchanged — the fix only made returnAP match it', () => {
    const seq: Action[] = [...OPEN, { action: 'allocateAP', pid: 'P1', toPid: 'ghost', amount: 1 }];
    const a = run(legacy, 993000, seq);
    const b = run(portEngine, 993000, seq);
    expect(b.results).toEqual(a.results);
    expect(b.state).toBe(a.state);
    expect(a.results[2]).toBe(canonical({ ok: false, error: 'Unknown player.' }));
  });
});
