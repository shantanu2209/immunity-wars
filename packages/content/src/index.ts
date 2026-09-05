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
 * SHAPE OF THIS PACKAGE, as of Task C2:
 *
 *   rules/*.json   the tables themselves — generated at C2 from the C1 TypeScript values,
 *                  not retyped, then verified against legacy anyway (key order included)
 *   schema.ts      Zod schemas. Validator, never constructor — read its header before editing
 *   load.ts        imports the JSON, validates it, exports it UNCHANGED
 *   types.ts       the shapes of the content
 *
 * The move (C1) and the serialisation (C2) were separate commits so that a red corpus would
 * name its own cause. Both ran clean: 6,000 games, 0 divergences, twice.
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
  Point,
  FrameDef,
  CellCard,
  RareDef,
  Region,
  RegionBox,
  RegionKey,
  RouteDef,
  RouteKey,
  CellLabel,
  DiseaseInfo,
  DiseaseStats,
  InvaderLabel,
} from './types.js';

export {
  AB_CAP_FAM,
  AB_CAP_FAM_BY_DIFF,
  AFFINITY_AT,
  ALL_ORGANS,
  ANTIBODY_CAP,
  ANTIBODY_RATE,
  ANTIVENOM_CHARGES,
  ANTIVENOM_ORDER,
  BAD_POOL,
  BURST_ON,
  CELL_KEYS,
  CLONE_COST,
  CNAME,
  DECK_MASTER,
  DIFF,
  EOSINOPHIL_REGEN,
  EVENTS,
  FAM_KEYS,
  FAMILIES,
  FAMILY,
  FAST_DISEASE,
  FLAGS,
  GOOD_POOL,
  GRACE_CLEAR,
  HEAL_AFTER,
  INFECT_ON,
  INV_HP,
  INV_SPEED,
  LYMPH_GROUP,
  LYMPH_STEP,
  MALARIA_LIVER_TURNS,
  MEMORY_BOOST,
  NEUTROPHIL_REGEN,
  NEUTROPHIL_REGEN_HELPED,
  NK_HITS,
  NK_RANGE,
  NOT_ALIVE,
  NOVEL_ANTIGENS,
  ORGAN_SETS,
  ORGANS,
  PACK_ID,
  PACK_VERSION,
  PAIR,
  PRESENT_TIER,
  PRESENT_TIER_BY_DIFF,
  RARE,
  RATE_CAP_BY_DIFF,
  REINFECT_PC,
  RESIDENT_NAME,
  ROUTE_KEYS,
  ROUTES,
  RULES_VERSION,
  SNIPE_RANGE,
  SNIPE_RANGE_BY_DIFF,
  SPACE_CAP,
  SPAWN_TABLE,
  SPEED,
  TOXIN_AFTER,
  TOXIN_MAKERS,
  TROPISM,
  VACCINE_COST,
  WORM_DAMAGE_EVERY,
  WORM_MAX_PER_GAME,
  WORM_MAX_PER_TURN,
} from './load.js';

/* --- TASK C3: the board pack — geometry, regions, disease text, labels --- */
export {
  ANATOMY_POS,
  BRANCH,
  CELL_CARDS,
  CHIP_POS,
  DZINFO,
  FRAME,
  DZSTATS,
  ENTRY,
  FACT,
  HUB,
  ORGAN_ART,
  UI_I18N_EN,
  ENGINE_I18N_EN,
  ORGAN_POS,
  REGION_BOX,
  REGION_LABEL,
  REGIONS,
  RGLYPH,
  RNAME,
  ROUTE,
  UI_,
  BEAT_BY_TYPE,
  UM,
  VH,
  VIEWBOX,
  LABEL_SIDE,
  VW,
} from './load.js';
