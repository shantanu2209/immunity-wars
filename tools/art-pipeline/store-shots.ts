/**
 * THE STORE'S SCREENSHOTS (ruled 3 October 2026; docs/LOOK_PLAN.md §26): the game as it is now, to be
 * taken again after Gate 2. The same six screens, walked by pressing the app's real controls:
 *
 *   pnpm art:shots            from the installed app on the one phone connected -> store/screenshots/
 *   pnpm art:shots --tablet   from the web build, in headless Chrome, at a 7-inch and a 10-inch
 *                             tablet's size -> store/tablet-7/ and store/tablet-10/
 *
 * The tablets are drawn by Chrome because there is no tablet here. It is the same app: the Android
 * shell shows this same web build in its web view.
 *
 * EVERY PICTURE IS 9:16, as Play asks of screenshots (and of the ones it may promote). A phone's web
 * view is taller than that, so its picture is set on the kit's table, the colour the app's own
 * screens stand on, out to 9:16; the tablets are drawn at 9:16 to begin with.
 *
 * ON THE PHONE, ONLY THE APP IS PHOTOGRAPHED. Each picture is cut to the web view's own bounds, which
 * Android reports, so the status bar, with its clock and its notifications, is never in one.
 *
 * ON THE PHONE, WHAT THE APP KEEPS IS PUT BACK. A screenshot of a first visit, and of a new game,
 * means clearing it: settings and records in localStorage, the saved game in IndexedDB. Both are read
 * first, written to a file outside the repository too, put back at the end and checked, so the phone's
 * owner finds their game where they left it. The first version of this script backed up localStorage
 * only, and found the saved game by being asked to replace it; it stopped there, and replaced nothing.
 */
import { execFileSync, execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer, { type Page } from 'puppeteer-core';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const STORE = join(REPO, 'packages', 'android', 'store');
const APP = 'com.kartikchaudhary.immunitywars';
const PORT = 9334;
const HOME = 'https://localhost/';
const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
/** The kit's table (packages/ui/src/kit/tokens.ts, COLOUR.table): what a picture is set on. */
const TABLE = { r: 0x0e, g: 0x2a, b: 0x30 };

function refuse(why: string): never {
  console.error(`SCREENSHOTS: STOPPED: ${why}`);
  process.exit(1);
}
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** A picture set on the table, out to exactly 9:16 and centred; never cut. */
async function nineBySixteen(png: Buffer, file: string): Promise<string> {
  const meta = await sharp(png).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const k = Math.ceil(Math.max(w / 9, h / 16));
  const [W, H] = [9 * k, 16 * k];
  const left = Math.floor((W - w) / 2);
  const top = Math.floor((H - h) / 2);
  await sharp(png)
    .removeAlpha()
    .extend({ left, right: W - w - left, top, bottom: H - h - top, background: TABLE })
    .png({ compressionLevel: 9 })
    .toFile(file);
  return `${String(W)} by ${String(H)}`;
}

/** The six screens, the same on every device: `shoot` photographs, `clear` empties what the app keeps. */
async function walk(
  page: Page,
  shoot: (name: string) => Promise<void>,
  clear: () => Promise<void>,
): Promise<void> {
  const pressSel = async (selector: string, wait = 8000): Promise<void> => {
    const from = Date.now();
    while (Date.now() - from < wait) {
      const ok = (await page.evaluate(
        `(() => { const b = document.querySelector(${JSON.stringify(selector)}); if (!b) return false; b.click(); return true; })()`,
      )) as boolean;
      if (ok) return void (await sleep(900));
      await sleep(250);
    }
    throw new Error(`nothing answers to ${selector}`);
  };
  const waitFor = async (label: string, wait = 15000): Promise<void> => {
    const from = Date.now();
    while (Date.now() - from < wait) {
      const there = (await page.evaluate(
        `[...document.querySelectorAll('button')].some((x) => x.textContent.trim() === ${JSON.stringify(label)})`,
      )) as boolean;
      if (there) return;
      await sleep(250);
    }
    throw new Error(`no button came to say ${label}`);
  };
  const press = async (label: string, wait = 10000): Promise<void> => {
    const from = Date.now();
    while (Date.now() - from < wait) {
      const ok = (await page.evaluate(
        `(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(label)} && !x.disabled); if (!b) return false; b.click(); return true; })()`,
      )) as boolean;
      if (ok) return void (await sleep(1200));
      await sleep(250);
    }
    throw new Error(`no button says ${label}`);
  };
  const fresh = async (): Promise<void> => {
    await clear();
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-title]', { timeout: 20_000 });
  };
  try {
    // A first visit: nothing kept.
    await fresh();
    await shoot('1-title');
    // The guided game, past its goal dialog (whose one button is Begin), its light on the first step.
    await pressSel('[data-title="learn"]');
    await pressSel('[data-dialog-dismiss]');
    await sleep(3500);
    await shoot('2-guided-game');
    // A game on Easy: the new cards, planning, and the board with the Monocyte in hand.
    await fresh();
    await pressSel('[data-title="new"]');
    await pressSel('[data-new-game="training"]');
    await pressSel('[data-dialog-dismiss]');
    await waitFor('Plan your turn');
    await sleep(1500);
    await shoot('3-new-cards');
    await press('Plan your turn');
    await shoot('4-planning');
    await press('Command your cells');
    await pressSel('[data-tab="pieces"]');
    await pressSel('[data-piece="cell:macrophage"]');
    await shoot('5-the-board');
    // What changes between the difficulties.
    await fresh();
    await pressSel('[data-title="new"]');
    await press('What changes between them');
    await shoot('6-difficulties');
  } catch (e) {
    // What was on the screen when it stopped, so a stop says where it was.
    const onScreen = (await page.evaluate(
      "[...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter(Boolean).slice(0, 14).join(' | ')",
    )) as string;
    throw new Error(`${e instanceof Error ? e.message : String(e)} (on the screen: ${onScreen})`, {
      cause: e,
    });
  }
}

// WHAT THE APP KEEPS, both places (packages/session/src/indexeddb.ts for the saved game's store).
const SAVES = `new Promise((ok, no) => {
  const r = indexedDB.open('immunity-wars', 1);
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('saves')) r.result.createObjectStore('saves', { keyPath: 'id' }); };
  r.onsuccess = () => ok(r.result);
  r.onerror = () => no(r.error);
})`;
const readKept = async (page: Page): Promise<string> =>
  (await page.evaluate(`(async () => {
    const db = await ${SAVES};
    const saves = await new Promise((ok, no) => { const q = db.transaction('saves').objectStore('saves').getAll(); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
    db.close();
    return JSON.stringify({ local: Object.assign({}, localStorage), saves });
  })()`)) as string;
const clearKept = async (page: Page): Promise<void> => {
  await page.evaluate(`(async () => {
    localStorage.clear();
    const db = await ${SAVES};
    await new Promise((ok, no) => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').clear(); tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error); });
    db.close();
  })()`);
};

const taken: string[] = [];

if (process.argv.includes('--tablet')) {
  // THE WEB BUILD, served here, and drawn by Chrome at two tablets' sizes, each 9:16 in CSS pixels.
  const out = mkdtempSync(join(tmpdir(), 'iw-tablet-'));
  execSync(`pnpm exec vite build --logLevel error --emptyOutDir --outDir "${out}"`, {
    cwd: join(REPO, 'packages', 'app'),
    stdio: 'pipe',
  });
  const TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
  };
  const site = createServer((req, res) => {
    let path = (req.url ?? '/').split('?')[0] ?? '/';
    if (path === '/') path = '/index.html';
    const file = join(out, path);
    if (!file.startsWith(out) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise<void>((r) => site.listen(0, '127.0.0.1', () => r()));
  const url = `http://127.0.0.1:${String((site.address() as { port: number }).port)}/`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    for (const [folder, width, height] of [
      ['tablet-7', 540, 960],
      ['tablet-10', 900, 1600],
    ] as const) {
      const dir = join(STORE, folder);
      mkdirSync(dir, { recursive: true });
      const page = await (await browser.createBrowserContext()).newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 2 });
      await page.goto(url, { waitUntil: 'networkidle0' });
      await walk(
        page,
        async (name) => {
          await sleep(1200);
          const size = await nineBySixteen(
            Buffer.from(await page.screenshot({ type: 'png' })),
            join(dir, `${name}.png`),
          );
          taken.push(`${folder}/${name} (${size})`);
        },
        () => clearKept(page),
      );
    }
  } catch (e) {
    refuse(e instanceof Error ? e.message : String(e));
  } finally {
    await browser.close();
    site.close();
    rmSync(out, { recursive: true, force: true });
  }
  console.log(
    `SCREENSHOTS: ${String(taken.length)} taken, at tablets' sizes:\n  ${taken.join('\n  ')}`,
  );
  process.exit(0);
}

// THE PHONE ON THE CABLE.
const sdk = process.env['ANDROID_HOME'];
if (sdk === undefined || sdk === '') refuse('ANDROID_HOME is not set.');
const ADB = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const adb = (...args: string[]): string => execFileSync(ADB, args, { encoding: 'utf8' }).trim();

const phones = adb('devices')
  .split('\n')
  .slice(1)
  .filter((line) => /\tdevice\s*$/.test(line));
if (phones.length !== 1) refuse(`${String(phones.length)} phones are connected; one is needed.`);

/** Where the web view is on the screen, in the phone's own pixels, as Android reports it. */
async function webViewBounds(): Promise<{
  left: number;
  top: number;
  width: number;
  height: number;
}> {
  for (let i = 0; i < 5; i += 1) {
    try {
      adb('shell', 'uiautomator', 'dump', '/sdcard/iw-shots.xml');
      const xml = adb('shell', 'cat', '/sdcard/iw-shots.xml');
      adb('shell', 'rm', '/sdcard/iw-shots.xml');
      const m = /class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(
        xml,
      );
      if (m) {
        const [x1, y1, x2, y2] = [m[1], m[2], m[3], m[4]].map(Number) as [
          number,
          number,
          number,
          number,
        ];
        return { left: x1, top: y1, width: x2 - x1, height: y2 - y1 };
      }
    } catch {
      // The screen was still moving; ask again.
    }
    await sleep(800);
  }
  refuse(
    'Android did not report the app’s web view: is the phone unlocked, with the app in front?',
  );
}

adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
adb('shell', 'am', 'force-stop', APP);
adb('shell', 'am', 'start', '-n', `${APP}/.MainActivity`);
let pid = '';
for (let i = 0; i < 20 && pid === ''; i += 1) {
  await sleep(500);
  pid = adb('shell', 'pidof', APP);
}
if (pid === '') refuse('the app did not start: is it installed? (pnpm android:apk --install)');
await sleep(2500);
adb('forward', `tcp:${String(PORT)}`, `localabstract:webview_devtools_remote_${pid}`);

const browser = await puppeteer.connect({
  browserURL: `http://127.0.0.1:${String(PORT)}`,
  defaultViewport: null,
});
const page: Page | undefined = (await browser.pages()).find((p) => p.url().startsWith(HOME));
if (page === undefined) refuse('the app has no page.');

const kept = await readKept(page);
const KEPT_FILE = join(tmpdir(), `iw-store-shots-kept-${String(Date.now())}.json`);
writeFileSync(KEPT_FILE, kept);
const putBack = async (): Promise<void> => {
  await page.evaluate(`(async () => {
    const k = ${kept};
    localStorage.clear();
    for (const n of Object.keys(k.local)) localStorage.setItem(n, k.local[n]);
    const db = await ${SAVES};
    await new Promise((ok, no) => {
      const tx = db.transaction('saves', 'readwrite');
      const s = tx.objectStore('saves');
      s.clear();
      for (const r of k.saves) s.put(r);
      tx.oncomplete = () => ok();
      tx.onerror = () => no(tx.error);
    });
    db.close();
  })()`);
  if ((await readKept(page)) !== kept)
    refuse(`what the app kept was not put back as it was: it is saved in ${KEPT_FILE}`);
  rmSync(KEPT_FILE);
  await page.reload({ waitUntil: 'load' });
};

const dir = join(STORE, 'screenshots');
mkdirSync(dir, { recursive: true });
try {
  await walk(
    page,
    async (name) => {
      await sleep(1200);
      const box = await webViewBounds();
      const png = execFileSync(ADB, ['exec-out', 'screencap', '-p'], {
        maxBuffer: 64 * 1024 * 1024,
      });
      const cut = await sharp(png).extract(box).png().toBuffer();
      const size = await nineBySixteen(cut, join(dir, `${name}.png`));
      taken.push(
        `${name} (the app ${String(box.width)} by ${String(box.height)}, set out to ${size})`,
      );
    },
    () => clearKept(page),
  );
} catch (e) {
  await putBack();
  await browser.disconnect();
  refuse(e instanceof Error ? e.message : String(e));
}
await putBack();
await browser.disconnect();
console.log(
  `SCREENSHOTS: ${String(taken.length)} taken, the app's own store put back:\n  ${taken.join('\n  ')}`,
);
