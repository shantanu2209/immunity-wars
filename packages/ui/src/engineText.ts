/**
 * Engine strings through the catalogue (ruling of 4 September 2026: rejection text is
 * rendered through the catalogue, beside the command bar).
 *
 * The engine returns its rejections as English text — `'No Action Points.'` — and the Phase 1
 * extraction put every one of those strings into the `engine` catalogue keyed by an id. The
 * engine itself is frozen, so it will keep returning English; this maps the text back to its
 * catalogue entry, which is where the Hindi edition will put the translation. An engine string
 * the catalogue does not know renders loudly, like a missing UI key — a rejection a player
 * cannot read is a finding, not something to paper over with the raw English.
 */
import { ENGINE_I18N_EN } from '@immunity-wars/content';

/** English text -> catalogue key, built once. */
const KEY_OF_TEXT: ReadonlyMap<string, string> = new Map(
  Object.entries(ENGINE_I18N_EN).map(([k, v]) => [v, k]),
);

export function engineText(message: string): string {
  const key = KEY_OF_TEXT.get(message);
  if (key === undefined) return `⟪engine: ${message}⟫`;
  return ENGINE_I18N_EN[key] ?? message;
}
