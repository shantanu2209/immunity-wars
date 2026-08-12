# Task E — the measurement harness

Two numbers that unblock deferred decisions: **serialised state size** (does a Phase 3 relay
broadcast full state or deltas?) and a **continuous metric panel** that detects engine change.

Plan: [`docs/TASK_E_PLAN.md`](../../docs/TASK_E_PLAN.md). This is the suite's own README.

---

## Read this first

> ### A gate shipping with a DEMONSTRATED blind spot is more trustworthy than one shipping with only a green light.
>
> A green light says "I found nothing". It does not say what it *could* have found. Two checks
> reporting the same green differ enormously in worth, and nothing in the green tells them apart.
>
> So every check here ships with the measurement of what it cannot see, asserted executably
> alongside what it can. Not as an apology — as the other half of the result.

This is the general form of a rule this project already follows in three places, and it is
stated here because it generalises past any one of them:

| Where | The blind spot, demonstrated |
|---|---|
| Equivalence corpus | `normalise()` round-trips both engines through JSON, so anything JSON destroys is destroyed identically and the hashes still match — which is *why* the property suite's `viewstate-round-trip` exists |
| Property suite | Five negative controls that would not fire, classified into a rule about which KIND of corruption can falsify which kind of check |
| **This suite, E0a** | The fidelity check **cannot** see the one difference the two bots really have. Asserted as `0`, with the reason ([sensitivity table](#e0a--bot-fidelity)) |
| **This suite, the panel** | The metric panel **cannot** see brain `branch:3 → 4` ([`FINDINGS.md`](../../docs/FINDINGS.md) #17). To be pinned the same way at E2 |

And the standing rule it sits on, unchanged from the property suite:

> ### A check that has never failed is not known to work.

---

## The instrument table

Each suite here is authoritative about one thing and structurally blind to others. The other
four rows are in [`../equivalence/README.md`](../equivalence/README.md) item 5 and
[`../property/README.md`](../property/README.md).

| Instrument | Authoritative on | Structurally cannot see |
|---|---|---|
| **Balance harness** | **How games go under one specific automated player**, and whether that changed | Difficulty. Human play. Anything the reference bot's ~6 of 14 seats never reach. Rare tail states — it averages over exactly the tail it would need to detect ([`FINDINGS.md`](../../docs/FINDINGS.md) #17) |

---

## What these numbers are never allowed to say

Written before the numbers, because a caveat added afterwards is a caveat that travels
separately from the figure it qualifies. These are the first numbers from this project that will
be quoted outside the repository.

- **No figure here is "the win rate".** Every one is *"under the reference bot, vN, at N games
  per difficulty"* ([`FINDINGS.md`](../../docs/FINDINGS.md) #6). The harness enforces this in its
  output shape — there is no bare number to copy.
- **Nothing here measures difficulty.** The bot wins ~0% on Normal where humans win essentially
  every game. That gap is a bot-capability signal (#1).
- **A green panel means "no broad shift detected", never "the change was safe"** (#17).
- **Every state-size figure is a FLOOR.** The bot dies at turn 8.8 of a 45-turn Hard game, and
  state size grows with invader count.

---

## E0a — bot fidelity

**Why it exists.** Task E's metrics come from `src/play.ts`, which drives the engine with
`@immunity-wars/equivalence/bot`. `FINDINGS.md`'s existing measurements come from `simulate()`'s
inlined bot. The two are *believed* to be the same decision procedure and they differ textually
in one place. Believing it is how this project acquires documented-but-false claims, so it is
measured.

`simulate()` itself cannot be used: it returns seven aggregates over N games, exposes nothing per
game — three of the four panel metrics are not recoverable from it — and extending it would be an
**engine change** that breaks the B6 equivalence contract.

**Result, 12 Aug 2026 — 1,000 seeds × 3 difficulties:**

```
training  1000/1000 identical
normal    1000/1000 identical
hard      1000/1000 identical

compared 3000 games in 25.7s        0 divergences on any of 7 fields
```

Fields compared: `won`, `lossTurn`, `failOrgan`, `organHits`, `trunkKillPct`, `cascade`, and
**`rngDraws`** — the last being the sharp one, since a game consumes thousands of draws and both
procedures must consume the same number.

**Generator label: `reference-bot v1`.** FINDINGS' existing metric table remains a comparable
baseline.

### How hard is that check to fool? — measured, at 50 seeds × 3

The first draft of the control passed on a mutation that diverged on **1 game in 150**. That is a
lucky pass wearing a working control's clothes, so the question was changed from *can it fire* to
*how strongly, against what*.

```
  0/150  (  0.0%)  unmutated legacy                         <- baseline
144/150  ( 96.0%)  threats sorted FURTHEST-first
 50/150  ( 33.3%)  memoryKill step removed
 44/150  ( 29.3%)  NK step removed
  1/150  (  0.7%)  vaccinate 2 AP instead of 1              <- the sensitivity FLOOR
  0/150  (  0.0%)  NET check: invadersWith -> netTargets    <- DEMONSTRATED BLIND SPOT
```

**The comparator is strong against changes to *what the bot does* and weak against changes to
*how much AP it spends*.** It compares outcomes, not behaviour, so a bot difference that never
changes a win, a loss turn, a failed organ, an organ hit, the trunk-kill ratio or the dice count
is invisible to it.

**So the E0a claim is worded as agreement on outcomes, not as identity of the two procedures.**
Those are different claims and only the smaller one was measured.

**The last row is the point.** `invadersWith` vs `netTargets` is the one difference between the
two bots that genuinely exists in the source, and the check cannot see it — because the
Neutrophil never leaves the hub, so the guard above both expressions is never true and neither is
ever evaluated ([`FINDINGS.md`](../../docs/FINDINGS.md) §1.2). It is asserted as `0` rather than
omitted. If it ever goes non-zero nothing is broken: it means a bot has started moving the
Neutrophil, which is exactly what a competent Phase 2 bot would do, and at that moment the two
expressions stop being interchangeable. The test says so in its failure message.

---

## Running it

```bash
pnpm test                                   # the fast tier, inside pnpm verify
npx tsx tests/balance/fidelity.ts           # E0a deep run — 1000 seeds x 3
npx tsx tests/balance/fidelity.ts 50        # a subset
```

---

## Status

| | |
|---|---|
| **E0a** bot fidelity | **done** — `reference-bot v1`, with its sensitivity floor and blind spot measured |
| E0b engine-as-parameter | done — `src/play.ts` takes the engine, never imports it for measurement |
| E0c vacuity guards | partial — asserted in E0a; the panel and size runners inherit it |
| E1 state size | not started |
| E2 metric panel | not started |
