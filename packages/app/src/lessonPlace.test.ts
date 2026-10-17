/**
 * The lesson's place on this device (step 3): a write is read back, the most chapters ever done are
 * kept, and anything missing, malformed or refused reads as none done, which begins the lesson again.
 * Control: pnpm ci:selftest lesson-place-keeps-the-most.
 */
import { describe, expect, it } from 'vitest';

import { LESSON_KEY, readChaptersDone, writeChaptersDone } from './lessonPlace';

import type { KeyValueStore } from './settings';

const memory = (seed: Record<string, string> = {}): KeyValueStore => {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
};

const throwing: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('the lesson’s place', () => {
  it('is none done on a device that has never played it', () => {
    expect(readChaptersDone(memory())).toBe(0);
    expect(readChaptersDone(null)).toBe(0);
  });

  it('is read back as written', () => {
    const store = memory();
    expect(writeChaptersDone(store, 2)).toBe(true);
    expect(readChaptersDone(store)).toBe(2);
  });

  it('keeps the most chapters ever done', () => {
    const store = memory();
    writeChaptersDone(store, 3);
    writeChaptersDone(store, 1);
    expect(readChaptersDone(store), 'A PLAYER’S PLACE IN THE LESSON WAS TAKEN BACK').toBe(3);
  });

  it('reads anything it did not write as none done', () => {
    expect(readChaptersDone(memory({ [LESSON_KEY]: 'not json' }))).toBe(0);
    expect(readChaptersDone(memory({ [LESSON_KEY]: '{"v":2,"done":3}' }))).toBe(0);
    expect(readChaptersDone(memory({ [LESSON_KEY]: '{"v":1,"done":-1}' }))).toBe(0);
  });

  it('never takes the app down when the browser refuses storage', () => {
    expect(readChaptersDone(throwing)).toBe(0);
    expect(writeChaptersDone(throwing, 2)).toBe(false);
  });
});
