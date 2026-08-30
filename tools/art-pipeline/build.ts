/**
 * P2.4 art pipeline — raw generated art in, board-ready WebP + manifest out.
 *
 * For every asset in ASSETS below (the 29 of `raw/`):
 *   1. KEY the background: BFS flood-fill from the image borders over near-neutral light
 *      pixels (white, the drawn checkerboard, pale plates) → alpha 0. Enclosed light paint
 *      (nuclei, skulls, highlights) is unreachable from the border and survives — this is why
 *      the key is a flood and NOT a global colour threshold (raw/README.md).
 *   2. TRIM to the opaque bounding box, pad 4% margin, pad to square (centred).
 *   3. GATE on measured contrast: the alpha-weighted average colour of the keyed asset must
 *      reach ≥3:1 against the board paper #FFFDF9 (WCAG 2.1 relative luminance) — Gate 1's
 *      graphics bound, PHASE2_BRIEF §5. A failing asset fails the whole run.
 *   4. EMIT lossless WebP at displaySize × {1,2,3} (tokens 20px, organs/entries 30px).
 *   5. WRITE the manifest — THE CONTRACT: per asset the measured contrast, dominant colour,
 *      light share, dimensions, output hashes, source hash, and the provenance row. The gate
 *      re-measures on every run; the manifest records what was measured, never what was hoped.
 *
 * Determinism: identical inputs produce byte-identical outputs (lossless WebP, no
 * timestamps; the manifest is keyed and sorted). `--verify` rebuilds into a temp directory
 * and byte-compares against the committed output — the same discipline as
 * tools/geometry-from-a2, because regenerating one icon must not drift the other 28.
 *
 * Negative controls (`--control`), per the standing rule — a gate that has only ever seen
 * conforming assets is not known to work, and a gate never required to pass is not known to
 * permit anything:
 *   mustFail: a synthetic pale icon (paper-adjacent colour, ~1.3:1) must be REJECTED.
 *   mustPass: a synthetic dark icon (~7:1) must be ACCEPTED.
 * Exit 0 iff both halves behave.
 *
 * Usage:
 *   pnpm art:build              build packages/app/public/art/
 *   pnpm art:build --control    run the gate's negative controls, build nothing
 *   pnpm art:build --verify     rebuild to a temp dir, byte-compare with committed output
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = join(HERE, 'raw');
const OUT = join(HERE, '../../packages/app/public/art');

const PAPER = { r: 255, g: 253, b: 249 }; // the CLASSIC board background
const MIN_CONTRAST = 3.0;
const TOKEN_PX = 20; // cells + pathogens on the board
const LARGE_PX = 30; // organs + entry icons

interface AssetDef {
  key: string;
  cls: 'cell' | 'path' | 'entry' | 'organ';
  prompt: number; // ART_BRIEF.md prompt number — the provenance pointer
}

// The 29. Order here is the manifest order; keep it grouped and stable.
const ASSETS: AssetDef[] = [
  { key: 'cell-macrophage', cls: 'cell', prompt: 1 },
  { key: 'cell-neutrophil', cls: 'cell', prompt: 2 },
  { key: 'cell-bcell', cls: 'cell', prompt: 3 },
  { key: 'cell-tcell', cls: 'cell', prompt: 4 },
  { key: 'cell-helper', cls: 'cell', prompt: 5 },
  { key: 'cell-nk', cls: 'cell', prompt: 6 },
  { key: 'cell-eosinophil', cls: 'cell', prompt: 7 },
  { key: 'path-virus', cls: 'path', prompt: 8 },
  { key: 'path-hidden', cls: 'path', prompt: 9 },
  { key: 'path-bacteria', cls: 'path', prompt: 10 },
  { key: 'path-toxin', cls: 'path', prompt: 11 },
  { key: 'path-venom', cls: 'path', prompt: 12 },
  { key: 'path-fungus', cls: 'path', prompt: 13 },
  { key: 'path-worm', cls: 'path', prompt: 14 },
  { key: 'path-malaria', cls: 'path', prompt: 15 },
  { key: 'path-parasite', cls: 'path', prompt: 16 },
  { key: 'entry-nose', cls: 'entry', prompt: 17 },
  { key: 'entry-contact', cls: 'entry', prompt: 18 },
  { key: 'entry-gut', cls: 'entry', prompt: 19 },
  { key: 'entry-blood', cls: 'entry', prompt: 20 },
  { key: 'entry-wound', cls: 'entry', prompt: 21 },
  { key: 'entry-bite', cls: 'entry', prompt: 22 },
  { key: 'organ-brain', cls: 'organ', prompt: 23 },
  { key: 'organ-lungs', cls: 'organ', prompt: 24 },
  { key: 'organ-heart', cls: 'organ', prompt: 25 },
  { key: 'organ-liver', cls: 'organ', prompt: 26 },
  { key: 'organ-spleen', cls: 'organ', prompt: 27 },
  { key: 'organ-kidneys', cls: 'organ', prompt: 28 },
  { key: 'organ-marrow', cls: 'organ', prompt: 29 },
];

// Provenance constants for this generation batch — mirrors docs/ASSETS.md; the register
// stays the human document, the manifest carries the machine copy.
const PROVENANCE = {
  tool: 'Google Flow',
  date: '2026-08-20',
  account: 'Pro',
  tosChecked:
    '2026-08-20 by Shantanu: Google does not claim ownership of generated content; ' +
    'commercial use permitted on all tiers. Dated copy of the terms saved locally by Shantanu.',
  redistribution:
    'None declared — DECISION 2026-08-20 (LICENSES.md): content is all rights reserved; ' +
    'whether AI-generated images are copyrightable is unsettled, so no licence is granted.',
} as const;

// ---------------------------------------------------------------------------
// colour math
// ---------------------------------------------------------------------------

function relLum(r: number, g: number, b: number): number {
  const f = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const LUM_PAPER = relLum(PAPER.r, PAPER.g, PAPER.b);
function contrastVsPaper(r: number, g: number, b: number): number {
  const l = relLum(r, g, b);
  const hi = Math.max(l, LUM_PAPER);
  const lo = Math.min(l, LUM_PAPER);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------
// keying / trimming
// ---------------------------------------------------------------------------

/** Background test for the flood: near-neutral and light — white, checker greys, pale plates. */
function isBackgroundish(r: number, g: number, b: number): boolean {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx - mn <= 34 && 0.299 * r + 0.587 * g + 0.114 * b >= 150;
}

/** Flood alpha=0 from the borders across background-ish pixels, in place. */
function keyBackground(rgba: Buffer, w: number, h: number): void {
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number): void => {
    const i = y * w + x;
    if (visited[i]) return;
    visited[i] = 1;
    const o = i * 4;
    if (isBackgroundish(rgba[o] ?? 0, rgba[o + 1] ?? 0, rgba[o + 2] ?? 0)) {
      rgba[o + 3] = 0;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length > 0) {
    const i = stack.pop() as number;
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
}

interface Measured {
  contrast: number;
  dominant: string;
  lightShare: number;
  coverage: number;
}

/** Alpha-weighted average colour of the keyed image, vs paper. */
function measure(rgba: Buffer, w: number, h: number): Measured {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  let light = 0;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if ((rgba[o + 3] ?? 0) === 0) continue;
    r += rgba[o] ?? 0;
    g += rgba[o + 1] ?? 0;
    b += rgba[o + 2] ?? 0;
    n++;
    if (0.299 * (rgba[o] ?? 0) + 0.587 * (rgba[o + 1] ?? 0) + 0.114 * (rgba[o + 2] ?? 0) > 160)
      light++;
  }
  if (n === 0) return { contrast: 1, dominant: '#000000', lightShare: 0, coverage: 0 };
  const ar = Math.round(r / n);
  const ag = Math.round(g / n);
  const ab = Math.round(b / n);
  const hex = '#' + [ar, ag, ab].map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('');
  return {
    contrast: contrastVsPaper(ar, ag, ab),
    dominant: hex,
    lightShare: light / n,
    coverage: n / (w * h),
  };
}

function trimBox(
  rgba: Buffer,
  w: number,
  h: number,
): { left: number; top: number; width: number; height: number } {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((rgba[(y * w + x) * 4 + 3] ?? 0) !== 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('keying removed the entire image');
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

// ---------------------------------------------------------------------------
// per-asset processing
// ---------------------------------------------------------------------------

interface Emitted {
  key: string;
  cls: AssetDef['cls'];
  displayPx: number;
  measured: Measured;
  /** The trimmed artwork's extent inside the emitted square, as fractions of the side.
   *  Consumers use it to place icons by their CONTENT edge rather than the file edge —
   *  a long thin lung and a compact kidney space evenly only when measured this way. */
  content: { w: number; h: number };
  files: Record<string, { file: string; px: number; bytes: number; sha256: string }>;
  source: { file: string; sha256: string };
  provenance: typeof PROVENANCE & { prompt: string };
}

async function processAsset(def: AssetDef, outDir: string): Promise<Emitted> {
  const srcFile = `${def.key}.jpeg`;
  const srcBuf = readFileSync(join(RAW, srcFile));
  const { data, info } = await sharp(srcBuf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = Buffer.from(data);
  keyBackground(rgba, info.width, info.height);
  const m = measure(rgba, info.width, info.height);
  if (m.contrast < MIN_CONTRAST) {
    throw new Error(
      `CONTRAST GATE: ${def.key} measures ${m.contrast.toFixed(2)}:1 (${m.dominant}) against ` +
        `paper — below the ${MIN_CONTRAST}:1 bound. The asset must be regenerated, not waved through.`,
    );
  }

  const box = trimBox(rgba, info.width, info.height);
  const margin = Math.round(Math.max(box.width, box.height) * 0.04);
  const side = Math.max(box.width, box.height) + margin * 2;

  const keyed = sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).extract(box);
  const padded = sharp(await keyed.png().toBuffer()).extend({
    top: Math.floor((side - box.height) / 2),
    bottom: Math.ceil((side - box.height) / 2),
    left: Math.floor((side - box.width) / 2),
    right: Math.ceil((side - box.width) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  const paddedBuf = await padded.png().toBuffer();

  const displayPx = def.cls === 'cell' || def.cls === 'path' ? TOKEN_PX : LARGE_PX;
  const files: Emitted['files'] = {};
  for (const scale of [1, 2, 3]) {
    const px = displayPx * scale;
    const webp = await sharp(paddedBuf)
      .resize(px, px, { kernel: 'lanczos3', fit: 'fill' })
      .webp({ lossless: true, effort: 6 })
      .toBuffer();
    const file = `${def.key}@${scale}x.webp`;
    writeFileSync(join(outDir, file), webp);
    files[`${scale}x`] = {
      file,
      px,
      bytes: webp.length,
      sha256: createHash('sha256').update(webp).digest('hex'),
    };
  }
  return {
    key: def.key,
    cls: def.cls,
    displayPx,
    measured: {
      contrast: Number(m.contrast.toFixed(2)),
      dominant: m.dominant,
      lightShare: Number(m.lightShare.toFixed(3)),
      coverage: Number(m.coverage.toFixed(3)),
    },
    content: {
      w: Number((box.width / side).toFixed(3)),
      h: Number((box.height / side).toFixed(3)),
    },
    files,
    source: {
      file: `tools/art-pipeline/raw/${srcFile}`,
      sha256: createHash('sha256').update(srcBuf).digest('hex'),
    },
    provenance: { ...PROVENANCE, prompt: `ART_BRIEF.md prompt ${def.prompt}` },
  };
}

async function build(outDir: string): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const entries: Emitted[] = [];
  for (const def of ASSETS) {
    const e = await processAsset(def, outDir);
    entries.push(e);
    console.log(
      `${e.key.padEnd(17)} ${e.measured.contrast.toFixed(2)}:1 ${e.measured.dominant} ` +
        `light ${(e.measured.lightShare * 100).toFixed(0)}% -> ${e.displayPx}px x1/x2/x3`,
    );
  }
  const manifest = {
    // The contract. Consumers key on `assets[key]`; the gate re-measures on every build —
    // a replaced raw asset is re-judged here, never trusted from the register.
    generator: 'tools/art-pipeline/build.ts',
    paper: '#FFFDF9',
    minContrast: MIN_CONTRAST,
    assets: Object.fromEntries(entries.map((e) => [e.key, { ...e, key: undefined }])),
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\n${entries.length} assets -> ${outDir}`);
}

// ---------------------------------------------------------------------------
// modes
// ---------------------------------------------------------------------------

/** Synthetic 64px icon: solid disc of the given colour on a white background. */
async function syntheticDisc(r: number, g: number, b: number): Promise<Buffer> {
  const w = 64;
  const rgba = Buffer.alloc(w * w * 4);
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const inside = (x - 32) ** 2 + (y - 32) ** 2 <= 24 ** 2;
      rgba[o] = inside ? r : 255;
      rgba[o + 1] = inside ? g : 255;
      rgba[o + 2] = inside ? b : 255;
      rgba[o + 3] = 255;
    }
  }
  return sharp(rgba, { raw: { width: w, height: w, channels: 4 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

async function runControls(): Promise<void> {
  // The gate logic under test is measure()+threshold on a keyed image, exactly as the build
  // runs it — exercised through the same code path via a temp raw file is overkill; what the
  // control must prove is that the measurement pipeline (decode -> key -> measure -> compare)
  // rejects a failing asset and accepts a passing one.
  const judge = async (jpeg: Buffer): Promise<number> => {
    const { data, info } = await sharp(jpeg)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rgba = Buffer.from(data);
    keyBackground(rgba, info.width, info.height);
    return measure(rgba, info.width, info.height).contrast;
  };
  // mustFail: pale toxin-yellow adjacent colour, ~1.3:1 on paper.
  const failC = await judge(await syntheticDisc(228, 236, 62));
  // mustPass: organ brown, 4.59:1 measured in the brief.
  const passC = await judge(await syntheticDisc(142, 110, 83));
  const failRejected = failC < MIN_CONTRAST;
  const passAccepted = passC >= MIN_CONTRAST;
  console.log(
    `mustFail: synthetic pale disc measured ${failC.toFixed(2)}:1 -> ` +
      (failRejected ? 'REJECTED (control fires)' : 'ACCEPTED'),
  );
  console.log(
    `mustPass: synthetic dark disc measured ${passC.toFixed(2)}:1 -> ` +
      (passAccepted ? 'ACCEPTED (permitted edge stays open)' : 'REJECTED'),
  );
  if (!failRejected || !passAccepted) {
    console.error('CONTROL FAILED — the gate is not known to work; do not trust this build.');
    process.exit(1);
  }
  console.log('CONTROL PASS: both halves.');
}

async function runVerify(): Promise<void> {
  const tmp = join(tmpdir(), `iw-art-verify-${process.pid}`);
  rmSync(tmp, { recursive: true, force: true });
  await build(tmp);
  const names = readdirSync(OUT).sort();
  const tmpNames = readdirSync(tmp).sort();
  if (names.join(',') !== tmpNames.join(',')) {
    console.error(
      `VERIFY FAILED: file sets differ\n committed: ${names.join(',')}\n rebuilt: ${tmpNames.join(',')}`,
    );
    process.exit(1);
  }
  for (const n of names) {
    const a = readFileSync(join(OUT, n));
    const b = readFileSync(join(tmp, n));
    if (!a.equals(b)) {
      console.error(`VERIFY FAILED: ${n} differs from the committed output`);
      process.exit(1);
    }
  }
  rmSync(tmp, { recursive: true, force: true });
  console.log(`VERIFY PASS: ${names.length} files byte-identical to the committed output.`);
}

async function main(): Promise<void> {
  if (process.argv.includes('--control')) return runControls();
  if (process.argv.includes('--verify')) return runVerify();
  return build(OUT);
}

void main();
