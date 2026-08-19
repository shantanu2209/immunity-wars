# The Immunity Wars — Phase 2 Brief

**Version:** 1.1 · 18 August 2026
**Owner:** Shantanu (build direction) / Kartik (design)
**Status:** Approved to start. P2.1 may begin; one step inside it holds for a decision — see §3.

Read alongside [`PHASE2_INPUTS.md`](PHASE2_INPUTS.md), [`SEAM_DECISIONS.md`](SEAM_DECISIONS.md)
and [`PHASE1_CLOSEOUT.md`](PHASE1_CLOSEOUT.md). This brief makes decisions; those documents
supply the measurements behind them.

---

## What v1.1 changes, and why the changes are marked rather than folded in

v1.0 was written the same day. [`PHASE2_BRIEF_REVIEW.md`](PHASE2_BRIEF_REVIEW.md) reviewed it
before any Phase 2 code existed and found seven real defects; Shantanu ruled on all seven.
**v1.1 applies those rulings in place, marked**, in the style this repository uses for every
other corrected claim — because a brief that is silently rewritten teaches nobody what was
wrong, and this project's record is largely made of documented-but-false claims that were found
and named ([`FINDINGS.md`](FINDINGS.md) #6, #9, #25, #26, #29, #37, #39).

| # | What the review found | Ruling | Landed in |
|---|---|---|---|
| **A** | Building a competent bot is an **engine change** and necessarily breaks the B6 byte-identical corpus check. §6 and §8 of v1.0 contradicted each other | **Bot out of scope for Phase 2.** The 9 arms move to Phase 3, with the seat-filling AI | §6, §7, §8, and the `COVERAGE_DEFERRED.md` generator |
| **B** | A game cannot be resumed from a `ViewState` — 13 keys of `GameState` are absent from it, including `deck` | Correct. `Storage`'s consumer is **`Session`**; the serialisation unit is **`GameState`**. Assert the round-trip, with a control, **before** `Storage` depends on it | §3, §8 |
| **C** | The Session interface as specified cannot render this UI: 22 engine queries decide what is clickable, and the brief gave them no home | **The real gap.** Measure and **report before designing**. Shantanu's lean is recorded below as a lean, not a ruling | §3 |
| **D** | The spread is not continuous animation, so "≥30fps" is trivially met or meaningless | Correct. Replaced by **per-redraw main-thread work**. The 560/800ms pacing is now an open rendering decision | §4 |
| **E** | Gate 1 is headed "machine-checkable" but contains a human test | Correct. The property that matters is **objective**. A loss counts as finishing; test on Training | §1 |
| **F** | Extraction is not the requirement — Phase 1 already built a catalogue nothing consumes | **The sharpest one.** The DoD now requires the UI to **render** all player-visible text through the catalogue, with a check that fails on a hardcoded string | §5, §8 |
| **G** | Six ambiguities worth settling before P2.2 | Settled individually | §1, §2, §4, §8 |
| **H** | One claim checked and found **true** | Recorded, with what makes it true | §5 |

---

## 0. Objective

> Replace the renderer. The game becomes a mobile-first application a stranger can install,
> understand and finish without anyone standing next to them.

Phase 1 changed nothing a player could see. **Phase 2 changes everything a player can see and
nothing about the rules.** The engine is fixed; the equivalence corpus remains the oracle, and
any engine change is measured against legacy exactly as before.

### The thing that makes this phase different

Every Phase 1 gate was machine-checkable. The corpus agreed or it didn't. Coverage cleared the
threshold or it didn't. **"The UI looks right" is not that**, and a UI absorbs unlimited polish
without becoming more correct. Section 1 is therefore the most important part of this brief,
and it is written before any code exists — deliberately, because a standard chosen afterwards
is chosen against work already done ([`FINDINGS.md`](FINDINGS.md) #34).

---

## 1. The stopping rule

**Two independent gates. Both must pass. Neither implies the other.**

### Gate 1 — Capability, objective

Every item below is objective: it does not turn on taste, and two people checking it should
reach the same answer. Most are machine-checkable; one is not, and is marked as such.

- [ ] Fully playable on a **360px-wide** screen, portrait
- [ ] Every control reachable by touch; touch targets **≥44px**
- [ ] **Human-tested, not machine-checkable:** a person who has never seen the game can
      **start and finish a game unaided**, on **Training**. **A loss counts as finishing** —
      what is being tested is whether the app can be navigated to a conclusion, not whether the
      newcomer is any good at it
- [ ] No unreachable state: no dead end, no control that does nothing, no screen without an exit
- [ ] Works **offline**, fully, with no network at all
- [ ] Text scales to **200%** without loss of content or function — WCAG 2.1 SC 1.4.4, the
      conventional bound
- [ ] **Contrast:** text ≥4.5:1 (≥3:1 for large text), and non-text UI components and meaningful
      graphics ≥3:1 — WCAG 2.1 SC 1.4.3 and 1.4.11
- [ ] Passes the performance budget of §4

> ⚠️ **Corrected in v1.1 — review item E.** This gate was headed *"Capability,
> machine-checkable"* while containing *"a person who has never seen the game can start and
> finish a game unaided"*, which is explicitly human-tested. **The word was wrong, and the
> property it was reaching for is `objective`.** In a project whose culture is not letting a
> heading overclaim, a heading that overclaims is the first thing to fix. The human-tested item
> is now marked inside the list, so nobody plans a CI job around it.
>
> The review's two sub-questions are answered in the item itself: **a loss counts as finishing**,
> and the test runs on **Training**. A full game is ~45 turns, which is a long first session to
> ask of an unaided newcomer, and Training is the honest setting to ask it on.

> ⚠️ **Added in v1.1 — review item G.** Accessibility was **neither in Gate 1 nor explicitly
> out** in v1.0. It is now a deliberate call in both directions.
>
> - **Contrast is IN**, with numbers, above. It is objective, it is measurable, and the art
>   pipeline (§5) has to hit a contrast target anyway — so Gate 1 and the pipeline are held to
>   the same one rather than two that can drift apart.
> - **Screen-reader support is OUT**, deliberately. This paragraph is the record of that
>   decision, not an omission. It is not a target this team can honestly verify today, and a
>   half-implemented one is worse than a stated absence: it invites a claim that cannot be
>   defended.
>
>   > **Reinstate when:** the app is offered to a school or programme that has an accessibility
>   > requirement, or anyone asks for it — whichever comes first. At that point it is scoped work
>   > with a real consumer, which is the condition this project applies to every deferred seam
>   > ([`SEAM_DECISIONS.md`](SEAM_DECISIONS.md) §4).
>
> ⚠️ **One correction to the ruling's own premise, stated rather than smoothed over.** The ruling
> reads "contrast IN Gate 1, since the art pipeline already has a measured target." **There is no
> measured contrast target anywhere in this repository.** `tools/art-pipeline/` contains only a
> `.gitkeep`, and no contrast figure appears in `docs/`, `packages/`, `tests/` or `tools/legacy/`.
> §5's phrase "a measured contrast target" describes a target P2.4 will set, not one that exists.
> Gate 1 therefore carries its own numbers, as above, and P2.4's target must be at least as
> strict. This changes nothing about the ruling; it changes what Gate 1 is allowed to lean on.

### Gate 2 — Visual approval, given explicitly by Shantanu

Not implied by Gate 1. Not implied by a review going well. **A separate, stated act:**
*"the visual design is approved."*

**Two polish rounds are the expected shape, not a limit in either direction.** If Shantanu is
satisfied after one, the remaining round is not owed. If he is not satisfied after three, work
continues.

**Each round ends with named specifics, not a verdict.** "The organ labels are hard to read at
phone size" is actionable. "It needs work" produces guessing and a fourth round. The review
prompt must ask for specifics; this is a shared obligation, not a demand on the reviewer.

### What is explicitly NOT in either gate

Animation elegance beyond function · palette refinement · spacing beyond legibility ·
screen-reader support (deferred above, with a reinstate condition) · anything Phase 6 could
revisit. These are real and they are endless. They are not what "done" means here.

---

## 2. Order of work

Sequenced so the decision that could invalidate everything happens in week two, not week ten.

| # | Stage | Why here |
|---|---|---|
| **P2.1** | **Seam 1 + the dependency rule** | Nothing else may start. See §3 |
| **P2.2** | **Thin vertical slice** — SVG board from `geometry.json`, one animated spread **driven through `Session` against the real engine**, no game logic | The cheapest artefact that can answer P2.3 |
| **P2.3** | **Performance measurement** on that slice | The decision point. See §4 |
| **P2.4** | Art pipeline | Runs alongside from here; blocks nothing |
| **P2.5** | Full UI build, screen by screen | See §5 |
| **P2.6** | Onboarding, empty/error/offline states, settings | The screens an exhibition demo never needed |
| **P2.7** | Polish rounds, then Gate 2 | §1 |

> ⚠️ **Settled in v1.1 — review item G, first bullet.** v1.0 did not say whether the thin slice
> drives the real engine or replays a canned `Frame[]`, and the two measure different things:
> rendering only, versus rendering plus engine.
>
> **The slice drives the real engine, through `Session`.** The slice's "one animated spread"
> **is** an `endCommand` burst — so driving it for real exercises `Session`'s most novel channel,
> the `view`/`burst` discriminated union, at the earliest possible point, and gives `Session` a
> consumer before P2.5 rather than after it. The performance number then includes engine time,
> which is the number Phase 4 actually needs.

---

## 3. Seam 1 — the load-bearing half is the rule

Three seams are being built: `Session`, `PlayerRef`, `Storage`. Five were declined with reasons
recorded. The brief's original eight was a guess written before anyone had seen the code.

### The interface, shaped by measurement

- `createGame(config)` / `joinGame(code)` — both return the same handle. Room entry is a string
  parameter, not a separate seam.
- **`sendAction(action): Promise<ActionOutcome>` — async even in `LocalSession`.** If the local
  implementation is synchronous, every call site is written synchronously and `RelaySession`
  becomes a rewrite rather than a second implementation. Cheapest thing to get right now.
- `getView(): ViewState` — authoritative, always.
- `subscribe(listener)` — the listener receives a **discriminated union**:
  - `{kind: 'view', view}` — authoritative, one per accepted action
  - `{kind: 'burst', frames}` — presentation, **skippable**

Splitting those two is the design. `endCommand` returns up to 9 frames each carrying a full
`viewState`; one callback cannot express that. The burst tail equals the authoritative view —
now an asserted invariant with a negative control — which is what makes the burst safely
skippable and reconnection possible.

**Session owns the state and never exposes it.** `applyAction` mutates in place and returns only
`{ok}`; a shared mutable object cannot be diffed by React or serialised by a relay at the right
moment. `viewState` is the only thing handed out to the UI. The legacy UI used raw state and
`viewState` interchangeably — **Phase 2 picks `viewState` and never hands out the other.**
(The one thing that is *not* handed out but must still be serialised is the subject of the
`Storage` correction below: Session keeps `GameState` to itself and writes it to `Storage`
directly.)

### ⚠️ OPEN — the 22 queries have no home yet, and P2.1 holds here

> ⚠️ **Added in v1.1 — review item C, the largest unresolved question in P2.1.**
>
> The interface above **is not sufficient to render this UI**, and the Task G seam measurement
> says so. Of the 49 engine names `v2_ui.html` reads:
>
> | class | count | what they are |
> |---|---|---|
> | **Data tables** | **21** | `ORGANS`, `ROUTES`, `TROPISM`, `DIFF`, `EVENTS`, `FAMILIES`, … |
> | **Engine-driving** | **4** (+2 dev-only) | `applyAction`, `newGame`, `applyEvent`, `fireRare` |
> | **Queries** | **22** | `attackable`, `moveDestinations`, `netTargets`, `snipeTargets`, `canTag`, `capFam`, `productionBreakdown`, … |
>
> **The 22 queries are what the UI calls on every render to decide what is clickable.** If `ui`
> may never import `engine`, then either `Session` exposes them, or they are precomputed into the
> view, or the rule takes an exception. **v1.0 picked none of the three, and v1.1 deliberately
> does not pick one either.**
>
> **P2.1 step 2 measures and reports the classification. Shantanu decides. Design does not
> proceed past that point** — this is the one hold in P2.1, and it is a hold on purpose: the
> answer shapes `Session`'s entire surface, and choosing it while writing the code means choosing
> it against work already done.
>
> **Shantanu's lean, recorded as a lean and not as a ruling:** *Session exposes the queries,
> rather than the view precomputing them, because precomputing 22 results into every view inflates
> the exact payload Task E measured for Phase 3.* That reasoning is on the record so the decision
> can be argued with rather than inherited.
>
> **Anything that fits none of the three classes is a finding, and is reported before it is
> worked around.**
>
> ### ✅ The measurement the lean needed now exists — [`QUERY_PAYLOAD.md`](QUERY_PAYLOAD.md)
>
> *Added 18 August 2026, on Shantanu's instruction to measure before ruling.* `pnpm
> measure:query-payload`, 25,497 command-phase states. The lean is broadly right and right for a
> reason nobody had identified:
>
> - Precomputing all 22 costs **89% of `viewState` at p50, 168% at p90** — roughly doubling the
>   payload — so the lean's premise holds.
> - But **two queries are 88% of that cost**: `moveDestinations` (61%) and `productionBreakdown`
>   (27%). The other twenty together are ~530 bytes.
> - **Exposing those two and precomputing the other twenty costs 8.8% of `viewState`.** Exposing a
>   third buys 0.8 points. The curve collapses at N = 2 and is flat after it.
> - Three of the 22 — `branchLen`, `famOf`, `attackable` — need neither Session nor the view;
>   two are pure functions of `content`, which `ui` may already import.
>
> **So the decision is no longer all-or-nothing, and that is what the measurement changed.** It
> remains Shantanu's.

### ⚠️ The rule matters more than the interface

**`ui` and `app` may import the session package and `content`. They may never import `engine`.**
Enforced by dependency-cruiser, with a negative control proving it fires, in the same change
that defines `Session`.

> ⚠️ **Clarified in v1.1 — review item C, second half.** v1.0 said only "may never import
> `engine`" and left the `content` direction to be discovered. **`ui` importing
> `@immunity-wars/content` directly is legitimate, and the rule permits it explicitly.** Content
> contains no logic — that is the invariant `.dependency-cruiser.cjs` and `exports.test.ts`
> jointly enforce — so a UI reading `ORGANS` or `REGION_LABEL` out of the content pack is reading
> data, not reaching past a rules boundary. Stating it in the rule gives the 21 data tables a home
> before anyone has to ask, and it means the control tests both directions: an `engine` import
> must fail, a `content` import must still pass.

`v2_ui.html` read 49 engine names when only 44 were in the contract Task B proved, and nothing
failed for years because injection made everything reachable ([`FINDINGS.md`](FINDINGS.md) #39).
An interface nobody is forced to use is a convention, and this project has found roughly a dozen
conventions that were quietly false.

### `Storage` serialises `GameState`, and its consumer is `Session`

> ⚠️ **Corrected in v1.1 — review item B, measured.** v1.0 said in this section that *"`viewState`
> is the only thing handed out"*, and §8 required `Storage` built — which implies save and resume.
> **Those two cannot both be satisfied by a `Storage` the UI drives, because a game cannot be
> resumed from a `ViewState`.**
>
> Measured on a real post-`draw` state: `GameState` has **53** keys, `viewState` has **45**, and
> **13** are in the state and absent from the view — `_actingPid`, `complement`, **`deck`**,
> `discard`, `drawnList`, `events`, `everInfected`, `fx`, `novelTurn`, `stats`, `undo`,
> `wormsSpawned`, `wormsThisTurn`. `viewState` reports `deckCount: 95`; the 95 cards themselves are
> not in it. `packages/engine/src/view.ts:20` says so in its own header.
>
> Therefore, and this is binding:
>
> - **`Storage`'s consumer is `Session`, not the UI.** The UI asks Session to save; Session
>   serialises what only it can see. This is stated explicitly because **wiring a save button to
>   `getView()` is exactly the bug someone would ship, and it only appears on reload** — the save
>   succeeds, the payload looks plausible, and the deck is gone.
> - **The serialisation unit is `GameState`, not `ViewState`.**
>
> **Related gap, and it is a precondition rather than a nicety.** Nothing asserts that `GameState`
> round-trips. The property suite asserts *viewState* does (`viewstate-round-trip`);
> [`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §7 listed a "Serialisation — every reachable state
> round-trips identically" suite and **it does not exist**. A full `GameState` was measured once to
> survive `JSON.parse(JSON.stringify(…))` byte-identically — **that is one state, not an
> invariant.** `Storage` would otherwise be built on an unasserted property, which is the shape
> this project has been caught by repeatedly.
>
> **The `GameState` round-trip is asserted, with a negative control, BEFORE `Storage` depends on
> it.** P2.1 step 3.

### The constraint that shapes Phase 3

The engine calls global `Math.random()` in six places with no injection point
([`FINDINGS.md`](FINDINGS.md) #40). **Clients cannot replay actions locally** — two clients
applying the same action to the same state diverge on the first die roll, silently, because both
resulting states are internally consistent.

So `viewState` is the unit of synchronisation, not `Action`. Session's interface must not assume
replayability. Task E measured the cost of authoritative-state broadcast and found it affordable,
so this is informed rather than forced.

---

## 4. The performance measurement

### What it decides

Whether **Capacitor holds or React Native becomes necessary** — the one locked decision Phase 2
can reopen.

### Define "acceptable" BEFORE the number exists

Non-negotiable, and it is [`FINDINGS.md`](FINDINGS.md) #34's lesson: a threshold fitted to the
measurement it is meant to judge is not a test.

**Proposed budget, to be agreed before the slice is built. Every number carries the device it was
measured on** — a figure quoted without its hardware is not a measurement:

| Budget item | Threshold | Measured on |
|---|---|---|
| Tap to visible response | **under 100ms** | Windows PC, Chrome DevTools, 4–6× CPU throttling |
| **Per-redraw main-thread work** during a spread | **under 32ms**, ideally **16ms** | Windows PC, throttled, as above |
| Initial render of a full board | **under 1s** | Windows PC, throttled, as above |
| All three, confirmed | same thresholds | Real low-end Android — 2–3GB RAM, ₹6–8k class |

The throttled PC figures are the **screening** pass; the handset figures are the **deciding**
pass. Neither substitutes for the other, and a report that gives a number without saying which
row it came from is not finished.

> ⚠️ **Corrected in v1.1 — review item D.** v1.0's second item read *"Spread animation: no frame
> over 32ms (i.e. sustained ≥30fps), measured on the device clock."* **That is the wrong metric for
> this animation.** The spread is not continuous: `v2_ui.html:1357` walks the burst with
> `setTimeout(r, f.dice ? 800 : 560)` — discrete redraws roughly half a second apart. There is no
> sustained frame production, so "≥30fps" is either trivially met or meaningless, and a budget that
> cannot fail is not a budget.
>
> What matters is **per-redraw main-thread work**: each frame's render must complete inside ~32ms,
> ideally 16ms, so the redraw itself does not jank. That is what the table now says.
>
> **Consequence, now open rather than inherited:** the 560/800ms pacing was a legacy rendering
> constant, not a rule. Phase 2 owns whether to keep it. It is a **rendering decision** — it
> affects how the spread reads to a player and nothing about what the engine does — and it should
> be made by looking at the animation, not by copying a number forward.

### How, in order of cost

1. **Chrome DevTools, 4–6× CPU throttling, on the Windows PC.** Free, immediate.
   It slows the CPU but not memory bandwidth or storage, and cannot reproduce thermal
   throttling — so it errs **optimistic**. That is exactly right for a screening test:
   **a failure here is conclusive and costs nothing.** Only a pass needs confirming.
2. **If it passes:** confirm on real low-end hardware — 2–3GB RAM, ₹6–8k class.
   BrowserStack if the open-source programme comes through; otherwise a handset before Phase 4.

### The measurement must produce numbers, not impressions

Frame timings, long-task durations, tap-to-repaint — captured on the device's own clock and
reported. Not "it felt smooth." This holds regardless of platform, and it is what makes a
streamed or throttled measurement trustworthy at all.

**Shantanu's Galaxy S25 is in the loop throughout Phase 2** for touch feel, real screen size,
gesture behaviour and Phase 4 install testing. It cannot answer the performance floor — a pass
on flagship hardware says nothing about a ₹7,000 device, and the distribution story is about
the ₹7,000 device.

### If the handset measurement does not happen

The fallback stands: the DoD may be satisfied with **the shortfall stated plainly** instead of a
confirmed pass on real low-end hardware. It stays because an honest gap beats a fabricated number.

> ⚠️ **Sharpened in v1.1 — review item G, last bullet.** v1.0's *"on real low-end hardware **or**
> with the shortfall stated plainly"* made the DoD satisfiable **without the measurement the phase
> exists to take**. That is honest, but it was silent about its price, so v1.1 states it: **taking
> the second branch leaves locked decision #1 — Capacitor vs React Native — unresolved into
> Phase 4**, where reversing it costs a rewrite rather than a spike. Anyone exercising the fallback
> is choosing that, and the closeout must say so in those words.

---

## 5. Building the UI

### The board is SVG; the illustrations stay raster

**Geometry** — vessels, step nodes, lane curves, organ positions — is *generated from*
`content/board/geometry.json`. No drawing, no design tool: a data-to-code transformation.

**Illustrations** — cells, pathogens, organs — remain raster, dropped into the SVG via `<image>`.
Every pixel of the existing contrast-tuned art is preserved.

`geometry.json` is the single source for the on-screen board **and the printed A2 artwork**.
That is what makes physical/digital parity structural rather than remembered, and the schema
already fails the build if geometry and rules disagree.

> ✅ **Checked in v1.1 — review item H. This claim is TRUE, and it is controlled.**
> `packages/content/src/schema.ts` cross-references `ORGANS.branch` (`ORGANS_FOR_PARITY`) against
> the drawn `BRANCH` steps, and `load.test.ts` carries two mutations — the Heart drawn with 3
> steps, the Brain missing step 3 — **both of which throw**. Recorded because this class of claim
> has been false in every previous brief in this project, and a claim that survives its check is
> worth the same sentence a claim that fails one gets.

**Consequence for Kartik, worth him knowing before it happens:** from Phase 2 onward, a change
to the physical board starts in the content pack. He decides the change; it flows to both the
app and the print automatically, and the two can no longer disagree.

### Strings: the UI must RENDER through the catalogue, not merely be mined for one

**154 loose prose strings** live in the file being rewritten, and every one of them will be
retyped into a React component. **46 of them need a human call** on whether they are
player-visible at all ([`STRING_INVENTORY.md`](STRING_INVENTORY.md) §3) — cheapest while someone
is looking at the screen they appear on.

The 666-string `diseases` namespace is **not** part of this. It is Kartik's written science and
needs a subject-matter translator, not a UI string pass.

> ⚠️ **Corrected in v1.1 — review item F, the sharpest of the seven.** v1.0's §8 asked for *"the
> 154 loose strings extracted."* **Extraction is not the requirement, and asking for it is how
> this trap repeats.**
>
> Phase 1 extracted 149 engine strings into a catalogue **nothing consumes** — which is precisely
> why that catalogue needs a drift test to stay honest at all. Doing the same thing with the UI
> strings builds the artefact **twice** and still leaves the Hindi edition unbuilt, because a
> catalogue no renderer reads is a glossary, not an i18n layer.
>
> **The requirement is that the UI renders all player-visible text through the catalogue**, with a
> check that **fails on a hardcoded string in a component**. During a rewrite this costs almost
> nothing — the strings are being retyped either way, and the only difference is what they are
> typed into. Afterwards it costs a second pass over a UI nobody has a list for.
>
> The check is what makes it real rather than a resolution, so per this project's standing rule it
> gets a negative control: a hardcoded string added on purpose, and the check must go red.

### Art pipeline

`tools/art-pipeline/` — deterministic: trim transparent margins, normalise to a fixed palette,
hit a contrast target against the background at least as strict as Gate 1's, emit WebP at
1×/2×/3×, write a manifest.

**Consistency across a set is the risk, not quality.** Multiple generation tools makes it worse.
Everything goes through the pipeline and then it does not matter which tool made what.

⚠️ **Provenance is recorded at generation time** — tool, prompt, date — in
[`ASSETS.md`](ASSETS.md). The content licence is still pending exactly this question. If the
terms turn out not to permit CC BY-SA redistribution, you need to know which assets are affected.

### Tools

- **Claude Design** for screens that do not yet exist: mode select, lobby, onboarding, settings,
  store screenshots. Directed through chat; no drawing skill required.
- **Gemini / ChatGPT** for raster illustration, as now. Output goes through the art pipeline.
- **The legacy reference window** (`immunity-wars-REFERENCE-legacy-engine.html`) gives a
  known-good rendering of any game state on demand, to compare a new component against. It is
  worth more during a rewrite than it was during the port.

### The rendering gap is inherited, not closed

Nothing has ever compared the two engines visually. Replacing the renderer does **not** absorb
this: the gap was never "is the legacy renderer correct", it is "has anyone confirmed the port
drives a renderer to the same result" — and the answer is still no for any renderer. The new one
will have none of the play history the legacy UI has.

Whether to close it is a Phase 2 decision. It should be made knowingly.

---

## 6. Standing rules, carried unchanged from Phase 1

These earned their place roughly a dozen times, and **zero times did a check turn out to be
fine when a control was pointed at it.**

- **A check that has never failed is not known to work.** Every new check gets a negative
  control that makes it fire on purpose, before it is trusted.
- **A check that has never been required to PASS on purpose is not known to permit anything.**
  Its other half, added at P2.1. "Forbid X" is half a specification — a rule forbidding
  *everything* satisfies every negative control aimed at it. **Every boundary rule gets a
  `mustPass` control as well as a `mustFail` one.** Found by the control that caught this brief's
  own `ui → content` permission being rejected by the gate meant to enforce it
  ([`FINDINGS.md`](FINDINGS.md) #42; #41 is the resolved-path defect beside it).
- **Measure controls at the scale they will actually run at.** A control at the wrong scale
  gives a confident, coherent, wrong answer.
- **Simulate before building.** Validate in a standalone model before production code.
- **A diff cannot see a defect both sides share.** Whenever a check is a comparison, ask what
  a shared error would look like.
- **A generator with no oracle is a test that regenerates its own answer.** If its output is
  handed to a human as an instruction, at least one line must be executed by a machine first.
- **Record the property, not just the workaround.** A workaround so effective that the property
  stops being visible is worse than a blind check — there is nothing to negative-control.
- **The smaller true claim.** Kartik may have to defend any sentence to a judge.
- **One task per session, plan before code, commit after verification, `pnpm verify` before
  commit.**
- **Scientific accuracy is a hard constraint**, not a preference.
- **Build what the task specifies.** Beyond it, the test is purpose — does this make later work
  faster or safer? — not cost. Say what it buys and let Shantanu decide.

### Also inherited

⚠️ **`vitest 2 → 3` upgrades in the same change that introduces a Vite dev server.** Every open
Dependabot advisory requires a long-running server accepting requests, and nothing currently
starts one. A dev server collapses that reasoning ([`SECURITY_NOTES.md`](SECURITY_NOTES.md)).
P2.1 needs no dev server and so does not pull this trigger; P2.2 probably does.

TypeScript 6.0.3 (Dependabot PR #2) remains deliberately deferred.

> ⚠️ **Corrected in v1.1 — review item A. The bot is OUT OF SCOPE for Phase 2.**
>
> v1.0 ended this section with *"`COVERAGE_DEFERRED.md` carries 9 arms reachable only once a
> competent bot exists — Phase 2's, if the bot is built here."* Its §8 simultaneously required
> *"Corpus still green; **the engine is unchanged**."* **Both sentences cannot stand**, and the
> measurement says which one gives way.
>
> All 9 arms are inside **`packages/engine/src/simulate.ts`** — lines 83 (×2), 88, 107, 229, 230,
> 232, 258, 333. The reference bot is **inlined in the engine** ([`FINDINGS.md`](FINDINGS.md) #6),
> and `simulate()` is compared **byte-identically** by the B6 corpus check
> (`tests/equivalence/src/simulate.test.ts`). **So building a competent bot is an engine change,
> and it necessarily breaks the corpus.**
>
> **Ruling: the bot is out of scope for Phase 2, and the 9 arms move to Phase 3** alongside the
> seat-filling AI they are dual-use with. Doing it here would mean **re-baselining the project's
> primary oracle during a rewrite** — the worst possible timing, because that oracle is the only
> thing telling you the rewrite did not change the rules.
>
> `COVERAGE_DEFERRED.md` is generated, so this correction is applied where the label is produced
> (`tests/equivalence/coverage-gate.ts`) rather than by hand-editing the output.

---

## 7. Out of scope

No multiplayer, no relay, no accounts, no matchmaking — Phase 3.
No Capacitor packaging or store work — Phase 4.
**No competent reference bot** — Phase 3, with the seat-filling AI; see §6. It is an engine
change and it breaks the corpus, which is not a thing to do during a rewrite.
No AI tutor — deferred, tiered behind a `HelpProvider` that is not being built.
No screen-reader support — deferred with a reinstate condition, §1.
No engine rule changes. Kartik's six open design questions are a separate conversation and
land as deliberate, isolated changes measured against the corpus, not as part of the rewrite.

---

## 8. Definition of done

- [ ] Gate 1 — every capability item verified, including contrast and 200% text scaling
- [ ] Gate 2 — visual approval, explicitly stated by Shantanu
- [ ] Performance budget met **on real low-end hardware**, every number carrying the device it was
      measured on — **or** the shortfall stated plainly, in which case the closeout says in those
      words that **locked decision #1 goes unresolved into Phase 4**
- [ ] `ui` and `app` provably cannot import `engine`, and provably **may** import `content`;
      both controls fire
- [ ] Session, PlayerRef, Storage built; single-player goes through Session
- [ ] **`Storage` serialises `GameState` and is consumed by `Session`**, and the `GameState`
      round-trip was asserted with a negative control **before** `Storage` depended on it
- [ ] SVG board generated from `geometry.json`; no coordinate hardcoded anywhere else
- [ ] **The UI renders all player-visible text through the i18n catalogue**, with a check that
      fails on a hardcoded string in a component, and a negative control proving that check
      fires. The 46 ambiguous strings decided
- [ ] Art pipeline deterministic; provenance recorded for every asset
- [ ] Corpus still green; **the engine is unchanged** — no carve-out, because the one thing that
      would have needed one is out of scope (§6)
- [ ] A Phase 2 closeout in the same discipline: what is proven, what is not, what Phase 3
      inherits

---

*Phase 3 preview: multi-room relay, private code-joined rooms, reconnection, AI seat-filling.
`viewState` is the unit of synchronisation. The 8 deferred multiplayer coverage arms come due
there, and so do the 9 bot arms — the seat-filling AI and a competent reference bot are the same
piece of work. `rulesVersion` on states and messages is Phase 3's to make true.*
