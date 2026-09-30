/**
 * THE MOVE CLASS — the actions undo may unwind (ruling of 4 September 2026). Repositioning only: no
 * dice, no hidden information, no target consumed. `recall` (back to the hub) and `resmove` (a
 * resident one step) are repositioning too, and `hop` (the lymphatic crossing) rolls nothing.
 * Everything else the engine accepts in the command phase is COMMITMENT, and ends undo.
 *
 * Here, in the package every holder of a `GameState` shares, since undo was ruled for games played
 * together (27 September 2026): `LocalSession` and the room read one list, so the two cannot come to
 * disagree about what a player may take back. It was `LocalSession`'s own until then.
 */
export const MOVE_CLASS: ReadonlySet<string> = new Set([
  'move',
  'hop',
  'recall',
  'resmove',
  // A resident back to its organ box (queue Q6, 30 September 2026): repositioning, like `recall`.
  'resrecall',
]);
