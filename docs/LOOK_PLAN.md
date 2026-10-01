# The look: a plan for the redesign before Phase 4

**Status: RULED by Shantanu, 1 October 2026**, every item in §10. It answers his direction of the
same day: disregard low-end phones, give the game the look of the best modern mobile games before
Phase 4, rename Training to Easy, and add a guided game that teaches by playing. **This is Phase 2
resumed**, and the spec its stages are built to ([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v2.0).

**Stages L1, L2 and L3 are done, all on 1 October 2026:** he picked the Clay direction (§11), ruled
the board is drawn as pictures on the page (§12), and approved the kit (§13). L4, the play screen,
is next.

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
| **L3 The kit** | Colour, type, motion and sound rules; buttons, cards, sheets; the full set of pieces | He approves the kit. ✅ *Done, 1 October 2026: built in three parts and approved on his phone (§13)* |
| **L4 The play screen** | Board, pieces, actions, the spread, the log, the camera | Played on his phone. *Ruled 1 October 2026 and under way: the board, the frame, the panels, motion and sound, and the camera are built, the measuring page is built and the audit is re-aimed and clean; the measurement on the S25 is his step and remains (§14)* |
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
  the gate, and writes 49 pictures as 147 WebP files (0.96 MB) with a manifest that records what was
  measured. The grounds are measured from renders too: the board reads `#1c484d` once lit, the
  well `#193033`, the rim `#fde7c5`.
- **`pnpm art:clay:check` runs on every `pnpm verify` and in CI.** It re-measures every committed
  render, holds it to the gate, and requires the manifest and the output to be what the renders
  produce. It encodes nothing, so it takes seconds and answers the same on any machine.
- **Controls, each fired.** A piece the colour of the board is rejected and a cream one accepted; a
  set with no board swatch is refused, never passed for want of a ground. With the bound raised to
  4:1 the real set fails, which shows the gate reads the pictures. A ratio edited in the manifest,
  and an output file that is not the recorded one, each turn the check red.
- **The output's home was `tools/art-pipeline/clay/built/` for that pull request.** It moved under
  the app with the kit page, below.

### Built: colours, type, components and the kit page (the second of the three)

- **The kit**, in `packages/ui/src/kit/`: the named values (`tokens.ts`), the colour pairings and
  the bound each is held to (`contrast.ts`), and the components: the button in its three kinds, the
  card, the sheet, the pill, the chip, Action Point pips, the meter, a wrapping row of controls, the
  piece, and the pathogen's card. It has its own entry, `@immunity-wars/ui/kit`, so only the kit
  page pulls it in; every word a component shows is the caller's, from the catalogue.
- **The kit page**, `/kit.html`: every part as the real component, for him to look at on his phone.
- **The Clay art is served and is not a player's download.** It lives in
  `packages/app/public/art/clay/`, and the app's build keeps it and the kit page out of what the
  service worker stores on a phone, until a screen uses them at L4. Measured on the build: 194
  entries stored, none of them the kit's; 147 Clay pictures served.

**What measuring changed, again before it was built on.**

| Measured | Found | Changed |
|---|---|---|
| The kit's 23 colour pairings | Two failed: the go button's edge on a card (2.89) and a resting button's edge on a card (1.60) | Both edges darker: 4.00 and 3.55. A resting button is now marked by its edge and not only by its word |
| White words on the coral button | 3.25: under 4.5 | The main button's word is dark ink on coral: 4.68 |
| The quiet text of the L1 frame on cream | 4.16: under 4.5 | A darker quiet ink: 5.80 |
| The kit page with every word at 200% | The page grew wider than the phone: three buttons in a row, the card's four measures, and the grids of named pieces did not fit | Rows of controls wrap; the measures and the grids reflow; long display words may break. At 200% the page is 360 px wide and nothing is wider |
| A piece on a cream card | A faint box round it: the render's shadow reached the picture's edge (up to 48 of 255 there) | The pipeline feathers the edge, and the gate refuses a picture with more than 3 of 255 at its edge. Now 0 |

**Controls added, each fired:** `kit-contrast-reads-the-tokens` (a pale quiet ink fails by name),
`clay-kit-colour-is-measured` (the kit's board colour edited by hand fails), `clay-not-in-the-worker`
(the exclusion removed, the build test fails naming what the worker stores), and in the gate's own
set, a picture cut off at its edge rejected for its edge. Two of these checks were wrong on their
first run and said so: the edge control was refused for having nothing solid in it, which showed
nothing about edges, and the worker test read 0 entries from a list written in a spelling it did not
know, which its own "the list was read" line caught.

### Built: motion, sound and touch (the third of the three)

- **Motion**, `packages/ui/src/kit/motion.ts`: eight named motions (a move, an arrival, a
  departure, an engulf, a coat, a refusal, damage, a press), each written as data, a list of
  keyframes with a length and a curve taken from the kit's named values, and played by the
  browser's own animation engine.
- **A move is played from the new place.** The screen draws the piece where the game now says it
  is, then plays the hop from where it was. So a motion that ends, is cut short, or is never played
  leaves the piece where it belongs.
- **Less motion.** On a phone that asks for it, nothing travels, swells or shakes: an arrival or a
  departure fades, and anything else blinks once where it is.
- **Sound**, `packages/ui/src/kit/sound.ts`: ten sounds (tap, move, engulf, coat, arrive, damage,
  refuse, end of turn, win, loss), each a short list of notes made by the browser's audio engine.
  **There is no sound file**, so nothing was bought, downloaded or generated, and there is nothing
  to license. On by default, as ruled; one mute silences sound and buzz together. The Settings
  screen that holds the mute is L5's.
- **Touch.** Seven of the ten also ask the phone for a short buzz, where a web page is allowed to.
  That is Android's browser; an iPhone's browser has no such thing, and the fuller version waits for
  the app's own shell at Phase 4.
- **Every kit button answers** with the tap sound and a buzz, through the one shared audio, unless
  it names a sound of its own.
- **On the kit page:** a Motion section (a cell that hops, engulfs and refuses; a bacterium that
  arrives and is coated; an organ that takes damage; a switch that shows the less-motion version)
  and a Sound and touch section (the ten sounds, and the mute).

**What was measured, and what was not.**

| Measured, in a headless phone-sized browser on the PC, pressing each button | Found |
|---|---|
| Each of the six motion buttons | Starts its own motion (260 to 550 ms), one or two voices in the audio engine, and its own buzz request; the arrival has no buzz, by design |
| The same six with less motion | Only fades and blinks of 180 ms; no transform is animated at all |
| The cell after a hop, and after a second | Drawn at 98 px, then back at 14 px: where the page put it, not where a motion left it |
| The ten sound buttons | 1 to 4 voices each, as the list says; the audio engine running after the first press |
| Muted | No voice and no buzz request; the motions still play |
| The page with every word at 200% | 377 px at first: one sound button's length label spilled 17 px past the phone's edge. The length now sits under the word, and the page is 360 px wide with nothing wider |

- **Not measured: how any of it sounds or feels.** A headless browser has no ears and no motor. That
  a sound was started is known; whether it is the right sound for an engulf is his to judge, on the
  phone.
- **Not measured: frame rate.** These are the same kind of motion as stage L2 measured (page
  elements moved by transform and opacity), but the kit page was not itself timed. The play screen
  is, at L4.
- **A design rule taken on general grounds, not from the S25:** a phone's small speaker plays little
  of a low note, so every sound has a note starting at 250 Hz or above. The first drafts of three of
  them (arrive, damage, refuse) sat wholly lower and were raised before anything was heard.

**Checks and their controls, each fired.** The kit's tests hold every motion to changing only
transform, opacity and filter, to not travelling when less motion is asked for, and to 600 ms; and
every sound to a note a phone plays, to notes that never add up past full loudness, and to the
mute. `kit-motion-less-motion-is-still` (the less-motion branch switched off: the test fails naming
the move) and `kit-sound-mute-is-obeyed` (the mute no longer read: the test fails saying a muted kit
made a sound). **The check on the page was itself wrong on its first run:** it pressed the first
button called Move, which is the one in the Controls section, and reported a move with no motion.
Its own list of what each press started is what showed it.

**Not held by a standing check:** that a kit button's press reaches the audio. The package has no
way to press a button in a test; it was seen once, in the headless run above.

### The kit approved, 1 October 2026

Shantanu opened the kit page on his S25, with all three parts on it, and ruled: *"Tested. It's
perfect. Please proceed."*

- **That is the gate of stage L3**, and it is his judgement of what no check here could make: how
  the pieces, the controls, the motions and the sounds look, sound and feel on the phone.
- **Asked for no change.** The kit goes to the play screen as it stands, the measured changes above
  included: the darker board, the rimmed bases, the dark word on the coral button.
- **What the approval is not.** It is of the kit, on the kit page. The screens built from it are
  judged at their own stages, and Gate 2, his approval of the whole look, is still L7's.
- What he pressed and for how long is not recorded; only his words are.

## 14. L4, the play screen: ruled 1 October 2026

**The proposal's five points.** Each was put with a recommendation, and Shantanu answered:
*"Agree with the steps please proceeed"*. It is read as agreement to all five, and he was told it
was read so.

1. **Built in place; the server keeps today's app.** The present screen's drawing is replaced piece
   by piece, so there is one play screen and one set of tests throughout. From the first merge of
   L4 until the other screens are done at L5, `main` is a mix of two looks and **is not deployed**.
   A fix to the live app in that time is made from the commit that is deployed.
2. **The hints and the first-game coach are switched off from L4, not redrawn.** The guided game
   replaces them at L6. So the new look does not reach the server before L6.
3. **No words on the board.** Organ and route names and step numbers leave it; each name is its
   picture's label and is said on its card.
4. **The board, the organs and the ways in are new art**, shown on the kit page before the play
   screen depends on them.
5. **Five pull requests in this order**, one at a time, each played on his phone: the board,
   standing still; the frame and the panels; motion and sound; the camera; measured on the S25 and
   tidied.

### Built: the board, standing still (the first of the five)

**The art**, made in Blender and held to the same gate as the pieces.

- `tools/art-pipeline/clay/board.py` renders the board itself: its routes, branches, steps, lymph
  nodes and bloodstream, each where `geometry.json` says, and nothing that moves.
- `clay/pieces.py` gains a coin for each of the seven organs and the six ways in, and the piece for
  a pathogen new to the body: a pale lump with a question mark, wearing none of the six class
  colours, because its antigen matches none of them. It also stands for anything the game is hiding.
- The pictograms on the coins moved into the pipeline (`clay/pictograms.ts`), since the prototype
  that drew them is removed at the end of L4.
- 65 pictures as 195 files, 1.4 MB, of which the board draws 42.

**What the gate holds, added here.** Controls for each were fired.

| What | Held to 3:1 | Measured |
|---|---|---|
| An organ's coin | Its cream pictogram against the coin's own face | 3.61 to 4.60 |
| A way in's coin | Its dark pictogram against the coin; the coin against the board | 6.59 to 7.04; 8.5 |
| The unknown piece | As an invader; and its question mark against its body | 5.89 and 8.19; 5.80 |
| The board's routes | The faintest of them against the board's own ground | 4.44 |
| Its branches, steps, lymph nodes | The same | 5.31, 7.51, 6.75 |
| The bloodstream's rim | The same | 3.46 |
| The board's ground | Against the swatch the pieces were measured on, within 1.15:1 | `#1a4549` and `#1c484d` |

The pictogram is found in the finished render with its own shape, laid where Blender laid it. A
shape in the wrong place mixes the two colours and reads lower, so it cannot pass a coin that
should fail.

**What measuring changed, before it was built on.**

| Measured | Found | Changed |
|---|---|---|
| A cream pictogram on the organ coins of the L1 picture | A coin cannot be both 3:1 against the dark board and 3:1 under a cream pictogram, except in a sliver. The lungs read 3.15 and the marrow 3.16 | What must be read is the pictogram: it is held against its coin and against the board. The lungs and the marrow are darker: 3.73 and 3.77 |
| The board's steps | 5.33, the colour of a lane: each lane ran over its steps, so a step was a dot with a line through it | The steps stand taller than a lane is thick: 7.51 |
| A number on a piece in the bloodstream | Laid over the cell, the number was larger than the cell | A number hangs on a piece's edge; for a cell in the bloodstream, outward, on the rim |
| What the phone stores to play offline | The proposal said about 1.2 MB, from the build tool's own line. That line leaves the art out. Measured from the files it was 1.62 MB | With the board's 42 pictures it is 2.14 MB |

**The board on the page**, `packages/ui/src/board/ClayBoard.tsx`, in place of the SVG board.

- **It decides nothing.** What stands where, what a tap means and what is offered are the same
  working parts as before; the old drawing was cut out of `Board.tsx`, which keeps the model.
- **One piece is one kind in one class.** A piece's colour says its antigen class, so one piece
  cannot stand for an enveloped virus and a naked one. Two classes of a kind on a step are two
  pieces, each with its own count. Before, a step's invaders were gathered by kind alone.
- **No words on it.** Numbers only: how many a piece stands for, and the turns until a spent cell
  is back.
- **An organ's health is an arc of segments.** One it has is thick and coloured; one it has lost is
  a thin pale line. The count is carried by shape, and the colour repeats it.
- **The bloodstream is still a zone:** what invades is gathered at its centre, your cells ring it.
- **A legal move glows gold, a hop along the lymph blue, an attack is ringed in coral.**
- **The bloodstream is drawn 53 units across its rim; the print's is 50.3.** Every position is the
  content pack's; only the dish's drawn size differs, as in the picture he picked.

**Seen, in a headless phone-sized browser on the PC:** a real game walked from the title to the
command stage: 43 pictures drawn, none broken; 7 cells, 7 residents, 7 organs, 6 ways in; 13 legal
moves for the Monocyte. On the kit page, real taps by position: a tap on a cell rings it, a tap
12 px off it still does, a tap on bare board clears it. At 200% text the page is 360 px wide.

**The hints and the coach are off**, as ruled, in the app's shell. **Switching them off found a
false note.** The play screen's own comment said that leaving two inputs out turned hints off. It
did not: every hint still showed. The walk's list of buttons had a hint's button in it after the
switch, and that is what said so. The play screen now does what its comment says.

**A masked pathogen's name no longer reaches the page.** The hook the drivers find an invader by
carried the first six letters of its disease, "Pathog" for one the game was hiding. Nothing showed
it, and anyone who looked could read it. It carries the kind now.

**Controls added, each fired:** `clay-page-and-blender-agree`, `clay-every-disease-has-a-picture`,
`clay-no-words-on-the-board`, `clay-board-art-in-the-worker`,
`clay-board-read-where-geometry-says`; and in the gate's own set, a coin whose pictogram is its
face's colour, a board with nothing drawn on it, and a board that is not the pieces' ground. One
control was wrong on its first run: it asked that a blank coin fail for one reason only, and a blank
coin fails for two.

**Not done here, and known.**

- **The bloodstream is crowded.** Seven cells in it are each about 11 px across on the phone. That
  is the size the old board drew them at, and it is small. The camera, the fourth pull request, is
  what moves in on it.
- **The organs still fly in from the old planning picture.** At "Command your cells" the old organ
  icons travel to the board and land on the new coins. The planning screen is redrawn at L5.
- **The look is a mix:** the board is Clay, and everything round it is not yet.
- **Not measured:** the frame rate, and anything on the S25. Both are the fifth pull request's.
- **The accessibility audit was not run.** It walks the old screens, and is aimed at the new one in
  the fifth pull request.

### Built: the frame (the second of the five, its first half)

**The frame of the play screen is drawn from the kit**, `packages/ui/src/play/Frame.tsx`, on the
table's dark ground out to the screen's edges. What each part is given, and the hooks the drivers
and the audit find it by, are as they were.

- **Top:** the turn; the Action Points as gold pips, as many lit as are left; what is in force, as a
  chip; the messages and the menu as cream buttons.
- **The selected piece's card:** its picture on its base, its name (which opens its card), Undo, and
  its actions two abreast. **Mint is what the piece can do now. Flat and grey is what it cannot, and
  a press on it says why. Cream is everything else.**
- **Bottom, in one row, as in the picture he picked:** the three views' tiles, each a picture over
  its word, and beside them the stage's one coral button.
- **The spread's line** is said straight onto the table, with a die that hit in coral.

**What is not redrawn yet stands on a sheet of the old paper:** the Cells, Antibodies and Body
views, a tapped step, the Action Points' terms, what is in force in full, the new cards and
planning. Its words keep the contrast they were measured at. Each sheet goes as its view is redrawn:
the views in the second half of this pull request, the new cards and planning at L5.

**The one close has a second place to be drawn.** With the tiles and the button in one row, the
close that floats across the bottom of the screen covered the tiles, so a view could not be changed
without closing first. A view opened in the middle now has its close drawn where the stage's one
button was: the same close, with the same word and hook, beside the tiles. What is drawn over the
whole screen (a card, the messages) still has the floating one. `nav/stack.ts` says which.

**Measured, in a headless browser on the PC at the S25 tab's size, 360 by 641.**

| Measured | Found | Changed |
|---|---|---|
| The room left for the middle | 162 px, and the card with one row of actions needs 162. With the tiles in a row of their own it was 100 | The one row is kept. Two rows of actions scroll |
| "Tap to continue", beside the tiles | Two lines, and a taller row | The tiles are not drawn while a spread plays; they could not be pressed then |
| The middle with the text at 200% | 25 px of a screen: the bars above and below had grown round it | The board gives way before the middle does. The middle has 160 px; the page is still one screen tall and no wider than the phone |
| Controls under 44 px, at rest and at 200% | None | |
| The screen left alone for two seconds, at each of seven stages | No layout and no style work at any of them; 1 ms of script in all | |

**Not measured:** the frame rate, and anything on the S25.

**The kit's button carries more:** the hooks and labels a screen's control needs, and a way to be
drawn unavailable and still take a press. **Controls added, each fired:**
`frame-flat-action-still-answers` (the frame's actions made unavailable the kit's plain way: the
test fails saying a flat action cannot be pressed) and `frame-pips-show-what-is-left` (every pip
lit: it fails naming the count).

**The scripts that walk the game hung for minutes at their last line.** It was the browser being
closed, with everything already measured and written; the page itself was idle. They now end
without waiting for it.

### Built: the panels (the second of the five, its second half)

**Everything the play screen opens is drawn from the kit.**

- **In the middle, each on a card:** the Cells, Antibodies and Body views, a tapped step, the Action
  Points' terms, what is in force, and a row's several targets.
- **Over the whole screen:** the pathogen's card and the cell's card, the messages and the table,
  the dialogs, the menu, and the floating close.
- **A piece is its Clay picture everywhere:** on its base in the Cells view and on a tapped step,
  and at an angle at the head of its card, in the colour of its antigen class.
- **Each antibody class's chip carries a dot of that class's own colour,** the content pack's,
  which is the colour the pieces of that class wear on the board. An antibody matches a class; the
  dot is how the two are seen to belong together.
- **One of several is chosen by shape as well as colour:** pressed in and ringed.

**Still on the old paper, for L5:** the new cards and planning. **Not redrawn, and not on the old
paper:** the notices for a lost connection and a save that failed, which have their own grounds and
read as they did; the hints and the coach, which are off.

**A redrawn file may name no colour of its own.** The kit's colours are few and named, and every
pairing of them that carries words or marks a control is measured, 45 pairings now. A colour written
straight into a screen is outside that. `play/clayColours.test.ts` reads the 20 redrawn files with
their comments taken out and fails on the first `#rrggbb` it finds, naming the file and the colour.
The one exception is the old paper's own two colours, written where that sheet is, and it goes at L5.

**Measured, in a headless browser on the PC at 360 by 641.**

| Measured | Found |
|---|---|
| Seven views (cells, antibodies, the body, the Action Points' terms, the messages, the menu, a cell's card), each open, at rest and with the text at 200% | The page one screen tall and 360 px wide at all fourteen; nothing wider than the phone; no control under 44 px |
| What the phone stores to play offline, from the files | 2.69 MB in 311 files, up from 2.14: the pieces as a card shows them, at every size |
| Pictures on the cards, sheets and views walked | None broken |

**The check was wrong on its first run, and its own list said so.** It printed, beside each reading,
which view was open. At 200% the cell's card read as nothing open: the script had pressed the
selected cell a second time, which lets it go, so there was no card to measure. The reading was of
the bare screen and would have passed. It now presses the cell only when none is in hand.

**Not measured:** the frame rate, and anything on the S25. **Not run:** the accessibility audit.

**Control added, and fired:** `play-screen-colours-are-the-kits` (one old colour written into a
redrawn panel: the test fails naming the file and the colour).

**Found when the audit was run, and fixed on this branch: with no network the app came back as a
blank page.** The kit's components, now used by the play screen, were built into a script named
`kit-…js`, and the exclusion written at L3 to keep the kit page off a phone matched it by name. The
build test passed, because it forbade anything named `kit` and never required what the app needs.
The kit page's own script is now named `kitPage`, and the build test follows the app's page to every
script it needs and requires each one stored; control `app-scripts-in-the-worker` puts the old
exclusion back and sees it fail. [`FINDINGS.md`](FINDINGS.md) #109. It was never on `main`.

### Played on his phone, 1 October 2026: the board, the frame and the panels

Shantanu played the first two pull requests on his S25 and said: *"Plays very smooth, happy to
proceed for the moment, there are ux improvements to be done but I want to do thay later after this
is deployed on our online server."*

- **The first two are played**, as ruling 5 asks of each. This is not Gate 2, and he did not say it
  was.
- **There are improvements to how it is used that he has not named yet.** They are his to name, and
  he has put them after the look is on the server. Nothing was changed for them here.
- **"Smooth" is his eye on his phone, not a measurement.** The frame rate on the S25 is still the
  fifth pull request's to read.
- **When the look reaches the server is not changed by this.** Ruling 2 stands: not before L6,
  because the hints and the coach are off until the guided game replaces them.

### Built: motion and sound (the third of the five)

**The board plays what changed.** The engine hands over states, not events, so each time the board
is drawn the picture is compared with the one before, in `packages/ui/src/board/changes.ts`, and
what differs is named and played with the kit's motions.

| What changed | What the board plays | The sound |
|---|---|---|
| A piece went to another step | It hops there from where it was | move |
| A piece was only nudged aside to make room | It slides, and does not hop | none |
| A piece is new to the board | It arrives | arrive |
| A group multiplied where it stands | It swells, and settles | arrive |
| A pathogen is gone from a step one of your cells stands on | It shrinks into the cell, which swells | engulf |
| A pathogen is gone and no cell was on its step | It shrinks away | tap |
| The same invaders are now coated | The coated picture snaps on | coat |
| An organ lost health | Its coin flinches | hurt |

- **One sound for a picture.** A spread can change a dozen things at once, and a dozen sounds is a
  noise. The picture gets the sound of what matters most in it: an organ hurt, then a swallow, then
  a coat, then an arrival, then a step.
- **A piece is always drawn where the game says it is.** The motion is only how it got there. One
  cut short, or a phone that asks for less motion, leaves the board right; with less motion nothing
  travels at all.
- **The first picture a board is given plays nothing:** nothing has happened yet.
- **A tap on a piece or a step answers at once** with the tap. A tap on a legal move does not: what
  it did is heard when the board changes.
- **The game's last sound** is the win or the loss.
- **Who is who.** One of your cells keeps its name from picture to picture. A piece that stands for
  invaders does not: its name has its step in it, so a group that walks a step has a new name.
  Followed by name, it would be one piece fading out and another popping in. It is followed by the
  invaders it stands for.

**Two things added to the kit, which he has not seen there.** A ninth motion, a slide, for a piece
that is only making room; and a way to play one motion over another, so that a cell that swallows
while it slides to the middle of its step does both, and does not jump.

**The kit page's board can be changed,** one thing at a time, by buttons under it, so that each of
these can be seen and heard on the real board: the buttons only hand it a new position.

**Seen, in a headless browser on the PC.** It reads which motions the page started and which sound;
it has no ears and no eyes.

| Done | The board played | The sound started |
|---|---|---|
| In a game: the Monocyte moved out of the bloodstream | The Monocyte hopped (450 ms); the six cells left in the ring slid (320 ms) | move |
| In a game: the turn ended, in two runs | In one, a later beat of the spread moved a virus a step, and it hopped; in the other nothing on the board changed | the end of the turn; then move, in the run where the virus moved |
| On the kit page: the Monocyte engulfs a coated bacterium | The Monocyte swelled; the bacterium shrank into it and was then taken off the page | engulf |
| A coat, an arrival, an advance, a hurt organ | Each its own motion | coat, arrive, move, hurt |
| The same with less motion asked for | Only fades of 180 ms; nothing travelled | the same sounds |
| The play screen left alone for two seconds, at seven stages | No layout, no style work, no script | |

**The check was wrong on its first run, and its own list said so.** It pressed Engulf after moving
the Monocyte away, when there was nothing left to engulf, and the line read "played: nothing, sound:
none". The order was the check's mistake, not the board's.

**Not measured:** the frame rate while these play, which is the fifth pull request's, on the S25.
How any of it looks and sounds is his to judge.

**Known, and left.** A new arrival's sound is heard while the new cards cover the board, because
the board behind them is where it arrives. A kill from a distance has no sound of its own among the
ten, and uses the tap.

**Control added, and fired:** `board-motion-follows-the-invaders` (the comparison made by a
piece's name: the test fails saying a group that walked a step came out as an arrival and a leave).

### Built: the camera (the fourth of the five)

**There is no camera.** The board's own element is drawn larger and shifted, one transform, eased
over half a second. `packages/ui/src/board/camera.ts` is the arithmetic: given what just changed,
which part of the board should fill the play area.

| When | What it does |
|---|---|
| The player is choosing, and a piece only moved | Nothing. It stays wide |
| The player is choosing, and something was swallowed, coated, killed, or an organ was hurt | In, to 1.3 times, on where it happened. Wide again 0.9 s later |
| The spread is playing, and a beat changed something | In, to 1.8 times, on what changed. It follows each beat, and goes wide 1.3 s after the last |
| What changed is spread across the whole board | It stays wide |
| A finger touches the board | Wide at once |
| The phone asks for less motion | It never moves |

- **Why a plain move is left alone.** The plan's rule is that it moves in "on the action being
  taken". Moving a piece is the commonest thing a player does and needs no explaining; a board that
  leaned in after every step would never hold still. This is a reading of the rule, and his to
  overrule when he names what he wants changed.
- **It never shows what is not board.** The part shown is kept inside the picture, so moving in on
  an organ at the rim does not bring the empty table in from the side.
- **A tap is read where the board is drawn at that instant,** so a tap while it is in, or on its
  way back, still lands on what the finger touched.
- **In the bloodstream the pieces are 1.8 times larger while it is in:** about 20 px each where they
  were 11. That is the answer the proposal gave for the crowded bloodstream, and it applies only
  while the spread plays or just after an attack there.

**The board's picture, measured before a size was chosen,** as the proposal said it would be.

| The board's picture, as WebP | Size |
|---|---|
| 1,200 px across, what was drawn until now | 84 KB |
| 1,600 px | 121 KB |
| 2,000 px | 162 KB |
| 2,400 px | 214 KB |

At 1.8 times on a 360 px phone with three device px to one, the board is 1,944 px across. **2,000 px
is chosen:** one px of picture to one of screen at the furthest it goes in. The pieces' pictures
were already large enough. What the phone stores to play offline is 2.86 MB, up from 2.69.

**Seen, in a headless browser on the PC.**

| Done | The camera |
|---|---|
| On the kit page: a plain move | Wide |
| An engulf | In at 1.30 times after 0.65 s; wide again by 1.85 s |
| A hurt organ, then a tap on the board | In at 1.30 times; wide after the tap |
| A hurt organ, with less motion asked for | Wide |
| In a game: the spread's "The march", and "Bacteria divide" | In at 1.80 times; wide after the spread |
| At every reading | The board covered the whole play area |
| The play screen left alone for two seconds, at seven stages | No layout, no style work, no script |

**Not measured, and it is the thing the proposal named as the risk:** the frame rate while the
camera moves, on the S25. Stage L2 measured pieces moving, not the whole board being enlarged. If
it cannot hold 60 there, the camera is cut back; a GPU canvas is not added.

**Control added, and fired:** `camera-keeps-the-board-in-view` (the keeping-in taken off one axis:
the test fails naming an organ).

### Built: the measuring page, and the audit re-aimed (the fifth of the five, before the phone)

**The numbers are in [`LOOK_L4_MEASUREMENT.md`](LOOK_L4_MEASUREMENT.md).** The S25's table there is
empty: running it is his step, and this pull request waits on it.

**The measuring page,** `/measure.html`: the play screen itself, the one the app mounts, with a
card over it and a Measure button. Pressed, the page plays three turns of one real game by pressing
the screen's own controls, watches each spread at the ruled pace, and counts the frames the phone
gives it. It says how many were slow, how slow, when in the run the slowest five came, and counts
on their own the frames in which the camera was moving or in. It takes the place of the L2
prototype, whose frame timer it carries over. `pnpm look:frames` opens the same page on the PC.

- **A slow frame is 20 ms or more,** as at L2, so the two measurements can be read side by side.
- **It says what it played** (moves, spreads, times the camera moved in), and a run that made no
  move, did not end its turns, or never saw the camera move is refused as not reached. A reading is
  of something or it is not a reading.
- **The same game every time:** on this page alone the dice and the cards are drawn from a seeded
  source.
- **A developer's page,** like the kit page: served by the PC, never stored on a phone.

**The accessibility audit is aimed at the new screen,** and run in full, alone and together:
82 screens in each of its four passes (84 in one), nothing not reached, every check at zero,
offline met. Getting there took nine findings, listed in the measurement record in the order they
came. The three that changed the product:

| Found | Changed |
|---|---|
| With no network the app came back blank: the play screen needed a script the phone did not store, and the build test passed | Fixed on the frame's branch, where it began ([`FINDINGS.md`](FINDINGS.md) #109). The build test now follows the app's page to every script it needs |
| Beside six pips the event banner was 36 px wide and 148 px tall, and the top bar three lines high | While a banner is up the Action Points are said as a number. **This changes what he played:** the pips show only when nothing is in force. The banner's words were ruled in September; the pips are this stage's, so the pips gave way. His to overrule |
| At 200% page zoom the top bar, the three tiles and Undo were wider than the page | Each wraps there |

**Left open, and filed:** Settings still offers to show the first-game guidance again, and says the
coach and the hints will appear, which they will not until L6 ([`FINDINGS.md`](FINDINGS.md) #111).

**On the PC, the first time the camera moves in costs two slow frames,** 36 to 54 ms as it starts
and 35 to 37 ms as it arrives, in each of three runs; its five later moves in a run cost none. The
PC is not the phone. It is the thing to look for in the S25's numbers.

**Not done yet, and waiting on the S25:** `tools/look-prototype/` is still here, with `pixi.js` and
`three`. The L2 ruling removes it once the play screen has been measured in its place, and that
measurement is the phone's.

**Controls added, and fired:** `app-scripts-in-the-worker`, `worker-leaves-developer-pages`,
`frame-banner-has-room`; the frame meter's own (`pnpm look:frames --control`: every frame made to
waste 40 ms, and 311 of 311 reported slow); and five lines in the audit for the coach and the hints.
