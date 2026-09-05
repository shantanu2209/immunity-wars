/**
 * THE ANATOMICAL LAYOUT DOES NOT TOUCH ITSELF (P2.5 item 12, Shantanu 5 September 2026):
 * "keep it medically correct, but organs must not touch or intersect — if they do, anatomy
 * bends for UX." That is a rule about numbers, so it is a check: every pair of placed icons
 * — the seven organs, the six entry chips, the bloodstream — must be at least ICON_PX apart
 * on one axis plus a visible gap, at the display size the screen draws them (30px, the
 * board's LARGE_PX). A position edit that makes two icons kiss fails here, with names.
 *
 * The control runs the same function on a layout with two coincident icons.
 */
import { describe, expect, it } from 'vitest';

import { ANATOMY_ENTRY, ANATOMY_HUB, ANATOMY_POS } from './index.js';

const ICON_PX = 30;
const GAP_PX = 2;

interface Pt {
  x: number;
  y: number;
}

/** The pairs that touch or overlap at ICON_PX, named. */
export function touchingPairs(placed: Record<string, Pt>): string[] {
  const keys = Object.keys(placed);
  const out: string[] = [];
  for (let i = 0; i < keys.length; i += 1) {
    for (let j = i + 1; j < keys.length; j += 1) {
      const a = placed[keys[i] ?? ''];
      const b = placed[keys[j] ?? ''];
      if (!a || !b) continue;
      const apart = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
      if (apart < ICON_PX + GAP_PX) out.push(`${keys[i]}–${keys[j]} (${apart}px apart)`);
    }
  }
  return out;
}

const placed: Record<string, Pt> = {
  ...(ANATOMY_POS as Record<string, Pt>),
  ...Object.fromEntries(
    Object.entries(ANATOMY_ENTRY as Record<string, Pt>).map(([r, p]) => [`entry:${r}`, p]),
  ),
  bloodstream: ANATOMY_HUB as Pt,
};

describe('the anatomical layout at 30px icons', () => {
  it('places fourteen things', () => {
    expect(Object.keys(placed).length).toBe(14);
  });

  it('no two placed icons touch or overlap', () => {
    expect(touchingPairs(placed)).toEqual([]);
  });

  it('control: two coincident icons are reported by name', () => {
    const bad = { ...placed, marrow: { ...(placed['kidneys'] as Pt) } };
    expect(touchingPairs(bad)).toEqual(['kidneys–marrow (0px apart)']);
  });
});
