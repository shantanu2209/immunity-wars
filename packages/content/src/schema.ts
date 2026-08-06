/**
 * Zod schemas for the rules pack.
 *
 * ZOD IS THE VALIDATOR HERE, NEVER THE CONSTRUCTOR.
 *
 * `load.ts` calls `.parse()` for its THROW and deliberately discards its RETURN VALUE. The
 * values the package exports are the objects that came out of `JSON.parse`, untouched. That is
 * not a stylistic choice; it is forced by measurement, and it buys two things at once.
 *
 * WHY — the measurement, taken before any of this was written:
 *
 *   z.object({c,a,b}).parse({a,b,c})          -> keys come back c,a,b   REORDERED to schema order
 *   z.record(z.string(), …).parse({z,a,m})    -> keys come back z,a,m   order preserved
 *   z.record(z.enum([…]), …).parse({l,h,g})   -> keys come back h,g,l   REORDERED to enum order
 *
 * Key order is load-bearing in this engine: `TROPISM`'s order feeds `rollOrgan`, `FAM_KEYS`'
 * order feeds the kidney antibody leak, and `tests/equivalence/src/data.test.ts` compares all 22
 * tables against legacy with `canonical()`, which is order-sensitive. A schema that rebuilds an
 * object is therefore a live hazard — and note that the MORE STRONGLY TYPED spelling
 * (`z.record` with a key enum) is the one that reorders. The safe-looking choice is the unsafe
 * one, which is exactly the sort of thing to measure rather than reason about.
 *
 * SO: because the parsed output is discarded, none of that reordering can reach anything. And
 * because it cannot, the schemas below are free to be as STRICT as possible — exact key sets,
 * key enums, `strictObject` — without any ordering risk at all. Discarding the output is what
 * lets the validation be maximally strict rather than minimally invasive.
 *
 * Two more measured facts, encoded as rules:
 *
 *   - `.optional()` leaves an absent key ABSENT. `.default(false)` MATERIALISES it. **`.default`
 *     is banned in this file.** A materialised `novel: false` is precisely the failure mode of
 *     docs/FINDINGS.md #13 — the novel pathogen silently becomes an ordinary EXB bacterium and
 *     the clonal-selection lesson stops being taught.
 *   - Unknown keys are SILENTLY STRIPPED by a plain `z.object`. Everything here is
 *     `z.strictObject`, so a mistyped table name is an error rather than a table that quietly
 *     vanishes.
 */

import { z } from 'zod';

/* ------------------------------------------------------------------ *
 * Key vocabularies — closed sets, mirroring the unions in types.ts
 * ------------------------------------------------------------------ */

const OrganKeyS = z.enum(['heart', 'lungs', 'liver', 'marrow', 'brain', 'spleen', 'kidneys']);
const RouteKeyS = z.enum(['nose', 'gut', 'contact', 'wound', 'bite', 'blood']);
const DifficultyS = z.enum(['training', 'normal', 'hard']);
const FamilyKeyS = z.enum(['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK']);
const CellKeyS = z.enum([
  'macrophage',
  'neutrophil',
  'bcell',
  'tcell',
  'helper',
  'nk',
  'eosinophil',
]);
const InvaderTypeS = z.enum([
  'virus',
  'hidden',
  'bacteria',
  'toxin',
  'venom',
  'fungus',
  'worm',
  'malaria',
  'parasite',
]);

/** Every organ key present, exactly once, nothing else. */
const byOrgan = <T extends z.ZodTypeAny>(v: T) => z.record(OrganKeyS, v);
const byRoute = <T extends z.ZodTypeAny>(v: T) => z.record(RouteKeyS, v);
const byDifficulty = <T extends z.ZodTypeAny>(v: T) => z.record(DifficultyS, v);

/* ------------------------------------------------------------------ *
 * board
 * ------------------------------------------------------------------ */

const OrganDefS = z.strictObject({
  name: z.string(),
  kind: z.enum(['vital', 'defence']),
  integrity: z.number().int().positive(),
  branch: z.number().int().positive(),
  effect: z.string(),
  bio: z.string(),
});

const RouteDefS = z.strictObject({
  name: z.string(),
  len: z.number().int().positive(),
});

export const BoardS = z.strictObject({
  ORGANS: byOrgan(OrganDefS),
  ALL_ORGANS: z.array(OrganKeyS),
  ORGAN_SETS: byDifficulty(z.array(OrganKeyS)),
  ROUTES: byRoute(RouteDefS),
  ROUTE_KEYS: z.array(RouteKeyS),
  /** null is meaningful: blood has NO lymphatic link, which is why a needle is so dangerous. */
  LYMPH_GROUP: byRoute(z.string().nullable()),
  /** Superseded by LYMPH_GROUP and unreferenced. Ported dead — docs/FINDINGS.md #11. */
  PAIR: z.record(z.string(), RouteKeyS),
  LYMPH_STEP: z.number().int().positive(),
  RESIDENT_NAME: byOrgan(z.string()),
});

/* ------------------------------------------------------------------ *
 * deck
 * ------------------------------------------------------------------ */

/**
 * NOT ONE `.default()` BELOW, and that is load-bearing rather than tidy. See the file header
 * and docs/FINDINGS.md #13.
 */
const CardS = z.strictObject({
  dz: z.string().min(1),
  type: InvaderTypeS,
  lane: RouteKeyS,
  amnesia: z.boolean().optional(),
  hidesInMac: z.boolean().optional(),
  variant: z.boolean().optional(),
  blocksLymph: z.boolean().optional(),
  forced: OrganKeyS.optional(),
  drain: z.number().int().positive().optional(),
  killsHelper: z.boolean().optional(),
  needsHepB: z.boolean().optional(),
  novel: z.boolean().optional(),
});

export const DeckS = z.strictObject({
  DECK_MASTER: z.array(CardS).min(1),
});

/* ------------------------------------------------------------------ *
 * events
 * ------------------------------------------------------------------ */

const EventDefS = z.strictObject({
  bad: z.boolean().optional(),
  name: z.string(),
  why: z.string(),
  tell: z.string().optional(),
});

const RareDefS = z.strictObject({
  name: z.string(),
  why: z.string(),
});

export const EventsS = z.strictObject({
  EVENTS: z.record(z.string(), EventDefS),
  BAD_POOL: z.array(z.string()),
  GOOD_POOL: z.array(z.string()),
  RARE: z.record(z.string(), RareDefS),
});

/* ------------------------------------------------------------------ *
 * families
 * ------------------------------------------------------------------ */

const FamilyDefS = z.strictObject({
  name: z.string(),
  short: z.string(),
  col: z.string().regex(/^#[0-9a-f]{6}$/i, 'colour must be a 6-digit hex code'),
  bio: z.string(),
});

export const FamiliesS = z.strictObject({
  FAMILIES: z.record(FamilyKeyS, FamilyDefS),
  FAM_KEYS: z.array(FamilyKeyS),
  FAMILY: z.record(z.string(), FamilyKeyS),
});

/* ------------------------------------------------------------------ *
 * invaders
 * ------------------------------------------------------------------ */

export const InvadersS = z.strictObject({
  INV_HP: z.record(InvaderTypeS, z.number().int().positive()),
  INV_SPEED: z.record(InvaderTypeS, z.number().int().positive()),
  FAST_DISEASE: z.record(z.string(), z.number().int().positive()),
  /** A Set in the engine; JSON cannot hold one, so it ships as an array. load.ts rebuilds it. */
  NOT_ALIVE: z.array(InvaderTypeS),
  TOXIN_MAKERS: z.record(z.string(), z.string()),
});

/* ------------------------------------------------------------------ *
 * tropism
 * ------------------------------------------------------------------ */

export const TropismS = z.strictObject({
  /** "any" = generalist: it can take any organ in play. */
  TROPISM: z.record(z.string(), z.union([z.array(OrganKeyS).min(1), z.literal('any')])),
});

/* ------------------------------------------------------------------ *
 * tuning
 * ------------------------------------------------------------------ */

const DifficultyDefS = z.strictObject({
  ap: z.number().int().positive(),
  turns: z.number().int().positive(),
  spawn: z.string(),
});

const FlagsS = z.strictObject({
  organs: z.boolean(),
  residents: z.boolean(),
  residentMove: z.boolean(),
  primeResident: z.boolean(),
  lymph: z.boolean(),
  crisisEvents: z.boolean(),
  heartOrgan: z.boolean(),
  dendritic: z.boolean(),
  helperT: z.boolean(),
  nkCell: z.boolean(),
  complement: z.boolean(),
  toxins: z.boolean(),
  fungus: z.boolean(),
  worms: z.boolean(),
  malaria: z.boolean(),
  eosinophil: z.boolean(),
  rareEvents: z.boolean(),
  specials: z.boolean(),
  tierB: z.boolean(),
});

const posInt = z.number().int().positive();
const nonNegInt = z.number().int().nonnegative();

export const TuningS = z.strictObject({
  CELL_KEYS: z.array(CellKeyS),
  SPEED: z.record(CellKeyS, posInt),
  CNAME: z.record(z.string(), z.string()),
  DIFF: byDifficulty(DifficultyDefS),
  SPAWN_TABLE: byDifficulty(z.array(posInt).length(6)),
  FLAGS: FlagsS,
  NK_RANGE: nonNegInt,
  NK_HITS: posInt,
  ANTIBODY_RATE: posInt,
  ANTIBODY_CAP: posInt,
  AB_CAP_FAM_BY_DIFF: byDifficulty(posInt),
  AB_CAP_FAM: posInt,
  AFFINITY_AT: posInt,
  PRESENT_TIER_BY_DIFF: byDifficulty(z.array(nonNegInt).length(3)),
  PRESENT_TIER: z.array(nonNegInt).length(3),
  RATE_CAP_BY_DIFF: byDifficulty(posInt),
  INFECT_ON: posInt,
  BURST_ON: posInt,
  SNIPE_RANGE: posInt,
  SNIPE_RANGE_BY_DIFF: byDifficulty(posInt),
  NEUTROPHIL_REGEN: posInt,
  NEUTROPHIL_REGEN_HELPED: posInt,
  EOSINOPHIL_REGEN: posInt,
  TOXIN_AFTER: posInt,
  MALARIA_LIVER_TURNS: posInt,
  ANTIVENOM_CHARGES: posInt,
  ANTIVENOM_ORDER: posInt,
  WORM_MAX_PER_GAME: posInt,
  WORM_MAX_PER_TURN: posInt,
  WORM_DAMAGE_EVERY: posInt,
  HEAL_AFTER: posInt,
  GRACE_CLEAR: posInt,
  SPACE_CAP: posInt,
  REINFECT_PC: z.number().min(0).max(1),
  VACCINE_COST: posInt,
  CLONE_COST: posInt,
  MEMORY_BOOST: posInt,
});

/* ------------------------------------------------------------------ *
 * the pack stamp — docs/PHASE1_BRIEF.md §3
 * ------------------------------------------------------------------ */

/**
 * The stamp is VALIDATED FOR SHAPE and deliberately NOT checked against an expected value.
 *
 * The bundled pack ships in the same commit as the engine that reads it, so a version check
 * here would compare a constant against a constant — a guard against a state this repository
 * cannot produce, which is exactly the pattern docs/FINDINGS.md #22 names. Adding one would be
 * a new instance of the defect the schema work exists to find.
 *
 * The check belongs where a pack can genuinely disagree with the engine: the DOWNLOADABLE-pack
 * loader, seam 7 in docs/PHASE1_BRIEF.md §6, which is Phase 2 work.
 */
export const PackStampS = z.strictObject({
  packId: z.string().min(1),
  packVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  rulesVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
});

/** The whole pack, assembled. `strictObject` so an unknown table is an error, not a shrug. */
export const RulesPackS = z.strictObject({
  ...PackStampS.shape,
  ...BoardS.shape,
  ...DeckS.shape,
  ...EventsS.shape,
  ...FamiliesS.shape,
  ...InvadersS.shape,
  ...TropismS.shape,
  ...TuningS.shape,
});
