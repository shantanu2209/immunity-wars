/**
 * THE CADENCE, TURNED INTO A CHECK — `docs/FINDINGS.md` #45.
 *
 * `controls.ts` names the test titles each manifest mutation must redden. Those names live in a
 * different file from the titles they name, and nothing coupled them: when P2.1 renamed
 * "is four suites…" to "is five suites…", two control expectations sat stale for a whole
 * sub-phase. The harness's own cadence rule — "run it when the manifest changes" — was written
 * down and not followed, which makes it this project's first documented-but-UNPRACTISED claim
 * (the previous dozen were documented-but-false).
 *
 * This test runs in the fast tier, so the coupling breaks the build the moment it breaks, with
 * no practice to remember. It asserts the same relation the harness uses at runtime: every
 * `expectFailing` entry must be a substring of at least one `it(...)` title in
 * `manifest.test.ts` — the harness matches expectations against failed-test titles by substring,
 * so a title this cannot find is one the harness could never see fail.
 *
 * What this does NOT replace: the harness itself. This proves the names still refer to
 * something; only `pnpm test:manifest-controls` proves the assertions still FIRE.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CONTROLS } from './controls-data.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Every `it('…', …)` title in the manifest suite, extracted from source. */
function manifestTitles(): string[] {
  const src = readFileSync(join(HERE, 'manifest.test.ts'), 'utf8');
  return [...src.matchAll(/\bit\(\s*'((?:[^'\\]|\\.)*)'/g)].flatMap((m) =>
    m[1] === undefined ? [] : [m[1]],
  );
}

describe('the controls harness stays coupled to the titles it targets', () => {
  const titles = manifestTitles();

  it('extracted a plausible number of titles, so a regex miss cannot pass as green', () => {
    // manifest.test.ts carries 8+ assertions today; extracting almost none would mean the
    // extraction broke, and every downstream check here would be vacuously satisfiable.
    expect(titles.length).toBeGreaterThanOrEqual(5);
  });

  for (const control of CONTROLS) {
    for (const expected of control.expectFailing) {
      it(`"${control.name}" targets a title that exists: "${expected}"`, () => {
        const found = titles.some((t) => t.includes(expected));
        expect(
          found,
          `expectFailing entry no longer matches any test title in manifest.test.ts: ` +
            `"${expected}". A renamed or removed title strands the control silently — ` +
            `update tests/manifest/controls-data.ts WITH the title, then run ` +
            `pnpm test:manifest-controls to prove the assertions still fire (FINDINGS #45).`,
        ).toBe(true);
      });
    }
  }
});
