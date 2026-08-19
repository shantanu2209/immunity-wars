/**
 * SEAM 8a — `Storage`, and the two things about it that are easy to get wrong.
 *
 * ============================================================================================
 * 1. THE SERIALISATION UNIT IS `GameState`, NOT `ViewState`.
 * 2. THE CONSUMER IS `Session`, NOT THE UI.
 * ============================================================================================
 *
 * Both are binding, both are measured, and the reason is that the natural implementation is
 * wrong in a way that only appears on reload.
 *
 * `viewState` is a PROJECTION. Measured on a real post-`draw` state: `GameState` has 53 keys,
 * `viewState` has 45, and 13 are in the state and absent from the view — `_actingPid`,
 * `complement`, **`deck`**, `discard`, `drawnList`, `events`, `everInfected`, `fx`, `novelTurn`,
 * `stats`, `undo`, `wormsSpawned`, `wormsThisTurn`. The view reports `deckCount: 95`; the 95 cards
 * are not in it.
 *
 * **So a game cannot be resumed from a `ViewState`** — and wiring a save button to `getView()` is
 * exactly the bug someone ships, because the save succeeds, the payload looks entirely plausible,
 * and the deck is gone. The UI therefore cannot drive `Storage` at all: it asks Session to save,
 * and Session serialises what only it can see.
 *
 * THE PROPERTY THIS RESTS ON IS ASSERTED, and it was asserted BEFORE this file existed.
 * `gamestate-round-trip` in the property suite checks the whole state survives JSON on every
 * generated state — 1,032,791 of them at the 10,000-game tier — with a control that plants a
 * value JSON destroys in one of the 13 keys the view drops and requires the view-level invariant
 * NOT to see it. Until P2.1 the strongest available claim was that ONE state had been observed to
 * round-trip, which is not an invariant, and this file would have been built on it.
 */

/** What a saved game looks like on disk. */
export interface SavedGame {
  readonly id: string;
  /** A whole `GameState`. Opaque here on purpose — Storage stores, it does not interpret. */
  readonly state: unknown;
  /** Millisecond timestamp, supplied by the caller so this module has no clock. */
  readonly savedAt: number;
}

/**
 * The port. One method per thing a save/resume screen needs and nothing else.
 *
 * Async throughout because IndexedDB is, and because the same reasoning that makes `sendAction`
 * async applies: a synchronous port would have every call site written synchronously.
 */
export interface Storage {
  put(save: SavedGame): Promise<void>;
  get(id: string): Promise<SavedGame | null>;
  list(): Promise<readonly SavedGame[]>;
  delete(id: string): Promise<void>;
}

/**
 * In-memory implementation, for tests and for a session that has not been given a real one.
 *
 * It deep-copies through JSON on the way IN and on the way OUT. That is not defensive
 * boilerplate — it makes this implementation SHARE THE FAILURE MODE of a real one. A memory store
 * that handed back the same object reference would keep working with values IndexedDB's structured
 * clone or a JSON file would destroy, so tests would pass here and the bug would appear only in a
 * browser. A fake that is easier than the real thing tests nothing.
 */
export class MemoryStorage implements Storage {
  private readonly rows = new Map<string, string>();

  put(save: SavedGame): Promise<void> {
    this.rows.set(save.id, JSON.stringify(save));
    return Promise.resolve();
  }

  get(id: string): Promise<SavedGame | null> {
    const raw = this.rows.get(id);
    return Promise.resolve(raw ? (JSON.parse(raw) as SavedGame) : null);
  }

  list(): Promise<readonly SavedGame[]> {
    return Promise.resolve(
      [...this.rows.values()]
        .map((r) => JSON.parse(r) as SavedGame)
        .sort((a, b) => b.savedAt - a.savedAt),
    );
  }

  delete(id: string): Promise<void> {
    this.rows.delete(id);
    return Promise.resolve();
  }
}
