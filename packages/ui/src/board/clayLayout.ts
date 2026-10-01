/**
 * HOW LARGE, AND WHERE, EACH PIECE ON A STEP IS DRAWN — stage L4 of docs/LOOK_PLAN.md (§14). The
 * other half of `clay.ts`, kept apart from it because it reads the board's model and the model
 * reads `clay.ts`. Pure, and tested as a model (`clay.test.ts`).
 */
import type { DisplayToken, NodeModel } from './Board';
import { BASE_R, BODY_R, HUB_WELL_R } from './clay';
import { HUB_POS, type Pt } from './geometry';

/** A resident is drawn smaller than the cells a player moves: it belongs to its organ. */
const RESIDENT = 0.72;
/** Pieces sharing a step are drawn smaller, side by side. Index: how many share it. */
const SHARED = [1, 1, 0.8, 0.68, 0.58];
const sharedScale = (n: number): number => SHARED[Math.min(n, SHARED.length - 1)] ?? 0.58;

const atHub = (node: NodeModel): boolean => node.pos.x === HUB_POS.x && node.pos.y === HUB_POS.y;

/**
 * Where the `i`th thing on a node is drawn, and at what share of full size.
 *
 * ON A STEP: side by side, each smaller the more there are, so that two pieces fighting over a
 * step are both seen.
 *
 * IN THE BLOODSTREAM (ruled 20 August 2026, and kept): it is a zone, not a step. What invades is
 * gathered at the centre, because threats are what a player decides about; your cells stand in a
 * ring at its edge, because cells leaving the bloodstream is the normal state of a game and a
 * ring loses pieces gracefully.
 */
export function clayLayout(node: NodeModel, i: number): { pos: Pt; scale: number } {
  const t = node.display[i];
  if (!t) return { pos: node.pos, scale: 1 };
  const own = (tok: DisplayToken): number => (tok.resident === true ? RESIDENT : 1);
  if (!atHub(node)) {
    const n = node.display.length;
    const s = sharedScale(n);
    const step = (BODY_R * 2 - 12) * s;
    return { pos: { x: node.pos.x + (i - (n - 1) / 2) * step, y: node.pos.y }, scale: s * own(t) };
  }
  const invaders = node.display.filter((d) => d.kind === 'invader');
  const cells = node.display.filter((d) => d.kind === 'cell');
  const cellScale = cells.length >= 6 ? 0.42 : cells.length >= 4 ? 0.5 : 0.6;
  const ringR = HUB_WELL_R - 1 - BASE_R * cellScale;
  if (t.kind === 'cell') {
    const k = cells.indexOf(t);
    const a = (2 * Math.PI * k) / Math.max(1, cells.length) - Math.PI / 2;
    return {
      pos: { x: HUB_POS.x + ringR * Math.cos(a), y: HUB_POS.y + ringR * Math.sin(a) },
      scale: cellScale,
    };
  }
  const k = invaders.indexOf(t);
  const n = invaders.length;
  if (n === 1) return { pos: HUB_POS, scale: cells.length > 0 ? 0.6 : 0.9 };
  const cols = n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const scale = cells.length > 0 ? (cols === 2 ? 0.42 : 0.34) : cols === 2 ? 0.62 : 0.5;
  const step = BODY_R * 2 * scale + 2;
  // The last row may be short; it is centred under the rows above it.
  const row = Math.floor(k / cols);
  const inRow = row === rows - 1 ? n - cols * (rows - 1) : cols;
  const col = k - row * cols;
  return {
    pos: {
      x: HUB_POS.x + (col - (inRow - 1) / 2) * step,
      y: HUB_POS.y + (row - (rows - 1) / 2) * step,
    },
    scale,
  };
}
