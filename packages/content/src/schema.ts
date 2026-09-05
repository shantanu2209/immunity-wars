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

/**
 * The rules tables the geometry parity check reads.
 *
 * Imported as raw JSON rather than from load.ts, so schema.ts stays free of module cycles and
 * the check compares the FILES rather than two views of the same loaded object.
 *
 * DECLARED HERE, AT THE TOP, AND THAT MATTERS. These are default parameter values for
 * boardPackSchema(), which is CALLED at module scope further down. Declared after that call they
 * sit in the temporal dead zone and every import of this package throws
 * `Cannot access 'ORGANS_FOR_PARITY' before initialization`. `tsc --noEmit` does NOT catch it —
 * it was green while the module was unloadable — so the guard is placement plus this note.
 */
import boardRulesJson from './rules/board.json';

const ORGANS_FOR_PARITY = boardRulesJson.ORGANS as Record<string, { branch: number }>;
const ROUTES_FOR_PARITY = boardRulesJson.ROUTES as Record<string, { len: number }>;

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
  /**
   * Diseases DELIBERATELY absent from FAMILY because they have no antigen class.
   *
   * This is the declared exemption docs/TASK_C_HANDOFF.md §3 asks for, and it is the fix for
   * docs/FINDINGS.md #13. `FAMILY` stays byte-identical to legacy — the exemption is a separate
   * table rather than a `FAMILY` entry, because there is no honest value to put there: Pathogen
   * X is not `EXB`, and inventing a seventh class for it would make the six mean less.
   *
   * A novel antigen is one the body has never met, so by definition no existing antibody class
   * fits it. That is the lesson the card exists to teach.
   */
  NOVEL_ANTIGENS: z.array(z.string().min(1)),
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

/**
 * The whole pack, assembled. `strictObject` so an unknown table is an error, not a shrug.
 *
 * THE COMPLETENESS CHECK IS A BEHAVIOUR CHANGE, not schema tidying — docs/DEVIATIONS.md #5.
 *
 * Every card must have a `FAMILY` entry or an explicit `NOVEL_ANTIGENS` exemption. Before this,
 * Pathogen X had neither: it reached the `X` antibody pool only because `famOf` short-circuits
 * on `iv.novel` before consulting `FAMILY` at all. Lose that flag anywhere — a loader, a JSON
 * round trip dropping a falsy field, a future refactor — and the novel pathogen silently became
 * an ordinary `EXB` bacterium, killable by an antibody held for something else, and the
 * clonal-selection lesson stopped being taught with nothing failing.
 *
 * docs/FINDINGS.md #13 records that at length. This is the boundary enforcing it instead of a
 * fallback guessing.
 */
export const RulesPackS = z
  .strictObject({
    ...PackStampS.shape,
    ...BoardS.shape,
    ...DeckS.shape,
    ...EventsS.shape,
    ...FamiliesS.shape,
    ...InvadersS.shape,
    ...TropismS.shape,
    ...TuningS.shape,
  })
  .superRefine((p, ctx) => {
    const exempt = new Set(p.NOVEL_ANTIGENS);
    for (const card of p.DECK_MASTER) {
      if (card.dz in p.FAMILY || exempt.has(card.dz)) continue;
      ctx.addIssue({
        code: 'custom',
        path: ['FAMILY', card.dz],
        message:
          `card "${card.dz}" has no FAMILY entry and is not listed in NOVEL_ANTIGENS. ` +
          `Every card needs an antigen class, or an explicit exemption saying why it has none.`,
      });
    }
    /* An exemption for a card that does not exist is a licence nobody is using. */
    const deck = new Set(p.DECK_MASTER.map((c) => c.dz));
    for (const dz of p.NOVEL_ANTIGENS) {
      if (!deck.has(dz)) {
        ctx.addIssue({
          code: 'custom',
          path: ['NOVEL_ANTIGENS'],
          message: `"${dz}" is exempted from FAMILY but is not a card in the deck`,
        });
      }
      if (dz in p.FAMILY) {
        ctx.addIssue({
          code: 'custom',
          path: ['NOVEL_ANTIGENS'],
          message: `"${dz}" is exempted from FAMILY but ALSO has a FAMILY entry — pick one`,
        });
      }
    }
  });

/* ================================================================== *
 * TASK C3 — board geometry, regions, disease text, labels
 *
 * Extracted from tools/legacy/v2_ui.html. Same rules as above: validator
 * never constructor, strictObject everywhere, no `.default()`.
 * ================================================================== */

const Point = z.strictObject({ x: z.number(), y: z.number() });

/** Step keys are the strings "1", "2", … — the one place in the content with numeric keys. */
const stepKey = z.string().regex(/^[1-9]\d*$/, 'step keys must be positive integers as strings');

export const GeometryS = z.strictObject({
  VW: z.number().positive(),
  VH: z.number().positive(),
  HUB: Point,
  ORGAN_POS: byOrgan(Point),
  CHIP_POS: byOrgan(Point),
  BRANCH: byOrgan(z.record(stepKey, Point)),
  ROUTE: byRoute(z.record(stepKey, Point)),
  ENTRY: byRoute(z.strictObject({ x: z.number(), y: z.number(), t: z.string() })),
  /**
   * S25 item 11 (4 September 2026): where each organ's and entry's label sits — below the icon
   * at the board's left and right, to the right of it at top and bottom — and the viewBox that
   * crops the canvas to the annotations plus a safe margin. Both derived by the generator from
   * the angles; the print follows the same data. Keys are the organ and route keys.
   */
  LABEL_SIDE: z.record(z.string(), z.enum(['below', 'right'])),
  VIEWBOX: z.strictObject({
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
  }),
});

const RegionKeyS = z.enum(['nose', 'gut', 'contact', 'wound', 'bite', 'blood', 'core']);

export const RegionsS = z.strictObject({
  REGIONS: z.record(
    RegionKeyS,
    z.strictObject({ cx: z.number(), cy: z.number(), scale: z.number().positive() }),
  ),
  REGION_BOX: z.record(
    RegionKeyS,
    z.strictObject({
      x: z.number(),
      y: z.number(),
      w: z.number().positive(),
      h: z.number().positive(),
    }),
  ),
  REGION_LABEL: z.record(RegionKeyS, z.string().min(1)),
});

export const DiseasesS = z.strictObject({
  /** One-line hook shown on the card. Only a subset of diseases carry one. */
  FACT: z.record(z.string(), z.string().min(1)),
  /** d=discovered c=causes w=found p=prevent r=treat */
  DZINFO: z.record(
    z.string(),
    z.strictObject({
      d: z.string(),
      c: z.string(),
      w: z.string(),
      p: z.string(),
      r: z.string(),
    }),
  ),
  /** [contagious, severity, spread, persistence, rarity-label] — the card's stat block. */
  DZSTATS: z.record(
    z.string(),
    z.tuple([
      z.number().int().min(1).max(5),
      z.number().int().min(1).max(5),
      z.number().int().min(1).max(5),
      z.number().int().min(1).max(5),
      z.enum(['Common', 'Rare', 'Legendary']),
    ]),
  ),
});

export const LabelsS = z.strictObject({
  UM: z.record(CellKeyS, z.strictObject({ n: z.string(), r: z.string(), g: z.string().min(1) })),
  UI_: z.record(
    InvaderTypeS,
    z.strictObject({ n: z.string(), c: z.string(), g: z.string().min(1) }),
  ),
  /**
   * "Beat it" — how each pathogen TYPE is actually beaten, one sentence per type. A UI constant
   * in legacy (`v2_ui.html`, BEAT_BY_TYPE) that the string inventory and the C3 parity tables
   * never reached; moved into content for the pathogen card (P2.5, 4 Sep 2026) and pinned
   * against legacy like every other extracted table. Kartik's science; the diseases namespace.
   */
  BEAT_BY_TYPE: z.record(InvaderTypeS, z.string().min(1)),
  RNAME: byOrgan(z.string().min(1)),
  RGLYPH: byOrgan(z.string().min(1)),
  ORGAN_ART: byOrgan(z.string().min(1)),
});

/**
 * THE BOARD PACK, with the cross-checks that are the entire point of C3.
 *
 * `superRefine` rather than a plain `refine`, so every violation is reported with its own path
 * instead of the first one aborting the rest. It runs AFTER shape validation and returns
 * nothing, so — like everything else here — it cannot rebuild a table.
 *
 * These checks are what make `geometry.json` a SINGLE SOURCE rather than merely a moved file.
 * Geometry and rules can now only disagree loudly. Before C3 they could disagree silently, and
 * the printed A2 board and the app were two independent copies of the same numbers.
 */
export function boardPackSchema(
  organs: Record<string, { branch: number }> = ORGANS_FOR_PARITY,
  routes: Record<string, { len: number }> = ROUTES_FOR_PARITY,
) {
  return z
    .strictObject({
      ...PackStampS.shape,
      ...GeometryS.shape,
      ...RegionsS.shape,
      ...DiseasesS.shape,
      ...LabelsS.shape,
    })
    .superRefine((p, ctx) => {
      /* Every drawn point must be inside the viewBox. Catches a transposed or mistyped coordinate. */
      const inBox = (pt: { x: number; y: number }, where: string): void => {
        if (pt.x < 0 || pt.x > p.VW || pt.y < 0 || pt.y > p.VH) {
          ctx.addIssue({
            code: 'custom',
            path: where.split('.'),
            message: `point (${pt.x}, ${pt.y}) is outside the ${p.VW}x${p.VH} viewBox`,
          });
        }
      };
      inBox(p.HUB, 'HUB');
      for (const [o, pt] of Object.entries(p.ORGAN_POS)) inBox(pt, `ORGAN_POS.${o}`);
      for (const [o, pt] of Object.entries(p.CHIP_POS)) inBox(pt, `CHIP_POS.${o}`);
      for (const [o, steps] of Object.entries(p.BRANCH)) {
        for (const [s, pt] of Object.entries(steps)) inBox(pt, `BRANCH.${o}.${s}`);
      }
      for (const [r, steps] of Object.entries(p.ROUTE)) {
        for (const [s, pt] of Object.entries(steps)) inBox(pt, `ROUTE.${r}.${s}`);
      }
      for (const [r, e] of Object.entries(p.ENTRY)) inBox(e, `ENTRY.${r}`);

      /**
       * PHYSICAL/DIGITAL PARITY, enforced rather than remembered (CLAUDE.md hard rule).
       *
       * The number of drawn steps on a branch must equal the branch length the RULES give that
       * organ, and likewise for routes. The Heart's 2-step branch (docs/FINDINGS.md #15) is the
       * case that makes this real: it is the only organ that differs, so it is exactly the one a
       * future edit would get wrong in one file and not the other.
       */
      for (const [o, steps] of Object.entries(p.BRANCH)) {
        const def = organs[o];
        if (!def) {
          // NOT a defensive arm: this fires when geometry.json and rules/board.json disagree
          // about which ORGANS EXIST, which is a different drift from a wrong step count and is
          // exactly what one source is supposed to make impossible.
          ctx.addIssue({
            code: 'custom',
            path: ['BRANCH', o],
            message: `geometry draws a branch for "${o}", which rules/board.json does not list as an organ`,
          });
          continue;
        }
        const drawn = Object.keys(steps).length;
        if (drawn !== def.branch) {
          ctx.addIssue({
            code: 'custom',
            path: ['BRANCH', o],
            message: `geometry draws ${drawn} branch steps but the rules give ${o} branch ${def.branch}`,
          });
        }
      }
      for (const [r, steps] of Object.entries(p.ROUTE)) {
        const def = routes[r];
        if (!def) {
          ctx.addIssue({
            code: 'custom',
            path: ['ROUTE', r],
            message: `geometry draws a route "${r}", which rules/board.json does not list as a route`,
          });
          continue;
        }
        const drawn = Object.keys(steps).length;
        if (drawn !== def.len) {
          ctx.addIssue({
            code: 'custom',
            path: ['ROUTE', r],
            message: `geometry draws ${drawn} route steps but the rules give ${r} length ${def.len}`,
          });
        }
      }
    });
}

/**
 * The board pack, bound to the real rules tables.
 *
 * `boardPackSchema` takes them as parameters rather than closing over the import, for one
 * reason: it makes the "rules and geometry disagree about which organs exist" arm REACHABLE
 * FROM A TEST. The first draft indexed the rules table with `?? {}`, which the coverage gate
 * correctly excluded as a dead defensive arm — two more entries on a list that is explicitly a
 * liability, guarding a state the schema had already made impossible. That is the pattern of
 * docs/FINDINGS.md #22, and writing a new instance of it during the schema work that exists to
 * FIND it would have been the wrong direction. Injecting the tables turns two dead arms into
 * two live, tested checks.
 */
export const BoardPackS = boardPackSchema();
