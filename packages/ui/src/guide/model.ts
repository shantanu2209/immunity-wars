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

/**
 * Where the player is: the lesson's turn (from 0), and the step of it (from 0). `at` is a chapter's
 * own card, between two chapters (step 3, `docs/LOOK_PLAN.md` §28): `done` says the one before is
 * done and offers the choice to stop; `intro` says what the next one is about.
 */
export interface GuidePos {
  readonly turn: number;
  readonly step: number;
  readonly at?: 'done' | 'intro';
}
export const GUIDE_START: GuidePos = { turn: 0, step: 0 };

/**
 * What the play screen is showing, as its frame names it: `dialog` when a dialog is up, `waiting`
 * when nothing is asked for.
 */
export type GuideStage = 'arrivals' | 'planning' | 'command' | 'spread' | 'dialog' | 'waiting';

/**
 * A SHORTER SENTENCE FOR A LATER TAP (step 3). A step that takes more than one tap (pick the cell,
 * then its action) says the step's whole sentence when its first control is lit, and a few words
 * when a later one is: "Now tap Coat." The whole sentence has been read by then.
 */
export interface GuideThen {
  readonly key: string;
  readonly params?: Readonly<Record<string, string>>;
}

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
  /** Beside each stop, what to say when it is lit after another control of the same beat was. */
  readonly then: readonly (GuideThen | null)[];
  /** The end of a chapter: the card offers the next chapter, or to stop for now. */
  readonly chapterEnd: boolean;
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

/** A stop, and what is said when it is lit after another control of the same beat was. */
interface Stop {
  readonly hook: string;
  readonly then: GuideThen | null;
}
const first = (hook: string): Stop => ({ hook, then: null });
const tapRow = (hook: string, row: string): Stop => ({
  hook,
  then: { key: 'guide.then.tap', params: { action: `action.${row}` } },
});
const place = (hook: string): Stop => ({ hook, then: { key: 'guide.then.place' } });
const pick = (family: string): Stop => ({
  hook: `[data-family="${family}"]`,
  then: { key: 'guide.then.family', params: { family } },
});

/** A cell's action: pick the cell up, then its row; a row with several targets opens their list. */
function byCell(
  view: SessionView,
  cell: string,
  row: string,
  invaderId: string,
  dz: string,
): Stop[] {
  if (view.selection.cell !== cell) return [first(`[data-cell="${cell}"]`)];
  const target: Stop[] = invaderId
    ? [
        {
          hook: `[data-dock-target$="${invaderId}"]`,
          then: { key: 'guide.then.target', params: { disease: dz } },
        },
      ]
    : [];
  return [...target, tapRow(`[data-dock-row="${row}"]`, row)];
}

/** The page's hooks for one step, in the order a player taps them, most advanced first. */
function stopsOf(step: LessonStep, view: SessionView): Stop[] {
  const dz = 'disease' in step ? step.disease : '';
  switch (step.do) {
    case 'produce':
      return view.selection.family === step.family
        ? [
            tapRow('[data-produce="ready"]', 'produce'),
            pick(step.family),
            first('[data-tab="antibodies"]'),
          ]
        : [pick(step.family), first('[data-tab="antibodies"]')];
    case 'coat':
      return byCell(view, 'bcell', 'tag', idOf(view, dz), dz);
    case 'neutralise':
      return byCell(view, 'bcell', 'neutralise', idOf(view, dz), dz);
    case 'engulf':
      return byCell(view, 'macrophage', 'engulf', idOf(view, dz), dz);
    case 'snipe':
      return byCell(view, 'tcell', 'snipe', idOf(view, dz), dz);
    case 'nk':
      return byCell(view, 'nk', 'nkkill', idOf(view, dz), dz);
    case 'strike':
      return byCell(view, step.cell, 'strike', idOf(view, dz), dz);
    case 'net':
      return byCell(view, 'neutrophil', 'net', '', '');
    case 'recall':
      return view.selection.cell !== step.cell
        ? [first(`[data-cell="${step.cell}"]`)]
        : [tapRow('[data-dock-move^="recall"]', 'recall')];
    case 'move': {
      if (view.selection.cell !== step.cell) return [first(`[data-cell="${step.cell}"]`)];
      const where =
        step.route !== undefined
          ? `route:${step.route}:${String(step.step)}`
          : `branch:${String(step.organ)}:${String(step.step)}`;
      return [place(`[data-at="move:${where}"]`)];
    }
    case 'memory':
    case 'antivenom':
      // A ring on the board, with nothing in hand: the body's own, not a piece's.
      return [first(`[data-at="attack:${idOf(view, dz)}"]`)];
    case 'resMove':
      return view.selection.resident !== step.organ
        ? [first(`[data-resident="${step.organ}"]`)]
        : [place(`[data-at="resmove:${step.organ}:${String(step.step)}"]`)];
    case 'resEngulf':
      return view.selection.resident !== step.organ
        ? [first(`[data-resident="${step.organ}"]`)]
        : [tapRow(`[data-dock-row="resengulf"]`, 'resengulf')];
    case 'resRecall':
      return view.selection.resident !== step.organ
        ? [first(`[data-resident="${step.organ}"]`)]
        : [tapRow('[data-dock-move^="resrecall"]', 'resrecall')];
    case 'tell':
      return step.cell !== undefined
        ? [first(`[data-cell="${step.cell}"]`)]
        : step.points === 'ap'
          ? [first('[data-bar-ap]')]
          : [];
  }
}

/** The page's hooks for one step, in the order a player taps them, most advanced first. */
export function stopsFor(step: LessonStep, view: SessionView): string[] {
  return stopsOf(step, view).map((x) => x.hook);
}

/* ------------------------------------------------------------------------------------------ *
 * THE CHAPTERS (step 3, `docs/LOOK_PLAN.md` §28). The lesson is one game on its dice, cut into
 * parts. A chapter begins at a step; arriving there, the player is told the last one is done and
 * may stop, and then what the next is about. A player who stopped comes back to the start of the
 * chapter after the last one done: the session plays the chapters before it again, on the same
 * dice, to the same place (`playLessonTo`).
 * ------------------------------------------------------------------------------------------ */

/** Where chapter `c` begins, as a place in the lesson. */
export function chapterStart(lesson: Lesson, c: number): GuidePos {
  const from = lesson.chapters[c]?.from;
  if (from === undefined) return GUIDE_START;
  for (let t = 0; t < lesson.turns.length; t += 1) {
    const i = lesson.turns[t]?.steps.findIndex((x) => x.id === from) ?? -1;
    if (i >= 0) return { turn: t, step: i };
  }
  return GUIDE_START;
}

const earlier = (a: GuidePos, b: GuidePos): boolean =>
  a.turn < b.turn || (a.turn === b.turn && a.step < b.step);

/** The chapter the player is in (from 0). */
export function chapterOf(lesson: Lesson, pos: GuidePos): number {
  let c = 0;
  for (let k = 1; k < lesson.chapters.length; k += 1) {
    if (!earlier(pos, chapterStart(lesson, k))) c = k;
  }
  return c;
}

/** Arriving at a place: at the start of a chapter after the first, its card comes first. */
function arrive(lesson: Lesson, pos: GuidePos): GuidePos {
  for (let k = 1; k < lesson.chapters.length; k += 1) {
    const at = chapterStart(lesson, k);
    if (at.turn === pos.turn && at.step === pos.step) return { ...pos, at: 'done' };
  }
  return pos;
}

/**
 * Where a player coming back to chapter `c` begins: at its start, with what it is about said
 * first. The chapter before it is not said to be done again.
 */
export const resumeAt = (lesson: Lesson, c: number): GuidePos =>
  c === 0 ? GUIDE_START : { ...chapterStart(lesson, c), at: 'intro' };

/** The step the player is at, or undefined when the turn's steps are done. */
export const stepAt = (lesson: Lesson, pos: GuidePos): LessonStep | undefined =>
  lesson.turns[pos.turn]?.steps[pos.step];

/** True once every turn of the lesson has been ended. */
export const lessonOver = (lesson: Lesson, pos: GuidePos): boolean =>
  pos.turn >= lesson.turns.length;

/**
 * True while the next turn must not be drawn: the lesson's last word is up, or a chapter's card.
 * Drawing it would bring the next chapter's cards in under the card that says the last is done.
 */
export const holdsTheDraw = (lesson: Lesson, pos: GuidePos): boolean =>
  lessonOver(lesson, pos) || pos.at !== undefined;

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
  const plain = { tell: false, last: false, nothingInHand: false, then: [], chapterEnd: false };
  if (stage === 'spread') {
    // The spread of the turn just ended: `pos` has moved on to the next one already.
    const n = pos.turn;
    return {
      id: `t${String(n)}.spread`,
      sayKey: n === 1 ? 'guide.t1.spread' : 'guide.spread',
      ...plain,
      stops: ['[data-tap-advance]'],
    };
  }
  if (stage === 'dialog') return null;
  if (lessonOver(lesson, pos)) {
    // The last word, whatever the screen shows once the last spread is done: the next turn is not
    // drawn until the player has taken the game over (the play screen holds the draw).
    return {
      id: 'end',
      sayKey: 'guide.end',
      stops: [],
      then: [],
      tell: true,
      last: true,
      nothingInHand: false,
      chapterEnd: false,
    };
  }
  if (pos.at !== undefined) {
    // A chapter's own card, whatever the screen shows: the draw is held while it is up.
    const c = chapterOf(lesson, pos);
    const id = lesson.chapters[pos.at === 'done' ? c - 1 : c]?.id ?? '';
    return {
      id: `chapter.${id}.${pos.at}`,
      sayKey: `guide.chapter.${id}.${pos.at}`,
      stops: [],
      then: [],
      tell: true,
      last: false,
      nothingInHand: false,
      chapterEnd: pos.at === 'done',
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
        ...plain,
        stops: [NEXT],
      };
    case 'planning':
      return {
        id: `t${String(n)}.plan`,
        sayKey: n === 1 ? 'guide.t1.plan' : 'guide.plan',
        ...plain,
        stops: [NEXT],
      };
    case 'command': {
      const step = stepAt(lesson, pos);
      if (!step) {
        return {
          id: `t${String(n)}.end`,
          sayKey: `guide.t${String(n)}.end`,
          ...plain,
          stops: ['[data-dock-next="endTurn"]'],
        };
      }
      const stops = stopsOf(step, view);
      return {
        id: step.id,
        sayKey: `guide.${step.id}`,
        stops: stops.map((x) => x.hook),
        then: stops.map((x) => x.then),
        tell: step.do === 'tell',
        last: false,
        nothingInHand: step.do === 'memory' || step.do === 'antivenom',
        chapterEnd: false,
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
  // Between chapters nothing but the card's own buttons can be pressed.
  if (pos.at !== undefined) return { kind: 'parted' };
  const step = stepAt(lesson, pos);
  if (name === 'endCommand') {
    // The turn may end only when its steps are done; a tell is not something a turn waits for.
    const left = (lesson.turns[pos.turn]?.steps ?? []).slice(pos.step).some((s) => s.do !== 'tell');
    return left
      ? { kind: 'parted' }
      : { kind: 'to', pos: arrive(lesson, { turn: pos.turn + 1, step: 0 }) };
  }
  if (!step || step.do === 'tell') return { kind: 'parted' };
  const expected = lessonAction(step, view.game);
  if (!expected || !sameAction(expected, sent)) return { kind: 'parted' };
  return { kind: 'to', pos: arrive(lesson, { turn: pos.turn, step: pos.step + 1 }) };
}

/**
 * A told card's own button: a chapter's end goes on to what the next is about, which goes on to
 * its first step; any other told step goes on to the next.
 */
export function afterTold(lesson: Lesson, pos: GuidePos): GuidePos {
  if (pos.at === 'done') return { turn: pos.turn, step: pos.step, at: 'intro' };
  if (pos.at === 'intro') return { turn: pos.turn, step: pos.step };
  return arrive(lesson, { turn: pos.turn, step: pos.step + 1 });
}

/** One card of the lesson's, as a player meets it: its beat, and the chapter it is in (from 0). */
export interface LessonBeat {
  readonly id: string;
  readonly chapter: number;
}

/**
 * EVERY CARD OF THE LESSON, IN ITS ORDER (ruled 16 October 2026, `docs/LOOK_PLAN.md` §29): each
 * turn's cards, its plan, each step, its End turn and its spread, a chapter's two cards where it
 * begins, and the last word. A chapter's card that says the one before is done is the last of that
 * one; the card that says what the next is about is the first of the next. `pnpm guide:walk` holds
 * this order to the page, from a list of its own.
 */
export function lessonBeats(lesson: Lesson): LessonBeat[] {
  const out: LessonBeat[] = [];
  let chapter = 0;
  const cards = (t: number, i: number): void => {
    const k = lesson.chapters.findIndex(
      (_, c) => c > 0 && chapterStart(lesson, c).turn === t && chapterStart(lesson, c).step === i,
    );
    if (k < 1) return;
    out.push({ id: `chapter.${lesson.chapters[k - 1]?.id ?? ''}.done`, chapter });
    chapter = k;
    out.push({ id: `chapter.${lesson.chapters[k]?.id ?? ''}.intro`, chapter });
  };
  lesson.turns.forEach((turn, t) => {
    const n = String(t + 1);
    cards(t, 0);
    out.push({ id: `t${n}.cards`, chapter }, { id: `t${n}.plan`, chapter });
    turn.steps.forEach((step, i) => {
      if (i > 0) cards(t, i);
      out.push({ id: step.id, chapter });
    });
    out.push({ id: `t${n}.end`, chapter }, { id: `t${n}.spread`, chapter });
  });
  out.push({ id: 'end', chapter });
  return out;
}

/**
 * Which card of its chapter a beat is, for "Step 3 of 9" (ruled 16 October 2026: the count names
 * what it counts, and every card the player reads is a step). Null for a beat the lesson does not
 * have.
 */
export function stepCount(lesson: Lesson, beatId: string): { n: number; of: number } | null {
  const all = lessonBeats(lesson);
  const at = all.findIndex((b) => b.id === beatId);
  const here = all[at];
  if (!here) return null;
  const mine = all.filter((b) => b.chapter === here.chapter);
  return { n: mine.findIndex((b) => b.id === beatId) + 1, of: mine.length };
}
