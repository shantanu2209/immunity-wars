/**
 * THE TITLE HAS ONE MAIN BUTTON, AND IT IS THE RIGHT ONE (stage L5). The kit's coral button is the
 * thing a screen is for, one to a screen. On the title that is Continue when a game is waiting and
 * New game when none is; a room to rejoin is offered beside either and is not coral. Two coral
 * buttons would say two things are the main thing, which is saying nothing.
 * Control: pnpm ci:selftest title-one-main-button.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { kitButtonStyle } from '../kit/Button';

import { TitleScreen, type SaveSummary } from './TitleScreen';

const title = (save: SaveSummary | null, rejoin: { code: string } | null = null): string =>
  renderToStaticMarkup(
    createElement(TitleScreen, {
      save,
      rejoin,
      onContinue: () => undefined,
      onNewGame: () => undefined,
      onTogether: () => undefined,
      onRejoin: () => undefined,
      onSettings: () => undefined,
      onHelp: () => undefined,
      onAbout: () => undefined,
    }),
  );

/** The main button's face, as the kit draws it: read from the kit, so this follows the kit. */
const MAIN_FACE = String(kitButtonStyle('main', 'resting').background);
/** The buttons of a page, each with the hook it carries and whether it wears the main face. */
function buttons(html: string): { hook: string; main: boolean }[] {
  return [...html.matchAll(/<button[^>]*>/g)].map((m) => ({
    hook: /data-title="([^"]*)"/.exec(m[0])?.[1] ?? '',
    main: m[0].includes(MAIN_FACE.replace(/, /g, ',')) || m[0].includes(MAIN_FACE),
  }));
}
const mains = (html: string): string[] =>
  buttons(html)
    .filter((b) => b.main)
    .map((b) => b.hook);

describe('the title’s main button', () => {
  const saved: SaveSummary = { difficulty: 'training', turn: 4 };

  it('the main face is found at all: a page read as having no main button would pass', () => {
    expect(MAIN_FACE).toContain('linear-gradient');
    expect(buttons(title(null)).length).toBeGreaterThanOrEqual(5);
  });

  it('with no game waiting, New game is the one main button', () => {
    expect(mains(title(null)), 'THE TITLE’S MAIN BUTTON').toEqual(['new']);
  });

  it('with a game waiting, Continue is, and New game is not', () => {
    expect(mains(title(saved)), 'THE TITLE HAS TWO MAIN BUTTONS, OR THE WRONG ONE').toEqual([
      'continue',
    ]);
  });

  it('a room to rejoin is offered beside either, and is never the coral one', () => {
    expect(mains(title(null, { code: 'ABC123' }))).toEqual(['new']);
    expect(mains(title(saved, { code: 'ABC123' }))).toEqual(['continue']);
    expect(title(saved, { code: 'ABC123' })).toContain('data-title="rejoin"');
  });

  it('keeps the hooks the instruments find it by, and says what it resumes', () => {
    const html = title(saved);
    for (const hook of ['new', 'together', 'help', 'settings', 'about'])
      expect(html, hook).toContain(`data-title="${hook}"`);
    expect(html).toContain('4');
  });
});
