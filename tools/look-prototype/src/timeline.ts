/**
 * THE MOTION, decided once. A recording goes in; out comes a function from time to "what is
 * drawn now": where each piece is, how it is squashed, where the camera looks. All three ways of
 * drawing are handed the same state for the same instant, so what the frame timer compares is
 * the drawing and nothing else.
 */
import type { Beat, Die, Recording } from './recording-types';
import { HUB, layoutOf, posOf, VIEW } from './scene';
import type { Spot } from './scene';

export interface PieceDraw {
  id: string;
  model: string;
  x: number;
  y: number;
  /** Body radius in board units, after breathing and popping. */
  r: number;
  /** Squash and stretch, as multipliers on width and height. */
  sx: number;
  sy: number;
  /** 0 to 1: how much of the piece is there. */
  a: number;
}
export interface Camera {
  cx: number;
  cy: number;
  zoom: number;
}
export interface DrawState {
  pieces: PieceDraw[];
  /** Spaces the selected cell may move to, with a 0 to 1 pulse. */
  rings: { x: number; y: number; p: number; a: number }[];
  selected: { x: number; y: number; a: number } | null;
  cam: Camera;
  /** Index of the beat being arrived at; the HUD reads its numbers from it. */
  beat: number;
  organs: Record<string, { hp: number; max: number }>;
}
export interface Hud {
  turn: number;
  maxTurn: number;
  ap: number;
  apMax: number;
  label: string;
  dice: Die[];
}

const WIDE: Camera = { cx: VIEW.x + VIEW.w / 2, cy: VIEW.y + VIEW.h / 2, zoom: 1 };
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const inOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const outBack = (t: number): number => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
/** A stable 0 to 1 number per piece, so each breathes out of step with its neighbours. */
function phaseOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

interface Segment {
  t0: number;
  dur: number;
  moveMs: number;
  from: Map<string, Spot>;
  to: Map<string, Spot>;
  camFrom: Camera;
  camTo: Camera;
  beat: number;
  kind: Beat['kind'] | 'hold';
  /** The piece that swallows whatever vanishes in this segment. */
  eater: string | null;
}

const LENGTH: Record<Beat['kind'] | 'hold', { dur: number; move: number }> = {
  hold: { dur: 600, move: 0 },
  start: { dur: 600, move: 0 },
  select: { dur: 900, move: 0 },
  move: { dur: 800, move: 450 },
  engulf: { dur: 1050, move: 420 },
  spread: { dur: 1150, move: 520 },
  draw: { dur: 1250, move: 420 },
};

export class Timeline {
  readonly duration: number;
  private readonly segments: Segment[] = [];
  private readonly beats: Beat[];

  constructor(recording: Recording) {
    this.beats = recording.beats;
    const layouts = this.beats.map((b) => layoutOf(b.shot));
    let t = 0;
    let cam = WIDE;
    const push = (
      kind: Segment['kind'],
      beat: number,
      from: Map<string, Spot>,
      to: Map<string, Spot>,
      camTo: Camera,
      eater: string | null,
    ) => {
      const len = LENGTH[kind];
      this.segments.push({
        t0: t,
        dur: len.dur,
        moveMs: len.move,
        from,
        to,
        camFrom: cam,
        camTo,
        beat,
        kind,
        eater,
      });
      t += len.dur;
      cam = camTo;
    };
    const first = layouts[0];
    if (!first) throw new Error('an empty recording');
    push('hold', 0, first, first, WIDE, null);
    for (let i = 1; i < this.beats.length; i += 1) {
      const beat = this.beats[i];
      const from = layouts[i - 1];
      const to = layouts[i];
      if (!beat || !from || !to) continue;
      push(
        beat.kind,
        i,
        from,
        to,
        this.focus(beat, from, to),
        beat.kind === 'engulf' && beat.selected ? `c:${beat.selected}` : null,
      );
    }
    const last = layouts[layouts.length - 1];
    if (last) push('hold', this.beats.length - 1, last, last, WIDE, null);
    this.duration = t;
  }

  /** The camera moves in on what is happening: the selected cell, or whatever just changed. */
  private focus(beat: Beat, from: Map<string, Spot>, to: Map<string, Spot>): Camera {
    if (beat.selected) {
      const c = to.get(`c:${beat.selected}`);
      if (c) return { cx: c.x, cy: c.y, zoom: beat.kind === 'engulf' ? 2 : 1.7 };
    }
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    let changed = 0;
    const see = (s: Spot) => {
      changed += 1;
      x0 = Math.min(x0, s.x);
      y0 = Math.min(y0, s.y);
      x1 = Math.max(x1, s.x);
      y1 = Math.max(y1, s.y);
    };
    for (const [id, b] of to) {
      const a = from.get(id);
      if (!a) see(b);
      else if (Math.hypot(a.x - b.x, a.y - b.y) > 1) {
        see(a);
        see(b);
      }
    }
    for (const [id, a] of from) if (!to.has(id)) see(a);
    if (changed === 0) return WIDE;
    const zoom = Math.max(1, Math.min(1.8, VIEW.w / (x1 - x0 + 220), VIEW.h / (y1 - y0 + 220)));
    if (zoom < 1.08) return WIDE;
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, zoom };
  }

  hud(beat: number): Hud {
    const b = this.beats[beat];
    if (!b) throw new Error(`no beat ${beat}`);
    return {
      turn: b.shot.turn,
      maxTurn: b.shot.maxTurn,
      ap: b.shot.ap,
      apMax: b.shot.apMax,
      label: b.label,
      dice: b.dice,
    };
  }

  at(tIn: number): DrawState {
    const t = Math.max(0, Math.min(this.duration - 0.001, tIn));
    let seg = this.segments[0];
    for (const s of this.segments) if (t >= s.t0) seg = s;
    if (!seg) throw new Error('no segment');
    const u = t - seg.t0;
    const beat = this.beats[seg.beat];
    if (!beat) throw new Error('no beat');
    const camT = inOut(clamp01(u / Math.max(1, seg.dur * 0.45)));
    const cam: Camera = {
      cx: lerp(seg.camFrom.cx, seg.camTo.cx, camT),
      cy: lerp(seg.camFrom.cy, seg.camTo.cy, camT),
      zoom: lerp(seg.camFrom.zoom, seg.camTo.zoom, camT),
    };

    const pieces: PieceDraw[] = [];
    const eater = seg.eater ? seg.to.get(seg.eater) : undefined;
    let order = 0;
    const breathe = (id: string): { k: number; dy: number } => {
      const ph = phaseOf(id);
      return {
        k: 1 + 0.03 * Math.sin(Math.PI * 2 * (t / 1700 + ph)),
        dy: 0.8 * Math.sin(Math.PI * 2 * (t / 2300 + ph)),
      };
    };
    for (const [id, b] of seg.to) {
      const a = seg.from.get(id);
      const br = breathe(id);
      const delay = Math.min(260, order * 14);
      order += 1;
      if (a) {
        const far = Math.hypot(a.x - b.x, a.y - b.y) > 1;
        const m = seg.moveMs > 0 ? clamp01((u - (far ? delay : 0)) / seg.moveMs) : 1;
        const e = inOut(m);
        const hop = far ? Math.sin(Math.PI * m) : 0;
        let r = lerp(a.r, b.r, e) * br.k * (1 + 0.12 * hop);
        if (id === seg.eater) r *= 1 + 0.22 * Math.sin(Math.PI * clamp01((u - 250) / 450));
        pieces.push({
          id,
          model: b.model,
          x: lerp(a.x, b.x, e),
          y: lerp(a.y, b.y, e) + br.dy,
          r,
          sx: 1 + 0.1 * hop,
          sy: 1 - 0.06 * hop,
          a: 1,
        });
      } else {
        const m = clamp01((u - delay) / 320);
        pieces.push({
          id,
          model: b.model,
          x: b.x,
          y: b.y + br.dy,
          r: b.r * br.k * Math.max(0, outBack(m)),
          sx: 1,
          sy: 1,
          a: m,
        });
      }
    }
    for (const [id, a] of seg.from) {
      if (seg.to.has(id)) continue;
      const m = clamp01(u / 400);
      if (m >= 1) continue;
      const e = inOut(m);
      pieces.push({
        id,
        model: a.model,
        x: eater ? lerp(a.x, eater.x, e) : a.x,
        y: eater ? lerp(a.y, eater.y, e) : a.y,
        r: a.r * (1 - e),
        sx: 1,
        sy: 1,
        a: 1 - m,
      });
    }
    pieces.sort((p, q) => p.y - q.y);

    const pulse = 0.5 + 0.5 * Math.sin((Math.PI * 2 * t) / 900);
    const fade = clamp01(u / 250);
    const rings = beat.selected
      ? beat.moves.map((mv) => ({ ...(mv.zone === 'hub' ? HUB : posOf(mv)), p: pulse, a: fade }))
      : [];
    const sel = beat.selected ? pieces.find((p) => p.id === `c:${beat.selected}`) : undefined;
    return {
      pieces,
      rings,
      selected: sel ? { x: sel.x, y: sel.y, a: 1 } : null,
      cam,
      beat: seg.beat,
      organs: beat.shot.organs,
    };
  }
}
