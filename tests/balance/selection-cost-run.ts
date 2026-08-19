/**
 * P2.1 — THE TWO CONDITIONS ON THE SELECTION-SCOPED RULING.
 *
 *   npx tsx tests/balance/selection-cost-run.ts          # 30 seeds x 3, every 12th state
 *   npx tsx tests/balance/selection-cost-run.ts 10 4     # a subset, denser sampling
 *
 * Condition 1 — MEASURE THE COMPUTE TRADE. A selection change is a tap. If every selection
 * rebuilds the whole view, payload was traded for compute. §1 and §2 below.
 *
 * Condition 2 — DOES THE SAME SCOPING APPLY TO `productionBreakdown`? §3 below. A mixed answer
 * is acceptable as long as it is stated rather than arrived at.
 *
 * REPORTS ONLY. Nothing gates on it, and the fallback is stated in advance: if a selection-
 * triggered update is expensive, the answer reverts to expose-two and the report says so.
 */

import { cpus } from 'node:os';

import { UI_QUERIES } from '@immunity-wars/equivalence/query-shapes';

import { seedAt } from './src/fidelity.js';
import { DIFFICULTIES, PORT, playGame } from './src/play.js';
import { distribution } from './src/size.js';
import { answersFor } from './src/query-payload.js';
import { productionSummary, timeSelection, type SelectionTimings } from './src/selection-cost.js';
import { sizeOf } from './src/size.js';
import { CELL_KEYS, FAMILIES } from '@immunity-wars/equivalence/query-shapes';

const SEEDS = Number(process.argv[2] ?? 30);
const EVERY = Number(process.argv[3] ?? 12);

/** The 20 queries that are neither of the two the decision is about. */
const REST = UI_QUERIES.filter((n) => n !== 'moveDestinations' && n !== 'productionBreakdown');

const us = (ns: number): string => (ns / 1000).toFixed(1).padStart(8);
const pct = (n: number): string => `${(n * 100).toFixed(1)}%`;

const timings: SelectionTimings[] = [];
interface PayloadRow {
  view: number;
  scoped: number;
  exposeTwo: number;
  precomputeAll: number;
  prodSummary: number;
  prodDetailAll: number;
}
const payloads: PayloadRow[] = [];

let seen = 0;
for (const difficulty of DIFFICULTIES) {
  for (let i = 0; i < SEEDS; i += 1) {
    playGame({
      seed: seedAt(i),
      difficulty,
      engine: PORT,
      onAction: (g) => {
        if (g.phase !== 'command') return;
        seen += 1;
        if (seen % EVERY !== 0) return;
        timings.push(timeSelection(PORT, g, difficulty, REST));

        const ns = PORT as unknown as Record<string, unknown>;
        const md = ns['moveDestinations'] as (s: typeof g, c: string) => unknown;
        const pbf = ns['productionBreakdown'] as (
          s: typeof g,
          f: string,
        ) => Record<string, unknown>;

        const restBlock: Record<string, unknown> = {};
        for (const n of REST) restBlock[n] = answersFor(ns, n, g).value;
        const rest = sizeOf(restBlock).utf8;

        const mdAll = sizeOf(CELL_KEYS.map((c) => md(g, c))).utf8;
        const mdOne = sizeOf(md(g, CELL_KEYS[0] ?? 'macrophage')).utf8;
        const pbAll = sizeOf(FAMILIES.map((f) => pbf(g, f))).utf8;
        const pbSum = sizeOf(FAMILIES.map((f) => productionSummary(pbf(g, f)))).utf8;
        const pbOne = sizeOf(pbf(g, FAMILIES[0] ?? 'ENV')).utf8;

        payloads.push({
          view: sizeOf(PORT.viewState(g)).utf8,
          // Selection-scoped: one cell's destinations, the production SUMMARY for all seven
          // families, one family's detail (the open tooltip), and the other 20 precomputed.
          scoped: mdOne + pbSum + pbOne + rest,
          // Expose-two: both dominant queries behind Session, the other 20 precomputed.
          exposeTwo: rest,
          precomputeAll: mdAll + pbAll + rest,
          prodSummary: pbSum,
          prodDetailAll: pbAll,
        });
      },
    });
  }
}

if (timings.length === 0) {
  console.error('VACUITY: 0 states timed. This is not a report.');
  process.exit(2);
}

const line = '='.repeat(95);
const cpu = cpus()[0]?.model ?? 'unknown CPU';
console.log(line);
console.log('P2.1 — SELECTION-SCOPED VIEW: THE COMPUTE TRADE, AND productionBreakdown');
console.log(line);
console.log(`device: Node ${process.version} on ${cpu}`);
console.log(`        NOT a handset. §4's screening pass is this machine under 4-6x throttling.`);
console.log(
  `sampled: ${timings.length} command-phase states, every ${EVERY}th, ${SEEDS} seeds x 3\n`,
);

// -----------------------------------------------------------------------------------------------
console.log('-- 1. WHAT A SELECTION CHANGE COSTS ------------------------------------------------');
console.log('   Microseconds. The DATA half only — no React, no layout, no paint, none of which');
console.log('   exist yet. The §4 redraw budget is 16ms ideal / 32ms max for ALL of it.\n');

const cols: [string, (t: SelectionTimings) => number][] = [
  ['viewState(g) — full rebuild', (t) => t.viewStateNs],
  ['moveDestinations, 1 cell', (t) => t.oneCellNs],
  ['moveDestinations, all 7', (t) => t.sevenCellsNs],
  ['production summary, 7 fams', (t) => t.prodSummaryNs],
  ['production detail, 1 fam', (t) => t.prodDetailOneNs],
  ['production detail, all 7', (t) => t.prodDetailAllNs],
  ['the other 20 queries', (t) => t.restNs],
];
console.log('                                    p50us    p90us    p99us     maxus');
for (const [label, get] of cols) {
  const d = distribution(timings.map(get));
  console.log(`  ${label.padEnd(30)} ${us(d.p50)} ${us(d.p90)} ${us(d.p99)} ${us(d.max)}`);
}
console.log('');

// -----------------------------------------------------------------------------------------------
console.log('-- 2. THE TRADE, AGAINST THE §4 BUDGET ---------------------------------------------');
const scopedNs = timings.map(
  (t) => t.viewStateNs + t.oneCellNs + t.prodSummaryNs + t.prodDetailOneNs + t.restNs,
);
const allNs = timings.map((t) => t.viewStateNs + t.sevenCellsNs + t.prodDetailAllNs + t.restNs);
const sc = distribution(scopedNs);
const ac = distribution(allNs);
const BUDGET_MS = 16;
const ms = (ns: number): string => (ns / 1e6).toFixed(3);

console.log('   A selection change under the ruling rebuilds the projection and recomputes the');
console.log('   selection-scoped parts. That total, against the ideal 16ms redraw budget:\n');
console.log(
  `   selection-scoped rebuild   p50 ${ms(sc.p50)}ms  p90 ${ms(sc.p90)}ms  p99 ${ms(sc.p99)}ms  max ${ms(sc.max)}ms`,
);
console.log(
  `   precompute-everything      p50 ${ms(ac.p50)}ms  p90 ${ms(ac.p90)}ms  p99 ${ms(ac.p99)}ms  max ${ms(ac.max)}ms`,
);
console.log('');
console.log(
  `   share of the 16ms budget   p50 ${pct(sc.p50 / (BUDGET_MS * 1e6))}  p99 ${pct(sc.p99 / (BUDGET_MS * 1e6))}  max ${pct(sc.max / (BUDGET_MS * 1e6))}`,
);
console.log(
  `   at 6x slower (§4 screening) p50 ${pct((sc.p50 * 6) / (BUDGET_MS * 1e6))}  p99 ${pct((sc.p99 * 6) / (BUDGET_MS * 1e6))}  max ${pct((sc.max * 6) / (BUDGET_MS * 1e6))}`,
);
console.log('');

const verdictCheap = (sc.p99 * 6) / (BUDGET_MS * 1e6) < 0.25;
console.log(
  `   VERDICT: a selection-triggered rebuild is ${verdictCheap ? 'CHEAP' : 'NOT CHEAP'} — the condition is ${verdictCheap ? 'MET' : 'NOT met'}.`,
);
if (!verdictCheap) {
  console.log('   The stated fallback applies: revert to expose-two, and say so.');
}
console.log('');

// -----------------------------------------------------------------------------------------------
console.log('-- 3. CONDITION 2 — DOES SCOPING APPLY TO productionBreakdown? ---------------------');
console.log('   Read from v2_ui.html, not guessed. Two call sites (717, 1900) map over ALL');
console.log('   families and read net/boosted/reduced only. The other six fields are read by');
console.log('   exactly one function — prodBreakdownHTML (1923) — which renders a TOOLTIP.\n');

const psum = distribution(payloads.map((p) => p.prodSummary));
const pall = distribution(payloads.map((p) => p.prodDetailAll));
console.log(
  `   summary {net,boosted,reduced} x 7 families   p50 ${psum.p50.toFixed(0)}B  p90 ${psum.p90.toFixed(0)}B`,
);
console.log(
  `   full breakdown x 7 families                  p50 ${pall.p50.toFixed(0)}B  p90 ${pall.p90.toFixed(0)}B`,
);
console.log(
  `   the summary is ${pall.p50 ? pct(psum.p50 / pall.p50) : 'n/a'} of the full object's bytes`,
);
console.log('');
console.log('   ANSWER: the scoping applies, but to FIELDS rather than to subjects. The summary');
console.log('   is needed for all seven families at once and is small. The detail is needed for');
console.log('   one family at a time — the open tooltip — and is where the bytes are. That is');
console.log('   the same insight the ruling rests on, one level down: expensive is answering in');
console.log('   FULL for every possible subject at once.');
console.log('   So productionBreakdown does NOT need exposing.\n');

// -----------------------------------------------------------------------------------------------
console.log('-- 4. PAYLOAD, ALL THREE OPTIONS SIDE BY SIDE --------------------------------------');
const v = distribution(payloads.map((p) => p.view));
const opts: [string, (p: PayloadRow) => number][] = [
  ['precompute everything', (p) => p.precomputeAll],
  ['selection-scoped (the ruling)', (p) => p.scoped],
  ['expose-two', (p) => p.exposeTwo],
];
console.log(`   viewState p50 ${v.p50.toFixed(0)}B\n`);
console.log('                                    p50B     p90B    % of viewState p50');
for (const [label, get] of opts) {
  const d = distribution(payloads.map(get));
  console.log(
    `  ${label.padEnd(30)} ${d.p50.toFixed(0).padStart(7)} ${d.p90.toFixed(0).padStart(8)} ${pct(d.p50 / v.p50).padStart(16)}`,
  );
}
console.log('');
console.log('   Selection-scoped lands between the two, and buys something neither number shows:');
console.log('   the boundary rule stays absolute, so there is no exception to argue about when');
console.log('   Phase 3 puts a relay in the gap.');
