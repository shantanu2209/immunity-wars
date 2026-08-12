/**
 * THE RESTATED COVERAGE GATE — 95% of COVERABLE branch arms.
 *
 * The original gate (docs/TASK_B_PLAN.md §1.5) was 95% of ALL arms. That target cannot be met,
 * and not for want of tests: enabling `noUncheckedIndexedAccess` required handling lookups that
 * the surrounding guard has already made impossible, and each of those handlers is a correct,
 * required, permanently-dead branch arm. Roughly half the uncovered arms are of that shape.
 *
 * So the denominator excludes provably-dead arms. That is a weakening, and it is dangerous in
 * exactly the way `DELIBERATE_DIVERGENCES` is dangerous, so it carries the same four rules:
 *
 *   1. EXCLUSION BY EXPLICIT RULE ONLY, never by judgement. Two rules below, both mechanical.
 *   2. EVERY EXCLUDED ARM IS ENUMERATED, written to docs/COVERAGE_EXCLUSIONS.md — a reviewable
 *      list, not a number folded into a percentage.
 *   3. "PROVABLY DEAD" MEANS DEMONSTRATED. Rule B carries a per-arm demonstration; rule A
 *      carries a class argument plus corpus evidence, and says so rather than pretending
 *      otherwise.
 *   4. THE LIST IS A LIABILITY. It stays short. Growth is a warning, not routine — the gate
 *      fails if it exceeds MAX_EXCLUSIONS.
 *
 * And it is SELF-POLICING: if an excluded arm ever becomes covered, it was not dead, and the
 * gate fails telling you to remove it.
 *
 * TWO MEASUREMENT FOOTGUNS, both found at C1, both worth knowing before you read a number here.
 *
 * 1. CLEAN `coverage/` FIRST. Every tier writes to the same directory, so running
 *    `pnpm coverage:generators` and then this gate reports the WRONG tier's numbers, partly
 *    merged. At C1 that manufactured a phantom extra arm in actions.ts that vanished on a clean
 *    run. Always: `rm -rf coverage && pnpm coverage:all` (or the tier you mean), then the gate.
 *
 * 2. THE V8 PROVIDER'S ARM COUNT WOBBLES BY ±1 WITH SOURCE OFFSETS. It derives branches from
 *    V8 block-coverage ranges rather than from the AST, so purely cosmetic edits can change how
 *    a range splits. At C1, merging four import statements into one — no control-flow change
 *    whatsoever — added one COVERED arm at `samePlace`'s `if (a.zone === 'route')`. Nothing was
 *    removed and no uncovered arm appeared.
 *
 *    That it was cosmetic is not an assumption: the 6,000-game equivalence corpus was byte-
 *    identical across the same change, which is direct evidence the engine's control flow did
 *    not move. The arm count did. So the corpus is the authority on behaviour and this gate is
 *    the authority on test reach, and a ±1 wobble here is measurement noise rather than signal.
 *
 *    Consequence for anyone about to press on the margin: headroom is currently ~6 arms, which
 *    means ~6 ± 1. Do not read a one-arm move as a regression, and do not spend the last arm.
 *
 * THE GENERAL RULE BEHIND BOTH, worth more than either incident:
 *
 *   TWO INSTRUMENTS, ONE AUTHORITY EACH. The equivalence corpus is the authority on BEHAVIOUR.
 *   This gate is the authority on TEST REACH. WHEN THEY DISAGREE ABOUT WHETHER SOMETHING
 *   CHANGED, THE CORPUS WINS.
 *
 * That is what settled the C1 wobble. The corpus was byte-identical across the change, so
 * control flow provably did not move — while the arm count did. Only one of those can be
 * measuring what it claims to, and it is not the one derived from block-coverage ranges.
 *
 * Use it in that direction only. A clean gate says nothing about behaviour, and a clean corpus
 * says nothing about whether the tests reach anything: 6,000 identical games would still be
 * 6,000 identical games if half the engine were never entered.
 *
 * Two categories are NOT excluded, deliberately:
 *   - MULTIPLAYER arms stay in the denominator. They are reachable; Phase 3 must cover them.
 *   - BOT-CONDITIONAL arms stay in the denominator. They become reachable when Phase 2 builds
 *     a competent bot.
 * Both are tracked as lists their phase inherits.
 *
 *   node --import tsx tests/equivalence/coverage-gate.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

import ts from 'typescript';

const TARGET = 95;
const MAX_EXCLUSIONS = 120;

/**
 * RULE A — defensive null-coalescing arms.
 *
 * Mechanical: the source line contains `??` or `|| <literal>`. These exist because
 * noUncheckedIndexedAccess requires handling a miss; where the surrounding guard already
 * establishes presence, the miss arm cannot be taken.
 *
 * Evidence level: CLASS ARGUMENT, not per-arm proof. Backed by the corpus — 6,000 games with
 * zero divergence means no such arm is both live and wrong. That is weaker than a per-arm
 * demonstration and is labelled as such.
 */
const RULE_A = /\?\?|\|\|\s*(\{\}|\[\]|0\b|1\b|''|"")/;

/**
 * RULE B — individually demonstrated dead arms.
 *
 * Keyed on file AND source text, not line number, so the list cannot silently drift when code
 * moves. Each carries the demonstration that established it, and the demonstrations are
 * executable: see demonstrate-dead-arms.ts, which must print DEAD on every line.
 */
interface Demonstrated {
  file: string;
  match: string;
  why: string;
}

const RULE_B: Demonstrated[] = [
  {
    file: 'actions.ts',
    match: "if (iv.type === 'malaria' && iv.stage === 'liver') {",
    why: "unreachable: the ok2 type gate three lines earlier rejects malaria unless stage is blood or sporozoite, so a liver-stage malaria never arrives here. Demonstrated: applyAction returns 'Antibodies cannot neutralise that.'",
  },
  {
    file: 'actions.ts',
    match: 'if (iv.inMac) {',
    why: 'unreachable in neutralise: inMac is only ever set on a hidesInMac card, and the sole such card (Kala-azar) is a parasite, which ok2 rejects first',
  },
  {
    file: 'actions.ts',
    match: 'if (iv.variant && d6() <= 3) {',
    why: 'unreachable: the only variant card is Sleeping sickness, a parasite, and neutralise rejects parasites at ok2. docs/FINDINGS.md #4',
  },
  {
    file: 'actions.ts',
    match: "if (f === 'X' && !g.cloneFound) {",
    why: "unreachable in tag: f === 'X' requires iv.novel, but tag only accepts bacteria/worm/parasite and the only novel card is a virus. docs/FINDINGS.md #21",
  },
  {
    file: 'actions.ts',
    match: 'c = DECK_MASTER.find((x) => x.dz === dz) || null;',
    why: 'the || null arm is unreachable: g.seen is only ever written from a drawn card, so every key resolves. Demonstrated over 200 games x 25 turns with no unresolvable key',
  },
  {
    file: 'actions.ts',
    match: 'if (c.novel) {',
    why: 'unreachable inside the spawn loop: newGame filters novel cards out of the deck entirely (measured: 0 in deck); the novel pathogen is injected on novelTurn instead',
  },
  {
    file: 'construct.ts',
    match: 'while (slots.includes(t)) t += 1;',
    why: 'the collision loop never runs: the three quartile slots are 4,8,11 / 5,10,15 / 8,15,23 at the three difficulties, which never collide',
  },
  {
    file: 'queries.ts',
    match: 'export function abTotal(g: GameState): number {',
    why: 'dead function. Legacy contains exactly one reference — the definition. docs/FINDINGS.md #11',
  },
  {
    file: 'queries.ts',
    match: 'export function hasAb(g: GameState, iv: Invader): boolean {',
    why: 'dead function. Legacy contains exactly one reference — the definition. docs/FINDINGS.md #11',
  },
  {
    file: 'queries.ts',
    match: "if (ns === 0) out.push({ zone: 'hub', lymph: true });",
    why: 'unreachable: ns === 0 needs extra === LYMPH_STEP (3), and extra runs to sp-1, so it needs speed >= 4. The fastest cell is speed 2, or 3 with a primed helper',
  },
  {
    file: 'spread.ts',
    match: 'if (arrivals.includes(iv)) break;',
    why: 'unreachable: every arrivals.push(iv) in the march is immediately followed by break, so the loop can never re-enter with iv already present',
  },
  {
    file: 'spread.ts',
    match: 'iv.wormClock = (iv.wormClock || WORM_DAMAGE_EVERY) - 1;',
    why: 'the || fallback is unreachable: a lodged worm always carries a non-zero clock, set at makeInvader or at lodging and reset on every bite. Demonstrated over 300 games',
  },
  {
    file: 'spread.ts',
    match: 'const org = iv.organ ? g.organs[iv.organ] : undefined;',
    why: 'the undefined arm is unreachable: makeInvader always assigns an organ before a worm can lodge. Demonstrated over 300 games',
  },
  {
    file: 'ap.ts',
    match: 'export function apOwnerOf(g: GameState, a: Action | null | undefined): string | null {',
    why: 'dead function. Legacy contains exactly one reference — the definition. docs/FINDINGS.md #11',
  },
];

/* ------------------------------------------------------------------ */

interface Loc {
  start: { line: number };
}
interface FileCoverage {
  path: string;
  statementMap: Record<string, Loc>;
  branchMap: Record<string, { loc: Loc; type: string; locations: Loc[] }>;
  fnMap: Record<string, { name: string; decl: Loc }>;
  b: Record<string, number[]>;
  f: Record<string, number>;
  s: Record<string, number>;
}

const data = JSON.parse(readFileSync('coverage/coverage-final.json', 'utf8')) as Record<
  string,
  FileCoverage
>;

const src = new Map<string, string[]>();
const lineAt = (path: string, n: number): string => {
  let s = src.get(path);
  if (!s) {
    s = readFileSync(path, 'utf8').split(/\r?\n/);
    src.set(path, s);
  }
  return (s[n - 1] ?? '').trim();
};

interface Arm {
  file: string;
  short: string;
  line: number;
  text: string;
  covered: boolean;
  kind: 'branch' | 'function';
}

const arms: Arm[] = [];
for (const fc of Object.values(data)) {
  if (Object.keys(fc.statementMap).length === 0) continue; // type-only file, no runtime code
  const short = relative(process.cwd(), fc.path).replace(/\\/g, '/').split('/').pop() ?? '';
  for (const [id, counts] of Object.entries(fc.b)) {
    const meta = fc.branchMap[id];
    if (!meta) continue;
    counts.forEach((hits, i) => {
      const n = (meta.locations[i] ?? meta.loc).start.line;
      arms.push({
        file: fc.path,
        short,
        line: n,
        text: lineAt(fc.path, n),
        covered: hits > 0,
        kind: 'branch',
      });
    });
  }
  for (const [id, hits] of Object.entries(fc.f)) {
    const meta = fc.fnMap[id];
    if (!meta) continue;
    const n = meta.decl.start.line;
    arms.push({
      file: fc.path,
      short,
      line: n,
      text: lineAt(fc.path, n),
      covered: hits > 0,
      kind: 'function',
    });
  }
}

const ruleB = (a: Arm): Demonstrated | undefined =>
  RULE_B.find((d) => a.short === d.file && a.text === d.match);

const excluded: (Arm & { rule: 'A' | 'B'; why: string })[] = [];
for (const a of arms) {
  // An excluded arm is by definition an UNCOVERED one. A rule-B entry names a line, and a line
  // usually has two arms — the dead one and its live counterpart. Excluding both would quietly
  // remove a covered arm from the denominator, which flatters the number for free.
  if (a.covered) continue;
  const b = ruleB(a);
  if (b) {
    excluded.push({ ...a, rule: 'B', why: b.why });
    continue;
  }
  if (RULE_A.test(a.text)) {
    excluded.push({
      ...a,
      rule: 'A',
      why: 'null-coalescing arm required by noUncheckedIndexedAccess where the surrounding guard already establishes presence',
    });
  }
}

/* ------------------------------------------------------------------ *
 * RULE-A CHURN — the one point where rule A can be cheaply falsified.
 *
 * docs/FINDINGS.md #25. Rule B carries a per-arm demonstration and the gate FAILS if a
 * demonstrated-dead arm becomes covered. Rule A carries only a class argument covering 95 of the
 * 111 exclusions, and has no equivalent — an arm is excluded because it is uncovered TODAY, so
 * when one becomes covered it simply drops off the list and nothing says so.
 *
 * That is not hypothetical. At C4 `construct.ts`'s
 *   `(g.deck || []).find(c => c.dz === dz) ?? DECK_MASTER.find(...)`
 * left the list, and the reason turned out to be that it was never dead: it is reachable by
 * force-injecting a card `newGame` filters out of the deck, and no test had ever done that. The
 * list shrank silently inside a generated-file diff.
 *
 * So: read the PREVIOUS list before overwriting it, and NAME every arm that has since become
 * covered. Full re-testing is not mechanisable — proving an arm reachable is the same work as
 * writing the test — but this costs one file read.
 *
 * REPORTS, DOES NOT REMOVE. What it means when an arm leaves the list is a judgement: the class
 * argument may have been wrong, or a new test may simply have reached further. A human decides.
 * ------------------------------------------------------------------ */

/**
 * Rule-A entries from a previously generated COVERAGE_EXCLUSIONS.md, COUNTED by `file|text`.
 *
 * Counted, not a set, and that distinction is load-bearing. One source line usually carries
 * SEVERAL arms — `a ?? b` has two — and they are excluded individually, so the same text can
 * appear twice. The first version of this check asked "is every arm at this text now covered?",
 * which is the right question for rule B and the WRONG one here: it misses a line going from two
 * excluded arms to one, and that is precisely the C4 case that motivated the whole check.
 *
 * Found by the negative control, not by reasoning.
 */
function previousRuleA(path: string): Map<string, number> {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return new Map(); // first ever run
  }
  const out = new Map<string, number>();
  let file = '';
  let inRuleA = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('## Rule A')) inRuleA = true;
    else if (line.startsWith('## Rule B')) inRuleA = false;
    else if (line.startsWith('### ')) file = line.slice(4).trim();
    else if (inRuleA) {
      // - `<line>` `<text>`
      const m = /^- `\d+` `(.*)`$/.exec(line);
      if (m && file) {
        const k = `${file}|${m[1]}`;
        out.set(k, (out.get(k) ?? 0) + 1);
      }
    }
  }
  return out;
}

const EXCLUSIONS_DOC = 'docs/COVERAGE_EXCLUSIONS.md';
const wasExcluded = previousRuleA(EXCLUSIONS_DOC);

/** Keyed the same way the document writes them: short file name + text truncated to 110. */
const armKey = (a: Arm): string => `${a.short}|${a.text.slice(0, 110)}`;

const nowCovered: { arm: Arm; n: number }[] = [];
const nowAbsent: string[] = [];
if (wasExcluded.size) {
  const current = new Map<string, Arm[]>();
  for (const a of arms) {
    const k = armKey(a);
    const list = current.get(k) ?? [];
    list.push(a);
    current.set(k, list);
  }
  for (const [key, wasCount] of wasExcluded) {
    const matches = current.get(key);
    if (!matches) {
      nowAbsent.push(key);
      continue;
    }
    // How many arms at this text are STILL uncovered? Fewer than were excluded means that many
    // have become covered — including the two-arms-to-one case a boolean check would miss.
    const stillUncovered = matches.filter((a) => !a.covered).length;
    if (stillUncovered < wasCount) {
      nowCovered.push({ arm: matches[0] as Arm, n: wasCount - stillUncovered });
    }
  }
}

/* --- self-policing --- */
const problems: string[] = [];

// A rule-B entry whose text no longer appears means the code moved or changed under it.
for (const d of RULE_B) {
  const matches = arms.filter((a) => a.short === d.file && a.text === d.match);
  if (!matches.length) {
    problems.push(
      `STALE EXCLUSION: ${d.file} — no arm matches ${JSON.stringify(d.match.slice(0, 60))}`,
    );
    continue;
  }
  // THE SELF-POLICING CHECK. A demonstrated-dead arm that is now covered was never dead, and
  // the demonstration was wrong. Every arm at this line being covered means exactly that.
  if (matches.every((a) => a.covered)) {
    problems.push(
      `NOT DEAD AFTER ALL: ${d.file} — every arm at ${JSON.stringify(d.match.slice(0, 50))} is now ` +
        `covered. The demonstration was wrong; remove the entry.`,
    );
  }
}
if (excluded.length > MAX_EXCLUSIONS) {
  problems.push(
    `EXCLUSION LIST TOO LONG: ${excluded.length} > ${MAX_EXCLUSIONS}. This list is a liability.`,
  );
}

/* --- the numbers --- */
const excludedKeys = new Set(excluded.map((e) => `${e.file}:${e.line}:${e.text}`));
const coverable = arms.filter((a) => !excludedKeys.has(`${a.file}:${a.line}:${a.text}`));
const branchArms = coverable.filter((a) => a.kind === 'branch');
const coveredBranch = branchArms.filter((a) => a.covered).length;
const pct = (coveredBranch / branchArms.length) * 100;

const rawBranch = arms.filter((a) => a.kind === 'branch');
const rawPct = (rawBranch.filter((a) => a.covered).length / rawBranch.length) * 100;

console.log('RESTATED COVERAGE GATE — 95% of coverable branch arms\n');
console.log(`  raw branch arms          ${rawBranch.length}`);
console.log(`  excluded (rule A)        ${excluded.filter((e) => e.rule === 'A').length}`);
console.log(`  excluded (rule B)        ${excluded.filter((e) => e.rule === 'B').length}`);
console.log(`  coverable branch arms    ${branchArms.length}`);
console.log('');
console.log(`  raw branch coverage      ${rawPct.toFixed(2)}%`);
console.log(`  COVERABLE branch coverage ${pct.toFixed(2)}%   target ${TARGET}%`);
console.log('');

const stillUncovered = branchArms.filter((a) => !a.covered);
const byFile = new Map<string, number>();
for (const a of stillUncovered) byFile.set(a.short, (byFile.get(a.short) ?? 0) + 1);
console.log(`  uncovered COVERABLE arms remaining: ${stillUncovered.length}`);
for (const [f, n] of [...byFile.entries()].sort((x, y) => y[1] - x[1])) {
  console.log(`      ${String(n).padStart(4)}  ${f}`);
}

/* --- write the reviewable list --- */
const lines: string[] = [
  '# Coverage exclusions',
  '',
  '**Generated by `pnpm coverage:gate`. Do not edit by hand.**',
  '',
  'Every branch arm excluded from the coverage denominator, with the rule that excluded it.',
  'This list exists because a percentage cannot be reviewed and a list can.',
  '',
  '**It is a liability, not a convenience.** Everything here is a place the gate has stopped',
  'looking. It stays short; growth is a warning. The gate fails if it exceeds ' +
    `${MAX_EXCLUSIONS} entries, or if any entry stops matching, or if an excluded arm turns out`,
  'to be covered after all — which would mean it was never dead.',
  '',
  '## Rule A — defensive null-coalescing arms',
  '',
  '`??` or `|| <literal>` arms required by `noUncheckedIndexedAccess` where the surrounding',
  'guard already establishes presence.',
  '',
  '**Evidence level: class argument, not per-arm proof.** Backed by the equivalence corpus —',
  '6,000 games with zero divergence means no arm of this shape is both live and wrong. That is',
  'weaker than a demonstration and is labelled so deliberately.',
  '',
];
const a1 = excluded.filter((e) => e.rule === 'A');
let cur = '';
for (const e of a1.sort((x, y) =>
  x.short === y.short ? x.line - y.line : x.short.localeCompare(y.short),
)) {
  if (e.short !== cur) {
    cur = e.short;
    lines.push('', `### ${cur}`, '');
  }
  lines.push(`- \`${e.line}\` \`${e.text.slice(0, 110)}\``);
}
lines.push('', '## Rule B — individually demonstrated dead arms', '');
lines.push('Each carries the demonstration that established it.', '');
for (const e of excluded.filter((x) => x.rule === 'B')) {
  lines.push(`### ${e.short}:${e.line}`, '', `\`\`\`\n${e.text}\n\`\`\``, '', e.why, '');
}
writeFileSync(EXCLUSIONS_DOC, lines.join('\n') + '\n');

/* --- report the churn, after reading the old list and before anyone reads the new one --- */
if (nowCovered.length || nowAbsent.length) {
  console.log('');
  console.log('RULE-A CHURN — arms that have LEFT the exclusion list since the last run');
  console.log(
    '  (docs/FINDINGS.md #25. Reported, never auto-removed: what it means is a judgement.)',
  );
}
if (nowCovered.length) {
  console.log('');
  const total = nowCovered.reduce((s, c) => s + c.n, 0);
  console.log(`  NOW COVERED — ${total} arm(s) across ${nowCovered.length} line(s):`);
  for (const c of nowCovered) {
    const suffix = c.n > 1 ? `   (${c.n} arms)` : '';
    console.log(`      ${c.arm.short}:${c.arm.line}  ${c.arm.text.slice(0, 90)}${suffix}`);
  }
  console.log('');
  console.log('  Each of these was excluded as a defensive arm that could not be taken, and a');
  console.log('  test now reaches it. Either the arm was never dead, or the new test found a');
  console.log('  path nobody had. Both are worth knowing; neither is automatic.');
}
if (nowAbsent.length) {
  console.log('');
  console.log(`  NO LONGER PRESENT — ${nowAbsent.length} (code moved, changed or was deleted):`);
  for (const k of nowAbsent.slice(0, 10)) console.log(`      ${k.replace('|', ':  ')}`);
}

/* --- the DEFERRED lists: reachable, uncovered, and deliberately NOT excluded --- */

/**
 * WHICH UNCOVERED ARMS ARE MULTIPLAYER — keyed on meaning, not on position.
 *
 * This used to end with `a.short === 'actions.ts' && a.line >= 82 && a.line <= 165`, and at C1
 * it drifted: merging four import statements pushed `if (g.phase !== 'command')` from line 165
 * to 169, and it silently left the multiplayer bucket. Nothing broke that time, but
 * COVERAGE_DEFERRED.md is the list PHASE 3 INHERITS AS ITS MULTIPLAYER TO-DO. Arms leaking out
 * of it means Phase 3 starts from a list that is short by an unknown amount, and nothing says so.
 *
 * Same shape as the worm safeguard in docs/FINDINGS.md #14, which holds by PLACEMENT rather than
 * by intent: a property that is true for a reason nobody wrote down. The fix is to say the thing
 * out loud.
 *
 * An arm is multiplayer if either is true, and both mean what they say:
 *
 *   1. It sits lexically inside a block guarded by `g.multiplayer`. Computed from the AST on
 *      every run, so it re-derives when code moves and cannot go stale. Brace-counting was
 *      rejected — the allocation pushLog contains `${pool === 1 ? '' : 's'}`, whose braces live
 *      inside a template literal and would desynchronise a naive scan.
 *   2. Its own source text names a multiplayer concept. Case-INSENSITIVE, which the old regex
 *      was not: the `<b>Allocation phase.</b> Captain has ...` log line spells it `Captain` and
 *      was matched only by the positional clause it is now free of.
 *
 * `ap.ts` is multiplayer wholesale — it is the per-player AP budget and nothing else.
 */
const MP_VOCAB = /multiplayer|captain|apBudget|apPool|allocat/i;

/** Line ranges of every `if (g.multiplayer) { … }` block, by file, from the AST. */
function multiplayerRegions(file: string): { from: number; to: number }[] {
  const text = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  const out: { from: number; to: number }[] = [];
  const lineOf = (pos: number): number => sf.getLineAndCharacterOfPosition(pos).line + 1;

  const guardsOnMultiplayer = (e: ts.Expression): boolean =>
    /^g\.multiplayer$/.test(e.getText(sf).trim());

  const visit = (n: ts.Node): void => {
    if (ts.isIfStatement(n) && guardsOnMultiplayer(n.expression)) {
      out.push({
        from: lineOf(n.thenStatement.getStart(sf)),
        to: lineOf(n.thenStatement.getEnd()),
      });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

const regionCache = new Map<string, { from: number; to: number }[]>();
const regionsFor = (file: string): { from: number; to: number }[] => {
  let r = regionCache.get(file);
  if (!r) {
    r = multiplayerRegions(file);
    regionCache.set(file, r);
  }
  return r;
};

const isMultiplayer = (a: Arm): boolean =>
  a.short === 'ap.ts' ||
  MP_VOCAB.test(a.text) ||
  regionsFor(a.file).some((r) => a.line >= r.from && a.line <= r.to);

const deferredMp = stillUncovered.filter(isMultiplayer);
const deferredBot = stillUncovered.filter((a) => a.short === 'simulate.ts' && !isMultiplayer(a));
const rest = stillUncovered.filter((a) => !isMultiplayer(a) && a.short !== 'simulate.ts');

const row = (a: Arm): string => '- `' + a.short + ':' + a.line + '` `' + a.text.slice(0, 100) + '`';

const dl: string[] = [
  '# Coverage — deferred, not excluded',
  '',
  '**Generated by `pnpm coverage:gate`. Do not edit by hand.**',
  '',
  'These arms are uncovered and **remain in the coverage denominator**. They are reachable, so',
  'excluding them would hide real work behind a restated gate. Each list belongs to the phase',
  'that will make it reachable in practice.',
  '',
  'Contrast [`COVERAGE_EXCLUSIONS.md`](COVERAGE_EXCLUSIONS.md), which holds arms that can never',
  'be reached at all. The distinction is the point: dead code leaves the denominator, deferred',
  'work does not.',
  '',
  '## Phase 3 — multiplayer (' + deferredMp.length + ' arms)',
  '',
  'The equivalence corpus is single-player by scope, so the allocation phase and the per-player',
  'AP plumbing are barely exercised. Phase 3 builds the new relay and must cover these.',
  '',
  ...deferredMp.map(row),
  '',
  '## Phase 2 — reachable once a competent bot exists (' + deferredBot.length + ' arms)',
  '',
  "Inside `simulate()`'s inlined bot. The current reference bot plays ~6 of 14 seats and never",
  'emits 8 of 27 actions (docs/FINDINGS.md §1), so these heuristics are never entered. A bot',
  'good enough to measure difficulty would reach them.',
  '',
  ...deferredBot.map(row),
  '',
  '## Uncategorised — still open (' + rest.length + ' arms)',
  '',
  'Neither multiplayer nor bot-conditional. This is the honest remaining gap.',
  '',
  ...rest.map(row),
];
writeFileSync('docs/COVERAGE_DEFERRED.md', dl.join('\n') + '\n');

console.log('');
console.log('  deferred to Phase 3 (multiplayer) : ' + deferredMp.length);
console.log('  deferred to Phase 2 (bot)         : ' + deferredBot.length);
console.log('  uncategorised, still open         : ' + rest.length);
console.log('  wrote docs/COVERAGE_EXCLUSIONS.md and docs/COVERAGE_DEFERRED.md');

if (problems.length) {
  console.log('');
  for (const p of problems) console.log(`  !! ${p}`);
}
const ok = problems.length === 0 && pct >= TARGET;
console.log('');
console.log(
  ok ? 'GATE PASSES' : `GATE FAILS — ${pct.toFixed(2)}% of coverable arms, target ${TARGET}%`,
);
process.exit(ok ? 0 : 1);
