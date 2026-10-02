/**
 * THE SHARED CHROME OF EVERY SCREEN THAT IS NOT THE PLAY SCREEN, drawn from the kit (stage L5 of
 * docs/LOOK_PLAN.md): the title, the difficulty, playing together and its lobby, the result, How to
 * play, the disease library, Settings, About, and the screen shown after a crash.
 *
 * WHAT IT WAS, and why it is still one module. It was written on 9 September 2026, at the start of
 * P2.7, when four screens built in sequence over four days were found to have drifted on seven
 * axes with every value passing Gate 1 on its own screen: drift between screens is not a property
 * any one screen has. The values went into one place so that a reaction is one line and not four.
 * That reason has not changed; the values have. Every one below is the kit's
 * (`packages/ui/src/kit/tokens.ts`), and none is a colour of this file's own:
 * `play/clayColours.test.ts` fails on the first `#rrggbb` written here or in a screen.
 *
 * THE SHAPE OF A SCREEN.
 *
 *   the table          the page's ground, dark, out to the screen's edges. A screen's own name and
 *                      the line under it are written straight onto it, in cream.
 *   a card             cream clay standing on the table. PROSE GOES ON A CARD: a paragraph in cream
 *                      on the dark table passes its contrast bound and is still tiring to read at
 *                      length, and the help, the library and About are read at length.
 *   a row              a full-width resting button: a list item that opens something. Left-aligned,
 *                      because its text is an item and not a verb.
 *   the main button    coral, and one to a screen: the thing the screen is for.
 *
 * THE THREE BUTTON ROLES ARE STILL REAL (the note of 9 September): a row is left-aligned, a control
 * is centred, and the way back is a control that is never the main one. They are drawn with the
 * kit's button now, so the roles are props and a layout, and what is exported here is the layout.
 */
import type { CSSProperties } from 'react';

import { kitCardStyle } from '../kit/Surface';
import { COLOUR, TYPE } from '../kit/tokens';
import { FLOAT_RESERVE } from '../nav/NavHost';

/**
 * The page shell. Its top padding is the ONLY space above the title (see TITLE), and its bottom
 * keeps the floating close clear of the last line (docs/for-P2.7.md §9, ruling 8).
 */
export const PAGE: CSSProperties = {
  maxWidth: 420,
  margin: '0 auto',
  padding: `20px 8px ${FLOAT_RESERVE}`,
  fontFamily: TYPE.family,
  color: COLOUR.onDark,
};

/** The screen's own name, once per screen, at the top, on the table. */
export const TITLE: CSSProperties = { ...TYPE.title, color: COLOUR.onDark, margin: '0 0 6px' };

/** A quiet line under the title saying what the screen is for. */
export const LEAD: CSSProperties = { ...TYPE.body, color: COLOUR.onDarkSoft, margin: '0 0 6px' };

/** The label OVER a set of rows, on the table. Not a row's own title, and not a heading over prose. */
export const GROUP: CSSProperties = {
  ...TYPE.label,
  color: COLOUR.onDarkSoft,
  margin: '18px 0 2px',
};

/** A card: where prose and a set of settings are read. */
export const CARD: CSSProperties = {
  ...kitCardStyle,
  padding: '0.875em 1em 1em',
  marginTop: 12,
};

/** A heading over prose, on a card. Distinct from GROUP, which labels rows on the table. */
export const SECTION: CSSProperties = { ...TYPE.heading, color: COLOUR.ink, margin: '0 0 4px' };

/**
 * A heading that has to be FINDABLE while scrolling, rather than read in order: the library's, on
 * the table. It is deliberately not merged into GROUP. GROUP's reader has stopped and is choosing
 * among a few things; ITEM's reader is moving through a hundred and needs a landmark.
 */
export const ITEM: CSSProperties = {
  ...TYPE.action,
  fontSize: '1.0625rem',
  color: COLOUR.onDark,
  margin: 0,
};

/** Body prose, on a card. */
export const BODY: CSSProperties = { ...TYPE.body, color: COLOUR.ink, margin: '8px 0' };

/** Quiet prose on a card: a note, a reason, what a row is. */
export const NOTE: CSSProperties = { ...TYPE.body, color: COLOUR.inkSoft, margin: '4px 0 0' };

/** The space a full-width control keeps above itself in a column of them. */
export const STACK: CSSProperties = { marginTop: 12 };

/** A row in a list: the kit's resting button, its words to the left and free to take two lines. */
export const ROW: CSSProperties = {
  ...STACK,
  justifyContent: 'flex-start',
  textAlign: 'left',
};

/** A warning said on the table: a refusal, a lost connection. */
export const WARN: CSSProperties = { ...TYPE.body, color: COLOUR.coralLit, margin: '10px 0 0' };

/** Words on the table that are not the lead: a note, a status. */
export const SAY: CSSProperties = { ...TYPE.body, color: COLOUR.onDark, margin: '10px 0 0' };

/**
 * A box to type in: cream, pressed into the table. It is told from the table by its own colour, so
 * it has no border to measure, and what is typed is the card's ink.
 */
export const FIELD: CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 48,
  marginTop: 6,
  padding: '0.5em 0.75em',
  border: 0,
  borderRadius: 14,
  background: COLOUR.creamLit,
  boxShadow: 'inset 0 2px 5px rgba(90, 70, 40, 0.35)',
  color: COLOUR.ink,
  fontFamily: TYPE.family,
  fontSize: '1.0625rem',
  fontWeight: 700,
  letterSpacing: 'normal',
  textTransform: 'none',
};

/** A modal's scrim: the table, dimmed. A dialog is answered by its own buttons. */
export const SCRIM: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(4, 18, 22, 0.72)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 20,
  padding: 12,
};

/** The card a dialog is. */
export const DIALOG: CSSProperties = {
  ...kitCardStyle,
  width: 'min(100%, 360px)',
  boxSizing: 'border-box',
  padding: '1em',
};
