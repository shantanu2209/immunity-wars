/**
 * The bundled rules pack: load, validate, export.
 *
 * TASK C2. The tables are JSON now, generated at C2 from the C1 TypeScript values rather than
 * retyped — the same equal-by-construction method B1 used — and then verified against legacy
 * anyway by tests/equivalence/src/data.test.ts, key order included.
 *
 * THE ONE RULE THIS FILE EXISTS TO ENFORCE:
 *
 *     Zod's job is to THROW. Its return value is discarded, and every exported value is the
 *     object that came out of JSON.parse, untouched.
 *
 * `parseRules()` below calls `.parse()` for its side effect and does not use the result. That
 * looks wrong at a glance, so: `z.object` REBUILDS the object it validates, in SCHEMA key order,
 * and `z.record` with a key enum does the same in ENUM order — both measured before this file
 * was written, both recorded in schema.ts. Key order is load-bearing here (TROPISM feeds
 * rollOrgan, FAM_KEYS feeds the kidney leak), so a rebuilt table is a live bug.
 *
 * Discarding the output is also what lets the schemas be MAXIMALLY strict — exact key sets, key
 * enums, strictObject throughout — since no amount of reordering in a discarded value can reach
 * anything. Strict validation and untouched key order, rather than a trade between them.
 *
 * The casts below are therefore doing real work and are not decoration: they re-attach the
 * precise types to values Zod has just proved conform to them.
 */

import type {
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
  RareDef,
  RouteDef,
  RouteKey,
} from './types.js';

import { RulesPackS } from './schema.js';

import boardJson from './rules/board.json';
import deckJson from './rules/deck.json';
import eventsJson from './rules/events.json';
import familiesJson from './rules/families.json';
import invadersJson from './rules/invaders.json';
import packJson from './rules/pack.json';
import tropismJson from './rules/tropism.json';
import tuningJson from './rules/tuning.json';

/**
 * Assembled, validated, and returned UNCHANGED.
 *
 * The spread builds a fresh top-level object, which is fine: nothing iterates the pack itself.
 * What must not be rebuilt is each TABLE, and no table is — every value below is the identical
 * object reference that came from its JSON module.
 */
function parseRules(): Record<string, unknown> {
  const raw: Record<string, unknown> = {
    ...packJson,
    ...boardJson,
    ...deckJson,
    ...eventsJson,
    ...familiesJson,
    ...invadersJson,
    ...tropismJson,
    ...tuningJson,
  };
  // Throws a ZodError naming the exact path on any malformed pack. Return value INTENTIONALLY
  // discarded — see the header. Do not "fix" this to `return RulesPackS.parse(raw)`.
  RulesPackS.parse(raw);
  return raw;
}

const pack = parseRules();

/** The pack stamp. Every state and network message carries rulesVersion (BRIEF §3, seam 7). */
export const PACK_ID = pack['packId'] as string;
export const PACK_VERSION = pack['packVersion'] as string;
export const RULES_VERSION = pack['rulesVersion'] as string;

/* --- board --- */
export const ORGANS = pack['ORGANS'] as Record<OrganKey, OrganDef>;
export const ALL_ORGANS = pack['ALL_ORGANS'] as readonly OrganKey[];
export const ORGAN_SETS = pack['ORGAN_SETS'] as Record<Difficulty, readonly OrganKey[]>;
export const ROUTES = pack['ROUTES'] as Record<RouteKey, RouteDef>;
export const ROUTE_KEYS = pack['ROUTE_KEYS'] as readonly RouteKey[];
export const LYMPH_GROUP = pack['LYMPH_GROUP'] as Record<RouteKey, string | null>;
export const PAIR = pack['PAIR'] as Record<string, RouteKey>;
export const LYMPH_STEP = pack['LYMPH_STEP'] as number;
export const RESIDENT_NAME = pack['RESIDENT_NAME'] as Record<OrganKey, string>;

/* --- deck --- */
export const DECK_MASTER = pack['DECK_MASTER'] as readonly Card[];

/* --- events --- */
export const EVENTS = pack['EVENTS'] as Record<string, EventDef>;
export const BAD_POOL = pack['BAD_POOL'] as readonly string[];
export const GOOD_POOL = pack['GOOD_POOL'] as readonly string[];
export const RARE = pack['RARE'] as Record<string, RareDef>;

/* --- families --- */
export const FAMILIES = pack['FAMILIES'] as Record<FamilyKey, FamilyDef>;
export const FAM_KEYS = pack['FAM_KEYS'] as readonly FamilyKey[];
export const FAMILY = pack['FAMILY'] as Record<string, FamilyKey>;

/* --- invaders --- */
export const INV_HP = pack['INV_HP'] as Record<InvaderType, number>;
export const INV_SPEED = pack['INV_SPEED'] as Record<InvaderType, number>;
export const FAST_DISEASE = pack['FAST_DISEASE'] as Record<string, number>;
/**
 * The one declared JSON exception: a Set cannot be serialised, so it ships as an array and the
 * Set is rebuilt here. Constructed in content rather than in the engine, because "which invader
 * types are not alive" is a fact about the content, not a rule about play.
 */
export const NOT_ALIVE: ReadonlySet<InvaderType> = new Set(pack['NOT_ALIVE'] as InvaderType[]);
export const TOXIN_MAKERS = pack['TOXIN_MAKERS'] as Record<string, string>;

/* --- tropism --- */
export const TROPISM = pack['TROPISM'] as Record<string, readonly OrganKey[] | 'any'>;

/* --- tuning --- */
export const CELL_KEYS = pack['CELL_KEYS'] as readonly CellKey[];
export const SPEED = pack['SPEED'] as Record<CellKey, number>;
export const CNAME = pack['CNAME'] as Record<string, string>;
export const DIFF = pack['DIFF'] as Record<Difficulty, DifficultyDef>;
export const SPAWN_TABLE = pack['SPAWN_TABLE'] as Record<Difficulty, readonly number[]>;
export const FLAGS = pack['FLAGS'] as Flags;
export const NK_RANGE = pack['NK_RANGE'] as number;
export const NK_HITS = pack['NK_HITS'] as number;
export const ANTIBODY_RATE = pack['ANTIBODY_RATE'] as number;
export const ANTIBODY_CAP = pack['ANTIBODY_CAP'] as number;
export const AB_CAP_FAM_BY_DIFF = pack['AB_CAP_FAM_BY_DIFF'] as Record<Difficulty, number>;
export const AB_CAP_FAM = pack['AB_CAP_FAM'] as number;
export const AFFINITY_AT = pack['AFFINITY_AT'] as number;
export const PRESENT_TIER_BY_DIFF = pack['PRESENT_TIER_BY_DIFF'] as Record<
  Difficulty,
  readonly number[]
>;
export const PRESENT_TIER = pack['PRESENT_TIER'] as readonly number[];
export const RATE_CAP_BY_DIFF = pack['RATE_CAP_BY_DIFF'] as Record<Difficulty, number>;
export const INFECT_ON = pack['INFECT_ON'] as number;
export const BURST_ON = pack['BURST_ON'] as number;
export const SNIPE_RANGE = pack['SNIPE_RANGE'] as number;
export const SNIPE_RANGE_BY_DIFF = pack['SNIPE_RANGE_BY_DIFF'] as Record<Difficulty, number>;
export const NEUTROPHIL_REGEN = pack['NEUTROPHIL_REGEN'] as number;
export const NEUTROPHIL_REGEN_HELPED = pack['NEUTROPHIL_REGEN_HELPED'] as number;
export const EOSINOPHIL_REGEN = pack['EOSINOPHIL_REGEN'] as number;
export const TOXIN_AFTER = pack['TOXIN_AFTER'] as number;
export const MALARIA_LIVER_TURNS = pack['MALARIA_LIVER_TURNS'] as number;
export const ANTIVENOM_CHARGES = pack['ANTIVENOM_CHARGES'] as number;
export const ANTIVENOM_ORDER = pack['ANTIVENOM_ORDER'] as number;
export const WORM_MAX_PER_GAME = pack['WORM_MAX_PER_GAME'] as number;
export const WORM_MAX_PER_TURN = pack['WORM_MAX_PER_TURN'] as number;
export const WORM_DAMAGE_EVERY = pack['WORM_DAMAGE_EVERY'] as number;
export const HEAL_AFTER = pack['HEAL_AFTER'] as number;
export const GRACE_CLEAR = pack['GRACE_CLEAR'] as number;
export const SPACE_CAP = pack['SPACE_CAP'] as number;
export const REINFECT_PC = pack['REINFECT_PC'] as number;
export const VACCINE_COST = pack['VACCINE_COST'] as number;
export const CLONE_COST = pack['CLONE_COST'] as number;
export const MEMORY_BOOST = pack['MEMORY_BOOST'] as number;
