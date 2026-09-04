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
