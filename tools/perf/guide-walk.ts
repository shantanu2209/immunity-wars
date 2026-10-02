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
 *  - the beats come in the lesson's own order, every one of them: each turn's cards, its plan,
 *    each step by its name, its End turn and its spread, and then the last word;
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

import { LESSON } from '@immunity-wars/content';
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
  const out: string[] = [];
  LESSON.turns.forEach((turn, i) => {
    const n = String(i + 1);
    out.push(
      `t${n}.cards`,
      `t${n}.plan`,
      ...turn.steps.map((s) => s.id),
      `t${n}.end`,
      `t${n}.spread`,
    );
  });
  out.push('end');
  return out;
}

interface Look {
  beat: string | null;
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
      if (s.beat !== null && seen[seen.length - 1] !== s.beat) seen.push(s.beat);
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
