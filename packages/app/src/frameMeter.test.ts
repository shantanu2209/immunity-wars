/**
 * THE FRAME METER'S COUNTING (stage L4, docs/LOOK_PLAN.md §14). The meter itself needs a browser's
 * frames and is controlled in one (`pnpm look:frames --control`: every frame made to waste 40 ms,
 * and slow frames must be reported). What can be held here is the counting: which gaps between
 * frames are slow, and what the summary says of a run.
 */
import { describe, expect, it } from 'vitest';

import { SIXTY, SLOW_MS, VERY_SLOW_MS, slowest, summarise } from './frameMeter';

describe('the frame meter’s counting', () => {
  it('a run at 60 a second has no slow frame', () => {
    const s = summarise(Array.from({ length: 600 }, () => 16.7));
    expect(s.frames).toBe(600);
    expect(s.slow).toBe(0);
    expect(s.seconds).toBeCloseTo(10, 0);
    expect(s.median).toBe(16.7);
  });

  it('the jitter of a real screen at 60 a second is not counted as slow', () => {
    const s = summarise([16.2, 17.1, 16.6, 17.4, 16.0, 18.9, 15.1]);
    expect(s.slow).toBe(0);
  });

  it('a missed refresh is slow; two missed are very slow', () => {
    const s = summarise([16.7, 33.3, 16.7, 50.1, 16.7]);
    expect(s.slow).toBe(2);
    expect(s.verySlow).toBe(1);
    expect(s.worst).toBe(50.1);
  });

  it('the line is where it is said to be: 20 ms is slow, a hair under is not', () => {
    expect(summarise([SLOW_MS]).slow).toBe(1);
    expect(summarise([SLOW_MS - 0.01]).slow).toBe(0);
    expect(summarise([VERY_SLOW_MS]).verySlow).toBe(1);
  });

  // The S25's own run, 1 October 2026: five frames that each missed one refresh, at 33.2 to 33.4 ms.
  // The second line stood at 33.4 then and counted one of the five. One missed refresh is one kind
  // of frame, and the line must put all of them on the same side.
  it('frames that missed one refresh are all on one side of the second line, jitter or not', () => {
    const s = summarise([33.2, 33.3, 33.4, 33.4, 33.4, 16.7, 16.7]);
    expect(s.slow).toBe(5);
    expect(s.verySlow).toBe(0);
    expect(summarise([50]).verySlow).toBe(1);
  });

  it('CONTROL, must fail: a run in which every frame took 57 ms is all slow', () => {
    const s = summarise(Array.from({ length: 100 }, () => 57));
    expect(s.slow).toBe(100);
    expect(s.verySlow).toBe(100);
  });

  it('the slowest frames are named slowest first, with when they came', () => {
    const frames = [16.7, 91.2, 16.7, 40.04, 16.7, 16.7, 20, 16.7].map((ms, i) => ({
      ms,
      at: i * 0.5,
      marked: i === 3,
    }));
    const named = slowest(frames, 3);
    expect(named).toEqual([
      { ms: 91.2, at: 0.5, marked: false },
      { ms: 40, at: 1.5, marked: true },
      { ms: 20, at: 3, marked: false },
    ]);
    expect(slowest([])).toEqual([]);
  });

  it('a run of no frames is said to be of no frames, and is not a clean run of some', () => {
    expect(summarise([])).toEqual({
      frames: 0,
      seconds: 0,
      median: 0,
      p95: 0,
      p99: 0,
      worst: 0,
      slow: 0,
      verySlow: 0,
      refresh: 16.7,
      late: 0,
      lateTwice: 0,
    });
  });

  // THE LINES FOLLOW THE SCREEN (stage L7, ruled 25 November 2026; docs/TODO.md row 11). Inside the
  // Android app the S25 refreshes every 8.3 ms, and a frame that misses one refresh arrives at
  // 16.7: under the fixed 20 ms line. The late lines are counted against the screen's own pace.
  it('at 120 a second, a frame one refresh late is late, though it is not slow by the 20 ms line', () => {
    const s = summarise([8.3, 8.4, 8.2, 16.7, 8.3, 25.0, 9.1, 7.6], 8.3);
    expect(
      s.slow,
      'A FRAME ONE REFRESH LATE AT 120 IS NOT COUNTED: the late line is not the screen’s',
    ).toBe(1);
    expect(
      s.late,
      'A FRAME ONE REFRESH LATE AT 120 IS NOT COUNTED: the late line is not the screen’s',
    ).toBe(2);
    expect(s.lateTwice).toBe(1);
    expect(s.refresh).toBe(8.3);
  });

  it('at 120 a second, the jitter of a frame on time is not late', () => {
    expect(summarise([8.3, 9.4, 7.2, 10.1, 12.4], 8.3).late).toBe(0);
  });

  it('at 60 a second, the late lines say what the fixed ones said of a missed refresh', () => {
    const s = summarise([16.7, 33.3, 16.7, 50.1, 16.7, 18.9], SIXTY);
    expect(s.late).toBe(s.slow);
    expect(s.lateTwice).toBe(s.verySlow);
  });
});
