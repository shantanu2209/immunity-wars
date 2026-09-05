# The engine change queue — Phase 3, measured against the corpus in one pass

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
| **Q7** | **`neutralise`'s 2-AP toxin cost into content** | Shantanu, at CP2 | The 2 is a literal in the engine, mirrored in the UI with a spanning test | #52 |
| **Q8** | **Queries and log sites emit ids, not prose** | Shantanu, at CP2/CP5 | The Hindi edition renders five composed log lines in English until then | #53 |
| **Q9** | **Degranulate burns the organ only when the fight is IN the organ** — organ damage when the Eosinophil (and its target) stand at branch step 0, not anywhere on the branch | Shantanu, S25 pass of 5 September 2026 | Eosinophil degranulation damages the tissue it happens in; granule proteins released on a lane are not released in the brain. Today  keys the burn to the TARGET being on a branch at any step, so a strike at step 1 of the Brain branch cost the Brain a point. Kartik's ruling that degranulate's cost is a risk you accept assumed the damage happens where the fight happens | #57 |

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

| Workaround | Where | Deleted with |
|---|---|---|
| `NEUTRALISE_TOXIN_AP` mirror + its spanning test | `packages/ui/src/play/offered.ts`, `tests/session/src/neutralise-cost.test.ts` | Q7 |
| `productionText.ts` mapper; `engineLogText` templates for the five composed sites; `log-text.test.ts`'s "only misses" pin; `$meta.unextractedSites` | `packages/ui`, `tests/session`, `engine.json` | Q8 |
| `advanceIdsPast` at `LocalSession.resume` + `resume-ids.test.ts` | `packages/session/src/local.ts`, `tests/session` | Q5 |
| The UI's `canAct` reading `free` | `packages/ui/src/play/offered.ts` | Q2 |

## What is NOT queued — ruled "no change", with the reasoning a judge would ask for

- **Degranulate at the Brain** (#18): **no change.** Kartik: it is a risk you live with. The real
  danger is worms; there can only be two per game, and on Hard they spawn at the organ but you
  still have three turns before damage, so degranulate may not be needed at all. Using it means
  accepting its cost.
- **The Heart's 2-step branch** (#15): **intended.** Kartik: pathogens travel from the
  bloodstream outward, so the heart is genuinely the quickest to reach. The rulebook's strategy
  section now warns about the Heart beside the Brain.
