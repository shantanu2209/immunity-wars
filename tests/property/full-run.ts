/**
 * The ≥10,000-game tier.
 *
 * `PHASE1_BRIEF.md` §9 requires the property suite to run at least 10,000 games without an
 * invariant violation. That is far too slow for `pnpm test`, so it lives here and is run on
 * demand, exactly as `tests/equivalence/full-corpus.ts` is. Wiring it into a CI tier is Task F's.
 *
 *   npx tsx tests/property/full-run.ts          # 10,000 games
 *   npx tsx tests/property/full-run.ts 500      # a subset
 *
 * Prints the per-invariant `checked` counts whether it passes or fails. A green run whose counts
 * include a zero is NOT a pass — it is an invariant that never had anything to look at, and the
 * exit code says so.
 */

import { ALL_INVARIANTS } from './src/invariants.js';
import { runGame, shrinkViolation } from './src/runner.js';

const DIFFICULTIES = ['training', 'normal', 'hard'];
const total = Number(process.argv[2] ?? 10000);
const perDifficulty = Math.ceil(total / DIFFICULTIES.length);

const checks: Record<string, number> = {};
for (const inv of ALL_INVARIANTS) checks[inv.id] = 0;
const emitted = new Set<string>();

let games = 0;
let states = 0;
const started = process.hrtime.bigint();

for (const difficulty of DIFFICULTIES) {
  for (let i = 0; i < perDifficulty; i += 1) {
    const seed = 810000 + i;
    const run = runGame({ seed, difficulty, maxTurns: 18 });
    games += 1;
    states += run.states;
    for (const [id, n] of Object.entries(run.checks)) checks[id] = (checks[id] ?? 0) + n;
    for (const a of run.emitted) emitted.add(a);

    if (run.violations.length > 0) {
      const report = shrinkViolation(run);
      console.error(`\n${report ? report.text : JSON.stringify(run.violations[0])}\n`);
      console.error(`failed after ${games} games`);
      process.exit(1);
    }

    if (games % 1000 === 0) {
      const secs = Number(process.hrtime.bigint() - started) / 1e9;
      console.log(`  ${games} games, ${states} states, ${secs.toFixed(1)}s`);
    }
  }
}

const secs = Number(process.hrtime.bigint() - started) / 1e9;
console.log(`\n${games} games, ${states} states, 0 violations, ${secs.toFixed(1)}s`);
console.log(`distinct actions applied: ${[...emitted].sort().join(' ')}`);
console.log('\nper-invariant checks:');
let vacuous = 0;
for (const inv of ALL_INVARIANTS) {
  const n = checks[inv.id] ?? 0;
  if (n === 0) vacuous += 1;
  console.log(`  ${n === 0 ? 'VACUOUS ' : '        '}${String(n).padStart(10)}  ${inv.id}`);
}

if (vacuous > 0) {
  console.error(
    `\n${vacuous} invariant(s) checked NOTHING. A check that never ran is not a check that passed.`,
  );
  process.exit(1);
}
