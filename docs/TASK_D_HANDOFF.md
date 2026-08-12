# Task D — what it inherits from Task C

Written at the end of Task C so nothing needed for Task D lives only in a conversation.
Same purpose as [`TASK_C_HANDOFF.md`](TASK_C_HANDOFF.md), which is still worth reading: its §2
("four things that will silently break") and §5 (standing constraints) apply unchanged.

---

## 1. Task D IS SMALLER THAN THE BRIEF SAYS

**Scope cut, decided by Shantanu, 12 August 2026.** The project is ~15% of the way to a live
Android app and Phase 2 — the UI rebuild, the largest single chunk — has not started. Task D is
therefore reduced to:

| In Task D | Deferred to Phase 2 |
|---|---|
| **The property / invariant suite** — the real upgrade this project does not have | **Visual regression** |
| **Wiring the suites that already exist** from Task B/C | **Accessibility** |

The reason for the deferrals is not time. **There is no UI to screenshot or audit.** Both become
possible and meaningful the moment React renders something, and doing them now would mean
building against a target that does not exist and revising when it does.

[`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §7 lists seven suites. Read it against §2 below, which says
what is actually built.

**Tasks E, F and G are unchanged.** E unblocks the hosting decision, F is what makes everything
after it cheap, G is the proof.

---

## 2. What actually exists, measured 12 Aug 2026

Not what the brief assumes — what is on disk.

| Suite (BRIEF §7) | State | Where |
|---|---|---|
| Unit | **Partial.** Real coverage lives in the equivalence rig, not in per-package unit tests | `tests/equivalence/src/` (17 files) |
| **Property / invariant** | **ESSENTIALLY ABSENT — this is Task D's job** | see below |
| Balance regression | **Absent.** `tests/balance/` is a `.gitkeep`; `pnpm test:balance` is a stub that exits non-zero | Task E builds it |
| Negative | **Exists** | `returnap.test.ts`; 29 pack-rejection cases in `packages/content/src/load.test.ts` |
| Schema | **Exists**, 52 tests | `packages/content/src/load.test.ts` |
| Boundary | **Exists**, both halves | `.dependency-cruiser.cjs` + `exports.test.ts` identity check |
| Serialisation | **Partial** | `hash.test.ts`; the corpus round-trips states implicitly |

```
tests/property/   .gitkeep only
tests/balance/    .gitkeep only
tests/e2e/        .gitkeep only
fast-check        NOT INSTALLED
```

Current totals: **315 equivalence + 52 content + 6 scaffold tests**, `pnpm verify` green.

### The property suite is closer to zero than it looks

`tests/equivalence/src/invariants.test.ts` exists and its name is misleading. It asserts **one**
of the brief's seven invariants — *a worm is never on a route* — and it is a hand-written
scenario, not a generative test. It is good work ([`FINDINGS.md`](FINDINGS.md) #14) and it is not
a property suite.

The brief's seven invariants, and what is known about each already:

| Invariant | Notes from Task B/C |
|---|---|
| AP is never negative | `returnAP` could write `NaN` before the fix — [`DEVIATIONS.md`](DEVIATIONS.md) #4. Assert `Number.isFinite` too, or NaN slips through `>= 0` |
| No invader occupies two locations | — |
| Antibodies never exceed the per-family cap | Caps vary by difficulty *and* by liver damage (`capFam`) |
| Cells are never both dead and acting | — |
| Every reachable state serialises and reloads identically | `canonical()` in `hash.ts` is the order-sensitive comparator to use, **not** `JSON.stringify` |
| Turn number never decreases | `undo` is the interesting case |
| Killing the last invader of a disease records memory exactly once | — |

**`fast-check` must be added.** The generator needs to emit **legal** action sequences;
`tests/equivalence/src/bot.ts` is an existing sequence generator and is explicitly *not* a
behaviour oracle, which is the right shape to build on.

---

## 3. Standing rules that now bind, in priority order

Both are in [`CLAUDE.md`](../CLAUDE.md); repeated because Task D is largely *writing checks*, so
the first one applies to nearly every commit.

**1. A check that has never failed is not known to work.** Every new check gets a negative
control that makes it fire on purpose. ~10 instances in this project, **zero** where the check
turned out to be fine. Task C5b is the one to remember: 19 green tests proving nothing, because
the test imported its own generator and the import regenerated the oracle. See
`tests/equivalence/README.md`, "Read this first", for the list and the four instrument blind
spots (corpus / gate / dependency-cruiser / `tsc`).

> **A latent instance of exactly that trap, not fixed, flagged per rule 2.**
> `tests/equivalence/reachability-report.ts` and `string-inventory.ts` both run their generator
> at module top level, as `i18n-extract.ts` did. Neither is imported by a test today, so neither
> is broken. **The moment a test imports one for a helper, that test silently becomes unable to
> fail.** The fix is the four-line `executedDirectly` guard already in `i18n-extract.ts`.

**2. Build what the task specifies; for anything beyond it the test is PURPOSE, not cost.** Does
it make later work faster or safer, or is it completeness for its own sake? Flag the second in
[`FINDINGS.md`](FINDINGS.md) and keep going. Saying what an addition makes cheaper or safer later
will usually get it approved.

---

## 4. What Task C leaves behind that Task D can use

| Thing | Why it matters here |
|---|---|
| `tests/equivalence/src/bot.ts` | Legal-sequence generator. The property suite needs one and should not write a second |
| `src/hash.ts` `canonical()` | Order-sensitive, NaN-aware serialisation. The serialisation invariant needs exactly this |
| `src/states.ts` | Harvests real states, then applies 28 mutations the bot cannot reach — a ready-made corpus of awkward states |
| `src/rng.ts` | Seeded `Math.random` + draw counter, so a property failure is reproducible |
| `src/shrink.ts` | Delta-debugs a divergence to a minimal repro (~98 actions → 1). Wire property failures through it |
| `confined-change.ts` | Required before any deliberate behaviour change. **Its allow-list must include every PREVIOUSLY accepted deviation** — see [`DEVIATIONS.md`](DEVIATIONS.md) #5 |
| `coverage-gate.ts` | Now reports **rule-A churn**: arms that have left the exclusion list. Reports, never removes |

---

## 5. Numbers as Task C closes

```
coverage gate      95.66% of 1382 coverable arms   (target 95%, headroom ~6 arms +/- 1)
exclusions         111 of 120                      (rule A 95, rule B 16)
full corpus        6,000 games, 0 divergences      (last run: after the C4 famOf fix)
uncovered coverable 60   -> 9 multiplayer (Phase 3), 9 bot (Phase 2), 42 open
i18n               164 engine sites -> 149 messages, 8 flagged for Phase 2 ICU authoring
strings            1027 counted (upper bound 1073), of which 666 are the diseases namespace
```

**Re-run the corpus after anything that touches the engine.** It is 13 minutes and it is the
only instrument that can say a refactor changed behaviour. Task D should not change engine
behaviour at all — if the corpus goes red, that is the finding.

---

## 6. Open items Task D does not own, so they are not lost

- **Five design questions for Kartik** — [`TASK_B_CLOSEOUT.md`](TASK_B_CLOSEOUT.md) §7. #5
  (resident macrophages, [`FINDINGS.md`](FINDINGS.md) #5) is the one to read first
- **`Diphtheria toxin` is unreachable content** — #23. Delete the row, or give it a producer.
  Kartik's call
- **Seam 7's pack version check is deferred, deliberately** —
  [`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §6. Whoever builds the downloadable-pack loader owns it
- **The rule-A exclusion list is a coverage snapshot, not a proof of death** — #25
- **i18n leg 3 and the UI catalogue** — [`TASK_C_HANDOFF.md`](TASK_C_HANDOFF.md) §3a, with the
  reasoning for why Phase 2 is the better place rather than merely the later one
