/**
 * Turn Blender's PNG renders into the WebP files the page loads, and say what each weighs.
 * The PNGs are intermediate and are not committed (see .gitignore here).
 *
 *   pnpm --filter @immunity-wars/look-prototype exec tsx pack-art.ts
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ART = join(dirname(fileURLToPath(import.meta.url)), 'public', 'art');
const kb = (n: number): string => `${(n / 1024).toFixed(1)} KB`;

async function pack(src: string, dst: string): Promise<number> {
  const out = await sharp(readFileSync(src)).webp({ quality: 86, alphaQuality: 90 }).toBuffer();
  writeFileSync(dst, out);
  console.log(
    `${dst.slice(ART.length + 1).padEnd(34)} ${kb(statSync(src).size).padStart(10)} png  ->  ${kb(out.length).padStart(9)} webp`,
  );
  return out.length;
}

let pictures = await pack(join(ART, 'board.png'), join(ART, 'board.webp'));
for (const f of readdirSync(join(ART, 'pieces')).filter((n) => n.endsWith('.png')))
  pictures += await pack(join(ART, 'pieces', f), join(ART, 'pieces', f.replace(/\.png$/, '.webp')));
console.log(`every picture the two picture ways load: ${kb(pictures)}`);

// the pictograms, for the way that draws the models live and lays them on the coins itself
const TEX = join(dirname(fileURLToPath(import.meta.url)), 'blender', 'tex');
let decals = 0;
for (const f of readdirSync(TEX).filter((n) => n.endsWith('.png'))) {
  const out = await sharp(readFileSync(join(TEX, f)))
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer();
  writeFileSync(join(ART, 'tex', f.replace(/\.png$/, '.webp')), out);
  decals += out.length;
}
console.log(`the 13 pictograms: ${kb(decals)}`);

let models = 0;
for (const f of readdirSync(join(ART, 'models')).filter((n) => n.endsWith('.glb'))) {
  const n = statSync(join(ART, 'models', f)).size;
  models += n;
  console.log(`models/${f.padEnd(27)} ${kb(n).padStart(10)} glb`);
}
console.log(`every model the live way loads: ${kb(models)}`);
