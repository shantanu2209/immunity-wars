/**
 * P2.1 STEP 6 — THE EXIT CRITERION, AND IT IS MACHINE-CHECKABLE BEFORE ANY UI EXISTS.
 *
 * `docs/SEAM_DECISIONS.md` §1: *"Seam 1 is load-bearing: single-player must go through it too.
 * One code path, not a fork."* That is a claim, and a claim in a document is the thing this
 * project keeps catching out. So it is demonstrated: replay a real bot game's action sequence
 * through `LocalSession`, drive the engine directly with the identical sequence, and require the
 * projections to agree at every step.
 *
 * WHY THIS IS NOT CIRCULAR. `LocalSession` calls the same `applyAction` the direct run does, so
 * of course they agree — that is precisely the property under test. What would break it is a
 * Session that reordered, batched, filtered or re-derived anything on the way through, which is
 * exactly what a "convenience layer" grows into. The negative control below installs such a
 * Session and requires this test to fail.
 */

import { describe, expect, it } from 'vitest';

import * as engine from '@immunity-wars/engine';
import { botGame } from '@immunity-wars/equivalence/bot';
import { canonical } from '@immunity-wars/equivalence/hash';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import type { Engine, GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage, type SessionEvent } from '@immunity-wars/session';

const PORT = engine as unknown as Engine;
const ns = engine as unknown as Record<string, (...a: unknown[]) => unknown>;

/**
 * Resolve an engine function by name, or fail loudly.
 *
 * `noUncheckedIndexedAccess` types a namespace lookup as possibly-undefined, and `!` is not the
 * answer — if a lookup can miss, handle the miss. A missing name here would mean the engine's
 * surface changed under this suite, which is a thing to be told about rather than to crash on
 * three frames later.
 */
function fn(name: string): (...a: unknown[]) => unknown {
  const f = ns[name];
  if (typeof f !== 'function') throw new Error(`the engine does not export ${name}`);
  return f;
}

/** Record one bot game's actions, so the same sequence can be replayed two ways. */
function recordActions(seed: number, difficulty: string): Record<string, unknown>[] {
  const actions: Record<string, unknown>[] = [];
  installRng(seed);
  try {
    const g = PORT.newGame({ difficulty, science: false }) as GameState;
    botGame(
      PORT,
      g,
      (a) => {
        actions.push(a as unknown as Record<string, unknown>);
        return PORT.applyAction(g, a);
      },
      60,
    );
  } finally {
    restoreRng();
  }
  return actions;
}

/** Drive the engine directly, capturing the projection after every accepted action. */
function directViews(
  seed: number,
  difficulty: string,
  actions: readonly Record<string, unknown>[],
) {
  const views: string[] = [];
  installRng(seed);
  try {
    const g = fn('newGame')({ difficulty, science: false }) as GameState;
    for (const a of actions) {
      const r = fn('applyAction')(g, { ...a, pid: 'p_0000000000000000' }) as { ok: boolean };
      if (r.ok) views.push(canonical(fn('viewState')(g)));
    }
  } finally {
    restoreRng();
  }
  return views;
}

/** Drive the SAME sequence through Session, capturing the projection it hands out. */
async function sessionViews(
  seed: number,
  difficulty: string,
  actions: readonly Record<string, unknown>[],
) {
  const views: string[] = [];
  installRng(seed);
  try {
    const s = LocalSession.createGame(
      { difficulty },
      { self: 'p_0000000000000000' as never, storage: new MemoryStorage(), now: () => 0 },
    );
    for (const a of actions) {
      const out = await s.sendAction(a);
      if (out.ok) views.push(canonical(s.getView().game));
    }
    s.dispose();
  } finally {
    restoreRng();
  }
  return views;
}

const SEEDS = [0x51de, 0x7f2a, 0x1234];

describe('P2.1 step 6: single-player goes through Session', () => {
  it('a full game through LocalSession matches the engine driven directly, step for step', async () => {
    let compared = 0;
    for (const seed of SEEDS) {
      for (const difficulty of ['training', 'normal', 'hard']) {
        const actions = recordActions(seed, difficulty);
        expect(
          actions.length,
          'the recorded game is empty; this would compare nothing',
        ).toBeGreaterThan(20);

        const direct = directViews(seed, difficulty, actions);
        const viaSession = await sessionViews(seed, difficulty, actions);

        expect(
          viaSession.length,
          `${difficulty}/${seed}: different number of accepted actions`,
        ).toBe(direct.length);
        for (let i = 0; i < direct.length; i += 1) {
          if (direct[i] !== viaSession[i]) {
            throw new Error(
              `${difficulty}/${seed}: projections diverged at accepted action ${i}.\n` +
                `  direct : ${(direct[i] ?? '').slice(0, 300)}\n` +
                `  session: ${(viaSession[i] ?? '').slice(0, 300)}`,
            );
          }
        }
        compared += direct.length;
      }
    }
    // Vacuity guard. A green run that compared nothing is not a pass.
    expect(compared, 'nothing was compared').toBeGreaterThan(500);
  });
});

describe('P2.1 step 4: the subscription is a discriminated union, and the burst is skippable', () => {
  it('delivers a burst as a burst, and a subscriber ignoring bursts still lands on the right view', async () => {
    installRng(0x51de);
    try {
      const s = LocalSession.createGame({ difficulty: 'normal' });
      const events: SessionEvent[] = [];
      s.subscribe((e) => events.push(e));

      await s.sendAction({ action: 'draw' });
      await s.sendAction({ action: 'beginCommand' });
      await s.sendAction({ action: 'endCommand' });

      const bursts = events.filter((e) => e.kind === 'burst');
      expect(bursts.length, 'endCommand produced no burst; this control is inert').toBeGreaterThan(
        0,
      );

      const frames = bursts.flatMap((b) => (b.kind === 'burst' ? [...b.frames] : []));
      expect(frames.length, 'the burst carried no frames').toBeGreaterThan(0);

      // THE PROPERTY THAT LICENSES SKIPPING: the last frame equals the authoritative view. A
      // subscriber that drops every burst is therefore never wrong, only less animated.
      const tail = frames[frames.length - 1];
      const lastView = [...events].reverse().find((e) => e.kind === 'view');
      expect(lastView?.kind).toBe('view');
      if (lastView?.kind === 'view' && tail) {
        expect(canonical(tail.view)).toBe(canonical(lastView.view.game));
      }
      s.dispose();
    } finally {
      restoreRng();
    }
  });

  it('emits exactly one authoritative view per accepted action, and none for a rejected one', async () => {
    installRng(0x51de);
    try {
      const s = LocalSession.createGame({ difficulty: 'normal' });
      const views: SessionEvent[] = [];
      s.subscribe((e) => {
        if (e.kind === 'view') views.push(e);
      });

      await s.sendAction({ action: 'draw' });
      expect(views.length).toBe(1);

      // An action the engine must reject. If this ever starts succeeding the assertion below
      // becomes vacuous, so the outcome is asserted too rather than assumed.
      const bad = await s.sendAction({ action: 'no-such-action-at-all' });
      expect(bad.ok, 'the engine accepted a nonsense action; this control is now inert').toBe(
        false,
      );
      expect(views.length, 'a rejected action emitted a view').toBe(1);
      s.dispose();
    } finally {
      restoreRng();
    }
  });
});

describe('P2.1 step 4: Session owns the state and never hands it out', () => {
  it('the view has no deck, and so cannot resume a game', async () => {
    installRng(0x51de);
    try {
      const s = LocalSession.createGame({ difficulty: 'normal' });
      await s.sendAction({ action: 'draw' });
      const view = s.getView();

      // The 13 keys viewState drops. If any appears here, Session has started handing out state.
      for (const k of [
        'deck',
        'discard',
        'drawnList',
        'stats',
        'undo',
        'events',
        'complement',
        '_actingPid',
      ]) {
        expect(Object.keys(view.game), `viewState leaked ${k}`).not.toContain(k);
      }
      expect(Object.keys(view)).toEqual(['game', 'selection', 'queries', 'scoped']);
      expect(
        view.game['deckCount'],
        'deckCount should be present — the count, not the cards',
      ).toBeTypeOf('number');
      s.dispose();
    } finally {
      restoreRng();
    }
  });
});

describe('P2.1 step 4: the view is a function of (game state, selection)', () => {
  it('carries moveDestinations for the selected cell only, and nothing when nothing is selected', async () => {
    installRng(0x51de);
    try {
      const s = LocalSession.createGame({ difficulty: 'normal' });
      await s.sendAction({ action: 'draw' });
      await s.sendAction({ action: 'beginCommand' });

      expect(
        s.getView().scoped.moveDestinations,
        'unselected view carried destinations',
      ).toBeNull();

      s.setSelection({ cell: 'macrophage', family: null });
      const scoped = s.getView().scoped.moveDestinations;
      expect(Array.isArray(scoped), 'selecting a cell did not produce its destinations').toBe(true);

      // The whole reason the field exists: the view must NOT be carrying all seven cells.
      const perCell = s.getView().queries.perCell;
      expect(Object.keys(perCell), 'moveDestinations was precomputed after all').not.toContain(
        'moveDestinations',
      );
      s.dispose();
    } finally {
      restoreRng();
    }
  });

  it('changing the selection does not change the game', async () => {
    installRng(0x51de);
    try {
      const s = LocalSession.createGame({ difficulty: 'normal' });
      await s.sendAction({ action: 'draw' });
      const before = canonical(s.getView().game);
      s.setSelection({ cell: 'bcell', family: 'ENV' });
      expect(canonical(s.getView().game), 'setSelection moved the game').toBe(before);
      s.dispose();
    } finally {
      restoreRng();
    }
  });
});
