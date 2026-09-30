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
 * Q7 has NO entry here, on purpose: it moves numbers into content without changing play or any
 * table the original publishes, so the port must still agree with the original as it is. Q3 has one
 * although it changes no play either, because it adds a row to `TROPISM`, a table the original
 * publishes and the rig pins byte for byte.
 */
export interface RuledChange {
  /** The queue's number for it, `Q1` to `Q10`. */
  readonly queue: string;
  /** What the edit does, in words, for a report that names it. */
  readonly name: string;
  readonly find: string;
  readonly replace: string;
}

export const RULED: readonly RuledChange[] = [
  {
    // Kartik, 5 September 2026: generalist on purpose, declared rather than a lookup miss. It changes
    // no play: both engines already treat "any" exactly as a missing entry (v2_engine.js rollOrgan,
    // `if(list==="any" || !list)`; construct.ts the same).
    queue: 'Q3',
    name: "Pathogen X's tropism declared as any",
    find: '"Tuberculosis (reactivated)":["lungs"],"Pneumococcal pneumonia":["lungs"],\n};',
    replace:
      '"Tuberculosis (reactivated)":["lungs"],"Pneumococcal pneumonia":["lungs"],\n"Pathogen X":"any",\n};',
  },
  {
    // Shantanu, 6 September 2026: set from a config flag, copied into the view, read nowhere, in
    // either engine. Removed from the game's state and its view.
    queue: 'Q10',
    name: 'the inert science field removed from the state',
    find: 'log:[], won:false, lost:null, science:cfg.science!==false,',
    replace: 'log:[], won:false, lost:null,',
  },
  {
    queue: 'Q10',
    name: 'the inert science field removed from the view',
    find: 'won:g.won, lost:g.lost, science:g.science };',
    replace: 'won:g.won, lost:g.lost };',
  },
];
