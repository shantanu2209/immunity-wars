# The look: a plan for the redesign before Phase 4

**Status: RULED by Shantanu, 1 October 2026**, every item in §10. It answers his direction of the
same day: disregard low-end phones, give the game the look of the best modern mobile games before
Phase 4, rename Training to Easy, and add a guided game that teaches by playing. **This is Phase 2
resumed**, and the spec its stages are built to ([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v2.0).

## 1. What is decided already

| # | Ruling (Shantanu, 1 October 2026) |
|---|---|
| 1 | **Modern phones only, and no floor phone: the Samsung Galaxy S25 is the one device measured** (*"Actually no floor phone, we use only the s25"*). The ₹6–8k handset is no longer the bar |
| 2 | **No money is spent.** All art, sound and motion is generated or written here. Free tools may be plugged in |
| 3 | **A low-graphics setting comes later**, for the classroom edition |
| 4 | **Shantanu decides the look.** Kartik's part stays the rules and the science |
| 5 | **Training is renamed Easy**, and a **guided game** replaces reading How to play |

## 2. The recommendation: keep the codebase, replace the screens

**Not React Native, and not a game engine.**

- React Native draws native buttons and lists. A game's look is custom-drawn art, motion, effects
  and sound, which it does not give.
- Unity or Godot would mean porting the rules engine, and losing the proof that it plays as Kartik's
  original does.
- So: **one TypeScript codebase, Capacitor for Android and iOS, and a new screens layer.**

| Kept, untouched | Kept, re-skinned | Replaced |
|---|---|---|
| The rules engine, content, protocol, room, relay | What is offered and to whom, effects, the table, every string in the catalogue | Every screen's drawing, the board renderer, all 89 art files |
| Their tests, the corpus, the controls | Their tests | The Gate 1 audit is re-aimed at the new screens |

## 3. What "the look" means here, from the references

His references were Monument Valley, Alto's Odyssey, Threes, and the digital editions of Wingspan,
Root, Ticket to Ride and Through the Ages. What they share, turned into rules for this game:

1. **Few words on the board.** Shape, colour and motion carry the state; text is for the card you
   open, not the surface you play on.
2. **Every tap answers.** A move, a kill, a coat, a refusal each has its own motion, sound and
   haptic, in under a tenth of a second.
3. **The camera does the explaining.** Wide for planning; it moves in on the action being taken and
   on each beat of the spread.
4. **Press and hold to read anything.** A pathogen, a cell, an organ: a full card, the way a player
   leans in at a table.
5. **Each player's screen is theirs.** In a game together, a player's own pieces lead; the rest is
   quiet. Root's digital edition is the model.
6. **Legal moves glow; illegal ones are not offered.** Already the rule here; the new look makes it
   beautiful.
7. **Undo is always one tap away.** Already built.

## 4. Where the art comes from, with no money spent

In order of preference, because each step down adds a licence question:

1. **Written in code:** vector shapes, gradients, lighting and particle effects. Ours outright, sharp
   at any size, tiny to ship. The Monument Valley and Alto's look is exactly this kind of art.
2. **Modelled and rendered in Blender** (free): the seven cells and the pathogens as soft, lit,
   living shapes, rendered to animated sprites. Ours outright. Needs Blender running on this PC with
   its connector switched on; Shantanu would be walked through that.
3. **Generated images**, only from a tool whose terms allow redistribution, checked and recorded in
   `ASSETS.md` before a single file ships.

**Sound** is synthesised in code. **Replacing all 89 current files** also retires the open question
about the present art's licence.

## 5. The technology, decided by measurement

The board moves from flat SVG to whichever of these wins on the S25:

- **(a) A GPU canvas for the board** (PixiJS), with menus and text staying ordinary page elements;
- **(b) The present SVG, with real motion added.**

A small prototype of each, playing one turn and one spread, measured for frame rate on the S25.
This project's rule is to simulate before building, and this is the decision most expensive to
reverse.

## 6. The guided game, and Easy

**The guided game.** Three to five minutes, scripted: an infection arrives, move a cell, engulf it,
make antibodies and coat a bacterium, end the turn and watch the spread, win. One thing is lit at a
time, with an arrow; everything else is dimmed and cannot be tapped.

- It needs **the engine to accept a fixed script of dice and cards**, which it cannot today. That
  is an engine change, made and proven the way the queue's were.
- The script is content; the spotlight is one component.
- It **replaces the present hints and coach**, and it is what the newcomer test is run on.
- How to play, the long text, stays as the reference library.

**Easy.** The word changes on the screens, in the engine's own messages, and in the printed rulebook,
quick reference and study packet, in one change, so the table and the app keep agreeing.

## 7. The stages, and what Shantanu sees at each

| Stage | What is made | The gate |
|---|---|---|
| **L1 Style frames** | Two or three directions, each as one finished picture of the play screen, the title and a card | **He picks one.** No code before this |
| **L2 The moving prototype** | The chosen frame playing one turn and one spread, both ways (§5), on the S25 | Frame rates read; the board's technology ruled |
| **L3 The kit** | Colour, type, motion and sound rules; buttons, cards, sheets; the full set of pieces | He approves the kit |
| **L4 The play screen** | Board, pieces, actions, the spread, the log, the camera | Played on his phone |
| **L5 Every other screen** | Title, difficulty, playing together, planning, result, the library | Played through, alone and together |
| **L6 The guided game and Easy** | The scripted game; the rename; the printed texts | A newcomer plays it unaided |
| **L7 Finish** | Polish, the audit re-aimed, the newcomer test, the measurement on the S25 | **Gate 2: his visual approval** |

Then Phase 4 (Android), Phase 5 (iOS), Phase 6 (the classroom edition, with the low-graphics setting
and Hindi).

## 8. What this does to what was owed

| Owed from Phase 2 | Becomes |
|---|---|
| The handset performance pass | Measured on the S25, at L2 and again at L7. It still settles the app shell, Capacitor against React Native, before Phase 4 |
| The newcomer test | Run on the guided game, at L6 |
| Gate 2 | The approval at L7 |
| The shorter How to play | Superseded by the guided game |

## 9. What could go wrong, said plainly

- **The art is the risk, not the code.** Studios have artists. Generated and code-written art can
  reach a clean, minimal look like the references; it will not reach a hand-painted one. L1 exists
  so this is seen as pictures before anything is built on it.
- **A canvas board is invisible to the accessibility audit**, which reads page elements. If (a) wins,
  the board needs a parallel description for the audit and for screen readers.
- **Dropping the cheap phone narrows who can play** until the low-graphics setting exists. With the
  S25 the only device measured, how it runs on anything slower is unknown, and is not claimed.
- **It is large.** The present screens took five weeks; this replaces all of them.

## 10. Ruled, 1 October 2026

1. **The floor phone:** none. *"Actually no floor phone, we use only the s25."*
2. **This order of stages**, with nothing built before he picks a style frame: *"Yes."*
3. **The accessibility gates** (touch targets, contrast, text that scales to 200%, playing offline)
   are kept as they are: *"Yes."*
4. **Portrait only**, as now: *"Yes."*
5. **Blender** is installed, with its connector; he starts it when a stage needs it.
6. **Bookkeeping:** this is Phase 2 resumed, under a new version of its brief: *"Yes."*
