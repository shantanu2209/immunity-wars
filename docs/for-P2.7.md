# P2.7 — what a fresh session needs to start

**Opened 9 September 2026**, the day P2.6 closed. This is the handover document, written so that
someone picking this up cold can begin without reconstructing the phase from its history. It is
not a plan: P2.7's shape is Shantanu's to set, and the first thing it needs is his specifics.

Read alongside [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §1 (the two gates) and §5 (the division of
labour), and [`P2_6_CLOSEOUT.md`](P2_6_CLOSEOUT.md) (what is proven and what is not).

---

## 1. Where the project actually stands

**Every screen exists and Gate 1's capability bar is met.** P2.6 closed with the four Title slots
built (How to play, the disease library, Settings, About), the error boundary and the
storage-failure notice, and first-encounter hints. Shantanu's S25 pass over all of it, 9 September
2026: everything works as described, How to play reads well on a phone, the library is navigable
at 106 rows, the hints fire two per turn, Settings works at all four text sizes.

**Gate 1 is the capability gate and it is met.** Gate 2 is not implied by it, and this is stated
in the brief in those words: *"Not implied by Gate 1. Not implied by a review going well."*

> ⚠️ **CORRECTED 13 September 2026 ([`FINDINGS.md`](FINDINGS.md) #69).** **What was claimed**, twice
> in this section: Gate 1's capability bar is met. **What was actually true:** met on every path
> anyone had walked, and not on one nobody had. Gate 1 requires no dead end and no screen without an
> exit. If the service worker failed to register (a flaky first load, a private browsing mode,
> blocked site data), the app started, the crash screen replaced it, and that screen's only exit
> reloaded into the same failure. The S25 pass could not see it, because a LAN address is an
> insecure context where the worker API is absent and nothing registers; the audit could not see it,
> because its browser always registered. **What closed it**, before any polish, by ruling:
> registration caught where it happens, the app continuing online when it fails, the error boundary
> left exactly as strict, and two audit controls that enter the failing state on purpose, which said
> NO against the defect and YES against the fix. **The claim is true again**, and it is left standing
> above rather than restated, so the record shows it was once not.

**Nothing is owed by anyone.** The hint splits are settled. There is no pending review, no
outstanding correction, and no half-finished piece.

---

## 2. THE ONE THING TO DO FIRST, and it is not building

**Shantanu already saw refinements to navigation and placement on the S25, and ruled them Gate 2's
rather than P2.6's. He did not list them, and they were deliberately not written down.**

> **So P2.7's first action is to ask him for those named specifics.** Not to guess at them, not to
> propose a polish list, not to start improving things that look improvable.

This is the brief's own rule, from §1: *"Each round ends with named specifics, not a verdict.
'The organ labels are hard to read at phone size' is actionable. 'It needs work' produces guessing
and a fourth round."* P2.7 is unusual in having its input available **before** the first round
rather than after it, and the cheapest possible start is to collect it.

**Do not open a PR before that conversation.** A polish round built against a guess is the one
shape this sub-phase can waste weeks on.

---

## 3. CLAUDE DESIGN — this is where it gets used, and what for

**It has not been used at any point in Phase 2**, and P2.6's closeout records why that is not a
shortfall: the brief's commitment was that screens with no prior version be **explored** before
being built, and that happened in five written proposals ruled before any code. The exploration
was real; it was in prose.

**P2.7 is its role** (Shantanu's ruling, 9 September 2026), and the reason is specific rather than
ceremonial:

> **It is for exploring ALTERNATIVES side by side. It is not for iterating one version in code.**

That distinction is the whole of when to reach for it:

| Use Claude Design when | Build it in code when |
|---|---|
| Three plausible layouts exist and nobody knows which reads better | One layout is agreed and needs implementing |
| The question is "what else could this look like" | The question is "make this one better" |
| Comparing costs less than committing | The change is small and reversible |

**How it works here** (brief §5): Shantanu directs it separately, in chat, and **brings back a
direction**. It does not produce code and its output does not enter the repository. What comes
back is a direction; the build against that direction is ordinary work in code.

**What it is likely to be worth using on**, once his specifics exist: anything where his note is
about arrangement rather than a value. "The board is hard to navigate at 360 px" is an
alternatives question. "This label is too small" is not — that is a number, and it changes in a
commit.

---

## 4. Gate 2, stated so nobody mistakes it for a checklist

**Gate 2 is a separate, explicit act:** *"the visual design is approved"*, said by Shantanu. It is
not implied by a review going well, by an audit being green, or by a round ending.

**Two polish rounds are the expected shape, not a limit in either direction.** If he is satisfied
after one, the second is not owed. If he is not satisfied after three, work continues.

**What is explicitly NOT in either gate**, and should not be drifted into: animation elegance
beyond function, palette refinement, spacing beyond legibility, screen-reader support (deferred
with a reinstate condition), anything Phase 6 could revisit. These are real and endless, and the
brief names them precisely so that a polish sub-phase does not absorb them.

---

## 5. What must not regress, and how to know

Every one of these is enforced by something that fails, so a polish change that breaks one is
caught rather than noticed later. **Run `pnpm verify` before every commit, and the audit whenever
a screen's layout, text or controls change.**

| Instrument | What it holds | Its warrant |
|---|---|---|
| `pnpm gate1:audit` | touch ≥ 44 px, contrast, text at 200% under three mechanisms, layout, offline, a refused service worker registration | 34 controls, fire and pass halves (27 until 13 September; #69 added two, piece 1 five) |
| `pnpm verify` | typecheck, lint, format, boundaries, docs, turbo hash, every suite | `pnpm ci:selftest` |
| `pnpm coverage:positions` | the generated coverage documents' positions | 4 controls |
| `iw/no-hardcoded-jsx-text` | all player text through the catalogue | both control halves |
| `no-dashes.test.ts` | no dashes in player text | its own control |
| the equivalence corpus | the engine's behaviour and its 67-name root surface | the whole of Phase 1 |

**What the audit must hold, every run:** **44 screens** per pass (46 under SIZE200), **no screen
NOT REACHED**, every check **0**, **34 controls** all firing the right way, offline met, and **no nesting landing wrong**.
**Read the per-screen list, not the total** — four times in P2.6 a green total hid an unmeasured
screen ([`FINDINGS.md`](FINDINGS.md) #66 and `CLAUDE.md`).

> ⚠️ **CORRECTED 9 September 2026, at P2.7's first change, by a control that fired on its first
> run** ([`FINDINGS.md`](FINDINGS.md) **#68**). This paragraph read: *"The audit's numbers to beat,
> from the final P2.6 run: 843 controls and 2,243 text runs across 44 screens per pass."*
> **Two of those three numbers cannot be beaten or missed.** The walk plays a real, UNSEEDED game
> — the engine has no seed injection point (#40) — so the card drawn and the dice differ every run,
> and with them the counts. Measured: **two runs against the same build with no code change between
> them gave 848 / 2,336 and 843 / 2,267**, and every screen in the delta was a play screen. The
> screen COUNT is stable because the walk visits a fixed list; the counts WITHIN a screen are not,
> because the game inside them is not the same game.
>
> The counts are still worth printing — a drop from 843 to 400 is not variance — but a threshold
> they are not. Calling them one invited the dangerous reading rather than the merely costly one:
> **a real loss of coverage dismissed as the variance everyone had learned to expect**, which is
> #66's silent green with a sentence in this document holding the door open.
>
> ⚠️ **One more correction, 13 September 2026:** "no screen NOT REACHED" does not hold on every run
> either. On one of two runs against an unchanged build the inspect sheet was NOT REACHED under
> SIZE200, because its door is a tap on an invader token and the unseeded game decides where the
> tokens are ([`FINDINGS.md`](FINDINGS.md) #68, added note). It is still never dismissed: **reach the
> screen or explain it**, and a re-run that reaches it is the explanation only for a door known to
> depend on the deal.

---

## 6. Two rules that will bite a polish sub-phase specifically

- **Player text inside `packages/engine/src` is not editable for style.** It is state the corpus
  compares byte for byte against legacy. A polish round is exactly when someone will want to
  reword a log line; the answer is no, and the reason is that it breaks the primary oracle.
- **A new USE of an existing content value is a new surface** ([`FINDINGS.md`](FINDINGS.md) #63).
  Moving a colour from a fill to a text background, or a value from one panel to another, is a new
  check even though the value is unchanged and trusted where it already appears. 212 contrast
  findings came from exactly that in P2.6.

---

## 7. What is NOT P2.7's, so it is not picked up by mistake

- **The handset performance measurement**, and with it locked decision #1 (Capacitor vs React
  Native). Phase 4's, and unresolved by ruling.
- **Offline on the Android build.** Phase 4's.
- **The newcomer test.** Protocol approved, no testers; it lands against the P2.6 closeout when
  they exist, and its named specifics can reorder work.
- **Any engine change**, including the queued ones (Q6 to Q10) and the bot. Phase 3's.
- **The startup storage probe**, the Diphtheria toxin producer question, and the string
  inventory's unwired `--check` — all reported with reasoning and deliberately not built.

---

## 8. The first three actions, in order

1. **Ask Shantanu for the S25 refinements as named specifics.** He has them.
2. **Sort them into two piles**: alternatives worth exploring (his, through Claude Design) and
   values that just change (mine, in a commit). Say which is which and why.
3. **Build the second pile, propose against the first.** Then the round ends with him saying what
   is still wrong, in specifics, and the second round starts from that.

**Nothing here is started until step 1 has an answer.**

> ✅ **DONE, 9 to 13 September 2026.** Step 1 was asked. The answer was not a list: the problems
> were diffuse rather than pointed, so Shantanu changed the round's shape to a conversation (Claude
> proposes an arrangement, he reacts, Claude adjusts), with one priority: **playing it must not be
> difficult**, so the play surfaces come first and the reference screens after. Steps 2 and 3 are
> replaced by that loop. The consistency pass across the four Title slots went first, because it
> needed nothing from him and everything else lands on top of it. §9 records the play screen.

---

## 9. The play screen: measured, proposed and ruled (13 September 2026)

Proposed as a page of side-by-side phone mockups, first three arrangements and then the chosen one
in detail, and **approved in full** (Shantanu, 13 September 2026). **Nothing below is built yet.**

### What was measured first

360 × 780 CSS px, the shipped build, Training, turn 1:

| State | Page height | Below the fold | What it meant |
|---|---|---|---|
| Planning | 1,001px | 221px | its one button, at 831px, was off screen |
| Command, nothing selected | 1,415px | 635px | most of the fourteen pieces below the fold |
| Command, a cell selected | 1,687px | 907px | selecting grew the command bar 174 → 339px and pushed everything down 272px |

The turn buttons sat at the very top (16 to 68px), two of the three always greyed. The pieces grid
renders two per row at 360px (`minmax(7rem)`), not the three the 5 September checklist described.
`APP_FLOW.md` placed the command bar at the bottom; the build had it inline at 459px, and no ruling
was found that moved it.

### The rulings

1. **The dock.** The next step lives in a dock at the bottom of the play screen, one height in every
   state: selecting changes what it says and moves nothing. The top row keeps only the turn line and
   Menu. *This changes the 5 September top row (Draw, End turn, Menu).*
2. **No Draw button.** The engine refuses every other action before the draw (`beginCommand` returns
   "Draw first.", `endCommand` returns "Not in command."), so the draw was never a choice. End turn
   plays the spread, the app sends `draw` itself, and the reveal shows what arrived; its button
   begins planning. **The engine and the rules are unchanged**; only who sends the action changes.
   A draw that brings nothing (after the infection window) goes straight to planning; a draw that
   wins the game goes to Result; on the first turn the draw follows the goal dialog.
3. **Arrangement C: one main screen, with drawers.** A row of drawer buttons (Pieces, Antibodies, The
   body, What happened), each opening over the board. Picking a piece in the Pieces drawer closes it
   and selects the piece on the board.
4. **No scroll on the main screen.** Only reading surfaces scroll: cards, Help, the library, the log.
   Everything else opens as a drawer, with transitions between sub-sections instead of scroll.
5. **200% text.** Nothing is ever cut off. If the main screen cannot fit at a larger text size it may
   scroll, as the last resort. Gate 1 requires function at 200%, and a no-scroll screen that clipped
   would fail it.
6. **Phone sizes, a balance.** Mainstream phones decide the design; a 640px screen is checked, not
   chased at the cost of quality. No usable screen height for the target low-end phones is recorded
   anywhere in the project, only their RAM and price class.
7. **Drawers.** Quick picks (Pieces, Antibodies) slide up from the bottom with part of the board still
   visible. Reading surfaces (the log, cards) open full height.
8. **One close.** A floating button at the bottom of the screen closes every drawer, card and page,
   present throughout and never at the end of a scroll.
9. **Nesting is a stack.** Every close or back returns to the level it came from, never straight to
   the main screen. The button says **Back** when it returns to a previous level and **Close** when it
   returns to the main screen. Android's back button (Phase 4) pops the same stack.
10. **Two calls made under ruling 6, approved with the rest.** The main screen misses 640px by 11px,
    and the dock trims to meet it. Planning misses 640px by 126px, and on phones that short planning
    scrolls rather than shrinking the body view to about 284px for every player.

### The height budget the build is held to

| Main screen, a cell selected | px |
|---|---|
| turn line and Menu, one row | 44 |
| board, full width (measured) | 339 |
| drawer buttons | 48 |
| dock, one height in every state | 220 |
| **total** | **651**: 129 spare at 780, **−11** at 640 |

| Planning | px |
|---|---|
| turn line and Menu | 44 |
| Action Points line | 44 |
| body view, shrunk from the measured 504 | 410 |
| Pathogens drawer button | 48 |
| dock | 220 |
| **total** | **766**: 14 spare at 780, **−126** at 640 |

### Where nesting breaks today, read from the code on `main`

| Path | Close or back today | Under ruling 9 |
|---|---|---|
| inspect sheet → pathogen card | back to the sheet | no change |
| inspect sheet → cell card | back to the sheet | no change |
| planning → pathogen card | back to planning | no change |
| library card → "Why it works this way" | the library index | back to the card |
| Help section → why link → library page | the library index, then the title | back to the Help section |
| library why page → "In How to play" → Help | straight to the title or the game | back to the library page |
| pause menu → Settings or How to play | the game, pause menu closed (`setPaused(false)`) | back to the pause menu |

### What building it changes beyond the screen

- **The instruments.** The Gate 1 audit and `tools/perf/measure.ts` and `measure-full.ts` drive a
  turn by clicking its buttons, so removing Draw and moving the dock changes their walks, and each
  change re-runs the controls it depends on. `APP_FLOW.md` ruling 6 keeps the dev shell's own turn
  buttons for the perf driver's coupling; that is honoured and re-measured, not silently broken.
- **The walk gains screens:** every drawer, and at least one second level, so ruling 9 is measured
  rather than assumed.
- **Help's "A turn" section** says "Tap Draw a card". That is catalogue text and changes with the
  build. No engine text changes.

### ✅ RULED 13 September 2026: the build in four pieces, one PR each

> Recorded as proposed, not ruled, and ruled by Shantanu the same day: "the split and order are
> correct". The table is unchanged from the proposal.

| Piece | Rulings | Why in this position |
|---|---|---|
| **1. The navigation stack and the floating close** | 8, 9 | App-wide and independent of the play screen. It fixes the four breaks above, and the drawers in pieces 3 and 4 nest on top of it, so it has to exist first. The smallest piece. |
| **2. The dock and the draw inside End turn** | 1, 2 | The turn's flow. The dock is where a drawer's pick lands, so it comes before the drawers. The audit walk, the perf drivers and Help's turn section change here. |
| **3. The drawers and the main screen without scroll** | 3 to 7, 10 | The largest piece. The height budget is measured at 780 and 640, and under all three text-at-200% mechanisms. |
| **4. Planning** | 4, 10 | Depends on the dock and the drawers: the body view at about 410px, the pathogen list as a drawer, the dock's Command your cells. |

Each piece is audited with the per-screen list read, and goes up only after the one before it is
merged. A phone pass on the S25 is most useful after pieces 3 and 4, where the main screen and
planning take their new shape.

---

## 10. Piece 1, the navigation stack and the floating close: BUILT, 13 September 2026

Written 13 September 2026, after the split was ruled, because the rulings fix the behaviour and
leave three choices in how it is built. **Nothing is built until these are ruled.**

> ✅ **All three choices ruled as recommended** (Shantanu, 13 September 2026), and built the same
> day. What was built, and what building it found, closes this section.

### What was measured for it

**Where each close sits today**, at 360 × 780 CSS px on the shipped build:

| Surface | Its close | Scroll needed to reach it |
|---|---|---|
| library index | Back, at 7,278px | **6,546px** |
| library "why it works this way" page | All pathogens, at 4,306px | **3,574px** |
| Help sections 3, 5, 6, 9 | All sections | 206, **697**, 363, 99px |
| About | Back, at 1,040px | 308px |
| pathogen card, cell card, inspect sheet | at the end of their content | none on the instances measured, because those fitted; the close is last in the content, so a longer one pushes it out |

**The phone's back gesture leaves the app from every screen, mid-game included.** Nothing in
`packages/app` or `packages/ui` touches the browser's history, so the web build is one page with
no entries. The autosave means nothing is lost, but `APP_FLOW.md` §2 ruling 1 says back "never
silently exits Play", and on the web build it does.

**The Gate 1 audit clicks closes by their words:** "Back" seven times, "Close" four, and "All
sections", "Close card" and "Resume" once each. Ruling 9's labels change with depth, so the walk
changes in this piece and its controls re-run.

### The structure proposed

- **One stack, owned by the shell.** A pure model in `packages/app`: open a level, close a level,
  and the label the floating button shows (Back when closing returns to a previous level, Close
  when it returns to the main screen). It replaces the screen machine's one-hop `from`. The play
  screen's layers (the inspect sheet, cards, the pause menu) open and close through the same stack,
  so a Settings page opened from the pause menu closes back to the pause menu.
- **Siblings are not levels.** Help's Next moves from section 5 to section 6 at the same level, so
  Back from section 6 goes to the Help index, not to section 5. The same holds for the library's
  cards opened one after another from the index.
- **One floating button**, a UI component rendering the stack's label from the catalogue, pinned
  to the bottom of every page and layer that has a close or back today. Reading surfaces get bottom
  padding so their last line is never under it. "All sections", "All pathogens", "Close card" and
  the pages' Back buttons are replaced by it.
- **Not given one:** dialogs (the reveal, the confirms), which are acknowledged by their own
  button, and Result, whose buttons are all onward.

### What the instruments gain

- **Unit tests on the stack model, both halves**: every open followed by a close lands on the level
  before it, and a planted defect (a close that pops two levels) is caught.
- **The audit walks all seven nesting paths of §9** and asserts where each close lands, with a
  control that fires on a wrong landing and one that passes a right one.
- **A new audit check: nothing readable sits under a fixed control** at the end of a scroll, under
  all four passes, with both control halves. The audit today measures clipping and overflow, not
  one element covering another, so a floating button hiding a card's last line would be green.

### ✅ Three choices, RULED as recommended (13 September 2026)

1. **The phone's back gesture.** (a) On-screen only, and the gesture keeps leaving the app until
   Phase 4 wires Android's back button; or (b) the stack also drives the browser's history, so the
   gesture closes one level, exactly like the floating button, without the address changing.
   **Recommendation: (b).** The web build is what a school opens, the gesture is how most phone
   users go back, and it is the one way today that Play exits silently, against a ratified ruling.
   At the bottom of the stack the gesture on Play opens the pause menu, ruling 1's order, and on
   Title it leaves the app as any site does.
2. **Where the floating button applies in this piece.** (a) Every page and layer that has a close
   or back today, the scope above; or (b) the reading surfaces only, leaving the inspect sheet and
   pause menu to pieces 2 and 3. **Recommendation: (a).** One close in one place is the ruling, and
   splitting it would ship two conventions at once.
3. **Siblings.** Is Back from Help section 6, reached by Next from section 5, meant to go to the
   index (siblings are one level, as proposed) or to section 5 (every screen is a level)?
   **Recommendation: the index.** Otherwise reading all ten sections means ten Backs to leave.

### What was built, and what building it found

**Built as proposed, with one deviation stated rather than worked around.** The stack model, the
floating close and the back-gesture sync live in `packages/ui/src/nav/`, not in `packages/app` as
the proposal said: the dev shell mounts the same play screen, its cards and inspect sheet need the
close too, and `ui` cannot import `app`. The app's screen machine uses the stack from there. The
behaviour is exactly what was ruled.

- **Every close is one close.** One ordered list holds screens and layers, so Settings opened from
  the pause menu is [play, pause, settings] and closes to the menu. Help's Next replaces the section
  in place. The floating button says Back or Close from the stack. Dialogs are on the stack without
  the button, so the back gesture answers them first, as APP_FLOW ruling 1 orders.
- **The back gesture closes one level.** One history entry per level, the popstate a trim causes
  ignored, and a deeper stack held while a trim is still travelling. At the bottom of Play the
  gesture opens the pause menu; at the Title it leaves.
- **Removed:** Resume, All sections, All pathogens, Close card, the inspect sheet's Close and every
  page's Back, with their ten catalogue keys. Added: `nav.back` and `nav.close`.
- **A spacer at the end of the page while the button shows**, because the inspect sheet is not
  modal and the game's page can still scroll its last lines under the button.

**Three things the build found, all in instruments, all fixed in the same change:**

1. **The stack test's own control fired on its first run.** It expected a close that pops two
   levels to be caught on all seven paths, and one path cannot catch it: planning → pathogen card
   is one level above the base, and the base is never popped, so popping two lands where popping
   one does. The control now requires the catch on the six paths deep enough to tell, and the
   seventh is pinned as a blind spot with its own assertion.
2. **The occlusion check's first run reported 109 findings, and every one was wrong**
   ([`FINDINGS.md`](FINDINGS.md) #70). It asked whether text overlapped a fixed control; the
   dialogs, the Settings confirms and the pause menu all have buttons over page text that their
   own scrim already hides. None involved the floating close. It now asks whether the control is
   what hides the text, and a third control pins exactly that class.
3. **The walk reported planning → pathogen card NOT REACHED, and that was the walk's fault.** The
   pathogen rows render only once their group is opened; the walk now opens the group first.

**The audit on the shipped build, 13 September 2026:** 34 controls, all firing the right way; 44
screens per pass (46 under SIZE200), none NOT REACHED; every check 0 under all four mechanisms,
occlusion included; 22 nesting landings checked, 0 wrong, 1 NOT REACHED (inspect sheet → cell
card: no cell stood on the node the walk inspected, which the deal decides); offline met.

---

## 11. Piece 2, the dock and the draw inside End turn: HANDOFF, nothing built

**Written 13 September 2026, at a context clear, immediately after #81 (piece 1) merged**, so a
fresh session can start piece 2 without the conversation. Everything below is either ruled, with
where, or marked as not yet decided. Nothing of piece 2 exists in code.

### Where things stand

- **Merged:** #79 (the medical review), #80 (round one, #69's fix, the play screen rulings), #81
  (piece 1: the navigation stack, the floating close, the back gesture, the audit at 34 controls).
- **No PR is open.** The piece 2 branch, `phase2/p2-7-piece2-dock-draw`, holds only this handoff.
- **One PR at a time, and Shantanu merges.** Fetch before pushing to an open branch: he merges
  `main` into open PR branches.

### What piece 2 is, from the rulings

- **§9 ruling 1, the dock:** the next step in a dock at the bottom of the play screen, ONE height in
  every state, so selecting changes what it says and moves nothing; the top row keeps only the turn
  line and Menu.
- **§9 ruling 2, no Draw button:** End turn plays the spread, the app sends `draw` itself, and the
  reveal shows what arrived, its button beginning planning. The engine is unchanged. A draw that
  brings nothing (after the infection window, the engine's mop-up sentinel) goes straight to
  planning; a draw that wins the game goes to Result; on the first turn the draw follows the goal
  dialog. `APP_FLOW.md`'s PLAY section is already amended to say so.
- **The split, §9's ruled table, row 2:** the dock is where a drawer's pick lands, so it comes
  before the drawers. **Not piece 2's:** the drawers and the main screen without scroll (piece 3),
  and planning's layout (piece 4). So after piece 2 the pieces grid, the antibody panel, the body
  panel and the log still sit in the page's scroll. That intermediate state is expected and is not
  a defect.

### ⚠️ The first action is to measure and propose, not to build

Piece 1 went proposal, ruling, build, and piece 2 does the same wherever the rulings leave a choice.
**Measure first**, on the shipped build at 360 × 780 and again at 200% text:

1. **The command bar's height with each of the fourteen pieces selected.** The largest action set
   has to fit the dock's 220px budget (§9's height table) or the proposal says what happens.
2. **The dock with nothing selected:** what it would hold (today the memory response and antivenom
   rows) and its height.
3. **The top row once Draw and Begin command leave it**, and what the freed height does.

**Choices the proposal will likely need ruled. None is decided:**

1. **The dock and the floating close both live at the bottom.** When a card, the inspect sheet or
   the pause menu shows the floating close over the game, where is the dock: covered by the layer,
   or does the floating close sit above it? Found while writing this handoff; neither ruling
   anticipated it.
2. **The dev shell's turn buttons** (`APP_FLOW.md` §2 ruling 6): keep Draw so the perf driver's
   coupling holds verbatim, or follow the app and re-measure the driver.
3. **What the dock shows while a spread plays** (input is disabled) and **while the reveal is up**.
4. **The dock at larger text sizes.** Ruling 5 says nothing is ever cut off and the main screen may
   scroll as the last resort; whether the dock caps its height and scrolls inside, or grows.
5. **The reveal's button words.** "Continue" today; ruling 2 says its button begins planning.
6. **Help's "A turn" section** says "Tap Draw a card". It is catalogue text, not engine text; its
   provenance is in [`HELP_DRAFT.md`](HELP_DRAFT.md). Say whether the rewording needs Kartik.

### What piece 2 changes beyond the screen

- **The Gate 1 audit** clicks "Draw a card" in its walk, in the walk to the Result and in the
  offline steps; `tools/perf/measure.ts` and `tools/perf/measure-full.ts` drive a turn by its button
  text too. Each walk changes, and its controls re-run.
- **The audit must still hold, every run:** 34 controls all firing the right way; 44 screens per
  pass (46 under SIZE200), none NOT REACHED; every check 0 under all four mechanisms, occlusion
  included; nesting landings 0 wrong (22 in the last run, 1 NOT REACHED by the deal); offline met.
  Control and text-run counts are samples, not thresholds (`FINDINGS.md` #68).

### Facts from building piece 1 that the code does not say loudly

- **The navigation stack** is in `packages/ui/src/nav/`: `useNav` and `NavHost` in the shell,
  `useNavLayer` in a component. The shell registers the pause menu with `useNavLayerWith` and a
  MEMOISED api object; passing the `nav` object itself re-registers the layer on every render and
  reorders the stack, which breaks "Settings closes back to the pause menu".
- **`FLOAT_RESERVE` (5.5rem)** is the space a scrolling surface keeps free at its bottom for the
  floating close. It is in rem so it grows with the text. `NavHost` adds a spacer at the end of the
  page while the button shows, because the inspect sheet is not modal.
- **Occlusion asks whether a control HIDES text, not whether it overlaps it** (`FINDINGS.md` #70).
  A dock over page content is exactly the surface this check now watches.

### How measurements were taken in this phase

- A puppeteer-core script placed in tools/perf with a `.tmp.ts` suffix (a scratchpad cannot resolve
  workspace dependencies), run with `npx tsx` against the shipped build served by
  `pnpm --filter @immunity-wars/app preview` on port 4173, and deleted after. Page-side code passed
  to `page.evaluate` as strings, because tsx wraps functions in a helper the page does not have.
- **`pnpm verify` deletes and rebuilds the app's build output**, so it never runs while the audit
  is running against the preview.
- The design review happened on a private artifact page of side-by-side phone mockups drawn to one
  scale from measurements; Shantanu has its link. Piece 2's proposal can extend it or be text, as
  the choices warrant.

---

## 12. Piece 2, the dock and the draw inside End turn: MEASURED AND PROPOSED, nothing built

Written 13 September 2026 from §11's handoff. **Nothing is built until the choices below are ruled.**
The proposal is also drawn, to one scale, on a private artifact page of its own; Shantanu has the
link.

### What these numbers cannot say

- **Every game was played idle** on Training: no action but one move a turn, so that Undo would
  show. The action sets are an idle board's. The B-Cell's largest set, 16 rows, came from invaders
  piling up on turns 4 to 6 of a game nobody was playing. **The largest set in a played game is not
  measured, and it has no fixed upper bound**, because the list has one row per target.
- **One deal per text mechanism.** The FONT200 and ZOOM200 games never gave the B-Cell a target, so
  their largest bars are lower bounds.
- **Not reached:** a rejection notice in the bar (none was triggered); a mop-up draw or a draw that
  wins (six turns of fifteen never leave the infection window); the inspect sheet with more than one
  invader (the one measured was 64px tall, and its cap is 46% of the screen); any handset.
- **Conditions of every figure:** CSS px, measured on the shipped build at `a0fcbf3` (its code is
  #81's), served by `vite preview`, headless system Chrome on the development PC (i7-12700F), no
  CPU throttling, which does not change a layout height. Three mechanisms, each a fresh browser:
  **Standard** 360 × 780; **FONT200** 360 × 780 with the root font at 200%, the lever the app's own
  Largest setting pulls; **ZOOM200** 180 × 390, Chrome for Android's page zoom at 200%.

### 1. The command bar with each piece selected

Standard, turns 1 to 6, px:

| Piece | Plain | AP terms open | A greyed row's reason open | Undo showing |
|---|---|---|---|---|
| Monocyte | 339 to 393 | 421 to 475 | 375 to 429 | 372 to 426 |
| Neutrophil | 291 | 373 | 327 | 324 |
| B-Cell | 368 to **950** | 450 to **1,032** | 404 to 971 | 401 to 983 |
| Killer T-Cell | **249** to 275 | 331 to 357 | 296 | 282 to 308 |
| Helper T-Cell | 279 | 361 | no rows | 312 |
| NK Cell | 249 to 275 | 331 to 357 | 296 | 282 to 308 |
| Eosinophil | 339 | 421 | 375 | 372 |
| the seven residents | 291 to 308 | 373 to 390 | 327 to 359 | 324 to 341 |

The B-Cell's rows, turns 1 to 6: 3, 3, 3, 9, 13, 16, of which 0, 0, 0, 7, 12, 15 available. Its
produce row was greyed on every turn measured.

**What the height is made of**, measured part by part on turns 1 to 3:

| Part | px |
|---|---|
| border and padding | 14 |
| gaps between the parts | 18 |
| the name line: name, a resident's organ, speed, the AP figure, the board's hint and any reason, all wrapping in one row | 70 to 129 |
| the action list: "Actions" 15, "Movement is on the board" 15, then 44 a row with 4 between | 70 to 159 |
| the footer: What's here, About this cell, Deselect | 44 |
| the line saying why Undo is unavailable | 15 |

**At 200% text:** FONT200 469 to 707 plain and 829 at its largest, on a 780px screen; ZOOM200 374 to
548 plain and 630 at its largest, on a 390px screen.

### 2. The bar with nothing selected

**174px** at Standard: 14 border and padding, 12 gaps, the prompt line 16, the action list 111 ("Actions"
and the body's two rows, Memory response and Antivenom, both greyed), the undo line 15. 207 with Undo
showing. FONT200 273 (267 with Undo); ZOOM200 205 (223).

### 3. The top row

| | Standard | FONT200 | ZOOM200 |
|---|---|---|---|
| today: turn line, Draw a card, Command your cells, End turn, Menu | 112 | 202 | 188 |
| without the three turn buttons | 60 | 98 | 84 |
| freed | 52 | 104 | 104 |
| during a spread, with the frame's headline added to it | 136 | 240 | 212 |

The 60 is a 44px button with 8px of padding above and below it; §9's height table said 44.

### Also measured, for the choices

- **During a spread** the narration banner sits between the top row and the board, 66 to 178px tall at
  Standard as dice accumulate (95 to 263 FONT200, 62 to 286 ZOOM200), so the board moves down as the
  frames play. The bar stays, disabled, at 147.
- **What is on top in the bottom band a dock would occupy** (220px at 780, 209 at 640), sampled at
  both edges and the middle, while each layer shows the floating close:

  | Layer | The bottom band |
  |---|---|
  | pathogen card, cell card, pause menu | the layer's scrim across all of it; the floating close on top at 720 to 768 (580 to 628 at 640) |
  | inspect sheet | **not modal:** the sheet across its own strip, the floating close in the middle, and **the page itself beside the floating close, below it and above the sheet** |

- **The planning screen's button sits at 876px**, below the fold at 780 (1,090 FONT200; 743 on a
  390px screen at ZOOM200). Piece 4's.
- After every one of the 18 spreads a draw was offered and a reveal followed.
- **Read from the code, not measured:** the session writes the autosave after it emits a spread's
  burst (`packages/session/src/local.ts`, lines 191 to 200), so a game closed mid-spread resumes at
  infection with nothing drawn.

### What the measurement changes in the handoff

1. **No selected piece fits the dock's 220px.** The smallest bar measured is 249 and a Monocyte's is
   339. The 220 in §9's height table was proposed, never measured against the bar. So the dock's
   height is a choice (2 below), not a trim.
2. **A game resumed mid-spread would have nothing to press.** Without a Draw button, infection before
   the draw is a dead end unless the app draws on resume as well, and Gate 1 forbids an unreachable
   state. It is not a choice; the structure covers it.
3. The top row without its turn buttons is 60, not 44.

### The structure proposed

- **PlayScreen sends the draw**, because both shells mount it, from one pure decision: the phase is
  infection, nothing is drawn, the game is not over, no spread is playing and no dialog is showing;
  once a turn. That one rule covers every way into the state: after a spread has finished playing
  (the draw waits for the last frame, so the spread is watched before the reveal), a new game after
  the goal dialog's Begin, a game resumed mid-spread, and the dev shell's skip toggle. The reveal, the
  mop-up draw going straight to planning, and the draw that wins (a one-frame spread, then Result) are
  existing machinery and do not change. A rejected draw shows in the dock like any rejection and is
  not retried.
- **The engine, its rules and `Session` are unchanged.** One fact for Phase 3: in a multiplayer game
  the engine accepts a draw only from the captain, so only the captain's client may send it.
- **The dock** is one component at the bottom of the play screen during command: the selection, then
  the turn's next step, End turn. The top row keeps the turn line and Menu. Planning keeps its own
  button until piece 4, as the split rules. In piece 2's intermediate state the pieces, antibodies,
  body and log still scroll above the dock, so the page ends in a spacer of the dock's height, as it
  does for the floating close.
- **The instruments.** A unit test on the draw decision with both halves: a planted rule that also
  draws while a spread plays must be caught, and the resumed state must draw. The audit's three walks
  stop pressing Draw a card; the walk gains the dock with nothing selected, the dock during a spread,
  and one path, a game resumed mid-spread reaching its reveal, recorded NOT REACHED rather than
  omitted, with a control that turns the draw off and must see the path go unreached. The occlusion
  check already reports a visible dock under the floating close.

### Seven choices, each with a recommendation

> ✅ **All seven ruled as recommended** (Shantanu, 13 September 2026: "All seven ruled as
> recommended, build piece 2"). The choices are kept below as they were proposed. What was built,
> and what building it found, is §13.

1. **The dock and the floating close, both at the bottom.**
   (a) **A layer covers the dock.** While any layer shows the floating close, the dock is hidden and
   inert but keeps its height, so nothing moves, and the floating close sits where it does today.
   Cards, dialogs and the pause menu already scrim the whole screen, so the only change is the
   inspect sheet, the one layer that is not modal, and piece 3's quick-pick drawers, which share its
   shape. (b) **The floating close sits above the dock** and layers sit above the close. The dock
   stays live under every layer, so End turn could be pressed while a card is being read, and a
   sheet over the board has about 460px at 780 and 320 at 640. (c) **One bottom button**, saying
   Close or Back while a layer is up and End turn otherwise. A second tap on Close would end the turn,
   and ending a turn cannot be undone. **Recommendation: (a).** It is already true for four of the
   five layers, and the measurement shows the fifth leaves End turn's future edges live beside the
   floating close.
2. **The dock's height**, since no selected piece fits 220.
   (A) **Everything today's bar holds**, one row per action rather than per target, three row
   slots: about 446px, so the main screen misses 780 by about 97 and scrolls, against ruling 4.
   (B) **The budget kept by moving parts out**, about 230 to 248px (below). (C) **220 with the rows
   scrolling inside the dock**, against ruling 4, which lets only reading surfaces scroll.
   **Recommendation: (B)**, in four zones:
   - **Name line, 44:** name, AP figure, Undo, Deselect. Undo stays visible in command and greyed
     when unavailable; tapping it greyed shows its reason, as a greyed row does, replacing the
     always-on undo line.
   - **Hint, one or two lines, 18 to 36:** speed and a resident's organ, then the board's hint or
     why nothing is offered; a rejection takes its place, in red.
   - **Two row slots, 92:** one row per action. With one target the row names it, as now; with
     several it says how many and opens them as a list over the board. Leaving the produce row out
     (greyed on every turn measured; producing is the Antibodies panel's) means no piece has more
     than two actions.
   - **End turn, 44**, alone on its row.

   Leaving the dock: "Actions" and "Movement is on the board" (the hint says it); What's here (the
   node tap already opens the sheet); About this cell (the inspect sheet opens it today, and piece
   3's Pieces drawer would too). **This changes three earlier calls, and they are yours:** the list's
   target-named rows (S25 item 1, 4 September), the footer, and the undo line (S25 item 2's
   instrumentation, kept visible because it teaches).
   With (B) the main screen is 44 + 339 + 48 + 230 to 248 = **661 to 679**: 101 to 119 spare at
   780, and **−21 to −39 at 640**, against §9's −11.
3. **The dock at larger text sizes.** (a) Fixed at the bottom at every size, scrolling inside when it
   must: at 200% it would cover most of a 780px screen and all of a 390px one. (b) **Fixed while the
   top row, the board and the dock all fit the screen; otherwise it joins the end of the page, which
   scrolls**, ruling 5's last resort, with End turn still last. Sized in rem either way, so it is one
   height at each text size. **Recommendation: (b).**
4. **While a spread plays, and while the reveal is up.** The dock **shows the narration**: the frame's
   headline, its number, the dice and "Tap to continue" fill the dock's zones, End turn's included,
   so the board stops moving down as frames play and the top row stops growing. The tallest banner
   measured, 178px, fits. Under the reveal the dock is covered like any layer under a dialog.
   **Recommendation: as described.**
5. **The reveal's button.** **"Plan your turn"**, the words of the planning screen's own title, as a
   new catalogue key so a translation may word a button differently from a heading. The goal
   dialog's Begin is unchanged. **Recommendation: as described.**
6. **The dev shell's turn buttons** (`APP_FLOW.md` §2 ruling 6). (a) Keep Draw, with the app's draw
   switched off in the dev shell: the drivers hold verbatim, but they measure a turn no player sees
   and PlayScreen carries a mode only instrumentation uses. (b) **Follow the app:** Draw goes, Begin
   command and End command (spread) stay, `measure.ts` and `measure-full.ts` wait for the reveal
   instead of pressing Draw, both re-run at 1× and 6× and reported against `P2_3_MEASUREMENT.md`, and
   the one render piece 2 adds (the draw's view and the reveal, straight after a spread's last frame)
   is reported once. **Recommendation: (b).** The ruling protects the coupling from dying silently;
   a re-measure is the loud way to change it.
7. **Help's "A turn" section.** Its Infection and Command paragraphs are tagged [Fresh] in
   [`HELP_DRAFT.md`](HELP_DRAFT.md), written for the phone, not Kartik's rulebook; the Spread
   paragraph beside them is his, and stays untouched. Proposed:
   - **Infection:** "At the start of each turn the app draws the turn's cards, places each new
     invader at the start of its route, and shows you what arrived, with this turn's crisis event if
     one fired. Then it shows the body from the outside so you can plan: what is coming, where it is
     heading, and how many Action Points you have."
   - **Command:** "Your part. Tap Command your cells and spend your Action Points in any order, on
     any cells. Tap End turn when you are done. Unspent points are lost at the end of the turn."

   **Recommendation: yours to approve, not Kartik's.** No rule changes, and the sentences follow
   his ruling on the draft (the rulebook's phase names as headings, the app's button names in the
   text). Showing him the Infection sentence costs nothing, because it describes his phase.

---

## 13. Piece 2, the dock and the draw inside End turn: BUILT, 13 September 2026, one question open

All seven choices of §12 built as ruled. **One question the ruling did not cover is open, and the PR
waits for it**: where "Recall to bloodstream" goes (below, and [`FINDINGS.md`](FINDINGS.md) #71).

### What was built

- **The draw is the play screen's** (`packages/ui/src/play/autoDraw.ts`): one pure rule, sent once a
  turn, waiting for a spread, a dialog, or anything open over the game. It covers the first turn
  after the goal dialog, every turn after a spread, and a game resumed before its draw. The dialog
  queue answers "is one pending" synchronously, because the goal is enqueued in the same effect flush
  the draw reads it in.
- **The dock** (`panels/Dock.tsx`, deleted in piece 5 (§19)) replaces the command bar and the action list, both
  deleted: the name line (the piece, AP, Undo, Deselect), one message line, two row slots, End turn
  alone. Zone minimums in rem. Hidden with its height kept while the floating close shows. At the
  bottom of the screen while the top row, the board and the dock fit, otherwise straight after the
  board. The spread's narration plays inside it; the banner above the board is gone.
- **One row per action** (`dockRows` in `offered.ts`), produce left out; a row with several targets
  opens them over the board, and the AP terms open there too (`DockSheet.tsx`), each a layer on the
  navigation stack.
- **The top row** is the turn line and Menu, one 44px row. The dev shell lost Draw and kept Begin
  command and End command (spread). The reveal's button is "Plan your turn". Help's section 2 carries
  the ruled words. Catalogue keys removed: `play.draw`, `reveal.continue`, `commandBar.inspect`,
  `commandBar.card`, `actions.title`, `actions.movementOnBoard`; added `reveal.plan`, `dock.targets`.
- **The engine and the corpus are untouched.** No engine file changed.

### What the instruments gained

- `tests/session/src/auto-draw.test.ts`: the rule against the real engine through a real session,
  every turn of an idle game at each difficulty, with a resume at every turn; five planted rules, each
  caught by the clause it breaks. Idle games measured 9 to 10 turns with a draw on each, so the floor
  asserted is five.
- `tests/session/src/dock-rows.test.ts`: on recorded states for every piece, two slots, nothing a
  player could take lost, the right offer sent, a reason when greyed; two planted groupings caught.
- **The Gate 1 audit, 39 controls** (34 before): the dock's one height (fires on two heights, passes
  one, calls no dock NOT REACHED), and a resumed game (fires on a resume landing on planning, passes a
  game closed mid-spread reaching its reveal). The walk stopped pressing Draw; it gained the AP terms
  sheet, a row's targets, the reveal after End turn, planning on the next turn, and the resume path.

### What building found, in the order it was found

1. **Recall had no zone** (FINDINGS #71). Built as a row below the slots until ruled.
2. **The proposal's "the inspect sheet opens the cell card" was true only sometimes** (FINDINGS #71).
3. **The one-height check fired on its first run: 300px on three screens, 248 on seven.** With nothing
   selected, the prompt in the name line wrapped Undo onto a second row. The prompt moved to the
   message line; the next run measured 248 on every screen.
4. **Two screens were never reached in any pass under a clean total**: the cell card (its dock door
   gone) and a row's targets (new, and deal-dependent). An instrument gap, fixed inline: the walk to
   the Result keeps trying both on every idle turn, and only a run that never reaches one records it.
5. **Reaching the cell card at 200% page zoom found a defect older than piece 2** (FINDINGS #72): the
   inspect sheet's cell rows did not wrap. Fixed in this piece, with the reason recorded there.
6. **Both perf drivers clicked dialog buttons before the dialogs existed.** At 6× a Begin or a "Plan
   your turn" pressed a render too early missed, the dev shell's buttons played on, and the pending
   dialog held the next turn's draw: the rule doing its job, the driver not doing its. Both wait now.
7. **The first instrument for the draw's render was wrong and nothing from it was used.** It started
   its clock in a mutation callback that ran after React had already rendered, and reported 0.1ms at
   6× against 6 to 12ms at 1×, which a slower CPU cannot do. The second starts at the driver's tap.

### Measured on the build the PR carries

**Conditions:** CSS px and ms; the shipped build served by `vite preview`; headless system Chrome on
the development PC (i7-12700F); 360 × 780. What these cannot say: no handset; the audit's games and
the drivers' games are unseeded, so counts vary run to run (#68); the Monocyte and Eosinophil standing
off the bloodstream were never selected by the walk, so **the dock's height with the recall row is not
measured**.

**The Gate 1 audit:** 39 controls, all firing the right way. 45 screens per pass (47 under SIZE200),
**none NOT REACHED in any pass**. Every check 0 under all four mechanisms: touch, contrast, non-text,
scaling, layout, size, occlusion. Nesting: 25 landings, 0 wrong, 0 NOT REACHED, including "a game
closed mid-spread → Continue" landing on its reveal. The dock: one height, **248px on all 12 screens**
it was measured on, at the bottom of the screen on each. Offline met.

**The performance drivers** against the dev shell, and the draw's render, are in
[`P2_3_MEASUREMENT.md`](P2_3_MEASUREMENT.md), "Added 13 September 2026".

### The question open before the PR

**Where does "Recall to bloodstream" go?** It is a button for every cell but the B-Cell whenever it
stands off the bloodstream, and the Monocyte and Eosinophil fill both row slots. **Recommendation: a
ring on the bloodstream, on the board.** The engine's `recall` moves a cell from anywhere to the
bloodstream in one action, a movement with a fixed destination, and "movement is on the board" is
ruled (4 September). The alternative is a place in the dock that grows it for those two cells.

---

## 14. Piece 2, amended before its PR: a 2 × 2 action area, and a card behind every name

### ✅ RULED 13 September 2026, by Shantanu, in reply to §13's open question

> "Why can we not just reduce the size of the button so it does not take up the whole row, that way
> we can fit more buttons there if required right? then we don't have to look elsewhere to place
> recall, and maybe other stuff we removed can also be brought back (if it makes sense)." And: "can
> we not do a small i button or something in the action area for the cell which opens its card? Or
> the name of the cell itself could be clickable and it opens the card? that approach would save
> space even for diseases/pathogens."

Claude agreed with both and proposed the shape; Shantanu ruled "go straight to building and put the
audit's number in the PR". What is ruled, amending §12's ruling 2 and the Card buttons:

1. **The rows zone is a 2 × 2 grid of half-width buttons in the same height.** Four slots hold every
   piece at its fullest (Monocyte or Eosinophil off the bloodstream beside a pathogen: two actions,
   Recall, What's here). A slot's button may carry two lines: the action, then its target and cost.
2. **"Recall to bloodstream" is a slot**, not a ring. §13's ring recommendation existed only because
   the ruled zones had no room; the grid removes the reason, and a named button teaches what it does.
3. **"What's here" comes back as a slot**, shown when the selected piece stands with something.
   The "Actions" and "Movement is on the board" headings, the produce row and the always-on undo line
   stay out.
4. **End turn stays full width, alone on its row**, because ending a turn cannot be undone.
5. **A card behind every name.** A name with a small card icon beside it, the two one button, opens
   its card: the selected cell's name in the dock, and the same icon in place of every "Card" text
   button (the inspect sheet's pathogens and cells, planning's rows) and the reveal's "Tap for its
   card". In the inspect sheet a cell's row already selects the cell, so there the icon is its own
   44px button beside the name.

### Measured before building

**The slot's labels** (headless system Chrome on Windows, the button's own font, Arial; an Android
phone's font differs), at 360 CSS px, where a half-width slot leaves 150px of text at 8px padding:
every action word fits (21 of 21, widest "Recall to bloodstream" at 146px); every disease name alone
fits (97 of 97, widest "Pneumocystis pneumonia" at 137px); a name with " · 2 AP" does not in 8 of 97
(to 173px); a name with the NK's " · hits on 3 or more" does not in 67 of 97 (to 238px). So line one
is the verb with any cost beside it, line two is the target alone, the slot's side padding is 6px,
and **the NK's odds moved to the message line**, where they are said once for all its targets. The
first run of this measurement used the body's font (Times New Roman), which a button does not
inherit, and crossed every action with "12 targets"; nothing from it was used.

### What was built

- **The action area is a 2 × 2 grid** in the same height: the piece's actions (verb and cost, then
  target or "5 targets"), then **Recall to bloodstream**, then **What's here** when the piece stands
  with something. End turn is unchanged, alone.
- **A card behind every name**: `CardIcon.tsx`, a small card drawn in SVG and hidden from assistive
  technology, beside the selected cell's name in the dock (the two one button, "About Monocyte"), in
  44px icon buttons in place of "Card" in the inspect sheet and planning, and beside each arrival's
  name in the reveal, in place of "Tap for its card". A resident has no card and its name is plain.
- **Offers carry their label's two halves**, `verb` and `target`, built from the same words as the
  label. Catalogue: `card.about`, `dock.targetCount`, `dock.whatsHere` and `dock.undo` added;
  `inspect.card` and `reveal.tapForCard` removed.
- **The dock's Undo says "Undo"** ("Undo 2" when moves can be undone), and a tap on it greyed still
  says why. See item 2 below.

### What building it found

1. **The one-height check fired: 300px on four screens, 248 on ten**, every 300 with the Neutrophil,
   the Monocyte or the Eosinophil selected. Measured part by part: the name line is 344px and held
   the AP figure (44px), "Undo moves" (101px), Deselect (76px) and the gaps (16px), leaving 101px for a
   name; the Monocyte's name with its icon was 102px, the Helper T-Cell's 124.
2. **The same measurement found the defect older than the icon.** Five of the seven residents' names
   (120 to 137px, no icon) overflowed that name line too, so the dock was 300px with those residents
   selected **in the build committed as 81555d4**. Its audit reported 248px on every screen it
   measured, truthfully, and had never selected a resident. The dock's Undo became "Undo" and the name
   line's buttons lost 2px of padding each side, which leaves about 157px for a name against the
   widest at 137px; the walk now selects the Liver's resident (the shortest name) and the Lungs'
   (one of the widest), and a Monocyte moved off the bloodstream so Recall is measured showing.
3. **Selecting a resident for the first time found a clip at 200% page zoom** in the piece grid
   ([`FINDINGS.md`](FINDINGS.md) #73): a selected chip's 3px border took the room its name needed.
   The ring is now an inset shadow; the recorded equal-boxes design is kept.

### The Gate 1 audit on the build the PR carries

**Conditions:** the shipped build served by `vite preview`, headless system Chrome on the development
PC (i7-12700F), 360 × 780 CSS px and the three 200% mechanisms; unseeded games, so control and
text-run counts vary run to run (#68); no handset.

**39 controls, all firing the right way. 49 screens per pass (51 under SIZE200), none NOT REACHED
except, under SIZE200, a row's targets**, which that pass's deal never offered in 14 idle turns (it
was reached under the other three). **Every check 0 under all four mechanisms**: touch, contrast,
non-text, scaling, layout, size, occlusion. **Nesting: 26 landings, 0 wrong, 0 NOT REACHED**, among
them the dock name → cell card, a row's targets, and a game closed mid-spread reaching its reveal.
**The dock: one height, 248px on all 16 screens** it was measured on, including the Neutrophil, the
Monocyte with Recall showing, both residents, and the cell card opened from the dock. Offline met.

---

## 15. Piece 3, the drawers and the main screen without scroll: BUILT, 13 September 2026

Built straight from §9's rulings 3 to 7 and 10, by Shantanu's ruling: "build straight away and put the
audit's numbers in the PR". No proposal was drawn. Where the rulings leave a detail open, the call made
is listed below for him to overrule.

### What was built

- **The main screen** is the turn line and Menu, the effects strip, the board, a row of four drawer
  buttons (**Pieces, Antibodies, The body, What happened**), and the dock. The piece grid, the antibody
  panel, the body panel and the log left the page (`packages/ui/src/panels/Drawer.tsx`).
- **Pieces, Antibodies and The body are quick picks** (ruling 7): they slide up from the bottom, part of
  the board still showing above them. **Picking a piece closes the Pieces drawer and selects it on the
  board** (ruling 3). **What happened is a reading surface** and opens full height.
- **Each drawer is one level on the navigation stack** (ruling 9): the floating close and the back
  gesture close it, and the dock hides underneath while it is open (§12, ruling 1).
- The slide is 160ms and does not run under reduced motion. The dock measures whether it fits against
  the board and the drawer row together, since the row sits between them.
- Catalogue: `drawer.pieces` ("Pieces") added; the other three buttons use the panels' own titles.

### Four calls made where the rulings are silent

1. **A tap on the dimmed board around an open drawer closes it.** Ruling 8 makes the floating close THE
   close; a scrim that swallowed the tap and did nothing would be a control that does nothing.
2. **A piece's first-encounter hint shows over the top of the board.** It followed the piece grid, which
   is in a drawer now, and a hint shown only in a closed drawer would be consumed unseen, #66's shape.
   Over the board it moves nothing. The antibody class hint stays inside the Antibodies drawer, where
   the selection that fires it is made.
3. **The Pieces drawer carries no card icons.** Picking a piece closes the drawer, and the selected
   piece's name in the dock opens its card (§14, ruling 5), so every cell's card is two taps away.
4. **Planning is untouched**: it is piece 4. Its log still sits under the planning screen.

### What the instruments gained

**A no-scroll check for ruling 4, with three controls** (fires on a screen at rest taller than the
screen, passes one within 1px, calls a run with no screen at rest NOT REACHED). On every base-pass
screen (360 × 780, Standard text) where the play screen is at rest, nothing open over it, the page must
not be taller than the screen. The walk now selects every piece through the Pieces drawer, opens the
Antibodies drawer with the B-Cell selected and a class chosen, and opens and closes the other three
drawers, each landing checked.

### Measured on the build, 360 CSS px wide

Headless system Chrome on the development PC, the shipped build, a command phase on Training, **no
effects chip showing** (a turn with a crisis effect adds the effects strip above the board, and that is
not measured here). Heights in CSS px.

| | 360 × 780 | 360 × 640 |
|---|---|---|
| top row + board + drawer row + dock | 44 + 339 + 48 + 248 | the same |
| the dock at the bottom of the screen | yes | **no**: the top row, board, drawer row and dock need 683 |
| how far the main screen scrolls | **0** | **67**, with End turn below the fold until scrolled |
| Pieces drawer: height, top edge | 391, 301 | 391, 161 |
| Antibodies drawer: height, top edge | 156, 536 | 156, 396 |
| The body drawer: height, top edge | 189, 503 | 189, 363 |
| What happened | full height (684) | full height (544) |

**At 640 the main screen scrolls 67px**, against §9's −11 with a 220px dock and §14's −21 to −39 before
the drawer row was counted. Ruling 6: a 640px screen is checked, not chased, so it is recorded, not
fitted. The levers, if it is to be chased, are a shorter dock or a smaller board; both are rulings.

### What the first audit of the build found

- **The no-scroll check held on its first run: 0px on all 9 screens at rest.** Its controls fired both
  ways, so 0 is a measurement and not a blind spot.
- **Four ZOOM200 layout findings in the Pieces drawer**: four residents' names clipped with an ellipsis
  (117 to 122px of text in 109px). The margin #73 recorded as about 1px at 180px, lost to the drawer's
  own frame: 96vw wide, 10px side padding, a 2px border. The drawer is now full width below 460px with
  4px side padding and a 1.5px border, which leaves about 128px against the widest name's 122, and the
  equal-boxes design is kept.
- **The inspect sheet was NOT REACHED in the base pass**: no invader token tap opened it that game. It was
  reached in the other three passes, and the same pass reached the cell card through the sheet later in
  the walk to the Result, so this is the deal, not the build.

### The Gate 1 audit on the build the PR carries

**Conditions:** the shipped build served by `vite preview` (started by Shantanu: this session's
automatic permission check refused to start it), headless system Chrome on the development PC
(i7-12700F), 360 × 780 CSS px and the three 200% mechanisms; unseeded games (#68); no handset.

**42 controls, all firing the right way. 53 screens per pass (55 under SIZE200), none NOT REACHED in
any pass. Every check 0 under all four mechanisms**: touch, contrast, non-text, scaling, layout, size,
occlusion. **Nesting: 30 landings, 0 wrong, 0 NOT REACHED**, among them all four drawers closing back
to the game. **The main screen: 0px of scroll on all 9 screens at rest.** **The dock: 248px on all 20
screens** it was measured on. Offline met.

### Piece 2's open question, ruled the same day

✅ **§4 row 2 does not govern the draw's render** (Shantanu, 13 September 2026, taking the
recommendation): it is re-timed on the real low-end handset before the Phase 2 closeout, beside the
performance rows owed a re-time after pieces 2 and 3. The ruling is recorded with the numbers in
[`P2_3_MEASUREMENT.md`](P2_3_MEASUREMENT.md), "Added 13 September 2026".

---

## 16. HANDOVER to a new session: piece 3 is built and audited, and not yet committed

**Written 13 September 2026, at the end of a session that could not finish it.** That session's
automatic permission check refused, for the rest of the session, to start the preview server and to
run the chained `pnpm verify`, commit, push and PR. It was not worked around. Shantanu started the
preview server himself so the audit could run; he could not run the commit steps. **A new session
starts here.**

### Where things stand

- **Merged:** #79, #80, #81 (piece 1), #82 (piece 2, merge commit 4d1e053).
- **Piece 3 is built and audited, and uncommitted** on branch `phase2/p2-7-piece3-drawers`, created
  from `main` after #82. The working tree at handover:

  | File | What changed |
  |---|---|
  | `packages/ui/src/panels/Drawer.tsx` | **new**: the drawer row and the drawer |
  | `packages/ui/src/play/PlayScreen.tsx` | the panels moved into drawers; the hint over the board |
  | `packages/ui/src/index.ts` | exports the drawer |
  | `packages/content/src/i18n/en/ui.json` | `drawer.pieces` added |
  | `tools/perf/gate1-audit.ts` | pieces reached through the drawer; every drawer opened and closed; the no-scroll check and its three controls |
  | `docs/for-P2.7.md` | §15 (the build record) and this section |
  | `docs/APP_FLOW.md` | the drawers marked built |
  | `docs/P2_3_MEASUREMENT.md` | the ruling on the draw's render |

- **The final Gate 1 audit ran on this exact code** (docs changed after it, code did not): 42 controls,
  all firing the right way; 53 screens per pass (55 under SIZE200), none NOT REACHED; every check 0
  under all four mechanisms; nesting 30 landings, 0 wrong; the main screen 0px of scroll on all 9
  screens at rest; the dock 248px on 20 screens; offline met. §15 has the conditions.
- **The commit message and the PR body are written**, in `out/piece3-handover/commit-message.txt` and
  `out/piece3-handover/pr-body.md`. `out/` is ignored by git, so they cannot be committed by accident.
- **No ruling is open.** Piece 2's question (whether §4 row 2 governs the draw's render) was ruled:
  it does not; it is re-timed on the handset before the closeout.

### The steps, in order

1. `git status`: the table above, and nothing staged.
2. Stop any preview server that is serving `packages/app/dist`, because `pnpm verify` rebuilds it.
3. `pnpm verify`. It must pass. The boundary check's one warning, `no-orphans` on
   `packages/ui/src/i18n-check.control.test.ts`, is older than this work.
4. `git add docs packages tools`, then `git commit -F out/piece3-handover/commit-message.txt`. Do not
   add `out/`.
5. `git push -u origin phase2/p2-7-piece3-drawers`.
6. `gh pr create --base main --head phase2/p2-7-piece3-drawers --title "Piece 3 of the play screen:
   four drawers and a main screen that does not scroll" --body-file out/piece3-handover/pr-body.md`.
7. Report the PR's link to Shantanu. **He merges, never Claude.**

**Re-run the audit only if code changes.** It needs the preview server
(`pnpm --filter @immunity-wars/app preview`, port 4173, the `preview` entry of `.claude/launch.json`),
then `npx tsx tools/perf/gate1-audit.ts http://localhost:4173/ <out.json>` from `tools/perf`, and never
while `pnpm verify` is running.

### After piece 3 merges

- **Piece 4, planning** (§9 rulings 4 and 10, the planning height table): planning still scrolls, its
  "Command your cells" button measured at 876px on a 780px screen before pieces 2 and 3, and its log
  still sits under it. The body view shrinks to about 410px and the pathogen list becomes a drawer.
  Measure it on the current build first; the numbers above predate pieces 2 and 3.
- **Owed before the Phase 2 closeout:** the draw's render re-timed on the real low-end handset, and the
  performance rows re-timed after pieces 2 and 3 (`tools/perf/measure.ts`, `measure-full.ts`).
- **Then the S25 pass**, which also measures what no headless run can: an Android font's widths ("Recall
  to bloodstream" is 146 of a slot's 150px in Arial; the widest resident name has about 6px to spare in
  the Pieces drawer at 180px).

---

## 17. Piece 4, planning: MEASURED AND PROPOSED, nothing built

Written 13 September 2026, after #83 (piece 3) merged, from §16's "After piece 3 merges". **Nothing is
built until the choices below are ruled.** The proposal is also drawn, to one scale, on a private
artifact page of its own; Shantanu has the link.

### What these numbers cannot say

- **Every game was played idle** on Training, one game per mechanism, six turns each: nothing pressed
  but Command your cells and End turn. The pathogen counts are an idle board's, 1 to 14 invaders in 1
  to 11 groups.
- **The effects strip showed one chip at most**, with or without its reason line. Two chips at once
  were not reached.
- **A spent cell was reached only through a crisis event** (Lymphopenia took the Killer T-Cell offline
  on turns 4 and 5 of the Standard game), never through a cell's own action, so the longest
  spent-cells line is not measured. A two-cell line was measured as text in the dock, in 3 below.
- **Not reached:** the Phase 3 allocation block, which single-player never shows; a mop-up draw; any
  handset. The faces are the development PC's (a button's Arial, the page's inherited Times New
  Roman); an Android phone's differ.
- **The four arrangements are computed, not measured.** Each is the sum of parts measured below, with
  the dock at its zone minimums, the height the audit measured on 20 screens (§15). None is built.
- **Conditions of every figure:** CSS px; the shipped build at `a6803fb` (#83's merge) served by
  `vite preview`; headless system Chrome 153 on the development PC (i7-12700F); no CPU throttling,
  which does not change a layout height. Three mechanisms, each a fresh browser context: **Standard**
  360 × 780, re-probed at 360 × 640 on the same state; **FONT200** 360 × 780 with the root at 200%;
  **ZOOM200** 180 × 390.

### 1. Planning today, part by part

Standard, 360 × 780. The parts that do not change turn to turn: the page's top padding 8, the top row
44, a 6px gap, the heading "Plan your turn" 21, the AP line 44 (72 more with its terms open), the body
view 504 (the figure 280 × 475 and its hint line 15), "Command your cells" 48 below a 10px margin, and
the page's bottom padding 8.

| Turn | Invaders | Groups | Effects strip | Spent cells | Pathogen list | Button's bottom | Log | Page | Scroll at 780 | Scroll at 640 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 1 | none | none | 114 | 811 | 108 | 933 | 153 | 293 |
| 2 | 4 | 3 | none | none | 204 | 901 | 177 | 1,092 | 312 | 452 |
| 3 | 6 | 4 | 59.5 | none | 289 | 1,046 | 223 | 1,283 | 503 | 643 |
| 4 | 8 | 6 | 59.5 | 16 | 379 | 1,152 | 264 | 1,430 | 650 | 790 |
| 5 | 12 | 9 | 43.3 | 16 | 554 | 1,310 | 328 | 1,652 | 872 | 1,012 |
| 6 | 14 | 10 | none | none | 599 | 1,296 | 326 | 1,636 | 856 | 996 |

A group's row is 45. With every group opened, turn 6's list is 1,215 and the page 2,252. The strip
adds exactly its own height: its bottom margin and planning's top margin collapse into one 6px gap.

**At 200% text** the button's bottom is 1,070 to 1,852 on a 780px screen under FONT200 (page 1,380 to
2,557) and 723 to 1,851 on a 390px screen under ZOOM200 (page 941 to 2,367). The figure is sized in px
and does not grow with text; its hint line wraps to 54 under FONT200, and under ZOOM200 the figure
narrows to 146 × 248 with a hint of 45.

### 2. The body view at other widths

The figure's frame is 224 × 380 (`packages/content/src/board/anatomy.json`), so its height follows its
width. Measured on turn 1 by setting the figure's maximum width; the last column is the measured view
less its 15px hint:

| Figure width | Figure height | Body view with its hint | Without its hint |
|---|---|---|---|
| 280, today | 475 | 504 | 489 |
| 250 | 424.1 | 453.1 | 438.1 |
| **224** | **380** | **409** | **394** |
| 200 | 339.3 | 368.3 | 353.3 |
| 190 | 322.3 | 351.3 | 336.3 |
| 170 | 288.4 | 317.4 | 302.4 |
| 150 | 254.5 | 283.5 | 268.5 |

**§9's "about 410" is the figure at 224, its frame's own size; ruling 10's 284 is the figure at 150.**

### 3. Planning's words in the dock's zones

Measured with the dock's own elements in a command phase at 360 × 780: a real action slot and the real
message line, cloned inside the dock, given each text, measured, and removed.

- **A half-width slot** leaves 155px of text, in bold 14px Arial: "Pathogens in the body" 150.1,
  "Pathogens" 71.6, "What happened" 104.2; on its second line, in 12px, "14 in the body" 75.4. A slot
  with both lines is 44 tall, the zone's row.
- **The message line** is 344 wide, 13px, 17.55 a line, in a zone of 36. The figure's hint "Tap an
  organ, an entry or the bloodstream to see what is there" is one line; one spent cell as measured in
  the game ("Killer T-Cell · Offline — back in 2 turns") is one line; two spent cells written out in
  full are two lines, 35.1.
- **The name line** holds "You will have 12 Action Points to spend" at 257.5 of 344. Planning has no
  Undo and no Deselect beside it.

### What the measurement changes

1. **§9's planning table does not fit the built dock.** It was drawn with a 220 dock, and the dock is
   248 (§12's choice 2). The table also has no row for the page's padding (8 above, 8 below), the gap
   under the top row (6), the heading (21), the spent-cells line (16 when shown) or the effects strip
   (43.3 to 59.5 when shown). Built as ruled, with the heading gone and the figure's hint in the dock as
   the approved drawing had them, **planning is 810 and scrolls 30 at 780 with nothing showing**, 89.5
   with the tallest strip measured.
2. **The log still sits under planning** and has no row in the table. Under ruling 4 it becomes a
   drawer.
3. **The figure's filter lives in the list it filters.** A tap on a place filters the pathogen rows
   ("Showing: Liver", "Show all"). With the rows in a drawer, the filter needs a home there.

### The structure proposed

- **Common to every arrangement below.** "Command your cells" is the dock's next step, where End turn
  will be (ruled). The pathogen list opens as a drawer (ruled), and so does What happened (ruling 4).
  The figure is 224 wide (§9's about 410). Its hint is said in the dock's message line, as the approved
  drawing had it. The AP figure's terms open over the figure, as the dock's AP sheet does in command.
  The Phase 3 allocation block stays in the page above the dock, for Phase 3 to shape.
- **The engine, the planning model and its tests are unchanged**: the dock's button sends the model's
  own params. The organs' flight (block e) reads the figure's rectangles at the tap wherever the button
  is; its organs start smaller.

### Four arrangements, computed

Standard. Every total is the page's padding, the top row and the gap under it (58 above, 8 below),
what the arrangement puts in the page, and the dock.

| Arrangement | In the page | Dock | Total | At 780, nothing showing | At 780, the tallest strip measured | At 640 |
|---|---|---|---|---|---|---|
| **(a) As ruled**: the AP line and a row of drawer buttons in the page | AP line 44 and its gap 6, figure 394, drawer row 52 | 248 | 810 | scrolls 30 | scrolls 89.5 | scrolls 170 |
| **(b) Into the dock**: the AP figure in the name line, Pathogens and What happened as two slots | figure 394 | 248 | 708 | 72 spare | 12.5 spare | scrolls 68 |
| **(c) A planning dock without its action area**, the drawer row above it | figure 394, drawer row 52 | 150 | 662 | 118 spare | 58.5 spare | scrolls 22 |
| **(d) As ruled, with the figure shrunk to fit** | as (a) | 248 | 780 | the figure 206 wide | the figure 171 wide | scrolls 140 |

A spent-cells line adds 16 to (a) and (d) and nothing to (b) and (c), whose message line holds it.
(c)'s dock is its name line, message and next step at their minimums; it turns ruling 1's one height
into one height in command and another in planning.

**At 200% text** every arrangement scrolls, as ruling 5 allows: the dock is sized in rem and the figure
in px. Computed from the zone minimums under FONT200, (b)'s dock is 494 and planning 992; (c)'s dock is
298 and planning at least 844, its drawer row's wrapped height not measured. Not computed under
ZOOM200, where the zones' words wrap at 180px.

### Four choices, each with a recommendation

> ✅ **RULED 13 September 2026, by Shantanu: the recommendations, "for now".** In his words: "For now
> let's go with your suggestion and see how it looks though I liked the look of the shorter drawer
> more." So **(b) is built, to be looked at**, with choices 2 to 4 as recommended and the calls below
> standing. **Recorded as a leaning, not a ruling: he preferred the look of (c)**, read here as his
> "shorter drawer", the shorter planning dock under a drawer row. Read as part of "your suggestion",
> and said so in the reply: FINDINGS #74's join is fixed inside piece 4. **Still open:** whether the
> no-dashes check should read code (#74). What was built is §18.

1. **The arrangement. Recommendation: (b).** It keeps ruling 1's one height and the figure at its ruled
   size, fits every Standard state measured at 780, and gives planning's two drawers the dock's action
   area, which (a) leaves empty in planning. Its risk is its margin: 12.5 with the tallest strip
   measured, so a second chip at once (not reached; 30 to 47 with its gap, from the chips measured)
   would scroll planning by about 18 to 34. (c) fits with room for that and nearly fits 640, at the
   price of amending ruling 1. (a) scrolls on every turn measured. (d) shrinks the figure toward the
   284 that ruling 10 declined.
2. **The Pathogens slot's words. Recommendation: "Pathogens" over "{n} in the body"** (71.6 and 75.4 of
   155), rather than "Pathogens in the body" (150.1 of 155). §15 learned that a margin of a few pixels is
   spent by the next frame put around it, and an Android face is not Arial. Two new catalogue keys.
3. **A tap on the figure. Recommendation: it opens the Pathogens drawer showing that place's rows**,
   with "Showing: Liver", the organ's damage effect when it has one, and "Show all" at the drawer's top;
   closing the drawer clears the filter. The alternative is a ring on the figure filtering rows nobody
   can see until the drawer is opened, which is a control whose effect is hidden.
4. **Which cells are out. Recommendation: in the dock's message line, in place of the figure's hint
   while any cell is out.** Two spent cells fill its two lines, and the hint beside them would grow the
   dock past its one height.

### Calls made where the rulings are silent, each to overrule

- **The heading "Plan your turn" goes.** The approved drawing had none, and the reveal's button says it.
- **The AP line's teaching line** ("Tap the Action Points to see what is making the number") **goes**,
  as it did from the dock in command, where the figure is underlined instead.
- **The Pathogens drawer is a quick pick**: it slides up with the top of the figure still showing and
  scrolls inside when the list is long (turn 6's list is 599). What happened opens full height, as it
  does from the main screen.
- **At 640 planning scrolls** (ruling 10) and the dock joins the end of the page, §12's ruling 3 applied
  to planning. At 200% text planning scrolls (ruling 5).

### What building it changes beyond the screen

- **The Gate 1 audit walk** gains planning with its AP sheet, the Pathogens drawer from its slot and
  from a tap on the figure, the What happened drawer from planning, and the path drawer → pathogen card
  → Back, landing on the drawer, which replaces "Planning → pathogen card". The no-scroll check reaches
  planning at rest. Under (b) the dock's one-height check reaches planning's screens unchanged; under
  (c) it needs a second height and controls of its own.
- **`tools/perf/measure.ts` and `measure-full.ts`** press "Command your cells" by its words, which stay.
- **`APP_FLOW.md`'s planning bullet** is amended when it is built.

### Found on the way

**A dash a player reads, joined in code** ([`FINDINGS.md`](FINDINGS.md) #74): "Offline — back in 2
turns", in the inspect sheet, a cell card and planning's spent-cells line, where the no-dashes check
cannot see it. Filed, not fixed. Recommendation: the fix inside piece 4, which rebuilds the line it sits
in, and the check's reach ruled separately.

---

## 18. Piece 4, planning: BUILT, 13 September 2026, as ruled

Built from §17's ruling: arrangement **(b)**, choices 2 to 4 as recommended, the calls standing, and
FINDINGS #74's join fixed. **Built to be looked at**: Shantanu's leaning toward (c) is recorded in §17,
and a move to (c) is a ruling away.

### What was built

- **Planning's page holds the figure alone**, at its frame's own 224px width
  (`packages/ui/src/play/PlanningScreen.tsx`, `AnatomyView.tsx`), with Phase 3's allocation slot under
  it when the view carries one. The heading, the AP line and its teaching line, the pathogen list, the
  button and the log left the page.
- **One dock serves both steps of the turn** (`panels/Dock.tsx`, deleted in piece 5 (§19),
  `packages/ui/src/play/PlayScreen.tsx`). It moved out of the command stage to just after it, so it
  follows whichever step is showing and measures itself against planning's figure or against the board
  and its drawer row. In planning, at the same 248px: "You will have n Action Points to spend" in the
  name line, opening the AP terms over the figure; the figure's hint in the message line, or which cells
  are out in its place; Pathogens ("n in the body") and What happened as two slots; Command your cells
  as the next step. That button sends the planning model's own params, so the organs' flight is
  unchanged.
- **The Pathogens drawer** (`PathogenList`): a quick pick with the counts by type and the rows. From its
  slot it shows every row; from a tap on the figure, that place's rows under "Showing", with the organ's
  damage effect when it has one and Show all. Any close clears the place. What happened opens as the
  main screen's reading surface does.
- **The dash's join is a catalogue template**, `inspect.unavailableWhen` (FINDINGS #74), wherever a
  cell's state is said: the inspect sheet, a cell card and planning.
- **Catalogue:** `planning.pathogensSlot`, `planning.pathogenCount`, `planning.pathogenCountNone` and
  `inspect.unavailableWhen` added; `planning.title` and `ap.tap` removed with their last uses. **The
  engine and the corpus are untouched**, and so are the planning model and its tests.

### What the instruments gained

- **The Gate 1 audit's walk** reaches, from planning's dock, the Pathogens drawer, What happened and
  the AP terms, and the Pathogens drawer at a place through a real pointer click on a figure marker. The
  path Pathogens drawer → pathogen card → Back lands on the drawer, replacing "Planning → pathogen card",
  and each thing planning opens is closed back to planning, landing checked. A tap that fails to open
  the drawer is NOT REACHED, never a clean landing.
- **The no-scroll check reaches planning at rest**, and the dock's one-height check reaches planning's
  screens, with no change to either check: both read what is showing, and the dock now shows in
  planning.

### Measured on the build

**What these numbers cannot say:** every game was idle on Training, one per mechanism, and the deal is
not §17's, so the "before" row is a range from other games; one effect chip at most (turn 4 of the
Standard game); a spent cell only under FONT200, through a crisis event; no handset.
**Conditions:** CSS px; the shipped build served by `vite preview`; headless system Chrome 153 on the
development PC (i7-12700F); six turns per mechanism, FONT200's game lost on its fifth.

| | Standard, 360 × 780 | at 640 | FONT200 | ZOOM200, 180 × 390 |
|---|---|---|---|---|
| **planning's page** | **780 on all six turns: no scroll**, with a 59.5 crisis chip on turn 4 | scrolls 76, 136 with the chip | 1,074 to 1,211 | 667 to 759 |
| planning before piece 4 (§17, other games) | 933 to 1,652 | scrolls 293 to 1,012 | 1,380 to 2,557 | 941 to 2,367 |
| the figure | 224 × 380 in a 394 section | the same | the same | 146 × 248 |
| the dock in planning | **248, at the bottom of the screen** | in the page | in the page, 535 to 568 | in the page, 308 |
| the main screen after Command your cells | 0 scroll, the dock 248 | scrolls 67, 132 with the chip | scrolls 258 to 474 | scrolls 208 to 306 |

- **At 640 planning scrolls 76**, 8 more than §17 computed: the dock's 8px margin when it follows the
  page. Recorded under ruling 10, not fitted.
- **The Pathogens drawer** from its slot: its top edge at 529 with 2 pathogens in the body, and at its cap
  from 12 (208, 484 tall, the list scrolling inside when it is longer). From a tap on the figure it opened
  at the tapped place on every turn of every mechanism.
- **What happened** opens full height (684 of 780). **The AP terms**: 96 tall, 116 with a crisis term.
- **The spent-cells line** under FONT200 read "Killer T-Cell · Offline, back in 2 turns": the join is the
  template's.

### What the first audit of the build found

1. **One scale finding, under FONT200 and SIZE200**: Show all in the Pathogens drawer stayed 13.3px at
   200% text, because a button does not inherit the page's size. It sat under the figure before this
   piece, and no walk had ever tapped the figure, so nothing had measured it. It is sized in rem now.
2. **Offline NOT MET, on a build that had played two offline turns with nothing failing**
   ([`FINDINGS.md`](FINDINGS.md) #75). The check counted only `<img>`, and this piece left the screen a
   turn ends on with none, so its images > 0 guard refused. The instrument now fetches SVG `<image>` art
   too, which checks the board's art offline for the first time, with two controls that said YES on their
   first run. Fixed inline, because it is the instrument.

### The Gate 1 audit on the build the PR carries

**Conditions:** the shipped build served by `vite preview`, headless system Chrome on the development PC
(i7-12700F), 360 × 780 CSS px and the three 200% mechanisms; unseeded games (#68); no handset.

**44 controls, all firing the right way** (42 before: #75's two). **56 screens per pass (58 under
SIZE200). NOT REACHED: two doors the deal decides**, the inspect sheet in the base pass (with its card's
nesting path) and a row's targets under ZOOM200. Each was reached in the other passes of this run, and
in every pass of the first run on this build, whose only differences are the two fixes above.
**Every check 0 under all four mechanisms**: touch, contrast, non-text, scaling, layout, size, occlusion.
**Nesting: 33 landings, 0 wrong**, among them planning's four closes back to planning and the pathogen
card back to its drawer. **No scroll at rest: 0px on all 13 screens**, planning's among them. **The dock:
248px on all 27 screens** it was measured on, planning's among them. **Offline met**: 22 and 23 pieces of
art, all SVG, served with no network and none broken.

The first run on this build, for the record: 42 controls; 56 screens per pass (58 under SIZE200), none
NOT REACHED; the scale finding above under FONT200 and SIZE200; nesting 34 landings, 0 wrong; the dock
248px on 28 screens; offline not met (#75).

### Left for Shantanu's look

- **The type counts at the top of the Pathogens drawer count the whole body** while it shows one place,
  as the planning page's did before this piece. Whether they should follow the place is his call.
- **Help's section on Action Points still says "in the command bar or on the planning screen"**
  (`help.s4.p3`, tagged Fresh in [`HELP_DRAFT.md`](HELP_DRAFT.md)): "command bar" has been stale since
  piece 2, and Help's wording is his, so it is not changed here.
- **Still open from #74:** whether the no-dashes check should read code as well as tables.

---

## 19. Piece 5, the frame: RULED AND BUILT, 20 September 2026

### The rulings (Shantanu, 19 and 20 September 2026)

His phone's Chrome tab is about **360 × 680** once the browser's own bars are drawn, not the 780 every
measurement so far assumed, which is why planning still scrolled in his hands after piece 4. So every
stage now has **one format**: a fixed top bar, a **play area of the same height in every stage** ("equal
play area height for all phases is important"), a middle that scrolls only as the last resort, and one
advance button at the bottom.

- **Top bar:** the turn as "1/15" and the AP on the left; a short banner for what is in force between;
  a chat icon and the menu on the right. The deck count is gone.
- **Planning:** the figure with no box; the pathogen list in the middle; a tap on a place filters the
  list, a tap elsewhere shows them all; no type chips.
- **Command:** three equal buttons, **Cells, Antibodies, The body**, each opening its view in the middle.
  **Antibodies can be produced without selecting the B-Cell first.** The AP and speed text leave the
  middle. A pathogen tapped shows in one level.
- **"What happened" becomes the chat icon**, opening Messages in tabs; its first tab is "System messages",
  the players' own chat being Phase 3's.
- **Cards open full window.**

**What these supersede**, recorded rather than silently replaced: §12 ruling 1's dock (its one height
becomes the play area's), §15's four drawers (three become views in the middle, What happened becomes
Messages), and §17/§18's arrangement (b): planning's dock, its two slots and the Pathogens drawer.
§12 ruling 1's other half stands: the advance button hides **keeping its height** while the floating
close shows, so nothing moves.

### What was built

- **`packages/ui/src/play/Frame.tsx`** (new): `TopBar`, `PlayArea` (the board's own aspect ratio from
  `geometry.json`, capped at 55dvh), the toast, `ActionsView` (the 2 × 2 action grid of §14, now in the
  middle), `SpreadView`, `TabRow` and `AdvanceButton`. `panels/Dock.tsx` is deleted.
- **`PlayScreen.tsx`** is one screen tall (`100dvh` less the body's margin) and says what the middle
  shows in one priority order: a spread, the AP terms, what is in force, planning's list, a tapped node,
  a row's targets, then the Cells, Antibodies or Body view, else the actions.
- **Planning**: the figure fills the play area; the list sits in the middle with a lone pathogen's row
  opening its card; a tap on the play area's empty sides counts as elsewhere.
- **Produce without the B-Cell**: `produceOffers(view)` in `offered.ts` offers it whenever the B-Cell is
  unspent, not suppressed, and can act. **The engine is unchanged**: `produce` never needed the B-Cell
  selected, only the UI did.
- **Cards** (pathogen and cell) are full window. The cell card gains Speed, and Dice for the NK Cell,
  from the content tables.
- **Catalogue:** short banner and turn keys, `chat.*`, `tabs.cells`, `planning.tapBodyForAll`,
  `cellCard.speed`/`dice` added; the dock's, the drawers' and planning's retired keys removed with their
  last uses, `commandBar.deselect` among them.

### Two things found on the way, both in the product

1. **The floating close made the page 88px taller than the screen.** NavHost's spacer is there so a
   scrolling page's last lines clear the button; the frame never scrolls, so it only pushed the page
   past the screen. The frame now lets the spacer overlap its own bottom (a negative margin while the
   close shows), so nothing moves and the page is 680 at 680.
2. **The close then covered the tab row by 2px** at 360 × 680: the advance button's slot was 2.75rem
   and the close's footprint larger. The slot is 3rem.

### What the instruments gained

- **The play area's one height** replaces the dock's (§12), with three controls: another height is
  reported by name, both stages at one height pass, and a run that measured only one stage is NOT
  REACHED.
- **A 360 × 680 pass of the no-scroll check**: planning and command at rest, and command **with a view
  open under the close**, which is the case (1) above lived in and which nothing at rest could see.
- **The antibodies view is walked with nothing selected and REQUIRES its Produce button**: a view
  without one is a finding, so the ruling is checked, not assumed.
- The walk reaches the planning list's card, the list at a place and cleared again, Messages from both
  stages, and the three views; selectors moved from the drawers and the dock to the tabs, the chat icon
  and the menu icon.

### What the first audit of the build found

1. **The AP figure was 42 × 44**, under the 44px minimum: `minWidth` 44.
2. **At 200% page zoom (a 180px layout) the top bar was 9px too wide** and the menu left the screen. The
   bar wraps as the last resort, with the banner's basis at 0 so on any wider screen it shrinks first.
3. **A tap beside the figure left the list filtered** (the walk's own "elsewhere" tap): fixed as above.
4. **Offline NOT MET on a build that played offline cleanly**: the instrument read the turn from the
   text "Turn N of", which this piece removed. It reads the top bar's turn now. Fixed inline, because it
   is the instrument.

### The Gate 1 audit on the build the PR carries

**Conditions:** the shipped build served by `vite preview`, headless system Chrome on the development PC
(i7-12700F), 360 × 780 CSS px and the three 200% mechanisms, plus the 360 × 680 scroll pass; unseeded
games (#68); no handset.

**44 controls, all firing the right way** (the dock's three replaced by the play area's three). **56
screens per pass (58 under SIZE200). NOT REACHED: one door the deal decides**, a row's targets under
ZOOM200, reached in the other passes; the first run's two NOT REACHED under SIZE200 (the inspect sheet,
a row's targets) were reached in this one. **Every check 0 under all four mechanisms**: touch, contrast,
non-text, scaling, layout, size, occlusion. **Nesting: 32 landings, 0 wrong.** **The play area: 338.7px
on all 28 screens** it was measured on, across planning, command and the spread. **No scroll: 0px on all
17 screens at rest**, the three at 360 × 680 among them. **Offline met**, the turn read as "2/15".

**What these numbers cannot say:** the 680 pass measures one game's first turn; nothing here was on a
handset, and his phone is the check that matters for (1) above.

### Left for Shantanu's look

- **Whether the frame reads right on his phone**, at 680 in the Chrome tab: this is built to be looked at.
- **Still open:** Help's `s4.p3` ("in the command bar"), now staler, and the #74 instrument question.

### Amended 20 September 2026, on the S25's real viewport

**Shantanu measured his phone: 360 × 641 CSS px, DPR 3, of a 360 × 780 screen.** Not the 680 this
piece was built and measured against. Measured on the build at all three heights (headless Chrome,
the shipped build on `vite preview`, Training turn 1, CSS px):

| | 641 | 680 | 780 |
|---|---|---|---|
| play area | 339 | 339 | 339 |
| the middle, planning | 176 | 215 | 315 |
| the middle, command | 126 | 165 | 265 |
| page scroll at rest | **0** | 0 | 0 |
| Produce, in the antibodies view | 125px below the fold | 86 below | visible |

Fixed furniture is 170: top bar 44, tabs 44, the advance button 48, gaps and margins 34.

**Ruling 1 (a): the play area keeps its height; the middle scrolls when it must.** *"We cannot design
for the Chrome screen. The game will be played in an Android app which will likely use the full
screen."* The alternatives measured and declined: capping the play area at 45dvh (288 at 641, the
middle 177) would shrink the board on every screen to fix a height the app will not have; shrinking it
only while a view is open would move the board under the player's thumb, which §12 ruling 1 forbids in
the close's case. **So 641 is a screen the frame must not BREAK on, not the screen it is designed for**,
and the check at 641 is the page-scroll one, which passes at 0 on all three of its screens.

**Ruling 2 (a): the action is never the thing below the fold.** In the antibodies view the name and
Produce sit on one row directly under the class chips, with the breakdown below them; the view loses
its title and box, as the Cells and Body views do, because the tab that opened it already names it.
The view's content falls 334 → 276, and Produce is visible at 780 and 26px below the fold at 641
(from 125). `pieces.title` retired with its last use.

**Ruling 3: the short-screen pass is at 641**, on ruling 1's basis: the app's full screen is the design
target and 641 is the floor the frame must survive.

**Ruling 4: `help.s4.p3`** now reads "Tap the AP figure at the top of the screen" — the one stale
phrase, nothing else of Help touched; the draft is Kartik's review in piece 7.

**Ruling 5: the no-dashes check is NOT extended to code.** Recorded as declined for now, not forgotten:
[`FINDINGS.md`](FINDINGS.md) #74 stays open.

**The audit after these changes:** 44 controls right; 56 screens per pass (58 under SIZE200); every
check 0 under all four mechanisms; nesting 32 landings, 0 wrong; the play area 338.7px on 28 screens;
no scroll on 17 screens at rest, the three at 360 × 641 among them; offline met. One NOT REACHED, in
two passes: a row's targets, which the deal decides. **One finding the reorder itself caused and which
the audit caught**: at 200% text the Produce label made the row 433px wide on a 360px page; the button
shrinks and wraps its own text now.

---

## 20. Pieces 6, 7 and 8: the arrivals stage, the title and help pass, and the coach

Built 20 September 2026, from the remaining items of the 19 September message. Items 10 to 13 were
piece 5 (§19); what is left is 7 (piece 6), 1 to 6 and 8 (piece 7), and 9 (piece 8).

### Piece 6, the arrivals stage (item 7)

**The draw stops being a dialog over the game and becomes a stage of the frame**, in the format §19
fixed: the play area holds this draw's cards, the middle says what the spread did and what the
turn's event was, and the one button begins planning. `dialogs/RevealBody.tsx` keeps the types and
`revealCrisis`; the body that rendered them as a dialog is deleted.

- **The cards are drawn from data, not from the printed deck's artwork** (`play/Arrivals.tsx`): the
  kind's art (`path-*`, the same files the board uses), the disease's name, its antibody class. A
  disease added to the content pack has a front the moment it has a row, so the printed deck and the
  app cannot drift apart. The PDF of fronts was not needed and no new art was drawn.
- **A tap turns a card over**: where it came in, novel or remembered, the class that neutralises it,
  and the card icon, which opens the full pathogen card from either face. **The back is a summary,
  not the full card** — the full card is a window of its own and does not fit a tile, and item 11
  forbids an intermediate level that says nothing, so the icon goes straight to the card.
- **"What just happened"** in the middle is the burst's own narration lines, kept so the spread can
  be read at rest. Item 7 asked whether the spread could go in the banner area; it goes in the
  middle, which is the empty space that stage has.
- **The crisis section rides the stage**, exactly as it rode the reveal (ruled 6 September 2026).

### Piece 7, the title and help pass (items 1 to 6, 8)

| item | what changed |
|---|---|
| 1 | The Title drops the credit line. About carries it, and `title.tagline` is retired |
| 2 | **The disease library moves inside How to play**, as a row below the ten sections and set apart from them: it is reference, not a step on the way to playing. The Title is five rows, not six |
| 3 | The settings row says what it does: **First game guidance · Show it again**, and it now clears everything a first game shows — the coach, the first-encounter hints, and the difficulty recommendation |
| 4 | **Previous beside Next** inside a section, so a reader going in order can step back without going out to the contents. See the note below |
| 5 | **A library row is the name and the class, nothing else.** 106 rows, all 48px. The organs, "arises from", and "nothing produces it" are in the card the row opens |
| 6 | **Drafted, not shipped**: [`HELP_SHORTER_DRAFT.md`](HELP_SHORTER_DRAFT.md), 4,638 characters to 2,290, with the art proposed per section. **Kartik reviews it**; the app's text is unchanged until he does |
| 8 | **"Recommended for your first game" shows to a device that has not started one.** A new preference module, `app/played.ts`, with its own key for the reason `hints.ts` states: a field added to `Settings` would fail `safeParse` and silently reset every player's text size |

> ⚠️ **Item 4's symptom did not reproduce, and that is reported rather than quietly fixed.** It says
> that pressing back after Next lands on the Title. Measured on this build: from a section reached
> by two Nexts, **both the close button and the phone's back gesture land on the contents**, which
> is what §10 ruled on 13 September (siblings are not levels, or reading all ten sections would take
> ten closes to leave). So the ruling holds and no navigation changed. What was added is the
> control the item was reaching for: **Previous**, which steps back a section without leaving.
> **If the symptom is real on the phone, this is the place to say so** and §10 gets revisited.

### Piece 8, the coach (item 9)

*"When I say scripted I don't mean hardcoded"* (20 September). So the coach is **a pure function of
the state the player is in** (`play/coach.ts`), not a sequence played back at them: it reads the
stage, the turn, the points left, whether a piece is selected, **how many actions `offered.ts` is
offering**, and whether anything can be produced, and names the next thing to do. A player who does
something unexpected is not off the rails, because there are no rails.

- **It can never ask for what the engine would refuse.** Legality lives in `offered.ts` and nowhere
  else, so the coach is given the offer COUNT and never its own idea of what is legal; when nothing
  is offered it says so instead. That is the suite `coach.test.ts` spends the most tests on.
- **It is silent during a spread**, when nothing is accepted anyway.
- **It stops**: three turns, a Got it for the step, and a Stop that ends it. Settings turns it back
  on, with the hints and the recommendation, under one row.
- **The first-encounter hints stay.** They teach a SUBJECT on first contact; the coach teaches the
  TURN. Item 9 offered replacing one with the other; both are kept because they answer different
  questions, and one Settings row now governs both. **If the two feel like too much on the phone,
  that is the thing to say after a game.**

### What the instruments gained

- The walk reaches the arrivals stage, a card turned over, the card behind it, the coach (and stops
  it), the library through How to play, and Previous from section 2. `WHERE` names the arrivals
  stage; the resume checks land on it by name.
- **A new NOT REACHED, found and fixed by the convention that exists for it.** The coach and the
  recommendation are shown to a device that has never played, and the four passes share one browser
  profile: the first pass consumed them and the other three reported the coach NOT REACHED. This is
  CLAUDE.md's question — *does this screen consume something when it is shown?* — and the answer was
  yes for the second time (FINDINGS #66 was the first). The walk now clears the flag and reloads.

### The Gate 1 audit on the build the PR carries

**Conditions:** the shipped build served by `vite preview`, headless system Chrome on the
development PC (i7-12700F), 360 × 780 CSS px and the three 200% mechanisms, plus the 360 × 641
scroll pass; unseeded games (#68); no handset.

**44 controls, all firing the right way. 59 screens per pass (61 under SIZE200), NONE NOT REACHED in
any pass** — including the two the deal decides, which this run reached everywhere. **Every check 0
under all four mechanisms**: touch, contrast, non-text, scaling, layout, size, occlusion. **Nesting:
33 landings, 0 wrong, 0 NOT REACHED.** **The play area: 338.7px on all 30 screens**, across arrivals,
planning, command and the spread. **No scroll at rest: 0px on all 15 screens**, the three at
360 × 641 among them. **Offline met.**

**What the first run of these three pieces found, all fixed here:** the card icon on a turned-over
card was 26 × 26 against a 44 minimum; Previous and Next side by side were 185px wide in a 180px
layout; and the coach's NOT REACHED above.

### Left for Shantanu and Kartik

- **The shorter Help is a draft awaiting Kartik's review.** Nothing of it is in the app.
- **Whether the coach and the first-encounter hints are too much together**, which only a game on
  the phone can say.
- **Whether item 4's back-to-Title symptom is real on the phone**, since it does not reproduce here.
- **Still open:** the #74 instrument question, declined for now (§19).

---

## 21. Item 13: a game played start to finish, and what it showed

Played 20 September 2026 on the shipped build at **360 × 641**, Training, fresh profile, Title to
Result: a loss on turn 10 to Heart damage, then Play again and a second game. This is item 13 of the
19 September message, which asks for the UX to be looked at and not only for faults.

**What it is not:** it is one game, on a development PC, driven mostly through the page rather than a
thumb. It cannot say how the board feels to tap, and the numbers below are heights, not opinions.

### ⚠️ A correction, first, because I got one wrong

**I reported to myself that "Play again skips the arrivals stage and opens on the board."** It does
not. The goal dialog was up, and I had queried for the wrong attribute when checking for one.
Tapping Begin gives the arrivals stage exactly as a first game does. **Nothing was broken and the
claim was mine, not the app's** — recorded because a false finding that gets quietly dropped is how
a real one gets dismissed later.

### The three faults it did find, fixed here

1. **The coach spoke before the game began.** With the goal dialog still up and the turn not yet
   drawn, it was already saying *"Tap one of your cells on the board"* underneath it. The coach now
   has a `waiting` stage for every moment the player is not being asked for anything — a dialog up,
   or the turn not drawn — and says nothing in it. `coach.test.ts` carries the control.
2. **The coach ran again for a second game in the same sitting.** The device's "has played" flag was
   written when a game STARTED, and the play screen captured it once per page load. It is now
   written **when a game ENDS** (a loss counts, as Gate 1 says), which is also better on its own
   terms: a player who quits mid-first-game and comes back is still coached, and the difficulty
   screen's recommendation stands until a game has actually been finished.
3. **Per-game state outlived its game.** The play screen is now keyed by the game, so the coach steps
   waved away, the open view and the planning filter cannot carry into the next one. This is
   robustness rather than an observed defect: say so, rather than claiming a fix for a bug nobody saw.

### The streamlining it found, none of it built, all of it Shantanu's call

Heights are CSS px at 360 × 641, where the middle is **176px in planning and 126px in command**.

| # | What the game does now | Cost, measured | What could be done |
|---|---|---|---|
| **A** | The **Cells view** lists 14 chips: seven cells and seven resident macrophages | **414px of content in 126px** — three and a half screens for the commonest action in the game | Put the seven residents behind a toggle, and order the cells that can act first. The residents are rarely the answer and they are half the list |
| **B** | The **coach sits in the middle**, above the actions | With it up, a selected cell's action rows are **160px in 126px**: the rows a newcomer needs are the ones it pushes off | Move it over the play area, which has room in every stage, or make it one line with a × and put Stop in the menu |
| **C** | The coach says "tap one of your cells", and the prompt line below says "Tap one of your cells to command it" | Two lines, ~90px of 126px, saying one thing | Show the prompt only when the coach is not up |
| **D** | **Planning's list** grows with the body | 212px on turn 2, **450px by turn 6**, against 176px | Denser rows first (one line each); if that is not enough, group by place with counts and open a place to see its rows |
| **E** | **"What just happened"** lists the spread's frame labels | Includes "The march" and "Next turn", which are the animation's words, not events | Drop the turn-advance label; keep what actually happened |
| **F** | **Board move rings are 26px**, and 27 of them can be on screen at once | Under the 44px minimum, though a tap resolves to the nearest node, which hides it | Invisible 44px hit areas over the rings. The audit's touch check cannot see SVG targets, so this is also a gap in the instrument |
| **G** | The **Title** is the name and four buttons | Removing the credit line (item 1) took the only sentence saying what the game is; the lower half of the screen is empty | One short line about the game, not a credit, or art. This is Gate 2 territory as much as UX |
| **H** | **Result** says "Lost to damage: Heart" and offers three buttons | No way to see what actually happened; Messages lives inside the play frame and the game is over | A "What happened" button on Result, opening the same Messages panel |
| **I** | The **pause menu** is closed to resume | Nothing says "Resume"; the floating close is the way back | Add Resume as the first row. It is the one thing a paused player certainly wants |

**Two things measured and found FINE**, recorded because they were what I expected to find wrong:
an action that cannot be taken is visibly different from one that can (grey on grey against dark on
red, `Frame.tsx`), and the page never scrolled at 641 in any stage of any turn of either game.

### Left for the phone

Tap accuracy on the board, how the 900ms spread pacing reads to a person, and whether the coach and
the first-encounter hints are too much together. None of the three can be answered from here.

### One instrument defect, found by `pnpm verify` during this round

**`auto-draw.test.ts` asserted that an idle game lasts at least 5 turns, and an idle Hard game
lasted 4.** The floor came from a single measurement on 13 September ("9 to 10 turns at every
difficulty"), and the games are UNSEEDED ([`FINDINGS.md`](FINDINGS.md) #68), so that was one sample
of a distribution used as a bound on it.

**Measured before changing anything**, because a red test during a change looks like the change:
**3 failures in 23 runs with this session's changes applied, 0 in 22 on the unchanged code of the
same day.** At that sample size the difference is chance (p ≈ 0.11), and no mechanism connects them
— the suite drives the engine through `LocalSession` and touches neither the app shell nor the
coach nor anything else this session altered.

**The floor is 3 now**, which is what the assertion is for: a loop that stopped immediately still
fails it. The two lines under it — that it drew on every turn played and resumed on every turn
played — are the property the suite exists to check, and they are untouched. Fixed inline, because
a gate that reddens on its own tail is an instrument defect, not a product one.

### ✅ All nine RULED on 20 September ("agree with all of them"), and eight built. Measured.

Heights at 360 × 641, before → after, on the shipped build.

| # | What was done | Measured |
|---|---|---|
| **A** | The Cells view shows the seven cells, **ready ones first**, with the seven residents behind a control | **414px → 252px** of content in a 126px middle |
| **B** | The coach's line moved **onto the play area**, which has room in every stage, and out of the middle | With a cell selected, its action rows were 160px in a 126px middle; now **126px in 126px: they fit** |
| **C** | The prompt line stands down while the coach is up | The two lines that said one thing are one line |
| **D** | Planning's list is **one row per place**, opening to its pathogens; a place tapped on the figure opens as that one place | **765px over 13 rows at turn 7 → 352px over 8 places at turn 8.** Density alone did not do it: shrinking the art and running the place onto the name moved a row from 56px to 58px, because the row simply wrapped instead. The unit was wrong, not the padding |
| **E** | The spread summary drops the burst's last label | "Next turn" is gone; what happened stays |
| **F** | **Nothing. It needed nothing, and that is the finding** | The drawn ring is 26px but a board tap resolves to the nearest candidate within **60 viewBox units ≈ 66px** at the reference width (`board/tap.ts`, which says so in its own header). I measured the drawing and reported it as the target. **No code was added, because adding a 44px hit area over a 66px one is dead code that looks like diligence** |
| **G** | The Title carries one line saying what the game is, and no credit | About keeps the credit, which is where item 1 put it |
| **H** | Result has **What happened**, opening the finished game's log | The rare event's line is filed by `logLinesOf`, which the play screen now shares, so the two cannot drift |
| **I** | **Resume** is the first row of the pause menu | |

**One more, found while looking at B on the build:** the first-encounter hint sat over the top of
the board and the coach over the bottom, together covering most of it. **The coach now stands down
while a hint is on screen** — the same rule as C, for the same reason: the hint is about the thing
just tapped and is the more specific of the two.

**The audit after all of it:** 44 controls right; **60 screens per pass (62 under SIZE200)**; every
check 0 under all four mechanisms; nesting 33 landings, 0 wrong; the play area 338.7px on 29 screens;
no scroll at rest on 15 screens; offline met. One NOT REACHED, in the base pass only: a row with
several targets, which the deal decides.

**What is still true after the work:** planning's list scrolls when the body is busy (8 places is
352px against 176), and the Cells view scrolls at 252px against 126. Both are far better and neither
is solved; the middle is 126px and the game has more to say than that. The remaining fix is a design
decision about what a player needs to see at once, and it should be taken with a phone in hand.
