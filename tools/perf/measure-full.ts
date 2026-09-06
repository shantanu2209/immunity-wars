/**
 * THE MANDATORY FULL-UI PER-REDRAW RE-MEASURE (PHASE2_BRIEF §4, row 3's note: "expected, not
 * optional"; P2_3_MEASUREMENT.md, "Added 5 September 2026": the command tap's breach must be
 * RESOLVED here, not re-deferred).
 *
 *   npx tsx tools/perf/measure-full.ts [url] [rates] [outFile]
 *   e.g. npx tsx tools/perf/measure-full.ts http://localhost:5173/dev.html 1,4,6 out.json
 *
 * The same instrument as `measure.ts` (headless system Chrome over CDP, CPU throttling per
 * rate, every number read from the page's own clock through `window.__iwMetrics`) driven
 * against the dev shell, which mounts the FULL play screen — the effects strip, the command
 * bar with its rows and AP terms, the piece grid, the antibody, body and log panels, the
 * planning screen, the reveal and the goal dialog. P2.3's screening ran against the thin
 * slice; this is the number the rest of the UI spent.
 *
 * Four rows per rate: the initial render (three fresh loads); tap-to-visible on 24 board
 * selection taps; per-redraw work on the frames of four real spreads; and the COMMAND TAP —
 * "Command your cells" on the planning screen, the screen switch that breached row 2 at 6× on
 * 5 September — one per turn, read from `__iwMetrics.transitions`.
 *
 * Optimistic by construction, like P2.3: CDP throttling slows the CPU and nothing else. A
 * failure here is conclusive; a pass needs the handset.
 */

import { writeFileSync } from 'node:fs';
import os from 'node:os';

import puppeteer, { type Page } from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/dev.html';
const RATES = (process.argv[3] ?? '1,4,6').split(',').map(Number);
const OUT = process.argv[4] ?? '';
const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

interface PageMetrics {
  initialRenderMs: number | null;
  taps: { ms: number; busyMs: number; cell: string }[];
  frames: { ms: number; busyMs: number; label: string; dice: boolean }[];
  transitions: { ms: number; busyMs: number; organs: number; at: number }[];
  longTasks: { start: number; ms: number }[];
}

const pct = (xs: number[], p: number): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? NaN;
};
const summary = (xs: number[]): { n: number; p50: number; p95: number; max: number } | null =>
  xs.length
    ? {
        n: xs.length,
        p50: Math.round(pct(xs, 50) * 10) / 10,
        p95: Math.round(pct(xs, 95) * 10) / 10,
        max: Math.round(Math.max(...xs) * 10) / 10,
      }
    : null;

const status = (page: Page): Promise<string> =>
  page.evaluate(() => document.querySelector('p')?.textContent ?? '');

const clickExact = (page: Page, label: string): Promise<boolean> =>
  page.evaluate((l: string) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim() === l);
    if (!b || b.disabled) return false;
    b.click();
    return true;
  }, label);

const clickIncludes = (page: Page, label: string): Promise<void> =>
  page.evaluate((l: string) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes(l));
    if (!b || b.disabled) throw new Error(`button not clickable: ${l}`);
    b.click();
  }, label);

const metricsOf = (page: Page): Promise<PageMetrics> =>
  page.evaluate(
    () => (globalThis as unknown as { __iwMetrics: PageMetrics }).__iwMetrics,
  ) as Promise<PageMetrics>;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function measureRate(rate: number): Promise<Record<string, unknown>> {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 780 });
    await page.emulateCPUThrottling(rate);

    // --- row 1: the initial render, three fresh loads ---
    const initial: number[] = [];
    for (let k = 0; k < 3; k += 1) {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForFunction(
        () =>
          (globalThis as unknown as { __iwMetrics?: PageMetrics }).__iwMetrics?.initialRenderMs !=
          null,
        { timeout: 60000 },
      );
      const m = await metricsOf(page);
      initial.push(Math.round((m.initialRenderMs ?? NaN) * 10) / 10);
    }
    await clickExact(page, 'Begin');

    // --- row 2: tap -> visible, 24 board selection taps through Session ---
    const cells = ['macrophage', 'neutrophil', 'tcell', 'nk'];
    for (let i = 0; i < 24; i += 1) {
      const cell = cells[i % cells.length] as string;
      await page.evaluate((ck: string) => {
        const el = document.querySelector(`[data-cell="${ck}"]`);
        if (!el) throw new Error(`no cell token: ${ck}`);
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }, cell);
      await page.waitForFunction(
        (n: number) =>
          (globalThis as unknown as { __iwMetrics: PageMetrics }).__iwMetrics.taps.length >= n,
        { timeout: 30000 },
        i + 1,
      );
    }

    // --- rows 3 and 4: four full turns — the reveal, the planning screen, the COMMAND TAP
    //     (a transition), the command phase, the spread's frames ---
    let commandTaps = 0;
    for (let t = 0; t < 4; t += 1) {
      const before = await status(page);
      if (!before.includes('phase infection')) break;
      await clickIncludes(page, 'Draw');
      await page
        .waitForFunction(
          () =>
            [...document.querySelectorAll('button')].some(
              (x) => x.textContent?.trim() === 'Continue',
            ),
          { timeout: 30000 },
        )
        .catch(() => undefined);
      await clickExact(page, 'Continue');
      await sleep(150);
      // The planning screen's own button is the command tap; the dev shell's "Begin command"
      // is the fallback when the model does not show the screen (a mop-up draw).
      const viaPlanning = await clickExact(page, 'Command your cells');
      if (viaPlanning) {
        commandTaps += 1;
        await page.waitForFunction(
          (n: number) =>
            (globalThis as unknown as { __iwMetrics: PageMetrics }).__iwMetrics.transitions
              .length >= n,
          { timeout: 30000 },
          commandTaps,
        );
      } else {
        await clickIncludes(page, 'Begin command');
      }
      await page.waitForFunction(
        () => {
          const b = [...document.querySelectorAll('button')].find((x) =>
            x.textContent?.includes('End command'),
          );
          return b ? !b.disabled : false;
        },
        { timeout: 30000 },
      );
      await clickIncludes(page, 'End command');
      await page.waitForFunction(
        () => {
          const p = document.querySelector('p')?.textContent ?? '';
          return !p.includes('SPREAD') && p.includes('phase infection');
        },
        { timeout: 180000 },
      );
    }

    const m = await metricsOf(page);
    return {
      cpuThrottle: `${rate}x`,
      initialRenderMs: initial,
      tapBusyMs: summary(m.taps.map((t) => t.busyMs)),
      tapToPaintMs: summary(m.taps.map((t) => t.ms)),
      commandTapBusyMs: summary(m.transitions.map((t) => t.busyMs)),
      commandTapToPaintMs: summary(m.transitions.map((t) => t.ms)),
      commandTaps: m.transitions.length,
      frameBusyMs: summary(m.frames.map((f) => f.busyMs)),
      frameToPaintMs: summary(m.frames.map((f) => f.ms)),
      frameCount: m.frames.length,
      longTasks: {
        count: m.longTasks.length,
        maxMs: m.longTasks.length ? Math.round(Math.max(...m.longTasks.map((l) => l.ms))) : 0,
        totalMs: Math.round(m.longTasks.reduce((s, l) => s + l.ms, 0)),
      },
    };
  } finally {
    await browser.close();
  }
}

const device = `${os.cpus()[0]?.model ?? 'unknown CPU'} (${os.cpus().length} threads), Windows, headless system Chrome, 360x780`;
const results: Record<string, unknown>[] = [];
for (const rate of RATES) {
  console.error(`measuring the full UI at ${rate}x CPU throttling…`);
  results.push(await measureRate(rate));
}
const out = { device, url: URL, when: new Date().toISOString(), results };
console.log(JSON.stringify(out, null, 2));
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 2));
