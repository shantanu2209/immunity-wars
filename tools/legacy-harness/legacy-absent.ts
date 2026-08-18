/**
 * TASK G, STEP 6 — IS THE LEGACY ENGINE STRUCTURALLY ABSENT FROM THE BUNDLE?
 *
 * docs/TASK_G_PLAN.md §3 step 6, which Shantanu named as the most important part of G:
 *
 *   > A build that silently fell back to the legacy engine would pass his test perfectly and prove
 *   > nothing. That is the C5b shape exactly, and **he would have no way to detect it from the
 *   > browser.**
 *
 * The build stamp is the first mechanism and is not sufficient alone: a stamp is a string, and a
 * string can say "ported engine" while the file contains legacy. This is the second mechanism, and
 * it is about STRUCTURE — if legacy's source is not in the file, the harness cannot run it,
 * whatever any stamp claims.
 *
 * ── WHY THE FINGERPRINTS ARE DERIVED, NOT HAND-PICKED ───────────────────────────────────────────
 *
 * The obvious implementation is a list of legacy-looking strings to grep for. It is also the wrong
 * one, and dangerously so, because **the port's player-facing strings are byte-identical to
 * legacy's** — frozen since Task B precisely so C5 could extract them (docs/STRING_INVENTORY.md
 * §1). A hand-picked list would either fire on a correct build or, worse, get quietly narrowed
 * until it stopped firing, which is how a check ends up proving nothing.
 *
 * So the set is COMPUTED: substantial lines of `v2_engine.js` that do not appear in a LEGITIMATE
 * build. What remains is text that can only be in the output if legacy's engine source is.
 *
 * ── THE EXCLUSION IS THE PORT'S BUNDLE, NOT ITS SOURCE — AND THAT WAS MEASURED ──────────────────
 *
 * The first version of this file excluded lines found in the port's SOURCE files. It fired on a
 * correct build. The artifact does not contain the port's source; it contains the port's BUNDLED
 * output, and esbuild re-flows template literals onto lines that can coincide exactly with
 * legacy's own layout. Three lines did:
 *
 *   - one comment the port carries over verbatim
 *   - two lines of a `construct.ts` template literal, identical after bundling
 *
 * Excluding against the bundle drops exactly those three and leaves **1,123 of 1,126** candidate
 * lines usable. The check keeps essentially all its power, and the near-total non-overlap is
 * incidental corroboration that legacy and the port are genuinely different code.
 *
 * ── WHY A CLEAN BUILD PASSES BY CONSTRUCTION, AND WHY THAT IS FINE ──────────────────────────────
 *
 * Excluding everything a legitimate build contains means a legitimate build has, by definition,
 * nothing left to find. **That is what "clean" means, and it makes the negative control the entire
 * source of this check's credibility** — which is exactly why the plan demands one. `controls.ts`
 * builds an artifact that DOES contain legacy and requires this to fire and to name the lines.
 * Without that control the green here would mean nothing at all, and it is stated here so nobody
 * later reads the green as evidence on its own.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

/** Lines shorter than this are too common to identify anything. */
const MIN_LEN = 40;

export interface Fingerprints {
  /** Distinctive legacy-engine lines, longest first. */
  readonly lines: string[];
  readonly candidates: number;
  /** Candidate lines dropped for appearing in a legitimate build. */
  readonly sharedWithLegitimate: string[];
}

/** The legacy engine's own source, read once. */
export function legacyEngineSource(): string {
  return readFileSync(join(REPO, 'tools', 'legacy', 'v2_engine.js'), 'utf8');
}

/**
 * Lines that can only appear in an artifact if legacy's engine source appears in it.
 *
 * @param legitimate everything a correct build is allowed to contain — the port's bundled output
 *                   and `v2_ui.html`. Passed in rather than read here, so the caller cannot end up
 *                   comparing against a different bundle than the one it shipped.
 */
export function legacyFingerprints(legitimate: string): Fingerprints {
  const candidates = [
    ...new Set(
      legacyEngineSource()
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length >= MIN_LEN),
    ),
  ];
  const shared = candidates.filter((l) => legitimate.includes(l));
  const lines = candidates.filter((l) => !legitimate.includes(l));
  return {
    lines: lines.sort((a, b) => b.length - a.length),
    candidates: candidates.length,
    sharedWithLegitimate: shared,
  };
}

export interface AbsenceResult {
  readonly clean: boolean;
  /** Fingerprints actually found in the artifact — empty when clean. */
  readonly found: string[];
  readonly checked: number;
}

/** Is legacy's engine source absent from this artifact? */
export function checkLegacyAbsent(artifact: string, legitimate: string): AbsenceResult {
  const { lines } = legacyFingerprints(legitimate);
  const found = lines.filter((l) => artifact.includes(l));
  return { clean: found.length === 0, found, checked: lines.length };
}
