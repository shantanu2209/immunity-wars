/**
 * `stripMarkup`, and the claim about it corrected by measurement before it was committed.
 *
 * Three tools stripped inline markup with `s.replace(/<[^>]+>/g, '')`, a single pass. CodeQL
 * flagged that shape on PR #70 in a fourth site, under the name "incomplete multi-character
 * sanitization". The obvious reading is that a second pass would find more, and **that reading
 * is FALSE for this particular regex** — brute-forced over every string up to length 9 on the
 * alphabet `< > a`, the old spelling is idempotent everywhere, and a fixpoint of the new one
 * never iterates twice either (checked to length 10).
 *
 * So the honest account of what changed, which is smaller than the alert's name suggests:
 *
 *   1. `[^>]+` became `[^>]*`, so the EMPTY tag `<>` is removed rather than left behind. That is
 *      the entire measured behavioural difference, and the tests below pin it.
 *   2. The loop makes completeness STRUCTURAL rather than resting on an argument about greedy
 *      matching. It is belt-and-braces, measured to be so, and said to be so here rather than
 *      left as an implied claim that the loop is load-bearing.
 *   3. Three copies became one tested function.
 *
 * The tests that matter most are the agreement tests: these three call sites feed GENERATORS
 * whose committed output is checked, so the change must be inert on every well-formed input.
 */

import { describe, expect, it } from 'vitest';

import { stripMarkup } from './strip-markup.js';

/** The exact spelling that was replaced, kept as the thing being compared against. */
const singlePass = (s: string, replacement = ''): string => s.replace(/<[^>]+>/g, replacement);

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
      expect(stripMarkup(s)).toBe(singlePass(s));
      expect(stripMarkup(s, ' ')).toBe(singlePass(s, ' '));
    }
  });

  it('the one measured difference: the empty tag is removed rather than left behind', () => {
    expect(singlePass('a<>b')).toBe('a<>b');
    expect(stripMarkup('a<>b')).toBe('ab');
  });

  it('CONTROL: the difference is real in both directions, so neither claim is vacuous', () => {
    // If stripMarkup regressed to the old spelling this goes red...
    expect(stripMarkup('<>')).not.toBe(singlePass('<>'));
    // ...and if the old spelling were secretly already doing it, this would.
    expect(singlePass('<>')).toBe('<>');
  });

  it('a stray angle bracket is NOT markup and is left alone, by both', () => {
    // Stated because the first draft of this test asserted the opposite and was wrong.
    // `a > b` is prose. Removing lone brackets would corrupt the strings these tools read.
    expect(stripMarkup('3 > 2')).toBe('3 > 2');
    expect(stripMarkup('a < b')).toBe('a < b');
  });

  it('terminates on inputs built to make a careless fixpoint loop hang', () => {
    const deep = `${'<'.repeat(200)}b${'>'.repeat(200)}text`;
    expect(stripMarkup(deep).endsWith('text')).toBe(true);
    expect(stripMarkup(`${'<b>'.repeat(500)}x`)).toBe('x');
    expect(stripMarkup('<'.repeat(500))).toBe('<'.repeat(500));
  });

  it('the space replacement separates words rather than joining them', () => {
    // i18n-extract needs this: the key slug is built from the words, so two tags are two words.
    expect(stripMarkup('<b>alpha</b><b>beta</b>', ' ').trim()).toBe('alpha  beta');
  });
});
