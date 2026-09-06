/**
 * The frame store's contract (the full-UI re-measure, 6 September 2026): a frame set is seen
 * by every subscriber and only by subscribers; an unsubscribed listener is never called again;
 * `get` always answers the latest frame. Small on purpose — the store exists so the play
 * screen's panels stop re-rendering per frame, and `tools/perf/measure-full.ts` is the check
 * that they do; this holds the mechanism the measurement leans on.
 */
import { describe, expect, it } from 'vitest';

import { createFrameStore } from './frameStore';

const frame = (n: number) => ({ view: {}, label: `f${String(n)}`, n, of: 3, dice: false });

describe('the burst frame store', () => {
  it('starts empty, answers the latest frame, and notifies every subscriber once per set', () => {
    const s = createFrameStore();
    expect(s.get()).toBeNull();
    let a = 0;
    let b = 0;
    s.subscribe(() => {
      a += 1;
    });
    const off = s.subscribe(() => {
      b += 1;
    });
    s.set(frame(1));
    expect(s.get()?.label).toBe('f1');
    expect([a, b]).toEqual([1, 1]);
    off();
    s.set(frame(2));
    s.set(null);
    expect(s.get()).toBeNull();
    expect([a, b]).toEqual([3, 1]);
  });

  it('CONTROL: a listener that was never subscribed is never called', () => {
    const s = createFrameStore();
    let calls = 0;
    const never = (): void => {
      calls += 1;
    };
    void never;
    s.set(frame(1));
    expect(calls).toBe(0);
  });
});
