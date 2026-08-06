/**
 * Classify every uncovered branch and function against the Task B gate.
 *
 * docs/TASK_B_PLAN.md §1.5 requires each uncovered branch to be either given a scenario or
 * listed as unreachable WITH A REASON. That is a judgement per branch, but the judgement is
 * mostly determined by the SHAPE of the code, so the buckets below are assigned by explicit
 * rules rather than by eye — a hand-sorted list of 195 items is neither reviewable nor
 * reproducible.
 *
 *   node --import tsx tests/equivalence/classify-gaps.ts
 */

import { execSync } from 'node:child_process';

type Bucket =
  'defensive-fallback' | 'multiplayer-only' | 'error-guard' | 'bot-conditional' | 'needs-review';

interface Gap {
  file: string;
  line: number;
  kind: string;
  text: string;
  bucket: Bucket;
  why: string;
}

const raw = execSync('npx tsx tests/equivalence/uncovered.ts', {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

const gaps: Gap[] = [];
let file = '';
for (const l of raw.split(/\r?\n/)) {
  const h = /^### (.+)$/.exec(l);
  if (h && h[1]) {
    file = h[1];
    continue;
  }
  const m = /^\s+(\d+)\s+\[(\w+):[^\]]*\]\s+(.*)$/.exec(l);
  if (!m || !m[1] || !m[2]) continue;
  const line = Number(m[1]);
  const text = m[3] ?? '';
  gaps.push({ file, line, kind: m[2], text, ...classify(file, line, text) });
}

function classify(f: string, line: number, text: string): { bucket: Bucket; why: string } {
  // 1. MULTIPLAYER — the whole allocation block, and the AP plumbing that only branches when
  //    g.multiplayer is true. The corpus is single-player by scope.
  if (f.endsWith('ap.ts')) {
    return { bucket: 'multiplayer-only', why: 'AP plumbing only branches when multiplayer is on' };
  }
  if (f.endsWith('actions.ts') && line >= 82 && line <= 160) {
    return { bucket: 'multiplayer-only', why: 'allocateAP / returnAP / confirmAllocation block' };
  }
  if (/captain|apBudget|multiplayer|apPool/.test(text)) {
    return { bucket: 'multiplayer-only', why: 'reads multiplayer-only state' };
  }

  // 2. DEFENSIVE FALLBACK — the `?? 0` / `|| {}` arms. Most were introduced or made visible by
  //    B7: noUncheckedIndexedAccess required handling a miss that the surrounding guard has
  //    already made impossible, so the miss arm is provably dead.
  if (/\?\?|\|\|\s*(\{\}|\[\]|0\b|1\b|'')/.test(text)) {
    return {
      bucket: 'defensive-fallback',
      why: 'null-coalescing arm on a value the surrounding guard has already established',
    };
  }

  // 3. ERROR GUARD — an `if (!x) return err(...)` whose false arm the corpus never provokes
  //    because the fuzzer supplies well-formed actions for that path.
  if (/return err\(|=> false|return false;|return \[\];|return;/.test(text)) {
    return { bucket: 'error-guard', why: 'rejection path not provoked by the current generators' };
  }

  // 4. BOT-CONDITIONAL — inside simulate()'s inlined bot, reachable only when its heuristics
  //    encounter a specific board. FINDINGS #1: the bot plays ~6 of 14 seats.
  if (f.endsWith('simulate.ts')) {
    return { bucket: 'bot-conditional', why: "reachable only through simulate()'s own bot" };
  }

  return { bucket: 'needs-review', why: '' };
}

const order: Bucket[] = [
  'defensive-fallback',
  'multiplayer-only',
  'error-guard',
  'bot-conditional',
  'needs-review',
];

console.log('UNCOVERED BRANCH / FUNCTION CLASSIFICATION\n');
for (const b of order) {
  const inBucket = gaps.filter((g) => g.bucket === b);
  if (!inBucket.length) continue;
  const byFile = new Map<string, number>();
  for (const g of inBucket) byFile.set(g.file, (byFile.get(g.file) ?? 0) + 1);
  console.log(`## ${b}  —  ${inBucket.length}`);
  if (inBucket[0]?.why) console.log(`   ${inBucket[0].why}`);
  for (const [f, n] of [...byFile.entries()].sort((x, y) => y[1] - x[1])) {
    console.log(`     ${String(n).padStart(4)}  ${f.replace('packages/engine/src/', '')}`);
  }
  console.log('');
}

const review = gaps.filter((g) => g.bucket === 'needs-review');
if (review.length) {
  console.log('## needs-review, in full — these require a judgement each\n');
  let cur = '';
  for (const g of review) {
    if (g.file !== cur) {
      cur = g.file;
      console.log(`  ${cur.replace('packages/engine/src/', '')}`);
    }
    console.log(`    ${String(g.line).padStart(4)}  ${g.text.slice(0, 100)}`);
  }
}

console.log('');
console.log(`total gaps: ${gaps.length}`);
for (const b of order) {
  const n = gaps.filter((g) => g.bucket === b).length;
  const pct = ((n / gaps.length) * 100).toFixed(1);
  console.log(`  ${b.padEnd(20)} ${String(n).padStart(4)}  ${pct}%`);
}
