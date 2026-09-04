/**
 * SEAM 1 — the interface everything talks to the game through.
 *
 * Shaped by measurement, not by taste. Every decision below has a recorded reason:
 * `docs/SEAM_DECISIONS.md` §2, `docs/PHASE2_BRIEF.md` v1.1 §3, and `docs/QUERY_PAYLOAD.md`.
 *
 * THE FOUR CONSTRAINTS THIS INTERFACE EXISTS TO SATISFY
 *
 * 1. `applyAction(g, a)` MUTATES `g` IN PLACE and returns only `{ok}`. A shared mutable object
 *    cannot be diffed by React or serialised by a relay at the right moment, so Session owns the
 *    state and hands out a projection. The raw `GameState` is never returned by anything here.
 *
 * 2. `endCommand` returns a BURST — up to 9 frames, each carrying a full projection
 *    (`FINDINGS.md` #31). One callback cannot express that: nine calls look like nine actions,
 *    one call loses the animation. Hence the discriminated union on `subscribe`.
 *
 * 3. `sendAction` IS ASYNC EVEN LOCALLY. If the local implementation were synchronous every call
 *    site would be written synchronously, and `RelaySession` would be a rewrite rather than a
 *    second implementation. This is the cheapest thing to get right now and the most expensive
 *    to retrofit.
 *
 * 4. THE ENGINE IS NOT REPLAYABLE. It calls global `Math.random()` in six places with no
 *    injection point (`FINDINGS.md` #40), so two clients applying the same action to the same
 *    state diverge silently. Nothing here may assume an action can be replayed: the unit of
 *    synchronisation is the VIEW, never the action.
 */

/** The engine's projection. Deliberately opaque — the UI reads fields, it does not construct one. */
export type ViewState = Readonly<Record<string, unknown>>;

/** One frame of an `endCommand` burst. Presentation only. */
export interface BurstFrame {
  readonly label: string;
  readonly dice: unknown;
  readonly view: ViewState;
}

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
}

export const NO_SELECTION: Selection = { cell: null, family: null };

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

/**
 * Everything the UI is given. A function of (game state, selection), which is what a UI renders.
 *
 * Note what is NOT here, and it is the point: no `GameState`, no `deck`, no engine function.
 */
export interface SessionView {
  readonly game: ViewState;
  readonly selection: Selection;
  readonly queries: PrecomputedQueries;
  readonly scoped: ScopedQueries;
  /**
   * UNDO IS FOR MOVES ONLY — a SESSION rule, ruled 4 September 2026 (docs/for-P2.5.md).
   *
   * Movement is repositioning: no dice, no hidden information. Everything else is commitment —
   * attacks roll dice, engulf consumes a target, produce changes the pool — and undoing those
   * would re-roll a bad die. So undo is available during the command phase only while every
   * accepted action this phase has been a move; the first accepted committing action ends it
   * for the phase; a REJECTED committing action does not (nothing happened). An undo unwinds
   * ALL the moves back to the start of the phase, action points included. The engine's own
   * snapshot stack knows none of this and is frozen; `LocalSession` tracks it.
   */
  readonly undo: UndoAvailability;
}

export interface UndoAvailability {
  readonly available: boolean;
  /** Accepted moves this command phase — what an undo would unwind. 0 when unavailable. */
  readonly moves: number;
}

/** What `sendAction` resolves to. Mirrors the engine's own result, minus the frames. */
export interface ActionOutcome {
  readonly ok: boolean;
  readonly error?: string;
}

/**
 * THE SUBSCRIPTION PAYLOAD, and splitting it is the design.
 *
 * `view` is AUTHORITATIVE — exactly one per accepted action, always the current truth.
 * `burst` is PRESENTATION and is SKIPPABLE. A subscriber that ignores every burst still lands on
 * the correct view, because the last frame of a burst equals the post-action projection — measured
 * at 908/908 and asserted as `burst-tail-authoritative` with a negative control. That invariant is
 * what makes skipping safe and what makes reconnection possible.
 */
export type SessionEvent =
  | { readonly kind: 'view'; readonly view: SessionView }
  | { readonly kind: 'burst'; readonly frames: readonly BurstFrame[] };

export type Listener = (event: SessionEvent) => void;
export type Unsubscribe = () => void;

export interface NewGameConfig {
  readonly difficulty: string;
  readonly science?: boolean;
}

/**
 * A player reference. Opaque and branded so that "no PII in a player reference" is enforced by the
 * compiler rather than remembered — users are under 18 and India's DPDP Act treats them as
 * children. See `player-ref.ts`.
 */
export type PlayerRef = string & { readonly __brand: 'PlayerRef' };

export interface Session {
  readonly self: PlayerRef;
  /** Authoritative, always. Never a `GameState`. */
  getView(): SessionView;
  /** Async even locally — constraint 3 above. */
  sendAction(action: Record<string, unknown>): Promise<ActionOutcome>;
  /** Change what is selected. Emits a `view` event; does not touch the game. */
  setSelection(selection: Selection): void;
  subscribe(listener: Listener): Unsubscribe;
  /** Hand the game to `Storage`. Session serialises what only it can see — never `getView()`. */
  save(): Promise<void>;
  dispose(): void;
}
