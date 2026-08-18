/**
 * P2.1 STEP 2 — WHERE DOES EACH THING THE UI DEMANDS LIVE IN PHASE 2?
 *
 *   pnpm seam:homes
 *
 * ============================================================================================
 * THIS REPORTS. IT DOES NOT DECIDE, AND NOTHING SHOULD BE DESIGNED AGAINST IT UNTIL SHANTANU
 * HAS READ IT. docs/PHASE2_BRIEF.md v1.1 §3 holds P2.1 here on purpose.
 * ============================================================================================
 *
 * THE QUESTION. Phase 2's boundary rule says `packages/ui` may import `content` and the session
 * package, and may never import `engine`. `v2_ui.html` reads 49 names out of the injected
 * engine. So every one of those 49 needs a home on the permitted side of the rule, and the
 * brief deliberately does not pick one for the hardest group.
 *
 *   data tables      -> `content`. `ui` imports them directly; the rule permits it.
 *   engine-driving   -> behind `Session.sendAction`. The UI asks; Session applies.
 *   queries          -> ??? Either Session exposes them, or the view precomputes them, or the
 *                       rule takes an exception. THIS IS THE OPEN DECISION.
 *
 * WHY THIS IS A MEASUREMENT AND NOT A SECOND HAND-WRITTEN LIST. The review that raised this
 * classified the 49 by reading them. A list produced by reading is exactly the artefact this
 * project keeps catching out — an inventory missing its largest entry (FINDINGS #37), a
 * contract that had quietly widened by 38 names because prose asserted it and nothing checked.
 * So every column below comes from something the repository maintains for its own reasons:
 *
 *   - the demand surface        `seam-lib.ts`, the SAME measurement Task G steps 1-3 used
 *   - the origin of each name   the module `packages/engine/src/index.ts` re-exports it from,
 *                               which the engine groups by port phase (B1 data, B2 pure
 *                               queries, B3 construction, B4 actions, B5 spread, B6 simulate)
 *   - value or function         `typeof`, at runtime, on the real export
 *   - is it really content's    object IDENTITY against `@immunity-wars/content`, the same
 *                               check `tests/equivalence/src/exports.test.ts` makes
 *
 * The one judgement call is the module -> home table below, and it is written out so it can be
 * argued with rather than inferred from the output.
 *
 * ANYTHING THAT FITS NO HOME IS A FINDING AND IS PRINTED AS ONE. The script exits non-zero on
 * an unclassifiable name or on a cross-check disagreement, because "the report ran" and "the
 * report found nothing" must not look the same.
 */

import * as content from '@immunity-wars/content';
import * as engine from '@immunity-wars/engine';

import { measureSeam, portExportOrigins } from './seam-lib.js';

// --- the one judgement call, written down -------------------------------------------------------

type Home = 'content' | 'query' | 'engine-driving';

/**
 * Module of origin -> proposed home.
 *
 * `./primitives.js` sits with the queries rather than with the engine-driving names: `branchLen`
 * and `famOf` are total functions of their arguments that touch no state at all. They are the
 * cheapest members of the query group, and if the group goes behind Session they go with it.
 */
const HOME_OF_MODULE: ReadonlyMap<string, Home> = new Map([
  ['@immunity-wars/content', 'content'],
  ['./queries.js', 'query'],
  ['./primitives.js', 'query'],
  ['./actions.js', 'engine-driving'],
  ['./construct.js', 'engine-driving'],
  ['./spread.js', 'engine-driving'],
  ['./view.js', 'engine-driving'],
  ['./simulate.js', 'engine-driving'],
  ['./knobs.js', 'engine-driving'],
]);

// --- measure ------------------------------------------------------------------------------------

const { fromEngine, free } = measureSeam();
const origins = portExportOrigins();

const engineNs = engine as unknown as Record<string, unknown>;
const contentNs = content as unknown as Record<string, unknown>;

interface Row {
  readonly name: string;
  readonly refs: number;
  /** Module `packages/engine/src/index.ts` re-exports it from, or '' if the port omits it. */
  readonly origin: string;
  readonly home: Home | 'UNCLASSIFIED';
  readonly kind: 'function' | 'value' | 'absent';
  /** True when content exports the SAME OBJECT — identity, not a name match. */
  readonly sameObjectAsContent: boolean;
  readonly notes: string[];
}

const rows: Row[] = fromEngine.map((name) => {
  const origin = origins.get(name) ?? '';
  const inPort = name in engineNs;
  const value = inPort ? engineNs[name] : undefined;
  const kind: Row['kind'] = !inPort ? 'absent' : typeof value === 'function' ? 'function' : 'value';
  const sameObjectAsContent = name in contentNs && contentNs[name] === value;
  const notes: string[] = [];

  let home: Row['home'] = HOME_OF_MODULE.get(origin) ?? 'UNCLASSIFIED';

  // A name the port never publishes, that content does, is data the UI reads directly. These are
  // FINDINGS #39's five: the harness binds them from content because nothing was added to the
  // engine to change that, and Phase 2 inherits the same answer for the same reason.
  if (!inPort && name in contentNs) {
    home = 'content';
    notes.push('port does not export it; content does — FINDINGS #39');
  }

  // Cross-checks. Each one is a way the module-based classification could be wrong, and a
  // disagreement is worth more than the classification it disagrees with.
  if (home === 'content' && kind === 'function') {
    notes.push('CROSS-CHECK FAILED: classified as data but it is a function');
  }
  if ((home === 'query' || home === 'engine-driving') && kind === 'value') {
    notes.push('CROSS-CHECK FAILED: classified as behaviour but it is not a function');
  }
  if (home === 'content' && inPort && !sameObjectAsContent) {
    notes.push('CROSS-CHECK FAILED: engine re-exports it but it is NOT content’s object');
  }
  if (home === 'UNCLASSIFIED') {
    notes.push(origin ? `no home for module ${origin}` : 'not exported by the port at all');
  }

  return { name, refs: free.get(name) ?? 0, origin, home, kind, sameObjectAsContent, notes };
});

// --- report -------------------------------------------------------------------------------------

const line = '='.repeat(97);
const by = (h: Row['home']): Row[] => rows.filter((r) => r.home === h);

console.log(line);
console.log('P2.1 STEP 2 — THE 49 NAMES THE UI DEMANDS, AND WHERE EACH ONE COULD LIVE');
console.log(line);
console.log('');
console.log(
  `  demand surface (seam-lib)   ${rows.length} names the board script reads from the engine`,
);
console.log(`  total references            ${rows.reduce((n, r) => n + r.refs, 0)}`);
console.log('');
console.log(
  `  -> content        ${String(by('content').length).padStart(2)}   ui imports @immunity-wars/content directly`,
);
console.log(
  `  -> query          ${String(by('query').length).padStart(2)}   OPEN — Session, precomputed view, or an exception`,
);
console.log(
  `  -> engine-driving ${String(by('engine-driving').length).padStart(2)}   behind Session.sendAction`,
);
console.log(
  `  -> UNCLASSIFIED   ${String(by('UNCLASSIFIED').length).padStart(2)}   a finding if non-zero`,
);
console.log('');

const show = (title: string, blurb: string, list: Row[]): void => {
  console.log(`-- ${title} ${'-'.repeat(Math.max(0, 92 - title.length))}`);
  console.log(`   ${blurb}`);
  console.log('');
  for (const r of [...list].sort((a, b) => b.refs - a.refs || a.name.localeCompare(b.name))) {
    const flag = r.notes.some((n) => n.startsWith('CROSS-CHECK')) ? ' !!' : '   ';
    console.log(
      `  ${flag} ${r.name.padEnd(24)} ${String(r.refs).padStart(4)}x  ${r.kind.padEnd(8)} ${r.origin || '(not in port)'}`,
    );
    for (const n of r.notes) console.log(`        ${n}`);
  }
  console.log('');
};

show(
  'HOME: content — settled',
  'ui imports these directly. The boundary rule permits it and the permitted edge has a control.',
  by('content'),
);

show(
  'HOME: engine-driving — settled',
  'The UI never calls these. It calls Session.sendAction, and Session applies them to state it owns.',
  by('engine-driving'),
);

show(
  'HOME: query — OPEN, THIS IS THE DECISION',
  'Called on every render to decide what is clickable. Three options, none picked. See below.',
  by('query'),
);

if (by('UNCLASSIFIED').length > 0) {
  show(
    'FINDING: no home at all',
    'Reported before being worked around, per docs/PHASE2_BRIEF.md v1.1 §3.',
    by('UNCLASSIFIED'),
  );
}

const crossCheckFailures = rows.filter((r) => r.notes.some((n) => n.startsWith('CROSS-CHECK')));

console.log(line);
console.log('THE DECISION, AND WHAT THE MEASUREMENT SAYS ABOUT IT');
console.log(line);
console.log('');
console.log(
  `  ${by('query').length} query names, ${by('query').reduce((n, r) => n + r.refs, 0)} references in the board script.`,
);
console.log('');
console.log('  A. Session exposes them.  Session gains a query surface beside sendAction.');
console.log('     Shantanu leans here: precomputing every result into every view inflates the');
console.log('     exact payload Task E measured for the Phase 3 relay.');
console.log('     Cost: the surface is wide, and every one has to cross a relay in Phase 3 or be');
console.log('     answered client-side from a view that does not contain the deck.');
console.log('');
console.log('  B. The view precomputes them.  ViewState carries the answers, not the questions.');
console.log('     Cost: pays for all of them on every action, including the ones this screen does');
console.log('     not use, and each is a per-target array rather than a scalar.');
console.log('');
console.log('  C. The rule takes an exception for pure queries.');
console.log('     Cost: the rule is the deliverable (FINDINGS #39). An exception is the fork.');
console.log('');
console.log('  NOT MEASURED HERE, and it is what option B actually turns on: how large the');
console.log('  precomputed answers are on a real mid-game state. That is a Task-E-shaped');
console.log('  measurement and it is not in this report. Do not read the reference counts as a');
console.log('  proxy for it — a name read 40 times may answer in a boolean.');
console.log('');

if (crossCheckFailures.length > 0) {
  console.log(
    `  ${crossCheckFailures.length} CROSS-CHECK FAILURE(S) — the classification disagrees with itself.`,
  );
  for (const r of crossCheckFailures) console.log(`    ${r.name}: ${r.notes.join('; ')}`);
}

const problems = by('UNCLASSIFIED').length + crossCheckFailures.length;
if (problems === 0) {
  console.log('  Every one of the 49 has a home, and no cross-check disagreed.');
}
process.exit(problems > 0 ? 1 : 0);
