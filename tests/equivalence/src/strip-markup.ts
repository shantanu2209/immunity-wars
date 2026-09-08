/**
 * REMOVING INLINE MARKUP FROM A MESSAGE.
 *
 * The engine's player-facing strings carry inline markup (`<b>`, `<i>`). Three tools here want
 * the words without it: a key slug, a classification, a protocol line. All three spelled it
 * `s.replace(/<[^>]+>/g, '')`, a single pass, and CodeQL flagged that shape on PR #70 in a
 * fourth site under the name "incomplete multi-character sanitization".
 *
 * ============================================================================================
 * WHAT THE ALERT'S NAME SUGGESTS, AND WHAT MEASUREMENT SAID INSTEAD
 * ============================================================================================
 *
 * The name suggests a second pass would find more — that removing an inner match splices the
 * surrounding characters into a tag the pass has already gone by. **That is FALSE for this
 * regex**, and it was checked rather than argued: brute-forced over every string up to length 9
 * on the alphabet `< > a`, `/<[^>]+>/g` is idempotent everywhere, because greedy `[^>]*` already
 * eats across any inner `<`. A fixpoint of the version below never iterates twice either,
 * checked to length 10.
 *
 * So the honest account of this function, kept small on purpose:
 *
 *   1. `[^>]+` became `[^>]*`, so the EMPTY tag `<>` is removed rather than left behind. **That
 *      is the entire measured behavioural difference.**
 *   2. The loop makes completeness structural rather than resting on an argument about greedy
 *      matching — an argument the author of this comment got wrong twice before measuring it.
 *      It is belt-and-braces and is not load-bearing. Saying so is cheaper than someone later
 *      trusting a loop that has never done anything.
 *   3. Three copies became one function with tests.
 *
 * **None of the three sites was exploitable** — nothing here reaches a browser, and the inputs
 * are this repository's own catalogue. The reason to remove the pattern is that it is the shape
 * CodeQL rejects and that one tested function beats three untested copies, not that anything was
 * at risk (Shantanu, 8 September 2026). CodeQL reports alerts in CHANGED code, which is why it
 * had never mentioned these three.
 *
 * A lone `<` or `>` is prose, not markup, and is left alone. `3 > 2` must survive this.
 *
 * ONE definition, for all three: `tools/legacy-harness` already imports this package's subpaths,
 * so the harness reads it from here rather than keeping a copy that could drift.
 */
export function stripMarkup(s: string, replacement = ''): string {
  let out = s;
  for (;;) {
    const next = out.replace(/<[^>]*>/g, replacement);
    if (next === out) return out;
    out = next;
  }
}
