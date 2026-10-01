/**
 * THE KIT IS HELD TO NUMBERS (docs/LOOK_PLAN.md §13). Every pairing of colours the kit makes for
 * text or for a control must reach the bound Gate 1 keeps, every control must be at least 44 px,
 * and no text may be smaller than 12 px at rest.
 *
 * The checker is controlled here, both ways: a pairing known to fail must be reported as failing,
 * and one known to pass as passing. Whether a real token going pale turns this suite red is the
 * self-test's control `kit-contrast-reads-the-tokens`.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { KitButton, kitButtonStyle, type KitButtonKind } from './Button';
import { BOUND, PAIRS, contrast, measure } from './contrast';
import { KitPiece } from './Piece';
import { TOUCH, TYPE } from './tokens';

describe('the kit’s colour pairings', () => {
  it('every pairing reaches its bound', () => {
    const short = measure().filter((m) => !m.ok);
    // The diagnostic names the pairing: "something failed" would not say which colour to change.
    expect(
      short.map((m) => `KIT CONTRAST: ${m.name} measures ${m.ratio}:1, needs ${BOUND[m.bound]}:1`),
    ).toEqual([]);
  });

  it('covers text on every ground and every control: the list is not allowed to shrink quietly', () => {
    expect(PAIRS.length).toBeGreaterThanOrEqual(23);
    expect(new Set(PAIRS.map((p) => p.name)).size).toBe(PAIRS.length);
  });

  it('CONTROL, must fail: mid grey on mid grey is reported as short of the text bound', () => {
    const [m] = measure([{ name: 'control', fg: '#777777', bg: '#888888', bound: 'text' }]);
    expect(m?.ok).toBe(false);
  });

  it('CONTROL, must pass: black on white is reported as 21:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    const [m] = measure([{ name: 'control', fg: '#000000', bg: '#ffffff', bound: 'text' }]);
    expect(m?.ok).toBe(true);
  });
});

describe('the kit’s sizes', () => {
  const kinds: KitButtonKind[] = ['main', 'go', 'rest'];
  it('every button, in every state, is at least 44 px tall', () => {
    for (const kind of kinds)
      for (const state of ['resting', 'pressed', 'unavailable'] as const)
        expect(
          Number(kitButtonStyle(kind, state).minHeight),
          `${kind}, ${state}`,
        ).toBeGreaterThanOrEqual(TOUCH.min);
  });

  it('no text style is under 12 px at rest, and every one is in rem so the phone’s text size scales it', () => {
    for (const [name, s] of Object.entries(TYPE)) {
      if (typeof s === 'string') continue;
      expect(s.fontSize, name).toMatch(/rem$/);
      expect(parseFloat(s.fontSize) * 16, name).toBeGreaterThanOrEqual(12);
    }
  });
});

describe('the kit’s components render', () => {
  it('a button is a real button carrying the caller’s word', () => {
    const html = renderToStaticMarkup(createElement(KitButton, { kind: 'go', children: 'go' }));
    expect(html).toMatch(/^<button type="button"/);
    expect(html).toContain('>go</button>');
  });

  it('an unavailable button cannot be pressed', () => {
    expect(
      renderToStaticMarkup(createElement(KitButton, { unavailable: true, children: 'no' })),
    ).toContain('disabled=""');
  });

  it('a cell on the board stands on its base; an invader is given none', () => {
    const cell = renderToStaticMarkup(
      createElement(KitPiece, { name: 'bcell', size: 50, onBase: true, label: 'B-Cell' }),
    );
    expect(cell).toContain('/art/clay/board/base@1x.webp');
    expect(cell).toContain('/art/clay/board/bcell@3x.webp 3x');
    expect(cell).toContain('alt="B-Cell"');
    const invader = renderToStaticMarkup(
      createElement(KitPiece, { name: 'virus-ENV', size: 50, label: 'Virus' }),
    );
    expect(invader).not.toContain('base@');
  });
});
