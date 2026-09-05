/**
 * FINDINGS #56 — A RESUMED GAME MUST NOT REUSE AN INVADER ID.
 *
 * The engine's invader ids come from a module-level counter that `newGame` resets and that
 * no `GameState` carries. A page reload starts the counter at zero, so the first arrival after
 * resuming a saved game is `i1` — an id already in the body. Found by the planning screen's
 * walkthrough (5 September 2026), which reloaded mid-game and then counted two invaders
 * twice; every id-keyed path (attack rings, the sheet, the memory response) shares the fault.
 *
 * The session advances the counter past the save's largest id on resume. This test spans
 * the join the way the app does: `resetUid()` plays the fresh process, a recorded state is
 * resumed through `LocalSession`, the turn is played on to the next draw through the session,
 * and every id in the body must be unique. THE CONTROL drives the engine directly after the
 * same `resetUid()`, with no session in between, and requires the collision — so the check is
 * known to see the defect, and the session is known to be what prevents it.
 */

import { describe, expect, it } from 'vitest';

import * as engine from '@immunity-wars/engine';
import { resetUid } from '@immunity-wars/engine/internal';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import type { Engine, GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage } from '@immunity-wars/session';

import { SEARCH_SEEDS, clone, planningStates } from './constructed.js';

const PORT = engine as unknown as Engine;
type Raw = Record<string, unknown>;

const ids = (g: unknown): string[] =>
  (((g as Raw)['invaders'] as { id?: unknown }[] | undefined) ?? []).map((iv) => String(iv.id));
const duplicates = (xs: string[]): string[] => xs.filter((x, i) => xs.indexOf(x) !== i);

/**
 * Planning states that still hold the game's FIRST invader, `i1`, one per seed — the latest
 * such state, so the body is full. A restarted counter hands the next arrival `i1`, so the
 * collision is certain there; a state whose early invaders the bot has already killed would
 * let a restarted counter collide with nothing, and the control would be vacuous.
 */
function samples(): GameState[] {
  const out: GameState[] = [];
  for (const difficulty of ['training', 'normal', 'hard']) {
    for (const seed of SEARCH_SEEDS) {
      const st = planningStates(seed, difficulty, 80).filter(
        (s) => ids(s).includes('i1') && ids(s).length >= 2,
      );
      const pick = st[st.length - 1];
      if (pick) out.push(pick);
      if (out.length >= 4) return out;
    }
  }
  return out;
}

const TURN = ['beginCommand', 'endCommand', 'draw'] as const;

describe('FINDINGS #56: ids stay unique across a resume', () => {
  const states = samples();

  it('found states with invaders to resume from (vacuity guard)', () => {
    expect(states.length).toBeGreaterThanOrEqual(3);
  });

  it('control: the ENGINE alone, in a fresh process, hands the next arrival an id already in the body', () => {
    let collisions = 0;
    for (const st of states) {
      const g = clone(st);
      resetUid(); // the fresh process
      installRng(7);
      try {
        for (const action of TURN) PORT.applyAction(g, { action } as never);
      } finally {
        restoreRng();
      }
      if (duplicates(ids(g)).length > 0) collisions += 1;
    }
    expect(
      collisions,
      'the defect did not reproduce — the check below would be vacuous',
    ).toBeGreaterThan(0);
  });

  it('through the session, the same resume keeps every id unique', async () => {
    for (const st of states) {
      resetUid(); // the fresh process
      const s = LocalSession.resume(clone(st), { storage: new MemoryStorage(), now: () => 0 });
      installRng(7);
      try {
        for (const action of TURN) {
          const r = await s.sendAction({ action });
          if (!r.ok) break; // a game can end on the spread; what arrived before that still counts
        }
      } finally {
        restoreRng();
      }
      const after = ids(s.getView().game);
      s.dispose();
      expect(duplicates(after), `turn ${String(st.turn)}`).toEqual([]);
      expect(after.length).toBeGreaterThanOrEqual(ids(st).length - 1);
    }
  });

  it('resume never LOWERS the counter — a second live game keeps its own ids unique', async () => {
    const st = states[0];
    if (!st) return;
    // A fresh game running in the same process, then an older save resumed beside it.
    installRng(3);
    const live = LocalSession.createGame(
      { difficulty: 'training' },
      { storage: new MemoryStorage() },
    );
    await live.sendAction({ action: 'draw' });
    restoreRng();
    const before = ids(live.getView().game);
    const old = LocalSession.resume(clone(st), { storage: new MemoryStorage(), now: () => 0 });
    old.dispose();
    installRng(3);
    try {
      for (const action of TURN) await live.sendAction({ action });
    } finally {
      restoreRng();
    }
    const after = ids(live.getView().game);
    live.dispose();
    expect(duplicates(after)).toEqual([]);
    expect(after.length).toBeGreaterThanOrEqual(before.length);
  });
});
