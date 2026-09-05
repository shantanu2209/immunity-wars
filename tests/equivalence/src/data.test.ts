/**
 * B1 CHECKPOINT — the data tables and primitives.
 *
 * 22 of the legacy engine's 67 exports are pure data, not code. They were generated from the
 * RUNTIME values of the legacy module rather than retyped, so they are equal by construction;
 * this file is what turns "by construction" into "proven".
 *
 * The comparison uses canonical() rather than toEqual, because it also catches PROPERTY ORDER.
 * Order is load-bearing here: level 1 of the equivalence contract requires the port to build
 * state objects in legacy's order, and several of these tables are iterated with Object.keys
 * inside the engine — TROPISM ordering feeds rollOrgan, FAM_KEYS ordering feeds the kidney
 * antibody leak. A table with the right entries in the wrong order is a real bug.
 */

import { describe, expect, it } from 'vitest';

import * as port from '@immunity-wars/engine';
import * as internal from '@immunity-wars/engine/internal';

import { canonical } from './hash.js';
import { skeleton, sweepDashes, upToPunctuation } from './punctuation.js';
import { loadLegacy } from './engine.js';

const legacy = loadLegacy();

/** The 22 data exports, by the name legacy publishes them under. */
const DATA_EXPORTS = [
  'ORGANS',
  'ORGAN_SETS',
  'ROUTES',
  'TROPISM',
  'DECK_MASTER',
  'FAMILIES',
  'FAM_KEYS',
  'FAMILY',
  'EVENTS',
  'RARE',
  'INV_HP',
  'INV_SPEED',
  'FAST_DISEASE',
  'NOT_ALIVE',
  'TOXIN_MAKERS',
  'RESIDENT_NAME',
  'CELL_KEYS',
  'DIFF',
  'FLAGS',
  'VACCINE_COST',
  'CLONE_COST',
  'ANTIVENOM_ORDER',
] as const;

/** Sets have no own enumerable keys, so canonical() would render every Set as {}. */
const comparable = (v: unknown): unknown => (v instanceof Set ? { '#set': [...v] } : v);

const portTable = (name: string): unknown => (port as unknown as Record<string, unknown>)[name];

describe('B1: data tables match legacy exactly', () => {
  it('covers all 22 data exports, with none missed', () => {
    const legacyData = Object.keys(legacy).filter(
      (k) => typeof (legacy as unknown as Record<string, unknown>)[k] !== 'function',
    );
    expect([...DATA_EXPORTS].sort()).toEqual(legacyData.sort());
  });

  /**
   * ORGANS and FAMILIES carry prose the engine never emits (bio, effect), pinned UP TO
   * PUNCTUATION since 5 September 2026 (punctuation.ts has the ruling and the guarantee).
   * EVENTS and RARE stay exact: their tell and why reach the banner and the log, so the corpus
   * pins them too.
   */
  const PROSE_TABLES = new Set(['ORGANS', 'FAMILIES']);
  for (const name of DATA_EXPORTS) {
    const loose = PROSE_TABLES.has(name);
    it(`${name} — same values, same key order${loose ? ', up to punctuation' : ''}`, () => {
      const mine = portTable(name);
      expect(mine, `${name} is not exported by the port`).toBeDefined();
      const theirs = (legacy as unknown as Record<string, unknown>)[name];
      const a = loose ? upToPunctuation(comparable(mine)) : comparable(mine);
      const b = loose ? upToPunctuation(comparable(theirs)) : comparable(theirs);
      expect(canonical(a)).toBe(canonical(b));
    });
  }

  it('CONTROL for the loosened pin: a dash-only rewrite passes, a changed word fails', () => {
    const organs = (legacy as unknown as { ORGANS: Record<string, { bio: string }> }).ORGANS;
    // The first organ whose legacy bio carries a dash (the heart's does; the brain's does not).
    const bio = Object.values(organs).find((o) => o.bio.includes('—'))?.bio ?? '';
    expect(bio).toContain('—');
    expect(skeleton(sweepDashes(bio))).toBe(skeleton(bio));
    const m = /\p{L}/u.exec(bio) as RegExpExecArray;
    const i = m.index;
    const swapped = bio.slice(0, i) + (bio[i] === 'x' ? 'y' : 'x') + bio.slice(i + 1);
    expect(skeleton(swapped)).not.toBe(skeleton(bio));
  });
});

describe('B1: the tables cover exactly the keys the types promise', () => {
  // Pathogen X is the one card deliberately absent from both TROPISM and FAMILY. It works by
  // falling through two separate lookup misses rather than by being declared — see
  // docs/FINDINGS.md #13. These tests pin the exception so B7 cannot quietly close it.

  it('every DECK_MASTER disease except Pathogen X has a TROPISM entry', () => {
    const missing = port.DECK_MASTER.filter((c) => !(c.dz in port.TROPISM)).map((c) => c.dz);
    expect(missing).toEqual(['Pathogen X']);
  });

  it('every DECK_MASTER disease except Pathogen X has a FAMILY entry', () => {
    const missing = port.DECK_MASTER.filter((c) => !(c.dz in port.FAMILY)).map((c) => c.dz);
    expect(missing).toEqual(['Pathogen X']);
  });

  it('Pathogen X reaches the X antibody pool by DECLARATION, not by a lookup miss', () => {
    // CHANGED AT C4 — docs/DEVIATIONS.md #5, fixing docs/FINDINGS.md #13.
    //
    // This assertion used to read `expect(port.famOf({ disease: 'Pathogen X' })).toBe('EXB')`
    // and PINNED the defect: famOf short-circuited on `novel`, so the missing FAMILY entry was
    // unreachable, and losing the flag anywhere would have turned the novel pathogen into an
    // ordinary EXB bacterium with every test still passing.
    //
    // The content now declares the exemption, so the pool no longer depends on the flag.
    expect(port.famOf({ disease: 'Pathogen X', novel: true })).toBe('X');
    expect(port.famOf({ disease: 'Pathogen X' })).toBe('X');
    // FAMILY itself is untouched, which is why the 22-table comparison above still holds.
    expect('Pathogen X' in port.FAMILY).toBe(false);
  });

  it('every TROPISM target names a real organ', () => {
    const organs = new Set(Object.keys(port.ORGANS));
    const bad: string[] = [];
    for (const [dz, target] of Object.entries(port.TROPISM)) {
      if (target === 'any') continue;
      for (const o of target) if (!organs.has(o)) bad.push(`${dz} -> ${o}`);
    }
    expect(bad).toEqual([]);
  });

  it('every FAMILY value is one of the six antigen classes', () => {
    const fams = new Set<string>(port.FAM_KEYS);
    const bad = Object.entries(port.FAMILY).filter(([, f]) => !fams.has(f));
    expect(bad).toEqual([]);
  });

  it('the brain is still branch 3 with 2 integrity', () => {
    // The regression this whole project exists to never repeat.
    expect(port.ORGANS.brain.branch).toBe(3);
    expect(port.ORGANS.brain.integrity).toBe(2);
  });
});

describe('B1: primitives match legacy', () => {
  it('branchLen agrees for every organ', () => {
    // ALL_ORGANS is not one of legacy's 67 exports, so it is reached through /internal rather
    // than the root — see exports.test.ts and the header of packages/engine/src/index.ts.
    for (const o of internal.ALL_ORGANS) {
      expect(port.branchLen(o)).toBe(legacy.branchLen(o));
    }
  });

  it('famOf agrees with legacy for every deck card EXCEPT the one declared deviation', () => {
    // Pathogen X is excluded by name rather than by a blanket tolerance, so a SECOND divergence
    // would still fail here. docs/DEVIATIONS.md #5 is the whole list, and it has one entry.
    for (const c of port.DECK_MASTER) {
      if (c.dz === 'Pathogen X') continue;
      const iv = { disease: c.dz, novel: false };
      expect(port.famOf(iv), c.dz).toBe(
        legacy.famOf({ ...iv, id: '', type: c.type, zone: 'hub', step: 0 }),
      );
    }
    expect(port.famOf({ disease: 'Pathogen X', novel: true })).toBe('X');
    // The deviation, stated here too so this file is honest on its own:
    expect(port.famOf({ disease: 'Pathogen X' })).toBe('X');
    expect(legacy.famOf({ disease: 'Pathogen X' } as never)).toBe('EXB');
  });

  it('famOf falls back to EXB for an unknown disease, as legacy does', () => {
    expect(port.famOf({ disease: 'Not A Real Disease' })).toBe('EXB');
  });

  it('organsFor returns the difficulty set, and honours an override', () => {
    for (const d of ['training', 'normal', 'hard'] as const) {
      expect(internal.organsFor(d)).toEqual(port.ORGAN_SETS[d]);
    }
    expect(internal.organsFor('normal', ['brain'])).toEqual(['brain']);
  });

  it('lymphPartners groups mucosal and skin routes, and isolates blood', () => {
    expect(internal.lymphPartners('nose')).toEqual(['gut', 'contact']);
    expect(internal.lymphPartners('gut')).toEqual(['nose', 'contact']);
    expect(internal.lymphPartners('contact')).toEqual(['nose', 'gut']);
    expect(internal.lymphPartners('wound')).toEqual(['bite']);
    expect(internal.lymphPartners('bite')).toEqual(['wound']);
    // A needle goes straight into the bloodstream, bypassing the tissues entirely.
    expect(internal.lymphPartners('blood')).toEqual([]);
  });

  it('cap1 capitalises without throwing on empty input', () => {
    expect(internal.cap1('eosinophil')).toBe('Eosinophil');
    expect(internal.cap1('')).toBe('');
  });

  it('clone is JSON-lossy in the same ways legacy is', () => {
    // Not incidental. The stats counters really do go NaN (docs/FINDINGS.md #3), and a
    // "better" clone would change observable behaviour.
    expect(internal.clone({ a: NaN })).toEqual({ a: null });
    expect(internal.clone({ a: undefined })).toEqual({});
  });

  it('uid counts up and resetUid restarts it, so ids are stable per game', () => {
    internal.resetUid();
    expect([internal.uid(), internal.uid(), internal.uid()]).toEqual(['i1', 'i2', 'i3']);
    internal.resetUid();
    expect(internal.uid()).toBe('i1');
  });
});

describe('B1: primitives consume randomness the way legacy does', () => {
  // Draw COUNT is what the equivalence rig compares action by action, so a primitive that
  // burns a different number of draws would desynchronise every later roll. The permutation
  // itself is proven against legacy at B3, where newGame's shuffled deck is compared.
  const withCountedRandom = <T>(fn: () => T): { value: T; draws: number } => {
    const real = Math.random;
    let draws = 0;
    let x = 0;
    Math.random = (): number => {
      draws += 1;
      x = (x * 1103515245 + 12345) % 2147483648;
      return x / 2147483648;
    };
    try {
      return { value: fn(), draws };
    } finally {
      Math.random = real;
    }
  };

  it('d6 draws exactly once and stays in 1..6', () => {
    for (let i = 0; i < 200; i += 1) {
      const { value, draws } = withCountedRandom(() => internal.d6());
      expect(draws).toBe(1);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  it('shuffle draws exactly n-1 times and keeps every element', () => {
    for (const n of [0, 1, 2, 5, 97]) {
      const input = Array.from({ length: n }, (_, i) => i);
      const { value, draws } = withCountedRandom(() => internal.shuffle([...input]));
      expect(draws, `n=${n}`).toBe(Math.max(0, n - 1));
      expect([...value].sort((a, b) => a - b)).toEqual(input);
    }
  });
});
