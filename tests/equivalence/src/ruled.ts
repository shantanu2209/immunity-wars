/**
 * THE ORIGINAL ENGINE, AS RULED: the second implementation of every rule change the engine change
 * queue ruled (`docs/ENGINE_CHANGE_QUEUE.md`; the method ruled by Shantanu on 30 September 2026).
 *
 * The equivalence corpus proves the port against `tools/legacy/v2_engine.js`, action for action. A
 * deliberate rule change breaks that agreement by design, and the tempting repair, a snapshot of the
 * port taken after the change, is a test that compares the port with itself and cannot fail. So each
 * ruled change is made TWICE, independently: once in `packages/engine`, and once here, as an edit to
 * the original's source that the rig applies in memory (the original file is never touched, as
 * CLAUDE.md requires). The corpus then compares the port with the original AS RULED, and two
 * implementations written apart that agree over the corpus are evidence; one agreeing with itself is
 * none.
 *
 * Each edit must match the original EXACTLY ONCE, applied in order, or the rig refuses: an edit that
 * no longer matches would leave the oracle silently the original, and every ruled change would then
 * show as a port defect, or worse, a missing one would pass.
 *
 * A change that is not a rule change (the queue's Q3 and Q7, which move a declaration and some
 * numbers without changing play) has NO entry here on purpose: the port must still agree with the
 * original as it is.
 */
export interface RuledChange {
  /** The queue's number for it, `Q1` to `Q10`. */
  readonly queue: string;
  /** What the edit does, in words, for a report that names it. */
  readonly name: string;
  readonly find: string;
  readonly replace: string;
}

export const RULED: readonly RuledChange[] = [];
