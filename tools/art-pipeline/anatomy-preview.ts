/**
 * THE ANATOMY CHECK, AS A PICTURE — the frame on the board's paper with the seven organ
 * icons composited at `board/anatomy.json`'s positions, at 2×, so the positions can be
 * LOOKED AT rather than judged from numbers (P2.5 item 12 step 2; Kartik checks the anatomy).
 *
 *   pnpm art:anatomy        -> tools/art-pipeline/showcase/anatomy-preview.png (not committed)
 *
 * Reads only committed inputs (the emitted art and the content pack), so the picture can
 * always be regenerated for a review; a position edit is checked by running this again.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = join(HERE, '../../packages/app/public/art');
const OUT_DIR = join(HERE, 'showcase');
const OUT = join(OUT_DIR, 'anatomy-preview.png');
const SCALE = 2;
const ICON_PX = 30; // organ icons at their board display size (LARGE_PX), 1x

interface Pt {
  x: number;
  y: number;
}
const anatomy = JSON.parse(
  readFileSync(join(HERE, '../../packages/content/src/board/anatomy.json'), 'utf8'),
) as { FRAME: { asset: string; w: number; h: number }; ANATOMY_POS: Record<string, Pt> };

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const w = anatomy.FRAME.w * SCALE;
  const h = anatomy.FRAME.h * SCALE;
  const frame = await sharp(join(ART, `${anatomy.FRAME.asset}@${SCALE}x.webp`)).toBuffer();
  const layers: sharp.OverlayOptions[] = [{ input: frame, left: 0, top: 0 }];
  for (const [organ, p] of Object.entries(anatomy.ANATOMY_POS)) {
    const icon = await sharp(join(ART, `organ-${organ}@3x.webp`))
      .resize(ICON_PX * SCALE, ICON_PX * SCALE)
      .toBuffer();
    layers.push({
      input: icon,
      left: Math.round(p.x * SCALE - (ICON_PX * SCALE) / 2),
      top: Math.round(p.y * SCALE - (ICON_PX * SCALE) / 2),
    });
  }
  await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 255, g: 253, b: 249, alpha: 1 } },
  })
    .composite(layers)
    .png()
    .toFile(OUT);
  console.log(
    `${Object.keys(anatomy.ANATOMY_POS).length} organs on ${anatomy.FRAME.asset} -> ${OUT}`,
  );
}

void main();
