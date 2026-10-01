/**
 * THE CLAY KIT'S NAMED VALUES — stage L3 of docs/LOOK_PLAN.md (§13). One place for every colour,
 * size, radius, shadow and duration the new screens use, for the reason `screens/chrome.ts` gives:
 * with the values in one place a reaction is one line, and a screen written later cannot drift.
 *
 * NOTHING HERE IS USED BY THE SCREENS THE APP SHIPS TODAY. They are replaced at L4 and L5; until
 * then these values are seen only on the kit page.
 *
 * COLOUR IS HELD TO NUMBERS. `contrast.ts` lists every pairing of these colours that carries text
 * or marks a control, and `tokens.test.ts` requires each to reach the bound Gate 1 keeps (4.5:1
 * for text, 3:1 for large text and for a control against what surrounds it). A colour changed
 * here is re-measured by that test, not by eye.
 *
 * TWO COLOURS ARE NOT CHOSEN HERE. The board and the well are what Blender's materials look like
 * once lit, measured from the renders by the art pipeline (tools/art-pipeline/clay.ts); they are
 * written down below so the page round the board can match it, and `tokens.test.ts` requires
 * them to agree with the pipeline's manifest.
 */
export const COLOUR = {
  /** The table the board lies on: the page's own ground. */
  table: '#0E2A30',
  tableLit: '#1A4850',
  /** The board and the wells, as measured from the renders. */
  board: '#1c484d',
  well: '#193033',

  /** Controls and cards: clay the colour of cream. */
  cream: '#F4E8D2',
  creamLit: '#FBF2E0',
  creamEdge: '#D9C7A8',
  /** A control that is resting but not the one to press. */
  creamSunk: '#E9DAC0',
  /** Dark enough to mark the button's shape on a card by itself (3:1), not only by its word. */
  creamSunkEdge: '#8C7752',

  /** Words on cream, and the quieter words beside them. */
  ink: '#2C2233',
  inkSoft: '#65545F',
  /** Words on the table, and the quieter words beside them. */
  onDark: '#F4E8D2',
  onDarkSoft: '#9FC0C2',

  /** The bloodstream, and the one button that ends the turn. */
  coral: '#E8674A',
  coralLit: '#F58A6E',
  coralEdge: '#B5452D',
  /** A warning in words, on cream: coral dark enough to read. */
  coralInk: '#9E3A22',
  /** What is healthy, and what is allowed. */
  mint: '#3FD6B4',
  mintLit: '#6FE9CB',
  mintEdge: '#17806A',
  mintInk: '#06382E',
  /** The ground of a piece of advice on a card. */
  mintSoft: '#CFF3E7',
  /** Action Points and antibodies. */
  gold: '#E7B549',
  goldEdge: '#8F640B',
  /** A legal move, glowing. */
  glow: '#FFE08A',
  /** The lymph: its nodes on the board, and a hop along it. */
  lymph: '#8FD3E8',
} as const;

/** Sizes in rem, so the phone's own text size scales every one of them. 1rem is 16px at rest. */
export const TYPE = {
  family: 'Nunito, system-ui, sans-serif',
  /** The title of the game. */
  display: {
    fontSize: '2.5rem',
    fontWeight: 900,
    lineHeight: 1.08,
    letterSpacing: '-0.01em',
    overflowWrap: 'anywhere',
  },
  /** A card's or a screen's name. */
  title: { fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.1, overflowWrap: 'anywhere' },
  /** The name of the piece in hand. */
  heading: { fontSize: '1.25rem', fontWeight: 900, lineHeight: 1.15 },
  /** A button's word. */
  action: { fontSize: '1rem', fontWeight: 800, lineHeight: 1.2 },
  /** A sentence to read. */
  body: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.4 },
  /** A small label in capitals: never smaller than this. */
  label: {
    fontSize: '0.75rem',
    fontWeight: 800,
    lineHeight: 1.2,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
} as const;

/** The smallest a control may be, in px, in either direction (Gate 1: 44). The kit uses 48. */
export const TOUCH = { min: 44, control: 48, primary: 56 } as const;

export const RADIUS = { control: 16, primary: 20, card: 24, sheet: 28, pill: 999 } as const;

/**
 * Clay has thickness: a control stands on a darker edge of itself, and sinks onto it when pressed.
 * `stand` is how far, in px.
 */
export const DEPTH = { stand: 5, standPrimary: 6, pressed: 1 } as const;

export const SHADOW = {
  /** Under anything that stands on the table. */
  cast: '0 14px 22px rgba(0, 0, 0, 0.36)',
  /** Inside a well or a pill pressed into the table. */
  sunk: 'inset 0 2px 5px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(255, 255, 255, 0.08)',
} as const;

/**
 * Motion, in milliseconds, with the curve each uses. The play screen and the kit page read these;
 * the L2 measurement was taken with the same figures (tools/look-prototype/src/timeline.ts).
 */
export const MOTION = {
  /** A control answering a finger. Under a tenth of a second (plan §3, rule 2). */
  press: { ms: 90, curve: 'cubic-bezier(0.2, 0, 0, 1)' },
  /** A piece crossing one space. */
  move: { ms: 450, curve: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  /** A piece arriving, with a small overshoot. */
  arrive: { ms: 320, curve: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  /** A piece leaving. */
  leave: { ms: 400, curve: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  /** The camera moving in or back out. */
  camera: { ms: 500, curve: 'cubic-bezier(0.65, 0, 0.35, 1)' },
} as const;
