/**
 * AFTER A GAME ON EASY THE RESULT SAYS WHAT NORMAL AND HARD CHANGE (stage L6, ruled 2 October
 * 2026). The guided game ends as a game on Easy, so this is where its player is told that the
 * other difficulties differ; and after a game on Normal or Hard there is nothing to tell.
 * Control: pnpm ci:selftest result-says-what-changes-after-easy.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { t } from '../i18n';

import { differenceSummary } from './difficultyFacts';
import { ResultScreen } from './ResultScreen';

const result = (difficulty: string | null): string =>
  renderToStaticMarkup(
    createElement(ResultScreen, {
      won: false,
      lossOrgan: null,
      stats: { turns: 12, organsDamaged: 2, antibodiesMade: 0 },
      difficulty,
      onPlayAgain: () => undefined,
      onChangeDifficulty: () => undefined,
      onTitle: () => undefined,
    }),
  );

describe('the result of a game on Easy', () => {
  it('says what Normal and Hard change, with the rest one tap away', () => {
    const html = result('training');
    if (!html.includes('data-result-differences'))
      throw new Error('THE RESULT OF A GAME ON EASY DOES NOT SAY WHAT CHANGES');
    expect(html).toContain(t('differences.resultLead', differenceSummary()));
    expect(html).toContain('data-differences="closed"');
    expect(html).toContain(t('differences.resultToggle'));
    // Closed until it is asked for: the card of six rows is not on the page.
    expect(html).not.toContain('data-differences-card');
  });

  it.each(['normal', 'hard', null])('says nothing of it after a game on %s', (d) => {
    const html = result(d);
    expect(html).not.toContain('data-result-differences');
    expect(html).not.toContain('data-differences');
  });
});
