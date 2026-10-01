# L4: the Clay play screen, measured

**1 October 2026.** Numbers first; this document rules on nothing. The stage is
[`LOOK_PLAN.md`](LOOK_PLAN.md) §14, its fifth pull request. Two instruments: the measuring page
(`/measure.html`, driven on the PC by `pnpm look:frames`) and the Gate 1 audit
(`pnpm gate1:audit`, [`GATE1_AUDIT.md`](GATE1_AUDIT.md)), re-aimed at the new screen.

## Open

*The S25 was measured the evening this was written, and leads; the PC follows.*

1. **One run, of three turns.** The S25 was measured once. At L2 each way had three runs pooled.
2. **120 frames a second is unmeasured**, as at L2. The phone ran the page at 60, and the line is 60.
3. **In a browser tab, not in the app's own shell.** The plan measures again at L7, in the shell,
   on the finished screens; that is where Capacitor against React Native is confirmed.
4. **The audit is a headless Chrome on the PC.** It measures sizes, colours, layout and what the
   service worker serves. It does not measure a finger, an eye or an ear.
5. **How the screen looks, moves and sounds** is his to judge, and is not measured by anything here.

## The Samsung Galaxy S25, 1 October 2026

Run by Shantanu on his phone at 22:59: the production build served on the home network,
`/measure.html` opened in a Chrome tab, **Measure** pressed once, the phone left alone. Read from
his screenshot of the page's own result.

| | The S25 |
|---|---|
| Browser | Chrome 154 for Android, in an ordinary tab |
| The screen refreshes every | **16.7 ms: 60 frames a second**, as at L2 |
| Played | 9 moves, 3 spreads; the camera moved in 6 times |
| Frames, and how long | 2,324 in 38.8 s |
| Slow frames (20 ms or more) | **6 of 2,324** |
| A frame: middle, 95th and 99th of a hundred, worst | 16.7, 16.7, 16.8, **33.4 ms** |
| While the camera was moving or in | 4 slow of 741; worst 33.4 ms |
| The slowest five, and when | 33.4 ms at 4.9 s; 33.4 and 33.4 at 6.4 s, the camera; 33.3 at 32.2 s, the camera; 33.2 at 18.5 s, the camera |
| Tasks over 50 ms | 0 |

- **It holds 60 frames a second.** 2,318 of 2,324 frames came on time. Each of the six that did not
  missed one refresh: the worst frame of the run is 33.4 ms, which is two refreshes of 16.7. None
  missed two.
- **The camera costs four of the six,** in 741 frames. Two are together at 6.4 s, where the camera
  moves in for the first time in the game; the other two are one each in the second and third
  turns' spreads. The PC had pointed at that first move, and it is there on the phone too, as two
  missed refreshes and not as the 36 to 54 ms the PC drew.
- **What the PC drew at 2.2 s, as the command stage opens, is not among the phone's slowest five.**
  The sixth slow frame is not named by the card; it is 33.2 ms or less.
- **Under the ruling of L2, that a way marginally over is weighed before it is rejected:** six
  single missed refreshes in 39 seconds of play, 0.26% of frames, and he had played the same build
  by hand and called it very smooth. **On this measurement the camera stays as built:** the plan
  cuts it back only if the phone cannot hold 60 with it, and it holds. No GPU canvas is in question.
- **At L2 the prototype, pieces alone, had 0 or 1 slow frame in about 1,700.** The play screen has
  6 in 2,324, with the camera, the frame round the board and the sound. The cost of the whole screen
  over the prototype is that difference, and it is small.

**The card's second line was wrong, and this run is what showed it.** It read *Of them, 33 ms or
more: 1*. The line stood at 33.4 ms, and a frame that misses one refresh arrives at 33.3 ms give or
take the timer's jitter: five frames of 33.2 to 33.4 ms, all the same kind, and the line counted
one of them. It now stands at 41.7 ms, halfway between one missed refresh and two, and says so. By
it the S25's count is 0, read from the worst frame; the PC's column below is restated from each
run's own list of its slowest five. An instrument defect, fixed inline.

**How it is run.** The PC serves the built app on the home network; on the phone, in Chrome, open
`/measure.html` at the PC's address, press **Measure**, and leave the phone alone for about 40
seconds. A phone that has opened the app before shows the app's title for two or three seconds
first and then changes to the measuring page by itself (measured, below).

## The PC: frames

Headless Chrome 154 on the development PC (i7-12700F, RTX 3070 Ti), a 360 × 780 page at 3 device
px to 1, the production build served by `vite preview`, reached from behind the app's service
worker as a phone reaches it. **This is not the phone:** it says the page and its meter work and
what the screen costs here. Three runs of `pnpm look:frames`, each three turns of one seeded game:
9 moves, 3 spreads, and the camera in 6 times.

| Run | Frames | Slow (20 ms or more) | Of them, 41.7 ms or more | Middle | 99 in 100 | Worst | With the camera moving or in: frames, slow, worst |
|---|---|---|---|---|---|---|---|
| 1 | 2,209 in 39.0 s | 5 | 2 | 17.6 ms | 18.6 | 71.2 | 702, 3, 44.8 |
| 2 | 2,205 in 38.9 s | 7 | 1 | 17.6 ms | 18.6 | 53.3 | 704, 2, 36.8 |
| 3 | 2,205 in 39.0 s | 9 | 2 | 17.6 ms | 18.7 | 73.0 | 703, 3, 53.7 |

- **The screen refreshed every 17.6 to 17.8 ms** in this browser, not 16.7: a headless Chrome's own
  pace. So the middle frame is the screen's pace, and a slow frame is one that missed a refresh.
- **Three frames are slow in every run, at the same three moments,** which makes them the screen's
  and not noise:

  | When in the run | How long, in the three runs | What is happening |
  |---|---|---|
  | 2.2 s | 71.2, 53.3, 73.0 ms | The command stage has just opened and the first cell is selected. The two are 0.7 s apart and this reading does not separate them |
  | 6.4 s | 44.8, 36.1, 53.7 ms | The camera starts to move in, for the first time in the game |
  | 7.0 s | 35.6, 36.8, 36.0 ms | The camera arrives, 0.6 s later |

- **The camera's five later moves in each run have no frame of 33 ms or more.** The cost is at its
  first move, at both ends of it. *(The S25, above: two missed refreshes at that first move, and one
  in each later turn's spread.)*
- **No task over 50 ms was reported in any run,** so the three are not the page's script: they are
  the browser drawing. The first is where the board's pictures are first drawn; the other two are
  where the board is first drawn larger.
- The other two to six slow frames of a run are between 20 and 32 ms, at different moments each
  run.

**What this suggested for the phone, written before the phone was measured:** that the first time
the camera moves in might be seen as a hitch. The phone's numbers are above: it is two missed
refreshes there.

**The meter's control.** With every frame made to waste 40 ms, 311 of 311 frames were reported
slow. The counting has its own tests (`packages/app/src/frameMeter.test.ts`).

## The audit, re-aimed at the new screen

The full run: alone and playing together, against a build that talks to a relay on this PC, in a
headless Chrome 154. About seventeen minutes. **These are the numbers of the last run, on the code
that is deployed,** after everything below was fixed and the Settings row was taken off.

| | Base, 360 × 780 | Text at 200%, by font size | Text at 200%, by page zoom (180 × 390) | Text at 200%, by the app's own setting |
|---|---|---|---|---|
| Screens measured | 82 | 82 | 82 | 84 |
| Not reached | 0 | 0 | 0 | 0 |
| Touch targets under 44 px | 0 of 1,030 controls | | | |
| Contrast, words and control edges | 0 of 2,093 text runs | | | |
| Text that did not scale | | 0 of 2,130 | | 0 of 2,159 |
| Layout: wider than the screen, a control off it, or text cut short | | 0 | 0 | 0 |
| Words under a fixed control | 0 | 0 | 0 | 0 |

| Across the run | |
|---|---|
| Where a close lands | 38 paths, 0 wrong, 0 not reached |
| The play area's one height | 338.7 px on 42 screens, in all four stages |
| The main screen without scroll | 22 screens at rest, three of them at 360 × 641; none scrolls |
| Offline | Met: a turn played with the network cut, the page reloaded with no network, a turn played again; 45 pictures on the screen, none broken; no request failed |
| The audit's own controls | 51, each firing or passing as it must |
| The coach and the hints, ruled off | Looked for at the two places they used to show, in every pass: not showing |
| Settings' offer to show them again | Looked for in every pass: not there ([`FINDINGS.md`](FINDINGS.md) #111) |

## What the audit found on the new screen, in the order it found it

1. **It did not finish.** Given ten minutes, it printed nothing: the report comes only at the end,
   and a full pass takes longer than that now. It has a `--progress` flag, which names each screen
   as it is measured.
2. **With no network, the app came back as a blank page.** The play screen needed a script the
   phone did not store, and the build test passed. Fixed where it began, on the frame's branch:
   [`FINDINGS.md`](FINDINGS.md) #109. It was never on `main`.
3. **The banner had no room.** Beside six Action Point pips the event banner was 36 px wide and
   148 px tall, a letter or two to a line, and the top bar was three lines high. While a banner is
   up the points are now said as a number: the banner's words were ruled in September and the pips
   are this stage's. The banner is 120 px wide and the bar 44 px tall. **This changes what he
   played:** the pips are there only when nothing is in force.
4. **At 200% page zoom, 70 layout findings on 26 screens:** the top bar, the three tiles and Undo
   were wider than a 180 px page. The turn and the Action Points now take a line each there, the
   tiles wrap, and Undo goes under the name. The bar is three lines high at that zoom, which the
   rulings allow as the last resort.
5. **Four screens were reported not reached, and none was missing.** The coach and the two hint
   screens are off by ruling; the walk looked for a legal move as the dashed circle it used to be.
   The walk now records that the coach and the hints are not showing, and finds the move by its
   new hook.
6. **The inspect sheet was not reached in one pass.** It was tried once, on the first turn, and
   the deal decides whether a tap opens it. It is now tried on every turn until it opens.
7. **Offline read "not met" on a build that played offline cleanly.** The one failed request was
   `/favicon.ico`, a file the app has never had. The browser now asks for it again in the middle of
   play (measured: at the first press that makes a sound), which it did not on `main`. The app's
   pages say they have no icon; the real one is Phase 4's.

And two found by using the measuring page as a phone would, before the phone was asked to:

8. **A tap on Measure did nothing.** A game opens on a dialog, and the dialog covered the top bar
   the button was in. The button is on a card of the page's own.
9. **On a phone that has opened the app, the measuring page opened as the app's title,** and so
   did the kit page. The app's service worker answers any page it does not store with the app's
   own. It now leaves these two to the network. A phone with the old worker shows the title for
   about two seconds and then changes by itself: measured, 3.6 s from opening the page to the
   measuring page, with an old build's worker in control.

## Controls added, each fired

| Control | What it changes | What must then fail |
|---|---|---|
| `app-scripts-in-the-worker` | Puts the old exclusion back | The build test, naming the script the phone would not store |
| `worker-leaves-developer-pages` | Takes the worker's exception out | The build test: the worker answers a developer's page with the app |
| `frame-banner-has-room` | Draws the pips beside a banner again | The frame test: the banner has no room |
| `pnpm look:frames --control` | Wastes 40 ms in every frame | The run must report slow frames: 311 of 311 |
| In the audit, five lines | A coach planted on the page, and taken away | The check must see it, and then see none |
