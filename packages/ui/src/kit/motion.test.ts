/**
 * THE KIT'S MOTIONS ARE HELD TO THREE THINGS (docs/LOOK_PLAN.md §13).
 *
 *  1. A motion changes only where a thing is drawn, how big, how see-through and how bright. A
 *     motion that changed `left` or `width` would make the page lay itself out on every frame,
 *     which is not the way of drawing that was measured at L2.
 *  2. With less motion asked for, nothing travels: a piece that moved is simply in its new place.
 *  3. A move starts where the piece was and ends where it is drawn, and no motion outlasts one
 *     beat of the spread.
 *
 * The first two checkers are controlled here, both ways. Whether the real `motionPlan` going wrong
 * turns this suite red is the self-test's control `kit-motion-less-motion-is-still`.
 */
import { describe, expect, it } from 'vitest';

import { motionPlan, type KitMotion, type MotionPlan } from './motion';

const KINDS: KitMotion[] = [
  'move',
  'shift',
  'arrive',
  'leave',
  'engulf',
  'coat',
  'refuse',
  'hurt',
  'press',
];
const WAS = { dx: 30, dy: -12 };

/** The properties a motion may change. `offset` and `easing` are timing, not properties. */
const ALLOWED = new Set(['transform', 'opacity', 'filter', 'offset', 'easing']);
const strays = (plan: MotionPlan): string[] => [
  ...new Set(plan.keyframes.flatMap((k) => Object.keys(k)).filter((p) => !ALLOWED.has(p))),
];
/** A plan travels when its keyframes do not all draw the thing in one place at one size. */
const travels = (plan: MotionPlan): boolean =>
  new Set(plan.keyframes.map((k) => String(k['transform'] ?? ''))).size > 1;

describe('the kit’s motions', () => {
  it('every motion changes only transform, opacity and filter', () => {
    const wrong = KINDS.flatMap((kind) =>
      [false, true].flatMap((reduced) =>
        strays(motionPlan(kind, { ...WAS, reduced })).map(
          (p) => `KIT MOTION: ${kind}${reduced ? ', less motion' : ''} changes ${p}`,
        ),
      ),
    );
    expect(wrong).toEqual([]);
  });

  it('with less motion asked for, nothing travels', () => {
    const moving = KINDS.filter((kind) => travels(motionPlan(kind, { ...WAS, reduced: true })));
    expect(moving.map((k) => `KIT MOTION: with less motion asked for, ${k} still travels`)).toEqual(
      [],
    );
  });

  it('and with motion allowed, every one of them does move: the check above is not passing on stillness', () => {
    expect(KINDS.filter((kind) => !travels(motionPlan(kind, WAS)))).toEqual([]);
  });

  it('a move starts where the piece was and ends where it is drawn', () => {
    const { keyframes } = motionPlan('move', WAS);
    expect(String(keyframes[0]?.['transform'])).toMatch(/^translate\(30px, -12px\)/);
    expect(String(keyframes.at(-1)?.['transform'])).toMatch(/^translate\(0px, 0px\)/);
  });

  it('with less motion a move leaves the piece where it is drawn, and it can still be seen', () => {
    const { keyframes } = motionPlan('move', { ...WAS, reduced: true });
    expect(keyframes.every((k) => k['transform'] === undefined)).toBe(true);
    expect(keyframes.at(-1)?.['opacity']).toBe(1);
  });

  it('no motion outlasts 600 ms: a beat of the spread is 900', () => {
    for (const kind of KINDS)
      for (const reduced of [false, true]) {
        const { ms } = motionPlan(kind, { reduced });
        expect(ms, kind).toBeGreaterThan(0);
        expect(ms, kind).toBeLessThanOrEqual(600);
      }
  });

  it('CONTROL, must fail: a plan that changes `left` is reported, and one that slides is seen to travel', () => {
    const slides: MotionPlan = {
      keyframes: [
        { left: '0px', transform: 'translate(0px, 0px)' },
        { left: '9px', transform: 'translate(9px, 0px)' },
      ],
      ms: 100,
      curve: 'linear',
    };
    expect(strays(slides)).toEqual(['left']);
    expect(travels(slides)).toBe(true);
  });

  it('CONTROL, must pass: a fade is clean and is seen to stay put', () => {
    const fade: MotionPlan = {
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      ms: 100,
      curve: 'linear',
    };
    expect(strays(fade)).toEqual([]);
    expect(travels(fade)).toBe(false);
  });
});
