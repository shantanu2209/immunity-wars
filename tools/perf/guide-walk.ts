/**
 * THE GUIDED GAME, WALKED AS A PLAYER LED BY IT (stage L6, `docs/LOOK_PLAN.md` §19).
 *
 *   pnpm guide:walk                 walk the app served at http://localhost:4173
 *   pnpm guide:walk <url>           walk the app served there
 *   pnpm guide:walk --build         build the app into a temporary folder, serve it, walk it:
 *                                   the self-test's gate
 *
 * The lesson is held to the engine by a test that plays it through the session. That test presses
 * no button. This does: it opens the built app on a phone-sized screen, starts the guided game
 * from the title, and from then on PRESSES ONLY WHAT THE GUIDE LIGHTS (or the guide's own button),
 * exactly as a player led by it would, until the guide hands the game over.
 *
 * WHAT IT REQUIRES, read from the page beat by beat and not from a verdict:
 *  - the title's Learn to play opens the chapters (ruled 16 October 2026): on a phone that has
 *    never played, the first is the one to play and every other is locked and cannot be pressed;
 *  - the beats come in the lesson's own order, every one of them: each turn's cards, its plan,
 *    each step by its name, its End turn and its spread, and then the last word;
 *  - every card says which step of its chapter it is, "Step 3 of 9", counted from the walk's own
 *    list of the lesson's beats and not from the guide's;
 *  - every card that talks about something finds it on the page to show (16 October 2026): the
 *    new cards, the body, the disease on the board; and a finger on what is shown lands on the
 *    guide, which swallows it, or on the lit control's own button, never on the thing itself;
 *  - at every beat that asks for a tap, something on the page is lit and pressing it moves the
 *    lesson on. A beat that stays, with nothing lit or with a light that does nothing, is named;
 *  - when the lesson ends the guide is gone and the game stands at the turn after the lesson's last;
 *  - no error was thrown on the page.
 *
 * A walk that could not run refuses: it never passes by default.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LESSON, UI_I18N_EN } from '@immunity-wars/content';
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/** Longer than the play screen's own half-second guard on a step that has just changed. */
const BETWEEN_MS = 650;
/** How many looks a beat may stay the same before the walk says it is stuck. */
const PATIENCE = 16;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

class Refusal extends Error {}
function refuse(reason: string): never {
  throw new Refusal(reason);
}

/** The beats the lesson has, in its order, by the names the guide puts on the page. */
function expectedBeats(): string[] {
  // A chapter's cards (step 3): the last one done, then what the next is about, just before the
  // step the next begins at; for a chapter that begins a turn, before that turn's cards are drawn.
  const cards = (from: string): string[] => {
    const c = LESSON.chapters.findIndex((ch) => ch.from === from);
    if (c < 1) return [];
    return [
      `chapter.${LESSON.chapters[c - 1]?.id ?? ''}.done`,
      `chapter.${LESSON.chapters[c]?.id ?? ''}.intro`,
    ];
  };
  const out: string[] = [];
  LESSON.turns.forEach((turn, i) => {
    const n = String(i + 1);
    const opens = turn.steps[0]?.id ?? '';
    out.push(
      ...cards(opens),
      `t${n}.cards`,
      `t${n}.plan`,
      ...turn.steps.flatMap((s, k) => [...(k > 0 ? cards(s.id) : []), s.id]),
      `t${n}.end`,
      `t${n}.spread`,
    );
  });
  out.push('end');
  return out;
}

/**
 * What each beat's card should say it is: its place among its chapter's cards. A chapter's card that
 * says the one before is done is the last of that one; the card that says what the next is about is
 * the first of the next.
 */
function expectedCounts(beats: readonly string[]): string[] {
  const chapterOf: number[] = [];
  let c = 0;
  for (const b of beats) {
    if (b.startsWith('chapter.') && b.endsWith('.intro')) c += 1;
    chapterOf.push(c);
  }
  const say = UI_I18N_EN['guide.count'] ?? '';
  return beats.map((_, i) => {
    const mine = chapterOf.flatMap((k, j) => (k === chapterOf[i] ? [j] : []));
    return say.replace('{n}', String(mine.indexOf(i) + 1)).replace('{of}', String(mine.length));
  });
}

interface Look {
  beat: string | null;
  count: string;
  shows: number;
  showing: number;
  /** What a finger at the middle of a shown thing would press, when it is not the guide. */
  pressedThrough: string;
  lit: boolean;
  pressable: boolean;
  next: boolean;
  dialog: boolean;
  spread: boolean;
  turn: string;
}
const LOOK = `(() => {
  const g = document.querySelector('[data-guide]');
  const p = document.querySelector('[data-guide-press]');
  return {
    beat: g ? g.getAttribute('data-guide') : null,
    count: (document.querySelector('[data-guide-count]')?.textContent ?? '').trim(),
    shows: g ? Number(g.getAttribute('data-guide-shows')) : 0,
    showing: g ? Number(g.getAttribute('data-guide-showing')) : 0,
    pressedThrough: [...document.querySelectorAll('[data-guide-shown]')]
      .map((r) => {
        const b = r.getBoundingClientRect();
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        if (!hit || hit.closest('[data-guide-block],[data-guide-press],[data-guide-card]')) return '';
        return hit.tagName + (hit.getAttribute('data-invader') ? ' ' + hit.getAttribute('data-invader') : '');
      })
      .filter((x) => x !== '')
      .join(', '),
    lit: g ? g.getAttribute('data-guide-lit') === '1' : false,
    pressable: p ? !p.disabled : false,
    next: document.querySelector('[data-guide-next]') !== null,
    dialog: document.querySelector('[data-dialog-dismiss]') !== null,
    spread: document.querySelector('[data-tap-advance]') !== null,
    turn: (document.querySelector('[data-turn]')?.textContent ?? '').trim(),
  };
})()`;
const click = (sel: string): string => `document.querySelector(${JSON.stringify(sel)})?.click()`;
const TAP_ON = `document.querySelector('[data-tap-advance]')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`;
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Every file of a build, by the path it is served at. The server answers these and nothing else, so
 * no part of a request is ever joined into a path on disk: the same way `update-check.ts` serves
 * its builds, and for the same reason (CodeQL's js/path-injection, which a check that the joined
 * path stays inside the folder did not satisfy, here either: four alerts on this file's first
 * pull request).
 */
function filesOf(dir: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const rel of readdirSync(dir, { recursive: true, encoding: 'utf8' })) {
    const file = join(dir, rel);
    if (statSync(file).isFile()) files.set(`/${rel.split(sep).join('/')}`, file);
  }
  return files;
}

let temporary: string | null = null;
let server: Server | null = null;
try {
  let url = process.argv[2] ?? 'http://localhost:4173/';
  if (process.argv[2] === '--build') {
    const dir = mkdtempSync(join(tmpdir(), 'iw-guide-'));
    temporary = dir;
    const env = { ...process.env };
    delete env['VITE_RELAY_URL'];
    execSync(`pnpm exec vite build --logLevel error --emptyOutDir --outDir "${dir}"`, {
      cwd: join(REPO, 'packages', 'app'),
      stdio: 'pipe',
      env,
    });
    if (!existsSync(join(dir, 'index.html'))) refuse(`the build made no index.html in ${dir}`);
    const files = filesOf(dir);
    server = createServer((req, res) => {
      const path = (req.url ?? '/').split('?')[0] ?? '/';
      const file = files.get(path === '/' ? '/index.html' : path);
      if (file === undefined) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    });
    const s = server;
    await new Promise<void>((done) => s.listen(0, '127.0.0.1', done));
    url = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/`;
  }

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const errors: string[] = [];
  const seen: string[] = [];
  const counts: string[] = [];
  /** Of each card that talks about something, the most of it the page was seen to show. */
  const showing = new Map<string, number>();
  /** A shown thing a finger would have pressed, with the card it was shown by. */
  let through = '';
  let handedTurn = '';
  let guideGone = false;
  try {
    // A fresh profile: a phone that has never played, which is who the title offers the lesson to.
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e instanceof Error ? e.message : String(e)));
    await page.setViewport({
      width: 360,
      height: 641,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(url, { waitUntil: 'load' });
    const offered = await page
      .waitForFunction(() => document.querySelector('[data-title="learn"]') !== null, {
        timeout: 20_000,
      })
      .then(() => true)
      .catch(() => false);
    if (!offered)
      refuse('the title of a phone that has never played does not offer the guided game');
    await page.evaluate(click('[data-title="learn"]'));
    await page
      .waitForFunction(() => document.querySelector('[data-screen="chapters"]') !== null, {
        timeout: 10_000,
      })
      .catch(() => refuse('Learn to play does not open the chapters'));
    const chapters = (await page.evaluate(`[...document.querySelectorAll('[data-chapter]')].map(
      (b) => b.getAttribute('data-chapter-state') + (b.disabled ? ':disabled' : ''))`)) as string[];
    const fresh = LESSON.chapters.map((_, c) => (c === 0 ? 'open' : 'locked:disabled'));
    if (chapters.join(' ') !== fresh.join(' '))
      refuse(
        `A NEW PHONE'S CHAPTERS ARE NOT THE FIRST TO PLAY AND THE REST LOCKED: ${chapters.join(' ')}`,
      );
    console.log(`GUIDE WALK: the chapters, on a new phone: ${chapters.join(' ')}`);
    await page.evaluate(click('[data-chapter-state="open"]'));
    await wait(1200);

    let stayed = 0;
    let last = '';
    for (let i = 0; i < 600; i += 1) {
      const s = (await page.evaluate(LOOK)) as Look;
      if (s.dialog) {
        await page.evaluate(click('[data-dialog-dismiss]'));
        await wait(BETWEEN_MS);
        continue;
      }
      const key = `${String(s.beat)}|${String(s.lit)}`;
      stayed = key === last ? stayed + 1 : 0;
      last = key;
      if (s.beat !== null && seen[seen.length - 1] !== s.beat) {
        seen.push(s.beat);
        counts.push(s.count);
      }
      if (s.beat !== null && s.shows > 0)
        showing.set(s.beat, Math.max(showing.get(s.beat) ?? 0, s.showing));
      if (s.pressedThrough !== '' && through === '')
        through = `${String(s.beat)}: ${s.pressedThrough}`;
      if (stayed > PATIENCE) {
        refuse(
          s.beat === null
            ? `the guide is not on the page (turn ${s.turn}), after ${seen[seen.length - 1] ?? 'nothing'}`
            : `STUCK at ${s.beat}: ${s.lit ? 'what is lit does nothing' : 'nothing on the page is lit'}`,
        );
      }
      if (s.beat === 'end' && s.next) {
        await page.evaluate(click('[data-guide-next]'));
        await wait(1500);
        const after = (await page.evaluate(LOOK)) as Look;
        guideGone = after.beat === null;
        handedTurn = after.turn;
        break;
      }
      if (s.next) await page.evaluate(click('[data-guide-next]'));
      else if (s.spread) await page.evaluate(TAP_ON);
      else if (s.pressable) await page.evaluate(click('[data-guide-press]'));
      await wait(BETWEEN_MS);
    }
  } finally {
    // Not awaited: closing the browser has hung these walks at their last line before.
    browser.close().catch(() => undefined);
  }

  const expected = expectedBeats();
  const firstOff = expected.findIndex((b, i) => seen[i] !== b);
  console.log(
    `GUIDE WALK: ${String(seen.length)} beats seen of ${String(expected.length)} the lesson has`,
  );
  if (firstOff >= 0 || seen.length !== expected.length) {
    const at = firstOff >= 0 ? firstOff : expected.length;
    refuse(
      `THE BEATS ARE NOT THE LESSON’S: beat ${String(at + 1)} should be ${expected[at] ?? 'nothing more'} and was ${seen[at] ?? 'nothing'}`,
    );
  }
  const said = expectedCounts(expected);
  const miscount = said.findIndex((c, i) => counts[i] !== c);
  if (miscount >= 0) {
    refuse(
      `THE CARD DOES NOT SAY WHICH STEP IT IS: ${expected[miscount] ?? ''} said "${counts[miscount] ?? ''}" and should say "${said[miscount] ?? ''}"`,
    );
  }
  const lasts = said.filter((_, i) => expected[i + 1]?.endsWith('.intro') ?? true);
  console.log(
    `GUIDE WALK: every card counted in its chapter; each chapter ends at ${lasts.join(', ')}`,
  );
  const unshown = [...showing].filter(([, n]) => n === 0).map(([b]) => b);
  if (unshown.length > 0) {
    refuse(
      `THE CARD SHOWS NOTHING OF WHAT IT TALKS ABOUT: ${unshown.slice(0, 3).join(', ')}${unshown.length > 3 ? ` and ${String(unshown.length - 3)} more` : ''}`,
    );
  }
  if (through !== '') refuse(`WHAT IS SHOWN CAN BE PRESSED: at ${through}`);
  console.log(
    `GUIDE WALK: ${String(showing.size)} cards talk about something, each found it on the page, and none of it can be pressed`,
  );
  if (!guideGone) refuse('the lesson’s last word was answered and the guide is still on the page');
  const wanted = `${String(LESSON.turns.length + 1)}/`;
  if (!handedTurn.startsWith(wanted)) {
    refuse(
      `the game was handed over at turn "${handedTurn}", and the lesson ends before turn ${wanted.slice(0, -1)}`,
    );
  }
  if (errors.length > 0) refuse(`an uncaught error on the page: ${errors[0] ?? ''}`);
  console.log(
    `GUIDE WALK: every beat in order, the game handed over at turn ${handedTurn}, no error`,
  );
} catch (e) {
  console.error(`GUIDE WALK: DID NOT PASS: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  server?.close();
  if (temporary) rmSync(temporary, { recursive: true, force: true });
  setTimeout(() => process.exit(process.exitCode ?? 0), 800);
}
