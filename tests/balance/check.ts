/**
 * `pnpm test:balance` — check this engine against the stored bands.
 *
 *   pnpm test:balance                     # one arm per difficulty, vs bands.json
 *   npx tsx tests/balance/check.ts hard   # one difficulty
 *
 * THIS IS THE CONSUMER OF `bands.json`. Calibrating (`metrics-run.ts`) and checking are different
 * operations and must not be the same command: calibration OVERWRITES the reference, so a harness
 * that recalibrated on every run could never fail. That is the Task C5b shape — an oracle
 * regenerated before it is read — and it is worth naming here because the two scripts sit next to
 * each other and differ by one word.
 *
 *   metrics-run.ts   measures the null and WRITES bands.json     rare, deliberate
 *   check.ts         plays one arm and READS bands.json          on engine/content changes
 *
 * Exit codes: 0 pass · 1 the panel failed · 2 the check could not be run (bad or missing bands).
 *
 * WHAT A FAILURE MEANS, and the wording matters because it will be read by whoever broke the
 * build: "the rules changed under us". NOT "the game got harder" and NOT "the change was bad".
 * This panel cannot measure difficulty — the reference bot plays ~6 of 14 seats and wins ~0% on
 * Normal where humans win essentially every game (docs/FINDINGS.md §1).
 *
 * WHAT A PASS MEANS: "no broad shift detected". NEVER "the change was safe". Those differ by
 * docs/FINDINGS.md #17 and #34.4 — the panel does not fail on brain `branch:3 -> 4`, a demonstrated
 * blind spot pinned in `src/metrics-control.test.ts`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DIFFICULTIES } from './src/play.js';
import { GATED_METRICS, measure } from './src/metrics.js';
import { aggregate, evaluate, mismatchedShape, type Band, type BandFile } from './src/panel.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BANDS_PATH = join(HERE, 'bands.json');

const only = process.argv[2];
const wanted = only ? DIFFICULTIES.filter((d) => d === only) : [...DIFFICULTIES];
if (wanted.length === 0) {
  console.error(`unknown difficulty ${JSON.stringify(only)}; expected one of ${DIFFICULTIES.join(', ')}`);
  process.exit(2);
}

let file: BandFile;
try {
  file = JSON.parse(readFileSync(BANDS_PATH, 'utf8')) as BandFile;
} catch (e) {
  console.error(`cannot read ${BANDS_PATH}: ${String(e)}`);
  console.error('Run `npx tsx tests/balance/metrics-run.ts` to calibrate.');
  process.exit(2);
}

console.log('='.repeat(95));
console.log('BALANCE CHECK — does this engine still behave the way the bands were measured on?');
console.log('='.repeat(95));
console.log(`bands: ${file.generator} ${file.generatorVersion} · engine rev ${file.engineRev} · ${file.measuredAt}`);
console.log(`rule:  ${file.rule}\n`);

let failed = false;
let checked = 0;

for (const difficulty of wanted) {
  const entry = file.difficulties[difficulty];
  if (!entry) {
    console.error(`bands.json has no entry for ${difficulty}`);
    process.exit(2);
  }
  const bands = entry.bands as Band[];

  // The band is only meaningful for the arm shape it was calibrated on. Comparing a different
  // shape is a category error, and a silent one — the sigmas would all be wrong by a constant.
  const first = bands[0];
  if (!first) {
    console.error(`bands.json has no bands for ${difficulty}`);
    process.exit(2);
  }
  const { batches, gamesPerBatch } = first;
  if (mismatchedShape(bands, batches, gamesPerBatch)) {
    console.error(`bands.json mixes arm shapes within ${difficulty}; refusing to gate on it`);
    process.exit(2);
  }
  if (bands.length !== GATED_METRICS.length) {
    console.error(
      `bands.json has ${bands.length} bands for ${difficulty}, expected ${GATED_METRICS.length}. ` +
        'The metric set changed and the bands did not — recalibrate.',
    );
    process.exit(2);
  }

  // Seed indices past everything the calibration used, so this arm is genuinely unseen.
  const perArm = batches * gamesPerBatch;
  const run = measure(difficulty, batches, gamesPerBatch, (entry.arms + 1) * perArm);
  const verdict = evaluate(bands, aggregate(run.batches));
  checked += perArm;
  if (verdict.failed) failed = true;

  console.log(`${difficulty.padEnd(9)} ${verdict.failed ? '** FAIL **' : 'pass      '}  ${verdict.reason}`);
  for (const s of verdict.shifts) {
    const flag = s.breached ? ' <-' : '';
    console.log(
      `  ${s.metric.padEnd(18)} ${s.observed.toFixed(4).padStart(10)}  ` +
        `band [${s.band.lo.toFixed(4)}, ${s.band.hi.toFixed(4)}]  ${s.sigmas.toFixed(1).padStart(6)}σ${flag}`,
    );
  }
  console.log('');
}

// Vacuity guard, the shape full-run.ts uses: a green run that played nothing is not a pass.
if (checked === 0) {
  console.error('VACUITY: 0 games played. This is not a check.');
  process.exit(2);
}

console.log(`${checked} games checked against ${BANDS_PATH}`);
if (failed) {
  console.error(
    '\nTHE PANEL FAILED. That means "the rules changed under us" — not "the game got harder",\n' +
      'and not "the change was bad". This panel cannot measure difficulty (docs/FINDINGS.md #1).\n' +
      'If the change was intended, recalibrate with metrics-run.ts and commit the new bands.',
  );
  process.exit(1);
}
console.log(
  '\nNo broad shift detected. NOT "the change was safe" — the panel does not fail on brain\n' +
    'branch:3 -> 4 either (docs/FINDINGS.md #17, #34.4).',
);
