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
| `pnpm gate1:audit` | touch ≥ 44 px, contrast, text at 200% under three mechanisms, layout, offline, a refused service worker registration | 29 controls, fire and pass halves (27 until 13 September; the two added are #69's) |
| `pnpm verify` | typecheck, lint, format, boundaries, docs, turbo hash, every suite | `pnpm ci:selftest` |
| `pnpm coverage:positions` | the generated coverage documents' positions | 4 controls |
| `iw/no-hardcoded-jsx-text` | all player text through the catalogue | both control halves |
| `no-dashes.test.ts` | no dashes in player text | its own control |
| the equivalence corpus | the engine's behaviour and its 67-name root surface | the whole of Phase 1 |

**What the audit must hold, every run:** **44 screens** per pass (46 under SIZE200), **no screen
NOT REACHED**, every check **0**, **29 controls** all firing the right way, offline met.
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

### ⚠️ PROPOSED, NOT YET RULED: the build in four pieces, one PR each

| Piece | Rulings | Why in this position |
|---|---|---|
| **1. The navigation stack and the floating close** | 8, 9 | App-wide and independent of the play screen. It fixes the four breaks above, and the drawers in pieces 3 and 4 nest on top of it, so it has to exist first. The smallest piece. |
| **2. The dock and the draw inside End turn** | 1, 2 | The turn's flow. The dock is where a drawer's pick lands, so it comes before the drawers. The audit walk, the perf drivers and Help's turn section change here. |
| **3. The drawers and the main screen without scroll** | 3 to 7, 10 | The largest piece. The height budget is measured at 780 and 640, and under all three text-at-200% mechanisms. |
| **4. Planning** | 4, 10 | Depends on the dock and the drawers: the body view at about 410px, the pathogen list as a drawer, the dock's Command your cells. |

Each piece is audited with the per-screen list read, and goes up only after the one before it is
merged. A phone pass on the S25 is most useful after pieces 3 and 4, where the main screen and
planning take their new shape.
