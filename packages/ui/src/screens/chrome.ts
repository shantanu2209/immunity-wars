/**
 * The shared chrome of the four Title slots — How to play, the disease library, Settings and
 * About (docs/APP_FLOW.md §4). One module, because the alternative is what was actually there.
 *
 * WHAT THIS REPLACED, measured 9 September 2026 at the start of P2.7. The four screens were
 * built in sequence over four days with no shared pass, and had drifted: three of the four
 * agreed closely and **About differed on seven axes** — page padding (24px against 32px), the
 * page title's element, size and colour (`h1` 1.5rem accent red against `h2` 1.375rem
 * charcoal), the button size and rhythm (1rem / 16px against 0.9375rem / 10px), and body
 * paragraph spacing (8px against 10px). None of it was visible in a check: every value passed
 * Gate 1 on its own screen, because drift between screens is not a property any one screen has.
 *
 * WHY A MODULE RATHER THAN A CORRECTION. Making About match would have fixed this instance and
 * left the class: a fifth screen drifts on the day it is written, and P2.7 is a sub-phase whose
 * whole shape is "propose, look, react, adjust". With the values in one place a reaction is one
 * line rather than four, which is the difference between iterating and re-editing. It is the
 * P2.6 closeout's lesson one level up: *a pin exists because two things could drift; where the
 * second thing can be removed instead, remove it.*
 *
 * THE THREE BUTTON ROLES ARE REAL, and were preserved rather than flattened. A list row is
 * left-aligned because its text is an item; a control is centred because its text is a verb;
 * the way back is a control that is never the primary action. Collapsing them into one base
 * would have "unified" two things that were correctly different — the failure mode of a
 * consistency pass, and the reason each role is named here rather than spelled inline.
 *
 * WHAT IS NOT HERE. No colour is introduced and none is retired: every value below already
 * appeared in at least one of the four screens. Palette work is out of scope for Phase 2
 * (PHASE2_BRIEF.md §1, "What is explicitly NOT in either gate") and this module is not a
 * back door to it.
 */
import type { CSSProperties } from 'react';

import { FLOAT_RESERVE } from '../nav/NavHost';

/**
 * The page shell. Its top padding is the ONLY space above the title (see TITLE), and its bottom
 * keeps the floating close clear of the last line (docs/for-P2.7.md §9, ruling 8).
 */
export const PAGE: CSSProperties = {
  maxWidth: 420,
  margin: '0 auto',
  padding: `32px 16px ${FLOAT_RESERVE}`,
};

/**
 * The screen's own name, once per screen, at the top.
 *
 * `h1` because each slot is a whole screen rather than a section of one, and three of the four
 * opened at `h2` under no `h1` at all. The margin is explicit BECAUSE of that change: a UA
 * gives `h1` 0.67em and `h2` 0.83em, so leaving it unset would have moved the spacing as a
 * side effect of the element. Setting it to zero also drops ~18px of dead space that used to
 * sit between the wrapper's padding and the title on every one of these screens.
 */
export const TITLE: CSSProperties = { fontSize: '1.375rem', color: '#2E2A28', margin: '0 0 8px' };

/** A quiet line under the title saying what the screen is for. */
export const LEAD: CSSProperties = { fontSize: '0.875rem', color: '#78665D', margin: '0 0 4px' };

/** The label OVER a set of rows. Not a row's own title, and not a heading over prose. */
export const GROUP: CSSProperties = { fontSize: '0.875rem', color: '#78665D', margin: '0 0 4px' };

/**
 * A heading over prose, within a screen. Distinct from GROUP, which labels rows.
 *
 * Only About has these today. Its size is kept — four sections on one scrolling page need to be
 * findable by thumb — and only its colour moved, from the accent red to the charcoal every
 * other heading in the app uses. Red is the app's attention colour, carried by the primary
 * button border and the Title's name; four static section headings are not attention.
 */
export const SECTION: CSSProperties = {
  fontSize: '1.0625rem',
  color: '#2E2A28',
  margin: '22px 0 6px',
};

/**
 * A heading that has to be FINDABLE while scrolling, rather than read in order.
 *
 * The second heading role, and it is deliberately not merged into GROUP. Both label a set of
 * rows, but they answer different questions: GROUP's reader has already stopped and is choosing
 * among four things, ITEM's reader is moving through 106 and needs a landmark. The library is
 * navigable at 106 rows on a phone (Shantanu's S25 pass, 9 September 2026) and a quiet 0.875rem
 * label is exactly what would have taken that away, so the pass that unified these screens
 * stopped here on purpose.
 */
export const ITEM: CSSProperties = { fontSize: '1rem', color: '#2E2A28', margin: 0 };

/** Body prose. */
export const BODY: CSSProperties = {
  fontSize: '0.9375rem',
  lineHeight: 1.45,
  color: '#2E2A28',
  margin: '10px 0',
};

/** A full-width control. Centred, because a control's text is a verb. */
export const BTN: CSSProperties = {
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
};

/** A full-width row in a list. Left-aligned, because its text is an item and not a verb. */
export const ROW_BTN: CSSProperties = { ...BTN, textAlign: 'left' };

/** The way back, last on the page. Never the primary action, so never the primary border. */
export const BACK: CSSProperties = { ...BTN, textAlign: 'center', borderColor: '#C48377' };
