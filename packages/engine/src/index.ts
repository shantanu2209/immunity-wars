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
 * The data tables below are re-exported to match the legacy public API exactly. They move to
 * packages/content/ in Task C, behind a Zod loader; keeping them here for Task B means the
 * port has exactly one moving part at a time.
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
  ALL_ORGANS,
  LYMPH_GROUP,
  LYMPH_STEP,
  ORGANS,
  ORGAN_SETS,
  PAIR,
  RESIDENT_NAME,
  ROUTES,
  ROUTE_KEYS,
} from './data/board.js';
export { DECK_MASTER } from './data/deck.js';
export { BAD_POOL, EVENTS, GOOD_POOL, RARE } from './data/events.js';
export { FAMILIES, FAMILY, FAM_KEYS } from './data/families.js';
export { FAST_DISEASE, INV_HP, INV_SPEED, NOT_ALIVE, TOXIN_MAKERS } from './data/invaders.js';
export { TROPISM } from './data/tropism.js';
export {
  AB_CAP_FAM,
  AB_CAP_FAM_BY_DIFF,
  AFFINITY_AT,
  ANTIBODY_CAP,
  ANTIBODY_RATE,
  ANTIVENOM_CHARGES,
  ANTIVENOM_ORDER,
  BURST_ON,
  CELL_KEYS,
  CLONE_COST,
  CNAME,
  DIFF,
  EOSINOPHIL_REGEN,
  FLAGS,
  GRACE_CLEAR,
  HEAL_AFTER,
  INFECT_ON,
  MALARIA_LIVER_TURNS,
  MEMORY_BOOST,
  NEUTROPHIL_REGEN,
  NEUTROPHIL_REGEN_HELPED,
  NK_HITS,
  NK_RANGE,
  PRESENT_TIER,
  PRESENT_TIER_BY_DIFF,
  RATE_CAP_BY_DIFF,
  REINFECT_PC,
  SNIPE_RANGE,
  SNIPE_RANGE_BY_DIFF,
  SPACE_CAP,
  SPAWN_TABLE,
  SPEED,
  TOXIN_AFTER,
  VACCINE_COST,
  WORM_DAMAGE_EVERY,
  WORM_MAX_PER_GAME,
  WORM_MAX_PER_TURN,
} from './data/tuning.js';

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
 * The package root is held to EXACTLY legacy's 67 exports: docs/PHASE1_BRIEF.md §5 makes the
 * public API the contract, so the port must not quietly widen it. Helpers legacy keeps private
 * (samePlace, placeDist, apFor, …) are reachable at '@immunity-wars/engine/internal' instead,
 * which is also where the rig has to go for them — see docs/FINDINGS.md #12.
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
