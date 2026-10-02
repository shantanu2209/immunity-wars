/**
 * WHAT THE PLAY SCREEN'S PANELS ARE SAID IN, on a card or a sheet of the kit's cream (stage L4 of
 * docs/LOOK_PLAN.md, §14). One place, so that every panel's quiet line is the same quiet and every
 * warning the same warning, and so that each is a pairing the kit's own test holds to 4.5:1
 * (`kit/contrast.ts`).
 */
import type { CSSProperties } from 'react';

import { COLOUR, TOUCH, TYPE } from '../kit/tokens';

export const SAY = {
  /** What a panel says. */
  body: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.35, color: COLOUR.ink },
  /** What it says more quietly: a second line, a count, a hint. */
  quiet: { fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.35, color: COLOUR.inkSoft },
  /** The name of a part of a panel. */
  label: { ...TYPE.label, color: COLOUR.inkSoft },
  /** A panel's own heading. */
  heading: { ...TYPE.action, fontWeight: 900, color: COLOUR.ink },
} satisfies Record<string, CSSProperties>;

/** Good news, bad news, and something to note: each dark enough to read on cream. */
export const TONE = { good: COLOUR.mintInk, bad: COLOUR.coralInk, note: COLOUR.goldInk } as const;

/** A kit button inside a panel: as wide as its word, and Gate 1's 44 px tall. */
export const SMALL: CSSProperties = {
  width: 'auto',
  minHeight: TOUCH.min,
  padding: '0.3em 0.8em',
  fontSize: '0.875rem',
  flex: '0 0 auto',
};

/** A row of a panel: something said, and the buttons for it beside it. */
export const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: TOUCH.min,
  flexWrap: 'wrap',
};

/** A piece's picture at a small size, on its base when it is one of the body's own. */
export const pieceArt = (name: string, size = 3): string => `/art/clay/board/${name}@${size}x.webp`;
