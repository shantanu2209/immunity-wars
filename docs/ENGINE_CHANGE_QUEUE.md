# The engine change queue — Phase 3, measured against the corpus in one pass

> ⚠️ **Not run in Phase 3** (30 September 2026, [`FINDINGS.md`](FINDINGS.md) #101). The Phase 3 brief,
> written after this queue, ruled out rule changes (§7) and never named it, so the queue did not land
> there and nothing said so. When it runs is a ruling, set out in
> [`PHASE3_CLOSEOUT.md`](PHASE3_CLOSEOUT.md) §4. The title and the paragraph below are kept as written.
> **Ruled 30 September 2026: it runs now**, as its own piece between Phase 3 and Phase 4 (*"Now"*).
> **It ran the same day, all ten changes, in one PR with a commit each**: "How it ran", at the end.

**Opened 5 September 2026, at Kartik's rulings on his open design questions.** The engine is
frozen for Phase 2 ([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §0, §7): every change here is a
rule change, and every rule change breaks the equivalence corpus, so they land **together**,
in Phase 3, re-baselined once and measured once — the full suite, the property invariants and
the balance panel ([`../tests/balance/README.md`](../tests/balance/README.md)) in a single
pass rather than four. Each entry carries its reasoning so the pass can be argued with rather
than inherited. The workarounds that expire with them are listed at the end.

| # | Change | Ruled by | Reasoning, in one line | Record |
|---|---|---|---|---|
| **Q1** | **Antigenic variation reachable** — let antibodies attempt trypanosomes, so the `variant` coat-change can fire | Kartik, option (a) | The mechanic teaches why sleeping sickness has no vaccine, and it has never once fired: the only `variant` card is a parasite and `neutralise` rejects parasites first | [`FINDINGS.md`](FINDINGS.md) #4 |
| **Q2** | **Remove the Helper T-Cell's free-action slot** (`g.free`, `hasFree`, `spend`'s free branch, the `free` view key) | Kartik | Nothing grants one and nothing the Helper does depends on it — enumerated below. Free actions are NOT being added: the rebalancing is not worth it | #29; the enumeration below |
| **Q3** | **Declare Pathogen X's tropism** — a `TROPISM` entry of `any`, not a lookup miss | Kartik | A novel pathogen: nobody should know where it will go. Generalist ON PURPOSE. Today it is generalist by falling through a missing entry (`rollOrgan`'s `!declared` branch) — the same behaviour, undeclared | #13, [`DEVIATIONS.md`](DEVIATIONS.md) #5 |
| **Q4** | **Antivenom kills grant no memory** — memory-on-kill checks the killer | Kartik, option (a) | Antivenom is passive immunity; it teaches the immune system nothing, which is exactly why a second snakebite needs a second dose. The engine's own log says so and the engine contradicts it | #55 |
| **Q5** | **The invader id counter into `GameState`** (and into the relay's authoritative state) | Found at P2.5 item 12 | A saved game carries every id and not the counter; a fresh process restarts it and reuses ids. The session works around it at resume; the relay would hit the same reset on every restart | #56 |
| **Q6** | **Resident RECALL** — a new action returning a resident to its organ box (branch step 0) from any step, for 1 AP, move-class (undoable) | Kartik, ruling 1 | A resident must step forward onto its branch to intercept; it needs a way back that is not `resmove` one step at a time. Proposed shape below | #5 |
| **Q7** | **The engine's action literals into content, as one family** — `neutralise`'s 2-AP toxin cost; the antivenom dose (3 AP); degranulate's cost (2 AP) and damage (3); strike's damage (2 Eosinophil, 1 Monocyte); the Hard memory-response cost (1 AP) | Shantanu, at CP2; widened 6 September 2026 | The 2 is a literal in the engine, mirrored in the UI with a spanning test (#52). The 6 September ruling against mirrors found the rest: every one is a literal the UI also holds (`offered.ts`, held honest only one way by the offered-subset-of-accepted harness) or WANTS to hold and may not (the damage figures Shantanu ruled onto the action rows, withheld because a retyped copy could drift). When they are content, the UI reads them and the rows gain damage for free | #52; for-P2.5.md, 6 September, "the literal mirrors that remain" |
| **Q8** | **Queries and log sites emit ids, not prose** | Shantanu, at CP2/CP5 | The Hindi edition renders five composed log lines in English until then | #53 |
| **Q9** | **Degranulate burns the organ only when the fight is IN the organ** — organ damage when the Eosinophil (and its target) stand at branch step 0, not anywhere on the branch | Shantanu, S25 pass of 5 September 2026 | Eosinophil degranulation damages the tissue it happens in; granule proteins released on a lane are not released in the brain. Today  keys the burn to the TARGET being on a branch at any step, so a strike at step 1 of the Brain branch cost the Brain a point. Kartik's ruling that degranulate's cost is a risk you accept assumed the damage happens where the fight happens | #57 |
| **Q10** | **Remove the inert `science` field** — `GameState.science`, `newGame`'s `cfg.science`, the `science` view key, and the session's `CreateGameConfig.science` that feeds it | Shantanu, 6 September 2026, at the P2.6 kickoff | Set at construction from a config flag, copied into the view, **read nowhere**: not by the port (`construct.ts`, `view.ts`, `simulate.ts` passing `false`), not by legacy (`v2_engine.js` sets and exposes it; the server and two tests pass it; nothing consults it). Nobody remembers what it was for, so there is nothing to toggle, and Settings gets no entry for it. Removing a view key breaks the corpus, so it waits here rather than being removed from a frozen engine | `APP_FLOW.md` §3 named a "science toggle" as out of the minimum shell, the field's only trace; [`for-P2.6.md`](for-P2.6.md) |
| **Q11** | **A venom is never remembered** — no vaccine against one, and no memory response to one, whatever memory a game carries | Shantanu, 30 September 2026, after the queue ran | Venom acts in minutes and even a remembered response takes days; no vaccine against a venom is licensed for people. The game's own texts already said a second bite needs a second dose | #55; [`DEVIATIONS.md`](DEVIATIONS.md) #11 |

## Q2 — the check Kartik asked for: everything the Helper T-Cell does, and whether any of it uses the free slot

Enumerated from the engine source (`packages/engine/src/queries.ts`, `spread.ts`, `ap.ts`),
5 September 2026. **None of the Helper's effects reads or writes `g.free`. The slot can go.**

| The Helper's effect | Where | Uses `g.free`? |
|---|---|---|
| Priming: does nothing until an antigen has been presented (`helperLicensed`: `flags.helperT && presentations > 0`) | `queries.ts:168` | no |
| **+1 antibody per production action** while standing with the B-Cell (`helperWith(g,'bcell')`) — the licensing bonus Kartik cites | `queries.ts:251` | no |
| The unprimed-beside-B-Cell explanation in the production breakdown ("present but NOT yet primed") | `queries.ts:284–293` | no |
| **+1 snipe range** for the Killer T-Cell while standing with it — the range extension Kartik cites | `queries.ts:420` | no |
| **+1 step** for the Eosinophil while standing with it (Th2, IL-5) — the speed-up Kartik cites | `queries.ts:533` | no |
| **Neutrophil returns in 2 turns instead of 4** while the primed Helper stands in the Bloodstream (Th17 → G-CSF) | `queries.ts:602` | no |
| Switched off wholesale by HIV (`helperT` flag cleared) | `queries.ts:124`, the HIV event | no |
| `activate` — a stub that always rejects ("works by contact, not orders") | `actions.ts:647` | no |
| `cells.helper.usedThisTurn` — reset every turn, set nowhere: a dead field | `spread.ts:811` | no |

What reads `g.free`: `ap.ts` (`spend`, consuming a free action before AP; `hasFree`), the
generic no-AP gate in `actions.ts:196`, the undo snapshot, `viewState`, and `construct`/`spread`
initialising and resetting it. All plumbing for a grant that never happens (#29). Removing it
removes a view key, which is why it is a corpus-breaking change and sits in this queue.

## Q9 — the two player-facing texts that already describe the RULED behaviour, not the shipped one

Listed here so that landing Q9 is a one-line change to the engine and not a hunt through the
catalogue, and so nobody "corrects" either text in the meantime.

| Where | The text | Status |
|---|---|---|
| The Eosinophil's cell card, `ui.help.cell.eosinophil` | "it burns the organ it **stands in**" | True once Q9 lands. Today the burn is keyed to the target being on a branch at any step, so a strike at step 1 of the Brain branch costs the Brain a point while the Eosinophil is nowhere near it |
| The library's why box 11, `ui.library.why.eosinophil.title` | "Why the Eosinophil burns the organ it **stands in**" | The same sentence, and it was written to match the card |

**Kartik's box text underneath the title is not affected**: "killing a parasite inside tissue
damages that tissue" is the biology, and it is the biology Q9 exists to make the engine obey.
It is the *title* and the *card* that state where the damage lands.

**So the game and its own explanation disagree until Q9 lands** — narrowly, in one direction,
and in favour of the explanation. Flagged to Kartik on 8 September 2026 rather than left for him
to discover, on Shantanu's instruction. Both texts become true, with no edit, the moment the
engine keys the burn to branch step 0. Record: [`FINDINGS.md`](FINDINGS.md) #57.

## Q6 — resident recall: the proposed shape

`{ action: 'resrecall', organ }`. Accepted in the command phase when the resident exists, is not
disabled by a parasite inside it (`infectedBy`), and stands at `step > 0`; sets `step = 0`;
costs `spend` (1 AP, or a free action); **move-class** for undo, like the cell's `recall`; logs
"the {resident name} returned to the {organ}". `residentEatable` is unchanged — nothing can be
eaten at step 0 (#5), which is the intended miss. **Engine work, so Phase 3:** it cannot be
expressed with existing actions at the ruled cost — `resmove` back down one step at a time is
N AP for N steps, a different rule, and a UI macro that sent N `resmove`s would be a second
rules source. Until then the rulebook states the rule for the table game and the app offers
`resmove` only.

## Workarounds that expire with this queue

| Workaround | Where | Deleted with | 30 September 2026 |
|---|---|---|---|
| `NEUTRALISE_TOXIN_AP` mirror + its spanning test | `packages/ui/src/play/offered.ts`, `tests/session/src/neutralise-cost.test.ts` | Q7 | **Deleted.** The test stays, reading content's value |
| `productionText.ts` mapper; `engineLogText` templates for the five composed sites; `log-text.test.ts`'s "only misses" pin; `$meta.unextractedSites` | `packages/ui`, `tests/session`, `engine.json` | Q8 | **Deleted**, but for the list, kept empty and pinned empty as the instrument that catches a new composed site. The pin is now "no misses" |
| `advanceIdsPast` at `LocalSession.resume` + `resume-ids.test.ts` | `packages/session/src/local.ts`, `tests/session` | Q5 | **Deleted.** The test stays, resuming real saves from before |
| The UI's `canAct` reading `free` | `packages/ui/src/play/offered.ts` | Q2 | **Deleted** |
| The AP-cost literals in the offers (antivenom 3, degranulate 2, memory response 1 on Hard) | `packages/ui/src/play/offered.ts` | Q7 | **Deleted** |
| `rareLogLine`, the UI-authored log entry for a rare event the engine banners and never logs (#58) | `packages/ui/src/play/effects.ts`, `LogLine.text` | Q8 | **Deleted, with no engine change:** the engine had logged the event all along, and #58 is corrected |

## Not queued: the two breakdown queries, added on the `./internal` entry point (6 September 2026)

`apBreakdown` and `regenBreakdown` (`packages/engine/src/queries.ts`) are **additive** engine
queries, not rule changes: `apFor` and `neutrophilReadyTurn` are untouched, the root export
contract is untouched (the root is exactly legacy's 67 names; `./internal` is where helpers
legacy keeps private are published, one at a time on demonstrated need), and the corpus cannot
see a pure query nothing in the engine calls. They exist so the UI lists the causes of a number
instead of re-deriving the rule, which retired one mirror nobody had counted (the session's own
reading of the marrow). Pinned by `tests/equivalence/src/breakdowns.test.ts`; the reasoning in
[`for-P2.5.md`](for-P2.5.md), 6 September, "The question, answered from the constraints".
**Ruled the same evening: `apFor` IS a wrapper over `apBreakdown(g).total`** — one calculation,
not two agreeing ones — recorded in the brief (v1.6) as the one deliberate exception to "the
engine is unchanged", with the corpus as the proof.

## What is NOT queued — ruled "no change", with the reasoning a judge would ask for

- **Degranulate at the Brain** (#18): **no change.** Kartik: it is a risk you live with. The real
  danger is worms; there can only be two per game, and on Hard they spawn at the organ but you
  still have three turns before damage, so degranulate may not be needed at all. Using it means
  accepting its cost.
- **The Heart's 2-step branch** (#15): **intended.** Kartik: pathogens travel from the
  bloodstream outward, so the heart is genuinely the quickest to reach. The rulebook's strategy
  section now warns about the Heart beside the Brain.
- **Diphtheria toxin's producer** (#23): **an open design question, Kartik's, not a change.**
  The record is kept and the library shows it as readable but never produced (ruled 8
  September 2026). Whether a bacterium should release it, and which, is a deck decision: the
  deck's Diphtheria card is itself of type toxin, and only bacteria emit, so giving the toxin a
  producer means either a new bacterium card or a change to what Diphtheria is. Engine-adjacent
  either way; it lands here as a queued change only if Kartik says yes.

## How it ran — 30 September 2026

**Open, first.** *Each item as it stood when the queue merged, and then as Shantanu ruled it the same
evening.*

- **The printed rules and Q1 disagree** ([`FINDINGS.md`](FINDINGS.md) #105): the rulebook's Neutralise
  allows no trypanosome, and the app now does. A ruling before the deploy: ship ahead of the printed
  text, or wait for Kartik's wording. **Ruled: ship; the printed texts are to be fixed as seems best.**
  The app's own help states the rule since queue Q11's commit; the printed documents are not edited
  yet, and #105 carries the proposed wording.
- **The engine still writes English** (#53). Q8 brought every line it writes into the catalogue
  without ids; whether and when it emits them is a ruling. **Ruled: decided when the Hindi
  translation work starts.**
- **Whether a memory response should ever apply to a venom** (#55) was not part of Kartik's ruling,
  and stays his. **Ruled by Shantanu: never, the scientifically accurate answer. Built as Q11, below.**
- **Not deployed yet.** The relay and the app go out together, on Shantanu's word; a phone still on
  the old rules is refused and told to update. **Deployed 30 September 2026 at 21:25 IST** (*"Please
  deploy"*): the relay `20260930-212505-cb59b39`, its 41 tests passed, restarted with nobody
  connected, rules 4.0.0 and protocol 5 read back from the server; and the app
  `20260930-212705-cb59b39`, its start check passed, the live build carrying "Recall to the organ"
  and rules 4.0.0.

**The method: "the original, as ruled"** ([`DEVIATIONS.md`](DEVIATIONS.md) #10). Every change was
made twice, independently: in the port, and as an edit to the original's source applied in memory.
The corpus compares the two over every recorded game, and the untouched original is each rule
test's control. Every commit below passed `pnpm verify` before it was made, and each one that
changed the engine regenerated the catalogue and the coverage record with it.

| Commit | What |
|---|---|
| `3bf4fe6` | the harness: the original as ruled, with no change yet |
| `b27a923` | Q3, Pathogen X's tropism declared |
| `f7512de` | Q7, the actions' numbers into content |
| `e375386` | Q10, the `science` field removed |
| `74db81d` | Q2, the free-action slot removed |
| `95ab184` | Q5, the id counter into the game, old saves carried forward |
| `c4a3a6e` | Q4, antivenom teaches no memory |
| `d289dbf` | Q9, degranulate burns only where the fight is |
| `ebc1525` | Q1, antibodies may attempt a trypanosome |
| `e2871e7` | Q6, a resident's Recall |
| `4654a55` | Q8, every line the engine writes reaches the catalogue |
| `6f797e7` | the versions: rules 3.1.0 → 4.0.0, content 1.0.0 → 1.1.0 |
| `232e0ef` | the bands recalibrated; the findings closed; three more found on the way |
| `f295bd0` | the self-test's writes outlast a brief lock (#106) |

**The balance panel, under the reference bot v1**, on the check's fixed arm of 20 × 100 games per
difficulty, before (the engine at `1c89a8f`) and after (`6f797e7`):

| | before | after | moved |
|---|---|---|---|
| Training, turns survived | 15.6020 | 15.6765 | +0.0745 |
| Training, trunk kill share | 0.8953 | 0.8960 | +0.0007 |
| Training, antibodies made | 20.2335 | 20.3090 | +0.0755 |
| Training, organs damaged | 1.0415 | 1.0125 | −0.0290 |
| Normal, all four | 10.9935 · 0.9771 · 19.2915 · 2.1215 | the same, to four decimals | nothing |
| Hard, all four | 8.7655 · 0.9706 · 14.9265 · 2.2645 | the same, to four decimals | nothing |

Both passed the old bands, the largest move about 1σ. **All of Training's movement is Q9's,
measured:** with Q9 alone reverted in the port, Training returns to the before figures exactly.
The bot degranulates worms out on their branches, and that no longer burns the organ, so fewer are
damaged. Q4 cannot show, because the bot never uses antivenom ([`FINDINGS.md`](FINDINGS.md) §1).
Nor can Q1 or Q6: the bot attempts neutralise only on viruses, toxins, venom and blood-stage
malaria, and never moves a resident. **So the panel says the rules changed where the bot plays, and
nothing about the rest**, and most of the queue is in play the bot never makes.

**Recalibrated** at `6f797e7` on 24 arms of 2,000 games per difficulty (150,000 games, 12
minutes), the held-out arm passing on all three. Normal's and Hard's bands came out identical to
the old ones, as they must for an engine that plays those identically on the same seeds; Training's
moved, and every band names rules 4.0.0. The first attempt ran 8 arms, by the documented command,
and was stopped before it wrote (#103). The false-positive probe then judged 24
unseen arms of the same engine, 48,000 games, against the new bands: **0 failures and 0
single-metric breaches**, the worst excursion 2.66σ against the 3σ line, where the last
recalibration left it at 2.65σ.

**Coverage:** 97.46% of coverable branch arms against a target of 95%, 45 uncovered. The queue's
own changes are covered, Recall's refusals included.

**Controls:** 112 before the queue, 132 after. Each of the 20 new ones was seen firing for its own
reason, `pnpm ci:selftest:inert` finds none inert, and the full self-test run afterwards exercised
all 132: every one red where it must be and green where it must be, the tree left clean.

**Found on the way**, each recorded where it belongs:

- **#102:** the toast rendered 10 of the engine's 107 refusals loudly, four of them made by Q7, and
  the log's matcher chose between templates by a length that counted placeholder names. Fixed in Q8.
- **#58, corrected:** the engine had always logged a rare event, and the screens' own copy of the
  line doubled it. Deleted in Q8, with no engine change.
- **#103:** the documented recalibration command ran 8 arms and said 24. Fixed before any bands
  were written.
- **#104:** the reachability report had been stale since Q3, its currency check sampling two
  numbers. Fixed.
- **#105:** Q1 and the printed rules disagree. Open.
- **#106:** the first full self-test run died restoring a file on a brief Windows lock, and left
  `primitives.ts` mutated. Restored from git at once; the runner now retries and stops loudly.
- Four texts still described the rules before the queue: the engine's comment and a test's title
  saying the coat change can never fire, the reachability report saying the same, and a test title
  saying the engine honours `science`. Corrected.

### Q11, after the queue ran — the same evening

Ruled by Shantanu when the queue's open items came back (#55's second question: *"Do whatever is
scientifically accurate"*): **a venom is never remembered** ([`DEVIATIONS.md`](DEVIATIONS.md) #11).
Made twice, as the queue was, in commit `2c3296a`: `vaccinate` refuses a venom, and the draw gives
a venom no memory response whatever memory a game carries. The vaccine lab stops offering one; the
offered-subset-of-accepted harness caught the offer on recorded Normal games before the fix. The
app's help was brought level with the queue's rules in the same commit (#105).

**The balance panel saw it**, on the check's arm, against the bands of the queue:

| | Training | Normal | Hard |
|---|---|---|---|
| Queue (4.0.0) | pass | pass | pass |
| Q11 | pass, identical | **FAIL**: trunk kill share 0.9771 → 0.9668, −6.5σ | pass, small moves |

The bot vaccinated against venom on Normal and never uses antivenom; Training has no vaccines.
**Recalibrated** at `2c3296a` with the rules at 4.1.0 and the content at 1.2.0: Training's bands came
out identical, Normal's trunk kill share moved from 0.9774 to 0.9681, and Hard moved a little. The
held-out arm passes on all three, and the false-positive probe finds **0 failures in 24 unseen arms
and no metric past 3σ**, the worst 2.66σ, on Training, as before.

**It tipped a fast control** (#107). *"One fewer AP per turn fails the panel"*, on Normal, at the
control's small scale, became a coin flip under Q11's rules: one metric past 3σ where the rule needs
two, in four of five sizes measured. Against the shipped bands the same cut fails the panel on
Normal (antibodies made −15.0σ) and on Hard (−34.0σ), and the brain lane still does not. The control
now asserts the strength that holds at its scale, with a control of its own.

**Controls:** 135, the three new ones seen firing.

**Deployed 1 October 2026 at 00:26 IST**, on Shantanu's word, from `main` at the merge of #132: the relay
`20261001-002607-5994603`, its 41 tests passed, restarted with nobody connected, rules 4.1.0 and
protocol 5 read back from the server; and the app `20261001-003357-5994603`, its start check passed,
the live build carrying rules 4.1.0 and the new help for venom.

### Q12, after the queue ran — 2 October 2026: the gentlest difficulty is called Easy

Not one of the ten, and not a rule: a word. Shantanu ruled on 1 October that Training is renamed
Easy, on the screens, in the engine's own messages and in the printed texts, in one change
([`LOOK_PLAN.md`](LOOK_PLAN.md) §1 and §6), and on 2 October that it is done now and does not wait
for the guided game.

- **One message of the engine's 196 said Training:** the refusal of a vaccine on the gentlest
  difficulty. That message says Easy. Nothing plays differently, and the difficulty's key
  is `training` everywhere, as it was.
- **Made the queue's way:** in the port, and as one edit to the original applied in memory
  (`tests/equivalence/src/ruled.ts`), with a test that shows the word in both and the untouched
  original still saying Training, and a mutation control.
- **The screens and the printed texts in the same change:** seven sentences and one cell label in
  the catalogue; 9 places in the rulebook, 2 in the quick reference, 4 in the study packet.
- **Rules 4.1.1, content 1.3.0.** The bands were measured again for the version, on 24 arms and
  150,000 games, and no number in them moved: the rules play as they did.
- [`DEVIATIONS.md`](DEVIATIONS.md) #12.

### Q13, after the queue ran — 2 October 2026: a game may be handed its first turns, written

Not one of the ten, and not a rule: a way to start a game, for the guided game. Shantanu ruled on
2 October that the guided game scripts everything ([`LOOK_PLAN.md`](LOOK_PLAN.md) §18), then that
its seven turns are as listed and that the rules version does not move (§19).

- **What it is:** a new game may be handed the diseases that arrive on its first turns, by name. On
  a written turn exactly those arrive, and the draw rolls nothing. The draw that places the last of
  them removes the writing, and the game is an ordinary one from there.
- **What it leaves alone:** every game not handed the writing, which is every game the corpus
  holds and every game played together. Their states and their dice are what they were.
- **Made the queue's way:** in the port, and as five edits to the original applied in memory, with
  tests that show both doing it alike, the whole game compared after every action, and the
  untouched original as the control. Two mutation controls.
- **Rules 4.1.1, as it was.** The balance bands are not measured again: they are tied to the rules
  version, and no game the panel plays is handed the writing.
- [`DEVIATIONS.md`](DEVIATIONS.md) #13.

### Q14, after the queue ran — 2 October 2026: an antibody coats

Not one of the ten, and not a rule: a word. The engine called one action "tagged" in three
sentences and a coat in six, and the screens had followed it, so a bacterium was tagged and a worm
coated. Shantanu ruled on 2 October that if the two are the same thing the word is coat. They are:
one action in the engine, one thing an antibody does, and one name in the printed rulebook.

- **Three sentences of the engine's 196 said tagged:** the log line for a bacterium or a parasite,
  the refusal of a coat on something that cannot take one, and a resident's refusal with nothing to
  eat. They say coated and uncoated. Nothing plays differently, and the action's own name is `tag`
  everywhere, as it was.
- **Made the queue's way:** in the port, and as three edits to the original applied in memory, with
  tests that show the words in both and the untouched original still saying tagged, and a mutation
  control.
- **The screens in the same change:** the row's word, two sentences about residents, two of the
  lesson's. The printed texts already said Coat.
- [`DEVIATIONS.md`](DEVIATIONS.md) #14.
