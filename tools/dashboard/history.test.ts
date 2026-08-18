/**
 * The history rules, including a control for a bug that shipped silently for about ten minutes.
 *
 * `mostRecentWith` exists because reading every figure off the newest record made the state-size
 * section VANISH as soon as a CI night arrived without size data. Nothing failed; the page simply
 * stopped showing a measurement. That is the worst shape of defect this project keeps finding — a
 * green run and something quietly absent — so it gets a control rather than a comment.
 */

import { describe, expect, it } from 'vitest';

import { mergeHistory, mostRecentWith, provenanceWarning, type HistoryRecord } from './history.js';

const seed: HistoryRecord[] = [
  {
    at: '2026-08-12T12:26:44Z',
    commit: '5c6cfc2',
    sourceNote: 'Task E, measured on a developer machine',
    sizeMedianChars: { hard: 21812 },
    balance: { normal: { avgTurnsSurvived: 11.0888 } },
  },
];

const ci: HistoryRecord[] = [
  { at: '2026-08-19T02:20:00Z', commit: 'aaa', coveragePct: 95.66 },
  { at: '2026-08-20T02:20:00Z', commit: 'bbb', coveragePct: 95.66 },
];

describe('merging seeded and CI history', () => {
  it('sorts chronologically regardless of which list they came from', () => {
    const merged = mergeHistory(seed, ci);
    expect(merged.map((h) => h.at)).toEqual([
      '2026-08-12T12:26:44Z',
      '2026-08-19T02:20:00Z',
      '2026-08-20T02:20:00Z',
    ]);
  });

  /** Provenance must survive the merge, or the whole distinction is decorative. */
  it('keeps seeded points local and CI points ci', () => {
    const merged = mergeHistory(seed, ci);
    expect(merged[0]?.source).toBe('local');
    expect(merged[1]?.source).toBe('ci');
  });

  it('a seed claiming to be CI is still recorded as local', () => {
    const liar = [{ ...seed[0], source: 'ci' } as HistoryRecord];
    expect(mergeHistory(liar, [])[0]?.source).toBe('local');
  });
});

describe('mostRecentWith', () => {
  /**
   * THE CONTROL for the vanishing figure. The newest record has no `sizeMedianChars`; the size
   * section must still render from the older one that does.
   */
  it('CONTROL: a figure the newest record lacks is taken from the newest record that HAS it', () => {
    const merged = mergeHistory(seed, ci);
    expect(merged[merged.length - 1]?.sizeMedianChars, 'fixture is wrong').toBeUndefined();

    const rec = mostRecentWith(merged, 'sizeMedianChars');
    expect(rec, 'the size figure vanished when a newer record arrived without it').toBeTruthy();
    expect(rec?.sizeMedianChars?.hard).toBe(21812);
  });

  it('prefers the newest record when several carry the field', () => {
    expect(mostRecentWith(mergeHistory(seed, ci), 'coveragePct')?.commit).toBe('bbb');
  });

  it('returns undefined when nothing carries it', () => {
    expect(mostRecentWith(mergeHistory([], ci), 'sizeMedianChars')).toBeUndefined();
    expect(mostRecentWith([], 'coveragePct')).toBeUndefined();
  });
});

describe('provenance warnings', () => {
  /** A pure-CI series has nothing to warn about and must not be given a caveat it has not earned. */
  it('CONTROL: says nothing about a series measured entirely by CI', () => {
    expect(provenanceWarning(mergeHistory([], ci))).toBeNull();
    expect(provenanceWarning([])).toBeNull();
  });

  /**
   * The newest point being local is a different fact from a mixed series: it means CI has never
   * measured this metric, so the series cannot grow. The wording differs because the reader has to
   * do something different about it.
   */
  it('says CI has never measured it when the newest point is local', () => {
    const w = provenanceWarning(mergeHistory(seed, []));
    expect(w).toContain('NOT MEASURED BY CI');
    expect(w).toContain('cannot grow');
    expect(w).toContain('Task E');
  });

  it('says how many points are local when CI has since taken over', () => {
    const w = provenanceWarning(mergeHistory(seed, ci));
    expect(w).toContain('1 of 3 points');
    expect(w).toContain('not CI measurements');
    expect(w, 'a mixed series is not the same claim as an unmeasured one').not.toContain(
      'cannot grow',
    );
  });
});
