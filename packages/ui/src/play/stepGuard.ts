/**
 * A TAP JUST AFTER THE STEP CHANGES IS NOT FOR THE NEW STEP (FINDINGS #90; ruled 25 September 2026:
 * "Agree with your recommendation").
 *
 * The play screen's bottom button is one element whose step changes with the game: *Plan your
 * turn*, *Command your cells*, *Confirm the plan*, *End turn*. A double tap's second tap landed on
 * the NEXT step. Measured alone, *Command your cells* tapped twice ended the turn with every Action
 * Point unspent, at every gap tried from 80 to 400 ms, with no undo past the spread.
 *
 * So the button ignores a tap for half a second after its step changes, or after it becomes
 * tappable. Measured from the CHANGE, not from the first tap: that also covers the one frame after a
 * draw in which *Command your cells* shows before the arrivals replace it, and a step that changes
 * because another player acted. A deliberate second tap, later than that, does the next step as
 * before.
 */
export const STEP_GUARD_MS = 500;

/** Whether a tap at `now` is for the step that has been showing since `changedAt`. */
export const tapCounts = (changedAt: number, now: number): boolean =>
  now - changedAt >= STEP_GUARD_MS;
