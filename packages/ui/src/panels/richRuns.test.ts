/**
 * The log's emphasis tokenizer: the four tokens become runs, everything else is text — and a
 * run of `<` is linear, not polynomial. The first version stripped unknown tags with a regex
 * and CodeQL flagged it (js/polynomial-redos) on the PR that introduced it; this pins the
 * replacement's behaviour and gives the pathological input a bound.
 */
import { describe, expect, it } from 'vitest';

import { richRuns } from './LogPanel.js';

describe('richRuns', () => {
  it('splits bold and italic into runs and keeps everything else as text', () => {
    expect(richRuns('<b>Monocyte</b> moved to <i>Nose 1</i>.')).toEqual([
      { text: 'Monocyte', bold: true, italic: false },
      { text: ' moved to ', bold: false, italic: false },
      { text: 'Nose 1', bold: false, italic: true },
      { text: '.', bold: false, italic: false },
    ]);
  });

  it('an unknown tag is literal text, not stripped — nothing is sanitised here', () => {
    expect(richRuns('a <span>b</span> < c')).toEqual([
      { text: 'a <span>b</span> < c', bold: false, italic: false },
    ]);
  });

  it('nested emphasis composes', () => {
    expect(richRuns('<b>x <i>y</i> z</b>')).toEqual([
      { text: 'x ', bold: true, italic: false },
      { text: 'y', bold: true, italic: true },
      { text: ' z', bold: true, italic: false },
    ]);
  });

  it('a long run of "<" is handled in linear time', () => {
    const hostile = '<'.repeat(200_000) + '<b>end</b>';
    const t0 = performance.now();
    const runs = richRuns(hostile);
    const ms = performance.now() - t0;
    expect(runs[runs.length - 1]).toEqual({ text: 'end', bold: true, italic: false });
    expect(ms, `took ${String(Math.round(ms))}ms on 200k "<"`).toBeLessThan(2000);
  });
});
