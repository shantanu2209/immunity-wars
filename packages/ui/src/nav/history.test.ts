/**
 * The back gesture's history sync, against a model of the browser's history in which `go()` is
 * asynchronous, as it is in a browser: it lands only when the test says so. Both halves: a trim
 * the stack caused is never read as a gesture, and a real gesture always is.
 */
import { describe, expect, it } from 'vitest';

import { createHistorySync, type HistoryLike } from './history';

/** The browser's joint session history, reduced to the parts the sync touches. */
function browser(startIndex = 0): HistoryLike & {
  /** Completes the pending `go()` and returns the state its popstate carries. */
  land: () => unknown;
  /** The player's gesture: moves by `delta` and returns the state its popstate carries. */
  gesture: (delta: number) => unknown;
  pushes: number;
  depth: () => number;
} {
  const entries: unknown[] = [];
  for (let i = 0; i <= startIndex; i += 1) entries.push(i === 0 ? null : { iwNav: i });
  let pos = startIndex;
  let pending: number | null = null;
  const h = {
    pushes: 0,
    get state(): unknown {
      return entries[pos];
    },
    pushState(data: unknown): void {
      entries.splice(pos + 1);
      entries.push(data);
      pos += 1;
      h.pushes += 1;
    },
    go(delta: number): void {
      pending = delta;
    },
    land(): unknown {
      if (pending === null) throw new Error('nothing is travelling');
      pos += pending;
      pending = null;
      return entries[pos];
    },
    gesture(delta: number): unknown {
      pos += delta;
      return entries[pos];
    },
    depth: (): number => pos,
  };
  return h;
}

describe('the stack getting deeper', () => {
  it('pushes one entry per level, each tagged with its index', () => {
    const b = browser();
    const s = createHistorySync(b);
    s.sync(2);
    expect(b.pushes).toBe(2);
    expect(b.state).toEqual({ iwNav: 2 });
  });
});

describe('something closed on screen', () => {
  it('trims with one go(-n), and the popstate it causes is not read as a gesture', () => {
    const b = browser();
    const s = createHistorySync(b);
    s.sync(3);
    s.sync(1);
    expect(s.onPop(b.land())).toBe(0);
    expect(b.depth()).toBe(1);
  });

  it('holds a deeper stack that arrives while the trim is travelling, then applies it', () => {
    const b = browser();
    const s = createHistorySync(b);
    s.sync(2);
    s.sync(0);
    s.sync(1);
    expect(b.pushes).toBe(2);
    expect(s.onPop(b.land())).toBe(0);
    expect(b.pushes).toBe(3);
    expect(b.state).toEqual({ iwNav: 1 });
  });
});

describe("the player's gesture", () => {
  it('FIRES: one back reports one level and touches nothing', () => {
    const b = browser();
    const s = createHistorySync(b);
    s.sync(2);
    expect(s.onPop(b.gesture(-1))).toBe(1);
    expect(b.pushes).toBe(2);
  });

  it('a long press back over two levels reports two', () => {
    const b = browser();
    const s = createHistorySync(b);
    s.sync(3);
    expect(s.onPop(b.gesture(-2))).toBe(2);
  });

  it('after the host closes what the gesture reported, the next sync does nothing', () => {
    const b = browser();
    const s = createHistorySync(b);
    s.sync(2);
    s.onPop(b.gesture(-1));
    s.sync(1);
    expect(b.pushes).toBe(2);
    expect(b.depth()).toBe(1);
  });

  it('a forward gesture cannot reopen what closed, so it is sent back and reported as nothing', () => {
    const b = browser();
    const s = createHistorySync(b);
    s.sync(2);
    s.sync(1);
    s.onPop(b.land());
    expect(s.onPop(b.gesture(1))).toBe(0);
    expect(s.onPop(b.land())).toBe(0);
    expect(b.depth()).toBe(1);
  });
});

describe('a reload', () => {
  it('trims the entries the previous page left, instead of stacking above them', () => {
    const b = browser(3);
    const s = createHistorySync(b);
    s.sync(0);
    expect(s.onPop(b.land())).toBe(0);
    expect(b.depth()).toBe(0);
  });
});

describe('CONTROL: the ignore rule is what separates a trim from a gesture', () => {
  it('a sync that forgot to mark its trim would report the trim as the player going back', () => {
    const b = browser();
    const s = createHistorySync(b);
    s.sync(2);
    // The trim done by hand, outside the sync: exactly the popstate a forgotten mark produces.
    b.go(-1);
    expect(s.onPop(b.land())).toBe(1);
  });
});
