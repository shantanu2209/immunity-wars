/**
 * THE STORE'S SCREENSHOTS, FROM THE PHONE ON THE CABLE (ruled 3 October 2026; docs/LOOK_PLAN.md
 * §26): the game as it is now, to be taken again after Gate 2.
 *
 *   pnpm art:shots     the installed app on the one phone connected -> packages/android/store/screenshots/
 *
 * The app is driven through its web view's own debugging socket, as `pnpm android:check` drives it,
 * by pressing its real controls, and each screen is photographed by the phone itself.
 *
 * ONLY THE APP IS PHOTOGRAPHED. Each picture is cut to the web view's own bounds, which Android
 * reports, so the phone's status bar, with its clock and its notifications, is never in one. It
 * also brings the picture inside Play's rule that no side be more than twice the other.
 *
 * THE APP'S OWN STORE IS PUT BACK. A screenshot of a first visit, and of a new game, means clearing
 * what the app keeps: its settings and records in localStorage, and the saved game in IndexedDB.
 * Both are read first, written to a file outside the repository too, and put back at the end and
 * checked, so the phone's owner finds their game where they left it. The first version of this
 * script backed up localStorage only, and found the saved game by being asked to replace it; it
 * stopped there, and replaced nothing.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer, { type Page } from 'puppeteer-core';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'packages', 'android', 'store', 'screenshots');
const APP = 'com.kartikchaudhary.immunitywars';
const PORT = 9334;
const HOME = 'https://localhost/';

function refuse(why: string): never {
  console.error(`SCREENSHOTS: STOPPED: ${why}`);
  process.exit(1);
}

const sdk = process.env['ANDROID_HOME'];
if (sdk === undefined || sdk === '') refuse('ANDROID_HOME is not set.');
const ADB = join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const adb = (...args: string[]): string => execFileSync(ADB, args, { encoding: 'utf8' }).trim();
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

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

const start = async (): Promise<string> => {
  adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
  adb('shell', 'am', 'force-stop', APP);
  adb('shell', 'am', 'start', '-n', `${APP}/.MainActivity`);
  for (let i = 0; i < 20; i += 1) {
    await sleep(500);
    const running = adb('shell', 'pidof', APP);
    if (running !== '') return running;
  }
  return '';
};
const pid = await start();
if (pid === '') refuse('the app did not start: is it installed? (pnpm android:apk --install)');
await sleep(2500);
adb('forward', `tcp:${String(PORT)}`, `localabstract:webview_devtools_remote_${pid}`);

const browser = await puppeteer.connect({
  browserURL: `http://127.0.0.1:${String(PORT)}`,
  defaultViewport: null,
});
const page: Page | undefined = (await browser.pages()).find((p) => p.url().startsWith(HOME));
if (page === undefined) refuse('the app has no page.');

// WHAT THE APP KEEPS, both places: its settings and records in localStorage, and the saved game in
// IndexedDB (database `immunity-wars`, store `saves`, packages/session/src/indexeddb.ts). Read before
// anything is cleared, written to a file outside the repository as well, in case the putting back
// itself fails, and checked after it is put back.
const SAVES = `new Promise((ok, no) => {
  const r = indexedDB.open('immunity-wars', 1);
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('saves')) r.result.createObjectStore('saves', { keyPath: 'id' }); };
  r.onsuccess = () => ok(r.result);
  r.onerror = () => no(r.error);
})`;
const readKept = async (): Promise<string> =>
  (await page.evaluate(`(async () => {
    const db = await ${SAVES};
    const saves = await new Promise((ok, no) => { const q = db.transaction('saves').objectStore('saves').getAll(); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
    db.close();
    return JSON.stringify({ local: Object.assign({}, localStorage), saves });
  })()`)) as string;
const clearKept = async (): Promise<void> => {
  await page.evaluate(`(async () => {
    localStorage.clear();
    const db = await ${SAVES};
    await new Promise((ok, no) => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').clear(); tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error); });
    db.close();
  })()`);
};
const kept = await readKept();
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
  if ((await readKept()) !== kept)
    refuse(`what the app kept was not put back as it was: it is saved in ${KEPT_FILE}`);
  rmSync(KEPT_FILE);
  await page.reload({ waitUntil: 'load' });
};

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
/** Waits until a button says `label`, without pressing it. */
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

mkdirSync(OUT, { recursive: true });
const taken: string[] = [];
const shoot = async (name: string): Promise<void> => {
  await sleep(1200);
  const box = await webViewBounds();
  const png = execFileSync(ADB, ['exec-out', 'screencap', '-p'], { maxBuffer: 64 * 1024 * 1024 });
  const file = join(OUT, `${name}.png`);
  await sharp(png).extract(box).removeAlpha().png({ compressionLevel: 9 }).toFile(file);
  taken.push(`${name} (${String(box.width)} by ${String(box.height)})`);
};

try {
  // A first visit: nothing kept.
  await clearKept();
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-title]', { timeout: 20_000 });
  await shoot('1-title');

  // The guided game, its light on the first thing to press.
  // Past its goal dialog, whose one button is Begin, to the first thing the light points at.
  await pressSel('[data-title="learn"]');
  await pressSel('[data-dialog-dismiss]');
  await sleep(3500);
  await shoot('2-guided-game');

  // A game on Easy: the new cards, planning, and the board with the Monocyte in hand.
  await clearKept();
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-title]', { timeout: 20_000 });
  await pressSel('[data-title="new"]');
  await pressSel('[data-new-game="training"]');
  // The goal dialog's one button is Begin; the new cards are dealt after it.
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
  await clearKept();
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-title]', { timeout: 20_000 });
  await pressSel('[data-title="new"]');
  await press('What changes between them');
  await shoot('6-difficulties');
} catch (e) {
  // What was on the screen when it stopped, so a stop says where it was.
  const onScreen = (await page.evaluate(
    "[...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter(Boolean).slice(0, 14).join(' | ')",
  )) as string;
  console.error(`SCREENSHOTS: the buttons on the screen: ${onScreen}`);
  await putBack();
  await browser.disconnect();
  refuse(e instanceof Error ? e.message : String(e));
}
await putBack();
await browser.disconnect();
console.log(
  `SCREENSHOTS: ${String(taken.length)} taken, the app's own store put back:\n  ${taken.join('\n  ')}`,
);
