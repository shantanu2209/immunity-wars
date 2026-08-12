/**
 * E2 — calibrate the metric panel and write `bands.json`.
 *
 *   npx tsx tests/balance/metrics-run.ts           # 8 arms x 20 x 100 games x 3, + a held-out arm
 *   npx tsx tests/balance/metrics-run.ts 4 10 50   # a subset
 *
 * THE BAND'S WIDTH IS MEASURED, NOT DERIVED. K independent arms of the same engine on disjoint
 * seed blocks; the spread of their arm means IS the null distribution the gate compares against.
 * Deriving it instead as sd/sqrt(batches) understates the true spread by up to 1.5x — measured,
 * see `src/panel.ts`.
 *
 * AND A HELD-OUT ARM, never used to build the bands, is judged by them. A band that has only ever
 * been checked against the data that produced it has not been checked.
 */

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DIFFICULTIES } from './src/play.js';
import {
  calibrate,
  calibratedValue,
  GATED_METRICS,
  GENERATOR,
  GENERATOR_VERSION,
  measure,
  render,
  type Calibration,
} from './src/metrics.js';
import {
  aggregate,
  bandOf,
  evaluate,
  LOUD_SIGMA,
  SIGMA,
  type Band,
  type BandFile,
} from './src/panel.js';

const ARMS = Number(process.argv[2] ?? 8);
const BATCHES = Number(process.argv[3] ?? 20);
const GAMES = Number(process.argv[4] ?? 100);
const PER_ARM = BATCHES * GAMES;

const HERE = dirname(fileURLToPath(import.meta.url));

const started = process.hrtime.bigint();
console.log('='.repeat(95));
console.log('E2 — THE METRIC PANEL');
console.log('='.repeat(95));
console.log(`generator: ${GENERATOR} ${GENERATOR_VERSION}`);
console.log(`${ARMS} calibration arms of ${BATCHES} x ${GAMES} = ${PER_ARM} games, + 1 held-out arm`);
console.log(
  `${DIFFICULTIES.length} difficulties · ${(ARMS + 1) * PER_ARM * DIFFICULTIES.length} games total\n`,
);

const cal: Record<string, Calibration> = {};
const bands: Record<string, Band[]> = {};
for (const d of DIFFICULTIES) {
  process.stdout.write(`  calibrating ${d} `);
  const c = calibrate(d, ARMS, BATCHES, GAMES, 0, undefined, () => process.stdout.write('.'));
  cal[d] = c;
  bands[d] = GATED_METRICS.map((m) => bandOf(c, m));
  process.stdout.write('\n');
}

/** The held-out arm, computed once per difficulty and reused by every section below. */
const heldOut: Record<string, ReturnType<typeof aggregate>> = {};
for (const d of DIFFICULTIES) {
  heldOut[d] = aggregate(measure(d, BATCHES, GAMES, ARMS * PER_ARM).batches);
}

// -----------------------------------------------------------------------------------------------
console.log('\n-- 1. THE CALIBRATED BANDS ---------------------------------------------------------\n');
console.log('                           mean    sd(arm)   sd/mean               band ±3σ        arm spread');
for (const d of DIFFICULTIES) {
  const c = cal[d];
  if (!c) continue;
  console.log(`  ${d}`);
  for (const m of GATED_METRICS) {
    const b = bandOf(c, m);
    const xs = c.armMeans[m];
    console.log(
      `    ${m.padEnd(18)} ${b.mean.toFixed(4).padStart(9)} ${b.sdArm.toFixed(4).padStart(10)} ` +
        `${(b.rsd * 100).toFixed(1).padStart(7)}%   ` +
        `[${b.lo.toFixed(4)}, ${b.hi.toFixed(4)}]`.padEnd(24) +
        `  ${Math.min(...xs).toFixed(4)} .. ${Math.max(...xs).toFixed(4)}`,
    );
  }
}

// -----------------------------------------------------------------------------------------------
console.log('\n-- 2. HELD-OUT ARM — never used to build the bands ---------------------------------\n');
let selfClean = true;
for (const d of DIFFICULTIES) {
  const b = bands[d];
  const h = heldOut[d];
  if (!b || !h) continue;
  const v = evaluate(b, h);
  if (v.failed) selfClean = false;
  console.log(
    `  ${d.padEnd(9)} ${v.failed ? '** FAILS **' : 'passes    '}  ` +
      v.shifts.map((s) => `${s.metric.slice(0, 9)} ${s.sigmas.toFixed(1)}σ`).join('  '),
  );
}
console.log(
  `\n  ${selfClean ? 'No false positive on unseen data.' : 'FALSE POSITIVE — these bands are not gateable.'}\n` +
    '  A band checked only against the data that built it has not been checked.',
);

// -----------------------------------------------------------------------------------------------
console.log('\n-- 3. REPORTED, NEVER GATED --------------------------------------------------------\n');
for (const d of DIFFICULTIES) {
  const h = heldOut[d];
  if (!h) continue;
  console.log(
    `  ${d.padEnd(9)} winRateUnderReferenceBot = ${h.winRateUnderReferenceBot.toFixed(4)} ` +
      `— under the ${GENERATOR} ${GENERATOR_VERSION}, ${PER_ARM} games on ${d}`,
  );
  console.log(`            unfinished games (neither won nor lost at the turn guard): ${h.unfinished}`);
}
console.log(
  '\n  A win rate pinned near zero cannot fall, so it cannot fail usefully and is never a gate.\n' +
    '  It is not a difficulty measurement: humans win essentially every Normal game (FINDINGS #1).',
);

// -----------------------------------------------------------------------------------------------
console.log('\n-- 4. ONE RENDERED LINE PER METRIC — the only way a number leaves this harness ------\n');
for (const d of DIFFICULTIES) {
  const c = cal[d];
  if (!c) continue;
  for (const m of GATED_METRICS) console.log(`  ${render(calibratedValue(c, m))}`);
}

// -----------------------------------------------------------------------------------------------
let engineRev = 'unknown';
try {
  engineRev = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {
  engineRev = 'unknown (not a git checkout)';
}

const file: BandFile = {
  note:
    'Detects ENGINE CHANGE, not difficulty. A green panel means "no broad shift detected", never ' +
    '"the change was safe". Every figure is conditional on the generator named below. The panel ' +
    'does NOT fail on brain branch:3->4 (docs/FINDINGS.md #17 and #34) — a demonstrated blind ' +
    'spot, pinned in src/metrics-control.test.ts.',
  generator: GENERATOR,
  generatorVersion: GENERATOR_VERSION,
  sigma: SIGMA,
  loudSigma: LOUD_SIGMA,
  rule:
    `Compare the MEAN of one arm of ${BATCHES}x${GAMES} games against these bands. FAIL when two ` +
    `or more metrics are past ±${SIGMA} sd(arm), OR when any one is past ±${LOUD_SIGMA}. sd(arm) ` +
    `is MEASURED from ${ARMS} independent arms — do not recompute it as sd(batch)/sqrt(batches), ` +
    'which understates it by up to 1.5x (src/panel.ts).',
  engineRev,
  measuredAt: new Date().toISOString(),
  difficulties: Object.fromEntries(
    DIFFICULTIES.map((d) => {
      const c = cal[d];
      const b = bands[d];
      const h = heldOut[d];
      if (!c || !b || !h) throw new Error(`no calibration for ${d}`);
      return [
        d,
        {
          provenance: c.provenance,
          arms: c.arms,
          bands: b,
          reportedNotGated: {
            winRateUnderReferenceBot: h.winRateUnderReferenceBot,
            unfinishedGames: h.unfinished,
          },
        },
      ];
    }),
  ),
};

// Vacuity guards. A zero-width band gates on an interval of width zero; fewer than three arms is
// not a measurement of spread. Either would produce a file that looks authoritative and is not.
for (const [d, entry] of Object.entries(file.difficulties)) {
  if (entry.arms < 3) {
    console.error(`\nVACUITY: ${d} calibrated on ${entry.arms} arms. That is not a null distribution.`);
    process.exit(2);
  }
  for (const b of entry.bands) {
    if (!(b.sdArm > 0)) {
      console.error(`\nVACUITY: ${d}/${b.metric} has sd ${b.sdArm}. A zero-width band is not a band.`);
      process.exit(2);
    }
  }
}

const out = join(HERE, 'bands.json');
writeFileSync(out, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
const secs = Number(process.hrtime.bigint() - started) / 1e9;
console.log(`\nwrote ${out}`);
console.log(`done in ${secs.toFixed(1)}s`);

if (!selfClean) {
  console.error('\nThe held-out arm failed its own panel. Do not gate on these bands.');
  process.exit(1);
}
