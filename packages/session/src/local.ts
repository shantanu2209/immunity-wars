/**
 * `LocalSession` — the single-player implementation, and the only code path.
 *
 * "Single-player must go through it too. One code path, not a fork" is the whole point of seam 1.
 * A UI written against `applyAction` is a fork that nothing fails on until Phase 3 tries to put a
 * network in the gap, which is why the boundary is a build failure (`ui-app-no-engine`) rather
 * than a convention.
 */

import * as engine from '@immunity-wars/engine';
import { advanceIdsPast, precompute, scope } from '@immunity-wars/session-core';

import { newPlayerRef } from './player-ref.js';
import { MemoryStorage, type Storage } from './storage.js';
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
 * THE MOVE CLASS — the actions undo may unwind (ruling of 4 September 2026, `types.ts`).
 * Repositioning only: no dice, no hidden information, no target consumed. `recall` (back to
 * the hub) and `resmove` (a resident one step) are repositioning too, and `hop` (the lymphatic
 * crossing) rolls nothing. Everything else the engine accepts in the command phase is
 * COMMITMENT and ends undo for the phase.
 */
const MOVE_CLASS: ReadonlySet<string> = new Set(['move', 'hop', 'recall', 'resmove']);
/** Not player actions on the board; they mark the phase boundaries. */
const PHASE_BOUNDARY: ReadonlySet<string> = new Set(['draw', 'endCommand']);

export interface LocalSessionOptions {
  readonly storage?: Storage;
  /** Injected so this module has no clock of its own and a test can pin the timestamp. */
  readonly now?: () => number;
  readonly self?: PlayerRef;
  readonly saveId?: string;
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

  private constructor(g: Record<string, unknown>, opts: LocalSessionOptions) {
    this.g = g;
    this.self = opts.self ?? newPlayerRef();
    this.storage = opts.storage ?? new MemoryStorage();
    this.now = opts.now ?? ((): number => Date.now());
    this.saveId = opts.saveId ?? 'current';
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
    const g = call('newGame', { difficulty: config.difficulty, science: config.science ?? false });
    return new LocalSession(g as Record<string, unknown>, opts);
  }

  /** Resume a game `Storage` handed back. The state is a whole `GameState`, never a view. */
  static resume(state: unknown, opts: LocalSessionOptions = {}): LocalSession {
    if (typeof state !== 'object' || state === null) {
      throw new Error(
        'resume() needs a GameState. A ViewState cannot resume a game: it has no deck.',
      );
    }
    advanceIdsPast(state as Record<string, unknown>);
    return new LocalSession(state as Record<string, unknown>, opts);
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

    const result = call('applyAction', this.g, { ...action, pid: this.self }) as {
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
    await this.storage.put({ id: this.saveId, state: this.g, savedAt: this.now() });
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
