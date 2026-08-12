/**
 * Calibrate the band against the MEASURED null, instead of deriving it from batch sd.
 *
 * K independent arms of the same size, same engine. The spread of their arm-means IS the null
 * distribution of the gate statistic — no assumption that batches are independent, no t-vs-z
 * question, no "SE of one arm judging another".
 */
import { GATED_METRICS, measure, valueOf, type GatedMetric } from './src/metrics.js';
import { loadLegacy, loadMutatedLegacy, type Mutation } from '@immunity-wars/equivalence/engine';

const BATCHES = 20;
const GAMES = 100;
const ARMS = 8;

const mean = (v: number[]): number => v.reduce((a, b) => a + b, 0) / v.length;
const sd = (v: number[]): number => {
  const mu = mean(v);
  return Math.sqrt(v.reduce((a, x) => a + (x - mu) ** 2, 0) / (v.length - 1));
};

const MUTS: Mutation[] = [
  {
    name: 'AP -1 per turn',
    find: 'const DIFF={ training:{ap:6,turns:15,spawn:"dice"}, normal:{ap:5,turns:20,spawn:"dice"}, hard:{ap:4,turns:30,spawn:"dice"} };',
    replace:
      'const DIFF={ training:{ap:5,turns:15,spawn:"dice"}, normal:{ap:4,turns:20,spawn:"dice"}, hard:{ap:3,turns:30,spawn:"dice"} };',
  },
  {
    name: 'brain integrity 2->1',
    find: 'brain:   { name:"Brain",       kind:"vital",   integrity:2, branch:3,',
    replace: 'brain:   { name:"Brain",       kind:"vital",   integrity:1, branch:3,',
  },
  {
    name: 'brain branch 3->4 (#17)',
    find: 'brain:   { name:"Brain",       kind:"vital",   integrity:2, branch:3,',
    replace: 'brain:   { name:"Brain",       kind:"vital",   integrity:2, branch:4,',
  },
];

for (const difficulty of ['normal', 'hard']) {
  console.log(`\n=== ${difficulty} — ${ARMS} independent arms of ${BATCHES}x${GAMES} ===`);

  const armMeans: Record<string, number[]> = {};
  const batchSd: Record<string, number[]> = {};
  for (const m of GATED_METRICS) {
    armMeans[m] = [];
    batchSd[m] = [];
  }
  for (let a = 0; a < ARMS; a += 1) {
    const run = measure(difficulty, BATCHES, GAMES, a * 1_000_000, loadLegacy());
    for (const m of GATED_METRICS) {
      const v = valueOf(run, m);
      armMeans[m]?.push(v.mean);
      batchSd[m]?.push(v.sd);
    }
  }

  console.log('metric              grand mean   TRUE sd(arm)   assumed SE=sd/sqrt(20)   ratio');
  const trueSd: Record<string, number> = {};
  for (const m of GATED_METRICS) {
    const means = armMeans[m] ?? [];
    const t = sd(means);
    const assumed = mean(batchSd[m] ?? []) / Math.sqrt(BATCHES);
    trueSd[m] = t;
    console.log(
      `  ${m.padEnd(18)} ${mean(means).toFixed(4).padStart(10)} ${t.toFixed(4).padStart(14)} ` +
        `${assumed.toFixed(4).padStart(22)}   ${(t / assumed).toFixed(2)}x`,
    );
  }

  console.log('\n  known changes, in units of the TRUE arm-to-arm sd:');
  for (const mut of MUTS) {
    const run = measure(difficulty, BATCHES, GAMES, 0, loadMutatedLegacy(mut));
    const cells: string[] = [];
    let n = 0;
    for (const m of GATED_METRICS) {
      const after = valueOf(run, m as GatedMetric).mean;
      const base = mean(armMeans[m] ?? []);
      const s = trueSd[m] ?? 0;
      const sig = s ? (after - base) / s : 0;
      if (Math.abs(sig) > 3) n += 1;
      cells.push(sig.toFixed(1).padStart(10));
    }
    console.log(`    ${mut.name.padEnd(26)}${cells.join('')}   breaches: ${n}`);
  }
}
