/**
 * The FULL corpus run — the nightly tier from docs/TASK_B_PLAN.md §4.
 *
 * Not a vitest suite: it is a long job with progress output, run on demand before a checkpoint
 * is declared and nightly in CI. The per-push tier is a strict subset of it.
 *
 *   node --import tsx tests/equivalence/full-corpus.ts [seedCount]
 */

import * as port from '@immunity-wars/engine';

import { tier } from './src/corpus.js';
import { loadLegacy } from './src/engine.js';
import { checkGame, type EngineFactory } from './src/rig.js';
import { shrink } from './src/shrink.js';
import type { Engine } from './src/types.js';

const legacyFactory: EngineFactory = () => loadLegacy();
const portFactory: EngineFactory = () => port as unknown as Engine;

const cases = tier('nightly');
const limit = process.argv[2] ? Number(process.argv[2]) : cases.length;
const run = cases.slice(0, limit);

console.log(`FULL CORPUS — ${run.length} recorded bot games (nightly tier)`);
console.log(`legacy vs @immunity-wars/engine, comparing state + rng draws + result per action\n`);

const t0 = Date.now();
let done = 0;
const failures: string[] = [];

for (const c of run) {
  const divergence = checkGame(legacyFactory, portFactory, c.seed, c.difficulty, c.maxTurns);
  done += 1;
  if (divergence) {
    const report = shrink(legacyFactory, portFactory, divergence, 300);
    failures.push(report.text);
    console.log(`\n${report.text}\n`);
    // Collect a handful rather than stopping dead, so one run fixes several bugs.
    if (failures.length >= 5) break;
  }
  if (done % 250 === 0) {
    const secs = (Date.now() - t0) / 1000;
    console.log(
      `  ${String(done).padStart(5)}/${run.length}  ${secs.toFixed(0)}s elapsed  ` +
        `${((done / secs) * 60).toFixed(0)} games/min  failures: ${failures.length}`,
    );
  }
}

const secs = (Date.now() - t0) / 1000;
console.log('');
console.log(`games          : ${done}`);
console.log(`wall time      : ${(secs / 60).toFixed(1)} min  (${(secs / done).toFixed(3)} s/game)`);
console.log(`divergences    : ${failures.length}`);
console.log(
  failures.length === 0 ? '\nFULL CORPUS CLEAN' : `\nFULL CORPUS FAILED (${failures.length} shown)`,
);
process.exit(failures.length === 0 ? 0 : 1);
