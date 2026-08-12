# Task E — Measurements plan

**Version:** 1.0 · 12 August 2026
**Scope:** the two numbers [`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §5 Task E says unblock deferred decisions
**Status:** Approved by Shantanu, 12 Aug 2026. Decisions in §7.

---

## 0. The contract

**Measurement only. No engine behaviour changes.** Not one line of `packages/engine/` changes
meaning during Task E. Everything is measured from outside, through the same `engine` parameter
[`tests/property/src/runner.ts`](../tests/property/src/runner.ts) already uses.

Two numbers:

1. **Serialised state size** — decides whether a Phase 3 relay broadcasts full state or deltas,
   and therefore drives the hosting choice.
2. **A continuous metric panel** — detects **engine change**, not difficulty. Explicitly *not*
   win rate: [`FINDINGS.md`](FINDINGS.md) §1 shows a rate pinned at 0.0% cannot fall and so cannot
   fail usefully.

**Standing constraint, above all others in this task.** These are the first numbers from this
project that will be quoted outside the repository — grant applications, judges, the portfolio
site. The smaller true claim is the one that gets published. Every figure travels with the
conditions that produced it, enforced by the report's own shape (§4), not by a caveat somebody
remembers to attach.

---

## 1. Three findings from planning that changed the task

Recorded here because two of them mean the brief specified the wrong thing, and the third is the
honest core of measurement 1.

### 1.1 `endCommand` returns a BURST of states, not one

`resolveSpread` builds a `Frame[]` with **20 `snap()` sites**, each frame carrying a full
`viewState(g)` — [`spread.ts:220`](../packages/engine/src/spread.ts), returned at
[`actions.ts:170`](../packages/engine/src/actions.ts).

The brief asks for `JSON.stringify(viewState(g)).length`. **That is one frame.** The realistic
per-turn wire payload is `frames.length × stateSize`, and the frames exist precisely so a UI can
animate the spread step by step — so they are not obviously droppable.

**`frames.length × stateSize` is the number the full-state-vs-deltas decision actually turns on.**
Both are reported. `PHASE1_BRIEF.md` §5 is corrected to say so.

### 1.2 The reference bot dies before the state gets big — everything reported is a FLOOR

| Difficulty | `maxTurn` | + `GRACE_CLEAR` | Longest legal game | Bot's average end | **Window reached** |
|---|---|---|---|---|---|
| Training | 15 | 15 | 30 | 15.7 | **52%** |
| Normal | 20 | 15 | 35 | 11.0 | **31%** |
| Hard | 30 | 15 | 45 | 8.8 | **20%** |

New infections keep arriving until `maxTurn`. On Hard the bot is dead at turn 8.8 of a 30-turn
onslaught window, already leaving 52.9 invaders behind ([`FINDINGS.md`](FINDINGS.md) § Task E
metrics). State size grows with invader count. **So the corpus contains almost no mid-or-late-game
states, and the late game is exactly where the state is largest.**

Humans win essentially every Normal game, which means humans routinely reach turn 20+ and clear
the board — states no instrument in this repository has ever serialised.

**Consequence, and it is not a caveat:** every size figure Task E reports is a **lower bound on
what a human session broadcasts.** The censoring table above leads the closeout's first paragraph.
The tail is *bounded* three ways (§2.3) and *sampled* by none of them.

### 1.3 The projection ships six multiplayer fields that are empty in every game we can generate

`viewState` includes `players: []`, `apBudget: {}`, `owner: {}`, `apPool: 0`, `captain`,
`multiplayer` ([`view.ts:96`](../packages/engine/src/view.ts)). Single-player games populate none
of them. The measurement exists to size a **multiplayer** broadcast. Second reason the number is a
floor, and an independent one.

---

## 2. Measurement 1 — serialised state size

### 2.1 Method

Measure **every** state; never pick one. Sampled after every applied action and at every spread
frame, across 200 seeds × 3 difficulties dense, and at turn boundaries across 2,000 × 3.

| Reported | Why it is there |
|---|---|
| `JSON.stringify(viewState(g)).length` | the brief's number, delivered exactly as specified |
| UTF-8 bytes; gzip bytes | the hosting decision is about **wire bytes**. JSON with repeated keys compresses hard; if compressed full state is small, the delta question is answered *no*, cheaply |
| **frame-burst bytes per `endCommand`** | §1.1 — the real broadcast unit |
| p50 / p90 / p99 / max per difficulty | a mean cannot size a protocol |
| size vs turn; size vs invader count (slope = marginal cost per invader) | lets the unsampled tail be bounded rather than guessed |
| per-field decomposition | tells Phase 3 *what* to delta. `invaders`, `log` (40 English strings, pre-i18n), `cells`, `organs` |
| **churn** — bytes changed between consecutive states, against full size | approved as an addition, §7.2. "Is the state big" does not decide full-vs-delta; "is the state big relative to what changes per action" does |

### 2.2 Representativeness, operationally

The brief's "representative mid-game state" is defined as **the median-size state among sampled
states in the mid-game window**, and is quoted **only with its percentile rank**. Never as *the*
number.

Published alongside it, prominently: the **censoring table** of §1.2 — what fraction of each
difficulty's legal turn window the corpus reaches. That table is the honest statement of what was
not sampled, and it is the part a reader outside this repository most needs.

### 2.3 The tail — bounded three ways, sampled by none

1. **Regression** — marginal bytes per invader × the largest invader count observed anywhere.
2. **Structural ceiling** — most fields are bounded by content: 7 organs, 7 cells, `log` capped at
   40, `memory` / `seen` / `made` keyed by disease. `invaders` is the only loose one; bound it from
   spawn arithmetic across `maxTurn`.
3. **A constructed state** via `forceInject*` — the director's tool, measurement-only.
   **Carried at the point of use:** [`FINDINGS.md`](FINDINGS.md) #16 — forced worms bypass
   `noteWorm`, so *nothing but the size* of such a state may be read out. No worm statistic, no
   balance figure, ever, from a forced state.

Each is labelled a **bound**, not a sample, everywhere it appears.

---

## 3. Measurement 2 — the four-metric panel

Reference bot, **injection off**, 20 batches × 100 games × 3 difficulties = 6,000 games. Matches
the earlier measurement in [`FINDINGS.md`](FINDINGS.md) § Task E metrics so the two are comparable.
Seeds deterministic and recorded.

`avgTurnsSurvived` · `trunkKillPct` · `avgAntibodiesMade` · `avgOrgansDamaged` — mean, cross-batch
sd, sd/mean, ±3 sd band. **Two or more must breach together**; one metric drifting is noise.

**Definitions are written down before measuring**, because a redefinition silently invalidates a
band: per-game means for three, batch-pooled for `trunkKillPct` (the way `simulate()` pools it).

Two things expected and predicted here rather than discovered later:

- **`avgTurnsSurvived` is censored at the top.** A win is only possible after `maxTurn`, so on
  Training (54% wins) the metric is bimodal and its tight sd is partly structural rather than
  earned. It stays in the panel; the closeout says why the band is tight.
- **Bands are measured twice**, on disjoint seed ranges, and must overlap. A band measured once is
  a band never falsified.

### 3.1 Negative controls — the gate must be seen to fail

Per the standing rule. `loadMutatedLegacy` patches legacy's source by exact string replacement and
throws unless the mutation matches exactly once, so an inert mutation cannot masquerade as a pass.
Both arms run legacy, mutated against unmutated, so port-vs-legacy differences cannot leak in.

| Control | Must |
|---|---|
| A mutation that *should* move the panel (candidate: `DIFF.ap − 1`) | breach ≥2 metrics at ±3 sd |
| **Brain `branch:3 → 4`** | **NOT breach** — [`FINDINGS.md`](FINDINGS.md) #17's blind spot, pinned executably |

The second is the point:

> **A gate shipping with a demonstrated blind spot is more trustworthy than one shipping with only
> a green light.**

That sentence goes in `tests/balance/README.md` as a stated principle, not as the footnote to one
test. It generalises past this gate.

Bands land in `tests/balance/bands.json` stamped with provenance — generator version, engine rev,
pack version, seed range, N. **Wiring the gate into CI is Task F**
([`TASK_D_CLOSEOUT.md`](TASK_D_CLOSEOUT.md) §7). E measures; F gates.

---

## 4. The reporting constraint, mechanised

Not a convention. A shape, plus a test, plus a control that makes the test fire.

- **No bare number leaves the harness.** Every metric is a record carrying
  `{ generator, generatorVersion, difficulty, gamesPerDifficulty, engineRev, packVersion, value, sd, n }`.
  The only renderer emits the qualifier inline:
  `avgTurnsSurvived = 11.05 ±0.40 — reference bot v1, 100 games/difficulty, Normal`.
- **Win rate exists only under the key `winRateUnderReferenceBot`**, so a value pasted into a slide
  drags its qualifier along in the field name. Reported; never gated.
- **A test asserts every rendered line carries the qualifier**, with a negative control that strips
  the label and watches the test fire.
- [`TASK_E_CLOSEOUT.md`](TASK_E_CLOSEOUT.md) opens with **"What these numbers do not say"**, written
  before the numbers, and its first paragraph states the floor (§1.2). Contents: not difficulty
  (#1); not human play (~100% vs ~0% on Normal); a green panel is *"no broad shift detected"*, never
  *"the change was safe"* (#17's required wording); the panel's demonstrated blind spot; and for
  size — single-player, multiplayer fields empty, pre-i18n English log, one broadcast with no
  concurrency or frequency model behind it.

---

## 5. Instrument checks, before any number is reported

| id | Check | Why it exists |
|---|---|---|
| **E0a** | **Bot fidelity, measured not assumed** | The harness drives play with `equivalence/bot`, not `simulate()` — `simulate()` returns 7 aggregates and exposes no per-game `made` / `organs` / `turn`, and extending it is an engine change that would break the B6 equivalence check. But the two bots are only *believed* identical; they differ textually at the NET check (`E.netTargets` vs `invadersWithNeutrophil`). Run both over the same seeds; compare per-game `won` / `lost.turn` / `lost.organ` / `stats`. **Identical → `reference-bot v1`, and FINDINGS' existing table stays comparable. Any divergence → report it, label the generator `v1.1`, drop the comparability claim.** Asserting it unmeasured would be the tenth documented-but-unverified claim in this project |
| **E0b** | `viewState` comes from the **engine under measurement**, never a module-level import | [`FINDINGS.md`](FINDINGS.md) #28 exactly: a mutated engine measured with the correct projection makes the panel's control silently unable to fire |
| **E0c** | Vacuity guard | Copying `full-run.ts`: exit non-zero if any metric has 0 samples, or any batch produced 0 finished games. A green run whose counts contain a zero is not a pass |
| **E0d** | Both instruments have controls that fire | §3.1 for the panel; for size, a mutation that must move the measured bytes, proving the harness reads the live projection |

---

## 6. Which generator, for which measurement

The "23 of 27 actions vs 19" comparison is the wrong unit for state size. What matters there is
**fields populated**, not actions emitted.

| Measurement | Generator | Reasoning |
|---|---|---|
| **Balance panel** | Reference bot **only**, injection off | `injectExtra` fires a random action every 7 steps. It is not play, it inflates variance without adding signal, and the panel's whole value is a tight reproducible band. Using it would make the gate *less* able to fail. Variance under both is reported, so this is a measured claim and not an opinion |
| **State size** | **Both** | Bot = the distribution of real play. Property generator = the **envelope**: it is the only thing that reaches `resmove`, `net`, `antivenom`, `orderAntivenom`, `hop`, `recall`, `undo`, so the only thing that populates the corresponding parts of the projection |

**Field-population census.** Per `viewState` key: ever non-empty under the bot? under the property
generator? under neither? This converts "better coverage" from a slogan into a measurement, and
names the parts of the state **neither** instrument can size — which is the part worth knowing.

---

## 7. Decisions taken

1. **Harness lives in `tests/balance/`**, consistent with `tests/property` and
   `tests/equivalence`; `pnpm test:balance` is already a root script pointing at a stub.
   `tools/balance-sim/` stays empty, and **`PHASE1_BRIEF.md` §2's "existing simulation harness,
   promoted to a test" is corrected** — there is no such harness
   ([`FINDINGS.md`](FINDINGS.md) #6), and leaving the sentence standing would make it the tenth
   documented-but-false claim in this project.
2. **Churn approved** (§2.1). It passes the purpose test: thirty lines that let a Phase 3
   architecture decision be made on data.
3. **`PHASE1_BRIEF.md` §5 corrected** for the frame burst (§1.1).
4. **README principle** (§3.1) — the demonstrated-blind-spot sentence is stated as a principle.
5. **Censoring table is prominent** (§1.2), leading the closeout, not a footnote.

---

## 8. Deliverables

- `tests/balance/` — harness, metrics, size instrument, controls, `README.md` (with its
  instrument blind-spot row, as the other two suites have, and the §3.1 principle)
- `tests/balance/bands.json` — bands with provenance
- `pnpm test:balance` wired, replacing `scripts/not-implemented.mjs`
- [`TASK_E_CLOSEOUT.md`](TASK_E_CLOSEOUT.md)
- `FINDINGS.md` #29+
- `PHASE1_BRIEF.md` §2 and §5 corrections
