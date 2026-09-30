/**
 * Engine strings through the catalogue (ruling of 4 September 2026: rejection text is
 * rendered through the catalogue, beside the command bar).
 *
 * The engine writes English: a rejection (`'No Action Points.'`), a log line, a frame's
 * headline, a query's label. The Phase 1 extraction put every one of those strings into the
 * `engine` catalogue keyed by an id, a message that carries a value holding a placeholder in
 * its place. This maps the text back to its catalogue entry, which is where the Hindi edition
 * will put the translation. Since queue Q8 (30 September 2026) every string the engine writes
 * is in the catalogue: nothing is composed where the extractor cannot follow it
 * (`$meta.unextractedSites` is pinned empty).
 */
import { ENGINE_I18N_EN } from '@immunity-wars/content';

/** English text -> catalogue key, built once. */
const KEY_OF_TEXT: ReadonlyMap<string, string> = new Map(
  Object.entries(ENGINE_I18N_EN).map(([k, v]) => [v, k]),
);

/**
 * For a string a player must read now: a rejection, a frame's headline, a query's label. One
 * the catalogue does not hold renders LOUDLY, like a missing UI key: a rejection a player cannot
 * read is a finding, not something to paper over with the raw English.
 *
 * By template as well as exactly (queue Q8; FINDINGS #102). This looked up exactly, so a
 * rejection carrying a value, "Antivenom costs 3 AP.", rendered loudly whatever the catalogue
 * held, and the production breakdown's rate ceiling needed a mapper of its own to put its
 * number back (`productionText.ts`, deleted with this).
 */
export function engineText(message: string): string {
  const r = engineLogText(message);
  return r.matched ? r.text : `⟪engine: ${message}⟫`;
}

/**
 * LOG PROSE BY TEMPLATE (CP5). The engine's log messages are interpolated —
 * "<b>Monocyte</b> moved to Lungs 2." — and the catalogue holds them with placeholders —
 * "<b>{cname}</b> moved to {placeName}." — so an exact lookup cannot find them. Each
 * placeholder entry is compiled ONCE to a pattern that recovers the values; a message that
 * matches is re-rendered from the catalogue's template with those values, which is how the
 * Hindi edition will render the same line translated. The exact map is tried first.
 *
 * `matched: false` is returned rather than a loud marker, and the log panel renders such a line
 * plainly: a rejection is one line a player must read now, a log line one of forty. There is no
 * known miss since queue Q8, when the five composed sites FINDINGS #53 listed became one literal
 * per sentence, and `log-text.test.ts` pins that no recorded line misses.
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
  // The MOST LITERAL template first: the one fixing the most text of a message wins over a
  // sparser one that also matches it (queue Q8; FINDINGS #102). This sorted by the template's
  // length with its placeholder NAMES counted, so the crisis event's `<b>{bad}{name}</b> — {why}`
  // outranked the rare event's `<b>★ {name}</b> — {why}` and claimed its line: the same English,
  // and the wrong sentence for a translator.
  out.sort((a, b) => literalLength(b.template) - literalLength(a.template));
  return out;
}

/** The characters a template fixes: its text with every `{placeholder}` taken out. */
function literalLength(template: string): number {
  return template.replace(/\{\w+\}/g, '').length;
}

export interface LogText {
  text: string;
  matched: boolean;
  key: string | null;
}

/**
 * Memoised per message (the full-UI re-measure, 6 September 2026): the log re-renders on every
 * frame of a spread and its lines recur across frames, so the template scan runs once per
 * distinct message for the life of the page. A pure function of its argument, so the cache
 * is unbounded by design — a game produces a few hundred distinct lines.
 */
const LOG_TEXT_CACHE = new Map<string, LogText>();

export function engineLogText(message: string): LogText {
  const cached = LOG_TEXT_CACHE.get(message);
  if (cached) return cached;
  const result = engineLogTextUncached(message);
  LOG_TEXT_CACHE.set(message, result);
  return result;
}

function engineLogTextUncached(message: string): LogText {
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
