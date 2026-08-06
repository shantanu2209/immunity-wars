/**
 * @immunity-wars/engine
 *
 * Pure rules engine. No DOM, no Node APIs, no I/O.
 *
 * Port status (docs/TASK_B_PLAN.md §3.2):
 *   B1 data tables + primitives   — done
 *   B2 pure queries               — next
 *   B3 state construction
 *   B4 applyAction
 *   B5 resolveSpread
 *   B6 simulate + knobs
 *   B7 noUncheckedIndexedAccess
 *
 * THE PUBLIC SURFACE IS EXACTLY LEGACY'S 67 RUNTIME EXPORTS, plus PACKAGE_NAME.
 *
 * docs/PHASE1_BRIEF.md §5 makes the public API the contract. That was asserted here in prose
 * from B1 onward and was NOT true: the root published 106 names — legacy's 67 plus 38 data
 * tables and tuning constants legacy keeps module-private, plus PACKAGE_NAME. Nothing was
 * missing, so no consumer broke; the surface had simply widened, unmeasured, because there was
 * no test behind the claim. tests/equivalence/src/exports.test.ts is now that test.
 *
 * The 38 are not lost — they are ordinary module-local imports inside the engine. Exactly one
 * was ever reached from outside (ALL_ORGANS, by data.test.ts) and it now lives at
 * '@immunity-wars/engine/internal', which exists for precisely this case. Anything else that
 * turns out to be needed gets added there deliberately, one name at a time.
 *
 * PACKAGE_NAME is the Task A scaffold marker carried by all six packages. It is the ONE
 * documented exemption and exports.test.ts names it explicitly rather than tolerating it.
 *
 * The contract is over RUNTIME exports — `export type` is erased and cannot be observed by a
 * consumer, so the type exports below are not part of it.
 *
 * The data tables below move to packages/content/ in Task C, behind a Zod loader; keeping them
 * here for Task B means the port has exactly one moving part at a time.
 */

export const PACKAGE_NAME = '@immunity-wars/engine';

export type {
  AbPoolKey,
  Card,
  CellKey,
  Difficulty,
  DifficultyDef,
  EventDef,
  FamilyDef,
  FamilyKey,
  Flags,
  InvaderType,
  OrganDef,
  OrganKey,
  OrganKind,
  RareDef,
  RouteDef,
  RouteKey,
} from './types.js';

export {
  ANTIVENOM_ORDER,
  CELL_KEYS,
  CLONE_COST,
  DECK_MASTER,
  DIFF,
  EVENTS,
  FAM_KEYS,
  FAMILIES,
  FAMILY,
  FAST_DISEASE,
  FLAGS,
  INV_HP,
  INV_SPEED,
  NOT_ALIVE,
  ORGAN_SETS,
  ORGANS,
  RARE,
  RESIDENT_NAME,
  ROUTES,
  TOXIN_MAKERS,
  TROPISM,
  VACCINE_COST,
} from '@immunity-wars/content';

export { branchLen, famOf } from './primitives.js';

export { setKnobs } from './knobs.js';

/** B3 — state construction, the Force tool, and the crisis-event machinery. */
export {
  applyEvent,
  forceInjectCard,
  forceInjectType,
  makeInvader,
  newGame,
  respectWormCap,
} from './construct.js';

export { pushUndo, undo, viewState } from './view.js';

/** B4 — the action space. */
export { applyAction } from './actions.js';

/** B5 — turn resolution and the rare-event machinery. */
export { fireRare, resolveSpread } from './spread.js';

/** B6 — the balance simulator. Read the header of simulate.ts before quoting any number. */
export { simulate } from './simulate.js';
export type { Action, ActionResult } from './state.js';

/**
 * B2 — the pure query layer, under the names legacy publishes.
 *
 * Helpers legacy keeps private (samePlace, placeDist, apFor, …) are reachable at
 * '@immunity-wars/engine/internal' instead — see docs/FINDINGS.md #12 and the header above.
 */
export {
  abMatch,
  antivenomTargets,
  anyNeutralisable,
  anyTaggable,
  attackable,
  canNeutralise,
  canProduceFam,
  canTag,
  capFam,
  distToOrgan,
  helperInBlood,
  helperLicensed,
  helperWith,
  hivActive,
  invSpeed,
  lymphBlocked,
  macDisabled,
  macrophageEatable,
  moveDestinations,
  netTargets,
  neutrophilReadyTurn,
  nkTargets,
  productionBreakdown,
  rateFor,
  rateForFam,
  residentEatable,
  snipeTargets,
  wormAllowed,
  wormStrikeable,
} from './queries.js';

export type {
  Cell,
  GameState,
  Invader,
  MoveDestination,
  Organ,
  Placed,
  ProductionBreakdown,
  Resident,
  Zone,
} from './state.js';
