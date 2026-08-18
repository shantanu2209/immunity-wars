/**
 * E1 — the serialised-state-size report.
 *
 *   npx tsx tests/balance/size-run.ts          # 200 seeds x 3 (distribution), 60 x 3 (envelope)
 *   npx tsx tests/balance/size-run.ts 40 20    # a subset
 *
 * THE CENSORING TABLE COMES FIRST, and that is not a presentational choice. Every number below it
 * is conditional on it: the reference bot dies long before the game gets big, so the sampled
 * states are systematically the small ones, and everything here is a FLOOR.
 */

import { seedAt } from './src/fidelity.js';
import { DIFFICULTIES, PORT } from './src/play.js';
import { collectDistribution, collectEnvelope, turnWindow } from './src/size-collect.js';
import { fullDeckEnvelope, invaderCurve } from './src/size-envelope.js';
import { censoring, distribution, fitLine, percentileRank, type StateSample } from './src/size.js';

const SEEDS = Number(process.argv[2] ?? 200);
const ENVELOPE_SEEDS = Number(process.argv[3] ?? 60);

const kb = (n: number): string => (n / 1024).toFixed(1).padStart(7);
const pct = (n: number): string => `${(n * 100).toFixed(1)}%`;

const started = process.hrtime.bigint();
const { sampler, records } = collectDistribution(DIFFICULTIES, SEEDS, seedAt);

if (sampler.states.length === 0) {
  console.error('VACUITY: 0 states sampled. This is not a report.');
  process.exit(2);
}

// -----------------------------------------------------------------------------------------------
console.log('='.repeat(95));
console.log('E1 — SERIALISED STATE SIZE');
console.log('='.repeat(95));
console.log(`generator: reference bot v1 · ${SEEDS} seeds x ${DIFFICULTIES.length} difficulties`);
console.log(
  `sampled: ${sampler.states.length} states, ${sampler.bursts.length} endCommand bursts\n`,
);

console.log('-- 1. CENSORING — how much of the legal game was reached ---------------------------');
console.log('   Everything below is conditional on this table.\n');
console.log(
  '            maxTurn  +grace  longest   bot mean end   window reached   games past maxTurn',
);
for (const d of DIFFICULTIES) {
  const w = turnWindow(d);
  const ends = records.filter((r) => r.difficulty === d).map((r) => r.endTurn);
  const c = censoring(d, w, ends);
  console.log(
    `  ${d.padEnd(9)} ${String(w.maxTurn).padStart(5)}  ${String(w.graceClear).padStart(6)}  ` +
      `${String(w.longestLegalGame).padStart(7)}   ${c.meanEndTurn.toFixed(1).padStart(12)}   ` +
      `${pct(c.fractionOfWindow).padStart(14)}   ${String(c.gamesReachingMaxTurn).padStart(17)}`,
  );
}
console.log(
  '\n  New infections keep arriving until maxTurn, and state size grows with invader count.\n' +
    '  The bot dies first. EVERY FIGURE BELOW IS A FLOOR.',
);

// -----------------------------------------------------------------------------------------------
console.log(
  "\n-- 2. ONE STATE — the brief's number, and what actually goes on a wire -------------\n",
);
console.log('              n      mean      p50      p90      p99      max     (KiB)');
for (const d of DIFFICULTIES) {
  const rows = sampler.states.filter((s) => s.difficulty === d);
  for (const [label, pick] of [
    ['chars', (s: StateSample) => s.size.chars],
    ['utf8', (s: StateSample) => s.size.utf8],
    ['gzip', (s: StateSample) => s.size.gzip],
  ] as const) {
    const dist = distribution(rows.map(pick));
    console.log(
      `  ${(label === 'chars' ? d : '').padEnd(9)} ${label.padEnd(5)} ${String(dist.n).padStart(6)} ` +
        `${kb(dist.mean)} ${kb(dist.p50)} ${kb(dist.p90)} ${kb(dist.p99)} ${kb(dist.max)}`,
    );
  }
}
console.log(
  "\n  'chars' is JSON.stringify(...).length — the brief's number, in UTF-16 code units.",
);
console.log('  utf8/gzip are wire bytes. A relay would use permessage-deflate; gzip sizes it.');

// -----------------------------------------------------------------------------------------------
console.log(
  '\n-- 3. THE ENDCOMMAND BURST — the realistic per-turn broadcast -----------------------\n',
);
console.log('              frames/burst                 burst gzip (KiB)');
console.log('              mean   p90   max      mean      p50      p90      p99      max');
for (const d of DIFFICULTIES) {
  const rows = sampler.bursts.filter((b) => b.difficulty === d);
  const f = distribution(rows.map((b) => b.frames));
  const g = distribution(rows.map((b) => b.size.gzip));
  console.log(
    `  ${d.padEnd(9)} ${f.mean.toFixed(1).padStart(6)} ${String(f.p90).padStart(5)} ${String(f.max).padStart(5)}   ` +
      `${kb(g.mean)} ${kb(g.p50)} ${kb(g.p90)} ${kb(g.p99)} ${kb(g.max)}`,
  );
}

// -----------------------------------------------------------------------------------------------
const FIELD_COUNT = Object.keys(sampler.states[0]?.fields ?? {}).length;
console.log(
  '\n-- 4. CHURN — how much of a state changes per action --------------------------------\n',
);
console.log(
  `            utf8 full  utf8 delta   ratio      gzip full  gzip delta   ratio    changed keys (of ${FIELD_COUNT})`,
);
for (const d of DIFFICULTIES) {
  const rows = sampler.states.filter((s) => s.difficulty === d && s.delta !== null);
  const fullU = distribution(rows.map((s) => s.size.utf8));
  const delU = distribution(rows.map((s) => s.delta?.utf8 ?? 0));
  const fullG = distribution(rows.map((s) => s.size.gzip));
  const delG = distribution(rows.map((s) => s.delta?.gzip ?? 0));
  const keys = distribution(rows.map((s) => s.changedKeys ?? 0));
  console.log(
    `  ${d.padEnd(9)} ${kb(fullU.mean)}   ${kb(delU.mean)} ${pct(fullU.mean ? delU.mean / fullU.mean : 0).padStart(8)}   ` +
      `${kb(fullG.mean)}   ${kb(delG.mean)} ${pct(fullG.mean ? delG.mean / fullG.mean : 0).padStart(8)}   ` +
      `${keys.mean.toFixed(1).padStart(10)} (p90 ${keys.p90})`,
  );
}
console.log(
  '\n  Delta = resend every top-level key whose serialisation changed. The SIMPLEST scheme a\n' +
    '  relay would plausibly implement, so this is a CONSERVATIVE estimate of what deltas buy.\n' +
    '  Read the utf8 ratio, not the gzip one: gzip carries ~20 bytes of header, which is a\n' +
    '  visible share of a payload this small and flatters the full state.',
);

// -----------------------------------------------------------------------------------------------
console.log(
  '\n-- 5. WHERE THE BYTES ARE ----------------------------------------------------------\n',
);
{
  const totals = new Map<string, number>();
  for (const s of sampler.states) {
    for (const [k, v] of Object.entries(s.fields)) totals.set(k, (totals.get(k) ?? 0) + v);
  }
  const grand = [...totals.values()].reduce((a, b) => a + b, 0);
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [k, v] of top) {
    const share = v / grand;
    console.log(
      `  ${k.padEnd(14)} ${pct(share).padStart(7)}  ${'#'.repeat(Math.round(share * 50))}`,
    );
  }
}

// -----------------------------------------------------------------------------------------------
console.log(
  '\n-- 6. THE TAIL — bounded, not sampled -----------------------------------------------\n',
);
{
  const points = sampler.states.map((s) => [s.invaders, s.size.utf8] as const);
  const { slope, intercept } = fitLine(points);
  console.log(
    `  marginal cost per invader   ${slope.toFixed(0)} bytes  (intercept ${intercept.toFixed(0)})`,
  );
  console.log(`  most invaders ever sampled  ${sampler.maxInvaders}`);
  const worstSampled = distribution(sampler.states.map((s) => s.size.utf8)).max;
  console.log(`  largest state sampled       ${(worstSampled / 1024).toFixed(1)} KiB`);

  console.log('\n  CONSTRUCTED ENVELOPE (hard) — not reachability claims, points on a curve:\n');

  for (const p of invaderCurve(PORT, 'hard', [0, 10, 25, 50, 100, 200])) {
    console.log(
      `    ${p.label.padEnd(46)} ${kb(p.size.utf8)} KiB utf8   ${kb(p.size.gzip)} KiB gzip`,
    );
  }
  const deck = fullDeckEnvelope(PORT, 'hard');
  console.log(
    `    ${deck.label.padEnd(46)} ${kb(deck.size.utf8)} KiB utf8   ${kb(deck.size.gzip)} KiB gzip`,
  );
  console.log(
    '\n  The last row is the CONTENT-bounded ceiling on seen/memory/vaccine: those are keyed by\n' +
      '  disease, so the deck size is their structural maximum. Invaders are forced in as plain\n' +
      '  bacteria — the cheapest invader record — so every row understates.\n' +
      '  docs/FINDINGS.md #16: forceInject* bypasses the worm accounting. ONLY the SIZE of these\n' +
      '  states may be read out. No worm statistic, no balance figure, ever.',
  );
}

// -----------------------------------------------------------------------------------------------
console.log(
  '\n-- 7. FIELD-POPULATION CENSUS — what neither generator ever fills -------------------\n',
);
{
  const envelope = collectEnvelope(DIFFICULTIES, ENVELOPE_SEEDS, seedAt);
  const keys = [...sampler.populated.keys()].sort();

  /**
   * A field left empty needs its REASON, not just its name. "Never populated" reads as a defect
   * when most of these are the harness being single-player by construction — and burying the two
   * that are NOT explained that way among the seven that are would waste the census.
   */
  const EXPLAINED: Record<string, string> = {
    multiplayer: 'single-player harness by construction',
    players: 'single-player harness by construction',
    captain: 'single-player harness by construction',
    owner: 'single-player harness by construction',
    apBudget: 'single-player harness by construction',
    apPool: 'single-player harness by construction',
    science: 'harness always passes science:false',
  };

  const unexplained: string[] = [];
  const structural: string[] = [];
  const envelopeOnly: string[] = [];

  for (const k of keys) {
    const bot = sampler.populated.get(k) === true;
    const env = envelope.populated.get(k) === true;
    if (!bot && env) envelopeOnly.push(k);
    if (bot || env) continue;
    if (EXPLAINED[k]) structural.push(`${k.padEnd(14)} ${EXPLAINED[k]}`);
    else unexplained.push(k);
  }

  console.log(`  ${keys.length} top-level fields · envelope pass ${ENVELOPE_SEEDS} seeds x 3\n`);

  console.log('  a) populated ONLY by the property generator — this is why pass B exists:');
  console.log(
    envelopeOnly.length ? `     ${envelopeOnly.join(', ')}` : '     (none — pass B added nothing)',
  );

  console.log('\n  b) empty for a reason the harness already knows:');
  for (const r of structural) console.log(`     ${r}`);

  console.log('\n  c) EMPTY UNDER BOTH GENERATORS AND NOT EXPLAINED — the interesting bucket:');
  console.log(unexplained.length ? `     ${unexplained.join(', ')}` : '     (none)');
  console.log(
    '\n  A field neither generator fills is a field whose size NOTHING here has measured, and a\n' +
      '  protocol still has to carry it. Bucket (c) is also where a dead mechanic shows up: see\n' +
      "  the closeout on `free`, which the engine's own comment calls 'free actions granted by\n" +
      "  the Helper T-Cell' and which nothing ever grants.",
  );
}

// -----------------------------------------------------------------------------------------------
console.log(
  '\n-- 8. THE "REPRESENTATIVE MID-GAME STATE", with its percentile rank -----------------\n',
);
for (const d of DIFFICULTIES) {
  const rows = sampler.states.filter((s) => s.difficulty === d);
  const w = turnWindow(d);
  const mid = rows.filter((s) => s.turn >= Math.ceil(w.maxTurn / 4));
  const pool = mid.length ? mid : rows;
  const sizes = pool.map((s) => s.size.chars).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)] ?? 0;
  console.log(
    `  ${d.padEnd(9)} ${String(median).padStart(7)} chars   ` +
      `percentile ${pct(
        percentileRank(
          rows.map((s) => s.size.chars),
          median,
        ),
      ).padStart(6)} of all ${d} states   ` +
      `(n=${pool.length})`,
  );
}
console.log(
  '\n  Quoted ONLY with its rank. There is no single number that sizes a protocol, and the\n' +
    '  brief\'s "representative mid-game state" is a median over a censored sample.',
);

const secs = Number(process.hrtime.bigint() - started) / 1e9;
console.log(`\ndone in ${secs.toFixed(1)}s`);
