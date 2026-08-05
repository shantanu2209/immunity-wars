/**
 * Evidence for a DELIBERATE behaviour change.
 *
 * After Task B proved equivalence, a fix necessarily breaks it. That is fine, but "the corpus is
 * now red" is not evidence — it says a change happened, not that the RIGHT change happened.
 *
 * This runs the corpus and, for every game that now diverges, records which JSON paths differ.
 * A fix is confined if EVERY differing path matches the allow-list. Anything outside it is a
 * side effect, and the run reports it.
 *
 *   node --import tsx tests/equivalence/confined-change.ts '<path-prefix>' [games]
 */

import * as port from '@immunity-wars/engine';

import { tier } from './src/corpus.js';
import { diff } from './src/diff.js';
import { loadLegacy } from './src/engine.js';
import { installRng, restoreRng } from './src/rng.js';
import { botGame } from './src/bot.js';
import type { Engine, GameState } from './src/types.js';

const legacy = loadLegacy();
const portEngine = port as unknown as Engine;

const allowPrefixes = (process.argv[2] ?? '').split(',').filter(Boolean);
const limit = process.argv[3] ? Number(process.argv[3]) : 1500;

if (!allowPrefixes.length) {
  console.error('usage: confined-change.ts <allowed-path-prefix[,prefix...]> [games]');
  process.exit(2);
}

/** Play one game against an engine and return its final state. */
function play(E: Engine, seed: number, difficulty: string, maxTurns: number): GameState {
  installRng(seed);
  try {
    const g = E.newGame({ difficulty, science: false });
    botGame(E, g, (a) => E.applyAction(g, a), maxTurns);
    return g;
  } finally {
    restoreRng();
  }
}

const cases = tier('nightly').slice(0, limit);
console.log(`CONFINED-CHANGE CHECK — ${cases.length} games`);
console.log(`allowed to differ: ${allowPrefixes.join(', ')}\n`);

let changed = 0;
let identical = 0;
const outside = new Map<string, number>();
const insideCounts = new Map<string, number>();
const examples: string[] = [];

for (const c of cases) {
  const a = play(legacy, c.seed, c.difficulty, c.maxTurns);
  const b = play(portEngine, c.seed, c.difficulty, c.maxTurns);
  const diffs = diff(a, b, 400);
  if (diffs.length === 0) {
    identical += 1;
    continue;
  }
  changed += 1;
  for (const d of diffs) {
    const allowed = allowPrefixes.some((p) => d.path.startsWith(p));
    const bucket = allowed ? insideCounts : outside;
    bucket.set(d.path, (bucket.get(d.path) ?? 0) + 1);
    if (!allowed && examples.length < 5) {
      examples.push(`  seed ${c.seed} ${c.difficulty}: ${d.path}  legacy=${d.legacy}  port=${d.candidate}`);
    }
  }
}

console.log(`games identical to legacy : ${identical}`);
console.log(`games that changed        : ${changed}`);
console.log('');
console.log('PATHS THAT CHANGED (allowed):');
for (const [path, n] of [...insideCounts.entries()].sort((x, y) => y[1] - x[1])) {
  console.log(`  ${String(n).padStart(5)}x  ${path}`);
}
if (outside.size) {
  console.log('');
  console.log('PATHS THAT CHANGED OUTSIDE THE ALLOW-LIST — the fix has side effects:');
  for (const [path, n] of [...outside.entries()].sort((x, y) => y[1] - x[1]).slice(0, 20)) {
    console.log(`  ${String(n).padStart(5)}x  ${path}`);
  }
  console.log('');
  examples.forEach((e) => console.log(e));
}

console.log('');
console.log(outside.size === 0 ? 'CHANGE IS CONFINED' : `NOT CONFINED — ${outside.size} unexpected paths`);
process.exit(outside.size === 0 ? 0 : 1);
