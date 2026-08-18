/**
 * THE SHIM IS A LIST, AND A LIST IS TWO CLAIMS — docs/FINDINGS.md #37.
 *
 * `shim.ts` writes its 49 bindings out by hand so that "this is a rename layer and nothing else"
 * is verifiable by reading it. That readability is bought with a risk: a hand-written list can be
 * wrong, and both directions of wrong are silent.
 *
 *   - a name the UI reads and the shim omits -> `ReferenceError` mid-game, in the build a human is
 *     trying to judge, looking exactly like a gameplay bug
 *   - a name the shim binds that the UI never reads -> harmless today, and it quietly widens the
 *     surface the harness pins, so a later engine change breaks a build for no reason anyone can see
 *
 * So the list is asserted against `measureSeam().fromEngine` — the SAME measurement steps 1 and 2
 * ran, taken from `seam-lib.ts` rather than re-derived, per the note at the top of that file.
 */

import { describe, expect, it } from 'vitest';

import * as content from '@immunity-wars/content';
import * as engine from '@immunity-wars/engine';

import { measureSeam } from './seam-lib.js';
import { SHIMMED_NAMES } from './shim.js';

const seam = measureSeam();

describe('the shim binds exactly the names the UI reads', () => {
  it('binds every name the UI reads from the engine', () => {
    const missing = seam.fromEngine.filter((n) => !SHIMMED_NAMES.includes(n as never));
    expect(missing, 'each of these is a ReferenceError mid-game').toEqual([]);
  });

  it('binds nothing the UI does not read', () => {
    const extra = SHIMMED_NAMES.filter((n) => !seam.fromEngine.includes(n));
    expect(extra, 'the shim must not widen the surface beyond the measured seam').toEqual([]);
  });

  it('binds each name exactly once', () => {
    expect(SHIMMED_NAMES.length).toBe(new Set(SHIMMED_NAMES).size);
  });

  it('is the 49 names steps 1 and 2 measured', () => {
    expect(SHIMMED_NAMES.length).toBe(seam.fromEngine.length);
  });
});

describe('every binding resolves to a real value', () => {
  // A typo in shim.ts would be a compile error for the import but the LIST is plain strings, so
  // the two could disagree without the compiler noticing. This closes that gap.
  const all = { ...content, ...engine } as unknown as Record<string, unknown>;

  for (const name of SHIMMED_NAMES) {
    it(`${name} is exported by engine or content`, () => {
      expect(all[name], `${name} is in SHIMMED_NAMES but neither package exports it`).toBeDefined();
    });
  }
});

describe('the five from FINDINGS #39 come from content, not engine', () => {
  const FIVE = ['LYMPH_STEP', 'ROUTE_KEYS', 'SNIPE_RANGE', 'SNIPE_RANGE_BY_DIFF', 'SPEED'] as const;

  it('none of the five was added to the engine to make the harness work', () => {
    const e = engine as unknown as Record<string, unknown>;
    const leaked = FIVE.filter((n) => e[n] !== undefined);
    expect(leaked, "the engine's public API stays where Task B fixed it").toEqual([]);
  });

  it('all five are exported by content', () => {
    const c = content as unknown as Record<string, unknown>;
    expect(FIVE.filter((n) => c[n] === undefined)).toEqual([]);
  });
});
