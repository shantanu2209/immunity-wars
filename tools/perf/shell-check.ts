/**
 * THE ANDROID SHELL, CHECKED ON A PHONE (docs/LOOK_PLAN.md §26).
 *
 *   pnpm android:check             # the app on the one phone on the cable: starts, and back works
 *   pnpm android:check --measure   # the same, then the measuring page, read inside the shell
 *
 * The app must already be installed (`pnpm android:apk --install`). It is a debug build, whose
 * page can be read over the cable through the WebView's own debugging socket; that is what this
 * does, with the same driver the other walks use.
 *
 * WHAT IT HOLDS, each a thing only the shell can get wrong:
 *
 *   - it starts: the title, with no uncaught error and no request that failed;
 *   - no service worker is registered in it;
 *   - ANDROID'S BACK GOES TO THE GAME FIRST. Back inside a screen returns to the title, and back
 *     on the title puts the app aside without closing it. Found on its first run on the S25, 2
 *     October 2026: as Capacitor has it, back inside How to play put the phone on its home screen.
 *
 * IT NEEDS A PHONE, so it is in no gate and the self-test has no control on it. It was seen to
 * fail before it was trusted: on the build before `MainActivity.java` handled back, it read the
 * app as gone from the front. Run it on every build that goes to a phone.
 *
 * `ANDROID_HOME` names the SDK. Nothing here names a path or a phone.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import puppeteer, { type Page } from 'puppeteer-core';

const APP = 'com.kartikchaudhary.immunitywars';
const PORT = 9333;
const HOME = 'https://localhost/';

function refuse(why: string): never {
  console.error(`SHELL CHECK: FAILED: ${why}`);
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
if (phones.length !== 1) {
  refuse(`${String(phones.length)} phones are connected and allowed; one is needed.`);
}

const inFront = (): boolean =>
  adb('shell', 'dumpsys', 'activity', 'activities')
    .split('\n')
    .some((line) => line.includes('topResumedActivity') && line.includes(APP));

/**
 * STARTED AFRESH, every time. The page's history is what back is judged by, and it outlives a
 * reload: this check's own first version opened the title with a navigation, which left the page
 * before it in the history, and back on the title then went to that page and not aside. So the
 * app is stopped and started, and after that the page is only ever reloaded, which adds nothing.
 */
const start = async (): Promise<string> => {
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
const done: string[] = [];
try {
  const page: Page | undefined = (await browser.pages()).find((p) => p.url().startsWith(HOME));
  if (page === undefined) refuse('the app has no page: the shell did not load the game.');

  const errors: string[] = [];
  const failed: string[] = [];
  page.on('pageerror', (e) => errors.push(e instanceof Error ? e.message : String(e)));
  page.on('requestfailed', (r) => failed.push(r.url()));

  const screenNow = (): Promise<string> =>
    page.evaluate(`(() => {
      const s = document.querySelector('[data-screen]');
      return s ? s.getAttribute('data-screen') : document.querySelector('[data-title]') ? 'title' : 'unknown';
    })()`) as Promise<string>;
  const press = async (selector: string): Promise<void> => {
    const ok = (await page.evaluate(
      `(() => { const b = document.querySelector(${JSON.stringify(selector)}); if (!b) return false; b.click(); return true; })()`,
    )) as boolean;
    if (!ok) refuse(`nothing on the page answers to ${selector}`);
    await sleep(800);
  };
  const back = async (): Promise<void> => {
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK');
    await sleep(1000);
  };

  // 1. It starts. Reloaded, so that an error on the way up is heard: the first load was over
  // before anything here was listening.
  await page.reload({ waitUntil: 'load' });
  const started = await page
    .waitForSelector('[data-title]', { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (!started) refuse('the title did not appear within 20 seconds.');
  if (errors.length > 0) refuse(`an uncaught error: ${errors[0] ?? ''}`);
  if (failed.length > 0) refuse(`a request failed: ${failed[0] ?? ''}`);
  const read = (await page.evaluate(`(async () => ({
    workers: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0,
    platform: typeof window.Capacitor === 'object' && window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'not a shell',
    size: innerWidth + ' by ' + innerHeight,
    rootFont: getComputedStyle(document.documentElement).fontSize,
  }))()`)) as { workers: number; platform: string; size: string; rootFont: string };
  if (read.platform !== 'android') refuse(`this is not the Android shell: ${read.platform}`);
  if (read.workers !== 0)
    refuse(`${String(read.workers)} service worker(s) registered in the shell.`);
  done.push(`started: ${read.size}, text at ${read.rootFont} to the rem, no service worker`);

  // 2. Back goes to the game first.
  await press('[data-title="settings"]');
  if ((await screenNow()) !== 'settings') {
    refuse(`Settings did not open from the title: the page shows ${await screenNow()}`);
  }
  await back();
  if (!inFront()) refuse('BACK INSIDE A SCREEN LEFT THE APP: the phone is no longer showing it.');
  const after = await screenNow();
  if (after !== 'title') refuse(`back inside Settings went to ${after}, not to the title.`);
  await back();
  if (inFront()) refuse('back on the title did nothing: the app is still in front.');
  if (adb('shell', 'pidof', APP) === '') refuse('back on the title closed the app.');
  done.push('back: inside a screen, to the title; on the title, the app steps aside and is kept');

  // 3. The measuring page, inside the shell.
  if (process.argv.includes('--measure')) {
    adb('shell', 'am', 'start', '-n', `${APP}/.MainActivity`);
    await sleep(1500);
    await page.goto(`${HOME}measure.html`, { waitUntil: 'load' });
    await page.waitForSelector('[data-measure-start]', { timeout: 20_000 });
    await sleep(1500);
    await press('[data-measure-start]');
    await page.waitForSelector('[data-measure-done]', { timeout: 180_000 });
    const card = (await page.evaluate(
      `document.querySelector('[data-measure-done]').innerText`,
    )) as string;
    console.log(`\n${card}\n`);
    done.push('measured: the card above');
    // The measuring page is a page of its own, and is in the history now. Start clean.
    adb('shell', 'am', 'force-stop', APP);
    adb('shell', 'am', 'start', '-n', `${APP}/.MainActivity`);
  }
} finally {
  await browser.disconnect();
  adb('forward', '--remove', `tcp:${String(PORT)}`);
}
for (const line of done) console.log(`SHELL CHECK: ${line}`);
