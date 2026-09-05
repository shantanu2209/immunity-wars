/**
 * S25 ITEM 8 — the hub is laid out as VARIANT B (ruled 20 Aug 2026): invader type-tokens
 * clustered at the centre, cells ringed at the inner edge; every token at a distinct position,
 * the ring inside the hub's inner circle, and no cell on top of the cluster. Elsewhere the fan
 * stands. Pure model, no rendering.
 */
import { describe, expect, it } from 'vitest';

import { tokenLayout, type NodeModel, type DisplayToken } from './Board.js';
import { HUB_POS } from './geometry.js';

const cellTok = (ck: string, pos: { x: number; y: number }): DisplayToken => ({
  key: `cell-${ck}`,
  label: ck,
  kind: 'cell',
  pos,
  cell: ck,
  art: `cell-${ck}`,
  count: 1,
});
const ivTok = (ty: string, pos: { x: number; y: number }, n: number): DisplayToken => ({
  key: `ivg-${ty}`,
  label: ty,
  kind: 'invader',
  pos,
  art: `path-${ty}`,
  count: n,
  ids: Array.from({ length: n }, (_, i) => `${ty}${String(i)}`),
});
const node = (pos: { x: number; y: number }, display: DisplayToken[]): NodeModel => ({
  pos,
  display,
  inspect: { x: pos.x, y: pos.y, cells: [], unavailable: {}, resident: null, invaders: [] },
});

describe('the hub: Variant B', () => {
  const cells = ['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil'];
  const hub = node(HUB_POS, [
    ...['virus', 'bacteria', 'toxin', 'worm'].map((ty) => ivTok(ty, HUB_POS, 3)),
    ...cells.map((ck) => cellTok(ck, HUB_POS)),
  ]);
  const layout = hub.display.map((_, i) => tokenLayout(hub, i));

  it('every token has its own position', () => {
    const keys = new Set(layout.map((l) => `${l.pos.x.toFixed(1)}:${l.pos.y.toFixed(1)}`));
    expect(keys.size).toBe(hub.display.length);
  });

  it('cells ring the inner edge, inside the inner circle; invaders cluster at the centre', () => {
    const d = (p: { x: number; y: number }): number => Math.hypot(p.x - HUB_POS.x, p.y - HUB_POS.y);
    hub.display.forEach((t, i) => {
      const l = layout[i];
      if (!l) throw new Error('missing layout');
      if (t.kind === 'cell') {
        expect(d(l.pos)).toBeCloseTo(38, 5);
        expect(d(l.pos) + l.size / 2).toBeLessThanOrEqual(50.3 + 0.5); // inside the outer hub ring
      } else {
        expect(d(l.pos)).toBeLessThan(20);
      }
    });
    // Cells are smaller than the cluster tokens, which are smaller than an ordinary token.
    const cellSize = layout[4]?.size ?? 0;
    const ivSize = layout[0]?.size ?? 0;
    expect(cellSize).toBeLessThan(ivSize);
    expect(ivSize).toBeLessThan(36.7);
  });

  it('a lone cell at the hub still sits on the ring, and off the hub the fan stands', () => {
    const one = node(HUB_POS, [cellTok('macrophage', HUB_POS)]);
    expect(
      Math.hypot(tokenLayout(one, 0).pos.x - HUB_POS.x, tokenLayout(one, 0).pos.y - HUB_POS.y),
    ).toBeCloseTo(38, 5);
    const elsewhere = { x: HUB_POS.x + 100, y: HUB_POS.y };
    const n = node(elsewhere, [cellTok('nk', elsewhere), ivTok('virus', elsewhere, 1)]);
    expect(tokenLayout(n, 0).size).toBe(36.7);
    expect(tokenLayout(n, 0).pos.x).toBeLessThan(tokenLayout(n, 1).pos.x);
  });
});
