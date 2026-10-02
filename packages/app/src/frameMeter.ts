/**
 * THE FRAME METER — stage L4 of docs/LOOK_PLAN.md (§14), the fifth pull request: the play screen
 * measured on the phone, in the place of the L2 prototype.
 *
 * It reads the time between the frames the browser actually gives the page (the timestamps
 * `requestAnimationFrame` hands out), for as long as it is left running, and says how many were
 * slow. It is the timer the L2 measurement was taken with, moved here from the L2 prototype, which
 * was removed once this had measured the real screen on the S25 (1 October 2026).
 *
 * WHAT COUNTS AS A SLOW FRAME: 20 ms or more between two frames, as at L2, so the two measurements
 * can be read side by side. The line ruled is 16.7 ms (60 a second), accepted as the target at L2
 * and not a hard rule. A screen that refreshes 60 times a second delivers every frame at 16.7 ms
 * give or take its own timer's jitter, so a line drawn exactly there would call half of a perfect
 * run slow; 20 is 16.7 plus 3.3 of allowance, and means a refresh was missed. The worst frame and
 * the percentiles are reported beside the count, so the allowance can be argued with.
 *
 * SOME FRAMES ARE MARKED. The caller says, each frame, whether something it cares about is going
 * on (here: the camera moving), and those frames are counted a second time on their own. The
 * camera is the part the L2 measurement never exercised.
 *
 * `burnMs` makes every frame waste that long on purpose. It is this instrument's negative control:
 * with it on, slow frames MUST be reported, or the meter is not measuring.
 */
export const SLOW_MS = 20;
/**
 * MORE THAN ONE REFRESH MISSED, at 60 a second: halfway between one missed (33.3 ms) and two
 * (50 ms).
 *
 * It was 33.4, and the S25's own run showed what was wrong with that (1 October 2026): a frame
 * that misses one refresh arrives at 33.3 ms give or take the timer's jitter, so a line at 33.4
 * cut through the middle of them. Five frames of 33.2 to 33.4 ms were counted as one "of 33 ms or
 * more" and four not, and the count said nothing. A line belongs between the things it separates,
 * not on one of them.
 */
export const VERY_SLOW_MS = 41.7;

export interface FrameStats {
  frames: number;
  seconds: number;
  /** Milliseconds between frames. */
  median: number;
  p95: number;
  p99: number;
  worst: number;
  /** Frames that took 20 ms or more. */
  slow: number;
  /** Frames that took 41.7 ms or more: more than one refresh missed. */
  verySlow: number;
}

function pick(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
}
const round = (n: number): number => Math.round(n * 10) / 10;

export function summarise(deltas: readonly number[]): FrameStats {
  const d = [...deltas].sort((a, b) => a - b);
  return {
    frames: deltas.length,
    seconds: round(deltas.reduce((a, b) => a + b, 0) / 1000),
    median: round(pick(d, 0.5)),
    p95: round(pick(d, 0.95)),
    p99: round(pick(d, 0.99)),
    worst: round(d[d.length - 1] ?? 0),
    slow: deltas.filter((x) => x >= SLOW_MS).length,
    verySlow: deltas.filter((x) => x >= VERY_SLOW_MS).length,
  };
}

/** One frame, named: how long it took, when in the run, and whether it was a marked one. */
export interface NamedFrame {
  ms: number;
  /** Seconds into the run. */
  at: number;
  marked: boolean;
}

/** How many of the slowest frames a run names. */
export const SLOWEST_NAMED = 5;

/** The slowest frames of a run, slowest first: a count says how many, this says when. */
export function slowest(frames: readonly NamedFrame[], n = SLOWEST_NAMED): NamedFrame[] {
  return [...frames]
    .sort((a, b) => b.ms - a.ms)
    .slice(0, n)
    .map((f) => ({ ms: round(f.ms), at: round(f.at), marked: f.marked }));
}

export interface MeterResult {
  /** Every frame of the run. */
  all: FrameStats;
  /** The frames the caller marked, counted on their own. */
  marked: FrameStats;
  /** The five slowest frames, slowest first, with when each came. */
  slowest: NamedFrame[];
  /** Tasks over 50 ms that the browser reported during the run. */
  longTasks: number;
}

export interface Meter {
  stop: () => MeterResult;
}

/**
 * Start timing frames. `mark` is asked once a frame whether this frame is one of the marked ones.
 * It runs until `stop`, which hands back the count.
 */
export function startMeter(mark: () => boolean, burnMs = 0): Meter {
  const all: number[] = [];
  const marked: number[] = [];
  const named: NamedFrame[] = [];
  let longTasks = 0;
  let running = true;
  let last: number | null = null;
  let first: number | null = null;
  let observer: PerformanceObserver | null = null;
  try {
    observer = new PerformanceObserver((list) => {
      longTasks += list.getEntries().length;
    });
    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    // the browser does not report long tasks; the frame times still show them
    observer = null;
  }
  const frame = (now: number): void => {
    if (!running) return;
    first ??= now;
    if (last !== null) {
      const delta = now - last;
      const isMarked = mark();
      all.push(delta);
      if (isMarked) marked.push(delta);
      named.push({ ms: delta, at: (now - first) / 1000, marked: isMarked });
    }
    last = now;
    if (burnMs > 0) {
      const until = performance.now() + burnMs;
      while (performance.now() < until) {
        // wasting the frame, on purpose
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return {
    stop: (): MeterResult => {
      running = false;
      observer?.disconnect();
      return {
        all: summarise(all),
        marked: summarise(marked),
        slowest: slowest(named),
        longTasks,
      };
    },
  };
}

/** The screen's own pace, read from an idle page: the median gap over 40 frames. */
export async function refreshPace(): Promise<number> {
  const next = (): Promise<number> => new Promise((r) => requestAnimationFrame(r));
  const gaps: number[] = [];
  let last = await next();
  for (let i = 0; i < 40; i += 1) {
    const now = await next();
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
