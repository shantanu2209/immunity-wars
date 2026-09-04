/**
 * CP3 — A SELECTED RESIDENT ALWAYS ANSWERS, and the answer must help.
 *
 * The reason line for a resident macrophage follows the engine's own gate order (infected,
 * already fed, cannot patrol, no AP, nothing eatable) and is pinned here against the
 * engine's verdict on the same state: whenever the line says the resident cannot engulf, the
 * engine must refuse `resengulf` too — the line and the rule agree.
 *
 * The step-0 line is the one that earns its place: FINDINGS #5 measured that a resident at
 * its organ can never eat anything and the bot never worked that out; the interface now says
 * "patrol it up its branch". The two rulings of 4 September 2026 are pinned too: an INFECTED
 * resident is still offered patrol (the engine accepts it; withholding it would make the UI
 * a second rules source), and engulf is offered as rings per pathogen.
 *
 * States: a fresh game driven through the engine, plus a corpus state patrolled to a meal
 * (`constructed.ts`). Two variants — infected, and residents unable to move — are set on a
 * clone by hand, because no recorded game reaches them; they test the UI's mapping, and the
 * engine's rejection on the same clone is asserted alongside so the hand-set state is still
 * judged by the oracle.
 */

import { describe, expect, it } from 'vitest';

import * as engine from '@immunity-wars/engine';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import type { Engine, GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage } from '@immunity-wars/session';
import { offeredActions, residentDisplayName, t, type Offered } from '@immunity-wars/ui';

import { clone, findResidentMeal } from './constructed.js';

const PORT = engine as unknown as Engine;
type Raw = Record<string, unknown>;

function freshCommandState(seed = 0x51de): GameState {
  installRng(seed);
  try {
    const g = PORT.newGame({ difficulty: 'training', science: false }) as GameState;
    PORT.applyAction(g, { action: 'draw' } as never);
    PORT.applyAction(g, { action: 'beginCommand' } as never);
    return g;
  } finally {
    restoreRng();
  }
}

function offersFor(state: GameState, organ: string): Offered {
  const s = LocalSession.resume(clone(state), { storage: new MemoryStorage(), now: () => 0 });
  s.setSelection({ cell: null, family: null, resident: organ });
  const o = offeredActions(s.getView());
  s.dispose();
  return o;
}

function engineRefuses(state: GameState, organ: string): boolean {
  const g = clone(state);
  const pid = ((g as unknown as Raw)['players'] as string[])[0] ?? '';
  installRng(1);
  try {
    return !(PORT.applyAction(g, { action: 'resengulf', organ, pid } as never) as { ok: boolean })
      .ok;
  } finally {
    restoreRng();
  }
}

const attacks = (o: Offered): number => o.board.filter((b) => b.kind === 'attack').length;
const patrols = (o: Offered): number => o.board.filter((b) => b.action === 'resmove').length;

describe('CP3: a selected resident always answers, in the engine’s order', () => {
  const fresh = freshCommandState();
  const organ = 'liver';
  const name = 'Kupffer cell';

  it('at step 0: one patrol ring up the branch, no engulf, and the line says to patrol', () => {
    const o = offersFor(fresh, organ);
    expect(patrols(o)).toBe(1);
    expect(o.board[0]?.params).toEqual({ action: 'resmove', organ, step: 1 });
    expect(attacks(o)).toBe(0);
    expect(o.reason).toBe(t('selection.residentAtOrgan', { name }));
    expect(o.reason).toContain(name);
    expect(engineRefuses(fresh, organ), 'the engine agrees: nothing to engulf at step 0').toBe(
      true,
    );
  });

  it('on the branch with nothing eatable: the line names what it eats', () => {
    // The first organ whose step 1 holds nothing eatable on turn 1 — seven organs, and a
    // turn-1 draw cannot seed a meal on every branch, so one exists; a miss fails loudly.
    const organs = Object.keys((fresh as unknown as Raw)['residents'] as Raw);
    let found: { g: GameState; organ: string } | null = null;
    for (const o of organs) {
      const g = clone(fresh);
      const pid = ((g as unknown as Raw)['players'] as string[])[0] ?? '';
      installRng(1);
      try {
        const r = PORT.applyAction(g, { action: 'resmove', organ: o, step: 1, pid } as never) as {
          ok: boolean;
        };
        if (!r.ok) continue;
      } finally {
        restoreRng();
      }
      if ((PORT.residentEatable(g, o) as unknown[]).length === 0) {
        found = { g, organ: o };
        break;
      }
    }
    expect(found, 'every branch had a meal at step 1 on turn 1 — nothing to test').not.toBeNull();
    if (!found) return;
    const o = offersFor(found.g, found.organ);
    expect(patrols(o), 'both neighbours are patrol rings').toBe(2);
    expect(o.reason).toBe(
      t('selection.residentNothingHere', { name: residentDisplayName(found.organ) }),
    );
    expect(engineRefuses(found.g, found.organ)).toBe(true);
  });

  it('INFECTED: engulf withheld and the parasite line shown — but patrol still offered (ruling 2)', () => {
    const g = clone(fresh);
    const r = ((g as unknown as Raw)['residents'] as Record<string, Raw>)[organ];
    if (!r) throw new Error(`no ${organ} resident in a training game`);
    r['infectedBy'] = 'x';
    const o = offersFor(g, organ);
    expect(attacks(o)).toBe(0);
    expect(patrols(o), 'the engine accepts resmove for an infected resident; so does the UI').toBe(
      1,
    );
    expect(o.reason).toBe(t('selection.residentInfected', { name }));
    expect(engineRefuses(g, organ)).toBe(true);
  });

  it('residents unable to patrol: no rings, and the line says so', () => {
    const g = clone(fresh);
    ((g as unknown as Raw)['flags'] as Raw)['residentMove'] = false;
    const o = offersFor(g, organ);
    expect(o.board).toEqual([]);
    expect(o.reason).toBe(t('selection.residentsCannotMove'));
  });

  it('no AP: no patrol rings, the no-AP line', () => {
    const g = clone(fresh);
    (g as unknown as Raw)['ap'] = 0;
    const o = offersFor(g, organ);
    expect(o.board).toEqual([]);
    expect(o.reason).toBe(t('selection.noAp'));
  });

  it('with a meal: engulf rings per pathogen (ruling 1); after eating, the fed line and the engine refuses a second', () => {
    const meal = findResidentMeal();
    expect(
      meal,
      'no reachable resident meal in the recorded games — this test would cover nothing',
    ).not.toBeNull();
    if (!meal) return;
    const o = offersFor(meal.fed, meal.organ);
    const ring = o.board.find((b) => b.action === 'resengulf' && b.invaderId === meal.invaderId);
    expect(ring, 'the meal is offered as a ring on that pathogen').toBeDefined();
    expect(ring?.kind).toBe('attack');
    expect(ring?.params).toEqual({
      action: 'resengulf',
      organ: meal.organ,
      invaderId: meal.invaderId,
    });
    expect(o.reason, 'an attack is offered, so no reason line').toBeNull();

    const fed = clone(meal.fed);
    const pid = ((fed as unknown as Raw)['players'] as string[])[0] ?? '';
    installRng(1);
    try {
      const r = PORT.applyAction(fed, { ...(ring?.params ?? {}), pid } as never) as { ok: boolean };
      expect(r.ok).toBe(true);
    } finally {
      restoreRng();
    }
    const after = offersFor(fed, meal.organ);
    expect(attacks(after)).toBe(0);
    expect(after.reason).toBe(
      t('selection.residentAte', { name: residentDisplayName(meal.organ) }),
    );
    expect(after.reason).toContain(residentDisplayName(meal.organ));
    expect(engineRefuses(fed, meal.organ)).toBe(true);
  });
});
