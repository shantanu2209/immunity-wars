/**
 * TASK G, STEP 3 — THE SHIM. A RENAME LAYER, AND NOTHING ELSE.
 *
 * `v2_ui.html` reads the engine as GLOBALS, because `spectator_build.js` injects the engine as a
 * classic script and every top-level declaration in a classic script becomes a global. The port is
 * ESM. This file is the whole of the adapter between those two facts.
 *
 * **THE RULE THIS FILE LIVES UNDER**, from docs/TASK_G_PLAN.md §3 step 1:
 *
 *   > A shim that quietly reimplements engine behaviour to make the UI happy would put logic
 *   > outside `packages/engine`, which CLAUDE.md forbids, and would do it in the one file nobody
 *   > would think to audit.
 *
 * So every line below is an assignment of an imported binding to a global of the same name. No
 * wrappers, no defaults, no computed values, no conditionals. That is verifiable by reading it,
 * which is why the list is written out rather than generated from a loop: a `for (const n of NAMES)`
 * would be shorter and would hide exactly the thing a reader needs to check.
 *
 * **The list is not trusted for being written down.** `shim.test.ts` asserts it equals
 * `measureSeam().fromEngine` — the same 49 names steps 1 and 2 measured — in both directions. A
 * name added here that the UI does not read, or read by the UI and missing here, fails.
 *
 * WHY FIVE COME FROM `content`: docs/FINDINGS.md #39. Script injection exposes all 153 of legacy's
 * top-level declarations, not just the 67 it exports, so the UI reads five names that were never in
 * the public API the port was measured against. All five are content tables, so they are imported
 * from `@immunity-wars/content` and **nothing is added to `packages/engine`**.
 */

import {
  LYMPH_STEP,
  ROUTE_KEYS,
  SNIPE_RANGE,
  SNIPE_RANGE_BY_DIFF,
  SPEED,
} from '@immunity-wars/content';
import {
  ANTIVENOM_ORDER,
  CELL_KEYS,
  CLONE_COST,
  DIFF,
  EVENTS,
  FAMILIES,
  FAMILY,
  FAM_KEYS,
  FAST_DISEASE,
  ORGANS,
  ORGAN_SETS,
  RARE,
  RESIDENT_NAME,
  ROUTES,
  TROPISM,
  VACCINE_COST,
  abMatch,
  antivenomTargets,
  anyNeutralisable,
  anyTaggable,
  applyAction,
  applyEvent,
  attackable,
  branchLen,
  canNeutralise,
  canTag,
  capFam,
  famOf,
  fireRare,
  forceInjectCard,
  forceInjectType,
  helperWith,
  hivActive,
  lymphBlocked,
  macrophageEatable,
  moveDestinations,
  netTargets,
  newGame,
  nkTargets,
  productionBreakdown,
  rateFor,
  residentEatable,
  snipeTargets,
  wormStrikeable,
} from '@immunity-wars/engine';

/**
 * The names this shim binds, in the order they are assigned below.
 *
 * Exported so `shim.test.ts` can compare it against the measured seam. It is a plain list of
 * strings and is never used to perform the binding — the assignments are written out.
 */
export const SHIMMED_NAMES = [
  // --- from packages/content (docs/FINDINGS.md #39 — outside legacy's 67 exports) --------------
  'LYMPH_STEP',
  'ROUTE_KEYS',
  'SNIPE_RANGE',
  'SNIPE_RANGE_BY_DIFF',
  'SPEED',
  // --- data tables from packages/engine ---------------------------------------------------------
  'ANTIVENOM_ORDER',
  'CELL_KEYS',
  'CLONE_COST',
  'DIFF',
  'EVENTS',
  'FAMILIES',
  'FAMILY',
  'FAM_KEYS',
  'FAST_DISEASE',
  'ORGANS',
  'ORGAN_SETS',
  'RARE',
  'RESIDENT_NAME',
  'ROUTES',
  'TROPISM',
  'VACCINE_COST',
  // --- functions from packages/engine -----------------------------------------------------------
  'abMatch',
  'antivenomTargets',
  'anyNeutralisable',
  'anyTaggable',
  'applyAction',
  'applyEvent',
  'attackable',
  'branchLen',
  'canNeutralise',
  'canTag',
  'capFam',
  'famOf',
  'fireRare',
  'forceInjectCard',
  'forceInjectType',
  'helperWith',
  'hivActive',
  'lymphBlocked',
  'macrophageEatable',
  'moveDestinations',
  'netTargets',
  'newGame',
  'nkTargets',
  'productionBreakdown',
  'rateFor',
  'residentEatable',
  'snipeTargets',
  'wormStrikeable',
] as const;

const g = globalThis as unknown as Record<string, unknown>;

// --- the rename layer ----------------------------------------------------------------------------
// From packages/content — the five of docs/FINDINGS.md #39.
g['LYMPH_STEP'] = LYMPH_STEP;
g['ROUTE_KEYS'] = ROUTE_KEYS;
g['SNIPE_RANGE'] = SNIPE_RANGE;
g['SNIPE_RANGE_BY_DIFF'] = SNIPE_RANGE_BY_DIFF;
g['SPEED'] = SPEED;
// From packages/engine — data.
g['ANTIVENOM_ORDER'] = ANTIVENOM_ORDER;
g['CELL_KEYS'] = CELL_KEYS;
g['CLONE_COST'] = CLONE_COST;
g['DIFF'] = DIFF;
g['EVENTS'] = EVENTS;
g['FAMILIES'] = FAMILIES;
g['FAMILY'] = FAMILY;
g['FAM_KEYS'] = FAM_KEYS;
g['FAST_DISEASE'] = FAST_DISEASE;
g['ORGANS'] = ORGANS;
g['ORGAN_SETS'] = ORGAN_SETS;
g['RARE'] = RARE;
g['RESIDENT_NAME'] = RESIDENT_NAME;
g['ROUTES'] = ROUTES;
g['TROPISM'] = TROPISM;
g['VACCINE_COST'] = VACCINE_COST;
// From packages/engine — functions.
g['abMatch'] = abMatch;
g['antivenomTargets'] = antivenomTargets;
g['anyNeutralisable'] = anyNeutralisable;
g['anyTaggable'] = anyTaggable;
g['applyAction'] = applyAction;
g['applyEvent'] = applyEvent;
g['attackable'] = attackable;
g['branchLen'] = branchLen;
g['canNeutralise'] = canNeutralise;
g['canTag'] = canTag;
g['capFam'] = capFam;
g['famOf'] = famOf;
g['fireRare'] = fireRare;
g['forceInjectCard'] = forceInjectCard;
g['forceInjectType'] = forceInjectType;
g['helperWith'] = helperWith;
g['hivActive'] = hivActive;
g['lymphBlocked'] = lymphBlocked;
g['macrophageEatable'] = macrophageEatable;
g['moveDestinations'] = moveDestinations;
g['netTargets'] = netTargets;
g['newGame'] = newGame;
g['nkTargets'] = nkTargets;
g['productionBreakdown'] = productionBreakdown;
g['rateFor'] = rateFor;
g['residentEatable'] = residentEatable;
g['snipeTargets'] = snipeTargets;
g['wormStrikeable'] = wormStrikeable;

// The build stamp is NOT set here. It is emitted by `build.ts` as a separate generated line, so
// that this file stays importable by `shim.test.ts` and stays literally nothing but renames.
