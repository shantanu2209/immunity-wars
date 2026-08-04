/**
 * The whole rig's sensitivity rests on canonical(). If it collapsed two distinct states into
 * one string, every downstream comparison would silently pass. These are the collapses that
 * would actually matter for this port.
 */

import { describe, expect, it } from 'vitest';

import { canonical, hashValue } from './hash.js';

const hasControlChar = (s: string): boolean => [...s].some((ch) => ch.charCodeAt(0) < 32);

describe('canonical serialisation', () => {
  it('distinguishes NaN from null', () => {
    // JSON.stringify renders both as "null". The port is contracted to reproduce the
    // NaN-accumulating stats counters (docs/FINDINGS.md #3), so the comparator has to be
    // able to see the difference — otherwise that bug could be "fixed" without any test
    // noticing, and the equivalence proof would be silently weaker than it claims.
    expect(JSON.stringify({ a: NaN })).toBe(JSON.stringify({ a: null }));
    expect(canonical({ a: NaN })).not.toBe(canonical({ a: null }));
  });

  it('distinguishes an explicitly-undefined key from a missing key', () => {
    expect(JSON.stringify({ a: undefined })).toBe(JSON.stringify({}));
    expect(canonical({ a: undefined })).not.toBe(canonical({}));
  });

  it('preserves property order', () => {
    // Level 1 of the equivalence contract requires the port to build state objects in the
    // same order as legacy, which is also what keeps Task E's viewState byte-size a fact
    // about the game rather than an artefact of transcription.
    expect(canonical({ a: 1, b: 2 })).not.toBe(canonical({ b: 2, a: 1 }));
  });

  it('distinguishes -0 from 0, and the infinities', () => {
    expect(canonical(-0)).not.toBe(canonical(0));
    expect(canonical(Infinity)).not.toBe(canonical(-Infinity));
  });

  it('does not confuse a sentinel with a real string of the same text', () => {
    // Sentinels are unquoted; real strings are JSON-quoted. '#NaN' the string must not
    // canonicalise to the same thing as NaN the number.
    expect(canonical('#NaN')).not.toBe(canonical(NaN));
    expect(canonical('#undef')).not.toBe(canonical(undefined));
  });

  it('uses visible sentinels, not control characters', () => {
    // The sentinels were originally NUL bytes. That works, but it is unreadable, it breaks
    // grep, and it makes the source file register as binary. This test exists because that
    // is exactly what happened, and nothing else would have caught it.
    const values: unknown[] = [undefined, NaN, Infinity, -Infinity, -0, (): void => {}];
    for (const v of values) {
      expect(hasControlChar(canonical(v))).toBe(false);
    }
  });

  it('is stable and order-sensitive as a digest', () => {
    expect(hashValue({ a: 1 })).toBe(hashValue({ a: 1 }));
    expect(hashValue({ a: 1, b: 2 })).not.toBe(hashValue({ b: 2, a: 1 }));
  });
});
