# The look, stage L2: three ways to draw Clay

A measuring instrument, not app code. Nothing in `packages/` imports it, and it is removed when
stage L2's ruling has been built into the app.

**What it is for.** [`docs/LOOK_PLAN.md`](../../docs/LOOK_PLAN.md) §12: Shantanu picked the Clay
look at L1, and Clay is made of 3D models, so there are three ways to put it on a phone. This page
plays the same recorded turn and the same recorded spread each way and times every frame, so the
choice is made from numbers taken on the Samsung Galaxy S25 and from looking at them side by side.

| Way | What draws the board | What the browser can see |
|---|---|---|
| Pictures on the page | An `<img>` of the board and an `<img>` per piece, moved with CSS transforms | Every piece, as an element |
| Pictures on a GPU canvas | The same pictures as sprites in one canvas (PixiJS) | One canvas |
| Models drawn live | The Blender models themselves, lit and shadowed each frame (three.js) | One canvas |

## What makes the comparison fair

- **One recording.** `record.ts` drives the real engine from two recorded game states and writes
  `src/recording.json`: a calm turn (a recorded Easy game at turn 8) and a crowded board (a
  recorded Hard game with 42 pathogens, 54 by the end). The engine rolls its dice through the
  global `Math.random`, so the recorder seeds it for its own process and the recording is the same
  every time it is made. The seeds are chosen, not sampled: each is the first whose turn shows only
  pathogens the Clay set has models for.
- **One motion.** `src/timeline.ts` turns a recording into "what is drawn at time t": where each
  piece is, how it is squashed, where the camera looks. All three ways are handed the same state
  for the same instant.
- **One timer.** `src/measure.ts` reads the gaps between the frames the browser actually delivers.

## Running it

```
pnpm --filter @immunity-wars/look-prototype build:web
pnpm --filter @immunity-wars/look-prototype preview      # serves it on the local network, port 4180
```

Open the address the preview prints. On the phone, use the one marked Network, on the same Wi-Fi.
**Measure all three** takes about three minutes and ends on a page of numbers. The other buttons
play one way in a loop for looking at, or time your own taps.

On this computer, headless, with the preview running:

```
pnpm --filter @immunity-wars/look-prototype exec tsx drive.ts            # measure
pnpm --filter @immunity-wars/look-prototype exec tsx drive.ts --control  # the frame timer's control
pnpm --filter @immunity-wars/look-prototype exec tsx drive.ts --taps     # ten synthetic taps per way
pnpm --filter @immunity-wars/look-prototype exec tsx drive.ts --taps --control
pnpm --filter @immunity-wars/look-prototype exec tsx drive.ts --shots    # a picture of each way
pnpm --filter @immunity-wars/look-prototype exec tsx weigh.ts            # what each way weighs
```

A number from the computer is a screening figure and must be quoted with the machine it came from.
The measurement L2 is ruled on is the phone's.

## The controls, and why they are here

A check that has never failed is not known to work (`CLAUDE.md`).

- **The frame timer.** `?slow=40` burns 40 ms inside every frame on purpose. `drive.ts --control`
  fails unless every way then reports slow frames.
- **The tap timer.** `?tap=<way>&slow=120` holds every answer back 120 ms. `drive.ts --taps
  --control` fails unless every tap then reads over 100 ms.
- **The model export.** Blender's exporter writes a file with nothing in it, and reports success,
  when asked from a scene other than the one its window shows. `blender/clay.py` switches scene for
  the export and refuses any model under 2 KB.

## Where the art comes from

Everything is made here, with nothing downloaded or bought.

- `blender/clay.py` builds the seven cells, three pathogens (one of them also coated in antibody)
  and the board in Blender, from spheres, cylinders and curves. Its header says what each model
  claims about the real cell. The board's positions are read from
  `packages/content/src/board/geometry.json`, the one source.
- `blender/pictograms.ts` holds the 13 pictograms as SVG and renders them to `blender/tex/`.
- `pack-art.ts` turns Blender's PNG renders into the WebP files under `public/art/`. The PNGs are
  intermediate and are not committed.

## What it does not do

- It does not run the engine in the browser. The engine's own cost was measured at P2.3 and the
  engine has not changed since; a live engine would also give each way a different turn.
- It draws every pathogen in a crowd, packed together. The app will probably show a crowd as a
  stack with a count. Drawing each one is the heavier case, which is the one to measure.
- The surround of the board (turn, Action Points, the cell's panel, End turn) is the Clay style
  frame's, simplified. It is there so the board is judged in its place, and is not the kit.
