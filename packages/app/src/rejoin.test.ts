/**
 * The room this device is in (P3.7 piece C, ruling (a)): a write is read back; anything absent,
 * malformed, or older than a day reads as no room; forgetting forgets; and a store that throws
 * never takes the app down with it.
 *
 * The age is the part that can quietly go wrong in both directions: a record read back forever
 * would keep a player's `self` on the device long after the room is gone, and a record forgotten
 * too soon would strand a player the ruling exists to bring back. Both edges are held.
 */
import { describe, expect, it } from 'vitest';

import { REJOIN_KEY, REJOIN_TTL_MS, clearRejoin, readRejoin, writeRejoin } from './rejoin';

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

const SELF = 'p_0123456789abcdef';
const T0 = 1_000_000;

describe('the room this device is in', () => {
  it('is read back as written: the code and self, and nothing about the player', () => {
    const store = memory();
    expect(writeRejoin(store, 'ACDEFG', SELF, T0)).toBe(true);
    expect(readRejoin(store, T0 + 1)).toEqual({ v: 1, code: 'ACDEFG', self: SELF, savedAt: T0 });
    expect(Object.keys(JSON.parse(store.getItem(REJOIN_KEY) ?? '{}') as object).sort()).toEqual([
      'code',
      'savedAt',
      'self',
      'v',
    ]);
  });

  it('is offered for a day, and not a moment longer', () => {
    const store = memory();
    writeRejoin(store, 'ACDEFG', SELF, T0);
    expect(readRejoin(store, T0 + REJOIN_TTL_MS - 1)).not.toBeNull();
    expect(readRejoin(store, T0 + REJOIN_TTL_MS)).toBeNull();
    // A clock set back reads as nothing too, rather than as a record from the future.
    expect(readRejoin(store, T0 - 1)).toBeNull();
  });

  it('is nothing when absent, malformed, or not a self the device could have made', () => {
    expect(readRejoin(memory(), T0)).toBeNull();
    expect(readRejoin(memory({ [REJOIN_KEY]: '{not json' }), T0)).toBeNull();
    const bad = (x: object): string => JSON.stringify({ v: 1, savedAt: T0, ...x });
    expect(
      readRejoin(memory({ [REJOIN_KEY]: bad({ code: 'ACDEFG', self: 'Kartik' }) }), T0),
    ).toBeNull();
    expect(
      readRejoin(memory({ [REJOIN_KEY]: bad({ code: 'acdefg', self: SELF }) }), T0),
    ).toBeNull();
    expect(writeRejoin(memory(), 'ACDEFG', 'Kartik', T0)).toBe(false);
  });

  it('is forgotten when told to be', () => {
    const store = memory();
    writeRejoin(store, 'ACDEFG', SELF, T0);
    expect(clearRejoin(store)).toBe(true);
    expect(readRejoin(store, T0)).toBeNull();
  });

  it('CONTROL: a store that throws on everything reads as no room and never throws', () => {
    expect(readRejoin(throwing(), T0)).toBeNull();
    expect(writeRejoin(throwing(), 'ACDEFG', SELF, T0)).toBe(false);
    expect(clearRejoin(throwing())).toBe(false);
    expect(readRejoin(null, T0)).toBeNull();
  });
});
