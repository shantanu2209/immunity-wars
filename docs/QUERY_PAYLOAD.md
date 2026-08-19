# P2.1 — what precomputing the 22 UI queries would actually cost

**Measured 18 August 2026**, to settle the one question holding P2.1:
[`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v1.1 §3, review item **C**.

```bash
pnpm measure:query-payload
```

Reference bot v1 · 120 seeds × 3 difficulties · **25,497 command-phase states** · 22 queries each.
Every figure below is utf8 bytes unless it says gzip. Re-running reproduces them; the numbers are
stamped because a figure without its scale and its generator is not a measurement.

**This document reports. The decision is Shantanu's and is not made here.**

---

## 0. Why this was measured at all

The brief recorded a lean — *Session exposes the queries, because precomputing 22 results into
every view inflates the payload Task E measured for Phase 3* — and recorded it **as a lean, not a
ruling**. The classification report (`pnpm seam:homes`) said in its own output that it could not
support that lean: reference counts are not a proxy for size, because a name read 40 times may
answer in a boolean.

So the lean was measured instead of acted on. **It is broadly right, and it is right for a reason
nobody had identified — one that changes the answer from all-or-nothing into a two-line fix.**

---

## 1. The headline

| | viewState p50 | block p50 | ratio p50 | ratio p90 | ratio p99 |
|---|---|---|---|---|---|
| training | 7,364 | 6,927 | **94.4%** | 156.4% | — |
| normal | 9,261 | 7,227 | **79.9%** | 170.5% | — |
| hard | 10,013 | 7,396 | **74.8%** | 185.7% | — |
| **all** | **7,785** | **7,115** | **89.2%** | **167.9%** | **223.2%** |

Precomputing all 22 answers into every view **roughly doubles the payload at p90** and can more
than triple it at the tail. Under gzip the picture is friendlier — 40.8% at p50 — because
precomputed answers are highly repetitive; both are reported and neither is the whole story.

The block is **parallel-array encoded**, which is the *smallest plausible* precompute: answers sit
in the order the view already lists invaders, cells, organs and families, with no keys. A realistic
id-keyed encoding adds a further ~527B at p50. The favourable encoding was chosen deliberately, so
that a result against precomputation could not be an artefact of how it was encoded.

---

## 2. The finding that matters — two queries are 88% of it

| query | p50 bytes | share of block |
|---|---|---|
| `moveDestinations` | 4,408 | **61.0%** |
| `productionBreakdown` | 2,003 | **26.8%** |
| the other 20, combined | ~530 | **7.5%** |
| JSON envelope (22 key names, braces) | ~335 | 4.7% |

**Everything else is noise.** `rateFor` is one byte. `netTargets`, `nkTargets` and `snipeTargets`
are two. Fourteen of the 22 cost under 30 bytes at p50.

### Why those two, and it is not an accident

**A precomputing view does not know which cell the player has selected.** The legacy UI computes
`moveDestinations` for the *one* selected cell, on demand. A view that precomputes must carry it
for **all seven** — six of which no player will look at before the next action invalidates them.

`productionBreakdown` is the same shape across the seven antibody families.

That is what precomputation *means*, and it is where the cost concentrates: not in queries that are
expensive to answer, but in queries that are expensive **to answer for every possible subject at
once**.

---

## 3. The expose-N frontier

> If the N most expensive queries went behind a `Session` method instead, what would precomputing
> the rest cost?

| N | exposed via Session | residual block p50 | as % of viewState |
|---|---|---|---|
| 0 | (none — precompute all 22) | 7,115B | **91.4%** |
| 1 | `moveDestinations` | 2,715B | 34.9% |
| **2** | **`moveDestinations`, `productionBreakdown`** | **683B** | **8.8%** |
| 3 | + `antivenomTargets` | 625B | 8.0% |
| 5 | + `famOf`, `canNeutralise` | 553B | 7.1% |

**The curve collapses at N = 2 and is flat afterwards.** Exposing a third query buys 0.8 percentage
points; exposing five buys 1.7. The question asked was whether the answer might be "expose three,
precompute nineteen". The measurement says **expose two, precompute twenty**, and that going past
two is not worth a line of code.

---

## 4. Three of the 22 need neither Session nor the view

Found while establishing the argument shapes, and it is a separate result from the sizes.

| query | what it actually reads |
|---|---|
| `branchLen(o)` | `ORGANS[o].branch` — **content only** |
| `famOf(iv)` | `FAMILY`, `NOVEL_ANTIGENS` — **content only**, plus fields of an invader the view already carries |
| `attackable(iv)` | one engine knob (`hubSafe`) plus `iv.zone` |

`branchLen` and `famOf` are pure functions of the content pack, which `ui` may already import —
that permission is now enforced and controlled. They need a two-line helper, not a seam.
`attackable` needs one boolean of engine configuration to travel with the view.

---

## 5. Which way the censoring cuts — the guess was backwards

Recorded because it was written down wrong first, and the measurement corrected it.

The instrument was built expecting the measured ratio to be a **floor**: the reference bot dies at
turn 8.9 on Hard (19.7% of the legal window), 6 of the 22 queries answer per invader, so the
sampled states should be the cheap ones. Fitted against invader count:

```
viewState          359.3 bytes per invader
precompute block    36.4 bytes per invader     — 0.10x as fast
```

A per-invader **answer** is a boolean; a per-invader **record** in the view is a full object. The
view grows an order of magnitude faster, so **the ratio falls as the board fills** and the bot's
small early states *overstate* it. The measured ratio is a **ceiling**, not a floor.

What survives the correction is the **absolute** figure — the block is roughly flat in invader
count, because the two queries that dominate it are per-cell and per-family. ~7KB of precomputed
answers per view, on every action, regardless of how the game is going.

---

## 6. THE RULING, and the second measurement it required

**Ruled 19 August 2026: selection-scoped.** None of the three options this report was written
against. The view becomes a function of **(game state, selection)**; `moveDestinations` is carried
for the selected cell and the full `productionBreakdown` for the selected family. **No query is
exposed**, so the boundary rule stays absolute and Phase 3 inherits no exception.

Two conditions were attached, and both were measured **before** anything was built —
`pnpm measure:selection-cost`, 30 seeds × 3 difficulties.

### Condition 1 — the compute trade. MET.

Selection changes are frequent and local; if every one rebuilt the whole view, payload would have
been traded for compute. A selection change is a tap, so §4 of the brief governs it.

| | p50 | p90 | p99 | max |
|---|---|---|---|---|
| `viewState(g)` full rebuild | 33.5µs | 66.2µs | 136.2µs | 215.2µs |
| `moveDestinations`, 1 cell | 2.8µs | 3.3µs | 8.0µs | 10.0µs |
| `moveDestinations`, all 7 | 22.8µs | 28.8µs | 38.0µs | 56.7µs |
| **selection-scoped rebuild, total** | **0.054ms** | 0.094ms | **0.181ms** | 0.282ms |

**1.1% of the 16ms redraw budget at p99; ~7% at the 6× throttling §4 screens with.** Measured in
Node on a development PC — *not* a handset, and the **data half only**: no React, no layout, no
paint, none of which exist yet. The budget this is checked against is the redraw budget *minus*
whatever rendering costs.

The fallback to expose-two was therefore not taken.

### Condition 2 — `productionBreakdown`. Mixed, and stated rather than arrived at.

**The scoping applies, but to FIELDS rather than to subjects.** Read from `v2_ui.html`:

- Two call sites (717, 1900) map over **all** families and read `net`, `boosted`, `reduced` — the
  always-on antibody panel. Needed for every family at once.
- The other six fields are read by exactly one function, `prodBreakdownHTML` (1923), which renders
  a **tooltip**. One family at a time.

| | p50 |
|---|---|
| `{net, boosted, reduced}` × 7 families | **293B** |
| full breakdown × 7 families | 2,003B |
| the summary as a share | **14.6%** |

So the summary is precomputed for all seven families and the detail is selection-scoped. **It does
not need exposing.** Same insight as the ruling, one level down: expensive is answering *in full*
for every possible subject at once.

### Payload, all three options

| option | p50 | % of `viewState` p50 |
|---|---|---|
| precompute everything | 7,051B | 90.6% |
| **selection-scoped — the ruling** | **1,653B** | **21.2%** |
| expose-two | 638B | 8.2% |

Selection-scoped is **not the cheapest** and was not chosen for being cheapest. It buys something
neither number shows: no query crosses the boundary, so there is no exception to argue about when
Phase 3 puts a relay in the gap.

---

## 7. What this does not settle

- **The compute cost.** Precomputing 22 answers on every action is a §4 per-redraw budget question,
  not a payload one. Nothing here times anything.
- **Option A's cost in Phase 3.** Each exposed query is either a round trip or answered client-side
  from a view that does not carry the deck. That is a Phase 3 measurement against a relay that does
  not exist.
- **Whether the UI truly needs `moveDestinations` for all seven cells.** It needs it for the
  selected one. A view carrying only the selected cell's destinations is a fourth option this
  report did not model, and it is arguably the interesting one.

---

*Instrument: `tests/balance/src/query-payload.ts`, report `tests/balance/query-payload-run.ts`.
Reuses Task E1's `sizeOf`, `distribution`, `fitLine` and `censoring`, and Task E's game driver, so
this is E1's instrument pointed at a different payload rather than a second harness to trust. The
22 names come from `@immunity-wars/equivalence/query-shapes`, and `pnpm seam:homes` fails if that
list stops matching the set it derives from the board script.*
