# Phase 2 brief — review, and the proposed P2.1 plan

**Written 18 August 2026**, reviewing [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v1.0 before any Phase 2
code exists. **Nothing has been implemented.**

> **STATUS — all seven items ruled on, same day. The brief is now v1.1.**
> Shantanu accepted **A, B, D, E, F** as written, took **C** as the real gap and required the
> classification to be **reported before any design** (his lean is recorded in the brief, as a
> lean), and settled all six of **G**'s ambiguities. **H** is recorded as a claim that held.
> Every ruling is applied and marked in [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v1.1 — see its
> "What v1.1 changes" table for the item-to-section map.
>
> **Section references below are to brief v1.0.** v1.1 keeps the same numbering, so they still
> resolve, but the text they quote has in several cases been corrected. This document is left as
> written: it is the record of what the brief said and why it was wrong, and rewriting it would
> destroy the only copy of that.

Recorded to disk because the measurements below took a session to produce and are not derivable by
reading. Items **A** and **C** change what P2.1 builds and need a decision from Shantanu.

---

## 0. The objective and stopping rule, as understood

**Objective.** Replace the render layer. The engine is frozen, the equivalence corpus stays its
oracle, and what changes is everything a player sees. The target shifts from "the game its designers
can play" to **an application a stranger can install, understand and finish alone** — which is why
onboarding, empty/error/offline states and settings are first-class work rather than trimming.

**Stopping rule.** Two independent gates, both required, neither implying the other.

- **Gate 1 — capability.** 360px portrait, ≥44px touch targets, a newcomer finishing unaided, no
  unreachable state, fully offline, text scaling, the performance budget.
- **Gate 2 — visual approval**, as a separate explicit statement from Shantanu. Two polish rounds is
  the expected shape, not a bound either way, and each round ends in **named specifics** rather than
  a verdict — an obligation on the prompt as much as on the reviewer.

What makes it work is what is fenced out: animation elegance, palette, spacing beyond legibility.
Real, endless, and not what "done" means. The rule is written before any code exists so it is not
fitted to work already done — [`FINDINGS.md`](FINDINGS.md) #34's lesson applied to a phase.

**Ordering logic.** The decision that could invalidate everything — Capacitor vs React Native —
happens at P2.3 on the cheapest artefact that can answer it, not at week ten.

---

## 1. Findings

### A. ⚠️ The bot conflict — a contradiction in the brief

§6: *"`COVERAGE_DEFERRED.md` carries 9 arms reachable only once a competent bot exists — Phase 2's,
if the bot is built here."*
§8: *"Corpus still green; **the engine is unchanged**."*

**Measured:** all 9 arms are inside **`packages/engine/src/simulate.ts`** — lines 83 (×2), 88, 107,
229, 230, 232, 258, 333. The reference bot is *inlined in the engine* ([`FINDINGS.md`](FINDINGS.md)
#6), and `simulate()` is compared **byte-identically** by the B6 corpus check
(`tests/equivalence/src/simulate.test.ts`: "simulate() is byte-identical, and consumes identical
randomness").

**So building a competent bot is an engine change and it necessarily breaks the corpus.** Both
sentences cannot stand.

**Recommendation: put the bot out of scope for Phase 2.** It is dual-use with Phase 3 seat-filling,
and doing it here means re-baselining the project's primary oracle *during a rewrite* — the worst
moment to weaken it. If it stays in scope, the DoD needs an explicit carve-out plus a stated plan
for re-baselining B6.

### B. ⚠️ Storage cannot work as §3 implies — measured

§3: *"Session owns the state and never exposes it. `viewState` is the only thing handed out."*
§8 requires `Storage` built, which implies save/resume.

**Measured on a real post-`draw` state:**

| | |
|---|---|
| `GameState` keys | **53** |
| `viewState` keys | **45** |
| In state, absent from view | **13** |

The 13: `_actingPid`, `complement`, **`deck`**, `discard`, `drawnList`, `events`, `everInfected`,
`fx`, `novelTurn`, `stats`, `undo`, `wormsSpawned`, `wormsThisTurn`.

`viewState` reports `deckCount: 95`; the 95 cards themselves are not in it. **A game cannot be
resumed from a `viewState`.** `view.ts:20` says so in its own header — "Note what is NOT captured:
turn, phase, deck, discard, stats, seen, events."

Therefore:

- **`Storage`'s consumer is `Session`, not the UI.** The UI asks Session to save; Session serialises
  what only it can see.
- **The serialisation unit is `GameState`, not `ViewState`.**

Without this in the brief, someone wires a save button to `getView()` and the bug appears only on
reload.

**Related gap.** Nothing asserts `GameState` round-trips. The property suite asserts *viewState*
does (`viewstate-round-trip`). [`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §7 listed a *"Serialisation —
every reachable state round-trips identically"* suite; **it does not exist** — `tests/suites.json`
holds four suites and that is not one of them. Measured once: a full `GameState` does survive
`JSON.parse(JSON.stringify(…))` byte-identically. **That is one state, not an invariant**, and
`Storage` would otherwise be built on an unasserted property.

### C. ⚠️ The Session interface as specified cannot render this UI

§3 gives `createGame` / `joinGame` / `sendAction` / `getView` / `subscribe`. **That is not
sufficient**, and the Task G seam measurement says so. Of the 49 names `v2_ui.html` reads:

| class | count | names |
|---|---|---|
| **Data tables** | **21** | `ANTIVENOM_ORDER`, `CELL_KEYS`, `CLONE_COST`, `DIFF`, `EVENTS`, `FAMILIES`, `FAMILY`, `FAM_KEYS`, `FAST_DISEASE`, `LYMPH_STEP`, `ORGANS`, `ORGAN_SETS`, `RARE`, `RESIDENT_NAME`, `ROUTES`, `ROUTE_KEYS`, `SNIPE_RANGE`, `SNIPE_RANGE_BY_DIFF`, `SPEED`, `TROPISM`, `VACCINE_COST` |
| **Engine-driving** | **4** (+2 dev-only) | `applyAction`, `newGame`, `applyEvent`, `fireRare` · dev-only: `forceInjectCard`, `forceInjectType` |
| **Queries** | **22** | `abMatch`, `antivenomTargets`, `anyNeutralisable`, `anyTaggable`, `attackable`, `branchLen`, `canNeutralise`, `canTag`, `capFam`, `famOf`, `helperWith`, `hivActive`, `lymphBlocked`, `macrophageEatable`, `moveDestinations`, `netTargets`, `nkTargets`, `productionBreakdown`, `rateFor`, `residentEatable`, `snipeTargets`, `wormStrikeable` |

**The 22 queries are what the UI calls every render to decide what is clickable.** If `ui` may never
import `engine`, then either Session exposes them, or they are precomputed into the view, or the
rule takes an exception. **The brief picks none of the three.** This is the largest unresolved
question in P2.1.

Data tables are easier: `content` contains no logic, so `ui` importing `@immunity-wars/content`
directly is legitimate and the dependency rule should **permit it explicitly** rather than leave it
to be discovered.

### D. The performance budget's second item is wrong for this animation

§4: *"Spread animation: no frame over 32ms (i.e. sustained ≥30fps)"*

The spread is **not continuous animation.** `v2_ui.html:1357` walks the burst with
`setTimeout(r, f.dice ? 800 : 560)` — discrete redraws roughly half a second apart. There is no
sustained frame production, so "≥30fps" is either trivially met or meaningless.

The metric that matters is **per-redraw main-thread work**: each frame's render under ~32ms (ideally
16ms) so the redraw does not jank. Separately worth deciding whether Phase 2 keeps the 560/800ms
pacing at all — that is now a rendering decision, not an inherited constant.

### E. "Machine-checkable" overclaims Gate 1

Gate 1 is headed *"Capability, machine-checkable"* but contains *"a person who has never seen the
game can start and finish a game unaided"*, which is explicitly human-tested. It is **objective** —
the property that actually matters — but not machine-checkable. In a project whose culture is not
letting a heading overclaim, that word should go.

Two sub-questions: does a **loss** count as finishing? (It should.) And a full game is ~45 turns,
which is a long first session for an unaided newcomer — Training is probably the honest setting.

### F. The i18n trap repeats unless the UI *renders* from the catalogues

§8: *"The 154 loose strings extracted."* **Extraction is not the requirement.** Phase 1 extracted 149
engine strings into a catalogue **nothing consumes**, which is exactly why it needs a drift test to
stay honest. Doing the same with UI strings builds the artefact twice and still leaves the Hindi
edition unbuilt.

The DoD should require the UI to **render all player-visible text through the catalogue**, with a
check that fails on a hardcoded string in a component. That is what makes the grant deliverable
real, and during a rewrite it costs almost nothing.

### G. Ambiguities worth settling before P2.2

- **Does the thin slice go through Session and the real engine, or replay a canned `Frame[]`?**
  It changes what P2.3 measures (rendering only vs rendering + engine) and whether Session has a
  consumer before P2.5. **Recommendation: drive the real engine** — the slice's "one animated
  spread" *is* an `endCommand` burst, so it exercises Session's most novel channel at the earliest
  possible point, and the performance number then includes engine time.
- **Which device does each budget number apply to?** Throttled PC or the ₹7k handset. Otherwise a
  pass gets quoted without its context.
- **"Text scales without breaking layout"** needs a bound. WCAG's 200% is the conventional one.
- **Accessibility is neither in Gate 1 nor explicitly out.** The art pipeline has a measured contrast
  target; Gate 1 has no contrast or screen-reader item. Worth a deliberate in-or-out call.
- **§4's fallback makes the DoD satisfiable without the measurement** — *"on real low-end hardware
  **or** with the shortfall stated plainly"*. Honest, but it should say plainly that taking the
  second branch leaves locked decision #1 unresolved into Phase 4.

### H. One claim checked and found TRUE

§5: *"the schema already fails the build if geometry and rules disagree."* **Correct, and
controlled.** `packages/content/src/schema.ts` cross-references `ORGANS.branch`
(`ORGANS_FOR_PARITY`) against the drawn `BRANCH` steps, and `load.test.ts` carries two mutations —
the Heart drawn with 3 steps, the Brain missing step 3 — both of which throw.

Recorded because this class of claim has been false in every previous brief. This one holds.

The §4 screening-test logic is also sound: throttling errs optimistic, so **a failure is conclusive
and only a pass needs confirming.**

---

## 2. Proposed plan — P2.1 only

Six steps. Two report before building. **Nothing here needs a dev server, so the `vitest 2 → 3`
trigger is not pulled by P2.1.**

**Step 1 — The rule first, with its control.**
Dependency-cruiser: `ui` and `app` may not import `engine`; may import `session` and `content`.
The packages are empty scaffolds, so the rule is **vacuous until proven otherwise** — the control is
the deliverable: add a real `engine` import, confirm `pnpm boundaries` fails, confirm a `content`
import still passes. Rule first, because if it cannot be expressed the interface design changes.

**Step 2 — Measure what the UI needs from the engine. REPORT BEFORE DESIGNING.**
Classify all 49 seam names into three homes — data → `content`, queries → Session, engine-driving →
`sendAction` — reusing `seam-lib.ts` so it is the same measured surface rather than a second list.
Finding **C** is what this resolves. **Anything fitting none of the three is a finding, reported
before it is worked around.**

**Step 3 — Assert `GameState` round-trips, with a control.**
Before `Storage` depends on it. Add it beside `viewstate-round-trip` in the property suite; control
it by seeding a value JSON destroys (`undefined`, `NaN`, a `Set`) and confirming it fires.

**Step 4 — `Session` + `LocalSession`.**
The §3 interface plus whatever step 2 says the queries need. Async `sendAction`. The `view` / `burst`
discriminated union. State owned, never exposed. Control: prove a burst is delivered as a burst, and
that a subscriber ignoring bursts still lands on the right view — `burst-tail-authoritative` is what
licenses that, and this exercises it through the real interface.

**Step 5 — `PlayerRef` and `Storage`.**
`PlayerRef` as an opaque branded string, device-local, with a compile-fail test that a plain string
will not substitute. `Storage` as a port over **`GameState`**, consumed by Session, with one
IndexedDB implementation and one in-memory implementation for tests.

**Step 6 — Prove single-player goes through Session.**
The exit criterion, machine-checkable before any UI exists: **replay a corpus action sequence through
`LocalSession` and require the resulting views to match the engine driven directly.** Green means
"one code path, not a fork" is demonstrated rather than asserted.

### P2.1 is done when

- the boundary rule fires on a real violation, and permits `content`;
- all 49 names have a stated home;
- a full game runs through `LocalSession` matching the direct engine;
- `GameState` round-trip is asserted with a control;
- `pnpm verify` is green.

---

## 3. Status at the time of writing

No Phase 2 code. `main` at `c03a97f` (PR #15 merged). Working tree clean except
[`PHASE2_BRIEF.md`](PHASE2_BRIEF.md), which is untracked and is Shantanu's to commit.
