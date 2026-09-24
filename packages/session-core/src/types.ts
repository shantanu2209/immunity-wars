/**
 * The types `LocalSession` and the relay share: the view, the selection, and what is computed
 * beside the view. Moved here from `packages/session/src/types.ts` at P3.4, unchanged, and
 * re-exported from there, so `@immunity-wars/session`'s public API is the same as it was.
 */
import type { ApBreakdown, RegenBreakdown } from '@immunity-wars/engine/internal';

/** The engine's projection. Deliberately opaque — the UI reads fields, it does not construct one. */
export type ViewState = Readonly<Record<string, unknown>>;

/**
 * WHAT THE PLAYER HAS SELECTED — a UI concept the view holds, and the reason it can hold it.
 *
 * `docs/QUERY_PAYLOAD.md` measured why this field exists. A view that does not know which cell is
 * selected must carry `moveDestinations` for all seven, which is 61% of the entire precomputed
 * payload — six sevenths of it answering questions nobody asked. Giving the view a selection
 * collapses that, WITHOUT exposing a single engine query, so the boundary rule stays absolute and
 * Phase 3 inherits no exception to argue about.
 *
 * `family` is the same thing one level down: the production breakdown's six detail fields are read
 * by exactly one function in the legacy UI, and it renders a tooltip.
 */
export interface Selection {
  /** The cell whose move destinations the view should carry. */
  readonly cell: string | null;
  /** The antibody family whose full production breakdown the view should carry. */
  readonly family: string | null;
  /**
   * The ORGAN whose resident macrophage is selected — CP3's one extension to the selection
   * model (docs/COMMAND_SURFACE_PLAN.md §3.6). A resident is keyed by its organ, not by a cell
   * key (the engine spends `res_<organ>`), and it is a separate field rather than an overload
   * of `cell` because `scope()` hands `cell` to `moveDestinations`, which knows no residents.
   * Nothing is selection-scoped for a resident: its patrol steps (± 1 within the branch) and
   * what it can engulf (`perOrgan.residentEatable`) are already in the view. `cell` and
   * `resident` are exclusive by convention — the UI sets one and nulls the other — and both
   * clear at phase boundaries.
   */
  readonly resident: string | null;
}

export const NO_SELECTION: Selection = { cell: null, family: null, resident: null };

/**
 * Query answers the UI needs for EVERY subject on every render, to decide what is clickable.
 *
 * Twenty of the twenty-two. Measured at ~640 bytes at p50 — under 9% of the projection — which is
 * why they are simply carried rather than argued about.
 */
export interface PrecomputedQueries {
  /** Whole-state answers, by query name. */
  readonly state: Readonly<Record<string, unknown>>;
  /** Per-invader answers, parallel to `view.invaders`. */
  readonly perInvader: Readonly<Record<string, readonly unknown[]>>;
  /** Per-cell answers, by cell key. `moveDestinations` is NOT here — it is selection-scoped. */
  readonly perCell: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** Per-organ answers, by organ key. */
  readonly perOrgan: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** Per-family answers, by family key. */
  readonly perFamily: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** `{net, boosted, reduced}` per family — the three fields the always-on panel reads. */
  readonly production: Readonly<Record<string, ProductionSummary>>;
  /**
   * WHEN A SPENT CELL IS BACK — the turn it acts again, per cell key; null when it is not
   * spent or when the engine will not say. The board-state sweep (for-P2.5.md, 4 Sep 2026)
   * dims a spent cell and shows this in its badge slot, and the number must be the ENGINE's:
   * the Neutrophil returns after NEUTROPHIL_REGEN turns, or NEUTROPHIL_REGEN_HELPED when a
   * primed Helper T stands in the blood (Th17 help), and never while the marrow is damaged.
   * `regenAt` on the cell says none of that — the legacy UI showed it and was wrong under
   * help; the first headless run of the badge showed "4" and the cell came back in 2. So this
   * is `neutrophilReadyTurn(g)` (one of the 67 exports), null when the marrow is damaged. Since
   * 6 September 2026 both numbers are read off the engine's `regenBreakdown` (`regen` below):
   * the marrow condition is the engine's own, exact on Hard's compensated marrow where this
   * session's earlier hp-below-max reading was merely conservative.
   */
  readonly readyTurn: Readonly<Record<string, number | null>>;
  /**
   * THE CRISIS EFFECTS IN FORCE — `fx`, one of the 13 keys the view drops (brief §3), summarised
   * so the effects strip can say what an event is still doing and for how long (S25 item 5:
   * "when my antibody capacity was reduced I learned it once, in the log, and it scrolled
   * away"). `capTurns` is turns of the antibody cap remaining; the other three last this turn.
   */
  readonly effects: Readonly<{
    capTurns: number;
    noProduce: boolean;
    apMod: number;
    skipMarch: boolean;
  }>;
  /**
   * THE ACTION POINT TOTAL AS TERMS (6 September 2026, Shantanu's principle: show the effect
   * where the number appears and let the number drill into its causes). The engine's own
   * `apBreakdown`, on its `./internal` entry point: the difficulty's base, each drain, each
   * damaged organ, this turn's crisis modifier, the floor. Its `total` is `apFor(g)` — the
   * view's `apMax` — asserted on the corpus (`tests/equivalence/src/breakdowns.test.ts`), so
   * the UI lists causes and never re-derives the rule.
   */
  readonly ap: ApBreakdown;
  /**
   * WHY A SPENT CELL RETURNS WHEN IT DOES — the engine's `regenBreakdown`, per spent cell, or
   * null when the cell is not spent. `readyTurn` here is what `readyTurn` above is built from;
   * the session no longer reads the marrow itself.
   */
  readonly regen: Readonly<Record<'neutrophil' | 'eosinophil', RegenBreakdown | null>>;
}

export interface ProductionSummary {
  readonly net: number;
  readonly boosted: boolean;
  readonly reduced: boolean;
  /**
   * Immunosuppression: the engine refuses `produce` while `fx.noProduce` is set, and `fx` is
   * one of the 13 keys the view drops. The engine's `productionBreakdown` already reports it
   * as `blocked`; carrying the boolean here (seven booleans, no engine change) is what lets the
   * antibody panel withhold Produce instead of offering what the engine will reject —
   * COMMAND_SURFACE_PLAN §3.1, the one place the standing rule needed a session field.
   */
  readonly blocked: boolean;
}

/** Answers that exist only because something is selected. Null fields when nothing is. */
export interface ScopedQueries {
  /** `moveDestinations` for `selection.cell`. */
  readonly moveDestinations: readonly unknown[] | null;
  /** The full `productionBreakdown` for `selection.family` — the open tooltip. */
  readonly productionDetail: unknown | null;
}
