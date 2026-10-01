/**
 * SETTINGS DOES NOT OFFER WHAT THE APP WILL NOT DO (docs/FINDINGS.md #111). From stage L4 the coach
 * and the first-encounter hints are off until the guided game replaces them (docs/LOOK_PLAN.md §14,
 * ruling 2). The row "First game guidance: show it again" says they will appear again, so while
 * there is nothing to show the shell hands the screen no way to show it, and the row is not drawn.
 * Control: pnpm ci:selftest settings-no-guidance-row-when-off.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SettingsScreen } from './SettingsScreen';

const settings = (onResetHints: (() => void) | null): string =>
  renderToStaticMarkup(
    createElement(SettingsScreen, {
      textSize: '100',
      textSizes: ['100', '150', '200'],
      language: 'en',
      languages: ['en'],
      onChoose: () => undefined,
      deleteSaveBlock: null,
      onDeleteSave: () => undefined,
      hintsSeenAny: true,
      onResetHints,
    }),
  );

describe('the Settings screen’s first-game guidance row', () => {
  it('is not drawn when there is no guidance to show again', () => {
    const html = settings(null);
    expect(
      html.includes('data-settings-row="resetHints"'),
      'SETTINGS OFFERS THE FIRST-GAME GUIDANCE WHEN THERE IS NONE TO SHOW',
    ).toBe(false);
    // The rest of the screen is there: the row was taken out, not the screen.
    expect(html).toContain('data-settings-row="deleteSave"');
    expect(html).toContain('data-settings-row="textSize"');
  });

  it('is drawn when there is', () => {
    expect(settings(() => undefined)).toContain('data-settings-row="resetHints"');
  });
});
