/**
 * THE SUITE MANIFEST — schema, and the reconciliation it exists to hold.
 *
 * `docs/PHASE1_BRIEF.md` §7 lists seven test suites in a table. That table has had no counterpart
 * on disk since it was written; Task D flagged it, Task E carried it forward, and this is it.
 *
 * IT IS NOT A TRANSCRIPTION OF §7, because §7 does not describe the disk. Writing it out as seven
 * suites would have produced a tidy file asserting something false — which is the failure this
 * repository has now recorded eleven times. What is here is the reconciliation, and the sentence
 * below is the load-bearing part of it.
 *
 * WHY THE MANIFEST MUST BE LOAD-BEARING RATHER THAN DECORATIVE. A document listing suites drifts
 * from the suites the moment one is added, renamed or quietly stops running, and nothing goes red.
 * So three things consume this file:
 *
 *   1. the CI workflows build their job matrix from it — no tier list duplicated in YAML;
 *   2. the dashboard renders one row per entry, and an entry with NO RESULT renders RED rather
 *      than being omitted, because a suite that silently stopped running must look worse than one
 *      that failed;
 *   3. `manifest.test.ts` asserts every command resolves to something real, every suite declares
 *      its negative controls, and every §7 row is accounted for.
 *
 * Without (3) this file would be the twelfth documented-but-unenforced claim.
 */

import { z } from 'zod';

/**
 * ============================================================================================
 * THE SENTENCE
 * ============================================================================================
 *
 * Rendered VERBATIM on the dashboard, never paraphrased, and pinned by `manifest.test.ts` so it
 * cannot be softened by editing.
 *
 * It is the single most important thing anyone arriving at this repository needs to understand
 * about what is and is not proven here, and it is the sentence most likely to be softened by
 * someone who reads it as negative. IT IS NOT NEGATIVE. It is the reason the property suite
 * exists: agreement with legacy is a different claim from correctness, the corpus can only make
 * the first, and Task D built the second instrument precisely because the first cannot reach it.
 *
 * A bug-for-bug port is GREEN on a violation both engines share. 6,000 identical games say the
 * port matches legacy and say nothing about whether legacy was right.
 */
export const RECONCILIATION =
  'Four suites and three cross-cutting properties. There is no unit suite. What exists is the ' +
  'equivalence corpus, which proves AGREEMENT and not CORRECTNESS — a bug-for-bug port is green ' +
  'on a violation both engines share.';

/** The seven rows of `docs/PHASE1_BRIEF.md` §7, named so the reconciliation can be checked. */
export const BRIEF_SUITES = [
  'unit',
  'property',
  'balance',
  'negative',
  'schema',
  'boundary',
  'serialisation',
] as const;

export type BriefSuite = (typeof BRIEF_SUITES)[number];

/** Which tier a command belongs to. `manual` is deliberate-only — never scheduled. */
export const TIERS = ['per-push', 'nightly', 'manual'] as const;
export type Tier = (typeof TIERS)[number];

const tierEntry = z.object({
  /** A real command: either a package.json script or a file the runner can execute. */
  command: z.string().min(1),
  /** Human-readable scale — "210 games", "10,002 games". Feeds the does-not-prove sentence. */
  scale: z.string().min(1),
  /** Whether a red result blocks the merge. Reported on the dashboard beside the result. */
  blocking: z.boolean(),
  /** Rough wall time, for tier budgeting. Measured, not guessed. */
  approxSeconds: z.number().positive(),
});

export const suiteSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /**
   * Which §7 row this realises, or `null` where it realises none. `null` is a real answer and is
   * used: some suites here have no §7 row at all.
   */
  briefSuite: z.enum(BRIEF_SUITES).nullable(),
  /** What a green run of this suite licenses you to claim. */
  proves: z.string().min(1),
  /**
   * What it does NOT prove. REQUIRED, and required to be non-empty, because a suite table listing
   * only what each suite proves is how "the corpus is green" becomes "the engine is correct".
   */
  doesNotProve: z.string().min(1),
  /**
   * How many negative controls this suite carries. A suite with zero is a suite nobody has
   * falsified; `manifest.test.ts` rejects it.
   */
  negativeControls: z.number().int().positive(),
  /** Where the controls live, so the count can be audited rather than trusted. */
  controlFiles: z.array(z.string().min(1)).min(1),
  /**
   * Spelled out rather than `z.record(z.enum(TIERS), ...)`, which in Zod 4 demands every key.
   * A suite legitimately runs in only some tiers — content-schema has no nightly tier because the
   * per-push one already covers every pack.
   */
  tiers: z
    .object({
      'per-push': tierEntry.optional(),
      nightly: tierEntry.optional(),
      manual: tierEntry.optional(),
    })
    .refine((t) => Object.values(t).some(Boolean), {
      message: 'a suite with no tiers never runs, which is worse than a suite that fails',
    }),
  /** Result file the dashboard reads. Missing ⇒ the row renders RED, never omitted. */
  resultFile: z.string().min(1),
});

export type Suite = z.infer<typeof suiteSchema>;

/**
 * A §7 row with no suite of its own — realised INSIDE other suites, or not existing at all.
 *
 * This is the half a suite list cannot express, and leaving it out is what would make the manifest
 * a paraphrase of §7 rather than a correction of it.
 */
export const crossCuttingSchema = z.object({
  briefSuite: z.enum(BRIEF_SUITES),
  /** Why it has no suite of its own. */
  status: z.enum(['realised-inside-other-suites', 'does-not-exist']),
  /** Stated plainly, in the same register as the reconciliation sentence. */
  explanation: z.string().min(1),
  /** Where it actually lives — suite ids, or file paths for a mechanism. */
  realisedIn: z.array(z.string().min(1)),
});

export type CrossCutting = z.infer<typeof crossCuttingSchema>;

export const manifestSchema = z.object({
  manifestVersion: z.literal(1),
  reconciliation: z.literal(RECONCILIATION),
  note: z.string().min(1),
  suites: z.array(suiteSchema).min(1),
  crossCutting: z.array(crossCuttingSchema),
});

export type Manifest = z.infer<typeof manifestSchema>;
