/**
 * The card reveal's body — the dialog queue's first client (docs/APP_FLOW.md ruling 5).
 *
 * One row per NEW arrival this draw, diffed by invader id in PlayScreen — not read from
 * `drawn`, which carries only the first card (`drawnList`, which carries them all, is one of
 * the 13 state-only keys the view deliberately drops). Disease and route names are content
 * data; the framing strings come from the catalogue. The remembered/novel flags render when
 * the view says so — they are attributes of the arrival, not separate modal decisions.
 *
 * Each row is the PATHOGEN CARD's second entry point (P2.5, 4 Sep 2026): tapping an arrival
 * opens its card above the reveal. A novel arrival has no card and stays a plain row.
 *
 * THE CRISIS SECTION (ruled 6 September 2026, by the test "does it change what the player can
 * do THIS TURN?"): every crisis event does, because it takes effect on the turn it is drawn —
 * and the reveal already interrupts at exactly that moment. So a crisis is a section of THIS
 * dialog, above the arrivals, never a dialog of its own: the event's name, its why, and the
 * effect lines the strip composes. Nothing else in the game interrupts play.
 */
import { ROUTES } from '@immunity-wars/content';

import type { ReactElement } from 'react';

import { t } from '../i18n';
import { RichText } from '../panels/LogPanel';

export interface RevealArrival {
  disease: string;
  type: string;
  lane: string | null;
  remembered: boolean;
  novel: boolean;
}

export interface RevealCrisis {
  name: string;
  bad: boolean;
  why: string | null;
  /** The effect chips this event produced, as the strip words them (name folded off). */
  effects: readonly string[];
}

function routeName(lane: string | null): string {
  if (!lane) return '';
  const r = (ROUTES as Record<string, { name?: unknown }>)[lane];
  return typeof r?.name === 'string' ? r.name : lane;
}

export function RevealBody({
  arrivals,
  crisis = null,
  onCard,
}: {
  arrivals: readonly RevealArrival[];
  /** This turn's crisis event, when one fired at the turn start. */
  crisis?: RevealCrisis | null;
  /** Opens the pathogen card for an arrival (not offered for a novel one). */
  onCard?: (arrival: RevealArrival) => void;
}): ReactElement {
  return (
    <div>
      {crisis ? (
        <div
          data-reveal-crisis={crisis.name}
          style={{
            marginBottom: 8,
            padding: '6px 10px',
            borderRadius: 8,
            border: `1.5px solid ${crisis.bad ? '#B03A2E' : '#2F6B4A'}`,
            background: crisis.bad ? '#FBEAE5' : '#EAF3EC',
            color: crisis.bad ? '#B03A2E' : '#2F6B4A',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78665D' }}>
            {t(crisis.bad ? 'reveal.crisisBad' : 'reveal.crisisGood')}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>{crisis.name}</div>
          {crisis.why ? (
            // The event's why is content prose with the engine's <b> emphasis in it.
            <div style={{ fontSize: '0.8125rem', color: '#4A423E' }}>
              <RichText text={crisis.why} />
            </div>
          ) : null}
          {crisis.effects.map((e, i) => (
            <div key={String(i)} style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
              {e}
            </div>
          ))}
        </div>
      ) : null}
      {arrivals.map((a, i) => {
        const inner = (
          <>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#2E2A28' }}>{a.disease}</span>
            <span style={{ fontSize: '0.8125rem', color: '#78665D' }}>
              {t('reveal.enteredVia')} {routeName(a.lane)}
            </span>
            {a.novel ? (
              <span style={{ fontSize: '0.8125rem', color: '#B03A2E', fontWeight: 700 }}>
                {t('reveal.novel')}
              </span>
            ) : null}
            {a.remembered ? (
              <span style={{ fontSize: '0.8125rem', color: '#1F6F8B', fontWeight: 700 }}>
                {t('reveal.remembered')}
              </span>
            ) : null}
            {!a.novel && onCard ? (
              <span style={{ fontSize: '0.8125rem', color: '#8E6E53' }}>
                {t('reveal.tapForCard')}
              </span>
            ) : null}
          </>
        );
        const style = {
          minHeight: 44,
          display: 'flex',
          flexDirection: 'column' as const,
          justifyContent: 'center',
          alignItems: 'flex-start',
          borderTop: i === 0 ? 'none' : '1px solid #EADFD5',
          padding: '6px 0',
          width: '100%',
        };
        const key = [a.disease, String(i)].join('-');
        return !a.novel && onCard ? (
          <button
            key={key}
            data-reveal-card={a.disease}
            onClick={() => onCard(a)}
            style={{
              ...style,
              background: 'transparent',
              border: 'none',
              borderTop: style.borderTop,
              cursor: 'pointer',
              textAlign: 'left',
              font: 'inherit',
            }}
          >
            {inner}
          </button>
        ) : (
          <div key={key} style={style}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The crisis section from the view (pure, testable): this turn's banner, with the effect chips
 * it folded into — the strip's own words with the event's name taken back off the front.
 */
export function revealCrisis(
  g: Readonly<Record<string, unknown>>,
  chips: readonly { text: string; detail?: string | null; event?: string }[],
): RevealCrisis | null {
  const banner = g['banner'] as { name?: unknown; bad?: unknown; why?: unknown } | null;
  if (!banner || typeof banner.name !== 'string') return null;
  const name = banner.name;
  const prefix = `${name} ${t('inspect.sep')} `;
  // The chips the strip folded this event into (`event`), minus the banner-only chip whose
  // whole text is the name; the name is taken back off the front where the fold put it.
  const effects = chips
    .filter((c) => c.event === name && c.text !== name)
    .map((c) => (c.text.startsWith(prefix) ? c.text.slice(prefix.length) : c.text));
  return {
    name,
    bad: banner.bad === true,
    why: typeof banner.why === 'string' && banner.why.trim() !== '' ? banner.why : null,
    effects,
  };
}
