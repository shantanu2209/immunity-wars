/**
 * THE PLAY SCREEN'S FRAMES, COUNTED ON THIS MACHINE (stage L4, docs/LOOK_PLAN.md §14).
 *
 *   npx tsx tools/perf/play-frames.ts [url] [--turns N] [--control]
 *
 * Opens the measuring page (`/measure.html`, packages/app/src/measure.tsx) in a headless Chrome at
 * a phone's size, lets it play its turns of a real game by itself, and prints what its frame meter
 * counted. It is the same page Shantanu opens on the S25, so what is read here and what is read
 * there were counted by one instrument. It needs `vite preview` of a build, on port 4173.
 *
 * IT GOES IN THE WAY THE PHONE DOES: the app's own page first, until its service worker has the
 * page, and then the measuring page. A phone that has played the app has that worker, and the
 * worker answers a page it does not store with the app's title; the first build of this page
 * opened as the title on such a phone (measured before the phone was asked). A run in which the
 * measuring page does not open from behind the worker is NOT REACHED, and says so.
 *
 * WHAT THIS IS NOT: the phone. A PC's headless Chrome draws nothing to a screen and has a faster
 * processor; its numbers say that the page and its meter work and what the page costs here, and
 * nothing about 60 frames a second on the S25. Every line it prints names the machine's browser.
 *
 * IT REPORTS, AND REFUSES ONLY WHAT IT COULD NOT MEASURE. A run that did not finish, that counted
 * no frames, or in which the camera never moved in (so the part this stage added was never
 * exercised) is NOT REACHED and exits 1: it is never read as a clean run. Slow frames are printed,
 * not judged; the line that was ruled is for the phone.
 *
 * `--control` is the meter's negative control: the page is told to waste 40 ms in every frame, and
 * the run must then report slow frames, nearly all of them. If it reports a clean run, the meter
 * is not measuring, and the control exits 1.
 */
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const args = process.argv.slice(2);
const URL_BASE = (args.find((a) => a.startsWith('http')) ?? 'http://localhost:4173').replace(
  /\/$/,
  '',
);
const CONTROL = args.includes('--control');
const turnsAt = args.indexOf('--turns');
const TURNS = Math.max(1, Number(turnsAt >= 0 ? args[turnsAt + 1] : CONTROL ? 1 : 3) || 3);
const BURN = CONTROL ? 40 : 0;
/** A turn is the cards, the plan, three moves and a spread at the ruled pace: under 40 s. */
const WAIT_MS = 60_000 + TURNS * 60_000;

interface Stats {
  frames: number;
  seconds: number;
  median: number;
  p95: number;
  p99: number;
  worst: number;
  slow: number;
  verySlow: number;
}
interface Named {
  ms: number;
  at: number;
  marked: boolean;
}
interface Reading {
  result: { all: Stats; marked: Stats; slowest: Named[]; longTasks: number };
  played: { moves: number; spreads: number; cameraIns: number };
  refresh: number;
  turns: number;
  burn: number;
}

const isStats = (v: unknown): v is Stats =>
  typeof v === 'object' &&
  v !== null &&
  ['frames', 'seconds', 'median', 'p95', 'p99', 'worst', 'slow', 'verySlow'].every(
    (k) => typeof (v as Record<string, unknown>)[k] === 'number',
  );
function isReading(v: unknown): v is Reading {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  const result = r['result'] as Record<string, unknown> | undefined;
  const played = r['played'] as Record<string, unknown> | undefined;
  return (
    typeof played === 'object' &&
    ['moves', 'spreads', 'cameraIns'].every((k) => typeof played[k] === 'number') &&
    typeof r['refresh'] === 'number' &&
    typeof r['turns'] === 'number' &&
    typeof r['burn'] === 'number' &&
    typeof result === 'object' &&
    isStats(result['all']) &&
    isStats(result['marked']) &&
    Array.isArray(result['slowest']) &&
    typeof result['longTasks'] === 'number'
  );
}

const line = (what: string, s: Stats): string =>
  `${what}: ${String(s.frames)} frames in ${String(s.seconds)} s; slow (20 ms or more) ${String(s.slow)}, ` +
  `of them 33 ms or more ${String(s.verySlow)}; a frame's middle ${String(s.median)} ms, ` +
  `95th of a hundred ${String(s.p95)}, 99th ${String(s.p99)}, worst ${String(s.worst)}`;

let failed: string | null = null;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 360, height: 780, deviceScaleFactor: 3, hasTouch: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e instanceof Error ? e.message : String(e)));
  // The app first, as on a phone that has played it: wait until its worker controls the page.
  await page.goto(`${URL_BASE}/`, { waitUntil: 'load' });
  const worker = await page
    .waitForFunction(() => navigator.serviceWorker.ready.then(() => true), { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  await page.reload({ waitUntil: 'load' });
  const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null);
  console.log(
    `  behind the app's service worker: ${worker && controlled ? 'yes' : 'NO (this origin has none, so that path was not taken)'}`,
  );
  const url = `${URL_BASE}/measure.html?auto=1&turns=${String(TURNS)}${BURN > 0 ? `&slow=${String(BURN)}` : ''}`;
  await page.goto(url, { waitUntil: 'load' });
  const opened = await page
    .waitForFunction(
      () => document.querySelector('[data-measure-running], [data-measure-done]') !== null,
      { timeout: 15_000 },
    )
    .then(() => true)
    .catch(() => false);
  if (!opened) {
    const title = await page.evaluate(() => document.querySelector('[data-title]') !== null);
    throw new Error(
      title
        ? 'the measuring page opened as the app’s title: its worker answered for it'
        : 'the measuring page did not start',
    );
  }
  const version = await browser.version();
  console.log(`PLAY FRAMES: ${url}`);
  console.log(`  counted by: ${version}, headless, on this PC, at 360 x 780 and 3 device px to 1`);
  const done = await page
    .waitForFunction(
      () => document.querySelector('[data-measure-done]')?.getAttribute('data-measure-done') ?? '',
      { timeout: WAIT_MS, polling: 500 },
    )
    .then((h) => h.jsonValue())
    .catch(() => null);
  if (errors.length > 0) failed = `an uncaught error on the page: ${errors[0] ?? ''}`;
  else if (done === null || done === '')
    failed = `NOT REACHED: the page did not finish within ${String(WAIT_MS / 1000)} s`;
  else {
    const read: unknown = JSON.parse(done);
    if (!isReading(read))
      failed = 'NOT REACHED: the page finished and its reading could not be read';
    else {
      const { all, marked, slowest, longTasks } = read.result;
      const { moves, spreads, cameraIns } = read.played;
      console.log(
        `  played: ${String(moves)} moves, ${String(spreads)} spreads; the camera moved in ${String(cameraIns)} times`,
      );
      console.log(`  the screen refreshes every ${String(read.refresh)} ms`);
      console.log(`  ${line(`every frame of ${String(read.turns)} turns`, all)}`);
      console.log(`  ${line('while the camera was moving or in', marked)}`);
      console.log(
        `  the slowest: ${slowest.map((f) => `${String(f.ms)} ms at ${String(f.at)} s${f.marked ? ' (camera)' : ''}`).join(', ')}`,
      );
      console.log(`  tasks over 50 ms: ${String(longTasks)}`);
      if (all.frames === 0) failed = 'NOT REACHED: no frame was counted';
      else if (moves === 0) failed = 'NOT REACHED: no move was made, so no piece was seen moving';
      else if (spreads < read.turns)
        failed = `NOT REACHED: ${String(spreads)} of ${String(read.turns)} turns were ended`;
      else if (cameraIns === 0 || marked.frames === 0)
        failed = 'NOT REACHED: the camera never moved in, so the camera was not measured';
      else if (CONTROL) {
        const share = all.slow / all.frames;
        if (share < 0.9)
          failed =
            `CONTROL DID NOT FIRE: every frame wasted ${String(BURN)} ms, and only ` +
            `${String(all.slow)} of ${String(all.frames)} were reported slow`;
        else
          console.log(
            `CONTROL fires: every frame made to waste ${String(BURN)} ms, and ` +
              `${String(all.slow)} of ${String(all.frames)} are reported slow: YES`,
          );
      }
    }
  }
} catch (e) {
  failed = `NOT REACHED: ${e instanceof Error ? e.message : String(e)}`;
} finally {
  // Chrome's close can hang on this machine; the reading is already printed.
  void browser.close().catch(() => undefined);
}
if (failed !== null) {
  console.error(`PLAY FRAMES: ${failed}`);
  process.exitCode = 1;
}
setTimeout(() => process.exit(process.exitCode ?? 0), 800);
