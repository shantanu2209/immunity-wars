# Task D — closeout

Property/invariant suite, plus wiring. Scope was reduced by Shantanu on 12 Aug 2026: visual
regression and accessibility move to Phase 2, where there is a UI to test. See
[`TASK_D_HANDOFF.md`](TASK_D_HANDOFF.md) §1.

Method and detail: [`tests/property/README.md`](../tests/property/README.md). This is the summary.

---

## 1. The numbers

```
10,002 games · 1,032,791 states · 0 invariant violations · 858s
23 of 27 actions applied      (the 4 missing: `activate`, an error by design,
                               and the 3 multiplayer allocation actions)
all 8 real gaps in the reference bot's action space covered

pnpm verify green: 405 tests
  315 equivalence · 52 content · 33 property · 5 scaffold
```

*Correction to commits `35bff14` and `8a1207f`, which both say 404.* The figure is **405**
(315 + 52 + 33 + 5). Recorded here rather than by rewriting history, on the same rule
[`DEVIATIONS.md`](DEVIATIONS.md) uses and [`FINDINGS.md`](FINDINGS.md) #25 followed.

Per-invariant check counts, over the full run — the guard against a green suite that examined
nothing:

```
 1032791  ap-non-negative          10265784  placement-coherence
 7229537  antibody-ceiling            185845  production-respects-cap
  396728  no-dead-cell-acts          1032791  viewstate-round-trip
  799935  undo-round-trip              70083  memory-on-kill
```

`full-run.ts` exits non-zero if any of those is 0.

---

## 2. What the suite proves

**That eight stated rules hold over generated legal play**, and that each of the eight has been
made to fail on purpose before being trusted.

It is the first instrument here that asks whether the rules are **true**. The equivalence corpus is
an oracle for **agreement**: a bug-for-bug port is green on a violation both engines share, so
6,000 identical games say the port matches legacy and nothing about whether legacy was right.

One invariant is something no existing instrument could have caught. `viewstate-round-trip` is
invisible to the corpus **by construction** — `rig.ts`'s `normalise()` round-trips *both* engines
through JSON before hashing, so anything JSON destroys is destroyed identically on both sides and
the hashes still match.

## 3. What it does not prove

- **Coverage of the engine.** It checks eight claims. A rule nobody stated is a rule nobody is
  checking, and that is the coverage gate's question, not this one.
- **Anything about difficulty or balance.** Task E.
- **Multiplayer.** Single-player only, like the corpus. `apBudget` is checked when present, but the
  allocation actions are Phase 3.
- **That `memory-on-kill` holds during the spread phase.** It examines command-phase kill actions
  only: during `endCommand` an invader can also leave `g.invaders` by *arriving* at an organ, which
  is not a kill and correctly records nothing.

---

## 4. Three of the brief's seven invariants were wrong

Found by measuring before writing. Each would otherwise have been written, shipped green, and
weakened when it went red.

| §7 says | Reality |
|---|---|
| "antibodies never exceed the per-family cap" | **False in ordinary play** — 288 of 1,200 games. A damaged liver lowers `capFam` to 2 without touching stores already made. [`FINDINGS.md`](FINDINGS.md) #27 |
| "turn number never decreases" | **Cannot fail.** `pushUndo` deliberately does not capture `turn`. Replaced by a key-set assertion on the snapshot |
| "killing the last invader records memory" | **Training only, by design.** On Normal and Hard immunity must be earned by vaccination |

The third is the one to protect: it is Kartik's design decision, not an implementation detail, and
a contributor tidying up the "inconsistency" would delete the lesson with every other test green. A
mutant engine breaks it on purpose and the suite goes red.

---

## 5. The result worth carrying forward

Five negative controls would not fire while looking correct. The reasons classify:

> **A check can only be falsified by the right KIND of corruption.**
> state → corrupt the state · delta → corrupt ONE action · machinery → only a wrong engine ·
> write-logic → only a wrong engine
>
> **Before writing a control, ask which kind of check you are falsifying.**

Full table and worked examples in [`tests/property/README.md`](../tests/property/README.md). This is
why the wrong-engine section holds four controls where the plan budgeted one — discovered, not
planned.

Chasing one miss produced [`FINDINGS.md`](FINDINGS.md) #28: three invariants called the *port's*
machinery whatever engine produced the state, so a broken engine was checked with a correct
implementation. The C5b shape again — a module-level import silently substituting for the thing
under test.

---

## 6. What Task E inherits

| Thing | Why it matters there |
|---|---|
| `@immunity-wars/equivalence` **exports map** | `bot`, `hash`, `rng`, `shrink`, `diff`, `engine`, `types`. The balance harness needs the same four modules; this decision is now made once |
| `runGame`'s **`engine` option** | Running a harness against a deliberately-mutated engine is the confined-change pattern. Already wired |
| **`ddmin` behind a predicate** | One minimiser, two predicates. A third caller costs nothing |
| **Metric panel candidates** | Unchanged: [`FINDINGS.md`](FINDINGS.md) § "Task E metrics" |

## 7. Open, and not Task D's

- **`rulesVersion`** is documented on every state and message and is on neither.
  [`FINDINGS.md`](FINDINGS.md) #26 — **Phase 3**, where the protocol becomes real and the check can
  actually fail.
- **CI tiering.** The fast tier runs in `pnpm test`; `pnpm test:property` is the ≥10,000-game tier,
  on demand. Wiring either into CI is **Task F**, along with a suite manifest for the dashboard's
  per-suite pass/fail — [`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §7's seven-suite table still has no
  counterpart on disk.
- The five design questions for Kartik, unchanged: [`TASK_B_CLOSEOUT.md`](TASK_B_CLOSEOUT.md) §7.
