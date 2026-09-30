/**
 * THE UPDATE CHECK (`docs/FINDINGS.md` #93; Update now ruled by Shantanu, 28 September 2026). The
 * morning of the P3.6 session, replayed: a phone holds an older build of the app, the server now
 * serves a newer one, and the relay refuses the phone because the versions differ. A reload alone
 * brought the older build back, three times in a row (measured 30 September 2026), because the newer
 * version's service worker waits until something tells it to take over. So the check requires the
 * version refusal to offer Update now, and pressing it to bring the newer build.
 *
 *   npx tsx tools/perf/update-check.ts    builds the app twice from source, then replays the morning
 *
 * Two builds that differ only in the relay address baked into them, one site that serves the first
 * and then the second, a stand-in relay that refuses every connection with the relay's version close
 * code (4001), and a fresh headless Chrome. It passes only on the newer build, reached through the
 * button; anything that stops it, including a setup that did not hold, refuses.
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WAIT_MS = 30_000;
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
  let root = older;
  const site = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    let file = normalize(join(root, path));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(404).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
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
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 360, height: 780 });
    // Strings, not functions: the page runs them as written, with nothing a transpiler added.
    const running = (): Promise<string> =>
      page.evaluate(
        "[...document.scripts].map((s) => s.src).find((s) => s.includes('/assets/main-')) ?? ''",
      ) as Promise<string>;
    const waiting = (): Promise<boolean> =>
      page.evaluate(
        'navigator.serviceWorker.getRegistration().then((r) => !!(r && r.waiting))',
      ) as Promise<boolean>;

    // The phone, with the older build installed and in charge of the page.
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate('navigator.serviceWorker.ready.then(() => true)');
    await page.reload({ waitUntil: 'load' });
    if (!(await page.evaluate('!!navigator.serviceWorker.controller')))
      refuse("the setup did not hold: the older build's worker never took charge of the page");

    // The deploy: the newer build downloads and waits, and the page still runs the older one.
    root = newer;
    await page.reload({ waitUntil: 'load' });
    const until = Date.now() + WAIT_MS;
    while (!(await waiting())) {
      if (Date.now() > until) refuse('the setup did not hold: the newer build never downloaded');
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!(await running()).includes(olderMain))
      refuse('the setup did not hold: the newer build arrived without Update now');

    // The player tries to play together, and is refused for the version.
    await page.click('[data-title="together"]');
    await page.waitForSelector('[data-together="name"]', { timeout: WAIT_MS });
    await page.type('[data-together="name"]', 'Asha');
    await page.click('[data-together="create"]');
    await page.waitForSelector('[data-together="refusal"]', { timeout: WAIT_MS });
    if (refused === 0) refuse('the refusal did not come from the stand-in relay');

    const button = await page.$('[data-update-now]');
    if (button === null) refuse('the version refusal offered no Update now');
    const pressed = Date.now();
    const reloaded = await Promise.all([
      page.waitForNavigation({ waitUntil: 'load', timeout: WAIT_MS }),
      button.click(),
    ])
      .then(() => true)
      .catch(() => false);
    if (!reloaded)
      refuse(`Update now did not reload the page within ${String(WAIT_MS / 1000)} seconds`);
    await page.waitForSelector('[data-title]', { timeout: WAIT_MS });
    const after = await running();
    if (after.includes(olderMain)) refuse('after Update now the page still ran the older build');
    if (!after.includes(newerMain)) refuse(`after Update now the page ran neither build: ${after}`);
    console.log(
      `UPDATE CHECK: updated, the older build to the newer in ${String(Date.now() - pressed)} ms, ${url}`,
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
