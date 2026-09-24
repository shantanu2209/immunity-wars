/**
 * THE QUERY BUILDER — what the UI reads to decide what is clickable, computed from a `GameState`.
 *
 * Moved here from `LocalSession` at P3.4 (ruled 24 September 2026), UNCHANGED, so that the relay
 * computes exactly what `LocalSession` computes: one implementation, not two that agree by test.
 * `tools/perf/queries-identity.ts` proved the move byte-identical on 650 real states under all
 * fourteen selections each (docs/for-P3.md §4). Indentation aside, the bodies below are the
 * methods that were `LocalSession.precompute` and `LocalSession.scope`, with `this.g` as `g`.
 */
import * as engine from '@immunity-wars/engine';
import { apBreakdown, regenBreakdown } from '@immunity-wars/engine/internal';

import {
  CELL_KEYS,
  FAMILIES,
  INVADER_ONLY,
  ORGAN_ONLY,
  PER_CELL,
  PER_FAMILY,
  PER_INVADER,
  PER_ORGAN,
  STATE_ONLY,
} from './queries.js';
import type {
  PrecomputedQueries,
  ProductionSummary,
  ScopedQueries,
  Selection,
  ViewState,
} from './types.js';

const ns = engine as unknown as Record<string, unknown>;
const call = (name: string, ...args: unknown[]): unknown =>
  (ns[name] as (...a: unknown[]) => unknown)(...args);

export function precompute(g: Record<string, unknown>, game: ViewState): PrecomputedQueries {
  const invaders = (game['invaders'] as unknown[] | undefined) ?? [];
  const organs = (g['organList'] as string[] | undefined) ?? [];

  const state: Record<string, unknown> = {};
  for (const n of STATE_ONLY) state[n] = call(n, g);

  const perInvader: Record<string, unknown[]> = {};
  for (const n of PER_INVADER) perInvader[n] = invaders.map((iv) => call(n, g, iv));
  for (const n of INVADER_ONLY) perInvader[n] = invaders.map((iv) => call(n, iv));

  const perCell: Record<string, Record<string, unknown>> = {};
  for (const n of PER_CELL) {
    const row: Record<string, unknown> = {};
    for (const c of CELL_KEYS) row[c] = call(n, g, c);
    perCell[n] = row;
  }

  const perOrgan: Record<string, Record<string, unknown>> = {};
  for (const n of PER_ORGAN) {
    const row: Record<string, unknown> = {};
    for (const o of organs) row[o] = call(n, g, o);
    perOrgan[n] = row;
  }
  for (const n of ORGAN_ONLY) {
    const row: Record<string, unknown> = {};
    for (const o of organs) row[o] = call(n, o);
    perOrgan[n] = row;
  }

  const perFamily: Record<string, Record<string, unknown>> = {};
  for (const n of PER_FAMILY) {
    const row: Record<string, unknown> = {};
    for (const f of FAMILIES) row[f] = call(n, g, f);
    perFamily[n] = row;
  }

  // The three fields the always-on antibody panel reads from productionBreakdown. The other six
  // are the tooltip, and are selection-scoped — measured at ~85% of that object's bytes.
  const production: Record<string, ProductionSummary> = {};
  for (const f of FAMILIES) {
    const pb = call('productionBreakdown', g, f) as Record<string, unknown>;
    production[f] = {
      net: Number(pb['net'] ?? 0),
      boosted: Boolean(pb['boosted']),
      reduced: Boolean(pb['reduced']),
      blocked: pb['blocked'] !== null && pb['blocked'] !== undefined,
    };
  }

  // WHEN A SPENT CELL IS BACK, AND WHY — see `PrecomputedQueries.regen`. The engine's own
  // `regenBreakdown` (6 September 2026): the Neutrophil's return turn is null while the
  // marrow is damaged because the spread will not regenerate it then — the ENGINE's reading
  // of the marrow, which retires the one this session used to make from hp < max (that copy
  // was conservative on Hard, where a compensated marrow does regenerate; the engine's is
  // exact). `readyTurn` is derived from it so the board's badge is unchanged.
  const engineState = g as unknown as Parameters<typeof regenBreakdown>[0];
  const regen = regenBreakdown(engineState);
  const readyTurn: Record<string, number | null> = {
    neutrophil: regen.neutrophil?.readyTurn ?? null,
    eosinophil: regen.eosinophil?.readyTurn ?? null,
  };

  // THE ACTION POINT TOTAL AS TERMS — see `PrecomputedQueries.ap`.
  const ap = apBreakdown(engineState);

  // THE CRISIS EFFECTS IN FORCE — the view drops `fx`; the strip needs its durations.
  const fx = (g['fx'] as Record<string, unknown> | undefined) ?? {};
  const effects = {
    capTurns: Number(fx['capTurns'] ?? 0),
    noProduce: fx['noProduce'] === true,
    apMod: Number(fx['apMod'] ?? 0),
    skipMarch: fx['skipMarch'] === true,
  };

  return {
    state,
    perInvader,
    perCell,
    perOrgan,
    perFamily,
    production,
    readyTurn,
    effects,
    ap,
    regen,
  };
}

export function scope(g: Record<string, unknown>, selection: Selection): ScopedQueries {
  const { cell, family } = selection;
  return {
    moveDestinations: cell
      ? ((call('moveDestinations', g, cell) as unknown[] | undefined) ?? [])
      : null,
    productionDetail: family ? call('productionBreakdown', g, family) : null,
  };
}

/**
 * EVERY SCOPED ANSWER AT ONCE, for the relay (ruled 24 September 2026, "ALL"): the move
 * destinations of each of the seven cells and the full production breakdown of each of the six
 * families. A relay client serves its own selection from these with `scopeFrom`, so a tap never
 * waits on the network. Measured at 0.3 KiB a view compressed (docs/for-P3.md §4).
 */
export interface AllScoped {
  readonly moveDestinations: Readonly<Record<string, readonly unknown[]>>;
  readonly productionDetail: Readonly<Record<string, unknown>>;
}

export function scopeAll(g: Record<string, unknown>): AllScoped {
  const moveDestinations: Record<string, readonly unknown[]> = {};
  for (const cell of CELL_KEYS) {
    const s = scope(g, { cell, family: null, resident: null });
    moveDestinations[cell] = s.moveDestinations ?? [];
  }
  const productionDetail: Record<string, unknown> = {};
  for (const family of FAMILIES) {
    productionDetail[family] = scope(g, { cell: null, family, resident: null }).productionDetail;
  }
  return { moveDestinations, productionDetail };
}

/**
 * The scoped answers for one selection, read out of `scopeAll`'s — what a relay client does where
 * `LocalSession` calls `scope`. Held equal to `scope(g, selection)` by test, for every selection.
 */
export function scopeFrom(all: AllScoped, selection: Selection): ScopedQueries {
  const { cell, family } = selection;
  return {
    moveDestinations: cell ? (all.moveDestinations[cell] ?? []) : null,
    productionDetail: family ? (all.productionDetail[family] ?? null) : null,
  };
}
