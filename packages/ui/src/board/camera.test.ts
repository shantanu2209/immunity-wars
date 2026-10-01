/**
 * THE CAMERA, AS ARITHMETIC (stage L4, docs/LOOK_PLAN.md §14). Held to four things:
 *
 *  1. It never shows what is not board: moved in on an organ at the rim, the part shown is still
 *     inside the picture. Control: camera-keeps-the-board-in-view.
 *  2. What changed is in view once it has moved in.
 *  3. It leaves a plain move alone while the player is choosing, and it stays wide when what
 *     changed is spread across the whole board.
 *  4. The transform it gives is the one that puts things where it says they are seen.
 */
import { describe, expect, it } from 'vitest';

import {
  ZOOM_CHOOSING,
  ZOOM_WATCHING,
  cameraTransform,
  focusFor,
  seenAt,
  type Focus,
} from './camera';
import type { Change, Drawn, Picture } from './changes';
import { CLAY_VIEW, organCoin } from './clay';
import { BOARD_ORGANS, HUB_POS } from './geometry';

const piece = (
  key: string,
  at: { x: number; y: number },
  kind: Drawn['kind'] = 'invader',
): Drawn => ({
  key,
  kind,
  at,
  scale: 1,
  step: at,
  ids: kind === 'invader' ? [key] : [],
  coated: false,
});
const pic = (pieces: Drawn[]): Picture => ({ pieces, organs: {} });
const near = { x: HUB_POS.x + 80, y: HUB_POS.y };
const next = { x: HUB_POS.x + 117, y: HUB_POS.y };

/** The four corners of the picture, as the camera shows them. A corner inside the play area means
 *  something that is not board is in view beside it. */
const showsOnlyBoard = (f: Focus): boolean => {
  const a = seenAt({ x: CLAY_VIEW.x, y: CLAY_VIEW.y }, f);
  const b = seenAt({ x: CLAY_VIEW.x + CLAY_VIEW.w, y: CLAY_VIEW.y + CLAY_VIEW.h }, f);
  const eps = 1e-9;
  return a.x <= eps && a.y <= eps && b.x >= 1 - eps && b.y >= 1 - eps;
};

describe('what the camera moves in on', () => {
  it('nothing changed: it stays wide', () => {
    expect(focusFor([], pic([]), true)).toBeNull();
    expect(focusFor([], pic([]), false)).toBeNull();
  });

  it('while the player is choosing, a piece that only moved is left alone', () => {
    const now = pic([piece('cell-nk', next, 'cell')]);
    const moved: Change[] = [{ kind: 'move', key: 'cell-nk', from: near, stepped: true }];
    expect(focusFor(moved, now, false)).toBeNull();
  });

  it('a swallow is moved in on, gently, while the player is choosing', () => {
    const eater = piece('cell-macrophage', near, 'cell');
    const f = focusFor([{ kind: 'leave', piece: piece('v1', near), eater }], pic([eater]), false);
    expect(f?.zoom).toBeCloseTo(ZOOM_CHOOSING, 5);
  });

  it('while the spread plays, a step taken is moved in on, further', () => {
    const now = pic([piece('v1', next)]);
    const f = focusFor([{ kind: 'move', key: 'v1', from: near, stepped: true }], now, true);
    expect(f?.zoom).toBeCloseTo(ZOOM_WATCHING, 5);
  });

  it('a piece only nudged aside is not something to look at, even then', () => {
    const now = pic([piece('cell-nk', next, 'cell')]);
    expect(
      focusFor([{ kind: 'move', key: 'cell-nk', from: near, stepped: false }], now, true),
    ).toBeNull();
  });

  it('changes at opposite sides of the board leave it wide', () => {
    const left = { x: CLAY_VIEW.x + 60, y: HUB_POS.y };
    const right = { x: CLAY_VIEW.x + CLAY_VIEW.w - 60, y: HUB_POS.y };
    const now = pic([piece('v1', left), piece('v2', right)]);
    expect(
      focusFor(
        [
          { kind: 'arrive', key: 'v1' },
          { kind: 'arrive', key: 'v2' },
        ],
        now,
        true,
      ),
    ).toBeNull();
  });
});

describe('what the camera shows', () => {
  it('never what is not board: moved in on each organ at the rim, the picture still fills the play area', () => {
    const off = BOARD_ORGANS.filter((o) => {
      const f = focusFor([{ kind: 'hurt', organ: o }], pic([]), true);
      return f === null || !showsOnlyBoard(f);
    });
    expect(off.map((o) => `THE CAMERA SHOWS WHAT IS NOT BOARD: moved in on the ${o}`)).toEqual([]);
  });

  it('what changed is in view', () => {
    for (const o of BOARD_ORGANS) {
      const coin = organCoin(o);
      const f = focusFor([{ kind: 'hurt', organ: o }], pic([]), true);
      if (!coin || !f) throw new Error(`no focus for ${o}`);
      const at = seenAt(coin, f);
      expect(at.x, o).toBeGreaterThan(0.05);
      expect(at.x, o).toBeLessThan(0.95);
      expect(at.y, o).toBeGreaterThan(0.05);
      expect(at.y, o).toBeLessThan(0.95);
    }
  });

  it('something in the middle of the board is put in the middle of the play area', () => {
    const f = focusFor([{ kind: 'arrive', key: 'v1' }], pic([piece('v1', HUB_POS)]), true);
    if (!f) throw new Error('no focus');
    const at = seenAt(HUB_POS, f);
    expect(at.x).toBeCloseTo(0.5, 2);
    expect(at.y).toBeCloseTo(0.5, 2);
  });

  it('CONTROL, must fail: a focus on the very corner, not kept in, is seen to show what is not board', () => {
    expect(showsOnlyBoard({ x: CLAY_VIEW.x, y: CLAY_VIEW.y, zoom: 1.8 })).toBe(false);
  });

  it('CONTROL, must pass: wide shows the whole board and nothing else', () => {
    expect(
      showsOnlyBoard({
        x: CLAY_VIEW.x + CLAY_VIEW.w / 2,
        y: CLAY_VIEW.y + CLAY_VIEW.h / 2,
        zoom: 1,
      }),
    ).toBe(true);
  });
});

describe('the transform', () => {
  it('wide is no transform at all', () => {
    expect(cameraTransform(null)).toBe('none');
  });

  it('is the one that puts a point where the camera says it is seen', () => {
    const f: Focus = { x: HUB_POS.x + 90, y: HUB_POS.y - 40, zoom: 1.6 };
    const m = /^translate\((-?[\d.]+)%, (-?[\d.]+)%\) scale\(([\d.]+)\)$/.exec(cameraTransform(f));
    if (!m) throw new Error(`not a transform this test can read: ${cameraTransform(f)}`);
    const [tx, ty, z] = [Number(m[1]) / 100, Number(m[2]) / 100, Number(m[3])];
    // a point of the board, as a share of its width, is drawn at: the shift, plus the zoom times it
    const p = { x: HUB_POS.x + 130, y: HUB_POS.y - 10 };
    const u = (p.x - CLAY_VIEW.x) / CLAY_VIEW.w;
    const v = (p.y - CLAY_VIEW.y) / CLAY_VIEW.h;
    expect(tx + z * u).toBeCloseTo(seenAt(p, f).x, 4);
    expect(ty + z * v).toBeCloseTo(seenAt(p, f).y, 4);
  });
});
