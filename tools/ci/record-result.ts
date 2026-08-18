/**
 * WRITE ONE RESULT FILE PER SUITE — the thing the dashboard reads.
 *
 *   node --import tsx tools/ci/record-result.ts <status> <tier> <suite-id>...
 *
 * Replaces a `printf` in the workflow that hand-assembled JSON, which was wrong twice over:
 *
 *   1. It interpolated `${{ matrix.scale }}`, and the GROUPED matrix does not carry `scale` — only
 *      the ungrouped entries do. So every result file the first real nightly wrote had an empty
 *      detail. Nothing failed; the dashboard simply rendered blank rows, which is the quiet kind
 *      of wrong.
 *   2. It built JSON with printf and no escaping. A scale containing a quote or a backslash would
 *      have produced a file the dashboard could not parse — and `build.ts` treats an unparseable
 *      result as MISSING, so a punctuation mark in the manifest would have turned a passing suite
 *      red with no explanation anywhere.
 *
 * Both are the same lesson the aggregate gate records: logic that lives in YAML cannot be
 * falsified. This can — `record-result.test.ts` runs it over the real manifest.
 *
 * The scale comes from the MANIFEST rather than from the workflow, so the figure on the dashboard
 * and the figure in `suites.json` cannot disagree.
 *
 * Exit codes: 0 written · 2 could not be written.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadManifest } from './matrix.js';
import type { Tier } from '@immunity-wars/manifest/schema';

export interface SuiteResultFile {
  readonly id: string;
  readonly status: 'pass' | 'fail';
  /** The scale this suite ran at, taken from the manifest so the two cannot disagree. */
  readonly detail: string;
  readonly ranAt: string;
  readonly tier: Tier;
}

/** Build the record for one suite. Exported so it can be tested without touching the disk. */
export function resultFor(
  suiteId: string,
  status: 'pass' | 'fail',
  tier: Tier,
  now: Date,
  manifest = loadManifest(),
): SuiteResultFile {
  const suite = manifest.suites.find((s) => s.id === suiteId);
  if (!suite) {
    throw new Error(
      `no suite "${suiteId}" in the manifest. A job wrote a result for a suite that does not ` +
        'exist, which means the workflow and tests/suites.json have drifted apart.',
    );
  }
  const entry = suite.tiers[tier];
  if (!entry) {
    throw new Error(
      `suite "${suiteId}" has no "${tier}" tier, but a ${tier} job just recorded a result for it.`,
    );
  }
  return {
    id: suiteId,
    status,
    detail: entry.scale,
    ranAt: now.toISOString(),
    tier,
  };
}

const invokedDirectly = process.argv[1]?.endsWith('record-result.ts') ?? false;

if (invokedDirectly) {
  const [status, tier, ...ids] = process.argv.slice(2);

  if (status !== 'pass' && status !== 'fail') {
    console.error(`status must be "pass" or "fail", got ${JSON.stringify(status)}`);
    process.exit(2);
  }
  if (tier !== 'per-push' && tier !== 'nightly' && tier !== 'manual') {
    console.error(`tier must be per-push, nightly or manual, got ${JSON.stringify(tier)}`);
    process.exit(2);
  }
  if (ids.length === 0) {
    // The vacuity guard: a job that records nothing leaves rows the dashboard renders RED, and
    // "the job ran but wrote no results" should be loud rather than silent.
    console.error('VACUITY: no suite ids given, so no result would be written.');
    process.exit(2);
  }

  const manifest = loadManifest();
  const now = new Date();
  mkdirSync('results', { recursive: true });

  for (const id of ids) {
    let record: SuiteResultFile;
    try {
      record = resultFor(id, status, tier, now, manifest);
    } catch (e) {
      console.error(String(e instanceof Error ? e.message : e));
      process.exit(2);
    }
    // JSON.stringify, never printf: the scale is manifest prose and may contain any punctuation.
    writeFileSync(join('results', `${id}.json`), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    console.log(`  results/${id}.json  ${status}  ${record.detail}`);
  }
}
