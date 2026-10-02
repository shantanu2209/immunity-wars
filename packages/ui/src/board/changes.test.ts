/**
 * WHAT CHANGED ON THE BOARD (stage L4, docs/LOOK_PLAN.md §14): two pictures in, the changes out.
 *
 * The thing most worth holding is WHO IS WHO. A piece that stands for invaders has its step in its
 * key, so a group that walks a step has a new key; compared by key alone it would be a piece
 * leaving and another arriving, and the board would fade one out and pop one in where it should
 * walk. It is followed by the invaders it stands for. Control: board-motion-follows-the-invaders.
 */
import { describe, expect, it } from 'vitest';

import { boardChanges, soundFor, type Drawn, type Picture } from './changes';

const A = { x: 100, y: 100 };
const B = { x: 137, y: 100 };
const cell = (name: string, step: { x: number; y: number }, at = step): Drawn => ({
  key: `cell-${name}`,
  kind: 'cell',
  at,
  scale: 1,
  step,
  ids: [],
  coated: false,
});
const group = (
  what: string,
  step: { x: number; y: number },
  ids: string[],
  coated = false,
  at = step,
): Drawn => ({
  key: `ivg-${step.x}:${step.y}:${what}${coated ? ':coated' : ''}`,
  kind: 'invader',
  at,
  scale: 1,
  step,
  ids,
  coated,
});
const pic = (pieces: Drawn[], organs: Record<string, number> = {}): Picture => ({ pieces, organs });
const kinds = (before: Picture, now: Picture): string[] =>
  boardChanges(before, now).map((c) => c.kind);

describe('what changed on the board', () => {
  it('nothing, between a picture and itself', () => {
    const p = pic([cell('nk', A), group('virus:ENV', B, ['v1', 'v2'])], { heart: 3 });
    expect(boardChanges(p, p)).toEqual([]);
  });

  it('a cell that went to another step moved, from where it was', () => {
    expect(boardChanges(pic([cell('nk', A)]), pic([cell('nk', B)]))).toEqual([
      { kind: 'move', key: 'cell-nk', from: A, stepped: true },
    ]);
  });

  it('a cell nudged aside on its own step moved, and did not step', () => {
    const aside = { x: A.x - 17, y: A.y };
    expect(boardChanges(pic([cell('nk', A)]), pic([cell('nk', A, aside)]))).toEqual([
      { kind: 'move', key: 'cell-nk', from: A, stepped: false },
    ]);
  });

  it('a group that walks a step is one piece moving, not one leaving and another arriving', () => {
    const got = kinds(
      pic([group('virus:ENV', A, ['v1', 'v2'])]),
      pic([group('virus:ENV', B, ['v1', 'v2'])]),
    );
    expect(
      got.length === 1 && got[0] === 'move'
        ? []
        : [`BOARD MOTION: a group that walked a step came out as ${got.join(' + ') || 'nothing'}`],
    ).toEqual([]);
  });

  it('an invader nobody has seen before arrives', () => {
    expect(kinds(pic([]), pic([group('virus:ENV', A, ['v1'])]))).toEqual(['arrive']);
  });

  it('a group that multiplies where it stands grows; one that loses some thins', () => {
    const two = pic([group('bacteria:EXB', A, ['b1', 'b2'])]);
    const three = pic([group('bacteria:EXB', A, ['b1', 'b2', 'b3'])]);
    expect(kinds(two, three)).toEqual(['grow']);
    expect(kinds(three, two)).toEqual(['thin']);
  });

  it('a group that splits: the part that walked moves, the part that stayed thins', () => {
    const got = kinds(
      pic([group('virus:ENV', A, ['v1', 'v2'])]),
      pic([group('virus:ENV', A, ['v1']), group('virus:ENV', B, ['v2'])]),
    );
    expect(got.sort()).toEqual(['move', 'thin']);
  });

  it('the same invaders, now coated, are coated: not gone and come again', () => {
    expect(
      kinds(pic([group('bacteria:EXB', A, ['b1'])]), pic([group('bacteria:EXB', A, ['b1'], true)])),
    ).toEqual(['coat']);
  });

  it('an invader gone from a step one of your cells stands on went into that cell', () => {
    const [c] = boardChanges(
      pic([cell('macrophage', A), group('virus:ENV', A, ['v1'])]),
      pic([cell('macrophage', A)]),
    );
    expect(c?.kind).toBe('leave');
    expect(c?.kind === 'leave' ? c.eater?.key : null).toBe('cell-macrophage');
  });

  it('one gone from a step with no cell on it left, and nothing swallowed it', () => {
    const [c] = boardChanges(
      pic([cell('nk', B), group('virus:ENV', A, ['v1'])]),
      pic([cell('nk', B)]),
    );
    expect(c?.kind === 'leave' ? c.eater : 'not a leave').toBeNull();
  });

  it('an organ that lost health is hurt; one that gained, or held, is not', () => {
    const p = pic([], { heart: 3, brain: 2, liver: 1 });
    expect(boardChanges(p, pic([], { heart: 2, brain: 2, liver: 2 }))).toEqual([
      { kind: 'hurt', organ: 'heart' },
    ]);
  });
});

describe('the one sound for what just happened', () => {
  const walked = pic([group('virus:ENV', B, ['v1'])]);
  it('nothing changed: no sound', () => {
    expect(soundFor([])).toBeNull();
  });

  it('a step taken is a move; a piece only nudged aside is silent', () => {
    expect(soundFor(boardChanges(pic([group('virus:ENV', A, ['v1'])]), walked))).toBe('move');
    expect(
      soundFor(boardChanges(pic([cell('nk', A)]), pic([cell('nk', A, { x: A.x - 17, y: A.y })]))),
    ).toBeNull();
  });

  it('what matters most is what is heard: an organ hurt, over a swallow, over an arrival, over a step', () => {
    const before = pic([cell('macrophage', A), group('virus:ENV', A, ['v1'])], { heart: 3 });
    const swallowed = pic([cell('macrophage', A)], { heart: 3 });
    expect(soundFor(boardChanges(before, swallowed))).toBe('engulf');
    expect(soundFor(boardChanges(before, pic([cell('macrophage', A)], { heart: 2 })))).toBe('hurt');
    expect(
      soundFor(
        boardChanges(
          before,
          pic([cell('macrophage', B), group('virus:ENV', A, ['v1', 'v9'])], { heart: 3 }),
        ),
      ),
    ).toBe('arrive');
  });

  it('a strike from a distance is not a swallow', () => {
    expect(
      soundFor(
        boardChanges(pic([cell('nk', B), group('virus:ENV', A, ['v1'])]), pic([cell('nk', B)])),
      ),
    ).toBe('tap');
  });
});
