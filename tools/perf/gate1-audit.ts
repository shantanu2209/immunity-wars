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
 *   TEXT AT 200% — TWO MECHANISMS, TWO PASSES, EACH NAMED FOR WHAT IT MODELS (FINDINGS #60,
 *   #61). A person reaches "text at 200%" by whichever mechanism their browser offers, and a
 *   pass that models one of them says nothing about the other:
 *
 *   FONT200  models the browser DEFAULT-FONT-SIZE preference (desktop Chrome, Settings >
 *            Appearance > Font size; Firefox on every platform). The root font size is set
 *            to 200% on every load, at the full 360px width — `rem` and `em` follow, `px`
 *            does not — and on every screen: (1) every text run's computed size must be
 *            >= 1.9x what it is at 100%, text that does not scale listed by name; (2) the
 *            layout must survive it (below). This is the pass #60 built after the phone's
 *            font size changed nothing and every size in the UI turned out to be a fixed px.
 *   ZOOM200  models Chrome for Android's PAGE ZOOM (Settings > Accessibility > Page zoom),
 *            the mechanism a Chrome-on-Android user actually has: a zoom scales everything,
 *            `px` included, and narrows the CSS viewport to match, so a 360x780 phone at
 *            200% lays the page out at 180x390 CSS px. Scaling is therefore given, and the
 *            layout at 180px is the thing measured. This pass ran in the first audit, was
 *            removed by #60 as "a proxy" — wrongly: it was the right instrument for THIS
 *            mechanism and no instrument for the other — and is restored by #61 after
 *            Shantanu's check by hand (page zoom at 200% on the shipped build: the text
 *            doubled and everything he checked stayed playable).
 *   SIZE200  models the app's OWN text size setting (Settings > Text size > Largest, P2.6
 *            piece 2 PR 2), the third mechanism, the one a player will actually find: the
 *            app writes the root font size from a stored preference, so physically it is the
 *            default-font-size lever again — but pulled by a control the app ships, which can
 *            appear to work and not (FINDINGS #60's shape). So this pass DRIVES THE REAL
 *            CONTROL, then checks three things stay consistent: the option the row shows
 *            pressed, the value in the store, and the size the root renders at; then that a
 *            reload keeps all three (persistence); then every screen under FONT200's own
 *            scaling and layout auditors. Its controls plant the two ways the control can lie:
 *            stored and shown but NOT rendered, and chosen and rendered but NOT persisted.
 *            The pass ends by choosing Standard through the same control, so the offline pass
 *            that follows runs at the default.
 *   LAYOUT   the same checks under every mechanism: no horizontal scrolling, every control
 *            still in the viewport, no text clipped to an ellipsis.
 *   OFFLINE  after the first load, the network is cut: a full turn is played and every
 *            failed request recorded; then a reload with no network, which MUST render the
 *            app and let a turn be played (the service worker's precache; FINDINGS #59).
 *
 * EVERY CHECK HAS A CONTROL BOTH WAYS, run first on the title screen: a planted defect that
 * MUST be flagged (fires) beside a planted sound element that MUST NOT be (passes). "Forbid
 * X" is half a specification — a check that forbade everything would satisfy every fires-
 * control ever aimed at it (CLAUDE.md, the rule P2.1 earned; taken for this instrument by
 * ruling, 6 September 2026, P2.6's first piece). Touch: a 20px button, a 44px one. Contrast:
 * #999 on white, #000 on white. Non-text: a #eee border, a #000 border. Scale: a 13px span,
 * a 0.8125rem span. Layout, under each mechanism: a 600px block, a block that fits; a control
 * past the edge, one inside; an ellipsis that clips, one that does not. Offline: a fresh URL
 * must fail, a precached one must be served (on an origin with no worker that half cannot
 * run and says so). Any control failing stops the audit and says the instrument is broken.
 * A check that has never failed is not known to work, and a check that has never been
 * required to pass is not known to permit anything.
 *
 * Output: a JSON report (every finding with its screen, selector path, values) on stdout and
 * to outJson; the summary is written by whoever runs it into GATE1_AUDIT.md. Numbers only.
 * The URL defaults to the PREVIEW of the shipped build (`build:web` then `preview`, port
 * 4173): the offline item can only be true of a build with its service worker.
 */

import { writeFileSync } from 'node:fs';

import puppeteer, { type Page } from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:4173';
const OUT = process.argv[3] ?? '';
const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

interface Finding {
  check: 'touch' | 'contrast' | 'nontext' | 'scale' | 'layout' | 'size' | 'offline';
  screen: string;
  path: string;
  text: string;
  detail: string;
}

interface ScreenResult {
  screen: string;
  controls: number;
  textRuns: number;
  /** The layout passes only: the CSS width and root font size the screen was measured at. */
  width?: number;
  rootFontPx?: number;
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

/** FONT200's scaling half. Runs with the root at 200%: every text run's size, against its size
 *  with the root toggled to 100% for the comparison. */
const SCALE_AUDITOR = `
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
  return out;
})()
`;

/** The layout checks, run unchanged under BOTH mechanisms (the root at 200% on a 360px page;
 *  a 180px page): horizontal overflow naming the outermost elements past the edge, controls
 *  outside the viewport, text clipped to an ellipsis. */
const LAYOUT_AUDITOR = `
(() => {
  const root = document.documentElement;
  const w = root.clientWidth;
  const out = { findings: [], width: w, rootFontPx: parseFloat(getComputedStyle(root).fontSize) };
  const inSvg = (el) => !!el.closest('svg');
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

/** SIZE200's three surfaces of the text size setting, read from the page: the stored value,
 *  the size the root renders at, what the app says it applied, and the option the Settings row
 *  shows pressed (null when the row is not on screen). */
const SIZE_STATE = `
(() => {
  let stored = null;
  try {
    const raw = localStorage.getItem('immunity-wars.settings');
    if (raw !== null) { const o = JSON.parse(raw); stored = o && typeof o === 'object' && typeof o.textSize === 'string' ? o.textSize : 'malformed'; }
  } catch { stored = 'unreadable'; }
  const root = document.documentElement;
  const pressed = document.querySelector('[data-settings-row=textSize] button[aria-pressed=true]');
  return {
    stored,
    rootPx: parseFloat(getComputedStyle(root).fontSize),
    applied: root.dataset.textSize ?? null,
    pressed: pressed ? pressed.getAttribute('data-settings-option') : null,
  };
})()
`;

interface SizeState {
  stored: string | null;
  rootPx: number;
  applied: string | null;
  pressed: string | null;
}

/** The consistency the setting must keep: after a choice of `expected`, the store holds it,
 *  the root renders it (16px × expected/100, within a pixel), the app says it applied it, and
 *  the row (when on screen) shows it pressed. Each disagreement is its own finding. */
async function sizeCheck(page: Page, where: string, expected: string): Promise<Finding[]> {
  const s = (await page.evaluate(SIZE_STATE)) as SizeState;
  const wantPx = (16 * Number(expected)) / 100;
  const out: Finding[] = [];
  const f = (detail: string): void => {
    out.push({ check: 'size', screen: where, path: 'html', text: `expected ${expected}`, detail });
  };
  if (s.stored !== expected)
    f(
      `the store holds ${s.stored === null ? 'nothing' : s.stored}, not ${expected} (did the choice persist?)`,
    );
  if (Math.abs(s.rootPx - wantPx) > 1)
    f(
      `the root renders at ${s.rootPx}px, not ${wantPx}px: stored ${s.stored}, applied ${s.applied} (does the control render, or only store?)`,
    );
  if (s.applied !== expected) f(`the app says it applied ${s.applied}, not ${expected}`);
  if (s.pressed !== null && s.pressed !== expected)
    f(`the row shows ${s.pressed} pressed, not ${expected}`);
  return out;
}

/** Drives the real control: Title > Settings > the size option > Back. False if any step is
 *  missing, which is itself reported by the caller. */
async function chooseTextSize(page: Page, size: string): Promise<boolean> {
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('button') !== null, { timeout: 30000 });
  await sleep(200);
  if (!(await click(page, 'Settings'))) return false;
  await sleep(200);
  const hit = await clickSel(page, `[data-settings-row=textSize] [data-settings-option="${size}"]`);
  if (!hit) return false;
  await sleep(200);
  return true;
}

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

/**
 * Sets a text input's value and fires the events React listens for. `page.type` would append to
 * whatever is already there, and the library's filter is the one control this walk needs to
 * CLEAR as well as fill.
 */
const typeInto = (page: Page, sel: string, value: string): Promise<boolean> =>
  page.evaluate(
    (s: string, v: string) => {
      const el = document.querySelector(s) as HTMLInputElement | null;
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    },
    sel,
    value,
  );

/**
 * A screen the walk could not reach, recorded as a FINDING rather than omitted. An absent screen
 * and a clean screen look identical in a total, which is the whole reason the per-screen list
 * exists (CLAUDE.md, "read the instrument that reports coverage").
 */
const notReached = (screen: string, why = 'the walk could not open it'): ScreenResult => ({
  screen,
  controls: 0,
  textRuns: 0,
  findings: [{ check: 'touch', screen, path: '', text: '', detail: `NOT REACHED: ${why}` }],
});

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

/** FONT200: scaling per text run, then the layout, with the root at 200% on a 360px page. */
async function font200Audit(page: Page, screen: string, results: ScreenResult[]): Promise<void> {
  const s = (await page.evaluate(SCALE_AUDITOR)) as {
    findings: Omit<Finding, 'screen'>[];
    runs: number;
  };
  const l = (await page.evaluate(LAYOUT_AUDITOR)) as Layout;
  const name = `${screen} @200% font size`;
  results.push({
    screen: name,
    controls: 0,
    textRuns: s.runs,
    width: l.width,
    rootFontPx: l.rootFontPx,
    findings: [...s.findings, ...l.findings].map((f) => ({ ...f, screen: name })),
  });
}

/** What the layout auditor returns: its findings, and the width and root font size it
 *  measured at — so the record carries the mechanism's numbers, not just the verdict. */
interface Layout {
  findings: Omit<Finding, 'screen'>[];
  width: number;
  rootFontPx: number;
}

/** ZOOM200: the layout alone, on a 180x390 page — a zoom scales everything, so scaling is
 *  given and the layout is the thing. */
async function zoom200Audit(page: Page, screen: string, results: ScreenResult[]): Promise<void> {
  const l = (await page.evaluate(LAYOUT_AUDITOR)) as Layout;
  const name = `${screen} @200% page zoom`;
  results.push({
    screen: name,
    controls: 0,
    textRuns: 0,
    width: l.width,
    rootFontPx: l.rootFontPx,
    findings: l.findings.map((f) => ({ ...f, screen: name })),
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
  // THE FIRST-ENCOUNTER HINTS ARE RESET AT THE TOP OF EVERY PASS.
  //
  // The four passes share one browser profile, so a hint consumed by the FIRST pass can never
  // fire again and the other three measure a screen that is not there. That is exactly what the
  // first run of this change reported: the hint reached under the base pass and NOT REACHED
  // under all three scaled ones. A hint is the one screen in this walk whose whole nature is to
  // appear once, so it is the one that needed saying out loud.
  //
  // Cleared through the app's own key rather than by wiping storage, so the save the later
  // steps depend on survives. Reloaded after, because the shell reads the key once at startup.
  await page.evaluate(() => localStorage.removeItem('immunity-wars.hints'));
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
  // Settings from the Title slot (P2.6 piece 2) on a fresh profile: no save, so the delete
  // row is disabled with its reason. The live row and its confirm are measured at the end of
  // this walk, once a game has been saved.
  if (await click(page, 'Settings')) {
    await sleep(200);
    await step(page, 'settings, no save', results);
    await click(page, 'Back');
    await sleep(200);
  }
  // How to play from the Title (P2.6 piece 3): the index, then every section by Next, then
  // back to the index and out. Each section is its own screen; all ten are measured.
  if (await click(page, 'How to play')) {
    await sleep(200);
    await step(page, 'help, index', results);
    if (await clickSel(page, '[data-help-section=s1]')) {
      for (let i = 1; i <= 10; i += 1) {
        await sleep(200);
        await step(page, `help, section ${i}`, results);
        if (i < 10 && !(await click(page, 'Next'))) break;
      }
      await click(page, 'All sections');
      await sleep(150);
    }
    await click(page, 'Back');
    await sleep(200);
  }
  // The disease library from the Title (P2.6 piece 4): the index, one card over it, the why
  // section, then back out. Every row of the index is a control the audit measures.
  if (await click(page, 'Disease library')) {
    await sleep(300);
    await step(page, 'library, index', results);
    if (await clickSel(page, '[data-library-row]')) {
      await sleep(300);
      await step(page, 'library, card', results);
      await click(page, 'Close card');
      await sleep(200);
    }
    // The card-to-box link (ruled 8 September 2026). Only four boxes are about a disease, so
    // the FIRST row's card usually carries none: the walk filters to a worm, which the pack
    // guarantees has one, rather than hoping. Reaching this by luck is exactly what the
    // inspect sheet did for two green runs.
    if (await typeInto(page, '[data-library-filter]', 'Hookworm')) {
      await sleep(250);
      if (await clickSel(page, '[data-library-row]')) {
        await sleep(300);
        await step(page, 'library, card with a why link', results);
        if (await clickSel(page, '[data-card-why]')) {
          await sleep(300);
          await step(page, 'library, why from a card', results);
          await click(page, 'All pathogens');
          await sleep(200);
        } else {
          results.push(notReached('library, why from a card'));
        }
      }
      await typeInto(page, '[data-library-filter]', '');
      await sleep(200);
    }
    if (await click(page, 'Why it works this way')) {
      await sleep(300);
      await step(page, 'library, why', results);
      await click(page, 'All pathogens');
      await sleep(200);
    }
    await click(page, 'Back');
    await sleep(200);
  }
  // About (P2.6): the Title's fourth slot, and the only one that never opens over play.
  if (await click(page, 'About')) {
    await sleep(300);
    await step(page, 'about', results);
    await click(page, 'Back');
    await sleep(200);
  }
  // THE CRASH SCREEN. Measured like any other screen, because it is one: a player who reaches
  // it at 200% text on a 360px phone is having the worst moment the app offers, and an
  // unreadable apology is worse than none. Reached by dispatching the event the boundary
  // listens for; the details line is opened so the collapsed content is measured too.
  await page.evaluate(
    "window.dispatchEvent(new ErrorEvent('error', { error: new Error('audit walk') }))",
  );
  await sleep(400);
  if (await page.evaluate(() => document.querySelector('[data-crash]') !== null)) {
    await step(page, 'crash screen', results);
    if (await clickSel(page, '[data-crash-details]')) {
      await sleep(200);
      await step(page, 'crash screen, details open', results);
    } else {
      results.push(notReached('crash screen, details open'));
    }
  } else {
    results.push(notReached('crash screen'));
    results.push(notReached('crash screen, details open'));
  }
  // Every exit reloads (ruling 1), so the walk reloads to get back to the Title.
  //
  // ⚠️ AND RE-APPLIES THE ROOT SIZE, for the same reason the walk's opening does. Found by this
  // pass's own per-screen list on the first run with the crash screen in it: the reload dropped
  // the 200% root, so difficulty and every screen after it were measured at 100% and reported
  // as UNSCALED — 9 scale findings, none of them a product defect. The totals said `scale: 9`
  // and the verdict said nothing about which screens or why. An instrument defect introduced by
  // this very change, caught by reading coverage rather than the verdict, and fixed inline.
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('button') !== null, { timeout: 30000 });
  await page.evaluate((p: string | null) => {
    if (p) document.documentElement.style.fontSize = p;
  }, rootPct);
  await sleep(300);
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
  await sleep(300);
  // With a save present the overwrite confirm appears AFTER the difficulty pick (APP_FLOW §4);
  // the click before the pick, above, is from the first shell and stays harmless. This matters
  // once passes share a profile: the passes run as tabs of one browser, so a save left by an
  // earlier pass is on this Title.
  await click(page, 'Start and replace');
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
  // The inspect sheet by its node door: a tap on an invader token with NOTHING selected (with
  // a cell selected the same tap picks a target instead). The deck decides whether the bar's
  // other door, "What's here", is offered, so the first audits reached the sheet by luck and
  // some runs never did. A puppeteer click, not `.click()`: the board resolves the hit from
  // real pointer coordinates.
  // The hit is resolved to the NEAREST node, so a token placed beside an organ's resident can
  // resolve to the resident (a selection, no sheet): every token is tried until one opens the
  // sheet, and a run in which none does records the sheet as NOT REACHED — a red line in the
  // JSON, never a silent absence from the screen list (CLAUDE.md: read the coverage).
  let sheetOpened = false;
  // HANDLES ARE RE-QUERIED EVERY TIME rather than held across a click.
  //
  // This loop used to hold an ElementHandle and click it twice, and it worked until a tap could
  // re-render the region the token lives in — which is what the first-encounter hint does. The
  // second click then threw "Node is detached from document" and took the whole audit with it.
  // Found on this change's first audit run. An instrument defect, so it is fixed here.
  const tokenCount = await page.evaluate(() => document.querySelectorAll('[data-invader]').length);
  const tapToken = async (i: number): Promise<void> => {
    const el = (await page.$$('[data-invader]'))[i];
    if (!el) return;
    try {
      await el.click();
    } catch {
      // The node moved under us. The next iteration re-queries; nothing is lost but this tap.
    }
  };
  for (let i = 0; i < tokenCount; i += 1) {
    await tapToken(i);
    await sleep(300);
    sheetOpened = await page.evaluate(() =>
      [...document.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Close'),
    );
    if (sheetOpened) break;
    // The tap may have selected a cell or a resident instead (a tap on the selected piece
    // deselects it; a tap on nothing deselects too): the same tap again undoes it.
    await tapToken(i);
    await sleep(150);
  }
  if (sheetOpened) {
    await step(page, 'inspect sheet', results);
    await click(page, 'Close');
    await sleep(200);
  } else {
    results.push({
      screen: 'inspect sheet',
      controls: 0,
      textRuns: 0,
      findings: [
        {
          check: 'touch',
          screen: 'inspect sheet',
          path: '',
          text: '',
          detail: 'NOT REACHED: no invader token tap opened the sheet',
        },
      ],
    });
  }
  // FIRST-ENCOUNTER HINTS (P2.6, ruled 8 September 2026). Selecting a cell is first contact, so
  // the hint is up by the time the piece strip is measured. Measured as its own screen because
  // a hint appears at 200% text on a 360px phone like everything else, and because a line that
  // pushes the action rows off the fold would be a real defect nobody would see in a total.
  await clickSel(page, '[data-piece="cell:bcell"]');
  await sleep(350);
  if (await page.evaluate(() => document.querySelector('[data-hint]') !== null)) {
    await step(page, 'command, a first encounter hint', results);
    await clickSel(page, '[data-hint-dismiss]');
    await sleep(200);
    if (await page.evaluate(() => document.querySelector('[data-hint]') === null)) {
      await step(page, 'command, hint dismissed', results);
    } else {
      results.push(notReached('command, hint dismissed', 'the dismiss control left it on screen'));
    }
  } else {
    results.push(notReached('command, a first encounter hint'));
    results.push(notReached('command, hint dismissed'));
  }
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
  // The sheet's other door, offered only when the selected cell stands with something: a
  // per-run screen, recorded under its own name when the deck offers it.
  const opened = await click(page, "What's here");
  if (opened) {
    await sleep(300);
    await step(page, "inspect sheet, from What's here", results);
    await click(page, 'Close');
    await sleep(200);
  }
  await click(page, 'Menu');
  await sleep(300);
  await step(page, 'pause sheet', results);
  // Settings over the paused game: the game stays mounted (hidden) underneath, and the delete
  // row is disabled with its reason, since the save is the game being played.
  if (await click(page, 'Settings')) {
    await sleep(200);
    await step(page, 'settings, over play', results);
    await click(page, 'Back');
    await sleep(200);
  }
  // How to play over the paused game: the index only (the sections are the same screens as
  // from the Title), then back to the game.
  await click(page, 'Menu');
  await sleep(200);
  if (await click(page, 'How to play')) {
    await sleep(200);
    await step(page, 'help, index, over play', results);
    await click(page, 'Back');
    await sleep(200);
  } else {
    await click(page, 'Resume');
  }
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
  // Settings from the Title WITH a save (the first visit had none, so the delete row was
  // disabled): quit keeps the save, the row is live, its confirm is measured, and Continue
  // resumes the game for the walk to the Result.
  await click(page, 'Menu');
  await sleep(200);
  await click(page, 'Quit to title');
  await sleep(200);
  await click(page, 'Quit');
  await sleep(400);
  if (await click(page, 'Settings')) {
    await sleep(200);
    await step(page, 'settings, with a save', results);
    if (await click(page, 'Delete saved game')) {
      await sleep(200);
      await step(page, 'settings, delete confirm', results);
      await click(page, 'Keep');
      await sleep(150);
    }
    // The hints reset row (P2.6, ruling 5). Live by now, because the walk has already dismissed
    // a hint, so this also measures the row in its ENABLED state rather than only disabled.
    if (await clickSel(page, '[data-settings-row=resetHints] button')) {
      await sleep(200);
      await step(page, 'settings, hints reset confirm', results);
      await click(page, 'Keep');
      await sleep(150);
    } else {
      results.push(notReached('settings, hints reset confirm'));
    }
    await click(page, 'Back');
    await sleep(200);
  }
  // The Title's Continue carries its subtitle ("Training turn 2") inside the button, so the
  // exact-text click cannot find it: match the label's start. The reveal's Continue is exact.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      x.textContent?.trim().startsWith('Continue'),
    );
    b?.click();
  });
  await sleep(700);
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

type Planted = Omit<Finding, 'screen'>[];

/** Plants elements at the START of the body, so a document-order cap in an auditor's list of
 *  named elements (the overflow finding names the first five) cannot drop them. */
const PLANT = `
(function (specs) {
  for (const s of specs.slice().reverse()) {
    const el = document.createElement(s.tag);
    el.textContent = s.text;
    el.setAttribute('data-control', s.id);
    Object.assign(el.style, s.style);
    document.body.prepend(el);
  }
})
`;
const UNPLANT = `document.querySelectorAll('[data-control]').forEach((e) => e.remove())`;

interface Spec {
  tag: string;
  id: string;
  text: string;
  style: Record<string, string>;
}

/** THE CONTROLS, BOTH WAYS FOR EVERY CHECK: a planted defect must be flagged (fires) and a
 *  planted sound element must not be (passes), on the title screen, before anything is
 *  measured. Any control failing stops the audit: the instrument is broken, and everything it
 *  would have measured is untrustworthy. */
async function controls(page: Page): Promise<string[]> {
  const lines: string[] = [];
  const ok: boolean[] = [];
  const line = (text: string, pass: boolean): void => {
    lines.push(`CONTROL ${text}: ${pass ? 'YES' : 'NO'}`);
    ok.push(pass);
  };
  const plant = async (specs: Spec[]): Promise<void> => {
    await page.evaluate(`(${PLANT})(${JSON.stringify(specs)})`);
  };
  const unplant = async (): Promise<void> => {
    await page.evaluate(UNPLANT);
  };
  const has = (fs: Planted, check: Finding['check'], text: string, detail = ''): boolean =>
    fs.some((f) => f.check === check && f.text === text && f.detail.startsWith(detail));
  const overflowNames = (fs: Planted, id: string): boolean =>
    fs.some(
      (f) =>
        f.check === 'layout' &&
        f.detail.startsWith('horizontal overflow') &&
        f.text.includes(`data-control=${id}`),
    );
  const box = (extra: Record<string, string>): Record<string, string> => ({
    background: '#fff',
    color: '#000',
    fontSize: '13px',
    padding: '0',
    margin: '0',
    ...extra,
  });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('button') !== null, { timeout: 30000 });

  // TOUCH, CONTRAST, NON-TEXT: a defective button and span beside a sound button and span.
  await plant([
    {
      tag: 'button',
      id: 'small',
      text: 'planted small',
      style: box({ width: '20px', height: '20px', border: '1px solid #eee' }),
    },
    { tag: 'span', id: 'faint', text: 'planted faint', style: box({ color: '#999' }) },
    {
      tag: 'button',
      id: 'sound',
      text: 'planted sound',
      style: box({ width: '44px', height: '44px', border: '1px solid #000' }),
    },
    { tag: 'span', id: 'clear', text: 'planted clear', style: box({}) },
  ]);
  const r = (await page.evaluate(AUDITOR)) as { findings: Planted };
  line('touch fires: a 20px button is flagged', has(r.findings, 'touch', 'planted small'));
  line('touch passes: a 44px button is NOT flagged', !has(r.findings, 'touch', 'planted sound'));
  line(
    'contrast fires: #999 on white (2.85:1) is flagged',
    has(r.findings, 'contrast', 'planted faint'),
  );
  line(
    'contrast passes: #000 on white (21:1) is NOT flagged',
    !has(r.findings, 'contrast', 'planted clear'),
  );
  line(
    'nontext fires: a #eee border on white is flagged',
    has(r.findings, 'nontext', 'planted small'),
  );
  line(
    'nontext passes: a #000 border on white is NOT flagged',
    !has(r.findings, 'nontext', 'planted sound'),
  );
  await unplant();

  // FONT200 (the default-font-size mechanism): the root at 200%. A px span must be flagged as
  // not scaling, a rem span must not; a block that fits must not be named as overflow, a 600px
  // block must.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await plant([
    { tag: 'span', id: 'px', text: 'planted px', style: box({}) },
    { tag: 'span', id: 'rem', text: 'planted rem', style: box({ fontSize: '0.8125rem' }) },
    { tag: 'div', id: 'fits', text: 'planted fits', style: box({ width: '100%', height: '10px' }) },
  ]);
  const s = (await page.evaluate(SCALE_AUDITOR)) as { findings: Planted };
  const f1 = (await page.evaluate(LAYOUT_AUDITOR)) as { findings: Planted };
  line(
    'scale fires: a 13px span is flagged as not scaling at 200%',
    has(s.findings, 'scale', 'planted px'),
  );
  line(
    'scale passes: a 0.8125rem span is NOT flagged (it scales)',
    !has(s.findings, 'scale', 'planted rem'),
  );
  line(
    'font-size layout passes: a block that fits at 360px is NOT named as overflow',
    !overflowNames(f1.findings, 'fits'),
  );
  await plant([
    {
      tag: 'div',
      id: 'wide',
      text: 'planted wide',
      style: box({ width: '600px', height: '10px' }),
    },
  ]);
  const f2 = (await page.evaluate(LAYOUT_AUDITOR)) as { findings: Planted };
  line(
    'font-size layout fires: a 600px block at 360px is flagged as overflow',
    overflowNames(f2.findings, 'wide'),
  );
  await unplant();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });

  // ZOOM200 (the page-zoom mechanism): a 180x390 page. The same layout auditor, each of its
  // three detections both ways: overflow, a control past the edge, an ellipsis that clips.
  await page.setViewport({ width: 180, height: 390, deviceScaleFactor: 2 });
  await sleep(200);
  const fixed = (left: string): Record<string, string> =>
    box({
      position: 'fixed',
      top: '0',
      left,
      width: '44px',
      height: '44px',
      border: '1px solid #000',
    });
  const ellipsis = (width: string): Record<string, string> =>
    box({
      display: 'block',
      width,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });
  await plant([
    { tag: 'div', id: 'fits', text: 'planted fits', style: box({ width: '100%', height: '10px' }) },
    { tag: 'button', id: 'in', text: 'planted in', style: fixed('0') },
    { tag: 'div', id: 'short', text: 'planted short', style: ellipsis('160px') },
  ]);
  const z1 = (await page.evaluate(LAYOUT_AUDITOR)) as { findings: Planted };
  line(
    'zoom layout passes: a block that fits at 180px is NOT named as overflow',
    !overflowNames(z1.findings, 'fits'),
  );
  line(
    'zoom layout passes: a control inside the viewport is NOT flagged',
    !has(z1.findings, 'layout', 'planted in', 'control outside'),
  );
  line(
    'zoom layout passes: an ellipsis whose text fits is NOT flagged as clipped',
    !has(z1.findings, 'layout', 'planted short', 'clipped'),
  );
  await plant([
    {
      tag: 'div',
      id: 'wide',
      text: 'planted wide',
      style: box({ width: '600px', height: '10px' }),
    },
    { tag: 'button', id: 'out', text: 'planted out', style: fixed('300px') },
    { tag: 'div', id: 'long', text: 'planted long', style: ellipsis('40px') },
  ]);
  const z2 = (await page.evaluate(LAYOUT_AUDITOR)) as { findings: Planted };
  line(
    'zoom layout fires: a 600px block at 180px is flagged as overflow',
    overflowNames(z2.findings, 'wide'),
  );
  line(
    'zoom layout fires: a control past the viewport edge is flagged',
    has(z2.findings, 'layout', 'planted out', 'control outside'),
  );
  line(
    'zoom layout fires: an ellipsis that clips its text is flagged',
    has(z2.findings, 'layout', 'planted long', 'clipped'),
  );
  await unplant();
  await page.setViewport({ width: 360, height: 780 });

  // SIZE200 (the app's own text size), the two ways the control can lie, planted for real on
  // the real control. Chosen and rendered: not flagged. Stored and shown pressed but NOT
  // rendered (the root put back to the default under it): flagged — FINDINGS #60's shape, the
  // control that appears to work. Chosen and rendered but NOT persisted (the stored value
  // removed, then a reload): flagged. Then Standard through the same control: not flagged.
  const drove = await chooseTextSize(page, '200');
  line('size: the real control is reachable (Title > Settings > Largest)', drove);
  const s1 = await sizeCheck(page, 'control', '200');
  line(
    'size passes: Largest chosen through the control stores 200, renders 32px, shows pressed: NOT flagged',
    s1.length === 0,
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  const s2 = await sizeCheck(page, 'control', '200');
  line(
    'size fires: stored 200 and shown pressed but rendered at 16px (a control that appears to work) is flagged',
    s2.some((x) => x.detail.includes('renders at')),
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page.evaluate(() => localStorage.removeItem('immunity-wars.settings'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('button') !== null, { timeout: 30000 });
  await sleep(200);
  const s3 = await sizeCheck(page, 'control', '200');
  line(
    'size fires: a choice that did not persist (store emptied, then a reload) is flagged',
    s3.some((x) => x.detail.includes('persist')) && s3.some((x) => x.detail.includes('renders at')),
  );
  const back = await chooseTextSize(page, '200');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('button') !== null, { timeout: 30000 });
  await sleep(200);
  const s4 = await sizeCheck(page, 'control', '200');
  line(
    'size passes: Largest survives a reload (store, root and applied agree): NOT flagged',
    back && s4.length === 0,
  );
  const std = await chooseTextSize(page, '100');
  const s5 = await sizeCheck(page, 'control', '100');
  line(
    'size passes: Standard through the control clears the root and stores 100: NOT flagged',
    std && s5.length === 0,
  );

  // OFFLINE, both ways: with the network cut a fresh URL must fail, and a URL the build
  // precached must be served by the worker. On an origin with no worker (the dev server) the
  // passes-half cannot run: it says so, and the offline check will report not met.
  const precached = (await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return null;
    for (let i = 0; i < 80; i += 1) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.active && navigator.serviceWorker.controller) break;
      await new Promise((res) => setTimeout(res, 250));
    }
    if (!navigator.serviceWorker.controller) return null;
    const js = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .find((n) => /\.js(\?|$)/.test(n));
    return js ?? null;
  })) as string | null;
  await page.setOfflineMode(true);
  const failed = await page.evaluate(async () => {
    try {
      await fetch('/art/control-does-not-exist.webp', { cache: 'no-store' });
      return false;
    } catch {
      return true;
    }
  });
  const served =
    precached === null
      ? null
      : await page.evaluate(async (u: string) => {
          try {
            return (await fetch(u, { cache: 'no-store' })).ok;
          } catch {
            return false;
          }
        }, precached);
  await page.setOfflineMode(false);
  line('offline fires: a fresh URL fails with the network cut', failed);
  if (served === null)
    lines.push(
      'CONTROL offline passes: NOT RUN — no service worker controls this origin (the dev server has none); the offline check will report not met',
    );
  else line('offline passes: a precached bundle URL is served with the network cut', served);

  // ------------------------------------------------------------------------------------------
  // THE ERROR BOUNDARY, three routes, because they are three different code paths and a React
  // boundary catches only the first. A boundary that has never fired is not known to work, and
  // one that catches renders only would look like it worked while missing this app's real
  // failure surface: every action is an onClick and every save is a promise.
  //
  // Driven by dispatching the events the boundary listens for rather than by adding a crash
  // button to the app. A test hook in shipped product is surface nobody asked for.
  // ------------------------------------------------------------------------------------------
  const crashed = async (fire: string): Promise<boolean> => {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('button') !== null, { timeout: 30000 });
    const before = await page.evaluate(() => document.querySelector('[data-crash]') !== null);
    if (before) return false; // it must not already be showing, or this proves nothing
    await page.evaluate(fire);
    await sleep(400);
    return page.evaluate(() => document.querySelector('[data-crash]') !== null);
  };

  line(
    'boundary fires: an error event reaches the crash screen',
    await crashed(
      "window.dispatchEvent(new ErrorEvent('error', { error: new Error('audit control') }))",
    ),
  );
  line(
    'boundary fires: an unhandled rejection reaches the crash screen',
    await crashed(
      "window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', " +
        "{ promise: Promise.resolve(), reason: new Error('audit control') }))",
    ),
  );
  // THE PASSES HALF. Without it, a boundary that showed the crash screen unconditionally would
  // satisfy both controls above perfectly, and the app would be unusable.
  line(
    'boundary passes: an ordinary load shows no crash screen',
    await (async (): Promise<boolean> => {
      await page.goto(URL, { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelector('button') !== null, {
        timeout: 30000,
      });
      await sleep(400);
      return page.evaluate(() => document.querySelector('[data-crash]') === null);
    })(),
  );

  if (!ok.every(Boolean)) throw new Error(`A CONTROL FAILED:\n${lines.join('\n')}`);
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

  // FONT200: the same screens at 360px with the root font size at 200% — the browser
  // default-font-size preference.
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 360, height: 780 });
  await rootFontSize(page2, '200%');
  const font200: ScreenResult[] = [];
  if (!offlineOnly) {
    await walk(page2, font200, font200Audit, '200%');
    await walkToResult(page2, font200, font200Audit);
  }
  await page2.close();

  // ZOOM200: the same screens on a 180x390 page at a doubled device scale — the layout
  // Chrome for Android's page zoom at 200% gives a 360x780 phone (FINDINGS #61).
  const page4 = await browser.newPage();
  await page4.setViewport({ width: 180, height: 390, deviceScaleFactor: 2 });
  const zoom200: ScreenResult[] = [];
  if (!offlineOnly) {
    await walk(page4, zoom200, zoom200Audit);
    await walkToResult(page4, zoom200, zoom200Audit);
  }
  await page4.close();

  // SIZE200: the app's own text size at Largest, chosen through the real control, then the
  // same screens under FONT200's scaling and layout auditors (the walk's first `goto` is the
  // reload that proves the choice persisted), then Standard again through the control.
  const page5 = await browser.newPage();
  await page5.setViewport({ width: 360, height: 780 });
  const size200: ScreenResult[] = [];
  if (!offlineOnly) {
    const drove = await chooseTextSize(page5, '200');
    const chosen = await sizeCheck(page5, 'settings, Largest chosen', '200');
    size200.push({
      screen: 'settings, Largest chosen',
      controls: 0,
      textRuns: 0,
      findings: drove
        ? chosen
        : [
            {
              check: 'size',
              screen: 'settings, Largest chosen',
              path: '',
              text: '',
              detail: 'the text size control was not reachable',
            },
          ],
    });
    await walk(page5, size200, font200Audit);
    await walkToResult(page5, size200, font200Audit);
    const std = await chooseTextSize(page5, '100');
    const reset = await sizeCheck(page5, 'settings, Standard chosen again', '100');
    size200.push({
      screen: 'settings, Standard chosen again',
      controls: 0,
      textRuns: 0,
      findings: std
        ? reset
        : [
            {
              check: 'size',
              screen: 'settings, Standard chosen again',
              path: '',
              text: '',
              detail: 'the text size control was not reachable',
            },
          ],
    });
  }
  await page5.close();

  const page3 = await browser.newPage();
  await page3.setViewport({ width: 360, height: 780 });
  const off = await offline(page3);
  await page3.close();

  const count = (rs: ScreenResult[], check: Finding['check']): number =>
    rs.reduce((n, s) => n + s.findings.filter((f) => f.check === check).length, 0);
  const out = {
    url: URL,
    when: new Date().toISOString(),
    viewport:
      "360x780 CSS px; FONT200 at the same width with the root font size at 200%; ZOOM200 at 180x390 CSS px, device scale 2; SIZE200 at 360x780 with the app's own text size at Largest",
    controls: controlLines,
    screens: results,
    font200,
    zoom200,
    size200,
    offline: off,
    totals: {
      controlsMeasured: results.reduce((n, s) => n + s.controls, 0),
      textRunsMeasured: results.reduce((n, s) => n + s.textRuns, 0),
      textRunsScaled: font200.reduce((n, s) => n + s.textRuns, 0),
      touch: count(results, 'touch'),
      contrast: count(results, 'contrast'),
      nontext: count(results, 'nontext'),
      scale: count(font200, 'scale'),
      layoutFont200: count(font200, 'layout'),
      layoutZoom200: count(zoom200, 'layout'),
      textRunsScaledInApp: size200.reduce((n, s) => n + s.textRuns, 0),
      scaleSize200: count(size200, 'scale'),
      layoutSize200: count(size200, 'layout'),
      sizeSize200: count(size200, 'size'),
      offlineMet: off['met'],
    },
  };
  console.log(JSON.stringify(out, null, 2));
  if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 2));
} finally {
  await browser.close();
}
