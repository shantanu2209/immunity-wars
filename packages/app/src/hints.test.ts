/**
 * The hints store. The tests that matter are the ones about a malformed record, because that is
 * the path nobody exercises by hand and the one a stored value guarantees will happen eventually.
 *
 * The direction of failure is deliberate and is asserted: a record that cannot be trusted reads
 * as "nothing seen", which shows a hint the player may have seen before. The other direction —
 * reading a broken record as "everything seen" — would silently switch the feature off, and
 * nobody would ever report it.
 */
import { describe, expect, it } from 'vitest';

import { HINTS_KEY, clearHints, readHints, writeHints, type HintStore } from './hints';

const memory = (initial: Record<string, string> = {}): HintStore & { map: Map<string, string> } => {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
};

const throwing = (): HintStore => ({
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
});

describe('the hints store', () => {
  it('round-trips a seen set exactly', () => {
    const s = memory();
    expect(writeHints(s, ['cell:nk', 'invader:worm'])).toBe(true);
    expect(readHints(s).seen).toEqual(['cell:nk', 'invader:worm']);
  });

  it('an absent key reads as nothing seen', () => {
    expect(readHints(memory()).seen).toEqual([]);
  });

  it('every malformed shape reads as nothing seen, never as everything seen', () => {
    const bad = [
      'not json at all',
      '{}',
      '[]',
      'null',
      '{"v":2,"seen":[]}',
      '{"v":1}',
      '{"v":1,"seen":"cell:nk"}',
      '{"v":1,"seen":[1,2,3]}',
      '{"v":1,"seen":[""]}',
      `{"v":1,"seen":["${'x'.repeat(65)}"]}`,
    ];
    for (const raw of bad) {
      const s = memory({ [HINTS_KEY]: raw });
      expect(readHints(s).seen, raw).toEqual([]);
    }
  });

  it('CONTROL: a VALID record is not rejected, or the store would show every hint forever', () => {
    const s = memory({ [HINTS_KEY]: '{"v":1,"seen":["cell:nk"]}' });
    expect(readHints(s).seen).toEqual(['cell:nk']);
  });

  it('a store that throws on read gives nothing seen rather than crashing the game', () => {
    expect(readHints(throwing()).seen).toEqual([]);
  });

  it('a store that throws on write reports the failure instead of pretending', () => {
    expect(writeHints(throwing(), ['cell:nk'])).toBe(false);
  });

  it('clearing REMOVES the key, so a cleared device looks like a new one', () => {
    const s = memory();
    writeHints(s, ['cell:nk']);
    expect(s.map.has(HINTS_KEY)).toBe(true);
    expect(clearHints(s)).toBe(true);
    expect(s.map.has(HINTS_KEY)).toBe(false);
    expect(readHints(s).seen).toEqual([]);
  });

  it('clearing touches NOTHING else, which is what the Settings confirm promises', () => {
    const s = memory({
      'immunity-wars.settings': '{"v":1,"textSize":"150","language":"en"}',
      'something.else': 'kept',
    });
    writeHints(s, ['cell:nk']);
    clearHints(s);
    expect(s.map.get('immunity-wars.settings')).toBe('{"v":1,"textSize":"150","language":"en"}');
    expect(s.map.get('something.else')).toBe('kept');
  });
});
