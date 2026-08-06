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
| 13 | Pathogen X exists only via two lookup misses | **B7 risk** | Pinned by test before the flag is flipped |
| 14 | The three worm safeguards all hold | **Verified** | No action; one bypass documented |
| 15 | The Heart has the shortest branch on the board | **Design** | Report only |
| 16 | `forceInject*` bypasses the worm caps AND the accounting | Low (dev-only) | Report only |
| 17 | Brain `branch:3` restored one turn of Eosinophil slack | **Method** | Why the B5 scenarios exist |
| 18 | Degranulate costs half the Brain to use | **Design** | Report only |
| 19 | The lytic-cycle array spread is defensive, not load-bearing | Low | Comment at the site |
| 20 | `returnAP` does not validate its pid, and writes NaN | **Server-facing** | **FIXED** — [`DEVIATIONS.md`](DEVIATIONS.md) #4 |
| 21 | `tag`'s novel-antigen guard can never fire | Low | Port as-is; found by coverage |

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

**Confirmed by coverage measurement, not by reading.** `abTotal`, `hasAb` and `apOwnerOf` are
three of the five functions the whole 199-test suite never executes. Grepping legacy finds
exactly one reference to each — the definition. They are exported (`abTotal` and `hasAb` are
not; `apOwnerOf` is not either) and simply unreachable. See §"Coverage" in
[`TASK_B_CLOSEOUT.md`](TASK_B_CLOSEOUT.md).
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
