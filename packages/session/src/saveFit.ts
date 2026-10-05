/**
 * WHICH VERSION OF THE RULES WROTE A SAVED GAME, AND WHETHER THIS ONE MAY CONTINUE IT (seam 7, ruled
 * Phase 4's on 25 September 2026; built 5 October 2026, `docs/LOOK_PLAN.md` §28, step 4).
 *
 * An app that updates can find a game saved by another version of itself. Until this, a save said
 * nothing of who wrote it, so the app could not tell a game it understands from one it does not.
 *
 * - **This version wrote it:** continued.
 * - **An older version, or one from before saves were stamped:** carried forward, as ruled on 30
 *   September 2026 ("carried forward, not thrown away"). `migrateSavedGame` brings an old game to the
 *   engine's shape; a rules change that changes that shape adds its step there.
 * - **A newer version:** NOT continued. This app's engine does not know the rules it was played
 *   under, and continuing it would play those turns under older rules and save over the newer game.
 *   The player is told, and offered the update. It can happen on the web, where a page left open
 *   for days can meet a save another tab wrote after an update, and on a phone that went back to an
 *   older build.
 * - **A stamp that is not a version at all** is not one this app wrote, and is treated as newer:
 *   continuing what cannot be read is the one choice that can lose the game.
 *
 * Held by `tests/session/src/save-version.test.ts`. Control: pnpm ci:selftest
 * save-from-a-newer-version-is-not-continued.
 */
import { RULES_VERSION } from '@immunity-wars/content';

import type { SavedGame } from './storage.js';

export type SaveFit = 'this' | 'older' | 'unstamped' | 'newer';

const parse = (v: string): readonly [number, number, number] | null => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};

/** Which version wrote this save, against `current` (this app's rules version unless a test says). */
export function saveFit(
  save: SavedGame | { readonly rulesVersion?: unknown },
  current = RULES_VERSION,
): SaveFit {
  if (save.rulesVersion === undefined) return 'unstamped';
  const theirs = typeof save.rulesVersion === 'string' ? parse(save.rulesVersion) : null;
  const ours = parse(current);
  if (theirs === null || ours === null) return 'newer';
  for (let i = 0; i < 3; i += 1) {
    const a = theirs[i] ?? 0;
    const b = ours[i] ?? 0;
    if (a > b) return 'newer';
    if (a < b) return 'older';
  }
  return 'this';
}

/** Whether this app may continue a save that fits like this. */
export const canContinue = (fit: SaveFit): boolean => fit !== 'newer';
