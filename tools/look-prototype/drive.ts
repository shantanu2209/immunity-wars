/**
 * Drive the built prototype on THIS computer, headless, and print what it measured.
 *
 * This is the screening pass and the proof that the frame timer works. It is not the L2
 * measurement: that is taken on the Samsung Galaxy S25, by opening the same page there. A number
 * from this script must always be quoted with the machine and the graphics path it names.
 *
 *   pnpm --filter @immunity-wars/look-prototype build:web
 *   pnpm --filter @immunity-wars/look-prototype preview        (in another terminal)
 *   pnpm --filter @immunity-wars/look-prototype exec tsx drive.ts            # measure
 *   pnpm --filter @immunity-wars/look-prototype exec tsx drive.ts --control  # the negative control
 *   pnpm --filter @immunity-wars/look-prototype exec tsx drive.ts --shots    # a picture of each way
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const BASE = process.env['LOOK_URL'] ?? 'http://localhost:4180/';
const arg = (name: string): boolean => process.argv.includes(name);
const opt = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
};

mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  // The new headless mode with the real graphics chip. Without these, WebGL falls back to a
  // software renderer and the two GPU ways are measured on the processor instead.
  headless: true,
  args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
// The S25's viewport in Chrome: 360 CSS pixels wide at 3 device pixels each.
await page.setViewport({
  width: 360,
  height: 780,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
page.on('pageerror', (e) =>
  console.log('[page error]', e instanceof Error ? e.message : String(e)),
);
page.on('console', (m) => {
  if (m.type() === 'error') console.log('[console error]', m.text());
});

if (arg('--shots')) {
  for (const way of ['page', 'canvas', 'live']) {
    for (const script of ['turn', 'crowd']) {
      await page.goto(`${BASE}?look=${way}&script=${script}`, { waitUntil: 'load' });
      // 2.6 s in: the Monocyte is selected, the camera has moved in, its legal spaces glow
      await new Promise((r) => setTimeout(r, script === 'turn' ? 2600 : 4200));
      await page.screenshot({ path: join(OUT, `${way}-${script}.png`) });
      console.log(`out/${way}-${script}.png`);
    }
  }
  await page.goto(`${BASE}?look=live&tilt=28`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 2600));
  await page.screenshot({ path: join(OUT, 'live-tilted.png') });
  console.log('out/live-tilted.png');
} else if (arg('--taps')) {
  // Ten taps on the board for each way. What is timed is the page's part: from the moment the
  // browser stamps the touch to the end of the frame that draws the answer. The screen's own
  // delay in showing that frame is not in it.
  for (const way of ['page', 'canvas', 'live']) {
    await page.goto(`${BASE}?tap=${way}${arg('--control') ? '&slow=120' : ''}`, {
      waitUntil: 'load',
    });
    await new Promise((r) => setTimeout(r, 1500));
    for (let i = 0; i < 10; i += 1) {
      await page.touchscreen.tap(150 + i * 6, 230 + i * 4);
      await new Promise((r) => setTimeout(r, 180 + i * 7));
    }
    const taps = ((await page.evaluate('window.lookTaps ?? []')) as number[])
      .slice()
      .sort((a, b) => a - b);
    console.log(
      `${way.padEnd(6)} ${taps.length} taps: typical ${taps[Math.floor(taps.length / 2)]} ms, worst ${taps[taps.length - 1]} ms  [${taps.join(', ')}]`,
    );
    // The control must FIRE: with every answer held back 120 ms, no tap may read under 100.
    if (arg('--control') && (taps.length === 0 || (taps[0] ?? 0) < 100))
      throw new Error(
        `THE TAP TIMER DID NOT FIRE for ${way}: answers were held back 120 ms and a tap read ${taps[0]} ms`,
      );
  }
} else {
  const control = arg('--control');
  const query = control
    ? `?auto=1&runs=1&scripts=turn&slow=40`
    : `?auto=1&runs=${opt('--runs', '3')}`;
  await page.goto(`${BASE}${query}`, { waitUntil: 'load' });
  await page.waitForFunction('document.title.startsWith("L2: ")', { timeout: 600_000 });
  const error = await page.evaluate('window.lookError ?? null');
  if (error) throw new Error(`the page stopped: ${String(error)}`);
  const results = (await page.evaluate('window.lookResults')) as {
    device: Record<string, unknown>;
    ways: Array<{
      way: string;
      firstDrawMs: number;
      bytes: number;
      requests: number;
      heapMB: number | null;
      info: Record<string, unknown>;
      runs: Array<Record<string, number | string>>;
    }>;
  };
  const name = control ? 'control.json' : 'pc.json';
  writeFileSync(join(OUT, name), `${JSON.stringify(results, null, 2)}\n`);
  await page.screenshot({ path: join(OUT, control ? 'control.png' : 'pc.png'), fullPage: true });
  console.log(JSON.stringify(results.device));
  for (const w of results.ways) {
    console.log(
      `\n${w.way}: first draw ${w.firstDrawMs} ms, ${Math.round(w.bytes / 1024)} KB in ${w.requests} files, heap ${w.heapMB} MB, ${JSON.stringify(w.info)}`,
    );
    for (const r of w.runs)
      console.log(
        `  ${String(r['script']).padEnd(5)} run ${r['run']}: ${String(r['frames']).padStart(4)} frames, typical ${r['median']} ms, p99 ${r['p99']}, worst ${r['worst']}, slow ${r['slow']}, very slow ${r['verySlow']}, own work ${r['workMean']} (p99 ${r['workP99']}), long tasks ${r['longTasks']}`,
      );
  }
  if (control) {
    // The control must FIRE: with 40 ms burned in every frame, every way must report slow frames.
    const silent = results.ways.filter((w) => w.runs.every((r) => Number(r['slow']) === 0));
    if (silent.length > 0)
      throw new Error(
        `THE TIMER DID NOT FIRE for ${silent.map((w) => w.way).join(', ')}: 40 ms was burned in every frame and no slow frame was reported`,
      );
    console.log('\nCONTROL FIRED: every way reported slow frames with 40 ms burned in each.');
  }
}
await browser.close();
