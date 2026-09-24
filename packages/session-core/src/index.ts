/**
 * @immunity-wars/session-core — what every holder of a `GameState` needs, whether it is
 * `LocalSession` on one device or the room on the relay (P3.4, ruled 24 September 2026).
 *
 * The query builder and FINDINGS #56's id workaround, moved out of `LocalSession` unchanged so
 * that the relay computes exactly what a single-player session computes, by construction.
 */
export { advanceIdsPast } from './ids.js';
export { precompute, scope, scopeAll, scopeFrom, type AllScoped } from './build.js';
export {
  ALL_UI_QUERIES,
  CELL_KEYS,
  FAMILIES,
  INVADER_ONLY,
  ORGAN_ONLY,
  PER_CELL,
  PER_FAMILY,
  PER_INVADER,
  PER_ORGAN,
  SCOPED,
  STATE_ONLY,
} from './queries.js';
export {
  NO_SELECTION,
  type PrecomputedQueries,
  type ProductionSummary,
  type ScopedQueries,
  type Selection,
  type ViewState,
} from './types.js';
