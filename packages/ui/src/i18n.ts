/**
 * The UI's translation function — the ONLY sanctioned path from a component to player-visible
 * text (PHASE2_BRIEF §5, review item F: the UI must RENDER through the catalogue, not merely
 * be mined for one). The eslint rule `iw/no-hardcoded-jsx-text` rejects hardcoded JSX text in
 * this package, and its negative control (`i18n-check.control.test.ts`) proves the rule fires.
 *
 * A missing key renders as ⟪key⟫ — loudly visible, never silently empty, so a screenshot of
 * any screen shows its own catalogue gaps.
 *
 * PARAMETERS (added for the goal dialog, whose turn numbers vary by difficulty): a catalogue
 * string may contain `{name}` placeholders, filled from `params`. Placeholders live in the
 * STRING, not in JSX composition, because the Hindi edition must be free to reorder them —
 * `"turn {maxTurn} tak"` is a translation decision a juxtaposed `{t('a')} {n}` steals. A
 * placeholder with no matching param stays visible in braces: loud, like a missing key.
 */
import { UI_I18N_EN } from '@immunity-wars/content';

export function t(key: string, params?: Record<string, string | number>): string {
  const s = (UI_I18N_EN as Record<string, string>)[key];
  if (s === undefined) return `⟪${key}⟫`;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}
