# Engine findings — `tools/legacy/v2_engine.js`

Behaviours found in the original engine while planning the Task B port.

**Nothing here is fixed by the port.** A bug-for-bug port is what makes the equivalence
proof meaningful: if the port "improves" something, a state diff against the legacy engine
stops being evidence and becomes noise. Each finding records what was verified, how, and
what happens to it.

Deliberate departures from legacy behaviour live in [`DEVIATIONS.md`](DEVIATIONS.md), not here.

| # | Finding | Severity | Disposition |
|---|---|---|---|
| 1 | The reference bot has fallen far behind the game | **Phase 2 decision input** | Capability audit below; build a competent bot in Phase 2 |
| 2 | Training 79 / Normal 51 / Hard 19 are obsolete | **Reporting** | Marked obsolete here and in `CLAUDE.md` |
| 3 | `stats.arrivals` / `stats.gotThrough` go `NaN` | Medium | **FIXED** after equivalence — [`DEVIATIONS.md`](DEVIATIONS.md) #3 |
| 4 | Antigenic variation is unreachable | **Design** | Port dead; conversation with Kartik |
| 5 | Resident macrophages cannot act from their start position | **Design** | Report only |
| 6 | No standalone balance-sim harness exists | **Reporting** | Caveat must reach the grant write-up |
| 7 | `SPAWN` is a dead knob | Low | Port as-is |
| 8 | Seven `FLAGS` entries are never read | Low | Port as-is |
| 9 | `spec_test.js` is broken | Low | Leave broken |
| 10 | Stale assertion label in `feedback_0723_test.js` | Low | Fix the label only when porting |
| 11 | Assorted dead code | Low | Port as-is |
| 12 | Four bot-needed internals are unexported | Low | Rig reimplements them |
| 13 | Pathogen X exists only via two lookup misses | **B7 risk** | **FIXED** at Task C4 — [`DEVIATIONS.md`](DEVIATIONS.md) #5 |
| 14 | The three worm safeguards all hold | **Verified** | No action; one bypass documented |
| 15 | The Heart has the shortest branch on the board | **Design** | Report only |
| 16 | `forceInject*` bypasses the worm caps AND the accounting | Low (dev-only) | Report only |
| 17 | Brain `branch:3` restored one turn of Eosinophil slack | **Method** | Why the B5 scenarios exist |
| 18 | Degranulate costs half the Brain to use | **Design** | Report only |
| 19 | The lytic-cycle array spread is defensive, not load-bearing | Low | Comment at the site |
| 20 | `returnAP` does not validate its pid, and writes NaN | **Server-facing** | **FIXED** — [`DEVIATIONS.md`](DEVIATIONS.md) #4 |
| 21 | `tag`'s novel-antigen guard can never fire | Low | Port as-is; found by coverage |
| **22** | **PATTERN: guards against states the content makes impossible** | **Design + Task C** | Schema work should watch for it |
| **23** | **`Diphtheria toxin` is content the engine can never produce — #22 in mirror** | **Task C** | Report only; C4's reachability report must find it unaided |
| **24** | **VARIANT OF THE PATTERN: a measuring instrument wrong where nobody was looking** | **Method** | **FIXED** at C1; the lesson is the finding |
| **25** | **An arm ASSUMED dead and excluded turned out to be live — exclusion lists decay both ways** | **Method** | Rule A re-test proposed; decision for Shantanu |
| **26** | **`rulesVersion` is documented on every state and message, and is on neither** | **Phase 3** | Recorded, not fixed — the protocol becomes real in Phase 3 |
| **27** | **Antibodies EXCEED the per-family cap in legal play — the brief's invariant is false** | **Task D** | Invariant rewritten before it was written; measurement below |
| **28** | **C5b AGAIN: checks that ran the port's machinery whatever engine produced the state** | **Method** | **FIXED** at Task D; found by a control that would not fire |
| **29** | **`g.free` — the Helper T-Cell free-action pool is never granted — THIRD instance of the #4 pattern** | **Design** | Report only; design question for Kartik |
| **30** | **#24 AGAIN: the coverage gate filed a NON-multiplayer arm into Phase 3, via a whole-FILE blanket rule** | **Method** | **FIXED** at Task E1 on Shantanu's call; churn reported |
| **31** | **`endCommand` returns a BURST of full states — the brief's size measurement is one frame of it** | **Task E / Phase 3** | `PHASE1_BRIEF.md` §5 corrected; both numbers reported |
| **32** | **A control that fires is not enough — measure how STRONGLY, against WHAT** | **Method** | Rule added to `tests/property/README.md` beside the four-kinds table |
| **33** | **Linearly-spaced seeds are not independent samples — the harness's own bands were wrong** | **Method** | **FIXED** at E2; found by the reproducibility check that exists for it |
| **34** | **The Task E metric-panel design in this file does not work as proposed, measured three ways** | **Task E** | **CORRECTED** at E2; the panel now detects an Action Point, and #17's blind spot is narrower than stated |
| **35** | **A measured `sd(arm)` can sit BELOW the floor sampling theory allows — the 8-arm bands did, at 0.72×** | **Task F0** | **FIXED** at F0; the floor is now checked on every calibration |
| **36** | **The port and legacy agree to four decimal places on aggregate metrics** | **Verified** | Corroboration nobody was looking for; report only |
| **37** | **An inventory can be wrong by OMISSION, not only by overclaim** | **Method / Task F1** | **FIXED** at F1; the manifest asserts both directions |
| **38** | **Two instruments, each correct, that together produced a permanently-red dashboard row** | **Method / Task F** | **FIXED**; nightly tiers declared, result writing moved into a tested script |
| **39** | **Task B proved the 67-export contract; that contract is NOT the surface `v2_ui.html` uses** | **Task G** | Five names supplied by the shim from `packages/content`; no engine change |

---

## 0. Ground truth: the game is not broken

**Measured human play, reported by Shantanu and Kartik, 4 August 2026:**

| Difficulty | Human win rate |
|---|---|
| Normal | **essentially every game** |
| Hard | **roughly 7 in 10** |

This is authoritative and it settles the question. Everything below is read against it.

---

## 1. The reference bot has fallen far behind the game it is meant to measure

`simulate()`'s inlined bot, on the current engine:

| Difficulty | Bot win rate | Human win rate | Bot avg loss turn |
|---|---|---|---|
| Training | 54.3% | — | 14.3 |
| Normal | **0.2%** | ~100% | 11.0 |
| Hard | **0.0%** | ~70% | 8.8 |

**A ~100% vs 0.2% gap on Normal is not a difficulty signal. It is a bot-capability signal.**
The bot is not playing a harder game than the humans; it is playing a much smaller subset of
the same game.

### 1.1 Action-space coverage

Over 600 recorded games (200 seeds × 3 difficulties), against the engine's full 27-action
space:

| Emitted | Never emitted |
|---|---|
| `draw` · `beginCommand` · `endCommand` · `move` · `produce` · `clonalSelection` · `vaccinate` · `neutralise` · `strike` · `degranulate` · `tag` · `engulf` · `memoryKill` · `snipe` · `nkkill` | **`net` · `resengulf` · `resmove` · `antivenom` · `orderAntivenom` · `hop` · `recall` · `undo`** · `activate`\* · `allocateAP`\* · `returnAP`\* · `confirmAllocation`\* |

\* `activate` always returns an error by design; the three allocation actions are multiplayer
only. The other **8 are real gaps.**

### 1.2 Two of those gaps are structural, not heuristic

Verified over 5,404 turn-ends and 37,828 organ-turns:

| Observation | Count |
|---|---|
| `move` actions issued for the Neutrophil | **0** (of 3,989 moves — only macrophage, tcell, eosinophil, nk) |
| Turns with the Neutrophil outside the hub | **0 / 5,404** |
| Turns where ≥2 NET targets existed | **0 / 5,404** |
| Organ-turns where a resident had anything eatable | **0 / 37,828** |

**The Neutrophil never acts at all.** The bot never moves it, and `netTargets()` returns empty
whenever the Neutrophil is at the hub — so the NET can never become available. The gap is
self-sealing: no move → no targets → no NET → no reason to move.

**All seven resident macrophages are inert, and this one is a property of the game rather than
of the bot.** Residents start at `step:0`, meaning at the organ itself. `residentEatable()`
requires an invader at the resident's own step. But an invader that reaches branch step 0 is
processed as an *arrival* inside the same `resolveSpread` — it damages the organ and is
removed — so nothing eligible is ever observable at step 0 during a command phase. The three
things that *do* persist at step 0 (a lodged worm, liver-stage malaria, a kala-azar parasite
inside the macrophage) are all ineligible types. **A resident must be moved off step 0 with
`resmove` before it can ever eat anything.** See finding #5.

So of the game's 14 seats (7 cells + 7 residents), the bot meaningfully plays **six**.

**Corroborated independently at B6.** Porting `simulate()` exposed a second consequence: the
bot's NET check counts `invadersWith(neutrophil)` rather than `netTargets`, which are different
predicates — but replacing one with the other diverges on **zero games**, because the guard
`n.zone !== 'hub'` short-circuits first and the count is never evaluated. Static confirmation
from the source: the bot issues `move` for the helper only, and reaches `goTo()` for `tcell`,
`nk`, `eosinophil` and `macrophage` — the Neutrophil appears in exactly one line of the whole
bot, the NET attempt itself. The seat is not merely underused; it is unreachable.

### 1.3 Mechanics the bot cannot respond to

| Mechanic | What the bot does |
|---|---|
| **Organ integrity** | Nothing. Threats are sorted by `distToOrgan` only; `organs[o].hp` is never read. A 3/3 Lungs is defended exactly like a 1/2 Brain. |
| **Resident macrophages** | Never repositions them, so they never act (§1.2). |
| **Crisis events** | Never reads `g.banner` or `g.warning`. The warning explicitly names next turn's bad event; the bot cannot prepare. |
| **Malaria staging** | Snipes liver-stage only if convenient; never prioritises killing it before `embed` expires and it bursts into 3 blood-stage parasites. |
| **Convalescence** | Never clears a branch to let a damaged organ regain integrity; `org.clear` is never read. |
| **Memory / vaccine** | Dribbles 1 AP per turn into whatever it has seen, without checking it can reach `VACCINE_COST` before the game ends. Completes 10.4 vaccines on Training but only **1.3 on Hard**. |
| **Venom** | Cannot kill it. Venom is immune to antibodies, NETs, engulfing and sniping — antivenom is the only answer, and the bot never uses it. Venom appeared in **202 / 600 games**; antivenom was used **0** times, leaving on average 2.0 / 1.0 / 0.0 vials unspent. |
| **Toxin emission** | Never prioritises tagging a `TOXIN_MAKERS` bacterium to freeze the countdown. |
| **AP budgeting** | Greedy in fixed priority order. On Training it cannot even spend what it has — **26.6 AP left unspent per game** — while on Normal (0.14) and Hard (0.00) it is starved. |
| **Targeting quality** | `neutralise` is rejected more often than it succeeds: **1,414 failures vs 934 successes.** |

### 1.4 What this is a decision input for

A competent bot is **dual-use**, which is what makes it worth building rather than merely
nice to have:

1. It is the only way `simulate()` can measure anything meaningful about *difficulty*.
2. Online play needs AI to fill seats when a player drops — a real Phase 2/3 requirement, and
   with 14 seats a dropped player is likely rather than exceptional.

**This is a Phase 2 decision, not a Task B one.** Nothing here is tuned or changed during the
port. Recorded so the decision is made on measurements rather than impressions.

---

## 2. Training 79 / Normal 51 / Hard 19 are obsolete — and not for the reason previously recorded

Those figures date from **6 July 2026**. They predate organs, resident macrophages, crisis
events, rare events, malaria staging, worms, toxins, antivenom, Pathogen X, memory and
vaccines, lymphatic hops, hard-mode division, and production caps.

**They are a baseline for a substantially simpler game, not a pre-brain-fix baseline.** The
earlier framing in `docs/PHASE1_BRIEF.md` §4 and in `CLAUDE.md` — that they described "a
pre-27-July game" — understated it: the brain branch change is a minor part of the difference.

They must not be used as targets, as a sanity check, or as a comparison point. `CLAUDE.md` is
updated to match.

### The brain `branch:3 → 4` experiment — measured the average, did NOT measure the tail

Run as a scratch experiment on a mutated in-memory copy (never committed, never written to
`tools/legacy`), 10 batches × 100 games per difficulty, identical seeds in both arms.

**Result on the aggregate: no metric moved beyond 2 standard deviations, at any difficulty.**
Win rate, loss turn, organ hits, kills, invaders left, organs damaged, antibodies made — every
delta was inside the noise band. It does shift *which* organ fails first (the Brain's share of
first failures drops 28% → 20% on Training, 20% → 16% on Hard), but another organ simply fails
instead, so timing and outcome are unchanged.

**This must NOT be recorded as "no effect, closed."** The measurement did not test what the
change was for.

**What the change was actually for.** Shantanu shortened the lane because of the two-worms-at-
the-Brain case on Hard: 4 AP is not much with which to coat two worms and get the Eosinophil
into position before the organ falls.

**B5 measured it, and the precise claim is narrower than "unwinnable".** The state is survivable
at `branch:4` on an otherwise quiet board; what `branch:3` restores is **one turn of Eosinophil
slack**, which is what lets you survive it while anything else is also demanding AP. See #17.

**Aggregate metrics are structurally incapable of detecting that.** A scenario that occurs in
~2% of games and always loses moves a mean by ~2% of one metric — far inside the noise bands
measured above. The experiment answered "does this change the average?" (no) when the question
was "does this remove a dead end?" (unmeasured).

**One measurement that does bear on the rationale.** The Eosinophil's travel cost from the
bloodstream hub to organ tissue (step 0), on Hard, where the budget is 4 AP per turn:

| | Travel | Full kill sequence for one lodged worm |
|---|---|---|
| `branch:3` | **4 AP** | 4 travel + 1 produce + 1 coat + 2 degranulate = **8 AP** (2.00 turns) |
| `branch:4` | **5 AP** | 5 travel + 1 produce + 1 coat + 2 degranulate = **9 AP** (2.25 turns) |

At `branch:4` the travel *alone* (5 AP) exceeds a full turn's budget on Hard, so the Eosinophil
cannot reach the Brain in one turn no matter what else is sacrificed. At `branch:3` it costs
exactly one turn's AP. That is a threshold effect, not a gradual one, and it is invisible to
every metric in the panel above.

**The correct record: no effect on the average; the tail case the change targeted was not
measured.** Whether a reachable line of play now exists is added as a B5 scripted scenario
(`docs/TASK_B_PLAN.md` §1.4c).

Two further notes worth keeping:

- The equivalence rig **does** detect `branch:3 → 4` immediately, as a per-action state
  divergence. **Per-action equivalence is far more sensitive than aggregate balance metrics** —
  which is exactly why Task B gates on the former, and why the metric panel is layered behind
  it rather than instead of it.
- The bot plays 6 of 14 seats, so its insensitivity to a rule change is weak evidence about
  human play in either direction.

---

## Task E metrics — what a build gate can actually be built on

A win rate pinned at 0.0% cannot fall. As a build gate it is incapable of failing usefully,
and it would give false confidence. Measured across 20 batches × 100 games per difficulty:

| Metric | Training mean (sd/mean) | Normal | Hard | Verdict |
|---|---|---|---|---|
| `winRate` | 0.543 (10.2%) | 0.002 (200%) | 0.000 (—) | **Unusable** on Normal/Hard |
| `avgTurnsSurvived` | 15.73 (2.5%) | 11.05 (3.6%) | 8.83 (2.9%) | **Best gate** — tight everywhere |
| `avgLossTurn` | 14.33 (4.7%) | 11.02 (3.6%) | 8.83 (2.9%) | **Strong** |
| `trunkKillPct` | 0.886 (1.3%) | 0.956 (1.4%) | 0.949 (1.6%) | **Tightest of all** |
| `avgAntibodiesMade` | 20.46 (3.2%) | 19.61 (2.7%) | 15.11 (2.7%) | **Strong** |
| `avgKilled` | 15.80 (3.7%) | 8.69 (7.7%) | 7.30 (7.2%) | Good |
| `avgOrgansDamaged` | 0.97 (12.3%) | 2.07 (4.4%) | 2.27 (4.0%) | Good on Normal/Hard |
| `avgOrganHits` | 3.65 (10.2%) | 8.92 (6.1%) | 17.73 (7.1%) | Usable |
| `avgPresentations` | 9.17 (5.8%) | 4.52 (7.5%) | 3.82 (6.0%) | Usable |
| `avgInvadersLeft` | 4.63 (14.7%) | 19.18 (6.0%) | 52.90 (5.3%) | Noisy on Training |

**Recommendation.** Gate on a panel of four — `avgTurnsSurvived`, `trunkKillPct`,
`avgAntibodiesMade`, `avgOrgansDamaged` — at ±3 sd of a 100-game batch, requiring **two or
more** to breach before failing the build. One metric drifting is noise; two moving together
is a real engine change. Keep `winRate` as a *reported* number, never as a gate.

> ⚠️ **The four metrics were right. The band and the rule were not — see [#34](#34-the-metric-panel-design-proposed-in-this-file-does-not-work-measured-three-ways),
> corrected at E2.** Implemented exactly as written above, this gate detected neither an Action
> Point removed from every turn nor the Brain losing half its integrity. Three corrections, each
> forced by measurement: the band is ±3 sd of the **arm mean**, not of one batch; its width is
> **measured from K independent arms**, not derived as sd/√batches, which understates it by up to
> 1.5×; and the failure rule gained a second arm, **any one metric past ±6σ**, because on Normal
> the AP change moves one metric by 14σ and none other. The table above is still the reason these
> four were chosen; it is not the specification of the gate.

**Frame these as detecting ENGINE CHANGE, not as measuring difficulty.** The bot cannot
measure difficulty — finding #1 is the proof — and the metric names should not imply
otherwise. What this panel answers is "did the rules change under us?", which is a genuinely
useful question and the one CI can act on.

Sensitivity is honest about its limits: this panel did **not** detect `brain branch:3 → 4`.
A metric panel is a coarse net, and it is layered *behind* the per-action equivalence corpus,
not instead of it.

---

## 3. `stats.arrivals` and `stats.gotThrough` accumulate `NaN`

`tally()` (`v2_engine.js:1470`) returns the raw invader type for anything that is not a
bacterium — `worm`, `toxin`, `venom`, `fungus`, `malaria`, `parasite`. But both counters are
initialised (`:616`) with only four keys:

```js
arrivals:{virus:0,hidden:0,bacteriaTagged:0,bacteriaUntagged:0}
```

So `g.stats.arrivals["toxin"]++` evaluates `undefined + 1` → `NaN`, and it stays `NaN`.

Reproduced on Hard, turn 3: `arrivals.toxin === NaN`.

**Impact is narrower than it first looks.** `viewState()` does not expose `stats`, so play is
unaffected. Critically, **`simulate()` does not read `arrivals` or `gotThrough` either** —
verified both textually (no reference to either name in the `simulate` function body) and
empirically (no `NaN` in any field of `simulate()`'s output across 3 × 150 games). Its
outputs derive from `killedTrunk`, `killedBranch`, `organHits`, `failures`, `won` and `lost`,
all of which are plain counters.

**So Task E's win-rate figure is not measuring garbage.** Any *future* statistic broken down
by pathogen type would be.

**Disposition:** port bug-for-bug through B5. Fix afterwards as an isolated commit with the
corpus re-run showing exactly which states changed. This is also the lookup that
`noUncheckedIndexedAccess` will flag at B7, where `!` is banned by convention — the
bug-preserving spelling gets decided there, in the open, rather than guessed now.

---

## 4. The antigenic-variation mechanic can never fire

`DECK_MASTER` has exactly one card with `variant:true`:

```js
{dz:"Sleeping sickness",type:"parasite",lane:"bite",variant:true}
```

The coat-changing roll lives in the `neutralise` action at `:1092`. But `neutralise` rejects
anything that is not a virus, toxin, or blood/sporozoite-stage malaria at the `ok2` check on
`:1082` — two lines earlier. `parasite` never gets past it. Verified:

```
canNeutralise   = false
neutralise      = {"ok":false,"error":"Antibodies cannot neutralise that."}
```

So the d6 coat-change, the antibody loss, and the in-game explanation of *why sleeping
sickness has no vaccine* are all unreachable in play.

**This is the highest-value finding in the file.** It is not a coding defect — it is a piece
of Kartik's designed, scientifically-motivated content that silently does not reach the
table. Antigenic variation is a real and important immunological idea and the game currently
teaches it only in text that never appears.

**Disposition:** port the dead branch exactly as it is. Whether the mechanic should be made
reachable — and if so, how, without breaking the "worms and parasites must be coated, then
struck" rule that gives EUK pathogens their identity — is a design conversation with Kartik,
not a port decision.

---

## 5. A resident macrophage can never act from its starting position

Established while auditing the bot (§1.2), but it is a property of the GAME, not of the bot.

Every resident starts at `step:0` — "at the organ itself" (`v2_engine.js:625`).
`residentEatable()` (`:1259`) requires an invader on the resident's own step. But an invader
that reaches branch step 0 is handled as an *arrival* within the same `resolveSpread`: it
damages the organ and is filtered out of `g.invaders` (`:1519`-`:1522`). So during a command
phase nothing eligible is ever standing on step 0.

The three things that *do* persist at step 0 are all ineligible for `residentEatable`:

| Persists at step 0 | Why it cannot be eaten |
|---|---|
| A lodged worm | Type `worm` — not in the eligible set (virus / tagged bacteria / blood- or sporozoite-stage malaria) |
| Liver-stage malaria | Stage `liver`, not `blood` or `sporozoite` |
| Kala-azar inside the macrophage | Type `parasite`, and `r.infectedBy` disables the resident outright |

Measured: **0 eatable targets across 37,828 organ-turns.**

A resident must first be repositioned with `resmove` (1 AP) onto a branch step where invaders
are actually marching. That is a legal and presumably intended line of play — Shantanu and
Kartik win regularly, so human players are evidently doing it — but the default position is
strictly inert.

### It is a gap in the PHYSICAL game too, not only the app

Checked against `docs/Immunity_Wars_Rulebook_v3_1.docx`, `Immunity_Wars_Quick_Reference_v3.docx`
and `Immunity_Wars_Study_Packet_v3_1.docx`.

Every rule involved is stated correctly and individually. It is the *combination* that is never
drawn out, and three separate surfaces imply the opposite:

| Source | Text | Problem |
|---|---|---|
| Rulebook, setup | "Place one resident macrophage token in each of the seven **organ boxes**." | Starts it on the one space where it can never act |
| Rulebook, action table | Engulf — free, once per turn — "Destroy one virus or coated bacterium **on its space**." | True, but on the starting space the set of eligible targets is permanently empty |
| Rulebook, strategy tips | "…tells you how many turns you have and which resident macrophage is **already in position**." | The opposite of true. It is not in position; it is on the one space that cannot work |
| Study packet | "They are the local police force, **already in position before anything arrives**." | Reinforces the same wrong mental model, in the teaching material |
| App tooltip (`v2_ui.html`) | "Patrols the {Organ} only; never leaves. **Eats one virus or tagged bacterium here each turn.**" | States as fact something that never happens from the default position |

The app does eventually tell you — but only *after* a failed tap: *"Nothing here this resident
can engulf. Move it onto a virus or a tagged bacterium in its own organ."* A player learns this
by bouncing off it, and a player at a table with the printed board never learns it at all.

**Nowhere in any of the five surfaces is it stated that the resident must be moved off the
organ box before its free engulf can ever do anything.**

**Disposition: report only, and it is a design conversation, not a bug fix.** Several shapes it
could take — the resident could start on branch step 1; Patrol could be free for the first step;
or the rulebook could simply say it. That is Kartik's call. The port reproduces the current
behaviour exactly.

---

## 6. There is no standalone balance-sim harness

`docs/PHASE1_BRIEF.md` §2 describes `tools/balance-sim/` as "existing simulation harness,
promoted to a test". **The directory is empty.** There is no separate harness: the simulator
is `simulate()` inside `v2_engine.js:1616`, and its decision-making bot is inlined in the
same function body.

Two consequences.

**Task E inherits less than the brief assumes.** The harness has to be built, and the bot
has to be either reproduced outside the engine or driven through `simulate()` itself.

**The measured number is bot-conditional, and must always be reported that way.** There is no
"the win rate" for this game. There is only *the win rate achieved by a specific automated
player*. Finding #1 shows how much that distinction matters — the same engine reads 0% or
some higher number depending entirely on how well the bot plays.

**Required wording, for Task E and for anything downstream of it including the grant
write-up:**

> Win rate under the reference bot, vN, at N games per difficulty.

Never "the win rate of the game". A reader who takes a bot-conditional figure as a
statement about human play will draw a false conclusion, and that is exactly the kind of
overclaim to funders that `CLAUDE.md` forbids.

---

## 7. `SPAWN` is a dead knob

`let SPAWN=1` (`:241`) is assigned by `setKnobs` (`:372`) and **never read**. `spawnCount()`
consults only `SPAWN_MODE`. `setKnobs({spawn:3})` therefore does nothing at all.

(`setKnobs`'s `heal` branch is a separate matter — see [`DEVIATIONS.md`](DEVIATIONS.md) #1.)

---

## 8. Seven `FLAGS` entries are never read

Declared in `FLAGS` (`:373`) and merged into `g.flags`, but never consulted anywhere in the
engine:

`organs` · `residents` · `primeResident` · `heartOrgan` · `fungus` · `worms` · `eosinophil`

They are still exposed through `viewState().flags`, so a UI could offer a toggle that
silently does nothing. Behaviour-neutral today. Worth pruning in Phase 2, once the UI that
would read them exists.

---

## 9. `spec_test.js` cannot run

It reads `__dirname + "/spectator.html"`. That file was moved to `tools/legacy/stale/` when
the pre-brain-fix builds were quarantined, so the path no longer resolves.

**Leave it broken and do not repoint it.** If it were repointed at
`stale/spectator.html` it would assert against a `branch:4` build — rules that no longer
exist. It is unusable as a port oracle either way, because it tests DOM rendering with the
engine faked out. Noted in `tools/legacy/stale/README.md`.

---

## 10. Stale assertion label in `feedback_0723_test.js`

```js
ck("1 brain = 4 marches", G.branchLen("brain")===3 && G.branchLen("lungs")===3);
```

The **assertion is correct** for the current rules. The **label is wrong** — a leftover from
before the brain fix, and it reads as a direct contradiction of what it checks.

`tools/legacy` is read-only, so this is not edited in place. When this assertion is ported
in Task B it gets a correct name and a comment recording that the original label, not the
assertion, was the stale part. Anyone who "fixes" the assertion to match its label will
reintroduce `branch:4`.

---

## 11. Assorted dead code

- **`PAIR`** (`:53`) — superseded by `LYMPH_GROUP` / `lymphPartners`. Unreferenced.
- **`fireRare(g,key,extra)`** (`:300`) — the `extra` parameter is never used.
- **`abTotal`, `hasAb`, `capFor`, `g.antibodies`** — Tier-A leftovers from before per-family
  antibody pools. `g.antibodies` never leaves `0`, but `viewState()` still ships it and
  `capFor()` still computes a cap for it.
- **`apOwnerOf`** (`:844`) — defined and never called, in legacy or the port.

**Confirmed dead in LEGACY too, by measurement rather than by reading.** `abTotal`, `hasAb` and
`apOwnerOf` are three of the five functions the entire test suite never executes, and grepping
`tools/legacy/v2_engine.js` finds **exactly one reference to each — the definition**. None of
the three is in `module.exports`, so they are not merely unused by the port: they are
unreachable from anywhere, and have been for as long as the file has existed.

They are excluded from the coverage denominator under rule B, with that grep as the
demonstration — see [`COVERAGE_EXCLUSIONS.md`](COVERAGE_EXCLUSIONS.md).
- **Duplicated exports** — `macrophageEatable`, `snipeTargets` and `rateForFam` each appear
  twice in `module.exports` (`:1767`). 70 entries, 67 unique. Harmless in JS; the port
  exports each once.

---

## 12. Four engine internals the bot needs are not exported

Not a defect, but it shapes the test rig. `simulate()`'s bot uses `samePlace`, `placeDist`,
`apNow` and `canAct`, none of which are in `module.exports`. A harness-side bot must
reimplement them.

This is fine, because **the harness bot is a sequence generator, not a behaviour oracle** —
its job is to produce long legal action sequences, and the recorded sequence is what gets
replayed. Fidelity to `simulate()`'s own bot matters only for the `simulate()` equivalence
check at B6, and there both engines run their *own* internal bot, so no reproduction is
needed.

---

## 13. Pathogen X works by falling through two lookup misses

Found at the B1 checkpoint, by a consistency check that failed for the right reason.

`Pathogen X` is the only card in `DECK_MASTER` with **no `TROPISM` entry and no `FAMILY`
entry**. Both absences are load-bearing:

| Lookup | Result | Effect |
|---|---|---|
| `TROPISM["Pathogen X"]` | `undefined` | `rollOrgan` hits `if (list === "any" \|\| !list) list = g.organList.slice()` and the novel pathogen becomes a **generalist that can target any organ in play** |
| `FAMILY["Pathogen X"]` | `undefined` | Unreachable in practice — `famOf` short-circuits on `iv.novel` and returns the `X` pool before it consults `FAMILY` at all |

The tropism behaviour is almost certainly intended: a germ the body has never met should be
able to go anywhere. But it is **implicit**, achieved by omission rather than by writing
`"Pathogen X": "any"`, and nothing in the source says so.

**Why this matters more than it looks.** `noUncheckedIndexedAccess` (B7) will flag both of
these lookups, and the obvious "fix" — treating a missing tropism as an error, or defaulting
it to a single organ — would silently change what Pathogen X does. The `FAMILY` miss is worse:
it is currently unreachable, so a wrong fix there would pass every test until some future
change dropped the `novel` flag, at which point the novel pathogen would quietly become an
ordinary `EXB` bacterium.

**Disposition:** port as-is, and both misses are now pinned by tests in
`tests/equivalence/src/data.test.ts` so B7 has to make the decision deliberately rather than
by accident.

---

### What B7 actually did about it: NOTHING, and that is the finding

`noUncheckedIndexedAccess` was enabled at B7 expecting it to force this decision into the open.
**It did not flag this lookup at all.** The reason is worth stating plainly, because it is a
limit of the tool rather than an oversight:

```ts
return iv.novel ? 'X' : (FAMILY[iv.disease] ?? 'EXB');
```

That `?? 'EXB'` is **mandatory** — legacy has `|| "EXB"` and a bug-for-bug port must reproduce
it. So the fallback that makes the port *correct* is the same fallback that makes the compiler
*silent*. Deleting it does produce an error —

```
TS2322: Type 'FamilyKey | undefined' is not assignable to type 'AbPoolKey'
```

— which is the only way to see the lookup at all, and doing so would break equivalence.

**The danger here is not an unhandled miss. It is a HANDLED miss whose handling is wrong for
exactly one card.** No type system will ever say so, because from the compiler's point of view
`?? 'EXB'` is a complete and correct answer. It is only wrong because Pathogen X is not a
bacterium.

### The consequence, pinned by test

`tests/equivalence/src/pathogen-x.test.ts` demonstrates what is actually at stake, rather than
asserting the lookup shape:

| | `famOf` | Player holding 3 EXB antibodies, no clone found |
|---|---|---|
| `novel: true` | `X` | **Blocked** — *"This antigen is BRAND NEW… Run CLONAL SELECTION"* |
| flag lost | `EXB` | **Destroyed outright.** Clonal selection never happens |

Pathogen X exists to teach clonal selection: a germ your body has never met, against which no
antibody you own fits, so you must spend AP searching millions of receptors before you can make
anything. Lose the `novel` flag anywhere along the path — `makeInvader`, the draw, the
co-infection event, a future content loader, a JSON round-trip that drops a `false`-y field —
and an EXB antibody you happened to be holding for an unrelated bacterium simply kills it. The
card still appears; the lesson silently does not.

**Every existing test would still pass.** That is why the consequence is pinned rather than the
mechanism.

**Disposition: unchanged, and deliberately so.** The fix is one line in `content` — add
`"Pathogen X": "EXB"`… which would be *wrong*, or a dedicated sentinel, which is a design
decision about what a novel antigen's class even means. It is Task C's problem, where the
tables move behind a Zod loader and the schema can require every `DECK_MASTER.dz` to have a
`FAMILY` entry or an explicit, documented exemption.

---

## 14. The three worm safeguards — all verified, all holding

Shantanu asked for these to be verified rather than assumed, on the grounds that this project
has already found one silently disabled guard. All three hold.

| Safeguard | Verdict | Enforced by | Evidence |
|---|---|---|---|
| Never more than one worm spawns in a turn | **HOLDS** | `WORM_MAX_PER_TURN = 1` and `g.wormsThisTurn`, checked in `wormAllowed()` and applied by `respectWormCap()` | max observed 1, across 1,200 games (573 of which contained a worm) |
| Worms do not multiply inside the body | **HOLDS** | Type gates on every duplication path | 0 worm ids unaccounted for by a spawn, across 1,200 games |
| Never more than two worms in a whole game | **HOLDS** | `WORM_MAX_PER_GAME = 2` and `g.wormsSpawned` | max observed 2, same 1,200 games |

**Why "worms do not multiply" holds, structurally.** There are exactly three places the engine
duplicates an existing invader, and a worm can reach none of them:

| Duplication path | Gate | Can a worm reach it? |
|---|---|---|
| Bacterial division | `iv.type === "bacteria"` | No — type gate |
| Lytic burst | operates on `type === "hidden"` | No — type gate |
| Hard-mode lymphatic spread | `iv.zone === "route"` | **No** — `makeInvader` always places a worm at `zone:"branch"`, at every difficulty. Measured: a worm was observed on a route **0 times** in 900 games |

The third is the only one not protected by an explicit type check, so it is the one worth
recording: worms are safe from it by placement, not by intent. If a future change ever let a
worm start or travel on a route, hard-mode lymphatic spread would clone it and the safeguard
would fail silently. Worth a scripted scenario at B5.

**Every spawn path is guarded.** The infection draw, the reinfection draw, and the
`coInfection` crisis event all route through `respectWormCap()` before `makeInvader()`, and all
call `noteWorm()` afterwards. The rare events that inject invaders directly (`tbReactivation`,
`postFluPneumonia`, `shingles`, `malariaRelapse`) create bacteria, hidden viruses and malaria —
never worms.

**One bypass, by design, with a wrinkle.** `forceInjectType()` and `forceInjectCard()` ignore
the caps deliberately — they are the testing tool, and `docs/FINDINGS.md` treats that as
intended. The wrinkle is that they also **do not increment `wormsSpawned`**, so a forced worm is
invisible to the accounting: after forcing three worms, a fourth can still arrive naturally.
Harmless for a test tool, but it means "worms in play" and "worms spawned" can disagree, and
anything that ever reads `wormsSpawned` as a count of worms present would be wrong.

---

## 15. The Heart has the shortest branch on the board, and fails first most often

| Organ | Branch length | Integrity | Share of first organ failures (bot, 400 games/difficulty) |
|---|---|---|---|
| **Heart** | **2** | 3 | **25% Normal · 34% Hard** — the most common on both |
| Brain | 3 | **2** | 18% Normal · 20% Hard |
| Every other organ | 3 | 3 | 7–18% |

The Heart is the only organ with a 2-step branch. Every other organ, including the Brain, is 3.
That means an invader turning down the Heart branch reaches tissue **one full turn sooner** than
anywhere else, and a defending cell needs one less AP to get there but has one less turn to
decide to.

This is consistent and large: the Heart is the most common first-failure organ at every
difficulty the bot plays, ahead of the Brain, which has the lowest integrity on the board.

**This is a design question for Kartik, not a defect.** Is the Heart intended to be the most
fragile organ in play? There is a defensible reading either way — endocarditis and rheumatic
fever are genuinely fast and genuinely devastating, and the Heart being close to the
bloodstream is anatomically honest. But the rulebook's own strategy section warns players about
the *Brain* ("Watch the Brain. It has only 2 integrity") and says nothing about the Heart,
which suggests the Heart's fragility may not be deliberate.

**Report only. Nothing changed.** Note the interaction with finding #2: the Brain's branch was
shortened from 4 to 3 to open up counterplay, and the Heart has been at 2 throughout.

---

## 16. `forceInject*` bypasses the worm caps, and also the accounting

`forceInjectType()` and `forceInjectCard()` deliberately ignore `respectWormCap()` — they are
the director's testing tool, the bypass is intended, stated in the source comment, and covered
by an existing legacy test ("Force still injects a worm past the cap").

The part that is **not** intended, and is documented nowhere, is that they also never call
`noteWorm()`. So a forced worm does not increment `g.wormsSpawned` or `g.wormsThisTurn`.

Two consequences:

- **Forced worms are invisible to the cap.** Force three worms into a game and a fourth can
  still arrive naturally, because the counter still reads 0. The bypass is therefore wider than
  "ignores the cap once" — it leaves the cap mis-calibrated for the rest of that game.
- **`wormsSpawned` is not a count of worms.** Anything reading it as one is wrong in any game
  where the director tool was used. Nothing does today.

**Why record a dev-only path at all.** It is exactly the shape that makes a future measurement
quietly wrong: a Task E run or a playtest capture taken from a session where someone forced a
worm would carry worm statistics that disagree with the board, with nothing flagging it. The
cost of knowing is one paragraph; the cost of not knowing is an unexplained number months later.

**Disposition: report only.** Ported as-is. If it is ever fixed the fix is one `noteWorm(g)`
call in each function — but that changes behaviour, so not during Task B.

---

## 17. The brain lane change restored one turn of slack — and no aggregate metric could see it

The clearest evidence yet for why the B5 scripted scenarios exist alongside the statistical
corpus, so it is recorded as its own finding rather than left buried inside #2.

**The measurement.** Eosinophil travel from the bloodstream hub to organ tissue (branch step 0),
on Hard, where the entire turn budget is **4 AP**:

| | Travel | Produce | Coat | Degranulate | Total | Turns at 4 AP |
|---|---|---|---|---|---|---|
| `branch:3` | **4 AP** | 1 | 1 | 2 | **8 AP** | 2.00 |
| `branch:4` | **5 AP** | 1 | 1 | 2 | **9 AP** | 2.25 |

**What the change actually did — corrected at B5, and the smaller claim is the true one.**

> `branch:3` restored **one turn of Eosinophil slack**. It did NOT convert an unwinnable state
> into a winnable one.

This is stated precisely because Kartik may be asked it by a judge, and the accurate version is
the defensible one. Earlier drafts of this file said the change "removes an unwinnable state".
That was too strong, and B5 measured the difference.

**Why the correction.** The B5 reachability scenario builds the state directly — two Tapeworms
lodged at the Brain on Hard — and finds a **line of play that saves the Brain at full integrity**
(`tests/equivalence/src/reachability.test.ts`, "ANSWER: a line EXISTS at branch:3"). The line
turns on a fact that is easy to miss: both worms lodge at branch step 0, so they occupy the SAME
space, and one Eosinophil positioned there can strike both without moving again.

Run the same arithmetic at `branch:4` and the state is *still* survivable on an otherwise quiet
board — it just costs a turn more, because travel becomes 5 AP against a 4 AP budget and cannot
be done in one turn no matter what else is sacrificed.

**So what `branch:3` buys is surviving that state WHILE SOMETHING ELSE IS ALSO HAPPENING** — which
is the real game, and is exactly the margin an isolated scenario cannot measure and an aggregate
metric cannot see either.

| | Eosinophil travel, hub → Brain tissue | Turns at Hard's 4 AP |
|---|---|---|
| `branch:3` | **4 AP** | 1 — the whole budget, but it fits |
| `branch:4` | **5 AP** | 2 — cannot be done in one turn at any skill level |

**What the statistics said about the same change: nothing.** 10 batches × 100 games per
difficulty, identical seeds in both arms, ten metrics — **no metric moved beyond 2 standard
deviations at any difficulty.** Not win rate, not loss turn, not organ hits, not organs damaged.

**Why the metrics could not have seen it.** The scenario is rare — only Tapeworm has Brain
tropism among the seven worm cards, and the caps allow at most two worms per game — and the
quantity that changed is a *margin*, not an outcome. A shift in how much slack a rare state
leaves you moves a mean by far less than its own frequency, which is already inside the noise
band of every metric measured. **A metric panel averages over exactly the tail it needs to
detect.**

### The methodological point

| Layer | Detects | Blind to |
|---|---|---|
| Per-action equivalence corpus | Any state divergence, immediately — it catches `branch:3 -> 4` on the first affected action | Anything about *design*; it only says the two engines agree |
| Metric panel (Task E) | Broad shifts in how games go — the average game getting harder or easier | Rare binary outcomes; threshold effects; anything below the noise band |
| **Scripted scenarios (B5)** | **Reachability. Whether a specific bad state has a way out** | Anything nobody thought to script |

None of the three subsumes the others, and this finding is the concrete case: the equivalence
rig detects the change, the metric panel cannot, and only a scripted scenario can answer the
question that motivated it.

**Consequence for reporting.** When Task E's metric panel comes back green, the correct
statement is "no broad shift detected" — never "the change was safe". Those two differ by
exactly this finding.

---

## 18. Degranulate costs half the Brain to use, so it may never be worth using there

Found while building the B5 reachability proof for #17.

`degranulate` deals 3 damage — enough to kill a 3-HP worm outright — and then:

> the granule blast also burned the **{Organ}** — integrity −1

**The Brain has 2 integrity, the lowest on the board.** So degranulating to save the Brain
immediately costs half the Brain. Against two lodged worms it is close to self-defeating: you
spend one of your two points of Brain integrity to remove one of the two threats to it.

The measured alternative is strictly better there. An Eosinophil *strike* is 2 damage for 1 AP
and does **no** organ damage, so two strikes (2 AP) kill a 3-HP worm without touching the organ,
versus degranulate's 3 damage for 2 AP plus 1 integrity. Degranulate's only advantage — killing
in a single action — is worth less than a point of Brain.

### This is not a bug, and the biology is right

Eosinophil degranulation genuinely damages host tissue. That is why parasitic infections cause
chronic inflammation and scarring, and the rulebook already teaches it:

> Eosinophil granules are indiscriminate poison. Killing a parasite inside tissue damages that
> tissue — which is why degranulating should feel like a decision rather than a free hit.

The mechanic is doing exactly what it was designed to do. The question is narrower.

### The design question for Kartik

**Given the Brain has only 2 integrity, is degranulate ever the right play there — and is that
intended?** Three readings, all defensible:

1. *Intended and good.* The Brain is meant to be the organ where your most powerful tool is
   unavailable. That is a strong, memorable lesson about immune privilege.
2. *Intended but invisible.* Players may never work out that strike-twice beats degranulate at
   the Brain, in which case the lesson is not being taught, only enforced.
3. *Unintended.* The organ-damage rule was written for 3-integrity organs and the Brain's 2 was
   set separately, so the interaction may simply never have been considered together.

**Report only. Nothing changed.** Related: #15 (the Heart's 2-step branch) is the same shape —
two individually sound numbers interacting in a way that may not have been designed.

---

## 19. The lytic-cycle array spread is defensive, not load-bearing

A negative control that correctly found nothing, recorded because "we tried to break it and
could not" is a result rather than a non-event.

`resolveSpread` snapshots the invader list before the lytic cycle:

```js
const pre = [...g.invaders];
```

Replacing that with a plain alias (`const pre = g.invaders`) diverged on **zero games** across
the full corpus. The reason is that the only mutation to `g.invaders` between the two uses of
`pre` is a **reassignment** —

```js
g.invaders = g.invaders.filter(x => !burst.has(x.id));
```

— which detaches the alias anyway, so `pre` keeps pointing at the pre-burst array either way.

**It becomes load-bearing the moment anything in that phase mutates the array in place**
(`splice`, or `push` without a preceding reassignment). The copy therefore stays, and the
reasoning is a comment at the site in `packages/engine/src/spread.ts` rather than folklore.

This is the same shape as #14: a property that currently holds for a reason nobody wrote down.
The difference is that this one is cheap to keep true, so it is kept rather than pinned.

---

## 20. `returnAP` does not validate its pid, and can write NaN into the AP budget

**Found by the compiler at B7**, not by any test — which is the entire argument for enabling
`noUncheckedIndexedAccess`.

`allocateAP` validates its target:

```js
if(!g.players || !g.players.includes(to)) return err("Unknown player.");
```

`returnAP` has no equivalent check. An unknown or stale pid therefore reaches the arithmetic
with no entry in `g.apBudget`, and the guard lets it through whenever `amount` is 0:

```js
if((g.apBudget[from]||0) < amt) return err("You don't have that much AP to return.");
//  (undefined || 0) < 0   is   false   -> falls through
g.apBudget[from] -= amt;   // undefined - 0  ->  NaN
```

Verified against legacy:

```
returnAP{pid:'ghost', amount:0}  ->  {ok:true}
apBudget after                   ->  {P1:4, P2:0, ghost:NaN}
```

### Why this is not purely theoretical

`apBudget` is exposed through `viewState()`, so the NaN reaches every client and renders. And
pids in multiplayer come from the **relay**, not from trusted local code — a reconnecting player
with a regenerated pid, or a stale client retrying a `returnAP` after the turn moved on, is
exactly how an unrecognised pid arrives.

The damage is contained rather than catastrophic: `apAvail()` reads
`g.apBudget[pid] ? ... : 0`, and NaN is falsy, so it yields 0 rather than propagating. The
visible symptom would be a garbage AP value in the UI for a player nobody recognises.

### It shipped, people played it, and no test found it — the compiler did

This bug is in `tools/legacy/v2_engine.js`, which is the engine inside every build that has been
played: `immunity-wars-v2.html`, `public/index.html`, the LAN server. It has been reachable in
multiplayer the whole time.

Fourteen legacy test suites did not catch it. Neither did the equivalence corpus, and the corpus
*could not have* — it is single-player and never issues `returnAP`. It was found by
`noUncheckedIndexedAccess` pointing at `g.apBudget[from] -= amt` and asking what happens when
that lookup misses.

That is the entire argument for the flag, made concrete: it does not find bugs by running the
code, so it is not limited to the paths the tests happen to reach.

**Disposition: FIXED** — [`DEVIATIONS.md`](DEVIATIONS.md) #4. Originally deferred to Phase 3;
Shantanu called it as reachable-in-shipped-code and therefore worth fixing now, with confined-
change evidence. Zod validation at the network boundary (`docs/PHASE1_BRIEF.md` §6, seam 7)
remains the better long-term home for the check, and this fix does not remove the need for it.

---

## 21. The `tag` action's novel-antigen guard can never fire

Found by the B-gate coverage measurement, in the same family as #4 (antigenic variation) and
#13 (Pathogen X's missing FAMILY entry): defensive code for a case the deck cannot produce.

`tag` refuses an uncoated pathogen when the player has not yet found the novel clone:

```js
if(f==="X" && !g.cloneFound) return err("Brand-new antigen — no antibody fits it yet. Run CLONAL SELECTION first.");
```

But `f === 'X'` requires `iv.novel`, and `tag` only accepts `bacteria`, `worm` or `parasite`
two lines earlier. **The only card in `DECK_MASTER` carrying `novel` is Pathogen X, which is a
`virus`** — so a novel invader can never reach this line at all.

The equivalent guard in `neutralise` *is* live, because `neutralise` accepts viruses.

**Disposition: port as-is.** It costs nothing, it is correct if a novel bacterium is ever added,
and removing it would be a behaviour change. Recorded because it is the third instance of the
same pattern, and the pattern is worth naming: **the engine carries defensive branches for
pathogen shapes the content tables do not contain.** Task C's Zod schema is where content and
code can finally be checked against each other.

---

## 22. PATTERN — the engine guards against states the content design makes impossible

Three separate findings turned out to be one thing, and naming it is more useful than the three
of them separately.

| # | Guard | Why it can never fire |
|---|---|---|
| **4** | `neutralise`'s antigenic-variation roll | The only `variant:true` card is Sleeping sickness, a **parasite** — and `neutralise` rejects parasites two lines earlier |
| **13** | `famOf`'s `FAMILY` lookup for Pathogen X | Pathogen X is absent from `FAMILY`, but `famOf` short-circuits on `iv.novel` first, so the fallback is never consulted for it |
| **21** | `tag`'s brand-new-antigen refusal | `f === 'X'` needs `iv.novel`, but `tag` only accepts bacteria / worm / parasite and the only novel card is a **virus** |

And the coverage measurement found three more of exactly the same shape:

| Guard | Why it can never fire |
|---|---|
| `neutralise`'s malaria-in-liver refusal | The `ok2` type gate rejects liver-stage malaria first |
| `neutralise`'s `inMac` refusal | Only Kala-azar sets `inMac`, and it is a parasite, rejected by `ok2` first |
| `draw`'s `if (c.novel)` | `newGame` filters novel cards out of the deck entirely; the novel pathogen is injected on its own turn |

**Six guards, one cause.** In every case the code defends against a combination of `type` and
some flag that the **content tables cannot produce**. The rule is written correctly and
generally; the deck simply contains no card that satisfies it.

### Why this is not obviously wrong

Each guard is correct *as a rule*. If a novel bacterium were added tomorrow, `tag`'s refusal
would start firing and would be right to. Defensive breadth in a rules engine is not a defect,
and deleting these would make the engine more fragile to content changes, not less.

### Why it should still be known

Three consequences, in increasing order of importance:

1. **Coverage cannot reach 100%,** and never will while the pattern persists. This is roughly
   half the reason the original ≥95%-of-all-arms gate was unreachable
   ([`TASK_B_CLOSEOUT.md`](TASK_B_CLOSEOUT.md) §4).
2. **A guard that never fires is never tested,** so nobody knows whether it is right. #13 is the
   proof: its handling is *wrong* for the one card it concerns, and no test could have said so
   because the path is unreachable.
3. **The content tables and the code disagree about what is possible, and nothing checks.** The
   engine believes a novel bacterium could exist. `DECK_MASTER` says otherwise. Neither
   statement is written down; both are inferred.

### What Task C should do about it

Task C moves the tables to `packages/content/` behind a Zod loader, which is the first point
where content and code can be checked against each other rather than assumed compatible. Two
things worth building into that schema:

- **Require every `DECK_MASTER.dz` to have a `FAMILY` entry, or an explicit documented
  exemption.** That is #13's real fix — enforcement at the boundary rather than a fallback that
  guesses `EXB`.
- **Emit the reachable `(type, flag)` combinations the deck actually contains,** so a guard
  against an impossible combination is visible at build time instead of being discovered by a
  coverage run months later.

**Report only. Nothing changed.** Whether any of these guards should become reachable — a novel
bacterium, a virus with antigenic variation — is a design conversation with Kartik, and a
genuinely interesting one: each unreachable guard is a piece of immunology the engine already
models but the deck never asks it to demonstrate.

**#23 is this same finding pointing the other way.** See below.

---

## 23. `Diphtheria toxin` is content the engine can never produce

Found at the Task C planning stage, while measuring whether the `?? 'EXB'` fallback in `famOf`
would become unreachable once a schema required every `DECK_MASTER.dz` to have a `FAMILY` entry.
It would not — and the measurement turned up this instead.

`'Diphtheria toxin'` carries a full pair of content entries:

```js
FAMILY["Diphtheria toxin"]  = "TOX"
TROPISM["Diphtheria toxin"] = ["heart"]
```

**Nothing can create it.** It appears in `tools/legacy/v2_engine.js` exactly **twice** — those two
table entries, and nowhere else. There is no card, no rare event, and no emission path:

| Could it arrive? | No, because |
|---|---|
| Drawn as a card | Not in `DECK_MASTER`. The deck's Diphtheria card is `{dz:"Diphtheria", type:"toxin"}` — the disease *is* the toxin |
| Emitted by a toxin-maker | `TOXIN_MAKERS` has three entries: Tetanus → *Tetanus toxin*, Cholera → *Cholera toxin*, Gas gangrene → *Clostridial toxin*. Diphtheria is not among them, and could not be: it is already type `toxin`, and only `bacteria` emit |
| Injected by a rare event | The four injecting rare events create bacteria, hidden viruses and malaria. None creates a toxin |

So the row is inert. Nothing reads it, nothing writes it, and no game can contain it.

### Why record a dead table row at all

Because it is **[#22](#22-pattern--the-engine-guards-against-states-the-content-design-makes-impossible)
in mirror image, and the root cause is the same one.**

| | Direction | Example |
|---|---|---|
| **#22** | The **engine** defends against states the **content** cannot produce | `tag` refuses a novel bacterium; no novel bacterium exists |
| **#23** | The **content** declares a pathogen the **engine** cannot produce | `Diphtheria toxin` has a family and a tropism; nothing mints it |

**One cause: nothing checks the two directions against each other.** The engine's beliefs about
what content is possible, and the content's beliefs about what the engine will ask for, are both
inferred and neither is written down. #22 said so about the first direction. This is the second,
and it was found the same way — by a consistency check run for a different reason.

### The measurement that surfaced it

```
FAMILY has 106 entries; DECK_MASTER has 97 cards.
10 FAMILY entries have no deck card.
```

Nine of the ten are legitimate — the engine mints them at runtime: `Tetanus toxin`,
`Cholera toxin`, `Clostridial toxin` (from `TOXIN_MAKERS`), `Malaria (blood)` (a bursting
liver stage), and `Shingles`, `Dengue (ADE)`, `Malaria (relapse)`,
`Tuberculosis (reactivated)`, `Pneumococcal pneumonia` (from rare events).

`Diphtheria toxin` is the tenth, and the only one with no producer.

**This is also why the `?? 'EXB'` fallback in `famOf` is NOT an instance of #22 and is being
kept.** A schema over `DECK_MASTER` cannot make that fallback dead, because nine of the disease
names the engine actually handles are not cards at all — and legacy's `EXB` answer for a wholly
unknown disease is pinned by `tests/equivalence/src/data.test.ts`. It is documented behaviour
for an unknown input, not a guard against an impossible one.

### Disposition

**Report only. Nothing changed.** Whether the row should be deleted, or Diphtheria should emit
a separate toxin the way Tetanus and Cholera do, is a design question for Kartik — and the
second reading is the interesting one, because diphtheria toxin genuinely *is* a separate
secreted protein and is what the antitoxin treats, which is exactly the lesson the TOX class
teaches elsewhere.

**Task C acceptance criterion:** C4's `(type, flag)` reachability report must name
`Diphtheria toxin` **without being told about it**. It is a known-answer test for the generator.
If the generator misses it, the generator is wrong and the rest of its output cannot be trusted.

---

## 24. A MEASURING INSTRUMENT that was wrong in a region nobody was looking at

Found at C1, by auditing a classifier after it drifted — not by anything failing.

This is a **distinct variant of [#22](#22-pattern--the-engine-guards-against-states-the-content-design-makes-impossible)**,
and the difference is what makes it worth its own entry.

| | What is wrong | Why nobody noticed |
|---|---|---|
| **#22** | A **guard in the product** that can never fire | The path is unreachable, so no test can exercise it |
| **#24** | A **rule in the measuring instrument** that is wrong | The inputs it is wrong about never arrive at the output |

#22 is untested code. **#24 is an untested *test*** — and that is harder, because nothing
prompts you to check an instrument that is reporting plausible numbers.

### What it was

`coverage-gate.ts` sorts uncovered arms into the lists each phase inherits.
`docs/COVERAGE_DEFERRED.md`'s Phase 3 section **is the multiplayer to-do Phase 3 starts from**.
The classifier ended with:

```ts
(a.short === 'actions.ts' && a.line >= 82 && a.line <= 165)
```

Line numbers. At C1 an import merge shifted `if (g.phase !== 'command')` from 165 to 169 and it
silently left the multiplayer bucket. That drift is what prompted the audit.

### What the audit found — the actual finding

Old and new rules compared on **all 1,526 arms**, not just the ones that reach the output:

```
uncovered arms      170
old -> multiplayer   15
new -> multiplayer   15      NO disagreement on any UNCOVERED arm
disagreements        13      EVERY ONE a COVERED arm
```

**The published list was never wrong. The rule that produced it was wrong about 13 arms the
entire time**, and would have misfiled every one of them the moment it became uncovered:

- `case 'draw':`
- `if (a.action === 'undo') return undo(g)`
- `if (g.phase === 'command' && UNDOABLE.has(a.action)) pushUndo(g)`
- `if (g.phase !== 'infection' || !g.drawn) return err('Draw first.')`

None is remotely multiplayer. They qualified for one reason: they sat between lines 82 and 165.
**Coverage was hiding the defect.** Being covered kept them out of the deferred list, so the
wrong classification never surfaced — the instrument was broken in exactly the region its output
never reached.

### Why this is the hard case

A wrong answer nobody can see is indistinguishable from a right answer until the conditions
change. Here the condition is *"one of those 13 arms stops being covered"* — which is an ordinary
thing to happen, and at that moment Phase 3 would silently inherit a to-do item that is not
theirs, with the gate still green and still self-policing about everything else.

The three defences this project already uses would each have missed it:

| Defence | Why it misses this |
|---|---|
| The equivalence corpus | Measures the engine. This is a defect in the *rig* |
| The gate's own self-policing | Checks that exclusions are still dead, not that classifications are right |
| A green test run | The classifier has no test; its output is a generated document |

### Disposition

**FIXED at C1.** The classifier keys on lexical containment in a `g.multiplayer` block, derived
from the AST on every run, plus a case-insensitive vocabulary test. It cannot drift with line
numbers because it no longer reads them.

**The transferable lesson, which is why this is recorded rather than just fixed:**

> When an instrument is found to be wrong, do not only fix the case that exposed it — **audit
> the region its output never reaches.** A rule that is wrong about inputs nobody currently
> looks at is wrong; it is merely not yet visible. Compare old and new over the FULL input set,
> not over the outputs that happened to differ.

Related: [#14](#14-the-three-worm-safeguards--all-verified-all-holding), where the worm safeguard
holds by *placement* rather than by intent — a property true for a reason nobody wrote down. The
classifier was the same shape: correct output for a reason that had nothing to do with the rule.

---

## 25. An arm assumed dead turned out to be live — exclusion lists decay in BOTH directions

Found at C4, by accident, which is the part worth keeping.

Every other instance in this file runs one way: **a guard that never fires**. #4, #13, #21 and the
three more in #22 are all code defending against a state the content cannot produce. This one runs
the other way — **a guard everyone assumed never fires, that does.**

### What happened

`coverage-gate.ts`'s rule A excludes an uncovered arm whose source line contains `??` or
`|| <literal>`, on the class argument that `noUncheckedIndexedAccess` forces a miss handler where
the surrounding guard has already established presence. At C4 the count fell:

```
excluded (rule A)   96 -> 95        exclusions total  112 -> 111 of 120
uncovered coverable  61 -> 60       construct.ts        8 -> 7
```

The arm that left is `construct.ts:306`, inside `forceInjectCard`:

```ts
const card = (g.deck || []).find((c) => c.dz === dz) ?? DECK_MASTER.find((c) => c.dz === dz);
```

**It is reachable, and by a narrow path nobody had tested.** `newGame` filters novel cards out of
the live deck entirely, so force-injecting `Pathogen X` misses `g.deck` and takes the fallback —
which is exactly what the rewritten `pathogen-x.test.ts` does to build a novel pathogen in play.
The arm had sat on the exclusion list not because it was dead but because **no test had ever
force-injected a card that `newGame` removes.**

### CORRECTION to commit `8c73717`

That commit's message says the arm was `famOf`'s `?? 'EXB'`, made measurable by splitting the
ternary. **That is wrong.** It was asserted from the arm counts without reading the diff.
`famOf`'s fallback was already covered before C4 — by `data.test.ts`'s unknown-disease case — and
the line-number change to `primitives.ts` in that diff is only my new comment shifting `organsFor`
from line 89 to 116. The real arm is the `construct.ts` one above. Recorded here rather than by
rewriting history, on the same rule [`DEVIATIONS.md`](DEVIATIONS.md) uses.

### Why this matters more than one arm

**Rule A is the weakest evidence in the gate, and it is weak in a specific way.** Its own header
says so — "CLASS ARGUMENT, not per-arm proof" — but the practical consequence had not been drawn:

| | Rule A | Rule B |
|---|---|---|
| Evidence | One argument covering a *class* of arms | A demonstration per arm, executable in `demonstrate-dead-arms.ts` |
| Self-policing | **None.** An arm is excluded because it is uncovered *today* | The gate FAILS if a demonstrated-dead arm becomes covered |
| Failure mode | An arm silently sits on the list because nobody wrote the test that reaches it | Caught on the next run |

Rule B's self-policing check exists precisely because "provably dead" can be wrong. Rule A has no
equivalent, and rule A is where 95 of the 111 exclusions live.

**The list is not a snapshot of dead code. It is a snapshot of code no current test reaches** —
and those are different claims. Rule A's wording invites reading it as the first when it only
supports the second.

### The proposal, for Shantanu to decide

Full re-testing is not mechanisable: proving an arm reachable means constructing an input, which
is the same work as writing the test. But **the churn is free to report**, because the previous
list is already committed:

> Before overwriting `COVERAGE_EXCLUSIONS.md`, the gate reads the existing file and prints every
> arm that WAS excluded and is now COVERED — "the class argument was wrong for these" — instead of
> letting the list silently shrink inside a generated-file diff nobody reads.

That converts this accident into a standing signal, costs one file read, and mirrors rule B's
self-policing at the only point where rule A can be cheaply falsified. It would have reported this
arm by name at C4 rather than leaving it to be noticed.

It does **not** solve the general problem — an arm nobody has yet reached still looks dead — and
saying so is the point: it makes the list honest about being a coverage snapshot rather than a
proof of death.

**Disposition: report only; the churn check is a decision, not a change made unilaterally.** The
gate is a measuring instrument, and [#24](#24-a-measuring-instrument-that-was-wrong-in-a-region-nobody-was-looking-at)
is what happens when one is changed without care.

---

## 26. `rulesVersion` is documented on every state and message, and is on neither

Found at Task D planning, by grepping to confirm a rule before relying on it.

[`CLAUDE.md`](../CLAUDE.md) states, under Conventions:

> Every game state and network message carries `rulesVersion`.

**Neither carries it.** `rulesVersion` appears in `packages/content` and nowhere else:

| Where it is | Where the claim says it is |
|---|---|
| `packages/content/src/rules/pack.json` — the pack stamp | `GameState` — **no such field** |
| `packages/content/src/schema.ts:318` — validated as a string | `packages/protocol` — **20 lines total, a scaffold** |
| `packages/content/src/load.ts:110` — re-exported as `RULES_VERSION` | |

`load.ts:110`'s own comment reads *"Every state and network message carries rulesVersion (BRIEF
§3, seam 7)"* — sitting directly above the one place that does carry it, describing two places
that do not.

**This is the ninth documented-but-unenforced claim in this project**, and the same shape as the
`engine`-imports-`content`-types-only rule corrected at C1: a sentence that reads as a
description of the code and is actually a description of an intention.

### Why it is recorded and not fixed

The claim becomes true and testable at the point where a state or a message can genuinely
disagree with the engine reading it — a saved game reloaded by a newer build, or a relay message
crossing between two clients on different versions. `packages/protocol` is a 20-line scaffold and
`packages/server` is empty; Phase 3 is where both become real. Stamping a field now would be a
constant compared against a constant, which is exactly the pattern #22 names and which
[`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §6 already declined once, deliberately, for the pack version
check.

**Disposition: report only, Shantanu's call, 12 Aug 2026.** Phase 3 owns it, alongside seam 7's
deferred pack check — they are the same decision arriving at the same moment. What must not
happen is the sentence staying in `CLAUDE.md` as though it described the code.

---

## 27. Antibodies exceed the per-family cap in ordinary legal play

[`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §7 lists, among the property-suite invariants:

> Antibodies never exceed the per-family cap

**Measured before writing it, and it is false.** 400 seeds × 3 difficulties, reference bot,
30 turns, checking all seven pools after every action against `capFam` at that moment:

```
games            1200
states checked   113,344
pool checks      793,408
over-cap states  12,803
games affected   288 / 1200        (training 89, normal 99, hard 100 of 400 each)
worst excess     3 over cap        e.g. ICB 5/2 on Training
cause            liver damage 12,803   capTurns 0   unexplained 0
over the UNDAMAGED cap for the difficulty: 0
```

The cause tally covers **all 12,803** over-cap states, not the retained samples — classifying
from the subset that reaches the report is [#24](#24-a-measuring-instrument-that-was-wrong-in-a-region-nobody-was-looking-at)'s
exact error.

### Why it happens, and why it is not a bug

`capFam` is **dynamic** (`queries.ts:208`). It returns 5 / 4 / 3 by difficulty, then clamps to 2
if the liver is damaged, and to 2 during `fx.capTurns`. Nothing reduces an existing store when
the liver takes damage. So a player who legally produced 5 ICB antibodies on Training, and whose
liver is then damaged by an arriving pathogen, holds 5 against a cap of 2 — without having done
anything the engine would refuse.

**The biology is right, and this is the part worth keeping.** A damaged liver cannot *synthesise*
antibody at the same rate; it does not destroy antibody already circulating. The engine models
exactly that:

| Mechanism | Effect on existing stores | Why |
|---|---|---|
| Liver damage → `capFam` clamps to 2 | **Left alone** | Reduced synthesis capacity. Circulating antibody persists |
| `antibodyShortage` crisis → `capTurns = 3` | **Clamped to 2** (`construct.ts:119`) | A shortage consumes what you have; that is what a shortage is |

Two different clamps because they are two different events. That distinction is defensible and
Kartik should know it is there — it is the kind of thing a judge asks about.

### The two invariants that ARE true, and replace the brief's one

Measured across the same 793,408 pool checks, **zero violations of either**:

1. **`ab[f]` never exceeds the difficulty's undamaged cap** — `AB_CAP_FAM_BY_DIFF[difficulty]`.
   The standing ceiling. Falsifiable by an affinity-maturation overshoot (`rateForFam` can exceed
   the rate ceiling on Training), by `passiveAntibodies` topping up past it, or by a future
   difficulty whose cap is read from the wrong table.
2. **`produce` never raises `ab[f]` above `capFam(g, f)` as measured at the moment of the write.**
   This is the real "cap is respected" claim — checked at the write rather than over the state,
   which is what makes it survive the cap moving underneath a legal store.

The brief's wording conflated the two, and asserting it as written would have gone red on 24% of
games. **Recorded because the near miss is the finding:** an invariant that looks obviously true,
is stated in the spec, and is false — caught only because the plan required measuring it before
writing it rather than writing it and weakening it when it went red.


---

## 28. The C5b shape again — a check that ran the wrong engine's machinery

Found at Task D, by a negative control that **would not fire**. Not by anything failing.

Three of the eight property invariants are about an engine's own machinery rather than about the
contents of a state: `undo-round-trip` (does `pushUndo` then `undo` restore?), `viewstate-round-trip`
(does the projection survive JSON?), and `production-respects-cap` (does `produce` clamp?).

All three called the **ported engine's** functions, from a module-level import:

```ts
const port = portNs as unknown as { pushUndo: ...; viewState: ...; capFam: ... };
// ...
port.pushUndo(g);
port.undo(g);
```

The runner, meanwhile, can be pointed at a different engine — that is how the wrong-engine negative
controls work. So when a deliberately-broken engine produced the states, **the invariant checked
them with a correct implementation** and reported nothing. A control designed to prove the check
could fail instead proved it could not.

### Why this is the same failure as C5b, not merely similar

| | Task C5b | This |
|---|---|---|
| The test | imported its own generator | imported its own engine |
| The import | regenerated the oracle before the check read it | supplied a *correct* implementation to judge a *broken* one |
| Visible at the import site? | No — `import { thing } from './generator.js'` looks inert | No — `port.pushUndo(g)` looks like exactly what it should be |
| Result | 19 green tests that could not fail | 3 invariants that could not fail against the case they existed for |

**One root cause: a module-level import silently substituted for the thing under test.** In both
cases the substitution is invisible where it happens and only shows up when something is
deliberately broken and the check stays quiet.

### The fix, and the line it draws

Invariants now receive a `Ctx` carrying **the engine that produced this state**. But not everything
moved: board geometry is still read from `@immunity-wars/content`, deliberately.

> An invariant that asks the engine under test for its own expected value is checking the engine
> against itself, and cannot fail.

That is the distinction the fix has to get right, and it is not "use the injected engine
everywhere". `pushUndo` is the engine's *behaviour* and must come from the engine under test.
`branchLen` is the *expected value* and must not.

**Disposition: FIXED at Task D.** The transferable part is that the C5b question — *what did an
import quietly substitute for the thing I meant to test?* — is now worth asking of every checker in
this repository, not only of generators with top-level side effects.

---

## 29. `g.free` — the Helper T-Cell's free actions — is never granted by anything

Found at Task E1, by the field-population census: a sweep of every `viewState` key asking which
generator ever puts a value in it. `free` was one of two that neither did.

The engine names the mechanic in its own comment (`v2_engine.js:612`):

```js
free:{},               // free actions granted by the Helper T-Cell this turn
```

**Nothing ever grants one.** There are exactly three writes to `g.free` in the engine, and none of
them is a grant:

| Where | What it does |
|---|---|
| `v2_engine.js:612` / `construct.ts:392` | initialises it to `{}` |
| `v2_engine.js:1591` / `spread.ts:812` | resets it to `{}` at the turn boundary |
| `v2_engine.js:857` / `ap.ts:41` | **decrements** `g.free[ck]` — inside the branch that requires it to already be `> 0` |

There is no `g.free[x] = n` anywhere. So `hasFree()` is permanently false, `spend()`'s free branch
is permanently dead, and `canAct()`'s second clause never changes an answer.

**Measured, not only read.** `free` was empty in **all 57,723 states** sampled at E1 — the
reference bot across 600 games, plus the property suite's generator, which reaches the 8 actions
the bot never emits. The reading and the measurement agree.

### This is the THIRD instance of the #4 pattern, and that is how it should be classified

Not "dead code". The pattern named at [#4](#4-the-antigenic-variation-mechanic-can-never-fire) is
**designed immunology that the code models and the game never demonstrates** — and #4 is the
finding this file calls its highest-value one.

| # | The mechanic | Why it never reaches the table |
|---|---|---|
| **4** | Antigenic variation — why sleeping sickness has no vaccine | The only `variant:true` card is a parasite, and `neutralise` rejects parasites two lines earlier |
| **23** | `Diphtheria toxin` as a separate secreted protein | Full `FAMILY` and `TROPISM` entries; nothing mints it |
| **29** | **Contact-dependent help — the Helper T-Cell granting a free action** | The pool is initialised, reset and decremented. Nothing ever grants |

Distinct from [#22](#22-pattern--the-engine-guards-against-states-the-content-design-makes-impossible),
whose six guards defend against states the content cannot produce. Those are *defensive breadth*
and are arguably correct as written. These three are *teaching content that does not run*.

### Note for Kartik

**The biology is right and the plumbing is incomplete** — which is the good version of this
problem, because the design work is already done.

Contact-dependent help is most of what CD4⁺ T-cells actually do. They are called helpers because
they license other cells rather than kill anything themselves:

- **Licensing a macrophage** to destroy what it has already eaten. A macrophage can engulf
  *Mycobacterium tuberculosis* and still fail to kill it; it takes a helper's signal (IFN-γ) to
  finish the job. That is why TB reactivates when CD4⁺ counts fall.
- **Giving a B-cell permission to class-switch** — to stop making the first, rough antibody and
  start making the right one for the job.

Both are "you may now act", which is exactly what a **free action** is in game terms. The engine
already has the slot, wired through `spend`, `hasFree`, `canAct`, the undo snapshot and
`viewState`. Nothing grants one.

The Helper is not inert — `helperLicensed()` is live and gates antibody production, so one half of
contact-dependent help is modelled. What is missing is the *free action* half the comment names.

**Disposition: report only, nothing changed. Design question for Kartik**, and an unusually
tractable one: whether the Helper should grant a free action, to which cell, and at what range.
Related: [#8](#8-seven-flags-entries-are-never-read) and [#11](#11-assorted-dead-code) —
`g.antibodies`, the other field the census found empty, is already recorded there.

---

## 30. #24 again — the coverage gate files a NON-multiplayer arm into Phase 3, by a whole-FILE rule

Found while checking whether [#29](#29-gfree--the-helper-t-cells-free-actions--is-never-granted-by-anything)
was already known. It is, sort of, and that is the problem.

`ap.ts:40` — the dead free-action branch — **is** on the gate's uncovered list. It is filed under
`docs/COVERAGE_DEFERRED.md`'s **Phase 3 — multiplayer** section, whose header reads:

> The equivalence corpus is single-player by scope, so the allocation phase and the per-player AP
> plumbing are barely exercised. **Phase 3 builds the new relay and must cover these.**

**Phase 3 cannot cover it.** The arm is uncovered because nothing grants a free action at any
player count, and no relay changes that. Phase 3 inherits a task it has no way to discharge, and
the one arm in that file recording a dead *game mechanic* is disguised as routine plumbing.

### The cause, and why this is #24 rather than merely similar

`coverage-gate.ts`:

```ts
const isMultiplayer = (a: Arm): boolean =>
  a.short === 'ap.ts' ||                 // <- this
  MP_VOCAB.test(a.text) ||
  regionsFor(a.file).some((r) => a.line >= r.from && a.line <= r.to);
```

justified by the comment directly above it:

> `ap.ts` is multiplayer wholesale — it is the per-player AP budget and nothing else.

**That sentence is false.** `ap.ts` also holds `spend()` and `hasFree()`, which are the Helper
T-Cell's free-action pool and have nothing to do with multiplayer.

Verified that the blanket clause is the *only* thing filing this arm: its source text contains no
`MP_VOCAB` term, and the AST scan matches `if (g.multiplayer)` blocks — the guard here is
`if (!g.multiplayer)`, which it correctly does not match. Delete the file clause and the arm moves
to the honest-remaining-gap bucket, where it belongs.

| | [#24](#24-a-measuring-instrument-that-was-wrong-in-a-region-nobody-was-looking-at) | This |
|---|---|---|
| The wrong rule | `a.short === 'actions.ts' && a.line >= 82 && a.line <= 165` | `a.short === 'ap.ts'` |
| Classifies by | position within a file | **which file it is in** |
| Status | Fixed at C1 | **not fixed** |

**C1's audit could not have caught it.** That audit compared the old and new rules across all
1,526 arms — but *both* rules contained the `a.short === 'ap.ts'` clause, so it sat in the shared
part of the comparison. #24's transferable lesson was to audit the region an instrument's output
never reaches; the blind spot this time is the region where two versions of the rule **agree**. A
diff cannot see a defect both sides share — the same thing the equivalence corpus is blind to, one
level up.

### Disposition — **FIXED**, on Shantanu's call, 12 Aug 2026

Reported first rather than fixed unilaterally, because #24 closes with "the gate is a measuring
instrument, and #24 is what happens when one is changed without care". Shantanu's ruling: leaving
it means Phase 3 inherits a list saying a dead mechanic is their job, which is worse. Fixed in its
own commit, with the churn reported.

**What the file rule was hiding: exactly one arm.** The lists were regenerated from a clean
coverage run before and after, and the whole diff is:

```
Phase 3 — multiplayer      9 -> 8 arms      ap.ts:40 leaves
Uncategorised, still open 42 -> 43 arms     ap.ts:40 arrives
```

`ap.ts:29` and `ap.ts:53` stayed in Phase 3, correctly. That was worth checking rather than
assuming: **deleting the file rule alone would have misfiled `ap.ts:29` the other way.** V8
attributes the else-arm of `if (!g.multiplayer) { …; return }` to the guard's closing brace, and
that arm genuinely is the multiplayer path — but its source text is `}`, which matches no
vocabulary and sits inside no `if (g.multiplayer)` block. Removing one positional rule by relying
on another would have been no improvement.

So the fix is two changes, not one:

| | |
|---|---|
| **Removed** | `a.short === 'ap.ts'` — classification by which file an arm is in |
| **Added** | AST clause: an arm after a **terminating** `if (!g.multiplayer) { … return }`, within the same function, is multiplayer. Everything past such a guard is reachable only when `g.multiplayer` is true |

**Demonstrated, not asserted.** With the new clause disabled, `ap.ts:29` drops out of Phase 3 into
Uncategorised — so the clause is load-bearing rather than decorative.

### Still open, and it is #24's original gap

**The classifier has no test.** #24 said so — "the classifier has no test; its output is a
generated document" — and that is still true after this fix. Both #24 and #30 were found by
someone reading the rule for an unrelated reason, which is not a mechanism. A unit test over
`multiplayerRegions` with known inputs would catch a third recurrence; extracting it from a script
that reads coverage and writes docs on import is a refactor of an instrument, and that is a
deliberate act too. **Flagged, not built.**

---

## 31. `endCommand` returns a BURST of full states, not one

Found at Task E planning, reading `resolveSpread` to establish what a relay would actually send.

`PHASE1_BRIEF.md` §5 asked for `JSON.stringify(viewState(g)).length` on one mid-game state, to
decide whether a Phase 3 relay can broadcast full state or must send deltas. **That measures one
frame of a burst.**

`resolveSpread` has **20 `snap()` sites**, each pushing a frame that carries a complete
`viewState(g)`, and `applyAction` returns the array (`actions.ts:170`):

```ts
return { ok: true, frames: resolveSpread(g) };
```

The frames are not redundant — they are the spread animated step by step, which is how a UI shows
the player what happened during the infection phase. So the realistic per-turn broadcast is
`frames.length × stateSize`.

**Measured at E1**, reference bot v1, 200 seeds × 3 difficulties, 7,071 bursts:

| | frames/burst (mean · p90 · max) | burst gzip (p50 · p99 · max) |
|---|---|---|
| Training | 3.9 · 5 · 8 | 2.2 · 3.5 · 4.0 KiB |
| Normal | 5.1 · 7 · 9 | 2.7 · 4.4 · 5.2 KiB |
| Hard | 5.7 · 8 · 10 | 3.0 · **20.1** · **25.6** KiB |

**The tail lives in the burst, not in the state.** A single Hard state is 2.0 KiB gzipped at the
median and 3.4 KiB at its largest; a Hard *burst* reaches 25.6 KiB. Sizing a protocol from the
single-state figure understates the worst case by roughly 8×.

**Disposition:** nothing changed — this is a measurement, and the frames are behaviour the port
preserves exactly. `PHASE1_BRIEF.md` §5 is corrected to specify both numbers. Whether Phase 3
forwards every frame, or sends one state plus a replayable dice log, is a protocol decision this
now informs rather than guesses.

---

## 32. A control that fires is not enough — measure how strongly, against what

Found at Task E0a, and recorded because it strengthens the rule this project relies on most.

The standing rule was *"a check that has never failed is not known to work."* E0a's first negative
control satisfied it: the bot-fidelity comparison was made to fail against a deliberately mutated
bot, and it failed. **It failed on 1 game in 150.** Nothing in the green pass said so.

Changing the question from *can it fire* to *how strongly, against what* produced a table instead
of a boolean, at 50 seeds × 3 difficulties:

```
  0/150  (  0.0%)  unmutated legacy                         <- baseline
144/150  ( 96.0%)  threats sorted FURTHEST-first
 50/150  ( 33.3%)  memoryKill step removed
 44/150  ( 29.3%)  NK step removed
  1/150  (  0.7%)  vaccinate 2 AP instead of 1              <- the sensitivity FLOOR
  0/150  (  0.0%)  NET check: invadersWith -> netTargets    <- DEMONSTRATED BLIND SPOT
```

The table says what no pass/fail could: the comparator is strong against changes to *what the bot
does* and weak against changes to *how much AP it spends*, because it compares outcomes rather than
behaviour. **That is what forced E0a's published claim down to the smaller true one** — agreement
on outcomes across 3,000 games, not identity of the two procedures.

> **A mutation caught in 1 game of 150 is a lucky pass wearing a working control's clothes.
> Report the sensitivity floor alongside any claim the control supports.**

It composes with Task D's rule rather than replacing it. The four-kinds rule stops you writing a
control that **cannot** fire; this one stops you trusting a control that **barely** does. From the
outside both failures look identical: a green test and a claim nobody has falsified.

**Disposition:** rule added to `tests/property/README.md` beside the four-kinds table, where the
negative-control rule lives, and cross-referenced from `tests/balance/README.md`, which holds the
table and the blind-spot row.

---

## 33. Linearly-spaced seeds are not independent samples

Found at E2, by the two-arm reproducibility check in `metrics-run.ts` — a check written for exactly
this and firing the first time it ran at full size.

The balance harness seeded game `i` with `0x51de + i * 7919`. `installRng` uses **mulberry32,
whose entire state is the seed**, so seeds drawn from an arithmetic sequence produce correlated
streams. Games that look like independent samples are not.

**Measured**, Normal, 20 × 100 games, one arm against a disjoint second arm:

| seed schedule | sd/batch (`avgTurnsSurvived`) | worst \|arm B − arm A\| |
|---|---|---|
| `0x51de + i * 7919` | 0.4105 | **4.3 sd — outside the band** |
| `splitmix32(i)` | 0.2499 | 1.7 sd |

**Two harms, pointing opposite ways.** The batch spread was *inflated* by 64%, so bands built from
it looked reassuringly wide — while two disjoint seed blocks disagreed by more than three standard
errors, so the bands did not reproduce and could not have been gated on. A gate built on them
would have failed builds on seeds.

### What it does and does not touch

| | Affected? | Why |
|---|---|---|
| E0a bot fidelity | **No** | PAIRED — both arms on identical seeds, so the correlation is on both sides and cancels. Re-run on the new schedule: still 3,000/3,000 identical |
| Every negative control | **No** | Same reason: base engine and mutant run the same seeds |
| E1 state size | **No, measured** | Re-run on the new schedule; censoring 51.9/31.8/19.4% vs 51.9/32.4/19.2%, largest state 57.1 vs 57.0 KiB, churn 44.7/46.4/48.8% vs 45.3/46.2/48.6%. Nothing moved |
| **E2 bands** | **Yes** | Unpaired by construction — the whole point is comparing a fresh run against a stored band |

**Disposition: FIXED at E2.** `seedAt` is splitmix32; provenance records the schedule by name, so
a future run cannot silently use a different one and compare against these bands.

**The transferable part:** *"deterministic and reproducible" is not the same as "independent".* The
old schedule was both deterministic and reproducible, and every figure derived from it was exactly
repeatable — and the band it produced was still wrong. Nothing about a green, reproducible run
would ever have said so. It took a check that deliberately compared two independent samples.

---

## 34. The metric-panel design proposed in this file does not work, measured three ways

The recommendation in [§ "Task E metrics"](#task-e-metrics--what-a-build-gate-can-actually-be-built-on)
was written from variance data, before anything was built on it. Implemented at E2 and then made
to face known engine changes, all three of its parts turned out to need correcting. Recorded in
full because the panel is what CI will gate on, and because two of the corrections were found only
by a control aimed at a change whose answer was already known.

### 34.1 "±3 sd of a 100-game batch" detects nothing

| arms of 20 × 100 = 2,000 games | ±3 sd of one batch | calibrated band |
|---|---|---|
| AP −1 per turn, Normal | 0 of 4 | 1 of 4 |
| AP −1 per turn, Hard | 1 of 4 | 2 of 4 |
| brain integrity 2 → 1, Normal | 0 of 4 | 3 of 4 |
| brain integrity 2 → 1, Hard | 0 of 4 | 3 of 4 |

The sd across batches measures how much **one** batch of 100 games bounces. CI does not run one
batch; it runs the suite. Judging a 2,000-game aggregate by a one-batch band throws away the √20
the aggregate earned. **A gate that cannot notice a 20% cut to the game's central resource is a
gate incapable of failing usefully** — the same objection §1 raises against win rate, which is
what this panel exists to replace.

### 34.2 The band's width must be MEASURED, not derived

`sd(batch)/√batches` assumes batches are independent samples of the arm mean. Checked against 8
independent arms of 2,000 games:

| metric, Normal | true sd(arm) | derived sd/√20 | ratio |
|---|---|---|---|
| `avgTurnsSurvived` | 0.0952 | 0.0632 | **1.51×** |
| `trunkKillPct` | 0.0015 | 0.0013 | 1.16× |
| `avgAntibodiesMade` | 0.1028 | 0.1120 | 0.92× |
| `avgOrgansDamaged` | 0.0232 | 0.0218 | 1.07× |

A band 1.5× too narrow fails builds on seeds. The panel now calibrates from K independent arms and
the shipped bands carry `arms` in their provenance; a run of fewer than three arms is rejected as
not a null distribution at all.

### 34.3 "Two or more breach" misses a change that moves one metric very loudly

With a calibrated null, removing an Action Point per turn on Normal moves **one** metric — by
**14σ**. Under 2-of-4 alone, that build passes. So the rule gained a second arm:

> **FAIL when two or more metrics are past ±3σ, OR when any one is past ±6σ.**

| change | breaches @3σ | loudest | verdict |
|---|---|---|---|
| AP −1, Normal | 1 | 14.1σ | **FAIL** (6σ arm) |
| AP −1, Hard | 2 | 38.0σ | **FAIL** |
| brain integrity 2 → 1, Normal | 3 | 4.8σ | **FAIL** |
| brain integrity 2 → 1, Hard | 3 | 5.8σ | **FAIL** |
| brain `branch:3 → 4` | 1 | 3.2σ | pass — the blind spot |

3σ on a single metric is ~0.3% per metric per run, which is a coin-flip CI gate; 6σ is not.

### 34.4 ⚠️ And #17's blind spot is narrower than #17 states

[#17](#17-the-brain-lane-change-restored-one-turn-of-slack--and-no-aggregate-metric-could-see-it)
says of brain `branch:3 → 4`: *"no metric moved beyond 2 standard deviations at any difficulty."*
That was measured at 10 × 100 = 1,000 games against a null estimated from batch spread.

**At 2,000 games with a calibrated null, `avgTurnsSurvived` moves +3.2σ on both Normal and Hard.**

What survives is the **gate-level** claim, and only that: the panel does not FAIL, because one
metric under 6σ is not a failure. "No metric moved" is no longer the right sentence.

This is why `metrics-control.test.ts` asserts `failed === false` and not `breaches.length === 0`.
The stronger assertion would have gone red at the shipped sample size, and the temptation would
then have been to shrink the sample until the test passed — fitting the measurement to the claim.

**The honest statement, for anything downstream including the grant write-up:** the panel does not
fail on `branch:3 → 4`, and it is not blind to it either. It is a coarse net that this change slips
through, which is exactly what #17 says a metric panel is for and against.

**Disposition: CORRECTED at E2.** The § "Task E metrics" recommendation carries a pointer here.
Nothing about the engine changed; what changed is the instrument built on top of it.

---

## 35. A measured `sd(arm)` can sit below the floor sampling theory allows — the 8-arm bands did, at 0.72×

**Found at Task F0**, while checking whether recalibrating from 8 arms to 24 had made the metric
panel safe to gate a merge on. It had not, and more arms was never going to be the fix.

### 35.1 The floor

An arm mean is the mean of `batches × gamesPerBatch` per-game values at **equal** batch sizes, so
it is exactly the mean of `perArm` games. If those games are independent then

> **sd(arm) = sd(one game) / √perArm**, exactly.

That is the variance of a mean. It is not an approximation, not an assumption about normality, and
not a quantity a larger calibration can move. Arm means cannot be more stable than that.

> **So a measured `sd(arm)` below this floor is PROOF the calibration under-sampled.** Not
> evidence — proof. It asserts that a mean of N independent draws varies less than N independent
> draws allow.

### 35.2 What the shipped bands were doing

Measured on legacy at the shipped arm shape (20 × 100), floors from 3,000–4,000 fresh games on a
disjoint seed block:

| | 8-arm band | ratio to floor | 24-arm band | ratio to floor | floor |
|---|---|---|---|---|---|
| normal `avgTurnsSurvived` | 0.0496 | **0.72×** | 0.0643 | 0.93× | 0.0689 |
| normal `avgAntibodiesMade` | 0.0775 | **0.74×** | 0.0924 | 0.88× | 0.1050 |
| hard `avgTurnsSurvived` | 0.0379 | **0.74×** | 0.0420 | 0.82× | 0.0511 |
| hard `avgOrgansDamaged` | 0.0169 | **0.67×** | 0.0198 | 0.78× | 0.0253 |

Seven of nine floorable bands sat below their floor at 24 arms; all four sampled above sat well
below it at 8.

**This is the whole explanation of the false-positive risk** recorded at
[`TASK_E_CLOSEOUT.md`](TASK_E_CLOSEOUT.md) §10.4. An unchanged Normal engine came back at 2.6σ and
2.7σ not because of an unlucky arm but because the divisor was ~28% too small. Every σ the panel
printed was inflated by 1/ratio.

### 35.3 Why 8 → 24 arms moved the problem instead of fixing it

More arms sharpens the *estimate* of a spread; it cannot reveal spread the sample never contained.
Going to 24 arms moved Normal from 0.72× to ~0.90× of the floor — a real improvement — and the
near-miss relocated to **Training**, whose `avgAntibodiesMade` came out at 0.83×. Across 51 unseen
arm-checks on an unchanged engine, three single-metric 3σ breaches appeared in 204 draws (1.47%
against the 0.27% normal theory predicts). Under floored bands two of the three fall below 3σ.

### 35.4 Why `trunkKillPct` is excluded, and why that matters

The √N argument holds for a metric that is the **mean of a per-game value** and for nothing else.
`trunkKillPct` is `sum(trunk) / sum(trunk + branch)` over the batch — a ratio of two sums, not a
sample mean — so it has no such floor and keeps its measured sd.

Giving it one would have been easy, would have looked more consistent, and would have been a
number that looks rigorous and is not. That is the failure mode this document is mostly a list of.

### 35.5 What applying the floor costs

Measured at the shipped arm shape, on both difficulties, against the E2 controls: **nothing.**

| control | measured bands | floored bands |
|---|---|---|
| AP −1, Normal *(must FAIL)* | 2 breaches / 17.9σ / FAIL | 2 / 13.2σ / **FAIL** |
| brain 2→1, Normal *(must FAIL)* | 3 / 13.0σ / FAIL | 3 / 9.3σ / **FAIL** |
| brain 3→4, Normal *(must PASS)* | 1 breach / 3.3σ / pass | **0** / 2.4σ / pass |
| AP −1, Hard *(must FAIL)* | 4 / 37.0σ / FAIL | 2 / 31.7σ / **FAIL** |
| brain 2→1, Hard *(must FAIL)* | 3 / 9.1σ / FAIL | 3 / 6.8σ / **FAIL** |
| brain 3→4, Hard *(must PASS)* | 1 / 3.6σ / pass | **0** / 2.7σ / pass |

The demonstrated blind spot becomes *more* robustly blind, which is the correct direction for a
case pinned as *should not fail*.

**This table had to be measured at the shipped scale.** The same comparison at the E2 controls' own
4 arms × 400 games says AP −1 flips FAIL → pass, and on that basis the fix would have been
abandoned. See `tests/property/README.md`, the scale rule.

### 35.6 Why no instrument here could have caught this

Every check the panel had compared the band against **another measurement of the same kind** — more
arms, a held-out arm, a different seed block. All of those share the sampling defect, and
[#30's rule](#30-24-again--the-coverage-gate-files-a-non-multiplayer-arm-into-phase-3-by-a-whole-file-rule)
applies exactly: *a diff cannot see a defect both sides share.* The floor is the first check here
that comes from a different direction — closed-form theory rather than a second sample.

### 35.7 What it changed on the shipped bands

8 of 12 bands were widened. Re-probing with 24 unseen arms (48,000 games) of the unchanged engine:

| | before flooring | after flooring |
|---|---|---|
| arms that would have failed | 0 / 24 | **0 / 24** |
| single-metric 3σ breaches | 2 | **0** |
| worst excursion (training) | 3.24σ | **2.65σ** |

**The rule-level verdict did not change, and that is the honest headline.** The gate was not
failing builds before; what changed is the margin. A gate whose worst unchanged-engine arm sits at
3.24σ against a 3σ line is one unlucky seed block away from a red build for no reason. At 2.65σ it
is not. The floor bought headroom, not a fixed failure.

**Disposition: FIXED at F0.** `bandOf` takes `max(sdMeasured, sdFloor)`; both numbers and the
floor's provenance are recorded in `bands.json`; `metrics-run.ts` prints the ratio every run as a
standing sanity check; `src/floor.test.ts` pins both directions, including that the per-game value
behind each floor is the one `metricsOfBatch` averages — without which a metric redefined in one
place and not the other would compute the floor from a different quantity than the band it widens.
Technique written up in `tests/balance/README.md`.

---

## 36. The port and legacy agree to four decimal places on aggregate metrics — corroboration nobody was looking for

**Found at Task F0, incidentally, and recorded because of how it was found.**

While measuring whether floor-widening costs detection, the comparison needed a legacy-run baseline
at the shipped arm shape, so it calibrated 8 arms × 20 × 100 on `loadLegacy()` from seed index 0 —
the same arm shape, arm count and seed block the original 8-arm bands used, except those were
calibrated on the **ported** engine.

The two agree to every digit either instrument printed — four decimal places. That is the
precision of the comparison, not a claim of bit-identity:

| metric | 8-arm bands (port) | F0's 8 arms (legacy) |
|---|---|---|
| normal `avgTurnsSurvived` | 0.0496 | 0.0496 |
| normal `avgAntibodiesMade` | 0.0775 | 0.0775 |
| normal `avgOrgansDamaged` | 0.0259 | 0.0259 |
| hard `avgTurnsSurvived` | 0.0379 | 0.0379 |

**Why this is worth keeping.** Task B's equivalence claim rests on the corpus: 6,000 recorded games
diffed state-for-state. That is a purpose-built instrument, and a purpose-built instrument is
exactly the kind that can be wrong in a way its own author cannot see — this document records
several. Here the agreement fell out of an instrument built for something else entirely, at a
different level of abstraction (aggregate statistics over 16,000 games, not per-action state), with
nobody checking for it and nothing riding on the answer.

**Corroboration nobody was seeking is the strongest kind**, because no design decision was made in
order to produce it. If the equivalence claim is ever questioned — by a reviewer, a funder, or a
future contributor who does not trust the corpus — this is independent support that does not route
through `rig.ts`, `normalise()`, or any of the machinery Task B built to make the claim.

**It does not replace the corpus.** Aggregate agreement over four statistics is far weaker than
state-for-state agreement, and two engines could in principle agree on these means while differing
somewhere the means average over. The claim here is narrow: a second, unrelated instrument had a
chance to disagree and did not.

**Disposition: NOT AN ISSUE.** Recorded as supporting evidence.

---

## 37. An inventory can be wrong by OMISSION, not only by overclaim — and only asserting both directions catches it

**Found at Task F1**, building the suite manifest against
[`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §7's seven-row table.

Every previous instance of this pattern in this document is documentation claiming **more** than
exists: a CI rule nobody wrote (#9 at C1), a balance harness that was never built (#6, corrected at
Task E), `rulesVersion` on states and messages that carry neither (#26), a coverage-gate exclusion
that was not dead (#25). The response each time was the same — make it true or make it accurate.

**§7 is the first that is also wrong the other way.** It lists seven suites. Four exist. The other
three are cross-cutting properties and one, `unit`, does not exist at all. That much is an ordinary
overclaim. The new part:

> **The equivalence corpus appears in no row of §7.** The largest test asset in this repository —
> 315 assertions, 2,000 nightly games, the instrument Task B was measured against — is absent from
> the table that purports to list the test suites.

An inventory can be false by listing what is not there **and** by omitting what is. The two failure
modes look nothing alike from inside: an overclaim is found the moment someone tries to run the
thing, while an omission is invisible forever, because nothing ever fails on account of a row that
was never written.

### 37.1 The check that catches it

`tests/manifest/manifest.test.ts` asserts both directions, and the second is the one that would
otherwise have been skipped:

- every §7 row is accounted for **exactly once** — as a suite, or explicitly as cross-cutting or
  absent. This catches the overclaim.
- at least one suite on disk has `briefSuite: null` — it realises **no** §7 row. This catches the
  omission, and it is asserted by name (`equivalence-corpus`) so that quietly mapping the corpus
  onto some row to tidy the file would go red.

The first version of the manifest did map the corpus to `unit`, which read plausibly and was wrong:
an agreement oracle against a legacy implementation is not a suite of isolated unit tests. The
"exactly once" assertion caught it, because `unit` was then accounted for twice — once as the
corpus and once as the row recording that no unit suite exists.

**The general form, and the reason this is filed rather than fixed silently:**

> **An inventory is two claims, not one: that everything listed exists, and that everything existing
> is listed. A check that only tests the first will pass forever on an inventory missing its largest
> entry.**

**Disposition: FIXED at F1.** Both directions asserted; `docs/PHASE1_BRIEF.md` §7 carries a pointer
to `tests/suites.json` as the reconciliation of record.

---

## 38. Two instruments, each correct, that together produced a permanently-red dashboard row

**Found by the first real nightly run, 19 Aug 2026.** The published page read INCOMPLETE with
`balance-panel` and `content-schema` showing NO RESULT. Nothing was broken.

- The **dashboard** renders one row per manifest suite, and a suite with no result renders RED
  rather than being omitted — because a suite that silently stopped running must look worse than
  one that failed. Correct, and working exactly as designed.
- The **nightly matrix** is derived from the manifest, and runs the suites that declare a nightly
  tier. `balance-panel` and `content-schema` declared per-push tiers only, so the matrix held two
  jobs instead of four. Also correct.

Each rule is right. **The conjunction is a row that can never go green**, no matter how often the
suite passes per-push, because the job that builds the page never sees its result.

> **A defect can live in the RELATIONSHIP between two correct components, and be invisible in
> both.** Neither the dashboard tests nor the matrix tests could have caught this: each verified
> its own half against its own spec, and each half was right.

### 38.1 Why the diagnosis mattered more than the fix

The two candidate explanations demanded opposite responses:

| if | then |
|---|---|
| the job ran and failed to publish its result | fix the artifact plumbing |
| the job never ran | fix the tier declarations |

Guessing would have produced a plausible change to the wrong component. The nightly matrix,
printed directly, settled it in one command: two jobs, not four. **The artifact names the run
produced — `nightly-results-full-corpus` and `nightly-results-test-property`, and no others —
were the same evidence from the other end.**

### 38.2 The fix, and the invariant

`balance-panel` and `content-schema` gained nightly tiers. That fixes today. The class is closed by
an assertion in `tests/manifest/manifest.test.ts`: **every suite must declare a nightly tier**,
because the nightly is what publishes the page. A suite added later with a per-push tier alone
would otherwise reintroduce the same permanently-red row, and the symptom — a broken-looking
dashboard — points at the wrong component.

### 38.3 A second defect, found while verifying the first

Simulating the nightly end-to-end surfaced something the run itself could not have shown:
**`${{ matrix.scale }}` was empty in every result file the workflows wrote.** The GROUPED matrix
carries `id`, `command`, `suiteIds`, `resultFiles`, `approxSeconds` and `blocking` — not `scale`,
which only the ungrouped entries have. Every result the first nightly published had `"detail": ""`.

Nothing failed. The rows simply rendered blank, which is the quiet kind of wrong: a green run, a
published page, and a field silently empty.

The same step also hand-assembled JSON with `printf` and no escaping. Since `build.ts` treats an
unparseable result as MISSING, a single quotation mark in a manifest scale would have turned a
passing suite red with no explanation anywhere in the logs.

Both are now `tools/ci/record-result.ts`, tested over the real manifest — including a control that
puts quotes, backslashes and a newline in a scale and requires the record to survive a JSON
round-trip. It is the aggregate gate's lesson a second time: **logic that lives in YAML cannot be
falsified.** A `printf` inside a workflow step runs only in CI, and both of its defects were
invisible in a green run.

**Disposition: FIXED.** Tier declarations corrected, the invariant asserted with a control in
`tests/manifest/controls.ts`, result writing moved into a tested script, and `results/`, `site/`
and `history/` added to `.gitignore` — CI writes them into the working tree and untracked is one
careless `git add -A` from committed.


---

## 39. Task B proved the 67-export contract; the 67-export contract is not the surface `v2_ui.html` uses

**Found at Task G step 1, 18 Aug 2026**, measuring the seam before writing any shim —
[`TASK_G_PLAN.md`](TASK_G_PLAN.md) §3 step 1 requires exactly that, and this is why.

[`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §5 names the port's contract precisely:

> The public API is the contract: **67 exports at `v2_engine.js:1767`**

That is a true statement about `module.exports`. It is not a true statement about what the UI
reads, and the difference is structural rather than an oversight by anyone.

**The harness does not `import` the engine — it injects it.** `v2_ui.html` carries a literal
engine marker, and `tools/legacy/spectator_build.js` shows the contract it was built for: read the
engine file, strip `module.exports`, substitute the source at the marker. The engine therefore
arrives as a **classic script**, and every top-level `const`, `let` and `function` in it becomes a
global. `module.exports` is not consulted at all in a browser.

Measured with the TypeScript compiler API rather than assumed — every identifier the board script
reads but never declares in any enclosing scope:

| | |
|---|---|
| legacy `module.exports` | **67** names — the documented contract |
| legacy top-level declarations | **153** names — what injection actually exposes |
| port `index.ts` exports | 94 names |
| board-script free identifiers | 68 (53 after browser globals) |
| of which the engine declares | 49 → **44 covered by the port, 5 missing** |

The five: `LYMPH_STEP`, `ROUTE_KEYS`, `SNIPE_RANGE`, `SNIPE_RANGE_BY_DIFF`, `SPEED`.

**None of the five is among legacy's 67.** They are engine internals that were never part of the
public API, and the UI has been reading them for as long as it has existed, because injection made
them reachable.

### 39.1 Why nothing before now had reason to notice

The equivalence corpus drives the engine **directly, through its exports**. It never loads
`v2_ui.html`. So every instrument in this repository has been measuring the 67-name surface, and
measuring it correctly — while the surface the game is actually played through is 153 names wide.
No check was wrong. The checks were aimed at a smaller target than the one that matters here, and
nothing in Phase 1 had cause to aim differently until a browser was in the loop.

Publishing legacy's 67 exports was **necessary and not sufficient** for this harness.

### 39.2 Why this is an argument FOR Task G, not a complication of it

The obvious reading is that G has found a gap. The useful reading is the opposite:

> **The harness exercises a wider surface than the corpus ever did.** It is the first thing in
> Phase 1 to touch the seam the game is actually played through.

Left undiscovered, this would have surfaced in Phase 2 as five `ReferenceError`s inside a new React
UI — mystifying, because the port publishes a contract that was proved green, and the missing names
appear nowhere in that contract to be looked for. A whole class of "the port is broken" debugging
is avoided by finding it here, in a rename layer, with the legacy UI to compare against.

This is the same shape as the negative-control rule in [`CLAUDE.md`](../CLAUDE.md): the value is in
the *class* of error caught, not the five names.

### 39.3 Disposition — five renames, nothing added to `packages/engine`

All five are already exported from `packages/content/src/index.ts`. The shim imports them from
content, so:

- **no logic moves out of `packages/engine`** — the thing `TASK_G_PLAN.md` step 1 exists to catch;
- **nothing is added to the engine's public API**, which stays exactly where Task B fixed it;
- the shim stays what it is meant to be, a rename layer.

That they are all content tables is the reason step 1 came in at a day rather than a week. It was
not guaranteed and it was checked, not hoped for.

### 39.4 The method's own blind spot, checked rather than assumed

Free-identifier collection filters browser globals with an allowlist. **An engine name colliding
with a browser global would have been silently filtered and never reported as missing.** Measured:
the intersection of the engine's 153 declarations with the browser-global allowlist is **empty**,
so nothing was masked. Recorded because an unmeasured filter is exactly the shape of #24 — an
instrument wrong in the region nobody was looking at.

Three residual names, confirmed benign: `ART` arrives from the art marker; `innerWidth` and
`innerHeight` are browser globals; `mbPickTarget` is guarded by a `typeof` check, so it is a soft
optional from the mobile build rather than a dangling reference.

**Disposition: MEASURED and RESOLVED at G step 1.** The measurement script is
`tools/legacy-harness/seam.ts`, a workspace member so it is typechecked and linted like every other
instrument here. No engine change. The five names are supplied by the shim from `packages/content`.
