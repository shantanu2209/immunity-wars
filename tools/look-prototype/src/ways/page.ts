/**
 * WAY ONE: pictures on the page. The board is an <img>, every piece is an <img>, and motion is a
 * CSS transform set each frame. This is how the app draws today, with Blender's pictures in
 * place of the flat art. The browser can still read every piece as an element.
 */
import { PIECE_RADIUS, PIECE_SPAN, VIEW } from '../scene';
import type { DrawState } from '../timeline';
import { arcsOf, COLOUR, fit, organsKey } from '../way';
import type { Size, Way } from '../way';

const art = (path: string): string => `${import.meta.env.BASE_URL}art/${path}`;

function loaded(img: HTMLImageElement): Promise<void> {
  return img.decode().catch(() => undefined);
}

export class PageWay implements Way {
  readonly key = 'page' as const;
  private size: Size = { w: 0, h: 0, dpr: 1 };
  private root: HTMLDivElement | null = null;
  private world: HTMLDivElement | null = null;
  private layer: HTMLDivElement | null = null;
  private arcs: SVGSVGElement | null = null;
  private arcsFor = '';
  private readonly pieces = new Map<string, HTMLImageElement>();
  private readonly rings: HTMLDivElement[] = [];
  private halo: HTMLDivElement | null = null;
  private readonly sources = new Map<string, string>();

  async init(host: HTMLElement, size: Size): Promise<void> {
    this.size = size;
    const root = document.createElement('div');
    root.style.cssText = `position:absolute;inset:0;overflow:hidden;contain:strict`;
    const world = document.createElement('div');
    world.style.cssText = `position:absolute;left:0;top:0;width:${VIEW.w}px;height:${VIEW.h}px;transform-origin:0 0;will-change:transform`;
    const board = new Image();
    board.src = art('board.webp');
    board.alt = '';
    board.style.cssText = `position:absolute;left:0;top:0;width:${VIEW.w}px;height:${VIEW.h}px`;
    const arcs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arcs.setAttribute('viewBox', `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`);
    arcs.style.cssText = `position:absolute;left:0;top:0;width:${VIEW.w}px;height:${VIEW.h}px;overflow:visible`;
    const layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;left:0;top:0';
    world.append(board, arcs, layer);
    root.append(world);
    host.append(root);
    this.root = root;
    this.world = world;
    this.layer = layer;
    this.arcs = arcs;
    const halo = document.createElement('div');
    halo.style.cssText = `position:absolute;left:-31px;top:-31px;width:62px;height:62px;border-radius:50%;border:3px solid ${COLOUR.halo};box-shadow:0 0 10px ${COLOUR.halo};will-change:transform,opacity`;
    layer.append(halo);
    this.halo = halo;
    // Decode every picture before the first frame, so loading is not counted as slow frames.
    const names = [
      'macrophage',
      'neutrophil',
      'bcell',
      'tcell',
      'helper',
      'nk',
      'eosinophil',
      'bacteria',
      'bacteria_coated',
      'fungus',
      'virus',
    ];
    const warm = names.map((n) => {
      const img = new Image();
      img.src = art(`pieces/${n}.webp`);
      this.sources.set(n, img.src);
      return loaded(img);
    });
    await Promise.all([loaded(board), ...warm]);
  }

  private piece(id: string, model: string): HTMLImageElement {
    let el = this.pieces.get(id);
    if (!el) {
      el = new Image();
      el.alt = '';
      el.decoding = 'sync';
      el.style.cssText = `position:absolute;left:${-PIECE_SPAN / 2}px;top:${-PIECE_SPAN / 2}px;width:${PIECE_SPAN}px;height:${PIECE_SPAN}px;will-change:transform,opacity;pointer-events:none`;
      el.dataset['model'] = '';
      this.layer?.append(el);
      this.pieces.set(id, el);
    }
    if (el.dataset['model'] !== model) {
      el.dataset['model'] = model;
      el.src = this.sources.get(model) ?? '';
    }
    return el;
  }

  draw(s: DrawState): void {
    const { world, layer, halo } = this;
    if (!world || !layer || !halo) return;
    const k = fit(this.size) * s.cam.zoom;
    world.style.transform = `translate3d(${this.size.w / 2 - (s.cam.cx - VIEW.x) * k}px,${this.size.h / 2 - (s.cam.cy - VIEW.y) * k}px,0) scale(${k})`;

    const seen = new Set<string>();
    s.pieces.forEach((p, i) => {
      const el = this.piece(p.id, p.model);
      const u = p.r / PIECE_RADIUS;
      el.style.transform = `translate3d(${p.x - VIEW.x}px,${p.y - VIEW.y}px,0) scale(${u * p.sx},${u * p.sy})`;
      el.style.opacity = String(p.a);
      el.style.zIndex = String(i + 2);
      seen.add(p.id);
    });
    for (const [id, el] of this.pieces)
      if (!seen.has(id)) {
        el.remove();
        this.pieces.delete(id);
      }

    while (this.rings.length < s.rings.length) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;left:-16px;top:-16px;width:32px;height:32px;border-radius:50%;border:3px solid ${COLOUR.move};background:rgba(255,224,138,.28);box-shadow:0 0 8px ${COLOUR.move};z-index:900;will-change:transform,opacity`;
      layer.append(el);
      this.rings.push(el);
    }
    this.rings.forEach((el, i) => {
      const r = s.rings[i];
      if (!r) {
        el.style.opacity = '0';
        return;
      }
      el.style.opacity = String(r.a);
      el.style.transform = `translate3d(${r.x - VIEW.x}px,${r.y - VIEW.y}px,0) scale(${0.9 + 0.2 * r.p})`;
    });
    if (s.selected) {
      halo.style.opacity = String(s.selected.a);
      halo.style.zIndex = '901';
      halo.style.transform = `translate3d(${s.selected.x - VIEW.x}px,${s.selected.y - VIEW.y}px,0)`;
    } else halo.style.opacity = '0';

    const key = organsKey(s.organs);
    if (key !== this.arcsFor && this.arcs) {
      this.arcsFor = key;
      this.arcs.innerHTML = arcsOf(s.organs)
        .map((a) => {
          const p0 = `${a.cx + Math.cos(a.a0) * a.r} ${a.cy + Math.sin(a.a0) * a.r}`;
          const p1 = `${a.cx + Math.cos(a.a1) * a.r} ${a.cy + Math.sin(a.a1) * a.r}`;
          return `<path d="M${p0} A${a.r} ${a.r} 0 0 1 ${p1}" fill="none" stroke="${a.lit ? COLOUR.mint : COLOUR.lost}" stroke-width="5.5" stroke-linecap="round"/>`;
        })
        .join('');
    }
  }

  dispose(): void {
    this.root?.remove();
    this.pieces.clear();
    this.rings.length = 0;
  }

  info(): Record<string, string | number> {
    return { elements: this.pieces.size + this.rings.length + 3 };
  }
}
