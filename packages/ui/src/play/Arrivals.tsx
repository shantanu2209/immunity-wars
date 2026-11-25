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
 * A TAP OPENS THE FULL CARD (Gate 2's polish, ruled 24 November 2026; docs/LOOK_PLAN.md §33). Until
 * then a tap turned the card over to a back that summarised it, and a second control on the back
 * opened the card: a middle step that said little and cost a tap. What the back carried is on the
 * front now (the route it came in by, and whether the body remembers it) or on the full card (what
 * antibodies do to it, above "Beat it"). A pathogen new to the body has no card and is not a button.
 */
import { DECK_MASTER, FAMILIES, FAMILY } from '@immunity-wars/content';

import { useEffect, useRef, type CSSProperties, type ReactElement, type RefObject } from 'react';

import { classOf, pieceFor } from '../board/clay';
import type { RevealArrival, RevealCrisis } from '../dialogs/RevealBody';
import { t } from '../i18n';
import { play } from '../kit/motion';
import { diseaseDisplayName, localiseEnglishNames, routeDisplayName } from '../names';
import { kitCardStyle } from '../kit/Surface';
import { COLOUR, RADIUS, TOUCH, TYPE } from '../kit/tokens';
import { RichText } from '../panels/LogPanel';
import { SAY, TONE } from '../panels/onCard';
import type { StoryLine } from './spreadStory';

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
  textAlign: 'center',
  overflow: 'hidden',
  font: 'inherit',
};
const NAME: CSSProperties = {
  ...TYPE.action,
  fontSize: '0.875rem',
  fontWeight: 900,
  color: COLOUR.ink,
  overflowWrap: 'anywhere',
};
const SMALL: CSSProperties = { ...SAY.quiet, fontSize: '0.75rem', lineHeight: 1.25 };

const familyOf = (disease: string): string =>
  String((FAMILY as Record<string, string | undefined>)[disease] ?? '');

/** Whether a disease is a parasite that changes its coat: the content pack's own flag. */
export const changesCoat = (disease: string): boolean =>
  (DECK_MASTER as readonly { dz: string; variant?: boolean }[]).some(
    (c) => c.dz === disease && c.variant === true,
  );

/** A class's own colour, the content pack's: the one its pieces wear. */
const classColour = (family: string): string | null =>
  (FAMILIES as Record<string, { col?: string } | undefined>)[family]?.col ?? null;

/** One card. The whole tile is the button that opens the full card; a novel one is not a button. */
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
  const ref = useRef<HTMLElement | null>(null);
  // Dealt once, when it is first shown. A card is drawn where it belongs and the arrival is only
  // how it got there, so a phone that asks for less motion, or a deal cut short, leaves it right.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const timer = window.setTimeout(() => play(el, 'arrive'), index * DEAL_GAP_MS);
    return () => window.clearTimeout(timer);
  }, [index]);
  const family = familyOf(arrival.disease);
  const name = arrival.novel ? t('inspect.unknown') : diseaseDisplayName(arrival.disease);
  const { piece } = pieceFor(arrival.type, classOf(arrival.disease, arrival.novel), false);
  const colour = classColour(family);
  const face = (
    <>
      <img
        src={`/art/clay/card/${piece}@2x.webp`}
        alt=""
        style={{ flex: '0 1 auto', width: '78%', maxWidth: 112, aspectRatio: '1', minHeight: 0 }}
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
      {arrival.lane !== null ? (
        // The route it came in by: what planning is planned against.
        <span style={SMALL}>{t('arrivals.via', { place: routeDisplayName(arrival.lane) })}</span>
      ) : null}
      {arrival.novel ? (
        <span style={{ ...SMALL, fontWeight: 800, color: TONE.bad }}>{t('arrivals.novel')}</span>
      ) : null}
      {arrival.remembered ? (
        // Actionable, so it is a tag on the front: the ring on the board is one tap.
        <span
          data-arrival-remembered=""
          style={{
            ...SMALL,
            fontWeight: 800,
            color: COLOUR.mintInk,
            background: COLOUR.mintSoft,
            borderRadius: RADIUS.control,
            padding: '1px 6px',
          }}
        >
          {t('arrivals.remembered')}
        </span>
      ) : null}
    </>
  );
  if (arrival.novel || !onCard) {
    return (
      <div
        ref={ref as RefObject<HTMLDivElement | null>}
        data-arrival={arrival.disease}
        style={CARD}
      >
        {face}
      </div>
    );
  }
  return (
    <button
      ref={ref as RefObject<HTMLButtonElement | null>}
      type="button"
      data-arrival={arrival.disease}
      data-arrival-card={arrival.disease}
      aria-label={t('card.about', { name: diseaseDisplayName(arrival.disease) })}
      style={{ ...CARD, cursor: 'pointer' }}
      onClick={() => onCard(arrival)}
    >
      {face}
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
  // A CARD KEEPS A CARD'S SHAPE: three to a row, fewer when the draw is smaller, each column and
  // row capped so one arrival does not stretch into a poster. A draw of one or two is given more
  // room than a draw of three (one card had stood 160 px tall in a 340 px play area, 18 October
  // 2026); a draw with more cards than fit scrolls inside the grid.
  const small = arrivals.length <= 2;
  return (
    <div
      data-arrivals-grid={String(arrivals.length)}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${String(Math.min(3, Math.max(1, arrivals.length)))}, minmax(0, ${small ? '9rem' : '7.5rem'}))`,
        gridAutoRows: `minmax(0, ${small ? '12rem' : '10rem'})`,
        justifyContent: 'center',
        alignContent: 'center',
        gap: 10,
        padding: 6,
        boxSizing: 'border-box',
        overflowY: 'auto',
        // DOWN, AND NEVER SIDEWAYS. Left unsaid, a part that scrolls down may scroll sideways too.
        // The cards cannot be wider than their columns, but a card being dealt swells a tenth past
        // its size as it lands, and with two cards at the largest text that reached 2 px past the
        // edge for a moment: the Gate 1 audit read it as a part that scrolls sideways (2 October
        // 2026).
        overflowX: 'hidden',
      }}
    >
      {arrivals.map((a, i) => (
        <ArrivalCard key={[a.disease, String(i)].join('-')} arrival={a} index={i} onCard={onCard} />
      ))}
    </div>
  );
}

/**
 * The middle in the arrivals stage: the turn's event, then what the spread did, which is what the
 * player has just watched, kept so it can be read at rest. Each beat says the rule that made it
 * happen under it (step 3, `spreadStory.ts`), so that what was seen is joined to why.
 */
export function ArrivalsNotes({
  crisis,
  spread,
}: {
  crisis: RevealCrisis | null;
  spread: readonly StoryLine[];
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
          <div style={{ ...SAY.heading, color: 'inherit' }}>
            {localiseEnglishNames(crisis.name)}
          </div>
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
            <div key={String(i)} data-spread-line={line.why ?? ''} style={{ marginTop: 4 }}>
              <div style={{ ...SAY.body, fontWeight: 800 }}>{line.label}</div>
              {line.why !== null ? <div style={SAY.quiet}>{t(line.why)}</div> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
