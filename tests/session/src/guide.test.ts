/**
 * THE GUIDE, HELD TO THE LESSON AND TO THE ENGINE (stage L6, `docs/LOOK_PLAN.md` §19).
 *
 * `packages/ui/src/guide/model.ts` says, for where a player is in the lesson and what the screen
 * shows, the one sentence to say and the one control to light, and moves on when the engine has
 * accepted exactly the step it asked for. Three things can go wrong in silence, and each is held:
 *
 *  1. THE GUIDE AND THE GAME PART, and the guide goes on pointing. So the whole lesson is played
 *     here through the real session, and at every step the guide must be at that step, must move
 *     on when the engine accepts it, and must LET GO when the engine accepts something else.
 *  2. A BEAT WITH NO SENTENCE. The catalogue is found by a built key (`guide.` + the step's
 *     name), which no compiler checks. Every beat's sentence must be there, and every sentence of
 *     the lesson must be some beat's.
 *  3. THE SCREENS AND THE SESSION DISAGREE ABOUT WHAT A MOVE IS. The walk of the guided game found
 *     exactly that: a resident's Recall, a rule since queue Q6, had no button anywhere, because
 *     the screens' list of moves was not the session's (docs/FINDINGS.md #113).
 *
 * THE CHAPTERS (step 3, `docs/LOOK_PLAN.md` §28). The walk meets each chapter's end and the next
 * one's start, once each and in order. And a player who comes back to a chapter is brought to it by
 * playing the lesson again on its dice (`playLessonTo`): from every chapter, the rest of the lesson
 * is played here to its end, so a place that the replay does not reach exactly is a failure.
 * Control: pnpm ci:selftest lesson-resumes-at-every-chapter.
 */
import { LESSON, UI_I18N_EN } from '@immunity-wars/content';
import { LocalSession, lessonAction, playLessonTo, seededDice } from '@immunity-wars/session';
import { MOVE_CLASS } from '@immunity-wars/session-core';
import {
  GUIDE_START,
  MOVE_LIKE,
  afterAccepted,
  afterTold,
  chapterStart,
  guideBeat,
  holdsTheDraw,
  lessonOver,
  resumeAt,
  sameAction,
  stopsFor,
  t,
  type GuidePos,
} from '@immunity-wars/ui';
import { describe, expect, it } from 'vitest';

const newLesson = (): LocalSession =>
  LocalSession.createGame(
    { difficulty: LESSON.difficulty, written: LESSON.turns.map((t) => t.arrive) },
    { rails: { dice: seededDice(LESSON.seed) } },
  );

/**
 * The guide from `start` to the lesson's end, through the real session: every beat it says, in
 * order. A chapter's cards are passed with their own button, as a player passes them.
 */
async function walk(
  session: LocalSession,
  start: GuidePos,
): Promise<{ beats: string[]; at: Map<string, string> }> {
  let pos: GuidePos = start;
  const beats: string[] = [];
  /** The game as each chapter begins, by chapter: what a player coming back must be brought to. */
  const at = new Map<string, string>();
  const send = async (action: Record<string, unknown>): Promise<void> => {
    const before = session.getView();
    expect((await session.sendAction(action)).ok, JSON.stringify(action)).toBe(true);
    const move = afterAccepted(LESSON, pos, before, action);
    expect(move.kind, `THE GUIDE LEFT THE LESSON AT ${JSON.stringify(action)}`).not.toBe('parted');
    if (move.kind === 'to') pos = move.pos;
  };
  /** A chapter's cards, wherever they come: each is said, and passed. */
  const cards = (stage: 'command' | 'waiting'): void => {
    while (pos.at !== undefined) {
      expect(holdsTheDraw(LESSON, pos), 'A CHAPTER CARD LETS THE NEXT TURN BE DRAWN').toBe(true);
      const beat = guideBeat(LESSON, pos, stage, session.getView());
      expect(beat?.tell).toBe(true);
      expect(beat?.chapterEnd).toBe(pos.at === 'done');
      beats.push(beat?.id ?? '');
      if (pos.at === 'intro') at.set(beat?.id ?? '', JSON.stringify(session.getView().game));
      pos = afterTold(LESSON, pos);
    }
  };
  for (let t = start.turn; t < LESSON.turns.length; t += 1) {
    const turn = LESSON.turns[t];
    if (!turn) break;
    const resumedMidTurn = t === start.turn && start.step > 0;
    if (!resumedMidTurn) {
      cards('waiting');
      await send({ action: 'draw' });
      expect(guideBeat(LESSON, pos, 'arrivals', session.getView())?.stops).toEqual([
        '[data-dock-next]',
      ]);
      await send({ action: 'beginCommand' });
    }
    for (const step of turn.steps.slice(resumedMidTurn ? start.step : 0)) {
      cards('command');
      const beat = guideBeat(LESSON, pos, 'command', session.getView());
      expect(beat?.id).toBe(step.id);
      beats.push(beat?.id ?? '');
      if (step.do === 'tell') {
        expect(beat?.tell).toBe(true);
        pos = afterTold(LESSON, pos);
        continue;
      }
      // Something on the page is named for every step that is done, and it is a hook, not prose.
      expect(beat?.stops.length, step.id).toBeGreaterThan(0);
      expect(
        beat?.stops.every((s) => s.startsWith('[data-')),
        step.id,
      ).toBe(true);
      const action = lessonAction(step, session.getView().game);
      if (!action) throw new Error(`${step.id} names what is not in the body`);
      await send(action);
    }
    cards('command');
    // The turn's steps are done: what is lit is End turn.
    expect(guideBeat(LESSON, pos, 'command', session.getView())?.stops[0]).toBe(
      '[data-dock-next="endTurn"]',
    );
    await send({ action: 'endCommand' });
  }
  expect(lessonOver(LESSON, pos)).toBe(true);
  // And its last word is the one that hands the game over.
  const end = guideBeat(LESSON, pos, 'waiting', session.getView());
  expect(end?.last).toBe(true);
  return { beats, at };
}

const STEPS = LESSON.turns.flatMap((t) => t.steps.map((s) => s.id));
const CHAPTER_CARDS = LESSON.chapters.flatMap((ch, c) => [
  ...(c > 0 ? [`chapter.${LESSON.chapters[c - 1]?.id ?? ''}.done`, `chapter.${ch.id}.intro`] : []),
]);

describe('the guide follows the lesson through the real engine', () => {
  it('is at each step in turn, moves on when the engine accepts it, and ends with the lesson', async () => {
    const session = newLesson();
    const { beats } = await walk(session, GUIDE_START);
    expect(beats.filter((b) => !b.startsWith('chapter.'))).toEqual(STEPS);
    session.dispose();
  });

  it('meets every chapter’s end and the next one’s start, once each, in order, where each begins', async () => {
    const session = newLesson();
    const { beats } = await walk(session, GUIDE_START);
    expect(LESSON.chapters.length).toBeGreaterThanOrEqual(2);
    expect(beats.filter((b) => b.startsWith('chapter.'))).toEqual(CHAPTER_CARDS);
    for (let c = 1; c < LESSON.chapters.length; c += 1) {
      // The intro comes just before the step the chapter begins at.
      const intro = beats.indexOf(`chapter.${LESSON.chapters[c]?.id ?? ''}.intro`);
      expect(beats[intro + 1], LESSON.chapters[c]?.id).toBe(LESSON.chapters[c]?.from);
    }
    session.dispose();
  });

  /** The game as each chapter begins, played live from the lesson's start. */
  const live = (async () => {
    const session = newLesson();
    const { at } = await walk(session, GUIDE_START);
    session.dispose();
    return at;
  })();

  for (let c = 1; c < LESSON.chapters.length; c += 1) {
    const id = LESSON.chapters[c]?.id ?? '';
    it(`a player coming back to chapter ${String(c + 1)}, ${id}, is brought to it and plays on to the end`, async () => {
      const session = newLesson();
      const to = chapterStart(LESSON, c);
      const got = await playLessonTo(session, LESSON, to);
      expect(got.why, 'THE LESSON COULD NOT BE PLAYED TO THE CHAPTER').toBe('');
      // The very game a player who never stopped has there: the same dice, the same actions.
      expect(
        JSON.stringify(session.getView().game) === (await live).get(`chapter.${id}.intro`),
        'A PLAYER COMING BACK IS NOT BROUGHT TO THE GAME THE CHAPTER BEGINS WITH',
      ).toBe(true);
      const { beats } = await walk(session, resumeAt(LESSON, c));
      expect(beats[0], 'THE CHAPTER DOES NOT BEGIN WITH WHAT IT IS ABOUT').toBe(
        `chapter.${id}.intro`,
      );
      // The rest of the lesson, from the chapter's first step, played as written.
      const from = STEPS.indexOf(LESSON.chapters[c]?.from ?? '');
      expect(beats.filter((b) => !b.startsWith('chapter.'))).toEqual(STEPS.slice(from));
      session.dispose();
    });
  }

  it('lets go when the engine accepts something the lesson did not ask for', async () => {
    const session = newLesson();
    await session.sendAction({ action: 'draw' });
    await session.sendAction({ action: 'beginCommand' });
    // The lesson's first step is to make antibodies. The player moves a cell instead.
    const before = session.getView();
    const stray = { action: 'move', cell: 'nk', zone: 'route', lane: 'blood', step: 2 };
    expect((await session.sendAction(stray)).ok).toBe(true);
    expect(afterAccepted(LESSON, GUIDE_START, before, stray).kind, 'THE GUIDE DID NOT LET GO').toBe(
      'parted',
    );
    // Ending the turn with its steps undone is leaving the lesson too.
    expect(afterAccepted(LESSON, GUIDE_START, before, { action: 'endCommand' }).kind).toBe(
      'parted',
    );
    // The turn's own steps are not the lesson's: they neither move it on nor part from it.
    expect(afterAccepted(LESSON, GUIDE_START, before, { action: 'draw' }).kind).toBe('stay');
    session.dispose();
  });

  it('says nothing while nothing is asked of the player', () => {
    const session = newLesson();
    expect(guideBeat(LESSON, GUIDE_START, 'waiting', session.getView())).toBeNull();
    session.dispose();
  });

  it('leads through the real controls: the cell first, then its action', async () => {
    const session = newLesson();
    await session.sendAction({ action: 'draw' });
    await session.sendAction({ action: 'beginCommand' });
    const coat = LESSON.turns[0]?.steps.find((s) => s.do === 'coat');
    if (!coat) throw new Error('the lesson’s first turn has no coat');
    // With nothing in hand, what is lit is the B-Cell; with it in hand, its Coat.
    expect(stopsFor(coat, session.getView())).toEqual(['[data-cell="bcell"]']);
    session.setSelection({ cell: 'bcell', family: null, resident: null });
    expect(stopsFor(coat, session.getView())).toContain('[data-dock-row="tag"]');
    session.dispose();
  });

  it('says the whole sentence for the first tap, and a few words for each later one (step 3)', async () => {
    const session = newLesson();
    await session.sendAction({ action: 'draw' });
    await session.sendAction({ action: 'beginCommand' });
    const pos = (id: string): GuidePos => {
      const i = LESSON.turns[0]?.steps.findIndex((s) => s.id === id) ?? -1;
      return { turn: 0, step: i };
    };
    // Coat: the B-Cell first, with nothing short beside it; then its row, "Now tap Coat."
    const before = guideBeat(LESSON, pos('t1.coat'), 'command', session.getView());
    expect(before?.then).toEqual([null]);
    session.setSelection({ cell: 'bcell', family: null, resident: null });
    const after = guideBeat(LESSON, pos('t1.coat'), 'command', session.getView());
    const row = after?.stops.indexOf('[data-dock-row="tag"]') ?? -1;
    const then = after?.then[row];
    const words = then
      ? t(then.key, { ...then.params, action: t(then.params?.['action'] ?? '') })
      : '';
    expect(words, 'A LATER TAP DOES NOT SAY WHAT ITS BUTTON SAYS').toBe(
      `Now tap ${t('action.tag')}.`,
    );
    // Produce: the tile, then the class, then the button.
    session.setSelection({ cell: null, family: 'EXB', resident: null });
    const produce = guideBeat(LESSON, pos('t1.produce'), 'command', session.getView());
    expect(produce?.then.map((x) => x?.key ?? null)).toEqual([
      'guide.then.tap',
      'guide.then.family',
      null,
    ]);
    session.dispose();
  });

  it('knows one action by what the lesson names, whatever else the screen sends with it', () => {
    const asked = { action: 'tag', invaderId: 'i7' };
    expect(sameAction(asked, { action: 'tag', cell: 'bcell', invaderId: 'i7' })).toBe(true);
    expect(sameAction(asked, { action: 'tag', cell: 'bcell', invaderId: 'i8' })).toBe(false);
    expect(
      sameAction(
        { action: 'move', cell: 'nk', zone: 'route', lane: 'blood', step: 2 },
        { action: 'move', cell: 'nk', zone: 'route', lane: 'blood', organ: undefined, step: 2 },
      ),
    ).toBe(true);
    expect(
      sameAction(
        { action: 'move', cell: 'nk', zone: 'route', lane: 'blood', step: 2 },
        { action: 'move', cell: 'tcell', zone: 'route', lane: 'blood', step: 2 },
      ),
    ).toBe(false);
  });
});

describe('every beat of the lesson has its sentence, and every sentence its beat', () => {
  const say = UI_I18N_EN as Record<string, string>;
  /** Every key the guide can ask for, from the lesson itself. */
  const asked = new Set<string>([
    'guide.plan',
    'guide.spread',
    'guide.end',
    'guide.t1.plan',
    'guide.t1.spread',
    'guide.then.tap',
    'guide.then.place',
    'guide.then.family',
    'guide.then.target',
    ...CHAPTER_CARDS.map((b) => `guide.${b}`),
    ...LESSON.turns.flatMap((t, i) => [
      `guide.t${String(i + 1)}.cards`,
      `guide.t${String(i + 1)}.end`,
      ...t.steps.map((s) => `guide.${s.id}`),
    ]),
  ]);

  it('no beat is without one', () => {
    const missing = [...asked].filter((k) => typeof say[k] !== 'string' || say[k] === '');
    expect(
      missing,
      `A BEAT OF THE LESSON HAS NO SENTENCE: ${missing.slice(0, 3).join(', ')}`,
    ).toEqual([]);
    expect(asked.size).toBeGreaterThan(50);
  });

  it('no sentence of a turn or a chapter is left without a beat', () => {
    const orphans = Object.keys(say).filter(
      (k) => /^guide\.(t\d+|chapter|then)\./.test(k) && !asked.has(k),
    );
    expect(
      orphans,
      `A SENTENCE OF THE LESSON IS NOBODY’S: ${orphans.slice(0, 3).join(', ')}`,
    ).toEqual([]);
  });
});

describe('what a move is: the screens’ list and the session’s', () => {
  it('are one list', () => {
    expect(
      [...MOVE_LIKE].sort(),
      'THE SCREENS AND THE SESSION DISAGREE ABOUT WHAT A MOVE IS',
    ).toEqual([...MOVE_CLASS].sort());
  });
});
