/**
 * P2.2 step 6 — the instrumentation P2.3 reads. Numbers on the DEVICE CLOCK, not impressions
 * (PHASE2_BRIEF §4). Everything here is recorded into `window.__iwMetrics` so the measurement
 * driver (`tools/perf/measure.ts`) can collect it over CDP; the page never interprets, it only
 * measures.
 *
 * The three §4 budget rows and where each is captured:
 *   - initial full-board render  -> `initialRenderMs` (module-load to post-mount paint)
 *   - tap -> visible response    -> `taps[]` (pointer handler to the paint after the commit)
 *   - per-redraw main-thread work during a spread -> `frames[]` (frame advance to its paint)
 * plus every long task (>50ms main-thread block), timestamped, so redraw work that overruns a
 * frame is visible even between our own marks.
 *
 * "Paint after the commit" is the double-rAF convention: the first rAF fires before the next
 * paint, the second after it — the closest the page's own clock gets to "visible".
 *
 * TWO CHANNELS PER EVENT, because the first run of this instrument measured the vsync clock by
 * accident: wall-to-paint via double-rAF is quantized to ~2 compositor frames (~33ms at 60Hz),
 * and the numbers came back ~32ms at 1x AND 6x throttling — a floor, not a measurement. So:
 *   - `ms`      wall time to the paint (what a player waits; floor ≈ two vsync intervals)
 *   - `busyMs`  MAIN-THREAD WORK: a 0ms timer scheduled at the start fires only when the
 *               synchronous render+commit has released the thread, so its delay IS the blocking
 *               work (±~1ms timer clamp). This is §4's budget metric.
 */

export interface IwMetrics {
  initialRenderMs: number | null;
  taps: { ms: number; busyMs: number; cell: string }[];
  frames: { ms: number; busyMs: number; label: string; dice: boolean }[];
  /** Block e (item 12 step 5): the command tap's main-thread work with the organ flight
   *  prepared, and how many organs flew (0 = the flight was skipped, e.g. reduced motion). */
  transitions: { ms: number; busyMs: number; organs: number; at: number }[];
  longTasks: { start: number; ms: number }[];
}

const metrics: IwMetrics = {
  initialRenderMs: null,
  taps: [],
  frames: [],
  transitions: [],
  longTasks: [],
};
(globalThis as { __iwMetrics?: IwMetrics }).__iwMetrics = metrics;

const t0 = performance.now();

/** ms from a reference point to the paint after the current commit, via double-rAF. */
export function toNextPaint(from: number, record: (ms: number) => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      record(performance.now() - from);
    });
  });
}

export const markInitialRender = (): void => {
  toNextPaint(t0, (ms) => {
    metrics.initialRenderMs = ms;
    console.log(`[metrics] initial render ${ms.toFixed(1)}ms (module load -> painted board)`);
  });
};

/** Main-thread busy time from `from` until the current task (render+commit included) yields. */
const busy = (from: number, record: (busyMs: number) => void): void => {
  setTimeout(() => {
    record(performance.now() - from);
  }, 0);
};

export const recordTap = (from: number, cell: string): void => {
  busy(from, (busyMs) => {
    toNextPaint(from, (ms) => {
      metrics.taps.push({ ms, busyMs, cell });
      console.log(
        `[metrics] tap busy ${busyMs.toFixed(1)}ms, to-paint ${ms.toFixed(1)}ms (${cell})`,
      );
    });
  });
};

/**
 * Frames pass `busyMs` in directly: the shell renders the frame under `flushSync`, so the
 * synchronous render+commit is measured on the spot rather than probed with a timer — the
 * timer probe raced React's scheduler task from timer-driven updates and under-read.
 */
export const recordFrame = (from: number, busyMs: number, label: string, dice: boolean): void => {
  toNextPaint(from, (ms) => {
    metrics.frames.push({ ms, busyMs, label, dice });
  });
};

/** Block e: busy time is measured by the shell (a 0ms timer after the board's commit). */
export const recordTransition = (from: number, busyMs: number, organs: number): void => {
  toNextPaint(from, (ms) => {
    metrics.transitions.push({ ms, busyMs, organs, at: from });
    console.log(
      `[metrics] transition busy ${busyMs.toFixed(1)}ms, to-paint ${ms.toFixed(1)}ms (${String(organs)} organs flew)`,
    );
  });
};

// Long tasks: any >50ms main-thread block. Buffered so tasks before this module ran are kept.
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      metrics.longTasks.push({ start: e.startTime, ms: e.duration });
    }
  }).observe({ type: 'longtask', buffered: true });
} catch {
  // The entry type is Chromium-only; a browser without it simply records no long tasks.
}
