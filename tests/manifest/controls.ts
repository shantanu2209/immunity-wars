/**
 * THE MANIFEST'S NEGATIVE CONTROLS, repeatable rather than done once by hand.
 *
 *   npx tsx tests/manifest/controls.ts
 *
 * `manifest.test.ts` asserts that `suites.json` is honest. This asserts that `manifest.test.ts`
 * would notice if it were not — the standing rule, that a check which has never failed is not
 * known to work.
 *
 * AND IT CHECKS THE SHAPE OF THE FAILURE, NOT ONLY THAT ONE HAPPENED. Each control names the
 * assertions it expects to redden. A mutation that reddens the whole suite proves only that the
 * file is read; a mutation that reddens exactly the assertion aimed at it proves the assertion is
 * load-bearing. That is the E0a rule — measure how strongly a control fires, and against what —
 * applied to a document instead of an engine.
 *
 * IT MUTATES A COMMITTED FILE. `suites.json` is backed up in memory, restored in a `finally`, and
 * the restoration is verified byte-for-byte before exit. If this script is killed mid-run, restore
 * with `git checkout tests/suites.json`.
 *
 * Not part of `pnpm test`: it shells out to vitest, and a suite that recursively runs itself is a
 * good way to make a test run take forever.
 *
 * Exit codes: 0 every control fired exactly as specified · 1 one did not.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const MANIFEST = join(REPO, 'tests', 'suites.json');

interface Control {
  readonly name: string;
  /** Applied to the manifest text. Must change it — an inert mutation is a control that lies. */
  readonly mutate: (text: string) => string;
  /** Substrings of the test titles this must redden. Exact set: no more, no fewer. */
  readonly expectFailing: readonly string[];
}

const CONTROLS: readonly Control[] = [
  {
    name: 'soften the pinned sentence — remove "There is no unit suite"',
    mutate: (t) => t.replace('There is no unit suite. ', ''),
    expectFailing: ['validates against the schema', 'carries the reconciliation sentence verbatim'],
  },
  {
    name: 'claim the unit suite exists after all',
    mutate: (t) =>
      t.replace('"status": "does-not-exist"', '"status": "realised-inside-other-suites"'),
    expectFailing: [
      'is four suites and three cross-cutting properties',
      'records the absent unit suite as absent',
    ],
  },
  {
    name: 'point a tier at a command that does not exist',
    mutate: (t) =>
      t.replace('"command": "pnpm test:property"', '"command": "pnpm test:nonexistent"'),
    expectFailing: ['names a real command for every tier of every suite'],
  },
  {
    name: 'overclaim negative controls — 7 becomes 99',
    mutate: (t) => t.replace('"negativeControls": 7,', '"negativeControls": 99,'),
    expectFailing: ['declares negative controls that exist, for every suite'],
  },
  {
    name: 'drop a brief §7 row entirely — serialisation',
    mutate: (t) => {
      const d = JSON.parse(t) as { crossCutting: { briefSuite: string }[] };
      d.crossCutting = d.crossCutting.filter((c) => c.briefSuite !== 'serialisation');
      return `${JSON.stringify(d, null, 2)}\n`;
    },
    expectFailing: [
      'accounts for every one of the brief §7 rows',
      'is four suites and three cross-cutting properties',
    ],
  },
  {
    name: 'blank out a doesNotProve field',
    mutate: (t) => {
      const d = JSON.parse(t) as { suites: { id: string; doesNotProve: string }[] };
      const corpus = d.suites.find((s) => s.id === 'equivalence-corpus');
      if (corpus) corpus.doesNotProve = 'N/A';
      return `${JSON.stringify(d, null, 2)}\n`;
    },
    expectFailing: [
      'states what each suite does not prove, substantively',
      'the corpus suite says plainly that agreement is not correctness',
    ],
  },
];

/** Run the manifest suite and return the titles of the tests that failed. */
function failingTests(): string[] {
  let raw: string;
  try {
    // `shell: true` because on Windows `npx` is a .cmd shim and execFileSync cannot exec it
    // directly. The root path is quoted so a checkout under a directory with spaces still works.
    raw = execFileSync(
      'npx',
      ['vitest', 'run', '--root', `"${join(REPO, 'tests', 'manifest')}"`, '--reporter=json'],
      { encoding: 'utf8', cwd: REPO, stdio: ['ignore', 'pipe', 'ignore'], shell: true },
    );
  } catch (e) {
    // vitest exits non-zero when tests fail, which is the normal case here.
    raw = String((e as { stdout?: string }).stdout ?? '');
  }
  const start = raw.indexOf('{');
  if (start < 0) throw new Error('vitest produced no JSON report');
  const report = JSON.parse(raw.slice(start)) as {
    testResults: { assertionResults: { fullName: string; status: string }[] }[];
  };
  return report.testResults
    .flatMap((f) => f.assertionResults)
    .filter((a) => a.status === 'failed')
    .map((a) => a.fullName);
}

const original = readFileSync(MANIFEST, 'utf8');
let problems = 0;
let ran = 0;

console.log('='.repeat(95));
console.log(
  "THE MANIFEST'S CONTROLS — each mutation must redden EXACTLY the assertions it targets",
);
console.log('='.repeat(95));
console.log('');

try {
  // The baseline. Without it, a control that "fires" might be firing on a suite already red.
  const baseline = failingTests();
  if (baseline.length > 0) {
    console.error('BASELINE IS NOT GREEN. Every control below would be meaningless.');
    for (const t of baseline) console.error(`  already failing: ${t}`);
    process.exit(1);
  }
  console.log('baseline: green\n');

  for (const control of CONTROLS) {
    ran += 1;
    const mutated = control.mutate(original);
    if (mutated === original) {
      console.log(`✗ ${control.name}`);
      console.log(
        '    THE MUTATION DID NOTHING — the file changed shape and this control is inert.',
      );
      problems += 1;
      continue;
    }
    writeFileSync(MANIFEST, mutated, 'utf8');
    const failed = failingTests();
    writeFileSync(MANIFEST, original, 'utf8');

    const matched = control.expectFailing.filter((want) => failed.some((f) => f.includes(want)));
    const unexpected = failed.filter(
      (f) => !control.expectFailing.some((want) => f.includes(want)),
    );
    const missing = control.expectFailing.filter((want) => !failed.some((f) => f.includes(want)));

    const ok = missing.length === 0 && unexpected.length === 0 && failed.length > 0;
    console.log(`${ok ? '✓' : '✗'} ${control.name}`);
    console.log(`    reddened ${failed.length}, expected ${control.expectFailing.length}`);
    for (const m of matched) console.log(`      fired:      ${m}`);
    for (const m of missing) console.log(`      DID NOT FIRE: ${m}`);
    for (const u of unexpected) console.log(`      UNEXPECTED:   ${u}`);
    if (!ok) problems += 1;
  }
} finally {
  writeFileSync(MANIFEST, original, 'utf8');
  const restored = readFileSync(MANIFEST, 'utf8');
  if (restored !== original) {
    console.error('\nFAILED TO RESTORE tests/suites.json. Run: git checkout tests/suites.json');
    process.exit(2);
  }
}

// The vacuity guard every instrument here carries.
if (ran === 0) {
  console.error('\nVACUITY: no controls ran. This is not a check.');
  process.exit(2);
}

console.log(`\n${ran} controls run, manifest restored byte-for-byte.`);
if (problems > 0) {
  console.error(
    `\n${problems} CONTROL(S) DID NOT BEHAVE AS SPECIFIED.\n` +
      'A control that does not fire means the assertion it targets is not load-bearing. A control\n' +
      'that fires too broadly means the assertion is not specific. Both are worth fixing before\n' +
      'trusting a green manifest.',
  );
  process.exit(1);
}
console.log('Every control fired on exactly the assertions it targets.');
