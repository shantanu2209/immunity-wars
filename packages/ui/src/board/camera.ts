/**
 * THE CAMERA — stage L4 of docs/LOOK_PLAN.md (§14), the fourth pull request. The plan's third rule
 * of the look: wide while you choose; it moves in on what an action did and on each beat of the
 * spread, and back out.
 *
 * THERE IS NO CAMERA, only the board's own element drawn larger and shifted, which is one
 * transform. So what is here is arithmetic: given what just changed, which part of the board should
 * fill the play area, and what transform shows it. Pure, and tested as a model before the board
 * moves anything by it (`camera.test.ts`).
 *
 * WHAT IT MOVES IN ON, and what it leaves alone.
 *   While the spread plays (the player is watching): every beat that changes something.
 *   While the player is choosing: a swallow, a coat, a kill, a hurt organ. NOT a piece that only
 *   moved. Moving a piece is the commonest thing a player does and needs no explaining; a board
 *   that leaned in after every step would be a board that never held still.
 *
 * IT NEVER SHOWS WHAT IS NOT BOARD. The part shown is kept inside the picture, so moving in on an
 * organ at the rim does not bring the empty table in from the side.
 */
import type { Change, Picture } from './changes';
import { CLAY_VIEW, organCoin } from './clay';
import type { Pt } from './geometry';

/** The part of the board to fill the play area with: its centre, and how many times larger. */
export interface Focus {
  x: number;
  y: number;
  zoom: number;
}

/** How far in it goes while the spread plays, and while the player is choosing. */
export const ZOOM_WATCHING = 1.8;
export const ZOOM_CHOOSING = 1.3;
/** Room kept round what changed, in board units: a piece is 46 across, and wants its neighbours. */
const MARGIN = 70;
/** Closer to wide than this is not worth a move of the camera: it stays wide. */
const WORTH = 1.12;

/** Where each change happened, in board units. A move is both where it was and where it is. */
function places(changes: readonly Change[], now: Picture): Pt[] {
  const at = (key: string): Pt | undefined => now.pieces.find((p) => p.key === key)?.at;
  const out: Pt[] = [];
  for (const c of changes) {
    if (c.kind === 'leave') out.push(c.piece.at);
    else if (c.kind === 'hurt') {
      const coin = organCoin(c.organ);
      if (coin) out.push(coin);
    } else {
      const here = at(c.key);
      if (here) out.push(here);
      if (c.kind === 'move') out.push(c.from);
    }
  }
  return out;
}

/**
 * What the camera should show after these changes, or null to stay (or go) wide.
 * `watching`: the spread is playing, and the player is not choosing anything.
 */
export function focusFor(
  changes: readonly Change[],
  now: Picture,
  watching: boolean,
): Focus | null {
  const worth = watching
    ? // a piece only nudged aside to make room is not something to look at
      changes.filter((c) => !(c.kind === 'move' && !c.stepped))
    : changes.filter((c) => c.kind !== 'move' && c.kind !== 'arrive');
  const pts = places(worth, now);
  if (pts.length === 0) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const fit = Math.min(CLAY_VIEW.w / (x1 - x0 + MARGIN * 2), CLAY_VIEW.h / (y1 - y0 + MARGIN * 2));
  const zoom = Math.min(fit, watching ? ZOOM_WATCHING : ZOOM_CHOOSING);
  if (zoom < WORTH) return null;
  // The part shown is the board's size divided by the zoom; its centre is kept far enough from each
  // edge that the part shown stays inside the picture.
  const halfW = CLAY_VIEW.w / zoom / 2;
  const halfH = CLAY_VIEW.h / zoom / 2;
  const within = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
  return {
    x: within((x0 + x1) / 2, CLAY_VIEW.x + halfW, CLAY_VIEW.x + CLAY_VIEW.w - halfW),
    y: within((y0 + y1) / 2, CLAY_VIEW.y + halfH, CLAY_VIEW.y + CLAY_VIEW.h - halfH),
    zoom,
  };
}

/**
 * The transform that shows a focus: the board drawn `zoom` times larger from its top left corner,
 * and shifted so the focus is at the middle of the play area. In percentages of the board's own
 * size, so it holds at any size the board is drawn. Null is wide: no transform at all.
 */
export function cameraTransform(f: Focus | null): string {
  if (f === null) return 'none';
  const tx = (0.5 - (f.zoom * (f.x - CLAY_VIEW.x)) / CLAY_VIEW.w) * 100;
  const ty = (0.5 - (f.zoom * (f.y - CLAY_VIEW.y)) / CLAY_VIEW.h) * 100;
  return `translate(${tx.toFixed(3)}%, ${ty.toFixed(3)}%) scale(${f.zoom.toFixed(3)})`;
}

/** Where a point of the board lands under a focus, as fractions of the play area (0 to 1). */
export function seenAt(p: Pt, f: Focus | null): Pt {
  const u = (p.x - CLAY_VIEW.x) / CLAY_VIEW.w;
  const v = (p.y - CLAY_VIEW.y) / CLAY_VIEW.h;
  if (f === null) return { x: u, y: v };
  return {
    x: 0.5 + f.zoom * (u - (f.x - CLAY_VIEW.x) / CLAY_VIEW.w),
    y: 0.5 + f.zoom * (v - (f.y - CLAY_VIEW.y) / CLAY_VIEW.h),
  };
}
