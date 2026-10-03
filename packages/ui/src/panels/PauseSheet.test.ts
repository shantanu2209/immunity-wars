/**
 * THE GAME'S MENU SAYS WHEN A NEW VERSION IS READY (ruled 3 October 2026), and offers it only where
 * taking it loses nothing. Alone, Update now: the game is saved after every move. Together, it is
 * said and not offered: a reload would drop this player from the table. With none waiting, nothing.
 * And Resume stays the first row (§21 I of docs/for-P2.7.md), so the news goes last.
 * Control: pnpm ci:selftest update-menu-together-offers-no-reload.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { t } from '../i18n';
import { PauseSheet } from './PauseSheet';

const menu = (update: 'alone' | 'together' | null): string =>
  renderToStaticMarkup(
    createElement(PauseSheet, {
      onResume: () => undefined,
      onQuit: () => undefined,
      onSettings: () => undefined,
      onHelp: () => undefined,
      onLeave: update === 'together' ? () => undefined : null,
      update,
      onUpdate: () => undefined,
    }),
  );

describe('the menu and a new version', () => {
  it('the sentences it says are in the catalogue at all', () => {
    for (const key of ['update.ready', 'update.readyAlone', 'update.readyTogether'])
      expect(t(key), key).not.toBe(key);
  });

  it('with none waiting it says nothing of one', () => {
    const html = menu(null);
    expect(html).not.toContain('data-pause="update-ready"');
    expect(html).not.toContain('data-update-now');
  });

  it('alone it says one is ready and offers Update now', () => {
    const html = menu('alone');
    expect(html, 'THE MENU DOES NOT SAY A NEW VERSION IS READY').toContain(
      'data-pause="update-ready"',
    );
    expect(html).toContain(t('update.ready'));
    expect(html).toContain(t('update.readyAlone'));
    expect(html, 'ALONE, THE MENU DOES NOT OFFER THE UPDATE').toContain('data-update-now');
  });

  it('together it says so, and offers no reload', () => {
    const html = menu('together');
    expect(html).toContain('data-pause="update-ready"');
    expect(html).toContain(t('update.readyTogether'));
    expect(html, 'A GAME TOGETHER IS OFFERED A RELOAD').not.toContain('data-update-now');
  });

  it('Resume is still the first row, and the news comes after the way out', () => {
    const html = menu('alone');
    const first = /<button[^>]*>([^<]*)</.exec(html)?.[1] ?? '';
    expect(first).toBe(t('pause.resume'));
    expect(html.indexOf('data-pause="quit"')).toBeLessThan(
      html.indexOf('data-pause="update-ready"'),
    );
  });
});
