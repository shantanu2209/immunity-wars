/**
 * THE DRAW'S ARRIVALS, as data: what a draw brought, and the turn's crisis event read from
 * the view. The rows are diffed by invader id in PlayScreen, not read from `drawn`, which carries
 * only the first card (`drawnList`, which carries them all, is one of the 13 state-only keys the
 * view deliberately drops).
 *
 * THE CRISIS RIDES THE DRAW (ruled 6 September 2026, by the test "does it change what the player
 * can do THIS TURN?"): every crisis event does, so it is a section of the stage the draw already
 * interrupts with, never a dialog of its own. Nothing else in the game interrupts play.
 *
 * ⚠️ The BODY that rendered these as a dialog was deleted at piece 6 (docs/for-P2.7.md §20): the
 * draw is a stage of the frame now (`play/Arrivals.tsx`), not a dialog over the game.
 */
import { t } from '../i18n';

export interface RevealArrival {
  disease: string;
  type: string;
  lane: string | null;
  remembered: boolean;
  novel: boolean;
}

export interface RevealCrisis {
  name: string;
  bad: boolean;
  why: string | null;
  /** The effect chips this event produced, as the strip words them (name folded off). */
  effects: readonly string[];
}

/**
 * The crisis section from the view (pure, testable): this turn's banner, with the effect chips
 * it folded into — the strip's own words with the event's name taken back off the front.
 */
export function revealCrisis(
  g: Readonly<Record<string, unknown>>,
  chips: readonly { text: string; detail?: string | null; event?: string }[],
): RevealCrisis | null {
  const banner = g['banner'] as { name?: unknown; bad?: unknown; why?: unknown } | null;
  if (!banner || typeof banner.name !== 'string') return null;
  const name = banner.name;
  const prefix = `${name} ${t('inspect.sep')} `;
  // The chips the strip folded this event into (`event`), minus the banner-only chip whose
  // whole text is the name; the name is taken back off the front where the fold put it.
  const effects = chips
    .filter((c) => c.event === name && c.text !== name)
    .map((c) => (c.text.startsWith(prefix) ? c.text.slice(prefix.length) : c.text));
  return {
    name,
    bad: banner.bad === true,
    why: typeof banner.why === 'string' && banner.why.trim() !== '' ? banner.why : null,
    effects,
  };
}
