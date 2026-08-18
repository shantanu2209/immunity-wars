/**
 * TASK G, STEP 2 — STATIC DRIFT CHECK, BEFORE ANYONE OPENS ANYTHING.
 *
 *   npx tsx tools/legacy-harness/drift.ts
 *
 * docs/TASK_G_PLAN.md §3 step 2 states the risk this exists to remove:
 *
 *   > Task C extracted every player-visible string into i18n catalogues, but `v2_ui.html` holds
 *   > its own copies. If they have drifted, he will see wrong text AND IT WILL LOOK LIKE AN
 *   > ENGINE BUG.
 *
 * The risk is real. The mechanism named there is not the one that can cause it, and that is said
 * plainly here because building the check as written would have produced a green result over the
 * wrong surface:
 *
 *   **The catalogues cannot make him see wrong text, because nothing renders them.**
 *   `packages/content/src/i18n/en/engine.json` says so in its own `$meta` — "Nothing consumes
 *   this yet — Phase 2 does". The harness renders `v2_ui.html`'s literals and the PORT's
 *   literals. A catalogue could be arbitrarily wrong and both windows would still look identical.
 *
 * So the honest question for step 2 is not "have the catalogues drifted" but:
 *
 *   > **WHICH TEXT DOES THE HARNESS SOURCE DIFFERENTLY FROM TODAY'S BUILD, AND IS EVERY PIECE OF
 *   > IT PINNED TO LEGACY BY SOMETHING THAT WOULD FAIL IF IT DRIFTED?**
 *
 * Today's build and the harness render the SAME `v2_ui.html`. Every literal and every table
 * declared in that file is therefore identical in both windows by construction — it cannot drift
 * between them, whatever it may have drifted from. **The only text that changes hands is the text
 * that arrives through the seam**: the 49 names step 1 measured, plus the engine's own runtime
 * messages.
 *
 * Four legs, in the order a difference would reach his eyes.
 *
 *   LEG 1  THE SEAM'S VALUES. Every one of the 49 names the UI reads, port/content against
 *          legacy's ACTUAL top-level binding — values and key order — with the string leaves
 *          counted so the text surface is a number rather than an impression.
 *   LEG 2  WHAT PINS EACH ONE. Cross-references the 49 against the checks that would fail on a
 *          drift. A name no check covers is the finding: measuring agreement today says nothing
 *          about tomorrow.
 *   LEG 3  THE ENGINE'S RUNTIME MESSAGES — `err()` and `pushLog()`, the text of the log panel.
 *   LEG 4  THE UI'S OWN COPIES against `packages/content`. Not a harness risk, per the argument
 *          above; reported anyway, because "not a risk" is a claim, and an unchecked claim is how
 *          this project has been wrong repeatedly (docs/FINDINGS.md #37).
 *
 * READ-ONLY. Like `seam.ts`, this only ever reads `tools/legacy/`.
 */

import * as content from '@immunity-wars/content';
import * as port from '@immunity-wars/engine';
import { legacySource } from '@immunity-wars/equivalence/engine';
import { canonical } from '@immunity-wars/equivalence/hash';

import { measureSeam } from './seam-lib.js';

// --- legacy, as the browser would see it ---------------------------------------------------------

/**
 * Legacy's TOP-LEVEL bindings, not its `module.exports`.
 *
 * This is the whole point of step 1's finding (docs/FINDINGS.md #39): injection exposes all 153
 * top-level declarations, so five of the names the UI reads are not in the 67-export contract and
 * cannot be reached through `module.exports` at all. Reading them the way injection does is the
 * only way to compare what the browser will actually hold.
 *
 * The appended collector is built from names the parser found in the file itself, and the source
 * on disk is never touched.
 */
function legacyTopLevelValues(
  names: readonly string[],
  source: string = legacySource(),
): Record<string, unknown> {
  const collector = `\n;module.exports.__topLevel__ = { ${names.join(', ')} };\n`;
  const mod = { exports: {} as Record<string, unknown> };
  const required = (id: string): never => {
    throw new Error(`legacy: unexpected require(${JSON.stringify(id)})`);
  };
  const factory = new Function('module', 'exports', 'require', source + collector) as (
    m: typeof mod,
    e: Record<string, unknown>,
    r: (id: string) => never,
  ) => void;
  factory(mod, mod.exports, required);
  const top = mod.exports['__topLevel__'];
  if (!top || typeof top !== 'object') {
    throw new Error('legacy: the top-level collector produced nothing');
  }
  return top as Record<string, unknown>;
}

/** What the harness will actually put in scope for a given seam name, and where it comes from. */
function portValue(name: string): { value: unknown; from: 'engine' | 'content' | 'MISSING' } {
  const fromEngine = (port as unknown as Record<string, unknown>)[name];
  if (fromEngine !== undefined) return { value: fromEngine, from: 'engine' };
  const fromContent = (content as unknown as Record<string, unknown>)[name];
  if (fromContent !== undefined) return { value: fromContent, from: 'content' };
  return { value: undefined, from: 'MISSING' };
}

/** Sets have no own enumerable keys, so canonical() would render every Set as `{}`. */
const comparable = (v: unknown): unknown => (v instanceof Set ? { '#set': [...v] } : v);

interface Leaf {
  path: string;
  text: string;
}

/**
 * Every string leaf in a value, with its path.
 *
 * "Player-visible" has no mechanical test — docs/STRING_INVENTORY.md §3 says so, and the number
 * there is a range for exactly that reason. This does not try to decide. It counts STRING LEAVES,
 * which is an upper bound and the right shape for the question being asked: a name with zero of
 * them cannot possibly show him wrong text, and for a name with some, the value comparison
 * settles it either way.
 */
function stringLeaves(v: unknown, path = '', out: Leaf[] = []): Leaf[] {
  if (typeof v === 'string') out.push({ path, text: v });
  else if (Array.isArray(v)) v.forEach((x, i) => stringLeaves(x, `${path}[${i}]`, out));
  else if (v instanceof Set) [...v].forEach((x, i) => stringLeaves(x, `${path}#${i}`, out));
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      stringLeaves(x, path ? `${path}.${k}` : k, out);
    }
  }
  return out;
}

const LINE = '='.repeat(95);
const rule = (t: string): string => `-- ${t} ${'-'.repeat(Math.max(0, 86 - t.length))}`;

interface Row {
  name: string;
  kind: 'function' | 'data';
  from: 'engine' | 'content' | 'MISSING';
  strings: number;
  agrees: boolean;
  detail?: string;
}

/** The comparison itself, over one set of legacy bindings. The control drives this too. */
function compare(seamNames: readonly string[], legacyTop: Record<string, unknown>): Row[] {
  const rows: Row[] = [];
  for (const name of seamNames) {
    const theirs = legacyTop[name];
    const { value: mine, from } = portValue(name);
    const kind = typeof theirs === 'function' ? 'function' : 'data';
    const leaves = kind === 'function' ? [] : stringLeaves(theirs);
    const agrees =
      kind === 'function'
        ? typeof mine === 'function'
        : canonical(comparable(mine)) === canonical(comparable(theirs));

    let detail: string | undefined;
    if (!agrees) {
      if (kind === 'function') {
        detail = `legacy declares a function; the port supplies ${typeof mine}`;
      } else {
        const byPath = new Map(leaves.map((l) => [l.path, l.text]));
        const bad = stringLeaves(mine).find((l) => byPath.get(l.path) !== l.text);
        detail = bad
          ? `${bad.path}: port ${JSON.stringify(bad.text)} vs legacy ${JSON.stringify(byPath.get(bad.path))}`
          : 'differs in structure, key order, or a non-string value';
      }
    }
    rows.push({ name, kind, from, strings: leaves.length, agrees, detail });
  }
  return rows;
}

console.log(LINE);
console.log('TASK G STEP 2 — STATIC DRIFT, MEASURED');
console.log(LINE);

const seam = measureSeam();
const rows = compare(seam.fromEngine, legacyTopLevelValues(seam.fromEngine));

// --- LEG 1 — the seam's values -------------------------------------------------------------------

const data = rows.filter((r) => r.kind === 'data');
const fns = rows.filter((r) => r.kind === 'function');
const textBearing = data.filter((r) => r.strings > 0);
const disagree = rows.filter((r) => !r.agrees);

console.log(rule('LEG 1 — HOW MUCH TEXT ACTUALLY CROSSES THE SEAM'));
console.log(
  `   ${seam.fromEngine.length} names cross it: ${fns.length} functions, ${data.length} data.`,
);
console.log(
  `   ${textBearing.length} of the ${data.length} data names carry text — ` +
    `${textBearing.reduce((n, r) => n + r.strings, 0)} string leaves in total.\n`,
);
for (const r of [...textBearing].sort(
  (a, b) => b.strings - a.strings || a.name.localeCompare(b.name),
)) {
  console.log(
    `     ${r.agrees ? 'OK  ' : 'DIFF'}  ${r.name.padEnd(22)} ${String(r.strings).padStart(4)} strings   from ${r.from}`,
  );
}
console.log('');
console.log(`   values agreeing with legacy: ${rows.length - disagree.length} / ${rows.length}`);
if (disagree.length > 0) {
  for (const r of disagree) console.log(`     DIFF  ${r.name} — ${r.detail ?? '(no detail)'}`);
} else {
  console.log("   Every name the UI reads holds legacy's value, byte for byte and in key order.");
}

// --- LEG 2 — what would fail if one of them drifted ----------------------------------------------

/** legacy's `module.exports` — the surface `tests/equivalence/src/data.test.ts` iterates. */
const pinnedByDataTest = new Set(seam.exportsLegacy);
const unpinnedData = data.filter((r) => !pinnedByDataTest.has(r.name));

console.log('');
console.log(rule('LEG 2 — WHAT PINS EACH ONE, TOMORROW AS WELL AS TODAY'));
console.log('   Leg 1 measures agreement NOW. A name no check covers can drift the day after this');
console.log('   runs, so the load-bearing question is which check would go red.\n');
console.log(`   data names inside legacy's 67 exports  : ${data.length - unpinnedData.length}`);
console.log(
  '     -> pinned by tests/equivalence/src/data.test.ts, which iterates exactly that list',
);
console.log(`   data names OUTSIDE it                  : ${unpinnedData.length}`);
for (const r of unpinnedData) {
  console.log(
    `     UNPINNED  ${r.name.padEnd(22)} ${String(r.strings).padStart(4)} strings   supplied from ${r.from}`,
  );
}
console.log(`   function names                         : ${fns.length}`);
console.log(
  '     -> pinned behaviourally by the equivalence corpus (state hash, action for action)',
);

// --- LEG 3 — the engine's runtime messages -------------------------------------------------------

console.log('');
console.log(rule('LEG 3 — THE LOG PANEL: err() AND pushLog()'));
console.log('   The strings the port generates at runtime and the UI renders verbatim. Both are');
console.log('   already pinned against legacy directly:');
console.log(
  '     - tests/equivalence/src/actions.test.ts — every err() string, frozen since Task B',
);
console.log('     - the equivalence corpus — the state hash INCLUDES the log HTML (rig.ts), so a');
console.log('       pushLog() wording change moves the hash on every game that reaches that line');

// --- LEG 4 — the UI's own copies -----------------------------------------------------------------

console.log('');
console.log(rule("LEG 4 — v2_ui.html's OWN TABLES vs packages/content"));
console.log('   Both windows render the SAME v2_ui.html, so this cannot differ BETWEEN them. The');
console.log('   existing checks are reported rather than reimplemented:');
console.log('     - tests/equivalence/src/ui-content.test.ts  — 19 tables, values AND key order');
console.log('     - tests/equivalence/src/i18n-engine.test.ts — catalogue vs engine, legs 1 and 2');

// --- THE NEGATIVE CONTROL ------------------------------------------------------------------------

/**
 * A check that has never failed is not known to work — CLAUDE.md, and it has been true here about
 * ten times with zero false alarms. So the green above is not reported on its own.
 *
 * Each mutation is applied to a COPY of the legacy source in memory, never to the file, and each
 * must match exactly once: a stale mutation that matches zero times would produce a silent false
 * PASS, which is the failure mode `engine.ts` already guards against for the corpus.
 *
 * docs/FINDINGS.md #32 — a control that fires is not enough; it must fire on the RIGHT name. So
 * each case names the row it must turn red, and a mutation that reddens some other row is treated
 * as a failure rather than a pass.
 */
interface Control {
  readonly what: string;
  readonly find: string;
  readonly replace: string;
  /** The seam name this must turn red — and the only one. */
  readonly expect: string;
}

const CONTROLS: readonly Control[] = [
  {
    what: 'a player-visible organ name is reworded',
    find: 'name:"Heart"',
    replace: 'name:"Hart"',
    expect: 'ORGANS',
  },
  {
    // The most important of the four. LYMPH_STEP is one of the five names from FINDINGS #39 —
    // outside legacy's 67 exports, so data.test.ts does not iterate it and NOTHING but this
    // check compares it. If this control does not fire, the five are unverified and unwatched.
    what: 'an unexported movement constant changes value (FINDINGS #39, one of the five)',
    find: 'const LYMPH_STEP = 3;',
    replace: 'const LYMPH_STEP = 4;',
    expect: 'LYMPH_STEP',
  },
  {
    what: 'a per-difficulty range table changes one entry',
    find: 'const SNIPE_RANGE_BY_DIFF = { training:3, normal:2, hard:2 };',
    replace: 'const SNIPE_RANGE_BY_DIFF = { training:4, normal:2, hard:2 };',
    expect: 'SNIPE_RANGE_BY_DIFF',
  },
  {
    // KEY ORDER ONLY — every key and every value is unchanged. `toEqual` would pass this.
    // Order is load-bearing in this engine (docs/FINDINGS.md, TROPISM feeding rollOrgan), which
    // is why the comparison uses canonical() and why this case exists to prove it does.
    what: 'two keys are reordered, with every key and value identical',
    find: 'const SPEED={macrophage:1,neutrophil:2,',
    replace: 'const SPEED={neutrophil:2,macrophage:1,',
    expect: 'SPEED',
  },
];

console.log('');
console.log(rule('NEGATIVE CONTROL — CAN THIS CHECK FAIL AT ALL?'));

const src = legacySource();
const controlFailures: string[] = [];
for (const c of CONTROLS) {
  const hits = src.split(c.find).length - 1;
  if (hits !== 1) {
    controlFailures.push(
      `${c.expect}: mutation matched ${hits}x, expected exactly 1 — it is stale`,
    );
    console.log(
      `     STALE  ${c.expect.padEnd(22)} matched ${hits}x — would have passed vacuously`,
    );
    continue;
  }
  const mutated = compare(
    seam.fromEngine,
    legacyTopLevelValues(seam.fromEngine, src.replace(c.find, c.replace)),
  );
  const red = mutated.filter((r) => !r.agrees).map((r) => r.name);
  const ok = red.length === 1 && red[0] === c.expect;
  if (!ok) {
    controlFailures.push(
      `${c.expect}: expected exactly that name to go red, got [${red.join(', ') || 'nothing'}]`,
    );
  }
  console.log(
    `     ${ok ? 'FIRES ' : 'BROKEN'} ${c.expect.padEnd(22)} ${c.what}` +
      (ok ? '' : `  -> reddened [${red.join(', ') || 'nothing'}]`),
  );
}
if (controlFailures.length === 0) {
  console.log('\n   All four fire, each on exactly the name it targets — including the key-order');
  console.log(
    '   case, which every key and value survives unchanged. The green above means something.',
  );
}

console.log('');
console.log(LINE);
const drifted = disagree.length > 0;
console.log(
  `VERDICT: ${drifted ? `${disagree.length} NAME(S) DISAGREE WITH LEGACY` : 'NO DRIFT ACROSS THE SEAM'}`,
);
if (controlFailures.length > 0) {
  console.log('CONTROL: FAILED — the verdict above is not evidence of anything.');
  for (const f of controlFailures) console.log(`         ${f}`);
} else {
  console.log('CONTROL: all four mutations detected, each on its own name.');
}
console.log(LINE);

process.exit(drifted || controlFailures.length > 0 ? 1 : 0);
