/**
 * THE DOCK'S ROWS (docs/for-P2.7.md §12, ruling 2, 13 September 2026): one row per action, in two
 * slots, where the action list had one row per target.
 *
 * On recorded states, for every piece (each cell, each resident, and the body when nothing is
 * selected), the dock's rows must:
 *
 *   1. fit the dock's slots;
 *   2. lose nothing: every available row of the action list is a target of exactly one dock row;
 *   3. send the right thing: a row with one target sends that target's offer, a row with several
 *      sends nothing itself (it opens them);
 *   4. leave out what the ruling left out (produce);
 *   5. say why when greyed.
 *
 * Both halves (CLAUDE.md): the real grouping is clean and the corpus holds rows with several
 * targets, so clauses 1 and 2 are exercised rather than vacuous; and two planted groupings, one
 * that keeps a row per target and one that drops targets, are each caught by the clause they break.
 */

import { describe, expect, it } from 'vitest';

import type { GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage } from '@immunity-wars/session';
import { DOCK_OMITS, DOCK_ROW_SLOTS, actionRows, dockRows, type DockRow } from '@immunity-wars/ui';
import type { SessionView } from '@immunity-wars/session';

import { SEARCH_SEEDS, clone, commandStates } from './constructed.js';

const CELLS = ['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil'];

type Grouping = (view: SessionView) => DockRow[];

function views(): SessionView[] {
  const out: SessionView[] = [];
  for (const seed of SEARCH_SEEDS.slice(0, 3)) {
    for (const difficulty of ['training', 'normal', 'hard']) {
      for (const st of commandStates(seed, difficulty, 80)) {
        const residents = Object.keys(
          ((st as unknown as Record<string, unknown>)['residents'] as Record<string, unknown>) ??
            {},
        );
        const selections = [
          { cell: null, resident: null },
          ...CELLS.map((cell) => ({ cell, resident: null })),
          ...residents.map((r) => ({ cell: null, resident: r })),
        ];
        for (const sel of selections) {
          const s = LocalSession.resume(clone(st) as GameState, {
            storage: new MemoryStorage(),
            now: () => 0,
          });
          s.setSelection({ cell: sel.cell, resident: sel.resident, family: null });
          out.push(s.getView());
          s.dispose();
        }
      }
    }
  }
  return out;
}

function check(
  grouping: Grouping,
  subjects: SessionView[],
): { problems: Set<string>; several: number } {
  const problems = new Set<string>();
  let several = 0;
  for (const view of subjects) {
    const rows = actionRows(view);
    const dock = grouping(view);
    if (dock.length > DOCK_ROW_SLOTS) problems.add('more rows than the dock has slots');
    for (const d of dock) {
      if (d.targets.length > 1) several += 1;
      if (DOCK_OMITS.has(d.action)) problems.add('an omitted action is in the dock');
      if (d.available) {
        if (d.targets.length === 1 && d.offerId !== d.targets[0]?.offerId)
          problems.add('a one-target row sends the wrong offer');
        if (d.targets.length > 1 && d.offerId !== null)
          problems.add('a several-target row sends an offer itself');
        if (d.targets.length === 0) problems.add('an available row with no target');
      } else if (!d.reason || d.reason.includes('⟪')) {
        problems.add('a greyed row with no usable reason');
      }
    }
    for (const r of rows) {
      if (!r.available || DOCK_OMITS.has(r.action)) continue;
      const holders = dock.filter((d) => d.targets.some((x) => x.id === r.id));
      if (holders.length !== 1)
        problems.add('an action a player could take is missing from the dock');
    }
  }
  return { problems, several };
}

describe("the dock's rows", () => {
  const subjects = views();

  it('fit two slots, lose nothing, send the right offer, and say why', { timeout: 120_000 }, () => {
    const { problems, several } = check(dockRows, subjects);
    expect([...problems]).toEqual([]);
    expect(subjects.length).toBeGreaterThan(100);
    // Not vacuous: rows with several targets exist, so grouping and the slot limit were exercised.
    expect(several).toBeGreaterThan(0);
  });

  describe('CONTROLS', () => {
    it('fires: a row per target overflows the slots', { timeout: 120_000 }, () => {
      const perTarget: Grouping = (view) =>
        actionRows(view)
          .filter((r) => !DOCK_OMITS.has(r.action))
          .map((r) => ({
            action: r.action,
            label: r.label,
            cost: r.cost,
            detail: r.detail,
            available: r.available,
            offerId: r.offerId,
            targets: r.available ? [r] : [],
            reason: r.reason,
          }));
      expect([...check(perTarget, subjects).problems]).toContain(
        'more rows than the dock has slots',
      );
    });

    it(
      'fires: a grouping that keeps only the first target loses the rest',
      { timeout: 120_000 },
      () => {
        const firstOnly: Grouping = (view) =>
          dockRows(view).map((d) => ({
            ...d,
            targets: d.targets.slice(0, 1),
            offerId: d.targets[0]?.offerId ?? null,
          }));
        expect([...check(firstOnly, subjects).problems]).toContain(
          'an action a player could take is missing from the dock',
        );
      },
    );
  });
});
