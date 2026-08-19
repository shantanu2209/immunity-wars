/**
 * THE ARGUMENT SHAPE OF EVERY PURE QUERY — one list, because two would drift.
 *
 * `queries.test.ts` needs this to compare the port against legacy. P2.1's query-payload
 * measurement needs the SAME thing to know what a precomputing `ViewState` would have to carry:
 * a per-invader query is not one answer, it is one answer per invader, and that is the entire
 * reason a reference count cannot stand in for a size.
 *
 * These lists lived inside `queries.test.ts` until P2.1. Copying them into the balance harness
 * would have produced two lists that agree today and silently disagree later — the shape this
 * repository keeps finding (`seam-lib.ts` exists for the same reason at the Task G seam).
 * Behaviour of the B2 comparison is unchanged: same names, same order, same groups.
 *
 * `Shape` is about ARGUMENTS, not about purity or cost. Two of these take no game state at all
 * and one takes only a knob — see `STATE_FREE` below, which is a finding in its own right.
 */

/** What a query needs besides nothing. */
export type Shape = 'state' | 'invader' | 'cell' | 'organ' | 'family';

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
  'helperInBlood',
  'helperLicensed',
  'neutrophilReadyTurn',
  'rateFor',
  'wormAllowed',
] as const;

/** Queries taking (state, invader). */
export const PER_INVADER = [
  'canNeutralise',
  'canTag',
  'abMatch',
  'invSpeed',
  'distToOrgan',
] as const;

/** Queries taking (state, cellKey). */
export const PER_CELL = ['moveDestinations', 'wormStrikeable', 'helperWith'] as const;

/** Queries taking (state, organKey). */
export const PER_ORGAN = ['residentEatable', 'macDisabled'] as const;

/** Queries taking (state, antigen class). */
export const PER_FAMILY = ['capFam', 'rateForFam', 'canProduceFam', 'productionBreakdown'] as const;

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

/**
 * THREE QUERIES THE UI READS THAT TAKE NO GAME STATE, and it matters for where they live.
 *
 * They are absent from the four lists above because the B2 comparison covers them elsewhere or
 * not at all; they are here because the UI demands them (`pnpm seam:homes`) and a report about
 * where the 22 queries should live cannot leave three of them out.
 *
 *   attackable(iv)   reads `knobs.hubSafe` and `iv.zone`. No state — one engine knob and one
 *                    field of a record the view already carries.
 *   famOf(iv)        reads `FAMILY` and `NOVEL_ANTIGENS` from CONTENT, plus iv.novel/iv.disease.
 *   branchLen(o)     reads `ORGANS[o].branch` from CONTENT. Nothing else.
 *
 * `branchLen` and `famOf` are therefore pure functions of the content pack, which `ui` may
 * already import. They need neither a Session method nor a precomputed field — they need the
 * two-line helper that is already implied by `ui -> content` being permitted.
 */
export const STATE_FREE = ['attackable', 'famOf', 'branchLen'] as const;

/** Argument shape of every query named above. */
export const SHAPE_OF: Readonly<Record<string, Shape>> = {
  ...Object.fromEntries(STATE_ONLY.map((n) => [n, 'state' as const])),
  ...Object.fromEntries(PER_INVADER.map((n) => [n, 'invader' as const])),
  ...Object.fromEntries(PER_CELL.map((n) => [n, 'cell' as const])),
  ...Object.fromEntries(PER_ORGAN.map((n) => [n, 'organ' as const])),
  ...Object.fromEntries(PER_FAMILY.map((n) => [n, 'family' as const])),
  // Shapes read from the port's own signatures, not guessed:
  // attackable(iv: Invader), famOf(iv: {novel?, disease}), branchLen(o: OrganKey).
  attackable: 'invader',
  famOf: 'invader',
  branchLen: 'organ',
};

/**
 * THE 22 QUERIES `v2_ui.html` READS — the set P2.1's open decision is about.
 *
 * NOT a hand-made list, even though it is written out here. `tools/legacy-harness/homes.ts`
 * derives the same set mechanically from the board script's free identifiers and the module each
 * name is re-exported from, and it FAILS if the two disagree. So this array is a declaration that
 * a measurement checks, not a claim standing on its own — the arrangement `seam-lib.ts` uses for
 * the surface it owns.
 *
 * It is written out rather than derived here because `tests/` cannot reach `tools/legacy-harness`,
 * and inverting that dependency to avoid one checked list would be the more expensive mistake.
 */
export const UI_QUERIES = [
  'abMatch',
  'antivenomTargets',
  'anyNeutralisable',
  'anyTaggable',
  'attackable',
  'branchLen',
  'canNeutralise',
  'canTag',
  'capFam',
  'famOf',
  'helperWith',
  'hivActive',
  'lymphBlocked',
  'macrophageEatable',
  'moveDestinations',
  'netTargets',
  'nkTargets',
  'productionBreakdown',
  'rateFor',
  'residentEatable',
  'snipeTargets',
  'wormStrikeable',
] as const;
