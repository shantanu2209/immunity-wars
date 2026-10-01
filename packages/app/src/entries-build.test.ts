/**
 * THE DEV-ENTRY ROT CHECK (docs/APP_FLOW.md ruling 6, Shantanu's wording): a check that
 * fails if the dev entry stops building, so instrumentation cannot die because the thing it
 * hung on was replaced. It runs the REAL vite build (both inputs) and asserts both pages
 * came out — not an existence check on sources, a build of them.
 *
 * Negative control, run manually before this was trusted (recorded in the landing commit):
 * dev.html's script src pointed at a non-existent module → the build failed and this test
 * went red; restored → green. The mustPass half is every ordinary run.
 *
 * INTO A FOLDER OF ITS OWN, never the app's `dist` (25 September 2026). It deleted and rebuilt
 * `dist` on every test run, and `dist` is what `vite preview` serves and the Gate 1 audit measures:
 * a `pnpm verify` run beside the audit swapped the audit's local-relay build for a production one
 * halfway through, and every page opened after that measured the wrong build.
 *
 * AND THE WORKER'S HALF OF *UPDATE NOW* (FINDINGS #93, 30 September 2026), from the same build: the
 * generated `sw.js` must still take over when told `SKIP_WAITING`, the one thing `updateNow` asks of
 * it. The message is the plugin's, not ours, so a plugin bump that renamed it would leave the button
 * reloading into the old version, which is the failure it exists to end.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SKIP_WAITING } from './serviceWorker.js';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));

describe('both entries build', { timeout: 180_000 }, () => {
  let out = '';
  beforeAll(() => {
    out = mkdtempSync(join(tmpdir(), 'iw-entries-'));
    execSync(`pnpm exec vite build --logLevel error --emptyOutDir --outDir "${out}"`, {
      cwd: APP,
      stdio: 'pipe',
    });
  }, 180_000);
  afterAll(() => {
    if (out !== '') rmSync(out, { recursive: true, force: true });
  });

  it('vite build produces the app AND the instrumented dev shell', () => {
    expect(existsSync(join(out, 'index.html'))).toBe(true);
    expect(existsSync(join(out, 'dev.html'))).toBe(true);
  });

  // THE CLAY ART (docs/LOOK_PLAN.md §13 and §14), held three ways. The kit page and its art must be
  // BUILT AND SERVED, or the page the kit is judged on is not there. From stage L4 the board is
  // drawn in Clay, so EVERY PICTURE THE BOARD DRAWS MUST BE STORED by the worker, or the game does
  // not play with no network. And NOTHING THAT ONLY THE KIT PAGE USES may be stored. Controls:
  // pnpm ci:selftest clay-board-art-in-the-worker, clay-not-in-the-worker.
  //
  // AND EVERY SCRIPT THE APP NEEDS MUST BE STORED (the test below this one). "Nothing of the kit is
  // stored" was half a specification, and the half that was missing broke the app: it read
  // "nothing whose name has `kit` in it", the play screen began to use the kit's components, the
  // build put them in a script named `kit-…js`, and this test went on passing while the app could
  // not start with no network. A rule that forbids must be held beside what it has to permit.
  it('the kit page and the Clay art are built and served', () => {
    expect(existsSync(join(out, 'kit.html'))).toBe(true);
    expect(existsSync(join(out, 'measure.html'))).toBe(true);
    expect(existsSync(join(out, 'art', 'clay', 'manifest.json'))).toBe(true);
    expect(existsSync(join(out, 'art', 'clay', 'board', 'macrophage@3x.webp'))).toBe(true);
  });

  it('the worker stores every picture the board draws, and nothing else of the kit', () => {
    const worker = readFileSync(join(out, 'sw.js'), 'utf8');
    // Both spellings: a production build writes `url:"…"`, and this test's build (NODE_ENV=test)
    // the readable `"url": "…"`.
    const stored = [...worker.matchAll(/["']?url["']?:\s*["']([^"']+)["']/g)].map(
      (m) => m[1] ?? '',
    );
    // Read the instrument that reports coverage: a list that matched nothing would pass the last
    // line. It did, on this test's first run: the pattern knew only the production spelling and
    // read 0 entries, and this line is what said so.
    expect(stored.length, 'THE WORKER LIST WAS NOT READ').toBeGreaterThan(100);
    expect(
      stored.filter((u) => u.startsWith('art/') && !u.includes('clay')).length,
    ).toBeGreaterThan(80);
    // What the play screen draws: the board's own picture at every size; each piece, organ and
    // way in at the one size the board and the panels name (`@3x`); and each piece as a card shows
    // it, at every size. Listed from the build, not from memory.
    const drawn = [
      ...readdirSync(join(out, 'art', 'clay', 'table')).map((f) => `art/clay/table/${f}`),
      ...readdirSync(join(out, 'art', 'clay', 'card')).map((f) => `art/clay/card/${f}`),
      ...readdirSync(join(out, 'art', 'clay', 'board'))
        .filter((f) => f.endsWith('@3x.webp'))
        .map((f) => `art/clay/board/${f}`),
    ];
    expect(drawn.length, 'THE BOARD’S PICTURES WERE NOT FOUND IN THE BUILD').toBeGreaterThan(110);
    const missing = drawn.filter((u) => !stored.includes(u));
    expect(
      missing,
      `THE WORKER DOES NOT STORE THE BOARD’S ART: ${missing.slice(0, 3).join(', ')}`,
    ).toEqual([]);
    // What only the kit page and the measuring page use: the pages, their own scripts (each named
    // by its key in the build's `input`), and the art no screen draws.
    const kit = stored.filter(
      (u) =>
        (u.includes('art/clay/') && !drawn.includes(u)) ||
        u === 'kit.html' ||
        u === 'measure.html' ||
        u.startsWith('assets/kitPage-') ||
        u.startsWith('assets/measurePage-'),
    );
    expect(kit, `THE WORKER STORES THE CLAY KIT: ${kit.slice(0, 3).join(', ')}`).toEqual([]);
    const own = readdirSync(join(out, 'assets'));
    expect(
      own.filter((f) => f.startsWith('kitPage-')).length,
      'THE KIT PAGE’S OWN SCRIPT WAS NOT FOUND IN THE BUILD, so nothing was held out of the list',
    ).toBeGreaterThan(0);
    expect(
      own.filter((f) => f.startsWith('measurePage-')).length,
      'THE MEASURING PAGE’S OWN SCRIPT WAS NOT FOUND IN THE BUILD',
    ).toBeGreaterThan(0);
  });

  // A PHONE THAT HAS OPENED THE APP MUST STILL BE ABLE TO OPEN THE DEVELOPER'S PAGES. The worker
  // answers a page it does not store with the app's own, so without an exception the kit page and
  // the measuring page open as the title on any phone that has played once, which is the phone they
  // are for. Read from the worker the build wrote; `pnpm look:frames` opens the measuring page from
  // behind a worker and so holds it by doing it. Control: pnpm ci:selftest worker-leaves-developer-pages.
  it('the worker leaves the kit page and the measuring page to the network', () => {
    const worker = readFileSync(join(out, 'sw.js'), 'utf8');
    const denied = /denylist:\s*\[([^\]]*)\]/.exec(worker)?.[1] ?? '';
    const missing = ['kit\\.html', 'measure\\.html'].filter((page) => !denied.includes(page));
    expect(
      missing,
      `THE WORKER ANSWERS A DEVELOPER’S PAGE WITH THE APP: ${missing.join(', ')} is not in its exceptions (${denied === '' ? 'it has none' : denied})`,
    ).toEqual([]);
  });

  // Control: pnpm ci:selftest app-scripts-in-the-worker.
  it('the worker stores every script the app’s page needs, however the build names them', () => {
    const worker = readFileSync(join(out, 'sw.js'), 'utf8');
    const stored = [...worker.matchAll(/["']?url["']?:\s*["']([^"']+)["']/g)].map(
      (m) => m[1] ?? '',
    );
    // From the page itself: its scripts and what it preloads; then, script by script, what each
    // one imports from beside it, until nothing new is found.
    const page = readFileSync(join(out, 'index.html'), 'utf8');
    const needed = new Set(
      [...page.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+\.(?:js|css))"/g)].map(
        (m) => m[1] ?? '',
      ),
    );
    const direct = needed.size;
    const queue = [...needed].filter((u) => u.endsWith('.js'));
    for (let u = queue.pop(); u !== undefined; u = queue.pop()) {
      const text = readFileSync(join(out, u), 'utf8');
      for (const m of text.matchAll(/(?:from|import)\s*\(?\s*["']\.\/([\w.-]+\.js)["']/g)) {
        const next = `assets/${m[1] ?? ''}`;
        if (!needed.has(next)) {
          needed.add(next);
          queue.push(next);
        }
      }
    }
    // Read the coverage: a page read as needing nothing would pass the last line.
    expect(direct, 'THE APP’S PAGE WAS NOT READ: it names no script').toBeGreaterThan(0);
    expect(needed.size, 'THE APP’S SCRIPTS WERE NOT FOLLOWED').toBeGreaterThanOrEqual(3);
    const missing = [...needed].filter((u) => !stored.includes(u));
    expect(
      missing,
      `THE WORKER DOES NOT STORE A SCRIPT THE APP NEEDS: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('the worker it builds takes over when told SKIP_WAITING, which Update now depends on', () => {
    const worker = readFileSync(join(out, 'sw.js'), 'utf8');
    // Either way round: a production build writes `"SKIP_WAITING"===e.data.type&&self.skipWaiting()`,
    // and this test's build (NODE_ENV=test) the readable `event.data.type === 'SKIP_WAITING') {`
    // followed by `self.skipWaiting();`. Both measured, 30 September 2026.
    const named = String.raw`["']${SKIP_WAITING.type}["']`;
    const listens = new RegExp(
      String.raw`(${named}\s*===\s*\w+\.data\.type|\w+\.data\.type\s*===\s*${named})[\s\S]{0,40}?self\.skipWaiting\(\)`,
    );
    expect(worker).toMatch(listens);
  });
});
