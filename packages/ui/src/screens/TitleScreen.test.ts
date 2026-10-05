/**
 * THE TITLE HAS ONE MAIN BUTTON, AND IT IS THE RIGHT ONE (stage L5). The kit's coral button is the
 * thing a screen is for, one to a screen. On the title that is Continue when a game is waiting and
 * New game when none is; a room to rejoin is offered beside either and is not coral. Two coral
 * buttons would say two things are the main thing, which is saying nothing.
 *
 * ON A PHONE THAT HAS NEVER PLAYED IT IS THE GUIDED GAME (stage L6, ruled 2 October 2026): the
 * way in for a newcomer is the thing that title is for. With a game waiting it is still Continue.
 * Controls: pnpm ci:selftest title-one-main-button, title-guided-game-leads-a-new-phone.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { t } from '../i18n';
import { kitButtonStyle } from '../kit/Button';

import { TitleScreen, type SaveSummary } from './TitleScreen';

const title = (
  save: SaveSummary | null,
  rejoin: { code: string } | null = null,
  neverPlayed = false,
): string =>
  renderToStaticMarkup(
    createElement(TitleScreen, {
      save,
      rejoin,
      onContinue: () => undefined,
      onNewGame: () => undefined,
      onLearn: neverPlayed ? () => undefined : null,
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

  it('on a phone that has never played, the guided game is the one main button', () => {
    expect(
      mains(title(null, null, true)),
      'THE GUIDED GAME IS NOT THE MAIN BUTTON OF A NEW PHONE’S TITLE',
    ).toEqual(['learn']);
    // New game is still there, beside it.
    expect(title(null, null, true)).toContain('data-title="new"');
  });

  it('with a game waiting it is offered beside Continue, which is still the main one', () => {
    expect(mains(title(saved, null, true))).toEqual(['continue']);
    expect(title(saved, null, true)).toContain('data-title="learn"');
  });

  it('a player coming back to the lesson is told it continues, and at which chapter (step 3)', () => {
    const html = renderToStaticMarkup(
      createElement(TitleScreen, {
        save: null,
        onContinue: () => undefined,
        onNewGame: () => undefined,
        onLearn: () => undefined,
        learnAt: { chapter: 2, of: 7 },
        onTogether: () => undefined,
        onSettings: () => undefined,
        onHelp: () => undefined,
        onAbout: () => undefined,
      }),
    );
    expect(html, 'THE TITLE DOES NOT SAY THE LESSON CONTINUES').toContain(t('title.learnOn'));
    expect(html).toContain(t('title.learnAt', { chapter: 2, of: 7 }));
    expect(mains(html)).toEqual(['learn']);
  });

  it('on a phone that has played it is not on the title', () => {
    expect(title(null)).not.toContain('data-title="learn"');
    expect(title(saved)).not.toContain('data-title="learn"');
  });

  it('its picture is laid over its box, not sized by it (FINDINGS #127)', () => {
    // On an iPhone the picture ran down over the game's name: its browser did not resolve a height
    // of 100% against a box whose height comes from flexing inside a screen only AT LEAST one tall.
    // Chrome and WebKit 26.6 do, so no check run here can see it; this holds the cause instead.
    const html = title(saved);
    const img = /<img[^>]*>/.exec(html)?.[0] ?? '';
    expect(img, 'the picture is found at all').toContain('object-fit:contain');
    expect(img, 'THE TITLE’S PICTURE IS SIZED BY A FLEXED BOX').toContain('position:absolute');
    const box = /<div aria-hidden="true" style="([^"]*)"><img/.exec(html)?.[1] ?? '';
    expect(box, 'its box is what it is measured against').toContain('position:relative');
  });

  it('a save that cannot be continued is said, not offered, and New game is the main button', () => {
    // Step 4 (docs/LOOK_PLAN.md §28): a game a newer version saved, or one this version could not
    // open. Offering Continue would offer a button that does nothing, or continue it under older
    // rules and save over it.
    for (const blocked of ['newer', 'unreadable'] as const) {
      const html = title({ ...saved, blocked });
      expect(html, 'A SAVE THAT CANNOT BE CONTINUED IS OFFERED').not.toContain(
        'data-title="continue"',
      );
      expect(html, 'it is said').toContain('data-title="save-blocked"');
      expect(mains(html), blocked).toEqual(['new']);
    }
  });

  it('the update is offered under a game a newer version saved, and only there', () => {
    const withUpdate = (save: SaveSummary): string =>
      renderToStaticMarkup(
        createElement(TitleScreen, {
          save,
          onContinue: () => undefined,
          onNewGame: () => undefined,
          onTogether: () => undefined,
          onSettings: () => undefined,
          onHelp: () => undefined,
          onAbout: () => undefined,
          onUpdate: () => undefined,
        }),
      );
    expect(withUpdate({ ...saved, blocked: 'newer' })).toContain('data-update-now');
    expect(withUpdate({ ...saved, blocked: 'unreadable' })).not.toContain('data-update-now');
    expect(withUpdate(saved)).not.toContain('data-update-now');
  });

  it('keeps the hooks the instruments find it by, and says what it resumes', () => {
    const html = title(saved);
    for (const hook of ['new', 'together', 'help', 'settings', 'about'])
      expect(html, hook).toContain(`data-title="${hook}"`);
    expect(html).toContain('4');
  });
});
