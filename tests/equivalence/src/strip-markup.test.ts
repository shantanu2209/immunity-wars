/**
 * `stripMarkup`, and three claims about it that checks corrected before any was believed.
 *
 * Three tools stripped inline markup with a single-pass tag regex. CodeQL flagged that shape on
 * PR #70 in a fourth site, as "incomplete multi-character sanitization".
 *
 *   CLAIM 1, and it is FALSE for that regex: a second pass would find more. Brute-forced over
 *   every string up to length 9 on `< > a`, the old spelling is idempotent everywhere, because
 *   a greedy negated class already eats across any inner `<`.
 *
 *   CLAIM 2, held briefly and also wrong: a fixpoint loop is harmless belt-and-braces. CodeQL
 *   rejected the loop as a polynomial-time regex, correctly — a linear pass inside a loop is
 *   superlinear. Claim 1 had already shown the loop bought nothing, so it went.
 *
 *   CLAIM 3, held for one CI run: a comparison regex built with `new RegExp` is not a pattern
 *   literal and so is not the flagged shape. CodeQL reads the string argument too, and said so.
 *
 * So there is **no regular expression anywhere in this file or the one it tests.** The oracle
 * below is a SECOND INDEPENDENT IMPLEMENTATION — an explicit character-by-character state
 * machine, a different algorithm from the index-jumping scanner it checks — which is a better
 * differential than comparing against the thing being replaced, and the reason it can be used
 * exhaustively. Its own discrimination is controlled: a deliberately wrong stripper must be
 * caught by it.
 *
 * Most of what is here is AGREEMENT, because two of the three call sites feed generators whose
 * committed output is checked. The one intended difference is pinned in both directions.
 */

import { describe, expect, it } from 'vitest';

import { stripMarkup } from './strip-markup.js';

/**
 * The oracle: one character at a time, with an explicit in-tag flag and a buffer holding what
 * has been seen since an unmatched `<`. If the input ends inside a tag, the buffer is prose and
 * is emitted. Deliberately a different shape from the implementation it checks.
 */
const reference = (s: string, replacement = ''): string => {
  let out = '';
  let held = '';
  let inTag = false;
  for (const ch of s) {
    if (!inTag) {
      if (ch === '<') {
        inTag = true;
        held = '<';
      } else out += ch;
    } else if (ch === '>') {
      out += replacement;
      inTag = false;
      held = '';
    } else held += ch;
  }
  return inTag ? out + held : out;
};

/** Every string up to length 8 over the alphabet that matters: 3^1 + ... + 3^8 = 9840. */
const eachString = (visit: (s: string) => void): number => {
  let seen = 0;
  const walk = (s: string): void => {
    if (s.length > 0) {
      visit(s);
      seen += 1;
    }
    if (s.length === 8) return;
    for (const ch of ['<', '>', 'a']) walk(s + ch);
  };
  walk('');
  return seen;
};

describe('stripMarkup', () => {
  it('removes the inline markup the engine actually uses', () => {
    expect(stripMarkup('<b>Eosinophil DEGRANULATED</b> — a full toxic payload')).toBe(
      'Eosinophil DEGRANULATED — a full toxic payload',
    );
    expect(stripMarkup('<i>This is how eosinophils really kill worms</i>')).toBe(
      'This is how eosinophils really kill worms',
    );
  });

  it('agrees with the superseded spelling on well-formed input, so no generator drifts', () => {
    // Expected values are LITERALS rather than a reproduction of the old regex: what matters is
    // the output those three call sites used to get, and the outputs are what is pinned.
    expect(stripMarkup('<b>Allocation phase.</b> Captain has 4 Action Points')).toBe(
      'Allocation phase. Captain has 4 Action Points',
    );
    expect(stripMarkup('plain text with no markup at all')).toBe(
      'plain text with no markup at all',
    );
    expect(stripMarkup('<b>x</b><i>y</i>')).toBe('xy');
    expect(stripMarkup('<b>{disease} has lodged in your {name}.</b> A worm does not')).toBe(
      '{disease} has lodged in your {name}. A worm does not',
    );
    expect(stripMarkup('')).toBe('');
    expect(stripMarkup('<b>alpha</b><b>beta</b>', ' ')).toBe(' alpha  beta ');
  });

  it('matches an independent implementation on every string up to length 8, both replacements', () => {
    const checked = eachString((s) => {
      expect(stripMarkup(s)).toBe(reference(s));
      expect(stripMarkup(s, ' ')).toBe(reference(s, ' '));
    });
    // Asserted, so a walk that silently visited nothing cannot pass.
    expect(checked).toBe(9840);
  });

  it('CONTROL: that comparison discriminates — a wrong stripper does NOT survive it', () => {
    // Drops every angle bracket instead of removing balanced tags. Plausible, and wrong.
    const broken = (s: string): string => s.split('<').join('').split('>').join('');
    let disagreements = 0;
    const checked = eachString((s) => {
      if (broken(s) !== reference(s)) disagreements += 1;
    });
    expect(checked).toBe(9840);
    expect(disagreements).toBeGreaterThan(0);
  });

  it('the one intended difference: the empty tag is removed rather than left behind', () => {
    // The superseded spelling required at least one character inside the brackets, so it left
    // `<>` untouched. This is the whole measured behavioural change of the replacement.
    expect(stripMarkup('a<>b')).toBe('ab');
    expect(stripMarkup('<>')).toBe('');
  });

  it('a stray angle bracket is prose and is left alone, along with everything after it', () => {
    // Stated because the first draft of this test asserted the opposite and was wrong.
    expect(stripMarkup('3 > 2')).toBe('3 > 2');
    expect(stripMarkup('a < b')).toBe('a < b');
    expect(stripMarkup('<b>x</b> and a < b')).toBe('x and a < b');
  });

  it('stays linear on the inputs that made the previous version polynomial', () => {
    // CodeQL's example: a string starting with '<' and many repetitions of '<'.
    const hostile = `${'<'.repeat(100_000)}b${'>'.repeat(100_000)}text`;
    const started = Date.now();
    expect(stripMarkup(hostile).endsWith('text')).toBe(true);
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(stripMarkup(`${'<b>'.repeat(50_000)}x`)).toBe('x');
    expect(stripMarkup('<'.repeat(50_000))).toBe('<'.repeat(50_000));
  });
});
