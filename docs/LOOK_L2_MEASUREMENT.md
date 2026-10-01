# L2: the three ways of drawing Clay, measured

**1 October 2026.** Numbers first; this document rules on nothing. **The S25 was measured the same day and leads; the PC follows.**

> **Ruled on these numbers, 1 October 2026: the board is drawn as pictures on the page.** The
> ruling, and what was accepted and waived with it, is in [`LOOK_PLAN.md`](LOOK_PLAN.md) §12. What
> is listed under Open below was open when he ruled, and stays unmeasured. The stage is
[`LOOK_PLAN.md`](LOOK_PLAN.md) §12, and the instrument was the prototype in `tools/look-prototype/`.

> **The instrument was removed on 1 October 2026**, as the ruling said it would be, once the play
> screen itself had been measured on the S25 in its place
> ([`LOOK_L4_MEASUREMENT.md`](LOOK_L4_MEASUREMENT.md)). It is in the repository's history, last at commit `da7ad3f`, with its
> README. The file names below are its files, as they were.

## The Samsung Galaxy S25, 1 October 2026

Run by Shantanu on his phone: the built prototype served on the home network, **Measure all three**
pressed once, the phone left alone. Read from his two screenshots of the page's own results.

| | |
|---|---|
| Device | Samsung Galaxy S25, Adreno 830 (read from the page: ANGLE on OpenGL ES 3.2) |
| Browser | Chrome 154 for Android, opened as a custom tab from another app |
| Screen | 360 × 780 CSS pixels at 3 device pixels each; the board's box 360 × 355, drawn at 3× |
| Refresh | **every 16.7 ms: the phone delivered 60 frames a second, not the 120 its screen can show** |
| Network | home Wi-Fi, to the PC's `vite preview` of the production build |
| Samples | 3 runs of each recording for each way, pooled; the page was never hidden during the run |

### Frames

Milliseconds between frames.

| Way | Recording | Frames | Typical | 99 in 100 | Worst | Slow (20 ms or more) | The page's own work per frame |
|---|---|---|---|---|---|---|---|
| Pictures on the page | calm turn | 1,705 | 16.7 | 16.8 | 16.8 | **0** | 0.6 |
| Pictures on the page | crowded board | 1,685 | 16.7 | 16.8 | 33.3 | **1** | 2.6 |
| Pictures on a GPU canvas | calm turn | 1,704 | 16.7 | 16.8 | 16.8 | **0** | 0.6 |
| Pictures on a GPU canvas | crowded board | 1,685 | 16.7 | 16.8 | 33.3 | **1** | 0.6 |
| Models drawn live | calm turn | 1,704 | 16.7 | 16.8 | 16.8 | **0** | 2.0 |
| Models drawn live | crowded board | 1,686 | 16.7 | 16.8 | 16.8 | **0** | 4.6 |

- **All three hold 60 frames a second.** Two rows have one slow frame each, and each is exactly one
  missed refresh (33.3 ms) in 1,685 frames, 0.06%. One frame in three runs does not separate two
  ways: the same count appears in the page way and the canvas way, and a single missed refresh can
  be the phone's doing as easily as the page's. Under the ruling that a way marginally over is
  evaluated before it is rejected, these two rows are marginal and nothing in them argues for
  rejection.
- **What does separate the ways is the page's own work per frame**, the time the phone's processor
  spends deciding what to draw and telling the way to draw it, out of the 16.7 ms a frame has:

  | | Calm turn | Crowded board | Share of a 60 Hz frame, crowded |
  |---|---|---|---|
  | Pictures on a GPU canvas | 0.6 ms | 0.6 ms | 4% |
  | Pictures on the page | 0.6 ms | 2.6 ms | 16% |
  | Models drawn live | 2.0 ms | 4.6 ms | 28% |

  The canvas way's work does not grow with the crowd; the page way's and the live way's do. This
  figure leaves out what the graphics chip does afterwards, which shows only in the frame gaps
  above, and those are equal.

### Loading

| Way | First draw, over Wi-Fi | Sent, from the build | Fetched in this visit |
|---|---|---|---|
| Pictures on the page | **109 ms** | 287 KB | 287 KB in 14 files |
| Pictures on a GPU canvas | **413 ms** | 433 KB | 163 KB in 13 files (the pictures were already fetched by the way before it) |
| Models drawn live | **784 ms** | 849 KB | 2,991 KB in 26 files, as the phone counted them |

All three are inside the 1 second line and far inside the 10 MB line. On the crowded board the live
way issued 473 draw calls and 388,018 triangles a frame, the same as on the PC.

**The memory figure is not a measurement.** The phone reported 9.5 MB of JS heap for all three
ways alike. Chrome on Android reports this number coarsely, and three identical readings for ways
whose PC readings were 3.1, 7.6 and 14.6 MB say that it did not resolve them. Memory on the phone
is unmeasured.

## Open

- **120 frames a second is not measured.** *Accepted by ruling: 60 is the target.* The phone ran the page at 60. Whether that was the
  phone's motion setting, a power saving mode, or the custom tab is not known. The pass line was
  ruled at 16.7 ms, which is 60 a second, so the measurement answers the line as ruled; it says
  nothing about how the three would behave with 8.3 ms a frame.
- **Taps were not timed on the phone.** *Waived by ruling: waived, not met.* The tap test was not run there. With every frame arriving
  16.7 ms apart and at most 4.6 ms of the page's own work in each, an answer within two or three
  frames, 33 to 50 ms, is what the PC measured and what these frame times allow; that is an
  inference, not the phone's reading.
- **The ways were not looked at side by side in a loop**, including the live way with its camera
  tilted. Shantanu's reading from the measured run: the three look much the same.
- **Chrome, not the app's shell.** The app will run in a Capacitor web view, which is the same
  engine and was not what was measured.
- **Heat and battery are not measured at all.** A three-minute run does not show what twenty
  minutes of play does.
- **The picture is one camera and one board.** The ways were given the same motion to draw. What
  each could do beyond that is seen, not timed.

## The PC: the screening pass, and the proof that the timers work

Taken before the phone's, on a development PC. **It cannot tell the three ways apart on speed:** it
holds every frame in all three, and a desktop graphics card is not a phone's. What it gives is
proof that the instrument works, each way's size, and what differs between them beyond speed.

### Conditions on the PC

| | |
|---|---|
| Device | 12th Gen Intel Core i7-12700F, NVIDIA GeForce RTX 3070 Ti, Windows 11: a development PC |
| Browser | headless Chrome 154, the real graphics chip (ANGLE on Direct3D 11, read from the page), 60 Hz |
| Viewport | 360 × 780 CSS pixels at 3 device pixels each, the S25's; the board's box 360 × 355, drawn at 3× |
| Served by | `vite preview` of the production build, on the same machine |
| Driver | the prototype's `drive.ts`: it only opens the page and reads what the page measured |
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

- "Sent" is gzip, as a server sends it; read off the build by the prototype's `weigh.ts`, not
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
