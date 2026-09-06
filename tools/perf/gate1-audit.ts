/**
 * GATE 1 HYGIENE, THE HEADLESS HALF (P2.5, 6 September 2026; PHASE2_BRIEF §1).
 *
 *   npx tsx tools/perf/gate1-audit.ts [url] [outJson]
 *
 * Drives the APP SHELL (index.html — the thing a player installs, not the dev shell) through
 * every screen a game passes: Title, Difficulty, the goal dialog, the reveal, the planning
 * screen, the command screen with its sheet and cards and pause menu, a spread, and the
 * Result screen. On each screen it runs the four machine-checkable Gate 1 items:
 *
 *   TOUCH    every visible interactive control is >= 44 x 44 CSS px (WCAG 2.5.5's size).
 *            The board's SVG is excluded ON PURPOSE: the board is coarse pointing by ruling
 *            (nearest node within 60u) and the inspect sheet is the precise surface — the
 *            touch-target pattern P2.5 piece 1 chose, recorded in P2_5_PROGRESS.md.
 *   CONTRAST every visible text run: its colour against the first opaque background up the
 *            tree, >= 4.5:1, or >= 3:1 for large text (>= 24px, or >= 18.66px bold) — WCAG
 *            1.4.3. Non-text: every control's border against the surface behind it, >= 3:1 —
 *            1.4.11. Text inside the SVG board and text over images are NOT measured here;
 *            they are the art pipeline's measured values (ASSETS.md) and the finger pass.
 *   ZOOM200  the same screens at a 180 x 390 viewport, the layout 200% zoom produces on a
 *            360 x 780 phone (WCAG 1.4.4): no horizontal scrolling, every control still in
 *            the document, and text that is clipped rather than wrapped listed.
 *   OFFLINE  after the first load, the network is cut: a full turn is played and every
 *            failed request recorded; then a reload with no network, which a plain SPA fails.
 *
 * EVERY CHECK HAS A CONTROL that runs first, on the title screen: a 20px button, a #999-on-
 * white span, a 600px-wide block at 180px, and a request to a fresh URL while offline. Each
 * must be flagged, or the audit stops and says the instrument is broken. A check that has
 * never failed is not known to work.
 *
 * Output: a JSON report (every finding with its screen, selector path, values) on stdout and
 * to outJson; the human-readable summary is written by whoever runs it into GATE1_AUDIT.md.
 * Numbers only; no "looks fine".
 */

import { writeFileSync } from 'node:fs';

import puppeteer, { type Page } from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173';
const OUT = process.argv[3] ?? '';
const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

interface Finding {
  check: 'touch' | 'contrast' | 'nontext' | 'zoom' | 'offline';
  screen: string;
  path: string;
  text: string;
  detail: string;
}

interface ScreenResult {
  screen: string;
  controls: number;
  textRuns: number;
  findings: Finding[];
}

/* ------------------------------------------------------------------------------------------ *
 * THE PAGE-SIDE AUDITOR — injected as a string so tsx cannot decorate it (`__name`), the
 * pattern every headless driver here uses.
 * ------------------------------------------------------------------------------------------ */
const AUDITOR = `
(() => {
  const lum = (rgb) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  };
  const ratio = (a, b) => { const la = lum(a) + 0.05, lb = lum(b) + 0.05; return la > lb ? la / lb : lb / la; };
  const parse = (s) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(s || '');
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
  };
  const pathOf = (el) => {
    const parts = [];
    let e = el;
    while (e && e !== document.body && parts.length < 6) {
      let s = e.tagName.toLowerCase();
      for (const a of e.attributes) if (a.name.startsWith('data-')) { s += '[' + a.name + (a.value ? '=' + a.value.slice(0, 20) : '') + ']'; break; }
      parts.unshift(s);
      e = e.parentElement;
    }
    return parts.join('>');
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
  };
  const bgBehind = (el) => {
    let e = el;
    while (e) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c && c.a >= 0.99) return c.rgb;
      if (getComputedStyle(e).backgroundImage !== 'none') return null;
      e = e.parentElement;
    }
    return [255, 255, 255];
  };
  const inSvg = (el) => !!el.closest('svg');
  const out = { controls: 0, textRuns: 0, findings: [] };

  // TOUCH: interactive controls outside the SVG board.
  for (const el of document.querySelectorAll('button, a[href], input, select, textarea, [role=button]')) {
    if (inSvg(el) || !visible(el)) continue;
    out.controls += 1;
    const r = el.getBoundingClientRect();
    if (r.width < 44 - 0.5 || r.height < 44 - 0.5)
      out.findings.push({ check: 'touch', path: pathOf(el), text: (el.textContent || '').trim().slice(0, 40), detail: Math.round(r.width) + 'x' + Math.round(r.height) });
    // NON-TEXT: the control's border against what is behind it, when it has a visible border.
    const cs = getComputedStyle(el);
    // A control's BOUNDARY is a border on every side; a top-only border is a divider between
    // rows (decorative under 1.4.11), so it is not measured as a component boundary.
    const bw = Math.min(
      parseFloat(cs.borderTopWidth), parseFloat(cs.borderLeftWidth),
      parseFloat(cs.borderRightWidth), parseFloat(cs.borderBottomWidth),
    );
    const bc = parse(cs.borderTopColor);
    if (bw >= 1 && bc && bc.a > 0.5 && cs.borderTopStyle !== 'none' && cs.borderRightStyle !== 'none') {
      const behind = bgBehind(el.parentElement);
      if (behind) {
        const rr = ratio(bc.rgb, behind);
        if (rr < 3) out.findings.push({ check: 'nontext', path: pathOf(el), text: (el.textContent || '').trim().slice(0, 40), detail: 'border ' + cs.borderTopColor + ' on rgb(' + behind.join(',') + ') = ' + rr.toFixed(2) + ':1' });
      }
    }
  }

  // CONTRAST: every element with its own text, outside the SVG.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let node;
  while ((node = walker.nextNode())) {
    const txt = (node.textContent || '').trim();
    if (!txt) continue;
    const el = node.parentElement;
    if (!el || inSvg(el) || seen.has(el) || !visible(el)) continue;
    seen.add(el);
    out.textRuns += 1;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    const bg = bgBehind(el);
    if (!fg || !bg) continue;
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const rr = ratio(fg.rgb, bg);
    if (rr < need)
      out.findings.push({ check: 'contrast', path: pathOf(el), text: txt.slice(0, 40), detail: cs.color + ' on rgb(' + bg.join(',') + ') = ' + rr.toFixed(2) + ':1, need ' + need + ' (' + Math.round(size) + 'px' + (bold ? ' bold' : '') + ')' });
  }
  return out;
})()
`;

const ZOOM_AUDITOR = `
(() => {
  const out = { findings: [] };
  const w = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > w + 1) {
    // Name the culprits: the outermost elements whose right edge passes the viewport.
    const over = [...document.querySelectorAll('body *')]
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter((x) => x.r.width > 0 && x.r.right > w + 0.5)
      .filter((x, _, all) => !all.some((y) => y !== x && y.e.contains(x.e)))
      .slice(0, 5)
      .map((x) => x.e.tagName.toLowerCase() + '[' + [...x.e.attributes].filter((a) => a.name.startsWith('data-')).map((a) => a.name + '=' + a.value.slice(0, 16)).join(' ') + '] right ' + Math.round(x.r.right) + ' "' + (x.e.textContent || '').trim().slice(0, 24) + '"');
    out.findings.push({ check: 'zoom', path: 'html', text: over.join(' | '), detail: 'horizontal overflow: scrollWidth ' + document.documentElement.scrollWidth + ' > viewport ' + w });
  }
  const inSvg = (el) => !!el.closest('svg');
  for (const el of document.querySelectorAll('button, a[href], input, select, [role=button]')) {
    if (inSvg(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > w + 1 || r.left < -1)
      out.findings.push({ check: 'zoom', path: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 40), detail: 'control outside the viewport: left ' + Math.round(r.left) + ' right ' + Math.round(r.right) + ' of ' + w });
  }
  for (const el of document.querySelectorAll('*')) {
    if (inSvg(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.overflow === 'hidden' && cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)
      out.findings.push({ check: 'zoom', path: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 40), detail: 'clipped with an ellipsis: ' + el.scrollWidth + ' > ' + el.clientWidth });
  }
  return out;
})()
`;

const click = (page: Page, label: string): Promise<boolean> =>
  page.evaluate((l: string) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim() === l);
    if (!b || b.disabled) return false;
    b.click();
    return true;
  }, label);

const clickSel = (page: Page, sel: string): Promise<boolean> =>
  page.evaluate((s: string) => {
    const el = document.querySelector(s) as HTMLElement | null;
    if (!el) return false;
    el.click();
    return true;
  }, sel);

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function audit(page: Page, screen: string, results: ScreenResult[]): Promise<void> {
  const r = (await page.evaluate(AUDITOR)) as {
    controls: number;
    textRuns: number;
    findings: Omit<Finding, 'screen'>[];
  };
  results.push({
    screen,
    controls: r.controls,
    textRuns: r.textRuns,
    findings: r.findings.map((f) => ({ ...f, screen })),
  });
}

async function zoomAudit(page: Page, screen: string, results: ScreenResult[]): Promise<void> {
  const r = (await page.evaluate(ZOOM_AUDITOR)) as { findings: Omit<Finding, 'screen'>[] };
  results.push({
    screen: `${screen} @200%`,
    controls: 0,
    textRuns: 0,
    findings: r.findings.map((f) => ({ ...f, screen: `${screen} @200%` })),
  });
}

/** Title → Difficulty → goal → first draw → reveal → planning → command, auditing each. */
async function walk(page: Page, results: ScreenResult[], zoom: boolean): Promise<void> {
  const step = zoom ? zoomAudit : audit;
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('button') !== null, { timeout: 30000 });
  await step(page, 'title', results);
  await click(page, 'New game');
  await sleep(200);
  // A saved game asks before it is replaced.
  await click(page, 'Start and replace');
  await sleep(200);
  await step(page, 'difficulty', results);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find(
      (x) => x.textContent?.trim() === 'Training' && x.children.length === 0,
    ) as HTMLElement | undefined;
    el?.click();
  });
  await sleep(400);
  await step(page, 'goal dialog', results);
  await click(page, 'Begin');
  await sleep(200);
  await step(page, 'play, infection phase', results);
  await click(page, 'Draw a card');
  await sleep(600);
  await step(page, 'reveal dialog', results);
  await click(page, 'Continue');
  await sleep(300);
  await step(page, 'planning', results);
  await clickSel(page, '[data-planning-ap]');
  await sleep(200);
  await step(page, 'planning, AP terms open', results);
  await click(page, 'Command your cells');
  await sleep(900);
  await step(page, 'command, nothing selected', results);
  await clickSel(page, '[data-piece="cell:bcell"]');
  await sleep(300);
  await clickSel(page, '[data-bar-ap]');
  await sleep(200);
  await step(page, 'command, B-Cell selected, AP terms open', results);
  await page.evaluate(() => {
    const chip = [...document.querySelectorAll('button')].find((b) =>
      /^ENV\b/.test(b.innerText.trim()),
    );
    chip?.click();
  });
  await sleep(300);
  await step(page, 'command, family ENV selected', results);
  await clickSel(page, '[data-bar-card="1"]');
  await sleep(300);
  await step(page, 'cell card', results);
  await click(page, 'Close');
  await sleep(200);
  await clickSel(page, '[data-piece="cell:neutrophil"]');
  await sleep(300);
  await step(page, 'command, Neutrophil selected', results);
  // The inspect sheet: the first board node with something on it, through the piece's own
  // "What's here" when it stands with something, else a pathogen row via the planning card.
  const opened = await click(page, "What's here");
  if (opened) {
    await sleep(300);
    await step(page, 'inspect sheet', results);
    await click(page, 'Close');
    await sleep(200);
  }
  await click(page, 'Menu');
  await sleep(300);
  await step(page, 'pause sheet', results);
  await click(page, 'Resume');
  await sleep(200);
  // A spread: End turn, then audit a frame with its narration, then tap through.
  await click(page, 'End turn');
  await sleep(400);
  await step(page, 'spread frame', results);
  for (let i = 0; i < 20; i += 1) {
    const done = await page.evaluate(() => {
      const el = document.querySelector('[data-tap-advance]');
      if (el) {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        return false;
      }
      return true;
    });
    await sleep(150);
    if (done) break;
  }
  await sleep(600);
  await step(page, 'play, next turn', results);
}

/** The Result screen: an idle game on Training is lost within a handful of turns. */
async function walkToResult(page: Page, results: ScreenResult[], zoom: boolean): Promise<void> {
  const step = zoom ? zoomAudit : audit;
  for (let turn = 0; turn < 14; turn += 1) {
    const ended = await page.evaluate(() => document.body.innerText.includes('Play again'));
    if (ended) break;
    if (await click(page, 'Draw a card')) {
      await sleep(400);
      await click(page, 'Continue');
      await sleep(200);
      await click(page, 'Command your cells');
      await sleep(700);
    }
    await click(page, 'End turn');
    for (let i = 0; i < 40; i += 1) {
      await sleep(120);
      const state = await page.evaluate(() => {
        if (document.body.innerText.includes('Play again')) return 'result';
        const el = document.querySelector('[data-tap-advance]');
        if (el) {
          el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          return 'frame';
        }
        return 'idle';
      });
      if (state === 'result') break;
      if (state === 'idle' && i > 8) break;
    }
  }
  const ended = await page.evaluate(() => document.body.innerText.includes('Play again'));
  if (ended) await step(page, 'result', results);
  else
    results.push({
      screen: 'result',
      controls: 0,
      textRuns: 0,
      findings: [
        {
          check: 'touch',
          screen: 'result',
          path: '',
          text: '',
          detail: 'NOT REACHED in 14 idle turns',
        },
      ],
    });
}

/** The controls: each check must flag a planted defect on the title screen, or the audit stops. */
async function controls(page: Page): Promise<string[]> {
  const lines: string[] = [];
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('button') !== null, { timeout: 30000 });
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.textContent = 'planted small';
    b.setAttribute('data-control', 'small');
    Object.assign(b.style, {
      width: '20px',
      height: '20px',
      border: '1px solid #eee',
      background: '#fff',
    });
    document.body.appendChild(b);
    const s = document.createElement('span');
    s.textContent = 'planted faint';
    s.setAttribute('data-control', 'faint');
    Object.assign(s.style, { color: '#999', background: '#fff', fontSize: '13px' });
    document.body.appendChild(s);
  });
  const r = (await page.evaluate(AUDITOR)) as { findings: Omit<Finding, 'screen'>[] };
  const small = r.findings.some((f) => f.check === 'touch' && f.text === 'planted small');
  const faint = r.findings.some((f) => f.check === 'contrast' && f.text === 'planted faint');
  const border = r.findings.some((f) => f.check === 'nontext' && f.text === 'planted small');
  lines.push(`CONTROL touch: a 20px button is flagged: ${small ? 'YES' : 'NO'}`);
  lines.push(`CONTROL contrast: #999 on white (2.85:1) is flagged: ${faint ? 'YES' : 'NO'}`);
  lines.push(`CONTROL nontext: a #eee border on white is flagged: ${border ? 'YES' : 'NO'}`);
  await page.setViewport({ width: 180, height: 390 });
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.textContent = 'planted wide';
    d.setAttribute('data-control', 'wide');
    Object.assign(d.style, { width: '600px', height: '10px' });
    document.body.appendChild(d);
  });
  const z = (await page.evaluate(ZOOM_AUDITOR)) as { findings: Omit<Finding, 'screen'>[] };
  const wide = z.findings.some(
    (f) => f.check === 'zoom' && f.detail.startsWith('horizontal overflow'),
  );
  lines.push(`CONTROL zoom: a 600px block at 180px is flagged as overflow: ${wide ? 'YES' : 'NO'}`);
  await page.setViewport({ width: 360, height: 780 });
  await page.setOfflineMode(true);
  const failed = await page.evaluate(async () => {
    try {
      await fetch('/art/control-does-not-exist.webp', { cache: 'no-store' });
      return false;
    } catch {
      return true;
    }
  });
  await page.setOfflineMode(false);
  lines.push(`CONTROL offline: a fresh fetch fails with the network cut: ${failed ? 'YES' : 'NO'}`);
  if (!(small && faint && border && wide && failed))
    throw new Error(`A CONTROL DID NOT FIRE:\n${lines.join('\n')}`);
  return lines;
}

async function offline(page: Page): Promise<Record<string, unknown>> {
  const failedRequests: string[] = [];
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText ?? ''}`);
  });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.setOfflineMode(true);
  await click(page, 'New game');
  await sleep(200);
  await click(page, 'Start and replace');
  await sleep(200);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find(
      (x) => x.textContent?.trim() === 'Training' && x.children.length === 0,
    ) as HTMLElement | undefined;
    el?.click();
  });
  await sleep(400);
  await click(page, 'Begin');
  await sleep(200);
  await click(page, 'Draw a card');
  await sleep(500);
  await click(page, 'Continue');
  await sleep(200);
  await click(page, 'Command your cells');
  await sleep(800);
  await clickSel(page, '[data-piece="cell:macrophage"]');
  await sleep(200);
  await click(page, 'End turn');
  for (let i = 0; i < 40; i += 1) {
    await sleep(150);
    const more = await page.evaluate(() => {
      const el = document.querySelector('[data-tap-advance]');
      if (el) {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        return true;
      }
      return false;
    });
    if (!more && i > 6) break;
  }
  const afterTurn = await page.evaluate(() => ({
    turn: (document.body.innerText.match(/Turn (\d+) of/) ?? [])[1] ?? null,
    brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
    images: document.images.length,
  }));
  const playedOffline = { ...afterTurn, failedRequests: [...failedRequests] };
  failedRequests.length = 0;
  let reload: string;
  try {
    await page.reload({ waitUntil: 'load', timeout: 15000 });
    reload = (await page.evaluate(() => document.querySelector('button') !== null))
      ? 'the app came back with no network'
      : 'the page loaded but the app did not render';
  } catch (e) {
    reload = `FAILED: ${(e as Error).message.split('\n')[0] ?? ''}`;
  }
  await page.setOfflineMode(false);
  return { playedOffline, reloadOffline: reload, reloadFailedRequests: failedRequests.slice(0, 5) };
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 780 });
  const controlLines = await controls(page);
  for (const l of controlLines) console.error(l);

  const results: ScreenResult[] = [];
  await page.setViewport({ width: 360, height: 780 });
  await walk(page, results, false);
  await walkToResult(page, results, false);

  const zoomResults: ScreenResult[] = [];
  await page.setViewport({ width: 180, height: 390 });
  await walk(page, zoomResults, true);
  await walkToResult(page, zoomResults, true);

  await page.setViewport({ width: 360, height: 780 });
  const off = await offline(page);

  const out = {
    url: URL,
    when: new Date().toISOString(),
    viewport: '360x780 CSS px (zoom pass: 180x390)',
    controls: controlLines,
    screens: results,
    zoom: zoomResults,
    offline: off,
    totals: {
      controlsMeasured: results.reduce((n, s) => n + s.controls, 0),
      textRunsMeasured: results.reduce((n, s) => n + s.textRuns, 0),
      touch: results.reduce((n, s) => n + s.findings.filter((f) => f.check === 'touch').length, 0),
      contrast: results.reduce(
        (n, s) => n + s.findings.filter((f) => f.check === 'contrast').length,
        0,
      ),
      nontext: results.reduce(
        (n, s) => n + s.findings.filter((f) => f.check === 'nontext').length,
        0,
      ),
      zoom: zoomResults.reduce((n, s) => n + s.findings.length, 0),
    },
  };
  console.log(JSON.stringify(out, null, 2));
  if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 2));
} finally {
  await browser.close();
}
