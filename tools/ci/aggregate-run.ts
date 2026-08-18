/**
 * The aggregate gate's entry point — what the workflow actually runs.
 *
 *   node --import tsx tools/ci/aggregate-run.ts "$NEEDS" job-a job-b job-c
 *
 * Kept separate from `aggregate.ts` so the decision is importable without executing anything:
 * a module that calls `process.exit` at import time cannot be unit tested, which would defeat the
 * entire reason the logic lives in a script rather than a YAML expression.
 *
 * Exit codes: 0 green · 1 not green · 2 the check could not be made.
 */

import { aggregate, parseNeeds } from './aggregate.js';

const [rawNeeds, ...expected] = process.argv.slice(2);

if (!rawNeeds) {
  console.error("usage: aggregate-run.ts '<toJSON(needs)>' <expected-job>...");
  process.exit(2);
}

let needs: Record<string, { result?: string }>;
try {
  needs = parseNeeds(rawNeeds);
} catch (e) {
  console.error(`cannot parse needs: ${String(e)}`);
  process.exit(2);
}

const verdict = aggregate(needs, expected);

console.log('='.repeat(80));
console.log('CI AGGREGATE — every expected job must report success');
console.log('='.repeat(80));
for (const line of verdict.lines) console.log(line);
console.log('');

if (!verdict.green) {
  console.error(`BUILD IS NOT GREEN: ${verdict.reason}`);
  console.error(
    '\nA skipped or absent job is red here, deliberately. A check that did not happen is not a\n' +
      'check that passed, and a merge button that turns green because a job never ran is the\n' +
      'CI-shaped version of every blind check this project has found.',
  );
  process.exit(1);
}
console.log(`BUILD IS GREEN: ${verdict.reason}`);
