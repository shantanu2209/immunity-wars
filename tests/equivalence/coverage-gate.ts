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
 *      fails if it exceeds the ratio cap (MAX_EXCLUSION_RATIO of raw arms).
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
 *   - BOT-CONDITIONAL arms stay in the denominator. They become reachable when a competent bot
 *     is built, which is PHASE 3's work, not Phase 2's.
 * Both are tracked as lists their phase inherits.
 *
 * The bot arms said "Phase 2" until 18 Aug 2026. That was wrong and the correction is measured,
 * not editorial: the reference bot is INLINED IN THE ENGINE (docs/FINDINGS.md #6), and
 * simulate() is compared BYTE-IDENTICALLY by the B6 corpus check
 * (tests/equivalence/src/simulate.test.ts). So a competent bot is an engine change that
 * necessarily breaks the corpus — which Phase 2's own definition of done forbids in the same
 * breath ("the engine is unchanged"). Both could not stand. Phase 2 is a renderer rewrite, and
 * re-baselining the primary oracle DURING a rewrite is the worst available timing. The arms move
 * to Phase 3, where the seat-filling AI makes them the same piece of work.
 * docs/PHASE2_BRIEF.md v1.1 §6, review item A.
 *
 *   node --import tsx tests/equivalence/coverage-gate.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

import ts from 'typescript';

const TARGET = 95;

/**
 * THE EXCLUSION CAP, restated as a RATIO of raw arms at the v4-provider reconciliation
 * (docs/FINDINGS.md #46). It was `MAX_EXCLUSIONS = 120`, an absolute set against the v2
 * provider's 1,526-arm universe. coverage-v8 4 derives arms from the AST and its universe is
 * 1,876 — and the new arms are DISPROPORTIONATELY defensive (29 of the 35 newly visible
 * uncategorised arms classified dead, plus the implicit-else class), so exclusion density is
 * higher than a constant-density rescale of the old cap predicts: the ruling's estimate was
 * 7.9% (~147) and the honestly classified set landed at 168. The ratio below is the measured
 * set plus headroom proportional to the old cap's (120 vs ~111 used, so ~9 arms), and BOTH
 * numbers are printed every run so a future universe change shows up as a number that moved,
 * not a cap that silently accommodated it.
 */
const MAX_EXCLUSION_RATIO = 0.094;

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
  // DROPPED 19 Aug 2026, at the v4-provider reconciliation: `while (slots.includes(t)) t += 1;`
  // (construct.ts). The line, the property and its executable demonstration all still exist —
  // demonstrate-dead-arms.ts still prints DEAD for it — but istanbul-style AST mapping does not
  // treat loop conditions as branches, so there is no arm left to exclude. The property is still
  // proven; the instrument stopped charging for it. docs/FINDINGS.md #46.
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

  /* ------------------------------------------------------------------ *
   * ADDED 19 Aug 2026 at the v4-provider reconciliation (docs/FINDINGS.md #46). The AST-based
   * mapper surfaced ~50 defensive arms the range-based v2 mapper had merged away. Rule C takes
   * the three mechanical shapes; these are the remainder, each with its argument. Grouped
   * demonstrations live in demonstrate-dead-arms.ts under "v4 reconciliation".
   * ------------------------------------------------------------------ */
  {
    file: 'actions.ts',
    match: "if (!c) return err('Illegal move.');",
    why: 'unreachable in move: the `!d` guard two lines up already rejected any cell key that moveDestinations returns [] for — and moveDestinations opens with the same g.cells lookup — so by the time c is read, the key is known to resolve',
  },
  {
    file: 'actions.ts',
    match: "if (!to) return err('No lymphatic link from this route.');",
    why: 'unreachable: a route with no lymph link was rejected two guards earlier (the LYMPH_GROUP check), so lymphPartners is never empty here',
  },
  {
    file: 'actions.ts',
    match: 'if (org) {',
    why: "repeat lookup: line 511's condition already required g.organs[iv.organ] truthy; this re-reads the same key two lines later for the compiler's sake",
  },
  {
    file: 'actions.ts',
    match:
      '`<b>Eosinophil DEGRANULATED</b> — a full toxic payload for 3 damage (2 AP). ${died ? `The ${iv.disease} is destroyed.` : `${iv.disease} at ${iv.hp}/${iv.maxhp}.`} The cell is spent and regenerates on turn ${e.regenAt}. <i>This is how eosinophils really kill worms — and why parasites cause tissue damage.</i>`,',
    why: 'the survives-arm of the ternary is dead by data: degranulate deals 3 and INV_HP tops out at 3 (worm), so every strikeable target dies. Demonstrated by data scan',
  },
  {
    file: 'actions.ts',
    match:
      "`The <b>${RESIDENT_NAME[a.organ as OrganKey] || 'resident macrophage'}</b> moved to ${ORGANS[a.organ as OrganKey].name} ${ns === 0 ? 'tissue' : `branch ${ns}`}.`,",
    why: 'the || fallback is dead by data: RESIDENT_NAME is total over OrganKey. Demonstrated by data scan',
  },
  {
    file: 'actions.ts',
    match:
      "`The ${RESIDENT_NAME[a.organ as OrganKey] || 'resident'} has already engulfed this turn.`,",
    why: 'the || fallback is dead by data: RESIDENT_NAME is total over OrganKey. Demonstrated by data scan',
  },
  {
    file: 'actions.ts',
    match: 'if (c) {',
    why: 'the novel-injection find always succeeds: DECK_MASTER contains exactly one novel card. Demonstrated by data scan',
  },
  {
    file: 'actions.ts',
    match: 'if (pool.length) {',
    why: "pool is empty only when Pathogen X is the ONLY disease ever seen, and turn 1's spawn precedes novelTurn, so a non-X disease is always seen first. Demonstrated over 300 games",
  },
  {
    file: 'actions.ts',
    match: 'if (c) g.discard.push(c as never);',
    why: 'conservation: every drawn card is pushed to discard at draw time, so deck and discard cannot both be empty while cards remain drawable — the pop after reshuffle always yields. Demonstrated over 300 games',
  },
  {
    file: 'ap.ts',
    match: 'if (ck && g.free && free > 0) {',
    why: 'docs/FINDINGS.md #29: nothing ever grants a free action at any player count, so free is always 0',
  },
  {
    file: 'view.ts',
    match: "if (!u) return err('Nothing to undo.');",
    why: 'pop on an array the previous line proved non-empty',
  },
  {
    file: 'construct.ts',
    match: 'if (pick !== undefined) g.events[t] = pick;',
    why: 'picks and slots both have length 3 by construction — two slices of 2 and 1 concatenated, indexed by a forEach over 3 slots',
  },
  {
    file: 'construct.ts',
    match: 'if (!e) return;',
    why: 'every caller passes keys drawn from the pools that built g.events, and both pools are subsets of EVENTS. Demonstrated by data scan',
  },
  {
    file: 'construct.ts',
    match: 'if (c) g.discard.push(c);',
    why: 'same conservation as the spawn path: deck and discard cannot both be empty at a coInfection. Demonstrated over 300 games',
  },
  {
    file: 'construct.ts',
    match: 'if ((c as unknown as Card).novel) {',
    why: 'the novel card never enters deck or discard — newGame filters it out and the injection path bypasses cards entirely (same argument as the spawn-loop entry above). Demonstrated over 300 games',
  },
  {
    file: 'construct.ts',
    match: 'if (alt) g.discard.push(alt);',
    why: 'both sites: splice at an index findIndex just returned as >= 0 always yields an element',
  },
  {
    file: 'construct.ts',
    match: "({ dz: type, type: type as InvaderType, lane: 'bite' as RouteKey } as Card);",
    why: 'testing-hook fallback: every real invader type appears in DECK_MASTER, so the literal card is constructible only by calling forceInjectType with a nonsense type. Demonstrated by data scan',
  },
  {
    file: 'construct.ts',
    match: 'if ((card as Card).novel) {',
    why: "testing hook: forceInjectType('virus') finds the first virus in DECK_MASTER, which is not the novel card, and the novel card is never in the deck",
  },
  {
    file: 'construct.ts',
    match: 'if (!card) return null;',
    why: 'testing-hook guard: every dz the suites force exists in DECK_MASTER',
  },
  {
    file: 'queries.ts',
    match: 'if (!helper || !target) return false;',
    why: 'helper is roster-total (constructed at newGame, never deleted), and target is read with keys callers draw from CELL_KEYS. Demonstrated over 300 games',
  },
  {
    file: 'queries.ts',
    match: 'if (!c) return [];',
    why: 'roster-total lookup: wormStrikeable is called with keys from CELL_KEYS and g.cells is total over them. Demonstrated over 300 games',
  },
  {
    file: 'queries.ts',
    match: "if (st >= 0) out.push({ zone: 'branch', organ: o, step: st });",
    why: 'dead by data: every branch is at least 2 steps (schema-enforced against the drawn board) and speed tops out at 3, so st = L - k >= 0 always. Demonstrated by data scan',
  },
  {
    file: 'queries.ts',
    match: "if (ns >= 1 && ns <= L) out.push({ zone: 'route', lane: to, step: ns, lymph: true });",
    why: 'dead by data: every route is 5 steps, the lymph crossing is step 3, and extra <= 2, so ns is always within [1, 5]. Demonstrated by data scan',
  },
  {
    file: 'spread.ts',
    match: 'if (o) {',
    why: 'the live-organ list is empty only when every organ is at 0 integrity, and a vital at 0 has already ended the game before a rare event can fire. Demonstrated over 300 games',
  },
  {
    file: 'spread.ts',
    match: 'if (org) {',
    why: 'three sites, one shape: the organ key was established by the surrounding filter or invariant (the live-organ filter; the lodged-worm organ invariant demonstrated in the neighbouring entry; worm arrivals always carrying an organ), and g.organs is total over organList',
  },
  {
    file: 'spread.ts',
    match: 'if (g.rareBanner) g.rareBanner.why += ` The ${ORGANS[o].name} took the damage.`;',
    why: 'fireRare set g.rareBanner unconditionally at its top, ninety lines up the same function',
  },
  {
    file: 'spread.ts',
    match: 'if (t) {',
    why: 're-find by id in the same array the iteratee came from — the element cannot be absent',
  },
  {
    file: 'spread.ts',
    match: 'if (!r) return;',
    why: 'the hide filter three lines up required g.residents[iv.organ] truthy; repeat lookup',
  },
  {
    file: 'spread.ts',
    match: 'if (!org) return;',
    why: 'arrivals always carry an organ assigned at makeInvader or during the march, and g.organs is total over organList. Demonstrated over 300 games',
  },
  {
    file: 'primitives.ts',
    match: 'if (i in a && j in a) {',
    why: 'Fisher-Yates over dense arrays: the comment above the line is the argument, and the demonstration shuffles 10,000 dense arrays without one skipped swap',
  },
];

/* ------------------------------------------------------------------ */

interface Loc {
  /**
   * `line` optional since @vitest/coverage-v8 4: the AST-based mapper (ast-v8-to-istanbul)
   * emits the IMPLICIT-ELSE arm of an else-less `if` as `{ start: {}, end: {} }` — an EMPTY
   * start, not a missing one, so the check must be on `.line` — 405 of 1,876 arms in the first
   * run under it. See the fallback where arms are collected.
   */
  start?: { line?: number };
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
  /**
   * Position within the branch (0 = then/first). Rule C discriminates on it: a presence guard
   * in NEVER-CALLED code has BOTH arms uncovered, and only the absent-path arm is dead — the
   * other is the path every call would take, which is exactly what a deferred list must keep.
   * Found by the first run of rule C eating three bot-deferred arms in simulate.ts.
   */
  armIndex: number;
}

const arms: Arm[] = [];
for (const fc of Object.values(data)) {
  if (Object.keys(fc.statementMap).length === 0) continue; // type-only file, no runtime code
  const short = relative(process.cwd(), fc.path).replace(/\\/g, '/').split('/').pop() ?? '';
  for (const [id, counts] of Object.entries(fc.b)) {
    const meta = fc.branchMap[id];
    if (!meta) continue;
    counts.forEach((hits, i) => {
      // The IMPLICIT-ELSE fallback, required since coverage-v8 4. The v4 mapper emits the
      // else-arm of an else-less `if` with a startless location; without this fallback such an
      // arm gets line `undefined` and text '' — an identity no rule can match, no deferred
      // matcher can classify, and no human can review. Anchoring it on the `if` line restores
      // the semantics every rule here was written against: a line's arms share its text
      // ("a line usually has two arms — the dead one and its live counterpart", rule B note).
      const n = meta.locations[i]?.start?.line ?? meta.loc.start?.line;
      if (n === undefined) {
        // Never silently drop an arm — a skipped arm shrinks the denominator invisibly.
        throw new Error(`branch arm with no resolvable line: ${fc.path} branch ${id} arm ${i}`);
      }
      arms.push({
        file: fc.path,
        short,
        line: n,
        text: lineAt(fc.path, n),
        covered: hits > 0,
        kind: 'branch',
        armIndex: i,
      });
    });
  }
  for (const [id, hits] of Object.entries(fc.f)) {
    const meta = fc.fnMap[id];
    if (!meta) continue;
    const n = meta.decl.start?.line;
    if (n === undefined) {
      throw new Error(`function arm with no resolvable line: ${fc.path} fn ${id}`);
    }
    arms.push({
      file: fc.path,
      short,
      line: n,
      text: lineAt(fc.path, n),
      covered: hits > 0,
      kind: 'function',
      armIndex: 0,
    });
  }
}

const ruleB = (a: Arm): Demonstrated | undefined =>
  RULE_B.find((d) => a.short === d.file && a.text === d.match);

/* ------------------------------------------------------------------ *
 * RULE C — three mechanical shapes, added at the v4-provider reconciliation.
 *
 * docs/FINDINGS.md #46. The AST-based mapper surfaced ~50 defensive arms the range-based v2
 * mapper merged away, and most are RULE A'S OWN CLASS IN A SPELLING RULE A CANNOT SEE:
 * presence-handling required by noUncheckedIndexedAccess, written as `if (x)` instead of `??`.
 * Like rule A these are class arguments, which is the WEAKER evidence — rule A has already had
 * one exclusion turn out to be live (docs/FINDINGS.md #25) — so rule C is watched by the same
 * churn report from day one: its exclusions are written to the generated doc and every arm that
 * leaves the list is named. Each shape carries its argument and its corpus evidence HERE, at
 * the rule, not in a commit message.
 *
 * Deliberately narrow. C1 accepts only FIXED dotted paths (or `[o]` under a visible iteration
 * over the total key set) because the bracket-lookup spelling of the same guard is genuinely
 * reachable with a garbage key — `hop`/`recall` with an unknown cell prove it (two of the named
 * test-debt arms) — and a rule that swept those would be excluding real test debt.
 * ------------------------------------------------------------------ */

/**
 * C1 — presence guard on a total state member.
 *
 * CLASS ARGUMENT: `g.cells.*` (all seven), `g.organs.*`, `g.fx`, `g.rare`, `g.suppress` are
 * constructed at newGame (construct.ts, the state literal) and never deleted — cells die by
 * `alive: false`, organs by `hp: 0`; no key is ever removed. A presence guard on one of them,
 * spelled directly or through a const bound 1–3 lines above (including `g.organs[o]` /
 * `g.residents[o]` where `o` visibly iterates organList or the residents record), can therefore
 * never take its absent arm. CORPUS EVIDENCE: 6,000 games with zero divergence, plus the
 * 300-game totality scan in demonstrate-dead-arms.ts ("v4 reconciliation" block).
 */
const C1_DIRECT =
  /^(?:\} else )?if \(!?g\.(?:fx|rare|suppress|cells\.(?:macrophage|neutrophil|bcell|tcell|helper|nk|eosinophil)|organs\.(?:heart|lungs|liver|brain|spleen|kidneys|marrow))\b/;
const C1_BARE = /^(?:\} else )?if \(!?([A-Za-z_]\w*)\) (?:\{|return\b|[a-zA-Z])/;
const C1_BOUND_FIXED =
  /= g\.(?:fx|rare|suppress|cells\.(?:macrophage|neutrophil|bcell|tcell|helper|nk|eosinophil)|organs\.(?:heart|lungs|liver|brain|spleen|kidneys|marrow))\s*;?\s*$/;
const C1_BOUND_ITER = /= g\.(?:organs|residents)\[o\]\s*;?\s*$/;
const C1_ITERATION = /organList\.forEach\(\(o\)|for \(const o in g\.residents\)/;

function ruleC1(a: Arm): boolean {
  // Only the ABSENT-PATH arm is dead: the implicit else of `if (x)`, the then of `if (!x)`.
  // In never-called code both arms are uncovered, and the other one is the path every call
  // would take — exactly what the bot-deferred list must keep (see the armIndex note above).
  const negated = /^(?:\} else )?if \(!/.test(a.text);
  if ((negated && a.armIndex !== 0) || (!negated && a.armIndex !== 1)) return false;
  if (C1_DIRECT.test(a.text)) return true;
  const m = C1_BARE.exec(a.text);
  if (!m) return false;
  const ident = m[1] ?? '';
  for (let k = 1; k <= 3; k += 1) {
    const above = lineAt(a.file, a.line - k);
    if (!above.includes(`const ${ident}`) && !above.includes(`let ${ident}`)) continue;
    if (C1_BOUND_FIXED.test(above)) return true;
    if (C1_BOUND_ITER.test(above)) {
      for (let j = k + 1; j <= k + 4; j += 1) {
        if (C1_ITERATION.test(lineAt(a.file, a.line - j))) return true;
      }
    }
  }
  return false;
}

/**
 * C2 — `indexOf` on the list the element was filtered FROM.
 *
 * CLASS ARGUMENT: every `if (i >= 0) list.splice(i, 1)` site in the engine searches a list for
 * an element obtained by `list.filter(...)` a few lines above — the element is in the list by
 * construction, so the `< 0` arm cannot be taken. CORPUS EVIDENCE: 6,000 games, zero
 * divergence; the three current sites are all in spread.ts's arrival bookkeeping.
 */
const C2 = /^if \((\w+) >= 0\) \w+\.splice\(\1, 1\);/;
// The condition is always TRUE, so the dead arm is the implicit else — arm 1 only.
const ruleC2 = (a: Arm): boolean => a.armIndex === 1 && C2.test(a.text);

/**
 * C3 — the exhausted tail of a closed-set zone chain.
 *
 * CLASS ARGUMENT: an invader or cell `zone` is exactly one of 'hub' | 'route' | 'branch' (the
 * type is that closed union, and every writer assigns a literal). A zone-equality test that is
 * the `} else if` tail of a chain, or whose immediately preceding lines already tested another
 * zone literal and returned, cannot see its false arm: the alternatives are exhausted. The
 * spelling requires that visible chain context precisely so a FIRST zone test — like `net`'s
 * hub guard, whose else-arm was real test debt — can never match. CORPUS EVIDENCE: 6,000
 * games, zero divergence.
 */
const ZONE_TEST = /\.zone === '(?:hub|route|branch)'/;
function ruleC3(a: Arm): boolean {
  // An exhausted chain tail's condition is always TRUE, so the dead arm is the else — arm 1.
  if (a.armIndex !== 1) return false;
  if (!ZONE_TEST.test(a.text)) return false;
  if (/^\} else if /.test(a.text)) return true;
  return ZONE_TEST.test(lineAt(a.file, a.line - 1)) || ZONE_TEST.test(lineAt(a.file, a.line - 2));
}

const ruleC = (a: Arm): 'C1' | 'C2' | 'C3' | undefined =>
  ruleC1(a) ? 'C1' : ruleC2(a) ? 'C2' : ruleC3(a) ? 'C3' : undefined;

const excluded: (Arm & { rule: 'A' | 'B' | 'C1' | 'C2' | 'C3'; why: string })[] = [];
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
    continue;
  }
  const c = ruleC(a);
  if (c) {
    excluded.push({
      ...a,
      rule: c,
      why:
        c === 'C1'
          ? 'presence guard on a total state member — constructed at newGame, never deleted'
          : c === 'C2'
            ? 'indexOf on the list the element was filtered from — present by construction'
            : 'exhausted tail of a closed-set zone chain — the alternatives returned above',
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
  // Rule C entries are watched by the same churn from day one (docs/FINDINGS.md #46): class
  // arguments are the weaker evidence, so every mechanical rule's exits are named, not only A's.
  let inRuleA = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('## Rule A') || line.startsWith('## Rule C')) inRuleA = true;
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
// The cap, computed from the ratio against THIS run's raw branch-arm universe. Both numbers
// print below so a provider change shows as a number that moved, not a cap that accommodated it.
const rawBranchArmCount = arms.filter((a) => a.kind === 'branch').length;
const maxExclusions = Math.floor(rawBranchArmCount * MAX_EXCLUSION_RATIO);
if (excluded.length > maxExclusions) {
  problems.push(
    `EXCLUSION LIST TOO LONG: ${excluded.length} > ${maxExclusions} ` +
      `(${(MAX_EXCLUSION_RATIO * 100).toFixed(1)}% of ${rawBranchArmCount} raw arms). ` +
      'This list is a liability.',
  );
}

/* --- the numbers --- */
// ARM-PRECISE keys, not line-level. A line-level key silently removed every sibling arm at an
// excluded line from the denominator — including, at simulate.ts:368, an uncovered BOT-REACHABLE
// arm that then vanished from the deferred list Phase 3 inherits. The `if (a.covered) continue`
// guard in the exclusion loop already expresses the intent (exclude only the dead arm); the key
// now matches it. Found at the v4 reconciliation by balancing the bot list's ledger.
const armKey2 = (a: Arm): string => `${a.file}:${a.line}:${a.armIndex}:${a.text}`;
const excludedKeys = new Set(excluded.map(armKey2));
const coverable = arms.filter((a) => !excludedKeys.has(armKey2(a)));
const branchArms = coverable.filter((a) => a.kind === 'branch');
const coveredBranch = branchArms.filter((a) => a.covered).length;
const pct = (coveredBranch / branchArms.length) * 100;

const rawBranch = arms.filter((a) => a.kind === 'branch');
const rawPct = (rawBranch.filter((a) => a.covered).length / rawBranch.length) * 100;

console.log('RESTATED COVERAGE GATE — 95% of coverable branch arms\n');
console.log(`  raw branch arms          ${rawBranch.length}`);
console.log(`  excluded (rule A)        ${excluded.filter((e) => e.rule === 'A').length}`);
console.log(`  excluded (rule B)        ${excluded.filter((e) => e.rule === 'B').length}`);
console.log(`  excluded (rule C)        ${excluded.filter((e) => e.rule.startsWith('C')).length}`);
console.log(
  `  exclusion cap            ${maxExclusions} (${(MAX_EXCLUSION_RATIO * 100).toFixed(1)}% of raw), used ${excluded.length}`,
);
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
    `${maxExclusions} entries (${(MAX_EXCLUSION_RATIO * 100).toFixed(1)}% of the ${rawBranchArmCount} raw arms — a ratio, so a`,
  'provider changing the arm universe moves the number visibly), or if any entry stops matching,',
  'or if an excluded arm turns out to be covered after all — which would mean it was never dead.',
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
lines.push('', '## Rule C — mechanical shapes from the v4-provider reconciliation', '');
lines.push(
  'Three shapes, each with its class argument and corpus evidence at the rule in',
  '`coverage-gate.ts` (docs/FINDINGS.md #46): C1 presence guards on total state members, C2',
  '`indexOf` on the list the element was filtered from, C3 exhausted tails of closed-set zone',
  'chains. Class arguments are the weaker evidence, so rule C is watched by the same churn',
  'report as rule A: every arm that leaves this list is named.',
  '',
);
const c1 = excluded.filter((e) => e.rule.startsWith('C'));
cur = '';
for (const e of c1.sort((x, y) =>
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
 * An arm is multiplayer if any of these is true, and all of them mean what they say:
 *
 *   1. It sits lexically inside a block guarded by `g.multiplayer`. Computed from the AST on
 *      every run, so it re-derives when code moves and cannot go stale. Brace-counting was
 *      rejected — the allocation pushLog contains `${pool === 1 ? '' : 's'}`, whose braces live
 *      inside a template literal and would desynchronise a naive scan.
 *   2. It sits after a TERMINATING `if (!g.multiplayer) { … return }` guard, in the same
 *      function. Everything past such a guard is reachable only when `g.multiplayer` is true, so
 *      it is the multiplayer path stated by early return rather than by nesting. Added at E1 —
 *      see below.
 *   3. Its own source text names a multiplayer concept. Case-INSENSITIVE, which the old regex
 *      was not: the `<b>Allocation phase.</b> Captain has ...` log line spells it `Captain` and
 *      was matched only by the positional clause it is now free of.
 *
 * ⚠️ CORRECTED AT TASK E1 — docs/FINDINGS.md #30. This rule used to begin:
 *
 *     a.short === 'ap.ts' ||
 *
 * justified by the comment *"`ap.ts` is multiplayer wholesale — it is the per-player AP budget
 * and nothing else."* **That sentence was false.** `ap.ts` also holds `spend()` and `hasFree()`,
 * which are the Helper T-Cell's free-action pool and have nothing to do with multiplayer. So
 * `ap.ts:40` — a branch that is dead because NOTHING EVER GRANTS A FREE ACTION at any player
 * count (docs/FINDINGS.md #29) — was filed into the list Phase 3 inherits as its to-do, where no
 * relay could ever discharge it.
 *
 * It is the same defect C1 fixed one clause to the right: classification by POSITION rather than
 * by meaning. A line range became a file name and survived, because **C1's audit compared the old
 * and new rules across all 1,526 arms and this clause was in both of them.** A diff cannot see a
 * defect both sides share — the general law is in tests/property/README.md.
 *
 * Clause 2 exists because deleting the file rule alone would have misfiled `ap.ts:29` the other
 * way: V8 attributes the else-arm of `if (!g.multiplayer) { …; return }` to the closing brace,
 * and that arm genuinely IS the multiplayer path. Removing one positional rule by adding another
 * would have been no improvement; clause 2 is derived from the AST and says what it means.
 */
const MP_VOCAB = /multiplayer|captain|apBudget|apPool|allocat/i;

/**
 * Multiplayer line ranges in a file, from the AST. Two shapes, both meaning "only reachable when
 * `g.multiplayer`":
 *
 *   `if (g.multiplayer) { HERE }`
 *   `if (!g.multiplayer) { … return }  HERE-to-end-of-function`
 */
function multiplayerRegions(file: string): { from: number; to: number }[] {
  const text = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  const out: { from: number; to: number }[] = [];
  const lineOf = (pos: number): number => sf.getLineAndCharacterOfPosition(pos).line + 1;

  const guardsOnMultiplayer = (e: ts.Expression): boolean =>
    /^g\.multiplayer$/.test(e.getText(sf).trim());

  const guardsOnNotMultiplayer = (e: ts.Expression): boolean =>
    ts.isPrefixUnaryExpression(e) &&
    e.operator === ts.SyntaxKind.ExclamationToken &&
    /^g\.multiplayer$/.test(e.operand.getText(sf).trim());

  /** Does this statement definitely leave the function? Only then is "everything after" guarded. */
  const terminates = (s: ts.Statement): boolean => {
    if (ts.isReturnStatement(s) || ts.isThrowStatement(s)) return true;
    if (ts.isBlock(s)) {
      const last = s.statements[s.statements.length - 1];
      return last ? terminates(last) : false;
    }
    return false;
  };

  const enclosingBody = (n: ts.Node): ts.Node | null => {
    for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
      if (
        ts.isFunctionDeclaration(p) ||
        ts.isFunctionExpression(p) ||
        ts.isArrowFunction(p) ||
        ts.isMethodDeclaration(p)
      ) {
        return p.body ?? null;
      }
    }
    return null;
  };

  const visit = (n: ts.Node): void => {
    if (ts.isIfStatement(n)) {
      if (guardsOnMultiplayer(n.expression)) {
        out.push({
          from: lineOf(n.thenStatement.getStart(sf)),
          to: lineOf(n.thenStatement.getEnd()),
        });
      } else if (
        guardsOnNotMultiplayer(n.expression) &&
        !n.elseStatement &&
        terminates(n.thenStatement)
      ) {
        const body = enclosingBody(n);
        if (body) {
          // From the guard's closing brace inclusive: V8 attributes the implicit else-arm there.
          out.push({ from: lineOf(n.getEnd()), to: lineOf(body.getEnd()) });
        }
      }
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
  MP_VOCAB.test(a.text) || regionsFor(a.file).some((r) => a.line >= r.from && a.line <= r.to);

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
  '## Phase 3 — reachable once a competent bot exists (' + deferredBot.length + ' arms)',
  '',
  "Inside `simulate()`'s inlined bot. The current reference bot plays ~6 of 14 seats and never",
  'emits 8 of 27 actions (docs/FINDINGS.md §1), so these heuristics are never entered. A bot',
  'good enough to measure difficulty would reach them.',
  '',
  '**These were listed against Phase 2 until 18 August 2026.** The bot is inlined in the engine',
  '(docs/FINDINGS.md #6) and `simulate()` is compared byte-identically by the B6 corpus check, so',
  'building a competent bot is an engine change that breaks the corpus — which Phase 2 forbids in',
  'its own definition of done. They move here, alongside the seat-filling AI they are the same',
  'work as. See docs/PHASE2_BRIEF.md v1.1 §6, review item A.',
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
console.log('  deferred to Phase 3 (bot)         : ' + deferredBot.length);
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
