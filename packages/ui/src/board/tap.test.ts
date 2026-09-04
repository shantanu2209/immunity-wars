/**
 * The tap resolver, modelled before it is trusted on a phone. Each case is a property the
 * shell relies on; the last two are the negative controls (nothing within radius → null,
 * and the tie-break actually decides rather than falling to array order).
 */
import { describe, expect, it } from 'vitest';

import { TAP_RADIUS_U, resolveTap, type TapCandidate } from './tap.js';

const c = (
  kind: TapCandidate<string>['kind'],
  x: number,
  y: number,
  payload = `${kind}@${x},${y}`,
) => ({ kind, pos: { x, y }, payload }) as TapCandidate<string>;

describe('resolveTap — the one coarse tap path', () => {
  it('nearest candidate wins', () => {
    const hit = resolveTap([c('cell', 100, 100), c('node', 130, 100)], { x: 120, y: 100 });
    expect(hit?.payload).toBe('node@130,100');
  });

  it('a tap within the radius of nothing resolves to null — tap-away, never dead', () => {
    const hit = resolveTap([c('cell', 100, 100)], { x: 100 + TAP_RADIUS_U + 1, y: 100 });
    expect(hit).toBeNull();
  });

  it('exactly at the radius is outside it', () => {
    expect(resolveTap([c('cell', 0, 0)], { x: TAP_RADIUS_U, y: 0 })).toBeNull();
    expect(resolveTap([c('cell', 0, 0)], { x: TAP_RADIUS_U - 1, y: 0 })).not.toBeNull();
  });

  it('on a tie, target beats cell beats node — regardless of array order', () => {
    const p = { x: 50, y: 50 };
    const tgt = c('target', 50, 50);
    const cell = c('cell', 50, 50);
    const node = c('node', 50, 50);
    expect(resolveTap([node, cell, tgt], p)?.kind).toBe('target');
    expect(resolveTap([tgt, cell, node], p)?.kind).toBe('target');
    expect(resolveTap([node, cell], p)?.kind).toBe('cell');
    expect(resolveTap([cell, node], p)?.kind).toBe('cell');
  });

  it('a clearly nearer node beats a farther target — priority is only a tie-break', () => {
    const hit = resolveTap([c('target', 100, 100), c('node', 70, 100)], { x: 72, y: 100 });
    expect(hit?.kind).toBe('node');
  });

  it('cell tokens fanned side by side resolve to the nearer one', () => {
    const hit = resolveTap([c('cell', 87, 100, 'left'), c('cell', 113, 100, 'right')], {
      x: 108,
      y: 100,
    });
    expect(hit?.payload).toBe('right');
  });
});
