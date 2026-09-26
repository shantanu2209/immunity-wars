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
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));

describe('both entries build', () => {
  it('vite build produces the app AND the instrumented dev shell', { timeout: 180_000 }, () => {
    const out = mkdtempSync(join(tmpdir(), 'iw-entries-'));
    try {
      execSync(`pnpm exec vite build --logLevel error --emptyOutDir --outDir "${out}"`, {
        cwd: APP,
        stdio: 'pipe',
      });
      expect(existsSync(join(out, 'index.html'))).toBe(true);
      expect(existsSync(join(out, 'dev.html'))).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
