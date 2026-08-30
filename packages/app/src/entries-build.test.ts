/**
 * THE DEV-ENTRY ROT CHECK (docs/APP_FLOW.md ruling 6, Shantanu's wording): a check that
 * fails if the dev entry stops building, so instrumentation cannot die because the thing it
 * hung on was replaced. It runs the REAL vite build (both inputs) and asserts both pages
 * came out — not an existence check on sources, a build of them.
 *
 * Negative control, run manually before this was trusted (recorded in the landing commit):
 * dev.html's script src pointed at a non-existent module → the build failed and this test
 * went red; restored → green. The mustPass half is every ordinary run.
 */
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));

describe('both entries build', () => {
  it('vite build produces the app AND the instrumented dev shell', { timeout: 180_000 }, () => {
    rmSync(join(APP, 'dist'), { recursive: true, force: true });
    execSync('pnpm exec vite build --logLevel error', { cwd: APP, stdio: 'pipe' });
    expect(existsSync(join(APP, 'dist/index.html'))).toBe(true);
    expect(existsSync(join(APP, 'dist/dev.html'))).toBe(true);
  });
});
