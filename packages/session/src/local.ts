/**
 * `LocalSession` — the single-player implementation, and the only code path.
 *
 * "Single-player must go through it too. One code path, not a fork" is the whole point of seam 1.
 * A UI written against `applyAction` is a fork that nothing fails on until Phase 3 tries to put a
 * network in the gap, which is why the boundary is a build failure (`ui-app-no-engine`) rather
 * than a convention.
 */

import * as engine from '@immunity-wars/engine';

import { newPlayerRef } from './player-ref.js';
import {
  CELL_KEYS,
  FAMILIES,
  INVADER_ONLY,
  ORGAN_ONLY,
  PER_CELL,
  PER_FAMILY,
  PER_INVADER,
  PER_ORGAN,
  STATE_ONLY,
} from './queries.js';
import { MemoryStorage, type Storage } from './storage.js';
import {
  NO_SELECTION,
  type ActionOutcome,
  type BurstFrame,
  type Listener,
  type NewGameConfig,
  type PlayerRef,
  type PrecomputedQueries,
  type ProductionSummary,
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
    await this.save().catch(() => undefined);
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
    await this.save().catch(() => undefined);
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

  private precompute(game: ViewState): PrecomputedQueries {
    const invaders = (game['invaders'] as unknown[] | undefined) ?? [];
    const organs = (this.g['organList'] as string[] | undefined) ?? [];

    const state: Record<string, unknown> = {};
    for (const n of STATE_ONLY) state[n] = call(n, this.g);

    const perInvader: Record<string, unknown[]> = {};
    for (const n of PER_INVADER) perInvader[n] = invaders.map((iv) => call(n, this.g, iv));
    for (const n of INVADER_ONLY) perInvader[n] = invaders.map((iv) => call(n, iv));

    const perCell: Record<string, Record<string, unknown>> = {};
    for (const n of PER_CELL) {
      const row: Record<string, unknown> = {};
      for (const c of CELL_KEYS) row[c] = call(n, this.g, c);
      perCell[n] = row;
    }

    const perOrgan: Record<string, Record<string, unknown>> = {};
    for (const n of PER_ORGAN) {
      const row: Record<string, unknown> = {};
      for (const o of organs) row[o] = call(n, this.g, o);
      perOrgan[n] = row;
    }
    for (const n of ORGAN_ONLY) {
      const row: Record<string, unknown> = {};
      for (const o of organs) row[o] = call(n, o);
      perOrgan[n] = row;
    }

    const perFamily: Record<string, Record<string, unknown>> = {};
    for (const n of PER_FAMILY) {
      const row: Record<string, unknown> = {};
      for (const f of FAMILIES) row[f] = call(n, this.g, f);
      perFamily[n] = row;
    }

    // The three fields the always-on antibody panel reads from productionBreakdown. The other six
    // are the tooltip, and are selection-scoped — measured at ~85% of that object's bytes.
    const production: Record<string, ProductionSummary> = {};
    for (const f of FAMILIES) {
      const pb = call('productionBreakdown', this.g, f) as Record<string, unknown>;
      production[f] = {
        net: Number(pb['net'] ?? 0),
        boosted: Boolean(pb['boosted']),
        reduced: Boolean(pb['reduced']),
        blocked: pb['blocked'] !== null && pb['blocked'] !== undefined,
      };
    }

    // WHEN A SPENT CELL IS BACK — see `PrecomputedQueries.readyTurn`. The engine's own answer
    // for the Neutrophil, withheld while the marrow is damaged (the engine will not regenerate
    // it then, and `damaged()` is not exported — hp below max is the view's data, so no rule
    // is mirrored; Hard's compensated marrow loses a number, never the truth).
    const cells = (this.g['cells'] as Record<string, Record<string, unknown>> | undefined) ?? {};
    const marrow = (this.g['organs'] as Record<string, Record<string, unknown>> | undefined)?.[
      'marrow'
    ];
    const marrowDamaged =
      marrow !== undefined && Number(marrow['hp'] ?? 0) < Number(marrow['max'] ?? 0);
    const eos = cells['eosinophil'];
    const readyTurn: Record<string, number | null> = {
      neutrophil: marrowDamaged
        ? null
        : ((call('neutrophilReadyTurn', this.g) as number | null | undefined) ?? null),
      eosinophil:
        eos?.['alive'] === false && typeof eos['regenAt'] === 'number' ? eos['regenAt'] : null,
    };

    // THE CRISIS EFFECTS IN FORCE — the view drops `fx`; the strip needs its durations.
    const fx = (this.g['fx'] as Record<string, unknown> | undefined) ?? {};
    const effects = {
      capTurns: Number(fx['capTurns'] ?? 0),
      noProduce: fx['noProduce'] === true,
      apMod: Number(fx['apMod'] ?? 0),
      skipMarch: fx['skipMarch'] === true,
    };

    return { state, perInvader, perCell, perOrgan, perFamily, production, readyTurn, effects };
  }

  private scope(): ScopedQueries {
    const { cell, family } = this.selection;
    return {
      moveDestinations: cell
        ? ((call('moveDestinations', this.g, cell) as unknown[] | undefined) ?? [])
        : null,
      productionDetail: family ? call('productionBreakdown', this.g, family) : null,
    };
  }
}
