/**
 * The played flag, at the three things it must get right: an absent or malformed record reads as
 * "never played" (the harmless direction, since it shows the guidance again), a write is read back,
 * and a store that throws never takes the app down with it.
 *
 * The control this suite carries is the last one: a store whose every method throws is what a
 * browser with site data blocked gives you, and the module's contract is that the app still runs.
 */
import { describe, expect, it } from 'vitest';

import { NEVER_PLAYED, PLAYED_KEY, clearPlayed, readPlayed, writePlayed } from './played';

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

const throwing = (): KeyValueStore => ({
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
});

describe('readPlayed', () => {
  it('reads an empty store as never played', () => {
    expect(readPlayed(memory())).toEqual(NEVER_PLAYED);
  });

  it('reads back what was written', () => {
    const s = memory();
    expect(writePlayed(s)).toBe(true);
    expect(readPlayed(s).played).toBe(true);
  });

  it('reads a malformed record as never played, not as an error', () => {
    expect(readPlayed(memory({ [PLAYED_KEY]: '{"v":2,"played":true}' })).played).toBe(false);
    expect(readPlayed(memory({ [PLAYED_KEY]: 'not json' })).played).toBe(false);
    expect(readPlayed(memory({ [PLAYED_KEY]: '{"v":1,"played":"yes"}' })).played).toBe(false);
  });

  it('survives a store that throws, in every direction', () => {
    expect(readPlayed(throwing()).played).toBe(false);
    expect(writePlayed(throwing())).toBe(false);
    expect(clearPlayed(throwing())).toBe(false);
    expect(readPlayed(null).played).toBe(false);
  });
});

describe('clearPlayed', () => {
  it('removes the key, so the device looks new again', () => {
    const s = memory();
    writePlayed(s);
    expect(clearPlayed(s)).toBe(true);
    expect(s.getItem(PLAYED_KEY)).toBeNull();
    expect(readPlayed(s).played).toBe(false);
  });
});
