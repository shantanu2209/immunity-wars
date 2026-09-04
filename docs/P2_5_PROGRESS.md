# P2.5 progress note — 31 August 2026, amended 4 September 2026

Written at the close of piece 3, before the newcomer test runs. This is a progress note, not
the closeout: it says where things landed and what is left, and it will be superseded by the
P2.5 closeout in the usual discipline. Running record of open visual decisions:
[`for-P2.5.md`](for-P2.5.md). Brief: [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v1.5.

---

## Where pieces 1–3 landed

### Piece 1 — stacks and inspect (done)

Co-located tokens render as **fan-of-types** — one token per distinct invader type per node
plus a count badge — ruled on the STACK_COLOCATION measurement (≤2 types on ≥99.3% of off-hub
boards) rather than on intuition. The hub is **a zone, not a node**, laid out as Variant B
(types centred, cells ringed) in the ruled mock-up; the full hub build is still to come, below.
**The inspect sheet is THE touch-target pattern, deliberately:** the board is coarse pointing
(nearest node within 60u), the sheet is precise ≥44px rows. The closeout must state this as a
design decision, not an accident.

### Piece 2 — the command UI, i18n-first (done)

The catalogue (`packages/content/src/i18n/en/ui.json` → `UI_I18N_EN` → `t()`) is **consumed,
not mined**: every ui component renders text through it, the `iw/no-hardcoded-jsx-text` lint
rule rejects hardcoded JSX text in `packages/ui`, and the rule was negative-controlled (both
halves) before it was trusted. A missing key renders loudly as ⟪key⟫. Nunito is bundled
(woff2 + OFL) and first in the board stack. This is definition-of-done item 4 existing as a
working mechanism rather than a resolution.

### The app-flow interlude (done, ratified)

[`APP_FLOW.md`](APP_FLOW.md): the screen machine, the taxonomy, seven structural rulings, and
per-screen CONTENTS for Claude Design. The **minimum shell** is built as ruled — Title
(+Continue) → Difficulty → Play (+pause) → Result, nothing else — with the session lifecycle
in the shell and save semantics as recorded (one browser-local IndexedDB autosave, kept on
quit, deleted only at Result). The walkthrough of that shell found the autosave that was
documented and never called — **[`FINDINGS.md`](FINDINGS.md) #50**, two verified components
with an unverified join — fixed in the session with tests written first and run red. The dev
shell survives as load-bearing, with a build check (negative-controlled) so it cannot rot.

### Piece 3 — the turn loop (done, minus the test itself)

- **Dialog queue** built as mechanism only (APP_FLOW ruling 5); which events modalize stays
  per-event. The **card reveal** is its first client: transition-detected (a resumed game
  does not re-announce), arrivals diffed by invader id — necessary, not defensive: the
  second turn it existed, one draw produced two Strep throat cards and the view's `drawn`
  carries only the first.
- **Spread pacing RULED and built:** 900ms standard / 1400ms dice, tap-anywhere-to-advance,
  verified live at the ruled numbers. The narration banner renders the frame headline
  **through the catalogue** (`spread.label.*`, all 18 spread labels plus Victory) — an
  engine label the catalogue does not know renders as a loud missing-key marker.
- **Win/loss wiring:** the Play → Result join was crossed for real on the **loss** path
  (idle game, lost turn 6, stats rendered, autosave confirmed deleted at Result). **The WIN
  path is uncrossed** — an explicit closeout checklist item, not an assumption
  ([`for-P2.5.md`](for-P2.5.md)).
- **The newcomer-test protocol is APPROVED as amended** ([`NEWCOMER_TEST.md`](NEWCOMER_TEST.md)):
  unaided difficulty choice (the interface recommends Training; the script does not), two
  testers staggered. **The test is NOT READY TO RUN (Shantanu, 4 September 2026, from the S25
  touch pass): only `move` and `engulf` exist as touch actions, so a newcomer cannot finish
  a game by touch. It moves after the panels/command-surface work.** The bar is stated below.
- **The S25 touch pass is done (4 September 2026):** the app runs and is playable on the
  phone; the goal dialog, the reveal, the spread and tap-to-advance all work with a finger.
  The touch-path join — exercised only with synthetic events and a mouse until then — is
  verified. The pass found the command surface incomplete, which is exactly what it was for.

## The readiness bar for the newcomer test — stated plainly (ruled 4 September 2026)

**A full game playable to a conclusion by touch, in the app shell (`index.html`), with no
dev-shell controls involved.** Concretely: every player action the engine accepts in
single-player must be reachable by touch. The engine's action set is `activate`, `antivenom`,
`clonalSelection`, `degranulate`, `engulf`, `hop`, `memoryKill`, `move`, `net`,
`neutralise`, `nkkill`, `orderAntivenom`, `produce`, `recall`, `resengulf`, `resmove`,
`snipe`, `strike`, `tag`, `vaccinate`, plus `undo` and the three turn actions. **As of 4 September, two of the twenty are built.** *Corrected the same day while planning the rest ([`COMMAND_SURFACE_PLAN.md`](COMMAND_SURFACE_PLAN.md) §0): `activate` is an engine stub that always rejects, and "present" is a side effect of engulfing, not an action — so the surface is **nineteen** player actions, two built, **seventeen** to go.* Gate 1's human test needs the whole surface — a
tester who cannot present an antigen or produce an antibody is not testing the game, and a run
that cannot be finished by touch would be voided by the protocol's own rules.

**Before the missing actions are built, cell selection gets reworked** (Shantanu, 4 September):
everything else is built on that pattern, and its weaknesses are recorded in
[`for-P2.5.md`](for-P2.5.md) ahead of the ruling. **Done and approved the same day.**

**Evidence for the bar, not an opinion about it (recorded at Shantanu's direction, 4 September):**
verifying the selection model's engulf step headless took **ten fresh games to draw something
the Monocyte could engulf unaided** — the first nine turn-1 draws were parasites, worms,
bacteria, a venom and a hidden pathogen, none of which the two built actions can touch. On the
S25 the same thing happened by hand: nothing spawned that could be acted on. That is an
artefact of two actions existing rather than nineteen, not a design finding — but it is the
concrete reason the newcomer test moved: a tester's first game is, more often than not, one
the current surface cannot play. The seventeen are planned in
[`COMMAND_SURFACE_PLAN.md`](COMMAND_SURFACE_PLAN.md), for ruling in pieces.

## What is left in P2.5

| Work | State |
|---|---|
| **Cell selection rework** — FIRST, before any further action is built on the pattern | **BUILT (4 September 2026)**: selection always answers, clears at phase boundaries, one coarse tap path (tap-again/tap-away deselect), undo for moves only as a session rule, rejections through the engine catalogue. Awaiting Shantanu's S25 check before any action is added |
| **The command surface** — the 17 player actions, each offered from the view's legal-target queries | **CP1 + CP2 built (4 Sep):** net, snipe, nkkill, strike, degranulate; tag, neutralise, produce + the antibody panel; the offered ⊆ accepted harness; **10 of 19 reachable by touch.** CP3–CP4 per [`COMMAND_SURFACE_PLAN.md`](COMMAND_SURFACE_PLAN.md) |
| **Hub zone, Variant B, on the real board** | Mock-up ruled; build not started |
| **Panels** — the log/teaching prose (currently invisible), production breakdown, status | **Antibody panel built (CP2).** Log/teaching prose: CP5, before the newcomer test; status/body panel: CP4 |
| **Dialogs beyond the reveal** — per-event modalize-vs-log decisions (memory response, novel pathogen, crisis events, …) | Queue ready; decisions not yet made, per ruling 5 |
| **The 46 ambiguous strings** | Undecided; cheapest screen-by-screen as each is built |
| **Resident-vs-Macrophage visual distinction; lymph connector polish** | Recorded in for-P2.5.md |
| **Gate 1 hygiene** — touch-target audit (≥44px), 200% text scaling, contrast audit vs the pipeline's measured values, offline verification | Not started; belongs after the screens stop moving |
| **Per-redraw re-measure with the full UI** | **Mandatory, not optional** (brief §4: row 3's ~30% headroom is what the rest of the UI spends) |
| **Win path crossed** | Closeout checklist item |
| **Newcomer test, two staggered runs** | Protocol approved; **not ready to run** — after the command surface and the panels (bar above) |

## What the newcomer test is expected to change

The test's product is **named specifics** — stalls, dead taps, verbatim questions — and those
reorder the table above; that is why the two runs are staggered. Honest expectations, stated
before the result exists so they can be checked against it:

- **Goal comprehension** was the likeliest dominant finding while the UI stated the win
  condition nowhere. **Addressed before the run:** the goal dialog (piece 3c, 31 Aug 2026)
  now opens every new game — so if tester one's record still reads "did not know what
  winning was", that is a finding about the dialog's wording, not about its absence.
- **"Pathogen" is expected to be understood from context** (Shantanu, 31 Aug 2026, stated
  before the run so the result is data rather than a retrofitted explanation). The goal
  dialog keeps the real word — "infections… breaking in… destroy every pathogen" teaches it
  in passing, and softening the first sentence would undercut the premise that the real
  immunology is more interesting than the simplification. **If the tester stumbles on the
  word, that is a finding**, and the softer register ("germ") is a one-word change in
  `ui.json`.
- **The difficulty screen's recommendation is under test for the first time** — whether
  "Recommended for your first game" actually steers a stranger to Training is now a
  measurable outcome, per the v1.5 amendment.
- **Board discovery** — whether a stranger finds tapping, the inspect sheet, and the command
  bar's prompts without help — is the open question no instrument can answer. This is what
  the tester is for.
- A finished run (win or loss) also crosses whichever Result path it ends on, on a real
  device, with a real player.

The expectation to hold loosely: findings will pull panel and dialog work forward (the
teaching prose most of all) and push polish back. That is the point of running the test
before the remaining work is sequenced.

## State at the session boundary — after CP2, 4 September 2026

Written because the session is cleared here (Shantanu's ruling: after CP2, where the two
mechanisms everything later copies were settled). What a fresh session needs that the code
and git history do not say by themselves:

- **Where things are.** `main` carries P2.5 through the selection model and undo (#31), the
  command-surface plan and the security re-argument (#32), CP1 (#33), and — if merged — the
  security rulings (#34) and CP2 (the PR opened from `phase2/p2-5-cp2-antibodies`). Merge order
  matters only for how GitHub shows diffs; each branch was built on the previous one.
- **What comes next.** CP3 (hop, recall, resmove, resengulf — residents become selectable, the
  one extension to the selection model; move-class undo for three of them), then CP4 (the
  five body-level actions + the body panel — the `bodyOffers` source is already wired
  end-to-end and empty), then CP5 (the teaching-prose panel), then the readiness bar is
  re-measured and the newcomer test is scheduled. The standard for every reason line: does
  the answer help, not does an answer exist.
- **The instruments to keep pointing at each checkpoint.** `tests/session/src/offered.test.ts`
  (every offer engine-accepted, with its over-offer control) extends itself as `offered.ts`
  grows; the headless walkthroughs live only in the session scratchpad and are rewritten per
  checkpoint — the pattern is a puppeteer-core script against `http://localhost:5173` that
  starts fresh games until the turn-1 draw gives the scenario its pathogen (string scripts
  inside `page.evaluate`, because tsx injects `__name` into named inner functions).
- **Two workarounds with expiry dates**, both Phase 3's to remove: the neutralise-cost mirror
  (FINDINGS #52) and the production-prose mapper (FINDINGS #53). Both are pinned by tests that
  should be deleted with them.
- **Known operating hazards, all recorded:** a hidden Browser pane throttles timers (bursts and
  driving scripts crawl — use headless); the coverage exclusion list's denominator drifts with
  most code commits and must be regenerated before push; the S25 check is Shantanu's and each
  checkpoint's record carries its step/expect list.
