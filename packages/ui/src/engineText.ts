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

/**
 * LOG PROSE BY TEMPLATE (CP5). The engine's log messages are interpolated —
 * "<b>Monocyte</b> moved to Lungs 2." — and the catalogue holds them with placeholders —
 * "<b>{cname}</b> moved to {placeName}." — so an exact lookup cannot find them. Each
 * placeholder entry is compiled ONCE to a pattern that recovers the values; a message that
 * matches is re-rendered from the catalogue's template with those values, which is how the
 * Hindi edition will render the same line translated. The exact map is tried first.
 *
 * `matched: false` is returned rather than a loud marker: the log's known misses are the five
 * composed sites FINDINGS #53 lists, rendered plainly by the panel and pinned as the ONLY
 * misses by `log-text.test.ts`. A rejection is one line a player must read now; a log line is
 * one of forty, and a marker on every strike would teach nothing.
 */
interface Template {
  key: string;
  pattern: RegExp;
  names: string[];
  template: string;
}

let TEMPLATES: Template[] | null = null;

function compile(): Template[] {
  const out: Template[] = [];
  for (const [key, template] of Object.entries(ENGINE_I18N_EN)) {
    if (!template.includes('{')) continue;
    const names: string[] = [];
    // Escape the literal text, then turn each {name} into a lazy capture.
    const source = template
      .split(/(\{\w+\})/)
      .map((part) => {
        const m = /^\{(\w+)\}$/.exec(part);
        if (m) {
          names.push(m[1] ?? '');
          return '([\\s\\S]*?)';
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('');
    out.push({ key, pattern: new RegExp(`^${source}$`), names, template });
  }
  // Longer templates first: the most specific literal text wins over a sparser one.
  out.sort((a, b) => b.template.length - a.template.length);
  return out;
}

export interface LogText {
  text: string;
  matched: boolean;
  key: string | null;
}

export function engineLogText(message: string): LogText {
  const exact = KEY_OF_TEXT.get(message);
  if (exact !== undefined)
    return { text: ENGINE_I18N_EN[exact] ?? message, matched: true, key: exact };
  TEMPLATES ??= compile();
  for (const tpl of TEMPLATES) {
    const m = tpl.pattern.exec(message);
    if (!m) continue;
    let text = tpl.template;
    tpl.names.forEach((name, i) => {
      text = text.replace(`{${name}}`, m[i + 1] ?? '');
    });
    return { text, matched: true, key: tpl.key };
  }
  return { text: message, matched: false, key: null };
}
