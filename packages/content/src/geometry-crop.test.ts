/**
 * S25 ITEM 11 — the generator's crop and label sides are consistent with the positions it
 * emitted. The rule (ruled 4 September 2026): labels BELOW the icon where the annotation's
 * ray is more horizontal than vertical (the board's left and right), to the RIGHT where it is
 * more vertical (top and bottom); the viewBox is the canvas cropped to the annotations plus a
 * margin — inside the canvas, containing every annotation anchor, and smaller than the canvas.
 * Positions stay in the 660-unit canvas: only the visible window tightens.
 */
import { describe, expect, it } from 'vitest';

import { CHIP_POS, ENTRY, HUB, LABEL_SIDE, ORGAN_POS, VH, VIEWBOX, VW } from './index.js';

describe('geometry: the label sides and the crop', () => {
  const hub = HUB as { x: number; y: number };
  const anchors: Record<string, { x: number; y: number }> = {
    ...(ORGAN_POS as Record<string, { x: number; y: number }>),
    ...(ENTRY as Record<string, { x: number; y: number }>),
  };

  it('every organ and route has a side, and the side follows the ray', () => {
    for (const [k, p] of Object.entries(anchors)) {
      const dx = p.x - hub.x;
      const dy = p.y - hub.y;
      const expected = Math.abs(dx) > Math.abs(dy) ? 'below' : 'right';
      expect(LABEL_SIDE[k], `${k}`).toBe(expected);
    }
    expect(Object.keys(LABEL_SIDE).sort()).toEqual(Object.keys(anchors).sort());
  });

  it('the crop is inside the canvas, smaller than it, and contains every annotation anchor', () => {
    const c = VIEWBOX;
    expect(c.x).toBeGreaterThanOrEqual(0);
    expect(c.y).toBeGreaterThanOrEqual(0);
    expect(c.x + c.w).toBeLessThanOrEqual(VW);
    expect(c.y + c.h).toBeLessThanOrEqual(VH);
    expect(c.w).toBeLessThan(VW);
    for (const [k, p] of Object.entries({
      ...anchors,
      ...(CHIP_POS as Record<string, { x: number; y: number }>),
    })) {
      expect(p.x, `${k}.x`).toBeGreaterThanOrEqual(c.x);
      expect(p.x, `${k}.x`).toBeLessThanOrEqual(c.x + c.w);
      expect(p.y, `${k}.y`).toBeGreaterThanOrEqual(c.y);
      expect(p.y, `${k}.y`).toBeLessThanOrEqual(c.y + c.h);
    }
  });
});
