# Task B — closeout

**Status:** **NOT COMPLETE — the coverage gate fails.** **Date:** 5 August 2026 (revised).
One document to know where things stand. Everything below links to the register that holds the
detail; nothing here needs another file to be understood.

> **Revision note.** The first version of this document declared Task B complete and filed the
> coverage gate under "should happen before Task C, not blocking". That was wrong. §1.5 of
> [`TASK_B_PLAN.md`](TASK_B_PLAN.md) makes ≥95% line **and** branch coverage from the
> equivalence corpus the gate, and it had never been measured. It has now been measured and it
> **fails**. See §4.
>
> This is the same failure this project has caught four times inside individual tests — a check
> that appears to have passed because nobody measured the thing that would have said otherwise.
> It applies to the task as a whole, not only to its tests.

---

## 1. What was delivered

`tools/legacy/v2_engine.js` (1,769 lines, 67 exports) → `packages/engine/` (TypeScript, `strict`,
`noUncheckedIndexedAccess` on, zero `any`, zero `!`).

| Stage | Contents | Checkpoint |
|---|---|---|
| B0 | Equivalence rig, seeded RNG, shrinker, corpus seeds | Rig catches an injected mutation and shrinks it |
| B1 | 22 data tables + primitives | 22/22 tables identical, key order included |
| B2 | ~30 pure queries | 24 queries × ~1,600 states |
| B3 | Construction, `viewState`, undo | 4,500 seeds byte-identical + draw counts |
| B4 | `applyAction`, 25 arms | Four splits, error strings frozen |
| B5 | `resolveSpread` | **6,000 games, 0 divergences** + 41 scenarios |
| B6 | `simulate` + knobs | Result objects + draw counts identical |
| B7 | `noUncheckedIndexedAccess` on | Corpus clean, 10 lookups handled |

**199 tests. `pnpm verify` green across all 7 workspace projects.**

The public API is exactly legacy's 67 names. Helpers legacy keeps private are reachable at
`@immunity-wars/engine/internal` rather than widening the contract.

---

## 2. What the corpus PROVES

Every action, in 6,000 complete games across three difficulties, compared on three levels:

1. **State** — full game state hash, including log HTML, the undo stack and stats
2. **RNG** — `Math.random` draw count, which catches wrong dice and wrong evaluation order
3. **Result** — `applyAction`'s return value, including the exact error string and frame count

Plus 41 scripted scenarios, differential fuzzing over the action space, and ~1,600 harvested and
synthesised states for the query layer.

**The rig has been shown to fail when it should.** Negative controls caught: a dice-payload
change (9 actions), a frame-count change (3), a worm-lodging change (9), a convalescence
off-by-one (21), an `nkTargets` off-by-one, a single deleted full stop in an error string, and
the `newGame` field reorder that only the draw count could see.

---

## 3. What the corpus does NOT prove

This section matters more than the one above.

| Not proven | Why | Mitigated by |
|---|---|---|
| **That the game is well designed** | It compares two engines. It says nothing about whether the rules are good | Human play — [`FINDINGS.md`](FINDINGS.md) §0 |
| **Anything about multiplayer** | The corpus is single-player. `allocateAP`/`returnAP`/`confirmAllocation` appear only in B4's fuzzer and one targeted suite | B4 phase split; `returnap.test.ts`. **Genuine gap** — Phase 3 |
| **Anything about the UI** | No renderer exists yet. `viewState`'s *shape* is pinned; nothing consumes it | Task G harness; Phase 2 |
| **Coverage of what the bot cannot reach** | The reference bot plays ~6 of 14 seats and never emits 8 of 27 actions | Fuzzer + 28 synthetic mutations, worth **+14 points of line coverage** over the bot games alone (§4.1). Quantified, no longer "partly mitigated" |
| **That deliberately-diverged paths still match** | `stats.arrivals` and `stats.gotThrough` are excluded from the comparison hash | Nothing. This is a real blind spot, deliberately created — §5 |
| **The ≥95% coverage gate** | **Measured, and it FAILS** — 86.89% branches at the loosest reading | §4. Blocking |
| **That legacy itself is correct** | Bug-for-bug means the port reproduces legacy's bugs faithfully | 20 findings recorded; 2 fixed |

**One number to be careful with.** Any win rate from `simulate()` is *"win rate under the
reference bot, vN, at N games per difficulty"* — never "the win rate". The bot wins 0.2% on
Normal where humans win essentially every game. That gap is a bot-capability signal, not a
difficulty signal ([`FINDINGS.md`](FINDINGS.md) §1).

---

## 4. Coverage — the gate, and why it fails

`pnpm coverage:corpus` · `pnpm coverage:generators` · `pnpm coverage:all` · `pnpm coverage:gaps`

**The gate** ([`TASK_B_PLAN.md`](TASK_B_PLAN.md) §1.5): ≥95% line **and** branch coverage of
`packages/engine/` **from the equivalence corpus alone**, with every uncovered branch either
given a scripted scenario or listed as unreachable with a reason.

### 4.1 Measured, three tiers

Which tests produce the number is the whole point, so it is reported three ways. Type-only
files (`state.ts`, `types.ts`) emit no runtime code and are excluded; including them would drag
the figure down for no reason.

| Tier | What runs | Lines | Branches | Gate |
|---|---|---|---|---|
| **1. Corpus alone** | the 600 recorded bot games | **72.95%** | **74.71%** | ✗ fails both |
| **2. The four generators** | bot games + fuzz + scenarios + query corpus | **87.21%** | **84.32%** | ✗ fails both |
| **3. Whole suite** | all 199 tests | **95.68%** | **86.89%** | ✗ fails branches |

**The gate fails at every tier.** Even reading it as loosely as possible — the whole suite,
which is *not* what the gate says — branch coverage is 86.89% against a 95% target.

The tier 1 → tier 2 jump is the fuzzer and the scenarios earning their place: +14 points of line
coverage that the recorded games alone do not touch. That is finding #1 made quantitative — the
bot plays ~6 of 14 seats, and roughly a seventh of the engine is unreachable through it.

### 4.2 Every uncovered branch, classified

195 uncovered branch arms and 5 uncovered functions at the loosest tier. Classified by explicit
rule in `tests/equivalence/classify-gaps.ts` rather than by eye, because a hand-sorted list of
200 items is neither reviewable nor reproducible.

| Bucket | Count | % | Classification |
|---|---|---|---|
| **Defensive fallback** | 90 | 45.0% | **Unreachable, with reason** — see 4.3 |
| **Error guard** | 39 | 19.5% | **Reachable, not covered** → needs scenarios |
| **Multiplayer-only** | 17 | 8.5% | **Phase 3** — the corpus is single-player by scope |
| **Bot-conditional** | 9 | 4.5% | Inside `simulate()`'s bot; reachable only through its heuristics |
| **Needs individual review** | 45 | 22.5% | Mixed; the notable ones are in 4.4 |

### 4.3 The uncomfortable interaction: B7 lowered branch coverage

**45% of the uncovered branch arms are `??` and `||` fallbacks, and most were introduced by
enabling `noUncheckedIndexedAccess`.**

The flag required handling every lookup that *could* miss. In the majority of cases the
surrounding guard has already made the miss impossible — so the handler is correct, required,
and **provably dead**. Every one of those adds an uncoverable branch arm.

Excluding them, branch coverage is **92.48%**. Still short of 95%, but the gap is 2.5 points
rather than 8.

This is worth stating plainly because it cuts against a natural reading: the flag made the code
safer and the metric worse, simultaneously. Neither figure is wrong. **A 95% branch target may
simply be the wrong shape for a codebase that has just been made defensively exhaustive**, and
that is a decision to take rather than a number to chase.

### 4.4 What the classification found

Three things worth acting on, none of them coverage percentages:

- **Three functions the entire 199-test suite never executes**, and legacy contains exactly one
  reference to each — the definition. `apOwnerOf`, `abTotal`, `hasAb` are dead in legacy too.
  Added to [`FINDINGS.md`](FINDINGS.md) #11, confirmed by measurement rather than by reading.
- **`tag`'s novel-antigen guard can never fire** — `f === 'X'` needs `iv.novel`, but `tag` only
  accepts bacteria/worm/parasite and the only novel card is a virus. Third instance of the same
  pattern as #4 and #13: defensive branches for pathogen shapes the content tables cannot
  produce. Recorded as [`FINDINGS.md`](FINDINGS.md) #21.
- **39 error guards are reachable but unprovoked.** These are the honest gap — rejection paths
  the fuzzer's action shapes happen not to hit. They need scenarios, and **no scenarios have
  been added**: the list comes first, as instructed.

### 4.5 The decision

Three options, and this is Shantanu's call, not mine:

1. **Close the gap.** Add scenarios for the 39 error guards and the reachable half of the
   needs-review bucket. Would plausibly reach ~95% branches excluding defensive arms; would not
   reach 95% raw, because the defensive arms cannot be covered at all.
2. **Restate the gate** to exclude provably-dead defensive arms, and hold 95% against the
   remainder — currently 92.48%, so still work to do, but a target that can actually be met.
3. **Accept with reasons**, recording that raw branch coverage is 86.89% and why.

**Option 1 alone cannot reach the gate as literally written.** That is the useful thing the
measurement produced, and it would not have been visible from a percentage on its own.

---

## 5. Deviations from legacy — the complete list

Four. Everything else is byte-identical. Full detail in [`DEVIATIONS.md`](DEVIATIONS.md).

| # | Deviation | Kind | Blast radius |
|---|---|---|---|
| 1 | `setKnobs({heal})` throws instead of silently doing nothing | Developer-facing | None — nothing calls `setKnobs` |
| 2 | Duplicate exports exported once | Forced by the language | None — same resolved module shape |
| 3 | `stats.arrivals` / `gotThrough` no longer accumulate NaN | **Bug fix** | None in play; `viewState` never exposed `stats` |
| 4 | `returnAP` validates its pid | **Bug fix** | Multiplayer only; narrows one accepted call to a rejection |

Both fixes landed **after** equivalence was proven, each as its own commit, each with
confined-change evidence showing precisely which paths moved and that nothing else did.

---

## 6. The one blind spot we created on purpose

`tests/equivalence/src/rig.ts` holds a `DELIBERATE_DIVERGENCES` list. It currently contains
`stats.arrivals` and `stats.gotThrough`, excluded from the comparison hash so the corpus stays
meaningful after deviation #3.

**Everything on that list is a place the corpus has stopped watching.** It is a liability, not a
convenience. It stays short, and nothing joins it without `confined-change.ts` evidence first.
If it grows past a handful of entries, the corpus is no longer proving what this document claims
it proves.

---

## 7. The findings queue

20 findings. Each is classified below by **who owns the decision**, which is the thing that
determines what happens next. Full detail in [`FINDINGS.md`](FINDINGS.md).

### Design questions for Kartik — 5

These are about the game, not the code. Nothing has been changed.

| # | Question |
|---|---|
| **5** | **A resident macrophage can never eat from its starting position.** It must be patrolled onto the branch first. The rulebook, the study packet and the app tooltip all imply the opposite ("already in position", "eats one germ here each turn"). **This is a gap in the physical game too, not only the app.** |
| **4** | **Antigenic variation is unreachable.** The only `variant` card is a parasite, and `neutralise` rejects parasites two lines before the variant roll. A designed, scientifically-motivated mechanic that never fires. |
| **18** | **Degranulate costs half the Brain to use.** It burns 1 integrity off the organ it occupies; the Brain has 2. Strike-twice is strictly better there. The biology is right — is the interaction intended? |
| **15** | **The Heart has the shortest branch on the board** (2 vs 3) and is the most common first-failure organ (25% Normal, 34% Hard) — ahead of the Brain, which has the lowest integrity. The rulebook warns about the Brain and says nothing about the Heart. |
| **13** | **Pathogen X exists only via two lookup misses** — absent from both `TROPISM` and `FAMILY`. The tropism miss makes it a generalist; the FAMILY miss is invisible until the `novel` flag is lost, at which point it silently becomes an ordinary EXB bacterium and the clonal-selection lesson stops being taught. |

### Engine bugs — 2 fixed, 0 outstanding

| # | Bug | Status |
|---|---|---|
| 3 | `stats` counters accumulate NaN for all non-bacterial types | **Fixed** — DEVIATIONS #3 |
| 20 | `returnAP` writes NaN for an unknown pid, in shipped multiplayer | **Fixed** — DEVIATIONS #4 |

### Deferred to a later task — 4

| # | Item | Owner |
|---|---|---|
| **1** | **The reference bot plays ~6 of 14 seats.** Never emits 8 of 27 actions; never moves the Neutrophil (so the NET can never fire); never repositions a resident (so all seven are inert) | **Phase 2** — dual-use with seat-filling AI for online play |
| **17** | Brain `branch:3` restored **one turn** of Eosinophil slack. Not "unwinnable → winnable" — the smaller claim is the true one, and the one to give a judge | Recorded; no action |
| **6** | No standalone balance-sim harness exists; `tools/balance-sim/` is empty | **Task E** |
| **2** | Training 79 / Normal 51 / Hard 19 are obsolete — 6 July, a substantially simpler game | Recorded in `CLAUDE.md`; no action |

### Recorded, no action needed — 9

| # | Item |
|---|---|
| 7 | `SPAWN` is a dead knob — assigned by `setKnobs`, never read |
| 8 | Seven `FLAGS` entries are never read by the engine |
| 9 | `spec_test.js` cannot run; leave broken, do not repoint at the stale build |
| 10 | Stale assertion label in `feedback_0723_test.js` — the assertion is right, the name is wrong |
| 11 | Assorted dead code: `PAIR`, `fireRare`'s `extra`, Tier-A antibody leftovers |
| 12 | Four bot-needed internals are unexported; the rig reimplements them |
| 14 | The three worm safeguards all hold — but "worms never multiply" holds **by placement, not by intent**, and is pinned by a self-deleting test |
| 16 | `forceInject*` bypasses the worm caps *and* the accounting, so forced worms are invisible to `wormsSpawned` |
| 19 | The lytic-cycle array spread is defensive, not load-bearing — a negative control that correctly found nothing |

---

## 8. Reachability questions — answered

Three questions neither the corpus nor a metric panel can answer, asked at B5.

| Question | Answer |
|---|---|
| Two worms at the Brain on Hard, `branch:3` — is there a line of play? | **CONSTRUCTIBLE, and a line EXISTS.** Committed as a constructive proof. Both worms lodge on the same space, so one Eosinophil strikes both without moving again |
| Can a worm ever be on a route? | **NOT CONSTRUCTIBLE** through any legal path. Every entry funnels through `makeInvader`, which always places worms on a branch. Demonstrated that a worm placed there by direct mutation *is* cloned by hard-mode lymphatic spread |
| Does antigenic variation stay unreachable? | **YES.** Confirmed statically and across 150 games in which the coat-change log line never appears |

---

## 9. What should happen before Task C

Item 1 is blocking. The other two are the loose ends.

1. **Decide what to do about coverage** (§4.5). It is measured, it fails, and the three options
   are close the gap / restate the gate / accept with reasons. Task B cannot be called complete
   until that decision is taken and recorded.
2. **Task C inherits two things by design.** The 22 data tables move out behind a Zod loader —
   and that loader is the right place to require every `DECK_MASTER.dz` to have a `FAMILY` entry
   or a documented exemption, which is finding #13's real fix. The i18n extraction takes the
   frozen error strings, which have been held byte-identical throughout precisely for this.
3. **Multiplayer coverage is a genuine gap.** Not a Task B failure — the corpus was scoped
   single-player — but Phase 3 should not assume the allocation phase is as well tested as the
   rest of the engine. It is not.

---

## 10. Working practices this task established

Recorded because they earned their place, not as process for its own sake.

- **Audit green checkpoints twice**: for vacuous passes, *and* for places I dodged the check
  myself. `as number` is `!` spelled differently. At B7 the flag reported 8 problems when the
  real number was 10 — I had cast over the two most interesting lookups during B5.
- **A negative control that correctly finds nothing is a result.** Recorded, with the reason
  (#19, and the B6 Neutrophil case).
- **Tests that know they are scaffolding and say when to delete themselves** — the worm-on-route
  source check, the `endCommand`-throws test that inverted when B5 landed.
- **`pnpm verify` before `git commit`, not after.**
