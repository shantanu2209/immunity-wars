/**
 * The rectangle the guide rings (`box.ts`), on the numbers the Gate 1 audit met on 2 October 2026:
 * a 360 by 780 screen with the text at 200%, the Tag row at 18,535 and 154 by 116, the middle that
 * holds it ending at 616, and the Antibodies tile below at 81,622 and 133 by 58.
 */
import { describe, expect, it } from 'vitest';

import { kitButtonStyle } from '../kit/Button';

import {
  LIT_PAD,
  RING_GAP,
  cutBy,
  dimPath,
  edgeBelow,
  litBox,
  ringBox,
  seenPart,
  type Box,
  type Rect,
} from './box';

const SCREEN = { width: 360, height: 780 };
const rect = (left: number, top: number, width: number, height: number): Rect => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});
const holds = (b: Box, x: number, y: number): boolean =>
  x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height;
const centre = (r: Rect): [number, number] => [(r.left + r.right) / 2, (r.top + r.bottom) / 2];

const ROW = rect(18, 535, 154, 116);
const MIDDLE = rect(8, 450, 344, 166);
const TILE = rect(81, 622, 133, 58);

describe('the light goes round what can be seen of the control', () => {
  it('a row cut off by the part that scrolls is ringed only where it is seen', () => {
    const b = litBox(ROW, [MIDDLE], SCREEN);
    const seen = seenPart(ROW, [MIDDLE]);
    expect(seen).toEqual({ left: 18, top: 535, right: 172, bottom: 616 });
    // The middle of what is seen of the row is under the light, and the tile below is not.
    if (!holds(b, ...centre(seen ?? ROW)))
      throw new Error('THE LIGHT IS NOT OVER THE ROW IT LIGHTS');
    if (holds(b, ...centre(TILE)))
      throw new Error(
        'THE LIGHT STANDS OVER A CONTROL IT DOES NOT LIGHT: the tile below the row is under it',
      );
    expect(b.top + b.height).toBeLessThanOrEqual(MIDDLE.bottom + LIT_PAD);
  });

  it('a control that nothing cuts off is ringed whole, with room round it', () => {
    const b = litBox(TILE, [rect(0, 0, 360, 780)], SCREEN);
    expect(b).toEqual({
      left: TILE.left - LIT_PAD,
      top: TILE.top - LIT_PAD,
      width: 133 + LIT_PAD * 2,
      height: 58 + LIT_PAD * 2,
    });
  });

  it('a small control is given a finger’s size, and one at the edge is kept on the screen', () => {
    const b = litBox(rect(350, 770, 8, 8), [], SCREEN);
    expect(b.width).toBe(44);
    expect(b.height).toBe(44);
    expect(b.left + b.width).toBeLessThanOrEqual(SCREEN.width);
    expect(b.top + b.height).toBeLessThanOrEqual(SCREEN.height);
  });

  it('a control of which nothing can be seen is ringed where it is', () => {
    expect(seenPart(ROW, [rect(0, 0, 360, 400)])).toBeNull();
    expect(litBox(ROW, [rect(0, 0, 360, 400)], SCREEN)).toEqual(litBox(ROW, [], SCREEN));
  });

  it('says whether a control is cut off', () => {
    expect(cutBy(ROW, MIDDLE)).toBe(true);
    expect(cutBy(rect(18, 460, 154, 100), MIDDLE)).toBe(false);
  });
});

describe('the ring is drawn tight round the control, and its lip (16 October 2026)', () => {
  it('reads how far a kit button’s lip reaches below it, as written and as the browser says it', () => {
    expect(
      edgeBelow(String(kitButtonStyle('main', 'resting').boxShadow)),
      'THE RING CUTS ACROSS THE BUTTON’S EDGE: the kit button’s lip is not read',
    ).toBeGreaterThan(0);
    expect(
      edgeBelow('rgb(194, 81, 58) 0px 6px 0px 0px, rgba(0, 0, 0, 0.35) 0px 8px 16px 0px'),
    ).toBe(6);
    // A blurred shadow is the button's cast on the table, not the button; an inset one is inside.
    expect(edgeBelow('rgba(0, 0, 0, 0.35) 0px 8px 16px 0px')).toBe(0);
    expect(edgeBelow('inset 0 2px 4px rgba(90, 70, 40, 0.28)')).toBe(0);
    expect(edgeBelow('none')).toBe(0);
  });

  it('rings the button and its lip, and nothing of the table between', () => {
    const button = rect(16, 570, 328, 56);
    const lip = 6;
    const r = ringBox(button, [], edgeBelow('rgb(194, 81, 58) 0px 6px 0px 0px'));
    expect(r.top + r.height, 'THE RING CUTS ACROSS THE BUTTON’S EDGE').toBeGreaterThanOrEqual(
      button.bottom + lip,
    );
    expect(r.left).toBe(button.left - RING_GAP);
    expect(r.top).toBe(button.top - RING_GAP);
    // Tight: no more than the gap between the ring and what it rings.
    expect(r.width).toBe(328 + RING_GAP * 2);
    expect(RING_GAP).toBeLessThan(LIT_PAD);
  });

  it('from a rectangle as the browser hands it over, whose edges are not its own properties', () => {
    // A DOMRect's left, top, right and bottom are getters on its prototype: spread, it is empty.
    class Measured {
      constructor(
        private readonly l: number,
        private readonly t: number,
        private readonly w: number,
        private readonly h: number,
      ) {}
      get left(): number {
        return this.l;
      }
      get top(): number {
        return this.t;
      }
      get right(): number {
        return this.l + this.w;
      }
      get bottom(): number {
        return this.t + this.h;
      }
    }
    const r = ringBox(new Measured(16, 570, 328, 56), [], 6);
    expect(
      [r.left, r.top, r.width, r.height].every((x) => Number.isFinite(x)),
      'THE RING IS AT NO PLACE: the rectangle was read as empty',
    ).toBe(true);
    expect(r).toEqual({
      left: 16 - RING_GAP,
      top: 570 - RING_GAP,
      width: 328 + RING_GAP * 2,
      height: 56 + 6 + RING_GAP * 2,
    });
  });

  it('and, like the light, only where the control can be seen', () => {
    const r = ringBox(ROW, [MIDDLE]);
    expect(r.top + r.height).toBe(MIDDLE.bottom + RING_GAP);
  });
});

describe('the dimming is one shape, with each hole cut in its ring’s rounded shape', () => {
  it('a hole is the ring’s rounded rectangle, and a round control’s hole is round', () => {
    const d = dimPath(360, 641, [
      { box: { left: 10, top: 600, width: 60, height: 30 }, radius: 999 },
    ]);
    // The screen, then the hole: two closed shapes, drawn even-odd.
    expect(d.match(/Z/g)?.length).toBe(2);
    // The corner is clamped to half the shorter side, so a pill's hole is a pill.
    expect(d, 'THE HOLE IS NOT THE RING’S SHAPE').toContain('A15 15 0 0 1');
    expect(dimPath(10, 10, [])).toBe('M0 0H10V10H0Z');
  });
});
