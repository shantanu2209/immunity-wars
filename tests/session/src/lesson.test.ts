/**
 * THE GUIDED GAME'S LESSON IS HELD TO THE ENGINE (stage L6, `docs/LOOK_PLAN.md` §19).
 *
 * The lesson is a file: turns, what arrives on each, and the steps a player is led through
 * (`packages/content/src/guide/lesson.json`). A file can say anything. What makes it a lesson is
 * that the real engine, handed its arrivals and its dice, accepts every step in order and hurts no
 * organ on the way. That is checked here by playing it, whole, through the same session the app
 * uses. A change to the rules, to the lesson or to its seed that breaks it fails this test, and
 * `pnpm guide:seed` says which seeds still play it.
 *
 * WHAT ELSE IS HELD, because the lesson rests on each:
 *  - it shows what he ruled it shows: the nine kinds of invader, every cell that acts, a resident,
 *    memory, and a crisis;
 *  - its dice are the engine's alone, so nothing the page does with random numbers moves it, and
 *    the page is never left on them;
 *  - a game on rails is not saved, and is when the rails end.
 */
import { DECK_MASTER, LESSON, type Lesson } from '@immunity-wars/content';
import {
  LocalSession,
  MemoryStorage,
  lessonAction,
  replayLesson,
  seededDice,
  type ViewState,
} from '@immunity-wars/session';
import { describe, expect, it } from 'vitest';

/** The steps that ask the engine for something. A `tell` is said, and asks for nothing. */
const STEPS = LESSON.turns.flatMap((t) => t.steps).filter((s) => s.do !== 'tell');
const WRITTEN = LESSON.turns.map((t) => t.arrive);
const kindOf = (dz: string): string => DECK_MASTER.find((c) => c.dz === dz)?.type ?? 'NO SUCH CARD';

describe('the lesson, played through a session against the real engine', () => {
  it('its own seed plays it whole: every step accepted, in order, and no organ hurt', async () => {
    const r = await replayLesson(LESSON, LESSON.seed);
    expect(r.why, `THE LESSON’S SEED DOES NOT PLAY IT: ${r.why}`).toBe('');
    expect(r.ok).toBe(true);
    // Read what was played, not the verdict: a lesson of no steps would be accepted too.
    expect(r.played).toEqual(STEPS.map((s) => s.id));
    expect(r.played.length).toBeGreaterThanOrEqual(30);
    expect(r.arrived).toEqual(WRITTEN);
  });

  it('it hands the player an ordinary game: the next turn, every organ whole, what it beat remembered', async () => {
    const r = await replayLesson(LESSON, LESSON.seed);
    expect(r.handed?.turn).toBe(LESSON.turns.length + 1);
    expect(r.handed?.phase).toBe('infection');
    expect(r.handed?.organsWhole).toBe(true);
    // On Easy what is beaten is remembered, and a venom never is (queue Q11).
    const beaten = [...new Set(WRITTEN.flat())].filter((dz) => kindOf(dz) !== 'venom');
    expect([...(r.handed?.remembered ?? [])].sort()).toEqual(beaten.sort());
  });

  it('CONTROL: a seed that is not the lesson’s is refused, and says where the game left the lesson', async () => {
    // Seeds 1 to 30: none of them plays it, and each says why (the search, `pnpm guide:seed`, lists
    // which do). If one ever did, this control would be showing nothing, and it says so.
    const others = await Promise.all(
      Array.from({ length: 30 }, (_, i) => replayLesson(LESSON, i + 1)),
    );
    expect(others.filter((r) => r.ok).length, 'A CONTROL SEED PLAYS THE LESSON').toBe(0);
    expect(others.every((r) => r.why.length > 0)).toBe(true);
  });

  it('CONTROL: a lesson that asks the engine for what it refuses is stopped at that step, by name', async () => {
    // Engulf before the coat: a bacterium that is not coated cannot be swallowed.
    const first = LESSON.turns[0];
    if (!first) throw new Error('the lesson has no first turn');
    const wrong: Lesson = {
      ...LESSON,
      turns: [
        {
          arrive: first.arrive,
          steps: [{ id: 'wrong.engulf', do: 'engulf', disease: first.arrive[0] ?? '' }],
        },
      ],
    };
    const r = await replayLesson(wrong, LESSON.seed);
    expect(r.ok).toBe(false);
    expect(r.why).toMatch(/^wrong\.engulf: refused/);
  });
});

describe('what the lesson shows, as ruled', () => {
  it('all nine kinds of invader arrive in it', () => {
    const kinds = new Set(WRITTEN.flat().map(kindOf));
    expect([...kinds].sort()).toEqual(
      [
        'bacteria',
        'fungus',
        'hidden',
        'malaria',
        'parasite',
        'toxin',
        'venom',
        'virus',
        'worm',
      ].sort(),
    );
  });

  it('every cell that acts is led to act, and so is a resident', () => {
    const acting = new Set<string>();
    for (const s of STEPS) {
      if (s.do === 'produce' || s.do === 'coat' || s.do === 'neutralise') acting.add('bcell');
      if (s.do === 'engulf') acting.add('macrophage');
      if (s.do === 'snipe') acting.add('tcell');
      if (s.do === 'nk') acting.add('nk');
      if (s.do === 'net') acting.add('neutrophil');
      if (s.do === 'strike' || s.do === 'move' || s.do === 'recall') acting.add(s.cell);
      if (s.do === 'resEngulf') acting.add('a resident');
    }
    // The Helper T-Cell acts on nothing: the lesson points at it, and has no step for it.
    expect([...acting].sort()).toEqual(
      ['a resident', 'bcell', 'eosinophil', 'macrophage', 'neutrophil', 'nk', 'tcell'].sort(),
    );
  });

  it('a disease it has beaten comes back and is met with memory, and it has a crisis', () => {
    expect(STEPS.some((s) => s.do === 'memory')).toBe(true);
    expect(LESSON.crisis.turn).toBeLessThanOrEqual(LESSON.turns.length);
  });
});

/** A game on rails with the lesson's dice, played by hand, so that the test can act between steps. */
async function onRails(
  storage: MemoryStorage,
  between: () => void,
  turns: number,
): Promise<{ session: LocalSession; view: () => ViewState }> {
  const session = LocalSession.createGame(
    { difficulty: LESSON.difficulty, written: WRITTEN },
    { rails: { dice: seededDice(LESSON.seed) }, storage },
  );
  const view = (): ViewState => session.getView().game;
  const send = async (action: Record<string, unknown>): Promise<void> => {
    expect((await session.sendAction(action)).ok, JSON.stringify(action)).toBe(true);
    between();
  };
  for (const turn of LESSON.turns.slice(0, turns)) {
    await send({ action: 'draw' });
    await send({ action: 'beginCommand' });
    for (const step of turn.steps) {
      if (step.do === 'tell') continue;
      const action = lessonAction(step, view());
      if (!action) throw new Error(`${step.id} names what is not in the body`);
      await send(action);
    }
    await send({ action: 'endCommand' });
  }
  return { session, view };
}

describe('the lesson’s dice are the engine’s alone', () => {
  it('random numbers the page draws between the engine’s calls do not move the lesson', async () => {
    const quiet = await onRails(new MemoryStorage(), () => undefined, LESSON.turns.length);
    const noisy = await onRails(
      new MemoryStorage(),
      () => {
        for (let i = 0; i < 7; i += 1) Math.random();
      },
      LESSON.turns.length,
    );
    expect(JSON.stringify(noisy.view())).toBe(JSON.stringify(quiet.view()));
    expect(quiet.view()['turn']).toBe(LESSON.turns.length + 1);
  });

  it('the page’s own random source is back after every call to the engine', async () => {
    const pages = Math.random;
    let left = 0;
    await onRails(
      new MemoryStorage(),
      () => {
        if (Math.random !== pages) left += 1;
      },
      2,
    );
    expect(left, 'THE PAGE WAS LEFT ON THE LESSON’S DICE').toBe(0);
    expect(Math.random).toBe(pages);
  });
});

describe('a game on rails is not saved, and is when the rails end', () => {
  it('nothing is written while the rails last; the game is written when they end, and after', async () => {
    const storage = new MemoryStorage();
    const { session } = await onRails(storage, () => undefined, LESSON.turns.length);
    expect(session.onRails).toBe(true);
    await session.save();
    expect((await storage.list()).length, 'A GAME ON RAILS WAS SAVED').toBe(0);

    await session.endRails();
    expect(session.onRails).toBe(false);
    const saved = await storage.list();
    expect(saved.length).toBe(1);
    // What was saved is an ordinary game: the writing went with the last written turn's draw.
    const state = saved[0]?.state as Record<string, unknown>;
    expect('written' in state).toBe(false);
    expect(state['turn']).toBe(LESSON.turns.length + 1);

    // And from here the dice are the page's: the next draw rolls on the page's own source.
    const pages = Math.random;
    let rolled = 0;
    Math.random = () => {
      rolled += 1;
      return pages();
    };
    try {
      expect((await session.sendAction({ action: 'draw' })).ok).toBe(true);
    } finally {
      Math.random = pages;
    }
    expect(rolled, 'AFTER THE RAILS THE ENGINE DID NOT ROLL ON THE PAGE’S DICE').toBeGreaterThan(0);
  });

  it('a game that was never on rails is saved on every action, as it always was', async () => {
    const storage = new MemoryStorage();
    const session = LocalSession.createGame({ difficulty: 'training' }, { storage });
    expect(session.onRails).toBe(false);
    expect((await session.sendAction({ action: 'draw' })).ok).toBe(true);
    expect((await storage.list()).length).toBe(1);
    await session.endRails(); // nothing to end: it does nothing
    expect((await storage.list()).length).toBe(1);
  });
});
