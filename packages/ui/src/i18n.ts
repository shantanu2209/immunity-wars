/**
 * The UI's translation function — the ONLY sanctioned path from a component to player-visible
 * text (PHASE2_BRIEF §5, review item F: the UI must RENDER through the catalogue, not merely
 * be mined for one). The eslint rule `iw/no-hardcoded-jsx-text` rejects hardcoded JSX text in
 * this package, and its negative control (`i18n-check.control.test.ts`) proves the rule fires.
 *
 * A missing key renders as ⟪key⟫ — loudly visible, never silently empty, so a screenshot of
 * any screen shows its own catalogue gaps.
 */
import { UI_I18N_EN } from '@immunity-wars/content';

export function t(key: string): string {
  const s = (UI_I18N_EN as Record<string, string>)[key];
  return s !== undefined ? s : `⟪${key}⟫`;
}
