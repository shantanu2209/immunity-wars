# L2: the three ways of drawing Clay, measured

**1 October 2026.** Numbers first; this document rules on nothing. The stage is
[`LOOK_PLAN.md`](LOOK_PLAN.md) §12, and the instrument is
[`tools/look-prototype/`](../tools/look-prototype/README.md).

## Open, and it leads

> **THE SAMSUNG GALAXY S25 HAS NOT BEEN MEASURED.** Every figure below is from a development PC.
> The plan rules the S25 the one device measured, so nothing here decides L2. The S25's table is
> at the end, empty.

**What the PC's figures cannot say.**

- **They cannot tell the three ways apart on speed.** The PC holds every frame in all three, so it
  shows that the instrument works and that none of the ways is broken, and nothing about which is
  fastest on a phone. A desktop graphics card is not a phone's.
- **They are from a 60 Hz headless browser.** The S25's screen refreshes 120 times a second, so its
  frames are 8.3 ms apart and it has half the time per frame.
- **Heat and battery are not measured at all**, on any device. A three-minute run does not show
  what twenty minutes of play does.
- **The picture is one camera and one board.** The ways were given the same motion to draw. What
  each could do beyond that (the live way's tilting camera, turning pieces) is seen, not timed.

## Conditions

| | |
|---|---|
| Device | 12th Gen Intel Core i7-12700F, NVIDIA GeForce RTX 3070 Ti, Windows 11: a development PC |
| Browser | headless Chrome 154, the real graphics chip (ANGLE on Direct3D 11, read from the page), 60 Hz |
| Viewport | 360 × 780 CSS pixels at 3 device pixels each, the S25's; the board's box 360 × 355, drawn at 3× |
| Served by | `vite preview` of the production build, on the same machine |
| Driver | `tools/look-prototype/drive.ts`: it only opens the page and reads what the page measured |
| What is played | Two recordings made by the real engine (rules 4.1.0): a calm turn, 9 pictures of the game with 2 pathogens; a crowded board, 8 pictures with 42 pathogens rising to 54 |
| Samples | 3 runs of each recording for each way: about 1,700 frames per row below |

## The pass line, and how a slow frame is counted

Ruled 1 October 2026, before any number existed: no frame slower than 16.7 ms through the turn and
the spread; a tap answered within 100 ms; the board drawn within 1 second; all pictures and models
under 10 MB. **Ruled the same day: not a hard rule. A way marginally over is evaluated, to see
whether it can be made to work, before it is rejected.**

**A frame is counted slow at 20 ms or more**, not at 16.7. A screen that refreshes 60 times a second
delivers every frame at 16.7 ms give or take its own timer's jitter, so a line at exactly 16.7 would
call half of a perfect run slow (the worst frames below are 16.9 to 17.3 ms, on a run that missed
nothing). 20 ms is 16.7 plus 3.3 of allowance: on the PC it means a frame was missed, and on the
S25 it means more than two of its refreshes went by. The worst frame and the 99th percentile are
given beside the count so the allowance can be argued with.

## Controls: each timer made to fail on purpose first

| Control | What was done | What it had to show | What it showed |
|---|---|---|---|
| Frame timer | 40 ms burned inside every frame, one run of the calm turn per way | slow frames, in every way | 233 of 234, 234 of 235 and 232 of 233 frames slow; typical frame 33.4 ms. **Fired** |
| Frame timer, unburdened | the measurement below | no slow frame where none exists | 0 slow in all 18 runs. **Stayed quiet** |
| Tap timer | every answer held back 120 ms, ten taps per way | every tap over 100 ms | 154 to 170 ms, against 34 to 51 ms without. **Fired** |
| Model export | read the size of each exported model | geometry in the file | the first export wrote 12 files of about 140 bytes and reported success; found by reading the sizes, fixed, and now refused under 2 KB |

## Frames, on the PC

Milliseconds between frames; 3 runs pooled per row.

| Way | Recording | Frames | Typical | 99 in 100 | Worst | Slow (20 ms or more) | The page's own work per frame |
|---|---|---|---|---|---|---|---|
| Pictures on the page | calm turn | 1,703 | 16.7 | 16.9 | 17.3 | **0** | 0.2 |
| Pictures on the page | crowded board | 1,684 | 16.7 | 17.0 | 17.2 | **0** | 0.6 |
| Pictures on a GPU canvas | calm turn | 1,703 | 16.7 | 17.0 | 17.3 | **0** | 0.2 |
| Pictures on a GPU canvas | crowded board | 1,685 | 16.7 | 16.9 | 17.2 | **0** | 0.2 |
| Models drawn live | calm turn | 1,703 | 16.7 | 16.9 | 17.3 | **0** | 0.6 |
| Models drawn live | crowded board | 1,684 | 16.7 | 16.9 | 17.0 | **0** | 1.0 |

No task over 50 ms was reported in any run. "The page's own work" is the time spent computing what
to draw and telling the way to draw it; for the two canvas ways the graphics chip's own time is not
in it, and shows only in the gaps between frames.

## Loading and size

| Way | First draw, PC, same machine | Code sent | Art sent | Total sent | Art as stored | Memory in use (JS heap) |
|---|---|---|---|---|---|---|
| Pictures on the page | 66 ms | 2 KB | 285 KB | **287 KB** | 285 KB | 3.1 MB |
| Pictures on a GPU canvas | 247 ms | 148 KB | 285 KB | **433 KB** | 285 KB | 7.6 MB |
| Models drawn live | 223 ms | 151 KB | 698 KB | **849 KB** | 2,841 KB | 14.6 MB |

- "Sent" is gzip, as a server sends it; read off the build by `tools/look-prototype/weigh.ts`, not
  from the browser, whose own count depends on what it already had cached. Another 50 KB (the page,
  the recording, the typeface) is shared by all three.
- First draw is from asking for the way to its first frame, its code and art included, with the
  server on the same machine. Over Wi-Fi to a phone it will be longer, and is not yet measured.
- The live way's board model is 1,937 KB of the 2,841 KB, at 48,036 triangles, exported as built
  and not yet lightened. Each piece is 992 to 5,208 triangles and 19 to 156 KB.
- On the crowded board the live way issues 473 draw calls and 388,018 triangles a frame, shadows
  included. The page way has 74 elements, the canvas way 68 sprites.

## Taps, on the PC

Ten synthetic touches per way, from the browser's own timestamp on the touch to the end of the
frame that draws the answer. The screen's delay in showing that frame is not in it.

| Way | Typical | Worst |
|---|---|---|
| Pictures on the page | 42.1 ms | 48.0 ms |
| Pictures on a GPU canvas | 48.2 ms | 49.9 ms |
| Models drawn live | 48.0 ms | 50.7 ms |

At 60 frames a second these are two to three frames, and the differences between the ways are
inside one frame: the PC does not separate them here either.

## What differs between the ways, beyond speed

Facts, each from the prototype as built.

| | Pictures on the page | Pictures on a GPU canvas | Models drawn live |
|---|---|---|---|
| The look | Blender's own render | Blender's own render | The phone's own light: close to the render, but its shadows are harder and no light passes through the clay |
| What the browser sees | Every piece is an element: the accessibility audit and a screen reader can read the board | One canvas: the board needs a parallel description | One canvas: the same |
| A new kind of motion | Slide, squash, fade and scale are free; a piece turning or changing shape needs frames rendered in Blender | The same | Any motion, with no new art; the camera can tilt and move in |
| A new piece | Model it, render one picture | The same | Model it, export it |
| Library added | None | PixiJS, 493 KB as stored | three.js, 601 KB as stored |
| Code in the prototype | 161 lines | 141 lines | 284 lines |
| Lighting is decided | Once, in Blender | Once, in Blender | In Blender for the pictures elsewhere (cards, title) and again in code for the board: two lights to keep agreeing |

## The S25: owed

Run by opening the prototype on the phone and pressing **Measure all three**, then the tap test for
each way. To be filled from the numbers the phone shows.

| Way | Recording | Frames | Typical | 99 in 100 | Worst | Slow (20 ms or more) | Own work |
|---|---|---|---|---|---|---|---|
| Pictures on the page | calm turn | | | | | | |
| Pictures on the page | crowded board | | | | | | |
| Pictures on a GPU canvas | calm turn | | | | | | |
| Pictures on a GPU canvas | crowded board | | | | | | |
| Models drawn live | calm turn | | | | | | |
| Models drawn live | crowded board | | | | | | |
