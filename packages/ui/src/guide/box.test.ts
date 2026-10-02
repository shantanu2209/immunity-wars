/**
 * The rectangle the guide rings (`box.ts`), on the numbers the Gate 1 audit met on 2 October 2026:
 * a 360 by 780 screen with the text at 200%, the Tag row at 18,535 and 154 by 116, the middle that
 * holds it ending at 616, and the Antibodies tile below at 81,622 and 133 by 58.
 */
import { describe, expect, it } from 'vitest';

import { LIT_PAD, cutBy, litBox, seenPart, type Box, type Rect } from './box';

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
