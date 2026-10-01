/**
 * THE TURBO HASH GUARD — added at P2.5, after `pnpm verify` had been replaying a cached green
 * over a red suite for thirteen days (docs/FINDINGS.md #51).
 *
 * What went wrong: turbo's `test` task had no `dependsOn`, so a package's test hash covered
 * only its OWN files. `tests/equivalence` imports `@immunity-wars/content`; the content
 * geometry changed on 20 Aug 2026 (the A2 radialisation); `equivalence#test` kept reporting
 * `cache: HIT` and replaying a pass recorded before the change. A forced run was red. CI caught
 * it only because CI has no cache. `pnpm verify` — the thing "commit after verification" rests
 * on — was structurally blind to any change in a workspace dependency.
 *
 * The fix is the `^test` edge in turbo.json; THIS is the check that the edge exists, so it
 * cannot be quietly removed. Measured from turbo's own dry run, not from the config text:
 * for every workspace package with a `test` script, every workspace dependency that also has
 * a `test` script must appear among the task's dependencies. Its negative control lives in
 * `tools/ci/selftest.ts` (`turbo-test-hash`): the edge removed, this check must fire.
 *
 *   pnpm turbo:check     (inside pnpm verify)
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

interface Pkg {
  readonly name: string;
  readonly path: string;
}
interface PkgJson {
  readonly scripts?: Record<string, string>;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}
interface DryTask {
  readonly taskId: string;
  readonly dependencies?: readonly string[];
  readonly inputs?: Readonly<Record<string, string>>;
}

const run = (cmd: string): string =>
  execSync(cmd, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

const packages = (JSON.parse(run('pnpm -r ls --depth -1 --json')) as Pkg[]).filter(
  (p) => p.name !== 'immunity-wars',
);
const manifests = new Map<string, PkgJson>();
for (const p of packages) {
  manifests.set(p.name, JSON.parse(readFileSync(join(p.path, 'package.json'), 'utf8')) as PkgJson);
}
const hasTest = (name: string): boolean => Boolean(manifests.get(name)?.scripts?.['test']);
const workspaceDeps = (m: PkgJson): string[] =>
  Object.entries({ ...m.dependencies, ...m.devDependencies })
    .filter(([, v]) => v.startsWith('workspace:'))
    .map(([k]) => k);

const dry = JSON.parse(run('pnpm turbo run test --dry=json')) as { tasks: DryTask[] };
const depsOf = new Map(dry.tasks.map((t) => [t.taskId, new Set(t.dependencies ?? [])]));

let checked = 0;
const problems: string[] = [];
for (const [name, m] of manifests) {
  if (!hasTest(name)) continue;
  const task = depsOf.get(`${name}#test`);
  if (!task) {
    problems.push(`${name}#test is missing from turbo's dry run`);
    continue;
  }
  for (const dep of workspaceDeps(m)) {
    if (!hasTest(dep)) continue;
    checked += 1;
    if (!task.has(`${dep}#test`)) {
      problems.push(
        `TURBO TEST HASH BLIND: ${name}#test does not depend on ${dep}#test — a change in ` +
          `${dep} would replay a cached result for ${name}'s tests`,
      );
    }
  }
}

/**
 * FILES A TEST READS FROM OUTSIDE ITS OWN PACKAGE (docs/FINDINGS.md #108). Turbo hashes a test task
 * over its package's files, so the equivalence suite's reads of the original engine, the rulebook
 * document and the reachability report were invisible to its cache: a changed rulebook replayed a
 * cached green for the test that pins the library's why boxes to it word for word. They are declared
 * in `tests/equivalence/turbo.json`, and each must be in the task's hash.
 */
const OUTSIDE_READS: readonly [string, string][] = [
  ['@immunity-wars/equivalence', '../../tools/legacy/v2_engine.js'],
  ['@immunity-wars/equivalence', '../../docs/Immunity_Wars_Rulebook_v3_1.docx'],
  ['@immunity-wars/equivalence', '../../docs/CONTENT_REACHABILITY.md'],
  // The board's test (`packages/ui/src/board/clay.test.ts`) holds the page to numbers written in
  // Blender's two scripts and to the Clay manifest (docs/FINDINGS.md #112).
  ['@immunity-wars/ui', '../../tools/art-pipeline/clay/board.py'],
  ['@immunity-wars/ui', '../../tools/art-pipeline/clay/pieces.py'],
  ['@immunity-wars/ui', '../app/public/art/clay/manifest.json'],
];
const inputsOf = new Map(dry.tasks.map((t) => [t.taskId, t.inputs ?? {}]));
for (const [name, file] of OUTSIDE_READS) {
  if (!(file in (inputsOf.get(`${name}#test`) ?? {}))) {
    problems.push(
      `TURBO TEST HASH BLIND TO A FILE IT READS: ${name}#test reads ${file}, which is not in its ` +
        'hash, so a change to it would replay a cached result',
    );
  }
}

if (checked === 0) {
  // Vacuity guard: a run that checked no edge proves nothing.
  console.error('turbo:check examined no workspace edges — the package list or dry run is empty');
  process.exit(2);
}
if (problems.length > 0) {
  console.error('turbo:check FAILED');
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log(
  `turbo:check: ${checked} workspace test edges present in the task hash graph — a change in ` +
    'any dependency invalidates its dependents’ cached tests — and the ' +
    `${String(OUTSIDE_READS.length)} files tests read from outside their packages are in their hashes.`,
);
