/**
 * THE FRAME TIMER. It reads the time between the frames the browser actually gives the page
 * (the timestamps requestAnimationFrame hands out), for as long as one recording plays.
 *
 * What counts as a slow frame: 20 ms or more between two frames. The pass line ruled for L2 is
 * "no frame slower than 16.7 ms" (60 a second), and a screen that refreshes 60 times a second
 * delivers every frame at 16.7 ms give or take its own timer's jitter, so a line drawn exactly
 * at 16.7 would call half of a perfect run slow. 20 ms is 16.7 plus 3.3 of allowance: on a
 * 60 Hz screen it means a frame was missed, and on the S25's 120 Hz screen it means more than
 * two refreshes went by. The raw worst and the percentiles are reported beside the count, so
 * the allowance can be argued with.
 *
 * `?slow=N` makes every frame burn N milliseconds on purpose. That is this instrument's negative
 * control: with it on, slow frames MUST be reported, or the timer is not measuring.
 */
export const SLOW_MS = 20;

export interface RunStats {
  frames: number;
  seconds: number;
  /** Milliseconds between frames. */
  median: number;
  p95: number;
  p99: number;
  worst: number;
  /** Frames that took 20 ms or more. */
  slow: number;
  /** Frames that took 33.4 ms or more: two missed refreshes at 60 a second. */
  verySlow: number;
  /** The page's own work inside a frame: computing the state and telling the way to draw it. */
  workMean: number;
  workP99: number;
  /** Tasks over 50 ms that the browser reported during the run. */
  longTasks: number;
}

function pick(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
}
const round = (n: number): number => Math.round(n * 10) / 10;

export function summarise(deltas: number[], work: number[], longTasks: number): RunStats {
  const d = [...deltas].sort((a, b) => a - b);
  const w = [...work].sort((a, b) => a - b);
  const total = deltas.reduce((a, b) => a + b, 0);
  return {
    frames: deltas.length,
    seconds: round(total / 1000),
    median: round(pick(d, 0.5)),
    p95: round(pick(d, 0.95)),
    p99: round(pick(d, 0.99)),
    worst: round(d[d.length - 1] ?? 0),
    slow: deltas.filter((x) => x >= SLOW_MS).length,
    verySlow: deltas.filter((x) => x >= 33.4).length,
    workMean: round(work.reduce((a, b) => a + b, 0) / Math.max(1, work.length)),
    workP99: round(pick(w, 0.99)),
    longTasks,
  };
}

export const nextFrame = (): Promise<number> => new Promise((r) => requestAnimationFrame(r));

/** Play `durationMs` of animation, calling `draw(t)` once per frame, and time every frame. */
export async function playOnce(durationMs: number, draw: (t: number) => void): Promise<RunStats> {
  let longTasks = 0;
  const observer = new PerformanceObserver((list) => {
    longTasks += list.getEntries().length;
  });
  try {
    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    // the browser does not report long tasks; the frame times still show them
  }
  const deltas: number[] = [];
  const work: number[] = [];
  const start = await nextFrame();
  let last = start;
  for (;;) {
    const now = await nextFrame();
    deltas.push(now - last);
    last = now;
    const t = now - start;
    const w0 = performance.now();
    draw(Math.min(t, durationMs));
    work.push(performance.now() - w0);
    if (t >= durationMs) break;
  }
  observer.disconnect();
  return summarise(deltas, work, longTasks);
}

/** The screen's own pace, read from an idle page: the median gap over 40 frames. */
export async function refreshPace(): Promise<number> {
  const gaps: number[] = [];
  let last = await nextFrame();
  for (let i = 0; i < 40; i += 1) {
    const now = await nextFrame();
    gaps.push(now - last);
    last = now;
  }
  return round(
    pick(
      gaps.sort((a, b) => a - b),
      0.5,
    ),
  );
}

/** Bytes fetched since `performance.clearResourceTimings()`, as the browser itself counted them. */
export function fetched(): { bytes: number; requests: number; fromCache: number } {
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  let bytes = 0;
  let fromCache = 0;
  for (const e of entries) {
    bytes += e.encodedBodySize;
    if (e.transferSize === 0 && e.encodedBodySize > 0) fromCache += 1;
  }
  return { bytes, requests: entries.length, fromCache };
}
