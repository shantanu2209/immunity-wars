/**
 * THE ANATOMY CHECK, AS A PICTURE — the frame on the board's paper with the seven organ
 * icons, the six entry chips and the bloodstream composited at `board/anatomy.json`'s
 * positions, at 2×, so the positions can be LOOKED AT rather than judged from numbers
 * (P2.5 item 12, steps 2 and 4; Kartik checks the anatomy, Shantanu the entries).
 *
 *   pnpm art:anatomy        -> tools/art-pipeline/showcase/anatomy-preview.png (not committed)
 *
 * Reads only committed inputs (the emitted art and the content pack), so the picture can
 * always be regenerated for a review; a position edit is checked by running this again.
 * The bloodstream has no art: it is drawn as the amber disc the planning screen uses.
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
const ICON_PX = 30; // organ and entry icons at their board display size (LARGE_PX), 1x

interface Pt {
  x: number;
  y: number;
}
const anatomy = JSON.parse(
  readFileSync(join(HERE, '../../packages/content/src/board/anatomy.json'), 'utf8'),
) as {
  FRAME: { asset: string; w: number; h: number };
  ANATOMY_POS: Record<string, Pt>;
  ANATOMY_ENTRY: Record<string, Pt>;
  ANATOMY_HUB: Pt;
};

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const w = anatomy.FRAME.w * SCALE;
  const h = anatomy.FRAME.h * SCALE;
  const px = ICON_PX * SCALE;
  const at = (p: Pt): { left: number; top: number } => ({
    left: Math.round(p.x * SCALE - px / 2),
    top: Math.round(p.y * SCALE - px / 2),
  });
  const frame = await sharp(join(ART, `${anatomy.FRAME.asset}@${SCALE}x.webp`)).toBuffer();
  const layers: sharp.OverlayOptions[] = [{ input: frame, left: 0, top: 0 }];
  const icon = async (key: string, p: Pt): Promise<void> => {
    const buf = await sharp(join(ART, `${key}@3x.webp`))
      .resize(px, px)
      .toBuffer();
    layers.push({ input: buf, ...at(p) });
  };
  for (const [organ, p] of Object.entries(anatomy.ANATOMY_POS)) await icon(`organ-${organ}`, p);
  for (const [route, p] of Object.entries(anatomy.ANATOMY_ENTRY)) await icon(`entry-${route}`, p);
  // The bloodstream: an amber disc (#7A5600, the planning screen's bloodstream colour).
  const disc = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}">` +
      `<circle cx="${px / 2}" cy="${px / 2}" r="${px / 2 - 2}" fill="#FFFDF9" stroke="#7A5600" stroke-width="4"/>` +
      `<circle cx="${px / 2}" cy="${px / 2}" r="${px / 6}" fill="#7A5600"/></svg>`,
  );
  layers.push({ input: disc, ...at(anatomy.ANATOMY_HUB) });
  await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 255, g: 253, b: 249, alpha: 1 } },
  })
    .composite(layers)
    .png()
    .toFile(OUT);
  console.log(
    `${Object.keys(anatomy.ANATOMY_POS).length} organs, ${Object.keys(anatomy.ANATOMY_ENTRY).length} entries and the bloodstream on ${anatomy.FRAME.asset} -> ${OUT}`,
  );
}

void main();
