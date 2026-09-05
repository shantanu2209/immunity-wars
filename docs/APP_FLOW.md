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

### Dialogs (modal over Play; block play until acknowledged; drain through ONE queue)

disease-card reveal on draw · crisis events · rare events · Pathogen X reveal ·
quit confirmation · new-game-overwrites-save confirmation

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
- The board (built): radial board, fan-of-types tokens, badges, move-target rings.
- Command bar (built): selected cell, AP, action buttons; persistent at bottom.
- Inspect sheet (built) on node tap.
- Turn controls: Draw · Begin command · End command — player wording from the catalogue.
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
- States: infection (pre-draw) / infection (drawn: the planning screen) / command /
  burst-playing / dialog-open / paused. Win or loss transitions to RESULT.

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
