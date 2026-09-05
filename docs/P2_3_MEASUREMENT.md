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
