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
 *            app and let a turn be played (the service worker's precache; FINDINGS #59). The
 *            art on the screen the turn ends on must all be served: `<img>`, and SVG `<image>`
 *            since piece 4 (docs/for-P2.7.md §18), which left that screen no `<img>` at all.
 *   OCCLUSION nothing readable sits under a fixed control. Every scroll area and the page are
 *            scrolled to their end, and every text run still on screen is checked against every
 *            fixed or sticky control over it, at the very point they overlap. Added with the
 *            floating close (docs/for-P2.7.md §10), because every check above measures clipping
 *            and overflow and none can see one element covering another: a button hiding a
 *            card's last line would have been green. Runs in all four passes.
 *   NESTING  where each close lands (§9, ruling 9). The base pass opens the nested paths §9 read
 *            from the code and asserts, after ONE close, the level it must return to, through the
 *            floating button and, on three paths, through the phone's back gesture. A path the
 *            deal does not offer is recorded NOT REACHED, never omitted.
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
 * run and says so), and the art count the check rests on: an SVG image nothing precached is
 * counted broken, one the build precached is not. Occlusion: text under a fixed button, text clear of it, and text under a
 * fixed button but behind a modal scrim, which the button is not what hides. Nesting: a close
 * that goes two levels must be reported, a close that goes one must not. Any control failing stops the audit and says the instrument is broken.
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
  check:
    | 'touch'
    | 'contrast'
    | 'nontext'
    | 'scale'
    | 'layout'
    | 'size'
    | 'offline'
    | 'occlusion'
    | 'playArea'
    | 'scroll';
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
  /** The base pass only: the play area's height on this screen and the stage it holds; null where
   *  it is not on screen (piece 5, §19). */
  playArea?: { height: number; stage: string } | null;
  /** The base pass only: how far the page is taller than the screen while the play screen is at
   *  rest (its stage shown, nothing open over it); null on any other screen. */
  rest?: { overflow: number } | null;
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

/**
 * OCCLUSION: readable text under a fixed control, measured at the end of every scroll.
 *
 * "Under" is decided by the browser, not by rectangles: where a text run and a fixed control
 * overlap, `elementFromPoint` at the overlap says which one a finger would touch and an eye would
 * see. Overlapping boxes where the text is drawn on top are not a finding. Text is first limited
 * to the part of the screen its own scroll areas show, so a line scrolled out of a card is not
 * mistaken for a line under the button. Every scroll position is put back before returning.
 */
const OCCLUSION_AUDITOR = `
(() => {
  const out = { findings: [] };
  const isFixed = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const p = getComputedStyle(e).position;
      if (p === 'fixed' || p === 'sticky') return true;
    }
    return false;
  };
  const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const controls = [...document.querySelectorAll('button, [role=button], a[href]')].filter((el) => !el.closest('svg') && shown(el) && isFixed(el));
  if (controls.length === 0) return out;
  const scrollers = [document.scrollingElement];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) scrollers.push(el);
  }
  const saved = scrollers.map((s) => s.scrollTop);
  for (const s of scrollers) s.scrollTop = s.scrollHeight;
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const clipOf = (el) => {
    let c = { left: 0, top: 0, right: vw, bottom: vh };
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowY !== 'visible' || cs.overflowX !== 'visible') {
        const r = e.getBoundingClientRect();
        c = { left: Math.max(c.left, r.left), top: Math.max(c.top, r.top), right: Math.min(c.right, r.right), bottom: Math.min(c.bottom, r.bottom) };
      }
    }
    return c;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const flaggedEls = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = (n.textContent || '').trim();
    const el = n.parentElement;
    if (!text || !el || el.closest('svg') || flaggedEls.has(el)) continue;
    if (controls.some((c) => c.contains(el))) continue;
    const clip = clipOf(el);
    const range = document.createRange();
    range.selectNodeContents(n);
    let done = false;
    for (const r of range.getClientRects()) {
      if (done) break;
      const left = Math.max(r.left, clip.left);
      const right = Math.min(r.right, clip.right);
      const top = Math.max(r.top, clip.top);
      const bottom = Math.min(r.bottom, clip.bottom);
      if (right - left < 2 || bottom - top < 2) continue;
      for (const c of controls) {
        const cr = c.getBoundingClientRect();
        const x0 = Math.max(left, cr.left);
        const x1 = Math.min(right, cr.right);
        const y0 = Math.max(top, cr.top);
        const y1 = Math.min(bottom, cr.bottom);
        if (x1 - x0 < 2 || y1 - y0 < 2) continue;
        const px = (x0 + x1) / 2;
        const py = (y0 + y1) / 2;
        const hit = document.elementFromPoint(px, py);
        if (!hit || !(hit === c || c.contains(hit))) continue;
        // Would this text be visible here if the control were not? Only then is the control what
        // hides it. Text behind a dialog's scrim, or behind a sheet's own panel, is hidden by
        // that surface whatever its buttons do.
        const before = c.style.visibility;
        c.style.visibility = 'hidden';
        const beneath = document.elementFromPoint(px, py);
        c.style.visibility = before;
        if (beneath && (beneath === el || el.contains(beneath))) {
          flaggedEls.add(el);
          done = true;
          out.findings.push({ check: 'occlusion', path: el.tagName.toLowerCase(), text: text.slice(0, 40), detail: 'readable text under the fixed control "' + (c.textContent || '').trim().slice(0, 24) + '" at the end of its scroll' });
          break;
        }
      }
    }
  }
  scrollers.forEach((s, i) => { s.scrollTop = saved[i]; });
  return out;
})()
`;

/**
 * WHERE THE PLAYER IS, named the way docs/for-P2.7.md §9's nesting table names it, topmost
 * surface first: a card over the inspect sheet is "pathogen card", and once it closes the sheet
 * is. Only what is actually on screen counts, so the game kept mounted and hidden under
 * Settings is not mistaken for the game.
 */
const WHERE = `
(() => {
  const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const q = (s) => [...document.querySelectorAll(s)].find(vis);
  const button = (label) => [...document.querySelectorAll('button')].some((b) => vis(b) && (b.textContent || '').trim() === label);
  if (q('[role=dialog][aria-label="Pathogen card"]')) return 'pathogen card';
  if (q('[data-cell-card-open]')) return 'cell card';
  // The middle's views since piece 5 (docs/for-P2.7.md §19): each is one level on the stack.
  if (q('[data-middle-view=targets]')) return 'dock targets';
  if (q('[data-middle-view=ap]')) return 'AP terms';
  if (q('[data-middle-view=effects]')) return 'effects';
  const view = q('[data-middle-view=cells],[data-middle-view=antibodies],[data-middle-view=body]');
  if (view) return 'view: ' + view.getAttribute('data-middle-view');
  const drawer = q('[data-drawer]');
  if (drawer) return 'drawer: ' + drawer.getAttribute('data-drawer');
  if (button('Plan your turn')) return 'reveal';
  if (q('[data-screen=library-why]')) return 'library why page';
  const help = q('[data-screen=help]');
  if (help) {
    if (help.querySelector('[data-help-section]')) return 'help index';
    const h = help.querySelector('h1');
    return 'help section: ' + (h ? (h.textContent || '').trim() : '');
  }
  if (q('[data-screen=settings]')) return 'settings';
  if (q('[data-screen=library]')) return 'library index';
  if (q('[data-screen=about]')) return 'about';
  if (q('[data-inspect-sheet]')) return 'inspect sheet';
  if (button('Quit to title')) return 'pause menu';
  if (q('[data-screen=planning]')) return 'planning';
  if (q('[data-command-stage]')) return 'play';
  if (button('New game')) return 'title';
  return 'unknown';
})()
`;

/**
 * THE ART IN THE PAGE, and whether it is served with whatever network there is: each `<img>` is
 * broken when it finished loading with no pixels, and each SVG `<image>`'s URL is fetched, broken
 * when the fetch fails. SVG art is not in `document.images`, and since piece 4 it is the only art the
 * screen a turn ends on shows: planning's list, whose icons were the `<img>` the offline check used
 * to count, is in a closed drawer (docs/for-P2.7.md §18). An `<image>` hidden with the command stage
 * is fetched too, which is the point: it is the board's art.
 */
const ART_PROBE = `
(async () => {
  const imgs = [...document.images];
  const brokenImg = imgs.filter((i) => i.complete && i.naturalWidth === 0).length;
  const urls = [...new Set([...document.querySelectorAll('image')].map((e) => e.getAttribute('href') || e.getAttribute('xlink:href') || '').filter((u) => u !== ''))];
  let brokenSvg = 0;
  for (const u of urls) {
    try {
      if (!(await fetch(u, { cache: 'no-store' })).ok) brokenSvg += 1;
    } catch {
      brokenSvg += 1;
    }
  }
  return { images: imgs.length + urls.length, brokenImages: brokenImg + brokenSvg, svgArt: urls.length };
})()
`;

/** How far the page is taller than the screen, when the play screen is at rest: its command stage
 *  or, since piece 4, planning showing (docs/for-P2.7.md §17), and no floating close, so nothing is
 *  open over it. Null on every other screen. */
const REST_PROBE = `
(() => {
  const shown = (s) => { const el = document.querySelector(s); return !!el && el.getClientRects().length > 0; };
  if (!shown('[data-command-stage]') && !shown('[data-screen=planning]')) return null;
  if (document.querySelector('[data-nav-close]')) return null;
  const el = document.scrollingElement || document.documentElement;
  return { overflow: Math.max(0, Math.round(el.scrollHeight - window.innerHeight)) };
})()
`;

/**
 * A place on planning's figure with a pathogen standing at it, in screen coordinates after scrolling
 * it into view; null when no place has one. The figure resolves a tap to the nearest marker from the
 * pointer's own coordinates, so the walk clicks at the marker's centre (piece 4, §17, choice 3).
 */
const FIGURE_MARKER = `
(() => {
  const svg = document.querySelector('svg[data-anatomy]');
  if (!svg || svg.getClientRects().length === 0) return null;
  const g = [...svg.querySelectorAll('[data-anatomy-place]')].find((x) => Number(x.getAttribute('data-anatomy-count')) > 0);
  if (!g) return null;
  g.scrollIntoView({ block: 'center' });
  const r = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const cx = Number(g.getAttribute('data-cx'));
  const cy = Number(g.getAttribute('data-cy'));
  return { x: r.left + (cx * r.width) / vb.width, y: r.top + (cy * r.height) / vb.height };
})()
`;

/** The play area as it stands on this screen and the stage it holds, or null when it is not on
 *  screen (piece 5, docs/for-P2.7.md §19). */
const PLAY_AREA_PROBE = `
(() => {
  const d = document.querySelector('[data-play-area]');
  if (!d || d.getClientRects().length === 0) return null;
  const r = d.getBoundingClientRect();
  return { height: Math.round(r.height * 10) / 10, stage: d.getAttribute('data-play-area') || '' };
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
/** Where one close landed, against where ruling 9 says it must (docs/for-P2.7.md §9). */
interface NestResult {
  path: string;
  /** The level it must land on; for a path not reached, why it was not. */
  expected: string;
  /** Where it landed, or NOT REACHED. */
  actual: string;
  /** How it was closed: the floating button, the phone's back gesture, or a reload and Continue. */
  via: 'close' | 'gesture' | 'resume';
  ok: boolean;
}

const whereNow = async (page: Page): Promise<string> => (await page.evaluate(WHERE)) as string;

/** One close through the floating button, the way a player closes anything. */
const closeLevel = async (page: Page): Promise<boolean> => {
  const hit = await clickSel(page, '[data-nav-close]');
  await sleep(250);
  return hit;
};

/** One level back through the phone's gesture: the browser's own history, not the button. */
const gestureBack = async (page: Page): Promise<void> => {
  await page.evaluate('history.back()');
  await sleep(400);
};

/**
 * Closes ONE level, by the button or the gesture, and records where it landed. The close happens
 * in every pass so every pass walks the same path; only the base pass records (`out` null).
 */
async function nest(
  page: Page,
  out: NestResult[] | null,
  path: string,
  expected: string,
  via: 'close' | 'gesture' = 'close',
): Promise<void> {
  if (via === 'close') await closeLevel(page);
  else await gestureBack(page);
  if (out === null) return;
  const actual = await whereNow(page);
  out.push({ path, expected, actual, via, ok: actual === expected });
}

/** A nesting path the walk could not open, recorded rather than omitted. */
const nestNotReached = (out: NestResult[] | null, path: string, why: string): void => {
  out?.push({ path, expected: why, actual: 'NOT REACHED', via: 'close', ok: false });
};

const notReached = (screen: string, why = 'the walk could not open it'): ScreenResult => ({
  screen,
  controls: 0,
  textRuns: 0,
  findings: [{ check: 'touch', screen, path: '', text: '', detail: `NOT REACHED: ${why}` }],
});

/**
 * THE PLAY AREA'S ONE HEIGHT (piece 5, docs/for-P2.7.md §19; "equal play area height for all
 * phases is important", Shantanu, 20 September 2026). The figure in planning and the board in
 * command sit in one box, so on every screen of the base pass that shows it, in either stage, it
 * must be one height. It replaces the dock's one-height check (§12), whose dock piece 5 retired.
 *
 * Standard text only. A run that did not measure BOTH stages is NOT REACHED, never clean: one
 * stage alone is one height trivially.
 */
function playAreaFindings(
  records: readonly { screen: string; height: number; stage: string }[],
): Finding[] {
  const stages = new Set(records.map((r) => r.stage));
  if (!stages.has('planning') || !stages.has('command')) {
    return [
      {
        check: 'playArea',
        screen: 'play area, one height',
        path: '',
        text: '',
        detail: `NOT REACHED: the play area was measured in ${stages.size === 0 ? 'no stage' : [...stages].join(' and ')} only`,
      },
    ];
  }
  const counts = new Map<number, number>();
  for (const r of records)
    counts.set(Math.round(r.height), (counts.get(Math.round(r.height)) ?? 0) + 1);
  if (counts.size <= 1) return [];
  let usual = 0;
  let most = 0;
  for (const [h, n] of counts) {
    if (n > most) {
      usual = h;
      most = n;
    }
  }
  return records
    .filter((r) => Math.round(r.height) !== usual)
    .map((r) => ({
      check: 'playArea' as const,
      screen: r.screen,
      path: '',
      text: '',
      detail: `the play area is ${String(r.height)}px here (${r.stage}) and ${String(usual)}px on ${String(most)} other screens`,
    }));
}

/**
 * THE MAIN SCREEN DOES NOT SCROLL (docs/for-P2.7.md §9, ruling 4; piece 3, and planning since piece
 * 4, §17). On every screen of the base pass (360 × 780, Standard text) where the play screen is at
 * rest, the page must not be taller than the screen. Larger text may scroll as the last resort (ruling 5) and a 640px phone is checked,
 * not chased (ruling 6), so neither is this check's business. A 1px tolerance, for subpixel rounding.
 * A run that measured no screen at rest is NOT REACHED, never clean.
 */
function restFindings(records: readonly { screen: string; overflow: number }[]): Finding[] {
  if (records.length === 0) {
    return [
      {
        check: 'scroll',
        screen: 'main screen, no scroll',
        path: '',
        text: '',
        detail: 'NOT REACHED: no screen measured the play screen at rest',
      },
    ];
  }
  return records
    .filter((r) => r.overflow > 1)
    .map((r) => ({
      check: 'scroll' as const,
      screen: r.screen,
      path: '',
      text: '',
      detail: `the main screen scrolls ${String(r.overflow)}px here`,
    }));
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Waits for a button by its exact text without clicking it; false when it never comes. */
async function waitFor(page: Page, label: string, ms: number): Promise<boolean> {
  return page
    .waitForFunction(
      (l: string) =>
        [...document.querySelectorAll('button')].some((b) => b.textContent?.trim() === l),
      { timeout: ms },
      label,
    )
    .then(() => true)
    .catch(() => false);
}

/**
 * Selects a piece the way a player does since piece 3 (docs/for-P2.7.md §15): the Pieces drawer
 * opens and the chip is tapped, which closes it. A chip that is not there closes the drawer again,
 * so a miss never leaves a drawer open over the rest of the walk.
 */
async function pick(page: Page, piece: string): Promise<boolean> {
  if (!(await clickSel(page, '[data-tab="pieces"]'))) return false;
  await sleep(250);
  const hit = await clickSel(page, `[data-piece="${piece}"]`);
  await sleep(250);
  if (!hit) await closeLevel(page);
  return hit;
}

/**
 * Deselects the way a player does since piece 5 (docs/for-P2.7.md §19): the Cells view opens and
 * the selected chip is tapped again, which deselects and closes the view. With nothing selected the
 * view is closed again, so a miss never leaves it open over the rest of the walk.
 */
async function deselect(page: Page): Promise<void> {
  if (!(await clickSel(page, '[data-tab="pieces"]'))) return;
  await sleep(250);
  const hit = await clickSel(page, '[data-piece][data-selected]');
  await sleep(250);
  if (!hit) await closeLevel(page);
}

/** The Title's Continue carries its subtitle inside the button, so match the label's start. */
const clickContinue = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      x.textContent?.trim().startsWith('Continue'),
    );
    b?.click();
    return b !== undefined;
  });

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
  const o = (await page.evaluate(OCCLUSION_AUDITOR)) as { findings: Omit<Finding, 'screen'>[] };
  const playArea = (await page.evaluate(PLAY_AREA_PROBE)) as ScreenResult['playArea'];
  const rest = (await page.evaluate(REST_PROBE)) as ScreenResult['rest'];
  results.push({
    screen,
    controls: r.controls,
    textRuns: r.textRuns,
    playArea,
    rest,
    findings: [...r.findings, ...o.findings].map((f) => ({ ...f, screen })),
  });
}

/** FONT200: scaling per text run, then the layout, with the root at 200% on a 360px page. */
async function font200Audit(page: Page, screen: string, results: ScreenResult[]): Promise<void> {
  const s = (await page.evaluate(SCALE_AUDITOR)) as {
    findings: Omit<Finding, 'screen'>[];
    runs: number;
  };
  const l = (await page.evaluate(LAYOUT_AUDITOR)) as Layout;
  const o = (await page.evaluate(OCCLUSION_AUDITOR)) as { findings: Omit<Finding, 'screen'>[] };
  const name = `${screen} @200% font size`;
  results.push({
    screen: name,
    controls: 0,
    textRuns: s.runs,
    width: l.width,
    rootFontPx: l.rootFontPx,
    findings: [...s.findings, ...l.findings, ...o.findings].map((f) => ({ ...f, screen: name })),
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
  const o = (await page.evaluate(OCCLUSION_AUDITOR)) as { findings: Omit<Finding, 'screen'>[] };
  const name = `${screen} @200% page zoom`;
  results.push({
    screen: name,
    controls: 0,
    textRuns: 0,
    width: l.width,
    rootFontPx: l.rootFontPx,
    findings: [...l.findings, ...o.findings].map((f) => ({ ...f, screen: name })),
  });
}

/** Title → Difficulty → goal → first draw → reveal → planning → command, auditing each. */
async function walk(
  page: Page,
  results: ScreenResult[],
  step: (page: Page, screen: string, results: ScreenResult[]) => Promise<void>,
  rootPct: string | null = null,
  nesting: NestResult[] | null = null,
): Promise<void> {
  coverage.cellCard = false;
  coverage.targets = false;
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
    await nest(page, nesting, 'Title → Settings', 'title');
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
      // Siblings are not levels (for-P2.7.md §10): ten sections reached by Next close in ONE.
      await nest(page, nesting, 'Help section 10, reached by Next → close', 'help index');
    }
    // HELP SECTION → WHY LINK → LIBRARY PAGE closes back to the section (ruling 9), and the
    // back gesture from the section itself lands on the index.
    let linked = false;
    for (const s of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10']) {
      if (!(await clickSel(page, `[data-help-section=${s}]`))) break;
      await sleep(200);
      const section = await whereNow(page);
      if (await clickSel(page, '[data-help-why-link]')) {
        await sleep(300);
        linked = true;
        await nest(page, nesting, 'Help section → why link → library page', section);
        await nest(page, nesting, 'Help section → back gesture', 'help index', 'gesture');
        break;
      }
      await closeLevel(page);
    }
    if (!linked)
      nestNotReached(
        nesting,
        'Help section → why link → library page',
        'no section had a why link',
      );
    await nest(page, nesting, 'Help index → close', 'title');
  }
  // The disease library from the Title (P2.6 piece 4): the index, one card over it, the why
  // section, then back out. Every row of the index is a control the audit measures.
  if (await click(page, 'Disease library')) {
    await sleep(300);
    await step(page, 'library, index', results);
    if (await clickSel(page, '[data-library-row]')) {
      await sleep(300);
      await step(page, 'library, card', results);
      await nest(page, nesting, 'Library index → card → close', 'library index');
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
          // LIBRARY CARD → WHY PAGE closes back to the card, not the index (ruling 9); the same
          // path by the back gesture; then the card closes to the index.
          await nest(page, nesting, 'Library card → why it works this way', 'pathogen card');
          if (await clickSel(page, '[data-card-why]')) {
            await sleep(300);
            await nest(
              page,
              nesting,
              'Library card → why page → back gesture',
              'pathogen card',
              'gesture',
            );
          }
          await nest(page, nesting, 'Library card → close', 'library index');
        } else {
          results.push(notReached('library, why from a card'));
          nestNotReached(
            nesting,
            'Library card → why it works this way',
            'the card had no why link',
          );
          await closeLevel(page);
        }
      }
      await typeInto(page, '[data-library-filter]', '');
      await sleep(200);
    }
    if (await click(page, 'Why it works this way')) {
      await sleep(300);
      await step(page, 'library, why', results);
      // LIBRARY WHY PAGE → IN HOW TO PLAY → HELP closes back to the why page (ruling 9).
      if (await clickSel(page, '[data-library-in-help]')) {
        await sleep(300);
        await nest(page, nesting, 'Library why page → In How to play → Help', 'library why page');
      } else {
        nestNotReached(
          nesting,
          'Library why page → In How to play → Help',
          'no In How to play link',
        );
      }
      await nest(page, nesting, 'Library why page → close', 'library index');
    }
    await nest(page, nesting, 'Library index → close', 'title');
  }
  // About (P2.6): the Title's fourth slot, and the only one that never opens over play.
  if (await click(page, 'About')) {
    await sleep(300);
    await step(page, 'about', results);
    await nest(page, nesting, 'Title → About', 'title');
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
  // THE DRAW IS THE APP'S (docs/for-P2.7.md §12, ruling 2): the reveal follows Begin with nothing
  // pressed. "Play, infection phase" was walked as a screen until then; it is no longer a resting
  // state, so it is no longer a screen, and a reveal that never comes is NOT REACHED.
  if (await waitFor(page, 'Plan your turn', 8000)) {
    await sleep(300);
    await step(page, 'reveal dialog', results);
  } else {
    results.push(notReached('reveal dialog', 'no reveal followed Begin: the draw did not happen'));
  }
  await click(page, 'Plan your turn');
  await sleep(300);
  await step(page, 'planning', results);
  // PLANNING'S LIST IS IN THE MIDDLE (piece 5, docs/for-P2.7.md §19): the Pathogens drawer is gone.
  // A PATHOGEN CARD from the list closes back to planning (ruling 9). A lone pathogen's row opens its
  // card; a group opens to its members, each with a card button.
  let listCard = await clickSel(page, '[data-middle-view=planning] [data-opens-card]');
  if (!listCard) {
    await clickSel(page, '[data-middle-view=planning] [data-planning-group] > button');
    await sleep(250);
    listCard = await clickSel(page, '[data-middle-view=planning] [data-planning-member] button');
  }
  if (listCard) {
    await sleep(300);
    await step(page, 'pathogen card, from planning', results);
    await nest(page, nesting, 'Planning list → pathogen card', 'planning');
  } else {
    results.push(notReached('pathogen card, from planning', 'no row in the list offered a card'));
    nestNotReached(nesting, 'Planning list → pathogen card', 'no row in the list offered a card');
  }
  // A TAP ON THE FIGURE filters the list to that place, and a tap elsewhere on the body lists them
  // all again (§19). Not a layer: a filter, so no close. A real pointer click at a marker's centre,
  // because the figure resolves the tap from the pointer's coordinates.
  const marker = (await page.evaluate(FIGURE_MARKER)) as { x: number; y: number } | null;
  if (marker !== null) {
    await page.mouse.click(marker.x, marker.y);
    await sleep(350);
  }
  const showing = (): Promise<boolean> =>
    page.evaluate(
      () => document.querySelector('[data-middle-view=planning] [data-planning-showing]') !== null,
    );
  if (marker !== null && (await showing())) {
    await step(page, 'planning, list at a place', results);
    // Elsewhere on the body: the play area's top left corner, away from every marker.
    const box = (await page.evaluate(() => {
      const r = document.querySelector('[data-play-area]')?.getBoundingClientRect();
      return r ? { x: r.left + 6, y: r.top + 6 } : null;
    })) as { x: number; y: number } | null;
    if (box !== null) await page.mouse.click(box.x, box.y);
    await sleep(300);
    if (await showing()) {
      results.push({
        screen: 'planning, list at a place',
        controls: 0,
        textRuns: 0,
        findings: [
          {
            check: 'touch',
            screen: 'planning, list at a place',
            path: '',
            text: '',
            detail: 'a tap away from every marker left the list filtered',
          },
        ],
      });
    }
  } else {
    results.push(
      notReached(
        'planning, list at a place',
        marker === null
          ? 'no place on the figure had a pathogen'
          : 'a tap on a marker did not filter the list',
      ),
    );
  }
  // MESSAGES, from the top bar's chat icon (§19): "What happened" is its System messages tab.
  if (await clickSel(page, '[data-chat]')) {
    await sleep(300);
    await step(page, 'planning, Messages', results);
    await nest(page, nesting, 'Planning → Messages → close', 'planning');
  } else {
    results.push(notReached('planning, Messages', 'no chat icon in the top bar'));
    nestNotReached(nesting, 'Planning → Messages → close', 'no chat icon in the top bar');
  }
  // THE AP TERMS, from the top bar's AP figure (§19): a view in the middle, one close away.
  if (await clickSel(page, '[data-bar-ap]:not([disabled])')) {
    await sleep(250);
    await step(page, 'planning, AP terms open', results);
    await nest(page, nesting, 'Planning → AP terms → close', 'planning');
  } else {
    results.push(notReached('planning, AP terms open', 'the AP figure was not tappable'));
    nestNotReached(nesting, 'Planning → AP terms → close', 'the AP figure was not tappable');
  }
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
    sheetOpened = await page.evaluate(
      () => document.querySelector('[data-inspect-sheet]') !== null,
    );
    if (sheetOpened) break;
    // The tap may have selected a cell or a resident instead (a tap on the selected piece
    // deselects it; a tap on nothing deselects too): the same tap again undoes it.
    await tapToken(i);
    await sleep(150);
  }
  if (sheetOpened) {
    await step(page, 'inspect sheet', results);
    // INSPECT SHEET → PATHOGEN CARD and → CELL CARD each close back to the sheet (ruling 9).
    if (await clickSel(page, '[data-inspect-sheet] [data-sheet-card]')) {
      await sleep(300);
      await nest(page, nesting, 'Inspect sheet → pathogen card', 'inspect sheet');
    } else {
      nestNotReached(nesting, 'Inspect sheet → pathogen card', 'the sheet offered no card');
    }
    if (await clickSel(page, '[data-inspect-sheet] [data-cell-card]')) {
      await sleep(300);
      await step(page, 'cell card, from the inspect sheet', results);
      coverage.cellCard = true;
      await nest(page, nesting, 'Inspect sheet → cell card', 'inspect sheet');
    }
    // Not reached here, the walk to the Result keeps trying, turn after turn (see `coverage`).
    await nest(page, nesting, 'Inspect sheet → close', 'play');
  } else {
    nestNotReached(
      nesting,
      'Inspect sheet → pathogen card',
      'no invader token tap opened the sheet',
    );
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
  await pick(page, 'cell:bcell');
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
  // THE AP TERMS, from the top bar, open in the middle below the play area (§19).
  if (await clickSel(page, '[data-bar-ap]:not([disabled])')) {
    await sleep(250);
    await step(page, 'AP terms, in the middle', results);
    await nest(page, nesting, 'Top bar → AP terms → close', 'play');
  } else {
    results.push(notReached('AP terms, in the middle', 'the AP figure was not tappable'));
    nestNotReached(nesting, 'Top bar → AP terms → close', 'the AP figure was not tappable');
  }
  // THE ANTIBODIES VIEW, WITH NOTHING SELECTED (§19): "selecting the B-Cell should not be necessary
  // first" (Shantanu, 19 September 2026). So the walk deselects, opens the view, selects a family,
  // and REQUIRES its Produce button: a view without one is a finding, not a screen measured clean.
  // Then closed back to the game in one close (ruling 9).
  await deselect(page);
  if (await clickSel(page, '[data-tab="antibodies"]')) {
    await sleep(300);
    await step(page, 'view: antibodies', results);
    await page.evaluate(() => {
      const chip = [...document.querySelectorAll('[data-middle-view=antibodies] button')].find(
        (b) => /^ENV\b/.test((b as HTMLElement).innerText.trim()),
      ) as HTMLElement | undefined;
      chip?.click();
    });
    await sleep(300);
    await step(page, 'view: antibodies, family ENV selected', results);
    const produce = await page.evaluate(() =>
      [...document.querySelectorAll('[data-middle-view=antibodies] button')].some((b) =>
        /^Produce\b/.test((b as HTMLElement).innerText.trim()),
      ),
    );
    if (!produce) {
      results.push({
        screen: 'view: antibodies, family ENV selected',
        controls: 0,
        textRuns: 0,
        findings: [
          {
            check: 'touch',
            screen: 'view: antibodies, family ENV selected',
            path: '',
            text: '',
            detail: 'no Produce button with nothing selected (ruled 19 September 2026)',
          },
        ],
      });
    }
    await nest(page, nesting, 'Antibodies view → close', 'play');
  } else {
    results.push(notReached('view: antibodies', 'no Antibodies button'));
    nestNotReached(nesting, 'Antibodies view → close', 'no Antibodies button');
  }
  // THE OTHER TWO VIEWS, then MESSAGES: each opened, audited, and closed back to the game.
  for (const [sel, screen] of [
    ['[data-tab="pieces"]', 'view: cells'],
    ['[data-tab="body"]', 'view: the body'],
    ['[data-chat]', 'Messages'],
  ] as const) {
    if (await clickSel(page, sel)) {
      await sleep(300);
      await step(page, screen, results);
      await nest(page, nesting, `${screen} → close`, 'play');
    } else {
      results.push(notReached(screen, 'no button to open it'));
      nestNotReached(nesting, `${screen} → close`, 'no button to open it');
    }
  }
  await pick(page, 'cell:neutrophil');
  await sleep(300);
  await step(page, 'command, Neutrophil selected', results);
  // A CARD BEHIND EVERY NAME (for-P2.7.md §14, ruling 5): the selected cell's name opens its card,
  // on every run, where the inspect sheet's door depends on the deal.
  if (await clickSel(page, '[data-dock-card]')) {
    await sleep(300);
    await step(page, 'cell card, from the dock', results);
    await nest(page, nesting, 'Dock name → cell card → close', 'play');
  } else {
    results.push(notReached('cell card, from the dock', 'the selected cell showed no card button'));
    nestNotReached(nesting, 'Dock name → cell card → close', 'no card button on the name');
  }
  // A ROW WITH SEVERAL TARGETS opens them over the board (§12, ruling 2). Tried here, and on every
  // turn of the walk to the Result until the deal offers one.
  await tryDockTargets(page, results, step, nesting);
  await deselect(page);
  await sleep(200);
  // RECALL IS A SLOT (§14, ruling 2): measured with it showing, so the dock's one-height check
  // covers the fullest slot set. The Monocyte is moved off the bloodstream by a ring if it stands
  // there, the screen is audited, and the move is undone.
  await pick(page, 'cell:macrophage');
  await sleep(250);
  const recallNow = (): Promise<boolean> =>
    page.evaluate(() => document.querySelector('[data-dock-move="recall"]') !== null);
  if (!(await recallNow())) {
    const ring = await page.$('circle[stroke-dasharray="6 4"]');
    if (ring) {
      try {
        await ring.click();
      } catch {
        // The ring moved under the tap; the check below says whether Recall is showing.
      }
      await sleep(400);
      if (!(await page.evaluate(() => document.querySelector('[data-dock-card]') !== null))) {
        await pick(page, 'cell:macrophage');
        await sleep(250);
      }
    }
  }
  if (await recallNow()) {
    await step(page, 'command, Monocyte off the bloodstream, Recall showing', results);
  } else {
    results.push(
      notReached(
        'command, Monocyte off the bloodstream, Recall showing',
        'no move ring took the Monocyte off the bloodstream',
      ),
    );
  }
  if (await clickSel(page, '[data-dock-undo="available"]')) await sleep(300);
  await deselect(page);
  await sleep(200);
  // A RESIDENT SELECTED, the shortest name and one of the widest. The walk had never selected a
  // resident, so the one-height check had never seen the name line with a resident's name in it,
  // and five of the seven wrapped it onto a second row (for-P2.7.md §14).
  for (const organ of ['liver', 'lungs']) {
    if (await pick(page, `resident:${organ}`)) {
      await sleep(250);
      await step(page, `command, the ${organ} resident selected`, results);
      await deselect(page);
      await sleep(200);
    } else {
      results.push(
        notReached(`command, the ${organ} resident selected`, 'no piece chip for that resident'),
      );
    }
  }
  await clickSel(page, '[data-menu]');
  await sleep(300);
  await step(page, 'pause sheet', results);
  // Settings over the paused game: the game stays mounted (hidden) underneath, and the delete
  // row is disabled with its reason, since the save is the game being played.
  // PAUSE MENU → SETTINGS closes back to the pause menu (ruling 9); it used to land on the game.
  if (await click(page, 'Settings')) {
    await sleep(200);
    await step(page, 'settings, over play', results);
    await nest(page, nesting, 'Pause menu → Settings', 'pause menu');
  } else {
    nestNotReached(nesting, 'Pause menu → Settings', 'the pause menu offered no Settings');
  }
  // How to play over the paused game, from the menu that is still open: the index only (the
  // sections are the same screens as from the Title), back to the menu, then the menu closes.
  if (await click(page, 'How to play')) {
    await sleep(200);
    await step(page, 'help, index, over play', results);
    await nest(page, nesting, 'Pause menu → How to play', 'pause menu');
  } else {
    nestNotReached(nesting, 'Pause menu → How to play', 'the pause menu offered no How to play');
  }
  await nest(page, nesting, 'Pause menu → close', 'play');
  // THE BACK GESTURE AT THE BOTTOM OF PLAY opens the pause menu (APP_FLOW ruling 1): back never
  // silently leaves the game. The same gesture then closes the menu.
  await nest(page, nesting, 'Play → back gesture', 'pause menu', 'gesture');
  await nest(page, nesting, 'Pause menu → back gesture', 'play', 'gesture');
  await sleep(200);
  await click(page, 'End turn');
  await sleep(400);
  await step(page, 'spread frame', results);
  for (let i = 0; i < 20; i += 1) {
    const more = await advance(page);
    await sleep(150);
    if (!more) break;
  }
  // The spread ends and the app draws: the next turn opens on its reveal (§12, ruling 2).
  if (await waitFor(page, 'Plan your turn', 8000)) {
    await sleep(300);
    await step(page, 'reveal, after End turn', results);
  } else {
    results.push(notReached('reveal, after End turn', 'no reveal followed the spread'));
  }
  await click(page, 'Plan your turn');
  await sleep(300);
  await step(page, 'planning, next turn', results);
  // A GAME CLOSED MID-SPREAD resumes before its draw, because the session writes the autosave as
  // the spread starts; with no Draw button the same rule must draw on resume, or the player has
  // nothing to press (§12, "What the measurement changes", 2). Reloaded the way a closed tab is.
  await click(page, 'Command your cells');
  await sleep(900);
  await click(page, 'End turn');
  await sleep(350);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('button') !== null, { timeout: 30000 });
  await page.evaluate((p: string | null) => {
    if (p) document.documentElement.style.fontSize = p;
  }, rootPct);
  await sleep(300);
  await clickContinue(page);
  await waitFor(page, 'Plan your turn', 8000);
  await sleep(300);
  if (nesting !== null) {
    const actual = await whereNow(page);
    nesting.push({
      path: 'A game closed mid-spread → Continue',
      expected: 'reveal',
      actual,
      via: 'resume',
      ok: actual === 'reveal',
    });
  }
  await click(page, 'Plan your turn');
  await sleep(300);
  // Settings from the Title WITH a save (the first visit had none, so the delete row was
  // disabled): quit keeps the save, the row is live, its confirm is measured, and Continue
  // resumes the game for the walk to the Result.
  await clickSel(page, '[data-menu]');
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
    await closeLevel(page);
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

/**
 * WHAT THE DEAL DECIDES, TRIED UNTIL IT COMES (docs/for-P2.7.md §13). Two screens exist only when
 * the board co-operates: the cell card, whose one door since piece 2 is the inspect sheet of a node
 * where a cell stands beside a pathogen (FINDINGS #71), and a dock row's list of targets, which
 * needs a piece with several. On a first turn neither is likely, and the first audit of piece 2
 * reached neither in any pass: two screens nobody had measured, under a clean total. So the walk
 * tries them where it can and the walk to the Result keeps trying on every idle turn, while the
 * invaders pile up; only a run that never reaches one records it NOT REACHED. Reset per walk.
 */
const coverage = { cellCard: false, targets: false };

/** Opens a dock row's targets when some piece has several, audits them, closes them. */
async function tryDockTargets(
  page: Page,
  results: ScreenResult[],
  step: (page: Page, screen: string, results: ScreenResult[]) => Promise<void>,
  nesting: NestResult[] | null,
): Promise<void> {
  if (coverage.targets) return;
  // The pieces are in the Cells view since piece 5: read their keys there, then pick each.
  if (!(await clickSel(page, '[data-tab="pieces"]'))) return;
  await sleep(250);
  const pieceKeys = await page.evaluate(() =>
    [...document.querySelectorAll('[data-piece]')].map((e) => e.getAttribute('data-piece') ?? ''),
  );
  await closeLevel(page);
  for (const p of pieceKeys) {
    if (!(await pick(page, p))) continue;
    if (await clickSel(page, '[data-dock-row][data-dock-targets]')) {
      await sleep(250);
      await step(page, 'dock targets', results);
      await nest(page, nesting, 'Dock row → its targets → close', 'play');
      coverage.targets = true;
      return;
    }
  }
}

/** Opens the inspect sheet on a node where a cell stands, then that cell's card; audits the card. */
async function tryCellCard(
  page: Page,
  results: ScreenResult[],
  step: (page: Page, screen: string, results: ScreenResult[]) => Promise<void>,
  nesting: NestResult[] | null,
): Promise<void> {
  if (coverage.cellCard) return;
  const n = await page.evaluate(() => document.querySelectorAll('[data-invader]').length);
  for (let i = 0; i < n; i += 1) {
    const el = (await page.$$('[data-invader]'))[i];
    if (!el) continue;
    try {
      await el.click();
    } catch {
      continue;
    }
    await sleep(280);
    const sheet = await page.evaluate(
      () => document.querySelector('[data-inspect-sheet]') !== null,
    );
    if (!sheet) {
      // The tap selected a piece instead; the same tap again lets it go.
      try {
        await (await page.$$('[data-invader]'))[i]?.click();
      } catch {
        /* moved under us */
      }
      await sleep(150);
      continue;
    }
    if (await clickSel(page, '[data-inspect-sheet] [data-cell-card]')) {
      await sleep(300);
      await step(page, 'cell card, from the inspect sheet', results);
      await nest(page, nesting, 'Inspect sheet → cell card', 'inspect sheet');
      await closeLevel(page);
      coverage.cellCard = true;
      return;
    }
    await closeLevel(page);
  }
}

/** The Result screen: an idle game on Training is lost within a handful of turns. */
async function walkToResult(
  page: Page,
  results: ScreenResult[],
  step: (page: Page, screen: string, results: ScreenResult[]) => Promise<void>,
  nesting: NestResult[] | null = null,
): Promise<void> {
  for (let turn = 0; turn < 14; turn += 1) {
    const ended = await page.evaluate(() => document.body.innerText.includes('Play again'));
    if (ended) break;
    // The app draws at the start of every turn (§12, ruling 2); a mop-up draw shows no reveal.
    await waitFor(page, 'Plan your turn', 1500);
    if (await click(page, 'Plan your turn')) await sleep(250);
    if (await click(page, 'Command your cells')) await sleep(700);
    await tryDockTargets(page, results, step, nesting);
    await deselect(page);
    await sleep(150);
    await tryCellCard(page, results, step, nesting);
    await click(page, 'End turn');
    for (let i = 0; i < 40; i += 1) {
      await sleep(120);
      const ended2 = await page.evaluate(() => document.body.innerText.includes('Play again'));
      if (ended2) break;
      const more = await advance(page);
      if (!more && i > 8) break;
    }
  }
  if (!coverage.cellCard) {
    results.push(
      notReached(
        'cell card, from the inspect sheet',
        'no node with a cell beside a pathogen opened in the walk or 14 idle turns (FINDINGS #71)',
      ),
    );
    nestNotReached(nesting, 'Inspect sheet → cell card', 'no cell card door opened');
  }
  if (!coverage.targets) {
    results.push(
      notReached(
        'dock targets',
        'no piece had a row with several targets in the walk or 14 idle turns',
      ),
    );
    nestNotReached(nesting, 'Dock row → its targets → close', 'no row with several targets');
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
  // THE ART COUNT the offline check rests on (docs/for-P2.7.md §18), both ways, with the network
  // still cut: an SVG image whose URL nothing precached must be counted broken, and one the build
  // precached must not be. Planted on the title screen and compared with its own art before them.
  const artWith = async (
    href: string | null,
  ): Promise<{ images: number; brokenImages: number }> => {
    if (href !== null) {
      await page.evaluate((h: string) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('data-control', 'art');
        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttribute('href', h);
        svg.appendChild(image);
        document.body.prepend(svg);
      }, href);
    }
    const art = (await page.evaluate(ART_PROBE)) as { images: number; brokenImages: number };
    await page.evaluate(UNPLANT);
    return art;
  };
  const artBase = await artWith(null);
  const artMissing = await artWith('/art/control-art-does-not-exist.webp');
  const artPrecached = served === null ? null : await artWith('/art/path-virus@3x.webp');
  await page.setOfflineMode(false);
  line('offline fires: a fresh URL fails with the network cut', failed);
  line(
    'offline art fires: an SVG image nothing precached is counted broken with the network cut',
    artMissing.images === artBase.images + 1 &&
      artMissing.brokenImages === artBase.brokenImages + 1,
  );
  if (artPrecached === null)
    lines.push(
      'CONTROL offline art passes: NOT RUN — no service worker controls this origin; the offline check will report not met',
    );
  else
    line(
      'offline art passes: an SVG image the build precached is NOT counted broken',
      artPrecached.images === artBase.images + 1 &&
        artPrecached.brokenImages === artBase.brokenImages,
    );
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

  // ------------------------------------------------------------------------------------------
  // A SERVICE WORKER THAT FAILS TO REGISTER (FINDINGS #69). The ordinary-load control above
  // could never see this defect: in this browser the worker registers, so the failing state is
  // one the instrument never entered. So it is ENTERED on purpose, in a fresh browser context
  // with no worker in it, by making `register` refuse before any app script runs.
  //
  // Both halves run in that same state. The PASSES half is the property: the app keeps running,
  // no crash screen and its buttons still there, because online-capable and not
  // offline-capable is degraded, not failed. The FIRES half runs the call the plugin used to
  // inject, uncaught, and the crash screen must appear. Without it, a forced refusal that
  // silently did nothing would pass the passes half perfectly and prove nothing.
  //
  // String scripts, not functions: tsx wraps named functions in a helper the page does not have.
  // ------------------------------------------------------------------------------------------
  const refusedRegistration = async (probe: string | null): Promise<boolean> => {
    const context = await page.browser().createBrowserContext();
    try {
      const p = await context.newPage();
      await p.setViewport({ width: 360, height: 780 });
      await p.evaluateOnNewDocument(
        "if ('serviceWorker' in navigator) { navigator.serviceWorker.register = function () { " +
          "return Promise.reject(new TypeError('audit control: registration refused')); }; }",
      );
      await p.goto(URL, { waitUntil: 'load' });
      await p.waitForFunction(() => document.querySelector('button') !== null, {
        timeout: 30000,
      });
      if (probe !== null) await p.evaluate(probe);
      await sleep(800);
      const crash = await p.evaluate(() => document.querySelector('[data-crash]') !== null);
      if (probe !== null) return crash;
      const buttons = await p.evaluate(() => document.querySelectorAll('button').length);
      return !crash && buttons > 0;
    } finally {
      await context.close();
    }
  };
  line(
    'service worker fires: with registration refused, the uncaught call the plugin used to inject reaches the crash screen',
    await refusedRegistration(
      "setTimeout(function () { navigator.serviceWorker.register('/sw.js', { scope: '/' }); }, 0); 0",
    ),
  );
  line(
    "service worker passes: with registration refused, the app's own registration leaves it running, no crash screen",
    await refusedRegistration(null),
  );

  // ------------------------------------------------------------------------------------------
  // OCCLUSION (docs/for-P2.7.md §10): text under a fixed control must be flagged, and text clear
  // of it must not be. Planted as a fixed button across the bottom of the title screen, with one
  // line of text under it and one well above it.
  // ------------------------------------------------------------------------------------------
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('button') !== null, { timeout: 30000 });
  await plant([
    {
      tag: 'button',
      id: 'float',
      text: 'planted float',
      style: box({
        position: 'fixed',
        left: '0',
        bottom: '0',
        width: '100%',
        height: '60px',
        border: '1px solid #000',
        zIndex: '9999',
      }),
    },
    {
      tag: 'span',
      id: 'under',
      text: 'planted under',
      style: box({ position: 'fixed', left: '10px', bottom: '20px' }),
    },
    {
      tag: 'span',
      id: 'above',
      text: 'planted above',
      style: box({ position: 'fixed', left: '10px', bottom: '200px' }),
    },
  ]);
  const occ = (await page.evaluate(OCCLUSION_AUDITOR)) as { findings: Planted };
  line(
    'occlusion fires: text under a fixed button is flagged',
    has(occ.findings, 'occlusion', 'planted under'),
  );
  line(
    'occlusion passes: text clear of a fixed button is NOT flagged',
    !has(occ.findings, 'occlusion', 'planted above'),
  );
  await unplant();
  // The class the check's first run got wrong: text under a fixed button, but behind a modal scrim
  // that sits between them. The scrim hides it, not the button, so it must NOT be flagged.
  await plant([
    {
      tag: 'div',
      id: 'scrim',
      text: '',
      style: box({
        position: 'fixed',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.45)',
        zIndex: '5000',
      }),
    },
    {
      tag: 'button',
      id: 'modal-button',
      text: 'planted modal button',
      style: box({
        position: 'fixed',
        left: '0',
        bottom: '0',
        width: '100%',
        height: '60px',
        border: '1px solid #000',
        zIndex: '9999',
      }),
    },
    {
      tag: 'span',
      id: 'behind',
      text: 'planted behind',
      style: box({ position: 'fixed', left: '10px', bottom: '20px', zIndex: '1' }),
    },
  ]);
  const behind = (await page.evaluate(OCCLUSION_AUDITOR)) as { findings: Planted };
  line(
    'occlusion passes: text behind a modal scrim under a fixed button is NOT flagged',
    !has(behind.findings, 'occlusion', 'planted behind'),
  );
  await unplant();

  // ------------------------------------------------------------------------------------------
  // NESTING (docs/for-P2.7.md §9, ruling 9): the landing check must report a close that went too
  // far and pass one that went exactly one level. How to play, section 1; the planted defect
  // closes TWICE while expecting the index, lands on the title, and must be reported. The same
  // path closed once must not be.
  // ------------------------------------------------------------------------------------------
  const landing = async (closes: number): Promise<NestResult[]> => {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('button') !== null, {
      timeout: 30000,
    });
    const got: NestResult[] = [];
    if (!(await click(page, 'How to play'))) return got;
    await sleep(200);
    if (!(await clickSel(page, '[data-help-section=s1]'))) return got;
    await sleep(200);
    for (let i = 1; i < closes; i += 1) await closeLevel(page);
    await nest(page, got, 'control: Help section 1 → close', 'help index');
    return got;
  };
  const twice = await landing(2);
  line(
    'nesting fires: a close that goes two levels is reported as landing wrong',
    twice.length === 1 && twice[0]?.ok === false && twice[0]?.actual === 'title',
  );
  const once = await landing(1);
  line(
    'nesting passes: a close that goes one level is NOT reported',
    once.length === 1 && once[0]?.ok === true,
  );

  // ------------------------------------------------------------------------------------------
  // THE PLAY AREA'S ONE HEIGHT (docs/for-P2.7.md §19): the check must report a screen where the play
  // area is another height, pass both stages at one height (to the pixel it rounds to), and call a
  // run that measured only one stage NOT REACHED rather than clean.
  // ------------------------------------------------------------------------------------------
  line(
    'play area fires: a screen where it is another height is reported, by name',
    playAreaFindings([
      { screen: 'a', height: 300, stage: 'planning' },
      { screen: 'b', height: 340, stage: 'command' },
      { screen: 'c', height: 300, stage: 'command' },
    ]).some((f) => f.screen === 'b' && f.detail.startsWith('the play area is 340px')),
  );
  line(
    'play area passes: both stages at one height are NOT reported',
    playAreaFindings([
      { screen: 'a', height: 300, stage: 'planning' },
      { screen: 'b', height: 300.2, stage: 'command' },
    ]).length === 0,
  );
  line(
    'play area fires: a run that measured one stage only is NOT REACHED, never clean',
    playAreaFindings([{ screen: 'a', height: 300, stage: 'command' }]).some((f) =>
      f.detail.startsWith('NOT REACHED'),
    ),
  );

  // ------------------------------------------------------------------------------------------
  // THE MAIN SCREEN DOES NOT SCROLL (docs/for-P2.7.md §15): the check must report a screen at rest
  // that is taller than the screen, pass one within the 1px tolerance, and call a run that measured
  // no screen at rest NOT REACHED rather than clean.
  line(
    'scroll fires: a main screen taller than the screen is reported, by name',
    restFindings([
      { screen: 'a', overflow: 0 },
      { screen: 'b', overflow: 40 },
    ]).some((f) => f.screen === 'b' && f.detail.includes('40px')),
  );
  line(
    'scroll passes: a main screen that fits, to the pixel, is NOT reported',
    restFindings([
      { screen: 'a', overflow: 0 },
      { screen: 'b', overflow: 1 },
    ]).length === 0,
  );
  line(
    'scroll fires: a run that measured no screen at rest is NOT REACHED, never clean',
    restFindings([]).some((f) => f.detail.startsWith('NOT REACHED')),
  );

  // RESUME (docs/for-P2.7.md §12): the landing check on a resumed game must report one that lands
  // anywhere but a reveal, and pass the game closed mid-spread that the walk itself relies on. The
  // fires half resumes a game saved at planning, after its draw, which has no draw to make and so
  // lands on planning; each half runs in its own browser context, so no save leaks between them.
  // ------------------------------------------------------------------------------------------
  const resumeLanding = async (midSpread: boolean): Promise<string> => {
    const context = await page.browser().createBrowserContext();
    try {
      const p = await context.newPage();
      await p.setViewport({ width: 360, height: 780 });
      await p.goto(URL, { waitUntil: 'load' });
      await waitClick(p, 'New game');
      await p
        .waitForFunction(
          () =>
            [...document.querySelectorAll('*')].some(
              (x) => x.textContent?.trim() === 'Training' && x.children.length === 0,
            ),
          { timeout: 8000 },
        )
        .catch(() => undefined);
      await p.evaluate(() => {
        const el = [...document.querySelectorAll('*')].find(
          (x) => x.textContent?.trim() === 'Training' && x.children.length === 0,
        ) as HTMLElement | undefined;
        el?.click();
      });
      await sleep(300);
      await click(p, 'Start and replace');
      await waitClick(p, 'Begin');
      await waitClick(p, 'Plan your turn');
      await sleep(300);
      if (midSpread) {
        await waitClick(p, 'Command your cells');
        await sleep(900);
        await waitClick(p, 'End turn');
        await sleep(350);
      }
      await p.reload({ waitUntil: 'load' });
      await p.waitForFunction(() => document.querySelector('button') !== null, { timeout: 30000 });
      await sleep(300);
      await clickContinue(p);
      await waitFor(p, 'Plan your turn', 5000);
      await sleep(400);
      return await whereNow(p);
    } finally {
      await context.close();
    }
  };
  line(
    'resume fires: a resumed game that lands anywhere but a reveal is reported',
    (await resumeLanding(false)) === 'planning',
  );
  line(
    'resume passes: a game closed mid-spread reaches its reveal',
    (await resumeLanding(true)) === 'reveal',
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

async function playATurn(page: Page): Promise<{
  turn: string | null;
  brokenImages: number;
  images: number;
  svgArt: number;
  steps: string[];
}> {
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
  // The draw is the app's (§12, ruling 2): the reveal follows Begin with nothing pressed.
  await step('Plan your turn', () => waitClick(page, 'Plan your turn'));
  await step('Command your cells', () => waitClick(page, 'Command your cells'));
  await step('select the Monocyte', async () => {
    await page
      .waitForFunction(() => document.querySelector('[data-tab="pieces"]') !== null, {
        timeout: 8000,
      })
      .catch(() => undefined);
    return pick(page, 'cell:macrophage');
  });
  await step('End turn', () => waitClick(page, 'End turn'));
  for (let i = 0; i < 40; i += 1) {
    await sleep(150);
    const more = await advance(page);
    if (!more && i > 6) break;
  }
  // The turn as the top bar shows it since piece 5 ("2/15", docs/for-P2.7.md §19). This read the
  // page's text for "Turn N of", which piece 5 removed, and said NOT MET on a build that had played
  // a turn offline cleanly: the guard firing on the instrument, fixed inline.
  const turn = (await page.evaluate(
    () => (document.querySelector('[data-turn]')?.textContent ?? '').trim() || null,
  )) as string | null;
  // The art counted with ART_PROBE: `<img>` and SVG `<image>` both, because since piece 4 the screen
  // a turn ends on holds only the second (docs/for-P2.7.md §18).
  const art = (await page.evaluate(ART_PROBE)) as {
    images: number;
    brokenImages: number;
    svgArt: number;
  };
  return { turn, ...art, steps };
}

/**
 * THE MAIN SCREEN AT 360 x 641 (piece 5, docs/for-P2.7.md §19): the S25's Chrome tab, measured by
 * Shantanu on 20 September 2026 (360 x 641 of a 360 x 780 screen, DPR 3), and where
 * planning scrolled on the build before this one. Planning and command at rest, and command with a
 * view open under the floating close, whose spacer made the page 88px taller than the screen on this
 * piece's first build: nothing at rest could have seen that. A screen not reached is NOT REACHED.
 */
async function restAt641(page: Page): Promise<{ screen: string; overflow: number }[]> {
  const out: { screen: string; overflow: number }[] = [];
  const overflow = (): Promise<number> =>
    page.evaluate(() => {
      const el = document.scrollingElement || document.documentElement;
      return Math.max(0, Math.round(el.scrollHeight - window.innerHeight));
    });
  const miss = (screen: string): void => {
    out.push({ screen, overflow: -1 });
  };
  await page.goto(URL, { waitUntil: 'load' });
  await waitClick(page, 'New game');
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('*')].some(
          (x) => x.textContent?.trim() === 'Training' && x.children.length === 0,
        ),
      { timeout: 8000 },
    )
    .catch(() => undefined);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find(
      (x) => x.textContent?.trim() === 'Training' && x.children.length === 0,
    ) as HTMLElement | undefined;
    el?.click();
  });
  await sleep(300);
  await click(page, 'Start and replace');
  await waitClick(page, 'Begin');
  if (!(await waitClick(page, 'Plan your turn'))) {
    miss('planning @360x641');
    miss('command, nothing selected @360x641');
    miss('command, a view open @360x641');
    return out;
  }
  await sleep(400);
  out.push({ screen: 'planning @360x641', overflow: await overflow() });
  if (!(await waitClick(page, 'Command your cells'))) {
    miss('command, nothing selected @360x641');
    miss('command, a view open @360x641');
    return out;
  }
  await sleep(900);
  out.push({ screen: 'command, nothing selected @360x641', overflow: await overflow() });
  if (await clickSel(page, '[data-tab="antibodies"]')) {
    await sleep(300);
    out.push({ screen: 'command, a view open @360x641', overflow: await overflow() });
    await closeLevel(page);
  } else miss('command, a view open @360x641');
  return out;
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
    // MET means: a turn played after the reload with no network, on the screen the turn ends on,
    // whose art (`<img>`, and SVG `<image>` since piece 4) is there and none of it broken, and no
    // request failed along the way. It read "a command screen that holds images" until piece 4
    // left that screen without a single `<img>`, and the images > 0 guard said NOT MET on a build
    // that had played offline cleanly: the guard doing its job (docs/for-P2.7.md §18).
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
  const nesting: NestResult[] = [];
  if (!offlineOnly) {
    await walk(page, results, audit, null, nesting);
    await walkToResult(page, results, audit, nesting);
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

  const page6 = await browser.newPage();
  await page6.setViewport({ width: 360, height: 641 });
  const at641 = offlineOnly ? [] : await restAt641(page6);
  await page6.close();

  const page3 = await browser.newPage();
  await page3.setViewport({ width: 360, height: 780 });
  const off = await offline(page3);
  await page3.close();

  const count = (rs: ScreenResult[], check: Finding['check']): number =>
    rs.reduce((n, s) => n + s.findings.filter((f) => f.check === check).length, 0);
  // The main screen without scroll, over the base pass's screens at rest (§15).
  const restRecords = results.flatMap((r) =>
    r.rest ? [{ screen: r.screen, overflow: r.rest.overflow }] : [],
  );
  // The 641 pass's screens join them; one it did not reach is a finding, not an absence.
  const at641Findings: Finding[] = at641
    .filter((r) => r.overflow < 0)
    .map((r) => ({
      check: 'scroll' as const,
      screen: r.screen,
      path: '',
      text: '',
      detail: 'NOT REACHED: the 360 x 641 pass could not open it',
    }));
  restRecords.push(...at641.filter((r) => r.overflow >= 0));
  const mainScreen = offlineOnly
    ? null
    : {
        screensAtRest: restRecords.length,
        overflows: restRecords.map((r) => `${r.screen}: ${String(r.overflow)}`),
        findings: [...restFindings(restRecords), ...at641Findings],
      };
  // The play area's one height, over the base pass's screens (§19).
  const areaRecords = results.flatMap((r) =>
    r.playArea ? [{ screen: r.screen, height: r.playArea.height, stage: r.playArea.stage }] : [],
  );
  const playArea = offlineOnly
    ? null
    : {
        screensMeasured: areaRecords.length,
        stages: [...new Set(areaRecords.map((r) => r.stage))],
        heights: [...new Set(areaRecords.map((r) => r.height))],
        findings: playAreaFindings(areaRecords),
      };
  const out = {
    url: URL,
    when: new Date().toISOString(),
    viewport:
      "360x780 CSS px, and the main screen's scroll again at 360x641; FONT200 at the same width with the root font size at 200%; ZOOM200 at 180x390 CSS px, device scale 2; SIZE200 at 360x780 with the app's own text size at Largest",
    controls: controlLines,
    screens: results,
    font200,
    zoom200,
    size200,
    nesting,
    playArea,
    mainScreen,
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
      occlusion: count(results, 'occlusion'),
      occlusionFont200: count(font200, 'occlusion'),
      occlusionZoom200: count(zoom200, 'occlusion'),
      occlusionSize200: count(size200, 'occlusion'),
      nestingChecked: nesting.length,
      nestingWrong: nesting.filter((n) => !n.ok && n.actual !== 'NOT REACHED').length,
      nestingNotReached: nesting.filter((n) => n.actual === 'NOT REACHED').length,
      playAreaFindings: playArea ? playArea.findings.length : null,
      mainScreenScrollFindings: mainScreen ? mainScreen.findings.length : null,
      offlineMet: off['met'],
    },
  };
  console.log(JSON.stringify(out, null, 2));
  if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 2));
} finally {
  await browser.close();
}
