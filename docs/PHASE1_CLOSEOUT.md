# Phase 1 — closeout

**Objective, from [`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §1:** stand up the repository, toolchain,
test infrastructure and dashboard, and port the rules engine to TypeScript with full test coverage
— with zero new gameplay features and zero visual change.

**Status: complete, with two definition-of-done items NOT met.** They are named in §2 and neither
is hidden behind a qualifier.

---

## 1. What Phase 1 delivered

| Task | Delivered |
|---|---|
| **A** — Scaffold | pnpm workspaces + Turborepo, TypeScript `strict`, Vitest, ESLint/Prettier, dependency-cruiser boundaries, Apache 2.0, pinned toolchain |
| **B** — Engine port | `v2_engine.js` → `packages/engine`, TypeScript strict, zero `any`; equivalence corpus proves agreement action-for-action against legacy |
| **C** — Content extraction | Board geometry, diseases, labels and rules tables → `packages/content` as Zod-validated JSON with a pack stamp; engine data exports proven identical to content *by object identity* |
| **D** — Test suites | Property/invariant suite over generated legal play; three of the brief's seven invariants were **false as written** and were corrected by measurement before being coded |
| **E** — Measurements | Serialised state size as a *distribution with percentile ranks* and a frame-burst figure, not one state; the balance **metric panel**, whose first design detected neither an Action Point removed nor half the Brain's integrity |
| **F** — CI and dashboard | GitHub Actions per-push and nightly tiers, suite manifest, results dashboard live at **https://shantanu2209.github.io/immunity-wars/** |
| **G** — Single-file harness | Ported engine + legacy UI → one self-contained HTML file that plays by double-clicking, plus a legacy-engine reference window. [`TASK_G_CLOSEOUT.md`](TASK_G_CLOSEOUT.md) |

**Four test suites on disk**, each with negative controls that fire on purpose: equivalence-corpus
(7), property (19), balance-panel (24), content-schema (27).

---

## 2. Definition of done, item by item

From [`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §9. **No softening.**

| # | Item | Verdict |
|---|---|---|
| 1 | Monorepo builds clean; TypeScript `strict: true`; zero `any` in `engine` | **MET.** `noUncheckedIndexedAccess` also enabled, as an isolated commit at the end of Task B |
| 2 | Engine ported; all existing behaviour preserved; public API unchanged | **MET, with two qualifications.** Five deliberate deviations are recorded in [`DEVIATIONS.md`](DEVIATIONS.md), each a fix applied *after* equivalence was proven. And the 67-export "contract" is **not the surface the UI actually uses** — [`FINDINGS.md`](FINDINGS.md) #39 |
| 3 | Content extracted, Zod-validated, `rulesVersion` stamped | **MET** on the content pack. `rulesVersion` is **not** on states or messages, contrary to what the brief said elsewhere — [`FINDINGS.md`](FINDINGS.md) #26, Phase 3 |
| 4 | **All player-visible strings in i18n catalogues** | **NOT MET.** Only the `engine` namespace exists — 149 messages, 164 sites. The `ui`, `board` and `diseases` namespaces were never built. That is ~666 disease strings and ~154 loose UI prose strings absent from any catalogue. §5 |
| 5 | Seven test suites green; property suite ≥10,000 games without invariant violation | **MET on the substance, NOT on the count.** The property tier runs **10,002 games / 1,032,791 states**, green. But §7's seven suites are four on disk, three cross-cutting properties, and one (`unit`) that does not exist — reconciled in `tests/suites.json`, [`FINDINGS.md`](FINDINGS.md) #37 |
| 6 | CI green; dashboard live at a public URL | **MET.** Page returns 200; the first real nightly succeeded and exposed two defects that a green run had hidden ([`FINDINGS.md`](FINDINGS.md) #38) |
| 7 | Single-file harness plays identically to today, by double-clicking on the Windows PC | **MET on playability; "identically" is proven at the ENGINE level only.** The scripted side-by-side comparison was descoped by Shantanu. No human has ever observed the two engines side by side — [`TASK_G_CLOSEOUT.md`](TASK_G_CLOSEOUT.md) §4 |
| 8 | Reported: serialised state size, and the balance baseline | **MET.** Both in [`TASK_E_CLOSEOUT.md`](TASK_E_CLOSEOUT.md), with the censoring caveat that makes every figure a floor |
| 9 | **Eight seam interfaces defined, one implementation each** | **NOT MET.** None of the eight exists. No `Session`, `IdentityProvider`, `CommsPolicy`, `HelpProvider`, `Entitlements`, `Storage` or `Telemetry` type is declared anywhere; `packages/protocol` is an 11-line scaffold. §5 |
| 10 | Legacy files retained read-only under `tools/legacy/` | **MET.** Never edited; the harness substitutes at build time into a build output. Pre-brain-fix builds quarantined in `tools/legacy/stale/` |

**Eight of ten met. Items 4 and 9 are not met, and both are Phase 2 blockers rather than
nice-to-haves** — see §5.

---

## 3. What Phase 1 does NOT prove

Collected from every task's closeout into one place, so nobody has to reassemble it.

| Not proven | Source |
|---|---|
| **That the game is well designed.** Every instrument compares two engines or checks a stated rule. None judges the rules | B §3 |
| **That legacy itself is correct.** Bug-for-bug means the port faithfully reproduces legacy's bugs | B §3 |
| **Anything about multiplayer.** Single-player throughout. The three allocation actions and the per-player AP plumbing are barely exercised — 8 arms deferred to Phase 3 | B, D, `COVERAGE_DEFERRED.md` |
| **Anything about difficulty.** The reference bot wins 0.2% on Normal where humans win essentially every game. That is a bot-capability signal | `FINDINGS.md` §1 |
| **That deliberately-diverged paths still match.** `stats.arrivals` / `stats.gotThrough` are excluded from the comparison hash | B §5 |
| **Coverage of rules nobody stated.** The property suite checks eight claims; an unstated rule is unchecked | D §3 |
| **That the panel detects a difficulty change.** It detects *engine change*, and brain `branch:3→4` is a pinned, demonstrated gate-level blind spot | E, `FINDINGS.md` #34.4 |
| **That the port and legacy RENDER identically.** Never compared visually by anything or anyone | G §3, §4 |
| **Performance, anywhere.** Nothing in Phase 1 timed anything | G §3 |
| **Anything on mobile.** No mobile browser was opened in Phase 1 | G §3 |
| **Anything about the UI's own code.** `v2_ui.html` is embedded unchanged and untested | G §3 |

**The recurring instrument failure, stated once.** Roughly a dozen times in Phase 1 a check was
found to be measuring nothing, or the wrong thing, and **zero times did it turn out to be fine**:
C5b's self-regenerating oracle, the coverage gate's whole-file rule (#24, #30), the metric panel's
first design (#34), bands below their sampling floor (#35), an inventory wrong by omission (#37),
two instruments producing a permanently-red row (#38), and Task G's four generator defects. The
pattern is always the same — **a confident, well-formatted, wrong answer that never crashes.** The
negative-control rule exists because of it and should survive into Phase 2 unchanged.

---

## 4. The findings queue, by owner

**40 findings.** Full detail in [`FINDINGS.md`](FINDINGS.md).

### For Kartik — design questions, 6

Nothing has been changed. These are about the game.

| # | Question |
|---|---|
| 4 | **Antigenic variation is unreachable** — the only `variant` card is a parasite, and `neutralise` rejects parasites before the variant roll |
| 5 | **A resident macrophage can never eat from its starting position.** The rulebook, study packet and tooltip all imply otherwise. **A gap in the physical game too** |
| 15 | **The Heart has the shortest branch on the board** and is the most common first-failure organ — the rulebook warns about the Brain instead |
| 18 | **Degranulate costs half the Brain to use.** Strike-twice is strictly better there. Is the interaction intended? |
| 23 | `Diphtheria toxin` is content the engine can never produce |
| 29 | **`g.free` — the Helper T-Cell's free-action pool — is never granted by anything.** The design is done; the plumbing is missing. Third instance of the #4 pattern |

### Phase 2 — 4

| # | Item |
|---|---|
| 1 | **The reference bot plays ~6 of 14 seats**, never emits 8 of 27 actions, never moves the Neutrophil, never repositions a resident. Dual-use with seat-filling AI for online play |
| 39 | **The 67-export contract is not the UI's real surface** — script injection exposes all 153 top-level declarations |
| — | **9 coverage arms** reachable only once a competent bot exists — `COVERAGE_DEFERRED.md` |
| — | **The rendering gap** — nothing has compared the two engines visually |

### Phase 3 — 3

| # | Item |
|---|---|
| 26 | **`rulesVersion` is on neither states nor messages**, contrary to the brief. The protocol becomes real in Phase 3 |
| — | **Seam 7's pack version check**, deliberately deferred to the downloadable-pack loader — the first point where a pack can genuinely disagree with the engine |
| — | **8 coverage arms** for the allocation phase and per-player AP — `COVERAGE_DEFERRED.md` |

### Open method debt — 2

| # | Item |
|---|---|
| 30 | **The coverage-gate classifier still has no test.** #24's original gap, never closed |
| 25 | **Rule A's churn re-test** — exclusion lists decay in both directions; proposed, not done |

### Recorded, no action — the remainder

#2 obsolete baselines · #3 and #20 fixed · #6 no balance-sim harness (superseded at E) · #7 dead
knob · #8 unread FLAGS · #9 broken `spec_test.js` · #10 stale label · #11 dead code · #12
unexported internals · #13 fixed at C4 · #14 worm safeguards hold · #16 `forceInject*` bypasses
accounting · #17 one turn of Eosinophil slack · #19 defensive array spread · #21 unreachable guard ·
#22 the guards-against-impossible-states pattern · #24, #28, #31–#38 method findings, all fixed or
pinned.

---

## 5. What Phase 2 inherits

### The two unmet definition-of-done items — do these first

**1. The eight seams do not exist.** [`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §6 requires an interface
each with one implementation, and §6 says why seam 1 in particular is load-bearing:

> **Seam 1 is load-bearing: single-player must go through it too.** One code path, not a fork. This
> is what makes multiplayer additive later instead of a rewrite.

None was built. Nothing in Phase 1 needed them — there is no UI, no server and no storage — so the
omission never caused a failure, which is exactly why it survived to the end. **A Phase 2 UI built
directly against `applyAction` is the fork §6 exists to prevent**, and retrofitting `Session` after
the UI exists costs more than defining it now.

**2. The i18n catalogues cover the engine only.** 149 engine messages are extracted and pinned by a
drift test. The `ui`, `board` and `diseases` namespaces are not built. The brief is blunt about why
this matters:

> Retrofitting is expensive and the Hindi edition is a committed grant milestone.

Partial mitigation, and it is real: the UI *tables* already live in `packages/content` as validated
data with a test proving they still equal `v2_ui.html`, so they cannot drift. What has nothing is
the **~154 loose UI prose strings** — button labels, tooltips, the modal text — plus **46 that need
a human call** on whether they are player-visible at all ([`STRING_INVENTORY.md`](STRING_INVENTORY.md)
§3). The disease namespace (666 strings) is Kartik's written science and needs a subject-matter
translator, not a UI string pass; that split exists so the Hindi edition can be costed honestly.

### Also inherited

| Thing | Note |
|---|---|
| **`vitest 2 → 3`** | ⚠️ **Trigger condition.** The Dependabot acceptance rests on nothing here listening on a port. **A Vite dev server for the Phase 2 UI collapses that reasoning — upgrade vitest in the same change that introduces the server.** [`SECURITY_NOTES.md`](SECURITY_NOTES.md). The Task G harness does *not* trip it: esbuild's build API, one-shot, no port |
| **TypeScript 6.0.3** | Dependabot PR #2, a major bump, deliberately unmerged and deferred past Task G |
| **The deferred coverage lists** | `COVERAGE_DEFERRED.md` — 8 arms Phase 3, 9 arms Phase 2. They stay in the denominator; excluding them would hide real work behind a restated gate |
| **`content/board/geometry.json`** | The single source for the on-screen SVG board *and* the printed A2 artwork. Physical/digital parity is structural now, not remembered |
| **The equivalence corpus** | Still the oracle. Any Phase 2 engine change is measured against legacy the same way |
| **The reference window** | A legacy-engine build of the same UI, on demand, for any "did the port change this?" question |
| **`seam-lib.ts`** | Point it at the new React UI and it answers the same question it answered for `v2_ui.html` |
| **The metric panel** | Detects engine change, not difficulty. `sd(arm)` from 24 arms with an analytic floor; recalibration is a deliberate separate command so the harness can never overwrite its own reference |
| **The content licence** | Still **pending** an assets-provenance check. Do not publish artwork or declare a content licence until the AI tool's terms are confirmed to permit CC BY-SA 4.0 redistribution — [`ASSETS.md`](ASSETS.md) |
| **The generator rule, from G** | A generator with no oracle is a test that regenerates its own answer. If its output will be handed to a human as an instruction, at least one line of it must be executed by a machine first |

### The one measurement that could reopen a locked decision

[`PHASE1_BRIEF.md`](PHASE1_BRIEF.md)'s Phase 2 preview: the **WebView performance spike on low-end
Android**. It decides whether Capacitor holds or React Native becomes necessary. Nothing in Phase 1
measured performance anywhere, so that spike starts from zero.

---

## 6. What to say about Phase 1, and what not to

**Accurate:**

> The rules engine was ported to TypeScript and proven to agree with the original, action for
> action, over thousands of generated games. The original game now runs on the new engine as a
> single self-contained file. Test infrastructure, CI and a public results dashboard are live.

**Not accurate:**

- "The app was proven identical" — engine data yes, rendering never compared. G §4.
- "The game is balanced at N%" — any win rate is *"under the reference bot, vN, at N games per
  difficulty"*, and the bot plays about six of fourteen seats.
- "Phase 1 is 10/10 done" — it is 8/10, and the two gaps are Phase 2's first work.

**Design credit is Kartik's; the implementation is Claude's, directed by Shantanu.** That
distinction holds in every document here and should hold in anything written from them.
