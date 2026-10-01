/**
 * THE KIT'S COLOUR PAIRINGS, AND THE BOUND EACH IS HELD TO. Gate 1 keeps WCAG 2.1's numbers
 * (ruled 1 October 2026, docs/LOOK_PLAN.md §10): 4.5:1 for text, 3:1 for large text and for a
 * control or a meaningful graphic against what surrounds it.
 *
 * Every pairing the kit's components make is listed here by name. `tokens.test.ts` measures each
 * and fails on the first that falls short, and the kit page prints the same list with the measured
 * ratio beside each swatch, so the number a person reads is the number the test held.
 *
 * "Large" is WCAG's: 24px or more, or 18.66px or more in bold. The kit's `display`, `title` and
 * `heading` sizes are large; `action`, `body` and `label` are not.
 */
import { COLOUR } from './tokens';

export type Bound = 'text' | 'large' | 'control';
export const BOUND: Record<Bound, number> = { text: 4.5, large: 3, control: 3 };

export interface Pair {
  name: string;
  fg: string;
  bg: string;
  bound: Bound;
}

const channel = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m?.[1]) throw new Error(`not a colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const PAIRS: readonly Pair[] = [
  // words on cream: cards, sheets, resting buttons
  { name: 'words on a card', fg: COLOUR.ink, bg: COLOUR.cream, bound: 'text' },
  { name: 'quiet words on a card', fg: COLOUR.inkSoft, bg: COLOUR.cream, bound: 'text' },
  { name: 'words on a resting button', fg: COLOUR.ink, bg: COLOUR.creamSunk, bound: 'text' },
  {
    name: 'quiet words on a resting button',
    fg: COLOUR.inkSoft,
    bg: COLOUR.creamSunk,
    bound: 'text',
  },
  // words on the coloured buttons, measured against the LIGHTER end of each face
  { name: 'words on the main button', fg: COLOUR.ink, bg: COLOUR.coral, bound: 'text' },
  { name: 'words on the main button, lit end', fg: COLOUR.ink, bg: COLOUR.coralLit, bound: 'text' },
  { name: 'words on the go button', fg: COLOUR.mintInk, bg: COLOUR.mint, bound: 'text' },
  {
    name: 'words on the go button, lit end',
    fg: COLOUR.mintInk,
    bg: COLOUR.mintLit,
    bound: 'text',
  },
  { name: 'advice on a card', fg: COLOUR.mintInk, bg: COLOUR.mintSoft, bound: 'text' },
  { name: 'words on a gold chip', fg: COLOUR.ink, bg: COLOUR.gold, bound: 'text' },
  // words on the table
  { name: 'words on the table', fg: COLOUR.onDark, bg: COLOUR.table, bound: 'text' },
  { name: 'words on the table, lit part', fg: COLOUR.onDark, bg: COLOUR.tableLit, bound: 'text' },
  { name: 'quiet words on the table', fg: COLOUR.onDarkSoft, bg: COLOUR.table, bound: 'text' },
  {
    name: 'quiet words on the table, lit part',
    fg: COLOUR.onDarkSoft,
    bg: COLOUR.tableLit,
    bound: 'text',
  },
  { name: 'words on the board', fg: COLOUR.onDark, bg: COLOUR.board, bound: 'text' },
  // a control against what surrounds it
  { name: 'a card on the table', fg: COLOUR.cream, bg: COLOUR.tableLit, bound: 'control' },
  { name: 'the main button on the table', fg: COLOUR.coral, bg: COLOUR.tableLit, bound: 'control' },
  { name: 'the go button on a card', fg: COLOUR.mintEdge, bg: COLOUR.cream, bound: 'control' },
  {
    name: 'a resting button on a card, by its edge',
    fg: COLOUR.creamSunkEdge,
    bg: COLOUR.cream,
    bound: 'control',
  },
  { name: 'a lit Action Point on the table', fg: COLOUR.gold, bg: COLOUR.table, bound: 'control' },
  { name: 'a legal move on the board', fg: COLOUR.glow, bg: COLOUR.board, bound: 'control' },
  { name: 'health on the board', fg: COLOUR.mint, bg: COLOUR.board, bound: 'control' },
  { name: 'the bloodstream on the board', fg: COLOUR.coral, bg: COLOUR.board, bound: 'control' },
  // the play screen's board (stage L4)
  { name: 'worn health on the board', fg: COLOUR.gold, bg: COLOUR.board, bound: 'control' },
  { name: 'failing health on the board', fg: COLOUR.coralLit, bg: COLOUR.board, bound: 'control' },
  {
    name: 'health that is lost, on the board',
    fg: COLOUR.onDarkSoft,
    bg: COLOUR.board,
    bound: 'control',
  },
  {
    name: 'a hop along the lymph on the board',
    fg: COLOUR.lymph,
    bg: COLOUR.board,
    bound: 'control',
  },
  { name: 'an attack on the board', fg: COLOUR.coralLit, bg: COLOUR.board, bound: 'control' },
  {
    name: 'the selected piece on the board',
    fg: COLOUR.onDark,
    bg: COLOUR.board,
    bound: 'control',
  },
  { name: 'a count on a piece', fg: COLOUR.ink, bg: COLOUR.coral, bound: 'text' },
  { name: 'turns until a cell is back', fg: COLOUR.onDark, bg: COLOUR.table, bound: 'text' },
];

export interface Measured extends Pair {
  ratio: number;
  ok: boolean;
}
export function measure(pairs: readonly Pair[] = PAIRS): Measured[] {
  return pairs.map((p) => {
    const ratio = Math.round(contrast(p.fg, p.bg) * 100) / 100;
    return { ...p, ratio, ok: ratio >= BOUND[p.bound] };
  });
}
