/**
 * THE STORE'S FEATURE GRAPHIC, 1024 BY 500 (ruled 3 October 2026; docs/LOOK_PLAN.md §26): the
 * banner Google Play shows at the head of the game's page.
 *
 *   pnpm art:feature     -> packages/android/store/feature-1024x500.png
 *
 * DRAWN HERE, from what the app already is: the title's Clay picture of the seven cells
 * (`art/clay/scene/title`, rendered in Blender by clay/hero.py), on the kit's table, with the game's
 * name and its one line, in the app's own Nunito. The words are read from the catalogue, so the
 * banner says what the title screen says. Laid out as a page and photographed by headless Chrome,
 * because that is where the app's font and colours already are.
 *
 * Play asks for a 24-bit PNG or a JPEG, with no alpha: the photograph is flattened to that.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const PUBLIC = join(REPO, 'packages', 'app', 'public');
const OUT = join(REPO, 'packages', 'android', 'store', 'feature-1024x500.png');
const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

/** The kit's colours (packages/ui/src/kit/tokens.ts): the table, its lit part, cream, quiet ink. */
const TABLE = '#0E2A30';
const TABLE_LIT = '#1A4850';
const CREAM = '#F4E8D2';
const QUIET = '#9FC0C2';

const catalogue = JSON.parse(
  readFileSync(join(REPO, 'packages', 'content', 'src', 'i18n', 'en', 'ui.json'), 'utf8'),
) as Record<string, string>;
const name = catalogue['title.name'];
const line = catalogue['title.blurb'];
if (name === undefined || line === undefined) throw new Error('the catalogue has no title words');

const dataUrl = (file: string, type: string): string =>
  `data:${type};base64,${readFileSync(file).toString('base64')}`;
const font = dataUrl(join(PUBLIC, 'fonts', 'nunito-latin-var.woff2'), 'font/woff2');
const picture = dataUrl(join(PUBLIC, 'art', 'clay', 'scene', 'title@3x.webp'), 'image/webp');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Nunito; src: url(${font}) format('woff2'); font-weight: 200 1000; }
  html, body { margin: 0; width: 1024px; height: 500px; overflow: hidden; }
  body {
    background: radial-gradient(ellipse 60% 85% at 74% 50%, ${TABLE_LIT}, ${TABLE} 70%);
    font-family: Nunito, sans-serif; display: flex; align-items: center;
  }
  .words { flex: 0 0 500px; box-sizing: border-box; padding: 0 0 0 64px; }
  h1 { margin: 0; color: ${CREAM}; font-weight: 900; font-size: 64px; line-height: 1.02;
       text-shadow: 0 4px 0 rgba(0, 0, 0, 0.35); }
  p { margin: 22px 0 0; color: ${QUIET}; font-weight: 700; font-size: 24px; line-height: 1.3; }
  img { flex: 0 0 auto; height: 470px; margin-left: 0; }
</style></head><body>
  <div class="words"><h1>${name}</h1><p>${line}</p></div>
  <img src="${picture}" alt="">
</body></html>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate('document.fonts.ready.then(() => true)');
  // The face itself, loaded. NOT `document.fonts.check()`, which answers yes for a face that
  // failed to load as readily as for one that loaded (fired by hand, 3 October 2026).
  const loaded = await page.evaluate(
    "[...document.fonts].some((f) => f.family.replace(/[\"']/g, '') === 'Nunito' && f.status === 'loaded')",
  );
  if (loaded !== true)
    throw new Error('the app’s font did not load: the banner would be in another');
  const shot = await page.screenshot({ type: 'png' });
  await sharp(shot).removeAlpha().png({ compressionLevel: 9 }).toFile(OUT);
  console.log(`feature graphic written: ${OUT}`);
} finally {
  await browser.close();
}
