/**
 * THE UPDATE CHECK (`docs/FINDINGS.md` #93). After a deploy, a newer build's service worker downloads
 * and then waits until something tells it to take over: a reload alone brought the older build back
 * three times in a row (measured 30 September 2026), which is why the P3.6 session met an old copy of
 * the app. Two rulings answer it, and the check holds both, on three phones:
 *
 *   1. On the title, the newer build is taken by itself, as soon as it has downloaded (ruled
 *      30 September 2026).
 *   2. In a game, never: the newer build waits, the game keeps the older one, and the title takes it
 *      once the player is back there. A reload in a game would drop a game played together.
 *   3. Off the title, the version refusal offers Update now (ruled 28 September 2026), and pressing it
 *      brings the newer build on the very next load. The morning of the session, replayed.
 *
 *   npx tsx tools/perf/update-check.ts    builds the app twice from source, then runs all three
 *
 * Two builds that differ only in the relay address baked into them, one site that serves the first
 * and then the second, a stand-in relay that refuses every connection with the relay's version close
 * code (4001), and a fresh headless Chrome, one browser context per phone. Anything that stops it,
 * including a setup that did not hold, refuses.
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer, { type Page } from 'puppeteer-core';

const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WAIT_MS = 30_000;
/** How long a game must keep the older build with the newer one waiting. */
const HOLD_MS = 3_000;
/** The relay's close code for "this app and the game server are on different versions". */
const VERSION_CLOSE = 4001;

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
  '.txt': 'text/plain; charset=utf-8',
};

/** Thrown rather than exiting, so that the temporary builds are always cleaned away. */
class Refusal extends Error {}
function refuse(reason: string): never {
  throw new Refusal(reason);
}

const listen = (server: Server): Promise<number> =>
  new Promise((done) =>
    server.listen(0, '127.0.0.1', () => done((server.address() as AddressInfo).port)),
  );

/** One build of the app, from source, with this relay address baked in. */
function build(relayUrl: string, into: string): void {
  execSync(`pnpm exec vite build --logLevel error --emptyOutDir --outDir "${into}"`, {
    cwd: join(REPO, 'packages', 'app'),
    stdio: 'pipe',
    env: { ...process.env, VITE_RELAY_URL: relayUrl },
  });
}

/**
 * Every file of a build, by the path it is served at. The site answers these and nothing else, so
 * no part of a request is ever joined into a path on disk (CodeQL's js/path-injection, which a
 * containment check over a folder that changes mid-run did not satisfy).
 */
function filesOf(dir: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const rel of readdirSync(dir, { recursive: true, encoding: 'utf8' })) {
    const file = join(dir, rel);
    if (statSync(file).isFile()) files.set(`/${rel.split(sep).join('/')}`, file);
  }
  return files;
}

/** The name of a build's main script, which is how the check tells the two builds apart. */
function mainOf(dir: string): string {
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  return /assets\/(main-[^"]+\.js)/.exec(html)?.[1] ?? refuse(`no main script in ${dir}`);
}

const made: string[] = [];
const servers: Server[] = [];
try {
  // THE STAND-IN RELAY: it completes the WebSocket handshake and closes at once, with the code the
  // real relay closes with when the versions differ.
  let refused = 0;
  const relay = createServer((_req, res) => res.writeHead(404).end());
  relay.on('upgrade', (req, socket) => {
    const key = String(req.headers['sec-websocket-key'] ?? '');
    const accept = createHash('sha1')
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64');
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    socket.end(Buffer.from([0x88, 0x02, VERSION_CLOSE >> 8, VERSION_CLOSE & 0xff]));
    refused += 1;
  });
  servers.push(relay);
  const relayUrl = `ws://127.0.0.1:${String(await listen(relay))}/`;

  const older = mkdtempSync(join(tmpdir(), 'iw-update-older-'));
  made.push(older);
  build(`${relayUrl}?older`, older);
  const newer = mkdtempSync(join(tmpdir(), 'iw-update-newer-'));
  made.push(newer);
  build(`${relayUrl}?newer`, newer);
  const olderMain = mainOf(older);
  const newerMain = mainOf(newer);
  if (olderMain === newerMain) refuse('the two builds came out the same: there is nothing newer');

  // ONE SITE, serving the older build and then the newer, as the real one does across a deploy.
  const olderFiles = filesOf(older);
  const newerFiles = filesOf(newer);
  let served = olderFiles;
  const site = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0] ?? '/';
    const file = served.get(path === '/' ? '/index.html' : path);
    if (file === undefined) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(readFileSync(file));
  });
  servers.push(site);
  const url = `http://127.0.0.1:${String(await listen(site))}/`;

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    /** A fresh phone with the older build installed, its worker answering the page, on the title. */
    const phone = async (): Promise<Page> => {
      served = olderFiles;
      const page = await (await browser.createBrowserContext()).newPage();
      await page.setViewport({ width: 360, height: 780 });
      await page.goto(url, { waitUntil: 'load' });
      await page.evaluate('navigator.serviceWorker.ready.then(() => true)');
      await page.reload({ waitUntil: 'load' });
      if (!(await page.evaluate('!!navigator.serviceWorker.controller')))
        refuse("the setup did not hold: the older build's worker never took charge of the page");
      await page.waitForSelector('[data-title]', { timeout: WAIT_MS });
      return page;
    };
    // Strings, not functions: the page runs them as written, with nothing a transpiler added.
    const running = (page: Page): Promise<string> =>
      (
        page.evaluate(
          "[...document.scripts].map((s) => s.src).find((s) => s.includes('/assets/main-')) ?? ''",
        ) as Promise<string>
      ).catch(() => ''); // a page in the middle of reloading has no answer yet
    const waiting = (page: Page): Promise<boolean> =>
      (
        page.evaluate(
          'navigator.serviceWorker.getRegistration().then((r) => !!(r && r.waiting))',
        ) as Promise<boolean>
      ).catch(() => false);
    const poll = async (what: () => Promise<boolean>, failure: string): Promise<number> => {
      const from = Date.now();
      while (!(await what())) {
        if (Date.now() - from > WAIT_MS) refuse(failure);
        await new Promise((r) => setTimeout(r, 250));
      }
      return Date.now() - from;
    };
    /** The deploy: the server has the newer build, and the page's worker looks for it. */
    const deploy = async (page: Page): Promise<void> => {
      served = newerFiles;
      await page
        .evaluate('navigator.serviceWorker.getRegistration().then((r) => r.update()).then(() => 1)')
        .catch(() => undefined);
    };
    /** Every main script the page loads from now on, in order: each is one load of the app. */
    const loadsOf = (page: Page): string[] => {
      const loads: string[] = [];
      page.on('request', (r) => {
        if (r.url().includes('/assets/main-')) loads.push(r.url());
      });
      return loads;
    };
    const click = (page: Page, sel: string): Promise<void> =>
      page
        .waitForSelector(sel, { timeout: WAIT_MS })
        .then(() =>
          page.evaluate(`document.querySelector('${sel}').click()`).then(() => undefined),
        );

    // 1. ON THE TITLE, the newer build is taken by itself, as soon as it has downloaded.
    const title = await phone();
    await deploy(title);
    const tookOnTitle = await poll(
      async () => (await running(title)).includes(newerMain),
      'the title did not take the newer build by itself',
    );

    // 2. IN A GAME, never: the newer build downloads and waits, and the game keeps the older one
    // until the player is back on the title, which then takes it.
    const game = await phone();
    await click(game, '[data-title="new"]');
    await click(game, '[data-new-game="training"]');
    await game.waitForSelector('[data-menu]', { timeout: WAIT_MS });
    const inGame = loadsOf(game);
    await deploy(game);
    await poll(
      async () => inGame.length > 0 || (await waiting(game)),
      'the setup did not hold: the newer build never downloaded',
    );
    await new Promise((r) => setTimeout(r, HOLD_MS));
    if (inGame.length > 0 || (await game.$('[data-menu]')) === null)
      refuse('the page reloaded during a game');
    if (!(await running(game)).includes(olderMain))
      refuse('the setup did not hold: the game was not on the older build');
    if (await game.$('[data-dialog-dismiss]')) await click(game, '[data-dialog-dismiss]');
    await click(game, '[data-menu]');
    await click(game, '[data-pause="quit"]');
    await click(game, '[data-pause="quit-confirm"]');
    const tookAfterGame = await poll(
      async () => (await running(game)).includes(newerMain),
      'back on the title after a game, the newer build was not taken',
    );

    // 3. UPDATE NOW, off the title: the morning of the P3.6 session. The phone is on Play together
    // when the newer build downloads, and the relay refuses it for the version.
    const morning = await phone();
    await click(morning, '[data-title="together"]');
    await morning.waitForSelector('[data-together="name"]', { timeout: WAIT_MS });
    const offTitle = loadsOf(morning);
    await deploy(morning);
    await poll(
      async () => offTitle.length > 0 || (await waiting(morning)),
      'the setup did not hold: the newer build never downloaded',
    );
    if (offTitle.length > 0 || !(await running(morning)).includes(olderMain))
      refuse('the page reloaded away from the title, by itself');
    await morning.type('[data-together="name"]', 'Asha');
    await click(morning, '[data-together="create"]');
    await morning.waitForSelector('[data-together="refusal"]', { timeout: WAIT_MS });
    if (refused === 0) refuse('the refusal did not come from the stand-in relay');
    if ((await morning.$('[data-update-now]')) === null)
      refuse('the version refusal offered no Update now');
    // Every main script the phone loads from here, in order: the FIRST must be the newer one. A
    // button that only reloaded would load the older build first, and the title would then take the
    // newer one for it, which is the title's work, not the button's.
    const loads = loadsOf(morning);
    const pressed = Date.now();
    await click(morning, '[data-update-now]');
    await poll(async () => loads.length > 0, `Update now did not reload the page`);
    const first = loads[0] ?? '';
    if (first.includes(olderMain)) refuse('after Update now the page still ran the older build');
    if (!first.includes(newerMain)) refuse(`after Update now the page ran neither build: ${first}`);
    const tookByButton = Date.now() - pressed;

    console.log(
      `UPDATE CHECK: passed, ${url}\n` +
        `  on the title, the newer build taken by itself in ${String(tookOnTitle)} ms\n` +
        `  in a game, the older build kept for ${String(HOLD_MS / 1000)} s with the newer one waiting, ` +
        `and taken back on the title in ${String(tookAfterGame)} ms\n` +
        `  Update now, under the version refusal off the title, the newer build first in ${String(tookByButton)} ms`,
    );
  } finally {
    await browser.close();
  }
} catch (e) {
  // Anything that stops the check is a refusal: a check that could not run has passed nothing.
  console.error(`UPDATE CHECK: DID NOT UPDATE: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  for (const s of servers) s.close();
  for (const d of made) rmSync(d, { recursive: true, force: true });
}
