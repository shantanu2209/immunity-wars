/**
 * THE ARRIVALS STAGE — piece 6 of the play screen (docs/for-P2.7.md §20, item 7 of 19 September).
 *
 * What was a dialog over the game becomes a stage of the frame, in the same format as planning and
 * command: the play area holds this draw's cards, the middle says what the spread did and what the
 * turn's event was, and the one button at the bottom begins planning.
 *
 * THE CARDS ARE DRAWN FROM DATA, not from the printed card's artwork: the piece that stands for it
 * on the board, the disease's name, and its antibody class. So a disease added to the content pack
 * has a front the moment it has a row, and the physical deck and the app cannot drift apart — the
 * parity rule in CLAUDE.md, applied to a card.
 *
 * DRAWN IN CLAY (stage L5 of docs/LOOK_PLAN.md). A card is a slab of the kit's cream standing on
 * the table, with the piece as a card shows it: seen at an angle, in the colour of its antigen
 * class. So the picture on a new card is the picture that then walks the board. A pathogen new to
 * the body is the pale unknown piece and says so; its class is not shown, because it has none yet.
 * The cards are dealt: each arrives a moment after the one before, with the kit's arrival.
 *
 * A tap flips one card to its back: where it came in, whether it is novel or remembered, and the
 * class that neutralises it, with the card icon opening the full pathogen card. A second tap flips
 * it back. The back is a SUMMARY, not the full card: the full card is a window of its own and does
 * not fit a tile, and item 11 of the same message forbids an intermediate level that says nothing —
 * so the icon goes straight to the card from either face.
 */
import { FAMILIES, FAMILY, ROUTES } from '@immunity-wars/content';

import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';

import { classOf, pieceFor } from '../board/clay';
import type { RevealArrival, RevealCrisis } from '../dialogs/RevealBody';
import { t } from '../i18n';
import { play } from '../kit/motion';
import { kitCardStyle } from '../kit/Surface';
import { COLOUR, RADIUS, TOUCH, TYPE } from '../kit/tokens';
import { CardIcon } from '../panels/CardIcon';
import { RichText } from '../panels/LogPanel';
import { SAY, TONE } from '../panels/onCard';

/** How long after the card before it each card is dealt. */
const DEAL_GAP_MS = 110;

const CARD: CSSProperties = {
  ...kitCardStyle,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 2,
  minHeight: TOUCH.min,
  padding: '6px 6px 8px',
  borderRadius: RADIUS.control,
  border: 0,
  boxShadow: `0 4px 0 ${COLOUR.creamEdge}, 0 8px 14px rgba(0, 0, 0, 0.3)`,
  cursor: 'pointer',
  textAlign: 'center',
  overflow: 'hidden',
};
const NAME: CSSProperties = {
  ...TYPE.action,
  fontSize: '0.875rem',
  fontWeight: 900,
  color: COLOUR.ink,
  overflowWrap: 'anywhere',
};
const SMALL: CSSProperties = { ...SAY.quiet, fontSize: '0.75rem', lineHeight: 1.25 };

/** A route's player-facing name, as the reveal said it. */
const routeName = (lane: string): string => {
  const r = (ROUTES as Record<string, { name?: unknown }>)[lane];
  return typeof r?.name === 'string' ? r.name : lane;
};

const familyOf = (disease: string): string =>
  String((FAMILY as Record<string, string | undefined>)[disease] ?? '');

/** A class's own colour, the content pack's: the one its pieces wear. */
const classColour = (family: string): string | null =>
  (FAMILIES as Record<string, { col?: string } | undefined>)[family]?.col ?? null;

/** One card, front or back; the whole tile is the button that flips it. */
function ArrivalCard({
  arrival,
  index,
  onCard,
}: {
  arrival: RevealArrival;
  /** Its place in the deal: later cards arrive later. */
  index: number;
  onCard: ((a: RevealArrival) => void) | undefined;
}): ReactElement {
  const [back, setBack] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);
  // Dealt once, when it is first shown. A card is drawn where it belongs and the arrival is only
  // how it got there, so a phone that asks for less motion, or a deal cut short, leaves it right.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const timer = window.setTimeout(() => play(el, 'arrive'), index * DEAL_GAP_MS);
    return () => window.clearTimeout(timer);
  }, [index]);
  const family = familyOf(arrival.disease);
  const name = arrival.novel ? t('inspect.unknown') : arrival.disease;
  const { piece } = pieceFor(arrival.type, classOf(arrival.disease, arrival.novel), false);
  const colour = classColour(family);
  return (
    <button
      ref={ref}
      type="button"
      data-arrival={arrival.disease}
      data-arrival-face={back ? 'back' : 'front'}
      style={CARD}
      onClick={() => setBack((b) => !b)}
    >
      {back ? (
        <>
          <span style={NAME}>{name}</span>
          {arrival.lane !== null ? (
            <span style={SMALL}>{t('arrivals.via', { place: routeName(arrival.lane) })}</span>
          ) : null}
          {arrival.novel ? (
            <span style={{ ...SMALL, fontWeight: 800, color: TONE.bad }}>
              {t('arrivals.novel')}
            </span>
          ) : null}
          {arrival.remembered ? (
            <span style={{ ...SMALL, fontWeight: 800, color: TONE.good }}>
              {t('arrivals.remembered')}
            </span>
          ) : null}
          {family !== '' && !arrival.novel ? (
            <span style={{ ...SMALL, color: TONE.good }}>{t('arrivals.beatenBy', { family })}</span>
          ) : null}
          {!arrival.novel && onCard ? (
            <span
              data-arrival-card={arrival.disease}
              role="button"
              tabIndex={0}
              aria-label={t('card.about', { name: arrival.disease })}
              style={{
                color: COLOUR.ink,
                marginTop: 'auto',
                // A CONTROL IS 44 (Gate 1): the icon alone measured 26 x 26 on the audit's first
                // run of this piece, which is what the touch check is for.
                minWidth: TOUCH.min,
                minHeight: TOUCH.min,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: RADIUS.control,
                background: COLOUR.creamSunk,
                boxShadow: `0 3px 0 ${COLOUR.creamSunkEdge}`,
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
            src={`/art/clay/card/${piece}@2x.webp`}
            alt=""
            style={{ flex: '0 1 auto', width: '78%', maxWidth: 96, aspectRatio: '1', minHeight: 0 }}
          />
          <span style={NAME}>{name}</span>
          {family !== '' && !arrival.novel ? (
            // The class by its code, with its colour as a dot beside it: the code carries the
            // meaning, the dot is the colour its piece wears.
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.75rem',
                fontWeight: 900,
                color: COLOUR.ink,
              }}
            >
              {colour !== null ? (
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: colour,
                    boxShadow: `0 0 0 1.5px ${COLOUR.ink}`,
                  }}
                />
              ) : null}
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
        gridAutoRows: 'minmax(0, 10rem)',
        justifyContent: 'center',
        alignContent: 'center',
        gap: 10,
        padding: 6,
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      {arrivals.map((a, i) => (
        <ArrivalCard key={[a.disease, String(i)].join('-')} arrival={a} index={i} onCard={onCard} />
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
        // The turn's event: good news on the kit's mint ground, bad news behind a coral bar. Each
        // says which it is in words; the colour repeats it.
        <div
          data-reveal-crisis={crisis.name}
          style={{
            padding: '6px 10px',
            borderRadius: 12,
            ...(crisis.bad
              ? { background: COLOUR.creamSunk, borderLeft: `6px solid ${COLOUR.coral}` }
              : { background: COLOUR.mintSoft }),
            color: crisis.bad ? COLOUR.ink : COLOUR.mintInk,
          }}
        >
          <div style={{ ...SAY.label, color: crisis.bad ? TONE.bad : COLOUR.mintInk }}>
            {t(crisis.bad ? 'reveal.crisisBad' : 'reveal.crisisGood')}
          </div>
          <div style={{ ...SAY.heading, color: 'inherit' }}>{crisis.name}</div>
          {crisis.why !== null ? (
            <div style={{ ...SAY.body, color: 'inherit' }}>
              <RichText text={crisis.why} />
            </div>
          ) : null}
          {crisis.effects.map((e, i) => (
            <div key={String(i)} style={{ ...SAY.body, fontWeight: 800, color: 'inherit' }}>
              {e}
            </div>
          ))}
        </div>
      ) : null}
      {spread.length > 0 ? (
        <div data-spread-summary={String(spread.length)}>
          <div style={SAY.label}>{t('arrivals.spreadTitle')}</div>
          {spread.map((line, i) => (
            <div key={String(i)} style={SAY.body}>
              {line}
            </div>
          ))}
        </div>
      ) : null}
      <div style={SAY.quiet}>{t('arrivals.flipHint')}</div>
    </div>
  );
}
