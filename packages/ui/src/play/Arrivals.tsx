/**
 * THE ARRIVALS STAGE — piece 6 of the play screen (docs/for-P2.7.md §20, item 7 of 19 September).
 *
 * What was a dialog over the game becomes a stage of the frame, in the same format as planning and
 * command: the play area holds this draw's cards, the middle says what the spread did and what the
 * turn's event was, and the one button at the bottom begins planning.
 *
 * THE CARDS ARE DRAWN FROM DATA, not from the printed card's artwork: the kind's art (`path-*`, the
 * same file the board and the inspect sheet use), the disease's name, and its antibody class. So a
 * disease added to the content pack has a front the moment it has a row, and the physical deck and
 * the app cannot drift apart — the parity rule in CLAUDE.md, applied to a card.
 *
 * A tap flips one card to its back: where it came in, whether it is novel or remembered, and the
 * class that neutralises it, with the card icon opening the full pathogen card. A second tap flips
 * it back. The back is a SUMMARY, not the full card: the full card is a window of its own and does
 * not fit a tile, and item 11 of the same message forbids an intermediate level that says nothing —
 * so the icon goes straight to the card from either face.
 */
import { FAMILY, ROUTES } from '@immunity-wars/content';

import { useState, type CSSProperties, type ReactElement } from 'react';

import { t } from '../i18n';
import { CardIcon } from '../panels/CardIcon';
import { RichText } from '../panels/LogPanel';

import type { RevealArrival, RevealCrisis } from '../dialogs/RevealBody';

const CARD: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 2,
  minHeight: 44,
  padding: '6px 4px',
  borderRadius: 10,
  border: '1.5px solid #C48377',
  background: '#FFFDF9',
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'center',
  overflow: 'hidden',
};

/** A route's player-facing name, as the reveal said it. */
const routeName = (lane: string): string => {
  const r = (ROUTES as Record<string, { name?: unknown }>)[lane];
  return typeof r?.name === 'string' ? r.name : lane;
};

const familyOf = (disease: string): string =>
  String((FAMILY as Record<string, string | undefined>)[disease] ?? '');

/** One card, front or back; the whole tile is the button that flips it. */
function ArrivalCard({
  arrival,
  onCard,
}: {
  arrival: RevealArrival;
  onCard: ((a: RevealArrival) => void) | undefined;
}): ReactElement {
  const [back, setBack] = useState(false);
  const family = familyOf(arrival.disease);
  const name = arrival.novel ? t('inspect.unknown') : arrival.disease;
  return (
    <button
      data-arrival={arrival.disease}
      data-arrival-face={back ? 'back' : 'front'}
      style={CARD}
      onClick={() => setBack((b) => !b)}
    >
      {back ? (
        <>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2E2A28' }}>{name}</span>
          {arrival.lane !== null ? (
            <span style={{ fontSize: '0.6875rem', color: '#78665D' }}>
              {t('arrivals.via', { place: routeName(arrival.lane) })}
            </span>
          ) : null}
          {arrival.novel ? (
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#B03A2E' }}>
              {t('arrivals.novel')}
            </span>
          ) : null}
          {arrival.remembered ? (
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#1F6F8B' }}>
              {t('arrivals.remembered')}
            </span>
          ) : null}
          {family !== '' && !arrival.novel ? (
            <span style={{ fontSize: '0.6875rem', color: '#2F6B4A' }}>
              {t('arrivals.beatenBy', { family })}
            </span>
          ) : null}
          {!arrival.novel && onCard ? (
            <span
              data-arrival-card={arrival.disease}
              role="button"
              tabIndex={0}
              aria-label={t('card.about', { name: arrival.disease })}
              style={{
                color: '#8E6E53',
                marginTop: 'auto',
                // A CONTROL IS 44 (Gate 1): the icon alone measured 26 x 26 on the audit's first
                // run of this piece, which is what the touch check is for.
                minWidth: 44,
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onCard(arrival);
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.stopPropagation();
                onCard(arrival);
              }}
            >
              <CardIcon />
            </span>
          ) : null}
        </>
      ) : (
        <>
          <img
            src={`/art/path-${arrival.novel ? 'hidden' : arrival.type}@3x.webp`}
            width={40}
            height={40}
            alt=""
            style={{ flex: '0 0 auto' }}
          />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#2E2A28',
              overflowWrap: 'anywhere',
            }}
          >
            {name}
          </span>
          {family !== '' && !arrival.novel ? (
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#B03A2E' }}>
              {family}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}

/** The play area in the arrivals stage: this draw's cards, three to a row at phone width. */
export function ArrivalsGrid({
  arrivals,
  onCard,
}: {
  arrivals: readonly RevealArrival[];
  onCard?: (a: RevealArrival) => void;
}): ReactElement {
  return (
    <div
      data-arrivals-grid={String(arrivals.length)}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        // A CARD KEEPS A CARD'S SHAPE: three to a row, fewer when the draw is smaller, each
        // column and row capped so one arrival does not stretch into a poster. The play area's
        // height is fixed, so a draw with more cards than fit scrolls inside the grid.
        gridTemplateColumns: `repeat(${String(Math.min(3, Math.max(1, arrivals.length)))}, minmax(0, 7.5rem))`,
        gridAutoRows: 'minmax(0, 9rem)',
        justifyContent: 'center',
        alignContent: 'center',
        gap: 6,
        overflowY: 'auto',
      }}
    >
      {arrivals.map((a, i) => (
        <ArrivalCard key={[a.disease, String(i)].join('-')} arrival={a} onCard={onCard} />
      ))}
    </div>
  );
}

/**
 * The middle in the arrivals stage: the turn's event, then what the spread did — the burst's own
 * narration lines, which is what the player has just watched, kept so it can be read at rest.
 */
export function ArrivalsNotes({
  crisis,
  spread,
}: {
  crisis: RevealCrisis | null;
  spread: readonly string[];
}): ReactElement {
  return (
    <div data-middle-view="arrivals" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {crisis ? (
        <div
          data-reveal-crisis={crisis.name}
          style={{
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
          <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{crisis.name}</div>
          {crisis.why !== null ? (
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
      {spread.length > 0 ? (
        <div data-spread-summary={String(spread.length)}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78665D' }}>
            {t('arrivals.spreadTitle')}
          </div>
          {spread.map((line, i) => (
            <div key={String(i)} style={{ fontSize: '0.8125rem', color: '#2E2A28' }}>
              {line}
            </div>
          ))}
        </div>
      ) : null}
      <div style={{ fontSize: '0.75rem', color: '#78665D' }}>{t('arrivals.flipHint')}</div>
    </div>
  );
}
