# P2.5 closeout — 6 September 2026

The full UI build, screen by screen ([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v1.6 §2). This is the
record of what P2.5 proved, what it accepted on test, what it did not prove, and what P2.6
inherits. Running record: [`P2_5_PROGRESS.md`](P2_5_PROGRESS.md); decisions:
[`for-P2.5.md`](for-P2.5.md); the Gate 1 instrument: [`GATE1_AUDIT.md`](GATE1_AUDIT.md);
performance: [`P2_3_MEASUREMENT.md`](P2_3_MEASUREMENT.md).

## Proven

- **The whole command surface, by touch, in the app shell:** 19 of 19 player actions, each
  offered only where the engine accepts it (the offered-subset-of-accepted harness with its
  over-offer control and per-action floors); the selection model that always answers; undo
  for moves as a session rule.
- **Every screen the brief lists:** Title, Difficulty, the goal dialog, the reveal (with this
  turn's crisis as a section, ruled by the this-turn test), the planning screen with the
  anatomy figure and the organ flight, the command screen with the board, the command bar and
  its action rows, the piece grid, the antibody, body and log panels, the pathogen and cell
  cards, the effects strip swept to what is happening now, the pause sheet, Result.
- **All player-visible text through the catalogue**, held by the hardcoded-string rule with
  both control halves; the 46 ambiguous strings decided, 46 of 46; no dashes in player text.
- **The engine unchanged in behaviour and root surface** (the corpus green throughout), with
  two additive queries on `./internal` and `apFor` a wrapper over one of them, the one
  deliberate exception, recorded in the brief with the corpus as its proof.
- **Save and resume** through Session's autosave, including mid-planning; FINDINGS #56 fixed at
  resume.
- **The WIN path, crossed by a person** (several full games won on the S25) and the loss path
  (headless and by finger).
- **Gate 1, the machine-checkable half, on the shipped web build:** 327 controls all ≥ 44 px;
  825 text runs and 327 control boundaries all at or above their contrast thresholds; no layout
  fault at 200% text; text scales under the browser default-font-size mechanism (121 sizes to
  `rem`). Every check with a planted control that fired.
- **Performance on the throttled PC, the full UI:** initial render within 1 s at 6×; selection
  taps 38.7 ms at 6×; per-redraw work 26.7 ms at p50 at 6× (p95 52.6 stated); the command tap
  96.4 ms at p50 at 6×, RESOLVED by keeping the command stage mounted, with 3.6% headroom
  stated as thin.
- **Four S25 passes by Shantanu**, every step as expected; Kartik's organ positions and cell
  cards approved.

## Accepted on test, not verified by finger

The states the deck did not offer on the phone, each with a named test on recorded or
constructed states: the crisis section with a real event; the AP terms with a damaged Lungs or
Heart; the Helper under HIV; the sheet's organ row; "Chip" on a fungus; a spent cell's why; an
infected resident; a rare event's chip and log line; a coated planning row; the bloodstream
badge tap; a failed organ. Shantanu raises any of them if a later run shows a problem.

## Not proven, stated in the brief's words

- **Text at 200% on the phone.** The audit's scaling pass measures the browser default-font-size
  mechanism; Chrome for Android's user-facing mechanism is page zoom, which the earlier 180 px
  layout pass modelled and which was removed as a proxy. Android's system font size reaches
  neither, and that is what was changed on the phone (FINDINGS #61). One two-minute check owed
  (Chrome › Accessibility › Page zoom); both passes to be carried, not built here.
- **Offline.** Met by the headless check on the shipped web build (the worker active; a reload
  with no network renders and plays a turn). The phone-session observation tested the network,
  not the worker, and is struck; **checked properly on the Android build**, deferred there by
  ruling.
- **The performance budget on real low-end hardware.** Not measured. Per the brief §4 and §8, the
  shortfall is stated plainly, and **locked decision #1, Capacitor versus React Native, goes
  unresolved into Phase 4** in those words. The screening pass passed at every level with the
  full UI; the command tap's headroom at 6× is the first row to re-measure on a handset.
- **The newcomer test.** Protocol approved; no testers yet. It lands against this closeout when
  they exist and does not block it; its named specifics reorder P2.6's work.
- **Gate 2.** Not sought in P2.5; P2.7's.

## What P2.6 inherits

- The two phone items above, and the audit's second pass to restore beside the first.
- The handset pass, and the per-redraw p95 at 6× (52.6 ms) named ahead of it.
- FINDINGS #57 (degranulate burns from the lane; Q9), #58 (rare events unlogged; Q8), the
  literal-mirror family (Q7: neutralise cost, antivenom, degranulate, memory response on Hard,
  and the damage figures the rows may not show), all Phase 3's engine changes.
- The seams recorded as deliberate: the board as coarse pointing with the sheet as the precise
  surface; the board's SVG text at the board's scale; the planning screen's cell facts rather
  than a roster; the residents told apart by their real names and a double ring.
- The instruments: `pnpm gate1:audit`, `pnpm perf:full`, the offered-subset-of-accepted
  harness, the effects and breakdown pins, `no-dashes.test.ts`, the state-injection pattern
  through the autosave. Each one's controls are its warrant.
- What P2.6 is for (brief §2): onboarding, the empty, error and offline states, settings; the
  disease library (the pathogen card with an index).

## Lessons this sub-phase paid for

A check that measures a proxy for a property cannot fail on the property, and this closeout
carries two of them found in one day (#60, #61) in the instrument built for the gate. The rule
that survives: name the mechanism a check models, and if a person can reach the property by a
different one, the check models that one too.
