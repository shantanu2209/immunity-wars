# Task B — Engine port plan

**Version:** 1.0 · 4 August 2026
**Scope:** `tools/legacy/v2_engine.js` → `packages/engine/`, TypeScript `strict: true`
**Spec:** [`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §5 Task B
**Status:** Approved by Shantanu, 4 Aug 2026. Rulings in §8.

---

## 0. The contract

Port the rules engine to TypeScript **preserving behaviour exactly, including its bugs.**

A bug-for-bug port is not pedantry — it is what makes the equivalence proof mean anything.
The moment the port "improves" something, a state diff against legacy stops being evidence
of correctness and becomes a list of things to argue about.

Three registers keep this honest:

| Register | Holds |
|---|---|
| This file | How the port is done and proven |
| [`FINDINGS.md`](FINDINGS.md) | Legacy defects found, **preserved**, and what happens to them later |
| [`DEVIATIONS.md`](DEVIATIONS.md) | Every deliberate departure from byte-identical, with a test |

If a behaviour differs from legacy and is not in `DEVIATIONS.md`, it is a port bug.

**Constraints (standing):** Brain stays at `branch:3`. No behaviour changes. `tools/legacy/`
is read-only. Bugs get reported, never fixed in place.

---

## 1. Proving equivalence, not asserting it

### 1.1 The mechanism: seed the global `Math.random`

The engine calls `Math.random()` directly in `shuffle`, `d6`, `rollOrgan`, the reinfection
draw, the cytokine-storm organ pick, and three places in `newGame`. There is no injection
point, and adding one would change the API surface — so the harness swaps
`globalThis.Math.random` for a seeded mulberry32 and runs **both** engines from the same
seed.

Verified against legacy before anything was built on it:

```
same seed identical : true | rng draws: 173 173
diff seed differs   : true
```

Byte-identical `viewState` across two runs of a 12-turn game. The legacy engine is fully
reproducible under a seeded global.

**The port keeps calling `Math.random()` too.** No seeded-RNG parameter, no injected
generator. The harness owns the global; the engine stays as it is.

### 1.2 Why this is stronger than diffing states

Seeding forces the port to consume randomness in the **same order and the same count**.
That catches a whole class of "right answer, wrong dice" errors a state diff would miss for
many turns.

The sharpest example is in `newGame` itself. The state object literal evaluates

```js
rare: { armed: Math.random()<0.5, ... },   // :611  ← draws first
...
deck: shuffle(DECK_MASTER.filter(...)),     // :614  ← draws second
```

**Property evaluation order is load-bearing.** Reorder those two fields in the port and every
subsequent die roll shifts. A structural comparison would let it slide until the divergence
happened to change something visible; a draw-count comparison catches it on action one.

**This was confirmed at B3, on the real port.** The mistake is not hypothetical — declaring
`deck` before `rare` is how anyone would naturally write it. Injecting exactly that reorder
failed all four `newGame` tests immediately, on the draw count.

Had the rig compared state alone, that state would have looked **perfectly correct at turn 1**
— same organs, same cells, same everything — and the port would have carried a silently
desynchronised RNG stream into B5, surfacing as an unexplained mid-game divergence hundreds of
actions deep. The draw-count comparison converted an expensive B5 bug into an immediate B3 test
failure with an exact cause.

Cost of the mechanism: one integer per action. It has now paid for itself once.

### 1.3 What "identical" means — three levels, every action

| Level | Check | Catches |
|---|---|---|
| 1 | `JSON.stringify(fullGameState)` hash identical — including `log` HTML, `undo` stack, `stats` | Any state divergence |
| 2 | RNG draw count identical | Wrong dice, wrong evaluation order — and localises to one action |
| 3 | `applyAction` return value identical — `{ok}`, exact `error` string, or `{ok:true,frames:[…]}` | Wrong rejection reason; wrong animation frames |

Level 1 requires the port to build state objects **in the same property order** as legacy.
That is free to honour, and it also protects Task E's
`JSON.stringify(viewState(g)).length` measurement from being an artefact of transcription
rather than a fact about the game.

A NaN-aware structural comparator runs alongside the hash, because `JSON.stringify` renders
`NaN` as `null` and would otherwise mask [`FINDINGS.md`](FINDINGS.md) #3.

**Hashes, not snapshots.** Full state stringifies to ~37.8 KB per action — the `undo` stack
dominates, since `pushUndo` clones invaders, cells, residents, organs and log on every
undoable action and keeps up to 60. Retaining snapshots costs ~1 GB per 300 games. The rig
hashes during the run (FNV-1a, 16 hex chars) and **re-runs to materialise full state only at
a divergence**, which is exactly what the shrinker needs anyway (§5).

### 1.4 The four sequence generators

**(a) Recorded bot games.** A harness-side bot mirroring `simulate()`'s decision logic drives
**legacy only**, and its action log is recorded. That log is then replayed into the port.

The recording step is not incidental. If the bot ran live against both engines, a divergence
would change its subsequent decisions and the comparison would become apples-to-oranges.
Recording freezes the sequence into an oracle.

The bot needs four internals legacy does not export (`samePlace`, `placeDist`, `apNow`,
`canAct`); the harness reimplements them. This is safe because **the bot is a sequence
generator, not a behaviour oracle** — its fidelity to `simulate()`'s bot matters only at B6,
where both engines run their own internal bot. See [`FINDINGS.md`](FINDINGS.md) #12.

**(b) Action-space fuzzing.** At each step, enumerate every legal action from the engine's own
query functions, add a slice of deliberately illegal ones, and pick with the seeded PRNG.

This is not redundant with (a), and the capability audit in [`FINDINGS.md`](FINDINGS.md) §1.1
quantifies exactly how much it is carrying. Measured over 600 recorded bot games, the bot
**never emits 8 of the engine's 27 actions**:

> `net` · `resengulf` · `resmove` · `antivenom` · `orderAntivenom` · `hop` · `recall` · `undo`

Every one of those code paths would be **completely unexercised** by generator (a) alone.
Two of them are unreachable for structural reasons rather than heuristic ones — the Neutrophil
never leaves the hub, and a resident at step 0 can never have an eligible target — so no
amount of extra bot games would ever reach them. The fuzzer is not a nice-to-have; without it
roughly a third of `applyAction` has no coverage at all.

**(c) Scripted scenarios (~60).** Enumerated from the branch list in the source, not invented:
kala-azar entering a resident macrophage · malaria liver embed → burst · filariasis lymph
block · HIV disabling the helper · measles immune amnesia · Pathogen X + clonal selection ·
dengue ADE · all 7 rare events (forced via `fireRare`) · all 9 crisis events (via
`applyEvent`) · worm-cap exhaustion including the all-worm-deck case · `SPACE_CAP`
saturation · hard-mode lymphatic spread · attrition loss at `maxTurn + GRACE_CLEAR` ·
organ convalescence and hard-mode compensation · neutrophil and eosinophil regeneration.

Three of these are **not** equivalence checks but reachability questions the aggregate metrics
cannot answer. They are scripted here because B5 is the first point at which deep game states
become reachable, and because each one is a standing safety property somebody currently
believes holds:

| Scenario | Question | Why it needs a scenario |
|---|---|---|
| **Two worms lodged at the Brain, Hard, `branch:3`** | Does a reachable line of play exist? | This is the dead end the brain lane was shortened to remove. A ~2% scenario that always loses is invisible to every metric in the panel — see [`FINDINGS.md`](FINDINGS.md) #2. Measured cost is 8 AP per worm at `branch:3` against a 4 AP/turn budget, so the answer is not obvious either way |
| **A worm on a route under hard-mode lymphatic spread** | Can a worm ever be cloned? | "Worms do not multiply" holds today because `makeInvader` always places them at `zone:"branch"`, **not** because the spread path type-checks them. It is the one duplication path guarded by placement rather than by intent — [`FINDINGS.md`](FINDINGS.md) #14 |
| **A resident macrophage left on step 0 for a whole game** | Can its free engulf ever fire? | Measured 0/37,828 organ-turns. Pinning it as a scenario means any future change that makes residents useful shows up as a deliberate decision — [`FINDINGS.md`](FINDINGS.md) #5 |

Note what the first two have in common: **the two-worms case is a reachability question, so a
"passes" result means the scenario could not be constructed, not that the game is safe.** The
scenario must report which it was.

**(d) Round-trip.** After every action: `undo`-then-replay, and
`JSON.parse(JSON.stringify(g))`-then-continue. Both engines must agree. This is also what
covers the `undo` stack independently of the per-action hash.

### 1.5 How many — a coverage gate, not a round number

**10,000 games proves nothing if they all walk the same path.** The gate is:

> **≥95% line and branch coverage of `packages/engine/` from the equivalence corpus alone**,
> with every uncovered branch either given a scripted scenario or listed in the checkpoint
> report as unreachable, with a reason.

The game counts below are what it is estimated to take to reach that, not the target itself:

| Generator | Games | Actions (est.) |
|---|---|---|
| Recorded bot games | 2,000 seeds × 3 difficulties = 6,000 | ~572,000 |
| Action-space fuzz | 20,000 | ~1,260,000 |
| Scripted scenarios | ~60 | asserted action-by-action |

### 1.6 Negative control — before any of it counts

A comparison harness that has never been seen to fail is not evidence. The rig must
demonstrate both directions:

1. **legacy vs legacy → identical.** **0 failures across 2,700 games / ~240,000 actions**,
   three difficulties.
2. **legacy vs mutated-legacy → diverges, at the right level, shrunk to a minimal case.**
   Four mutations, one per comparison level plus `brain branch:3 → 4`, each asserted to match
   its find-string exactly once so a stale mutation fails loudly instead of testing nothing.

**Both directions met — B0 complete, 4 Aug 2026.** Two of the first-run failures were the rig
working correctly against wrong expectations of mine, and both produced permanent improvements:
the level precedence was reordered to rng → state → result (see `rig.ts`), and the
stale-mutation guard caught an incorrect find-string.

---

## 2. The 14 legacy suites as an independent oracle

**6 usable, 3 partly, 5 not.** They are regression tests for specific past bugs — roughly
60–70 engine-facing assertions in total — not a behaviour-preservation oracle. Their value is
as a cross-check that the corpus did not lock in a *known-wrong* behaviour.

They are green against legacy today, which is the baseline the port must match:

```
batch3_test            12 passed, 0 failed.
feedback_0723_test     41 passed, 0 failed.
feedback_0726_test     23 passed, 0 failed.
feedback_0727_test     31 passed, 0 failed.
```

| Suite | Verdict | Notes |
|---|---|---|
| `batch3_test.js` | **Port whole** | 100% engine API — storage caps, snipe reach, memory sources, production breakdown |
| `feedback_0723_test.js` | **Port engine slice** | Richest oracle in the set: strike vs degranulate organ damage, `netTargets`, malaria staging, worm tropism, helper priming, Pathogen X never hides. ~15 assertions regex `v2_ui.html` / `art_data.js` — those stay pointed at legacy until Task C |
| `feedback_0726_test.js` | **Port engine slice** | Th2 eosinophil +1 step, Th17 regen 4→2, neutropenia gating, surge +2 AP, toxin costs 2 AP. Same UI split |
| `feedback_0727_test.js` | **Port engine slice** | Worm caps, burst typing (EUK→parasite), toxin emission, `respectWormCap`. Same UI split |
| `alloc_test.js` | **Port engine slice** | The `beginCommand`→allocation→`allocateAP` state machine is real engine; the jsdom half is `client_render.js` |
| `spec_render_test.js`, `mobile_render_test.js` | **Derive the `viewState` contract** | Keep running against legacy to pin the shape; assert the port's `viewState` is byte-identical on the same crafted states. Do not port the jsdom half |
| `e2e_server_test.js`, `force_e2e_test.js`, `capture_test.js` | **Transcribe assertions only** | They `spawn("node","server.js")` and open WebSockets. No new server until Phase 3, and legacy `server.js` cannot be repointed at the TS engine. Their engine-facing claims restate cheaply: forced Tapeworm lands at `zone:"branch"`, unknown force kind rejected, `draw` rejected outside the infection phase |
| `mode_test.js` | **Unusable** | Pure `client_render.js` DOM; never imports the engine |
| `mbtarget_test.js` | **Unusable** | Pure `client_mobile.js` DOM; the engine is *stubbed* (`w.targetable` is a fake predicate) |
| `spec_force_test.js` | **Unusable** | Pure DOM; even `EVENTS` and `RARE` are hand-faked, not the real tables |
| `spec_test.js` | **Unusable and broken** | Path no longer resolves; would assert against a `branch:4` build. [`FINDINGS.md`](FINDINGS.md) #9 |
| `parity_check.js` | **Retire** | Compares two built HTML artefacts. Brief §7 already retires it |

### A typing constraint these suites impose

`spec_render_test.js`, `mobile_render_test.js` and `alloc_test.js` all assign hand-written
**partial** invaders:

```js
{id:1, zone:"branch", organ:"lungs", step:1, type:"bacteria", disease:"Tuberculosis"}
```

No `tagged`, no `hp`, no `age`, no `embed`. The server's capture tool does the same. So
**`Invader` fields those omit cannot be required at runtime** in the port. Discovered now
rather than at B4, where it would have forced a retype of the state model.

---

## 3. Port order and checkpoints

### 3.1 The reframe: 22 of the 67 exports are data, not code

`ORGANS` · `ORGAN_SETS` · `ROUTES` · `TROPISM` · `DECK_MASTER` · `FAMILY` · `FAMILIES` ·
`FAM_KEYS` · `DIFF` · `EVENTS` · `RARE` · `INV_HP` · `INV_SPEED` · `FAST_DISEASE` ·
`NOT_ALIVE` · `TOXIN_MAKERS` · `RESIDENT_NAME` · `CELL_KEYS` · `FLAGS` · `VACCINE_COST` ·
`CLONE_COST` · `ANTIVENOM_ORDER`

These are Task C's content packs. For Task B they port as **typed literal modules inside
`engine`**, same values and same key order. Task C then lifts them out behind a Zod loader
and re-runs the corpus to prove the move was value-preserving.

Two wins: Task B is **45 functions**, not 67 items; and Task C inherits a clean cut line
instead of having to invent one.

### 3.2 The stages

| # | Stage | Contents | Checkpoint — independently verifiable |
|---|---|---|---|
| **B0** | Harness | Equivalence rig, seeded RNG, hashing comparator, shrinker, corpus seeds | Rig reports identical for legacy-vs-legacy **and** catches an injected one-line mutation with a minimal repro |
| **B1** | Data + primitives | 22 tables; `shuffle`, `clone`, `uid`, `d6`, `cap1`, `famOf`, `branchLen`, `organsFor`, `lymphPartners`, `ROUTE_KEYS`, `LYMPH_GROUP`, all tuning constants | **22/22 tables deep-equal *and* key-order equal to legacy.** Kills every transcription typo before it can hide inside a game |
| **B2** | Pure queries (~30 fns) | `samePlace`, `invadersWith`, `attackable`, `abMatch`, `canNeutralise`, `canTag`, `anyNeutralisable`, `anyTaggable`, `macrophageEatable`, `snipeTargets`, `netTargets`, `nkTargets`, `wormStrikeable`, `antivenomTargets`, `residentEatable`, `moveDestinations`, `distToOrgan`, `placeDist`, `invSpeed`, `hivActive`, `lymphBlocked`, `macDisabled`, `damaged`, `helperInBlood`, `helperLicensed`, `helperWith`, `neutrophilReadyTurn`, `apFor`, `capFam`, `capFor`, `abTotal`, `hasAb`, `memoryHit`, `rateFor`, `rateForFam`, `productionBreakdown`, `canProduceFam`, `divideOn`, `marrowBroken`, `kidneyLeak`, `brainSlow`, `spawnCount`, `wormAllowed` | **Differential fuzz over states** — snapshot thousands of legacy games at random turns, plus adversarially malformed states, call all queries on both, compare. No action sequencing needed. `moveDestinations` compared **order-sensitively** (the bot reads `ds[0]`; `hop` reads `opts[0]`) |
| **B3** | State construction | `newGame`, `makeInvader`, `rollOrgan`, `respectWormCap`, `noteWorm`, `scheduleEvents`, `pushLog`, `forceInjectType`, `forceInjectCard`, `viewState`, `pushUndo`, `undo` | 5,000 seeds × 3 difficulties: `newGame` byte-identical **and** identical draw count (this is where the §1.2 ordering trap lives). `viewState` compared across the whole B2 state corpus |
| **B4** | `applyAction` | 25 action arms; `spend`, `spendAP`, `apNow`, `apAvail`, `canAct`, `hasFree`, `apOwnerOf`, `killInvader`, `hurtInvader`, `present`, `cname`, `placeName` | Split four ways: **a** phase machine + multiplayer allocation · **b** movement + B-cell · **c** combat · **d** residents. Fuzzer restricted to the ported set; every `error` string compared exactly. `endCommand` stubs until B5, so states stay shallow while every arm gets hammered |
| **B5** | `resolveSpread` | Complement, division + `SPACE_CAP`, lytic cycle, toxin emission, malaria lifecycle, chronic worm damage, hard-mode lymphatic spread, the march, arrivals, kala-azar, worm lodging, organ damage, win/loss, upkeep, healing, regeneration, `checkRareTriggers`, `fireRare`, `applyEvent`, `fireTurnStart` | **The full corpus from §1.** This is the risk stage |
| **B6** | Simulator + knobs | `simulate`, `setKnobs`, the module-level knob globals | `simulate()` under a fixed seed returns byte-identical result objects, N=200 per difficulty. Covers the internal bot without reproducing it |
| **B7** | `noUncheckedIndexedAccess` ON | Isolated commit per `CLAUDE.md` | Whole corpus re-runs green. **No `!`** — already a lint error in `engine`. [`FINDINGS.md`](FINDINGS.md) #3 gets its bug-preserving spelling decided here, in the open |

### 3.3 Why this order answers "verify progress without waiting"

**Checkpoints 1 and 2 together cover roughly 55 of the 67 exports with a near-exhaustive
proof, and neither requires the turn engine to exist.** B1 is a table-identity diff; B2 is
pure-function differential fuzzing over states harvested from legacy. Both land in the first
two working sessions and both are meaningful on their own.

Estimated ~8 sessions: B0+B1 one · B2 one · B3 one · B4 two · B5 two · B6+B7 one. **B5 is
where an overrun is most likely** — it is 300 lines of interacting turn phases and it is the
first point at which deep game states become reachable.

Each checkpoint ships a green CI run and a one-page report: what was ported, coverage
achieved, any uncovered branches with reasons, and any new `FINDINGS.md` / `DEVIATIONS.md`
entries.

---

## 4. Runtime budget and CI tiering

Measured on the development machine, **legacy vs legacy**, engines loaded once, streaming
(record → replay → discard) so memory stays flat:

| Workload | Games | Actions | Wall time | Per game |
|---|---|---|---|---|
| Full games (200-turn cap) | 600 | 57,168 | 22.5 s | 37.4 ms |
| Short games (8-turn cap) | 600 | 37,781 | 12.5 s | 20.8 ms |

Two measurement notes worth keeping: batching instead of streaming pushed peak RSS from
215 MB to 877 MB at 1,500 games, and re-`require`-ing the engine per game cost ~12% — the
real rig loads each engine once, since `newGame` resets `_uid` and nothing calls `setKnobs`.

**Extrapolated corpus cost (this machine, legacy vs legacy):**

| Corpus | Time |
|---|---|
| 6,000 recorded bot games | 3.7 min |
| 20,000 fuzz-length games | 6.9 min |
| **Full corpus** | **10.7 min** |
| Per-push subset (600 bot + 2,000 fuzz) | 1.1 min |

**The full corpus does not fit a per-push job**, as predicted. Budgeting for a CI runner
slower than this machine, a TS engine in place of the second legacy instance, and coverage
instrumentation on the nightly — assume roughly **3× for per-push and 3× for nightly**, and
re-measure at B0 exit and again at B5 rather than trusting the multiplier:

| Tier | Contents | Local | CI budget |
|---|---|---|---|
| **Per push** | 600 bot games + 2,000 fuzz + all ~60 scenarios + B1 table diffs + B2 query diffs + the ported legacy suites | 1.1 min | **~4 min** — meets the <5 min target |
| **Nightly** | Full corpus: 6,000 bot + 20,000 fuzz + coverage instrumentation + the ≥95% gate | 10.7 min | **~30 min** — alongside the balance regression, which is also nightly |
| **Pre-checkpoint** | Full corpus + coverage gate, run on demand | 10.7 min | Must be green before any checkpoint is declared |

If per-push creeps over 5 minutes as the port grows, it shards by difficulty (3 ways) before
anything gets cut. **Nothing is silently dropped from a tier** — if coverage forces a
reduction, the checkpoint report says what was dropped and why.

---

## 5. Divergence reporting

> "Diverged at action 4,122 of 50,000" is nearly useless. Shrinking is what makes a failure
> actionable.

On first divergence the rig stops that game and produces a **minimal reproducing case**.

**Step 1 — locate.** The first divergent action index is already known exactly: the
per-action comparison is deterministic, so the first mismatching index *is* the first
divergence. The comparator also reports which of the three levels failed (`rng` / `result` /
`state`), which alone usually names the category of bug.

**Step 2 — materialise.** Re-run both engines to that index with full-state retention
enabled, and produce a **path-level structural diff**, not a byte dump:

```
invaders[2].hp        legacy=3  port=2
organs.brain.clear    legacy=0  port=1
rngDraws              legacy=41 port=42
```

**Step 3 — shrink (delta debugging).** Apply ddmin to the action list, testing whether each
reduced list still diverges. Legacy is re-run on every candidate to regenerate the expected
trace, because removing an action changes downstream RNG consumption — the reduced sequence
is a genuinely different game, which is fine as long as it still diverges. Reductions that
stop reproducing are discarded. Typical output is under ten actions.

**Step 4 — simplify the seed.** With the minimal action shape known, sweep a few hundred
seeds for the smallest one that still reproduces, so the repro is stable and cheap to re-run.

**Step 5 — report.**

```
DIVERGENCE  seed=1043  difficulty=hard  level=state
minimal repro (6 actions):
  draw / beginCommand / produce{family:"EXB"} / tag{...} / endCommand / endCommand
first difference at action 5 (endCommand):
  invaders[2].hp   legacy=3  port=2
```

**Batching.** A checkpoint run does not stop at the first failure. It collects up to K
distinct divergences, **grouped by their shrunk minimal case**, so one CI cycle fixes several
bugs rather than one. Distinctness is judged on the minimal case, not the original seed —
otherwise a single bug reports as hundreds of failures.

---

## 6. Reproducibility across machines

The corpus is defined by **committed seeds**, not committed logs:

```
tests/equivalence/corpus/seeds.json
  { generator, seed, difficulty, maxTurns }
```

Action logs regenerate deterministically from legacy at test time, so the artefact stays
small and the corpus is identical on every machine and on CI. Tier membership (per-push /
nightly) is a field in the same file, so what runs where is reviewable in a diff rather than
buried in a workflow YAML.

Any seed that has ever produced a divergence is **pinned into the per-push tier permanently**,
as a regression guard.

---

## 7. Ordering constraints

**Log strings stay byte-identical through Task B.** `pushLog` embeds English HTML directly
into game state, and state is what gets diffed. i18n extraction is Task C, with the
catalogue-matches-legacy test the brief already requires. Touching a string during B fails
the corpus for the wrong reason.

**Module-level knob globals stay module-level.** `SPAWN_MODE`, `HUB_SAFE`, `ORGAN_OVERRIDE`
and `AP_OVERRIDE` make the engine non-reentrant across games — the one place where "pure" and
"identical" genuinely conflict. Task B keeps them as module state so behaviour matches.
Making them per-game is a Phase 2 conversation, not a port decision.

---

## 8. Rulings — Shantanu, 4 Aug 2026

| Finding | Ruling |
|---|---|
| `setKnobs({heal})` | Neither "preserve the throw" nor "silent no-op" is faithful — legacy's real behaviour is a silent no-op, and the `ReferenceError` is *new* behaviour strict mode would impose. Explicit throw with a clear message, because `setKnobs` is developer-facing. → [`DEVIATIONS.md`](DEVIATIONS.md) #1 |
| NaN stats | Port bug-for-bug. Fix **after** equivalence is proven, as an isolated commit with the corpus re-run showing exactly what changed. Confirmed before Task E that `simulate()` does not read those counters — see [`FINDINGS.md`](FINDINGS.md) #2 |
| Antigenic variation dead | Port dead. Design conversation with Kartik, logged in [`FINDINGS.md`](FINDINGS.md) #4 |
| Dead knobs / flags / code | Port as-is, listed in [`FINDINGS.md`](FINDINGS.md) #7, #8, #11 |
| `spec_test.js` broken | Leave broken, do not repoint. Noted in `tools/legacy/stale/README.md` |
| Stale assertion label | Do not edit `tools/legacy`. Name it correctly when porting, with a comment recording that the label was wrong, not the assertion |
| No balance-sim harness | Accepted. Task E reports "win rate under this specific bot", never "the win rate" — caveat recorded in [`FINDINGS.md`](FINDINGS.md) #6 so it survives to the grant write-up |
| **Human ground truth** | Shantanu and Kartik win essentially every Normal game and ~7/10 on Hard. Authoritative; **the game is not broken.** Recorded as [`FINDINGS.md`](FINDINGS.md) §0 |
| **79 / 51 / 19** | Obsolete — they date from 6 July, before organs, residents, crisis and rare events, malaria staging, worms, toxins, antivenom, Pathogen X, memory/vaccine, lymph hops, hard-mode division and production caps. A baseline for a substantially simpler game, **not** a pre-brain-fix one. Marked obsolete in [`FINDINGS.md`](FINDINGS.md) #2 and `CLAUDE.md` |
| Bot capability audit | Primary. Delivered as [`FINDINGS.md`](FINDINGS.md) §1 — decision input for building a competent (dual-use) bot in Phase 2 |
| Task E metrics | A 0% win rate cannot fail usefully. Continuous-metric panel proposed with cross-seed variance in [`FINDINGS.md`](FINDINGS.md) § "Task E metrics", framed as detecting **engine change**, not difficulty |
| brain `branch:4` experiment | Run on a scratch in-memory mutant, discarded. No metric moved beyond 2 sd. Result in [`FINDINGS.md`](FINDINGS.md) #2 |
| Both ordering constraints | Agreed — §7 |
| Runtime budget | Measure before B0, propose tiers with real numbers — §4 |
| Divergence shrinking | Required — §5 |
| Corpus seeds | Committed — §6 |
