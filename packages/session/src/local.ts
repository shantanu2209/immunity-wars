/**
 * `LocalSession` — the single-player implementation, and the only code path.
 *
 * "Single-player must go through it too. One code path, not a fork" is the whole point of seam 1.
 * A UI written against `applyAction` is a fork that nothing fails on until Phase 3 tries to put a
 * network in the gap, which is why the boundary is a build failure (`ui-app-no-engine`) rather
 * than a convention.
 */

import { RULES_VERSION } from '@immunity-wars/content';
import * as engine from '@immunity-wars/engine';
import { MOVE_CLASS, migrateSavedGame, precompute, scope } from '@immunity-wars/session-core';

import { newPlayerRef } from './player-ref.js';
import { canContinue, saveFit } from './saveFit.js';
import { MemoryStorage, type SavedGame, type Storage } from './storage.js';
import {
  NO_SELECTION,
  type ActionOutcome,
  type BurstFrame,
  type Listener,
  type NewGameConfig,
  type PlayerRef,
  type PrecomputedQueries,
  type ScopedQueries,
  type Selection,
  type Session,
  type SessionEvent,
  type SessionView,
  type UndoAvailability,
  type Unsubscribe,
  type ViewState,
} from './types.js';

const ns = engine as unknown as Record<string, unknown>;
const call = (name: string, ...args: unknown[]): unknown =>
  (ns[name] as (...a: unknown[]) => unknown)(...args);

/**
 * AN ENGINE CALL ON THE LESSON'S DICE (the guided game, `lesson.ts`). The engine draws every
 * random number from the one global source, and has no other way to be handed one. So for a game
 * on rails that source is swapped for the lesson's ROUND THE CALL, and put back before anything
 * else runs. Nothing but the engine can draw from the lesson's dice, which is what keeps a lesson
 * the same for every player whatever else the page does with random numbers; and nothing the
 * engine does can leave the page on the lesson's dice.
 */
function onDice<T>(dice: (() => number) | null, engineCall: () => T): T {
  if (!dice) return engineCall();
  const pages = Math.random;
  Math.random = dice;
  try {
    return engineCall();
  } finally {
    Math.random = pages;
  }
}

/** A saved game a newer version of the rules wrote, which this app does not continue (`saveFit.ts`). */
export class SaveTooNew extends Error {
  constructor(readonly rulesVersion: unknown) {
    super(`this game was saved by rules ${String(rulesVersion)}, newer than ${RULES_VERSION}`);
    this.name = 'SaveTooNew';
  }
}

// THE MOVE CLASS, the actions undo may unwind, is `@immunity-wars/session-core`'s since 27 September
// 2026, when undo was ruled for games played together: the room reads the same list.
/** Not player actions on the board; they mark the phase boundaries. */
const PHASE_BOUNDARY: ReadonlySet<string> = new Set(['draw', 'endCommand']);

export interface LocalSessionOptions {
  readonly storage?: Storage;
  /** Injected so this module has no clock of its own and a test can pin the timestamp. */
  readonly now?: () => number;
  readonly self?: PlayerRef;
  readonly saveId?: string;
  /**
   * A GAME ON RAILS (the guided game): the engine's dice for as long as the rails last. While
   * they last nothing is saved, so a lesson that is left starts again from its beginning.
   * `endRails()` ends both: the dice are the page's again, and the game is saved from there.
   */
  readonly rails?: { readonly dice: () => number };
}

export class LocalSession implements Session {
  readonly self: PlayerRef;

  /**
   * THE STATE, AND IT NEVER LEAVES THIS OBJECT.
   *
   * `applyAction` mutates it in place. Nothing here returns it, and `SessionView` has no field
   * that could carry it. `save()` is the one thing that reads it whole, and it hands it to
   * `Storage` rather than to a caller.
   */
  private readonly g: Record<string, unknown>;

  private selection: Selection = NO_SELECTION;
  private cached: SessionView;
  private readonly listeners = new Set<Listener>();
  private readonly storage: Storage;
  private readonly now: () => number;
  private readonly saveId: string;
  /** Latched on the first failed autosave; see `autosave()` for why it never resets. */
  private saveFailed = false;
  private disposed = false;

  /** Accepted MOVE_CLASS actions this command phase — what an undo unwinds. */
  private movesThisPhase = 0;
  /** True once any accepted non-move action has happened this command phase. */
  private committedThisPhase = false;
  /** The committing action's name — for the undo reason line. */
  private committedBy: string | null = null;
  /** True when the game was resumed mid-command: the session has no history of the phase. */
  private resumedMidCommand = false;
  /** The lesson's dice, while the game is on rails; null for every other game. */
  private dice: (() => number) | null;

  private constructor(g: Record<string, unknown>, opts: LocalSessionOptions) {
    this.g = g;
    this.self = opts.self ?? newPlayerRef();
    this.storage = opts.storage ?? new MemoryStorage();
    this.now = opts.now ?? ((): number => Date.now());
    this.saveId = opts.saveId ?? 'current';
    this.dice = opts.rails?.dice ?? null;
    // A RESUMED game mid-command has an engine snapshot stack and no session history: whether
    // a committing action happened is unknowable from the state, so undo is conservatively
    // unavailable for the rest of that phase. A fresh game has an empty stack and is clean.
    this.committedThisPhase = ((g['undo'] as unknown[] | undefined)?.length ?? 0) > 0;
    this.resumedMidCommand = this.committedThisPhase;
    this.cached = this.build();
  }

  /**
   * `createGame` and `joinGame` return THE SAME HANDLE, which is why room entry was folded into
   * this seam rather than made one of its own: a room code is a string parameter, not a concept.
   * There is no local `joinGame` because there is nothing to join — Phase 3's `RelaySession`
   * implements it. Returning a solo game that merely looked joined would be worse than its
   * absence.
   */
  static createGame(config: NewGameConfig, opts: LocalSessionOptions = {}): LocalSession {
    // `written` is handed on only when there is one, so every other game is made exactly as before.
    const cfg = config.written
      ? { difficulty: config.difficulty, written: config.written }
      : { difficulty: config.difficulty };
    const g = onDice(opts.rails?.dice ?? null, () => call('newGame', cfg));
    return new LocalSession(g as Record<string, unknown>, opts);
  }

  /** True while the game is on rails: the lesson's dice, and no save. */
  get onRails(): boolean {
    return this.dice !== null;
  }

  /**
   * THE RAILS END. From here the engine's dice are the page's own again, and the game is saved
   * like any other, at once and on every action after. Calling it on a game that is not on rails
   * does nothing.
   */
  async endRails(): Promise<void> {
    this.assertLive();
    if (this.dice === null) return;
    this.dice = null;
    await this.autosave();
  }

  /** Resume a game `Storage` handed back. The state is a whole `GameState`, never a view. */
  static resume(state: unknown, opts: LocalSessionOptions = {}): LocalSession {
    if (typeof state !== 'object' || state === null) {
      throw new Error(
        'resume() needs a GameState. A ViewState cannot resume a game: it has no deck.',
      );
    }
    // A game saved before the engine change queue is carried forward (ruled 30 September 2026).
    migrateSavedGame(state as Record<string, unknown>);
    return new LocalSession(state as Record<string, unknown>, opts);
  }

  /**
   * CONTINUE A SAVED GAME, as `Storage` handed it back: the one way the app continues one. A game a
   * newer version saved is refused, with `SaveTooNew`, and nothing is written over it; any other is
   * resumed, carried forward if an older version wrote it (`saveFit.ts`).
   */
  static fromSave(save: SavedGame, opts: LocalSessionOptions = {}): LocalSession {
    const fit = saveFit(save);
    if (!canContinue(fit)) throw new SaveTooNew(save.rulesVersion);
    return LocalSession.resume(save.state, opts);
  }

  getView(): SessionView {
    return this.cached;
  }

  /**
   * ASYNC EVEN THOUGH THE WORK IS SYNCHRONOUS — constraint 3 in `types.ts`. The `await` below is
   * not ceremony: it forces every call site to be written for a session that might be remote.
   */
  async sendAction(action: Record<string, unknown>): Promise<ActionOutcome> {
    this.assertLive();
    await Promise.resolve();
    const name = String(action['action']);
    // Undo never reaches the engine directly: the session rule decides (types.ts, `undo`).
    if (name === 'undo') return this.undoMoves();

    const result = onDice(this.dice, () =>
      call('applyAction', this.g, { ...action, pid: this.self }),
    ) as {
      ok: boolean;
      error?: string;
      frames?: unknown[];
    };

    // A rejected action changed nothing — so it changes nothing here either. In particular a
    // rejected COMMITTING action does not end undo (ruling point 3).
    if (!result.ok) return { ok: false, error: result.error ?? 'rejected' };

    if (name === 'beginCommand') {
      this.movesThisPhase = 0;
      this.committedThisPhase = false;
      this.committedBy = null;
      this.resumedMidCommand = false;
    } else if (PHASE_BOUNDARY.has(name)) {
      // Selection clears at phase boundaries — in the session, so every consumer agrees.
      this.selection = NO_SELECTION;
      this.movesThisPhase = 0;
      this.committedThisPhase = false;
      this.committedBy = null;
      this.resumedMidCommand = false;
    } else if (MOVE_CLASS.has(name)) {
      this.movesThisPhase += 1;
    } else {
      if (!this.committedThisPhase) this.committedBy = name;
      this.committedThisPhase = true;
    }

    this.cached = this.build();

    // BURST FIRST, THEN THE AUTHORITATIVE VIEW, and the order is deliberate.
    //
    // A subscriber that ignores bursts must still land on the right state, so the view is emitted
    // unconditionally. Emitting it AFTER the burst means a subscriber that plays the animation is
    // not yanked to the end state before it starts. It is safe in both directions only because
    // the last frame of a burst equals the post-action projection — `burst-tail-authoritative`,
    // measured 908/908 and asserted with a negative control.
    const frames = result.frames;
    if (Array.isArray(frames) && frames.length > 0) {
      this.emit({ kind: 'burst', frames: frames as readonly BurstFrame[] });
    }
    this.emit({ kind: 'view', view: this.cached });

    // AUTOSAVE — docs/APP_FLOW.md ruling 4: the save is written by the session on every
    // accepted action, and by the session only (the UI cannot: it never sees `g`). Awaited so
    // a resolved `sendAction` means the write is ordered before any later one; the failure is
    // swallowed rather than rejecting an action the engine has already applied — a device
    // whose storage does not work degrades to no-save, not to an unplayable game.
    await this.autosave();
    return { ok: true };
  }

  /**
   * Selection is a UI concept and changing it touches no game state.
   *
   * Measured before this was built: rebuilding the whole projection plus the selection-scoped
   * answers costs 0.054ms at p50 and 0.181ms at p99 — 1.1% of the 16ms redraw budget, ~7% of it
   * at the 6x throttling §4 screens with. So this rebuilds rather than patching: a patch is a
   * cache-invalidation bug waiting to happen and the rebuild is free.
   */
  setSelection(selection: Selection): void {
    this.assertLive();
    this.selection = selection;
    this.cached = this.build();
    this.emit({ kind: 'view', view: this.cached });
  }

  subscribe(listener: Listener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * The UI asks; Session serialises. The UI cannot do this itself and that is the point — a save
   * built from `getView()` would succeed, look plausible, and lose the deck.
   */
  async save(): Promise<void> {
    this.assertLive();
    // A game on rails is not saved: it has dice a saved game could not carry, and a lesson that is
    // left is begun again (`docs/LOOK_PLAN.md` §18).
    if (this.dice !== null) return;
    await this.storage.put({
      id: this.saveId,
      state: this.g,
      savedAt: this.now(),
      rulesVersion: RULES_VERSION,
    });
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }

  private assertLive(): void {
    if (this.disposed) throw new Error('this session has been disposed');
  }

  /**
   * THE AUTOSAVE, and the one thing it must never do is reject.
   *
   * A device whose storage does not work degrades to no-save, not to an unplayable game: the
   * engine has already applied the action, so failing it here would reject something that
   * happened. That was true before and is unchanged.
   *
   * ⚠️ **What changed on 8 September 2026** (Shantanu's ruling, `docs/for-P2.6-errors.md` point
   * 4): the failure is no longer SILENT. It was `.catch(() => undefined)`, so a player could
   * believe their game was saved for forty turns when it was not, and the UI had no way to find
   * out — it never sees `GameState` and cannot check for itself.
   *
   * **Emitted once, not once per action.** A device with broken storage fails every write, and a
   * notice on every action would be a stream. The latch is deliberately never reset: a storage
   * layer that failed once and then works is not a state worth modelling, and clearing the
   * warning would be claiming a recovery nobody verified.
   */
  private async autosave(): Promise<void> {
    try {
      await this.save();
    } catch {
      if (this.saveFailed) return;
      this.saveFailed = true;
      this.emit({ kind: 'notice', notice: 'save-failed' });
    }
  }

  private emit(event: SessionEvent): void {
    // Copied before iterating: a listener that unsubscribes itself must not perturb this loop.
    for (const l of [...this.listeners]) l(event);
  }

  /**
   * Unwind EVERY move of this command phase (ruling point 2), or refuse.
   *
   * Loops the engine's one-snapshot `undo` until its stack is empty rather than counting
   * moves: the engine pushes a snapshot BEFORE it checks an undoable action, so a rejected
   * `produce` leaves a snapshot behind too. Emptying the stack is what lands exactly at the
   * phase start. (The engine caps the stack at 60; with single-digit action points a phase
   * cannot reach it.)
   */
  private async undoMoves(): Promise<ActionOutcome> {
    if (!this.undoAvailability().available) return { ok: false, error: 'Nothing to undo.' };
    let guard = 0;
    while (((this.g['undo'] as unknown[] | undefined)?.length ?? 0) > 0 && guard < 100) {
      call('undo', this.g);
      guard += 1;
    }
    this.movesThisPhase = 0;
    this.cached = this.build();
    this.emit({ kind: 'view', view: this.cached });
    await this.autosave();
    return { ok: true };
  }

  private undoAvailability(): UndoAvailability {
    const inCommand = String(this.g['phase']) === 'command';
    const available = inCommand && !this.committedThisPhase && this.movesThisPhase > 0;
    // The gates in the order they are checked, so the reason is the FIRST closed one.
    const reason: UndoAvailability['reason'] = available
      ? 'available'
      : !inCommand
        ? 'not-command'
        : this.resumedMidCommand
          ? 'resumed'
          : this.committedThisPhase
            ? 'committed'
            : 'no-moves';
    return {
      available,
      moves: available ? this.movesThisPhase : 0,
      reason,
      committedBy: reason === 'committed' ? this.committedBy : null,
    };
  }

  private build(): SessionView {
    const game = call('viewState', this.g) as ViewState;
    return {
      game,
      selection: this.selection,
      queries: this.precompute(game),
      scoped: this.scope(),
      undo: this.undoAvailability(),
    };
  }

  /** The builder is `@immunity-wars/session-core`'s since P3.4, shared with the relay. */
  private precompute(game: ViewState): PrecomputedQueries {
    return precompute(this.g, game);
  }

  private scope(): ScopedQueries {
    return scope(this.g, this.selection);
  }
}
