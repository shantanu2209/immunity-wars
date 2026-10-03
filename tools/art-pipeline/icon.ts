/**
 * THE APP'S ICON, FROM THE PICTURE SHANTANU CHOSE TO EVERY FILE ANDROID AND THE STORE ASK FOR
 * (docs/LOOK_PLAN.md §26). Chosen 3 October 2026: a shield with a face meeting the game's virus,
 * generated with OpenAI's image model through Codex. Where it came from, and on what terms, is in
 * docs/ASSETS.md.
 *
 *   pnpm art:icon     tools/art-pipeline/icon/source.png -> the Android project and the store
 *
 * The picture is square and stands on its own dark teal ground. Android shows the middle 72 dp of
 * a 108 dp canvas, through a mask the phone's maker chooses (a circle, a squircle, a rounded
 * square), and only the circle 66 dp across in the middle is never cut. So, on every run:
 *
 *   - the GROUND is measured, from the picture's own border, and REFUSED if the border is not one
 *     colour: the picture's edge is feathered into it, and a border of two colours would show a seam;
 *   - the smallest circle that holds everything that is not ground is measured, and the picture is
 *     scaled and placed so that circle is the safe one, 66 dp across, in the middle;
 *   - the adaptive icon's FOREGROUND is that canvas, at each of Android's five densities, and its
 *     BACKGROUND the ground, written as a colour;
 *   - its MONOCHROME layer, which Android 13 and later tints to the phone's theme, is the shape of
 *     everything that is not ground, in one colour;
 *   - for Android 7 (the oldest the shell supports), which has no adaptive icons, the middle 72 dp
 *     as a picture, square with rounded corners and round;
 *   - for the store, the middle 72 dp at 512 px, square: Google rounds its corners itself;
 *   - for the web app (ruled 3 October 2026), its manifest's icons and the iPhone's home-screen
 *     icon, under `packages/app/public/icons/`: the middle 72 dp at 192 and 512 px, an iPhone's
 *     180 px, and a MASKABLE 512, cut wider so that the subject's circle is the one Chrome promises
 *     never to cut (a radius of 40% of the icon).
 *
 * Nothing is drawn: every picture is the source, measured, scaled and cut.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const SOURCE = join(HERE, 'icon', 'source.png');
const RES = join(REPO, 'packages', 'android', 'android', 'app', 'src', 'main', 'res');
const STORE = join(REPO, 'packages', 'android', 'store');
const WEB = join(REPO, 'packages', 'app', 'public', 'icons');

/** The 108 dp canvas, worked at this many px. */
const CANVAS = 1024;
/** The circle never cut by any mask, and what a phone shows, in dp of the 108. */
const SAFE_DP = 66;
const SHOWN_DP = 72;
/** How far a pixel may be from the ground and still be ground: summed over R, G and B. */
const GROUND_TOLERANCE = 60;
/** How far a border pixel may be from the ground's colour before the border is not one colour. */
const BORDER_TOLERANCE = 24;

/** dp to px: Android's five densities. */
const DENSITIES: readonly [string, number][] = [
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
];

class Refusal extends Error {}

const hex = (c: readonly number[]): string =>
  `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const distance = (a: readonly number[], b: readonly number[]): number =>
  Math.abs((a[0] ?? 0) - (b[0] ?? 0)) +
  Math.abs((a[1] ?? 0) - (b[1] ?? 0)) +
  Math.abs((a[2] ?? 0) - (b[2] ?? 0));

/** The picture's ground: the median of its border, each channel; refused if the border varies. */
async function measureGround(source: string): Promise<number[]> {
  const { data, info } = await sharp(source)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const border: number[][] = [];
  const at = (x: number, y: number): number[] => {
    const i = (y * w + x) * 3;
    return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
  };
  for (let x = 0; x < w; x += 4) border.push(at(x, 1), at(x, h - 2));
  for (let y = 0; y < h; y += 4) border.push(at(1, y), at(w - 2, y));
  const median = [0, 1, 2].map((c) => {
    const v = border.map((p) => p[c] ?? 0).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)] ?? 0;
  });
  const worst = Math.max(...border.map((p) => distance(p, median)));
  if (worst > BORDER_TOLERANCE)
    throw new Refusal(
      `the picture's border is not one colour (a border pixel is ${String(worst)} from ${hex(median)}, ` +
        `more than ${String(BORDER_TOLERANCE)}): feathered into one ground it would show a seam`,
    );
  return median;
}

/** The smallest circle holding everything that is not ground, as fractions of the side. */
async function measureSubject(
  source: string,
  ground: readonly number[],
): Promise<{ cx: number; cy: number; r: number }> {
  const N = 314;
  const { data } = await sharp(source)
    .resize(N, N)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pts: [number, number][] = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 3;
      const p = [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
      if (distance(p, ground) > GROUND_TOLERANCE) pts.push([(x + 0.5) / N, (y + 0.5) / N]);
    }
  if (pts.length === 0) throw new Refusal('the picture is all ground: there is nothing to show');
  let best = { cx: 0.5, cy: 0.5, r: Number.POSITIVE_INFINITY };
  for (let cx = 0.3; cx <= 0.7; cx += 0.005)
    for (let cy = 0.3; cy <= 0.7; cy += 0.005) {
      let r = 0;
      for (const [x, y] of pts) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > r) r = d;
        if (r >= best.r) break;
      }
      if (r < best.r) best = { cx, cy, r };
    }
  return best;
}

async function canvas(
  ground: readonly number[],
  subject: { cx: number; cy: number; r: number },
): Promise<Buffer> {
  // The picture's side, in px of the canvas, so that its subject's circle is the safe one.
  const safeR = (CANVAS * SAFE_DP) / 108 / 2;
  const side = Math.round(safeR / subject.r);
  const left = Math.round(CANVAS / 2 - subject.cx * side);
  const top = Math.round(CANVAS / 2 - subject.cy * side);
  // The square edge feathered into the ground over its outer 4%.
  const f = Math.max(2, Math.round(side * 0.04));
  const feather = Buffer.from(
    `<svg width="${String(side)}" height="${String(side)}"><defs><filter id="b"><feGaussianBlur stdDeviation="${String(f / 2)}"/></filter></defs>` +
      `<rect x="${String(f)}" y="${String(f)}" width="${String(side - 2 * f)}" height="${String(side - 2 * f)}" fill="#fff" filter="url(#b)"/></svg>`,
  );
  const picture = await sharp(SOURCE)
    .resize(side, side, { kernel: 'lanczos3' })
    .ensureAlpha()
    .composite([{ input: feather, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const [r, g, b] = ground;
  return sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: r ?? 0, g: g ?? 0, b: b ?? 0, alpha: 1 },
    },
  })
    .composite([{ input: picture, left, top }])
    .png()
    .toBuffer();
}

/**
 * The themed layer's edge: a pixel this far from the ground is wholly the shape, and one under the
 * start wholly not. Narrow, so that the shield's shadow and the glow's haze, which sit just off the
 * ground's colour, stay out and the shape reads as one clean figure when the phone tints it.
 */
const SHAPE_FROM = 55;
const SHAPE_TO = 85;

/** One colour, in the shape of everything that is not ground, with a narrow soft edge. */
async function monochrome(whole: Buffer, ground: readonly number[]): Promise<Buffer> {
  const { data, info } = await sharp(whole)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = Buffer.alloc(info.width * info.height);
  for (let i = 0; i < alpha.length; i++) {
    const p = [data[i * 3] ?? 0, data[i * 3 + 1] ?? 0, data[i * 3 + 2] ?? 0];
    const d = distance(p, ground);
    alpha[i] = Math.max(
      0,
      Math.min(255, Math.round(((d - SHAPE_FROM) / (SHAPE_TO - SHAPE_FROM)) * 255)),
    );
  }
  return sharp({
    create: { width: info.width, height: info.height, channels: 3, background: '#FFFFFF' },
  })
    .joinChannel(alpha, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png()
    .toBuffer();
}

const mask = (px: number, round: boolean): Buffer =>
  Buffer.from(
    round
      ? `<svg width="${String(px)}" height="${String(px)}"><circle cx="${String(px / 2)}" cy="${String(px / 2)}" r="${String(px / 2)}" fill="#fff"/></svg>`
      : `<svg width="${String(px)}" height="${String(px)}"><rect width="${String(px)}" height="${String(px)}" rx="${String(px * 0.18)}" fill="#fff"/></svg>`,
  );

/** The middle `dp` of the canvas, at `px`. */
async function middle(whole: Buffer, dp: number, px: number): Promise<Buffer> {
  const view = Math.round((CANVAS * dp) / 108);
  const off = Math.round((CANVAS - view) / 2);
  return sharp(whole)
    .extract({ left: off, top: off, width: view, height: view })
    .resize(px, px, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
}

/** What a phone shows: the middle 72 dp of the canvas, at `px`. */
const shown = (whole: Buffer, px: number): Promise<Buffer> => middle(whole, SHOWN_DP, px);

/** A maskable web icon's cut: the subject's circle, 66 dp, is 80% of it, the circle never cut. */
const MASKABLE_DP = SAFE_DP / 0.8;

async function write(): Promise<void> {
  const ground = await measureGround(SOURCE);
  const subject = await measureSubject(SOURCE, ground);
  const whole = await canvas(ground, subject);
  const mono = await monochrome(whole, ground);
  for (const [name, k] of DENSITIES) {
    const dir = join(RES, `mipmap-${name}`);
    mkdirSync(dir, { recursive: true });
    const layer = Math.round(108 * k);
    await sharp(whole)
      .resize(layer, layer, { kernel: 'lanczos3' })
      .png({ compressionLevel: 9 })
      .toFile(join(dir, 'ic_launcher_foreground.png'));
    await sharp(mono)
      .resize(layer, layer, { kernel: 'lanczos3' })
      .png({ compressionLevel: 9 })
      .toFile(join(dir, 'ic_launcher_monochrome.png'));
    const legacy = Math.round(48 * k);
    const face = await shown(whole, legacy);
    for (const [file, round] of [
      ['ic_launcher.png', false],
      ['ic_launcher_round.png', true],
    ] as const) {
      await sharp(face)
        .composite([{ input: mask(legacy, round), blend: 'dest-in' }])
        .png({ compressionLevel: 9 })
        .toFile(join(dir, file));
    }
  }
  // The background layer: the ground, as a colour, so it is exact at any size.
  writeFileSync(
    join(RES, 'drawable', 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<!-- The icon's ground, measured from its picture by tools/art-pipeline/icon.ts. Written, not edited. -->\n` +
      `<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n` +
      `    <solid android:color="${hex(ground)}" />\n</shape>\n`,
  );
  mkdirSync(STORE, { recursive: true });
  // Opaque, and still a 32-bit PNG with an alpha channel, which is what Play asks for.
  await sharp(await shown(whole, 512))
    .flatten({ background: hex(ground) })
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toFile(join(STORE, 'icon-512.png'));
  // The web app's: opaque, on the ground, every one.
  mkdirSync(WEB, { recursive: true });
  for (const [file, dp, px] of [
    ['icon-192.png', SHOWN_DP, 192],
    ['icon-512.png', SHOWN_DP, 512],
    ['maskable-512.png', MASKABLE_DP, 512],
    ['apple-touch-icon.png', SHOWN_DP, 180],
  ] as const) {
    await sharp(await middle(whole, dp, px))
      .flatten({ background: hex(ground) })
      .png({ compressionLevel: 9 })
      .toFile(join(WEB, file));
  }
  const pictureDp = (SAFE_DP / 2 / subject.r).toFixed(1);
  console.log(
    `icon written: ground ${hex(ground)}; the picture ${pictureDp} dp across, its subject in the ${String(SAFE_DP)} dp safe circle; ` +
      'five densities, the monochrome layer, legacy icons, the store icon, and the four for the web',
  );
}

try {
  await write();
} catch (e) {
  if (!(e instanceof Refusal)) throw e;
  console.error(`ICON REFUSED: ${e.message}`);
  process.exitCode = 1;
}
