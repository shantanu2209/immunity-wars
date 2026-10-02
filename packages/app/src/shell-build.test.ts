/**
 * THE BUILD FOR THE ANDROID SHELL (`vite build --mode android`; docs/LOOK_PLAN.md §26). The same
 * app as the web's, with the service worker and the developer's pages taken out. Built here for
 * real, into a folder of its own, and read:
 *
 *   - the app's page and everything it needs are there, so the shell has the whole game in it;
 *   - no service worker is written, and NO SCRIPT REGISTERS ONE. Inside the shell every file is in
 *     the app, so a worker would store a second copy of the game and then go looking for newer
 *     builds on a server that is not where this app's updates come from;
 *   - of the developer's pages, only the measuring page.
 *
 * AND THE WEB BUILD IS NOT CHANGED BY ANY OF IT: `entries-build.test.ts` builds that one, in the
 * default mode, and still requires its worker and its four pages.
 *
 * Control: pnpm ci:selftest shell-build-registers-no-worker.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));

describe('the build for the Android shell', { timeout: 180_000 }, () => {
  let out = '';
  beforeAll(() => {
    out = mkdtempSync(join(tmpdir(), 'iw-shell-'));
    execSync(
      `pnpm exec vite build --mode android --logLevel error --emptyOutDir --outDir "${out}"`,
      { cwd: APP, stdio: 'pipe' },
    );
  }, 180_000);
  afterAll(() => {
    if (out !== '') rmSync(out, { recursive: true, force: true });
  });

  const scripts = (): string[] => readdirSync(join(out, 'assets')).filter((f) => f.endsWith('.js'));

  it('has the app’s page, and every script and picture the page needs', () => {
    expect(existsSync(join(out, 'index.html'))).toBe(true);
    const page = readFileSync(join(out, 'index.html'), 'utf8');
    const needed = [...page.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+\.(?:js|css))"/g)].map(
      (m) => m[1] ?? '',
    );
    // Read the coverage: a page read as needing nothing would pass the next line.
    expect(needed.length, 'THE APP’S PAGE WAS NOT READ: it names no script').toBeGreaterThan(0);
    for (const file of needed) expect(existsSync(join(out, file)), file).toBe(true);
    expect(existsSync(join(out, 'art', 'clay', 'manifest.json'))).toBe(true);
    expect(existsSync(join(out, 'art', 'clay', 'board', 'macrophage@3x.webp'))).toBe(true);
    expect(existsSync(join(out, 'fonts', 'nunito-latin-var.woff2'))).toBe(true);
  });

  it('writes no service worker, and no script of it registers one', () => {
    for (const file of ['sw.js', 'registerSW.js', 'manifest.webmanifest']) {
      expect(existsSync(join(out, file)), `THE SHELL’S BUILD WROTE ${file}`).toBe(false);
    }
    const names = scripts();
    expect(names.length, 'THE SHELL’S SCRIPTS WERE NOT FOUND').toBeGreaterThan(1);
    const registering = names.filter((f) =>
      readFileSync(join(out, 'assets', f), 'utf8').includes('sw.js'),
    );
    expect(
      registering,
      `THE SHELL’S BUILD REGISTERS A SERVICE WORKER: ${registering.join(', ')} names sw.js`,
    ).toEqual([]);
  });

  it('carries the measuring page, and no other page of a developer’s', () => {
    expect(existsSync(join(out, 'measure.html'))).toBe(true);
    for (const page of ['dev.html', 'kit.html']) {
      expect(existsSync(join(out, page)), `THE SHELL’S BUILD CARRIES ${page}`).toBe(false);
    }
  });
});
