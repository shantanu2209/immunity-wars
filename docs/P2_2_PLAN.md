# P2.2 — the plan, written before the session that builds it

**Written 19 August 2026**, at the close of P2.1, so that nothing load-bearing lives only in a
conversation. Spec: [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v1.2 §2 and §5.
Preconditions: [`P2_1_CLOSEOUT.md`](P2_1_CLOSEOUT.md).

> **P2.2's deliverable is a MEASURABLE ARTEFACT, not a beautiful one.** It exists to answer the
> performance question at P2.3. **The signal it has grown past its purpose: deciding how something
> should *look* rather than whether it *renders*.** Anything worth deciding visually goes in a list
> for P2.5 and is left there.

---

## 0. The sequencing decision, and why it is two commits and not one

⚠️ **`vitest 2 → 3` UPGRADES FIRST, ALONE. THE DEV SERVER LANDS IN THE COMMIT AFTER IT.**

The standing note says the upgrade happens "in the same change that introduces a Vite dev server"
([`SECURITY_NOTES.md`](SECURITY_NOTES.md)). Same *change*, and this is how:

1. **Commit 1 — the upgrade.** `vitest 2 → 3`, nothing else. Every existing suite must be green
   under it, and `pnpm ci:selftest` must still show every gate red-on-purpose. **Nothing listens on
   a port yet, so the Dependabot acceptance still holds while this lands** — the reasoning is
   repaired *before* it is needed rather than at the moment it collapses.
2. **Commit 2 — the dev server.** Vite in `packages/app`. This is what pulls the trigger, and by
   the time it does the runner is already known good.

**Why not together.** `vitest` is the instrument every suite in this repository runs on. A break
there is stop-the-line by the instrument/product rule — and bundling it with the first UI code
means a red suite cannot be attributed: runner, or new code? Two commits cost nothing and make the
bisect trivial.

**If the upgrade breaks a suite, that is the whole session's work and it is correctly so.** Do not
work around it to get to the board.

---

## 1. Steps

| # | | notes |
|---|---|---|
| **1** | `vitest 2 → 3`, alone | all suites green, all 14 selftest controls behave |
| **2** | Vite dev server in `packages/app` | the trigger; see §0 |
| **3** | Generate the SVG board from geometry | data-to-code; nothing to design |
| **4** | Wire it to `LocalSession` | `createGame` → `getView()` → render |
| **5** | One animated spread, driven for real | an `endCommand` burst through the `burst` channel |
| **6** | Instrument it for P2.3 | the numbers §4 of the brief asks for |

### The exit criterion

**A board that renders from `geometry.json` and plays one real spread through `Session`, with
per-redraw main-thread work captured on the device clock.** Not a pretty board. A measurable one.

---

## 2. What I know that the repository does not say

Written down because it would otherwise be re-derived, and two of these are traps.

- **The geometry lives at `packages/content/src/board/geometry.json`.** `CLAUDE.md` said
  `packages/content/board/` — no `src/` — until this commit. It is the first file P2.2 opens and
  the path was wrong in the document a newcomer reads first. Fixed, and `docs:check` now validates
  code-span paths so the class cannot recur.

- **⚠️ `packages/app` declares only `@immunity-wars/session`.** The moment it imports anything
  else — `react`, `vite`, `@immunity-wars/content` — without declaring it, `ui-app-no-unresolvable`
  turns the boundary gate **red**, because that rule reddens on any import it cannot resolve. This
  is by design (FINDINGS #41/#42) and it will look like a false alarm to anyone who has not read
  those. **Declare the dependency; do not weaken the rule.**

- **⚠️ `packages/ui` and `packages/app` have `"types": []` in their tsconfigs.** React needs
  `@types/react` added there explicitly. The empty array is a deliberate purity guarantee, not an
  oversight, and the test tsconfigs are split from the source ones for the same reason.

- **`no-orphans` is a WARNING, not an error.** New component files nothing imports yet will warn
  and not fail. Worth knowing before someone spends time on a warning that is expected.

- **`Session.getView()` returns a cached object whose identity changes on every action AND every
  selection change.** That is correct for React's default reference equality — a changed view is a
  new object — but it means the whole tree re-renders on any selection. Whether that matters is a
  **P2.3 measurement**, not a P2.2 optimisation. Do not memoise pre-emptively; measure first.

- **The selection-cost number covers the DATA half only.** 0.054ms p50 to rebuild the projection
  plus the scoped answers, with no React, no layout and no paint. The 16ms redraw budget is for all
  of it, so P2.2's instrumentation must measure the whole redraw, not re-quote that figure.

- **`IndexedDbStorage` has never executed.** P2.2 is the first moment a browser exists. Exercising
  it is cheap once the dev server is up and it is the honest place to close that gap.

- **The 560/800ms burst pacing is an open rendering decision**, not an inherited constant
  ([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §4). P2.2 should keep legacy's numbers so the measurement
  is comparable, and note any preference for P2.5 rather than acting on it.

- **`docs:check` sweeps a hardcoded list of three test READMEs.** A README added under
  `packages/ui/` would not be swept at all. If P2.2 adds package-level READMEs, widen the list in
  `tools/ci/docs-check.ts` — otherwise the sweep quietly stops covering new documents, which is
  the failure it exists to prevent.

  *Found while writing this file, by the check itself:* naming a not-yet-existing README in a code
  span turned `pnpm docs:check` red. The check cannot be told about a file that does not exist yet,
  which is the correct behaviour and worth knowing before it surprises someone mid-plan.

---

## 3. What P2.2 must not do

- **No layout or styling decisions beyond render-and-measure.** Keep a running list for P2.5.
- **No engine change.** The corpus is the oracle and stays untouched.
- **No exposing an engine query.** Decision C is ruled: the view is a function of
  (game state, selection), and `packages/ui` may never import `engine`.
- **No screens that do not exist yet** — mode select, lobby, onboarding, settings. Those are
  Claude Design's to explore and Shantanu's to direct; P2.2 needs neither.

---

## 4. Tooling, so the division is not discovered by doing the wrong half

- **Claude builds the working UI** — React components, the SVG board, state wiring, tests. It lives
  in this repository.
- **Claude Design explores screens with no prior version to copy.** Shantanu directs it separately
  and brings back a direction; Claude builds to it.
- **P2.2 needs neither.** The board's layout comes out of `geometry.json`.

---

## 5. The board sessions, planned at the commit-2 boundary

*Added 19 August 2026, after commits 1–2 landed, so the next session starts from disk rather than
from a conversation.* Steps 1–2 are done: vitest is on 4.1.11 ([`FINDINGS.md`](FINDINGS.md) #43,
#44, #45), the dev server exists, and `IndexedDbStorage` is first-executed 9/9 — the dev shell at
`packages/app/index.html` currently shows that exercise, and **the board replaces the contents of
its `#app` region**. What follows is the settled design for steps 3–6, none of it yet built.

### Step 3 — the SVG board, a runtime derivation

- `geometry.json` has eight top-level keys: `VW`/`VH` (660×930 — the viewBox, verbatim), `HUB`,
  `ORGAN_POS` and `CHIP_POS` (seven organs each), `BRANCH` (numbered step nodes per organ),
  `ROUTE` (six entry routes of five steps), `ENTRY` (six labelled entry points).
- **Derived at render time, not codegen** — a generated file would be a second copy of the
  geometry that can drift. A pure module in `packages/ui` imports the JSON through
  `@immunity-wars/content`'s validated loader (the permitted edge; DECLARE the dependency) and
  maps it to SVG: circles for step nodes, path segments joining consecutive steps and
  hub→branch→organ, positions read from the tables.
- **No coordinate literal appears in `ui`.** The only authored numbers are stroke widths and
  radii — rendering necessities, not layout. Tokens are placed by looking up their location key
  from `view.game` in the same tables: state decides *which* node, geometry decides *where*.
- The board component renders a **plain `ViewState`** — the same component must render
  `sessionView.game` and a burst frame's `frame.view`, so it takes the projection, not the
  `SessionView` wrapper.
- **The first player-visible string goes through the i18n catalogue, from the first commit.**
  The dev shell's scaffolding text is exempt (its only reader is a developer); a label a player
  reads is not.

### Step 4 — wiring: `createGame` → `subscribe` → render

`LocalSession.createGame({difficulty})` in the app shell; render on `{kind:'view'}` events.
`getView()` returns a new object identity per action AND per selection change — correct for
reference equality, and **do not memoise pre-emptively**: the full-tree re-render cost on
selection is one of the numbers P2.3 exists to produce.

### Step 5 — the spread, the burst channel's first real consumer

- The listener fires synchronously inside `sendAction`, so the UI **queues** frames and never
  renders in the listener. The animation loop drains the queue at legacy pacing — **800ms dice
  frames, 560ms otherwise, kept deliberately** so the measurement is comparable; pacing
  preferences go on the P2.5 list, not into code.
- Input disabled during a burst; clickability only ever comes from `SessionView`'s queries,
  never from a frame.
- **Dev-mode assertion:** the final frame's projection deep-equals the following view event's
  `game` — the renderer-side confirmation of `burst-tail-authoritative`.
- **The skip toggle** (~3 lines): ignore every `burst`, render view events only; the same spread
  with skip on and off must land on identical boards. It is the consumer-side control on
  skippability and behaviourally what a reconnecting Phase 3 client does.
- Emission-order check: if the finished state ever paints before the animation plays, the split
  is broken — visible on the first real spread, which is why the slice drives the real engine.

### Step 6 — instrumentation for P2.3

Three screening rows, on the device clock: tap→paint (<100ms; selection via `setSelection` is
the real tap), per-redraw main-thread work during the spread (<32ms, ideally 16 — `performance`
marks around each frame's render-to-commit plus a `longtask` observer), initial full-board
render (<1s). The per-redraw number **includes engine time**, which is the number Phase 4 needs.
Do not re-quote the 0.054ms selection figure — it was the data half only; measure the whole
redraw.

> ⚠️ **Ruled by Shantanu, recorded here because it was ruled in conversation:** the P2.3 report
> leads with the two things the slice cannot answer — **the handset row is open** (no low-end
> device exists yet) and **the slice's redraw cost is a lower bound on the full UI's** (board +
> spread, not every panel). *In its first paragraph, not its caveats — the same discipline as
> Task E's censoring table.*

### Conventions for these sessions

- Anything visual worth deciding goes to a running `docs/for-P2.5.md`, and is not acted on.
- `pnpm ci:selftest` mutates tracked files and verifies restoration against the pre-run tree —
  do not edit files (or trust `git status`) while it runs.
