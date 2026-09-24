/**
 * WHAT A RELAY CLIENT READS IS WHAT `LocalSession` READS (P3.4, ruled 24 September 2026).
 *
 * The relay sends every scoped answer with each view — the move destinations of all seven cells
 * and the production breakdown of every family — and a client picks its own selection's out with
 * `scopeFrom`, where `LocalSession` calls `scope` for the one selection it holds. `precompute` and
 * `scope` are the same functions on both sides since the builder moved to `session-core`, and
 * `tools/perf/queries-identity.ts` proved the move byte-identical. So `scopeFrom` is the ONE piece
 * of code only a relay client runs, and this suite holds it equal to `scope` on real states, for
 * every selection, including the families the identity run did not cover.
 *
 * It also holds that computing every answer at once CHANGES NOTHING in the game. The relay calls
 * the engine's queries seven times where `LocalSession` calls them once; a query that wrote to the
 * state it read would make a relay game drift from the same game played alone.
 *
 * Controls, run by hand and recorded in docs/for-P3.md §4: `scopeFrom` reading the family's
 * breakdown from the wrong key turns the first test red, and `scopeAll` writing one field to the
 * game turns the second red.
 */
import { describe, expect, it } from 'vitest';

import type { GameState } from '@immunity-wars/equivalence/types';
import {
  CELL_KEYS,
  FAMILIES,
  NO_SELECTION,
  precompute,
  scope,
  scopeAll,
  scopeFrom,
  type Selection,
} from '@immunity-wars/session-core';
import * as engine from '@immunity-wars/engine';

import { SEARCH_SEEDS, clone, commandStates, planningStates } from './constructed.js';

type Raw = Record<string, unknown>;

/** Command moments (where cells can move) and planning moments, across all three difficulties. */
function states(): GameState[] {
  const out: GameState[] = [];
  for (const difficulty of ['training', 'normal', 'hard']) {
    for (const seed of SEARCH_SEEDS.slice(0, 2)) {
      out.push(...commandStates(seed, difficulty, 120).filter((_, i) => i % 3 === 0));
      out.push(...planningStates(seed, difficulty, 120));
    }
  }
  return out;
}

/** No selection, each cell alone, each family alone, and one of each together. */
const SELECTIONS: readonly Selection[] = [
  NO_SELECTION,
  ...CELL_KEYS.map((cell) => ({ cell, family: null, resident: null })),
  ...FAMILIES.map((family) => ({ cell: null, family, resident: null })),
  { cell: CELL_KEYS[0] ?? null, family: FAMILIES[0] ?? null, resident: null },
];

describe('a relay client serves its selection from the relay, and gets what LocalSession would', () => {
  const all = states();

  it('reads, for every selection, exactly what `scope` answers', () => {
    let destinations = 0;
    let breakdowns = 0;
    for (const s of all) {
      const g = clone(s) as unknown as Raw;
      const everything = scopeAll(g);
      for (const selection of SELECTIONS) {
        const local = scope(g, selection);
        const relay = scopeFrom(everything, selection);
        expect(JSON.stringify(relay), JSON.stringify(selection)).toBe(JSON.stringify(local));
        if ((local.moveDestinations?.length ?? 0) > 0) destinations += 1;
        if (local.productionDetail !== null && local.productionDetail !== undefined)
          breakdowns += 1;
      }
    }
    // Not vacuous: the states offered real moves and real breakdowns to compare.
    expect(all.length).toBeGreaterThan(30);
    expect(destinations).toBeGreaterThan(30);
    expect(breakdowns).toBeGreaterThan(30);
  });

  it('computes every answer at once without changing the game it reads', () => {
    for (const s of all) {
      const g = clone(s) as unknown as Raw;
      const before = JSON.stringify(g);
      const view = (engine as unknown as { viewState: (g: unknown) => Raw }).viewState(g);
      precompute(g, view);
      scopeAll(g);
      expect(JSON.stringify(g)).toBe(before);
    }
  });
});
