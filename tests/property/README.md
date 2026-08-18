# The property / invariant suite

Generated legal games, checked against rules the engine must never break.

---

## Read this first

> ### The equivalence corpus is an oracle for AGREEMENT, not for correctness.
>
> A bug-for-bug port is **green on a violation both engines share.** 6,000 identical games say
> the port matches legacy; they say nothing about whether legacy was right.
>
> **That is the entire reason this suite exists.** It is the only instrument in the repository
> that asks whether the rules are true rather than whether two engines concur.

The four instruments and what each is structurally blind to are tabulated in
[`../equivalence/README.md`](../equivalence/README.md), item 5. This suite adds a fifth row:

| Instrument | Authoritative on | Structurally cannot see |
|---|---|---|
| **Property suite** | **Correctness of stated rules**, over generated legal play | Anything nobody stated. It checks eight claims, not the engine |

And the standing rule that governs everything here:

> ### A check that has never failed is not known to work.
>
> Every invariant is made to fire on purpose before it counts. `src/negative-control.test.ts` is
> the exit criterion, not an extra.

---

## Three of the brief's seven invariants were wrong, and are not written as stated

Found by measuring before writing, which is the only reason they were not written, shipped green,
and quietly weakened later.

| [`PHASE1_BRIEF.md`](../../docs/PHASE1_BRIEF.md) §7 says | Reality | What is asserted instead |
|---|---|---|
| "antibodies never exceed the per-family cap" | **False in ordinary play.** 288 of 1,200 measured games reach it — a damaged liver lowers `capFam` to 2 without touching stores already made ([`FINDINGS.md`](../../docs/FINDINGS.md) #27) | Two invariants: the **undamaged ceiling** is never exceeded, and **`produce` respects the cap in force when it writes** |
| "turn number never decreases" | **Cannot fail.** `pushUndo` deliberately does not capture `turn` (view.ts:20), and nothing else lowers it. A generative assertion would pass forever and mean nothing | A **key-set assertion on the undo snapshot** — `src/undo-snapshot.test.ts` |
| "killing the last invader always records memory" | **Training only**, by design. On Normal and Hard immunity must be EARNED BY VACCINATION (effects.ts:67) | The **difficulty-conditional** rule, asserted in both directions |
| "no invader occupies two locations" | Unfalsifiable as written — an invader is one record with one `zone` | **Placement coherence**: the fields the zone makes authoritative are present and in range |

The third is the one to protect. It is a deliberate design decision of Kartik's and it is
biologically pointed — recovering from an illness is not the same as being protected from one. A
contributor "tidying up the inconsistency" would delete the lesson with every other test still
green. `L3` breaks it on purpose and watches the suite go red.

---

## The ten invariants

| id | Claim | Kind |
|---|---|---|
| `ap-non-negative` | AP is never negative and never NaN, in the shared pool or a per-player budget | state |
| `placement-coherence` | Every invader is somewhere the board actually has | state |
| `antibody-ceiling` | No pool exceeds the difficulty's undamaged cap | state |
| `production-respects-cap` | `produce` never writes above the cap in force at that moment | transition |
| `no-dead-cell-acts` | An action never succeeds for a cell that was not alive | transition |
| `viewstate-round-trip` | `viewState` survives a JSON round-trip unchanged | state |
| `gamestate-round-trip` | The **whole `GameState`** survives a JSON round-trip unchanged | state |
| `undo-round-trip` | `pushUndo` then `undo` is the identity | state |
| `memory-on-kill` | A kill records memory on Training, and never on Normal or Hard | transition |
| `burst-tail-authoritative` | The last frame of an `endCommand` burst equals the post-action `viewState` | transition |

> ⚠️ **Corrected 18 Aug 2026, at P2.1 step 3.** This heading said **eight** and the table had
> eight rows. `ALL_INVARIANTS` held **nine** — `burst-tail-authoritative` was added with the
> Phase 2 preconditions and never reached this file. Nobody was harmed by it, and that is the
> uncomfortable part: an undercounting inventory reads as conservative, so it does not attract
> the suspicion an overclaim does. It is the same shape as [`FINDINGS.md`](../../docs/FINDINGS.md)
> #37, an inventory missing its largest entry. Both missing rows are now here, and the count is
> ten.

The three round-trip invariants are the ones the corpus is blind to **by construction**: `rig.ts`'s
`normalise()` round-trips *both* engines through JSON before hashing, so anything JSON destroys is
destroyed identically on both sides and the hashes still match.

**`gamestate-round-trip` is not redundant with `viewstate-round-trip`, and the difference is the
whole reason it exists.** `viewState` is a *projection*: it drops 13 of `GameState`'s 53 keys —
`_actingPid`, `complement`, **`deck`**, `discard`, `drawnList`, `events`, `everInfected`, `fx`,
`novelTurn`, `stats`, `undo`, `wormsSpawned`, `wormsThisTurn` — and reports `deckCount: 95` rather
than the 95 cards. A game therefore **cannot be resumed from a `viewState`**.

Phase 2's `Storage` serialises `GameState`, so save-and-resume rests on this property
([`PHASE2_BRIEF.md`](../../docs/PHASE2_BRIEF.md) v1.1 §3, review item B). Before this invariant the
strongest available statement was that **one** state had been observed to survive
`JSON.parse(JSON.stringify(…))` — one state is not an invariant, and `Storage` would have been
built on it.

Its control asserts the asymmetry rather than describing it: **one** saboteur plants a `NaN` in
`g.wormsThisTurn`, `gamestate-round-trip` must fire, and `viewstate-round-trip` must **not**. The
second half is only meaningful because the first half fired on the identical corruption — which is
what makes it a measurement of blindness rather than an absence of evidence.

---

## Running it

```bash
pnpm test                                   # the fast tier, inside pnpm verify
npx tsx tests/property/full-run.ts          # 10,000 games — the brief's definition of done
npx tsx tests/property/full-run.ts 500      # a subset
```

`full-run.ts` exits non-zero if any invariant finished with `checked: 0`. **A green run whose
counts contain a zero is not a pass** — it is an invariant that never had anything to look at.

Last full run, 12 Aug 2026 — **10,002 games, 1,032,791 states, 0 violations, 858s**:

```
            1032791  ap-non-negative
           10265784  placement-coherence
            7229537  antibody-ceiling
             185845  production-respects-cap
             396728  no-dead-cell-acts
            1032791  viewstate-round-trip
             799935  undo-round-trip
              70083  memory-on-kill
```

23 of the engine's 27 actions were applied. The four never reached are `activate` (returns an
error by design) and the three allocation actions, which are multiplayer — the same four
[`FINDINGS.md`](../../docs/FINDINGS.md) §1.1 classifies as not real gaps. **All 8 of the real
gaps in the reference bot's action space are covered**, by `injectExtra`.

---

## How it is put together

**One generator, not two.** Sequence generation reuses `@immunity-wars/equivalence/bot`, which is
explicitly *not* a behaviour oracle — its only job is to produce long legal games, which is what a
property suite wants. It does not emit 8 of the engine's 27 actions
([`FINDINGS.md`](../../docs/FINDINGS.md) §1.1), so `injectExtra` fills those in through the bot's
own emit hook rather than by writing a second decision engine.

**One minimiser, not two.** `ddmin` was lifted out of `equivalence/src/shrink.ts` behind a
predicate at Task D. The corpus asks *do these two engines disagree?*; this suite asks *does one
engine break an invariant?* — same reduction, same soundness argument, one implementation. A
property failure therefore reports as a minimal **action list**, in the format this project
already reads.

**fast-check generates; it does not shrink.** `endOnFailure: true` turns its shrinker off. What it
would hand back is a reduced *choice record*, which nobody can read.

**The runner never copies the state.** A `JSON.parse(JSON.stringify(g))` on the way in would erase
`undefined` and mangle `NaN` before any predicate saw them — the Task C5b shape, an oracle
regenerated before it is read. One negative control exists solely to prove this has not happened.

---

## The rule that fell out of this: match the corruption to the KIND of check

Five negative controls would not fire while looking correct. Each was a control aimed at the
wrong kind of failure, and together they classify cleanly enough to be a rule rather than a
Task D anecdote.

> ### A check can only be falsified by the right KIND of corruption.
>
> | Kind of check | What can falsify it |
> |---|---|
> | **state** | corrupt the state |
> | **delta** | corrupt **ONE** action — a persistent corruption poisons the "before" of every later action, so the delta stays zero |
> | **machinery** | only a **wrong engine**; no value written into the state can make a correct implementation fail |
> | **write-logic** | only a **wrong engine**; corrupting the input the write guards against makes it MORE careful, not less |
>
> **Before writing a control, ask which kind of check you are falsifying.**

This is why the L3 section holds four controls where the plan budgeted one. That was **discovered,
not planned** — each of the three extra ones exists because a saboteur was written first, failed to
fire, and the reason turned out to be structural rather than a mistake in the saboteur.

The corollary is the uncomfortable one: a control aimed at the wrong kind of check **passes** as
soon as you make it fire somehow, and then certifies an invariant nobody has actually falsified.

### And the second half of that rule, added at Task E

> ### A control that fires is not enough — measure how STRONGLY it fires, against WHAT.
>
> A mutation caught in 1 game of 150 is a lucky pass wearing a working control's clothes.
> **Report the sensitivity floor alongside any claim the control supports.**

Found at Task E0a, and the case that earned it is worth the two lines. The bot-fidelity check's
first control was green — and green on a mutation that diverged on **1 game in 150**. Nothing
about the pass said so. Changing the question from *can it fire* to *how strongly, against what*
produced a measured table instead of a binary, and the table said something the binary could not:
the comparator is strong against changes to *what the bot does* and weak against changes to *how
much AP it spends*. **That is what forced the published claim down to the smaller true one** —
agreement on outcomes across 3,000 games, not identity of the two procedures.

The table, and the blind spot it exposed, are in
[`../balance/README.md`](../balance/README.md), "How hard is that check to fool?".

Note how this composes with the four kinds above. The four-kinds rule stops you writing a control
that **cannot** fire. This one stops you trusting a control that **barely** does. Both failures
look identical from the outside: a green test and a claim nobody has falsified.

### And the third half of it, added at Task F0

> ### A control measured at the wrong scale gives a confident, coherent, WRONG answer.
>
> Sensitivity is a property of the **sample size**, not of the check.
> **Measure controls at the scale they will actually run at.**

This one is nastier than the two above, because nothing about the result looks wrong. F0 needed to
know whether widening a band to its analytic floor would cost the panel any detection, and measured
it against the E2 controls' own calibration — **4 arms × 400 games**. The answer came back clean,
internally consistent, and alarming: the flagship control, one Action Point removed from every
turn, flipped from **FAIL to pass**. On that basis the fix was going to be abandoned.

At the shipped arm shape — **20 × 100, the size CI actually gates at** — the same comparison says
the opposite. The change reads **3.8σ** at control scale and **17.9σ** at shipped scale, so at
shipped scale it fails on the 6σ clause with room to spare, and every other "must FAIL" control
survives widening too. `metrics-control.test.ts` had even written the 3.8-vs-14σ gap down in a
comment; it still did not stop the wrong conclusion being drawn, because the number was in the
control's own file and the question was being asked somewhere else.

What makes it dangerous is that the wrong answer is not noisy or marginal. It is a clean table with
a clear verdict, and the verdict is an artefact of running the comparison 5× too small. There is no
internal signal to catch it — only the discipline of asking *"is this the scale the thing under
test will run at?"* before believing the output.

**The check is not the instrument. The check plus its sample size is the instrument.**

---

## The third rule: a diff cannot see a defect both sides share

Added at Task E1, from [`FINDINGS.md`](../../docs/FINDINGS.md) #30. It is the most general thing
this project has found, and it is the reason this suite exists at all — stated once, properly.

> ### An audit that compares two versions is blind to anything both versions get wrong.
>
> **Comparison finds divergence, never shared error.**
>
> Whenever a check is a diff — old rule vs new rule, port vs legacy, before vs after — ask what a
> shared defect would look like, **because nothing in the comparison will tell you.**

The same blindness has now appeared at three levels of this repository, which is what makes it a
law rather than an anecdote:

| Level | The diff | What it cannot see |
|---|---|---|
| **The product** | Equivalence corpus: port vs legacy, 6,000 games | A bug **both engines share.** A bug-for-bug port is green on it — which is precisely why this suite was built |
| **The instrument** | C1's classifier audit: old rule vs new rule, over all 1,526 arms | A clause **both rules contain.** `a.short === 'ap.ts'` sat in the shared half, so the audit ran and could not report it |
| **The control** | A negative control: engine vs mutated engine | A defect the mutation **does not touch.** The four-kinds rule and the sensitivity floor are the two ways this shows up |

The middle row is the sharp one: **it is the product's blind spot reappearing inside the tool that
audits the tool.** C1 fixed a misclassifying rule and audited the fix the obvious way — compare old
and new across the full input set, which is more rigour than most fixes get. It still could not
see the clause both versions carried, because that clause produced no disagreement to find.

### What to do instead, when a check is a diff

Nothing here says stop diffing. Diffs are the cheapest strong evidence available and this project
runs three of them. The rule is what has to sit **beside** one:

- **State what a shared defect would look like**, in the check's own file, before trusting it.
  Every instrument here now carries a "structurally cannot see" line for this reason.
- **Reach the same answer a second way, from a different direction.** The property suite exists
  because it asks whether a rule is *true*, where the corpus only asks whether two engines
  *agree*. #30 was found the same way — by a census that asked which fields carry values, not by
  any comparison.
- **Check the shared part explicitly.** In C1's case that would have meant reading the surviving
  clauses and their justifying comments, not only the diff. The comment above `a.short === 'ap.ts'`
  asserted `ap.ts` "is the per-player AP budget and nothing else", and it was false in writing.

---

## Five things learned building the negative controls

Each was found by a control that **would not fire**, which is the controls working.

**1. A delta check cannot be falsified by a persistent corruption.** `memory-on-kill`'s Normal/Hard
arm compares memory before and after a kill. A saboteur that wrote memory on every action poisoned
the *before* of every later action, so the corruption was invisible. The control had to become a
wrong engine.

**2. A machinery check cannot be falsified by a data corruption.** `undo-round-trip` is about the
engine's own capture-and-restore. No value written into the state can make a correct implementation
fail. The first draft tampered with the undo stack; the invariant pushes a fresh snapshot and pops
that one, so the tampering was never read.

**3. An invariant about an engine must run THAT engine's machinery.** Chasing (2) exposed that the
invariants called the *port's* `pushUndo` and `viewState` regardless of which engine produced the
state — so a deliberately-broken engine was being checked with a correct implementation. That is
what `Ctx` exists for. Geometry is still read from the content pack, deliberately: an invariant
that asks the engine for its own expected value is checking the engine against itself.

**4. A write-logic check cannot be falsified by corrupting the input the write guards against.**
`production-respects-cap` looked easy to sabotage: inflate the stores so the next `produce` lands
over the cap. It is self-defeating — `produce` refuses outright when the store is full, so the
corruption makes the engine *more* careful. Only removing the clamp inside `produce` itself can
make the claim false.

**5. Not every corruption discriminates.** The control for "the runner does not copy the state"
first wrote `NaN` — which survives a JSON round-trip as `null` and still fails
`Number.isFinite`, so the control would have passed under both the correct and the broken runner.
`undefined` is the discriminating value: the key vanishes entirely. **A control that passes under
both implementations is not a control**, and that is asserted executably rather than trusted.

---

## Limits, stated

- **`memory-on-kill` only examines command-phase kill actions.** During `endCommand` an invader can
  also leave `g.invaders` by ARRIVING at an organ, which is not a kill and correctly records
  nothing. Checking there would report false violations.
- **The suite checks eight claims.** Coverage of the engine is the coverage gate's question, not
  this one; a rule nobody stated is a rule nobody is checking.
- **Single-player only**, like the corpus. `apBudget` is checked when present, but the allocation
  actions are Phase 3.
