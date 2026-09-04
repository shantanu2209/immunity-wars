# The command surface — plan for review

**Status: PLAN, 4 September 2026. Nothing built.** Written at Shantanu's request after the
selection model and undo were approved, to be ruled on in pieces before any action is added.
Grounded in the engine's `applyAction` cases and the session's query lists, not in memory of
them.

---

## 0. The count is seventeen, not eighteen

The readiness bar listed twenty engine action names. Two are built (`move`, `engulf`). Of the
remaining eighteen, **`activate` is a stub** — the engine rejects it unconditionally ("The
Helper T-Cell works by contact, not orders — stand it WITH the B-Cell or Killer T-Cell"), so it
is a rules explanation, not a player action. And **"present" is not an action**: antigen
presentation is a side effect of engulfing (`present(g, 1)` inside `engulf`/`resengulf`).
**Seventeen actions remain**, and the readiness bar's list is corrected accordingly.

## 1. Grouping and order — four shapes, four checkpoints

Grouped by what the UI has to DO, not by biology. Within a shape the actions differ only in
which query answers them and what they cost.

| CP | Shape | Actions | Count | What is new in the UI |
|---|---|---|---|---|
| **1** | **Attack from where you stand** — a cell acts on an invader the view says it can reach | `net`, `snipe`, `nkkill`, `strike`, `degranulate` | 5 | **Board targets generalised**: invader tokens become tappable targets (the move-ring mechanism, typed), plus command-bar buttons. No panel. |
| **2** | **Antibodies** — the B-cell's store acts on an invader, and gets refilled | `tag`, `neutralise`, `produce` | 3 | **The antibody panel** (per family: store / cap / net rate / blocked). First panel. |
| **3** | **Repositioning beyond `move`, and the residents** | `hop`, `recall`, `resmove`, `resengulf` | 4 | **Residents become selectable** (keyed by organ) — the one extension to the selection model. Move-class targets on the board. |
| **4** | **Body-level** — no cell involved; the body spends or responds | `memoryKill`, `antivenom`, `orderAntivenom`, `clonalSelection`, `vaccinate` | 5 | **The body panel**: antivenom stock and order progress, clonal-selection progress, the memory/vaccine list with an AP chooser. |

**Why this order.** CP1 is the shape most actions share and needs no panel, so it proves the
generalised target mechanism on the cheapest ground. CP2 is the game's core loop — nine of the
ten draws in the S25 run were things only an antibody can start on — and its panel is the one
every later screen leans on. CP3 extends the selection model itself, which is safer once the
target mechanism has been reviewed twice. CP4 is panel-heavy and late-game (vaccines,
antivenom, the novel pathogen), so it is last without making a newcomer's first turns wait on
it. **Undo class stays as ruled**: `hop`, `recall`, `resmove` are moves; everything else here is
commitment.

## 2. What each action needs — and which are blocked on a panel

Legend for "target source": the query in the session view that answers legality. Every action
has one, or a combination the view already carries.

| Action | Cell | Params | Target source in the view | Cost | Needs |
|---|---|---|---|---|---|
| `net` | Neutrophil | none — the engine nets every eligible invader on the swarm | `state.netTargets` (non-empty ⇒ standing on a swarm) | spends the cell | bar button |
| `snipe` | Killer T | `invaderId` | `state.snipeTargets` | spends the cell | board targets + button |
| `nkkill` | NK | `invaderId` | `state.nkTargets` | spends the cell | board targets + button |
| `strike` | Monocyte / Eosinophil | `invaderId` | `perCell.wormStrikeable[cell]` (tagged, same place) | spends the cell | board targets + button |
| `degranulate` | Eosinophil | `invaderId` | `perCell.wormStrikeable.eosinophil`, AP ≥ 2, alive | 2 AP | board targets + button |
| `tag` | B-cell's store | `invaderId` | `perInvader.canTag` (includes the store check) | 1 antibody of the family; spends the B-cell unless remembered | board targets + button; **panel for comprehension** |
| `neutralise` | B-cell's store | `invaderId` | `perInvader.canNeutralise` (includes the store check) | 1 antibody; **2 AP for a toxin, 1 otherwise** | board targets + button; panel for comprehension |
| `produce` | B-cell | `family` | `production[f]` + `perFamily.capFam` — **plus `blocked`, see §3** | spends the B-cell | **BLOCKED ON THE ANTIBODY PANEL** |
| `hop` | any mobile cell at the lymph crossing | `lane` | `flags.lymph`, `state.lymphBlocked`, cell at `LYMPH_STEP` on a lymph lane; partners from content `LYMPH_GROUP` | spends the cell | board target on the partner crossing |
| `recall` | any mobile cell not at the hub | none | cell alive, `zone !== 'hub'` | spends the cell | bar button |
| `resmove` | resident (by organ) | `organ`, `step` | `flags.residentMove`, step ± 1 within `perOrgan.branchLen` | spends | board targets (two rings) |
| `resengulf` | resident (by organ) | `organ`, `invaderId` | `perOrgan.residentEatable[organ]`, `!ate`, `!infectedBy` (residents are in the view) | free, once per turn | bar button |
| `memoryKill` | **none** | `invaderId` | invader `remembered` && `perInvader.attackable`; 1 AP on Hard | free / 1 AP | **body-level target** — see §3 |
| `antivenom` | **none** | `invaderId` | `state.antivenomTargets`, `antivenom > 0`, AP ≥ 3 | 3 AP + a dose | board target + **BODY PANEL** (stock) |
| `orderAntivenom` | **none** | `ap` (1..n) | AP ≥ 1; progress `avOrder` / content `ANTIVENOM_ORDER` | chosen AP | **BODY PANEL** |
| `clonalSelection` | **none** | none | `novelSeen && !cloneFound`, AP ≥ 1; progress `clone` / `CLONE_COST` | 1 AP per press | **BODY PANEL** |
| `vaccinate` | **none** | `disease`, `ap` (1..n) | not Training; `seen[dz] && !memory[dz]`; progress `vaccine[dz]` / `VACCINE_COST` | chosen AP | **BODY PANEL** (memory list) |

**So the panels come DURING, each with the checkpoint that needs it**, not before or after:
the antibody panel with CP2 (`produce` cannot exist without it, and `tag`/`neutralise` are
unreadable without seeing the store), the body panel with CP4 (four of its five actions have
no home otherwise). CP1 and CP3 are pure command-bar-plus-board. The **teaching-prose (log)
panel** is not on any action's critical path and is scheduled after CP4 as CP5, before the
newcomer test — the goal dialog states the objective, the log is what explains the biology as
it happens.

## 3. Where the standing rule is HARD to honour

> *Offer only legal targets from the view's queries, so rejections are rare because illegal
> options are not offered.*

Sixteen of seventeen reduce cleanly to a list the view already computes (table above). The
places that needed a decision, stated before anything is built:

1. **`produce` under immunosuppression.** The engine refuses when `fx.noProduce` is set, and
   `fx` is one of the 13 keys the view deliberately drops. The scoped `productionBreakdown`
   carries `blocked`, but only for the selected family — the panel could not grey the family
   list until a family was picked. **Resolution: the session's `ProductionSummary` gains
   `blocked: boolean`.** It is already built per family from `productionBreakdown`, which has
   the field in hand; one line, no engine change, no payload concern (seven booleans). The
   only case where the rule needed a session addition rather than an existing query.
2. **`neutralise` costs 2 AP for a toxin, 1 otherwise — and the 2 is a literal in the
   engine**, not a content constant. The UI must know it to withhold the button at 1 AP.
   Honest options: mirror the literal in the UI with a comment (a duplicated rule — the hazard
   CLAUDE.md names), or make the engine read a content constant (an engine edit, behaviour
   unchanged, but Phase 2 says the engine is frozen). **Proposal: mirror it in the UI, and pin
   it with a spanning test** in the session suite that drives the engine directly — a toxin at
   1 AP must be rejected, at 2 accepted — so the mirror cannot drift silently. Shantanu rules.
3. **Five actions have no cell.** The selection model is cell-as-mode; `memoryKill`,
   `antivenom`, `orderAntivenom`, `clonalSelection`, `vaccinate` belong to the body. They need
   a home that is not a selected cell: **the body panel**, always visible in the command
   phase. Two of them (`memoryKill`, `antivenom`) also want board targets — a remembered
   pathogen, a venom — which means **a second source of board targets that exists while
   nothing is selected**. The target mechanism from CP1 must be built to take targets from
   either source, or CP4 rebuilds it. This is the one design decision CP1 should make early.
4. **`net` and `resengulf` let the engine pick the target.** `net` takes no id and nets the
   swarm; `resengulf` falls back to the first eatable invader. So the UI offers **one button
   per swarm / per resident**, not one per invader — which is also the honest shape, since the
   player is not choosing.
5. **`vaccinate` and `orderAntivenom` take an AMOUNT** (`ap`, 1..n). Legal amounts are
   1..min(AP, what is still needed). Legacy offered "+1 AP / +2" buttons; a small chooser in
   the body panel does the same. Not hard, but it is the only parameter that is not a target.
6. **Residents become selectable** (`resmove`, `resengulf`). This is the one extension to the
   approved selection model: a resident is a candidate keyed by its organ, with its own target
   set (two step rings, an engulf button) and its own reasons (already ate; infected;
   residents cannot move on this difficulty). Undo: `resmove` is a move, `resengulf` commits.
7. **"Always answers" grows with every action.** The reason line for a selected cell with no
   legal target must now consider each of its actions — a per-cell reason table (Neutrophil:
   not on a swarm; Killer T: nothing hidden in range; Eosinophil: nothing coated here; …). It
   is the real cost of the rule and it lands with each checkpoint, not at the end.

**Making the rule a CHECK, not a resolution.** The rule is machine-checkable: for random
reachable states, every target the UI would OFFER must be one the engine ACCEPTS. Proposal for
CP1: a session-suite test that walks recorded games, computes the offered set from the view
exactly as the shell does, and applies each to a cloned state through the engine — offered ⊆
accepted, every action, every state. Its negative control: a deliberate over-offer (a target
the engine rejects) must fail it. Each later checkpoint extends the same test. A check that
has never failed is not known to work — the mutation runs before it is trusted.

## 4. Checkpoints — what is reviewable when

Each checkpoint is one PR, `pnpm verify` green, a headless walkthrough of every new action in
the real app shell, and an S25 step/expect list like the selection model's.

- **CP1 — attacks (5). BUILT 4 September 2026; the two-sources design and the walkthrough are recorded in `for-P2.5.md`.** Reviewable: the generalised board-target mechanism (typed targets,
  one source now, designed for two); five actions; the offered-⊆-accepted harness with its
  control; reason lines for Neutrophil, Killer T, NK, Eosinophil.
  *S25 check:* Neutrophil onto a swarm → NET; Killer T at the hub → a hidden pathogen in
  range highlights; an uncoated worm → the Eosinophil's reason line.
- **CP2 — antibodies (3) + the antibody panel.** Reviewable: the panel (store/cap/net/blocked
  per family); `produce` through it; `tag` and `neutralise` as board targets that appear only
  when a matching antibody is held; the session's `blocked` field; the neutralise-cost mirror
  with its spanning test. *S25 check:* produce ENV, tag a bacterium, watch the store fall;
  neutralise a toxin at 1 AP is not offered.
- **CP3 — repositioning and residents (4).** Reviewable: residents as selectable candidates;
  `hop` as a ring on the partner crossing; `recall`; undo classing (three moves, one commit).
  *S25 check:* two resident steps then Undo; hop across the lymph link; resengulf ends Undo.
- **CP4 — body-level (5) + the body panel.** Reviewable: the panel; the second target source
  (memory response, antivenom dose) while nothing is selected; the AP chooser. *S25 check:*
  needs Normal difficulty for vaccines; a remembered pathogen highlights on arrival.
- **CP5 — the teaching-prose panel**, then the readiness bar is re-measured (drive an idle
  game and a played game to conclusion by touch, in the app shell) and the newcomer test is
  scheduled.

## 5. The session boundary

Shantanu's plan: clear after the command surface is complete. **Suggestion: clear after CP2
instead, and again after CP4 if needed.** CP1 and CP2 settle the two mechanisms everything
later copies (typed board targets; a panel that reads the view) — that is where the design
context lives and where the boundary pass has the most to capture. CP3 and CP4 apply those
mechanisms and carry less that is not already written down. A single clear after four
checkpoints of code risks the context being compacted before the pass is made, which is the
one way the boundary question gets answered by accident.
