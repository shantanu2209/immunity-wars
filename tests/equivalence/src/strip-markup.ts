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
 * eats across any inner `<`. A fixpoint of it never iterates twice either, checked to length 10.
 *
 * ============================================================================================
 * THE FIRST VERSION OF THIS FILE LOOPED TO A FIXPOINT. CODEQL REJECTED THAT TOO, AND WAS RIGHT
 * ============================================================================================
 *
 * The loop was belt-and-braces, and the measurement above had already said it was not
 * load-bearing. CodeQL then flagged it as *"polynomial regular expression used on uncontrolled
 * data"* — a linear pass inside a loop is superlinear in total, on input starting with many
 * `<`. **So the loop bought nothing measurable and cost the one real complexity concern in the
 * file.** That is a clean argument for deleting it rather than defending it, and it is the
 * second time in this piece that a claim about this function survived only until it was checked.
 *
 * ============================================================================================
 * WHAT IS HERE NOW: A SCANNER, NOT A REGEX
 * ============================================================================================
 *
 * One left-to-right pass, no regular expression at all, so there is no backtracking to reason
 * about and no pattern for either query to match. `i` only ever moves forward and each `indexOf`
 * resumes where the last one stopped, so the total work is **linear** in the length of the input.
 *
 * It is exactly equivalent to `s.replace(/<[^>]*>/g, replacement)` — the test asserts the
 * agreement rather than claiming it — which in turn differs from the three sites' old spelling
 * in exactly one way: the EMPTY tag `<>` is removed rather than left behind.
 *
 * **A lone `<` or `>` is prose, not markup, and is left alone.** `3 > 2` must survive this, and
 * so must `a < b`: an opening bracket with no closing bracket after it is emitted literally,
 * because that is what the regex did and because dropping the rest of the string would corrupt
 * every message these tools read.
 *
 * **None of the three sites was exploitable** — nothing here reaches a browser, and the inputs
 * are this repository's own catalogue. The reason to change them is that one tested function
 * beats three untested copies of a shape CodeQL rejects, not that anything was at risk
 * (Shantanu, 8 September 2026). CodeQL reports alerts in CHANGED code, which is why it had never
 * mentioned these three.
 *
 * ONE definition, for all three: `tools/legacy-harness` already imports this package's subpaths,
 * so the harness reads it from here rather than keeping a copy that could drift.
 */
export function stripMarkup(s: string, replacement = ''): string {
  let out = '';
  let i = 0;
  for (;;) {
    const open = s.indexOf('<', i);
    if (open === -1) return out + s.slice(i);
    const close = s.indexOf('>', open + 1);
    // An opening bracket that never closes is prose. Keep it, and everything after it.
    if (close === -1) return out + s.slice(i);
    out += s.slice(i, open) + replacement;
    i = close + 1;
  }
}
