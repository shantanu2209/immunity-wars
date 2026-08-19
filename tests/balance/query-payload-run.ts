/**
 * P2.1 — THE QUERY-PAYLOAD REPORT. The measurement decision C turns on.
 *
 *   npx tsx tests/balance/query-payload-run.ts          # 120 seeds x 3 difficulties
 *   npx tsx tests/balance/query-payload-run.ts 20       # a subset
 *
 * Answers, on real mid-game states:
 *
 *   1. how many bytes a precomputing `ViewState` would carry for all 22 queries
 *   2. that as a percentage of the current `viewState`
 *   3. the DISTRIBUTION, not a mean, and per difficulty — Task E's discipline
 *   4. which individual queries dominate, since the answer may be "expose three, precompute
 *      nineteen" rather than all-or-nothing
 *
 * THE CENSORING TABLE COMES FIRST, for E1's reason. §5 then measures WHICH WAY the censoring
 * cuts rather than assuming it — and the answer turned out to be the opposite of what was
 * expected when this was written. See the module header of src/query-payload.ts.
 */

import { seedAt } from './src/fidelity.js';
import { DIFFICULTIES, PORT, playGame } from './src/play.js';
import { turnWindow } from './src/size-collect.js';
import { censoring, distribution, fitLine } from './src/size.js';
import { samplePrecompute, type PrecomputeSample } from './src/query-payload.js';

const SEEDS = Number(process.argv[2] ?? 120);

const pct = (n: number): string => `${(n * 100).toFixed(1)}%`;
const b = (n: number): string => n.toFixed(0).padStart(7);

const samples: PrecomputeSample[] = [];
const endTurns = new Map<string, number[]>();
const missingEver = new Set<string>();

for (const difficulty of DIFFICULTIES) {
  const ends: number[] = [];
  for (let i = 0; i < SEEDS; i += 1) {
    const seed = seedAt(i);
    const rec = playGame({
      seed,
      difficulty,
      engine: PORT,
      onAction: (g) => {
        // Command phase only. That is when the UI is deciding what is clickable, which is the
        // only moment a precomputed answer would be read — sampling the spread phase would
        // average in states no player ever taps on.
        if (g.phase !== 'command') return;
        const { sample, missing } = samplePrecompute(PORT, g, seed, difficulty);
        for (const m of missing) missingEver.add(m);
        samples.push(sample);
      },
    });
    ends.push(rec.endTurn);
  }
  endTurns.set(difficulty, ends);
}

if (samples.length === 0) {
  console.error('VACUITY: 0 states sampled. This is not a report.');
  process.exit(2);
}
if (missingEver.size > 0) {
  console.error(`THE ENGINE DOES NOT PUBLISH: ${[...missingEver].join(', ')}`);
  console.error('A missing query would be counted as costing nothing. Fix before reading on.');
  process.exit(2);
}

const line = '='.repeat(95);
console.log(line);
console.log('P2.1 — PRECOMPUTED QUERY PAYLOAD vs viewState');
console.log(line);
console.log(`generator: reference bot v1 · ${SEEDS} seeds x ${DIFFICULTIES.length} difficulties`);
console.log(`sampled: ${samples.length} command-phase states · 22 queries each\n`);

// -----------------------------------------------------------------------------------------------
console.log('-- 1. CENSORING — everything below is conditional on this --------------------------');
console.log('   The bot dies early, so these are early, small-board states. Section 5 measures');
console.log('   which way that biases the ratio; do not assume it — the guess was backwards.\n');
console.log('            longest legal   bot mean end turn   window reached');
for (const d of DIFFICULTIES) {
  const w = turnWindow(d);
  const c = censoring(d, w, endTurns.get(d) ?? []);
  console.log(
    `  ${d.padEnd(10)} ${String(w.longestLegalGame).padStart(11)} ${c.meanEndTurn.toFixed(1).padStart(17)} ${pct(c.fractionOfWindow).padStart(16)}`,
  );
}
console.log('');

// -----------------------------------------------------------------------------------------------
console.log(
  '-- 2. THE HEADLINE — precompute block as a share of viewState -----------------------',
);
console.log('   utf8 bytes. The block is PARALLEL-ARRAY encoded: the smallest plausible');
console.log('   precompute, chosen so a result against option B is not an encoding artefact.\n');
console.log('                        viewState                 precompute block          ratio');
console.log('              p50     p90     p99     p50     p90     p99          p50     p90');

const rows: { d: string; ratios: number[] }[] = [];
for (const d of [...DIFFICULTIES, 'ALL']) {
  const s = d === 'ALL' ? samples : samples.filter((x) => x.difficulty === d);
  if (s.length === 0) continue;
  const v = distribution(s.map((x) => x.view.utf8));
  const q = distribution(s.map((x) => x.block.utf8));
  const ratios = s.map((x) => x.block.utf8 / x.view.utf8);
  const r = distribution(ratios);
  rows.push({ d, ratios });
  console.log(
    `  ${d.padEnd(9)} ${b(v.p50)} ${b(v.p90)} ${b(v.p99)} ${b(q.p50)} ${b(q.p90)} ${b(q.p99)}   ${pct(r.p50).padStart(8)} ${pct(r.p90).padStart(7)}`,
  );
}
console.log('');

const all = samples.map((x) => x.block.utf8 / x.view.utf8);
const allD = distribution(all);
console.log(
  `  ratio across every state:  p50 ${pct(allD.p50)}  p90 ${pct(allD.p90)}  p99 ${pct(allD.p99)}  max ${pct(allD.max)}`,
);
const keyed = distribution(samples.map((x) => x.keyedOverhead));
console.log(
  `  id-keyed encoding would ADD: p50 ${keyed.p50.toFixed(0)}B  p90 ${keyed.p90.toFixed(0)}B  — the realistic encoding is larger than the one measured`,
);
console.log('');

// -----------------------------------------------------------------------------------------------
console.log(
  '-- 3. GZIP — what a relay would actually put on the wire ----------------------------',
);
const vg = distribution(samples.map((x) => x.view.gzip));
const qg = distribution(samples.map((x) => x.block.gzip));
const rg = distribution(samples.map((x) => x.block.gzip / x.view.gzip));
console.log(`   viewState  gzip  p50 ${vg.p50.toFixed(0)}B  p90 ${vg.p90.toFixed(0)}B`);
console.log(`   block      gzip  p50 ${qg.p50.toFixed(0)}B  p90 ${qg.p90.toFixed(0)}B`);
console.log(`   ratio            p50 ${pct(rg.p50)}  p90 ${pct(rg.p90)}`);
console.log('   Precomputed answers are highly repetitive (booleans, repeated small arrays), so');
console.log('   compression flatters them more than it flatters the view. Both are reported.\n');

// -----------------------------------------------------------------------------------------------
console.log('-- 4. WHICH QUERIES DOMINATE -------------------------------------------------------');
console.log('   Median utf8 bytes per query, and share of the block. This is the column that');
console.log(
  '   decides whether the answer is all-or-nothing or "expose N, precompute the rest".\n',
);

const names = Object.keys(samples[0]?.perQuery ?? {});
const perQuery = names
  .map((n) => {
    const vals = samples.map((s) => s.perQuery[n] ?? 0);
    const d = distribution(vals);
    return { n, p50: d.p50, p90: d.p90, mean: d.mean };
  })
  .sort((a, x) => x.mean - a.mean);

const meanBlock = distribution(samples.map((s) => s.block.utf8)).mean;
let cumulative = 0;
console.log('                              p50B     p90B     share   cumulative');
for (const q of perQuery) {
  const share = q.mean / meanBlock;
  cumulative += share;
  console.log(
    `  ${q.n.padEnd(24)} ${b(q.p50)} ${b(q.p90)}   ${pct(share).padStart(7)} ${pct(cumulative).padStart(11)}`,
  );
}
const envelope = 1 - cumulative;
console.log('');
console.log(
  `  The ${pct(envelope)} unaccounted for is the JSON envelope — 22 key names, braces and commas.`,
);
console.log('  It is charged to no single query and would be paid by any precompute at all.');
console.log('');

// -----------------------------------------------------------------------------------------------
console.log('-- 5. THE EXPOSE-N FRONTIER --------------------------------------------------------');
console.log('   If the N most expensive queries went behind a Session method instead, what would');
console.log('   precomputing the REST cost? This is the column that decides whether the answer is');
console.log('   all-or-nothing.\n');
console.log('    N   exposed via Session                     residual block   as % of viewState');

const medianView = distribution(samples.map((x) => x.view.utf8)).p50;
for (const n of [0, 1, 2, 3, 5]) {
  const exposed = perQuery.slice(0, n).map((q) => q.n);
  const residual = samples.map((s) => {
    let total = s.block.utf8;
    for (const name of exposed) total -= s.perQuery[name] ?? 0;
    return total;
  });
  const d = distribution(residual);
  const label = n === 0 ? '(none — precompute all 22)' : exposed.join(', ');
  console.log(
    `   ${String(n).padStart(2)}   ${label.slice(0, 38).padEnd(38)} ${b(d.p50)}B ${pct(d.p50 / medianView).padStart(17)}`,
  );
}
console.log('');
console.log('   Residual is p50 utf8 bytes; the viewState denominator is its own p50, so this is');
console.log('   a ratio of medians rather than a median of ratios — quoted to compare options,');
console.log('   not to size a wire. Section 2 carries the per-state ratio distribution.\n');

// -----------------------------------------------------------------------------------------------
console.log(
  '-- 6. IS THE MEASURED RATIO A FLOOR? Fitted, not asserted ---------------------------',
);
console.log('   bytes vs invader count. This decides which way the censoring above biases the');
console.log('   ratio. It was written expecting a floor; the slopes below say otherwise.\n');

const vFit = fitLine(samples.map((s) => [s.invaders, s.view.utf8] as const));
const qFit = fitLine(samples.map((s) => [s.invaders, s.block.utf8] as const));
const inv = distribution(samples.map((s) => s.invaders));
console.log(`   invaders in sampled states: p50 ${inv.p50}  p90 ${inv.p90}  max ${inv.max}`);
console.log(`   viewState        ${vFit.slope.toFixed(1).padStart(8)} bytes per invader`);
console.log(`   precompute block ${qFit.slope.toFixed(1).padStart(8)} bytes per invader`);
console.log(
  `   the block grows ${vFit.slope === 0 ? 'n/a' : (qFit.slope / vFit.slope).toFixed(2)}x as fast per invader`,
);
console.log('');

// A projection, clearly labelled as one. Extrapolating a fitted line beyond the sampled range is
// exactly what E1 refuses to do silently, so it is reported as an extrapolation and nothing here
// gates on it.
const target = Math.max(inv.max * 2, 20);
const vAt = vFit.intercept + vFit.slope * target;
const qAt = qFit.intercept + qFit.slope * target;
const steeper = qFit.slope > vFit.slope;
console.log(
  `   => the measured ratio is ${steeper ? 'a FLOOR' : 'a CEILING'}: as the board fills the ratio ${steeper ? 'RISES' : 'FALLS'},`,
);
console.log(
  `      so the bot's small states ${steeper ? 'UNDERSTATE' : 'OVERSTATE'} the ratio a full 45-turn game would show.`,
);
console.log(
  '      The ABSOLUTE block size is what survives this: the two queries that dominate it are',
);
console.log('      per-cell and per-family, not per-invader, so they barely move.\n');
console.log(
  `   EXTRAPOLATION, not a measurement — at ${target} invaders the fitted lines give a ratio of ${pct(qAt / vAt)}`,
);
console.log(
  `   against ${pct(allD.p50)} measured at p50. The sampled range tops out at ${inv.max}`,
);
console.log('   invaders, so this is outside it and is quoted to size the caveat, not the wire.\n');

console.log(line);
console.log('WHAT THIS DOES AND DOES NOT SETTLE');
console.log(line);
console.log('  Settles: the size of option B, on real states, with its distribution and its');
console.log('           per-query decomposition.');
console.log('  Does NOT settle: the COMPUTE cost of precomputing 22 answers per action, which is');
console.log('           a §4 per-redraw budget question, not a payload one. And it says nothing');
console.log('           about option A`s cost in Phase 3, where each exposed query is a round');
console.log('           trip or a client-side answer over a view that does not carry the deck.');
