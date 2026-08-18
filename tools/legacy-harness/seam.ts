/**
 * TASK G, STEP 1 — MEASURE THE SEAM.
 *
 *   npx tsx tools/legacy-harness/seam.ts
 *
 * `v2_ui.html` carries a literal injection point:
 *
 *     <script>
 *     /* __ENGINE__ *\/
 *     </script>
 *
 * and `tools/legacy/spectator_build.js` shows the contract: read the engine, strip its
 * `module.exports`, substitute it at the marker. The engine therefore arrives as a CLASSIC SCRIPT
 * whose top-level declarations become globals that the board script below it can see.
 *
 * So the harness's real question is not "does the port export enough", it is:
 *
 *   > WHICH NAMES DOES THE BOARD SCRIPT ACTUALLY REFERENCE THAT IT DOES NOT DECLARE ITSELF,
 *   > and does the ported engine provide every one?
 *
 * This measures that, rather than assuming it. A name the UI needs and the port does not publish
 * is a `ReferenceError` at the worst possible moment — mid-game, in a build a human is trying to
 * judge — and it would look like a gameplay bug rather than a missing export.
 *
 * METHOD. Parse the board script with the TypeScript compiler API, walk every scope, and collect
 * identifiers that are read but never declared in any enclosing scope. Subtract the browser
 * globals and the names the UI declares at its own top level. What remains is the demand surface.
 *
 * This is deliberately a MEASUREMENT SCRIPT, not part of the build: step 1 reports before any shim
 * is written, because anything needing more than a rename is a finding rather than something to
 * work around quietly.
 */

import { measureSeam } from './seam-lib.js';

// --- report -------------------------------------------------------------------------------------

// A name the UI needs is satisfiable if the legacy engine declares it at top level, because that
// is what injection puts in scope. Legacy's module.exports list is the CONTRACT, but the injected
// script exposes every top-level declaration, so the two can differ — and that difference is
// exactly the kind of thing worth knowing before building a shim.
//
// The measurement itself lives in seam-lib.ts, so step 2 and the shim talk about the SAME surface.
const {
  exportsLegacy,
  topLevelLegacy,
  exportsPort,
  free,
  demanded,
  fromEngine,
  notFromEngine,
  covered,
  missing,
} = measureSeam();

const line = '='.repeat(95);
console.log(line);
console.log('TASK G STEP 1 — THE SEAM, MEASURED');
console.log(line);
console.log(
  `legacy module.exports          ${exportsLegacy.length} names (the documented contract)`,
);
console.log(
  `legacy top-level declarations  ${topLevelLegacy.size} names (what injection ACTUALLY exposes)`,
);
console.log(`port index.ts exports          ${exportsPort.length} names`);
console.log(
  `board script free identifiers  ${free.size} (${demanded.length} after removing browser globals)`,
);
console.log('');

console.log(
  '-- WHAT THE UI DEMANDS FROM THE ENGINE ----------------------------------------------',
);
console.log(
  `  ${fromEngine.length} names the board script reads that the legacy engine declares.\n`,
);
console.log(`  COVERED by the port : ${covered.length}`);
console.log(`  MISSING from the port: ${missing.length}`);
if (missing.length > 0) {
  console.log('');
  for (const n of missing) console.log(`    MISSING  ${n}  (referenced ${free.get(n)}x)`);
  console.log(
    '\n  Each of these is a ReferenceError mid-game in a build a human is trying to judge.',
  );
} else {
  console.log('\n  The port covers every engine name the UI reads.');
}

console.log('');
console.log(
  '-- FREE NAMES THE ENGINE DOES NOT DECLARE -------------------------------------------',
);
console.log('   Expected: art data, UI globals defined in other script blocks, browser APIs this');
console.log('   script did not list. Reported so nothing is silently assumed to be fine.\n');
for (const n of notFromEngine.slice(0, 60)) {
  console.log(`    ${n.padEnd(28)} ${free.get(n)}x`);
}
if (notFromEngine.length > 60) console.log(`    ... and ${notFromEngine.length - 60} more`);

console.log('');
console.log(
  '-- PORT EXPORTS THE UI NEVER READS ---------------------------------------------------',
);
const unused = exportsPort.filter((n) => !demanded.includes(n));
console.log(
  `   ${unused.length} of ${exportsPort.length}. Not a problem — the engine's contract is`,
);
console.log("   legacy's 67 exports, not the UI's needs. Listed for completeness.\n");
console.log(
  unused.length > 0
    ? `    ${unused.slice(0, 40).join(', ')}${unused.length > 40 ? ', ...' : ''}`
    : '    (none)',
);

process.exit(missing.length > 0 ? 1 : 0);
