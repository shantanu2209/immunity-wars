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
