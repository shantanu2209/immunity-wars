/**
 * ONE ROW PER KIND OF INVADER ON A TAPPED STEP (Gate 2's polish, piece 4, ruled 24 November 2026;
 * docs/LOOK_PLAN.md §33). Six Tuberculosis after division were six identical rows, 468 px inside a
 * 218 px middle. Invaders alike in everything their row says and offers are one row with their
 * number; two that differ in anything stay two rows, because a row that hid a difference would hide
 * the one a player has to act on.
 *
 * Both halves are held: what is alike is gathered, and what differs is kept apart.
 * Controls: pnpm ci:selftest inspect-sheet-gathers-what-is-alike, and
 * pnpm ci:selftest inspect-sheet-keeps-apart-what-differs.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { InspectInfo, InspectInvader } from '../board/Board';
import { t } from '../i18n';
import { InspectSheet, groupInvaders } from './InspectSheet';

const tb = (id: string, over: Partial<InspectInvader> = {}): InspectInvader => ({
  id,
  disease: 'Tuberculosis',
  type: 'bacteria',
  novel: false,
  hp: 1,
  maxhp: 1,
  cls: 'ICB',
  coated: false,
  stage: null,
  hiddenIn: null,
  organ: null,
  ...over,
});

const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => tb(id));

const sheet = (invaders: InspectInvader[]): string => {
  const info: InspectInfo = {
    x: 0,
    y: 0,
    cells: [],
    unavailable: {},
    resident: null,
    invaders,
    organ: null,
  };
  return renderToStaticMarkup(createElement(InspectSheet, { info }));
};

describe('what stands on a tapped step is listed once per kind', () => {
  it('six alike are one row, the first of them, with their number', () => {
    const groups = groupInvaders(six);
    expect(groups.length, 'SIX ALIKE ARE NOT ONE ROW').toBe(1);
    expect(groups[0]?.count).toBe(6);
    expect(groups[0]?.iv.id).toBe('a');
  });

  it('one that differs in anything its row says stays a row of its own, in the order they stand', () => {
    const differs: [string, Partial<InspectInvader>][] = [
      ['A COATED ONE IS COUNTED WITH THE UNCOATED', { coated: true }],
      ['A WOUNDED ONE IS COUNTED WITH THE WHOLE', { hp: 2, maxhp: 2 }],
      ['ANOTHER DISEASE IS COUNTED WITH THIS ONE', { disease: 'Leprosy' }],
      ['ANOTHER CLASS IS COUNTED WITH THIS ONE', { cls: 'EXB' }],
      ['ANOTHER KIND IS COUNTED WITH THIS ONE', { type: 'virus' }],
      ['A PATHOGEN NEW TO THE BODY IS COUNTED WITH A KNOWN ONE', { novel: true }],
      ['ANOTHER STAGE OF MALARIA IS COUNTED WITH THIS ONE', { stage: 'liver' }],
      ['ONE HIDING IN A CELL IS COUNTED WITH ONE THAT IS NOT', { hiddenIn: 'macrophage' }],
    ];
    for (const [said, over] of differs) {
      const groups = groupInvaders([tb('a'), tb('b'), tb('z', over), tb('c')]);
      expect(
        groups.map((g) => [g.iv.id, g.count]),
        said,
      ).toEqual([
        ['a', 3],
        ['z', 1],
      ]);
    }
  });

  it('two alike that are offered different things stay two rows', () => {
    const groups = groupInvaders([tb('a'), tb('b')], (iv) => (iv.id === 'b' ? 'Coat' : ''));
    expect(groups.length, 'TWO OFFERED DIFFERENT THINGS ARE ONE ROW').toBe(2);
  });

  it('the sheet draws the one row and says how many, and says no number of a lone one', () => {
    const html = sheet(six);
    expect(html.split('data-sheet-group=').length - 1, 'THE SHEET DRAWS A ROW FOR EACH').toBe(1);
    expect(html).toContain('data-sheet-group="6"');
    expect(html, 'THE ROW DOES NOT SAY HOW MANY').toContain(t('planning.times', { n: 6 }));
    const lone = sheet([tb('a')]);
    expect(lone).toContain('data-sheet-group="1"');
    expect(lone).not.toContain(t('planning.times', { n: 1 }));
  });
});
