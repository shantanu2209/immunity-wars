/**
 * THE JOB MATRIX, GENERATED FROM THE MANIFEST.
 *
 *   node --import tsx tools/ci/matrix.ts per-push     # emits JSON for strategy.matrix
 *   node --import tsx tools/ci/matrix.ts nightly
 *   node --import tsx tools/ci/matrix.ts --sentence   # the per-push "does not prove" text
 *
 * A tier list written into a workflow is a second copy of something `tests/suites.json` already
 * says, and two copies drift: a suite gets a nightly tier and nobody edits the YAML, so it silently
 * never runs at night. Nothing goes red, because a job that does not exist cannot fail. That is the
 * same shape as the aggregate gate's skipped-job trap, one level up.
 *
 * So the workflows ask this for their matrix, and the manifest is the only place a tier is declared.
 *
 * THE SENTENCE IS GENERATED, NOT TYPED. `--sentence` builds the "what a per-push green does NOT
 * prove" text from the manifest's own tier scales. Typed by hand it would be accurate on the day it
 * was written and quietly wrong afterwards — which is the failure this whole task is about.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { manifestSchema, type Manifest, type Tier } from '@immunity-wars/manifest/schema';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

export function loadManifest(repo: string = REPO): Manifest {
  const raw = readFileSync(join(repo, 'tests', 'suites.json'), 'utf8');
  return manifestSchema.parse(JSON.parse(raw));
}

export interface MatrixEntry {
  readonly id: string;
  readonly title: string;
  readonly command: string;
  readonly scale: string;
  readonly blocking: boolean;
  readonly resultFile: string;
  readonly approxSeconds: number;
}

/** Every suite that declares the given tier, in manifest order. */
export function matrixFor(manifest: Manifest, tier: Tier): MatrixEntry[] {
  const out: MatrixEntry[] = [];
  for (const suite of manifest.suites) {
    const entry = suite.tiers[tier];
    if (!entry) continue;
    out.push({
      id: suite.id,
      title: suite.title,
      command: entry.command,
      scale: entry.scale,
      blocking: entry.blocking,
      resultFile: suite.resultFile,
      approxSeconds: entry.approxSeconds,
    });
  }
  return out;
}

/**
 * One CI job per DISTINCT command, with the suites it covers.
 *
 * Three suites declare `pnpm test` for their per-push tier, because one vitest run exercises all
 * three. A job per suite would run it three times — same work, triple the wall clock, and the
 * per-push budget is the tightest constraint in the tier design.
 *
 * So jobs are grouped by command and each job records which suites it covers, which is what lets
 * one run emit a result file per suite. The grouping is derived, never written down twice.
 */
export interface JobGroup {
  /** Stable job id, derived from the command so the aggregate's expected list is predictable. */
  readonly id: string;
  readonly command: string;
  readonly suiteIds: readonly string[];
  readonly resultFiles: readonly string[];
  readonly approxSeconds: number;
  readonly blocking: boolean;
}

/** `pnpm test:balance` -> `test-balance`; `npx tsx tests/x/full-corpus.ts` -> `full-corpus`. */
export function jobIdFor(command: string): string {
  const script = command.match(/^pnpm ([\w:]+)$/)?.[1];
  if (script) return script.replace(/:/g, '-');
  const file = command.match(/([\w-]+)\.ts/)?.[1];
  return file ?? command.replace(/[^\w]+/g, '-').slice(0, 24);
}

export function groupedMatrix(manifest: Manifest, tier: Tier): JobGroup[] {
  const byCommand = new Map<string, JobGroup>();
  for (const entry of matrixFor(manifest, tier)) {
    const existing = byCommand.get(entry.command);
    if (existing) {
      byCommand.set(entry.command, {
        ...existing,
        suiteIds: [...existing.suiteIds, entry.id],
        resultFiles: [...existing.resultFiles, entry.resultFile],
        // The group costs as long as its slowest member claims; they run in one command.
        approxSeconds: Math.max(existing.approxSeconds, entry.approxSeconds),
        blocking: existing.blocking || entry.blocking,
      });
      continue;
    }
    byCommand.set(entry.command, {
      id: jobIdFor(entry.command),
      command: entry.command,
      suiteIds: [entry.id],
      resultFiles: [entry.resultFile],
      approxSeconds: entry.approxSeconds,
      blocking: entry.blocking,
    });
  }
  return [...byCommand.values()];
}

/** One line per suite the per-push tier ran, with the nightly scale it is a subset of. */
export interface RanEntry {
  readonly title: string;
  readonly scale: string;
  /** The nightly scale, when this suite has a larger tier. `null` when per-push IS full scale. */
  readonly ofNightly: string | null;
}

export interface PerPushMeaning {
  readonly headline: string;
  readonly ran: readonly RanEntry[];
  readonly doesNotProve: string;
}

/**
 * What a per-push green means, and what it does not — BUILT FROM THE MANIFEST.
 *
 * Typed by hand this would be accurate on the day it was written and quietly wrong afterwards, as
 * soon as a tier changed scale and nobody edited the prose. Generated, it cannot drift from what
 * actually ran.
 *
 * Returned as a LIST rather than one long sentence because it is read on a phone, and because
 * "210 of 2,000" beside each suite is the comparison that carries the meaning — "the tests passed"
 * and "210 of the corpus's 2,000 games passed" license very different conclusions.
 */
export function perPushMeaning(manifest: Manifest): PerPushMeaning {
  const ran: RanEntry[] = [];
  for (const suite of manifest.suites) {
    const push = suite.tiers['per-push'];
    if (!push) continue;
    ran.push({
      title: suite.title,
      scale: push.scale,
      ofNightly: suite.tiers.nightly?.scale ?? null,
    });
  }

  const deferred = manifest.suites
    .filter((s) => s.tiers.nightly && s.tiers['per-push'])
    .map((s) => s.title.toLowerCase());

  return {
    headline:
      'A green per-push run means the code compiles, the boundaries hold, and the fast tier passed.',
    ran,
    doesNotProve:
      (deferred.length > 0
        ? `It does NOT mean the ${deferred.join(' or the ')} passed at full scale — those run nightly, and the per-push tier is a strict subset. `
        : '') + 'And none of it measures difficulty, or whether the game is any good.',
  };
}

// --- CLI -----------------------------------------------------------------------------------
// Guarded by comparing resolved paths, so importing this module for tests neither prints nor
// exits. A module that runs at import time cannot be unit tested — the same reason the aggregate
// gate keeps its entry point in a separate file.
const invokedDirectly =
  !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const arg = process.argv[2];
  const manifest = loadManifest();

  if (arg === '--sentence') {
    console.log(JSON.stringify(perPushMeaning(manifest), null, 2));
  } else if (arg === 'per-push' || arg === 'nightly' || arg === 'manual') {
    const entries = groupedMatrix(manifest, arg);
    if (entries.length === 0) {
      console.error(
        `VACUITY: no suite declares a "${arg}" tier. A matrix of zero jobs is not a tier.`,
      );
      process.exit(2);
    }
    console.log(JSON.stringify({ include: entries }));
  } else {
    console.error('usage: matrix.ts <per-push|nightly|manual|--sentence>');
    process.exit(2);
  }
}
