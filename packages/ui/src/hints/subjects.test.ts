/**
 * EVERY HINT SUBJECT HAS TEXT, AND EVERY ENTRY STILL COMPOSES.
 *
 * The controller decides WHEN to show a hint; this decides that there is something to show. The
 * failure it guards is quiet: a subject whose catalogue key is missing renders the key itself or
 * an empty line, in a surface that appears once per player per thing, so nobody is likely to hit
 * it twice and report it.
 *
 * The subjects are enumerated FROM THE CONTENT PACK, not listed here. A cell or an invader type
 * added to the pack is covered on the day it is added, and the failure is "this new thing has no
 * hint" rather than "somebody forgot to update a test".
 */

import { CELL_KEYS, INV_HP } from '@immunity-wars/content';
import { describe, expect, it } from 'vitest';

import en from '../../../content/src/i18n/en/ui.json';
import {
  ANTIBODY_SUBJECT,
  RESIDENT_SUBJECT,
  cellSubject,
  hintKey,
  invaderSubject,
  type HintSubject,
} from './controller';

const CAT = en as unknown as Record<string, string | undefined>;

/** Every subject the app can contact, from the pack. */
const SUBJECTS: HintSubject[] = [
  ...CELL_KEYS.map((c) => cellSubject(c)),
  RESIDENT_SUBJECT,
  ...Object.keys(INV_HP).map((t) => invaderSubject(t)),
  ANTIBODY_SUBJECT,
];

/**
 * The band. Widened from the 150 proposed to 170, and the reason is recorded rather than the
 * number being quietly moved: two entries have no honest cut inside it. The Monocyte's list of
 * what it eats is what makes its first sentence mean anything (155), and malaria announces three
 * stages so cutting inside the three is worse than not cutting (153). A band that forced those
 * two would be a band deciding the prose.
 */
const MAX = 170;
const MIN = 40;

describe('every hint subject has usable text', () => {
  it('the set is not empty, or every test below passes over nothing', () => {
    expect(SUBJECTS.length).toBeGreaterThanOrEqual(17);
  });

  it('every subject has a hint, and no hint is empty', () => {
    for (const s of SUBJECTS) {
      const key = hintKey(s);
      expect(CAT[key], `${s} -> ${key}`).toBeDefined();
      expect((CAT[key] ?? '').trim().length, `${s} -> ${key}`).toBeGreaterThan(0);
    }
  });

  it('every hint has a rest key, even when the rest is empty', () => {
    for (const s of SUBJECTS) {
      const rest = hintKey(s).replace(/\.hint$/, '.rest');
      expect(CAT[rest], `${s} -> ${rest}`).toBeDefined();
    }
  });

  it(`every hint is between ${MIN} and ${MAX} characters`, () => {
    for (const s of SUBJECTS) {
      const text = CAT[hintKey(s)] ?? '';
      expect(text.length, `${s}: ${JSON.stringify(text)}`).toBeGreaterThanOrEqual(MIN);
      expect(text.length, `${s}: ${JSON.stringify(text)}`).toBeLessThanOrEqual(MAX);
    }
  });

  it('a hint ends a sentence, so it does not dangle when shown alone', () => {
    // This is what rules out cutting the Helper at its colon: a hint that ends mid-thought
    // reads as broken rather than short, and no length check would have caught it.
    for (const s of SUBJECTS) {
      const text = (CAT[hintKey(s)] ?? '').trim();
      expect(/[.!?]$/.test(text), `${s}: ${JSON.stringify(text.slice(-30))}`).toBe(true);
    }
  });

  it('no hint or rest carries a dash, as everywhere else in player text', () => {
    for (const s of SUBJECTS) {
      for (const key of [hintKey(s), hintKey(s).replace(/\.hint$/, '.rest')]) {
        expect(/[—–]|(^|\s)-(\s|$)/.test(CAT[key] ?? ''), key).toBe(false);
      }
    }
  });

  it('CONTROL: the checks above are not vacuous — they fire on a bad entry', () => {
    const empty = '';
    const tooLong = 'x'.repeat(MAX + 1);
    const dangling = 'Licenses the others, but only once it has been primed:';
    expect(empty.trim().length > 0).toBe(false);
    expect(tooLong.length <= MAX).toBe(false);
    expect(/[.!?]$/.test(dangling)).toBe(false);
    expect(/[—–]|(^|\s)-(\s|$)/.test('a — b')).toBe(true);
  });

  it('CONTROL: an unknown subject resolves to a key the catalogue does not have', () => {
    // Proves the "every subject has a hint" test is reading the catalogue rather than always
    // finding something.
    expect(CAT[hintKey(cellSubject('notacell'))]).toBeUndefined();
  });
});
