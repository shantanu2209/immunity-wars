# Task B — closeout

**Status:** complete. **Date:** 5 August 2026.
One document to know where things stand. Everything below links to the register that holds the
detail; nothing here needs another file to be understood.

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
| **Coverage of what the bot cannot reach** | The reference bot plays ~6 of 14 seats and never emits 8 of 27 actions | Fuzzer + 28 synthetic state mutations. **Partly mitigated** |
| **That deliberately-diverged paths still match** | `stats.arrivals` and `stats.gotThrough` are excluded from the comparison hash | Nothing. This is a real blind spot, deliberately created — §5 |
| **The ≥95% coverage gate from the plan** | Never measured. `c8` was not wired up | **Outstanding.** Should be done before Task F closes CI |
| **That legacy itself is correct** | Bug-for-bug means the port reproduces legacy's bugs faithfully | 20 findings recorded; 2 fixed |

**One number to be careful with.** Any win rate from `simulate()` is *"win rate under the
reference bot, vN, at N games per difficulty"* — never "the win rate". The bot wins 0.2% on
Normal where humans win essentially every game. That gap is a bot-capability signal, not a
difficulty signal ([`FINDINGS.md`](FINDINGS.md) §1).

---

## 4. Deviations from legacy — the complete list

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

## 5. The one blind spot we created on purpose

`tests/equivalence/src/rig.ts` holds a `DELIBERATE_DIVERGENCES` list. It currently contains
`stats.arrivals` and `stats.gotThrough`, excluded from the comparison hash so the corpus stays
meaningful after deviation #3.

**Everything on that list is a place the corpus has stopped watching.** It is a liability, not a
convenience. It stays short, and nothing joins it without `confined-change.ts` evidence first.
If it grows past a handful of entries, the corpus is no longer proving what this document claims
it proves.

---

## 6. The findings queue

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

## 7. Reachability questions — answered

Three questions neither the corpus nor a metric panel can answer, asked at B5.

| Question | Answer |
|---|---|
| Two worms at the Brain on Hard, `branch:3` — is there a line of play? | **CONSTRUCTIBLE, and a line EXISTS.** Committed as a constructive proof. Both worms lodge on the same space, so one Eosinophil strikes both without moving again |
| Can a worm ever be on a route? | **NOT CONSTRUCTIBLE** through any legal path. Every entry funnels through `makeInvader`, which always places worms on a branch. Demonstrated that a worm placed there by direct mutation *is* cloned by hard-mode lymphatic spread |
| Does antigenic variation stay unreachable? | **YES.** Confirmed statically and across 150 games in which the coat-change log line never appears |

---

## 8. What should happen before Task C

Not blocking, but they are the loose ends.

1. **Wire up coverage.** The plan's ≥95% line/branch gate was never measured. It is the number
   that turns "6,000 games" into a claim about completeness rather than volume.
2. **Task C inherits two things by design.** The 22 data tables move out behind a Zod loader —
   and that loader is the right place to require every `DECK_MASTER.dz` to have a `FAMILY` entry
   or a documented exemption, which is finding #13's real fix. The i18n extraction takes the
   frozen error strings, which have been held byte-identical throughout precisely for this.
3. **Multiplayer coverage is a genuine gap.** Not a Task B failure — the corpus was scoped
   single-player — but Phase 3 should not assume the allocation phase is as well tested as the
   rest of the engine. It is not.

---

## 9. Working practices this task established

Recorded because they earned their place, not as process for its own sake.

- **Audit green checkpoints twice**: for vacuous passes, *and* for places I dodged the check
  myself. `as number` is `!` spelled differently. At B7 the flag reported 8 problems when the
  real number was 10 — I had cast over the two most interesting lookups during B5.
- **A negative control that correctly finds nothing is a result.** Recorded, with the reason
  (#19, and the B6 Neutrophil case).
- **Tests that know they are scaffolding and say when to delete themselves** — the worm-on-route
  source check, the `endCommand`-throws test that inverted when B5 landed.
- **`pnpm verify` before `git commit`, not after.**
