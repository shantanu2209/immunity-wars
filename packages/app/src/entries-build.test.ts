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
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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

  // THE CLAY KIT (stage L3, docs/LOOK_PLAN.md §13), both ways. The kit page and its art must be
  // BUILT AND SERVED, or the page Shantanu approves the kit on is not there; and they must be
  // LEFT OUT of what the worker stores on a player's phone, because no screen a player has uses
  // them until L4. The second half is removed with CLAY_NOT_YET in vite.config.ts, at L4, when
  // leaving the art out would break play with no network. Control: pnpm ci:selftest
  // clay-not-in-the-worker.
  it('the kit page and the Clay art are built and served', () => {
    expect(existsSync(join(out, 'kit.html'))).toBe(true);
    expect(existsSync(join(out, 'art', 'clay', 'manifest.json'))).toBe(true);
    expect(existsSync(join(out, 'art', 'clay', 'board', 'macrophage@3x.webp'))).toBe(true);
  });

  it('the worker stores none of the kit on a player’s phone, and still stores the art the screens use', () => {
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
    const kit = stored.filter((u) => u.includes('art/clay/') || u.includes('kit'));
    expect(kit, `THE WORKER STORES THE CLAY KIT: ${kit.slice(0, 3).join(', ')}`).toEqual([]);
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
