# The look: a plan for the redesign before Phase 4

**Status: RULED by Shantanu, 1 October 2026**, every item in §10. It answers his direction of the
same day: disregard low-end phones, give the game the look of the best modern mobile games before
Phase 4, rename Training to Easy, and add a guided game that teaches by playing. **This is Phase 2
resumed**, and the spec its stages are built to ([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v2.0).

**Stage L1 is done: he picked the Clay direction, 1 October 2026** (§11). L2 is next.

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

> ⚠️ *Amended 1 October 2026, by ruling (§12).* This section was written before the look was
> picked. Clay is made of 3D models, which adds a third way: **(c) the models themselves drawn live
> on the phone** (three.js). All three are prototyped and measured. "The present SVG" in (b) is,
> for Clay, pictures on the page moved with CSS.

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
| **L1 Style frames** | Two or three directions, each as one finished picture of the play screen, the title and a card | **He picks one.** No code before this. ✅ *Done, 1 October 2026: Clay (§11)* |
| **L2 The moving prototype** | The chosen frame playing one turn and one spread, all three ways (§5, §12), on the S25 | Frame rates read; the board's technology ruled. ✅ *Done, 1 October 2026: measured on the S25, and ruled pictures on the page (§12)* |
| **L3 The kit** | Colour, type, motion and sound rules; buttons, cards, sheets; the full set of pieces | He approves the kit. *Ruled 1 October 2026 and under way: the pieces are built (§13)* |
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

## 11. L1, ruled 1 October 2026: Clay

Three directions were drawn, each as the play screen, the title and a card, at 1080 × 2340, the
S25's own screen:

| | Direction | How it was made |
|---|---|---|
| A | Daylight: light, flat and calm | Drawn in code |
| B | Under the lens: dark and luminous, like fluorescence microscopy | Drawn in code |
| **C** | **Clay: soft 3D pieces on a board that looks like an object** | **Modelled and rendered in Blender** |

**Shantanu picked C:** *"I love c, the clay look."* Claude had recommended B; the look is his to
decide (§1, ruling 4), and this is that decision.

| The play screen | The title | A card |
|---|---|---|
| ![The play screen in the Clay direction](look/l1-clay-play.webp) | ![The title in the Clay direction](look/l1-clay-title.webp) | ![A pathogen card in the Clay direction](look/l1-clay-card.webp) |

**What the pictures are.** All three directions showed one position from a recorded Easy game: turn
8 of 15, 3 of 6 Action Points left, the Monocyte selected, and its two legal moves taken from the
engine's own move query rather than drawn by hand. Every word on them comes from the content pack.
The board's positions were read from `packages/content/src/board/geometry.json`.

**What Clay commits to.**

- The seven cells, the pathogens and the board are 3D models: a soft flattened body, with the
  nucleus, granules and receptors laid on top so that the features that tell the cells apart read
  from above. Each drawing makes a claim a scientist can check: the monocyte's one kidney-shaped
  nucleus, the neutrophil's lobes joined by strands, the eosinophil's two lobes and large granules,
  the B cell's antibody receptors with stems in the membrane and arms outward, and a coated microbe's
  antibodies the other way round, arms on the microbe and stems outward.
- Deep teal for the table and the board, cream for the controls, coral for the bloodstream and the
  main button, mint for what is healthy or allowed, gold for Action Points and antibodies.
- Controls that look pressed out of the same material: thick, rounded, with a visible edge.
- No money spent: Blender is free, the models are ours outright, and the typeface is the Nunito the
  app already ships under the Open Font License.

**What the pictures do not settle, carried forward.**

1. **How clay moves.** §5 was written before the pick and names two ways to draw the board. A look
   made of 3D models has a third, drawing the models live. Which of them L2 measures is not ruled.
2. **The bacterium is one generic rod**, as in the present art. Cellulitis, the disease on the card,
   is caused by round bacteria. A piece shaped to each disease needs a shape recorded in the content
   pack, and that is Kartik's decision.
3. **The accessibility gates were not measured on pictures.** Some labels are drawn smaller than text
   scaled to 200% allows. The kit (L3) and the play screen (L4) are where they are held to the gates.
4. **The typeface** is the one already shipped. Choosing one belongs to the kit.
5. **The pictures are not app code.** Nothing under `packages/` changed for them.

## 12. L2, ruled 1 October 2026: the board is pictures on the page

**Three rulings, Shantanu, 1 October 2026**, on the proposal that followed the pick:

1. **All three ways are prototyped**, and their practical pros and cons are to rest on real data
   where that is possible: *"Yes we need to prototype all 3. And we need to understand the
   practical pros and cons of each based on real data where possible."*
2. **The pass line**, set before any number existed: no frame slower than 16.7 ms through the turn
   and the spread; a tap answered within 100 ms; the board drawn within 1 second; all pictures and
   models under 10 MB. **It is not a hard rule:** *"Yes but let's not make it a very hard rule,
   things are that marginally over can still be considered etc. basically evaluate before rejecting
   to see if it can be made to work."*
3. **The prototype is committed**, as `tools/look-prototype/`, with PixiJS and three.js as its own
   dependencies and nowhere else, and it is measured on the S25 with the built page served on the
   home network, as the phone checks were before the app was served from the server: *"Agree. They
   way we used to do before deploying on the server."*

**What is built.** [`tools/look-prototype/`](../tools/look-prototype/README.md): the Clay play
screen playing a calm turn and a crowded board, both recorded from the real engine, drawn as
pictures on the page, as pictures on a GPU canvas, and as the models drawn live. One motion, decided
once, is handed to all three. A frame timer and a tap timer measure them, and each timer was made to
fail on purpose before it was trusted.

**What is measured.** [`LOOK_L2_MEASUREMENT.md`](LOOK_L2_MEASUREMENT.md). **On the S25, 1 October
2026, run by Shantanu: all three ways hold 60 frames a second**, on the calm turn and on the crowded
board. Two rows have one missed refresh each in 1,685 frames, which does not separate the ways.
What does separate them:

| | The page's own work per frame, crowded board | First draw | Sent to the phone |
|---|---|---|---|
| Pictures on the page | 2.6 ms | 109 ms | 287 KB |
| Pictures on a GPU canvas | 0.6 ms | 413 ms | 433 KB |
| Models drawn live | 4.6 ms | 784 ms | 849 KB |

The phone ran the page at 60 frames a second, not the 120 its screen can show, so 120 is not
measured. Taps were not timed on the phone, and the ways were not watched side by side; his reading
from the measured run is that the three look much the same and that the choice should go to what
performs best.

### L2 ruled and closed, 1 October 2026

Asked three things after the phone's numbers, Shantanu ruled: *"1. Page 2. Accept 60 3. Waive it"*.

1. **The board is drawn as pictures on the page.** Blender renders each piece and the board; the
   app moves them as page elements. Claude had recommended it, for being the lightest and the
   fastest to load, for adding no library, and for keeping every piece an element the
   accessibility checks and the audit can read. **No GPU canvas and no live 3D are added.** If an
   effect built at L4 cannot hold the frame rate this way, a canvas for that effect alone is a new
   proposal, measured then; it is not part of this ruling.
2. **60 frames a second is the target.** The phone ran the prototype at 60 and the line was ruled at
   16.7 ms. **120 frames a second is unmeasured, and nothing is claimed about it.**
3. **The tap test on the phone is waived: waived, not met.** The 100 ms line for a tap was never
   read on the S25. What the frame times allow, and what the PC measured, is an answer within about
   50 ms; that is an inference.

**Locked decision #1, Capacitor against React Native.** On this measurement Capacitor holds: the
look is reached with web technology at 60 frames a second on the S25. The plan measures again at L7
(§8), on the finished screens and in the app's own shell, which this measurement did not use; the
decision is confirmed there, before Phase 4.

**What this does to §9's warning.** "A canvas board is invisible to the accessibility audit" no
longer applies: there is no canvas board.

**What happens to the prototype.** It stays as the instrument its record was taken with, until the
play screen is built at L4 and measured in its place; then it is removed, and `pixi.js` and `three`
go with it. Neither is used by anything else, and neither is to be.

**What the prototype is not.** It is a measuring instrument. Nothing under `packages/` imports it
or changed for it, and it is removed when the ruling has been built into the app.

## 13. L3, the kit: ruled 1 October 2026

**The proposal's five points, all ruled as recommended:** *"Agree with all your recommendations.
Please proceed."*

1. **The piece set and its three rules.** Shape says what kind of thing it is. Colour says its
   antigen class, which is what an antibody has to match; the six class colours are the content
   pack's own. Soft and rounded is alive, hard-edged is not: only the toxin and the venom have hard
   edges.
2. **Your own cells stand on a base, and an invader never does**, so that colour never has to tell
   friend from foe. With seven cells and six classes on one colour wheel it cannot: the Monocyte and
   an intracellular bacterium are both teal.
3. **One shape per kind of pathogen.** The bacterium is a rod, though some of its diseases are caused
   by round bacteria; the parasite is a trypanosome, though its six diseases include an amoeba and a
   mite; the worm is a roundworm, though its seven include a tapeworm and a fluke. A shape per
   disease would need one recorded for each of the 97 diseases in the content pack, and is Kartik's
   to decide.
4. **The typeface stays Nunito. Sound is on by default, with a mute in Settings.**
5. **He approves the kit on a kit page on his phone**, built as three pull requests in this order:
   the pieces; then colours, type, buttons, cards and sheets, with the kit page; then motion, sound
   and haptics.

**Left for Kartik, and not part of the ruling:** the kind the content pack names "Hidden Virus"
includes two diseases caused by protozoa. The piece, one of your own cells with something showing
through it, is true of all thirteen; the name is his to keep or change.

### What the first measurement changed, before anything was built

The contrast gate ruled to be kept (§10, ruling 3) asks 3:1 of a meaningful picture against what it
is seen on. Measured from the renders on 1 October, before the gate was written:

| What was measured | Found | What it changed |
|---|---|---|
| Each cell against a plain cream base | 1.7 to 2.8: **every one fails** | The base is a **cream rim round a dark well**. Cells against the well: 5.05 to 8.06 |
| Each piece against the board of the L1 frame | The virus 2.6, the Monocyte 2.8, the fungus 2.9, the B-Cell 2.9: **four fail** | **The board is darker.** Invaders against it: 3.32 to 6.39 |
| A piece on the coral bloodstream | The virus 1.0, the bacterium 1.2: **unreadable** | **The bloodstream is a coral rim round a dark dish**, the same well as the bases. Invaders against it: 4.61 to 8.88 |
| The malaria piece's red blood cell | 3.08 against the darker board: passing with nothing to spare | A lighter red: 3.44 |

So ruling 2 is built as a rimmed base, not a plain disc, and the board and the bloodstream of the
play screen (L4) are darker than in the picture picked at L1. The board keeps its teal: it came out
grey at first, from the lamps' reflection on a dark surface, and is nearly matt now.

### Built: the pieces (the first of the three pull requests)

- **`tools/art-pipeline/clay/pieces.py`** builds all 24 pieces in Blender, with the base and a
  swatch of the board, and renders each in two views: the board view, from straight above under the
  board's own lamps, and the card view, at an angle. Its header says what each shape claims.
- **`tools/art-pipeline/clay.ts`** (`pnpm art:clay`) takes the renders in, holds every picture to
  the gate, and writes 49 pictures as 147 WebP files (1.35 MB) with a manifest that records what was
  measured. The grounds are measured from renders too: the board reads `#1c484d` once lit, the
  well `#193033`, the rim `#fde7c5`.
- **`pnpm art:clay:check` runs on every `pnpm verify` and in CI.** It re-measures every committed
  render, holds it to the gate, and requires the manifest and the output to be what the renders
  produce. It encodes nothing, so it takes seconds and answers the same on any machine.
- **Controls, each fired.** A piece the colour of the board is rejected and a cream one accepted; a
  set with no board swatch is refused, never passed for want of a ground. With the bound raised to
  4:1 the real set fails, which shows the gate reads the pictures. A ratio edited in the manifest,
  and an output file that is not the recorded one, each turn the check red.
- **The output's home is `tools/art-pipeline/clay/built/` for now.** It moves under the app with the
  kit page, in the next pull request, together with the rule that keeps it out of the players'
  download until a screen uses it. Nothing a player gets has changed.
