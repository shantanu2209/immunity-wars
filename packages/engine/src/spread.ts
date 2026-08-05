/**
 * B5 — turn resolution. NOT YET PORTED.
 *
 * This throws rather than returning a stub result, deliberately: a stub that returned `ok()`
 * would let the B4 equivalence tests pass while silently comparing nothing, which is the exact
 * failure mode the B0 negative control exists to prevent. A throw cannot be mistaken for a pass.
 */

import type { GameState } from './state.js';

export function resolveSpread(_g: GameState): unknown[] {
  throw new Error(
    'resolveSpread is not ported until B5. endCommand cannot be compared yet; the B4 ' +
      'checkpoints deliberately never end a turn.',
  );
}
