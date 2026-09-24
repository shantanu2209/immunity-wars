/**
 * The 22 engine queries the UI reads, grouped by what they take.
 *
 * DERIVED, AND CHECKED AGAINST THE DERIVATION. `tools/legacy-harness/homes.ts` computes this set
 * mechanically from the identifiers `v2_ui.html` reads and the module each name is re-exported
 * from, and `tests/session/src/query-agreement.test.ts` asserts these lists equal
 * `@immunity-wars/equivalence/query-shapes`. So this file is a declaration a check falsifies, not
 * a list standing on its own — the same arrangement `seam-lib.ts` has at the Task G seam. The
 * dependency cannot run the other way: `packages/` must not import out of `tests/`.
 *
 * THE TWO ABSENTEES ARE THE WHOLE DECISION. `moveDestinations` and the full `productionBreakdown`
 * are NOT precomputed — they are selection-scoped, because a view that does not know what is
 * selected has to answer them for every possible subject at once. `docs/QUERY_PAYLOAD.md`
 * measured that at 88% of the entire precomputed payload.
 */

/** Queries taking only the game state. */
export const STATE_ONLY = [
  'anyNeutralisable',
  'anyTaggable',
  'macrophageEatable',
  'snipeTargets',
  'netTargets',
  'nkTargets',
  'antivenomTargets',
  'hivActive',
  'lymphBlocked',
  'rateFor',
] as const;

/** Queries taking (state, invader). `attackable` and `famOf` take the invader alone. */
export const PER_INVADER = ['canNeutralise', 'canTag', 'abMatch'] as const;

/** Queries taking the invader ALONE — no game state. */
export const INVADER_ONLY = ['attackable', 'famOf'] as const;

/** Queries taking (state, cellKey). `moveDestinations` is selection-scoped and absent. */
export const PER_CELL = ['wormStrikeable', 'helperWith'] as const;

/** Queries taking (state, organKey). `branchLen` takes the organ alone. */
export const PER_ORGAN = ['residentEatable'] as const;

/** Queries taking the organ ALONE — a pure function of the content pack. */
export const ORGAN_ONLY = ['branchLen'] as const;

/** Queries taking (state, family). The full `productionBreakdown` is selection-scoped. */
export const PER_FAMILY = ['capFam'] as const;

/** Selection-scoped: answered for the selected subject only. */
export const SCOPED = ['moveDestinations', 'productionBreakdown'] as const;

export const CELL_KEYS = [
  'macrophage',
  'neutrophil',
  'bcell',
  'tcell',
  'helper',
  'nk',
  'eosinophil',
] as const;

export const FAMILIES = ['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK', 'X'] as const;

/** Every name this package answers, in any group. Used by the agreement test. */
export const ALL_UI_QUERIES: readonly string[] = [
  ...STATE_ONLY,
  ...PER_INVADER,
  ...INVADER_ONLY,
  ...PER_CELL,
  ...PER_ORGAN,
  ...ORGAN_ONLY,
  ...PER_FAMILY,
  ...SCOPED,
];
