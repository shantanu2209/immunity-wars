/**
 * THE PIPELINE'S NEGATIVE CONTROLS — every gate demonstrated to fail.
 *
 *   npx tsx tools/ci/selftest.ts          # all controls
 *   npx tsx tools/ci/selftest.ts lint     # one, by id
 *
 * ============================================================================================
 * A CI PIPELINE THAT HAS NEVER GONE RED IS NOT KNOWN TO WORK.
 * ============================================================================================
 *
 * This project has found, ten times, that a check believed to be working was not. A CI pipeline is
 * the same kind of object and deserves the same treatment — except that "make it fail on purpose"
 * normally means pushing a broken commit, which leaves a red mark on the branch history forever
 * and tempts everyone to skip it.
 *
 * So each control here MUTATES A FILE IN THE WORKING TREE, runs one gate, requires it to fail
 * **with the right diagnostic**, and reverts. Nothing is committed and main never goes red.
 *
 * THE DIAGNOSTIC IS THE POINT, not the exit code. A gate that fails for the wrong reason has not
 * been demonstrated: `pnpm lint` exits non-zero if the config is broken, if a dependency is
 * missing, or if the file does not parse. Requiring the expected rule NAME in the output is what
 * separates "this gate caught my mutation" from "something went wrong".
 *
 * WHY NOT `git apply` PATCH FILES: a patch carries line context and rots the moment the
 * surrounding code moves, so the control quietly stops applying and the suite reports a
 * `did not apply` that everyone learns to ignore. A string replacement that must match exactly —
 * and is checked to have changed the file — cannot rot silently.
 *
 * NOT EVERY CONTROL IS A FAILURE CONTROL. A rule expressed only as "forbid X" is half-specified:
 * a rule that forbade everything would satisfy every fail-control ever aimed at it. Controls
 * marked `mustPass` mutate in a PERMITTED edge and require the gate to stay green. The ui/app
 * boundary needed one, and needed it for a real reason rather than a tidy one — see the field's
 * own comment.
 *
 * Exit codes: 0 every gate behaved as specified · 1 one did not · 2 the run could not be made.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

interface Control {
  readonly id: string;
  /** Why this gate exists at all — read by whoever sees this control go wrong. */
  readonly why: string;
  readonly file: string;
  /** Mutation. Must change the file; an inert control is worse than none. */
  readonly mutate: (text: string) => string;
  readonly gate: string;
  /**
   * A substring the failure output MUST contain — the rule name, not just "error".
   * Ignored when `mustPass` is set, because there is no failure output to search.
   */
  readonly expect: string;
  /**
   * Inverted control: the mutation is PERMITTED, and the gate must stay GREEN.
   *
   * Added at P2.1 for the ui/app boundary, and it is not symmetry for its own sake. A rule
   * expressed as "forbid X" is only half-specified: a rule that forbids everything satisfies
   * every fail-control ever pointed at it while making the permitted case unbuildable. That is
   * not hypothetical here — it was MEASURED during P2.1. `ui-app-no-unresolvable` reddens on an
   * import it cannot resolve, so before packages/ui declared its content dependency, the very
   * import docs/PHASE2_BRIEF.md v1.1 §3 calls legitimate came back red from the boundary gate.
   * A fail-only control set would have reported that rule as working perfectly.
   */
  readonly mustPass?: boolean;
}

const CONTROLS: readonly Control[] = [
  {
    id: 'typecheck',
    why: 'A type error anywhere in the workspace must stop the build.',
    file: 'packages/engine/src/index.ts',
    mutate: (t) => `${t}\nexport const _ctlTypeError: number = 'not a number';\n`,
    gate: 'pnpm typecheck',
    expect: 'TS2322',
  },
  {
    id: 'lint',
    why: '`!` is a lint error in engine — CLAUDE.md closes it as an escape hatch for noUncheckedIndexedAccess.',
    file: 'packages/engine/src/index.ts',
    mutate: (t) => `${t}\nexport function _ctlBang(xs: number[]): number {\n  return xs[0]!;\n}\n`,
    gate: 'pnpm lint',
    expect: 'no-non-null-assertion',
  },
  {
    id: 'boundaries-node',
    why: 'The engine must import no Node API. dependency-cruiser owns the import-graph half of the boundary.',
    file: 'packages/engine/src/index.ts',
    mutate: (t) => `import { readFileSync } from 'node:fs';\nvoid readFileSync;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'engine-no-node-builtins',
  },
  {
    id: 'boundaries-content',
    why: 'content must import nothing: the invariant is that content contains no logic.',
    file: 'packages/content/src/index.ts',
    mutate: (t) => `import { readFileSync } from 'node:fs';\nvoid readFileSync;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'content-no-node-builtins',
  },
  {
    id: 'boundaries-ui-engine',
    why: 'THE load-bearing half of seam 1: a UI written against applyAction is a fork nothing fails on until Phase 3 puts a network in that gap (docs/FINDINGS.md #39).',
    file: 'packages/ui/src/index.ts',
    // The relative reach across packages/. This is the spelling that RESOLVES, so it is the
    // one that reaches ui-app-no-engine; the bare specifier is the control below.
    mutate: (t) =>
      `import { applyAction } from '../../engine/src/index.js';\nvoid applyAction;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'ui-app-no-engine',
  },
  {
    id: 'boundaries-ui-engine-bare',
    why: 'MEASURED at P2.1: the package-specifier spelling does NOT reach ui-app-no-engine, because dependency-cruiser matches to.path against the RESOLVED path and an unresolved import has none. Without ui-app-no-unresolvable beside it, the more natural way to write the violation is the one that slips through.',
    file: 'packages/ui/src/index.ts',
    mutate: (t) => `import { applyAction } from '@immunity-wars/engine';\nvoid applyAction;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'ui-app-no-unresolvable',
  },
  {
    id: 'boundaries-ui-engine-tsx',
    why: 'P2.2 step 3: the first .tsx files entered packages/ui, and dependency-cruiser resolved only .js/.ts/.mjs/.cjs until the same change — a UI component was invisible to the exact gate built to watch the UI. This control proves the boundary fires INSIDE a .tsx file, so the extension list can never quietly regress.',
    file: 'packages/ui/src/board/Board.tsx',
    mutate: (t) =>
      `import { applyAction } from '../../../engine/src/index.js';\nvoid applyAction;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'ui-app-no-engine',
  },
  {
    id: 'boundaries-ui-content-permitted',
    why: 'The rule must permit what the brief says it permits. ui -> content is legitimate: content is validated data, not behaviour, which is exactly what content-stays-data and exports.test.ts jointly keep true. A boundary that also blocked this would be discovered by the first person to render an organ name.',
    file: 'packages/ui/src/index.ts',
    mutate: (t) => `import { ORGANS } from '@immunity-wars/content';\nvoid ORGANS;\n${t}`,
    gate: 'pnpm boundaries',
    expect: '(unused — mustPass control)',
    mustPass: true,
  },
  {
    id: 'turbo-test-hash',
    why: 'pnpm verify replayed a cached green over a red suite for thirteen days: with no ^test edge a test task hashes only its own package, so a change in a workspace dependency never invalidates it (docs/FINDINGS.md #51).',
    file: 'turbo.json',
    mutate: (t) => {
      const j = JSON.parse(t) as { tasks: Record<string, { dependsOn?: unknown }> };
      const test = j.tasks['test'];
      if (test) delete test.dependsOn;
      return `${JSON.stringify(j, null, 2)}
`;
    },
    gate: 'pnpm turbo:check',
    expect: 'TURBO TEST HASH BLIND',
  },
  {
    id: 'docs-phase-marker',
    why: 'CLAUDE.md said "Current phase: Phase 1" for the whole first session of Phase 2, and ROADMAP.md agreed with it. A stale phase marker is not wrong enough to notice, so it survives.',
    file: 'CLAUDE.md',
    mutate: (t) => t.replace('**Current phase: Phase 2**', '**Current phase: Phase 1**'),
    gate: 'pnpm docs:check',
    expect: 'but the spec it names is PHASE2_BRIEF.md',
  },
  {
    id: 'docs-dead-link',
    why: 'A link to a document that was renamed or never written reads exactly like one that resolves.',
    file: 'docs/PHASE2_BRIEF.md',
    mutate: (t) => t.replace('](PHASE2_INPUTS.md)', '](PHASE2_INPUTS_RENAMED.md)'),
    gate: 'pnpm docs:check',
    expect: 'does not resolve',
  },
  {
    id: 'docs-bad-inline-path',
    why: 'CLAUDE.md named packages/content/board/geometry.json in its hard rules; it has always been packages/content/src/board/. A code span is not a markdown link, so the link check could never have seen it.',
    file: 'CLAUDE.md',
    mutate: (t) =>
      t.replace(
        '`packages/content/src/board/geometry.json`',
        '`packages/content/board/geometry.json`',
      ),
    gate: 'pnpm docs:check',
    expect: 'which does not exist',
  },
  {
    id: 'format',
    why: 'Added at F0 after 21 files drifted out of style unnoticed. It fired on its own commit.',
    file: 'packages/engine/src/index.ts',
    mutate: (t) => `${t}\nexport const    _ctlBadFormat   =    1;\n`,
    gate: 'pnpm format:check',
    expect: 'Code style issues',
  },
  {
    id: 'manifest',
    why: 'Softening the reconciliation sentence must go red rather than reach the dashboard.',
    file: 'tests/suites.json',
    mutate: (t) => t.replace('There is no unit suite. ', ''),
    gate: 'npx vitest run --root tests/manifest',
    expect: 'reconciliation sentence verbatim',
  },
  {
    id: 'manifest-coupling',
    why: 'FINDINGS #45: a control expectation naming a renamed test title strands the control silently, and the harness cadence rule proved unpractised at P2.1. coupling.test.ts must redden the fast tier the moment an expectation and a title disagree.',
    file: 'tests/manifest/controls-data.ts',
    mutate: (t) =>
      t.replace(
        "'is five suites and three cross-cutting properties',\n      'records the absent unit suite as absent',",
        "'is four suites and three cross-cutting properties',\n      'records the absent unit suite as absent',",
      ),
    gate: 'npx vitest run --root tests/manifest',
    expect: 'no longer matches any test title',
  },
  {
    id: 'aggregate',
    why: 'The CI-shaped blind check: a green build because a needed job was SKIPPED.',
    file: 'tools/ci/aggregate.ts',
    // Make `skipped` count as success — the exact bug the naive YAML expression has.
    mutate: (t) =>
      t.replace(
        "if (result === 'success') {",
        "if (result === 'success' || result === 'skipped') {",
      ),
    gate: 'npx vitest run --root tools/ci',
    expect: 'SKIPPED job is not green',
  },
  {
    id: 'dashboard-caveat',
    why: 'A size figure published without its censoring row reads as an estimate. It is a floor.',
    file: 'tools/dashboard/render.ts',
    mutate: (t) => t.replace('This is a floor, not an estimate.', 'Measured state size.'),
    gate: 'npx vitest run --root tools/dashboard',
    expect: 'floor, not an estimate',
  },
];

/** Tracked-file status, used to prove the run restored everything it touched. */
function gitStatus(): string {
  return execSync('git status --porcelain', { cwd: REPO, encoding: 'utf8' }).trim();
}

const before = gitStatus();

const only = process.argv[2];
const selected = only ? CONTROLS.filter((c) => c.id === only) : CONTROLS;
if (selected.length === 0) {
  console.error(
    `unknown control ${JSON.stringify(only)}; known: ${CONTROLS.map((c) => c.id).join(', ')}`,
  );
  process.exit(2);
}

/** Run a gate. Returns combined output and whether it failed. */
function runGate(gate: string): { failed: boolean; output: string } {
  try {
    const out = execSync(gate, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { failed: false, output: out };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    return { failed: true, output: `${err.stdout ?? ''}\n${err.stderr ?? ''}` };
  }
}

console.log('='.repeat(95));
console.log('CI SELF-TEST — every gate made to fail on purpose, with the right diagnostic,');
console.log('              and, where a rule also PERMITS something, made to stay green on that');
console.log('='.repeat(95));
console.log('');

let problems = 0;
let ran = 0;

for (const control of selected) {
  const path = join(REPO, control.file);
  if (!existsSync(path)) {
    console.log(`✗ ${control.id.padEnd(20)} target file missing: ${control.file}`);
    problems += 1;
    continue;
  }
  const original = readFileSync(path, 'utf8');
  const mutated = control.mutate(original);

  if (mutated === original) {
    // An inert control is the worst outcome: it reports nothing wrong while checking nothing.
    console.log(`✗ ${control.id.padEnd(20)} THE MUTATION DID NOTHING — this control is inert`);
    console.log(`    ${control.file} no longer contains what the mutation looks for.`);
    problems += 1;
    continue;
  }

  ran += 1;
  let verdict: { failed: boolean; output: string };
  try {
    writeFileSync(path, mutated, 'utf8');
    verdict = runGate(control.gate);
  } finally {
    writeFileSync(path, original, 'utf8');
  }

  if (control.mustPass) {
    // Inverted: the mutation is legitimate and the gate must stay green.
    const ok = !verdict.failed;
    console.log(`${ok ? '✓' : '✗'} ${control.id.padEnd(28)} ${control.gate}`);
    if (ok) {
      console.log('    stayed green on a PERMITTED edge, as it must');
    } else {
      console.log(`    THE GATE WENT RED on something it is supposed to allow: ${control.why}`);
      console.log(`    ${verdict.output.split('\n').filter(Boolean).slice(-3).join('\n    ')}`);
      problems += 1;
    }
    continue;
  }

  const sawDiagnostic = verdict.output.includes(control.expect);
  const ok = verdict.failed && sawDiagnostic;
  console.log(`${ok ? '✓' : '✗'} ${control.id.padEnd(28)} ${control.gate}`);
  if (ok) {
    console.log(`    failed, and said "${control.expect}"`);
  } else if (!verdict.failed) {
    console.log(`    THE GATE PASSED. It did not notice: ${control.why}`);
    problems += 1;
  } else {
    console.log(
      `    failed, but WITHOUT "${control.expect}" — it may be failing for another reason`,
    );
    console.log(`    ${verdict.output.split('\n').filter(Boolean).slice(-3).join('\n    ')}`);
    problems += 1;
  }
}

// Restoration is verified rather than assumed: this script edits tracked files.
//
// Compared against the state BEFORE the run, not against "clean". Uncommitted work is the normal
// case for whoever runs this, and a check that cannot tell "I failed to restore your files" from
// "you had edits already" is a check that cries wolf until someone deletes it.
const after = gitStatus();
if (after !== before) {
  console.error('\nTHE WORKING TREE CHANGED ACROSS THIS RUN. Files may not have been restored.');
  console.error(`  before:\n${before || '    (clean)'}`);
  console.error(`  after:\n${after || '    (clean)'}`);
  console.error('\nRestore with: git checkout -- .');
  process.exit(2);
}

if (ran === 0) {
  console.error('\nVACUITY: no control ran. This is not a check.');
  process.exit(2);
}

console.log(`\n${ran} gate(s) exercised, working tree clean.`);
if (problems > 0) {
  console.error(
    `\n${problems} GATE(S) DID NOT BEHAVE AS SPECIFIED.\n` +
      'A gate that does not fire is a gate nobody has falsified — it will report green through\n' +
      'exactly the defect it was built to catch.',
  );
  process.exit(1);
}
console.log('Every gate behaved as specified: red where it must, green where it must.');
