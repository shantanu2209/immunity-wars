/**
 * THE BODY IN PLANNING HOLDS EVERY PLACE THE CONTENT PACK PUTS ON IT (stage L5).
 *
 * The figure's outline is drawn in code (`BODY_OUTLINE`), and the places hung on it, the seven
 * organs, the six ways in and the bloodstream, are the content pack's (`board/anatomy.json`). The
 * outline was drawn round those places by hand, so nothing but this test says they still agree: a
 * place moved in the content pack, or an outline redrawn, could leave an organ's coin floating
 * beside the body, and every other check would pass.
 *
 * The outline is flattened to a polygon here (its curves sampled), and each place must lie inside
 * it with room for its coin. Control: pnpm ci:selftest body-outline-holds-every-place.
 */
import { ANATOMY_ENTRY, ANATOMY_HUB, ANATOMY_POS, FRAME } from '@immunity-wars/content';
import { describe, expect, it } from 'vitest';

import { BODY_OUTLINE } from './AnatomyView';

interface Pt {
  x: number;
  y: number;
}

/** The outline's own commands (M, L, C, Q, Z, absolute), sampled into a closed polygon. */
function flatten(d: string): Pt[] {
  const out: Pt[] = [];
  let at: Pt = { x: 0, y: 0 };
  for (const m of d.matchAll(/([MLCQZ])([^MLCQZ]*)/g)) {
    const n = (m[2] ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const p = (i: number): Pt => ({ x: n[i] ?? 0, y: n[i + 1] ?? 0 });
    const cmd = m[1];
    if (cmd === 'M' || cmd === 'L') {
      at = p(0);
      out.push(at);
    } else if (cmd === 'C') {
      const [a, b, c, e] = [at, p(0), p(2), p(4)];
      for (let k = 1; k <= 12; k += 1) {
        const t = k / 12;
        const u = 1 - t;
        out.push({
          x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * e.x,
          y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * e.y,
        });
      }
      at = e;
    } else if (cmd === 'Q') {
      const [a, b, e] = [at, p(0), p(2)];
      for (let k = 1; k <= 8; k += 1) {
        const t = k / 8;
        const u = 1 - t;
        out.push({
          x: u * u * a.x + 2 * u * t * b.x + t * t * e.x,
          y: u * u * a.y + 2 * u * t * b.y + t * t * e.y,
        });
      }
      at = e;
    }
  }
  return out;
}

function inside(poly: readonly Pt[], q: Pt): boolean {
  let within = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i];
    const b = poly[j];
    if (!a || !b) continue;
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x)
      within = !within;
  }
  return within;
}

/** The nearest the outline comes to a point. */
function clearance(poly: readonly Pt[], q: Pt): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i];
    const b = poly[j];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = dx * dx + dy * dy;
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / len));
    best = Math.min(best, Math.hypot(q.x - (a.x + t * dx), q.y - (a.y + t * dy)));
  }
  return best;
}

const places: [string, Pt][] = [
  ...Object.entries(ANATOMY_POS as Record<string, Pt>).map(([k, p]): [string, Pt] => [k, p]),
  ...Object.entries(ANATOMY_ENTRY as Record<string, Pt>).map(([k, p]): [string, Pt] => [
    `the way in: ${k}`,
    p,
  ]),
  ['the bloodstream', ANATOMY_HUB as Pt],
];

describe('the body in planning', () => {
  const poly = flatten(BODY_OUTLINE);
  const frame = FRAME as { w: number; h: number };

  it('is an outline that was read: a closed shape inside its frame', () => {
    expect(poly.length).toBeGreaterThan(100);
    for (const p of poly) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(frame.w);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(frame.h);
    }
  });

  it('reads every place the content pack names: seven organs, six ways in, the bloodstream', () => {
    expect(places.length).toBe(14);
  });

  it('holds every place inside it, with room for most of its coin', () => {
    // A coin is 24 to 30 units across. Its centre must be inside and 8 units clear of the edge: an
    // arm is about 30 wide, so a way in on an arm stands close to the edge and still on the body.
    const outside = places
      .filter(([, p]) => !inside(poly, p) || clearance(poly, p) < 8)
      .map(
        ([name, p]) =>
          `A PLACE IS NOT ON THE BODY: ${name} at ${String(p.x)}, ${String(p.y)} is ${inside(poly, p) ? `${clearance(poly, p).toFixed(1)} units from the outline` : 'outside it'}`,
      );
    expect(outside).toEqual([]);
  });

  it('is symmetric about its middle, as a body seen from the front is', () => {
    const mid = frame.w / 2;
    const lop = poly.filter(
      (p) =>
        !inside(poly, { x: 2 * mid - p.x, y: p.y }) &&
        clearance(poly, { x: 2 * mid - p.x, y: p.y }) > 1.5,
    );
    expect(lop.length, 'points of the outline whose mirror image is off it').toBe(0);
  });
});
