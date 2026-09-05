/**
 * THE LOG PANEL — CP5, the teaching-prose panel (COMMAND_SURFACE_PLAN §2). What explains the
 * biology as it happens: the engine's log, newest first, each line with its turn.
 *
 * Every line renders through the ENGINE catalogue by TEMPLATE (`engineLogText`): the
 * engine's messages are interpolated prose ("<b>Monocyte</b> moved to Lungs 2"), so an
 * exact-string lookup — what rejections use — cannot find them; the catalogue's entries
 * carry placeholders, and each is compiled to a pattern that recovers the values, so the
 * Hindi edition re-renders the translated template with the same values. The FIVE composed
 * sites FINDINGS #53 lists (produce, strike, tag, engulf, the draw's entry line) have no
 * template and render PLAINLY, not loudly — they are known, listed and pinned, and a
 * ⟪marker⟫ on every strike would teach a newcomer nothing. `log-text.test.ts` asserts that
 * those five are the ONLY misses, so a new one fails a test rather than hiding in the panel.
 *
 * The engine's `<b>` and `<i>` are rendered as emphasis; nothing else in a message is
 * treated as markup — no HTML is injected.
 */
import type { CSSProperties, ReactElement } from 'react';
import { useState } from 'react';

import { engineLogText } from '../engineText';
import { t } from '../i18n';

export interface LogLine {
  t: number;
  msg: string;
  kind: string;
}

const SHOWN = 8;

export interface RichRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

/** The four tokens the engine's prose uses. Anything else is text, including any other `<`. */
const TOKENS: readonly { tag: string; bold: number; italic: number }[] = [
  { tag: '<b>', bold: 1, italic: 0 },
  { tag: '</b>', bold: -1, italic: 0 },
  { tag: '<i>', bold: 0, italic: 1 },
  { tag: '</i>', bold: 0, italic: -1 },
];

/**
 * `<b>`/`<i>` → emphasis runs. A LINEAR scan over the four tokens, not a regex and not an
 * HTML parser: the engine's messages carry only these (checked against the catalogue and the
 * engine source), and any other `<` is literal text. The first version stripped unknown tags
 * with `<[^>]+>`, which CodeQL flagged as polynomial ReDoS on a run of `<` — a defect in the
 * new code, found by the PR's code scanning and fixed before merge (for-P2.5.md, CP5).
 */
export function richRuns(text: string): RichRun[] {
  const out: RichRun[] = [];
  let bold = 0;
  let italic = 0;
  let buf = '';
  const flush = (): void => {
    if (buf) out.push({ text: buf, bold: bold > 0, italic: italic > 0 });
    buf = '';
  };
  let i = 0;
  while (i < text.length) {
    if (text[i] === '<') {
      const tok = TOKENS.find((tk) => text.startsWith(tk.tag, i));
      if (tok) {
        flush();
        bold += tok.bold;
        italic += tok.italic;
        i += tok.tag.length;
        continue;
      }
    }
    buf += text[i];
    i += 1;
  }
  flush();
  return out;
}

export function RichText({ text }: { text: string }): ReactElement {
  return (
    <>
      {richRuns(text).map((r, n) => {
        const style: CSSProperties = {
          fontWeight: r.bold ? 700 : undefined,
          fontStyle: r.italic ? 'italic' : undefined,
        };
        return (
          <span key={n} style={style}>
            {r.text}
          </span>
        );
      })}
    </>
  );
}

const COLOUR: Record<string, string> = {
  good: '#2F6B4A',
  bad: '#B03A2E',
  big: '#2E2A28',
};

export function LogPanel({ lines }: { lines: readonly LogLine[] }): ReactElement {
  const [all, setAll] = useState(false);
  const shown = all ? lines : lines.slice(0, SHOWN);
  return (
    <div
      data-panel="log"
      style={{
        marginTop: 6,
        padding: '6px 8px',
        border: '1.5px solid #C8877B',
        borderRadius: 10,
        background: '#FFFDF9',
        fontSize: 13,
      }}
    >
      <div style={{ fontSize: 12, color: '#7C6A61', fontWeight: 700, marginBottom: 2 }}>
        {t('log.title')}
      </div>
      {shown.length === 0 ? (
        <div style={{ color: '#7C6A61' }}>{t('log.empty')}</div>
      ) : (
        shown.map((l, i) => {
          const r = engineLogText(l.msg);
          return (
            <div
              key={[String(l.t), String(i)].join('-')}
              data-log-line="1"
              data-unmatched={r.matched ? undefined : '1'}
              style={{
                display: 'flex',
                gap: 6,
                padding: '3px 0',
                borderTop: i === 0 ? 'none' : '1px solid #EADFD5',
                color: COLOUR[l.kind] ?? '#4A423E',
                fontWeight: l.kind === 'big' ? 700 : undefined,
              }}
            >
              <span style={{ color: '#7C6A61', fontSize: 11, flex: '0 0 auto', paddingTop: 2 }}>
                {t('log.turn', { n: l.t })}
              </span>
              <span>
                <RichText text={r.text} />
              </span>
            </div>
          );
        })
      )}
      {lines.length > SHOWN ? (
        <button
          onClick={() => setAll((v) => !v)}
          style={{
            minHeight: 44,
            width: '100%',
            fontSize: 14,
            marginTop: 4,
            borderRadius: 8,
            border: '1.5px solid #8E6E53',
            background: '#FFFDF9',
            cursor: 'pointer',
          }}
        >
          {all ? t('log.showFewer') : t('log.showAll', { n: lines.length })}
        </button>
      ) : null}
    </div>
  );
}
