/**
 * WAY THREE: the models drawn live (three.js). The board and every piece are the Blender models
 * themselves, lit and shadowed on the phone each frame. Nothing is a picture, so a piece can
 * turn and the camera can tilt; the price is that the phone's light is not Blender's.
 */
import {
  AmbientLight,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { coins, HUB, MODELS, VIEW } from '../scene';
import type { DrawState } from '../timeline';
import { arcsOf, COLOUR, organsKey } from '../way';
import type { Size, Way } from '../way';

const art = (path: string): string => `${import.meta.env.BASE_URL}art/${path}`;
/** One board unit in the models' units, as in blender/clay.py. */
const U = 0.01;
/** The height a piece stands at on the board, as in blender/clay.py. */
const PIECE_Y = 0.035;

export interface LiveOptions {
  /** Tilt the camera off the vertical, in degrees. 0 is the view the pictures were made from. */
  tilt: number;
}

export class LiveWay implements Way {
  readonly key = 'live' as const;
  private size: Size = { w: 0, h: 0, dpr: 1 };
  private renderer: WebGLRenderer | null = null;
  private scene: Scene | null = null;
  private camera: OrthographicCamera | null = null;
  private readonly models = new Map<string, Object3D>();
  private readonly pieces = new Map<string, { node: Object3D; model: string }>();
  private readonly rings: Mesh[] = [];
  private ringMat: MeshBasicMaterial | null = null;
  private halo: Mesh | null = null;
  private arcs: Group | null = null;
  private arcsFor = '';
  private gpu = '';
  private triangles = 0;

  constructor(private readonly options: LiveOptions = { tilt: 0 }) {}

  async init(host: HTMLElement, size: Size): Promise<void> {
    this.size = size;
    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(size.dpr);
    renderer.setSize(size.w, size.h);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    // setSize has just written the canvas's CSS size; add to its style, never replace it
    Object.assign(renderer.domElement.style, { position: 'absolute', left: '0', top: '0' });
    host.append(renderer.domElement);
    this.renderer = renderer;
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    this.gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'not reported';

    const scene = new Scene();
    this.scene = scene;
    // Blender's world light, then its key and fill lamps, from the same directions.
    scene.add(new HemisphereLight(0xfff1e0, 0x2f5a60, 1.15));
    scene.add(new AmbientLight(0xffffff, 0.25));
    const hx = HUB.x * U;
    const hz = HUB.y * U;
    const key = new DirectionalLight(0xfff2e2, 2.3);
    key.position.set(hx - 5.5, 9, hz - 5);
    key.target.position.set(hx, 0, hz);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -3.6;
    key.shadow.camera.right = 3.6;
    key.shadow.camera.top = 3.6;
    key.shadow.camera.bottom = -3.6;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.radius = 7;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.012;
    const fill = new DirectionalLight(0xdce9ff, 0.45);
    fill.position.set(hx + 6, 6, hz + 6);
    fill.target.position.set(hx, 0, hz);
    scene.add(key, key.target, fill, fill.target);

    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
    this.camera = camera;

    const loader = new GLTFLoader();
    const [board, ...loaded] = await Promise.all([
      loader.loadAsync(art('models/board.glb')),
      ...MODELS.map((m) => loader.loadAsync(art(`models/${m}.glb`))),
    ]);
    board.scene.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      this.triangles +=
        (o.geometry.index?.count ?? o.geometry.attributes['position']?.count ?? 0) / 3;
      o.castShadow = true;
      o.receiveShadow = true;
    });
    scene.add(board.scene);
    // The pictograms, laid on the coins: a white shape on clear, tinted, throwing no shadow.
    const textures = new TextureLoader();
    const flat = new PlaneGeometry(1, 1);
    await Promise.all(
      coins().map(async (c) => {
        const map = await textures.loadAsync(art(`tex/${c.tex}.webp`));
        map.colorSpace = SRGBColorSpace;
        const mesh = new Mesh(
          flat,
          new MeshStandardMaterial({
            map,
            color: c.colour,
            transparent: true,
            depthWrite: false,
            roughness: 0.5,
          }),
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.scale.set(c.half * 2 * U, c.half * 2 * U, 1);
        mesh.position.set(c.x * U, (c.top + 0.6) * U, c.y * U);
        mesh.receiveShadow = true;
        scene.add(mesh);
      }),
    );
    MODELS.forEach((name, i) => {
      const g = loaded[i]?.scene;
      if (!g) return;
      g.traverse((o) => {
        if (o instanceof Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      this.models.set(name, g);
    });

    this.ringMat = new MeshBasicMaterial({
      color: COLOUR.move,
      transparent: true,
      depthTest: false,
    });
    const haloMat = new MeshBasicMaterial({
      color: COLOUR.halo,
      transparent: true,
      depthTest: false,
    });
    const halo = new Mesh(new RingGeometry(0.29, 0.32, 48), haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.renderOrder = 10;
    scene.add(halo);
    this.halo = halo;
    // Compile every program and upload every buffer before the first measured frame.
    renderer.compile(scene, camera);
  }

  private frame(s: DrawState): void {
    const cam = this.camera;
    if (!cam) return;
    const halfW = (VIEW.w * U) / 2 / s.cam.zoom;
    const halfH = (VIEW.h * U) / 2 / s.cam.zoom;
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;
    const cx = s.cam.cx * U;
    const cz = s.cam.cy * U;
    const tilt = (this.options.tilt * Math.PI) / 180;
    cam.position.set(cx, 20 * Math.cos(tilt), cz + 20 * Math.sin(tilt));
    cam.up.set(0, 0, -1);
    cam.lookAt(cx, 0, cz);
    cam.updateProjectionMatrix();
  }

  draw(s: DrawState): void {
    const { renderer, scene, camera, halo } = this;
    if (!renderer || !scene || !camera || !halo || !this.ringMat) return;
    this.frame(s);

    const seen = new Set<string>();
    for (const p of s.pieces) {
      let e = this.pieces.get(p.id);
      if (!e || e.model !== p.model) {
        if (e) scene.remove(e.node);
        const src = this.models.get(p.model);
        if (!src) continue;
        // a clone shares the model's geometry and materials: one upload, many pieces
        e = { node: src.clone(), model: p.model };
        scene.add(e.node);
        this.pieces.set(p.id, e);
      }
      // the model's body radius is 1 unit; a piece that is not all there yet is drawn small
      const u = p.r * U * (0.4 + 0.6 * p.a);
      e.node.position.set(p.x * U, PIECE_Y, p.y * U);
      e.node.scale.set(u * p.sx, u * (2 - p.sy), u * p.sy);
      e.node.visible = p.a > 0.02;
      seen.add(p.id);
    }
    for (const [id, e] of this.pieces)
      if (!seen.has(id)) {
        scene.remove(e.node);
        this.pieces.delete(id);
      }

    while (this.rings.length < s.rings.length) {
      const ring = new Mesh(new RingGeometry(0.125, 0.16, 40), this.ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 9;
      scene.add(ring);
      this.rings.push(ring);
    }
    this.rings.forEach((ring, i) => {
      const r = s.rings[i];
      ring.visible = !!r;
      if (!r) return;
      const k = 0.9 + 0.2 * r.p;
      ring.position.set(r.x * U, 0.06, r.y * U);
      ring.scale.set(k, k, 1);
    });
    this.ringMat.opacity = s.rings[0]?.a ?? 0;
    halo.visible = !!s.selected;
    if (s.selected) halo.position.set(s.selected.x * U, 0.07, s.selected.y * U);

    const key = organsKey(s.organs);
    if (key !== this.arcsFor) {
      this.arcsFor = key;
      if (this.arcs) scene.remove(this.arcs);
      const g = new Group();
      const lit = new MeshBasicMaterial({ color: COLOUR.mint });
      const lost = new MeshBasicMaterial({ color: COLOUR.lost });
      for (const a of arcsOf(s.organs)) {
        // board angles run clockwise on screen (y grows downward); a ring's run anticlockwise
        const m = new Mesh(
          new RingGeometry((a.r - 2.75) * U, (a.r + 2.75) * U, 16, 1, -a.a1, a.a1 - a.a0),
          a.lit ? lit : lost,
        );
        m.rotation.x = -Math.PI / 2;
        m.position.set(a.cx * U, 0.1, a.cy * U);
        g.add(m);
      }
      scene.add(g);
      this.arcs = g;
    }
    renderer.render(scene, camera);
  }

  dispose(): void {
    this.pieces.clear();
    this.rings.length = 0;
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = null;
  }

  info(): Record<string, string | number> {
    const r = this.renderer?.info.render;
    return {
      gpu: this.gpu,
      drawCalls: r?.calls ?? 0,
      trianglesDrawn: r?.triangles ?? 0,
      boardTriangles: Math.round(this.triangles),
    };
  }
}
