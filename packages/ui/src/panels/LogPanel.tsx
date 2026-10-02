/**
 * THE LOG PANEL — CP5, the teaching-prose panel (COMMAND_SURFACE_PLAN §2). What explains the
 * biology as it happens: the engine's log, newest first, each line with its turn.
 *
 * Every line renders through the ENGINE catalogue by TEMPLATE (`engineLogText`): the
 * engine's messages are interpolated prose ("<b>Monocyte</b> moved to Lungs 2"), so an
 * exact-string lookup — what rejections use — cannot find them; the catalogue's entries
 * carry placeholders, and each is compiled to a pattern that recovers the values, so the
 * Hindi edition re-renders the translated template with the same values. A line with no
 * template would render PLAINLY, not loudly; since queue Q8 there is none, and
 * `log-text.test.ts` asserts that no recorded line misses, so a new one fails a test rather
 * than hiding in the panel.
 *
 * The engine's `<b>` and `<i>` are rendered as emphasis; nothing else in a message is
 * treated as markup — no HTML is injected.
 */
import type { CSSProperties, ReactElement } from 'react';
import { useState } from 'react';

import { engineLogText } from '../engineText';
import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { COLOUR, RADIUS } from '../kit/tokens';
import { SAY, TONE } from './onCard';

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

/** What kind of line it is, in the panels' own tones (`onCard.ts`). */
const LINE_COLOUR: Record<string, string> = {
  good: TONE.good,
  bad: TONE.bad,
  big: COLOUR.ink,
};

export function LogPanel({
  lines,
  titled = true,
}: {
  lines: readonly LogLine[];
  /** Whether it heads itself; the messages panel's tab names it instead (piece 5, §19). */
  titled?: boolean;
}): ReactElement {
  const [all, setAll] = useState(false);
  const shown = all ? lines : lines.slice(0, SHOWN);
  return (
    <div
      data-panel="log"
      style={{
        // A sheet of its own, the kit's lighter cream: it is read on the messages' sheet in the
        // game, and on the result screen, which is not redrawn until L5.
        marginTop: 6,
        padding: '8px 10px',
        borderRadius: RADIUS.control,
        background: COLOUR.creamLit,
        boxShadow: `inset 0 0 0 1.5px ${COLOUR.creamEdge}`,
        ...SAY.body,
        fontSize: '0.8125rem',
      }}
    >
      {titled ? <div style={{ ...SAY.label, marginBottom: 2 }}>{t('log.title')}</div> : null}
      {shown.length === 0 ? (
        <div style={{ color: COLOUR.inkSoft }}>{t('log.empty')}</div>
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
                borderTop: i === 0 ? 'none' : `1.5px solid ${COLOUR.creamEdge}`,
                color: LINE_COLOUR[l.kind] ?? COLOUR.ink,
                fontWeight: l.kind === 'big' ? 800 : undefined,
              }}
            >
              <span
                style={{
                  color: COLOUR.inkSoft,
                  fontSize: '0.75rem',
                  flex: '0 0 auto',
                  paddingTop: 1,
                }}
              >
                {t('log.turn', { n: l.t })}
              </span>
              {/*
                A LONG NAME BREAKS RATHER THAN RUN PAST THE SHEET. Beside the turn's tag a line has
                what is left of the width, and a part of a row is never narrower than its longest
                word unless it is told it may be. At 200% zoom a disease's name is longer than the
                room: the result's log then scrolled sideways (the Gate 1 audit, 2 October 2026).
              */}
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                <RichText text={r.text} />
              </span>
            </div>
          );
        })
      )}
      {lines.length > SHOWN ? (
        <KitButton
          onPress={() => setAll((v) => !v)}
          style={{ minHeight: 44, fontSize: '0.875rem', marginTop: 6, marginBottom: 6 }}
        >
          {all ? t('log.showFewer') : t('log.showAll', { n: lines.length })}
        </KitButton>
      ) : null}
    </div>
  );
}
