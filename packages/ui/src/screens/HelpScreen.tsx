/**
 * HOW TO PLAY (docs/APP_FLOW.md §4's first Title slot, and the pause menu's; the structure
 * agreed with Kartik and the words settled with him: docs/HELP_DRAFT.md, its provenance tags,
 * and the four rulings of 6 September 2026 recorded there and in docs/for-P2.6.md).
 *
 * Ten sections behind an index. A newcomer reads them in order before a first game; a paused
 * player opens the one they need and goes back. Every section is self-contained and fits one
 * to two phone screens at 360 px, which the Gate 1 audit holds it to like every other screen.
 *
 * WHAT IS RENDERED FROM WHERE, so that Help can never disagree with the game it describes:
 *   - the numbers a difficulty sets (Action Points, the window, the clearing grace) come from
 *     the content pack's tables, never retyped;
 *   - a cell's speed is the content pack's, its name the catalogue's, as everywhere;
 *   - section 3's example organ row is the inspect sheet's own composition of the Liver at
 *     integrity 2 of 3, from the same keys and the same content line, so the example IS the row;
 *   - section 9's event names and reasons are the content pack's event table, the very objects
 *     the reveal renders; only the one-line effect is Help's own, and it is pinned to the
 *     engine's behaviour by firing each event (tests/equivalence/src/help-events.test.ts);
 *   - section 10 reuses the difficulty screen's three descriptions.
 * Help's own words are catalogue entries like every other player string, and the no-dashes
 * test covers them.
 *
 * Help is rules. There is no tips section (ruling 3): if strategy is ever added it is a
 * separate section behind a spoiler warning, never folded in here.
 */
import {
  CELL_KEYS,
  DIFF,
  EVENTS,
  GRACE_CLEAR,
  INV_HP,
  ORGANS,
  SPEED,
} from '@immunity-wars/content';
import { Fragment, type CSSProperties, type ReactElement } from 'react';

import { t } from '../i18n';
import { cellDisplayName, organDisplayName, typeDisplayName } from '../names';
import { RichText } from '../panels/LogPanel';

const BTN: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 48,
  fontSize: '0.9375rem',
  borderRadius: 10,
  border: '2px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
  marginTop: 10,
  padding: '8px 14px',
  textAlign: 'left',
};

const P: CSSProperties = {
  fontSize: '0.9375rem',
  lineHeight: 1.45,
  color: '#2E2A28',
  margin: '10px 0',
};
const NAME: CSSProperties = { fontWeight: 700 };
const EXAMPLE: CSSProperties = {
  ...P,
  borderLeft: '3px solid #C48377',
  paddingLeft: 10,
  color: '#78665D',
};

/** The ten sections, in the agreed order. The key is what the shell carries. */
export const HELP_SECTION_KEYS = [
  's1',
  's2',
  's3',
  's4',
  's5',
  's6',
  's7',
  's8',
  's9',
  's10',
] as const;
export type HelpSectionKey = (typeof HELP_SECTION_KEYS)[number];

const DIFFS = ['training', 'normal', 'hard'] as const;

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v ?? 0);
}

/** The sentence terminator is a catalogue entry (`help.stop`): Hindi ends a sentence with a
 *  danda, not a full stop, and the i18n lint rule is right to refuse a bare "." in JSX. */
const stop = (): string => t('help.stop');

/** A bold lead, terminated, then a space. */
function Lead({ text }: { text: string }): ReactElement {
  return (
    <>
      <span style={NAME}>
        {text}
        {stop()}
      </span>{' '}
    </>
  );
}

/** A named paragraph: a bold lead followed by its text. */
function Named({ nameKey, textKey }: { nameKey: string; textKey: string }): ReactElement {
  return (
    <p style={P}>
      <Lead text={t(nameKey)} />
      {t(textKey)}
    </p>
  );
}

function difficultyNumbers(): Record<string, number> {
  const d = DIFF as Record<string, { ap?: unknown; turns?: unknown }>;
  return {
    training: num(d['training']?.turns),
    normal: num(d['normal']?.turns),
    hard: num(d['hard']?.turns),
    grace: GRACE_CLEAR,
    apT: num(d['training']?.ap),
    apN: num(d['normal']?.ap),
    apH: num(d['hard']?.ap),
    wT: num(d['training']?.turns),
    wN: num(d['normal']?.turns),
    wH: num(d['hard']?.turns),
  };
}

function sectionBody(key: HelpSectionKey): ReactElement {
  const n = difficultyNumbers();
  switch (key) {
    case 's1':
      return (
        <>
          <p style={P}>{t('help.s1.p1', n)}</p>
          <p style={P}>{t('help.s1.p2')}</p>
          <p style={P}>{t('help.s1.p3')}</p>
        </>
      );
    case 's2':
      return (
        <>
          <p style={P}>{t('help.s2.p1')}</p>
          <Named nameKey="help.s2.infection.name" textKey="help.s2.infection.text" />
          <Named nameKey="help.s2.command.name" textKey="help.s2.command.text" />
          <Named nameKey="help.s2.spread.name" textKey="help.s2.spread.text" />
          <p style={P}>{t('help.s2.p5')}</p>
        </>
      );
    case 's3': {
      // The example row is the inspect sheet's own composition of the Liver at 2 of 3.
      const liver = (
        ORGANS as Record<string, { kind?: unknown; integrity?: unknown; effect?: unknown }>
      )['liver'];
      const max = num(liver?.integrity);
      const effect = typeof liver?.effect === 'string' ? liver.effect : '';
      return (
        <>
          <Named nameKey="help.s3.routes.name" textKey="help.s3.routes.text" />
          <Named nameKey="help.s3.blood.name" textKey="help.s3.blood.text" />
          <Named nameKey="help.s3.branches.name" textKey="help.s3.branches.text" />
          <p style={P}>{t('help.s3.pips')}</p>
          <p style={EXAMPLE} data-help-example="organ-row">
            {t('inspect.organ', {
              organ: organDisplayName('liver'),
              kind: t(`organ.${String(liver?.kind ?? 'defence')}`),
              hp: max - 1,
              max,
            })}
            {effect ? <> {t('effects.organEffect', { effect })}</> : null}
          </p>
          <Named nameKey="help.s3.brain.name" textKey="help.s3.brain.text" />
          <p style={P}>{t('help.s3.tap')}</p>
        </>
      );
    }
    case 's4':
      return (
        <>
          <p style={P}>{t('help.s4.p1', n)}</p>
          <p style={P}>{t('help.s4.p2')}</p>
          <p style={P}>{t('help.s4.p3')}</p>
        </>
      );
    case 's5': {
      const speed = SPEED as Record<string, unknown>;
      return (
        <>
          <p style={P}>{t('help.s5.lead')}</p>
          {CELL_KEYS.map((ck) => (
            <p key={ck} style={P} data-help-cell={ck}>
              <Lead text={cellDisplayName(ck)} />
              {ck === 'bcell' ? null : <>{t('help.speed', { n: num(speed[ck]) })} </>}
              {t(`help.cell.${ck}`)}
            </p>
          ))}
          <Named nameKey="help.cell.resident.name" textKey="help.cell.resident.text" />
        </>
      );
    }
    case 's6':
      return (
        <>
          {Object.keys(INV_HP).map((ty) => (
            <p key={ty} style={P} data-help-invader={ty}>
              <Lead text={typeDisplayName(ty)} />
              {t(`help.invader.${ty}`)}
            </p>
          ))}
        </>
      );
    case 's7':
      return (
        <>
          <p style={P}>{t('help.s7.p1')}</p>
          <p style={P}>{t('help.s7.p2')}</p>
          <p style={P}>{t('help.s7.p3')}</p>
          <p style={P}>{t('help.s7.p4')}</p>
          <Named nameKey="help.s7.x.name" textKey="help.s7.x.text" />
        </>
      );
    case 's8':
      return (
        <>
          <p style={P}>{t('help.s8.p1')}</p>
          <p style={P}>{t('help.s8.p2')}</p>
          <p style={P}>{t('help.s8.p3')}</p>
        </>
      );
    case 's9': {
      // The event table's own name and reason, the objects the reveal renders; Help's line is
      // the effect, pinned to the engine by firing each event.
      const events = EVENTS as Record<string, { name?: unknown; why?: unknown }>;
      return (
        <>
          <p style={P}>{t('help.s9.lead')}</p>
          {Object.keys(events).map((k) => (
            <p key={k} style={P} data-help-event={k}>
              <Lead text={String(events[k]?.name ?? k)} />
              {/* The reason carries the engine's <b> emphasis; the app's rich-text renderer
                  turns it into runs, as the reveal does. A regex that stripped tags was
                  CodeQL's "incomplete sanitisation" pattern and is gone. */}
              <RichText text={String(events[k]?.why ?? '')} />
              {/* Two reasons (Fatigue, Acute-phase surge) already state the effect in Kartik's
                  own words, so their Help line is empty rather than a repeat; the pin checks
                  the reason's numbers for those. */}
              {t(`help.event.${k}.effect`) ? <> {t(`help.event.${k}.effect`)}</> : null}
            </p>
          ))}
          <p style={P}>{t('help.s9.rare')}</p>
        </>
      );
    }
    case 's10':
      return (
        <>
          {DIFFS.map((d) => (
            <p key={d} style={P}>
              <Lead text={t(`difficulty.${d}`)} />
              {t(`difficulty.${d}Desc`)}
              {stop()}
              {d === 'training' ? (
                <>
                  {' '}
                  {t('difficulty.trainingRecommended')}
                  {stop()}
                </>
              ) : null}
            </p>
          ))}
          <p style={P}>{t('help.s10.p1', n)}</p>
        </>
      );
    default:
      return <Fragment />;
  }
}

export function HelpScreen({
  section,
  onOpen,
  onBack,
}: {
  /** The open section, or null for the index. */
  section: HelpSectionKey | null;
  /** Open a section, or null for the index. */
  onOpen: (key: HelpSectionKey | null) => void;
  /** Leave Help: back to where it was opened from. */
  onBack: () => void;
}): ReactElement {
  if (section === null) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '32px 16px' }} data-screen="help">
        <h2 style={{ fontSize: '1.375rem', color: '#2E2A28' }}>{t('help.title')}</h2>
        <p style={{ fontSize: '0.875rem', color: '#78665D' }}>{t('help.index.lead')}</p>
        {HELP_SECTION_KEYS.map((k, i) => (
          <button key={k} style={BTN} onClick={() => onOpen(k)} data-help-section={k}>
            {t('help.number', { n: i + 1 })} {t(`help.${k}.title`)}
          </button>
        ))}
        <button style={{ ...BTN, textAlign: 'center', borderColor: '#C48377' }} onClick={onBack}>
          {t('help.back')}
        </button>
      </div>
    );
  }
  const i = HELP_SECTION_KEYS.indexOf(section);
  const next = HELP_SECTION_KEYS[i + 1] ?? null;
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '32px 16px' }} data-screen="help">
      <h2 style={{ fontSize: '1.375rem', color: '#2E2A28' }}>
        {t('help.number', { n: i + 1 })} {t(`help.${section}.title`)}
      </h2>
      {sectionBody(section)}
      {next ? (
        <button style={BTN} onClick={() => onOpen(next)}>
          {t('help.next')}
        </button>
      ) : null}
      <button
        style={{ ...BTN, textAlign: 'center', borderColor: '#C48377' }}
        onClick={() => onOpen(null)}
      >
        {t('help.toIndex')}
      </button>
    </div>
  );
}
