/**
 * P2.3 — the screening measurement, as a program rather than a hand on DevTools.
 *
 *   npx tsx tools/perf/measure.ts [url] [rates] [outFile]
 *   e.g. npx tsx tools/perf/measure.ts http://localhost:5173 1,4,6 perf-results.json
 *
 * Launches the SYSTEM Chrome over CDP (puppeteer-core: no bundled browser), applies CPU
 * throttling per rate, and drives the dev shell exactly as a person would: three fresh loads
 * for the initial-render row, a run of alternating cell taps for the tap row, and four full
 * turns for the per-redraw row. Every number is read out of the page's own
 * `window.__iwMetrics` — the DEVICE CLOCK, per PHASE2_BRIEF §4; this script only orchestrates
 * and aggregates.
 *
 * What throttling here IS and IS NOT (§4): `Emulation.setCPUThrottlingRate` slows the CPU but
 * not memory bandwidth or storage, and cannot reproduce thermal throttling — it errs
 * OPTIMISTIC, which is right for a screening pass: a failure is conclusive, a pass needs
 * confirming on real low-end hardware. The deciding pass is NOT this script's to claim.
 */

import { writeFileSync } from 'node:fs';
import os from 'node:os';

import puppeteer, { type Page } from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173';
const RATES = (process.argv[3] ?? '1,4,6').split(',').map(Number);
const OUT = process.argv[4] ?? '';
const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

interface PageMetrics {
  initialRenderMs: number | null;
  taps: { ms: number; busyMs: number; cell: string }[];
  frames: { ms: number; busyMs: number; label: string; dice: boolean }[];
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

const clickButton = (page: Page, label: string): Promise<void> =>
  page.evaluate((l) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes(l));
    if (!b || b.disabled) throw new Error(`button not clickable: ${l}`);
    b.click();
  }, label);

const metricsOf = (page: Page): Promise<PageMetrics> =>
  page.evaluate(
    () => (globalThis as unknown as { __iwMetrics: PageMetrics }).__iwMetrics,
  ) as Promise<PageMetrics>;

async function measureRate(rate: number): Promise<Record<string, unknown>> {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 1000 });
    await page.emulateCPUThrottling(rate);

    // --- initial full-board render, three fresh loads ---
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

    // --- tap -> visible: 24 alternating cell selections through Session ---
    const cells = ['macrophage', 'neutrophil', 'tcell', 'nk'];
    for (let i = 0; i < 24; i += 1) {
      const cell = cells[i % cells.length] as string;
      await page.evaluate((ck) => {
        const el = document.querySelector(`[data-cell="${ck}"]`);
        if (!el) throw new Error(`no cell token: ${ck}`);
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }, cell);
      await page.waitForFunction(
        (n) => (globalThis as unknown as { __iwMetrics: PageMetrics }).__iwMetrics.taps.length >= n,
        { timeout: 30000 },
        i + 1,
      );
    }

    // --- per-redraw work: four full turns of real spreads ---
    for (let t = 0; t < 4; t += 1) {
      const before = await status(page);
      if (!before.includes('phase infection')) break; // game ended early; keep what we have
      await clickButton(page, 'Draw');
      await page.waitForFunction(
        () => {
          const b = [...document.querySelectorAll('button')].find((x) =>
            x.textContent?.includes('Begin command'),
          );
          return b ? !b.disabled : false;
        },
        { timeout: 30000 },
      );
      await clickButton(page, 'Begin command');
      await page.waitForFunction(
        () => {
          const b = [...document.querySelectorAll('button')].find((x) =>
            x.textContent?.includes('End command'),
          );
          return b ? !b.disabled : false;
        },
        { timeout: 30000 },
      );
      await clickButton(page, 'End command');
      await page.waitForFunction(
        () => {
          const p = document.querySelector('p')?.textContent ?? '';
          return !p.includes('SPREAD') && p.includes('phase infection');
        },
        { timeout: 120000 },
      );
    }

    const m = await metricsOf(page);
    const checks = await page.evaluate(
      () => document.querySelector('pre')?.textContent?.split('\n') ?? [],
    );
    return {
      cpuThrottle: `${rate}x`,
      initialRenderMs: initial,
      // busyMs is §4's budget metric (main-thread work); wall-to-paint carries a ~2-vsync floor.
      tapBusyMs: summary(m.taps.map((t) => t.busyMs)),
      tapToPaintMs: summary(m.taps.map((t) => t.ms)),
      frameBusyMs: summary(m.frames.map((f) => f.busyMs)),
      frameToPaintMs: summary(m.frames.map((f) => f.ms)),
      frameCount: m.frames.length,
      longTasks: {
        count: m.longTasks.length,
        maxMs: m.longTasks.length ? Math.round(Math.max(...m.longTasks.map((l) => l.ms))) : 0,
        totalMs: Math.round(m.longTasks.reduce((s, l) => s + l.ms, 0)),
      },
      tailChecks: checks.filter((c: string) => c.includes('tail')),
    };
  } finally {
    await browser.close();
  }
}

const device = `${os.cpus()[0]?.model ?? 'unknown CPU'} (${os.cpus().length} threads), Windows, headless system Chrome`;
const results: Record<string, unknown>[] = [];
for (const rate of RATES) {
  console.error(`measuring at ${rate}x CPU throttling…`);
  results.push(await measureRate(rate));
}
const out = { device, url: URL, when: new Date().toISOString(), results };
console.log(JSON.stringify(out, null, 2));
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 2));
