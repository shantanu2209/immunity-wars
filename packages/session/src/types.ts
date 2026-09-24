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

/**
 * THE VIEW, AND WHAT IS COMPUTED BESIDE IT, live in `@immunity-wars/session-core` since P3.4
 * (ruled 24 September 2026): the relay computes exactly what `LocalSession` computes, from one
 * implementation, so the types they share are declared there and re-exported here unchanged.
 */
import type {
  PrecomputedQueries,
  ScopedQueries,
  Selection,
  ViewState,
} from '@immunity-wars/session-core';
export {
  NO_SELECTION,
  type PrecomputedQueries,
  type ProductionSummary,
  type ScopedQueries,
  type Selection,
  type ViewState,
} from '@immunity-wars/session-core';

/** One frame of an `endCommand` burst. Presentation only. */
export interface BurstFrame {
  readonly label: string;
  readonly dice: unknown;
  readonly view: ViewState;
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
  /**
   * WHY undo is unavailable — instrumentation asked for at the S25 pass (Shantanu, 4 Sep 2026,
   * item 2): undo was seen unavailable when it should not have been, unreproducibly. The
   * session says which of its four gates closed, so the next sighting is read, not guessed:
   * `not-command` (no command phase in progress), `no-moves` (nothing accepted this phase that
   * undo could unwind), `committed` (a committing action ended it — `committedBy` names it),
   * `resumed` (the game was resumed mid-command and the session has no history of the phase).
   * `multiplayer` (P3.4): a `RelaySession`, where the engine's one undo stack is the whole
   * table's and the relay refuses undo (FINDINGS #79).
   * `available` when it is.
   */
  readonly reason:
    'available' | 'not-command' | 'no-moves' | 'committed' | 'resumed' | 'multiplayer';
  /** The action that ended undo this phase, when `reason` is `committed`. */
  readonly committedBy: string | null;
}

/** What `sendAction` resolves to. Mirrors the engine's own result, minus the frames. */
export interface ActionOutcome {
  readonly ok: boolean;
  readonly error?: string;
  /**
   * A `RelaySession`'s refusal code (the protocol's `ErrorCode`), for the catalogue to word:
   * `engine` when the engine refused, with its own text as `error`, as in single player.
   * `LocalSession` never sets it.
   */
  readonly code?: string;
}

/**
 * THE SUBSCRIPTION PAYLOAD, and splitting it is the design.
 *
 * `view` is AUTHORITATIVE — exactly one per accepted action, always the current truth.
 * `burst` is PRESENTATION and is SKIPPABLE. A subscriber that ignores every burst still lands on
 * the correct view, because the last frame of a burst equals the post-action projection — measured
 * at 908/908 and asserted as `burst-tail-authoritative` with a negative control. That invariant is
 * what makes skipping safe and what makes reconnection possible.
 *
 * ⚠️ **A THIRD ARM, `notice`, added 8 September 2026** (Shantanu's ruling on
 * `docs/for-P2.6-errors.md` point 4). `save()` failures were swallowed inside this class and the
 * UI could not see them, so a player could believe their game was saved for forty turns when it
 * was not. Telling them requires the session to say so, and the three shapes considered were a
 * field on the view, a field on `ActionOutcome`, and this.
 *
 * **The reason it is here and not on the view is structural rather than tidy: save health is a
 * fact about THIS DEVICE, not about the game.** `viewState` is the unit of synchronisation in
 * Phase 3 (`docs/PHASE2_BRIEF.md` §3), so it is the thing that will cross a network to other
 * players, and whether one person's browser can write to IndexedDB is nobody else's business and
 * would be wrong on arrival. The union already exists because one callback could not express two
 * kinds of thing; a third kind is what it is for.
 *
 * A `notice` is NOT authoritative and NOT a view. A subscriber that ignores every notice still
 * renders correctly — it just cannot warn anyone.
 */
export type SessionNotice = 'save-failed';

export type SessionEvent =
  | { readonly kind: 'view'; readonly view: SessionView }
  | { readonly kind: 'burst'; readonly frames: readonly BurstFrame[] }
  | { readonly kind: 'notice'; readonly notice: SessionNotice };

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
