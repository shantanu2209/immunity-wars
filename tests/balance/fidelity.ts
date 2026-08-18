/**
 * E0a — bot fidelity, the deep tier.
 *
 *   npx tsx tests/balance/fidelity.ts          # 1000 seeds x 3 difficulties
 *   npx tsx tests/balance/fidelity.ts 50       # a subset
 *
 * The comparator lives in `src/fidelity.ts` and is shared with `src/fidelity.test.ts`, which runs
 * a small tier inside `pnpm test`. Same two-tier arrangement as the equivalence corpus and the
 * property suite, and for the same reason: the cheap tier stops the check rotting, the deep tier
 * is where the published claim comes from.
 *
 * What the outcome licenses is stated in `docs/TASK_E_PLAN.md` §5 E0a. In short: identical means
 * the generator is labelled `reference-bot v1` and FINDINGS' existing metric table stays a
 * comparable baseline; any divergence means `v1.1`, documented, and the comparability claim is
 * dropped.
 */

import { DIFFICULTIES } from './src/play.js';
import { comparatorControl, compareFidelity } from './src/fidelity.js';

const SEEDS = Number(process.argv[2] ?? 1000);

const control = comparatorControl();
if (control.length === 0) {
  console.error(
    'NEGATIVE CONTROL FAILED: the comparator reported no difference between two DIFFERENT\n' +
      'seeds. A clean fidelity run would therefore prove nothing. Fix the comparator before\n' +
      'reading any number below.',
  );
  process.exit(2);
}
console.log(
  `comparator control: differing seeds produce ${control.length} field mismatches — OK\n`,
);

console.log("E0a bot fidelity — harness bot vs simulate()'s inlined bot");
console.log(`${SEEDS} seeds x ${DIFFICULTIES.length} difficulties, identical seeded RNG\n`);

const started = process.hrtime.bigint();
const result = compareFidelity(DIFFICULTIES, SEEDS);
const secs = Number(process.hrtime.bigint() - started) / 1e9;

for (const d of DIFFICULTIES) {
  const row = result.perDifficulty[d];
  if (row) console.log(`${d.padEnd(9)} ${row.identical}/${row.total} identical`);
}
console.log(`\ncompared ${result.compared} games in ${secs.toFixed(1)}s`);

if (result.compared === 0) {
  console.error('\nVACUITY: 0 games compared. This is not a pass.');
  process.exit(2);
}

if (result.mismatched === 0) {
  console.log('\nVERDICT: identical on every seed tested.');
  console.log('  -> generator label: reference-bot v1');
  console.log("  -> FINDINGS' existing metric table remains a comparable baseline.");
  console.log(
    '\nLIMIT, stated: this shows the two procedures agree on the games these seeds reach.\n' +
      'A difference confined to a branch no seed reaches stays invisible — which is exactly\n' +
      "FINDINGS section 1.2's Neutrophil case, where the two bots' NET checks differ textually\n" +
      'and the guard above them is never true.',
  );
  process.exit(0);
}

console.log(`\nVERDICT: ${result.mismatched}/${result.compared} games DIVERGED.`);
console.log('  -> generator label: reference-bot v1.1, divergence documented');
console.log("  -> FINDINGS' existing metric table is NOT a comparable baseline.");
console.log('\nby field:');
for (const [k, v] of Object.entries(result.perField).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(6)}  ${k}`);
}
console.log('\nfirst examples:');
for (const e of result.examples) console.log(`  ${e}`);
process.exit(1);
