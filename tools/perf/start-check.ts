/**
 * THE START CHECK (ruled 26 September 2026: a build that does not start is never deployed).
 * `docs/FINDINGS.md` #92: Dependabot split `react` from `react-dom`, React refused to start, and the
 * app built from `main` was a blank page while typecheck, lint, every suite and CI stayed green,
 * because none of them starts the built app. The version-check page for the P3.6 session was built
 * from that `main` and would have been deployed blank.
 *
 *   npx tsx tools/perf/start-check.ts <folder> [base]   a build already made, served at `base`
 *                                                       (default /): what the deploy scripts run
 *   npx tsx tools/perf/start-check.ts --build           builds the app from source into a temporary
 *                                                       folder, then checks it: the self-test's gate
 *
 * Serves the folder on 127.0.0.1, opens it in a fresh headless Chrome, and requires the title to
 * appear with no uncaught error within 20 seconds. Nothing connects to a relay: the title does
 * not, until a player asks to play together. A check that could not run, or found nothing to start,
 * refuses: it never passes by default.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WAIT_MS = 20_000;
/** What the title shows once the app has started: its own buttons. */
const STARTED = '[data-title]';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

/** Thrown rather than exiting, so that a temporary build is always cleaned away. */
class Refusal extends Error {}
function refuse(reason: string): never {
  throw new Refusal(reason);
}

/** The folder to check, and whether it is ours to delete afterwards. */
function folder(): { dir: string; base: string; temporary: boolean } {
  if (process.argv[2] === '--build') {
    const dir = mkdtempSync(join(tmpdir(), 'iw-start-'));
    const env = { ...process.env };
    delete env['VITE_RELAY_URL'];
    try {
      execSync(`pnpm exec vite build --logLevel error --emptyOutDir --outDir "${dir}"`, {
        cwd: join(REPO, 'packages', 'app'),
        stdio: 'pipe',
        env,
      });
    } catch (e) {
      rmSync(dir, { recursive: true, force: true });
      throw e;
    }
    return { dir, base: '/', temporary: true };
  }
  const arg = process.argv[2];
  if (arg === undefined)
    refuse('no folder named (usage: start-check.ts <folder> [base] | --build)');
  const base = process.argv[3] ?? '/';
  // Git Bash rewrites an argument that starts with / into a Windows path (`/old/` arrived here as
  // `D:/Git/old/`), so a base that is not a path from the root is named, not guessed at.
  if (!base.startsWith('/'))
    refuse(`the base must start with /, and was ${base} (from Git Bash, set MSYS_NO_PATHCONV=1)`);
  return { dir: resolve(arg), base: base.endsWith('/') ? base : `${base}/`, temporary: false };
}

let made: { dir: string; base: string; temporary: boolean } | null = null;
try {
  made = folder();
  const { dir, base } = made;
  if (!existsSync(join(dir, 'index.html'))) refuse(`there is no index.html in ${dir}`);

  // A plain file server: the build's files at `base`, and nothing else.
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    if (!path.startsWith(base)) {
      res.writeHead(404).end();
      return;
    }
    let file = normalize(join(dir, path.slice(base.length)));
    if (file !== dir && !file.startsWith(dir + sep)) {
      res.writeHead(404).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const url = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}${base}`;

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const errors: string[] = [];
  let started = false;
  try {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e instanceof Error ? e.message : String(e)));
    await page.goto(url, { waitUntil: 'load' });
    started = await page
      .waitForFunction(
        (sel: string) => document.querySelector(sel) !== null,
        { timeout: WAIT_MS },
        STARTED,
      )
      .then(() => true)
      .catch(() => false);
  } finally {
    await browser.close();
    server.close();
  }
  if (errors.length > 0) refuse(`an uncaught error: ${errors[0] ?? ''}`);
  if (!started) refuse(`the title did not appear within ${String(WAIT_MS / 1000)} seconds`);
  console.log(`START CHECK: started, ${url}`);
} catch (e) {
  // Anything that stops the check is a refusal: a check that could not run has passed nothing.
  console.error(`START CHECK: DID NOT START: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  if (made?.temporary) rmSync(made.dir, { recursive: true, force: true });
}
