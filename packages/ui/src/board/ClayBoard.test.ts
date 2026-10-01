/**
 * THE CLAY BOARD, AS IT IS DRAWN (stage L4, docs/LOOK_PLAN.md §14). What the page is given for one
 * small position: the right picture for each thing, each with its name as its label, the hooks the
 * drivers and the audit find pieces by, and NO WORDS ON THE BOARD (ruled 1 October 2026).
 */
import type { ViewState } from '@immunity-wars/session';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ClayBoard } from './ClayBoard';

const view = {
  turn: 3,
  organs: { heart: { hp: 2, max: 3 }, brain: { hp: 1, max: 2 }, liver: { hp: 3, max: 3 } },
  cells: {
    macrophage: { zone: 'hub', alive: true },
    bcell: { zone: 'route', lane: 'nose', step: 2, alive: true },
    nk: { zone: 'hub', alive: false },
  },
  residents: { liver: { step: 0, infectedBy: null } },
  invaders: [
    { id: 'a', disease: 'Influenza', type: 'virus', zone: 'route', lane: 'nose', step: 4 },
    { id: 'b', disease: 'COVID-19', type: 'virus', zone: 'route', lane: 'nose', step: 4 },
    { id: 'c', disease: 'Common cold', type: 'virus', zone: 'route', lane: 'nose', step: 4 },
    {
      id: 'd',
      disease: 'Cellulitis',
      type: 'bacteria',
      zone: 'route',
      lane: 'wound',
      step: 1,
      tagged: true,
    },
    {
      id: 'e',
      disease: 'Pathogen X',
      type: 'virus',
      novel: true,
      zone: 'route',
      lane: 'gut',
      step: 1,
    },
  ],
} as unknown as ViewState;

const html = renderToStaticMarkup(
  createElement(ClayBoard, { view, selectedCell: 'macrophage', readyTurn: { nk: 5 } }),
);
const count = (needle: string): number => html.split(needle).length - 1;

describe('the Clay board, drawn', () => {
  it('draws the board, seven organs and six ways in, each picture named', () => {
    expect(html).toContain('/art/clay/table/board@3x.webp 1200w');
    expect(count('data-organ-icon=')).toBe(7);
    expect(count('data-entry=')).toBe(6);
    expect(html).toContain('alt="Heart"');
    expect(html).toContain('/art/clay/board/organ-heart@3x.webp');
    expect(html).toContain('/art/clay/board/entry-nose@3x.webp');
  });

  it('a cell stands on a base and an invader does not', () => {
    // Three cells and the liver's resident: four bases, and no more. Counted as pictures drawn
    // (`src=`): the markup also names each picture once more, to load it early.
    expect(count('src="/art/clay/board/base@3x.webp"')).toBe(4);
    expect(html).toContain('data-cell="bcell"');
    expect(html).toContain('data-resident="liver"');
  });

  it('a piece wears its antigen class: two classes of one kind on one step are two pieces', () => {
    expect(html).toContain('/art/clay/board/virus-ENV@3x.webp');
    expect(html).toContain('/art/clay/board/virus-NAK@3x.webp');
    // Influenza and COVID-19 are both enveloped: one piece, counted
    expect(html).toContain('data-count="2"');
    expect(count('data-count=')).toBe(1);
  });

  it('a coat is in the picture, and what the game masks is the unknown piece', () => {
    expect(html).toContain('/art/clay/board/bacteria-EXB-coated@3x.webp');
    expect(html).toContain('data-piece="unknown"');
    // not its name, and not the start of its name in a hook nobody sees either
    expect(html).not.toContain('Pathog');
  });

  it('a spent cell says when it is back, and an organ says its health by state', () => {
    expect(html).toContain('data-unavailable="spent"');
    expect(html).toContain('data-back-in="2"');
    expect(html).toMatch(/data-organ-pips="heart" data-hp="2" data-max="3" data-state="worn"/);
    expect(html).toMatch(/data-organ-pips="brain" data-hp="1" data-max="2" data-state="critical"/);
  });

  it('NO WORDS ON THE BOARD: what is written on it is numbers, and nothing else', () => {
    const written = html.replace(/<[^>]*>/g, '').trim();
    expect(
      /^[0-9\s]*$/.test(written) ? [] : [`THE BOARD HAS WORDS ON IT: ${written.slice(0, 60)}`],
    ).toEqual([]);
    // the check above is not passing on an empty board: the count and the return are both there
    expect(written.replace(/\s/g, '')).toBe('22');
  });
});
