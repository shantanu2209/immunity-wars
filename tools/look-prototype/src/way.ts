/** What a way of drawing must do, and what all three share about the board's place on screen. */
import { CHIP_POS, HUB, VIEW } from './scene';
import type { Camera, DrawState } from './timeline';

export interface Way {
  readonly key: WayKey;
  /** Load what it needs and put its picture inside `host`. Resolves once it can draw. */
  init(host: HTMLElement, size: Size): Promise<void>;
  draw(state: DrawState): void;
  dispose(): void;
  /** Anything the way can say about what it is running on, for the results. */
  info(): Record<string, string | number>;
}
export type WayKey = 'page' | 'canvas' | 'live';
export interface Size {
  /** The board's box in CSS pixels. */
  w: number;
  h: number;
  /** Device pixels per CSS pixel, capped where the caller chose to cap it. */
  dpr: number;
}

/** CSS pixels per board unit when the whole board is in view. */
export const fit = (size: Size): number => size.w / VIEW.w;
/** Where a board point lands in the box, in CSS pixels, under a camera. */
export function project(
  size: Size,
  cam: Camera,
  x: number,
  y: number,
): { x: number; y: number; k: number } {
  const k = fit(size) * cam.zoom;
  return { x: size.w / 2 + (x - cam.cx) * k, y: size.h / 2 + (y - cam.cy) * k, k };
}

/** Integrity is drawn as arcs round the outer side of each organ's coin, lit while it holds. */
export interface Arc {
  cx: number;
  cy: number;
  r: number;
  a0: number;
  a1: number;
  lit: boolean;
}
export function arcsOf(organs: DrawState['organs']): Arc[] {
  const out: Arc[] = [];
  for (const [o, s] of Object.entries(organs)) {
    const c = CHIP_POS[o];
    if (!c) continue;
    const away = Math.atan2(c.y - HUB.y, c.x - HUB.x);
    const span = 0.5;
    for (let i = 0; i < s.max; i += 1) {
      const a0 = away + (i - s.max / 2) * span + 0.07;
      out.push({ cx: c.x, cy: c.y, r: 37, a0, a1: a0 + span - 0.14, lit: i < s.hp });
    }
  }
  return out;
}
export const organsKey = (organs: DrawState['organs']): string =>
  Object.entries(organs)
    .map(([o, s]) => `${o}${s.hp}/${s.max}`)
    .join(',');

export const COLOUR = { mint: '#3FD6B4', lost: '#0B2227', move: '#FFE08A', halo: '#FFFFFF' };
