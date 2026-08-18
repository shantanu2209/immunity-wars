/**
 * F0 — how often does this gate go red on an UNCHANGED engine?
 *
 *   npx tsx tests/balance/false-positive-run.ts        # 8 unseen arms vs bands.json
 *   npx tsx tests/balance/false-positive-run.ts 4      # fewer, for a quick look
 *
 * THIS EXISTS BECAUSE 24 ARMS IS A HYPOTHESIS, NOT A DEMONSTRATION. `metrics-run.ts` widened the
 * calibration from 8 arms to 24 because a standard deviation estimated from 8 samples carries
 * ~27% relative uncertainty, and the first check against the 8-arm bands put an unchanged Normal
 * engine at 2.6σ and 2.7σ against a two-past-3σ rule (`docs/TASK_E_CLOSEOUT.md` §10.4). More arms
 * should fix that. "Should" is not a measurement.
 *
 * So this plays K arms the bands have never seen, on the engine the bands were measured on, and
 * counts how many of them the panel would have failed. **The correct answer is zero.** Every arm
 * here is the same engine that produced the bands, so every failure is a build broken for no
 * reason — and a gate that does that gets switched off by whoever it annoys, which leaves the
 * project with a gate in name only. That is the same end state as a win-rate gate pinned at 0.0%,
 * which `CLAUDE.md` already rejects.
 *
 * THREE THINGS IT IS NOT.
 *
 *   - It is NOT a calibration. It never writes `bands.json`. `metrics-run.ts` writes; `check.ts`
 *     and this script read. Keeping those apart is the whole reason the panel can fail at all —
 *     a harness that recalibrated before checking would regenerate its own reference and could
 *     never go red (the Task C5b shape, `tests/equivalence/README.md`).
 *   - It is NOT a check of the engine. A failure here says the BAND is too tight, not that the
 *     rules changed. `check.ts` is the instrument that makes the opposite claim, and it is the
 *     only one allowed to.
 *   - It is NOT a measurement of the gate's SENSITIVITY. It measures one error direction only.
 *     What the panel catches, and the one change it demonstrably does not, is pinned in
 *     `src/metrics-control.test.ts`. A gate needs both numbers and they come from different runs.
 *
 * SEEDS. Every arm here is disjoint from everything the bands have already seen:
 *
 *     0                        calibration arms 0..K-1        (K x batches x gamesPerBatch)
 *     K   x perArm             the held-out arm                metrics-run.ts §2
 *     K+1 x perArm             check.ts's arm                  pnpm test:balance
 *     K+2 x perArm             THIS SCRIPT, arm 0              and upward from there
 *
 * The base is derived from the band file rather than hardcoded, so recalibrating at a different
 * arm count cannot silently start replaying seeds the bands were fitted to. Seeds are
 * `splitmix32(index)` and deliberately not an arithmetic step — linearly-spaced seeds produced
 * correlated games and a band that was wrong while being perfectly reproducible
 * (`docs/FINDINGS.md` #33).
 *
 * Exit codes: 0 no unseen arm failed · 1 at least one did · 2 the run could not be made.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GATED_METRICS, measure } from './src/metrics.js';
import { aggregate, evaluate, mismatchedShape, type Band, type BandFile } from './src/panel.js';
import { DIFFICULTIES } from './src/play.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BANDS_PATH = join(HERE, 'bands.json');

const ARMS = Number(process.argv[2] ?? 8);
if (!Number.isFinite(ARMS) || ARMS < 1) {
  console.error(`arms must be a positive integer, got ${JSON.stringify(process.argv[2])}`);
  process.exit(2);
}

let file: BandFile;
try {
  file = JSON.parse(readFileSync(BANDS_PATH, 'utf8')) as BandFile;
} catch (e) {
  console.error(`cannot read ${BANDS_PATH}: ${String(e)}`);
  process.exit(2);
}

console.log('='.repeat(95));
console.log('F0 — FALSE-POSITIVE PROBE: unseen arms of the UNCHANGED engine, judged by the bands');
console.log('='.repeat(95));
console.log(
  `bands: ${file.generator} ${file.generatorVersion} · engine rev ${file.engineRev} · ${file.measuredAt}`,
);
console.log(`rule:  ${file.rule}\n`);

interface ArmResult {
  readonly difficulty: string;
  readonly arm: number;
  readonly failed: boolean;
  readonly reason: string;
  /** Largest |σ| over the four metrics — the near-miss measure a pass/fail cannot show. */
  readonly maxAbsSigma: number;
  readonly breaches: number;
}

const results: ArmResult[] = [];
let played = 0;

for (const difficulty of DIFFICULTIES) {
  const entry = file.difficulties[difficulty];
  if (!entry) {
    console.error(`bands.json has no entry for ${difficulty}`);
    process.exit(2);
  }
  const bands = entry.bands as Band[];
  const first = bands[0];
  if (!first) {
    console.error(`bands.json has no bands for ${difficulty}`);
    process.exit(2);
  }
  const { batches, gamesPerBatch } = first;
  // The same two guards check.ts carries. A band is only meaningful for the arm shape it was
  // calibrated on, and a metric set that has moved on from its bands is a category error.
  if (mismatchedShape(bands, batches, gamesPerBatch)) {
    console.error(`bands.json mixes arm shapes within ${difficulty}; refusing to probe it`);
    process.exit(2);
  }
  if (bands.length !== GATED_METRICS.length) {
    console.error(
      `bands.json has ${bands.length} bands for ${difficulty}, expected ${GATED_METRICS.length}. ` +
        'The metric set changed and the bands did not — recalibrate.',
    );
    process.exit(2);
  }

  const perArm = batches * gamesPerBatch;
  const base = (entry.arms + 2) * perArm;

  process.stdout.write(`  ${difficulty.padEnd(9)} `);
  for (let arm = 0; arm < ARMS; arm += 1) {
    const run = measure(difficulty, batches, gamesPerBatch, base + arm * perArm);
    const verdict = evaluate(bands, aggregate(run.batches));
    played += perArm;
    const maxAbsSigma = Math.max(...verdict.shifts.map((s) => Math.abs(s.sigmas)));
    results.push({
      difficulty,
      arm,
      failed: verdict.failed,
      reason: verdict.reason,
      maxAbsSigma,
      breaches: verdict.breaches.length,
    });
    process.stdout.write(verdict.failed ? 'X' : '.');
  }
  process.stdout.write('\n');
}

// The vacuity guard every instrument here carries: a green run that played nothing is not a pass.
if (played === 0) {
  console.error('VACUITY: 0 games played. This is not a probe.');
  process.exit(2);
}

console.log(
  '\n-- PER ARM — largest |σ| over the four metrics, and how many breached ---------------\n',
);
console.log('             arm   max|σ|   breaches@3σ   verdict');
for (const r of results) {
  console.log(
    `  ${r.difficulty.padEnd(9)} ${String(r.arm).padStart(3)}   ` +
      `${r.maxAbsSigma.toFixed(2).padStart(6)}   ${String(r.breaches).padStart(11)}   ` +
      `${r.failed ? '** FAIL **' : 'pass'}${r.failed ? `  (${r.reason})` : ''}`,
  );
}

console.log(
  '\n-- SUMMARY -------------------------------------------------------------------------\n',
);
for (const difficulty of DIFFICULTIES) {
  const rs = results.filter((r) => r.difficulty === difficulty);
  const fails = rs.filter((r) => r.failed).length;
  const sigmas = rs.map((r) => r.maxAbsSigma);
  console.log(
    `  ${difficulty.padEnd(9)} ${fails}/${rs.length} arms would have failed   ` +
      `max|σ| across arms: ${Math.min(...sigmas).toFixed(2)} .. ${Math.max(...sigmas).toFixed(2)}`,
  );
}

const failures = results.filter((r) => r.failed).length;
console.log(`\n${played} games played across ${results.length} unseen arms.`);
console.log(
  '  Headroom is the gap between the largest |σ| above and the 3σ breach line. A run whose worst\n' +
    '  arm sits at 2.7σ has not passed comfortably — it has passed by 0.3σ, which is the state\n' +
    '  docs/TASK_E_CLOSEOUT.md §10.4 recorded and this recalibration exists to leave behind.',
);

if (failures > 0) {
  console.error(
    `\n${failures} UNSEEN ARM(S) FAILED ON AN UNCHANGED ENGINE. These bands are not gateable.\n` +
      'Every arm here is the engine the bands were measured on, so each failure is a build that\n' +
      'would break for no reason. Widen the calibration (more arms) before this gate blocks a merge.',
  );
  process.exit(1);
}
console.log(
  '\nNo unseen arm failed. That is the necessary condition for gating, not a sufficient one:\n' +
    'it says the band is not too tight, and says nothing about what the band can detect. Sensitivity\n' +
    'is a different run — src/metrics-control.test.ts.',
);
