/**
 * THE CLAY PIECES' PIPELINE — Blender's renders in, gated WebP and a manifest out.
 * Stage L3 of docs/LOOK_PLAN.md (section 13). `build.ts` beside this one is the pipeline of the
 * art the app ships today, and is untouched; this is its sibling for the look that replaces it.
 *
 * WHERE THE PICTURES COME FROM. `clay/pieces.py` builds every piece in Blender and renders it in
 * two views: BOARD (from straight above, under the board's own lamps, for the play screen) and
 * CARD (at an angle, for cards and the title). A render is not byte-reproducible across machines,
 * so, as with the generated art in `raw/`, the renders are INPUTS: `--ingest` stores them as
 * lossless WebP under `clay/renders/`, committed. Everything after that is deterministic.
 *
 * THE GATE. WCAG 2.1's bound for a meaningful graphic is 3:1 against what it is seen on, and
 * Gate 1 keeps it (ruled 1 October 2026). What a piece is seen on is not a colour somebody chose:
 * it is what the board's material looks like once lit, so the grounds are MEASURED from renders
 * too — `swatch-board` for the board, and the base's own well and rim.
 *
 *   an invader      its body against the BOARD, and against the WELL (the bloodstream's dish)
 *   one of your cells   its body against the WELL of the base it always stands on
 *   the base        its cream RIM against the BOARD
 *   an organ's coin its cream PICTOGRAM against the coin's own face, and against the BOARD
 *   a way in's coin its dark PICTOGRAM against the coin's face, and the FACE against the BOARD
 *   the unknown     as an invader, and its question mark against its own body
 *   the board       every route, every branch, every step, every lymph node and the bloodstream's
 *                   rim against the board's own ground, each read where geometry.json says it is;
 *                   and that ground against the swatch the pieces were measured on
 *
 * A coin's face and its pictogram are told apart with the pictogram's own shape, from
 * `clay/pictograms.ts`, laid over the render where `clay/pieces.py` put it. A shape that lay in
 * the wrong place would mix the two colours and so read LOWER, never higher: it cannot pass a coin
 * that should fail.
 *
 * "Its body" is the mean colour of the pixels that are fully there (alpha 0.95 or more): the
 * piece, and not the soft shadow rendered with it. A piece that fails fails the whole run.
 *
 * Why this gate exists at all: the first look at the numbers (1 October 2026) found the board of
 * the L1 style frame too light for four pieces (the virus read 2.6 against it), a plain cream base
 * failing for every cell (1.7 to 2.8), and nothing readable on a coral bloodstream (the virus read
 * 1.0). The darker board, the rimmed base with a dark well, and the lighter red blood cell are
 * what that measurement changed.
 *
 * Negative controls (`--control`), per the standing rule:
 *   mustFail  a piece the colour of the board itself (1.0:1) must be REJECTED
 *   mustPass  a cream piece (about 7:1) must be ACCEPTED
 *   mustFail  a picture whose shadow is cut off at its edge must be REJECTED
 *   mustFail  a set with NO board swatch must be REJECTED, never passed for want of a ground
 *   mustFail  a coin whose pictogram is the colour of its face must be REJECTED
 *   mustPass  a coin with a cream pictogram on a dark face must be ACCEPTED
 *
 * Usage:
 *   pnpm art:clay --pictograms write the coins' pictograms where clay/pieces.py reads them
 *   pnpm art:clay --ingest     clay/_png/ (Blender's output, not committed) -> clay/renders/
 *   pnpm art:clay              gate, and build packages/app/public/art/clay/ with its manifest
 *   pnpm art:clay --control    run the gate's controls, build nothing
 *   pnpm art:clay --check      re-measure and compare, encode nothing (on every `pnpm verify`)
 *   pnpm art:clay --verify     rebuild to a temp dir, byte-compare with the committed output
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { PICTOGRAMS, pictogramPng } from './clay/pictograms';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLAY = join(HERE, 'clay');
const PNG = join(CLAY, '_png');
const RENDERS = join(CLAY, 'renders');
/**
 * The app's own art folder, where the kit page reads the pictures from `/art/clay/`. The app's
 * build keeps this folder out of what a player's phone stores for offline play until a screen
 * uses it (packages/app/vite.config.ts, with its own check); the kit page is the only thing that
 * shows it at L3.
 *
 * It was `clay/out` for one commit, and that commit had 59 files where 207 were meant: the
 * repository ignores every folder named `out`, so the output was never staged. Found by counting
 * the commit's files. A committed output must not live under a name git ignores.
 */
const OUT = join(HERE, '../../packages/app/public/art/clay');

const MIN_CONTRAST = 3.0;
const VIEWS = { board: 100, card: 120 } as const;
type View = keyof typeof VIEWS;
const CELLS = new Set(['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil']);
/** What is rendered only to be measured or stood on, in the board view. */
const SWATCH = 'swatch-board';
const BASE = 'base';

interface Rgb {
  r: number;
  g: number;
  b: number;
}
const lin = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (c: Rgb): number => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
const hex = (c: Rgb): string =>
  `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const round2 = (n: number): number => Math.round(n * 100) / 100;

interface Pixels {
  data: Buffer;
  width: number;
  height: number;
}
async function pixels(input: Buffer): Promise<Pixels> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}
/** Mean colour over the pixels `keep` accepts, and the share of the picture they are. */
function mean(
  p: Pixels,
  keep: (x: number, y: number, alpha: number) => boolean,
): Rgb & { share: number } {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = 0; y < p.height; y += 1)
    for (let x = 0; x < p.width; x += 1) {
      const i = (y * p.width + x) * 4;
      const alpha = p.data[i + 3] ?? 0;
      if (!keep(x, y, alpha)) continue;
      r += p.data[i] ?? 0;
      g += p.data[i + 1] ?? 0;
      b += p.data[i + 2] ?? 0;
      n += 1;
    }
  if (n === 0)
    throw new Error('no pixel to measure: the picture is empty where it was expected to be solid');
  return { r: r / n, g: g / n, b: b / n, share: n / (p.width * p.height) };
}
const SOLID = 242; // alpha 0.95: the piece itself, not the soft shadow rendered with it
const body = (p: Pixels): Rgb & { share: number } => mean(p, (_x, _y, a) => a >= SOLID);
/** Mean over a ring round the picture's centre, radii as fractions of the half-width. */
const ring = (p: Pixels, r0: number, r1: number): Rgb =>
  mean(p, (x, y, a) => {
    const d = Math.hypot(x - p.width / 2, y - p.height / 2) / (p.width / 2);
    return a >= SOLID && d >= r0 && d <= r1;
  });

/**
 * The grounds, measured. The base's model is 1.2 units in radius with a well of 1.02, at a scale
 * of 0.23 in a picture 0.9 wide (clay/pieces.py), so in fractions of the half-width the well ends
 * at 0.52 and the rim runs from there to 0.61. The samples stay well inside each.
 */
interface Grounds {
  board: Rgb;
  well: Rgb;
  rim: Rgb;
}
async function grounds(read: (name: string) => Buffer | null): Promise<Grounds> {
  const swatch = read(SWATCH);
  const base = read(BASE);
  // A gate with no ground has measured nothing, and must say so rather than pass.
  if (!swatch) throw new Error(`no ${SWATCH} render: there is no board to measure a piece against`);
  if (!base) throw new Error(`no ${BASE} render: there is no well to measure a cell against`);
  const s = await pixels(swatch);
  const b = await pixels(base);
  return { board: ring(s, 0, 0.6), well: ring(b, 0, 0.4), rim: ring(b, 0.54, 0.59) };
}

/**
 * THE MARKED PICTURES: a coin with a pictogram, or the unknown pathogen with its question mark.
 * `pic` is the half-width of the square the pictogram is drawn in and `face` the radius of what
 * it lies on, both as fractions of the picture's half-width. They are clay/pieces.py's own numbers
 * (ORGAN_R and ORGAN_PIC, ENTRY_R and ENTRY_PIC, MARK_PIC) times the board view's scale: a model
 * is drawn at 0.23 in a picture 0.9 wide.
 */
const MODEL = 0.23 / 0.45;
type MarkKind = 'organ' | 'entry' | 'unknown';
const markOf = (name: string): { kind: MarkKind; pic: number; face: number } | null =>
  name.startsWith('organ-')
    ? { kind: 'organ', pic: 0.95 * MODEL, face: 1.3 * MODEL }
    : name.startsWith('entry-')
      ? { kind: 'entry', pic: 0.826 * MODEL, face: 1.087 * MODEL }
      : name === 'unknown'
        ? { kind: 'unknown', pic: 0.88 * MODEL, face: 1.0 * MODEL }
        : null;

/** The pictogram's colour and its face's, read through the pictogram's own shape. */
async function marked(
  p: Pixels,
  shape: Buffer,
  m: { pic: number; face: number },
): Promise<{ pictogram: Rgb; face: Rgb }> {
  const size = Math.round(m.pic * p.width);
  const mask = await pixels(await sharp(shape).resize(size, size).png().toBuffer());
  const x0 = Math.round((p.width - size) / 2);
  const y0 = Math.round((p.height - size) / 2);
  const inMask = (x: number, y: number): number | null => {
    const mx = x - x0;
    const my = y - y0;
    if (mx < 0 || my < 0 || mx >= size || my >= size) return null;
    return mask.data[(my * size + mx) * 4 + 3] ?? 0;
  };
  // Well inside the pictogram, and well clear of it: the pixels along its outline are a blend.
  const pictogram = mean(p, (x, y, a) => a >= SOLID && (inMask(x, y) ?? 0) >= 250);
  const face = mean(p, (x, y, a) => {
    const d = Math.hypot(x - p.width / 2, y - p.height / 2) / (p.width / 2);
    return a >= SOLID && d <= m.face * 0.82 && (inMask(x, y) ?? 0) <= 2;
  });
  return { pictogram, face };
}

interface Measured {
  body: string;
  share: number;
  /** The most there is of anything along the picture's outermost pixels, 0 to 255. */
  edge: number;
  /** Each ground this picture is held to, and the ratio measured against it. */
  against: Record<string, number>;
}
interface Verdict {
  measured: Measured;
  failures: string[];
}
async function judge(
  name: string,
  input: Buffer,
  g: Grounds,
  /** The pictogram's shape, for a marked picture. Controls hand in their own. */
  shape: Buffer | null = null,
  /** The mark is found by its place in the picture, which is known only for the view from above. */
  view: View = 'board',
): Promise<Verdict> {
  const p = await pixels(input);
  const against: Record<string, number> = {};
  let colour: Rgb & { share: number };
  const m = view === 'board' ? markOf(name) : null;
  if (name === BASE) {
    colour = { ...g.rim, share: 0 };
    against['board'] = round2(contrast(g.rim, g.board));
  } else if (m && m.kind !== 'unknown') {
    // A gate with no shape has not found the pictogram, and must say so rather than pass.
    const mask = shape ?? (await pictogramPng(name, 512));
    const { pictogram, face } = await marked(p, mask, m);
    colour = { ...face, share: body(p).share };
    against['pictogram on its coin'] = round2(contrast(pictogram, face));
    if (m.kind === 'organ')
      against['pictogram on the board'] = round2(contrast(pictogram, g.board));
    else against['board'] = round2(contrast(face, g.board));
  } else {
    colour = body(p);
    if (CELLS.has(name)) against['well'] = round2(contrast(colour, g.well));
    else {
      against['board'] = round2(contrast(colour, g.board));
      against['well'] = round2(contrast(colour, g.well));
    }
    if (m) {
      const mask = shape ?? (await pictogramPng(name, 512));
      const { pictogram, face } = await marked(p, mask, m);
      against['mark on its body'] = round2(contrast(pictogram, face));
    }
  }
  const failures = Object.entries(against)
    .filter(([, v]) => v < MIN_CONTRAST)
    .map(([what, v]) => {
      // "the board" and "the well" are grounds; the rest name the pair measured.
      const said = what === 'board' || what === 'well' ? `against the ${what}` : `for its ${what}`;
      return `${name}: ${v.toFixed(2)}:1 ${said}, under ${MIN_CONTRAST}:1`;
    });
  const edge = edgeOf(p);
  if (edge > EDGE_MAX)
    failures.push(`${name}: CUT OFF AT ITS EDGE, ${edge} of 255 there, over ${EDGE_MAX}`);
  return { measured: { body: hex(colour), share: round2(colour.share), edge, against }, failures };
}

/**
 * THE EDGE. A render's soft shadow can reach the picture's edge, where it is cut off: seen on a
 * dark board it is nothing, seen on a cream card it is a faint box round the piece (found on the
 * kit page, 1 October 2026; the first renders measured up to 48 of 255 at the edge). `feather`
 * fades whatever lies in the outer tenth of the picture down to nothing at the edge itself, and
 * takes off the thin haze a shadow catcher leaves everywhere. `edgeOf` is what the gate reads.
 */
const EDGE_MAX = 3;
const FEATHER = 0.1;
const HAZE = 5;
function feather(p: Pixels, share = FEATHER): void {
  const band = Math.max(1, Math.round(p.width * share));
  for (let y = 0; y < p.height; y += 1)
    for (let x = 0; x < p.width; x += 1) {
      const i = (y * p.width + x) * 4 + 3;
      let a = p.data[i] ?? 0;
      if (a < SOLID) a = Math.max(0, a - HAZE) * (255 / (255 - HAZE));
      const d = Math.min(x, y, p.width - 1 - x, p.height - 1 - y) / band;
      if (d < 1) a *= d * d * (3 - 2 * d);
      p.data[i] = Math.round(a);
    }
}
function edgeOf(p: Pixels): number {
  let max = 0;
  for (let y = 0; y < p.height; y += 1)
    for (let x = 0; x < p.width; x += 1) {
      if (x > 0 && y > 0 && x < p.width - 1 && y < p.height - 1) continue;
      max = Math.max(max, p.data[(y * p.width + x) * 4 + 3] ?? 0);
    }
  return max;
}

const sha = (b: Buffer): string => createHash('sha256').update(b).digest('hex');
const names = (dir: string, ext: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(ext))
        .map((f) => f.slice(0, -ext.length))
        .sort()
    : [];

/** PNG from Blender -> lossless WebP, the committed input. */
async function ingest(): Promise<void> {
  let n = 0;
  for (const view of Object.keys(VIEWS) as View[]) {
    mkdirSync(join(RENDERS, view), { recursive: true });
    for (const name of names(join(PNG, view), '.png')) {
      const px = await pixels(readFileSync(join(PNG, view, `${name}.png`)));
      // The swatch is the board itself, solid to its edges on purpose.
      if (name !== SWATCH) feather(px);
      const out = await sharp(px.data, { raw: { width: px.width, height: px.height, channels: 4 } })
        .webp({ lossless: true, effort: 4 })
        .toBuffer();
      writeFileSync(join(RENDERS, view, `${name}.webp`), out);
      n += 1;
    }
  }
  const table = join(PNG, 'table', `${TABLE}.png`);
  if (existsSync(table)) {
    mkdirSync(join(RENDERS, 'table'), { recursive: true });
    const px = await pixels(readFileSync(table));
    // The board reaches nearly to the picture's edge, so only a thin band is faded: enough for
    // its shadow to end softly, and nowhere near the rim.
    feather(px, TABLE_FEATHER);
    const out = await sharp(px.data, { raw: { width: px.width, height: px.height, channels: 4 } })
      .webp({ lossless: true, effort: 4 })
      .toBuffer();
    writeFileSync(join(RENDERS, 'table', `${TABLE}.webp`), out);
    n += 1;
  }
  for (const name of names(join(PNG, 'scene'), '.png')) {
    mkdirSync(join(RENDERS, 'scene'), { recursive: true });
    const px = await pixels(readFileSync(join(PNG, 'scene', `${name}.png`)));
    feather(px, SCENE_FEATHER);
    const out = await sharp(px.data, { raw: { width: px.width, height: px.height, channels: 4 } })
      .webp({ lossless: true, effort: 4 })
      .toBuffer();
    writeFileSync(join(RENDERS, 'scene', `${name}.webp`), out);
    n += 1;
  }
  if (n === 0)
    throw new Error(
      `nothing under ${relative(HERE, PNG)}: render in Blender first (clay/pieces.py)`,
    );
  console.log(`ingested ${n} renders into ${relative(HERE, RENDERS)}`);
}

/**
 * THE BOARD'S OWN PICTURE (stage L4). It is not a piece: it is what the pieces are seen on, and
 * its lines are what a player follows. So it is read at the places geometry.json gives, the one
 * source of where things are, with the margin clay/board.py drew round them.
 */
const TABLE = 'board';
const TABLE_WIDTH = 400;
const TABLE_SCALES = [1, 2, 3, 5];
const TABLE_FEATHER = 0.012;
/** How far the board's ground may sit from the swatch the pieces were measured on. */
const GROUND_DRIFT = 1.15;
type Pt = { x: number; y: number };
interface Geometry {
  VIEWBOX: { x: number; y: number; w: number; h: number };
  HUB: Pt;
  ORGAN_POS: Record<string, Pt>;
  ROUTE: Record<string, Record<string, Pt>>;
  BRANCH: Record<string, Record<string, Pt>>;
}
const REPO = join(HERE, '../..');
const geometry = (): Geometry =>
  JSON.parse(
    readFileSync(join(REPO, 'packages/content/src/board/geometry.json'), 'utf8'),
  ) as Geometry;
const rules = (): { LYMPH_GROUP: Record<string, string | null>; LYMPH_STEP: number } =>
  JSON.parse(readFileSync(join(REPO, 'packages/content/src/rules/board.json'), 'utf8')) as {
    LYMPH_GROUP: Record<string, string | null>;
    LYMPH_STEP: number;
  };
/** A number clay/board.py wrote down, read from that file so there is one place it is written. */
function boardPy(name: string): number {
  const m = new RegExp(`^${name} = ([0-9.]+)`, 'm').exec(
    readFileSync(join(CLAY, 'board.py'), 'utf8'),
  );
  if (!m?.[1]) throw new Error(`clay/board.py names no ${name}`);
  return Number(m[1]);
}

async function judgeTable(input: Buffer, g: Grounds): Promise<Verdict> {
  const p = await pixels(input);
  const geo = geometry();
  const rule = rules();
  const pad = boardPy('PAD');
  const perUnit = p.width / (geo.VIEWBOX.w + pad * 2);
  /** Mean colour within `r` board units of a board position. */
  const at = (c: Pt, r: number): Rgb => {
    const cx = (c.x - (geo.VIEWBOX.x - pad)) * perUnit;
    const cy = (c.y - (geo.VIEWBOX.y - pad)) * perUnit;
    return mean(p, (x, y, a) => a >= SOLID && Math.hypot(x - cx, y - cy) <= r * perUnit);
  };
  const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const angle = (c: Pt): number => Math.atan2(c.y - geo.HUB.y, c.x - geo.HUB.x);
  const polar = (rad: number, th: number): Pt => ({
    x: geo.HUB.x + rad * Math.cos(th),
    y: geo.HUB.y + rad * Math.sin(th),
  });

  // THE GROUND: bare board half way between each pair of neighbouring branches, out where they
  // have spread apart. Read in several places because the lamps do not light it evenly.
  const ends = Object.values(geo.ORGAN_POS).sort((a, b) => angle(a) - angle(b));
  const bare: Rgb[] = [];
  ends.slice(1).forEach((b, i) => {
    const a = ends[i];
    if (!a) return;
    const rad = Math.hypot(a.x - geo.HUB.x, a.y - geo.HUB.y) * 0.9;
    bare.push(at(polar(rad, (angle(a) + angle(b)) / 2), 6));
  });
  if (bare.length === 0) throw new Error('no bare board was found to measure the lines against');
  const ground = {
    r: bare.reduce((n, c) => n + c.r, 0) / bare.length,
    g: bare.reduce((n, c) => n + c.g, 0) / bare.length,
    b: bare.reduce((n, c) => n + c.b, 0) / bare.length,
  };
  /** The WORST of a set against the ground: one faint route is a route a player cannot follow. */
  const worst = (colours: Rgb[]): number =>
    round2(Math.min(...colours.map((c) => contrast(c, ground))));
  const stepsOf = (t: Record<string, Pt>): Pt[] =>
    Object.keys(t)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => t[k])
      .filter((c): c is Pt => c !== undefined);
  const between = (t: Record<string, Pt>): Pt[] => {
    const st = stepsOf(t);
    return st.slice(1).map((b, i) => mid(st[i] ?? b, b));
  };
  const routeLines = Object.values(geo.ROUTE).flatMap((t) => between(t).map((c) => at(c, 2.5)));
  const branchLines = Object.values(geo.BRANCH).flatMap((t) => between(t).map((c) => at(c, 2.5)));
  const lymph: Rgb[] = [];
  const steps: Rgb[] = [];
  for (const [lane, t] of Object.entries(geo.ROUTE))
    for (const [k, c] of Object.entries(t))
      (rule.LYMPH_GROUP[lane] && Number(k) === rule.LYMPH_STEP ? lymph : steps).push(at(c, 5));
  for (const t of Object.values(geo.BRANCH)) for (const c of Object.values(t)) steps.push(at(c, 5));
  for (const c of Object.values(geo.ORGAN_POS)) steps.push(at(c, 5));
  const rimAt = (boardPy('HUB_R') + boardPy('HUB_WELL_R')) / 2;
  const rim = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => at(polar(rimAt, (i * Math.PI) / 4 + 0.2), 1.5));

  const against: Record<string, number> = {
    'routes on the board': worst(routeLines),
    'branches on the board': worst(branchLines),
    'steps on the board': worst(steps),
    'lymph nodes on the board': worst(lymph),
    "bloodstream's rim on the board": worst(rim),
  };
  const failures = Object.entries(against)
    .filter(([, v]) => v < MIN_CONTRAST)
    .map(([what, v]) => `${TABLE}: ${v.toFixed(2)}:1 for its ${what}, under ${MIN_CONTRAST}:1`);
  // The pieces were measured against the swatch. The board they are seen on must be that ground.
  const drift = round2(contrast(ground, g.board));
  if (drift > GROUND_DRIFT)
    failures.push(
      `${TABLE}: THE BOARD IS NOT THE GROUND THE PIECES WERE MEASURED ON, ${hex(ground)} here and ${hex(g.board)} in the swatch, ${drift}:1 apart, over ${GROUND_DRIFT}:1`,
    );
  const edge = edgeOf(p);
  if (edge > EDGE_MAX)
    failures.push(`${TABLE}: CUT OFF AT ITS EDGE, ${edge} of 255 there, over ${EDGE_MAX}`);
  return {
    measured: { body: hex(ground), share: round2(body(p).share), edge, against },
    failures,
  };
}

/**
 * A SCENE (stage L5): a picture of the pieces, for a screen that is not the board. The title's is
 * the first. It tells a player nothing they must read to play: no state, no control, no choice. So
 * it is NOT held to 3:1, and the run says how many pictures were held to what, so that a scene is
 * never counted among the pictures measured for contrast. What it is held to:
 *
 *   NOT CUT OFF AT ITS EDGE   it stands on the page's own ground, and a shadow or a piece that
 *                             reaches the picture's edge shows as a straight line across the screen
 *   SOMETHING IS IN IT        a render that came out empty is refused, not shipped as a clear picture
 */
const SCENE_WIDTH = 360;
const SCENE_FEATHER = 0.03;
const SCENE_MIN_SHARE = 0.2;
async function judgeScene(name: string, input: Buffer): Promise<Verdict> {
  const p = await pixels(input);
  const b = body(p);
  const edge = edgeOf(p);
  const failures: string[] = [];
  if (edge > EDGE_MAX)
    failures.push(`${name}: CUT OFF AT ITS EDGE, ${edge} of 255 there, over ${EDGE_MAX}`);
  if (b.share < SCENE_MIN_SHARE)
    failures.push(
      `${name}: NOTHING IS IN IT, ${round2(b.share)} of the picture is solid, under ${SCENE_MIN_SHARE}`,
    );
  return { measured: { body: hex(b), share: round2(b.share), edge, against: {} }, failures };
}

const kindOf = (name: string): Asset['kind'] =>
  name === BASE
    ? 'base'
    : CELLS.has(name)
      ? 'cell'
      : name.startsWith('organ-')
        ? 'organ'
        : name.startsWith('entry-')
          ? 'entry'
          : 'invader';

interface Asset {
  view: View | 'table' | 'scene';
  kind: 'cell' | 'invader' | 'base' | 'organ' | 'entry' | 'board' | 'scene';
  displayPx: number;
  measured: Measured;
  source: { file: string; sha256: string };
  files: Record<string, { file: string; px: number; bytes: number; sha256: string }>;
}

async function build(
  outDir: string,
): Promise<{ assets: number; files: number; bytes: number; failures: string[] }> {
  const read = (view: View, name: string): Buffer | null => {
    const f = join(RENDERS, view, `${name}.webp`);
    return existsSync(f) ? readFileSync(f) : null;
  };
  const g = await grounds((name) => read('board', name));
  const failures: string[] = [];
  const assets: Record<string, Asset> = {};
  let files = 0;
  let bytes = 0;
  rmSync(outDir, { recursive: true, force: true });
  for (const view of Object.keys(VIEWS) as View[]) {
    mkdirSync(join(outDir, view), { recursive: true });
    for (const name of names(join(RENDERS, view), '.webp')) {
      if (name === SWATCH) continue; // measured, never shipped
      const input = read(view, name);
      if (!input) continue;
      const v = await judge(name, input, g, null, view);
      failures.push(...v.failures.map((f) => `[${view}] ${f}`));
      const displayPx = VIEWS[view];
      const out: Asset['files'] = {};
      for (const scale of [1, 2, 3]) {
        const px = displayPx * scale;
        const buf = await sharp(input)
          .resize(px, px, { kernel: 'lanczos3' })
          .webp({ quality: 88, alphaQuality: 100, effort: 4 })
          .toBuffer();
        const file = `${name}@${scale}x.webp`;
        writeFileSync(join(outDir, view, file), buf);
        out[`${scale}x`] = { file: `${view}/${file}`, px, bytes: buf.length, sha256: sha(buf) };
        files += 1;
        bytes += buf.length;
      }
      assets[`${view}/${name}`] = {
        view,
        kind: kindOf(name),
        displayPx,
        measured: v.measured,
        source: { file: `renders/${view}/${name}.webp`, sha256: sha(input) },
        files: out,
      };
    }
  }
  const tableFile = join(RENDERS, 'table', `${TABLE}.webp`);
  if (existsSync(tableFile)) {
    const input = readFileSync(tableFile);
    const v = await judgeTable(input, g);
    failures.push(...v.failures.map((x) => `[table] ${x}`));
    mkdirSync(join(outDir, 'table'), { recursive: true });
    const out: Asset['files'] = {};
    // The fourth size is for when the camera has moved in (stage L4): the board is then drawn up
    // to 1.8 times larger, and at three device px to one that is 1,944 px across on a 360 px phone.
    for (const scale of TABLE_SCALES) {
      const px = TABLE_WIDTH * scale;
      const buf = await sharp(input)
        .resize({ width: px, kernel: 'lanczos3' })
        .webp({ quality: 88, alphaQuality: 100, effort: 4 })
        .toBuffer();
      const file = `${TABLE}@${scale}x.webp`;
      writeFileSync(join(outDir, 'table', file), buf);
      out[`${scale}x`] = { file: `table/${file}`, px, bytes: buf.length, sha256: sha(buf) };
      files += 1;
      bytes += buf.length;
    }
    assets[`table/${TABLE}`] = {
      view: 'table',
      kind: 'board',
      displayPx: TABLE_WIDTH,
      measured: v.measured,
      source: { file: `renders/table/${TABLE}.webp`, sha256: sha(input) },
      files: out,
    };
  }
  for (const name of names(join(RENDERS, 'scene'), '.webp')) {
    const input = readFileSync(join(RENDERS, 'scene', `${name}.webp`));
    const v = await judgeScene(name, input);
    failures.push(...v.failures.map((x) => `[scene] ${x}`));
    mkdirSync(join(outDir, 'scene'), { recursive: true });
    const out: Asset['files'] = {};
    for (const scale of [1, 2, 3]) {
      const px = SCENE_WIDTH * scale;
      const buf = await sharp(input)
        .resize({ width: px, kernel: 'lanczos3' })
        .webp({ quality: 86, alphaQuality: 100, effort: 4 })
        .toBuffer();
      const file = `${name}@${scale}x.webp`;
      writeFileSync(join(outDir, 'scene', file), buf);
      out[`${scale}x`] = { file: `scene/${file}`, px, bytes: buf.length, sha256: sha(buf) };
      files += 1;
      bytes += buf.length;
    }
    assets[`scene/${name}`] = {
      view: 'scene',
      kind: 'scene',
      displayPx: SCENE_WIDTH,
      measured: v.measured,
      source: { file: `renders/scene/${name}.webp`, sha256: sha(input) },
      files: out,
    };
  }
  const manifest = {
    generator: 'tools/art-pipeline/clay.ts',
    minContrast: MIN_CONTRAST,
    grounds: { board: hex(g.board), well: hex(g.well), rim: hex(g.rim) },
    provenance: {
      tool: 'Blender, Cycles; modelled and rendered by tools/art-pipeline/clay/pieces.py',
      date: '2026-10-01',
      account: 'none: free software, no service used',
      tosChecked: 'not applicable',
      redistribution: 'none declared, as for all content; nothing in the origin restricts it',
    },
    assets: Object.fromEntries(Object.entries(assets).sort(([a], [b]) => a.localeCompare(b))),
  };
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { assets: Object.keys(assets).length, files, bytes, failures };
}

/** A flat disc of one colour on a clear ground, as a render would be. */
async function synthetic(colour: Rgb): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><circle cx="60" cy="60" r="40" fill="rgb(${Math.round(colour.r)},${Math.round(colour.g)},${Math.round(colour.b)})"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function control(): Promise<boolean> {
  const read = (name: string): Buffer | null => {
    const f = join(RENDERS, 'board', `${name}.webp`);
    return existsSync(f) ? readFileSync(f) : null;
  };
  const g = await grounds(read);
  let ok = true;
  const line = (name: string, good: boolean, detail: string): void => {
    console.log(`  ${good ? 'ok  ' : 'FAIL'}  ${name}: ${detail}`);
    if (!good) ok = false;
  };
  const drab = await judge('control-invader', await synthetic(g.board), g);
  line(
    'mustFail, a piece the colour of the board',
    drab.failures.length > 0,
    `${drab.measured.against['board']}:1 against the board, ${drab.failures.length > 0 ? 'rejected' : 'ACCEPTED'}`,
  );
  const cream = await judge('control-invader', await synthetic({ r: 244, g: 232, b: 210 }), g);
  line(
    'mustPass, a cream piece',
    cream.failures.length === 0,
    `${cream.measured.against['board']}:1 against the board, ${cream.failures.length === 0 ? 'accepted' : 'REJECTED'}`,
  );
  // A piece that reads well against the board and whose shadow runs off the picture. It must be
  // rejected FOR THE EDGE: the first version of this control had nothing solid in it, and was
  // refused for that instead, which demonstrated nothing about the edge rule.
  const cut = await sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="rgb(0,0,0)" fill-opacity="0.4"/><circle cx="60" cy="60" r="40" fill="rgb(244,232,210)"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  const boxed = await judge('control-invader', cut, g);
  const forEdge =
    boxed.failures.length === 1 && (boxed.failures[0] ?? '').includes('CUT OFF AT ITS EDGE');
  line(
    'mustFail, a picture cut off at its edge',
    forEdge,
    `${boxed.measured.edge} of 255 at the edge, ${boxed.measured.against['board']}:1 against the board, ${forEdge ? 'rejected for its edge' : 'NOT REJECTED FOR ITS EDGE'}`,
  );
  let refused = false;
  try {
    await grounds((name) => (name === SWATCH ? null : read(name)));
  } catch {
    refused = true;
  }
  line(
    'mustFail, a set with no board swatch',
    refused,
    refused ? 'refused to measure' : 'MEASURED AGAINST NOTHING',
  );

  // A COIN, made here: a flat face with the heart's pictogram laid on it where pieces.py lays it.
  const coin = async (face: Rgb, pictogram: Rgb): Promise<Buffer> => {
    const size = 300;
    const m = markOf('organ-heart');
    if (!m) throw new Error('the control has no coin to make');
    const side = Math.round(m.pic * size);
    const rgb = (c: Rgb): string => `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;
    const shape = await sharp(await pictogramPng('organ-heart', side))
      .ensureAlpha()
      .raw()
      .toBuffer();
    for (let i = 0; i < shape.length; i += 4) {
      shape[i] = Math.round(pictogram.r);
      shape[i + 1] = Math.round(pictogram.g);
      shape[i + 2] = Math.round(pictogram.b);
    }
    const tinted = await sharp(shape, { raw: { width: side, height: side, channels: 4 } })
      .png()
      .toBuffer();
    const disc = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${(m.face * size) / 2}" fill="${rgb(face)}"/></svg>`;
    return sharp(Buffer.from(disc))
      .composite([{ input: tinted }])
      .png()
      .toBuffer();
  };
  const dark = { r: 150, g: 60, b: 60 };
  const blank = await judge('organ-heart', await coin(dark, dark), g);
  // It fails twice over (a dark pictogram is also lost on the board); what is asked is that one
  // of the reasons given is the pictogram on its own coin.
  const forMark = blank.failures.some((x) => x.includes('pictogram on its coin'));
  line(
    'mustFail, a coin whose pictogram is the colour of its face',
    forMark,
    `${blank.measured.against['pictogram on its coin']}:1 for the pictogram on its coin, ${forMark ? 'rejected for it' : 'NOT REJECTED FOR IT'}`,
  );
  const clear = await judge('organ-heart', await coin(dark, { r: 255, g: 246, b: 234 }), g);
  line(
    'mustPass, a cream pictogram on a dark coin',
    clear.failures.length === 0,
    `${clear.measured.against['pictogram on its coin']}:1 for the pictogram on its coin, ${clear.failures.length === 0 ? 'accepted' : 'REJECTED'}`,
  );

  // A BOARD, made here: one flat colour. It has no route, no branch and no step to follow.
  const flat = async (c: Rgb): Promise<Buffer> =>
    sharp({
      create: {
        width: 600,
        height: 591,
        channels: 4,
        background: { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  const bare = await judgeTable(await flat(g.board), g);
  const noRoutes = bare.failures.some((x) => x.includes('routes on the board'));
  line(
    'mustFail, a board with nothing drawn on it',
    noRoutes,
    `${bare.measured.against['routes on the board']}:1 for its routes, ${noRoutes ? 'rejected for them' : 'NOT REJECTED FOR THEM'}`,
  );
  const pale = await judgeTable(await flat({ r: 120, g: 160, b: 165 }), g);
  const drifted = pale.failures.some((x) =>
    x.includes('NOT THE GROUND THE PIECES WERE MEASURED ON'),
  );
  line(
    'mustFail, a board that is not the colour the pieces were measured on',
    drifted,
    drifted ? 'rejected for its ground' : 'NOT REJECTED FOR ITS GROUND',
  );
  const tableFile = join(RENDERS, 'table', `${TABLE}.webp`);
  if (existsSync(tableFile)) {
    const real = await judgeTable(readFileSync(tableFile), g);
    line(
      'mustPass, the board as rendered',
      real.failures.length === 0,
      `routes ${real.measured.against['routes on the board']}:1, steps ${real.measured.against['steps on the board']}:1, ${real.failures.length === 0 ? 'accepted' : 'REJECTED'}`,
    );
  }

  // A SCENE, made here (stage L5). It is held to its edge and to having something in it, and to
  // nothing else: a scene the colour of the board is accepted, which a piece would not be.
  const scene = async (inner: string): Promise<Buffer> =>
    sharp(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="320">${inner}</svg>`,
      ),
    )
      .png()
      .toBuffer();
  const boardRgb = `rgb(${Math.round(g.board.r)},${Math.round(g.board.g)},${Math.round(g.board.b)})`;
  const whole = await judgeScene(
    'control-scene',
    await scene(`<ellipse cx="180" cy="160" rx="150" ry="120" fill="${boardRgb}"/>`),
  );
  line(
    'mustPass, a scene the colour of the board, clear of its edge',
    whole.failures.length === 0,
    `${whole.measured.edge} of 255 at the edge, ${whole.measured.share} of it solid, ${whole.failures.length === 0 ? 'accepted' : 'REJECTED'}`,
  );
  const cutScene = await judgeScene(
    'control-scene',
    await scene(`<ellipse cx="180" cy="160" rx="200" ry="120" fill="${boardRgb}"/>`),
  );
  const sceneForEdge =
    cutScene.failures.length === 1 && (cutScene.failures[0] ?? '').includes('CUT OFF AT ITS EDGE');
  line(
    'mustFail, a scene that runs off the picture',
    sceneForEdge,
    `${cutScene.measured.edge} of 255 at the edge, ${sceneForEdge ? 'rejected for its edge' : 'NOT REJECTED FOR ITS EDGE'}`,
  );
  const speck = await judgeScene(
    'control-scene',
    await scene(`<circle cx="180" cy="160" r="20" fill="${boardRgb}"/>`),
  );
  const forEmpty =
    speck.failures.length === 1 && (speck.failures[0] ?? '').includes('NOTHING IS IN IT');
  line(
    'mustFail, a scene with next to nothing in it',
    forEmpty,
    `${speck.measured.share} of it solid, ${forEmpty ? 'rejected for it' : 'NOT REJECTED FOR IT'}`,
  );
  return ok;
}

function compare(a: string, b: string): string[] {
  const diffs: string[] = [];
  const list = (dir: string): string[] => {
    const out: string[] = [];
    for (const e of readdirSync(dir, { withFileTypes: true }))
      if (e.isDirectory()) out.push(...list(join(dir, e.name)).map((f) => `${e.name}/${f}`));
      else out.push(e.name);
    return out.sort();
  };
  const fa = existsSync(a) ? list(a) : [];
  const fb = list(b);
  for (const f of new Set([...fa, ...fb])) {
    if (!fa.includes(f)) diffs.push(`missing from the committed output: ${f}`);
    else if (!fb.includes(f)) diffs.push(`committed but not produced: ${f}`);
    else if (!readFileSync(join(a, f)).equals(readFileSync(join(b, f))))
      diffs.push(`differs: ${f}`);
  }
  return diffs;
}

/**
 * `--check`: THE HALF THAT RUNS ON EVERY `pnpm verify` AND IN CI. It encodes nothing, so it is
 * quick and gives the same answer on any machine: it re-measures every committed render, holds it
 * to the gate, and requires the committed manifest and output to be what those renders produce.
 *
 *   CONTRAST GATE                              a picture is under 3:1 against its ground
 *   MANIFEST RECORDS WHAT WAS NOT MEASURED     a number in the manifest is not the one measured
 *   A RENDER IS NOT IN THE MANIFEST            a piece was rendered and never built
 *   OUTPUT IS NOT WHAT THE MANIFEST RECORDS    an output file is missing or is not the recorded one
 *   THE KIT'S COLOUR IS NOT THE MEASURED ONE   the kit's board or well is not what the renders measure
 *
 * Without it the gate is a script somebody may or may not run before committing a new piece.
 * Controls: pnpm ci:selftest clay-gate-reads-the-pictures, clay-manifest-not-measured,
 * clay-output-not-recorded.
 */
async function check(): Promise<{
  problems: string[];
  pictures: number;
  scenes: number;
  files: number;
}> {
  const problems: string[] = [];
  const manifestPath = join(OUT, 'manifest.json');
  if (!existsSync(manifestPath))
    return {
      problems: ['OUTPUT IS NOT WHAT THE MANIFEST RECORDS: there is no manifest'],
      pictures: 0,
      scenes: 0,
      files: 0,
    };
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    minContrast: number;
    grounds: Record<string, string>;
    assets: Record<string, Asset>;
  };
  const read = (view: View, name: string): Buffer | null => {
    const f = join(RENDERS, view, `${name}.webp`);
    return existsSync(f) ? readFileSync(f) : null;
  };
  const g = await grounds((name) => read('board', name));
  const measuredGrounds = { board: hex(g.board), well: hex(g.well), rim: hex(g.rim) };
  if (JSON.stringify(measuredGrounds) !== JSON.stringify(manifest.grounds))
    problems.push(
      `MANIFEST RECORDS WHAT WAS NOT MEASURED: the grounds are ${JSON.stringify(measuredGrounds)}, the manifest says ${JSON.stringify(manifest.grounds)}`,
    );
  if (manifest.minContrast !== MIN_CONTRAST)
    problems.push(
      `MANIFEST RECORDS WHAT WAS NOT MEASURED: built against ${manifest.minContrast}:1, the gate is ${MIN_CONTRAST}:1`,
    );
  const seen = new Set<string>();
  let files = 0;
  for (const view of Object.keys(VIEWS) as View[])
    for (const name of names(join(RENDERS, view), '.webp')) {
      if (name === SWATCH) continue;
      const key = `${view}/${name}`;
      seen.add(key);
      const input = read(view, name);
      const asset = manifest.assets[key];
      if (!input) continue;
      const v = await judge(name, input, g, null, view);
      if (v.failures.length > 0)
        problems.push(...v.failures.map((f) => `CONTRAST GATE: [${view}] ${f}`));
      if (!asset) {
        problems.push(`A RENDER IS NOT IN THE MANIFEST: ${key}`);
        continue;
      }
      if (JSON.stringify(asset.measured) !== JSON.stringify(v.measured))
        problems.push(
          `MANIFEST RECORDS WHAT WAS NOT MEASURED: ${key} measures ${JSON.stringify(v.measured)}, the manifest says ${JSON.stringify(asset.measured)}`,
        );
      if (asset.source.sha256 !== sha(input))
        problems.push(
          `MANIFEST RECORDS WHAT WAS NOT MEASURED: ${key} was built from a different render`,
        );
      for (const out of Object.values(asset.files)) {
        const f = join(OUT, out.file);
        files += 1;
        if (!existsSync(f))
          problems.push(`OUTPUT IS NOT WHAT THE MANIFEST RECORDS: ${out.file} is missing`);
        else if (sha(readFileSync(f)) !== out.sha256)
          problems.push(
            `OUTPUT IS NOT WHAT THE MANIFEST RECORDS: ${out.file} is not the file that was built`,
          );
      }
    }
  // The kit writes the board's and the well's colours down so the page round the board can
  // match it (packages/ui/src/kit/tokens.ts). They are measured values, and must stay the measured ones.
  const tokens = readFileSync(join(HERE, '../../packages/ui/src/kit/tokens.ts'), 'utf8');
  for (const ground of ['board', 'well'] as const) {
    const m = new RegExp(`^\\s*${ground}: '(#[0-9a-fA-F]{6})'`, 'm').exec(tokens);
    if (!m?.[1])
      problems.push(`THE KIT'S COLOUR IS NOT THE MEASURED ONE: tokens.ts names no ${ground}`);
    else if (m[1].toLowerCase() !== measuredGrounds[ground])
      problems.push(
        `THE KIT'S COLOUR IS NOT THE MEASURED ONE: tokens.ts has the ${ground} as ${m[1]}, the renders measure ${measuredGrounds[ground]}`,
      );
  }
  const tableFile = join(RENDERS, 'table', `${TABLE}.webp`);
  if (existsSync(tableFile)) {
    const key = `table/${TABLE}`;
    seen.add(key);
    const input = readFileSync(tableFile);
    const asset = manifest.assets[key];
    const v = await judgeTable(input, g);
    problems.push(...v.failures.map((x) => `CONTRAST GATE: [table] ${x}`));
    if (!asset) problems.push(`A RENDER IS NOT IN THE MANIFEST: ${key}`);
    else {
      if (JSON.stringify(asset.measured) !== JSON.stringify(v.measured))
        problems.push(
          `MANIFEST RECORDS WHAT WAS NOT MEASURED: ${key} measures ${JSON.stringify(v.measured)}, the manifest says ${JSON.stringify(asset.measured)}`,
        );
      if (asset.source.sha256 !== sha(input))
        problems.push(
          `MANIFEST RECORDS WHAT WAS NOT MEASURED: ${key} was built from a different render`,
        );
      for (const out of Object.values(asset.files)) {
        const file = join(OUT, out.file);
        files += 1;
        if (!existsSync(file))
          problems.push(`OUTPUT IS NOT WHAT THE MANIFEST RECORDS: ${out.file} is missing`);
        else if (sha(readFileSync(file)) !== out.sha256)
          problems.push(
            `OUTPUT IS NOT WHAT THE MANIFEST RECORDS: ${out.file} is not the file that was built`,
          );
      }
    }
  }
  let scenes = 0;
  for (const name of names(join(RENDERS, 'scene'), '.webp')) {
    const key = `scene/${name}`;
    seen.add(key);
    scenes += 1;
    const input = readFileSync(join(RENDERS, 'scene', `${name}.webp`));
    const asset = manifest.assets[key];
    const v = await judgeScene(name, input);
    problems.push(...v.failures.map((x) => `SCENE GATE: [scene] ${x}`));
    if (!asset) problems.push(`A RENDER IS NOT IN THE MANIFEST: ${key}`);
    else {
      if (JSON.stringify(asset.measured) !== JSON.stringify(v.measured))
        problems.push(
          `MANIFEST RECORDS WHAT WAS NOT MEASURED: ${key} measures ${JSON.stringify(v.measured)}, the manifest says ${JSON.stringify(asset.measured)}`,
        );
      if (asset.source.sha256 !== sha(input))
        problems.push(
          `MANIFEST RECORDS WHAT WAS NOT MEASURED: ${key} was built from a different render`,
        );
      for (const out of Object.values(asset.files)) {
        const file = join(OUT, out.file);
        files += 1;
        if (!existsSync(file))
          problems.push(`OUTPUT IS NOT WHAT THE MANIFEST RECORDS: ${out.file} is missing`);
        else if (sha(readFileSync(file)) !== out.sha256)
          problems.push(
            `OUTPUT IS NOT WHAT THE MANIFEST RECORDS: ${out.file} is not the file that was built`,
          );
      }
    }
  }
  for (const key of Object.keys(manifest.assets))
    if (!seen.has(key))
      problems.push(`MANIFEST RECORDS WHAT WAS NOT MEASURED: ${key} has no render`);
  return { problems, pictures: seen.size - scenes, scenes, files };
}

const arg = (flag: string): boolean => process.argv.includes(flag);
if (arg('--pictograms')) {
  // What clay/pieces.py lays on the coins. Not committed: they are remade from pictograms.ts.
  mkdirSync(join(PNG, 'tex'), { recursive: true });
  for (const name of Object.keys(PICTOGRAMS))
    writeFileSync(join(PNG, 'tex', `${name}.png`), await pictogramPng(name, 512));
  console.log(
    `wrote ${Object.keys(PICTOGRAMS).length} pictograms into ${relative(HERE, join(PNG, 'tex'))}`,
  );
} else if (arg('--ingest')) {
  await ingest();
} else if (arg('--check')) {
  const r = await check();
  if (r.problems.length > 0) {
    console.error(`clay check: ${r.problems.length} problem(s)`);
    for (const p of r.problems.slice(0, 30)) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(
    `clay check: ${r.pictures} pictures re-measured from their renders, every one at ${MIN_CONTRAST}:1 or better against its ground; ${r.scenes} scene${r.scenes === 1 ? '' : 's'}, held to its edge and not to contrast; the manifest records what was measured, and its ${r.files} output files are the ones built`,
  );
} else if (arg('--control')) {
  console.log('clay gate controls');
  if (!(await control())) {
    console.error('A CONTROL DID NOT BEHAVE: the gate is not to be trusted until it does.');
    process.exit(1);
  }
} else {
  const verify = arg('--verify');
  const dir = verify ? join(tmpdir(), `iw-clay-${process.pid}`) : OUT;
  const r = await build(dir);
  if (r.failures.length > 0) {
    console.error(`CONTRAST GATE: ${r.failures.length} failure(s)`);
    for (const f of r.failures) console.error(`  ${f}`);
    if (verify) rmSync(dir, { recursive: true, force: true });
    process.exit(1);
  }
  if (verify) {
    const diffs = compare(OUT, dir);
    rmSync(dir, { recursive: true, force: true });
    if (diffs.length > 0) {
      console.error(
        `VERIFY: the committed output is not what the renders produce (${diffs.length})`,
      );
      for (const d of diffs.slice(0, 20)) console.error(`  ${d}`);
      process.exit(1);
    }
    console.log(
      `verify: ${r.assets} pictures, ${r.files} files, byte-identical to the committed output`,
    );
  } else {
    console.log(
      `built ${r.assets} pictures as ${r.files} files, ${(r.bytes / 1024).toFixed(0)} KB, into ${relative(HERE, OUT)}; every piece, coin and board at ${MIN_CONTRAST}:1 or better against its ground, and every scene clear of its edge`,
    );
  }
}
