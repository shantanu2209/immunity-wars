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
| **The command surface** — the 17 player actions, each offered from the view's legal-target queries | **COMPLETE (4 Sep 2026): 19 of 19 reachable by touch.** CP1–CP3 as before; the P2.5 batch (Shantanu's change of approach: one batch, one test) added the pathogen card, CP4 (memoryKill, antivenom, orderAntivenom, clonalSelection, vaccinate + the body panel) and CP5 (the log panel). Record per piece in [`for-P2.5.md`](for-P2.5.md) ("The P2.5 batch"), with the headless-versus-test table the S25 pass targets |
| **Hub zone, Variant B, on the real board** | Mock-up ruled; build not started |
| **Panels** — the log/teaching prose, production breakdown, status | **All built:** the antibody panel (CP2), the body panel (CP4), the log panel (CP5, with one rendering question open for Shantanu — the five composed engine lines render plainly, not loudly; numbers in the record) |
| **Dialogs beyond the reveal** — per-event modalize-vs-log decisions (memory response, novel pathogen, crisis events, …) | Queue ready; decisions not yet made, per ruling 5 |
| **The 46 ambiguous strings** | Undecided; cheapest screen-by-screen as each is built |
| **Board state the engine tracks and the board did not show** — the sweep (for-P2.5.md) | **Coat and spent/offline cells BUILT (4 Sep 2026)**, before the card as reordered: fan-of-types split by type + coated, the antibody badge, "Coated in antibody" in the sheet; spent and suppressed cells dimmed with turns-until-back in the badge slot. Malaria stage and the parasite inside a resident stay with the card |
| **After the S25 pass on the batch (4 Sep 2026)** — twelve observations, ruled; order: undo instrumentation + FINDINGS #55 → the command panel (action buttons) → the effects strip (items 5 + 7) → geometry (11 + 8) → the planning screen (12) | **In progress**, piece by piece in [`for-P2.5.md`](for-P2.5.md) ("After the S25 pass"). The silhouette for item 12 does not exist in usable form: an art task |
| **Resident-vs-Macrophage visual distinction; lymph connector polish** | **Ruled at CP3:** the distinction leans on the biology — Monocyte versus Kupffer cell by name, in the bar and the sheet — plus a double ring; distinct resident art is the real answer, deferred with the pipeline (for-P2.5.md). Lymph connector polish still recorded there |
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

## Handoff for the next session — written at the clear, 4 September 2026

What is known right now that the code and git history do not say. Everything below was
verified against the engine source or the running app before it was written.

### Where things are

`main` has #31–#35 (selection model and undo; the plan and security re-argument; CP1; the
security rulings; CP2). Open: **#36** (`phase2/p2-5-query-prose-sweep` — the FINDINGS #53 sweep
and the card proposal, now RULED). Rulings taken at the clear: **the card is its own piece
between CP3 and CP4, exactly as proposed; recall is CP3.** Order from here: **CP3 → the card →
CP4 → CP5 → re-measure the readiness bar → schedule the newcomer test.**

### CP3 — repositioning and residents, in enough detail to build without re-deriving

> ✅ **BUILT 4 September 2026** on `phase2/p2-5-cp3-residents`, as below with four rulings
> recorded in `for-P2.5.md` ("CP3") and `COMMAND_SURFACE_PLAN.md`: `resengulf` as rings (the
> engine honours `invaderId`); an infected resident may still patrol; hop rings in lymph blue;
> FINDINGS #54, the per-action floor. **Next: the card piece, then CP4.**

All four go into `packages/ui/src/play/offered.ts` under the `cell` source; the harness
(`tests/session/src/offered.test.ts`) checks them automatically once they are emitted.

- **`recall`** — bar button (`buttons`, no position) when the selected cell is alive, not the
  B-cell, and `cells[cell].zone !== 'hub'`; params `{ action: 'recall', cell }`; costs `spend`
  (the generic AP-or-free gate applies). Move class (already in `MOVE_CLASS` in the session).
- **`hop`** — a board target of kind `move` drawn at the PARTNER lane's crossing node. Gate:
  `flags.lymph`, `!state.lymphBlocked`, the cell on a route at `step === LYMPH_STEP` whose
  lane has a `LYMPH_GROUP` entry; partners are the other lanes in the same group (content:
  `LYMPH_GROUP`, `LYMPH_STEP`). Params `{ action: 'hop', cell, lane: partner }` — pass the
  lane explicitly; the engine falls back to `opts[0]` otherwise. Position: `tokenPos({zone:
  'route', lane: partner, step: LYMPH_STEP})`. Move class.
- **Residents become selectable — the one extension to the selection model.** The session's
  `Selection` is `{cell, family}`; a resident is keyed by organ (`residents[organ]`, the
  engine spends `res_<organ>`). Extend `Selection` with `resident: string | null` (a session
  change: `types.ts`, `NO_SELECTION`, `setSelection`, and clear it at phase boundaries like
  `cell`), rather than overloading `cell` — `scope()` calls `moveDestinations(g, cell)` and
  must not be handed a resident key. Board: the resident token (`DisplayToken.resident ===
  true`) becomes a tap candidate of kind `cell` with a payload `{ kind: 'resident', organ }`;
  PlayScreen selects/deselects it like a cell. Reason lines for a selected resident: already
  ate this turn (`residents[organ].ate`), infected (`infectedBy`), residents cannot move on
  this difficulty (`!flags.residentMove`).
- **`resmove`** — two move-kind targets at `step ± 1` within `0..perOrgan.branchLen[organ]`,
  when `flags.residentMove`; params `{ action: 'resmove', organ, step }`; spends. Move class.
- **`resengulf`** — a bar button when `perOrgan.residentEatable[organ]` is non-empty and the
  resident has not `ate` and is not `infectedBy`; the engine picks the target (one button per
  resident, not per invader); params `{ action: 'resengulf', organ }` (`invaderId` optional).
  Free. **Commits** — ends undo.
- **The harness must learn residents:** `judge()` loops `CELLS`; add a loop over
  `Object.keys(state.residents)` selecting each as a resident. Its control still holds.
- **S25 list for CP3:** two resident steps then Undo; a hop across a lymph link (the crossing
  is step 3 of a lymph-linked route); recall a cell from mid-route; resengulf ends Undo.

### The card piece — between CP3 and CP4, as ruled

- **Entry points:** a pathogen row in the inspect sheet (already ≥44px), and the reveal
  dialog's arrival rows; both open the same component. A novel pathogen (`novel === true`,
  "Pathogen X") gets no card — it is masked everywhere as `inspect.unknown`.
- **Data, all content, none engine:** `DZINFO[dz]` → `{d, c, w, p, r}` (discovered, causes,
  found, prevent, treat; 106 diseases), `DZSTATS[dz]` → `[cg, sv, sp, cn, tier]` (contagion,
  severity, speed, cunning, tier; 106), `FACT[dz]` (30 — absent for most; render nothing when
  missing), `TROPISM[dz]` → organ keys or the string `'any'`, `FAMILY[dz]` → family key →
  `FAMILIES[f].name` / `.bio`, `UI_[type].n` for the type name, art `path-<type>`,
  `view.memory[dz]` for a MEMORY tag. The disease prose is the diseases namespace — Kartik's
  science, translated separately; the card's ~12 labels are `ui.json` keys.
- **THE BEAT-IT TEXT NEEDS MOVING INTO CONTENT.** `BEAT_BY_TYPE` — nine entries, one per
  pathogen type (virus, hidden, bacteria, fungus, toxin, venom, worm, parasite, malaria) — is a
  UI constant at `tools/legacy/v2_ui.html:1790`, **not in the content pack and never in the
  string inventory or the C3 parity tables.** Legacy's fallback is "Tag it, then engulf." The
  card piece extracts it into content (beside `FACT`, in `packages/content/src/diseases/` or
  `labels/`), exports it from `load.ts`, and pins it byte-for-byte against legacy in
  `ui-content.test.ts`'s TABLES like every other extracted table. `FAM_LONG`, the next
  constant in the same file, needs the same check — `FAMILIES.bio` may already carry it.
- **Shape on a phone:** one scrolling card, no flip — front (type, family, can infect, fact,
  beat it) then back (tier, four stat bars, the five info rows).
- **P2.6's library** is this component with an index over `DZINFO`'s keys.

### offeredActions, the two sources and the harness — what a fresh session would rediscover

- `offeredActions(view)` is the ONLY legality decision in the UI; components never decide.
  `bodyOffers(view)` is the second source and returns empty until CP4; PlayScreen already
  maps and dispatches it identically. CP4 fills it with `memoryKill` (attack rings on
  `remembered` invaders while nothing is selected; 1 AP on Hard) and `antivenom`
  (`state.antivenomTargets`, stock > 0, AP ≥ 3) — and the body panel's buttons
  (`orderAntivenom`, `clonalSelection`, `vaccinate`) as `place: 'panel'` buttons.
- `ButtonOffer.place === 'panel'` routes a button to a panel instead of the bar (`produce`
  uses `family`); the bar filters them out; `reason` is set whenever no ATTACK is offered
  (panel buttons do not count), muted when a hint exists and red when nothing is offered.
- Board targets are typed `move` (at a node, green dashed) or `attack` (on an invader, red,
  drawn around the type-group token that contains the id); several offers on one invader open
  the sheet's rows; `inspectInfoForInvader` finds the node for that.
- The harness: per recorded state, `LocalSession.resume(clone)` per cell, `setSelection`,
  every offer applied to a fresh clone with `installRng(1)`; vacuity guards (>50 states,
  >200 offers); control = the Killer T offered every invader. The neutralise-cost pin
  (`neutralise-cost.test.ts`) searches eight seeds for an unremembered neutralisable toxin.
- Two workarounds with expiry dates, Phase 3's: `NEUTRALISE_TOXIN_AP` (#52) and
  `productionText.ts` (#53, now only the templated rate-ceiling substitution).

### The S25 checks — by finger versus headless only

- **By finger (Shantanu):** the minimum shell; goal dialog, reveal, spread, tap-to-advance;
  the selection model steps 1–9 and 12 (tap-again, tap-away, move rings, Undo 1 → 2 → unwind
  with AP restored, B-cell reason, no-AP reason, node → sheet, phase-boundary clear); CP1 and
  CP2 "largely working — cells answer, NET works, the panel and produce work, rings appear and
  resolve".
- **Headless only, never by finger:** engulf via ring then Undo ending on the commit (steps
  10–11); snipe by ring on a hidden pathogen; tag and neutralise by ring end-to-end (rings
  were seen to resolve on the S25, but which action was not recorded); the loss-path Result
  screen; every reason line beyond the B-cell's and the no-AP one.
- **Verified by no one, only by the harness:** strike and degranulate (a coated worm never
  occurred in any run — needs `tag` on a worm first, now possible), the Eosinophil's
  two-offer sheet rows, the immunosuppression `blocked` state on screen.
- **Crossed by nothing:** the WIN path (closeout checklist item).


## Handoff for the next session — written at the clear, 5 September 2026

Everything below was true at the clear and is not in the code or git history by itself.

### Where things are

`main` has the whole P2.5 batch (#40), the post-S25 pieces (#41 undo reason + FINDINGS #55;
#42 the command panel; #43 the effects strip + turn line; #44 label sides, the viewBox crop
and the Variant B hub), and two Dependabot bumps (#26 dependency-cruiser 18.2, #4
eslint-config-prettier 10, whose conflict was resolved by hand — lint green on all 17
packages). **The PR queue is empty.** Two Dependabot PRs were CLOSED deliberately with the
reasons on them: #30 `sharp` (deferred by SECURITY_NOTES) and #2 TypeScript 6 (deferred by the
brief §6); a later proposal of either gets the same treatment unless the ruling changes.

**Practice ruled at the clear: one PR at a time, against `main`.** The stacked PRs (#41→#44)
made GitHub ask Shantanu to "update branch" after each merge and re-run CI each time. For a
conflicted Dependabot PR, a comment reading `@dependabot rebase` makes the bot resolve its own
lockfile.

Every S25 observation and its ruling is in [`for-P2.5.md`](for-P2.5.md) under "After the S25
pass on the batch", one section per item, each ending with what was verified headless versus
by test only. Still open from that list: the **window-closed chip and the countdown line**
(test-only — an idle game loses before turn 16), the **memory response** ring (test-only), the
**hiding-inside-a-cell** ring (test-only), and one **ruling not yet given**: whether the log's
five composed engine lines (FINDINGS #53) render plainly, as built, or are re-templated in the
UI for the Hindi first cut (CP5's record has the numbers: 8 of 14 lines in a short game).

### Item 12 — the planning screen — is next, in this order (Shantanu, 5 September 2026)

1. **The frame through the art pipeline as `frame/body`.** The source is committed at
   `tools/art-pipeline/raw/frame-body.jpeg` (from
   `Downloads/Human_torso_outline_medical_diagram_2K_202609051144.jpeg`), its provenance row is
   in `ASSETS.md` (tier to confirm), and the brief is `ANATOMY_FRAME_BRIEF.md`. Shantanu
   measured it: stroke `#786760`, 5.29:1 against the paper, interior provably empty, cropped
   mid-thigh, aspect 0.555; at 380px tall on a 360px screen the torso interior is 179 × 209px.
   It is a JPEG on white by choice — the PNG's alpha was a uniform 50%. **Check the keyed output
   for a JPEG halo around the stroke before accepting it.** `tools/art-pipeline/build.ts` is the
   pipeline; look at how it maps a raw filename to an asset key (the others are `cell-x.jpeg` →
   `cell-x`; `frame/body` may need the key written explicitly).
2. **The seven organ positions into the CONTENT pack, beside the board geometry — propose the
   schema first.** Anatomical, not decorative: brain in the head; lungs and heart in the chest;
   liver upper-right of the abdomen AS THE VIEWER SEES IT; spleen upper-left; kidneys posterior
   and lower; marrow in the pelvis. Kartik checks the anatomy. A shape that fits beside
   `geometry.json`: a new `board/anatomy.json` with `FRAME: { asset, w, h }` (the keyed frame's
   pixel size) and `ANATOMY_POS: byOrgan(Point)` in the frame's own pixel space, validated with
   the same `byOrgan` helper so a missing or extra organ fails the load, plus a cross-check that
   its keys equal `ORGANS`'s — measured off the keyed frame, not judged.
3. **Blocks b, c, d:** the pathogen summary (counts by type, where by lane and slot, GREEN in
   entry lanes / AMBER in the bloodstream / RED in organ lanes, stacking as the board, tap to
   expand, tap a pathogen for its card); the **cell cards** — the same component shape as the
   pathogen card, fields `role`, `home`, `bestAgainst`, `deficiency`, optional `fact`, one entry
   per cell key in a content file Kartik fills, a missing field rendering nothing; the **Phase 3
   allocation slot** designed in and left empty (the engine's `allocation` phase and
   `allocateAP`/`returnAP`/`confirmAllocation` already exist; the bottom button becomes "Confirm
   the plan" there). The screen sits after the reveal and the spread, immediately before
   command; view-only; its button is "Command your cells".
4. **Block a**, the silhouette with organs placed and HP per organ, tap to expand a lane.
   **Propose first** how the entry lanes and the bloodstream are reached — they have no
   anatomical position (a lean, unruled: entries as chips around the figure at the body region
   they enter — nose at the head, gut at the abdomen, skin routes at the outline's edge, blood as
   a central chip on the torso).
5. **Block e**, organs travelling from anatomical to radial positions on the command button —
   only if measured cheap (the instrumentation exists); a Gate 2 item Shantanu will cut without
   argument.

Report at the end separating headless-verified from test-only, as before.

### Small things noticed, recorded, not built

- The organ integrity digit sits beside the branch's step-1 number and reads as one ("13") at
  phone size — for the label pass (for-P2.5, items 11 and 8).
- `FAM_LONG` (legacy) differs from `FAMILIES.bio` and carries the expanded acronym and example
  diseases; home: the antibody panel's family detail, later.
- The WIN path remains uncrossed (closeout checklist).
- The headless drivers live only in the session scratchpad and are rewritten per piece; the
  pattern (puppeteer-core from `tools/perf` against `http://localhost:5173`, string scripts in
  `page.evaluate`, fresh games until the draw gives the scenario, badges summed not tokens
  counted) is in the memory notes and in for-P2.5's CP records.
