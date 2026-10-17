/**
 * THE GUIDED GAME'S LESSON, PLAYED (stage L6, `docs/LOOK_PLAN.md` §18 and §19).
 *
 * The lesson is content: turns, each with what arrives and the steps a player is led through
 * (`@immunity-wars/content`, `guide/lesson.json`). Three things here turn it into a game:
 *
 *  - `seededDice` is the dice. The engine draws every random number from one global source, so a
 *    lesson that must be the same for everyone fixes that source for as long as the rails last.
 *    `LocalSession` swaps it in ROUND EACH CALL TO THE ENGINE AND NOWHERE ELSE, so nothing but the
 *    engine draws from it, and the lesson cannot be knocked off its dice by anything the page does.
 *  - `lessonAction` turns a step, written the way a person would say it, into the action the
 *    engine is asked for: a disease's name into the id of the invader that carries it now.
 *  - `replayLesson` plays the whole lesson through a session, as a player led by it would, and
 *    says where it stopped being the lesson. The test that holds the lesson to the engine and the
 *    search that finds its seed are both this function.
 *
 * NO RULE IS HERE. Every step is put to the engine, and the engine says yes or no.
 */
import type { Lesson, LessonStep } from '@immunity-wars/content';

import { LocalSession } from './local.js';
import type { ViewState } from './types.js';

/** mulberry32: small, fast, and the same on every machine. The seed is the lesson's, in content. */
export function seededDice(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Inv = { readonly id: string; readonly disease: string; readonly remembered?: boolean };
const invadersOf = (view: ViewState): readonly Inv[] =>
  ((view as unknown as { invaders?: readonly Inv[] }).invaders ?? []) as readonly Inv[];

/**
 * The action a step asks for, in the game as it stands; or null when the step names a disease
 * that is not in the body, which is the lesson and the game having parted company.
 */
export function lessonAction(step: LessonStep, view: ViewState): Record<string, unknown> | null {
  const carrying = (dz: string): Inv | undefined => invadersOf(view).find((x) => x.disease === dz);
  const on = (action: string, dz: string, more: Record<string, unknown> = {}) => {
    const iv = carrying(dz);
    return iv ? { action, ...more, invaderId: iv.id } : null;
  };
  switch (step.do) {
    case 'produce':
      return { action: 'produce', family: step.family };
    case 'coat':
      return on('tag', step.disease);
    case 'neutralise':
      return on('neutralise', step.disease);
    case 'engulf':
      return on('engulf', step.disease, { cell: 'macrophage' });
    case 'snipe':
      return on('snipe', step.disease, { cell: 'tcell' });
    case 'nk':
      return on('nkkill', step.disease, { cell: 'nk' });
    case 'antivenom':
      return on('antivenom', step.disease);
    case 'memory': {
      const iv = invadersOf(view).find((x) => x.disease === step.disease && x.remembered === true);
      return iv ? { action: 'memoryKill', invaderId: iv.id } : null;
    }
    case 'strike':
      return on('strike', step.disease, { cell: step.cell });
    case 'move':
      return step.route !== undefined
        ? { action: 'move', cell: step.cell, zone: 'route', lane: step.route, step: step.step }
        : { action: 'move', cell: step.cell, zone: 'branch', organ: step.organ, step: step.step };
    case 'recall':
      return { action: 'recall', cell: step.cell };
    case 'net':
      return { action: 'net', cell: 'neutrophil' };
    case 'tell':
      // Said, not done: there is nothing to ask the engine for.
      return null;
    case 'resMove':
      return { action: 'resmove', organ: step.organ, step: step.step };
    case 'resEngulf':
      return on('resengulf', step.disease, { organ: step.organ });
    case 'resRecall':
      return { action: 'resrecall', organ: step.organ };
  }
}

/**
 * PLAY THE LESSON TO A PLACE IN IT, through a session already on the lesson's dice: how a player
 * who stopped comes back to the chapter they stopped before (step 3, `docs/LOOK_PLAN.md` §28).
 * Every turn before the place is played whole, as a player led by the lesson plays it; the place's
 * own turn is drawn and played to the step before it, unless the place is a turn's very start, which
 * is before that turn's cards are drawn. The same dice and the same actions bring the game to the
 * same place: `tests/session/src/guide.test.ts` plays the rest of the lesson from every chapter.
 */
export async function playLessonTo(
  session: LocalSession,
  lesson: Lesson,
  to: { readonly turn: number; readonly step: number },
): Promise<{ readonly ok: boolean; readonly why: string }> {
  const fail = (why: string): { ok: boolean; why: string } => ({ ok: false, why });
  for (let t = 0; t <= to.turn && t < lesson.turns.length; t += 1) {
    const turn = lesson.turns[t];
    if (!turn) break;
    const here = t === to.turn;
    if (here && to.step === 0) break;
    if (!(await session.sendAction({ action: 'draw' })).ok)
      return fail(`turn ${String(t + 1)}: no draw`);
    if (!(await session.sendAction({ action: 'beginCommand' })).ok)
      return fail(`turn ${String(t + 1)}: no command stage`);
    for (const step of here ? turn.steps.slice(0, to.step) : turn.steps) {
      if (step.do === 'tell') continue;
      const action = lessonAction(step, session.getView().game);
      if (!action) return fail(`${step.id}: what it names is not in the body`);
      const outcome = await session.sendAction(action);
      if (!outcome.ok) return fail(`${step.id}: refused: ${outcome.error ?? ''}`);
    }
    if (!here && !(await session.sendAction({ action: 'endCommand' })).ok)
      return fail(`turn ${String(t + 1)} would not end`);
  }
  return { ok: true, why: '' };
}

/** What a replay found. `ok` only when the whole lesson was played as it is written. */
export interface LessonReplay {
  readonly ok: boolean;
  /** Why not, in words; empty when `ok`. */
  readonly why: string;
  /** The steps the engine accepted, by id, in order. */
  readonly played: readonly string[];
  /** What arrived on each turn played, as the game reports it. */
  readonly arrived: readonly (readonly string[])[];
  /** The game as the rails end: what the player is handed. Null when the lesson did not end. */
  readonly handed: {
    readonly turn: number;
    readonly phase: string;
    readonly organsWhole: boolean;
    readonly remembered: readonly string[];
    readonly inTheBody: readonly string[];
  } | null;
}

type Loose = Record<string, unknown>;

/**
 * Play the lesson through a session of its own, with `seed` for dice, exactly as a player led by
 * it would: each turn's cards drawn, each step put to the engine, each turn ended.
 *
 * It refuses, saying why, when: the lesson's crisis is not on its turn; a step is refused; a step
 * names a disease that is not there; the NK Cell's roll misses; a disease the step was to destroy
 * is still in the body; an organ is hurt; the body is lost; or what arrived is not what is written.
 */
export async function replayLesson(lesson: Lesson, seed: number): Promise<LessonReplay> {
  const played: string[] = [];
  const arrived: string[][] = [];
  const stop = (why: string): LessonReplay => ({ ok: false, why, played, arrived, handed: null });
  const session = LocalSession.createGame(
    { difficulty: lesson.difficulty, written: lesson.turns.map((t) => t.arrive) },
    { rails: { dice: seededDice(seed) } },
  );
  const view = (): Loose => session.getView().game as unknown as Loose;
  const diseases = (): string[] => invadersOf(view() as unknown as ViewState).map((x) => x.disease);
  const hp = (): string =>
    JSON.stringify(
      Object.values((view()['organs'] ?? {}) as Record<string, { hp: number }>).map((o) => o.hp),
    );
  const whole = hp();
  try {
    for (let t = 0; t < lesson.turns.length; t += 1) {
      const turn = lesson.turns[t];
      if (!turn) break;
      const before = new Set(invadersOf(view() as unknown as ViewState).map((x) => x.id));
      if (!(await session.sendAction({ action: 'draw' })).ok)
        return stop(`turn ${String(t + 1)}: the cards would not be drawn`);
      const fresh = invadersOf(view() as unknown as ViewState).filter((x) => !before.has(x.id));
      arrived.push(fresh.map((x) => x.disease));
      if (JSON.stringify(arrived[t]) !== JSON.stringify(turn.arrive)) {
        return stop(`turn ${String(t + 1)}: what arrived is not what is written`);
      }
      if (t + 1 === lesson.crisis.turn) {
        const banner = view()['banner'] as { key?: string } | null | undefined;
        if (banner?.key !== lesson.crisis.event) {
          return stop(`turn ${String(t + 1)}'s crisis is not ${lesson.crisis.event}`);
        }
      }
      if (!(await session.sendAction({ action: 'beginCommand' })).ok)
        return stop(`turn ${String(t + 1)}: the command stage would not begin`);
      for (const step of turn.steps) {
        if (step.do === 'tell') continue;
        const action = lessonAction(step, view() as unknown as ViewState);
        if (!action) return stop(`${step.id}: what it names is not in the body`);
        const outcome = await session.sendAction(action);
        if (!outcome.ok) return stop(`${step.id}: refused: ${outcome.error ?? ''}`);
        if (step.do === 'nk' && diseases().includes(step.disease))
          return stop(`${step.id}: the NK Cell missed`);
        played.push(step.id);
      }
      if (!(await session.sendAction({ action: 'endCommand' })).ok)
        return stop(`turn ${String(t + 1)} would not end`);
      if (view()['lost']) return stop(`the body was lost on turn ${String(t + 1)}`);
      if (hp() !== whole) return stop(`an organ was hurt on turn ${String(t + 1)}`);
    }
    const v = view();
    return {
      ok: true,
      why: '',
      played,
      arrived,
      handed: {
        turn: Number(v['turn']),
        phase: String(v['phase']),
        organsWhole: hp() === whole,
        remembered: Object.keys((v['memory'] ?? {}) as Record<string, unknown>),
        inTheBody: diseases(),
      },
    };
  } finally {
    session.dispose();
  }
}
