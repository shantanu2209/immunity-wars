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
 *   mustFail  a set with NO board swatch must be REJECTED, never passed for want of a ground
 *
 * Usage:
 *   pnpm art:clay --ingest     clay/_png/ (Blender's output, not committed) -> clay/renders/
 *   pnpm art:clay              gate, and build clay/out/ with its manifest
 *   pnpm art:clay --control    run the gate's controls, build nothing
 *   pnpm art:clay --check      re-measure and compare, encode nothing (on every `pnpm verify`)
 *   pnpm art:clay --verify     rebuild to a temp dir, byte-compare with the committed clay/out/
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLAY = join(HERE, 'clay');
const PNG = join(CLAY, '_png');
const RENDERS = join(CLAY, 'renders');
/**
 * The output's home for now. It moves under the app when the kit page that shows it is built
 * (the next pull request), together with the rule that keeps it out of the players' download
 * until a screen uses it. Until something consumes it, it does not ship.
 */
const OUT = join(CLAY, 'out');

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

interface Measured {
  body: string;
  share: number;
  /** Each ground this picture is held to, and the ratio measured against it. */
  against: Record<string, number>;
}
interface Verdict {
  measured: Measured;
  failures: string[];
}
async function judge(name: string, input: Buffer, g: Grounds): Promise<Verdict> {
  const p = await pixels(input);
  const against: Record<string, number> = {};
  let colour: Rgb & { share: number };
  if (name === BASE) {
    colour = { ...g.rim, share: 0 };
    against['board'] = round2(contrast(g.rim, g.board));
  } else {
    colour = body(p);
    if (CELLS.has(name)) against['well'] = round2(contrast(colour, g.well));
    else {
      against['board'] = round2(contrast(colour, g.board));
      against['well'] = round2(contrast(colour, g.well));
    }
  }
  const failures = Object.entries(against)
    .filter(([, v]) => v < MIN_CONTRAST)
    .map(
      ([ground, v]) => `${name}: ${v.toFixed(2)}:1 against the ${ground}, under ${MIN_CONTRAST}:1`,
    );
  return { measured: { body: hex(colour), share: round2(colour.share), against }, failures };
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
      const out = await sharp(readFileSync(join(PNG, view, `${name}.png`)))
        .webp({ lossless: true, effort: 4 })
        .toBuffer();
      writeFileSync(join(RENDERS, view, `${name}.webp`), out);
      n += 1;
    }
  }
  if (n === 0)
    throw new Error(
      `nothing under ${relative(HERE, PNG)}: render in Blender first (clay/pieces.py)`,
    );
  console.log(`ingested ${n} renders into ${relative(HERE, RENDERS)}`);
}

interface Asset {
  view: View;
  kind: 'cell' | 'invader' | 'base';
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
      const v = await judge(name, input, g);
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
        kind: name === BASE ? 'base' : CELLS.has(name) ? 'cell' : 'invader',
        displayPx,
        measured: v.measured,
        source: { file: `renders/${view}/${name}.webp`, sha256: sha(input) },
        files: out,
      };
    }
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
 *
 * Without it the gate is a script somebody may or may not run before committing a new piece.
 * Controls: pnpm ci:selftest clay-gate-reads-the-pictures, clay-manifest-not-measured,
 * clay-output-not-recorded.
 */
async function check(): Promise<{ problems: string[]; pictures: number; files: number }> {
  const problems: string[] = [];
  const manifestPath = join(OUT, 'manifest.json');
  if (!existsSync(manifestPath))
    return {
      problems: ['OUTPUT IS NOT WHAT THE MANIFEST RECORDS: there is no manifest'],
      pictures: 0,
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
      const v = await judge(name, input, g);
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
  for (const key of Object.keys(manifest.assets))
    if (!seen.has(key))
      problems.push(`MANIFEST RECORDS WHAT WAS NOT MEASURED: ${key} has no render`);
  return { problems, pictures: seen.size, files };
}

const arg = (flag: string): boolean => process.argv.includes(flag);
if (arg('--ingest')) {
  await ingest();
} else if (arg('--check')) {
  const r = await check();
  if (r.problems.length > 0) {
    console.error(`clay check: ${r.problems.length} problem(s)`);
    for (const p of r.problems.slice(0, 30)) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(
    `clay check: ${r.pictures} pictures re-measured from their renders, every one at ${MIN_CONTRAST}:1 or better against its ground; the manifest records what was measured, and its ${r.files} output files are the ones built`,
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
      `built ${r.assets} pictures as ${r.files} files, ${(r.bytes / 1024).toFixed(0)} KB, into ${relative(HERE, OUT)}; every one at ${MIN_CONTRAST}:1 or better against its ground`,
    );
  }
}
