/**
 * ITEM 12 — THE PLANNING SCREEN'S MODEL, ON RECORDED STATES.
 *
 * The screen is view-only with one action, so the standing rule has one thing to check: the
 * button it shows sends what the engine accepts NEXT. At every planning moment along recorded
 * bot games (the infection phase with a card drawn), `beginCommand` is applied to a clone and
 * must be accepted into the command phase; the control applies the same button where it must
 * be REJECTED (a command-phase state), so the acceptance check is known to be able to fail.
 *
 * The summary's honesty is arithmetic: every invader in the body is in exactly one row, the
 * counts by type add up to the same total, and each row's depth is the depth of its members'
 * own location. Vacuity guards: many planning moments, every depth seen, some row stacked.
 *
 * The Phase 3 allocation slot is checked on a view constructed to carry the allocation phase
 * — single-player never reaches it, and the slot must still be designed in rather than found
 * missing when Phase 3 arrives.
 */

import { describe, expect, it } from 'vitest';

import { DZINFO } from '@immunity-wars/content';
import * as engine from '@immunity-wars/engine';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import type { Engine, GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage, type SessionView } from '@immunity-wars/session';
import { depthOf, planningModel } from '@immunity-wars/ui';

import { SEARCH_SEEDS, clone, commandStates, planningStates } from './constructed.js';

const PORT = engine as unknown as Engine;
type Raw = Record<string, unknown>;

function view(state: GameState): SessionView {
  const s = LocalSession.resume(clone(state), { storage: new MemoryStorage(), now: () => 0 });
  const v = s.getView();
  s.dispose();
  return v;
}

/** Apply an action to a clone under a fixed RNG: whether the engine accepted it, and the phase after. */
function applied(state: GameState, params: Raw): { ok: boolean; phase: string } {
  const g = clone(state);
  installRng(1);
  try {
    const r = PORT.applyAction(g, params as never) as { ok: boolean };
    return { ok: r.ok, phase: String((g as unknown as Raw)['phase']) };
  } finally {
    restoreRng();
  }
}

describe('item 12: the planning screen model', () => {
  const plans: { st: GameState; v: SessionView }[] = [];
  const commands: GameState[] = [];
  for (const seed of SEARCH_SEEDS.slice(0, 3)) {
    for (const difficulty of ['training', 'normal', 'hard']) {
      for (const st of planningStates(seed, difficulty, 80)) plans.push({ st, v: view(st) });
      commands.push(...commandStates(seed, difficulty, 40));
    }
  }
  const models = plans.map((p) => planningModel(p.v));

  it('walked real planning moments (vacuity guard)', () => {
    expect(plans.length).toBeGreaterThan(50);
    expect(commands.length).toBeGreaterThan(50);
  });

  it('is active at every planning moment, and never during command', () => {
    for (const m of models) {
      expect(m.active).toBe(true);
      expect(m.mode).toBe('plan');
    }
    for (const st of commands.slice(0, 40)) expect(planningModel(view(st)).active).toBe(false);
  });

  it('the button sends what the engine accepts next: beginCommand, into command', () => {
    for (const [i, m] of models.entries()) {
      const plan = plans[i];
      if (!plan) continue;
      expect(m.button.params).toEqual({ action: 'beginCommand' });
      const r = applied(plan.st, m.button.params);
      expect(r.ok, `turn ${String(plan.st.turn)}: beginCommand rejected`).toBe(true);
      expect(r.phase).toBe('command');
    }
  });

  it('control: the same button on a command-phase state is REJECTED — the check can fail', () => {
    let rejected = 0;
    for (const st of commands.slice(0, 20)) {
      if (!applied(st, { action: 'beginCommand' }).ok) rejected += 1;
    }
    expect(rejected).toBe(Math.min(20, commands.length));
  });

  it('every invader is in exactly one row, and the counts by type add up', () => {
    const depths = new Set<string>();
    let stacked = 0;
    for (const m of models) {
      expect(m.placed, 'rows do not account for every invader').toBe(m.total);
      expect(m.byType.reduce((s, c) => s + c.count, 0)).toBe(m.total);
      for (const grp of m.groups) {
        depths.add(grp.depth);
        if (grp.count >= 2) stacked += 1;
      }
    }
    expect([...depths].sort()).toEqual(['blood', 'entry', 'organ']);
    expect(
      stacked,
      'no stacked row ever occurred — the badge path was never exercised',
    ).toBeGreaterThan(0);
  });

  it("each row's depth is its members' own depth, and depth follows the zone", () => {
    expect(depthOf({ zone: 'branch', organ: 'liver', step: 2 })).toBe('organ');
    expect(depthOf({ zone: 'branch', organ: 'liver', step: 0 })).toBe('organ');
    expect(depthOf({ zone: 'hub' })).toBe('blood');
    expect(depthOf({ zone: 'route', lane: 'nose', step: 3 })).toBe('entry');
    expect(depthOf({ zone: 'route', lane: 'nose', step: 0 })).toBe('blood');
    for (const [i, m] of models.entries()) {
      const invaders = ((plans[i]?.st as unknown as Raw)['invaders'] as Raw[] | undefined) ?? [];
      for (const grp of m.groups) {
        for (const member of grp.members) {
          const iv = invaders.find((x) => String(x['id']) === member.id);
          expect(iv, member.id).toBeDefined();
          if (iv) expect(depthOf(iv)).toBe(grp.depth);
        }
      }
    }
    // Deepest first: the order a player plans in.
    const order = { organ: 0, blood: 1, entry: 2 } as const;
    for (const m of models) {
      for (let k = 1; k < m.groups.length; k += 1) {
        const a = m.groups[k - 1];
        const b = m.groups[k];
        if (a && b) expect(order[a.depth]).toBeLessThanOrEqual(order[b.depth]);
      }
    }
  });

  it('every pathogen a row can open a card on has a card', () => {
    for (const m of models) {
      for (const grp of m.groups) {
        for (const member of grp.members) {
          if (!member.novel) expect(DZINFO, member.disease).toHaveProperty(member.disease);
        }
      }
    }
  });

  it('the Phase 3 allocation slot: under allocation the button confirms the plan', () => {
    const base = plans[0];
    expect(base).toBeDefined();
    if (!base) return;
    const v: SessionView = {
      ...base.v,
      game: {
        ...base.v.game,
        phase: 'allocation',
        apPool: 5,
        players: ['p1', 'p2'],
        captain: 'p1',
        apBudget: { p1: 5, p2: 0 },
      },
    };
    const m = planningModel(v);
    expect(m.active).toBe(true);
    expect(m.mode).toBe('allocate');
    expect(m.button.params).toEqual({ action: 'confirmAllocation' });
    expect(m.allocation).toEqual({
      pool: 5,
      captain: 'p1',
      budgets: [
        { pid: 'p1', ap: 5 },
        { pid: 'p2', ap: 0 },
      ],
    });
    // And single-player never carries the slot.
    for (const x of models) expect(x.allocation).toBeNull();
  });
});
