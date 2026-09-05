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

## The coat and the spent cell: BUILT (4 September 2026), for review — before the card, as reordered

**Approved as proposed, with one addition and one reorder (Shantanu):** the spent-cell
indicator joins this piece rather than waiting for its checkpoint — a spent Neutrophil at the
hub is not merely unlabelled, it LOOKS AVAILABLE, so a player taps it every game and is
refused, and "always answers" was answering after the fact. The suppressed cell comes with it
because it cost one branch in the same function. The piece lands before the pathogen card:
smaller, it removes a mis-tap that happens every game, and the card's "what beats it" reads
better once the board shows coats.

**The split first.** `buildNodeModel`'s group key is now **type + coated**: a coated bacterium
is its own token beside the uncoated ones. Without it any badge would be measuring the
collapse — the badge-counting lesson arriving as a design decision rather than an instrument
bug — and it resolves the CP2 ambiguity where the Monocyte's engulf ring surrounded a token
standing for both. STACK_COLOCATION's ≤2-types measurement gains at most one extra group where
a coat exists; the sheet's rows are unaffected.

**The coat badge**, top-left (the count badge holds the top-right), r = 10u like the count
badge: antibody gold `#F2B705` with a dark-gold stroke `#7A5600`, and a Y as two strokes — the
V, then the stem. Contrast computed, not asserted: the stroke is **6.54:1** against the paper
and **3.66:1** against the fill; Gate 1 asks 3:1 for non-text UI. The same badge coats a worm
or a parasite. The sheet's row says **"Coated in antibody"** in the stroke colour, because the
badge is a symbol nobody has been taught and the precise surface is where it is explained.

**The spent cell — the treatment, stated so it can be ruled against.** The message is "not
this one", so it is the ART that changes, not a badge added: the token's image at **opacity
0.38 with a grayscale filter**, and the badge slot carrying **turns until it is back** as a
grey numeral disc (`CLASSIC.ink`, 5.05:1) when the engine will say when (below). The sheet's row
dims the same way and says **"Spent — back in 4 turns"** (one turn / next turn variants in the
catalogue). The **suppressed** cell (neutropenia, lymphopenia) takes the same treatment with
"Offline — back in N turns", the count being the engine's `suppress` counter. The bar's
"spent and regenerating" line on selection is unchanged — the board now says it before the
tap rather than after. A spent cell remains a tap candidate: selecting it still answers.

**Corrected while building — the return turn is the ENGINE's, not `regenAt`.** The first
headless run of the spent badge showed **4** and the Neutrophil was back in **2**. `regenAt` is
what the cell records; what the engine DOES is `neutrophilReadyTurn`: `spentAt` plus
`NEUTROPHIL_REGEN` (4), or `NEUTROPHIL_REGEN_HELPED` (2) when a primed Helper T stands in the
blood — Th17 help, IL-17 → G-CSF, the marrow told to hurry — and never while the marrow is
damaged. The legacy UI showed `regenAt` and was wrong under help. So the number now comes
through the session (`queries.readyTurn`, the engine's own exported function; the marrow
block from the view's organ data, withheld conservatively on Hard's compensated marrow rather
than mirroring the unexported `damaged()`), and the Board never reads `regenAt`. Pinned by
finding and driving both cases in the corpus: an unhelped NET reports 4, a helped NET reports
2 — and the search itself taught something: **the NET presents antigen, which licenses a
Helper T already standing in the blood, so a Neutrophil can halve its own wait by the act of
NETting.** The badge now shows that; the log (CP5) will say it. A wrong number would have been
worse than none, and it was caught only because the driver's expectation came from the engine,
not from the display.

**Pinned against engine-produced states** (`tests/session/src/board-state.test.ts`): on every
recorded state, every invader token's ids are all coated or all uncoated and the token says
which — with a vacuity guard that at least one recorded NODE held a coated and an uncoated
token of one type, so the split was exercised, not merely present; a control re-collapses two
real tokens by hand and the checker must fire; the Neutrophil on the constructed NET stand is
available, then after the engine's own `net` is `{spent, backIn: regenAt − turn}` on the token
and in the sheet's data; a recorded crisis supplies a suppressed cell, `{offline, backIn:
suppress}`. States are found and driven, never hand-built: a hand-built state proves the UI
agrees with our idea of the engine, not with the engine.

**Verified in the real app, headless:** Meningitis drawn, EXB produced, tagged by ring → **coat
badges 0 → 1** on its token; tap the token → the sheet's row reads "Meningitis · Bacteria hp
… · Coated in antibody". Neutrophil walked onto a pathogen, NET → **the token dims, the badge
slot reads 2** — the Helper T is at the hub and the NET's antigen presentation licensed it, so
the wait is the helped one; the first run of the badge read 4 from `regenAt`, which is how the
correction above was found; when a pathogen reached the blood, "What's here" → the row reads
"Neutrophil · Spent — back in 2 turns". No ⟪missing key⟫.

**S25 list:** (1) produce, tag a bacterium → the gold Y appears on it; open the node → "Coated
in antibody". (2) Two bacteria of one type on a node, tag one → two tokens, one coated, the
Monocyte's engulf ring on the coated one only. (3) NET with the Neutrophil → it greys out at
the hub with a number — **2 if the Helper T stands in the blood, 4 if it does not**; "What's
here" when something is in the blood → "Spent — back in N turns"; tap it anyway → the bar
still answers; end turns and watch the number count down and the cell come back on time. (4) Under a neutropenia crisis, the Neutrophil
greys with the turns remaining.

**Stays with the card, as ruled:** malaria stage and the parasite inside a resident.

# The P2.5 batch — the card, CP4, CP5 (from 4 September 2026)

**Change of approach (Shantanu, 4 September 2026):** the rest of P2.5 is built as ONE batch
and tested once, properly — the checkpoints were sized when the interaction pattern was
unsettled, and selection, offers, rings, badges and the reason-line standard have now all been
through a finger test. In exchange: every checkpoint review goes into this record as it
happens, each piece with its own decisions and evidence; any design question that would have
been a mid-checkpoint ruling is still asked; the harness, the reason-line standard and the
offered ⊆ accepted check apply per action with the per-action floor covering the new ones; and
the closing report says exactly what was verified headless and what only by test.

## Piece 1 — the pathogen card: BUILT (4 September 2026)

**As ruled** (COMMAND_SURFACE_PLAN §4): the inspect sheet's pathogen row is the entry, the
reveal's arrival rows are the second, both open the same component; a novel pathogen gets no
card. One scrolling card, no flip: name, type and antigen class; "Right now" (below); the
class's one-line biology; can infect; the fact where one exists; **Beat it**; tier and the
four stat bars; the five information rows. All content, no engine: `DZINFO`, `DZSTATS`,
`FACT`, `TROPISM`, `FAMILY` → `FAMILIES`, `UI_`, and `BEAT_BY_TYPE`.

**BEAT_BY_TYPE moved into content** (`labels.json`, beside `UI_`; schema, loader, index) and
**pinned byte-for-byte against legacy** in `ui-content.test.ts`'s TABLES like every other
extracted table — extracted by evaluating legacy's initialiser, the same method the pin uses,
not by retyping. `card-data.test.ts` cross-checks that every playable disease has every row the
card renders and every type has its line: a missing row would be a silently blank card, which
no per-table schema can see.

**FAM_LONG, checked and NOT extracted, recorded:** legacy's second constant differs from
`FAMILIES.bio` in wording ("grip the spikes" versus "target the spikes") and carries two things
`FAMILIES` does not — the expanded acronym ("ENVeloped virus") and example diseases per class.
Its legacy surface was the antigen-class legend, not the card. Home: the antibody panel's family
detail, later; not this piece. The card shows `FAMILIES.name` and `.bio`.

**The two deferred invader states, built as proposed — rule against it if the mark is wrong.**
Liver-stage malaria and kala-azar inside a resident macrophage are one biological class —
INTRACELLULAR, reachable only by the Killer T-Cell or NK Cell — so they share one mark: a
**dashed ring in the organ brown** on the token, the words on the sheet's row ("Hiding inside
liver cells — only the Killer T-Cell or NK Cell can reach it"; "Hiding inside the Kupffer cell
— …"; the other two malaria stages say who CAN reach it), and the same words as the card's
"Right now" line. The group key splits on hidden-inside-a-cell exactly as it does on the coat,
for the same reason: a liver-stage and a blood-stage malaria on one node are different
questions, and a ring must not stand for both. **Not a second badge glyph** as the sweep first
suggested: the coat badge says "you can act on this", and a state that says "you cannot" is
better carried by the token's outline than by a second symbol competing for the same slot.

**Pinned on engine-produced states**, driven rather than found: `forceInjectCard` (the engine's
dev-only entry point, one of the 67 exports) puts the card into play and the game is cycled
idle through the engine until the state arises — kala-azar reaches its organ and moves inside
the resident (`inMac`, and the resident's `infectedBy` names it back); malaria reaches the liver
and embeds (`stage: liver`). Both tokens carry the mark and their sheet rows carry the state; a
control re-collapses a hidden and an exposed token and shows the mix the split prevents.

**Verified in the real app, headless** (`drive-card.ts`): the reveal's arrival row opens the
card above the reveal, the card shows that disease's own "Discovered" line and its "Beat it",
Close returns to the reveal; in command, tapping the pathogen's node opens the sheet, its
**Card** button opens the same card. No ⟪missing key⟫. **Not verified headless:** the dashed
ring and the "hiding inside" words on a live board — kala-azar and a liver-stage malaria did
not occur in the driven games; they are covered by the driven tests only, and belong on the S25
list.

**S25 list for the card:** (1) draw → tap the arrival row → the card, scroll it, close. (2) In
command, tap a pathogen's node → Card. (3) A Malaria game: its token gains the dashed ring when
it embeds in the liver, the sheet says "hiding inside liver cells", the card's "Right now"
agrees; when it bursts out the ring goes. (4) A Kala-azar game: the parasite at its organ gains
the ring, the sheet names the resident it is inside, and that resident's own line (CP3) says a
parasite is inside it.

## Piece 2 — CP4, the body-level actions and the body panel: BUILT (4 September 2026)

**The second source, filled.** `bodyOffers(view)` — wired end-to-end and empty since CP1 —
now carries the five actions with no cell. Board rings while NOTHING is selected: the
**memory response** on a remembered, reachable pathogen (free; 1 AP on Hard, the engine's
own rule) and an **antivenom dose** on a venom (a dose in stock, 3 AP). The command bar, which
shows only "tap one of your cells" while nothing is selected, now says what those rings are
("Tap the highlighted pathogen — your body remembers it"; "Tap the venom to give antivenom —
3 AP"), so a ring on an empty selection is never unexplained. The panel buttons — **order
antivenom**, **clonal selection**, **vaccinate** — are offered regardless of selection: the
panel is always visible, and ordering a vial should not require deselecting a cell first.

**The amount chooser (plan §3.5), and the one rule it needed.** `vaccinate` and
`orderAntivenom` take an amount, and the engine CLAMPS a larger one to what is left — so a
"+2" at 1 AP would be ACCEPTED while spending 1, a mislabelled button that the offered ⊆
accepted harness cannot see. Each amount (+1, +2, as legacy offered) is offered only when the
AP is there AND the progress still needs it, so the label is always exactly what will be spent.
Pinned in `body-offers.test.ts` on recorded states: every amount within the AP and within
the need, with a guard that a +2 was actually offered somewhere; no vaccine on Training; no
clone search without an unknown antigen; no dose without stock; no memory response on Hard
at 0 AP.

**The body panel** (`BodyPanel.tsx`, under the antibody panel): antivenom doses in stock and
the order in progress toward the next vial (`avOrder`/`ANTIVENOM_ORDER`, with the buttons);
"memory response ready" when a remembered pathogen is reachable, so the board's ring is
explained; clonal selection, shown once an unknown antigen has been met, with its progress
(`clone`/`CLONE_COST`) and the search button; the vaccine lab — every disease the body has
seen and does not yet remember, with progress (`vaccine[dz]`/`VACCINE_COST`) and the buttons —
and, on Training, the engine's own reason in place of the lab ("immunity comes from surviving
an infection") rather than a hidden section; the immune list. The novel antigen stays masked
in every list. Each row's why-not is in place: the body's "always answers".

**Harness:** the judge gains the BODY as a subject (nothing selected), the floor gains the
five actions, and a body over-offer control (the memory response on every invader) fires.
The corpus reaches all five without construction: the bot vaccinates, searches for the clone
and uses the memory response; `orderAntivenom` is offerable in any command state with AP; and
an antivenom dose is offerable wherever a venom stands while stock and AP allow.

**Verified in the real app, headless** (`drive-body.ts`): on Normal, order antivenom +1 →
progress 0/4 → 1/4, AP 5 → 4; the drawn disease's (Impetigo) vaccine row → +1 AP → 1/5. On
Training, a venom on the board (turn 2) → its red ring while nothing is selected and the bar
reads "Tap the venom to give antivenom — 3 AP" → tap → AP 6 → 3, stock 2 doses → 1 dose. On
Hard, idle until the unknown antigen broke in (turn 7) → the clone row appeared → "Search for
the clone 0/3" → 1/3, AP −1. No ⟪missing key⟫. **Not verified headless: the memory response**
— it needs a remembered pathogen back in the body, which no short driven game produced; the
harness offers and the engine accepts it on recorded states (the bot uses it), and it is on
the S25 list.

**S25 list for CP4:** (1) order antivenom +1 / +2 and watch the vial arrive at 4; the +2
button vanishes at 1 AP and when 1 AP is all that is needed. (2) Normal: vaccinate the first
disease you see to 5 — it appears under "Immune"; when it comes back, its ring is there before
you select anything and the bar says why. (3) Training: a snakebite → the venom's ring, the
antivenom hint, tap → gone, 3 AP. (4) Hard: when the unknown antigen breaks in, the clone row
appears; three searches; then X appears in the antibody panel and Produce X works.

## Piece 3 — CP5, the log panel: BUILT (4 September 2026)

**What it is.** The engine's log, newest first with its turn tag, under the body panel: the
teaching prose that explains the biology as it happens ("1 virus(es) hid inside a cell —
antibodies can no longer touch them. The Killer T-Cell (never misses) or the NK Cell (d6 3+)
must kill the infected cell"). Eight lines shown, "Show all N" expands. Read from the SHOWN
view, so a burst's frames narrate as they land. The engine's `<b>` and `<i>` render as
emphasis through a tokenizer; nothing is injected as HTML.

**The rendering decision, and the numbers behind it — for ruling, not yet ruled.** The
engine's log lines are interpolated prose, so the exact-string lookup that rejections use
cannot find them. `engineLogText` compiles each of the catalogue's 57 placeholder entries to
a pattern, recovers the values, and re-renders the catalogue's template with them — which is
how the Hindi edition will render the same line translated; in English the result equals the
engine's text exactly, and `log-text.test.ts` pins that. **The five composed sites FINDINGS #53
lists** — produce, strike, tag, engulf, and the draw's entry line — have no template and
**render plainly, not loudly**. In a short driven Training game **8 of 14** log lines were
composed sites, almost all the draw's "Infection: X entered via the Nose": a ⟪marker⟫ on
more than half the log would teach a newcomer nothing, and the English edition is unaffected.
What it means for the Hindi edition: those five lines will render in English until Phase 3
makes the engine emit ids (#53's correction) — the draw's entry line above all, which is the
most frequent line in the log. `log-text.test.ts` asserts on recorded states that the
composed sites are the ONLY misses, with a control, so a new one fails a test rather than
hiding in the panel. **Question for Shantanu:** is plain-render acceptable for the Hindi
deliverable's first cut, or should the five composed lines be re-templated in the UI now
(a duplicated-prose workaround in the class of #52/#53, deleted with them in Phase 3)?
Built as plain-render; the workaround is a day's work if ruled.

> ✅ **RULED (Shantanu, 5 September 2026): the five composed lines stay PLAIN, as built.** A
> marker on more than half the log makes the panel unreadable in exactly the edition it exists
> to serve; and re-templating them in the UI is the neutralise-2-AP mirror's shape again — a
> symptom patched in the wrong layer, with the same expiry date. The engine emitting ids is
> Phase 3's. `log-text.test.ts` pinning that those five are the ONLY misses is what makes the
> deferral safe. The Hindi consequence — those five lines render in English until Phase 3, the
> draw's entry line above all — is now stated explicitly in FINDINGS #53, as a list the
> translation brief inherits.

**Verified in the real app, headless** (`drive-log.ts`): the game-start line at turn 1; a
move and a produce each add their line, newest first with turn tags; four idle turns then
"Show all" 8 → 14 lines including the spread's prose ("Bacteria divided: 2 new", the
hidden-virus line above); then the game idled on to its conclusion — **the Result screen
("The body has fallen — lost to damage: Kidneys") reached by the app's own controls**. No
⟪missing key⟫.

## The readiness bar, re-measured (4 September 2026)

**Every player action the engine accepts in single-player is now reachable by touch in the
app shell, with no dev-shell controls:** move, engulf (CP0); net, snipe, nkkill, strike,
degranulate (CP1); tag, neutralise, produce (CP2); hop, recall, resmove, resengulf (CP3);
memoryKill, antivenom, orderAntivenom, clonalSelection, vaccinate (CP4) — **19 of 19** — plus
undo and the three turn actions. Each is offered only from the view's queries, judged by the
offered ⊆ accepted harness with its per-action floor, and carries a reason line or an
in-place why-not. A full Training game has been played to its conclusion by the app's own
controls, headless, on the LOSS path; **the WIN path remains uncrossed** (closeout item).

**What has been verified headless in the app shell versus by test only** — so the S25 pass
targets the gaps:

| Verified headless (a driver did it in the app) | Verified by test only (harness + spanning tests; on the S25 list) |
|---|---|
| Card from the reveal row and from the sheet; close returns to the reveal | The dashed "hiding inside a cell" ring and its sheet words (kala-azar in a resident, liver-stage malaria) |
| Order antivenom +1 (1/4, AP −1); vaccine row +1 on Normal (1/5); a venom's ring and bar hint while nothing is selected → antivenom given (AP −3, stock 2 → 1); the clone row on Hard → search 0/3 → 1/3 | **The memory response** (a remembered pathogen's ring while nothing is selected; free / 1 AP on Hard) |
| The log: lines appear per action and per spread, turn tags, Show all; a full game to the Result screen (loss) | "+2" vanishing at 1 AP or at 1 needed (pinned by test on recorded states) |
| Earlier pieces: the coat badge and sheet word; spent cell dimmed with the engine's return turn, sheet line; residents, patrol, hop, recall, resengulf, Undo | The suppressed (offline) cell's treatment; the vaccine completing into "Immune"; a vial arriving at 4/4; Produce X after the clone is found |

**Found by the PR's code scanning, fixed before merge (4 September 2026).** GitHub's default
CodeQL setup failed PR #40 on one new high-severity alert in the changed code:
`js/polynomial-redos` on the log panel's emphasis tokenizer, whose regex stripped unknown tags
with `<[^>]+>` and could run polynomially on a long run of `<`. A defect in the new code, not a
pre-existing one — the 71 open alerts on `main` all date from 18 August and sit in
`tools/legacy` and the string-inventory tooling, which is why earlier PRs passed this check.
The engine's prose uses exactly four tokens (`<b>`, `</b>`, `<i>`, `</i>`; checked against the
catalogue and the engine source), so the tokenizer is now a linear scan over those four and
any other `<` is literal text — there is no sanitisation to get wrong. `richRuns.test.ts`
pins the runs and gives a 200,000-character run of `<` a time bound. The CodeQL result is the
one check in this project's CI that nothing local reproduces; it earned its place here.

# After the S25 pass on the batch (4 September 2026) — twelve observations, ruled

The readiness bar was met on the S25: a complete Training game played to a conclusion by
touch. Twelve observations came back, several of them real bugs; the rulings are recorded here
piece by piece as they land. **Order (Shantanu's, adopted):** item 2's undo instrumentation and
item 6's record first, because the readout needs the longest observation window; then item 1
(the command panel, scope reduced to action buttons); then 7 and 5 together as one effects
strip; then 11 and 8 together as one geometry change; then 12, the planning screen.

## Item 6 — antivenom grants memory on Training: CONFIRMED A BUG, DEFERRED (FINDINGS #55)

Driven through the engine before anything was assumed: after an antivenom dose, the body
remembers the venom, and the log contradicts itself in two consecutive lines. The text is the
correct half — antivenom is passive immunity, it teaches the immune system nothing, and that is
exactly why a second snakebite needs a second dose; **Kartik designed that distinction
deliberately.** Phase 3's engine change, because it touches play (a remembered venom destroyed
free on a later arrival) and the engine is frozen. Recorded so nobody "fixes" it in the wrong
direction. Full shape in FINDINGS #55.

## Item 2 — undo says WHY it is unavailable: BUILT (4 September 2026)

Undo was seen unavailable when it should not have been, unreproducibly. Instrumented rather
than guessed at: `UndoAvailability` gains `reason` — `no-moves`, `committed` (with
`committedBy`, the FIRST committing action's name), `resumed` (the game was resumed mid-command
and the session has no history of the phase), `not-command` — and the command bar shows it as a
muted line whenever undo is unavailable during command. Visible, not behind a flag: it doubles
as a teaching line ("only moves can be undone"; "Undo ended for this turn — Produce
committed"). Pinned in `undo-rule.test.ts`: the reason through a phase, the first committing
action keeping its name, the resumed case from a real autosave. **What to do at the next
sighting:** read the line. If it says `no-moves` after a move was made, or `committed` naming
an action that was not taken, that is the bug and the line is its capture.

## Item 12, first block — the silhouette does not exist in usable form

Checked before designing around it: `tools/legacy/public/body.png` and `tools/legacy/body_crop.png`
are the same 583KB file, a neon torso OUTLINE — no organs, no organ positions — and not among
the 29 generated assets; its provenance is unknown (ASSETS.md #5). An anatomical figure with
organ positions is therefore an **art task** with a data half (organ positions in the content
pack, beside the board geometry), not a rendering one. The planning screen's other blocks do
not depend on it.

## Item 1 — the command panel, action buttons only: BUILT (4 September 2026)

**Scope as ruled:** the piece strip and the selected piece's full action set; movement stays on
the board (no destination list, no move buttons — Shantanu decides after testing whether action
buttons alone resolve the ambiguity); the board stays at 360px. The correctness point: a player
must always know WHICH action they are performing — with two cells on a node, tapping a pathogen
performed something unnamed, which is how item 9's dimmed Neutrophil happened.

**The piece strip** (`PieceStrip.tsx`): one horizontally scrolling row of fourteen 44px chips —
the seven cells, then the seven residents by their real names with their organ under them.
Tapping a chip selects through the session exactly as a board tap does; tap-again deselects.
Spent and offline cells are dimmed with their return number in the chip; the selected chip is
ringed. The board tap keeps working.

**The action list** (`ActionList.tsx`, from `actionRows` in `offered.ts`): the selected piece's
FULL set of non-movement actions from a fixed per-piece catalogue, always visible. An available
action is expanded per target as a row that names it and its cost — "Engulf Rotavirus", "NET the
swarm", "Degranulate Hookworm · 2 AP" — and sends exactly the offer the ring would (the same
offer id, so the row and the ring are one action). An unavailable action is a greyed row that
gives its reason when tapped, inline: "Move the Neutrophil onto a swarm of bacteria or viruses to
NET them"; "Needs 2 AP"; "No antibody you hold matches a virus or toxin in reach". That completes
the "always answers" rule per action; the command bar's line still answers for the piece. Two
homes stay where they were, named in the list: Produce's row says "in the antibody panel below",
and the body panel keeps order antivenom, clonal selection and vaccinate. The body's own rows
(the memory response, antivenom) appear while nothing is selected. The bar now holds only the
movement button (recall).

**Pinned** (`action-rows.test.ts`, on recorded states, every piece): the rows cover the piece's
whole catalogue; every non-movement, non-panel offer has an available row with the same label;
every available row points at a real offer; every greyed row has a usable reason. The first run
caught the seam it exists for: the body's panel-homed offers had no row, because their rows are
in the body panel — the list now excludes panel-homed offers and the test says so.

**Verified in the real app, headless** (`drive-panel.ts`): see the run recorded below.
Fourteen chips in the strip. Nothing selected → the body's rows, "Memory response" and
"Antivenom", both greyed. Tap the Neutrophil's chip → the bar names it, the chip is ringed, its
one row "NET the swarm" greyed → tapped → "Move the Neutrophil onto a swarm of bacteria or
viruses to NET them"; tap the chip again → deselected. The Kupffer cell's chip → "Engulf"
greyed → the step-0 patrol line. The B-Cell → "Tag", "Neutralise", "Produce" greyed, Produce's
reason "Produce antibodies in the panel below"; Produce ICB in the panel → the row **"Tag
Brucellosis"** appears available → tapped → the bacterium's coat badge appears (1), the
invader count unchanged. No ⟪missing key⟫.

**S25 list for item 1:** (1) with the Neutrophil and the Monocyte on one node holding a virus,
select each from the strip and read the rows — the action a ring would perform is the one named.
(2) Tap a greyed row and read why. (3) Tap an available row and watch the same effect a ring
tap gives. (4) Decide whether movement needs rows too.

## Items 5 and 7 — the effects strip and the turn line: BUILT (4 September 2026)

**The sweep, approved as reported, built as one strip** (`EffectsStrip.tsx` from `effectChips`
in `effects.ts`), at the top of the play surface, one chip per effect in force for as long as
it is in force, each saying what it is doing and for how long. The sources, and where the
state comes from:

| Chip | State | Duration shown |
|---|---|---|
| Immunosuppression, antibody shortage (cap 2), fewer or extra AP, fever (no march) | the session's new `effects` summary of `fx` — one of the 13 keys the view drops, carried like `blocked` and `readyTurn` | this turn / N more turns |
| Neutrophil or Killer T offline | `suppress` | N more turns |
| Organ damaged — with the organ's own effect text from content ("Antibody storage capped at 2 per class") | `organs` hp below max; Hard's compensated organ excluded, as the engine excludes it | for the rest of the game |
| Lymphatics blocked; HIV (Helper T destroyed); Helper T not yet primed | the `lymphBlocked` and `hivActive` queries; `presentations` | none |
| A parasite inside a resident | `residents[o].infectedBy` | none |
| This turn's crisis event; next turn's forecast; a rare event | `banner`, `warning`, `rareBanner` — the content's own words | none |
| **The arrival window closed** (item 7): "No more pathogens will arrive — clear the body to win by turn {last}" | `turn > maxTurn`; `last = maxTurn + GRACE_CLEAR` | none |

**Item 7's display.** The shell's turn line read "16/15". It now reads "Turn 3 of 15" inside
the window and "Turn 16 · 14 turns to clear the body" after it, both numbers from the view and
content (`GRACE_CLEAR`), never a difficulty's literals — 15/30, 20/35, 30/45 fall out of the
data.

**Pinned** (`effects.test.ts`, recorded states): every chip mirrors the state it claims,
chip-if-and-only-if-state for the cap, offline, organ and window chips; the session's `effects`
equals the engine's `fx`; the window chip carries the deadline and the turn line the countdown;
no chip text is empty or a missing key; each source occurred somewhere in the corpus.

**Verified in the real app, headless** (`drive-effects.ts`, six idle Training games): "Turn 1
of 15"; chips for the Helper T unprimed, the forecast, the crisis banner, HIV, the lymphatics
blocked, immunosuppression, organ damage (permanent), fewer AP, extra AP, the Killer T
offline, the antibody cap — eleven kinds, every one rendered with its text and duration, no
⟪missing key⟫. **Not verified headless: the window-closed chip and the "turns to clear" line**
— an idle game loses by turn 7–10, so no driver reaches turn 16; both are pinned by the test on
recorded states that pass the window, and they are on the S25 list.

**S25 list for items 5 and 7:** (1) when an organ is hit, its chip appears and stays; (2) a
crisis fires — the chip says the effect and how long, and counts down; (3) past turn 15 on
Training, the window chip appears and the turn line reads "Turn 16 · 14 turns to clear the
body"; check the same on Normal reads 21 · 14 and on Hard 31 · 14.

## Items 11 and 8 — organ labels, the zoom, and the hub as Variant B: BUILT (4 September 2026)

**Item 11, through the generator as ruled.** `tools/geometry-from-a2` now emits two more keys
into `geometry.json`, both derived from the annotation angles, so the print follows the same
data: **`LABEL_SIDE`** — `below` where the annotation's ray is more horizontal than vertical
(the board's left and right: Gut, Blood, Heart, Liver, Spleen), `right` where it is more
vertical (top and bottom: Nose, Contact, Wound, Bite, Lungs, Brain, Kidneys, Bone Marrow) —
and **`VIEWBOX`**, the canvas cropped to the annotations plus a 6u margin: `28.4 28.4 612.6
603.1`, 93% of the 660 canvas wide, so the board fills the phone's width with no wasted side
margin and every element is correspondingly larger. Positions stay in the 660-unit canvas;
only the window tightens. The generator's report prints both; its `--control` still fires.
`Board.tsx` reads the side and the crop from content and places the label accordingly (right
labels start at the icon's edge; below labels centre under it). Pinned: the schema validates
both keys; `geometry-crop.test.ts` asserts the side follows the ray for every organ and route,
and the crop is inside the canvas, smaller than it, and contains every annotation anchor.

**Item 8, Variant B on the real board.** The hub was still fanning (scaffolding since P2.2).
`tokenLayout` lays the hub out as ruled 20 Aug 2026: invader type-tokens clustered at the
centre in a 2×2 grid (~22u), the player's cells ringed at 38u inside the inner circle (~16u)
— the mock-up's proportions — and everywhere else the fan-of-types stands. Tap candidates,
target rings and rendering all use the one layout, so a hub cell is tapped where it is drawn.
`hubLayout.test.ts` pins distinct positions, the ring radius, the cluster's bound, the sizes,
and that off the hub nothing changed.

**Verified in the real app, headless** (`drive-geometry.ts`, at 360px): the SVG's viewBox is
the generator's crop; eight labels are anchored `start` to the right of their icon and five
`middle` below, exactly the generator's sides; at a fresh game the seven cells sit at seven
distinct positions on the hub ring at 16u; tapping the hub's Killer T selects it. Screenshot sent
with the report. No ⟪missing key⟫.

**For the print:** the next A2 export should place labels by `LABEL_SIDE` and crop to
`VIEWBOX`; that is the print pipeline's change, recorded here so it is not rediscovered.

**S25 list for items 11 and 8:** (1) the board fills the width; every label sits beside or
below its icon without crowding the edge; (2) at setup the seven cells ring the hub and read at
a glance; a pathogen reaching the blood sits in the centre with its badge; (3) tap a hub cell
by finger — the one you meant is the one selected.

**Seen in the screenshot and noted, not built:** the organ integrity number sits just inward
of the tissue slot, beside the branch's step-1 node number, and at phone size the two digits
read as one ("1" and "3" as "13"). Pre-existing, not from this piece; a placement note for the
label pass, with the lymph connector polish.

## Item 12 — the planning screen, steps 1 and 2: the frame and the anatomy, BUILT (5 September 2026)

Built in Shantanu's ruled order (P2_5_PROGRESS.md, "Item 12"). Each step's check was run
before the next step leaned on it.

### Step 1 — `frame/body` through the pipeline, with the halo looked at

**The halo check found no halo, and found something else.** The raw JPEG's stroke is a clean
`#786760` with a one-pixel blended edge; the census of the 2048² canvas shows **zero** light
pixels with enough chroma to survive the key as speckle. But the outline is **closed**, so the
pipeline's border flood — right for the 29 icons, whose enclosed light paint must survive —
stops at the stroke and leaves the whole torso interior **opaque white: 23.9% of the canvas**, a
white body on the cream paper, the compositing rectangle the PNG export was rejected for. So
the frame is its own class in `build.ts`: keyed **globally**, aspect kept (no square padding —
the organ positions live in its pixel space), sized by **height** (380px at 1×, the brief's
phone-portrait figure), emitted under `art/frame/` so `/art/<key>@Nx.webp` holds for the
slashed key. The manifest gains `size {w, h}` per asset (square for icons).

**Two new controls on the real file**, beside the two synthetic ones: the frame keyed by the
border flood must be REJECTED by a coverage gate (10% opaque bound; the stroke is 4.5%), and
keyed globally must be ACCEPTED. Both fire as they should — `pnpm art:build --control`. The
gate re-measured **5.29:1**, Shantanu's number exactly; `--verify` shows the other 29 assets'
91 files byte-identical, so regenerating the frame drifted nothing. Then the keyed 3× output
was composited on the paper and looked at, zoomed ×6 at the shoulder, crown and crotch: a
smooth anti-aliased edge into the paper, no light ring, no speckle, the interior paper.

Provenance tier corrected in `ASSETS.md`: **Google AI Pro** (Shantanu, 5 September 2026).

### Step 2 — the seven positions in content: the schema, as proposed, then the numbers

**The schema, proposed before writing and then written as proposed** (the handoff's shape,
with one addition):

```
board/anatomy.json
  FRAME:        { asset: "frame/body", w: 224, h: 380 }   the keyed frame's 1× pixel size
  ANATOMY_POS:  byOrgan(Point)                            in that pixel space
```

Validated in the board pack (`AnatomyS`): the asset key must be `frame/<name>`; every
position inside the frame; and — the addition — an explicit set comparison against the RULES'
organs, so a rules organ with no position and a placed organ the rules do not know each fail
by name (the key enum alone rejects strangers but does not say which organ is missing). Five
controls in `load.test.ts` make each rule fire. **The frame size is measured, not judged:**
`packages/app/src/anatomy-frame.test.ts` holds `FRAME.w × h` equal to the manifest's emitted
1× size, with two controls (one pixel off; an asset the manifest lacks) — content cannot read
the manifest and the pipeline does not read content, so the join lives in the one package that
sees both. A regenerated frame therefore fails a test instead of silently moving every organ.

**The positions, measured off the keyed frame's own outline** (row profile at 1×: crown row
14, neck narrowest at row 96, shoulders from row 120, arm stumps end at row 216, torso
interior 65–158 at the waist and 55–168 at the hips, crotch notch at row 360; midline x = 112):

| Organ | x | y | Where that is on the figure |
|---|---|---|---|
| brain | 112 | 52 | the cranium, upper-middle of the head |
| lungs | 112 | 170 | upper chest, centred, below the shoulder line |
| heart | 120 | 202 | lower chest, between the lungs, to the **patient's left** (viewer's right) |
| liver | 88 | 236 | under the **patient's right** ribs — the **viewer's left** |
| spleen | 142 | 232 | under the patient's left ribs, a little higher than the liver's bulk |
| kidneys | 112 | 272 | the waist, centred (posterior cannot be shown from the front; lower can) |
| marrow | 112 | 318 | the pelvis, above the crotch notch |

At 30px icons nothing overlaps (checked: every pair is ≥30px apart on at least one axis).

⚠️ **One thing in the handoff was wrong and is not built as written.** It said *"liver
upper-right of the abdomen AS THE VIEWER SEES IT; spleen upper-left."* On a front-facing
figure the patient's right is the viewer's LEFT, so that sentence would have mirrored the liver
and spleen. The liver is on the patient's right; it is placed on the viewer's left, the spleen
on the viewer's right — the anatomy, not the sentence. **Kartik checks.** The picture to check
against is `pnpm art:anatomy` → `tools/art-pipeline/showcase/anatomy-preview.png` (the frame
on paper with the seven organ icons at these positions, 2×); a position edit is checked by
running it again. Moving an organ is editing two numbers in `anatomy.json`.

## Item 12 — step 3: blocks b, c and d, BUILT (5 September 2026); step 4 PROPOSED, not built

### Where the screen sits, and what decides that

After the draw and its reveal, before command: the view's phase is `infection` with a card
drawn (a mop-up sentinel counts — the body still needs a plan), and, designed in for Phase 3,
the engine's `allocation` phase. `planningModel(view)` (`packages/ui/src/play/planning.ts`)
decides it, PlayScreen only obeys: while the moment holds, the board, command bar, piece
strip, action list and the two panels give way to the planning screen with the effects strip
above it and the log below; the dialogs and cards keep their layers. **View-only, one
action:** the bottom button is `play.beginCommand` — "Command your cells", the catalogue's
existing string — sending `beginCommand`; under allocation it is `planning.confirm` —
"Confirm the plan" — sending `confirmAllocation`. The app shell hides its own Begin-command
button while the screen shows (one button, not the same button twice); **the dev shell keeps
every button**, because `tools/perf/measure.ts` drives it by button text. Never during a
burst — the spread is watched on the board.

### Block b — the pathogen summary

Counts by type as chips, then **one row per board token group**: the rows are
`buildNodeModel`'s own display groups (type + coated + hidden-inside, exactly the board's
splits), so a row here IS a token there and the badge counts match by construction. Each row
carries its **depth** in colour AND in words — never colour alone: green `#2F6B4A` *Entry
lane* (a route at step ≥ 1), amber `#7A5600` *Bloodstream* (the hub; a route at step 0
resolves there, as the board draws it), red `#B03A2E` *Organ lane* (a branch) — all three
≥5.9:1 on the paper — and where it stands in words ("Gut lane, step 5" · "In the bloodstream"
· "Liver branch, step 2" · "In the Liver itself"). **Deepest first**, then by place, then by
step: the order a player plans in. Tap a row to expand its pathogens (disease, hp, the
"right now" line the sheet shows); tap a pathogen's Card for the pathogen card — the same
component, the same entry-point rule (a novel pathogen is masked and has no card).

### Block c — the cell cards

`CellCard` is the pathogen card's shape for the player's own pieces: name and one-line tag
from `UM`, then `role` / `home` / `bestAgainst` / `deficiency` and an italic `fact`, every
field optional, a missing field rendering nothing. **The content file ships as a skeleton
Kartik fills:** `packages/content/src/labels/cells.json`, `CELL_CARDS`, one empty entry per
cell key. The schema holds the keys equal to the rules' `CELL_KEYS` (a missing cell and a
stranger each fail by name) and refuses an empty-string field — a placeholder pretending to
be prose; three controls. Until Kartik writes them the card says so, through the catalogue
(`cellCard.empty`), rather than showing seven blank cards. The card also carries the cell's
"right now" — spent or offline and when it is back — the same line the strip and the sheet
show. Opened from the screen's cell roster (seven 44px chips).

### Block d — the Phase 3 allocation slot, designed in and left empty

The model reads the view's `apPool`, `players`, `captain`, `apBudget` when the phase is
`allocation` and the screen renders an *Allocation* section (pool, one line per player, the
captain bold) between the summary and the cells, with the bottom button switched to "Confirm
the plan". Single-player never reaches that phase, so **the section has never rendered; the
model's branch is pinned by test** on a view constructed to carry the phase. Phase 3 adds the
controls (`allocateAP` / `returnAP`); the slot, the button and the strings exist.

### Checks

`tests/session/src/planning.test.ts`, on recorded bot games (3 seeds × 3 difficulties): the
model is active at every planning moment (>50) and at none of the command states; **the
button sends what the engine accepts next** — `beginCommand` applied to a clone is accepted
into `command` at every planning moment, and the **control** applies the same button to
command-phase states and requires rejection, so the acceptance check is known to be able to
fail; every invader is in exactly one row and the counts by type add up (vacuity guards: all
three depths seen, at least one stacked row); each row's depth equals its members' own depth
from their location, and `depthOf` is pinned on the three zones and on route step 0; every
non-novel member has a `DZINFO` card; the allocation branch. `card-data.test.ts`:
`CELL_CARDS` keys equal `CELL_KEYS`. The suite manifest carries the new control file.

### Verified in the real app, headless — versus by test only

**Headless (`drive-planning.ts`, the app shell at 360×780, a fresh Training game, six turns):**
no planning screen before the draw and the board present; after Draw and the reveal's
Continue, the planning screen present and the board absent on every one of six turns;
**exactly one "Command your cells" button** on the page each time; the counts-by-type chips
and the row badges **agreed on every turn** (1, 4, 6, 10, 11 and 16 invaders); the first row
expanded to its two members and a member's Card opened the pathogen card (Leprosy); the
B-Cell chip opened the cell card showing the "still being written" line; **a reload
mid-planning offered Continue ("Training turn 1") and resumed onto the planning screen** —
the autosave is written at the draw; the bottom button led to the command phase with the
board back; End turn, the spread tapped through, Draw again — six cycles; **all three depths
rendered** (turn 5: one organ row, two bloodstream rows, four entry rows; turn 6: three organ
rows first, one bloodstream, four entry) in the ruled order. The turn-4 header read "8
Action Points" — the engine's `apMax` under a crisis boost, so the number on the screen is
the engine's, not a copy of the difficulty's base.

**By test only:** the allocation slot and "Confirm the plan"; the beginCommand-rejected
control; depth for a route at step 0; the per-member depth consistency across recorded
corpora; DZINFO coverage; the three CELL_CARDS controls. **Verified by no one:** the
*Allocation* section's rendering (no single-player path reaches it); a **coated** or
**hidden-inside** row marker on this screen (needs a tag, or a hidden virus inside a cell,
before a draw — not driven); a cell card with real prose (the file is empty until Kartik
fills it); the screen at 200% text or under the contrast audit — Gate 1 hygiene, after the
screens stop moving, as before.

### S25 list for step 3 (by finger, Shantanu)

Draw → Continue: the planning screen, no board, ONE "Command your cells" button · the chips'
counts add up to the rows' badges · tap a row: it expands; tap Card: the pathogen card; Close
· tap the B-Cell chip: the cell card says its notes are still being written; Close · lock
the phone mid-planning, unlock, resume — still the planning screen · Command your cells: the
board, End turn enabled · after a spread that carries something into an organ lane, the next
plan lists that row first, in red, with the organ's name.

### Step 4 — block a: PROPOSAL for ruling, not built

Block a is the silhouette (the keyed frame) with the seven organs at `ANATOMY_POS`, each
with its HP, and tap-to-expand a lane. Its data half exists (steps 1–2). What it needs ruled
is the part the handoff flagged: **the six entry lanes and the bloodstream have no anatomical
position.** Two shapes, with a recommendation:

**A — chips on the outline, at the point of entry (recommended).** Each entry is a 30px chip
(the existing `entry-*` art) sitting on the outline stroke where that route enters the body,
so "outside meets body" is where the chip is: **nose** at the face centre — the one entry that
must sit inside the outline, because a front-facing face has the nose in the middle; **gut**
at the lower abdomen, on the patient's left (descending colon) so it clears the kidneys and
the marrow; **contact** on the viewer's-left arm stump; **bite** on the viewer's-right arm
stump (a bite is on a limb, and the stumps are the limbs the frame keeps); **wound** on the
viewer's-left hip edge. **Blood** as a chip at the top of the chest on the midline — the great
vessels, where the aortic arch sits — with the hub's count on it, since the bloodstream is
"everywhere inside" and cannot honestly be one place. Proposed numbers in the frame's 1×
space, measured off the outline like the organs and clearing every organ by ≥30px on one
axis: nose (112, 82) · blood (112, 134) · contact (36, 172) · bite (188, 172) · wound (52, 296)
· gut (146, 292). They would go into `anatomy.json` as `ENTRY_POS: byRoute(Point)` and
`BLOOD_POS: Point`, validated as the organs are (inside the frame; keys equal the rules'
routes), and looked at in the same preview picture before Kartik checks them.

**B — the bloodstream as a circulation loop** drawn through the torso (a dashed ellipse
linking the organs, its count at the top), entries as in A. It says "circulating" better and
it is a Gate 2 item: it competes with the organ icons for the same 90px of interior width and
needs a layout pass A does not.

**HP per organ:** three pips under each organ icon (integrity is ≤3), filled and empty in the
organ brown, plus the number — not colour alone. **Tap to expand a lane:** tapping an organ or
an entry chip filters block b's rows to that place; no new data, no new component.

**Why stop here rather than build A:** the handoff asked for the proposal first, and A's
numbers put six more things on a figure Kartik has not yet checked — better ruled and checked
once than moved twice.

### Step 5 — block e: not measured, because it has nothing to measure yet

Organs travelling from anatomical to radial positions on the command button needs block a's
layout to travel from. Nothing was built or timed. When block a exists the cheap form is a
CSS transform transition between the two coordinate sets on one SVG layer (compositor work,
little main-thread cost, measurable through `onFrame`); the honest number comes from
measuring that on the throttled screen, and Shantanu has said he will cut it without
argument — so it waits for block a and a measurement, in that order.

## Item 12 — the anatomy check (Shantanu, 5 September 2026): one correction, one question for Kartik, step 4 RULED

### The marrow moves to the iliac crest — the biology, so it is defended and not just moved

The first picture had the marrow in the groin. **Corrected:** it sits on the **iliac crest** —
the flared upper wing of the pelvis, off to one side, where a hand rests on a hip — at
(74, 298) in the frame's space, on the **patient's right** (the viewer's left; one side is
enough, symmetry is not required). That is where an adult's **red** marrow lives and where a
bone-marrow biopsy is taken from. The femoral shaft has marrow too, but in adults it is mostly
fatty **yellow** marrow, not the blood-cell-producing red marrow the game models — so the pelvis
is both the correct answer and the one that fixes the placement. The spleen also moved two
pixels, to (144, 234), so that it clears the heart by more than a touch.

### THE MIRRORING QUESTION — Kartik's to settle, stated with both sides

On a front-facing figure, anatomical right is the viewer's left. The liver is placed on the
patient's right, so it appears on the **left of the screen**, with the spleen on the right.
That is **medically correct** — it is how every anatomy chart and every X-ray is read — and it
**reads backwards to anyone thinking in screen terms**. A game could reasonably choose either:

- **Medical convention** (as built): the figure faces you, its right is your left. Teaches the
  real thing; every doctor and every textbook agrees with the screen.
- **Screen-intuitive**: mirror the figure so "the liver is on the right" is also on the right
  of the screen. Reads instantly; disagrees with every chart the player will later see.

**Kartik decides**, and the pick is recorded here with his reason, so it is a decision rather
than an inheritance. Shantanu's preference, stated for the record: **keep it medically
correct**, bending only where two icons would otherwise touch. Until Kartik rules it stays as
built.

### "Not touching" is now a check, not a promise

Shantanu's rule — keep it medically correct, but organs must not touch or intersect, and if
they do, anatomy bends for UX — is a rule about numbers, so `packages/content/src/anatomy.test.ts`
holds every pair of the fourteen placed icons (seven organs, six entry chips, the bloodstream)
at least **32px apart on one axis** at the 30px display size, naming any pair that fails; its
control puts two icons on one point and requires the pair reported by name. The current
layout's closest pairs are 32px (brain–nose, lungs–heart, kidneys–gut, spleen–heart).

### Step 4 — RULED: option A. The positions, proposed as a picture before building

Shantanu ruled option A — entry chips on the outline at the point of entry, the bloodstream
at the great vessels — because the whole value of the screen is that things sit where they
are in a body, and a circulation loop would be a second diagram competing with the first. The
positions are now in `anatomy.json` as `ANATOMY_ENTRY: byRoute(Point)` and `ANATOMY_HUB:
Point`, validated like the organs (inside the frame; every rules route placed — two more
controls), and drawn in `pnpm art:anatomy`'s picture **for a look before block a is built**:

| Chip | x | y | Where, and why there |
|---|---|---|---|
| nose | 112 | 84 | the face, below the brain — the one entry that must be inside the outline |
| blood (the needle) | 34 | 140 | the deltoid, on the outline of the shoulder — a needle in the arm |
| contact | 36 | 176 | the arm stump, patient's right — skin contact by the hand |
| bite | 188 | 172 | the arm stump, patient's left — a bite is on a limb, and the stumps are the limbs the frame keeps |
| wound | 170 | 300 | the thigh edge, patient's left — a cut where the skin meets the outside |
| gut | 132 | 304 | the lower abdomen, patient's left — where enteric pathogens act |
| bloodstream (the hub) | 112 | 134 | the great vessels at the top of the chest; an amber disc, since it has no art and cannot honestly be one place |

⚠️ **One place where anatomy bends, stated:** the `entry-gut` art draws a **stomach**, and the
stomach's true position — under the left ribs, medial to the spleen — cannot hold a third 30px
icon beside the liver and the spleen in a 93px-wide waist. The chip stands for the digestive
tract as a ROUTE, and the intestines are where cholera, typhoid and the E. coli toxins act, so
the lower abdomen is the defensible place for a gut *infection's* entry even though the icon
shows the organ above it. If Kartik would rather the icon sit at the stomach, the spleen moves
laterally onto the flank and the check says whether it still fits.

**Block a itself is not yet built** — the ruling was to show the positions first.

### The second look (Shantanu, 5 September 2026): six moves, all applied

Brain up to (112, 42) to make room; nose to the middle of the face, (112, 78); the needle
inside the shoulder, (50, 140); the hand and the mosquito centred in their arm stumps and
near the stumps' bottoms — equidistant from the bottom and both sides — (40, 194) and
(184, 194); the wound down into the right thigh on the same rule, (146, 338). The spacing
check holds (closest pair 32px); the picture was re-rendered and looked at.

**Third look:** the hand was intersecting the stump's bottom stroke; raised to (40, 186).
**Everything else approved by Shantanu (5 September 2026) — the layout block a builds on.**
Still open for Kartik: the mirroring convention, and whether the gut icon should sit at the
stomach.

### For Kartik's queue, beside the mirroring question: the gut ICON, not the gut position (Shantanu, 5 September 2026)

"Gut" as an entry route is not the stomach. Food- and water-borne pathogens are mostly
**intestinal** — cholera colonises the small intestine, salmonella and shigella the gut wall,
rotavirus the intestinal lining. The stomach's main role is killing them with acid: it is a
barrier, not the site of infection. So the lower abdomen may be the MORE correct position,
and it is the icon that is wrong. **Question for Kartik:** should the gut art be intestines
rather than a stomach — which would make placement and biology agree, and cost one
regeneration through the pipeline (a new `entry-gut` raw, its provenance row, `pnpm
art:build`) rather than a layout compromise? Until he answers, the chip stays at the lower
abdomen and the icon stays as it is.

**Layout APPROVED (Shantanu, 5 September 2026). Block a builds against it.**

## Item 12 — step 4, block a: BUILT (5 September 2026), and the defect its walkthrough found

### What it is

`AnatomyView` (`packages/ui/src/play/AnatomyView.tsx`), at the top of the planning screen: the
keyed frame as an SVG whose viewBox IS the frame's pixel space, the seven organs at
`ANATOMY_POS`, the six entry chips at `ANATOMY_ENTRY`, the bloodstream as an amber disc at
`ANATOMY_HUB` — no coordinate authored in the component. Each organ carries its **integrity as
pips** (one per point at full, filled while it holds — shape, not colour; a failed organ dims).
Each place carries a **badge** with the count of invaders standing there, in the depth colour
with the number inside it: the model's `places` sum the rows by place, so a badge on the figure
is the same number as the rows behind it, by construction and by test. **Tap to expand a
lane:** the tap is coarse pointing, the board's own pattern — the nearest marker within 24
frame-px takes it, resolved in one handler on the SVG, because thirty-pixel icons cannot each be
a 44px target on a figure this size — and the rows below filter to that place, headed
"Showing: {place}" with a 44px Show-all; tap-again or a tap on nothing clears. The bloodstream's
place key is `hub`, not `blood`: `blood` is a route, the needle lane.

### Verified in the real app, headless (`drive-planning.ts`, 360×780, six turns) — versus by test only

**Headless:** the figure rendered at 280×475 CSS px with **all seven organs' pips** on every
turn; **the markers' sum equalled the counts-by-type chips on every turn** (1, 2, 3, 5, 8, 9
invaders); tapping a marked place (gut, nose, and on turns 5–6 the **marrow, an organ lane with
a red badge**) filtered the rows to exactly that marker's count, with the "Showing: Bone
Marrow" header; Show all restored every row; the board's SVG stayed absent while planning and
returned on Command; everything from the step-3 walkthrough held (one command button, both
cards, the mid-planning reload).

**By test only** (`planning.test.ts`, on recorded games): every marker's place is an organ, a
route or `hub`; the markers' counts sum to the body's total; organ markers carry the view's
own `hp`/`max`; exactly one hub marker. **Verified by no one:** a **failed organ's** dimmed
icon and empty pips (no idle game lost an organ inside six turns); a **hub badge tap** (the
bloodstream held something only on turn 6, and the driver tapped the first marked place); the
figure at 200% text; the touch feel of the 24px hit radius — an S25 item: *tap each organ, an
entry chip and the bloodstream; the rows should follow the finger, and a tap between icons
should clear.* One thing seen and left for Gate 2: the nose chip's badge sits close under the
brain's pips.

### FINDINGS #56 — found by the walkthrough, fixed at the session's resume, filed as the engine's

The first block a run counted **7 invaders in the rows against 5 by type** on the turns after
the driver's mid-game reload. The figure agreed with the rows, which is what pointed at the
data rather than the drawing: after a reload the engine's **invader id counter** — a
module-level counter no `GameState` carries — restarts at zero, and the next arrivals reuse ids
already in the body; the node model's id filter then puts one invader in two groups. Every
id-keyed path shares the fault: the attack rings, the sheet, the memory response, antivenom.
The corpus never sees it because the counter never restarts inside one process. It is an
**engine** defect (Phase 3 puts the counter in `GameState`), worked around **at the join that
owns resume**: `LocalSession.resume` advances the counter past the save's largest id, never
lowering it. `tests/session/src/resume-ids.test.ts` spans the join with a **control that drives
the engine alone after a simulated fresh process and requires the collision** — it went red
once for the right reason (the sampled states' first invaders were already dead, so nothing
collided) and was resampled to states that still hold `i1`. Full record: FINDINGS #56. After
the fix the walkthrough's counts agreed on all six turns.

This is outside item 12's scope and is recorded as such: it was fixed rather than only filed
because the newcomer test's resume path — lock the phone, unlock, continue — depends on it,
and the fix is a dozen lines at the seam that owns the behaviour.

## Rulings of 5 September 2026 (Shantanu), applied

- **The cell cards are written**, not waited for: `labels/cells.json` now carries role, home,
  best-against, deficiency and a fact for all seven cells, at the pathogen cards' standard —
  from the immunology the rulebook and study packet already teach, with the game's own
  numbers (range 3/2, +1 beside the Helper; two steps for the Neutrophil and NK Cell; four turns
  spent, two with the Helper in the blood; 2 and 3 damage; d6 3+). Kartik reviews and corrects;
  the schema refuses an empty field, so a correction is an edit, never a blank.
- **The "13" digit collision is fixed as ruled: the digit is dropped.** The alternative taken
  with it, stated so it can be cut: the organ's integrity is drawn as **pips under the organ
  icon** on the board — the planning screen's own pips, in the annotation area where no token
  ever stands. Dropping the digit alone would have left the command screen with no integrity
  at all, and the command screen is where a player decides what to defend. Seven pips-groups
  render (`data-organ-pips`), a resident standing on the tissue slot no longer shares a pixel
  with a number.
- **Mirroring: RULED — medical convention**, the liver on the patient's right. The earlier
  entries above that list it as open for Kartik are superseded by this line.
- **Gut icon: keep the stomach. No change.** The lower-abdomen placement stands with it.
- **Block e (the transition): build it if it can be done well, measure first, cut only on the
  measurement.** Built and measured below.
- Kartik's seven rulings: recorded in FINDINGS ("Kartik's rulings") and queued in
  `ENGINE_CHANGE_QUEUE.md`; the rulebook, study packet and quick reference corrected for the
  residents and the Heart.

## Item 12 — step 5, block e: BUILT and MEASURED (5 September 2026) — kept, on the measurement

**What it is.** When "Command your cells" is tapped from the planning screen, the seven organ
icons travel from their anatomical positions on the figure to their radial positions on the
board. A FLIP flight (`PlayScreen.tsx`): the figure's organ rectangles are read at the tap;
in the commit that replaces the planning screen with the board, seven ghost images are placed
at those rectangles and animated by **transform only** — so the compositor moves them and the
main thread does nothing during the 450ms — onto the board's icons, which stay hidden (a data
attribute on the root, one CSS rule) until the ghosts land. Skipped under
`prefers-reduced-motion`. The cost that CAN land on the main thread — the rectangle reads and
seven `animate()` calls, inside the board's own commit — is what was measured.

**Measured**, as the brief requires: numbers, device, throttle. Windows PC (the P2.3 screening
device), headless system Chrome over CDP, the dev shell at 360×780 @2×, `emulateCPUThrottling`;
`__iwMetrics.transitions` — main-thread busy time from the command TAP until the board's
commit with the flight prepared has yielded (the same 0ms-timer probe as the tap row), so the
figure is the whole command tap's work; the baseline is the same tap under reduced motion,
where the flight is skipped and the tap otherwise identical. Five taps per arm (eight for the
6× flight arm, rerun to check a tail).

| Throttle | Flight | Busy p50 | Busy p95 | Wall to paint p50 | Long tasks in the 600ms after the tap (max) |
|---|---|---|---|---|---|
| 1× | on | 14.0ms | 20.3ms | 41ms | 0 |
| 1× | off | 12.0ms | 13.0ms | 28ms | 0 |
| 4× | on | 66.9ms | 84.9ms | 76ms | 13 (71ms) |
| 4× | off | 62.9ms | 70.7ms | 94ms | 9 (64ms) |
| 6× | on (n=8) | 115.1ms | 165.2ms | 125ms | 17 (129ms) |
| 6× | off | 109.1ms | 112.0ms | 135ms | 21 (120ms) |

**Reading it.** The flight's marginal main-thread cost is **+2ms at 1×, +4ms at 4×, +6ms at
6× at the median** — the rectangle reads and the seven animations — with no long task at 1×
and no motion work on the main thread at all. Its tail at 6× is one tap in eight at 165ms
against 112ms without it: the rectangle reads force the freshly mounted board's layout inside
the commit rather than before the paint, and at 6× that shows. **Verdict, by the ruled test
(cut only if the measurement says so): KEEP.** The measurement does not say cut; it says the
flight is a few milliseconds on a tap that is expensive for another reason.

**That other reason is the finding, and it is not the flight's.** The command tap from the
planning screen **mounts the whole board** — it is a screen switch, not a selection tap — and
it costs **~63ms at 4× and ~109ms at 6× with the flight off**, against the §4 tap row's 100ms.
P2.3 measured selection taps (a highlighted node) and the initial render (~1s row); this tap is
a third shape, new with item 12, and it goes to the **mandatory per-redraw re-measure with the
full UI** ([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §4, row 3's note) as a named item — **and it is recorded as a BUDGET BREACH, not a note** (Shantanu, 5 September 2026): exceeded, reason, named fix and the point of resolution are in [`P2_3_MEASUREMENT.md`](P2_3_MEASUREMENT.md), "Added 5 September 2026". The
candidate that would make it cheap, not built: keep the board mounted and hidden while the
planning screen shows, so the switch is a visibility toggle rather than a mount — at the cost
of the board's memory and its render on every draw.

**Verified headless:** seven organs flew on every one of 26 command taps across the arms
(`organs: 7`), the ghosts were created and removed every time (the driver waits for zero
`[data-flight-ghost]` before ending the turn), and the mid-flight frame at 1× shows the ghosts
between the two layouts. **Verified by no one:** the flight by eye on the S25 — whether it
reads as the organs going to their places or as seven things flying about — which is a Gate 2
question and the reason Shantanu said he would cut it without argument. The S25 item: *tap
Command your cells and watch whether the organs land where the board has them.*

# After the S25 pass of 5 September 2026 (the second pass) — seven items, one an engine bug

Shantanu's pass covered the command panel, the effects strip, the crop and hub, the whole
planning screen and the flight: "working well", seven observations. Rulings and what was
built, item by item. Not seen on this pass and still unverified by anyone: a coated row on
the planning screen, a tap on the bloodstream's badge, a failed organ.

## 7 — degranulate damages the organ from the lane: CONFIRMED, an engine bug, queued (Q9, FINDINGS #57)

Confirmed in `actions.ts` before anything was proposed: the burn is keyed to the TARGET's
zone being a branch at any step, and the Eosinophil must be on the same space, so a
degranulation at step 1 of the Brain branch burns the Brain. The biology says the tissue
the fight is IN takes the damage; on a lane nothing is in the brain. Not fixed in Phase 2 —
queued as **Q9** with the proposed rule (the burn at branch step 0 only). Kartik's #18
ruling stands on its premise once Q9 lands.

**The "None" message, and the class it belongs to.** "Brain damaged — None — but fragile and
slow to defend for the rest of the game" was the strip splicing the organ's `effect` field —
the rulebook's *when damaged* table COLUMN, a cell not a clause — into a sentence template
that assumed a clause. Swept every place a content field renders inside a UI sentence:

| Template | Field spliced in | Filled today? | Verdict |
|---|---|---|---|
| `effects.organDamaged` "{organ} damaged — {effect}" | `ORGANS[o].effect` | 6 of 7 read as clauses; the Brain's is "None — but fragile & slow to defend" | **The live instance.** Fixed by shape: the chip says "{organ} damaged"; the column renders beneath it as a labelled value, "When damaged: None — but fragile & slow to defend", which is exactly what the rulebook's table says |
| `effects.forecast` "Next turn: {name} — {text}" | the event's `tell` | Only bad events forecast, and every bad event has a tell; the three good events (surge, passive antibodies, fever) have an EMPTY tell | **Latent** — the same shape, one data change from a dangling dash. Guarded: the tell renders as the detail line only when present |
| The banner chip "{name} — {why}" and the rare chip | `why` | every event and every rare has one | Same guard applied (detail line, not a spliced dash) |
| `planning.where*`, `effects.residentInfected`, `resident.of`, `inspect.hiddenInMacrophage` | organ, route and resident NAMES | always filled | fine — names are values, not prose |
| The pathogen and cell cards | `FACT`, `DZINFO.*`, `CELL_CARDS.*` | optional by design | fine — a missing field renders nothing, and the schema refuses an empty string |

So: one live instance, one latent; both now render the field as a value under a label rather
than as a clause inside a sentence. The rule for the class: a content field that is a table
cell is displayed as a table cell.

## 1 and 2 — the integrity pips: ABOVE the organ, coloured by state

Moved above the icon on the board and on the planning figure (below, they met the organ
names). Colour by state, derived from the organ's OWN max: green at full, red at one point
left, amber for anything between — so the Brain's 2 goes green straight to red with no
special case, and it stays right if any organ's integrity ever changes in content
(`integrityState` in `Board.tsx`, shared by both drawings). Shape still carries it: filled
versus empty pips.

## 3 — the cell list: a grid, three per row, uniform width

`PieceStrip` is a three-column grid with every chip the same width; each chip's two lines
clip with an ellipsis rather than wrap, so fourteen chips of unequal names keep fourteen
equal boxes. The icon shrank to 26px to leave the text room.

## 4 — the actions belong in the selection box: one box

Proposed layout, then built, since it was not tight — the rows are the same rows, only
moved. The command bar is now: header (the cell, its qualifier, AP, the board hint, undo on
the right) · the reason line · **the action rows** (available ones send what a ring would;
greyed ones say why when tapped; "movement is on the board" when the board offers moves) ·
a footer with Inspect and Deselect. While nothing is selected the bar carries the body's rows
under the select prompt. The separate "Actions" box below the pieces is gone; `ActionList`
survives as the rows' renderer inside the bar.

## 5 — banners: the duplicate, and the classification (reported, not built)

**Why it duplicated.** The engine sets an event's `fx` and its banner in the same draw, and
the strip had a chip for each: "Antibody shortage — every store is capped at 2 · 3 more
turns" (from `fx.capTurns`) AND "Antibody shortage — Plasma cells can't keep up" (the
banner). One effect, two chips. Not two distinct effects — the liver's antibody cap is a
third, different thing and keeps its own organ chip. **Fixed by folding:** the banner's name
heads the chip its event produced and its `why` becomes the chip's detail line; the banner
chip is shown only for an event with no chip of its own (co-infection, passive antibodies).
The one event with two effects — fever slows the invaders (good) and costs an Action Point
(bad) — keeps two chips, because they are two effects.

**The classification — every chip the strip can show, as asked, before any colour changes.**
The strip already has four kinds with four colours (red / green / blue / brown); Shantanu's
pass met only harmful ones, which is why it read as all red. What each chip is:

| Chip | Source | Class | Colour today |
|---|---|---|---|
| Arrival window closed, clear by turn N | turn > maxTurn | **neutral** (a deadline) | blue |
| Immunosuppression — no antibodies | event fx | **harmful** | red |
| Antibody shortage — stores capped at 2 | event fx | **harmful** | red |
| N fewer Action Points (fatigue; fever's cost) | event fx | **harmful** | red |
| N extra Action Points (acute-phase surge) | event fx | **beneficial** | green |
| Fever — pathogens do not march | event fx | **beneficial** | green |
| Neutropenia / Lymphopenia — a cell offline | suppress | **harmful** | red |
| {Organ} damaged · When damaged: … | organs | **harmful, permanent** | brown |
| Lymphatics blocked (filarial worms) | query | **harmful** | red |
| HIV — Helper T-cells destroyed | query | **harmful** | red |
| Helper T-Cell not yet primed | presentations = 0 | **neutral** (the starting state, not a penalty) | blue |
| {Resident} disabled — a parasite inside it | residents | **harmful** | red |
| Co-infection (banner only) | event | **harmful** | red |
| Passive antibodies (banner only) | event | **beneficial** | green |
| Next turn: {event} (forecast) | warning | **neutral** (information about a bad event) | blue |
| A rare event (malaria relapse, dengue ADE, TB reactivation, shingles, post-flu pneumonia, rheumatic fever, cytokine storm) | rareBanner | **harmful** — all seven | red |

**What is beneficial and is NOT a chip today**, which is Shantanu's real point: the memory
response ready (in the body panel), the Helper T-Cell PRIMED (only its absence is a chip),
immunity from a vaccine or from surviving (the body panel's "Immune" list), a coated pathogen
(a badge on the board). Proposal, for ruling: (a) add **"Helper T-Cell primed"** as a green
chip the turn priming happens (it disappears next turn — the strip is for effects in force,
and priming is permanent, so a one-turn announcement, or none); (b) add **"Memory response
ready — {disease}"** as a green chip while a remembered pathogen is in the body, since it IS
an effect in force and the body panel's line is easy to miss; (c) leave immunity and the coat
where they are. No colour changes were made: the four kinds already map harmful → red,
beneficial → green, neutral → blue, permanent → brown, and the list above is what to argue
with.

## 6 — the cell list on the planning screen: removed

Nothing else depended on it except the cell cards, whose ONLY entry point it was — so the
cards are re-homed on the **inspect sheet**, which is "tell me about this" for cells as for
pathogens: every cell row there now has a Card button. On the planning screen, which cells
are spent or offline is a fact beside the AP line ("Neutrophil · Spent — back in 2 turns"),
shown only when it is true of some cell. The roster's catalogue key is retired.

## Verified in the real app, headless — versus by test only (the second pass)

**Headless (`drive-round2.ts`, the app shell at 360×780, a fresh Training game, six turns):**
the seven organs' pips render ABOVE their icons on the board (bottom of the pips at or above
the icon's top, every organ), with the Brain's two and everyone else's three, all `full` at
setup; the piece list is a three-column grid, fourteen chips, one width; selecting the
Neutrophil produces ONE actions panel, inside the selection box, with Deselect after the rows;
"About this cell" in that box opens the Neutrophil's card with its role prose; the planning
screen has no roster on any turn and the figure's pips sit above their icons; a banner-only
event (passive antibodies, turn 4) rendered as ONE green chip with its why as a detail line
and no duplicate. **By test only:** the fold of an event's banner into its effect chip
(`effects.test.ts`: a banner is carried by exactly one chip, never a banner chip beside its
effect chip); the organ chip's "When damaged:" detail line (the organ chip is asserted per
damaged organ; its text was not read headless because no organ was damaged in six idle
turns); the worn and critical pip states and the Brain's missing amber
(`integrity.test.ts`); the planning screen's spent-cell facts line (no cell was spent in an
idle game). **Verified by no one:** the merged box with a piece that has several available
rows, on the phone; the grid with all fourteen chips on a 360px screen by eye; a folded chip
on the phone (draw until a crisis fires); the "When damaged" line under a real organ hit.

## The rulings on the second pass (Shantanu, 5 September 2026, late): the beneficial chips, and the dash sweep

### A correction to what was reported, recorded as one

Shantanu's pass reported the effects strip as "all red". It was not: the strip has carried
four colours since it was built (harmful red, beneficial green, neutral blue, permanent
brown), and his session happened to hold only harmful effects. **The real gap was beneficial
STATES having no chip at all** — a primed Helper T-Cell and a memory response being ready
were shown only by the absence of the unprimed chip and by a line in the body panel. Both
are now green chips, ruled and built:

- **Helper T-Cell primed** — for the rest of the game once priming happens, since every bonus
  it gives is an effect in force from then on; off while HIV has destroyed the helper T-cells
  (the engine's own `helperWith` returns false under `hivActive`). Its detail line lists the
  four bonuses.
- **Memory response ready for {diseases}** — while a remembered pathogen stands in the body,
  with the free / 1 AP (Hard) instruction beneath.

`effects.test.ts` holds each chip to its state on recorded games (chip ⇔ the engine's
licensing rule, chip ⇔ a remembered invader) with vacuity guards that both occurred.

**Vaccine immunity does NOT belong in the strip.** It is permanent and per disease, so a chip
would be a growing list that says nothing new turn to turn — the strip is for effects in
force *now*. It is already shown where it matters: the body panel's "Immune" list, the
pathogen card's "your body remembers this one", the reveal's "memory response" line, and now
the memory chip the moment a remembered pathogen arrives. Left there.

### The dash sweep: a standing preference, and where it stops

**The rule (Shantanu, 5 September 2026):** no em dashes, no en dashes, no hyphens used as
punctuation in any player-facing text; commas, full stops, or a restructured sentence. Cheap
now, expensive after the Hindi extraction, since a dash in an English string becomes a dash
in every translation derived from it.

**Swept, and now a check:** the UI catalogue (52 em dashes, every one rewritten by hand —
colons where the dash introduced an explanation, full stops where it joined two sentences,
commas where it was a pause) and the seven cell cards (27). `packages/content/src/no-dashes.test.ts`
holds both surfaces dash-free, with a control that catches an em dash, an en dash and a
spaced hyphen and permits the compound word (T-Cell, blood-stage, +1). The engine's own
`<b>`/`<i>` prose is untouched, being the engine's.

**Not swept, because those tables are PINNED, and that is a ruling to take rather than a
test to loosen quietly.** Counted rather than hidden:

| Surface | Dashes | Pinned to | By |
|---|---|---|---|
| `diseases.json` — `DZINFO` and `FACT`, the pathogen card's prose (Kartik's science) | 130 | legacy `v2_ui.html`, byte-identical | `tests/equivalence/src/ui-content.test.ts` |
| `labels.json` — `BEAT_BY_TYPE` | 5 | legacy `v2_ui.html` | the same |
| `rules/board.json` — `ORGANS.effect` and `.bio` | 6 | legacy `v2_engine.js`, byte-identical (one of the 22 tables) | `tests/equivalence/src/data.test.ts` |
| `rules/events.json` — `tell` and `why` | 7 | legacy `v2_engine.js` | the same |
| `rules/families.json` — `bio` | 2 | legacy `v2_engine.js` | the same |
| `i18n/en/engine.json` — the engine's rejections, log lines and frame headlines | 70 | the engine's source strings | the i18n drift test |

Two ways to sweep them, both a decision: (a) re-baseline the pins — make the parity and drift
comparisons dash-insensitive (normalise both sides before comparing), sweep the content, and
record that the extraction is now faithful up to punctuation; or (b) sweep them in Phase 3
with Q8, when the engine emits ids and the prose tables stop being the engine's. (a) is a day
and keeps the Hindi extraction clean; (b) costs nothing now and puts 220 dashes into the first
Hindi cut. **Recommendation: (a) for the content tables** (Kartik's prose is content, and
punctuation is not science) **and (b) for `engine.json`**, whose text the frozen engine
emits; the drift test exists to say the catalogue IS the engine's text, and it should not be
taught to look away while that is the contract. Shantanu rules.

## The dash sweep, completed as ruled (5 September 2026, late): the content tables re-baselined, the engine catalogue left exact

**The ruling, and the reasoning stated because the two pins do different jobs.** The engine
catalogue's pin (the i18n drift test) asserts the catalogue IS the engine's text; making it
punctuation-insensitive would weaken the exact comparison it exists for. It stays exact;
Phase 3 emits ids and the question dissolves. The content tables' pin was a finished
migration: it proved the tables came across from the legacy files unchanged, and it
succeeded. Kartik's disease prose is the source of record now, not a copy of one, and holding
it byte-identical to a file nobody edits would let a legacy build govern punctuation in the
Hindi edition. The extraction has not happened yet, so this was nearly free today.

**Two conditions, both met.** (1) The instrument change is its own commit (`ed8c610`), with
nothing else in the diff: `tests/equivalence/src/punctuation.ts` and the two parity tests.
(2) Both control halves, in both tests: a dash-only rewrite of a real legacy string is still
parity; one changed letter, and a dropped word, break it. What the loosened comparison still
guarantees — every letter and digit in order, every key and its order, every number — is
written in `punctuation.ts` so nobody reads a punctuation-insensitive parity check as a weak
one. It ignores exactly punctuation, whitespace and letter case (a full stop capitalises the
next word), and reads a numeric range as one range whether "1–3" or "1 to 3".

**The sweep (the second commit):** DZINFO and FACT (130), BEAT_BY_TYPE (5), ORGANS effect and
bio (6), FAMILIES bio (2) — an em dash becomes a full stop with the next word capitalised, a
numeric range becomes "to". `no-dashes.test.ts` now holds every one of those tables. **Still
pinned, and correctly so:** EVENTS and RARE (their `tell` and `why` reach the banner, the
warning and the log, so the equivalence corpus pins them — 7 dashes) and `engine.json` (70).
Both go with Phase 3's Q8. The board's own text (the rulebook .docx) is outside this sweep.


# After the third S25 pass (6 September 2026): passed, and five rulings taken with it

## The pass

Shantanu ran the seven steps on the S25 and every one behaved as expected: the pips above every
organ and their colours, the three-per-row piece grid, the single selection box with "About
this cell", the green chips, the "{Organ} damaged / When damaged:" line, the planning screen
with no roster and the spent-cell line under the AP, and no dashes anywhere. Nothing was
found. **Kartik approved the seven organ positions** ("It is fine") and **read the seven cell
cards and passed them**, with two edits ruled below. Still verified by no one: a coated
planning row, a bloodstream badge tap, a failed organ.

## The rulings (Shantanu, 6 September 2026)

1. **Dashes.** The 220 dashes in tables pinned to legacy or the engine go to Phase 3 as Q8.
   Confirmed; nothing more to sweep in Phase 2. The rulebook .docx question is still his and
   Kartik's.
2. **Per-event dialogs are ruled by a test, not event by event:** *does this change what the
   player can do THIS TURN?* If yes, it may deserve a dialog; if it is information they can act
   on later or merely notice, it is a log line. The classification is below; Shantanu overrules
   individual lines rather than being asked each one.
3. **The 46 ambiguous strings** are listed for him in
   [`AMBIGUOUS_STRINGS.md`](AMBIGUOUS_STRINGS.md): string, legacy location, the screen it now
   appears on, and the call each needs. He works through them in one sitting.
4. **The permanent "Helper T-Cell primed" chip is noise, and so is the pattern behind it.** The
   principle, which changes a design rather than confirming one: **do not show a cause as a
   banner. Show the effect where the number appears, and let the player drill into the number to
   see what is making it that way.** Positive minus negative equals the number already on
   screen. Applied everywhere a number is the result of several effects: antibody production,
   AP totals, snipe range, regeneration time, antibody caps. Checked first against what exists,
   below; the strip is swept against it, below.
5. **The cell cards.** The Eosinophil's deficiency line is softened (eosinophil-deficient
   animals clear several helminths, so "never cleared" overstated the evidence); it now reads
   "the body loses its specialist weapon against worms, and some worm infections take longer to
   clear". The Eosinophil's role line is **left as written** on purpose: it describes what Kartik
   ruled and what the engine does once Q9 lands, and it disagrees with the engine until then.
   FINDINGS #57 carries the note so nobody corrects the card in the wrong direction.

## Item 4, the check before the design: what already exists

**The antibody panel already does exactly what the principle asks, and has since CP2.** Tap a
family and the detail block shows the base rate, the net rate per action, a blocked line when
production is shut down, every effect on the rate signed and coloured (+1 Helper T-cell
licensing; 0 "Helper T-cell present but NOT yet primed"; the rate ceiling as a negative delta;
+1 affinity maturation on Training), and the store's cap reasons ("liver damaged", "a
temporary effect"). The source is the engine's own `productionBreakdown`, selection-scoped per
the P2.1 ruling; the UI mirrors nothing. So the antibody case needs **no new mechanism**. One
gap only: nothing on the panel says the detail exists. The per-family arrows (↑ ↓) are the
whole hint, and a newcomer has no reason to tap a family. Whether "tap a family for why" needs
saying is a Gate 2 question, noted here.

The other numbers the ruling names, and whether the engine explains them:

| Number | Where it shows | What makes it (engine) | Breakdown exists? |
|---|---|---|---|
| **AP this turn** | the command bar; the planning screen's "You will have N" | difficulty base, minus 1 per Giardia's drain, minus 1 if the lungs are damaged, minus 1 if the heart is, plus the crisis modifier (fatigue −1, surge +2, fever −1), floor 1 (`apFor`) | **No.** `apFor` returns a number and nothing lists its terms |
| **Antibody store cap** | the antibody panel, per family | the difficulty's cap; 2 while the liver is damaged; 2 during an antibody shortage (`capFam`) | **Yes**, `storage.capReasons`, rendered |
| **Snipe range** | not shown as a number; the rings show reach | the difficulty's range, +1 beside a primed Helper | No, and **no surface to attach one to**. The Killer T-Cell's card states the rule |
| **Turns until a spent cell returns** | the piece badge and the inspect sheet's "back in N" | 4 turns, or 2 with a primed Helper in the Bloodstream; never while the marrow is damaged (`neutrophilReadyTurn`, `marrowBroken`) | **The turn, not the why.** The session withholds the count under marrow damage (`local.ts`), correctly; nothing says "2 because the Helper is in the blood" or "not returning: marrow damaged" |
| **Bacteria divide on** | nowhere | 2 or 3 by difficulty, +1 with the spleen damaged (`divideOn`) | No surface |

**Proposal, for ruling, not built.** The AP figure gets a drill-in: tapping the AP in the
command bar, or the planning screen's AP line, lists the terms, base for the difficulty, each
organ penalty by name, one line per Giardia, the crisis modifier by event name, and the floor
when it bites, summing to the number shown. Every input is on the view already (the organs,
each invader's `drain`, `queries.effects.apMod`), but the deltas are the engine's literals, so
the list is a **mirror of `apFor`**, the hazard CLAUDE.md names. It is pinned the way the
neutralise-cost mirror is (#52): a spanning test in the session suite that, for every recorded
command-phase state, sums the UI's terms and requires equality with the engine's `apFor`, with a
control that breaks one delta. It expires when Phase 3 gives the engine an AP breakdown query
(Q8's family). The spent badge gets one line of why from the same inputs, pinned the same way.
Snipe range and division: nothing, because no number is shown and the cards state the rules.
When the AP drill-in exists, the fatigue and surge chips leave the strip (below), because the
AP number then explains itself.

## The strip, swept against the principle

The rule the sweep applies, derived from the ruling: **a chip survives if it is happening NOW
and either counts down or ends by a player's action. A state that is permanent or indefinite
comes out, and its meaning lives on the surface where its number shows, one tap in.**

| Chip | Verdict | Where its meaning lives instead |
|---|---|---|
| Arrival window closed (info) | **OUT** | the turn line already reads "Turn N · K turns to clear the body"; the engine's log line announces the change once |
| Immunosuppression, this turn | **STAYS** | a crisis in force this turn; the antibody panel's blocked line carries the effect |
| Antibody shortage, 3 turns | **STAYS** | counts down; also a cap reason in the panel |
| Fewer / extra Action Points, this turn | **STAYS until the AP drill-in exists, then OUT** | they become terms of the AP breakdown |
| Fever: pathogens do not march | **STAYS** | this turn; no number carries it |
| Neutrophil / Killer T-Cell offline, 2 turns | **STAYS** | counts down. The piece badge shows the same count; the chip is where the WHY (neutropenia, lymphopenia) goes |
| {Organ} damaged, permanent | **OUT** | the pips are the surface. "When damaged: …" needs a home one tap in: the organ's own row in the inspect sheet at its step-0 node, or the planning figure's tap. **Neither exists today** (the sheet has no organ row; the figure's tap filters the pathogen list), so this is a small build, not a deletion |
| Lymphatics blocked | **OUT** | indefinite. The hop is simply not offered; the selected cell's reason line says why (a new `selection.*` key); the worm's card explains |
| HIV | **OUT by the rule, and FLAGGED** | indefinite. The one line I would argue to keep: it is the most consequential state in the game and no number carries it. The engine's production breakdown shows no helper effect under HIV and says nothing about why. If it goes, the Helper's selection reason must say "HIV has destroyed the helper T-cells" |
| Helper T-Cell not yet primed | **OUT** | the production breakdown already lists "present but NOT yet primed" as a 0 effect when it stands beside the B-Cell; the Helper's selection reason says the same |
| Helper T-Cell primed | **OUT, ruled** | the breakdown's +1; the AP and regen drill-ins when built |
| Memory response ready for … | **STAYS** | happening now, ends by the player's action. It is currently said three times (chip, body panel line, board ring); the body panel's line is the one to drop |
| {Resident} disabled: a parasite inside | **OUT** | indefinite. The resident's token is dimmed and its selection reason says why |
| This turn's crisis (folded into its effect chip) | **STAYS for the turn** | it is the effect chip's name and why |
| Next turn: {event} | **STAYS** | the player can prepare now |
| A rare event | **STAYS for the turn after it fired, then OUT** | today `rareBanner` persists indefinitely (`firedTurn` is set and unused). **Gap found by the sweep:** `fireRare` writes NO log line, so the chip is the rare event's only trace. Its why is Kartik's best teaching text. Proposal: the log panel gets a UI-authored entry for a rare event from `RARE[key].why` (content, already dash-pinned to Phase 3) when the chip retires |

**What survives:** this turn's crisis effects carrying the event's name and why; the two- and
three-turn effects counting down; the forecast; the memory response; a rare event for one turn.
**What comes out:** every permanent or indefinite state: organ damage, lymphatics blocked, the
unprimed and primed Helper, an infected resident, the closed window, and HIV unless Shantanu
keeps it. `effects.test.ts` holds every chip to its state and will need its expectations
changed chip by chip, with the same vacuity guards.

## Per-event dialogs: the classification

**Timing first, because it decides the shape.** Crisis events fire at the start of the turn
(`fireTurnStart`, before the draw), so they are in force when the reveal dialog opens at the
draw. Rare events fire at the END of the spread (`checkRareTriggers`, called from
`resolveSpread`), after the player's commands are spent. Spread events are narrated frame by
frame with tap-to-advance.

**Every crisis event passes the test**, because every one takes effect on the turn it is drawn.
But nine events do not earn nine dialogs: the reveal already interrupts at the same moment. **So
crisis events become a section of the reveal dialog, never a dialog of their own. One
interruption per turn, at the draw, and nothing else stops play.**

| Event | Changes what you can do THIS turn? | Disposition |
|---|---|---|
| Immunosuppression | yes: no antibodies this turn | a section in the reveal, name and why |
| Neutropenia | yes: the Neutrophil is offline for 2 turns and is pulled to the hub | reveal section |
| Lymphopenia | yes: the Killer T-Cell is offline for 2 turns, pulled to the hub | reveal section |
| Antibody shortage | yes: stores are cut to 2 now, capped for 3 turns | reveal section |
| Fatigue | yes: 1 fewer AP | reveal section |
| Co-infection | yes: an extra invader is in the body now. It **already appears** in the reveal's arrival list (arrivals are diffed by invader id) | reveal section naming it as the co-infection; no other change |
| Acute-phase surge | yes: 2 extra AP | reveal section |
| Passive antibodies | yes: every store is full now | reveal section |
| Fever | yes: 1 fewer AP; pathogens will not march at the spread | reveal section |
| Next turn's forecast | no: next turn | the strip chip and the log; no dialog |
| The seven rare events | **no for this turn**: they fire after commands. Next turn they are state: a new invader on the board (relapse, TB, shingles, pneumonia), a damaged heart or organ (rheumatic fever, cytokine storm), or a changed rule for one invader (dengue ADE) | no dialog. The spawned invader will **not** appear in the next reveal (the diff is against the post-spread view, which already holds it), so the rare chip for one turn and the proposed log entry are its whole announcement |
| Spread events: bacteria divide, cells burst, viruses hide, toxin released, malaria bursts or hides, worms feed or lodge, lymphatic spread, fever's march, the march, organ damage, complement | no: the turn is over; the frames narrate them with tap-to-advance and the log records them | as built; no dialog |
| Organ failure, victory | end the game | the Result screen, as built |
| Pathogen X arrives | yes: no antibody fits; clonal selection becomes available | already a line in the reveal (`reveal.novel`); no separate dialog |
| A remembered pathogen arrives | yes: a free kill this turn | already a line in the reveal (`reveal.remembered`) and the strip chip; no separate dialog |
| The arrival window closes | **no by the test**: the goal changes, not this turn's actions | the turn line and the engine's log line. Flagged as the one line I would hear an argument for; the goal dialog already told the player this turn was coming |
| The Helper T-Cell is primed | it enables bonuses now, but the player caused it by engulfing | the engine's log line; no dialog |
| The Neutrophil regenerates | no: it is back, that is all | the engine's log line |
| Quit, overwrite-a-save | not events; confirmations | dialogs, as built |

**Result:** the dialog set is the goal dialog, the reveal (arrivals, a crisis section, the
novel and memory lines), and the two confirmations. Nothing else interrupts. The build this
implies is one thing: a crisis section in `RevealBody`, from the view's banner (name, why) and
the folded effect text the strip already composes. `APP_FLOW.md`'s dialog list ("crisis events ·
rare events · Pathogen X reveal") is superseded by this table once Shantanu has overruled what
he disagrees with.
