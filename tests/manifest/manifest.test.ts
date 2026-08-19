/**
 * THE MANIFEST IS CHECKED, NOT TRUSTED.
 *
 * `tests/suites.json` describes the test suites, what each proves, what each does not, and how
 * `docs/PHASE1_BRIEF.md` §7's seven-row table reconciles with what is on disk. Every one of those
 * is a claim, and this repository's own history says an unchecked claim in a document is worth
 * nothing — eleven documented-but-false statements have been found here so far, and the response
 * each time was the same: make it true or make it accurate.
 *
 * A manifest with no test would be the twelfth. So:
 *
 *   - every command must resolve to a real package.json script or a real file;
 *   - every suite must declare negative controls, and the count must match the files it names;
 *   - every §7 row must be accounted for — as a suite, or explicitly as cross-cutting/absent;
 *   - the reconciliation sentence is pinned VERBATIM.
 *
 * The last one deserves its reason. That sentence is the most important thing anyone arriving at
 * this repository needs to understand about what is and is not proven, and it is the sentence most
 * likely to be softened by a reader who mistakes it for criticism. It is not criticism — it is why
 * the property suite exists. Pinning it means softening it turns a test red rather than passing
 * silently into the dashboard.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { BRIEF_SUITES, manifestSchema, RECONCILIATION, type Manifest } from './schema.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

const raw = readFileSync(join(REPO, 'tests', 'suites.json'), 'utf8');
const parsed = manifestSchema.safeParse(JSON.parse(raw));

const rootScripts = (
  JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  }
).scripts;

describe('tests/suites.json', () => {
  it('validates against the schema', () => {
    expect(parsed.success ? null : parsed.error.issues).toBeNull();
  });

  const manifest = parsed.success ? parsed.data : (null as Manifest | null);

  /**
   * VERBATIM. Not "contains", not "mentions" — exactly equal to the constant, which is itself the
   * string the dashboard renders. Two copies that can drift are one copy too many.
   */
  it('carries the reconciliation sentence verbatim', () => {
    expect(manifest?.reconciliation).toBe(RECONCILIATION);
    expect(RECONCILIATION).toContain('There is no unit suite');
    expect(RECONCILIATION).toContain('AGREEMENT and not CORRECTNESS');
    expect(RECONCILIATION).toContain('bug-for-bug port is green');
  });

  /**
   * Every §7 row is accounted for exactly once, as a suite or as cross-cutting. A row appearing in
   * neither would be a suite silently dropped from the reconciliation; a row appearing in both
   * would be two answers to the same question.
   */
  it('accounts for every one of the brief §7 rows, exactly once', () => {
    if (!manifest) return;
    const fromSuites = manifest.suites
      .map((s) => s.briefSuite)
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const fromCross = manifest.crossCutting.map((c) => c.briefSuite);
    const seen = [...fromSuites, ...fromCross];

    for (const row of BRIEF_SUITES) {
      const n = seen.filter((x) => x === row).length;
      expect(n, `brief §7 row "${row}" is accounted for ${n} times, expected exactly 1`).toBe(1);
    }
    expect(seen.length).toBe(BRIEF_SUITES.length);
  });

  /**
   * The converse of "there is no unit suite", and the other half of why §7 could not be
   * transcribed: at least one suite on disk realises NO §7 row.
   *
   * The equivalence corpus is the largest test asset in this repository — 315 assertions, 2,000
   * nightly games — and §7 has no row for "an agreement oracle against a legacy implementation".
   * The table is not merely optimistic about a suite that does not exist; it is also silent about
   * one that does.
   */
  it('records that at least one real suite has no brief §7 row at all', () => {
    if (!manifest) return;
    const unmapped = manifest.suites.filter((s) => s.briefSuite === null);
    expect(
      unmapped.length,
      'every suite maps to a §7 row — has the table changed?',
    ).toBeGreaterThan(0);
    expect(unmapped.map((s) => s.id)).toContain('equivalence-corpus');
  });

  /** The headline count, asserted so the sentence and the file cannot disagree. */
  it('is five suites and three cross-cutting properties, as the sentence says', () => {
    if (!manifest) return;
    // Four until P2.1 added the session seam. The count is pinned rather than derived so that
    // the sentence and the array cannot disagree — which is the whole job of this file.
    expect(manifest.suites).toHaveLength(5);
    expect(
      manifest.crossCutting.filter((c) => c.status === 'realised-inside-other-suites'),
    ).toHaveLength(3);
  });

  /**
   * "There is no unit suite" must be backed by the data, not only by the sentence. If someone
   * later builds one and updates the suites array without touching the sentence, this fires.
   */
  it('records the absent unit suite as absent', () => {
    if (!manifest) return;
    const unit = manifest.crossCutting.find((c) => c.briefSuite === 'unit');
    expect(unit, 'the unit row vanished from crossCutting').toBeTruthy();
    expect(unit?.status).toBe('does-not-exist');
    expect(unit?.explanation).toContain('no suite testing each engine rule in isolation');
  });

  /**
   * EVERY SUITE MUST DECLARE A NIGHTLY TIER, and this is not a stylistic preference.
   *
   * The dashboard is published by the NIGHTLY workflow and renders one row per manifest suite,
   * with a missing result rendered RED. So a suite that the nightly does not run has a row that
   * can never be green — no matter how often it passes per-push, its result file never reaches
   * the job that builds the page.
   *
   * That is exactly what happened on the first real nightly: `balance-panel` and `content-schema`
   * declared per-push tiers only, the nightly matrix contained two jobs instead of four, and the
   * published page read INCOMPLETE with two permanent NO RESULT rows. The missing-is-red rule was
   * working perfectly; what was wrong was that nothing made the two facts agree.
   *
   * The fix for the two entries was one edit. This is the fix for the CLASS: a suite added later
   * with a per-push tier alone would reintroduce a permanently-red row, and the failure would look
   * like a broken dashboard rather than a missing job.
   */
  it('every suite declares a nightly tier, because the nightly is what publishes the page', () => {
    if (!manifest) return;
    for (const suite of manifest.suites) {
      expect(
        suite.tiers.nightly,
        `${suite.id} has no nightly tier. The dashboard is built by the nightly workflow and ` +
          'renders every manifest suite, so this suite would show NO RESULT on every published ' +
          'page regardless of how often it passes per-push. Give it a nightly tier, or remove it ' +
          'from the manifest — do not let the page carry a row that cannot go green.',
      ).toBeTruthy();
    }
  });

  it('names a real command for every tier of every suite', () => {
    if (!manifest) return;
    let checked = 0;
    for (const suite of manifest.suites) {
      for (const [tier, entry] of Object.entries(suite.tiers)) {
        checked += 1;
        const script = entry.command.match(/^pnpm ([\w:]+)$/)?.[1];
        if (script) {
          expect(
            rootScripts[script],
            `${suite.id}/${tier}: no root script "${script}"`,
          ).toBeTruthy();
          continue;
        }
        // Otherwise it must name a file that exists — e.g. `npx tsx tests/.../full-corpus.ts`.
        const file = entry.command.match(/(tests\/[\w./-]+\.ts)/)?.[1];
        expect(
          file,
          `${suite.id}/${tier}: command "${entry.command}" names neither a root script nor a file`,
        ).toBeTruthy();
        if (file) {
          expect(existsSync(join(REPO, file)), `${suite.id}/${tier}: ${file} does not exist`).toBe(
            true,
          );
        }
      }
    }
    // Vacuity guard: the loop body is entirely inside two nested for-loops.
    expect(checked, 'no tier commands were checked at all').toBeGreaterThan(0);
  });

  /**
   * Every suite declares negative controls, and the files it names exist and contain at least as
   * many `it(` blocks as it claims.
   *
   * The count is a FLOOR rather than an equality on purpose: control files also contain setup
   * assertions and baseline checks, and pinning an exact number would make the test fail on every
   * unrelated addition — which is how a check gets weakened rather than fixed.
   */
  it('declares negative controls that exist, for every suite', () => {
    if (!manifest) return;
    for (const suite of manifest.suites) {
      expect(suite.negativeControls, `${suite.id} declares no negative controls`).toBeGreaterThan(
        0,
      );
      let found = 0;
      for (const f of suite.controlFiles) {
        const path = join(REPO, f);
        expect(existsSync(path), `${suite.id}: control file ${f} does not exist`).toBe(true);
        if (!existsSync(path)) continue;
        found += (readFileSync(path, 'utf8').match(/^\s{2,}it\(/gm) ?? []).length;
      }
      expect(
        found,
        `${suite.id} claims ${suite.negativeControls} controls but its files hold ${found}`,
      ).toBeGreaterThanOrEqual(suite.negativeControls);
    }
  });

  /**
   * Every suite states what it does NOT prove, at length.
   *
   * A suite table listing only what each suite proves is exactly how "the corpus is green" becomes
   * "the engine is correct". The 40-character floor is crude and deliberate: it makes "N/A" or
   * "nothing" fail, which are the answers this field exists to prevent.
   */
  it('states what each suite does not prove, substantively', () => {
    if (!manifest) return;
    for (const suite of manifest.suites) {
      expect(
        suite.doesNotProve.length,
        `${suite.id}: doesNotProve is too short to be a real answer`,
      ).toBeGreaterThan(40);
    }
  });

  /** Exactly one suite may be the corpus, and it must carry the agreement-not-correctness caveat. */
  it('the corpus suite says plainly that agreement is not correctness', () => {
    if (!manifest) return;
    const corpus = manifest.suites.find((s) => s.id === 'equivalence-corpus');
    expect(corpus).toBeTruthy();
    expect(corpus?.doesNotProve).toContain('bug-for-bug port is green');
  });

  /** `manual` tiers are never blocking — a merge cannot wait on a command nobody scheduled. */
  it('never marks a manual tier blocking', () => {
    if (!manifest) return;
    for (const suite of manifest.suites) {
      const manual = suite.tiers.manual;
      if (manual) expect(manual.blocking, `${suite.id}: manual tier marked blocking`).toBe(false);
    }
  });
});
