/**
 * THE FRAME METER'S COUNTING (stage L4, docs/LOOK_PLAN.md §14). The meter itself needs a browser's
 * frames and is controlled in one (`pnpm look:frames --control`: every frame made to waste 40 ms,
 * and slow frames must be reported). What can be held here is the counting: which gaps between
 * frames are slow, and what the summary says of a run.
 */
import { describe, expect, it } from 'vitest';

import { SLOW_MS, VERY_SLOW_MS, slowest, summarise } from './frameMeter';

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
    });
  });
});
