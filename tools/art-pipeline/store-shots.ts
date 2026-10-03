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
 * what the app keeps (a saved game, the settings); all of it is read first and written back at the
 * end, and the app reloaded, so the phone's owner finds their game where they left it.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
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

const kept = (await page.evaluate('JSON.stringify(Object.assign({}, localStorage))')) as string;
const putBack = async (): Promise<void> => {
  await page.evaluate(
    `(() => { localStorage.clear(); const k = ${kept}; for (const n of Object.keys(k)) localStorage.setItem(n, k[n]); })()`,
  );
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
  await page.evaluate('localStorage.clear()');
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-title]', { timeout: 20_000 });
  await shoot('1-title');

  // The guided game, its light on the first thing to press.
  await pressSel('[data-title="learn"]');
  await sleep(2500);
  await shoot('2-guided-game');

  // A game on Easy: the new cards, planning, and the board with the Monocyte in hand.
  await page.evaluate('localStorage.clear()');
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-title]', { timeout: 20_000 });
  await pressSel('[data-title="new"]');
  await pressSel('[data-new-game="training"]');
  await pressSel('[data-dialog-dismiss]', 4000).catch(() => undefined);
  await press('Begin');
  await sleep(2500);
  await shoot('3-new-cards');
  await press('Plan your turn');
  await shoot('4-planning');
  await press('Command your cells');
  await pressSel('[data-tab="pieces"]');
  await pressSel('[data-piece="cell:macrophage"]');
  await shoot('5-the-board');

  // What changes between the difficulties.
  await page.evaluate('localStorage.clear()');
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-title]', { timeout: 20_000 });
  await pressSel('[data-title="new"]');
  await press('What changes between them');
  await shoot('6-difficulties');
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
