# P2.1 closeout — seam 1, the boundary rule, and what is not proven

**Closed 19 August 2026.** Spec: [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v1.1 §2–§3.
Read alongside [`QUERY_PAYLOAD.md`](QUERY_PAYLOAD.md), which holds the measurement decision C
turned on.

`pnpm verify` green. **The engine is unchanged**; the corpus is untouched.

---

## What P2.1 was, and what it grew into

Six steps were planned. Six steps were built. **It also absorbed a brief revision, seven rulings, a
two-rule boundary discovery and two measurements** — each justified individually, and together they
are the reason nothing visible exists yet. That is recorded here rather than smoothed over, because
the next sub-phase is the one where a player can finally see something and it should not inherit
the same drift.

---

## 1. What is proven

| | how |
|---|---|
| `ui` and `app` **cannot** import `engine` | two dependency-cruiser rules, three controls |
| `ui` **may** import `content` | a `mustPass` control, which caught the rule rejecting it |
| Every one of the 49 names the UI reads has a home | `pnpm seam:homes`, derived not hand-listed |
| `GameState` round-trips through JSON | 1,032,791 states, 0 violations, with a control |
| Single-player goes through Session | 9 replayed games, projection compared action for action |
| A burst is delivered as a burst, and is skippable | asserted against `burst-tail-authoritative` |
| Session never hands out `GameState` | the 13 dropped keys asserted absent from the view |
| `PlayerRef` cannot be a plain string | a compile-fail control (`@ts-expect-error`) |
| `Storage` round-trips a game, and a view cannot stand in | save → resume, plus the bug demonstrated |
| The docs sweep fires | two controls, and it found two real defects on its first run |

**Thirteen CI self-test controls, all demonstrated red-where-red and green-where-green.**

## 2. What is NOT proven, stated plainly

- **`IndexedDbStorage` has never run.** No browser in the test environment, no IndexedDB shim among
  the dependencies. The `Storage` port is exercised through `MemoryStorage` only — which
  round-trips through JSON on purpose, so it shares the real implementation's failure modes rather
  than being an easier fake. **P2.2 is the first moment a browser exists to run it in**, and that
  is also the change that pulls the `vitest 2 → 3` trigger; the browser, the upgrade and this
  file's first execution belong together.
- **No UI exists**, so nothing here has been exercised by a renderer. Session has one consumer and
  it is a test.
- **`RelaySession` is unproven by construction.** P2.1 shows the interface has one working
  implementation. Whether it can have a second is Phase 3's to demonstrate, and the async
  `sendAction` is the bet being placed on it.
- **The selection-cost measurement is the data half only** — no React, no layout, no paint. It says
  a selection-triggered rebuild costs ~1% of the redraw budget; it does not say a redraw fits.
- **Nothing has been measured on a handset.** Every number carries a development PC.

## 3. Findings raised

| # | |
|---|---|
| **#41** | A boundary rule matching on RESOLVED paths cannot see the violation someone would actually write |
| **#42** | "Forbid X" is a half-specified rule, and a fail-only control set cannot tell |

Both are fixed and both produced standing rules.

## 4. What changed about how this project works

- **`mustPass` controls.** Every boundary rule now needs one, not just a `mustFail`. A rule that
  forbade everything would satisfy every negative control ever aimed at it.
- **`pnpm docs:check`**, inside `pnpm verify`. Every sub-phase ends with a documentation sweep, and
  it is a program rather than a habit — because the habit had already failed, and the check found
  both failures on its first run.

## 5. Two claims corrected by their own measurements

Recorded because in both cases the prediction was written down first and was wrong.

- **The query-payload censoring.** The instrument was built expecting the measured ratio to be a
  **floor**. The fitted slopes say it is a **ceiling** — `viewState` grows 359B per invader against
  the precompute block's 36B, because a per-invader *answer* is a boolean while a per-invader
  *record* is a full object.
- **The `getView()` save bug.** The brief says it "only appears on reload", which is confirmed. The
  control found the reload failure is **loud** — `viewState` has no `deck`, so resuming throws
  rather than producing a subtly wrong board. The save is still lost. "Silently wrong" would have
  been the scarier sentence and a false one.

## 6. What P2.2 inherits

The seam, the rule, and a decision already made: **the view is a function of (game state,
selection)**. P2.2 is the SVG board from `geometry.json` and one animated spread, **driven through
`Session` against the real engine** — which makes the burst channel's first consumer a real one.

It is also the change that introduces a dev server, and therefore the change that must carry
`vitest 2 → 3` ([`SECURITY_NOTES.md`](SECURITY_NOTES.md)).

**Phase 2 is the UI phase and nothing visible exists yet.** That is the thing P2.2 fixes.
