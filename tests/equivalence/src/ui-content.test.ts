/**
 * C3 CHECKPOINT — the extracted board/label/disease content still equals `v2_ui.html`.
 *
 * The counterpart to `data.test.ts`, which does the same job for the rules tables against
 * `v2_engine.js`. Same method and the same reason: the JSON was GENERATED from the legacy
 * values rather than retyped, so it is equal by construction — and this is what turns "by
 * construction" into "proven", and keeps it proven as the pack is edited.
 *
 * `canonical()` rather than `toEqual`, because it compares PROPERTY ORDER too.
 */

import { describe, expect, it } from 'vitest';

import * as content from '@immunity-wars/content';

import { canonical } from './hash.js';
import { skeleton, sweepDashes, upToPunctuation } from './punctuation.js';
import { legacyUiTable } from './legacy-ui.js';

/**
 * THE GEOMETRY TABLES ARE NO LONGER PINNED TO LEGACY, BY RULING — and this is the record of it.
 *
 * On 20 August 2026 the board layout moved to the A2 print's radial design, generated from the
 * PDF itself by tools/geometry-from-a2 (docs/FINDINGS.md #49: the app adopts the A2 layout;
 * later RELAXED so geometry.json may change for screen reasons). From that day these seven
 * tables were DIFFERENT from v2_ui.html on purpose, and the parity assertion below was false.
 *
 * It stayed green for thirteen days anyway: turbo's test task hashed only this package's own
 * files, so the change in packages/content never invalidated the cached pass. CI, which has no
 * cache, went red the first time the branch was pushed (docs/FINDINGS.md #51).
 *
 * What still holds for these tables is asserted elsewhere and NOT duplicated here: the content
 * schema cross-references ORGANS.branch against the drawn BRANCH steps (load.test.ts, with two
 * mutations that throw), and the generator asserts its counts against rules/board.json with a
 * --control mode. Here they are only required to still exist, and to still DIFFER from legacy —
 * a table that becomes equal again belongs back in the pinned set, not in this list.
 */
const GEOMETRY_RETIRED_FROM_PARITY: readonly string[] = [
  'VH',
  'HUB',
  'ORGAN_POS',
  'CHIP_POS',
  'BRANCH',
  'ROUTE',
  'ENTRY',
];

/** Extracted name in the pack -> the name legacy declares it under. Still equal by construction. */
const TABLES: Record<string, string> = {
  VW: 'VW', // the viewBox width survives the radialisation (660 both); VH does not
  REGIONS: 'REGIONS',
  REGION_BOX: 'REGION_BOX',
  REGION_LABEL: 'REGION_LABEL',
  FACT: 'FACT',
  DZINFO: 'DZINFO',
  DZSTATS: 'S', // BRIEF §3 renames legacy's `S` on extraction
  UM: 'UM',
  UI_: 'UI_',
  BEAT_BY_TYPE: 'BEAT_BY_TYPE', // moved into content for the pathogen card (P2.5, 4 Sep 2026)
  RNAME: 'RNAME',
  RGLYPH: 'RGLYPH',
  ORGAN_ART: 'ORGAN_ART',
};

const at = (k: string): unknown => (content as unknown as Record<string, unknown>)[k];

/**
 * THE PROSE TABLES ARE PINNED UP TO PUNCTUATION (re-baselined 5 September 2026, Shantanu's
 * ruling; the reasoning and what the comparison still guarantees are in punctuation.ts). The
 * migration these pins proved is finished; the prose is the source of record now, and the
 * no-dashes preference applies to it before the Hindi extraction. Everything else stays exact.
 */
const PROSE_TABLES = new Set(['FACT', 'DZINFO', 'BEAT_BY_TYPE']);

describe('C3: extracted UI content matches v2_ui.html (exactly, or up to punctuation for prose)', () => {
  for (const [ours, theirs] of Object.entries(TABLES)) {
    const loose = PROSE_TABLES.has(ours);
    it(`${ours} — same values, same key order${loose ? ', up to punctuation' : ''}`, () => {
      const mine = loose ? upToPunctuation(at(ours)) : at(ours);
      const legacy = loose ? upToPunctuation(legacyUiTable(theirs)) : legacyUiTable(theirs);
      expect(canonical(mine)).toBe(canonical(legacy));
    });
  }
});

describe('C3 CONTROL: the loosened pin still catches everything but punctuation', () => {
  const legacyInfo = legacyUiTable('DZINFO') as Record<string, Record<string, string>>;
  const [dz, fields] = Object.entries(legacyInfo).find(([, f]) =>
    Object.values(f).some((v) => v.includes('—')),
  ) as [string, Record<string, string>];
  const field = Object.keys(fields).find((k) => fields[k]?.includes('—')) as string;

  it('found a legacy string with a dash to mutate (vacuity guard)', () => {
    expect(dz).toBeDefined();
    expect(field).toBeDefined();
  });

  it('mustPass: a dash-only rewrite of a legacy string is still parity', () => {
    const original = fields[field] as string;
    const rewritten = sweepDashes(original);
    expect(rewritten).not.toBe(original);
    expect(skeleton(rewritten)).toBe(skeleton(original));
  });

  it('mustFail: one changed letter in the same string breaks parity', () => {
    const original = fields[field] as string;
    const m = /\p{L}/u.exec(original) as RegExpExecArray;
    const i = m.index;
    const swapped =
      original.slice(0, i) + (original[i] === 'x' ? 'y' : 'x') + original.slice(i + 1);
    expect(skeleton(swapped)).not.toBe(skeleton(original));
  });

  it('mustFail: a dropped word breaks parity', () => {
    const original = fields[field] as string;
    const dropped = original.replace(/\p{L}+\s*/u, '');
    expect(skeleton(dropped)).not.toBe(skeleton(original));
  });
});

describe('C3: the geometry tables retired from legacy parity (FINDINGS #49)', () => {
  for (const name of GEOMETRY_RETIRED_FROM_PARITY) {
    it(`${name} — still present, and still different from v2_ui.html`, () => {
      const v = at(name);
      expect(v, `${name} is gone from the content pack`).toBeDefined();
      expect(JSON.stringify(v).length).toBeGreaterThan(2);
      // Equal again would mean the retirement is stale: re-pin it in TABLES instead.
      expect(canonical(v), `${name} equals legacy again — move it back into TABLES`).not.toBe(
        canonical(legacyUiTable(name)),
      );
    });
  }
});

/**
 * THE INTEGER-KEY QUESTION, which the C0 probe flagged and left as an assumption.
 *
 * JavaScript orders an object's own keys with the INTEGER-LIKE ones first, ascending, ahead of
 * the string keys in insertion order. `BRANCH` and `ROUTE` are the only place in the whole
 * content where keys are integer-like — `"1"`, `"2"`, … — so they are the only place key order
 * is NOT simply preserved-by-insertion.
 *
 * Nothing observable moves, because within each of those objects EVERY key is integer-like and
 * they are already ascending. But "already ascending" is a property that happens to hold, not
 * one anything enforces — the same shape as the worm safeguard in docs/FINDINGS.md #14, which
 * holds by placement rather than by intent. So it is asserted here rather than assumed.
 *
 * What would break it: a step numbered `"01"`, or a non-numeric key like `"lymph"` mixed in.
 * Either would put the keys in an order that is no longer the order they were written in, and
 * the SVG board would draw the branch in the wrong sequence.
 */
describe('C3: the one place in the content with integer-like keys', () => {
  const intLike = (k: string): boolean => String(Math.trunc(Number(k))) === k && Number(k) >= 0;

  const stepMaps: [string, Record<string, Record<string, unknown>>][] = [
    ['BRANCH', content.BRANCH as unknown as Record<string, Record<string, unknown>>],
    ['ROUTE', content.ROUTE as unknown as Record<string, Record<string, unknown>>],
  ];

  for (const [name, table] of stepMaps) {
    it(`${name}: every step key is integer-like, so none can jump the queue`, () => {
      // A MIXED object is the dangerous case: string keys would be pushed after the integers
      // regardless of where they were written.
      for (const [outer, steps] of Object.entries(table)) {
        const keys = Object.keys(steps);
        expect(
          keys.every(intLike),
          `${name}.${outer} has a non-integer key: ${keys.join(',')}`,
        ).toBe(true);
      }
    });

    it(`${name}: step keys are 1..n with no gaps, ascending`, () => {
      for (const [outer, steps] of Object.entries(table)) {
        const keys = Object.keys(steps);
        const expected = keys.map((_, i) => String(i + 1));
        expect(keys, `${name}.${outer}`).toEqual(expected);
      }
    });

    it(`${name}: canonical order survives a JSON round trip`, () => {
      // The actual property at stake, tested end to end rather than by reasoning about it.
      expect(canonical(JSON.parse(JSON.stringify(table)))).toBe(canonical(table));
    });
  }

  it('no OTHER table in the content has integer-like keys', () => {
    // If one ever appears, this fails and someone has to think about ordering rather than
    // discovering it from a board drawn in the wrong sequence.
    const found: string[] = [];
    const walk = (path: string, v: unknown): void => {
      if (v === null || typeof v !== 'object' || v instanceof Set) return;
      if (Array.isArray(v)) return;
      const keys = Object.keys(v as object);
      if (keys.some(intLike)) found.push(path);
      for (const k of keys) walk(`${path}.${k}`, (v as Record<string, unknown>)[k]);
    };
    for (const [k, v] of Object.entries(content)) {
      if (k === 'BRANCH' || k === 'ROUTE') continue;
      if (typeof v !== 'function') walk(k, v);
    }
    expect(found).toEqual([]);
  });
});

/**
 * RNAME and RESIDENT_NAME are two copies of the same seven strings.
 *
 * Legacy carries both — `RESIDENT_NAME` in the engine, `RNAME` in the UI — so the port carries
 * both, and Phase 2 collapses them when the UI stops reading its own. Until then the only thing
 * keeping them equal is that nobody has edited one, which is not a mechanism.
 */
describe('C3: the duplicated label tables agree', () => {
  it('RNAME is byte-identical to RESIDENT_NAME', () => {
    expect(canonical(content.RNAME)).toBe(canonical(content.RESIDENT_NAME));
  });

  it('UM cell names agree with CNAME, for the six cells CNAME covers', () => {
    // CNAME has no eosinophil entry in legacy; that asymmetry is preserved, so compare only
    // the keys CNAME actually has rather than asserting a completeness legacy does not have.
    for (const [cell, name] of Object.entries(content.CNAME)) {
      const um = (content.UM as unknown as Record<string, { n: string }>)[cell];
      expect(um?.n, `UM.${cell}`).toBe(name);
    }
  });
});
