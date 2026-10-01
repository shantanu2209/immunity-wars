/**
 * WAY TWO: pictures on a GPU canvas (PixiJS). The same pictures as the page way, but drawn by
 * the graphics chip into one canvas: a sprite per piece, moved, squashed and faded there.
 * The browser sees one canvas and none of the pieces.
 */
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';

import { MODELS, PIECE_RADIUS, PIECE_SPAN, VIEW } from '../scene';
import type { DrawState } from '../timeline';
import { arcsOf, COLOUR, fit, organsKey } from '../way';
import type { Size, Way } from '../way';

const art = (path: string): string => `${import.meta.env.BASE_URL}art/${path}`;

export class CanvasWay implements Way {
  readonly key = 'canvas' as const;
  private size: Size = { w: 0, h: 0, dpr: 1 };
  private app: Application | null = null;
  private world: Container | null = null;
  private layer: Container | null = null;
  private overlay: Graphics | null = null;
  private arcs: Graphics | null = null;
  private arcsFor = '';
  private readonly textures = new Map<string, Texture>();
  private readonly sprites = new Map<string, Sprite>();
  private renderer = '';

  async init(host: HTMLElement, size: Size): Promise<void> {
    this.size = size;
    const app = new Application();
    await app.init({
      width: size.w,
      height: size.h,
      resolution: size.dpr,
      autoDensity: true,
      backgroundAlpha: 0,
      antialias: true,
      autoStart: false,
      preference: 'webgl',
    });
    // autoDensity has just written the canvas's CSS size; add to its style, never replace it
    Object.assign(app.canvas.style, { position: 'absolute', left: '0', top: '0' });
    host.append(app.canvas);
    this.app = app;
    this.renderer = app.renderer.name;

    const [boardTex, ...pieceTex] = await Promise.all([
      Assets.load<Texture>(art('board.webp')),
      ...MODELS.map((m) => Assets.load<Texture>(art(`pieces/${m}.webp`))),
    ]);
    MODELS.forEach((m, i) => {
      const t = pieceTex[i];
      if (t) this.textures.set(m, t);
    });

    const world = new Container();
    const board = new Sprite(boardTex);
    board.position.set(VIEW.x, VIEW.y);
    board.width = VIEW.w;
    board.height = VIEW.h;
    const arcs = new Graphics();
    const layer = new Container();
    layer.sortableChildren = true;
    const overlay = new Graphics();
    world.addChild(board, arcs, layer, overlay);
    app.stage.addChild(world);
    this.world = world;
    this.layer = layer;
    this.overlay = overlay;
    this.arcs = arcs;
  }

  draw(s: DrawState): void {
    const { app, world, layer, overlay, arcs } = this;
    if (!app || !world || !layer || !overlay || !arcs) return;
    const k = fit(this.size) * s.cam.zoom;
    world.scale.set(k);
    world.position.set(this.size.w / 2 - s.cam.cx * k, this.size.h / 2 - s.cam.cy * k);

    const seen = new Set<string>();
    s.pieces.forEach((p, i) => {
      let sp = this.sprites.get(p.id);
      const tex = this.textures.get(p.model);
      if (!tex) return;
      if (!sp) {
        sp = new Sprite(tex);
        sp.anchor.set(0.5);
        layer.addChild(sp);
        this.sprites.set(p.id, sp);
      } else if (sp.texture !== tex) sp.texture = tex;
      const u = (p.r / PIECE_RADIUS) * (PIECE_SPAN / tex.width);
      sp.position.set(p.x, p.y);
      sp.scale.set(u * p.sx, u * p.sy);
      sp.alpha = p.a;
      sp.zIndex = i;
      seen.add(p.id);
    });
    for (const [id, sp] of this.sprites)
      if (!seen.has(id)) {
        sp.destroy();
        this.sprites.delete(id);
      }

    overlay.clear();
    for (const r of s.rings) {
      const rad = 16 * (0.9 + 0.2 * r.p);
      overlay
        .circle(r.x, r.y, rad)
        .fill({ color: COLOUR.move, alpha: 0.28 * r.a })
        .stroke({ color: COLOUR.move, width: 3, alpha: r.a });
      overlay.circle(r.x, r.y, 5).fill({ color: COLOUR.move, alpha: r.a });
    }
    if (s.selected)
      overlay
        .circle(s.selected.x, s.selected.y, 31)
        .stroke({ color: COLOUR.halo, width: 3, alpha: s.selected.a });

    const key = organsKey(s.organs);
    if (key !== this.arcsFor) {
      this.arcsFor = key;
      arcs.clear();
      for (const a of arcsOf(s.organs)) {
        arcs.moveTo(a.cx + Math.cos(a.a0) * a.r, a.cy + Math.sin(a.a0) * a.r);
        arcs
          .arc(a.cx, a.cy, a.r, a.a0, a.a1)
          .stroke({ color: a.lit ? COLOUR.mint : COLOUR.lost, width: 5.5, cap: 'round' });
      }
    }
    app.render();
  }

  dispose(): void {
    this.sprites.clear();
    this.app?.destroy({ removeView: true }, { children: true });
    this.app = null;
  }

  info(): Record<string, string | number> {
    return { renderer: this.renderer, sprites: this.sprites.size };
  }
}
