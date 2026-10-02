/**
 * SETTINGS: THE GUIDED GAME'S ROW, AND THE SOUND ROW.
 *
 * The guided game can be played again from here (stage L6, ruled 2 October 2026). It took the
 * place of a row that offered to show the first-game guidance again, which was taken off the
 * screen when that guidance was switched off (docs/FINDINGS.md #111) and left with it.
 *
 * Two things the row must say, because not saying them costs a player something: that it cannot
 * be started from inside a game, and, when a game is saved, that the lesson's end replaces it.
 * Control: pnpm ci:selftest settings-guide-row-says-what-it-costs.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { t } from '../i18n';

import { SettingsScreen } from './SettingsScreen';

const settings = (block: 'inPlay' | null = null, replacesSave = false): string =>
  renderToStaticMarkup(
    createElement(SettingsScreen, {
      textSize: '100',
      textSizes: ['100', '150', '200'],
      language: 'en',
      languages: ['en'],
      sound: 'on',
      sounds: ['on', 'off'],
      onChoose: () => undefined,
      deleteSaveBlock: null,
      onDeleteSave: () => undefined,
      guide: { block, replacesSave, onStart: () => undefined },
    }),
  );
/** A row of the screen, as markup: from its hook to the next row's. */
const row = (html: string, key: string): string => {
  const from = html.indexOf(`data-settings-row="${key}"`);
  if (from < 0) return '';
  const to = html.indexOf('data-settings-row="', from + 20);
  return html.slice(from, to < 0 ? undefined : to);
};

describe('the Settings screen’s guided game row', () => {
  it('is there, beside the rest of the screen', () => {
    const html = settings();
    expect(row(html, 'guide')).toContain(t('settings.guide'));
    expect(html).toContain('data-settings-row="deleteSave"');
    expect(html).toContain('data-settings-row="textSize"');
  });

  it('from inside a game it says why it cannot be started, and from the title it does not', () => {
    expect(
      row(settings('inPlay'), 'guide'),
      'THE GUIDED GAME’S ROW DOES NOT SAY WHY IT IS UNAVAILABLE',
    ).toContain(t('settings.guideInPlay'));
    expect(row(settings(null), 'guide')).not.toContain(t('settings.guideInPlay'));
  });

  it('the two confirmations say different things, and only one of them names the saved game', () => {
    expect(t('settings.guideConfirmSave')).toContain('saved game');
    expect(t('settings.guideConfirm')).not.toContain('saved game');
  });
});

describe('the Settings screen’s sound row', () => {
  it('offers on and off, and shows which is in force', () => {
    const html = settings();
    expect(html).toContain('data-settings-row="sound"');
    const on = /<button[^>]*data-settings-option="on"[^>]*>/.exec(html)?.[0] ?? '';
    const off = /<button[^>]*data-settings-option="off"[^>]*>/.exec(html)?.[0] ?? '';
    expect(on).toContain('aria-pressed="true"');
    expect(off).toContain('aria-pressed="false"');
  });
});
