/**
 * TASK G, STEP 6 — THE NEGATIVE CONTROLS FOR "IS THIS ACTUALLY THE NEW ENGINE?"
 *
 *   npx tsx tools/legacy-harness/controls.ts
 *
 * docs/TASK_G_PLAN.md §3 step 6, verbatim:
 *
 *   > **Negative-control both: construct a build that DOES contain legacy, and confirm the check
 *   > fires.** A check that has never failed is not known to work — and this is the one check
 *   > standing between a convincing demonstration and a worthless one.
 *
 * The legacy-absent check needs this more than any other check in the repository, because
 * `legacy-absent.ts` explains why it cannot earn credibility on its own: its fingerprints are
 * everything in legacy that a legitimate build does not contain, so a legitimate build passes by
 * construction. **The green means nothing until something here goes red on purpose.**
 *
 * Each control states which assertion it must redden, and reddening a different one is a failure,
 * not a pass — docs/FINDINGS.md #32.
 *
 * Nothing is written to `tools/legacy/`, and no committed file is mutated: every control builds a
 * doctored artifact IN MEMORY.
 *
 * Exit codes: 0 all controls fired exactly as specified · 1 one did not.
 */

import { assertArtifact, buildHarness } from './build.js';
import { legacyEngineSource, legacyFingerprints } from './legacy-absent.js';

interface Control {
  readonly name: string;
  readonly why: string;
  /** Produce a doctored artifact from the real one. */
  readonly doctor: (html: string) => string;
  /** The assertion name this must turn red — exactly this one, and no other. */
  readonly expect: string;
}

const CONTROLS: readonly Control[] = [
  {
    name: 'THE ONE THAT MATTERS — a build that silently contains the legacy engine',
    why: 'this is the failure Shantanu named: a build that passes his test and proves nothing',
    // The full legacy engine, injected the way spectator_build.js injected it — module.exports
    // sliced off, so it is a plausible fallback rather than an obviously broken paste.
    doctor: (html) => {
      const legacy = legacyEngineSource();
      const cut = legacy.indexOf('module.exports');
      const injected = cut > -1 ? legacy.slice(0, cut) : legacy;
      return html.replace(
        '<div id="app"></div>',
        () => `<script>${injected}</script>\n<div id="app"></div>`,
      );
    },
    expect: 'legacy engine source is absent',
  },
  {
    name: 'a PARTIAL legacy paste — one function body, not the whole file',
    why: 'a fallback need not be wholesale; the check must not need the entire file to notice',
    doctor: (html) => {
      // 40 distinctive lines is a fragment, not a file — well under 4% of the fingerprint set.
      const some = legacyFingerprints(html).lines.slice(0, 40).join('\n');
      return html.replace(
        '<div id="app"></div>',
        () => `<script>/*\n${some}\n*/</script>\n<div id="app"></div>`,
      );
    },
    expect: 'legacy engine source is absent',
  },
  {
    name: 'the build stamp is stripped from the page',
    why: 'the stamp is the mechanism a human reads; silently losing it must not be silent',
    doctor: (html) => html.replace(/<div id="buildStamp"[\s\S]*?<\/div>/, ''),
    expect: 'the build stamp is present and visible',
  },
  {
    name: 'the shim loses one binding',
    why: 'a dropped name is a ReferenceError mid-game, which reads as a gameplay bug',
    doctor: (html) => html.replace(/"wormStrikeable"/g, '"wormStrikeableXX"'),
    expect: 'the shim binds the measured seam',
  },
  {
    name: 'an external script tag is introduced',
    why: 'one external reference breaks double-click-to-play on a machine with no network',
    doctor: (html) =>
      html.replace(
        '<div id="app"></div>',
        () => '<script src="https://example.invalid/x.js"></script>\n<div id="app"></div>',
      ),
    expect: 'no external resource references',
  },
];

const LINE = '='.repeat(95);

async function main(): Promise<void> {
  console.log(LINE);
  console.log('TASK G STEP 6 — NEGATIVE CONTROLS');
  console.log(LINE);

  const { html, stamp, legitimate } = await buildHarness();

  // The real artifact must be clean first: a control that fires on an already-red baseline proves
  // nothing about the control.
  const baseline = assertArtifact(html, stamp, legitimate);
  const baselineRed = baseline.filter((r) => !r.ok);
  console.log(
    `  baseline: ${baseline.length - baselineRed.length}/${baseline.length} assertions pass`,
  );
  if (baselineRed.length > 0) {
    for (const r of baselineRed) console.log(`    RED  ${r.name}: ${r.detail}`);
    console.log('\n  The baseline is not clean, so no control below is interpretable.');
    process.exit(1);
  }

  const fp = legacyFingerprints(legitimate);
  console.log(
    `  fingerprints: ${fp.lines.length} distinctive legacy lines ` +
      `(${fp.candidates} candidates, ${fp.sharedWithLegitimate.length} shared with a legitimate build)`,
  );
  console.log('');

  const failures: string[] = [];
  for (const c of CONTROLS) {
    const doctored = c.doctor(html);
    if (doctored === html) {
      failures.push(`${c.name}: the mutation was INERT — it changed nothing, so it proves nothing`);
      console.log(`  INERT   ${c.expect.padEnd(34)} ${c.name}`);
      continue;
    }
    // The fingerprints stay those of the REAL build. Recomputing them against the doctored
    // artifact would exclude the very lines just injected, and the control would pass vacuously —
    // which is the C5b shape, a test that regenerates its own oracle.
    const red = assertArtifact(doctored, stamp, legitimate)
      .filter((r) => !r.ok)
      .map((r) => r.name);
    const ok = red.length === 1 && red[0] === c.expect;
    if (!ok) {
      failures.push(
        `${c.name}: expected only "${c.expect}" to redden, got [${red.join(' | ') || 'nothing'}]`,
      );
    }
    console.log(`  ${ok ? 'FIRES  ' : 'BROKEN '} ${c.expect.padEnd(34)} ${c.name}`);
    if (!ok) console.log(`          -> reddened [${red.join(' | ') || 'nothing'}]`);
  }

  console.log('');
  console.log(LINE);
  if (failures.length === 0) {
    console.log('ALL CONTROLS FIRED, each on exactly the assertion it targets.');
    console.log('The legacy-absent check and the build stamp are both known to work.');
  } else {
    console.log(`${failures.length} CONTROL(S) DID NOT BEHAVE AS SPECIFIED:`);
    for (const f of failures) console.log(`  ${f}`);
  }
  console.log(LINE);
  process.exit(failures.length === 0 ? 0 : 1);
}

await main();
