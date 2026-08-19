/**
 * THE DOCUMENTATION SWEEP, AS A CHECK RATHER THAN A HABIT.
 *
 *   pnpm docs:check
 *
 * ============================================================================================
 * WHY THIS IS A PROGRAM AND NOT A LINE IN A CHECKLIST
 * ============================================================================================
 *
 * `CLAUDE.md` said **"Current phase: Phase 1"** for the entire first session of Phase 2, and
 * `ROADMAP.md` showed Phase 1 in progress after it had closed. Nobody was misled badly and that
 * is the problem: a stale phase marker is not wrong enough to notice, so it survives, and the
 * document everyone reads first is the one nobody checks.
 *
 * The instruction that produced this file was explicit about the form: *"If any part of it can be
 * a check that fails, build that instead."* A sweep that depends on someone remembering to sweep
 * becomes the thirteenth documented-but-false claim in a repository that has found twelve.
 *
 * ============================================================================================
 * WHAT IT CHECKS, AND WHY EACH ONE IS THE FALSIFIABLE HALF OF SOMETHING
 * ============================================================================================
 *
 * 1. THE PHASE MARKER RESOLVES AND AGREES. `CLAUDE.md` names a current phase and a brief. The
 *    brief must exist, its `**Version:**` line must match the version `CLAUDE.md` claims, and
 *    `ROADMAP.md` must not still be describing an earlier phase as current. This is the exact
 *    defect that prompted the rule.
 *
 * 2. EVERY TEST PACKAGE APPEARS IN THE MANIFEST. `tests/suites.json` is the reconciliation
 *    between what the brief claimed and what is on disk, and the dashboard renders one row per
 *    entry. A new suite that never reaches it is invisible — the FINDINGS #37 shape, an inventory
 *    wrong by OMISSION rather than by overclaim, which reads as conservative and so attracts no
 *    suspicion.
 *
 * 3. EVERY RELATIVE MARKDOWN LINK RESOLVES. Cheap, and it catches the specific rot of a document
 *    that was renamed or a section that was promised and never written.
 *
 * WHAT IT DELIBERATELY DOES NOT CHECK: prose. Nothing here reads meaning. It checks the claims a
 * machine can falsify and leaves the rest to a person, rather than pretending a green run means
 * the documentation is true.
 *
 * Exit codes: 0 clean · 1 something is stale.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

const problems: string[] = [];
const note = (m: string): void => {
  problems.push(m);
};

const read = (p: string): string => readFileSync(join(REPO, p), 'utf8');

// --- 1. the phase marker -------------------------------------------------------------------------

const claude = read('CLAUDE.md');

const phaseLine = /\*\*Current phase:\s*Phase\s*(\d+)\*\*/.exec(claude);
const specLine = /Spec:\s*@docs\/PHASE(\d+)_BRIEF\.md\s*\(v([\d.]+)\)/.exec(claude);

if (!phaseLine) {
  note('CLAUDE.md has no "**Current phase: Phase N**" marker. Every other check here keys on it.');
} else if (!specLine) {
  note(
    'CLAUDE.md names a current phase but no "Spec: @docs/PHASEn_BRIEF.md (vX)". The marker and ' +
      'the spec it points at have to move together, and this check cannot compare them otherwise.',
  );
} else {
  const phase = phaseLine[1] ?? '';
  const specPhase = specLine[1] ?? '';
  const claimedVersion = specLine[2] ?? '';

  // The crisp invariant: the phase marker and the spec it names are the same phase.
  if (phase !== specPhase) {
    note(
      `CLAUDE.md's current-phase marker says Phase ${phase} but the spec it names is ` +
        `PHASE${specPhase}_BRIEF.md. One of the two was updated and the other was not.`,
    );
  } else if (!existsSync(join(REPO, `docs/PHASE${phase}_BRIEF.md`))) {
    note(`CLAUDE.md points at docs/PHASE${phase}_BRIEF.md, which does not exist.`);
  } else {
    const brief = read(`docs/PHASE${phase}_BRIEF.md`);
    const actual = /\*\*Version:\*\*\s*([\d.]+)/.exec(brief);
    if (!actual) {
      note(`docs/PHASE${phase}_BRIEF.md has no "**Version:**" line to check against CLAUDE.md.`);
    } else if (actual[1] !== claimedVersion) {
      note(
        `CLAUDE.md advertises PHASE${phase}_BRIEF.md v${claimedVersion}, but that file says ` +
          `v${actual[1]}. One of the two was updated and the other was not.`,
      );
    }
  }

  // ROADMAP must not still be calling an earlier phase the current one.
  const roadmap = read('ROADMAP.md');
  const inProgress = [
    ...roadmap.matchAll(/Phase\s*(\d+)[^\n]{0,80}?(in progress|current|underway)/gi),
  ];
  for (const m of inProgress) {
    if (Number(m[1]) < Number(phase)) {
      note(
        `ROADMAP.md still describes Phase ${m[1]} as "${m[2]}" while CLAUDE.md is on Phase ` +
          `${phase}: "${m[0].trim().slice(0, 80)}"`,
      );
    }
  }
}

// --- 2. every test package appears in the manifest ------------------------------------------------

interface Manifest {
  suites: { id: string; resultFile?: string }[];
  crossCutting?: { realisedIn?: string[] }[];
}
const manifest = JSON.parse(read('tests/suites.json')) as Manifest;
const manifestText = read('tests/suites.json');

const testDirs = readdirSync(join(REPO, 'tests')).filter((d) =>
  statSync(join(REPO, 'tests', d)).isDirectory(),
);
for (const dir of testDirs) {
  const pkgPath = join(REPO, 'tests', dir, 'package.json');
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  // A package with no test script runs nothing and owes the manifest nothing.
  if (!pkg.scripts?.['test']) continue;
  // `manifest` is the harness that CHECKS suites.json; it is not itself a suite.
  if (dir === 'manifest') continue;

  const named = manifestText.includes(`tests/${dir}/`) || manifest.suites.some((s) => s.id === dir);
  if (!named) {
    note(
      `tests/${dir} has a test script but never appears in tests/suites.json. ` +
        'A suite the manifest does not know about is invisible to the dashboard and to anyone ' +
        'reading what this repository proves — FINDINGS #37, an inventory wrong by omission.',
    );
  }
}

// --- 3. relative markdown links resolve -----------------------------------------------------------

const SWEEP = ['CLAUDE.md', 'README.md', 'ROADMAP.md'];
const docs = readdirSync(join(REPO, 'docs')).filter((f) => f.endsWith('.md'));
for (const d of docs) SWEEP.push(`docs/${d}`);
for (const p of [
  'tests/property/README.md',
  'tests/equivalence/README.md',
  'tests/balance/README.md',
]) {
  if (existsSync(join(REPO, p))) SWEEP.push(p);
}

const LINK = /\[[^\]]*\]\(([^)]+)\)/g;
for (const file of SWEEP) {
  const text = read(file);
  const base = dirname(join(REPO, file));
  for (const m of text.matchAll(LINK)) {
    const href = (m[1] ?? '').trim();
    if (!href || /^(https?:|mailto:|#)/.test(href)) continue;
    const target = href.split('#')[0] ?? '';
    if (!target) continue;
    if (!existsSync(resolve(base, target))) {
      note(`${file}: link to ${target} does not resolve`);
    }
  }
}

// --- report ---------------------------------------------------------------------------------------

console.log('='.repeat(95));
console.log('DOCUMENTATION SWEEP — the parts a machine can falsify');
console.log('='.repeat(95));
console.log(`  swept ${SWEEP.length} documents, ${testDirs.length} test packages\n`);

if (problems.length === 0) {
  console.log('  Phase marker resolves and agrees. Every test package is in the manifest.');
  console.log('  Every relative link resolves.');
  console.log(
    '\n  This says nothing about whether the PROSE is true. That is still a person`s job.',
  );
  process.exit(0);
}

for (const p of problems) console.log(`  !! ${p}`);
console.log(
  `\n${problems.length} stale claim(s). ${relative(REPO, REPO) || 'Fix them'} before the closing commit.`,
);
process.exit(1);
