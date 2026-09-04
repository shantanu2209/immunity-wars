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

/** `<b>`/`<i>` → emphasis; every other tag dropped. A tokenizer, not an HTML parser. */
export function RichText({ text }: { text: string }): ReactElement {
  const out: ReactElement[] = [];
  const re = /<(\/?)(b|i)>|<[^>]+>/g;
  let bold = 0;
  let italic = 0;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  const push = (s: string): void => {
    if (!s) return;
    const style: CSSProperties = {
      fontWeight: bold > 0 ? 700 : undefined,
      fontStyle: italic > 0 ? 'italic' : undefined,
    };
    out.push(
      <span key={n} style={style}>
        {s}
      </span>,
    );
    n += 1;
  };
  while ((m = re.exec(text)) !== null) {
    push(text.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[2] === 'b') bold += m[1] === '/' ? -1 : 1;
    else if (m[2] === 'i') italic += m[1] === '/' ? -1 : 1;
  }
  push(text.slice(last));
  return <>{out}</>;
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
