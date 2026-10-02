/**
 * THE TABLE OF WHAT CHANGES between Easy, Normal and Hard (`difficultyFacts.ts` has what it says
 * and where each line comes from), and the card that holds it one tap away: behind a button that
 * says what it opens, on the difficulty screen and on the result of a game on Easy. The difficulty
 * screen is for choosing, and a newcomer chooses by the three rows. How to play shows the table
 * open, in its section on difficulty, as the printed rulebook does.
 *
 * ROWS OF THREE. What a row is about is said once, over its three cells, and the three names stand
 * once at the head of the table, so a number is read under its difficulty's name. Each cell also
 * carries its difficulty's name for a reader that reads it alone.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { COLOUR, TYPE } from '../kit/tokens';

import { CARD, STACK } from './chrome';
import { DIFFICULTIES, differenceRows, type DifferenceCell } from './difficultyFacts';

const GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  columnGap: 8,
};
const HEAD: CSSProperties = { ...TYPE.label, color: COLOUR.inkSoft, overflowWrap: 'anywhere' };
const LABEL: CSSProperties = { ...TYPE.body, color: COLOUR.inkSoft, margin: '10px 0 2px' };
const CELL: CSSProperties = {
  ...TYPE.body,
  fontWeight: 800,
  color: COLOUR.ink,
  overflowWrap: 'anywhere',
};

const say = (c: DifferenceCell): string => ('n' in c ? String(c.n) : t(c.key, c.params));

/** The table itself, for a card: the three names, then each row under them. */
export function DifferencesTable(): ReactElement {
  return (
    <div data-differences-table="">
      <div style={GRID} aria-hidden="true">
        {DIFFICULTIES.map((d) => (
          <span key={d} style={HEAD}>
            {t(`difficulty.${d}`)}
          </span>
        ))}
      </div>
      {differenceRows().map((row) => (
        <div key={row.id} data-difference={row.id}>
          <p style={LABEL}>{t(row.labelKey)}</p>
          <div style={GRID}>
            {DIFFICULTIES.map((d) => {
              const text = say(row.cells[d]);
              return (
                <span
                  key={d}
                  style={CELL}
                  aria-label={t('differences.cell', { name: t(`difficulty.${d}`), text })}
                >
                  {text}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DifferencesCard({
  toggleKey,
  marginTop = 12,
}: {
  /** The catalogue key of the button's words: what it opens, said for the screen it is on. */
  toggleKey: string;
  marginTop?: number;
}): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <KitButton
        style={{ ...STACK, marginTop }}
        data-differences={open ? 'open' : 'closed'}
        aria-expanded={open}
        onPress={() => setOpen((v) => !v)}
      >
        {t(open ? 'differences.hide' : toggleKey)}
      </KitButton>
      {open ? (
        <div data-differences-card="" style={{ ...CARD, textAlign: 'left' }}>
          <DifferencesTable />
        </div>
      ) : null}
    </>
  );
}
