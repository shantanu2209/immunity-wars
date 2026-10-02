/**
 * THE CLAY BOARD, AS NUMBERS — stage L4 of docs/LOOK_PLAN.md (§14). Which picture stands for what,
 * and where and how large each thing is drawn. Pure, so it is tested as a model before it is
 * trusted on a phone; `ClayBoard.tsx` draws what this says and decides nothing.
 *
 * It imports nothing of the board's model, which imports THIS to name a piece's picture. How the
 * pieces on one step share it needs the model's types, and so lives beside this, in
 * `clayLayout.ts`: the two files would otherwise import each other in a circle.
 *
 * WHERE THINGS ARE still comes from `geometry.json`, through `./geometry`: nothing here is a
 * position. What is here is how the Clay pictures are laid over those positions.
 *
 * THREE NUMBERS ARE SHARED WITH BLENDER. The board's picture is rendered by
 * `tools/art-pipeline/clay/board.py` with a margin round the content pack's VIEWBOX, with each way
 * in's lane running on past its ENTRY point, and with a bloodstream of a certain size. The page
 * must lay its own pictures out with the same three, or pieces stand beside their steps.
 * `clay.test.ts` reads that script and holds the two together.
 */
import { CHIP_POS, FAMILY, NOVEL_ANTIGENS, VIEWBOX as CROP } from '@immunity-wars/content';

import { HUB_POS, entryOf, type Pt } from './geometry';

/** Board units of margin round the content pack's VIEWBOX. `PAD` in clay/board.py. */
export const CLAY_PAD = 24;
/** How far past its ENTRY point a way in's coin stands. `ENTRY_OUT` in clay/board.py. */
export const ENTRY_OUT = 20;
/** The radius of the bloodstream's dark dish. `HUB_WELL_R` in clay/board.py. */
export const HUB_WELL_R = 47;

/**
 * A piece's picture is a square this many board units wide, with the piece's body 23 units in
 * radius at its centre and its base 27.6 (`PIECE_SPAN`, `PIECE_SCALE` and the base's 1.2 in
 * clay/pieces.py). The rest of the square is room for the shadow.
 */
export const PIECE_SPAN = 90;
export const BODY_R = 23;
export const BASE_R = 27.6;

const crop = CROP as { x: number; y: number; w: number; h: number };
/** The part of the board the picture shows, in board units. */
export const CLAY_VIEW = {
  x: crop.x - CLAY_PAD,
  y: crop.y - CLAY_PAD,
  w: crop.w + CLAY_PAD * 2,
  h: crop.h + CLAY_PAD * 2,
} as const;

/** Where a square of `span` board units centred on `at` lies, as CSS percentages of the board. */
export function place(at: Pt, span: number): { left: string; top: string; width: string } {
  return {
    left: `${((at.x - span / 2 - CLAY_VIEW.x) / CLAY_VIEW.w) * 100}%`,
    top: `${((at.y - span / 2 - CLAY_VIEW.y) / CLAY_VIEW.h) * 100}%`,
    width: `${(span / CLAY_VIEW.w) * 100}%`,
  };
}

/* ---------------------------------------------------------------------------------------------- *
 * WHICH PICTURE
 * ---------------------------------------------------------------------------------------------- */

/** A pathogen whose antigen matches none of the six classes: new to the body. */
export const CLASS_NEW = 'X';

/**
 * The antigen class a piece's COLOUR claims (ruled 1 October 2026: colour says the class, which is
 * what an antibody has to match). Read from the content pack's FAMILY table. A pathogen the game
 * masks, or one content lists as a novel antigen, has none of the six, and is `X`.
 */
export function classOf(disease: string, novel: boolean): string {
  if (novel || NOVEL_ANTIGENS.has(disease)) return CLASS_NEW;
  return (FAMILY as Record<string, string | undefined>)[disease] ?? CLASS_NEW;
}

/** The pictures of what invades, as `pnpm art:clay` builds them. Held to the manifest by the test. */
export const CLAY_INVADERS: ReadonlySet<string> = new Set([
  'virus-ENV',
  'virus-NAK',
  'bacteria-EXB',
  'bacteria-EXB-coated',
  'bacteria-ICB',
  'bacteria-ICB-coated',
  'fungus-EUK',
  'parasite-EUK',
  'parasite-EUK-coated',
  'worm-EUK',
  'worm-EUK-coated',
  'malaria-EUK',
  'hidden-ENV',
  'hidden-NAK',
  'hidden-EUK',
  'toxin-TOX',
  'venom-TOX',
  'unknown',
]);
/** What a group nobody can name is drawn as: the pale piece with the question mark. */
export const CLAY_UNKNOWN = 'unknown';

/**
 * The picture for a group of invaders of one kind and one class.
 *
 * `known` is false when there is no picture for that kind in that class. It is drawn as the
 * unknown piece then, which is at least not a false claim, and the test holds that no disease in
 * the content pack ever gets there.
 */
export function pieceFor(
  type: string,
  cls: string,
  coated: boolean,
): { piece: string; known: boolean; coatDrawn: boolean } {
  if (cls === CLASS_NEW) return { piece: CLAY_UNKNOWN, known: true, coatDrawn: false };
  const plain = `${type}-${cls}`;
  if (coated && CLAY_INVADERS.has(`${plain}-coated`))
    return { piece: `${plain}-coated`, known: true, coatDrawn: true };
  if (CLAY_INVADERS.has(plain)) return { piece: plain, known: true, coatDrawn: false };
  return { piece: CLAY_UNKNOWN, known: false, coatDrawn: false };
}

/* ---------------------------------------------------------------------------------------------- *
 * WHERE THE COINS STAND
 * ---------------------------------------------------------------------------------------------- */

/** An organ's coin: the content pack's own position for it. */
export const organCoin = (organ: string): Pt | null =>
  (CHIP_POS as Record<string, Pt | undefined>)[organ] ?? null;

/** A way in's coin: `ENTRY_OUT` units past its ENTRY point, along the line from the bloodstream. */
export function entryCoin(lane: string): Pt | null {
  const e = entryOf(lane);
  if (!e) return null;
  const dx = e.x - HUB_POS.x;
  const dy = e.y - HUB_POS.y;
  const k = 1 + ENTRY_OUT / (Math.hypot(dx, dy) || 1);
  return { x: HUB_POS.x + dx * k, y: HUB_POS.y + dy * k };
}
