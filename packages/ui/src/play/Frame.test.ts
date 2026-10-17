/**
 * THE PLAY SCREEN'S FRAME, DRAWN IN CLAY (stage L4, docs/LOOK_PLAN.md §14). What the page is given
 * for each part: the hooks the drivers and the audit find it by, the words from the catalogue, and
 * the three things the redraw could have lost without anything else noticing:
 *
 *  1. AN ACTION THAT CANNOT BE USED STILL TAKES A PRESS. It is drawn flat, and a press on it is how
 *     the player asks why. The kit's own unavailable button is dead to a finger; a frame built from
 *     it the plain way would have answered nothing. Control: frame-flat-action-still-answers.
 *  2. The Action Points are pips, as many as are left, of as many as the turn began with: in their
 *     sheet since 16 October 2026, when they moved to the play area's corner as a number.
 *  3. A view's close is the one close, with its hook, in the stage's own button's place.
 *  4. THE TOP BAR IS THE MENU, WHAT IS IN FORCE, AND THE TURN, in that order (ruled 16 October
 *     2026), and the Action Points and the messages are in the play area's corners.
 *     Control: top-bar-menu-at-start-turn-at-end.
 *  5. UNDO IS HIDDEN, AND KEPT (ruled 17 October 2026): not drawn on the card, and drawn as it was
 *     when its switch is on, so the button and its reasons stay tested. Control: undo-is-hidden.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { t } from '../i18n';
import { ApTerms } from '../panels/ApTerms';

import { ActionsView, AdvanceButton, PlayCorners, SlotClose, TabRow, TopBar } from './Frame';
import type { DockRow } from './offered';

const row = (action: string, available: boolean): DockRow =>
  ({
    action,
    label: action,
    verb: action,
    cost: null,
    target: null,
    available,
    reason: available ? null : 'not now',
    targets: [],
    offerId: available ? action : null,
  }) as unknown as DockRow;

const actions = (rows: DockRow[], undoShown?: boolean): string =>
  renderToStaticMarkup(
    createElement(ActionsView, {
      ...(undoShown === undefined ? {} : { undoShown }),
      selectedName: 'Monocyte',
      piece: { src: '/art/clay/board/macrophage@3x.webp', base: '/art/clay/board/base@3x.webp' },
      onCard: () => undefined,
      cardLabel: 'About the Monocyte',
      prompt: null,
      promptTone: 'muted',
      undo: { available: false, moves: 0, reason: 'no-moves' },
      inCommand: true,
      onUndo: () => undefined,
      rows,
      moveButtons: [],
      onMoveButton: () => undefined,
      onWhatsHere: null,
      emptyText: null,
      emptyTone: 'muted',
      disabled: false,
      onRow: () => undefined,
      onSay: () => undefined,
    }),
  );
/** The opening tag of the one element carrying `hook`. */
const tag = (html: string, hook: string): string => {
  const m = new RegExp(`<[a-z]+[^>]*${hook}[^>]*>`).exec(html);
  if (!m) throw new Error(`nothing carries ${hook}`);
  return m[0];
};

describe('the selected piece’s card', () => {
  const html = actions([row('engulf', true), row('strike', false)]);

  it('an action that can be used and one that cannot are both there, each with its hook', () => {
    expect(tag(html, 'data-dock-row="engulf"')).toContain('data-available="1"');
    expect(tag(html, 'data-dock-row="strike"')).toContain('data-available="0"');
  });

  it('an action that cannot be used still takes a press: that is how the player asks why', () => {
    const dead = ['strike']
      .map((a) => tag(html, `data-dock-row="${a}"`))
      .filter((x) => /\sdisabled(=|\s|>)/.test(x));
    expect(dead.map(() => 'A FLAT ACTION CANNOT BE PRESSED: it can no longer say why')).toEqual([]);
  });

  it('and so does the Undo that has nothing to undo, where Undo is drawn', () => {
    const shown = actions([row('engulf', true)], true);
    expect(tag(shown, 'data-dock-undo="no-moves"')).not.toMatch(/\sdisabled(=|\s|>)/);
  });

  it('Undo is not drawn: it is hidden, and kept behind its switch (17 October 2026)', () => {
    expect(html.includes('data-dock-undo'), 'THE UNDO IS ON THE SCREEN').toBe(false);
    expect(actions([row('engulf', true)], true)).toContain('data-dock-undo');
  });

  it('while a spread plays nothing on it can be pressed at all', () => {
    const playing = renderToStaticMarkup(
      createElement(ActionsView, {
        selectedName: 'Monocyte',
        onCard: null,
        cardLabel: null,
        prompt: null,
        promptTone: 'muted',
        undo: { available: true, moves: 1 },
        inCommand: true,
        onUndo: () => undefined,
        rows: [row('engulf', true)],
        moveButtons: [],
        onMoveButton: () => undefined,
        onWhatsHere: null,
        emptyText: null,
        emptyTone: 'muted',
        disabled: true,
        onRow: () => undefined,
        onSay: () => undefined,
      }),
    );
    expect(tag(playing, 'data-dock-row="engulf"')).toMatch(/\sdisabled(=|\s|>)/);
  });

  it('shows the piece in hand on its base', () => {
    expect(html).toContain('src="/art/clay/board/macrophage@3x.webp"');
    expect(html).toContain('src="/art/clay/board/base@3x.webp"');
  });
});

describe('the top bar', () => {
  const bar = (banner: boolean): string =>
    renderToStaticMarkup(
      createElement(TopBar, {
        turnText: '3/15',
        banner: banner ? { text: 'Next turn: Co-infection', kind: 'bad' } : null,
        onBanner: () => undefined,
        menu: createElement('button', { 'data-pause': '' }, 'Menu'),
      }),
    );

  it('is the menu at its start, what is in force between, and the turn at its end', () => {
    const html = bar(true);
    const at = (hook: string): number => html.indexOf(hook);
    expect(at('data-pause'), 'THE MENU IS NOT AT THE TOP BAR’S START').toBeGreaterThan(-1);
    expect(at('data-pause')).toBeLessThan(at('data-banner'));
    expect(at('data-banner'), 'THE TURN IS NOT AT THE TOP BAR’S END').toBeLessThan(at('data-turn'));
    expect(html).toContain('Next turn: Co-infection');
  });

  it('holds neither the Action Points nor the messages: they are in the play area’s corners', () => {
    const html = bar(false);
    expect(html).not.toContain('data-bar-ap');
    expect(html).not.toContain('data-chat');
    expect(html).toContain('data-turn=""');
  });
});

describe('the play area’s corners', () => {
  const corners = (together: boolean): string =>
    renderToStaticMarkup(
      createElement(PlayCorners, {
        apText: 'AP 4',
        apHave: 4,
        apAvailable: true,
        onAp: () => undefined,
        onChat: () => undefined,
        chatLabel: 'Messages',
        table: together ? { onOpen: () => undefined, waiting: 0 } : null,
      }),
    );

  it('the Action Points are a number, and a reader is told the figure', () => {
    const html = corners(false);
    expect(tag(html, 'data-bar-ap="1"')).toContain('aria-label="AP 4"');
    expect(html).toContain('>4</span>');
    expect(html).not.toContain('role="img"');
  });

  it('the messages keep their hook, and the table stands beside them when played together', () => {
    expect(tag(corners(false), 'data-chat=""')).toContain('aria-label="Messages"');
    expect(corners(false)).not.toContain('data-table-open');
    expect(corners(true)).toContain('data-table-open');
  });
});

describe('the Action Points’ sheet', () => {
  const sheet = (have: number, of: number): string =>
    renderToStaticMarkup(
      createElement(ApTerms, {
        terms: [{ text: 'Base', delta: of }],
        total: have,
        pips: { have, of },
      }),
    );
  /** The pips: the little discs in the sheet's dark strip. */
  const pips = (html: string): number =>
    (/<span role="img"[^>]*>(.*?)<\/span><\/div>/.exec(html)?.[1] ?? '').split('<span').length - 1;
  /** The pips that are lit: gold ones, which only a lit pip is. */
  const lit = (html: string): number =>
    (/<span role="img"[^>]*>(.*?)<\/span><\/div>/.exec(html)?.[1] ?? '').split('radial-gradient')
      .length - 1;

  it('shows the Action Points as pips: one for each the turn began with', () => {
    expect(pips(sheet(4, 6))).toBe(6);
    expect(pips(sheet(0, 6))).toBe(6);
  });

  it('and as many are lit as are left', () => {
    const wrong = [
      [4, 6],
      [0, 6],
      [6, 6],
    ].filter(([have, of]) => lit(sheet(have ?? 0, of ?? 0)) !== have);
    expect(
      wrong.map(
        ([have, of]) =>
          `THE PIPS DO NOT SHOW WHAT IS LEFT: ${String(have)} of ${String(of)} lights ${String(lit(sheet(have ?? 0, of ?? 0)))}`,
      ),
    ).toEqual([]);
  });

  it('more left than the turn began with is still shown whole, and a reader is told the figure', () => {
    expect(pips(sheet(7, 6))).toBe(7);
    expect(sheet(4, 6)).toContain(`aria-label="${t('ap.pips', { have: 4, of: 6 })}"`);
  });

  it('planning’s line has no pips of its own', () => {
    const html = renderToStaticMarkup(
      createElement(ApTerms, { terms: [{ text: 'Base', delta: 6 }], total: 6 }),
    );
    expect(html).not.toContain('data-ap-pips');
  });
});

describe('the bottom row', () => {
  it('a tile for each view the player has, the open one marked', () => {
    const html = renderToStaticMarkup(
      createElement(TabRow, {
        active: 'antibodies',
        disabled: false,
        shown: ['pieces', 'antibodies'],
        onTab: () => undefined,
      }),
    );
    expect(tag(html, 'data-tab="pieces"')).toContain('aria-pressed="false"');
    expect(tag(html, 'data-tab="antibodies"')).toContain('aria-pressed="true"');
    expect(html).not.toContain('data-tab="body"');
    expect(html).toContain(t('tabs.cells'));
  });

  it('the stage’s one button carries its step, and is not drawn at all while a close has its place', () => {
    const props = {
      keyName: 'endTurn',
      label: 'End turn',
      disabled: false,
      hidden: false,
      onPress: () => undefined,
    };
    expect(renderToStaticMarkup(createElement(AdvanceButton, props))).toContain(
      'data-dock-next="endTurn"',
    );
    expect(renderToStaticMarkup(createElement(AdvanceButton, { ...props, gone: true }))).toBe('');
  });

  it('a view’s close is the one close, with its hook and its word', () => {
    const html = renderToStaticMarkup(
      createElement(SlotClose, { label: 'close', onClose: () => undefined }),
    );
    expect(tag(html, 'data-nav-close="close"')).toMatch(/^<button/);
    expect(html).toContain(t('nav.close'));
    expect(
      renderToStaticMarkup(createElement(SlotClose, { label: 'back', onClose: () => undefined })),
    ).toContain(t('nav.back'));
  });
});
