/**
 * RULE A, ARM-PRECISE (docs/FINDINGS.md #97, 28 September 2026). The coverage gate's rule A excludes
 * the fallback of a null-coalescing expression, `x ?? y` or `x || 0`, as defensive: a miss the
 * surrounding guard has already made impossible. It used to decide by the LINE's text, so every
 * uncovered arm on a line that merely contained a `??` was excluded with it: the LEFT operand of an
 * `||` on a line nothing had ever run, which is the live path (`ap.ts:31`, a player spending their
 * points together, until the undo tests ran it), a ternary's else on the same line, and an `||`
 * between two real alternatives.
 *
 * Decided here by the arm itself, in a function a test can hold. What makes an arm a fallback is
 * the OPERATOR that led to it: a `??`, whatever follows, or an `||` followed by one of the literal
 * fallbacks the rule has always named. v8 draws an operand's span up to the next operand's start,
 * so the operator is read from the END of the previous operand's span, on whatever line that ends.
 * A first operand has no operator before it, so it is never a fallback.
 */

/** What the gate knows about one branch arm, as far as this rule needs it. */
export interface ArmShape {
  readonly kind: 'branch' | 'function';
  /** The coverage branch's type: `binary-expr`, `cond-expr`, `if`, `switch`, … */
  readonly type: string;
  /** The last two characters before this operand: the operator that led to it, or '' for none. */
  readonly op: string;
  /** The operand's own source text, from where it starts on its line. */
  readonly span: string;
}

/** The literal fallbacks rule A has named since Task C: `{}`, `[]`, `0`, `1`, `''`, `""`. */
const LITERAL = /^\s*(\{\}|\[\]|0\b|1\b|''|"")/;

export function isFallbackArm(a: ArmShape): boolean {
  return (
    a.kind === 'branch' &&
    a.type === 'binary-expr' &&
    (a.op === '??' || (a.op === '||' && LITERAL.test(a.span)))
  );
}
