/**
 * WHAT ARRIVES WHILE A SPREAD PLAYS, on the orders a session produces (FINDINGS #89).
 *
 * Alone: a spread, then its view. Together: a spread, its view, and whatever the others do before
 * this device has finished animating, which can include the next turn's draw, or a whole next turn
 * and its spread. Every spread's last frame must be checked against its own view, and every view
 * must be shown, in order.
 */
import type { SessionView, ViewState } from '@immunity-wars/session';
import { describe, expect, it } from 'vitest';

import { ViewQueue, type QueuedFrame } from './viewQueue';

const game = (label: string): ViewState => ({ label }) as unknown as ViewState;
const view = (label: string): SessionView => ({ game: game(label) }) as unknown as SessionView;
const frames = (...labels: string[]) => labels.map((l) => ({ view: game(l), label: l }));
/** A view's or a game's label: a SessionView carries its game under `game`. */
const labelOf = (v: SessionView | ViewState | undefined): string => {
  const g = (v !== undefined && 'game' in v ? v.game : v) as Record<string, unknown> | undefined;
  return String(g?.['label']);
};

/** Plays every frame, then shows every view, as the screen does. */
function drain(q: ViewQueue): { tails: string[]; shown: string[] } {
  const tails: string[] = [];
  const shown: string[] = [];
  let f: QueuedFrame | undefined;
  while ((f = q.nextFrame())) {
    if (f.tail) tails.push(`${labelOf(f.view)}=${labelOf(f.tail.view)}/${String(f.tail.size)}`);
  }
  let v: SessionView | undefined;
  while ((v = q.nextView())) shown.push(labelOf(v));
  return { tails, shown };
}

describe('what arrives while a spread plays', () => {
  it('alone: the spread ends in its view, which the last frame is checked against and then shown', () => {
    const q = new ViewQueue();
    q.burst(frames('f1', 'f2', 'end'));
    expect(q.view(view('end'), true)).toBe(false);
    expect(drain(q)).toEqual({ tails: ['end=end/3'], shown: ['end'] });
  });

  it("together: the next turn's draw arriving mid-spread is not what the spread is checked against, and is shown after it", () => {
    const q = new ViewQueue();
    q.burst(frames('f1', 'end'));
    q.view(view('end'), true);
    q.view(view('drawn'), true);
    expect(drain(q)).toEqual({ tails: ['end=end/2'], shown: ['end', 'drawn'] });
  });

  it('together: a whole next turn and its spread before this one finishes: each spread checked against its own view', () => {
    const q = new ViewQueue();
    q.burst(frames('a1', 'aEnd'));
    q.view(view('aEnd'), true);
    q.view(view('drawn'), true);
    q.view(view('began'), true);
    q.burst(frames('b1', 'b2', 'bEnd'));
    q.view(view('bEnd'), true);
    expect(drain(q)).toEqual({
      tails: ['aEnd=aEnd/2', 'bEnd=bEnd/3'],
      shown: ['aEnd', 'drawn', 'began', 'bEnd'],
    });
  });

  it('shows a view at once when nothing is playing or waiting, and never ahead of one that is waiting', () => {
    const q = new ViewQueue();
    expect(q.view(view('now'), false)).toBe(true);
    q.burst(frames('f1'));
    q.view(view('after'), true);
    q.nextFrame();
    // The spread has finished and 'after' has not been shown yet: a newer view waits behind it.
    expect(q.view(view('newer'), false)).toBe(false);
    expect(drain(q).shown).toEqual(['after', 'newer']);
  });

  it('holds every view back until the frames are done', () => {
    const q = new ViewQueue();
    q.burst(frames('f1', 'f2'));
    q.view(view('end'), true);
    expect(q.nextView()).toBeUndefined();
    q.nextFrame();
    q.nextFrame();
    expect(labelOf(q.nextView())).toBe('end');
  });
});
