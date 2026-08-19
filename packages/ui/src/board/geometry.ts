/**
 * P2.2 step 3 — the board's geometry, derived from the content pack AT RENDER TIME.
 *
 * `packages/content/src/board/geometry.json` is the single source for the on-screen board and
 * the printed A2 artwork (PHASE2_BRIEF §5). This module is a data-to-code transformation of it
 * and nothing else: **no coordinate literal appears anywhere in `packages/ui`** — a generated
 * file would be a second copy of the geometry that can drift, so nothing is generated; the
 * tables are read through content's validated loader and mapped to drawing primitives.
 *
 * State decides WHICH node a token sits on; geometry decides WHERE that node is. That split is
 * the whole module.
 */

import { BRANCH, ENTRY, HUB, ORGAN_POS, ROUTE, VH, VW } from '@immunity-wars/content';

export interface Pt {
  readonly x: number;
  readonly y: number;
}

const routeTable = ROUTE as Record<string, Record<string, Pt>>;
const branchTable = BRANCH as Record<string, Record<string, Pt>>;
const entryTable = ENTRY as Record<string, Pt & { t: string }>;
const organTable = ORGAN_POS as Record<string, Pt>;

export const VIEWBOX = `0 0 ${VW as number} ${VH as number}`;
export const HUB_POS = HUB as Pt;
export const LANES: readonly string[] = Object.keys(routeTable);
export const BOARD_ORGANS: readonly string[] = Object.keys(organTable);

/** Numbered steps of a table, sorted ascending. Empty for an unknown key — never a throw. */
function steps(table: Record<string, Record<string, Pt>>, key: string): (Pt & { step: number })[] {
  const t = table[key];
  if (!t) return [];
  return Object.keys(t)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((step) => {
      const p = t[String(step)];
      return p ? [{ step, x: p.x, y: p.y }] : [];
    });
}

export const routeSteps = (lane: string): (Pt & { step: number })[] => steps(routeTable, lane);
export const branchSteps = (organ: string): (Pt & { step: number })[] => steps(branchTable, organ);
export const entryOf = (lane: string): (Pt & { t: string }) | null => entryTable[lane] ?? null;
export const organPos = (organ: string): Pt | null => organTable[organ] ?? null;

/** SVG polyline points attribute for a run of positions. */
export const polyPoints = (pts: readonly Pt[]): string => pts.map((p) => `${p.x},${p.y}`).join(' ');

/** Where something at a game location sits on the board. Null when the location cannot resolve. */
export function tokenPos(loc: {
  zone?: unknown;
  lane?: unknown;
  organ?: unknown;
  step?: unknown;
}): Pt | null {
  const step = typeof loc.step === 'number' ? loc.step : 0;
  if (loc.zone === 'hub') return HUB_POS;
  if (loc.zone === 'route' && typeof loc.lane === 'string') {
    if (step < 1) return HUB_POS;
    return routeTable[loc.lane]?.[String(step)] ?? null;
  }
  if (loc.zone === 'branch' && typeof loc.organ === 'string') {
    // Step 0 on a branch is the organ tissue itself.
    if (step < 1) return organTable[loc.organ] ?? null;
    return branchTable[loc.organ]?.[String(step)] ?? null;
  }
  return null;
}
