/**
 * INTEGRITY STATE (S25 second pass, 5 September 2026): green at full, red at one left, amber
 * between — DERIVED from the organ's max, so the Brain's 2 has no amber state without a
 * special case, and the rule stays right if any organ's integrity ever changes in content.
 * The three colours must each clear Gate 1's 3:1 on the paper.
 */
import { describe, expect, it } from 'vitest';

import { ORGANS } from '@immunity-wars/content';

import { INTEGRITY_COLOUR, integrityState } from './Board';

const lum = (hex: string): number => {
  const c = (i: number): number => {
    const s = parseInt(hex.slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(1) + 0.7152 * c(3) + 0.0722 * c(5);
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe("integrity state from the organ's own max", () => {
  it('a 3-integrity organ: full → worn → critical', () => {
    expect(integrityState(3, 3)).toBe('full');
    expect(integrityState(2, 3)).toBe('worn');
    expect(integrityState(1, 3)).toBe('critical');
    expect(integrityState(0, 3)).toBe('critical');
  });

  it('the Brain (max 2) goes green straight to red — no amber state exists for it', () => {
    const brainMax = Number(
      (ORGANS as Record<string, { integrity?: unknown }>)['brain']?.integrity,
    );
    expect(brainMax).toBe(2);
    expect(integrityState(2, brainMax)).toBe('full');
    expect(integrityState(1, brainMax)).toBe('critical');
    const seen = new Set([0, 1, 2].map((hp) => integrityState(hp, brainMax)));
    expect(seen.has('worn')).toBe(false);
  });

  it('every state colour clears 3:1 on the paper', () => {
    for (const hex of Object.values(INTEGRITY_COLOUR)) {
      expect(contrast(hex, '#FFFDF9')).toBeGreaterThanOrEqual(3);
    }
  });
});
