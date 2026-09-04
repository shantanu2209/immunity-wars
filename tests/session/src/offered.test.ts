/**
 * THE STANDING RULE, AS A CHECK: every action the UI OFFERS, the engine ACCEPTS.
 *
 * "Offer only legal targets from the view's queries, so rejections are rare because illegal
 * options are not offered" (Shantanu, 4 September 2026) is a rule about a function —
 * `offeredActions(view)` in packages/ui — and a rule about a function can be tested against
 * the oracle it is supposed to agree with. This replays recorded bot games, and at every
 * command-phase state, for every cell, applies every offer to a clone of the state through
 * the engine. An offer the engine rejects fails the suite, naming the action and the reason.
 *
 * The negative control below is a deliberate over-offer — every invader offered to the Killer
 * T-Cell — which must produce rejections. A check that has never failed is not known to work.
 *
 * The test spans the ui → session → engine join the way a player's tap does; it is the kind
 * of test FINDINGS #50 asked for.
 */

import { describe, expect, it } from 'vitest';

import * as engine from '@immunity-wars/engine';
import { botGame } from '@immunity-wars/equivalence/bot';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import type { Engine, GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage, type SessionView } from '@immunity-wars/session';
import { offeredActions, type Offered } from '@immunity-wars/ui';

const PORT = engine as unknown as Engine;
const CELLS = ['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil'];
const SEEDS = [0x51de, 0x7f2a, 0x1234];
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Command-phase states along a recorded bot game. */
function commandStates(seed: number, difficulty: string, maxActions: number): GameState[] {
  const states: GameState[] = [];
  installRng(seed);
  try {
    const g = PORT.newGame({ difficulty, science: false }) as GameState;
    botGame(
      PORT,
      g,
      (a) => {
        const r = PORT.applyAction(g, a);
        if ((g as unknown as Record<string, unknown>)['phase'] === 'command') states.push(clone(g));
        return r;
      },
      maxActions,
    );
  } finally {
    restoreRng();
  }
  return states;
}

interface Verdict {
  offers: number;
  rejected: { action: string; cell: string | null; error: string }[];
}

/** Apply every offer `offer(view)` makes for every cell of `state` to a clone, through the engine. */
function judge(state: GameState, offer: (view: SessionView) => Offered): Verdict {
  const verdict: Verdict = { offers: 0, rejected: [] };
  const pid = ((state as unknown as Record<string, unknown>)['players'] as string[])[0] ?? '';
  for (const cell of CELLS) {
    const s = LocalSession.resume(clone(state), { storage: new MemoryStorage(), now: () => 0 });
    s.setSelection({ cell, family: null });
    const offered = offer(s.getView());
    s.dispose();
    for (const o of [...offered.board, ...offered.buttons]) {
      verdict.offers += 1;
      const g2 = clone(state);
      installRng(1);
      try {
        const r = PORT.applyAction(g2, { ...o.params, pid } as never) as {
          ok: boolean;
          error?: string;
        };
        if (!r.ok) verdict.rejected.push({ action: o.action, cell: o.cell, error: r.error ?? '' });
      } finally {
        restoreRng();
      }
    }
  }
  return verdict;
}

describe('offered ⊆ accepted — the standing rule as a check', () => {
  it('every offer the UI makes, the engine accepts, across recorded games on every difficulty', () => {
    let offers = 0;
    let states = 0;
    const rejected: string[] = [];
    for (const seed of SEEDS) {
      for (const difficulty of ['training', 'normal', 'hard']) {
        for (const st of commandStates(seed, difficulty, 80)) {
          states += 1;
          const v = judge(st, offeredActions);
          offers += v.offers;
          for (const r of v.rejected) {
            rejected.push(`${difficulty}/${seed}: ${r.cell ?? 'body'} ${r.action} — ${r.error}`);
          }
        }
      }
    }
    // Vacuity guards: a green run over nothing is not a pass.
    expect(states, 'no command-phase states were reached').toBeGreaterThan(50);
    expect(offers, 'nothing was offered anywhere — the offer function is inert').toBeGreaterThan(
      200,
    );
    expect(
      rejected,
      `the UI offered what the engine rejects:\n  ${rejected.slice(0, 12).join('\n  ')}`,
    ).toEqual([]);
  });

  it('CONTROL: a deliberate over-offer is caught', () => {
    // The Killer T-Cell offered EVERY invader, not just snipeTargets. Some must be rejected.
    const overOffer = (view: SessionView): Offered => {
      const base = offeredActions(view);
      if (view.selection.cell !== 'tcell') return base;
      const invaders = (view.game['invaders'] as { id?: unknown }[] | undefined) ?? [];
      return {
        ...base,
        board: [
          ...base.board,
          ...invaders.map((iv) => ({
            id: `over:${String(iv.id)}`,
            kind: 'attack' as const,
            action: 'snipe',
            cell: 'tcell',
            invaderId: String(iv.id),
            label: 'over-offer',
            cost: null,
            params: { action: 'snipe', cell: 'tcell', invaderId: String(iv.id) },
          })),
        ],
      };
    };
    let rejected = 0;
    for (const st of commandStates(0x51de, 'normal', 80))
      rejected += judge(st, overOffer).rejected.length;
    expect(
      rejected,
      'the over-offer produced no rejection — this check cannot fail',
    ).toBeGreaterThan(0);
  });
});
