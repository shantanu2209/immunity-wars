/**
 * THE DRAW INSIDE END TURN (docs/for-P2.7.md §9 ruling 2; §12, ruled 13 September 2026).
 *
 * The engine refuses every action but the draw at the start of a turn, so the draw was never a
 * choice, and there is no Draw button. The play screen sends it itself, whenever this says the
 * moment has come. The engine and its rules are unchanged; only who sends the action changes.
 *
 * ONE RULE FOR EVERY WAY INTO THE MOMENT. The turn starts with nothing drawn after a spread has
 * finished playing, on a new game once the goal dialog is answered, on a game resumed from a save
 * written mid-spread (the session writes the autosave as the spread starts, so a game closed during
 * it reopens here), and in the dev shell with its spreads skipped. A rule that fired only at the
 * end of a spread would leave the resumed game with nothing to press, which Gate 1 forbids.
 *
 * WHAT IT WAITS FOR. A spread still playing, so the spread is watched before the reveal. A dialog
 * showing or queued, so a new game's goal comes first. Anything open over the game (the pause menu,
 * Settings), so the reveal does not appear behind the player's back.
 *
 * ONCE A TURN. A draw the engine refuses is shown like any rejection and is not retried, which is
 * what keeps a refusal from becoming a loop.
 *
 * Phase 3 inherits one fact: in a multiplayer game the engine accepts a draw only from the
 * captain, so only the captain's client may send it. Nothing here decides that yet.
 *
 * Pure, so the rule is tested on the real engine before it is trusted in a game
 * (`tests/session/src/auto-draw.test.ts`, with its controls).
 */
import type { ViewState } from '@immunity-wars/session';

export interface DrawMoment {
  /** The authoritative view's game. */
  game: ViewState;
  /** A spread's frames are playing. */
  playing: boolean;
  /** A dialog is showing or queued. */
  dialogPending: boolean;
  /** Something is open over the game: a menu, a page, a card. */
  covered: boolean;
  /** The turn a draw was last sent for, or null when none has been. */
  sentForTurn: number | null;
}

export function shouldDraw(m: DrawMoment): boolean {
  if (m.playing || m.dialogPending || m.covered) return false;
  const g = m.game;
  if (String(g['phase']) !== 'infection') return false;
  if (g['drawn'] !== null && g['drawn'] !== undefined) return false;
  if (g['won'] === true || Boolean(g['lost'])) return false;
  return m.sentForTurn !== Number(g['turn']);
}
