/**
 * RULE A, held arm by arm (docs/FINDINGS.md #97). The shapes are the ones measured on the coverage
 * data of 28 September 2026, with the operator read as the gate reads it: from the end of the
 * previous operand's span, so a first operand's is always ''.
 */
import { describe, expect, it } from 'vitest';

import { isFallbackArm, type ArmShape } from './rule-a.js';

const arm = (over: Partial<ArmShape>): ArmShape => ({
  kind: 'branch',
  type: 'binary-expr',
  op: '??',
  span: '0;',
  ...over,
});

describe('rule A excludes the fallback, and only the fallback', () => {
  it('excludes the operand after a ??, whatever it is', () => {
    expect(isFallbackArm(arm({ span: '0) + ' }))).toBe(true);
    expect(isFallbackArm(arm({ span: 'RATE_CAP_BY_DIFF.normal;' }))).toBe(true);
    // A chain's middle operand, whose ?? ended the line above: `a ??\n b ?? c`.
    expect(isFallbackArm(arm({ span: 'DECK_MASTER.find((c) => c.type === type) ??' }))).toBe(true);
  });

  it('excludes the literal after an ||, as the rule has always named them', () => {
    for (const span of ['0) - ', '1;', '{}, ', '[]', "''}", '""'])
      expect(isFallbackArm(arm({ op: '||', span })), span).toBe(true);
  });

  it('keeps the LEFT operand, the live path (ap.ts:31): nothing leads to it', () => {
    expect(isFallbackArm(arm({ op: '', span: 'g.apBudget[pid] || ' }))).toBe(false);
    expect(isFallbackArm(arm({ op: '', span: 'g.ab[f] ?? ' }))).toBe(false);
  });

  it('keeps an || that is a real alternative, not a literal fallback', () => {
    expect(isFallbackArm(arm({ op: '||', span: 'hit.lodged);' }))).toBe(false);
  });

  it("keeps a ternary's else and an if's arms, on the same line as a ?? or not", () => {
    expect(isFallbackArm(arm({ type: 'cond-expr', op: ' :', span: '0;' }))).toBe(false);
    expect(isFallbackArm(arm({ type: 'if', op: '', span: '' }))).toBe(false);
  });

  it('keeps a function that was never called, whatever its line holds', () => {
    expect(isFallbackArm(arm({ kind: 'function' }))).toBe(false);
  });
});
