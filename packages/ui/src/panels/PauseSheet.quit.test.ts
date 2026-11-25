/**
 * QUIT ASKS NOTHING (Gate 2's polish, piece 4, ruled 24 November 2026; docs/LOOK_PLAN.md §33). The
 * menu's Quit asked for a confirm whose note said the game was saved: a confirm that protected
 * nothing. The row now says what quitting does, on the button, and a press does it. In a game
 * together Back to the title is the same, since the seats wait; Leave the game keeps its confirm,
 * being the one that cannot be undone.
 *
 * The package has no page to press a button on, so the kit's button is stood in for by one that
 * keeps each row's own press, and the test presses that.
 * Control: pnpm ci:selftest pause-quit-asks-nothing.
 */
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { t } from '../i18n';

const presses = new Map<string, () => void>();

vi.mock('../kit/Button', () => ({
  KitButton: (props: Record<string, unknown>): ReactElement => {
    const hook = props['data-pause'];
    const press = props['onPress'];
    if (typeof hook === 'string' && typeof press === 'function')
      presses.set(hook, press as () => void);
    return createElement(
      'button',
      typeof hook === 'string' ? { 'data-pause': hook } : {},
      props['children'] as ReactElement,
    );
  },
}));

const { PauseSheet } = await import('./PauseSheet');

const menu = (together: boolean, onQuit: () => void, onLeave: () => void): string =>
  renderToStaticMarkup(
    createElement(PauseSheet, {
      onResume: () => undefined,
      onQuit,
      onSettings: () => undefined,
      onHelp: () => undefined,
      onLeave: together ? onLeave : null,
      update: null,
      onUpdate: () => undefined,
    }),
  );

describe('the menu’s way out', () => {
  beforeEach(() => presses.clear());

  it('alone, Quit says the game is saved and a press quits at once', () => {
    const quit = vi.fn();
    const html = menu(false, quit, () => undefined);
    expect(html).toContain(t('pause.quit'));
    expect(html, 'QUIT DOES NOT SAY THE GAME IS SAVED').toContain(t('pause.quitSaved'));
    presses.get('quit')?.();
    expect(quit, 'QUIT ASKED BEFORE IT QUIT').toHaveBeenCalledTimes(1);
  });

  it('together, Back to the title says the seats wait and a press goes at once', () => {
    const quit = vi.fn();
    const html = menu(true, quit, () => undefined);
    expect(html).toContain(t('pause.close'));
    expect(html, 'BACK TO THE TITLE DOES NOT SAY THE SEATS WAIT').toContain(t('pause.closeSeats'));
    presses.get('quit')?.();
    expect(quit, 'QUIT ASKED BEFORE IT QUIT').toHaveBeenCalledTimes(1);
  });

  it('together, Leave the game still asks first: it is the one that cannot be undone', () => {
    const leave = vi.fn();
    menu(true, () => undefined, leave);
    expect(presses.has('leave'), 'THE MENU HAS NO LEAVE ROW TOGETHER').toBe(true);
    presses.get('leave')?.();
    expect(leave, 'LEAVE THE GAME DID NOT ASK FIRST').not.toHaveBeenCalled();
  });

  it('the sentences are in the catalogue at all', () => {
    for (const key of ['pause.quitSaved', 'pause.closeSeats']) expect(t(key), key).not.toBe(key);
  });
});
