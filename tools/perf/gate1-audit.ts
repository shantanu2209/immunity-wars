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
 *            1.4.3. Non-text: every control's full border against the surface behind it,
 *            >= 3:1 — 1.4.11 (a top-only border is a divider, not a boundary). Text inside
 *            the SVG board and text over images are NOT measured here; they are the art
 *            pipeline's measured values (ASSETS.md) and the finger pass.
 *   TEXT200  THE THING, NOT A PROXY (Shantanu's finding on the S25, 6 September 2026: the
 *            phone's font size at 200% changed nothing on the page, and the audit's earlier
 *            180px-viewport pass had "passed" the layout consequence of a scaling that never
 *            happened). The root font size is set to 200% on every load, at the full 360px
 *            width, and on every screen: (1) every text run's computed size must be >= 1.9x
 *            what it is at 100% — text that does not scale is listed by name; (2) the layout
 *            must survive it: no horizontal scrolling, every control still in the viewport,
 *            no text clipped to an ellipsis.
 *   OFFLINE  after the first load, the network is cut: a full turn is played and every
 *            failed request recorded; then a reload with no network, which MUST render the
 *            app and let a turn be played (the service worker's precache; FINDINGS #59).
 *
 * EVERY CHECK HAS A CONTROL that runs first, on the title screen: a 20px button, a #999-on-
 * white span, a #eee-bordered button, a 13px span that must be flagged as NOT scaling beside
 * a 0.8125rem span that must not be, a 600px block that must overflow, and a request to a
 * fresh URL while offline that must fail. Each must fire, or the audit stops and says the
 * instrument is broken. A check that has never failed is not known to work — and a check
 * that measured a proxy had never failed on the thing (this one's own history).
 *
 * Output: a JSON report (every finding with its screen, selector path, values) on stdout and
 * to outJson; the summary is written by whoever runs it into GATE1_AUDIT.md. Numbers only.
 */

import { writeFileSync } from 'node:fs';

import puppeteer, { type Page } from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173';
const OUT = process.argv[3] ?? '';
const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

interface Finding {
  check: 'touch' | 'contrast' | 'nontext' | 'scale' | 'layout' | 'offline';
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
 * THE PAGE-SIDE AUDITORS — injected as strings so tsx cannot decorate them (`__name`), the
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

  for (const el of document.querySelectorAll('button, a[href], input, select, textarea, [role=button]')) {
    if (inSvg(el) || !visible(el)) continue;
    out.controls += 1;
    const r = el.getBoundingClientRect();
    if (r.width < 44 - 0.5 || r.height < 44 - 0.5)
      out.findings.push({ check: 'touch', path: pathOf(el), text: (el.textContent || '').trim().slice(0, 40), detail: Math.round(r.width) + 'x' + Math.round(r.height) });
    const cs = getComputedStyle(el);
    const bw = Math.min(parseFloat(cs.borderTopWidth), parseFloat(cs.borderLeftWidth), parseFloat(cs.borderRightWidth), parseFloat(cs.borderBottomWidth));
    const bc = parse(cs.borderTopColor);
    if (bw >= 1 && bc && bc.a > 0.5 && cs.borderTopStyle !== 'none' && cs.borderRightStyle !== 'none') {
      const behind = bgBehind(el.parentElement);
      if (behind) {
        const rr = ratio(bc.rgb, behind);
        if (rr < 3) out.findings.push({ check: 'nontext', path: pathOf(el), text: (el.textContent || '').trim().slice(0, 40), detail: 'border ' + cs.borderTopColor + ' on rgb(' + behind.join(',') + ') = ' + rr.toFixed(2) + ':1' });
      }
    }
  }

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

/** Runs with the root at 200%: scaling per text run (toggling the root to 100% to compare),
 *  then the layout at that size. */
const TEXT200_AUDITOR = `
(() => {
  const out = { findings: [], runs: 0 };
  const inSvg = (el) => !!el.closest('svg');
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const els = [];
  const seen = new Set();
  let node;
  while ((node = walker.nextNode())) {
    const el = node.parentElement;
    if (!el || inSvg(el) || seen.has(el) || !(node.textContent || '').trim() || !visible(el)) continue;
    seen.add(el);
    els.push(el);
  }
  const at200 = els.map((el) => parseFloat(getComputedStyle(el).fontSize));
  const root = document.documentElement;
  const was = root.style.fontSize;
  root.style.fontSize = '100%';
  const at100 = els.map((el) => parseFloat(getComputedStyle(el).fontSize));
  root.style.fontSize = was || '200%';
  els.forEach((el, i) => {
    out.runs += 1;
    const k = at100[i] > 0 ? at200[i] / at100[i] : 0;
    if (k < 1.9) {
      let s = el.tagName.toLowerCase();
      for (const a of el.attributes) if (a.name.startsWith('data-')) { s += '[' + a.name + '=' + a.value.slice(0, 16) + ']'; break; }
      out.findings.push({ check: 'scale', path: s, text: (el.textContent || '').trim().slice(0, 40), detail: at100[i] + 'px at 100%, ' + at200[i] + 'px at 200% (x' + k.toFixed(2) + ')' });
    }
  });
  const w = root.clientWidth;
  if (root.scrollWidth > w + 1) {
    const over = [...document.querySelectorAll('body *')]
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter((x) => x.r.width > 0 && x.r.right > w + 0.5)
      .filter((x, _, all) => !all.some((y) => y !== x && y.e.contains(x.e)))
      .slice(0, 5)
      .map((x) => x.e.tagName.toLowerCase() + '[' + [...x.e.attributes].filter((a) => a.name.startsWith('data-')).map((a) => a.name + '=' + a.value.slice(0, 16)).join(' ') + '] right ' + Math.round(x.r.right) + ' "' + (x.e.textContent || '').trim().slice(0, 24) + '"');
    out.findings.push({ check: 'layout', path: 'html', text: over.join(' | '), detail: 'horizontal overflow: scrollWidth ' + root.scrollWidth + ' > viewport ' + w });
  }
  for (const el of document.querySelectorAll('button, a[href], input, select, [role=button]')) {
    if (inSvg(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > w + 1 || r.left < -1)
      out.findings.push({ check: 'layout', path: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 40), detail: 'control outside the viewport: left ' + Math.round(r.left) + ' right ' + Math.round(r.right) + ' of ' + w });
  }
  for (const el of document.querySelectorAll('*')) {
    if (inSvg(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.overflow === 'hidden' && cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)
      out.findings.push({ check: 'layout', path: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 40), detail: 'clipped with an ellipsis: ' + el.scrollWidth + ' > ' + el.clientWidth });
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

/** Advances a spread frame through the tap-anywhere overlay; false when no burst is playing. */
const advance = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const el = document.querySelector('[data-tap-advance]');
    if (!el) return false;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return true;
  });

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

async function text200Audit(page: Page, screen: string, results: ScreenResult[]): Promise<void> {
  const r = (await page.evaluate(TEXT200_AUDITOR)) as {
    findings: Omit<Finding, 'screen'>[];
    runs: number;
  };
  results.push({
    screen: `${screen} @200% text`,
    controls: 0,
    textRuns: r.runs,
    findings: r.findings.map((f) => ({ ...f, screen: `${screen} @200% text` })),
  });
}

/** Title → Difficulty → goal → first draw → reveal → planning → command, auditing each. */
async function walk(
  page: Page,
  results: ScreenResult[],
  step: (page: Page, screen: string, results: ScreenResult[]) => Promise<void>,
  rootPct: string | null = null,
): Promise<void> {
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('button') !== null, { timeout: 30000 });
  // The app renders from a module script BEFORE DOMContentLoaded, so the root size installed
  // by `rootFontSize` can land after the title screen exists: set it again, explicitly, before
  // the first screen is measured (the first run measured the title at 100% and called it
  // unscaled — the instrument, not the screen).
  await page.evaluate((p: string | null) => {
    if (p) document.documentElement.style.fontSize = p;
  }, rootPct);
  await sleep(100);
  await step(page, 'title', results);
  await click(page, 'New game');
  await sleep(200);
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
  await click(page, 'End turn');
  await sleep(400);
  await step(page, 'spread frame', results);
  for (let i = 0; i < 20; i += 1) {
    const more = await advance(page);
    await sleep(150);
    if (!more) break;
  }
  await sleep(600);
  await step(page, 'play, next turn', results);
}

/** The Result screen: an idle game on Training is lost within a handful of turns. */
async function walkToResult(
  page: Page,
  results: ScreenResult[],
  step: (page: Page, screen: string, results: ScreenResult[]) => Promise<void>,
): Promise<void> {
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
      const ended2 = await page.evaluate(() => document.body.innerText.includes('Play again'));
      if (ended2) break;
      const more = await advance(page);
      if (!more && i > 8) break;
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

/** Sets the root font size on every document the page loads from now on (200%), or clears it. */
async function rootFontSize(page: Page, pct: string | null): Promise<void> {
  await page.evaluateOnNewDocument((p: string | null) => {
    const apply = (): void => {
      document.documentElement.style.fontSize = p ?? '';
    };
    if (document.readyState !== 'loading') apply();
    else document.addEventListener('DOMContentLoaded', apply);
  }, pct);
}

/** The controls: each check must flag a planted defect on the title screen, or the audit stops. */
async function controls(page: Page): Promise<string[]> {
  const lines: string[] = [];
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('button') !== null, { timeout: 30000 });
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.textContent = 'planted small';
    Object.assign(b.style, {
      width: '20px',
      height: '20px',
      border: '1px solid #eee',
      background: '#fff',
    });
    document.body.appendChild(b);
    const s = document.createElement('span');
    s.textContent = 'planted faint';
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
  // TEXT200: a px span must be flagged as not scaling; a rem span must not; a 600px block overflows.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
    const px = document.createElement('span');
    px.textContent = 'planted px';
    px.style.fontSize = '13px';
    document.body.appendChild(px);
    const rem = document.createElement('span');
    rem.textContent = 'planted rem';
    rem.style.fontSize = '0.8125rem';
    document.body.appendChild(rem);
    const d = document.createElement('div');
    d.textContent = 'planted wide';
    Object.assign(d.style, { width: '600px', height: '10px' });
    document.body.appendChild(d);
  });
  const z = (await page.evaluate(TEXT200_AUDITOR)) as { findings: Omit<Finding, 'screen'>[] };
  const pxFlagged = z.findings.some((f) => f.check === 'scale' && f.text === 'planted px');
  const remFlagged = z.findings.some((f) => f.check === 'scale' && f.text === 'planted rem');
  const wide = z.findings.some(
    (f) => f.check === 'layout' && f.detail.startsWith('horizontal overflow'),
  );
  lines.push(
    `CONTROL scale: a 13px span is flagged as not scaling at 200%: ${pxFlagged ? 'YES' : 'NO'}`,
  );
  lines.push(
    `CONTROL scale: a 0.8125rem span is NOT flagged (it scales): ${remFlagged ? 'NO' : 'YES'}`,
  );
  lines.push(
    `CONTROL layout: a 600px block at 360px is flagged as overflow: ${wide ? 'YES' : 'NO'}`,
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
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
  if (!(small && faint && border && pxFlagged && !remFlagged && wide && failed))
    throw new Error(`A CONTROL DID NOT FIRE:\n${lines.join('\n')}`);
  return lines;
}

/** Waits for a button by its exact text (the app hydrates a beat after the document), clicks it. */
async function waitClick(page: Page, label: string, ms = 8000): Promise<boolean> {
  const ok = await page
    .waitForFunction(
      (l: string) =>
        [...document.querySelectorAll('button')].some(
          (b) => b.textContent?.trim() === l && !b.disabled,
        ),
      { timeout: ms },
      label,
    )
    .then(() => true)
    .catch(() => false);
  if (!ok) return false;
  return click(page, label);
}

async function playATurn(
  page: Page,
): Promise<{ turn: string | null; brokenImages: number; images: number; steps: string[] }> {
  // Every step is recorded so a failed offline play says WHERE it stopped, not only that it did.
  const steps: string[] = [];
  const step = async (label: string, run: () => Promise<boolean>): Promise<void> => {
    const ok = await run();
    steps.push(`${label}: ${ok ? 'ok' : 'MISSING'}`);
  };
  await step('New game', () => waitClick(page, 'New game'));
  // A saved game asks before it is replaced; a fresh origin does not. Both are fine.
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('button')].some(
          (b) => b.textContent?.trim() === 'Start and replace',
        ),
      { timeout: 1500 },
    )
    .then(() => click(page, 'Start and replace'))
    .catch(() => undefined);
  await step('Training', async () => {
    await page
      .waitForFunction(
        () =>
          [...document.querySelectorAll('*')].some(
            (x) => x.textContent?.trim() === 'Training' && x.children.length === 0,
          ),
        { timeout: 8000 },
      )
      .catch(() => undefined);
    return page.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find(
        (x) => x.textContent?.trim() === 'Training' && x.children.length === 0,
      ) as HTMLElement | undefined;
      el?.click();
      return el !== undefined;
    });
  });
  // With a saved game the confirmation comes AFTER the difficulty pick (the reload case).
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('button')].some(
          (b) => b.textContent?.trim() === 'Start and replace',
        ),
      { timeout: 1500 },
    )
    .then(() => click(page, 'Start and replace'))
    .catch(() => undefined);
  await step('Begin', () => waitClick(page, 'Begin'));
  await step('Draw a card', () => waitClick(page, 'Draw a card'));
  await step('Continue', () => waitClick(page, 'Continue'));
  await step('Command your cells', () => waitClick(page, 'Command your cells'));
  await step('select the Monocyte', async () => {
    await page
      .waitForFunction(() => document.querySelector('[data-piece="cell:macrophage"]') !== null, {
        timeout: 8000,
      })
      .catch(() => undefined);
    return clickSel(page, '[data-piece="cell:macrophage"]');
  });
  await step('End turn', () => waitClick(page, 'End turn'));
  for (let i = 0; i < 40; i += 1) {
    await sleep(150);
    const more = await advance(page);
    if (!more && i > 6) break;
  }
  const r = await page.evaluate(() => ({
    turn: (document.body.innerText.match(/Turn (\d+) of/) ?? [])[1] ?? null,
    brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
    images: document.images.length,
  }));
  return { ...r, steps };
}

async function offline(page: Page): Promise<Record<string, unknown>> {
  const failedRequests: string[] = [];
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText ?? ''}`);
  });
  // First visit online: whatever the build precaches, it precaches now.
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(1500);
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'none';
    await navigator.serviceWorker.ready;
    return reg.active ? 'active' : 'registered, not active';
  });
  await sleep(1500);
  await page.setOfflineMode(true);
  const playedOffline = { ...(await playATurn(page)), failedRequests: [...failedRequests] };
  failedRequests.length = 0;
  let reload: string;
  let reloadPlayed: { turn: string | null; brokenImages: number; images: number } | null = null;
  try {
    await page.reload({ waitUntil: 'load', timeout: 20000 });
    await sleep(500);
    const rendered = await page.evaluate(() => document.querySelector('button') !== null);
    if (rendered) {
      reloadPlayed = await playATurn(page);
      reload = 'the app came back with no network and a turn was played';
    } else reload = 'the page loaded but the app did not render';
  } catch (e) {
    reload = `FAILED: ${(e as Error).message.split('\n')[0] ?? ''}`;
  }
  await page.setOfflineMode(false);
  return {
    serviceWorker: sw,
    playedOffline,
    reloadOffline: reload,
    reloadPlayed,
    reloadFailedRequests: failedRequests.slice(0, 8),
    // MET means: a turn played after the reload with no network, on a command screen that
    // holds images and none of them broken, and no request failed along the way.
    met:
      reloadPlayed !== null &&
      reloadPlayed.turn !== null &&
      reloadPlayed.images > 0 &&
      reloadPlayed.brokenImages === 0 &&
      playedOffline.brokenImages === 0 &&
      failedRequests.length === 0,
  };
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 780 });
  const controlLines = await controls(page);
  for (const l of controlLines) console.error(l);
  const offlineOnly = process.argv.includes('--offline-only');

  const results: ScreenResult[] = [];
  if (!offlineOnly) {
    await walk(page, results, audit);
    await walkToResult(page, results, audit);
  }

  // TEXT200: the same screens at 360px with the root font size at 200%.
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 360, height: 780 });
  await rootFontSize(page2, '200%');
  const text200: ScreenResult[] = [];
  if (!offlineOnly) {
    await walk(page2, text200, text200Audit, '200%');
    await walkToResult(page2, text200, text200Audit);
  }
  await page2.close();

  const page3 = await browser.newPage();
  await page3.setViewport({ width: 360, height: 780 });
  const off = await offline(page3);
  await page3.close();

  const count = (rs: ScreenResult[], check: Finding['check']): number =>
    rs.reduce((n, s) => n + s.findings.filter((f) => f.check === check).length, 0);
  const out = {
    url: URL,
    when: new Date().toISOString(),
    viewport: '360x780 CSS px; the text pass at the same width with the root font size at 200%',
    controls: controlLines,
    screens: results,
    text200,
    offline: off,
    totals: {
      controlsMeasured: results.reduce((n, s) => n + s.controls, 0),
      textRunsMeasured: results.reduce((n, s) => n + s.textRuns, 0),
      textRunsScaled: text200.reduce((n, s) => n + s.textRuns, 0),
      touch: count(results, 'touch'),
      contrast: count(results, 'contrast'),
      nontext: count(results, 'nontext'),
      scale: count(text200, 'scale'),
      layout200: count(text200, 'layout'),
      offlineMet: off['met'],
    },
  };
  console.log(JSON.stringify(out, null, 2));
  if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 2));
} finally {
  await browser.close();
}
