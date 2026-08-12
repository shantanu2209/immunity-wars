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

## The eight invariants

| id | Claim | Kind |
|---|---|---|
| `ap-non-negative` | AP is never negative and never NaN, in the shared pool or a per-player budget | state |
| `placement-coherence` | Every invader is somewhere the board actually has | state |
| `antibody-ceiling` | No pool exceeds the difficulty's undamaged cap | state |
| `production-respects-cap` | `produce` never writes above the cap in force at that moment | transition |
| `no-dead-cell-acts` | An action never succeeds for a cell that was not alive | transition |
| `viewstate-round-trip` | `viewState` survives a JSON round-trip unchanged | state |
| `undo-round-trip` | `pushUndo` then `undo` is the identity | state |
| `memory-on-kill` | A kill records memory on Training, and never on Normal or Hard | transition |

`viewstate-round-trip` is the one the corpus is blind to **by construction**: `rig.ts`'s
`normalise()` round-trips *both* engines through JSON before hashing, so anything JSON destroys is
destroyed identically on both sides and the hashes still match.

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
