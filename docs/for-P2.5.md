# For P2.5 — visual decisions noticed early and deliberately not taken

> **P2.5 plan, approved by Shantanu 20 Aug 2026 — readable, then playable, then finishable:**
> **1** stacks: fan-of-types + tap-to-inspect, WITH the inspect view designed deliberately as
> the touch-target pattern Gate 1 rests on (board = coarse pointing at nodes; inspect =
> precise ≥44px controls); hub-zone mock-up for ruling, not settled unilaterally.
> **2** command UI slice, i18n-first (hardcoded-string check + negative control land with the
> first screen), and the **Nunito decision moves here by reorder** — OFL file committed and
> the stack set when the first real screen lands, not after three screens exist.
> **3** turn loop (draw/reveal, spread narration + pacing decision, win/loss) — the first
> moment a stranger can play, i.e. Gate 1's human test; **the newcomer-test protocol is
> drafted as part of this piece** (who, device, difficulty, what counts as finished — a loss
> counts — and what is recorded) and Shantanu reviews it before it runs.
> Then: panels (organ integrity, production/antibodies, memory/vaccine, log) · dialogs
> (events, rares, antivenom, Pathogen X) · the hub zone build · 46 strings screen-by-screen ·
> touch/200%/contrast audits · the mandatory per-redraw re-measure.

The P2.2 tripwire is *deciding how something should look rather than whether it renders*
([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §2). Anything that trips it lands here as a note and waits.
An entry is one line: what was noticed, and where. No mockups, no rankings — P2.5 decides.

- Token palette: the slice uses placeholder red-fill invaders / blue-outline cells and gray board
  lines, chosen only to be distinguishable. Real palette is P2.5's. (`Board.tsx`)
- Organ labels: the slice shows the organ KEY (`marrow`), not a display name — display names,
  their catalogue home, and label typography are P2.5's. (`Board.tsx`)
- Token art: letters-in-circles now; §5 of the brief says raster illustrations via `<image>`
  through the art pipeline. (`Board.tsx`)
- ✅ DECIDED (Shantanu, 20 Aug 2026) — co-located tokens STACK at one position with a count
  badge; tapping the stack expands it into an INSPECT view (not playable, so collisions with
  lanes/nodes don't matter there); tapping a pathogen's card brings it to the top. This
  replaces fanning entirely — 7 tokens fanned at 20px would span 138px, 38% of a phone's
  width. The 16u fan spacing in geometry terms is thereby IRRELEVANT, not a value to change.
  P2.5 builds this; `Board.tsx`'s fan is dev-slice scaffolding until then.
- ✅ RULED (Shantanu, 30 Aug 2026) — spread pacing is **900ms standard / 1400ms dice, with
  tap-anywhere-to-advance**, replacing the legacy 560/800ms. The reasoning that carried it:
  for a newcomer the frame headline is information, not confirmation — 560ms does not fit
  reading a label AND registering which tokens changed — and the tap makes the exact numbers
  low-stakes while reusing a surface that is already dead during bursts. Nothing re-run,
  confirmed: the P2.3 budget rows are all per-frame or per-tap, none depend on the
  inter-frame delay, and `tools/perf/measure.ts` waits on DOM conditions with 30–120s
  timeouts. Built in `PlayScreen.tsx` + `SpreadNarration.tsx`; the ruled numbers verified
  live (dice frame held ~1374ms, standard frames ~935/~869ms, a tap ended the final wait
  immediately).
- **For the P2.5 closeout** (noted by Shantanu, 30 Aug 2026): the card reveal's arrival diff
  earned its keep on its second turn of existence — the walkthrough drew two Strep throat
  cards in one turn and the dialog listed both, where the view's `drawn` (first card only)
  would have silently shown one. The diff-by-invader-id design was necessary, not defensive.
- **The Play → Result join was crossed for real, on the LOSS path** (30 Aug 2026, applying
  FINDINGS #50's lesson that a wired join is not a verified one): a headless driver played an
  idle Training game in the real app shell — idling guarantees a conclusion by turn 30 — and
  lost at turn 6 to the Kidneys. The Result screen rendered the organ name and stats, all
  three nav buttons present, and **the autosave was confirmed deleted at Result** (the saves
  store read back empty), so Continue can never offer a finished game.
- [ ] **CLOSEOUT CHECKLIST ITEM (Shantanu, 30 Aug 2026): the WIN path has been crossed.**
  A loss and a win are different paths and only the loss has been walked — the win-side
  Result (headline, stats, autosave deletion) has never rendered from a real game. Expected
  to fall out of the newcomer test or the first full human playthrough; the closeout may not
  claim the join verified until this box is ticked with the run that ticked it.
- **For Phase 3, flagged for Kartik rather than changed** (Shantanu, 31 Aug 2026): the goal
  dialog opens with *"You command the body's immune cells."* That is right for single-player
  and becomes **untrue in Phase 3**, where each player commands some of them. It stands as
  written for P2.5; the multiplayer edition needs its own opening line (`goal.arrive` in
  `ui.json`), and this note exists so nobody discovers that late.
- **KNOWN AND VERIFIED behaviour, not an open item** (ruled 30 Aug 2026): under background-tab
  timer throttling a burst pauses mid-spread and resumes on foreground, with tap-to-advance
  still working (taps are event-driven). Valid state throughout — found by driving a hidden
  tab, verified by advancing the stalled burst with a tap. This is exactly the shape of a
  mystifying phone bug report ("the spread froze"), so it is recorded as expected behaviour
  the support answer can point at.
- The spread shows only the frame label ("Bacteria divide") — legacy renders dice; how a spread
  narrates is P2.5's. (`main.tsx`)
- ~~Entry-label collision with route art~~ — resolved by the radial annotation layout
  (20 Aug 2026): icons and labels sit outside the play circle at uniform ray distances.
  (`Board.tsx`)
- Tokens render at 20px and organs/entries at 30px since the P2.4 art landed (Shantanu's
  showcase ruling) — but Gate 1's ≥44px touch targets still need a hit-area strategy
  (invisible expanded hit regions, or the stack-inspect view as the touch surface).
  (`Board.tsx`, 20 Aug 2026)
- ~~Fan spacing narrower than a token~~ — superseded by the stack-with-badge decision above;
  the overlap problem dissolves with fanning itself. (20 Aug 2026)
- `toxin`/`venom` and `malaria`/`parasite` share byte-identical art in `art_data.js`; whether
  those pairs deserve distinct icons is Kartik's call. (same measurement)
- Lymph connectors are straight dashed segments through the `LYMPH_STEP` nodes — short and
  local now that the layout matches the A2 (FINDINGS #49 resolution), but the print curves
  them and adds arrowheads and a "LYMPH" label (needs an i18n home). (`Board.tsx`, P2.4)
- ~~Wash disc omitted~~ and ~~step nodes half the print's proportion~~ — both resolved by the
  A2-layout regeneration (`tools/geometry-from-a2`): the wash renders at the print's radius and
  alpha, and node/hub/box sizes now come from the generator's report. (P2.4, second pass)
- ✅ Typography DECIDED and shipped (P2.5 piece 2, per Shantanu's reorder): Nunito (OFL)
  bundled at `packages/app/public/fonts/` (39KB latin variable woff2 + `OFL.txt`), first in
  the board's stack with the humanist fallbacks behind it; fully offline. The A2's DejaVu
  deliberately not carried over (a print face, not shipped on phones). Label sizes still
  unmatched to the print's scale. (`Board.tsx`, `packages/app/index.html`)
- ✅ DECIDED (Shantanu, 20 Aug 2026, on the measurement in
  [`STACK_COLOCATION.md`](STACK_COLOCATION.md)) — **FAN-OF-TYPES on routes, branches and
  organ tissue**: one token per distinct type, each with its own count badge; two diseases of
  the same type stay in tap-to-inspect. Off-hub nodes hold ≤2 distinct types ≥99.3% of the
  time and never 4, so this loses nothing. P2.5's opening item.
- **THE HUB IS A ZONE, NOT A NODE — its own design problem, ruled explicitly NOT a variant
  of stacking** (Shantanu, 20 Aug 2026). Up to 49 invaders, 4 distinct types, plus the
  player's seven cells, in one 100u circle. Whenever the co-location numbers are quoted,
  their label travels with them: mirror of the reference bot, which under-kills — stacking
  OVERESTIMATED relative to human play, wrong in the safe direction.
- ✅ **HUB LAYOUT DECIDED: VARIANT B** — invader type-tokens (badged) clustered in the
  centre, cells ringed at the inner edge. Ruled by Shantanu and Kartik independently of the
  builder's lean, which matched (noted deliberately: two readers, one answer, before seeing
  each other's reasoning). Grounds: (1) threats are the decision-relevant information and
  belong in the hub's most legible region; (2) graceful degradation — cells LEAVING the hub
  is the normal state of a game in progress, so variant A (cells arced above, types below)
  would be lopsided most of the time and balanced mainly at setup. **A's counter-argument is
  recorded so this reads as a considered choice, not a default:** A's two-register layout
  ("yours above, threats below") is calmer and more teachable in a first game — but that is
  an onboarding problem, which is P2.6's job, and solving a teaching problem with a permanent
  layout compromise is the wrong trade. Both variants render in the showcase
  (`pnpm art:showcase`) at magnified and true size.

## Cell selection — the assessment, recorded BEFORE Shantanu's specifics (4 September 2026)

Shantanu's ruling from the S25 touch pass: selection needs work, and it is the more valuable
finding because every remaining action is built on it — nothing more is built on the pattern
until it is right. He asked for the builder's read first, so the two can be compared. This is
that read, from the code as it stands (`Board.tsx`, `PlayScreen.tsx`, `CommandBar.tsx`,
`InspectSheet.tsx`, `LocalSession`):

- **An ambiguous tap resolves silently.** Two tap paths exist: a direct hit on a 20px cell
  token selects it (and suppresses inspect); any other board tap opens the inspect sheet for
  the nearest node within 60u, nearest wins with no tiebreak shown, and a tap farther than
  60u from everything does NOTHING — a dead tap. In a stack, the top token wins the direct hit,
  so choosing a specific cell in a stack is a 20px precision tap, which is the opposite of the
  coarse-pointing design the inspect sheet exists for.
- **What is selected is shown by a thin orange ring on a 20px token, the name and AP in the
  command bar, and green move rings** — the rings are the only strong signal, and they exist
  only when the cell can move. A stationary B-cell reads as selected from the bar alone.
- **Deselect is one button in the command bar.** Tapping the selected token again re-selects
  (no toggle); tapping empty board inspects or does nothing; there is no tap-away.
- **Selection persists across everything**: after a move (fine — chaining), after AP reaches
  zero (stale, no targets, no message), across the spread into the next turn's infection phase
  (stale highlight on a board where nothing is actionable). The session never clears it; only
  the UI's Deselect does.
- **A selected cell with no legal action is silent.** No rings, no line, no reason (no AP /
  stationary / spent / offline). The engine's rejection text appears only if an action is
  attempted, as small red text in the controls row — an engine string, not through the
  catalogue.
- **An accidental wrong move is irreversible in the UI.** A move-target ring is r ≈ 23u
  (≈25px diameter at 360 — under the 44px target) and fires on a single tap with no confirm.
  The engine HAS `undo` (a snapshot stack, cleared at `beginCommand`) and the UI does not
  expose it; `undo` is one of the 13 view-dropped keys, but `LocalSession` holds the state
  and can carry a `canUndo` boolean in `SessionView` without any engine change.

**What would change if nobody said anything:** (1) selection becomes a MODE that always
produces a visible answer — highlighted legal targets, or an explicit "cannot act: reason"
line, never silence; (2) selection clears at phase boundaries (draw, end of command) in the
session, and tap-away / tap-again deselect on the board; (3) one tap path, coarse: nearest
node ≤60u → exactly one of your cells there selects it directly, otherwise the sheet with its
≥44px rows chooses; (4) undo exposed in the command bar during command phase, from a
Session-level `canUndo` — the answer to the accidental touch, in place of confirm dialogs;
(5) move-target hit areas ≥44px behind the drawn ring; (6) rejection text through the engine
catalogue, next to the command bar — and, as the standing rule for the eighteen actions still
to build, **offer only legal targets from the view's queries so rejections are rare**, since
the selection-scoped view already computes them.

### ✅ RULED and BUILT (Shantanu, 4 September 2026): the six points, plus undo for moves only

All six points above were adopted as written. One addition and one constraint:

**Undo is for MOVES only, and it is a SESSION rule — a design distinction, not a safety
valve.** Movement is repositioning: no dice, no hidden information, you can see where a cell
would land, so undoing a move corrects a mis-tap. Everything else is COMMITMENT — attacks roll
dice, engulf consumes a target, produce changes the pool — and undoing those would re-roll a
bad die and turn a cooperative puzzle into trial-and-error. So:

1. **Session rule, not engine.** The engine's snapshot stack does not know action types and is
   frozen. `LocalSession` tracks whether a committing action has happened this command phase
   and drops undo availability when one does. (`SessionView.undo = {available, moves}`.)
2. **ALL moves, not just the last.** Undo unwinds to the start of the command phase while only
   moves have happened, action points included — stated explicitly rather than left to the
   stack's behaviour. It cannot be exploited because no dice have been rolled.
3. **A REJECTED committing action does not end undo.** Nothing happened.

Seven tests pin the rule (`tests/session/src/undo-rule.test.ts`, written first and run red),
including the two the engine would get wrong on its own: a committing action the engine does
not snapshot (`orderAntivenom`) still ends undo, and a rejected undoable action — which the
engine snapshots BEFORE checking — still unwinds exactly to the phase start.

**Refinements made while building, stated so they can be argued with:**

- **The move class is `move`, `hop`, `recall`, `resmove`.** `recall` (back to the hub)
  and `resmove` (a resident one step) are repositioning by the ruling's own definition;
  `hop` (the lymphatic crossing) rolls nothing. Everything else is commitment.
- **A RESUMED game mid-command starts with undo unavailable** for the rest of that phase:
  the engine stack is there but whether a committing action happened is unknowable from the
  state, and the save carries the `GameState` only. Conservative and honest; a known
  limitation of the single-slot save.
- **Tap candidates are per TOKEN, not per node.** The ruled "exactly one of your cells at the
  nearest node selects it" would have sent every hub selection through the sheet — all seven
  cells start at the hub. Cells are individually addressable at their drawn (fanned)
  positions, so the nearest token within 60u selects; a node with invaders or a resident is a
  candidate for the sheet; a legal target is a candidate that acts. Nearest wins; on a tie,
  target beats cell beats node (`packages/ui/src/board/tap.ts`, modelled in `tap.test.ts`
  before it was trusted). A direct hit on a cell token is that cell — which is also how the
  perf driver taps, with coordinate-less clicks on `[data-cell]`; the driver ran end to end
  after the change.
- **"What's here"** in the command bar opens the sheet for the selected cell's node when
  invaders or a resident stand there — the one thing the one-tap-path would otherwise make
  unreachable (tapping that node now selects/deselects the cell).
- **Selection clears at phase boundaries in the session** (`draw`, `endCommand`), so every
  consumer agrees; a move keeps it (chaining).
- **Rejection text goes through the engine catalogue** (`ENGINE_I18N_EN`, the Phase 1
  extraction, now consumed for the first time via `engineText()`), shown in the command bar;
  an engine string the catalogue does not know renders loudly.

**The standing rule for the eighteen actions still to build: offer only legal targets from
the view's queries, so rejections are rare because illegal options are not offered.**

## CP1 — attacks from where you stand: BUILT (4 September 2026), for review

**The two-sources design, shown here as ruled rather than discovered at CP4.** One pure
module, `packages/ui/src/play/offered.ts`, is the only place the UI decides what is legal,
and it only reads the view. `offeredActions(view)` returns `{source, board, buttons,
reason}`:

- **Source `cell`** — the selected cell's offers: its selection-scoped moves, and the attacks
  its queries answer (`macrophageEatable`, `wormStrikeable[cell]`, `snipeTargets`,
  `nkTargets`, `netTargets`), each gated by the engine's generic AP-or-free rule and by
  spent/offline.
- **Source `body`** — `bodyOffers(view)`: offers that belong to the body, shown while
  NOTHING is selected. Empty in CP1; the shell already renders and dispatches whatever it
  returns, so CP4's memory response and antivenom dose are additions to one function, not a
  second mechanism.
- **Shape `board`** — positioned targets, typed `move` (at a node) or `attack` (on an
  invader). The Board draws a move as the green dashed node ring and an attack as a red ring
  around the type-group token standing for that invader; every ring is a tap candidate in the
  one tap path. Several offers may aim at one invader (Eosinophil: strike OR degranulate) —
  one offer acts on the tap, more open the sheet's ≥44px rows to choose.
- **Shape `buttons`** — offers with no position or where the engine picks the target itself
  (`net` nets the whole swarm the Neutrophil stands on).
- **`reason`** — set whenever no ATTACK is offered, even if moves are: muted beside the move
  hint ("works by contact", "not on a swarm yet"), red when nothing at all is offered. That
  refinement came out of the headless walkthrough — a Helper T at the hub was answering "tap a
  node to move" and nothing else, which is an answer but not the one a newcomer needs.

**The standing rule is now a CHECK** (`tests/session/src/offered.test.ts`): recorded bot
games, three seeds × three difficulties, every command-phase state, every cell — every offer
applied to a cloned state through the engine must be accepted. Green on first run over every
offer; its control (the Killer T offered every invader) fails it. It spans ui → session →
engine the way a tap does.

**Verified in the real app, headless:** NET by button (Neutrophil walked onto a Yellow fever
swarm; invader gone; the bar then reads "spent and regenerating"); snipe by ring (Killer T,
Toxoplasmosis, two steps out, ring, tap, gone); engulf by ring (Norovirus; Undo ended on the
commit). Strike and degranulate share the strike targets query with the Eosinophil's sheet
rows and are covered by the harness; a coated worm did not occur in the 19-game run, so their
tap path is the S25 list's to see.

**Not in CP1, by design:** `tag` (CP2) — which is why the Monocyte's strike never fired in
the walkthrough: a worm must be coated first.

## CP2 — antibodies and the antibody panel: BUILT (4 September 2026), for review

**The first panel.** `AntibodyPanel` sits under the command bar on the play surface: one
chip per family (store / cap, net rate with ↑ boosted / ↓ reduced / Blocked), tapping a chip
selects the family through the session (`selection.family`), so the selection-scoped
`productionBreakdown` answers with the detail — base rate, every effect on it, why the store
is capped — and, when the B-cell is selected and the family may be produced, the Produce
button. The novel antigen's row (X) appears only once the body has met one.

**The B-cell's offers** (`offered.ts`, same module, same harness): `tag` and `neutralise`
as attack rings on any attackable pathogen the store matches (`canTag` / `canNeutralise`
already include the store check; the B-cell never moves, so its reach is the whole board);
`produce` as panel buttons per family where not blocked, not full, and — for X — the clone is
found. The offered ⊆ accepted harness stayed green with all three added.

**The two rulings from §3 of the plan, as built:**
- **`ProductionSummary.blocked`** (session, one field, no engine change) — the panel greys a
  blocked family and `produce` is withheld; `production-blocked.test.ts` pins it both ways
  (a fresh game is not blocked; a state with `fx.noProduce` reports every family blocked at
  net 0).
- **The neutralise-cost mirror** — `NEUTRALISE_TOXIN_AP = 2` in `offered.ts`, pinned by
  `neutralise-cost.test.ts`, which searches recorded games for an unremembered neutralisable
  toxin (vacuity-guarded) and drives the engine directly: rejected at 1 AP with the engine's
  own message, accepted at 2. FINDINGS #52 is the record that this is a workaround. The offer
  also honours the engine's memory-response waiver: a remembered pathogen is offered at any AP.

**Verified in the real app, headless:** the panel renders every family; select the B-cell →
its reason line ("no antibody you hold matches a pathogen in reach — make some") beside the
"produce in the panel below" hint; tap a chip → Produce ICB → store 0/5 → 1/5 and AP 6 → 5;
the bacterium's red ring appears for the B-cell → tap → **tagged** (ring gone, AP 4, store
back to 0); a fresh game: Produce NAK → ring on the virus → tap → **neutralised**, token gone.

**What the loud marker caught (FINDINGS #53):** the first tap on a family chip rendered
"⟪engine: Helper T-cell present but NOT yet primed…⟫" — the breakdown's effect labels and cap
reasons are prose the engine's QUERIES return, which the Phase 1 extraction never reached.
Mapped through the ui catalogue by `productionText.ts` (the templated "Rate ceiling (N/…)"
by its number), loud on anything new; the correction — the engine emitting ids — is Phase 3's.

**Session-boundary note (the clear comes after CP2):** everything a next session needs is in
`P2_5_PROGRESS.md` ("State at the boundary"), the plan's checkpoint list, and this file.

## CP3 — repositioning and residents: BUILT (4 September 2026), for review

**The one extension to the selection model, as ruled.** `Selection` gains `resident: string |
null` — an organ key, because a resident is keyed by its organ (the engine spends
`res_<organ>`) and `scope()` hands `cell` to `moveDestinations`, which knows no residents. The
two fields are exclusive; both clear at phase boundaries. Nothing is selection-scoped for a
resident: its patrol steps (± 1 within the branch) and what it can engulf
(`perOrgan.residentEatable`) were already in the view, so the payload cost is zero.

**The four actions, in `offered.ts` under the same `cell` source and the same harness:**
`recall` as a bar button off the hub; `hop` as a ring at each partner crossing, drawn in
**lymph blue** (ruling 3 — the dashed connectors already teach lymph in blue), with the lane
passed explicitly because the engine falls back to its first partner otherwise; `resmove` as
"Patrol" rings at step ± 1; `resengulf` as **attack rings per pathogen** (ruling 1 — the engine
honours a supplied `invaderId`, so the choice is real here in a way it is not for `net`, and
the same action keeps one interaction shape whichever macrophage performs it). Undo classes as
ruled: three moves, one commit — the engine's own snapshot set already held all four.

**Telling a resident from the Monocyte on the same node — leaning on the biology.** The
player's macrophage is called **Monocyte** everywhere in this UI (CNAME); a resident carries
its real tissue name from the rules pack — **Kupffer cell**, Microglia, Alveolar macrophage —
with "resident of the Liver" muted beside it, in the command bar and in the sheet. A monocyte
is the blood-borne precursor; the residents are the tissue macrophages under their historical
names, so the naming is already the science and the UI adds no label. On a shared branch node
the two fan side by side, and the sheet is the precise chooser: two ≥44px rows, both selectable
(the resident row was a non-selectable line showing the raw organ key — "liver" — fixed). The
token keeps a **double ring** in the organ brown, no new colour.

> **Recorded for the art pass, deferred with the pipeline:** distinct resident-macrophage art
> is the real answer. Both tokens use `cell-macrophage` today; a ring at 20px is a weak
> signal. Taken when the pipeline next runs for another reason (the `sharp` deferral,
> SECURITY_NOTES) — one asset through the same deterministic pipeline, provenance recorded.

**The reason line for a selected resident, in the engine's gate order** (infected → already
fed → cannot patrol → no AP → nothing eatable), pinned against the engine's own verdict on the
same state in `resident-reasons.test.ts`. The step-0 line is the one that earns the phase:
*"Nothing to engulf at the organ itself — patrol the Kupffer cell up its branch to meet a virus
or a tagged bacterium."* FINDINGS #5 measured that a resident at its organ can never eat, the
bot never worked it out, and now the interface says it — the game teaching something the
instrument could not learn. **Ruling 2 is pinned there too:** an infected resident is still
offered patrol (the engine accepts it; the legacy UI blocked it and had quietly become a second
rules source), with the parasite line muted beside the rings.

**The instrument finding (FINDINGS #54), fixed inline.** Counting the harness corpus per action
showed `net` at **zero offers in 652 states** — the bot never moves the Neutrophil, so the
harness had been green over `net` since CP1 without checking it, and residents were about to
inherit the same blind spot. The global vacuity guard is replaced by a **per-action floor**, the
unreachable actions are judged on **constructed states** driven through the engine from the
corpus (`constructed.ts`: the Neutrophil moved onto a NET stand; a resident patrolled up to a
virus), and the floor's control requires it to FIRE on the corpus alone. Third instrument the
same generator gap has reached (#1 → #47 → #54); the general form is in the entry.

**Verified in the real app, headless** (the app shell, `index.html`, no dev-shell controls):
tap the Liver resident → bar reads "Kupffer cell · resident of the Liver · AP 6", one patrol
ring, the step-0 line; patrol → AP 5, "Undo moves 1", the on-branch line; patrol → AP 4, "Undo
moves 2"; **Undo → AP 6, back at the organ, the step-0 line again**; "What's here" → the sheet
names it. Neutrophil hub → Nose 2 → Nose 3 → **two lymph-blue rings** (Gut, Contact) beside
"Recall to bloodstream" → tap the Gut ring → token moved, "Undo moves 3" → Recall → at the hub,
"Undo moves 4", the button gone → **Undo → AP 6, unwound to the start**. Then a resident meal
found blind (patrol each resident up its branch looking for a red ring, undo when none): turn 7,
the **Kupffer cell** three patrols up → red ring → tap → invaders **14 → 13**, AP still 3
(free), the fed line, **Undo gone** (the commit ended it). No ⟪missing key⟫ anywhere. One
measurement lesson from the first run: counting invader TOKENS reported 4 → 4 after a Microglia
ate one of two same-type viruses on a node — the fan-of-types token stays and its badge falls —
so the driver now sums the badges. The driver: string scripts inside `page.evaluate`, per the
CP1/CP2 pattern.

> **The general form, registered at the CP3 review (Shantanu):** the driver did not lie — it
> answered a different question than the one being asked. Fan-of-types means one token can
> stand for several invaders, so *token count* and *invader count* are different quantities and
> only one of them was the measurement. **When a display collapses many things into one, any
> instrument reading the display is measuring the collapse, not the things.** The recurring
> shape at yet another scale: a check that reads a summary is a check of the summary.

**S25 list for CP3 (Shantanu, by finger):** (1) tap a resident token → its real name and
"resident of the …" in the bar; two patrols then Undo. (2) A cell to step 3 of the Nose, Gut,
Contact, Wound or Bite route → blue rings on the partner crossings → tap one → the cell slides
across. (3) Recall from mid-route, then Undo. (4) A resident patrolled onto a virus (a branch
with a red ring) → tap → Undo vanishes. (5) The Monocyte on a branch node with the resident →
"What's here" → two rows, choose the resident, choose the Monocyte.

## The board-state sweep — state the engine tracks that the board does not show (4 September 2026)

**Asked for by Shantanu after the CP3 S25 check**, which found that a tagged bacterium looks
exactly like an untagged one. Tagging is a two-step play — the B-cell coats, then a macrophage
eats — and it cannot be planned if the coat cannot be seen. The same class as the resident
distinction: state the engine tracks that the board does not show. This is the whole list, so
the rest are not met one at a time. **Method:** every field of `Invader`, `Cell` and `Resident`
in `packages/engine/src/state.ts`, classified by which engine gate or query reads it (so
"affects what a player can do" is the engine's verdict, not a guess), against what `Board.tsx`
draws, what the inspect sheet shows, and what the command bar says on selection.

**Shown now, correctly:** invader type (art), position, count per type, the novel mask; cell
identity and position; resident position; organ integrity (the hp number); AP (the bar); the
antibody store, caps, boosts and the immunosuppression block (the panel); the reveal's
"remembered" flag, once, at arrival. Not shown at all, on any surface, unless a cell is
selected and a ring happens to appear: the rows marked **nowhere**.

### Invader state

| State | What it changes for the player (engine site) | Shown where | Weight |
|---|---|---|---|
| **`tagged`** (bacteria, worm, parasite) | Gates `engulf`/`resengulf` on a bacterium, `strike`/`degranulate` on a worm or parasite, and a parasite's edibility; ends `tag` offers (`canTag`, `macrophageEatable`, `wormStrikeable`, `residentEatable`) | **nowhere** — not the board, not the sheet | **The gap raised.** Two-step play, invisible |
| **`stage`** (malaria: sporozoite / liver / blood) | Liver stage: antibodies, Monocyte and residents cannot touch it, only Killer T and NK (`canNeutralise`, `macrophageEatable`, `snipeTargets`, `nkTargets`); blood stage: the reverse | **nowhere** — the sheet says "Malaria" for all three | Same shape as `tagged`: who can act depends on it |
| **`inMac`** (kala-azar inside a resident) | Tag, neutralise, engulf refused; only Killer T / NK reach it; the resident cannot eat | **nowhere on the board**; the resident's bar line says "parasite inside" when the resident is selected | Same shape; one fact seen from two sides (see `infectedBy` below) |
| `remembered` | `memoryKill` (CP4, body-level), and the AP waiver on `neutralise`/`tag` | reveal dialog once; then nowhere | CP4's memory-response rings will show it while nothing is selected — a home exists |
| `ade` (dengue enhancement) | `neutralise` refused (`canNeutralise`) | nowhere | One disease; belongs with the card's "what beats it" |
| `blocksLymph` (filarial worm) | `hop` refused everywhere while it lives (`lymphBlocked`) | nowhere — hop rings simply vanish, with no reason line | Body-level: better shown on the lymph connectors than on the token |
| `hp` / `maxhp` | Strike arithmetic; a parasite is edible only at hp ≤ 1 | sheet only ("hp 2/3"); legacy drew pips | Medium; the sheet is the precise surface and has it |
| `lodged` (a worm settled in tissue) | Stops marching, chronic organ damage; strike still works | nowhere; legacy drew an anchor | Urgency, not legality |
| `embed` (liver-stage countdown) | When malaria bursts out — turns until it becomes attackable by antibodies | nowhere | Informational; a sheet line |
| `emitted`, `age`, `wormClock`, `justEnteredHub`, `amnesia`, `variant`, `forced`, `hidesInMac`, `drain`, `killsHelper` | Spread mechanics and body effects (toxin release, worm timers, arrival, memory wipe, AP drain, HIV) — not a gate on any player action; their EFFECTS surface elsewhere (`hivActive` un-primes the helper; `drain` lowers AP) | nowhere as flags | Out of scope for the board; the effects belong to the status/body panel (CP4) and the log (CP5) |

### Cell state

| State | What it changes | Shown where | Weight |
|---|---|---|---|
| **`alive === false`** (Neutrophil after NET, Eosinophil after degranulate) | The cell cannot act until `regenAt` | **nowhere on the board** — the spent cell is drawn at the hub identical to a live one; the bar says "spent" only when it is selected; the return turn is shown nowhere (legacy: "T7") | Same shape as the coat: a token that looks available and is not |
| **`suppress`** (neutropenia / lymphopenia, N turns) | Neutrophil or Killer T offline | bar on selection only | Same shape |
| Helper priming (`presentations > 0`, `helperWith`) | Production rate, snipe range, Eosinophil speed | the production detail's prose, when a family is selected; not the board | Medium; a status item, CP4 |
| `freeEngulf` (the Monocyte's first engulf is free) | Cost | nowhere (the engulf ring carries no cost hint) | Low; a cost hint on the ring |
| `free[cell]` (free actions granted by effects) | Cost | nowhere | Low |
| `usedThisTurn` (helper) | Nothing — the engine resets it and never sets it | — | Dead field; not applicable |

### Resident and body state, for completeness

`ate` and `infectedBy` — nowhere on the board, the bar line on selection (CP3). `infectedBy` is
the other side of `inMac` above, so one marker answers both: a parasite drawn INSIDE the
resident token rather than beside it. `lymphBlocked` — the connectors. `fx.skipMarch` and the
crisis/rare banners — the dialog decisions of APP_FLOW ruling 5, still open. Organ `failed` —
the loss, not a board state. The hub-sanctuary knob (`hubSafe`) is **off** by default, so "in
the bloodstream" is not an invisible gate; checked rather than assumed.

### What the list says

Three states are the coat's shape exactly — **who can act on this depends on it, and nothing
shows it**: `tagged`, malaria `stage`, and `inMac`/`infectedBy`. Two cell states are its mirror
— **this piece cannot act, and it looks as if it can**: spent and suppressed. Everything else
either has a surface already (the sheet, the panel, a dialog) or is spread mechanics whose home
is the status panel or the log. So the recommendation is one mechanism, not five markers: a
**state badge slot** on the token, taken by the coat now and by the other four as their
checkpoints arrive, and the same states as words in the sheet's rows.

## The coat marker — proposal, not built (4 September 2026)

**The constraint stated first.** A token is 20px (36.7u) with the count badge at its top-right
corner (r = 10u, frame red, white numeral), the label beneath it, the selection ring 3u outside
it and an attack ring 5u outside it; fanned tokens sit 26u apart, so neighbours overlap by ~10u
and a badge on the wrong corner lands on the next token's art.

**1. Split the collapse before marking it.** Fan-of-types groups a node's invaders by type, so a
node with a tagged and an untagged bacterium is ONE token — and a coat marker on it would be
measuring the collapse. The group key becomes **type + coated**: a coated bacterium is its own
token beside the uncoated ones. This also fixes a CP2 ambiguity nobody has met yet: the
Monocyte's engulf ring on a mixed group is drawn around a token that stands for both. The
STACK_COLOCATION measurement (≤2 types per off-hub node ≥99.3%) gains at most one extra group
where a coat exists; the sheet's rows are unaffected.

**2. The marker: an antibody badge at the top-LEFT corner**, the corner the count badge does not
use. A disc of the same radius as the count badge, antibody gold with a dark-gold stroke, and a
**Y drawn as two strokes** rather than a letter — an antibody IS Y-shaped, which is the teaching
point, and a drawn glyph stays legible at 6px where a glyph font does not. Gate 1's 3:1
non-text contrast is met by the dark stroke against the paper, not by the gold fill; the number
is checked at build time, not asserted here. The same badge coats a worm or a parasite, since it
is the same flag with the same consequence.

**3. The word in the sheet.** Each coated row says "coated" through the catalogue, beside the
type and hp — the precise surface should carry the state in words, and it is where a player who
does not know the badge yet finds out what it means.

**Why not a ring.** Opsonisation is literally a coat, and a gold ring around the art reads as
one — but rings are already the selection (orange), the resident (brown double) and the target
(red), and a fourth ring at 20px would sit inside the target ring's 5u and disappear under it
exactly when it matters, on a coated bacterium the Monocyte is about to eat.

**What lands with it, and what waits.** With the coat: the group split and the sheet word, and
the CP3 driver gains a coat check (the badge count must equal the tagged count in the state,
measured through the engine, not the display). Waiting for their checkpoints, in the same slot:
a **spent** cell drawn faded with its return turn in the sheet (CP4's status panel or earlier —
it is the cheapest of the five and the one the S25 will hit next, the Neutrophil after a NET);
malaria **stage** as a second badge glyph and a sheet word (with the card, which explains the
stages); the parasite drawn **inside** the resident for `inMac`/`infectedBy` (with the card).
`blocksLymph` is a connector state, not a token state, and goes with the lymph polish note above.
