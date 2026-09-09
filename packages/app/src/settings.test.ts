/**
 * The preference store's controls, BOTH WAYS (CLAUDE.md's rule, and the P2.6 kickoff ruling
 * that took the passes-halves): a valid value must be read back exactly (passes), and every
 * shape of malformed value must fall back to the defaults (fires) — including a value that is
 * valid JSON of the right keys with a size the schema does not list, which is the one a
 * hand-edited or downgraded store would produce.
 */
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  applyTextSize,
  readSettings,
  writeSettings,
  type KeyValueStore,
  type RootLike,
  type Settings,
} from './settings.js';

describe('applyTextSize', () => {
  const root = (fontSize = ''): RootLike => ({ style: { fontSize }, dataset: {} });

  it('PASSES: a size writes the root as a percentage and records what it applied', () => {
    const r = root();
    applyTextSize('200', r);
    expect(r.style.fontSize).toBe('200%');
    expect(r.dataset.textSize).toBe('200');
  });

  it('back to Standard clears a size it set itself', () => {
    const r = root();
    applyTextSize('150', r);
    applyTextSize('100', r);
    expect(r.style.fontSize).toBe('');
    expect(r.dataset.textSize).toBe('100');
  });

  it('FIRES-SHAPE GUARD: Standard leaves alone a root size it did not set (the audit sets one to model the browser preference)', () => {
    const r = root('200%');
    applyTextSize('100', r);
    expect(r.style.fontSize).toBe('200%');
  });

  it('a missing root is a no-op, never a throw', () => {
    expect(() => applyTextSize('200', null)).not.toThrow();
  });
});

function memoryStore(
  initial: Record<string, string> = {},
): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? (data[k] ?? null) : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe('readSettings / writeSettings', () => {
  it('PASSES: a valid stored value round-trips exactly', () => {
    const store = memoryStore();
    const s: Settings = { v: 1, textSize: '150', language: 'en' };
    expect(writeSettings(store, s)).toBe(true);
    expect(readSettings(store)).toEqual(s);
    expect(readSettings(store)).not.toBe(DEFAULT_SETTINGS);
  });

  it('the defaults are what an empty store reads', () => {
    expect(readSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it.each([
    ['not JSON', 'oops{'],
    ['JSON of the wrong type', '"150"'],
    ['an array', '[1]'],
    ['the right keys, an unlisted size', JSON.stringify({ v: 1, textSize: '175', language: 'en' })],
    [
      'the right keys, an unknown locale',
      JSON.stringify({ v: 1, textSize: '100', language: 'xx' }),
    ],
    ['another version', JSON.stringify({ v: 2, textSize: '100', language: 'en' })],
    ['a missing key', JSON.stringify({ v: 1, textSize: '100' })],
  ])('FIRES: %s falls back to the defaults', (_name, raw) => {
    const store = memoryStore({ [SETTINGS_KEY]: raw });
    expect(readSettings(store)).toEqual(DEFAULT_SETTINGS);
  });

  it('a store that throws on read or write is the defaults, and the write reports failure', () => {
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('private mode');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(readSettings(throwing)).toEqual(DEFAULT_SETTINGS);
    expect(writeSettings(throwing, DEFAULT_SETTINGS)).toBe(false);
  });

  it('CONTROL of the control: the same shape the fires-cases use is accepted when valid, so a fallback is not the schema rejecting everything', () => {
    const store = memoryStore({
      [SETTINGS_KEY]: JSON.stringify({ v: 1, textSize: '200', language: 'en' }),
    });
    expect(readSettings(store).textSize).toBe('200');
  });
});
