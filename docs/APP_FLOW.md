# App flow — the structure every screen hangs on

**Ratified by Shantanu, 30 August 2026** (screen map, taxonomy, and the structural rulings
below). This is the shared structure for Claude (building) and Claude Design (visual design):
what each screen must CONTAIN — elements and states, not look. Visual design that fits this
structure slots in; design that fights it gets renegotiated here first.

---

## 1. The map

### Screens (navigation destinations; every one has an explicit way back)

```
TITLE ──────────────┬─ Continue ──────────────────────→ PLAY (restored)   [only if a save exists]
                    ├─ New game → DIFFICULTY SELECT ──→ PLAY (fresh)
                    ├─ How to play ──→ HELP                                [P2.6]
                    ├─ Disease library ──→ LIBRARY                         [P2.6]
                    ├─ Settings ──→ SETTINGS                               [P2.6]
                    └─ About ──→ ABOUT                                     [P2.6]

PLAY ───────────────┬─ win ──→ RESULT (win)
                    └─ loss ─→ RESULT (loss)

RESULT ─────────────┬─ Play again (same difficulty) ──→ PLAY
                    ├─ Change difficulty ──→ DIFFICULTY SELECT
                    └─ Title ──→ TITLE
```

**Phase 3 insertion point:** mode select (solo / play together, with room create/join) inserts
BETWEEN Title and Difficulty. The chain is built so multiplayer is an insertion, not a
restructure.

### Sheets (slide over Play; dismissable; the game continues underneath)

inspect (built) · command bar (built, persistent) · pause menu · production/antibody panel
[P2.5 later] · memory & vaccine [P2.5 later] · event log [P2.5 later]

> ⚠️ **Amended 13 September 2026 ([`for-P2.7.md`](for-P2.7.md) §9, rulings 3, 7, 8 and 9).** On the
> play screen every panel is a DRAWER, opened from a row of buttons: Pieces, Antibodies, The body,
> What happened. Quick picks slide up from the bottom with part of the board still visible; reading
> surfaces open full height. The command bar becomes the DOCK (§4, PLAY). Every drawer, card and
> page closes from one floating button at the bottom, and closing returns one level (§2, ruling 1).
>
> ✅ *Built 13 September 2026 ([`for-P2.7.md`](for-P2.7.md) §15): Pieces, Antibodies and The body open
> from the bottom over the board, What happened opens full height, each is one level on the stack, and
> a tap on the board around an open drawer closes it. At 360 × 780 the main screen does not scroll; at
> 360 × 640 it scrolls 67px, recorded under ruling 6 rather than fitted.*

### Dialogs (modal over Play; block play until acknowledged; drain through ONE queue)

disease-card reveal on draw (carrying this turn's crisis event as a section, and the Pathogen X
and memory lines) · quit confirmation · new-game-overwrites-save confirmation

> ⚠️ **Amended 6 September 2026 (ruling 5's per-event decisions, taken by one test).** This
> read "crisis events · rare events · Pathogen X reveal" as dialogs of their own. Shantanu's
> test — *does it change what the player can do THIS TURN?* — every crisis event passes, and the
> reveal already interrupts at that exact moment, so crisis events are a SECTION of the reveal,
> never a second dialog. Rare events fire at the end of the spread and fail the test (a strip
> chip for one turn and a log line); Pathogen X and a memory response were already lines in the
> reveal. Nothing else in the game interrupts play. Record: `for-P2.5.md`, "Per-event dialogs".

### Overlays (non-interactive)

spread narration (the burst renderer — exists)

### Cross-cutting states [P2.6]

first-run onboarding hook on Title · error boundary screen · storage-failure notice.
There is **no offline state**: offline IS the normal state — the app has no network. Nobody
builds a spinner for a network we do not use.

---

## 2. Structural rulings

1. **Navigation model.** No router library. A top-level screen state machine in the app
   shell (`title | difficulty | play | result`, later `help | library | settings | about`),
   with sheets and dialogs as layers over the current screen. **Back-ordering (hardware back
   under Capacitor, and the on-screen back): dialog → sheet → pause menu → quit-confirm —
   in that order, and back never silently exits Play.**

   > ⚠️ **Extended 13 September 2026 ([`for-P2.7.md`](for-P2.7.md) §9, ruling 9): navigation is a
   > STACK.** Every close or back, on screen or the hardware button, returns to the level it came
   > from and never straight to the main screen: a card opened from the inspect sheet closes to the
   > sheet, a library page opened from Help closes to Help, and Settings opened from the pause menu
   > closes to the pause menu. The order above is that stack's play-screen case. The one floating
   > button says Back when it returns to a previous level and Close when it returns to the main
   > screen.
2. **The screen / sheet / dialog / overlay taxonomy** above is the classification every new
   surface must land in before it is built.
3. **Session lifecycle is owned by the shell machine.** Created on New-game with the chosen
   difficulty (`LocalSession.createGame`), restored on Continue
   (`Storage.get` → `LocalSession.resume`), disposed on quit. Nothing creates a session at
   module load. The app's save id is `autosave`; the dev shell keeps its own (`dev-shell`),
   so instrumented games never clobber a player's game.
4. **Save semantics.** ONE autosave slot. Saved on every accepted action (the session already
   does this). Continue offers it. Quit never deletes it. New game overwrites it, behind a
   confirm.

   **What a save actually IS, stated because it will be asked:** a browser-local IndexedDB
   record — scoped to this device + browser profile + origin. No account. Nothing leaves the
   device. Consequences, plainly: a different browser or device has no save; clearing
   browsing data deletes it; the packaged (Capacitor) app's storage is more durable than the
   web version's. **This is also why save-and-resume costs nothing in DPDP terms: there is
   nothing to consent to, because nothing is collected.**

   **Known limitations — recorded choices, not discoveries:**
   - A player mid-game who starts a new game loses the old one, even with the confirm.
   - A shared school computer means several students share one slot, so one student's game
     overwrites another's. Acceptable for classroom pass-and-play, and recorded as such. If
     it ever matters, the fix is **named slots with a display name and still no account** —
     a feature, not a structural change.
5. **The dialog queue is the mechanism** (ratified); which engine events modalize versus
   merely log is a per-event decision made later, event by event. The card reveal is the
   queue's first client.
6. **THE DEV SHELL SURVIVES, load-bearing.** The tail assertion, the IDB exercise, the skip
   toggle and `tools/perf/measure.ts`'s coupling (button text + `data-cell`) all die silently
   if the real app replaces rather than joins it — instrumentation lost because the thing it
   hung on was replaced is exactly the shape this project keeps finding. **Play is a
   component both shells mount**: the app shell at `/` (index.html), the dev shell at
   `/dev.html` with its own turn buttons (text unchanged, so the perf driver's coupling holds
   verbatim), its checks panel, skip toggle and IDB exercise. **A check fails the build if
   either entry stops building** (both are vite build inputs; `packages/app` build-check
   test), so the dev entry cannot rot quietly.

   > ⚠️ *13 September 2026: the app's Draw button goes ([`for-P2.7.md`](for-P2.7.md) §9, ruling 2).
   > The dev shell's turn buttons are this ruling's. Whether they follow the app or keep Draw for
   > the perf driver is decided in the piece that removes it, with the driver's coupling re-measured
   > rather than assumed.*
   >
   > ✅ *Ruled 13 September 2026 ([`for-P2.7.md`](for-P2.7.md) §12, ruling 6): **the dev shell
   > follows the app.** Its Draw button is gone; Begin command and End command (spread) keep their
   > text. `tools/perf/measure.ts` and `measure-full.ts` wait for the app's draw and dismiss the
   > reveal by its button instead of pressing Draw, and were re-run; the coupling changed loudly,
   > with its numbers, which is what this ruling exists to guarantee.*
7. **Result is a screen, not a dialog** — it ends the session cleanly before navigation.

---

## 3. The minimum shell (ruled: build this and nothing else)

**Title (+Continue when a save exists) → Difficulty → Play (+pause menu) → Result.**
Four screens, one sheet. Explicitly OUT of the minimum: settings, help, library, about,
mode select, science toggle. Gate 1's newcomer test runs against this shell — a test of the
app, not the scaffolding. Continue stays IN (ruling 1): a newcomer test that cannot resume
after a screen lock wastes the newcomer, not just the session.

---

## 4. What each screen must CONTAIN (for Claude Design)

Elements and states, not look. Every interactive element ≥44px (the touch pattern set at
P2.5 piece 1). All text through the i18n catalogue.

### TITLE
- Game name + credit line (Kartik's design credit is contractual; exact copy from README).
- **Continue** — present ONLY when a save exists; shows the save's difficulty and turn
  (available from the stored `GameState`) so the player knows what they are resuming.
- **New game** — always present. If a save exists, tapping it leads to the overwrite confirm
  AFTER difficulty is chosen (choose first, confirm before the old game is destroyed).
- [P2.6 slots, absent in minimum: How to play · Disease library · Settings · About.]
- States: with-save / without-save. First-run onboarding hook attaches here later.

### DIFFICULTY SELECT
- Three choices — Training / Normal / Hard — each with a one-line description (catalogue
  strings; Training is the newcomer default and may say so).
- Back (→ Title).
- Confirm-overwrite dialog appears here when a save exists and a difficulty is chosen:
  "starting a new game replaces your saved game" — proceed / cancel.
- States: normal / overwrite-confirm showing.

### PLAY
- ✅ *20 September 2026, piece 5 ([`for-P2.7.md`](for-P2.7.md) §19), superseding the dock and drawer
  notes below where they disagree:* every stage is ONE FRAME, one screen tall. A top bar (turn as
  "1/15", AP, a short banner for what is in force, Messages, menu); a play area of one height in every
  stage (the body in planning, the board in command and the spread); a middle holding planning's
  pathogen list, the actions, or the Cells, Antibodies or Body view, scrolling only as the last resort;
  one advance button. "What happened" is Messages' System messages tab. Antibodies are produced without
  selecting the B-Cell. Cards open full window. The deck count is gone.
- The board (built): radial board, fan-of-types tokens, badges, move-target rings.
- Command bar (built): selected cell, AP, action buttons; persistent at bottom.
  ⚠️ *13 September 2026: the build had placed it inline at 459px, under the board, and no ruling
  moving it was found. Ruling 1 of [`for-P2.7.md`](for-P2.7.md) §9 puts it back at the bottom as
  the DOCK: one height in every state, holding the selected piece's actions above the turn's next
  step.*
  ✅ *Built 13 September 2026 (§12, rulings 1 to 4): four zones (the piece, AP, Undo and Deselect;
  one message line; two row slots, one per action; End turn alone). It hides, keeping its height,
  while the floating close shows; it sits at the bottom of the screen while the top row, board and
  dock fit, and straight after the board otherwise; a spread's narration plays inside it. A row's
  several targets and the AP terms open over the board.*
  ✅ *Amended 13 September 2026 ([`for-P2.7.md`](for-P2.7.md) §14): the action area is a 2 × 2 grid of
  half-width slots in the same height (the verb and its cost, then the target), holding the piece's
  actions, Recall to bloodstream and What's here. A card icon beside a name opens its card: the
  selected cell's name in the dock, and in place of every "Card" button in the inspect sheet,
  planning and the reveal.*
- Inspect sheet (built) on node tap.
- Turn controls: Draw · Begin command · End command — player wording from the catalogue.
  ⚠️ *13 September 2026 (ruling 2): there is no Draw control. The draw is never a choice (the
  engine refuses every other action before it), so End turn plays the spread and the app sends the
  draw; the reveal's button begins planning, and planning's dock button begins command. The engine
  is unchanged.*
  ✅ *Built 13 September 2026 (§12): the play screen sends the draw on one rule, which also covers a
  game resumed before its draw (the autosave is written as a spread starts). The reveal's button
  says "Plan your turn".*
- Status strip: turn/maxTurn, phase, AP, deck count (the data the dev shell shows; player
  presentation is Claude Design's).
- **Pause button (always reachable) → pause menu sheet: Resume · Quit to title (→ confirm:
  quitting KEEPS the save) [P2.6 adds: Settings · How to play].**
- Dialog queue mounts here (card reveal etc. — piece 3).
- Spread narration overlay during bursts; input disabled while a burst plays.
- **The planning screen (P2.5 item 12, 5 Sep 2026)** occupies the *infection (drawn)* state:
  after the reveal, the board gives way to the body seen from the outside — pathogen summary
  with depth, the cell cards, the Phase 3 allocation slot — and its one button begins command.
  Not a new screen in the machine's sense: a state of PLAY, decided by `planningModel(view)`.
  ✅ *Built 13 September 2026 ([`for-P2.7.md`](for-P2.7.md) §18, ruled in §17): planning's page is
  the figure over the dock, which holds the Action Points for the turn to come, the figure's hint or
  which cells are out, Pathogens and What happened as two slots that open drawers, and Command your
  cells. A tap on a place on the figure opens the Pathogens drawer at that place. At 360 × 780
  planning does not scroll; at 640 it scrolls 76px, under ruling 10.*
- States: infection (pre-draw) / infection (drawn: the planning screen) / command /
  burst-playing / dialog-open / paused. Win or loss transitions to RESULT.
- ⚠️ *13 September 2026 (rulings 4, 5, 6 and 10): the main play screen does not scroll, at Standard
  text size on a mainstream phone. Reading surfaces scroll. At larger text sizes nothing is cut off
  and the screen may scroll as the last resort; on phones shorter than planning fits, planning
  scrolls. "Infection (pre-draw)" is no longer a resting state: it passes inside End turn.*

### RESULT
- Outcome headline (win / loss — on loss: which organ fell, from the final view).
- Stats: turns survived, organs damaged, antibodies made (all in the final view).
- **Play again** (same difficulty) · **Change difficulty** · **Title**.
- States: win / loss. (A finished game's save is cleared — RESULT is the one place the
  autosave is deleted, so Continue never offers a finished game.)

### PAUSE MENU (sheet over Play)
- Resume (closes sheet) · Quit to title (→ confirm dialog; quit keeps the save).
- Back gesture closes the sheet (back-ordering rule above).

---

*The P2.6 screens (Help, Library, Settings, About, onboarding, error states) hang off this
same structure; their contents are specified when they are built.*
