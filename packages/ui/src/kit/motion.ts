/**
 * THE KIT'S MOTION. Every tap answers, and each kind of thing that happens has its own motion
 * (docs/LOOK_PLAN.md §3, rule 2). The motions are named here once, built from the durations and
 * curves in `tokens.ts`, so the play screen at L4 and the kit page play the very same ones.
 *
 * A motion is DATA first: `motionPlan` returns the keyframes and the timing, and can be read and
 * tested without a browser. `play` hands a plan to the browser's own animation engine. A plan may
 * change only where a thing is drawn, how big, how see-through and how bright (transform, opacity,
 * filter): none of those makes the page lay itself out again, and that is the way of drawing that
 * was measured at L2. The kit's test holds every plan to that list.
 *
 * A MOVE IS PLAYED FROM THE NEW PLACE. The screen draws the piece where the game now says it is,
 * and then plays `move` from where it was. So when the motion ends, is cut short, or is never
 * played at all, the piece is where it belongs, and nothing has to be put right afterwards.
 *
 * REDUCED MOTION. When the phone asks for less motion, nothing slides, swells, bounces or shakes:
 * a thing that arrives or leaves fades, and anything else, a piece that has moved among them,
 * blinks once where it now is. What happened is still shown; only the travel is taken out.
 *
 * Play a motion on an element whose own style sets no transform: the motion would replace it.
 */
import { MOTION } from './tokens';

export type KitMotion =
  'move' | 'arrive' | 'leave' | 'engulf' | 'coat' | 'refuse' | 'hurt' | 'press';

export interface MotionPlan {
  keyframes: Keyframe[];
  ms: number;
  curve: string;
}

export interface MotionArgs {
  /**
   * In CSS px, from where the element is drawn. For `move`: where the piece WAS. For `leave`:
   * where it goes as it shrinks (into the cell that eats it).
   */
  dx?: number;
  dy?: number;
  reduced?: boolean;
}

const at = (x: number, y: number, extra = ''): string =>
  `translate(${x}px, ${y}px)${extra ? ` ${extra}` : ''}`;

export function motionPlan(
  kind: KitMotion,
  { dx = 0, dy = 0, reduced = false }: MotionArgs = {},
): MotionPlan {
  if (reduced) {
    // The end state, reached at once; arrivals and departures fade so they are still seen.
    const fade = { ms: MOTION.press.ms * 2, curve: 'linear' };
    if (kind === 'arrive' || kind === 'coat')
      return { keyframes: [{ opacity: 0 }, { opacity: 1 }], ...fade };
    if (kind === 'leave') return { keyframes: [{ opacity: 1 }, { opacity: 0 }], ...fade };
    // move, engulf, refuse, hurt, press: the thing is where it belongs and blinks once.
    return { keyframes: [{ opacity: 0.55 }, { opacity: 1 }], ...fade };
  }
  switch (kind) {
    case 'move':
      // A hop from where it was: it lifts and stretches along the way and lands with a small squash.
      return {
        keyframes: [
          { transform: at(dx, dy, 'scale(1, 1)'), offset: 0 },
          { transform: at(dx * 0.5, dy * 0.5 - 6, 'scale(1.1, 0.94)'), offset: 0.5 },
          { transform: at(0, 0, 'scale(0.96, 1.05)'), offset: 0.86 },
          { transform: at(0, 0, 'scale(1, 1)'), offset: 1 },
        ],
        ms: MOTION.move.ms,
        curve: MOTION.move.curve,
      };
    case 'arrive':
      return {
        keyframes: [
          { transform: 'scale(0)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        ms: MOTION.arrive.ms,
        curve: MOTION.arrive.curve,
      };
    case 'leave':
      return {
        keyframes: [
          { transform: at(0, 0, 'scale(1)'), opacity: 1 },
          { transform: at(dx, dy, 'scale(0)'), opacity: 0 },
        ],
        ms: MOTION.leave.ms,
        curve: MOTION.leave.curve,
      };
    case 'engulf':
      // The eater swells as it swallows, and settles.
      return {
        keyframes: [
          { transform: 'scale(1)', offset: 0 },
          { transform: 'scale(1.22, 1.16)', offset: 0.45 },
          { transform: 'scale(0.97, 1.03)', offset: 0.8 },
          { transform: 'scale(1)', offset: 1 },
        ],
        ms: MOTION.leave.ms + 150,
        curve: MOTION.move.curve,
      };
    case 'coat':
      // Antibodies snap on: a quick pop of the coated picture over the plain one.
      return {
        keyframes: [
          { transform: 'scale(1.35)', opacity: 0 },
          { transform: 'scale(0.96)', opacity: 1, offset: 0.7 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        ms: MOTION.arrive.ms,
        curve: MOTION.move.curve,
      };
    case 'refuse':
      // A short shake of the head: this cannot be done.
      return {
        keyframes: [0, -7, 6, -4, 3, 0].map((x) => ({ transform: at(x, 0) })),
        ms: 260,
        curve: 'linear',
      };
    case 'hurt':
      // An organ taking damage: it flinches and dims, and comes back.
      return {
        keyframes: [
          { transform: 'scale(1)', filter: 'brightness(1)' },
          { transform: 'scale(0.9)', filter: 'brightness(1.6)', offset: 0.2 },
          { transform: 'scale(1.06)', filter: 'brightness(0.8)', offset: 0.55 },
          { transform: 'scale(1)', filter: 'brightness(1)' },
        ],
        ms: 420,
        curve: MOTION.move.curve,
      };
    case 'press':
      return {
        keyframes: [
          { transform: 'scale(1)' },
          { transform: 'scale(0.94)' },
          { transform: 'scale(1)' },
        ],
        ms: MOTION.press.ms * 2,
        curve: MOTION.press.curve,
      };
  }
}

/** Whether the phone has asked for less motion. False where that cannot be asked (a test, a server). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Play a motion on an element. `hold` keeps the last keyframe afterwards (a piece that has left
 * stays gone until the caller stops drawing it). Resolves when the motion has ended, and at once
 * where the browser has no animation engine.
 */
export function play(
  el: Element,
  kind: KitMotion,
  args: MotionArgs & { hold?: boolean } = {},
): Promise<void> {
  const plan = motionPlan(kind, { ...args, reduced: args.reduced ?? prefersReducedMotion() });
  if (typeof el.animate !== 'function') return Promise.resolve();
  const a = el.animate(plan.keyframes, {
    duration: plan.ms,
    easing: plan.curve,
    fill: args.hold ? 'forwards' : 'none',
  });
  return a.finished.then(
    () => undefined,
    () => undefined,
  );
}
