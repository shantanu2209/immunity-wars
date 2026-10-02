/**
 * WHERE THE LIGHT GOES: the rectangle the guide rings, worked out from rectangles alone, so that it
 * can be held by a test that has no page.
 *
 * WHAT IS RINGED IS WHAT CAN BE SEEN OF THE CONTROL. A control inside a part of the screen that
 * scrolls has a rectangle that runs on past that part's edge: the rest of it is there, and cut off.
 * With the text at its largest a row of a piece's actions is taller than the room the middle has
 * for it, and its own rectangle reaches down over the three tiles below. Ringed whole, the light
 * stood over a strip of the tiles as well as the row. So the control's rectangle is cut by
 * everything that cuts the control off, and the ring goes round what is left.
 *
 * Found by the Gate 1 audit, 2 October 2026: at 200% text its walk of the lesson never came to "a
 * row of actions lit", because the light over the row had a tile's centre inside it and was read as
 * the tile's.
 */
import { TOUCH } from '../kit/tokens';

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Room between the control and its ring. */
export const LIT_PAD = 6;

/** The part of a control that can be seen: its rectangle, cut by each thing that cuts it off. */
export function seenPart(own: Rect, clips: readonly Rect[]): Rect | null {
  let { left, top, right, bottom } = own;
  for (const c of clips) {
    left = Math.max(left, c.left);
    top = Math.max(top, c.top);
    right = Math.min(right, c.right);
    bottom = Math.min(bottom, c.bottom);
  }
  return right - left >= 1 && bottom - top >= 1 ? { left, top, right, bottom } : null;
}

/**
 * Where to ring: round what can be seen of the control, grown to a finger's size and kept on the
 * screen. A control of which nothing can be seen (the board has moved in on something else, for a
 * moment) is ringed where it is: a light somewhere is better than none, and it is read again on
 * the next frame.
 */
export function litBox(
  own: Rect,
  clips: readonly Rect[],
  screen: { width: number; height: number },
): Box {
  const r = seenPart(own, clips) ?? own;
  const w = Math.max(r.right - r.left + LIT_PAD * 2, TOUCH.min);
  const h = Math.max(r.bottom - r.top + LIT_PAD * 2, TOUCH.min);
  const left = Math.max(0, Math.min(screen.width - w, (r.left + r.right) / 2 - w / 2));
  const top = Math.max(0, Math.min(screen.height - h, (r.top + r.bottom) / 2 - h / 2));
  return {
    left,
    top,
    width: Math.min(w, screen.width),
    height: Math.min(h, screen.height),
  };
}

/** Is any of the control cut off by this? */
export function cutBy(own: Rect, clip: Rect): boolean {
  return (
    own.top < clip.top - 0.5 ||
    own.bottom > clip.bottom + 0.5 ||
    own.left < clip.left - 0.5 ||
    own.right > clip.right + 0.5
  );
}
