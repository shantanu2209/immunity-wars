# P2.3 — the screening measurement

**19 August 2026.** Numbers first; rulings second — this document interprets nothing.

**Two things these numbers cannot say, stated before any figure appears — the same discipline
as Task E's censoring table.** First, **no low-end handset has been measured.** Every number
below is a *screening* figure from a development PC; CPU throttling slows the CPU but not
memory bandwidth or storage and cannot reproduce thermal throttling, so it errs **optimistic**.
The §4 *deciding* pass — a real 2–3GB, ₹6–8k-class Android device — has not happened, and until
it does, locked decision #1 (Capacitor vs React Native) is not resolved by anything here.
Second, **the slice is the board plus the spread, not the full UI.** Panels, log, hand, dialogs
do not exist yet, so every redraw figure below is a **lower bound** on the final UI's work.

---

## Conditions

| | |
|---|---|
| Device | 12th Gen Intel Core i7-12700F, 20 threads, Windows 11 — a development PC |
| Browser | headless system Chrome, CPU throttling via CDP `Emulation.setCPUThrottlingRate` |
| Server | Vite dev server (development React build, unminified) |
| Driver | `tools/perf/measure.ts` — orchestrates only; every number is read from the page's own clock (`window.__iwMetrics`, `packages/app/src/metrics.ts`) |
| Game | Training difficulty, through `LocalSession` against the real engine |
| Samples | per throttle level: 3 fresh page loads · 24 selection taps · 4 full turns of real spreads |

## What each number is — two instrument corrections, recorded

- **busy (ms)** — §4's budget metric: **main-thread work** for the redraw. Taps: a 0ms timer
  probes when the synchronous render+commit releases the thread. Frames: the render runs under
  `flushSync` and is timed directly.
- **to-paint (ms)** — wall time to the paint after the commit (double-rAF). It carries a
  **floor of ~2 compositor frames (~33ms at 60Hz)**: it includes waiting for vsync, not only
  work. Reported for context; do not read 32ms here as 32ms of work.
- Both corrections came from this instrument's own first runs: wall-to-paint read ~32ms at 1×
  *and* 6× throttling (the vsync floor, not a measurement), and the first busy-probe read 0.1ms
  for a full-board redraw because React renders timer-driven updates in a scheduler task that
  raced the probe. Each fix is commented at the code it corrects.

---

## Row 1 — initial full-board render *(§4 budget: under 1s)*

Module load to painted board, three fresh loads per level (first load after browser launch is
the coldest).

| device · throttle | load 1 | load 2 | load 3 |
|---|---|---|---|
| i7-12700F · 1× | 32.7ms | 23.3ms | 23.1ms |
| i7-12700F · 4× | 141.1ms | 95.3ms | 29.2ms |
| i7-12700F · 6× | 131.9ms | 113.7ms | 46.4ms |

## Row 2 — tap → visible response *(§4 budget: under 100ms)*

The real tap: a cell selection through `session.setSelection` — the view is a function of
(game state, selection) — with the whole tree re-rendered **unmemoised, deliberately** (the
plan forbids pre-emptive memoisation precisely so this number is visible). n = 24 per level.

| device · throttle | busy p50 | busy p95 | busy max | to-paint p50 | to-paint p95 | to-paint max |
|---|---|---|---|---|---|---|
| i7-12700F · 1× | 3.1ms | 3.4ms | 3.7ms | 32.1ms | 32.4ms | 32.4ms |
| i7-12700F · 4× | 12.5ms | 14.9ms | 19.3ms | 31.2ms | 33.6ms | 36.2ms |
| i7-12700F · 6× | 22.7ms | 29.4ms | 31.3ms | 30.9ms | 59.4ms | 60.8ms |

## Row 3 — per-redraw main-thread work during a spread *(§4 budget: under 32ms, ideally 16ms)*

Real `endCommand` bursts at legacy pacing (560/800ms), each frame a full-board render of that
frame's projection, measured under `flushSync`. Engine time is inside these numbers by design —
the slice drives the real engine.

| device · throttle | frames | busy p50 | busy p95 | busy max | to-paint p50 | to-paint max |
|---|---|---|---|---|---|---|
| i7-12700F · 1× | 14 | 3.0ms | 3.7ms | 3.7ms | 21.4ms | 32.7ms |
| i7-12700F · 4× | 14 | 12.2ms | 13.7ms | 13.7ms | 32.1ms | 32.9ms |
| i7-12700F · 6× | 17 | 19.7ms | 22.2ms | 22.2ms | 32.3ms | 43.3ms |

## Long tasks (main-thread blocks over 50ms, whole session per level)

| device · throttle | count | max | total |
|---|---|---|---|
| i7-12700F · 1× | 0 | — | — |
| i7-12700F · 4× | 0 | — | — |
| i7-12700F · 6× | 1 | 75ms | 75ms |

## Invariants during measurement

`burst-tail-authoritative` held on every animated burst at every throttle level: **12/12
tail-assertion PASSes** (3–7 frames per burst). Zero console errors in any run.

## Not measured, so not claimed

The handset row (open, above). The full UI's redraw (lower bound, above). Network-realistic
first load (a dev server on localhost says nothing about it). Memory. Production React build —
these figures are from the development build, which does more work per render than the
minified production build will.

---

## The ruling — added 19 August 2026, by Shantanu, after the numbers above stood alone

**The budget passes at every level, and Capacitor holds. React Native is not needed on this
evidence.** At 6× — the harshest screen — initial render has ~8× headroom, tap ~3×, per-redraw
work ~30%. **Recorded as CONFIRMED BY SCREENING, not decided:** the deciding pass on a 2–3GB
handset has not happened, and locked decision #1 stays formally open until it does
([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §4 carries the same words).

Two notes from the ruling that belong beside the numbers:

- **Not memoising pre-emptively was the right call, and it is now measured rather than
  argued.** The unmemoised full-tree re-render — the number that would have justified premature
  memoisation — is 22.7ms p50 at 6× on this device. The plan forbade memoising before this
  number existed precisely so it could be seen; it was seen, and it fits.
- **Row 3 is the row to watch, and its re-measure is EXPECTED, not optional.** 22.2ms max
  against a 32ms budget is ~30% headroom on a slice that is board plus spread only — no panels,
  no log, no hand, no dialogs. That margin is what the rest of the UI will spend. **When the
  full UI lands (P2.5), row 3 is re-measured with this same instrument before Gate 1 is
  claimed.**

*Instrument: `tools/perf/measure.ts` against `packages/app/src/metrics.ts`. Raw JSON for this
run is reproducible with:*

```
pnpm --filter @immunity-wars/app dev
npx tsx tools/perf/measure.ts http://localhost:5173 1,4,6 out.json
```

---

## Added 5 September 2026 — a new tap shape, and a BUDGET BREACH stated as one

**Row 2's budget is exceeded at 6× by the command tap from the planning screen. Exceeded,
not "noted": 109ms busy against the 100ms row.** Found while measuring item 12's organ flight
(block e; the flight itself is +2–6ms and is not the cause — `for-P2.5.md`, "step 5").

**What was measured.** The same conditions as above (i7-12700F, headless system Chrome, CDP
throttling, the dev shell, Training through `LocalSession`), a fresh instrument channel
(`__iwMetrics.transitions`), the tap being "Command your cells" on the planning screen — the
tap that ends planning and shows the board. Busy time is main-thread work from the tap until
the board's commit yields, the row 2 probe. Five taps per arm; the 6× arm with the flight
rerun at eight.

| device · throttle | flight | busy p50 | busy p95 | to-paint p50 | row 2 budget |
|---|---|---|---|---|---|
| i7-12700F · 1× | off | 12.0ms | 13.0ms | 28ms | within |
| i7-12700F · 4× | off | 62.9ms | 70.7ms | 94ms | within |
| i7-12700F · **6×** | off | **109.1ms** | 112.0ms | 135ms | **EXCEEDED** |
| i7-12700F · 6× | on | 115.1ms | 165.2ms | 125ms | exceeded |

**Why it is different from row 2 above, and why the breach is accepted for now.** Row 2 was
measured on **selection taps** on the play screen — a cell highlighted, the view rebuilt, the
same board redrawn — and the budget was set against that screen before any other existed. The
command tap is a **screen switch**: the planning screen (item 12, built after the budget was
written) is unmounted and the whole board — its lanes, its annotations, every token — is
mounted from nothing. That is closer to row 1 (the initial render, budget 1s, measured here at
46–132ms at 6×) than to a selection tap, and it did not exist when row 2 was written. The
argument is made explicitly so the closeout can show that we knew, why we accepted it, and
what closes it — not left as an implication in a note.

**The named fix.** Keep the board mounted and hidden while the planning screen shows, so the
command tap is a visibility toggle and the board's redraw for the new turn, not a mount — at
the cost of the board's memory and its render on every draw. An alternative is to mount the
board behind the planning screen's own paint (a deferred mount during planning). Either makes
the tap a row-2 tap again.

**The point at which it must be RESOLVED, not re-deferred: the mandatory full-UI per-redraw
re-measure** ([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §4, row 3's note, "expected, not
optional"). That pass re-measures this tap with the fix in place, or states the shortfall in
the closeout in the brief's own words — but it does not carry the breach forward as an open
note a third time.


## Added 6 September 2026 — THE MANDATORY FULL-UI PER-REDRAW RE-MEASURE, and the breach RESOLVED in part

**What was measured.** The same instrument as the screening pass (i7-12700F, headless system
Chrome, CDP CPU throttling; `tools/perf/measure-full.ts`, `pnpm perf:full`) against the DEV
SHELL, which mounts the FULL play screen — the effects strip, the command bar with its rows and
AP terms, the piece grid, the antibody, body and log panels, the planning screen, the reveal
and the goal dialog — at 360 × 780. Per throttle level: three fresh loads (row 1), 24 board
selection taps (row 2), four full turns with their spreads (row 3), and the COMMAND TAP once per
turn ("Command your cells" on the planning screen, `__iwMetrics.transitions`). Every number is
the page's own clock. Optimistic by construction, like the screening pass.

**The first run found a SECOND breach.** Row 3 — per-redraw main-thread work during a spread,
under 32ms — measured **59.7ms at p50 at 6×** (p95 67.6, max 74.3) and 38.3ms at 4×, against
19.7ms at P2.3 on the thin slice. The board alone was not the cost: every frame of a spread was
React state on the play screen, so every frame re-rendered the strip, the bar, the grid and
every panel, none of which change during a burst (they read the authoritative view, which is
held until the burst drains). The brief's §4 note said this re-measure was "expected, not
optional" because row 3's headroom was what the rest of the UI would spend; it spent all of it
and more.

**Resolved, twice, neither touching the mount or the flight.** (1) The frame moved out of React
state into an external store (`packages/ui/src/play/frameStore.ts`) that only the board, the
narration, the log and the shell's controls line subscribe to; the play screen's own state
changes twice per burst. (2) The board's static layers — the routes with their step nodes and
entry annotations, the lymph arcs, each organ's branch, tissue node, icon and label — became
memoised components drawn once per art manifest and skipped per frame; the log's text lookup
is memoised per message. The same elements, in the same order, under the same parents.

| device · throttle | frames | busy p50 | busy p95 | busy max | to-paint p50 | row 3 (32ms) |
|---|---|---|---|---|---|---|
| i7-12700F · 1× · before | 17 | 8.4ms | 9.5ms | 9.5ms | 21.5ms | within |
| i7-12700F · 4× · before | 18 | 38.3ms | 47.4ms | 47.4ms | 44.2ms | **exceeded** |
| i7-12700F · 6× · before | 21 | 59.7ms | 67.6ms | 74.3ms | 71.3ms | **exceeded** |
| i7-12700F · 1× · after | 20 | 4.5ms | 6.7ms | 6.7ms | 32.1ms | within |
| i7-12700F · 4× · after | 18 | 17.7ms | 29.9ms | 29.9ms | 35.8ms | within |
| i7-12700F · 6× · after | 17 | **23.4ms** | 47.2ms | 47.2ms | 35.5ms | **within at p50; p95 over** |

Stated as measured: at 6× the median frame is inside the row with 27% headroom, and the heavy
frames (a dice frame, an organ hit, the frames with the most tokens) still cross it at p95. The
screening pass judged rows at p50 with their headroom, and this row is judged the same way; the
p95 is on the record for the handset pass to weigh, not hidden in a median.

**The other rows, full UI, after:**

| device · throttle | initial render (3 loads) | selection tap busy p50 / p95 | row 1 (1s) | row 2 (100ms) |
|---|---|---|---|---|
| i7-12700F · 1× | 63 / 52 / 36ms | 5.4 / 6.3ms | within | within |
| i7-12700F · 4× | 184 / 194 / 107ms | 23.7 / 31.4ms | within | within |
| i7-12700F · 6× | 292 / 148 / 161ms | 37.6 / 44.2ms | within | within |

**The command tap: STILL EXCEEDED, and its fix STOPS HERE for a ruling.** Busy p50 at 6×:
**121.2ms before today's changes, 119.3ms after** (p95 146; 4×: 78.4ms, within; 1×: 14.7ms).
The frame store and the memoised layers do not help it, as expected: the cost is the MOUNT of
the board and every panel when the planning screen gives way, not a redraw. Both named fixes
change the mount — keep the board mounted and hidden behind the planning screen (the tap becomes
a visibility toggle plus one redraw; the board's memory and its render on every draw are the
price), or mount it deferred behind the planning screen's own paint — and Shantanu's
instruction for this pass was to stop and report before building a fix that changes the mount
or the flight. The flight reads the figure's rectangles at the tap and lands on the board's
icons after the mount; keeping the board mounted moves the landing targets to elements that
already exist, which is a change to the flight's timing that he should see, not inherit.

**Recommendation:** keep the board mounted and hidden (`display: none` or `visibility` on its
wrapper; the memoised static layers now make the extra render per draw cheap), re-measure the
tap, and re-verify the flight lands. The deferred-mount alternative keeps the planning screen
lighter but makes the tap's cost depend on how long the player looks at the plan, which is a
worse number to explain.

**The closeout inherits, in the brief's words:** row 3 within at p50 on the throttled PC with
its p95 stated; row 2's command tap exceeded at 6× pending a ruling on a mount-changing fix;
the handset pass still the deciding one.


## Added 6 September 2026 (late) — the command tap RESOLVED with the mount fix, recorded as resolved with the measurement

**The ruling (Shantanu):** take the mount fix — keep the board and the command panels mounted
and hidden behind the planning screen — and resolve the 109/119ms breach rather than carry it
a third time. Built: the command stage is a `<div data-command-stage hidden={planningActive}>`
around the same children, so the tap that ends planning is a visibility toggle plus the board's
redraw for the new turn; the flight reads its landing rectangles after that commit, when the
stage is visible again; the memoised static layers make the extra render per draw cheap.

**Measured, the same instrument and conditions as the rows above** (i7-12700F, headless system
Chrome, CDP throttling, the dev shell, 360 × 780, four command taps per level):

| device · throttle | busy p50 | busy p95 | busy max | to-paint p50 | row 2 budget (100ms) |
|---|---|---|---|---|---|
| i7-12700F · 1× | 11.7ms | 20.6ms | 20.6ms | 27.3ms | within |
| i7-12700F · 4× | 40.4ms | 48.3ms | 48.3ms | 55.0ms | within |
| i7-12700F · **6×** | **96.4ms** | 97.6ms | 97.6ms | 103.8ms | **within** (was 109.1 on 5 September, 121.2 / 119.3 earlier today) |

**Resolved, not accepted:** the tap is inside the row at every screening level, with 3.6%
headroom at 6× on this PC. That is thin, and it is stated as thin: the handset pass remains
the deciding one, and this row is the first to re-measure there. The other rows in the same
run: initial render 88 / 44 / 18ms at 1×, 159 / 187 / 105 at 4×, 299 / 152 / 186 at 6×
(within 1s); selection tap busy p50 5.5 / 26.2 / 38.7ms; per-redraw work p50 5.3 / 16.3 /
26.7ms (within 32 at every level; p95 at 6× 52.6, stated).

**No breach is carried into the closeout from this screen.** What the closeout inherits is the
handset pass and the p95s named here.
