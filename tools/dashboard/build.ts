/**
 * BUILD THE DASHBOARD.
 *
 *   node --import tsx tools/dashboard/build.ts <results-dir> <history-dir> <out-dir>
 *
 * Reads one result file per suite (written by the CI jobs), the accumulated history (from the
 * `results-data` branch), and emits a single self-contained HTML file.
 *
 * THE RULE THAT SHAPES THIS FILE: **the manifest decides which rows exist, not the results
 * directory.** Iterating over the files that happen to be present would silently omit a suite
 * whose job never ran — and a suite that vanishes from the page is indistinguishable from one that
 * was never there. So every manifest entry becomes a row, and a row with no result file is RED.
 *
 * That is the same defect as the aggregate gate's skipped job, one layer up, and it is the reason
 * `renderDashboard` takes rows rather than reading the directory itself.
 *
 * Exit codes: 0 built · 2 the build could not be made.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { loadManifest } from '@immunity-wars/ci/matrix';

import { reported, type Provenance } from './reported.js';
import { renderDashboard, type SizeFigure, type SuiteRow, type Trend } from './render.js';

interface SuiteResult {
  readonly id: string;
  readonly status?: string;
  readonly detail?: string;
  readonly ranAt?: string;
}

interface HistoryRecord {
  readonly at: string;
  readonly commit: string;
  readonly coveragePct?: number;
  readonly balance?: Record<string, Record<string, number>>;
  readonly sizeMedianChars?: Record<string, number>;
}

const [resultsDir, historyDir, outDir] = process.argv.slice(2);
if (!resultsDir || !historyDir || !outDir) {
  console.error('usage: build.ts <results-dir> <history-dir> <out-dir>');
  process.exit(2);
}

const manifest = loadManifest();
const now = new Date();
const commit = process.env.GITHUB_SHA?.slice(0, 7) ?? 'unknown';

function readResult(file: string): SuiteResult | null {
  const path = resolve(file);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as SuiteResult;
  } catch {
    return null;
  }
}

// One row per MANIFEST entry. Never one row per file found.
const rows: SuiteRow[] = manifest.suites.map((suite) => {
  const result = readResult(join(resultsDir, `${suite.id}.json`));
  const status = !result ? 'missing' : result.status === 'pass' ? 'pass' : 'fail';
  return {
    id: suite.id,
    title: suite.title,
    status,
    detail: result?.detail ?? '',
    doesNotProve: suite.doesNotProve,
    ranAt: result?.ranAt ?? null,
  };
});

// --- history ---------------------------------------------------------------------------------
const history: HistoryRecord[] = [];
if (existsSync(historyDir)) {
  for (const f of readdirSync(historyDir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    try {
      history.push(JSON.parse(readFileSync(join(historyDir, f), 'utf8')) as HistoryRecord);
    } catch {
      // A corrupt history file must not take the page down; it simply contributes no point.
      console.warn(`skipping unreadable history record: ${f}`);
    }
  }
}

const latest = history[history.length - 1];

const prov = (over: Partial<Provenance>): Provenance => ({
  generator: 'CI',
  generatorVersion: 'v1',
  scale: 'this run',
  commit,
  measuredAt: now.toISOString(),
  caveat: null,
  ...over,
});

const coverage =
  latest?.coveragePct !== undefined
    ? reported(
        `${latest.coveragePct.toFixed(2)}% of coverable branch arms`,
        prov({
          generator: 'coverage gate',
          scale: 'v8 provider, coverable arms only',
          measuredAt: latest.at,
          caveat:
            'coverable arms exclude provably-dead ones, enumerated in docs/COVERAGE_EXCLUSIONS.md',
        }),
      )
    : null;

const sizes: SizeFigure[] = [];
if (latest?.sizeMedianChars) {
  // Every size figure carries its censoring row. The type requires it; this is where the text
  // comes from, and it is per-difficulty because the censoring differs per difficulty.
  const CENSORING: Record<string, string> = {
    training: 'The reference bot reaches 51.9% of the legal turn window on Training.',
    normal: 'The reference bot reaches 32.4% of the legal turn window on Normal.',
    hard: 'The reference bot dies at turn 8.6 of a 45-turn Hard game — 19.2% of the window. Zero of 200 games survived to the end of the onslaught window.',
  };
  for (const [difficulty, chars] of Object.entries(latest.sizeMedianChars)) {
    sizes.push({
      label: `Median mid-game state — ${difficulty}`,
      value: reported(
        `${chars.toLocaleString('en-GB')} chars`,
        prov({
          generator: 'reference bot',
          scale: `median over sampled ${difficulty} states`,
          measuredAt: latest.at,
          caveat: 'a floor: the late game is not in the sample at all',
        }),
      ),
      censoring:
        CENSORING[difficulty] ??
        'The reference bot dies long before the game gets big, so sampled states are systematically the small ones.',
    });
  }
}

const trends: Trend[] = [];
if (history.length > 0) {
  const coveragePoints = history
    .filter((h) => h.coveragePct !== undefined)
    .map((h) => ({ at: h.at, value: h.coveragePct as number }));
  if (coveragePoints.length > 0) {
    trends.push({
      label: 'Coverage of coverable branch arms',
      points: coveragePoints,
      qualifierLine:
        'under the coverage gate, v8 provider — the ±1 arm wobble is measurement noise',
    });
  }

  // The four gated balance metrics — never the win rate, which is reported elsewhere under its
  // qualified name and is never a gate.
  for (const metric of [
    'avgTurnsSurvived',
    'trunkKillPct',
    'avgAntibodiesMade',
    'avgOrgansDamaged',
  ]) {
    const pts = history
      .filter((h) => h.balance?.normal?.[metric] !== undefined)
      .map((h) => ({ at: h.at, value: h.balance?.normal?.[metric] as number }));
    if (pts.length > 0) {
      trends.push({
        label: `${metric} — normal`,
        points: pts,
        qualifierLine:
          'under the reference bot v1, one arm of 20 × 100 games. Detects ENGINE CHANGE, not difficulty.',
      });
    }
  }
}

const html = renderDashboard(
  {
    manifest,
    commit,
    builtAt: now.toISOString().replace('T', ' ').slice(0, 16),
    perPush: { status: 'pass', at: now.toISOString() },
    nightly: { status: latest ? 'pass' : 'missing', at: latest?.at ?? null },
    rows,
    coverage,
    sizes,
    trends,
  },
  now,
);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), html, 'utf8');

const missing = rows.filter((r) => r.status === 'missing').length;
const failed = rows.filter((r) => r.status === 'fail').length;
console.log(`wrote ${join(outDir, 'index.html')}`);
console.log(`  ${rows.length} suite rows — ${failed} failed, ${missing} with no result at all`);
console.log(`  ${history.length} history record(s); trends need ${3} points to draw a line`);
if (missing > 0) {
  console.log(
    '\n  A row with no result is rendered RED, not omitted. The page is built anyway, because a\n' +
      '  dashboard that refuses to build when something is missing tells the reader nothing.',
  );
}
