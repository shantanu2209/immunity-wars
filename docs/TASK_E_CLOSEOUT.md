# Task E — closeout

**Status: E0a and E1 complete. E2 (the metric panel) outstanding.**
Plan: [`TASK_E_PLAN.md`](TASK_E_PLAN.md) · Method: [`tests/balance/README.md`](../tests/balance/README.md)

---

## Read this before any number below

**Every state-size figure in this document is a FLOOR, not an estimate and not a worst case.**

The reference bot dies at turn **8.6 of a legal 45-turn Hard game** — 19% of the window. New
infections keep arriving until turn 30. State size grows with invader count. So the states this
measurement sampled are systematically the **small** ones, and the late game, which is where the
state is largest, is not in the sample at all. Humans win essentially every Normal game, meaning
humans routinely reach states no instrument in this repository has ever serialised.

Two further reasons the same figures understate, both independent of the first: the projection
carries six multiplayer fields that are empty in every game a single-player harness can generate,
and the log field — 37% of all bytes — is pre-i18n English that Phase 2 will change.

**The correct reading is "a state is at least this big", never "a state is about this big".** The
tail is *bounded* three ways below and *sampled* by none of them.

---

## 1. The censoring table

Reference bot v1, 200 seeds × 3 difficulties, 57,723 states, 7,071 bursts.

| | `maxTurn` | + `GRACE_CLEAR` | longest legal game | bot mean end | **window reached** | games past `maxTurn` |
|---|---|---|---|---|---|---|
| Training | 15 | 15 | 30 | 15.6 | **51.9%** | 135 / 200 |
| Normal | 20 | 15 | 35 | 11.3 | **32.4%** | 5 / 200 |
| Hard | 30 | 15 | 45 | 8.6 | **19.2%** | 0 / 200 |

**Zero Hard games out of 200 survived even to the end of the onslaught window.** Everything else
in this document is conditional on this table.

---

## 2. The brief's number

`JSON.stringify(viewState(g)).length` on a representative mid-game state — quoted with its
percentile rank, because a single figure cannot size a protocol and this one is a median over a
censored sample:

| | median mid-game state | its rank among all sampled states |
|---|---|---|
| Training | **7,636 chars** | 59.8th percentile |
| Normal | **10,574 chars** | 66.8th percentile |
| Hard | **21,812 chars** | 84.5th percentile |

Full distribution, in KiB — `chars` is the brief's UTF-16 count, `utf8`/`gzip` are wire bytes:

| | | mean | p50 | p90 | p99 | max |
|---|---|---|---|---|---|---|
| Training | chars | 7.1 | 7.2 | 9.3 | 12.7 | 16.8 |
| | gzip | 1.8 | 1.8 | 2.2 | 2.4 | 2.8 |
| Normal | chars | 8.9 | 9.0 | 13.6 | 18.5 | 25.1 |
| | gzip | 1.9 | 2.0 | 2.4 | 2.7 | 3.1 |
| Hard | chars | 12.2 | 9.8 | 24.1 | 38.4 | 56.9 |
| | gzip | 1.9 | 2.0 | 2.6 | 2.9 | 3.4 |

---

## 3. The number the brief should have asked for

**`endCommand` does not return a state. It returns a burst of them** — `resolveSpread` has 20
`snap()` sites, each frame carrying a full `viewState`. [`FINDINGS.md`](FINDINGS.md) #31;
[`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §5 corrected.

| | frames/burst (mean · p90 · max) | burst gzip (p50 · p99 · max) |
|---|---|---|
| Training | 3.9 · 5 · 8 | 2.2 · 3.5 · 4.0 KiB |
| Normal | 5.1 · 7 · 9 | 2.7 · 4.4 · 5.2 KiB |
| Hard | 5.7 · 8 · 10 | 3.0 · **20.1** · **25.6** KiB |

**The tail lives in the burst, not in the state.** The largest single Hard state is 3.4 KiB
gzipped; the largest Hard burst is 25.6 KiB. Sizing a protocol from the single-state figure
understates the worst case by roughly 8×.

---

## 4. Churn — the number the decision actually turns on

"Is the state big" does not decide full-state versus deltas. "Is the state big relative to what
changes per action" does.

| | full utf8 | delta utf8 | **delta / full** | changed keys (of 45) |
|---|---|---|---|---|
| Training | 7.1 KiB | 3.2 KiB | **45.3%** | 4.6 (p90 7) |
| Normal | 9.0 KiB | 4.2 KiB | **46.2%** | 4.4 (p90 6) |
| Hard | 12.4 KiB | 6.0 KiB | **48.6%** | 4.6 (p90 6) |

Delta here means: resend every top-level key whose serialisation changed. It is the simplest
scheme a relay would plausibly implement, so it is a **conservative** estimate of what deltas buy.

**Roughly 4.5 of 45 fields change per action, and they carry roughly half the bytes.** The two
biggest fields are the reason: `log` (37.4%) gains an entry almost every action, and `invaders`
(35.9%) changes whenever anything moves. Together they are 73% of the projection, and a
finer-grained delta than this one would mostly be a delta over those two.

---

## 5. The tail, bounded three ways

None of these is a sample of the late game. Each is a bound, labelled as one.

**Regression.** 360 bytes per invader (intercept 5,578). Most invaders in any sampled state: 160.
Largest state sampled: 57.0 KiB utf8.

**Constructed envelope**, Hard — points on a curve, not reachability claims. Invaders forced in as
plain bacteria, the cheapest invader record, so every row understates:

| | utf8 | gzip |
|---|---|---|
| 0 invaders | 2.6 KiB | 0.9 KiB |
| 50 invaders | 20.2 KiB | 1.2 KiB |
| 100 invaders | 34.8 KiB | 1.4 KiB |
| 200 invaders | 64.1 KiB | 1.8 KiB |
| **all 97 deck cards seen, in play and immune** | **37.5 KiB** | **3.2 KiB** |

The last row is the **content-bounded ceiling** on `seen` / `memory` / `vaccine`: those are keyed
by disease, so the deck size is their structural maximum — no legal state has more keys in them.

> [`FINDINGS.md`](FINDINGS.md) #16 carried at the point of use: `forceInject*` bypasses the worm
> accounting. **Only the SIZE of these constructed states may be read out.** No worm statistic, no
> balance figure, ever.

**Structural.** Most fields are bounded by content: 7 organs, 7 cells, 7 residents, `log` capped
at 40 entries, disease-keyed maps bounded by the 97-card deck. `invaders` is the only loose axis,
which is why it gets the curve above.

---

## 6. What this says about the Phase 3 protocol

Reported as a measurement with its conditions, not as a recommendation.

**Uncompressed, the state is not small** — a Hard state reaches 57 KiB and a constructed
200-invader state 64 KiB. **Compressed, it collapses**: the same 200-invader state is 1.8 KiB
gzipped, because a JSON array of near-identical invader records is close to ideal input for a
dictionary coder. Every measured single state gzips to under 3.5 KiB.

So the decision that was waiting on this number:

- **Full-state broadcast is affordable at the sizes measured**, provided the transport compresses.
  Median 2 KiB, worst measured burst 25.6 KiB.
- **Deltas roughly halve it** and are an optimisation, not a necessity.
- **Compression is doing most of the work, so it is the load-bearing assumption**, not deltas.
  A transport without permessage-deflate changes this conclusion, not the numbers.
- **All of it is a floor.** A late-game state is bigger, by an amount the censoring table says
  nothing about.

---

## 7. What these numbers must not be used to claim

- Not "a state is N bytes". A state is **at least** N bytes, under a bot that dies early.
- Not "the relay is affordable". These are per-broadcast figures with no concurrency model, no
  message frequency, and no multiplayer fields populated.
- Not "deltas are unnecessary". They are unnecessary *at the sizes the reference bot reaches*.
- Not comparable across Phase 2. `log` is 37% of the bytes and is pre-i18n English; message keys
  plus parameters will change it.

---

## 8. Two findings the census turned up

The field-population census asks, per `viewState` key, which generator ever puts a value in it. Two
fields were empty under both the reference bot and the property suite's generator, and neither is
explained by the harness being single-player.

**[`FINDINGS.md`](FINDINGS.md) #29 — `g.free` is never granted.** The engine's own comment calls it
"free actions granted by the Helper T-Cell". There are three writes to it: initialise to `{}`,
reset to `{}`, and *decrement* — no grant. `hasFree()` is permanently false and `spend()`'s free
branch is dead. Empty in all 57,723 sampled states. Same shape as #4: designed immunology the code
models and the game never demonstrates. **Design conversation for Kartik.**

**[`FINDINGS.md`](FINDINGS.md) #30 — the coverage gate files that arm under Phase 3 multiplayer.**
It is not multiplayer, and Phase 3 cannot cover it: no relay makes the Helper grant a free action.
The cause is a whole-file blanket rule (`a.short === 'ap.ts'`) justified by a comment that says
`ap.ts` "is the per-player AP budget and nothing else", which is false. This is #24 recurring, and
C1's audit could not have caught it because both the old and new rules contained the clause — **a
diff cannot see a defect both sides share.** Report only; changing a measuring instrument is a
deliberate act, not a side effect of Task E.

(The other empty field, `antibodies`, is already recorded in #11.)

---

## 9. How to reproduce

```bash
npx tsx tests/balance/fidelity.ts 1000     # E0a — bot fidelity, 3000 games
npx tsx tests/balance/size-run.ts 200 60   # E1 — this report, ~30s
pnpm test                                  # both suites' fast tiers and every negative control
```

Seeds are deterministic (`seedAt(i) = 0x51de + i * 7919`), so every figure here is reproducible
exactly.

---

## 10. Outstanding

**E2 — the four-metric panel** (`avgTurnsSurvived`, `trunkKillPct`, `avgAntibodiesMade`,
`avgOrgansDamaged`), its ±3 sd bands measured twice on disjoint seed ranges, and its two negative
controls: a mutation that must move it, and brain `branch:3 → 4`, which
[`FINDINGS.md`](FINDINGS.md) #17 says it cannot see and which will be pinned executably as a
demonstrated blind spot.

**Not Task E's:** wiring any of it into CI, which is Task F.
