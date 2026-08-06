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
import { legacyUiTable } from './legacy-ui.js';

/** Extracted name in the pack -> the name legacy declares it under. */
const TABLES: Record<string, string> = {
  VW: 'VW',
  VH: 'VH',
  HUB: 'HUB',
  ORGAN_POS: 'ORGAN_POS',
  CHIP_POS: 'CHIP_POS',
  BRANCH: 'BRANCH',
  ROUTE: 'ROUTE',
  ENTRY: 'ENTRY',
  REGIONS: 'REGIONS',
  REGION_BOX: 'REGION_BOX',
  REGION_LABEL: 'REGION_LABEL',
  FACT: 'FACT',
  DZINFO: 'DZINFO',
  DZSTATS: 'S', // BRIEF §3 renames legacy's `S` on extraction
  UM: 'UM',
  UI_: 'UI_',
  RNAME: 'RNAME',
  RGLYPH: 'RGLYPH',
  ORGAN_ART: 'ORGAN_ART',
};

const at = (k: string): unknown => (content as unknown as Record<string, unknown>)[k];

describe('C3: extracted UI content matches v2_ui.html exactly', () => {
  for (const [ours, theirs] of Object.entries(TABLES)) {
    it(`${ours} — same values, same key order`, () => {
      expect(canonical(at(ours))).toBe(canonical(legacyUiTable(theirs)));
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
        expect(keys.every(intLike), `${name}.${outer} has a non-integer key: ${keys.join(',')}`).toBe(
          true,
        );
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
