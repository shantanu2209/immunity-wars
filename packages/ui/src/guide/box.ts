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

/**
 * THE RING IS DRAWN TIGHT ROUND THE CONTROL (16 October 2026). Shantanu, playing the lesson: a
 * button ringed for the player to press *"appears as if sunken"*. Two things made it so. The ring
 * stood at the edge of the room left round the control, with a strip of the dark table between it
 * and the button, which reads as a recess the button sits in; and a kit button stands on a lip of
 * itself drawn below its own box (a shadow, `kit/Button.tsx`), which that room did not count, so
 * the ring and the dimming cut across it. So the ring is drawn this close to what can be seen of the
 * control and its lip, and the dimming stops where the ring does. The finger's target is still the
 * larger box above (`litBox`).
 */
export const RING_GAP = 1;
/** The ring's own thickness: it is drawn outside the box `ringBox` gives. */
export const RING = 3;

/**
 * How far below its own box a control's hard edge reaches: the largest offset of a shadow that is
 * not inset and not blurred, which is how the kit draws a button's lip. A soft, blurred shadow is
 * the button's cast on the table, not the button, and is left out. Reads a style as written
 * (`0 6px 0 #c2513a`) or as the browser reports it (`rgb(194, 81, 58) 0px 6px 0px 0px`).
 */
export function edgeBelow(boxShadow: string): number {
  if (boxShadow === '' || boxShadow === 'none') return 0;
  let below = 0;
  for (const one of boxShadow.split(/,(?![^(]*\))/)) {
    if (/\binset\b/.test(one)) continue;
    const lengths = one
      .replace(/rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]+/gi, ' ')
      .trim()
      .split(/\s+/)
      .map((x) => parseFloat(x))
      .filter((x) => !Number.isNaN(x));
    const [, y = 0, blur = 0, spread = 0] = lengths;
    if (blur === 0) below = Math.max(below, y + spread);
  }
  return below;
}

/** Where the ring is drawn: round what can be seen of the control, its lip counted, a hair away. */
export function ringBox(own: Rect, clips: readonly Rect[], lip = 0): Box {
  // Read edge by edge: a browser's rectangle keeps them on its prototype, and spreading it gives an
  // empty object (the first build of this did, and drew its ring at no place at all).
  const withLip = {
    left: own.left,
    top: own.top,
    right: own.right,
    bottom: own.bottom + Math.max(0, lip),
  };
  const r = seenPart(withLip, clips) ?? withLip;
  return {
    left: r.left - RING_GAP,
    top: r.top - RING_GAP,
    width: r.right - r.left + RING_GAP * 2,
    height: r.bottom - r.top + RING_GAP * 2,
  };
}

/** A place the dimming leaves clear, with the corner the ring round it takes. */
export interface Hole {
  box: Box;
  radius: number;
}

/**
 * THE DIMMING, AS ONE SHAPE: the whole screen, with each hole cut out in the ring's own rounded
 * shape. Four panes round a rectangle left the corners of a round control clear, as light squares
 * round a round ring (16 October 2026). Drawn even-odd, so a hole is a hole.
 */
export function dimPath(width: number, height: number, holes: readonly Hole[]): string {
  let d = `M0 0H${String(width)}V${String(height)}H0Z`;
  for (const { box: b, radius } of holes) {
    const r = Math.max(0, Math.min(radius, b.width / 2, b.height / 2));
    const x = b.left;
    const y = b.top;
    const x2 = x + b.width;
    const y2 = y + b.height;
    const arc = (tx: number, ty: number): string =>
      `A${String(r)} ${String(r)} 0 0 1 ${String(tx)} ${String(ty)}`;
    d +=
      `M${String(x + r)} ${String(y)}H${String(x2 - r)}${arc(x2, y + r)}` +
      `V${String(y2 - r)}${arc(x2 - r, y2)}H${String(x + r)}${arc(x, y2 - r)}` +
      `V${String(y + r)}${arc(x + r, y)}Z`;
  }
  return d;
}
