/**
 * THE ONE TAP PATH — coarse pointing, resolved as data (ruling of 4 September 2026).
 *
 * A board tap is resolved to the nearest candidate within TAP_RADIUS_U viewBox units, and
 * candidates are everything a tap can mean: a legal TARGET for the selected cell, one of the
 * player's CELL tokens at its drawn position, or a NODE with something to inspect. Nearest
 * wins; on a tie, target beats cell beats node — when targets are shown, tapping one acts.
 * Nothing within the radius resolves to null, which the shell treats as tap-away (deselect):
 * a tap is never dead.
 *
 * Pure so it can be tested as a model before it is trusted on a phone (`tap.test.ts`).
 * 60u ≈ 33px at the 360px reference width, so every candidate carries a hit area well over
 * Gate 1's 44px even though the drawn token is 20px.
 */

export interface Pt {
  x: number;
  y: number;
}

export type TapKind = 'target' | 'cell' | 'node';

export interface TapCandidate<T> {
  kind: TapKind;
  pos: Pt;
  payload: T;
}

export const TAP_RADIUS_U = 60;

const PRIORITY: Record<TapKind, number> = { target: 0, cell: 1, node: 2 };
/** Two candidates closer than this are "the same distance" and priority decides. */
const TIE_U = 0.5;

export function resolveTap<T>(
  candidates: readonly TapCandidate<T>[],
  p: Pt,
  radius: number = TAP_RADIUS_U,
): TapCandidate<T> | null {
  let best: TapCandidate<T> | null = null;
  let bestD = radius;
  for (const c of candidates) {
    const d = Math.hypot(c.pos.x - p.x, c.pos.y - p.y);
    if (d >= radius) continue;
    if (best === null || d < bestD - TIE_U) {
      best = c;
      bestD = d;
    } else if (Math.abs(d - bestD) <= TIE_U && PRIORITY[c.kind] < PRIORITY[best.kind]) {
      best = c;
      bestD = d;
    }
  }
  return best;
}
