/**
 * @immunity-wars/content
 *
 * Content packs: board geometry, diseases, labels, rules tables.
 *
 * THE INVARIANT: content contains no logic, the engine contains no data.
 *
 * That is the real rule, and it is what .dependency-cruiser.cjs enforces. Earlier drafts of
 * CLAUDE.md and docs/PHASE1_BRIEF.md §2 said "engine may import content types only" — written
 * before the cut line existed, and it cannot hold: legacy publishes ORGANS, DECK_MASTER,
 * TROPISM and 19 other tables as part of its 67-export public API, so an engine that could only
 * see the TYPES would have to stop publishing the VALUES and break the contract Task B was
 * measured against. Both documents are corrected rather than left saying something CI does not
 * do — that pattern has now been found nine times in this project and it is worth breaking.
 *
 * So the engine imports these values directly. What it may not do is put data back: no table,
 * no tuning constant, no disease list lives in packages/engine.
 *
 * TASK C1 — the tables are still TypeScript, moved verbatim from packages/engine/src/data/.
 * C2 converts them to JSON under a Zod loader, per docs/PHASE1_BRIEF.md §3, and adds the
 * { packId, packVersion, rulesVersion } stamp. Keeping the move and the serialisation in
 * separate commits means a red corpus names its own cause.
 */

export const PACKAGE_NAME = '@immunity-wars/content';

export type {
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

/* --- the board: organs, routes, the lymphatic map --- */
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
} from './rules/board.js';

/* --- the infection deck --- */
export { DECK_MASTER } from './rules/deck.js';

/* --- crisis and rare events --- */
export { BAD_POOL, EVENTS, GOOD_POOL, RARE } from './rules/events.js';

/* --- antigen classes --- */
export { FAMILIES, FAMILY, FAM_KEYS } from './rules/families.js';

/* --- per-type invader statistics --- */
export { FAST_DISEASE, INV_HP, INV_SPEED, NOT_ALIVE, TOXIN_MAKERS } from './rules/invaders.js';

/* --- which organs each disease can infect --- */
export { TROPISM } from './rules/tropism.js';

/* --- cells, difficulty settings, and every tuning constant --- */
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
} from './rules/tuning.js';
