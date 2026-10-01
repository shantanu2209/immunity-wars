/**
 * Where everything stands. The board's positions come from the content pack's geometry.json,
 * the one source (CLAUDE.md, physical/digital parity); nothing here writes a coordinate down.
 */
import GEO from '../../../packages/content/src/board/geometry.json';

import type { CellKey, Place, Shot } from './recording-types';

type Pt = { x: number; y: number };
const ROUTE = GEO.ROUTE as Record<string, Record<string, Pt>>;
const BRANCH = GEO.BRANCH as Record<string, Record<string, Pt>>;
const ORGAN_POS = GEO.ORGAN_POS as Record<string, Pt>;
export const CHIP_POS = GEO.CHIP_POS as Record<string, Pt>;
export const HUB: Pt = GEO.HUB;

/** The margin drawn round the content pack's VIEWBOX; Blender's board picture uses the same. */
const PAD = 15;
export const VIEW = {
  x: GEO.VIEWBOX.x - PAD,
  y: GEO.VIEWBOX.y - PAD,
  w: GEO.VIEWBOX.w + PAD * 2,
  h: GEO.VIEWBOX.h + PAD * 2,
};
/** Blender renders each piece picture over a square this many board units wide, at body radius 23. */
export const PIECE_SPAN = 90;
export const PIECE_RADIUS = 23;

export const CELL_KEYS: CellKey[] = [
  'macrophage',
  'neutrophil',
  'bcell',
  'tcell',
  'helper',
  'nk',
  'eosinophil',
];

export function posOf(p: Place): Pt {
  if (p.zone === 'hub') return HUB;
  if (p.zone === 'route' && p.lane) {
    const at = ROUTE[p.lane]?.[String(p.step)];
    if (at) return at;
  }
  if (p.organ) {
    const at = p.step === 0 ? ORGAN_POS[p.organ] : BRANCH[p.organ]?.[String(p.step)];
    if (at) return at;
  }
  throw new Error(`no position for ${JSON.stringify(p)}`);
}
const keyOf = (p: Place): string => `${p.zone}:${p.lane ?? ''}:${p.organ ?? ''}:${p.step}`;

export interface Spot {
  id: string;
  model: string;
  x: number;
  y: number;
  /** Body radius in board units. */
  r: number;
}

/**
 * Every piece's place for one picture of the game.
 *
 * A crowd on one space is drawn as every pathogen in it, packed into a cluster. The app will
 * probably show a crowd as a stack with a count (L4 decides); drawing each one is the heavier
 * case, which is the right one to measure.
 */
export function layoutOf(shot: Shot): Map<string, Spot> {
  const out = new Map<string, Spot>();
  for (const [organ, step] of Object.entries(shot.residents)) {
    const p = posOf({ zone: 'branch', lane: null, organ, step });
    out.set(`r:${organ}`, { id: `r:${organ}`, model: 'macrophage', x: p.x, y: p.y, r: 14 });
  }
  const inHub = CELL_KEYS.filter((k) => shot.cells[k].zone === 'hub');
  const cellAt = new Set<string>();
  for (const k of CELL_KEYS) {
    const c = shot.cells[k];
    if (c.zone === 'hub') {
      const a = (inHub.indexOf(k) / inHub.length) * Math.PI * 2 - Math.PI / 2;
      out.set(`c:${k}`, {
        id: `c:${k}`,
        model: k,
        x: HUB.x + Math.cos(a) * 25,
        y: HUB.y + Math.sin(a) * 25,
        r: 15,
      });
    } else {
      const p = posOf(c);
      cellAt.add(keyOf(c));
      out.set(`c:${k}`, { id: `c:${k}`, model: k, x: p.x, y: p.y, r: PIECE_RADIUS });
    }
  }
  const groups = new Map<string, Shot['invaders']>();
  for (const v of shot.invaders) {
    const k = keyOf(v.at);
    const g = groups.get(k);
    if (g) g.push(v);
    else groups.set(k, [v]);
  }
  for (const [k, g] of groups) {
    const first = g[0];
    if (!first) continue;
    const c = posOf(first.at);
    const n = g.length;
    const shift = cellAt.has(k) ? { x: 17, y: 13 } : { x: 0, y: 0 };
    const spread = n === 1 ? 0 : Math.min(46, 13 * Math.sqrt(n));
    const r = n === 1 ? 24 : Math.max(8.5, 20 / n ** 0.42);
    g.forEach((v, i) => {
      const rad = spread * Math.sqrt((i + 0.5) / n);
      const th = i * 2.399963;
      out.set(v.id, {
        id: v.id,
        model: v.type === 'bacteria' && v.tagged ? 'bacteria_coated' : v.type,
        x: c.x + shift.x + Math.cos(th) * rad,
        y: c.y + shift.y + Math.sin(th) * rad,
        r,
      });
    });
  }
  return out;
}

export const MODELS = [...CELL_KEYS, 'bacteria', 'bacteria_coated', 'fungus', 'virus'];

/**
 * The coins that carry a pictogram: one per way in and one per organ. Blender's board picture
 * has them painted on; a way that draws the board live lays them on itself. The way-in coins
 * stand 20 board units beyond the content pack's ENTRY point, along the line from the hub,
 * exactly as blender/clay.py places them.
 */
export interface Coin {
  tex: string;
  x: number;
  y: number;
  /** Half the pictogram's width, in board units. */
  half: number;
  /** The coin's height, in board units: the pictogram lies just above it. */
  top: number;
  colour: string;
}
export function coins(): Coin[] {
  const out: Coin[] = [];
  for (const [lane, e] of Object.entries(GEO.ENTRY as Record<string, Pt>)) {
    const dx = e.x - HUB.x;
    const dy = e.y - HUB.y;
    const k = 1 + 20 / Math.hypot(dx, dy);
    out.push({
      tex: `entry-${lane}`,
      x: HUB.x + dx * k,
      y: HUB.y + dy * k,
      half: 19,
      top: 6,
      colour: '#3B2A4A',
    });
  }
  for (const [organ, c] of Object.entries(CHIP_POS))
    out.push({ tex: `organ-${organ}`, x: c.x, y: c.y, half: 22, top: 9, colour: '#FFF6EA' });
  return out;
}
