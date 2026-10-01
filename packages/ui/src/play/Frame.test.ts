/**
 * THE PLAY SCREEN'S FRAME, DRAWN IN CLAY (stage L4, docs/LOOK_PLAN.md §14). What the page is given
 * for each part: the hooks the drivers and the audit find it by, the words from the catalogue, and
 * the three things the redraw could have lost without anything else noticing:
 *
 *  1. AN ACTION THAT CANNOT BE USED STILL TAKES A PRESS. It is drawn flat, and a press on it is how
 *     the player asks why. The kit's own unavailable button is dead to a finger; a frame built from
 *     it the plain way would have answered nothing. Control: frame-flat-action-still-answers.
 *  2. The Action Points are pips, as many as are left, of as many as the turn began with.
 *  3. A view's close is the one close, with its hook, in the stage's own button's place.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { t } from '../i18n';
import { ActionsView, AdvanceButton, SlotClose, TabRow, TopBar, pipRoom } from './Frame';
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

const actions = (rows: DockRow[]): string =>
  renderToStaticMarkup(
    createElement(ActionsView, {
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

  it('and so does the Undo that has nothing to undo', () => {
    expect(tag(html, 'data-dock-undo="no-moves"')).not.toMatch(/\sdisabled(=|\s|>)/);
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
  const bar = (
    have: number,
    of: number,
    with_: { banner?: boolean; together?: boolean } = {},
  ): string =>
    renderToStaticMarkup(
      createElement(TopBar, {
        turnText: '3/15',
        apText: `AP ${String(have)}`,
        ap: { have, of },
        apAvailable: true,
        onAp: () => undefined,
        banner: with_.banner === true ? { text: 'Next turn: Co-infection', kind: 'bad' } : null,
        onBanner: () => undefined,
        onChat: () => undefined,
        chatLabel: 'Messages',
        menu: null,
        table: with_.together === true ? { onOpen: () => undefined, waiting: 0 } : null,
      }),
    );
  /** The pips: the little discs inside the AP button. */
  const pips = (html: string): number =>
    (/<span role="img"[^>]*>(.*?)<\/span><\/button>/.exec(html)?.[1] ?? '').split('<span').length -
    1;

  /** The pips that are lit: gold ones, which only a lit pip is. */
  const lit = (html: string): number =>
    (/<span role="img"[^>]*>(.*?)<\/span><\/button>/.exec(html)?.[1] ?? '').split('radial-gradient')
      .length - 1;

  it('the Action Points are pips: one for each the turn began with', () => {
    expect(pips(bar(4, 6))).toBe(6);
    expect(pips(bar(0, 6))).toBe(6);
  });

  it('and as many are lit as are left', () => {
    const wrong = [
      [4, 6],
      [0, 6],
      [6, 6],
    ].filter(([have, of]) => lit(bar(have ?? 0, of ?? 0)) !== have);
    expect(
      wrong.map(
        ([have, of]) =>
          `THE PIPS DO NOT SHOW WHAT IS LEFT: ${String(have)} of ${String(of)} lights ${String(lit(bar(have ?? 0, of ?? 0)))}`,
      ),
    ).toEqual([]);
  });

  it('more left than the turn began with is still shown whole', () => {
    expect(pips(bar(7, 6))).toBe(7);
  });

  // THE BAR'S ROOM (the Gate 1 audit's first run against this bar: the banner was 36 px wide and
  // 148 px tall beside six pips). A render to text has no widths, so what is held here is the rule
  // the measured widths gave; the audit holds the widths. Control: frame-banner-has-room.
  it('with a banner up, the points are a number, so the banner’s words have the room', () => {
    const crowded = bar(4, 6, { banner: true });
    expect(
      pips(crowded),
      'THE BANNER HAS NO ROOM: the pips are drawn beside it, which left it 36 px on a phone',
    ).toBe(0);
    expect(crowded).toContain('>4</span>');
    expect(crowded).toContain('Next turn: Co-infection');
    expect(tag(crowded, 'data-bar-ap="1"')).toContain('aria-label="AP 4"');
  });

  it('together, the table’s button takes the room of three pips', () => {
    expect(pips(bar(4, 5, { together: true }))).toBe(5);
    expect(pips(bar(4, 6, { together: true }))).toBe(0);
    expect(pipRoom(false, false)).toBe(7);
    expect(pipRoom(false, true)).toBe(5);
    expect(pipRoom(true, false)).toBe(0);
  });

  it('too many to count at a glance are said as a number, and a reader is told the figure either way', () => {
    const many = bar(11, 12);
    expect(pips(many)).toBe(0);
    expect(many).toContain('>11</span>');
    expect(tag(many, 'data-bar-ap="1"')).toContain('aria-label="AP 11"');
    expect(tag(bar(4, 6), 'data-bar-ap="1"')).toContain('aria-label="AP 4"');
  });

  it('keeps the turn, the messages and their hooks', () => {
    const html = bar(4, 6);
    expect(html).toContain('data-turn=""');
    expect(tag(html, 'data-chat=""')).toContain('aria-label="Messages"');
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
