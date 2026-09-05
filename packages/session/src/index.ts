/**
 * @immunity-wars/session
 *
 * Seam 1. The only way `packages/ui` and `packages/app` may talk to the game — enforced by the
 * `ui-app-no-engine` and `ui-app-no-unresolvable` rules in `.dependency-cruiser.cjs`, each with a
 * negative control, and by `boundaries-ui-content-permitted` proving the permitted edge still is.
 */

export type {
  ActionOutcome,
  BurstFrame,
  Listener,
  NewGameConfig,
  PlayerRef,
  PrecomputedQueries,
  ProductionSummary,
  ScopedQueries,
  Selection,
  Session,
  SessionEvent,
  SessionView,
  UndoAvailability,
  Unsubscribe,
  ViewState,
} from './types.js';
export { NO_SELECTION } from './types.js';

export { LocalSession, type LocalSessionOptions } from './local.js';
export { asPlayerRef, newPlayerRef } from './player-ref.js';
export { MemoryStorage, type SavedGame, type Storage } from './storage.js';
export { IndexedDbStorage } from './indexeddb.js';
export { ALL_UI_QUERIES } from './queries.js';

export const PACKAGE_NAME = '@immunity-wars/session';
