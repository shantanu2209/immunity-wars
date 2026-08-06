/**
 * Enumerate every uncovered line and branch in `packages/engine/src`, with its source text.
 *
 * The Task B gate (docs/TASK_B_PLAN.md §1.5) is not just a percentage — it requires every
 * uncovered branch to be either given a scenario or listed as unreachable WITH A REASON. A
 * percentage alone cannot be acted on; this produces the list that can.
 *
 *   node --import tsx tests/equivalence/uncovered.ts [coverage-final.json]
 */

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

interface Loc {
  start: { line: number; column: number };
  end: { line: number; column: number };
}
interface FileCoverage {
  path: string;
  statementMap: Record<string, Loc>;
  branchMap: Record<string, { loc: Loc; type: string; locations: Loc[] }>;
  fnMap: Record<string, { name: string; decl: Loc; loc: Loc }>;
  s: Record<string, number>;
  b: Record<string, number[]>;
  f: Record<string, number>;
}

const file = process.argv[2] ?? 'coverage/coverage-final.json';
const data = JSON.parse(readFileSync(file, 'utf8')) as Record<string, FileCoverage>;

const sourceCache = new Map<string, string[]>();
function line(path: string, n: number): string {
  let src = sourceCache.get(path);
  if (!src) {
    try {
      src = readFileSync(path, 'utf8').split(/\r?\n/);
    } catch {
      src = [];
    }
    sourceCache.set(path, src);
  }
  return (src[n - 1] ?? '').trim();
}

interface Gap {
  file: string;
  line: number;
  kind: 'branch' | 'function' | 'statement';
  detail: string;
  text: string;
}

const gaps: Gap[] = [];

for (const fc of Object.values(data)) {
  const short = relative(process.cwd(), fc.path).replace(/\\/g, '/');
  // Type-only files emit no runtime code; a 0% row for them is an artefact, not a gap.
  if (Object.keys(fc.statementMap).length === 0) continue;

  for (const [id, counts] of Object.entries(fc.b)) {
    const meta = fc.branchMap[id];
    if (!meta) continue;
    counts.forEach((hits, i) => {
      if (hits > 0) return;
      const loc = meta.locations[i] ?? meta.loc;
      const n = loc.start.line;
      gaps.push({
        file: short,
        line: n,
        kind: 'branch',
        detail: `${meta.type} arm ${i}`,
        text: line(fc.path, n),
      });
    });
  }

  for (const [id, hits] of Object.entries(fc.f)) {
    if (hits > 0) continue;
    const meta = fc.fnMap[id];
    if (!meta) continue;
    const n = meta.decl.start.line;
    gaps.push({
      file: short,
      line: n,
      kind: 'function',
      detail: meta.name || '(anonymous)',
      text: line(fc.path, n),
    });
  }
}

gaps.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));

let current = '';
let branchGaps = 0;
let fnGaps = 0;
for (const g of gaps) {
  if (g.file !== current) {
    current = g.file;
    console.log(`\n### ${current}`);
  }
  if (g.kind === 'branch') branchGaps += 1;
  else fnGaps += 1;
  console.log(`  ${String(g.line).padStart(4)}  [${g.kind}: ${g.detail}]  ${g.text.slice(0, 108)}`);
}

console.log('');
console.log(`uncovered branch arms : ${branchGaps}`);
console.log(`uncovered functions   : ${fnGaps}`);
