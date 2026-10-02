/**
 * THE GUIDED GAME, AS A FUNCTION (stage L6, `docs/LOOK_PLAN.md` §6, §18 and §19).
 *
 * The lesson is content: seven turns, what arrives on each, and the steps a player is led through
 * (`@immunity-wars/content`, `LESSON`). This file turns "where the player is in it" and "what the
 * screen shows" into ONE BEAT: the sentence to say, and the one thing on the page to light. One
 * thing is lit at a time; everything else is dimmed and cannot be tapped (the plan's own rule).
 *
 * IT LEADS THE PLAYER THROUGH THE REAL CONTROLS. A beat names things on the page by the hooks the
 * page already carries (a cell, a row of the selected piece's actions, a glowing step), in the
 * order a player would tap them, and the page lights the first of them that is there. So a
 * player who has been through the lesson has tapped the Antibodies tile, a cell on the board and
 * End turn, and not a copy of them.
 *
 * IT DECIDES NOTHING ABOUT THE GAME. What a step asks the engine for is `lessonAction`'s (the
 * session's, and what the replay test plays). This file only says which control leads there, and
 * moves on when the engine has accepted exactly that. If the engine accepts something else, the
 * player and the lesson have parted, and the guide says so and lets go: it never points at a
 * step the game is no longer at.
 *
 * Pure, so every rule here is a test's (`model.test.ts`), and the page (`Spotlight.tsx`) is only
 * where it is drawn.
 */
import type { Lesson, LessonStep } from '@immunity-wars/content';
import { lessonAction, type SessionView } from '@immunity-wars/session';

/** Where the player is: the lesson's turn (from 0), and the step of it (from 0). */
export interface GuidePos {
  readonly turn: number;
  readonly step: number;
}
export const GUIDE_START: GuidePos = { turn: 0, step: 0 };

/** What the play screen is showing, as its frame names it; `waiting` when nothing is asked for. */
export type GuideStage = 'arrivals' | 'planning' | 'command' | 'spread' | 'waiting';

export interface GuideBeat {
  /** Stable: what a walk reports, and what a waved-away beat is remembered by. */
  readonly id: string;
  /** The sentence's catalogue key. */
  readonly sayKey: string;
  /**
   * What to light: the page's own hooks, in order of preference. The first that is on the page is
   * lit. Empty for a beat that only says something.
   */
  readonly stops: readonly string[];
  /** Said, not done: the card's own button moves on. */
  readonly tell: boolean;
  /** The lesson's last word: its button hands the game over. */
  readonly last: boolean;
  /**
   * The step needs nothing in hand (a remembered pathogen's ring, a venom's): the page puts down
   * whatever piece is selected before it lights the ring.
   */
  readonly nothingInHand: boolean;
}

const NEXT = '[data-dock-next]';

type Inv = { readonly id: string; readonly disease: string; readonly remembered?: boolean };
const invaders = (view: SessionView): readonly Inv[] =>
  ((view.game as unknown as { invaders?: readonly Inv[] }).invaders ?? []) as readonly Inv[];
const idOf = (view: SessionView, disease: string): string =>
  invaders(view).find((x) => x.disease === disease)?.id ?? '';

/** A cell's action: pick the cell up, then its row; a row with several targets opens their list. */
function byCell(view: SessionView, cell: string, row: string, invaderId: string): string[] {
  if (view.selection.cell !== cell) return [`[data-cell="${cell}"]`];
  return [...(invaderId ? [`[data-dock-target$="${invaderId}"]`] : []), `[data-dock-row="${row}"]`];
}

/** The page's hooks for one step, in the order a player taps them, most advanced first. */
export function stopsFor(step: LessonStep, view: SessionView): string[] {
  switch (step.do) {
    case 'produce':
      return view.selection.family === step.family
        ? ['[data-produce="ready"]', `[data-family="${step.family}"]`, '[data-tab="antibodies"]']
        : [`[data-family="${step.family}"]`, '[data-tab="antibodies"]'];
    case 'coat':
      return byCell(view, 'bcell', 'tag', idOf(view, step.disease));
    case 'neutralise':
      return byCell(view, 'bcell', 'neutralise', idOf(view, step.disease));
    case 'engulf':
      return byCell(view, 'macrophage', 'engulf', idOf(view, step.disease));
    case 'snipe':
      return byCell(view, 'tcell', 'snipe', idOf(view, step.disease));
    case 'nk':
      return byCell(view, 'nk', 'nkkill', idOf(view, step.disease));
    case 'strike':
      return byCell(view, step.cell, 'strike', idOf(view, step.disease));
    case 'net':
      return byCell(view, 'neutrophil', 'net', '');
    case 'recall':
      return view.selection.cell !== step.cell
        ? [`[data-cell="${step.cell}"]`]
        : ['[data-dock-move^="recall"]'];
    case 'move': {
      if (view.selection.cell !== step.cell) return [`[data-cell="${step.cell}"]`];
      const place =
        step.route !== undefined
          ? `route:${step.route}:${String(step.step)}`
          : `branch:${String(step.organ)}:${String(step.step)}`;
      return [`[data-at="move:${place}"]`];
    }
    case 'memory':
    case 'antivenom':
      // A ring on the board, with nothing in hand: the body's own, not a piece's.
      return [`[data-at="attack:${idOf(view, step.disease)}"]`];
    case 'resMove':
      return view.selection.resident !== step.organ
        ? [`[data-resident="${step.organ}"]`]
        : [`[data-at="resmove:${step.organ}:${String(step.step)}"]`];
    case 'resEngulf':
      return view.selection.resident !== step.organ
        ? [`[data-resident="${step.organ}"]`]
        : [`[data-dock-row="resengulf"]`];
    case 'resRecall':
      return view.selection.resident !== step.organ
        ? [`[data-resident="${step.organ}"]`]
        : ['[data-dock-move^="resrecall"]'];
    case 'tell':
      return step.cell !== undefined ? [`[data-cell="${step.cell}"]`] : [];
  }
}

/** The step the player is at, or undefined when the turn's steps are done. */
export const stepAt = (lesson: Lesson, pos: GuidePos): LessonStep | undefined =>
  lesson.turns[pos.turn]?.steps[pos.step];

/** True once every turn of the lesson has been ended. */
export const lessonOver = (lesson: Lesson, pos: GuidePos): boolean =>
  pos.turn >= lesson.turns.length;

/**
 * The beat: what to say and what to light, or null for silence. Silence is for a moment the
 * player is not being asked for anything: a dialog is up, or the turn's cards are not drawn yet.
 */
export function guideBeat(
  lesson: Lesson,
  pos: GuidePos,
  stage: GuideStage,
  view: SessionView,
): GuideBeat | null {
  const plain = { tell: false, last: false, nothingInHand: false };
  if (stage === 'spread') {
    // The spread of the turn just ended: `pos` has moved on to the next one already.
    const n = pos.turn;
    return {
      id: `t${String(n)}.spread`,
      sayKey: n === 1 ? 'guide.t1.spread' : 'guide.spread',
      stops: ['[data-tap-advance]'],
      ...plain,
    };
  }
  if (lessonOver(lesson, pos)) {
    // The last word, whatever the screen shows once the last spread is done: the next turn is not
    // drawn until the player has taken the game over (the play screen holds the draw).
    return {
      id: 'end',
      sayKey: 'guide.end',
      stops: [],
      tell: true,
      last: true,
      nothingInHand: false,
    };
  }
  const n = pos.turn + 1;
  switch (stage) {
    case 'waiting':
      return null;
    case 'arrivals':
      return {
        id: `t${String(n)}.cards`,
        sayKey: `guide.t${String(n)}.cards`,
        stops: [NEXT],
        ...plain,
      };
    case 'planning':
      return {
        id: `t${String(n)}.plan`,
        sayKey: n === 1 ? 'guide.t1.plan' : 'guide.plan',
        stops: [NEXT],
        ...plain,
      };
    case 'command': {
      const step = stepAt(lesson, pos);
      if (!step) {
        return {
          id: `t${String(n)}.end`,
          sayKey: `guide.t${String(n)}.end`,
          stops: ['[data-dock-next="endTurn"]'],
          ...plain,
        };
      }
      return {
        id: step.id,
        sayKey: `guide.${step.id}`,
        stops: stopsFor(step, view),
        tell: step.do === 'tell',
        last: false,
        nothingInHand: step.do === 'memory' || step.do === 'antivenom',
      };
    }
  }
}

/** The keys an action is known by. Two records that agree on every one of these are one action. */
const KEYS = ['action', 'invaderId', 'cell', 'family', 'zone', 'lane', 'organ', 'step'] as const;

/**
 * Is what the engine just accepted the action this step asks for? Compared on what `expected`
 * names, so a record the screen sends with more in it (a cell beside an invader) still matches.
 */
export function sameAction(
  expected: Record<string, unknown>,
  sent: Record<string, unknown>,
): boolean {
  return KEYS.every(
    (k) =>
      expected[k] === undefined ||
      // The screens leave the cell out of an action that names its invader; the engine needs neither.
      (k === 'cell' && sent[k] === undefined) ||
      expected[k] === sent[k],
  );
}

/** What an accepted action does to the player's place in the lesson. */
export type GuideMove =
  | { readonly kind: 'stay' }
  | { readonly kind: 'to'; readonly pos: GuidePos }
  /** The engine accepted something the lesson did not ask for: they have parted. */
  | { readonly kind: 'parted' };

/** The actions that are the turn's own steps, not a step of the lesson. */
const TURNS_OWN: ReadonlySet<string> = new Set(['draw', 'beginCommand', 'undo']);

/**
 * `view` is the game as it stood BEFORE the action: a step names a disease, and the invader that
 * carried it may be gone once the action is done.
 */
export function afterAccepted(
  lesson: Lesson,
  pos: GuidePos,
  view: SessionView,
  sent: Record<string, unknown>,
): GuideMove {
  if (lessonOver(lesson, pos)) return { kind: 'stay' };
  const name = String(sent['action']);
  if (TURNS_OWN.has(name)) return { kind: 'stay' };
  const step = stepAt(lesson, pos);
  if (name === 'endCommand') {
    // The turn may end only when its steps are done; a tell is not something a turn waits for.
    const left = (lesson.turns[pos.turn]?.steps ?? []).slice(pos.step).some((s) => s.do !== 'tell');
    return left ? { kind: 'parted' } : { kind: 'to', pos: { turn: pos.turn + 1, step: 0 } };
  }
  if (!step || step.do === 'tell') return { kind: 'parted' };
  const expected = lessonAction(step, view.game);
  if (!expected || !sameAction(expected, sent)) return { kind: 'parted' };
  return { kind: 'to', pos: { turn: pos.turn, step: pos.step + 1 } };
}

/** A tell's own button: on to the next step. */
export const afterTold = (pos: GuidePos): GuidePos => ({ turn: pos.turn, step: pos.step + 1 });

/** How far through the lesson the player is, counted in steps, for "12 of 40". */
export function progress(lesson: Lesson, pos: GuidePos): { n: number; of: number } {
  const of = lesson.turns.reduce((sum, t) => sum + t.steps.length, 0);
  const before = lesson.turns.slice(0, pos.turn).reduce((sum, t) => sum + t.steps.length, 0);
  return { n: Math.min(of, before + pos.step + 1), of };
}
