/**
 * `stripMarkup`, and two claims about it that measurement corrected before either was believed.
 *
 * Three tools stripped inline markup with `s.replace(/<[^>]+>/g, '')`, a single pass. CodeQL
 * flagged that shape on PR #70 in a fourth site, as "incomplete multi-character sanitization".
 *
 *   CLAIM 1, and it is FALSE for this regex: a second pass would find more. Brute-forced over
 *   every string up to length 9 on `< > a`, the old spelling is idempotent everywhere, because
 *   greedy `[^>]*` already eats across any inner `<`.
 *
 *   CLAIM 2, held briefly and also wrong: a fixpoint loop is harmless belt-and-braces. CodeQL
 *   rejected the loop as a polynomial-time regex, correctly — a linear pass inside a loop is
 *   superlinear. Since claim 1 had already shown the loop bought nothing, it went.
 *
 * What is left is a scanner with no regex in it, and the tests below are mostly about its
 * AGREEMENT with what it replaced, because two of the three call sites feed generators whose
 * committed output is checked. The one intended difference is pinned in both directions.
 */

import { describe, expect, it } from 'vitest';

import { stripMarkup } from './strip-markup.js';

/**
 * The two spellings this function replaced, kept as the things it is compared against.
 *
 * Both patterns are built with `new RegExp` rather than written as literals ON PURPOSE. They are
 * a deliberate reproduction of superseded implementations for a differential test — nothing here
 * sanitises anything or touches a browser — and as literals they draw the very CodeQL alert this
 * file exists to record the resolution of. The strings are the exact patterns that were removed.
 */
const oldSpelling = (s: string, replacement = ''): string =>
  s.replace(new RegExp('<[^>]+>', 'g'), replacement);
const singleStarPass = (s: string, replacement = ''): string =>
  s.replace(new RegExp('<[^>]*>', 'g'), replacement);

describe('stripMarkup', () => {
  it('removes the inline markup the engine actually uses', () => {
    expect(stripMarkup('<b>Eosinophil DEGRANULATED</b> — a full toxic payload')).toBe(
      'Eosinophil DEGRANULATED — a full toxic payload',
    );
    expect(stripMarkup('<i>This is how eosinophils really kill worms</i>')).toBe(
      'This is how eosinophils really kill worms',
    );
  });

  it('agrees with the old spelling on well-formed input, which is why no generator drifts', () => {
    const wellFormed = [
      '<b>Allocation phase.</b> Captain has 4 Action Points',
      'plain text with no markup at all',
      '<b>x</b><i>y</i>',
      '<b>{disease} has lodged in your {name}.</b> A worm does not pass through',
      '',
    ];
    for (const s of wellFormed) {
      expect(stripMarkup(s)).toBe(oldSpelling(s));
      expect(stripMarkup(s, ' ')).toBe(oldSpelling(s, ' '));
    }
  });

  it('is the single-pass regex it replaced, over an exhaustive space rather than examples', () => {
    // Every string up to length 8 on the alphabet that matters. This is the claim the scanner
    // rests on: it is `s.replace(/<[^>]*>/g, r)` written as a linear walk.
    let checked = 0;
    const walk = (s: string): void => {
      if (s.length > 0) {
        expect(stripMarkup(s)).toBe(singleStarPass(s));
        expect(stripMarkup(s, ' ')).toBe(singleStarPass(s, ' '));
        checked += 1;
      }
      if (s.length === 8) return;
      for (const ch of ['<', '>', 'a']) walk(s + ch);
    };
    walk('');
    expect(checked).toBe(9840); // 3^1 + ... + 3^8 — a count, so a silent empty walk cannot pass
  });

  it('the one intended difference: the empty tag is removed rather than left behind', () => {
    expect(oldSpelling('a<>b')).toBe('a<>b');
    expect(stripMarkup('a<>b')).toBe('ab');
  });

  it('CONTROL: the difference is real in both directions, so neither claim is vacuous', () => {
    // If stripMarkup regressed to the old spelling this goes red...
    expect(stripMarkup('<>')).not.toBe(oldSpelling('<>'));
    // ...and if the old spelling had secretly been doing it already, this would.
    expect(oldSpelling('<>')).toBe('<>');
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

  it('the space replacement separates words rather than joining them', () => {
    // i18n-extract needs this: the key slug is built from the words, so two tags are two words.
    expect(stripMarkup('<b>alpha</b><b>beta</b>', ' ').trim()).toBe('alpha  beta');
  });
});
