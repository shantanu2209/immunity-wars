/**
 * THE CLAY BOARD'S MODEL (stage L4, docs/LOOK_PLAN.md §14), held four ways.
 *
 *  1. THE PAGE AND BLENDER AGREE. The board's picture is rendered with a margin, a bloodstream of
 *     a certain size, and each way in's lane run on a certain distance. The page lays its own
 *     pictures over that picture with the same three numbers; if they drift, every piece stands
 *     beside its step and nothing else says so. Read from clay/board.py, the file Blender runs.
 *  2. EVERY DISEASE HAS A PICTURE. A piece's picture is chosen by kind and antigen class. Every
 *     disease the content pack can put on the board, drawn or derived, must come out as a picture
 *     that exists, and never as the unknown piece for want of one.
 *  3. THE PICTURES NAMED HERE ARE THE ONES BUILT. `CLAY_INVADERS` against the art's manifest.
 *  4. THE LAYOUT: in the bloodstream every piece has its own place, cells ring the dish and stay
 *     inside it, and what invades is gathered at the centre.
 *
 * Controls: pnpm ci:selftest clay-page-and-blender-agree, clay-every-disease-has-a-picture.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DECK_MASTER, DERIVED, FAMILY } from '@immunity-wars/content';
import { describe, expect, it } from 'vitest';

import type { DisplayToken, NodeModel } from './Board';
import {
  BASE_R,
  CLASS_NEW,
  CLAY_INVADERS,
  CLAY_PAD,
  CLAY_UNKNOWN,
  ENTRY_OUT,
  HUB_WELL_R,
  PIECE_SPAN,
  classOf,
  entryCoin,
  organCoin,
  pieceFor,
} from './clay';
import { clayLayout } from './clayLayout';
import { BOARD_ORGANS, HUB_POS, LANES, entryOf } from './geometry';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const CLAY = join(REPO, 'tools/art-pipeline/clay');

/** A number a Blender script wrote down: `NAME = 24`, at the start of a line. */
function written(file: string, name: string): number {
  const m = new RegExp(`^${name} = ([0-9.]+)`, 'm').exec(readFileSync(join(CLAY, file), 'utf8'));
  if (!m?.[1]) throw new Error(`clay/${file} names no ${name}`);
  return Number(m[1]);
}

describe('the page and Blender agree', () => {
  it('on the margin, the bloodstream and how far a way in stands out', () => {
    const differ = [
      ['CLAY_PAD', CLAY_PAD, written('board.py', 'PAD')],
      ['ENTRY_OUT', ENTRY_OUT, written('board.py', 'ENTRY_OUT')],
      ['HUB_WELL_R', HUB_WELL_R, written('board.py', 'HUB_WELL_R')],
      // a piece's picture: 0.9 Blender units wide, and a board unit is 0.01 of one
      ['PIECE_SPAN', PIECE_SPAN, Math.round(written('pieces.py', 'PIECE_SPAN') * 100)],
    ].filter(([, page, blender]) => page !== blender);
    expect(
      differ.map(
        ([name, page, blender]) =>
          `THE PAGE AND BLENDER DISAGREE: ${String(name)} is ${String(page)} on the page and ${String(blender)} in Blender`,
      ),
    ).toEqual([]);
  });

  it('CONTROL, must fail: a number the script does not write down is refused, not read as nothing', () => {
    expect(() => written('board.py', 'NO_SUCH_NUMBER')).toThrow(/names no NO_SUCH_NUMBER/);
  });
});

describe('which picture stands for what', () => {
  const diseases: Array<{ dz: string; type: string }> = [
    ...(DECK_MASTER as ReadonlyArray<{ dz: string; type: string }>).map((c) => ({
      dz: c.dz,
      type: c.type,
    })),
    ...Object.entries(DERIVED as Record<string, { type: string }>).map(([dz, d]) => ({
      dz,
      type: d.type,
    })),
  ];

  it('every disease the content pack can put on the board has a picture', () => {
    // Read the instrument that reports coverage: 97 drawn and 10 derived, at this writing.
    expect(diseases.length).toBeGreaterThanOrEqual(100);
    const none = diseases
      .map((d) => ({ ...d, ...pieceFor(d.type, classOf(d.dz, false), false) }))
      .filter((d) => !d.known || !CLAY_INVADERS.has(d.piece));
    expect(
      none.map(
        (d) => `CLAY PIECE: ${d.dz} (${d.type}, ${classOf(d.dz, false)}) has no picture of its own`,
      ),
    ).toEqual([]);
  });

  it('a disease is the unknown piece only when its antigen is new, and Pathogen X is', () => {
    const unknown = diseases.filter(
      (d) => pieceFor(d.type, classOf(d.dz, false), false).piece === CLAY_UNKNOWN,
    );
    expect(unknown.map((d) => d.dz)).toEqual(['Pathogen X']);
    expect(classOf('Pathogen X', false)).toBe(CLASS_NEW);
    // and whatever the game masks is unknown, whatever it really is
    expect(pieceFor('virus', classOf('Influenza', true), false).piece).toBe(CLAY_UNKNOWN);
  });

  it('the colour a piece wears is the class the content pack gives its disease', () => {
    expect(pieceFor('virus', classOf('Influenza', false), false).piece).toBe(
      `virus-${(FAMILY as Record<string, string>)['Influenza'] ?? ''}`,
    );
    expect(pieceFor('virus', 'ENV', false).piece).not.toBe(pieceFor('virus', 'NAK', false).piece);
  });

  it('a coat is in the picture for the three kinds that can be coated, and marked for any other', () => {
    for (const [type, cls] of [
      ['bacteria', 'EXB'],
      ['bacteria', 'ICB'],
      ['parasite', 'EUK'],
      ['worm', 'EUK'],
    ] as const)
      expect(pieceFor(type, cls, true), type).toEqual({
        piece: `${type}-${cls}-coated`,
        known: true,
        coatDrawn: true,
      });
    expect(pieceFor('virus', 'ENV', true)).toEqual({
      piece: 'virus-ENV',
      known: true,
      coatDrawn: false,
    });
  });

  it('CONTROL, must fail: a kind in a class nobody drew is reported, not passed off as known', () => {
    expect(pieceFor('fungus', 'TOX', false)).toEqual({
      piece: CLAY_UNKNOWN,
      known: false,
      coatDrawn: false,
    });
  });

  it('the pictures named here are the ones the art pipeline built', () => {
    const manifest = JSON.parse(
      readFileSync(join(REPO, 'packages/app/public/art/clay/manifest.json'), 'utf8'),
    ) as { assets: Record<string, { view: string; kind: string }> };
    const built = Object.entries(manifest.assets)
      .filter(([, a]) => a.view === 'board' && a.kind === 'invader')
      .map(([k]) => k.replace(/^board\//, ''))
      .sort();
    expect(built.length).toBeGreaterThanOrEqual(18);
    expect([...CLAY_INVADERS].sort()).toEqual(built);
    // and the board's own art: a coin for every organ and every way in, and the board itself
    for (const o of BOARD_ORGANS)
      expect(manifest.assets[`board/organ-${o}`]?.kind, o).toBe('organ');
    for (const l of LANES) expect(manifest.assets[`board/entry-${l}`]?.kind, l).toBe('entry');
    expect(manifest.assets['table/board']?.kind).toBe('board');
  });
});

describe('where the coins stand', () => {
  it('every organ and every way in has a place, and a way in stands beyond its ENTRY point', () => {
    for (const o of BOARD_ORGANS) expect(organCoin(o), o).not.toBeNull();
    for (const lane of LANES) {
      const e = entryOf(lane);
      const c = entryCoin(lane);
      if (!e || !c) throw new Error(`no place for ${lane}`);
      const d = (p: { x: number; y: number }): number =>
        Math.hypot(p.x - HUB_POS.x, p.y - HUB_POS.y);
      expect(d(c) - d(e), lane).toBeCloseTo(ENTRY_OUT, 5);
    }
  });
});

const cellTok = (ck: string, pos: { x: number; y: number }): DisplayToken => ({
  key: `cell-${ck}`,
  label: ck,
  kind: 'cell',
  pos,
  cell: ck,
  art: `cell-${ck}`,
  piece: ck,
  count: 1,
});
const ivTok = (ty: string, pos: { x: number; y: number }, n: number): DisplayToken => ({
  key: `ivg-${ty}`,
  label: ty,
  kind: 'invader',
  pos,
  art: `path-${ty}`,
  piece: ty,
  count: n,
  ids: Array.from({ length: n }, (_, i) => `${ty}${String(i)}`),
});
const node = (pos: { x: number; y: number }, display: DisplayToken[]): NodeModel => ({
  pos,
  display,
  inspect: {
    x: pos.x,
    y: pos.y,
    cells: [],
    unavailable: {},
    resident: null,
    invaders: [],
    organ: null,
  },
});
const far = (p: { x: number; y: number }): number => Math.hypot(p.x - HUB_POS.x, p.y - HUB_POS.y);

describe('the bloodstream is a zone, not a step', () => {
  const cells = ['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil'];
  const hub = node(HUB_POS, [
    ...['virus', 'bacteria', 'toxin', 'worm'].map((ty) => ivTok(ty, HUB_POS, 3)),
    ...cells.map((ck) => cellTok(ck, HUB_POS)),
  ]);
  const layout = hub.display.map((_, i) => clayLayout(hub, i));

  it('every piece has its own place', () => {
    const keys = new Set(layout.map((l) => `${l.pos.x.toFixed(1)}:${l.pos.y.toFixed(1)}`));
    expect(keys.size).toBe(hub.display.length);
  });

  it('cells ring the dish and their bases stay inside it; what invades is gathered at the centre', () => {
    hub.display.forEach((t, i) => {
      const l = layout[i];
      if (!l) throw new Error('missing layout');
      if (t.kind === 'cell')
        expect(far(l.pos) + BASE_R * l.scale, t.key).toBeLessThanOrEqual(HUB_WELL_R);
      else expect(far(l.pos), t.key).toBeLessThan(HUB_WELL_R / 2);
    });
  });

  it('seven cells in a ring do not stand on one another', () => {
    const ring = layout.slice(4);
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      if (!b) throw new Error('missing layout');
      const apart = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
      expect(apart, `cells ${i} and ${i + 1}`).toBeGreaterThanOrEqual(BASE_R * a.scale * 2);
    });
  });

  it('a lone invader in an empty bloodstream stands at its centre, nearly full size', () => {
    const one = node(HUB_POS, [ivTok('virus', HUB_POS, 1)]);
    expect(clayLayout(one, 0)).toEqual({ pos: HUB_POS, scale: 0.9 });
  });
});

describe('on a step', () => {
  const at = { x: HUB_POS.x + 100, y: HUB_POS.y };
  it('one piece stands on it at full size', () => {
    expect(clayLayout(node(at, [cellTok('nk', at)]), 0)).toEqual({ pos: at, scale: 1 });
  });

  it('two share it side by side, each smaller, the first to the left', () => {
    const n = node(at, [cellTok('nk', at), ivTok('virus', at, 1)]);
    const [a, b] = [clayLayout(n, 0), clayLayout(n, 1)];
    expect(a.scale).toBeLessThan(1);
    expect(a.scale).toBe(b.scale);
    expect(a.pos.x).toBeLessThan(b.pos.x);
    expect((a.pos.x + b.pos.x) / 2).toBeCloseTo(at.x, 5);
  });

  it('a resident is drawn smaller than a cell a player moves', () => {
    const resident: DisplayToken = { ...cellTok('macrophage', at), resident: true, organ: 'liver' };
    delete resident.cell;
    expect(clayLayout(node(at, [resident]), 0).scale).toBeLessThan(1);
  });
});
