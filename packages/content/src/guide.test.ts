/**
 * THE GUIDED GAME'S LESSON, AS A FILE (stage L6, `docs/LOOK_PLAN.md` §19).
 *
 * `guide/lesson.json` is data, and data can say anything: a disease no card carries, an antibody
 * class that does not fit, a step onto a place the board does not have. Each of those would be
 * found late, by a player led to tap something that is not there. So the file is held to the
 * rules' own tables when the pack loads, and every rule it is held to is made to fire here.
 *
 * What this does NOT show is that the engine accepts the lesson. That takes playing it, and
 * `tests/session/src/lesson.test.ts` does.
 */
import { describe, expect, it } from 'vitest';

import lessonJson from './guide/lesson.json';
import { GuidePackS, guidePackSchema } from './schema.js';

type Raw = Record<string, unknown>;
type Turn = { arrive: string[]; steps: Raw[] };
type Chapter = { id: string; from?: string };
const raw = (): { LESSON: { seed: number; crisis: Raw; turns: Turn[]; chapters: Chapter[] } } =>
  JSON.parse(JSON.stringify(lessonJson)) as {
    LESSON: { seed: number; crisis: Raw; turns: Turn[]; chapters: Chapter[] };
  };
const corrupt = (fn: (l: ReturnType<typeof raw>['LESSON']) => void): (() => unknown) => {
  const p = raw();
  fn(p.LESSON);
  return () => GuidePackS.parse(p);
};
const step = (l: ReturnType<typeof raw>['LESSON'], id: string): Raw => {
  const s = l.turns.flatMap((t) => t.steps).find((x) => x['id'] === id);
  if (!s) throw new Error(`the lesson has no step ${id}: this test is aimed at nothing`);
  return s;
};

describe('the lesson file', () => {
  it('validates as it ships', () => {
    expect(() => GuidePackS.parse(raw())).not.toThrow();
  });

  it('rejects an arrival no card carries', () => {
    expect(
      corrupt((l) => {
        (l.turns[0] as Turn).arrive[0] = 'Whooping-cough';
      }),
    ).toThrow(/no card is named/);
  });

  it('rejects a step on a disease that has not arrived by its turn', () => {
    expect(
      corrupt((l) => {
        step(l, 't1.coat')['disease'] = 'Malaria';
      }),
    ).toThrow(/has not arrived by turn 1/);
  });

  it('rejects antibodies of a class that does not fit the disease they are made for', () => {
    expect(
      corrupt((l) => {
        step(l, 't1.produce')['family'] = 'ENV';
      }),
    ).toThrow(/do not fit/);
  });

  it('rejects a move that names both a route and an organ, or neither', () => {
    expect(
      corrupt((l) => {
        step(l, 't1.walk1')['organ'] = 'heart';
      }),
    ).toThrow(/exactly one/);
    expect(
      corrupt((l) => {
        delete step(l, 't1.walk1')['route'];
      }),
    ).toThrow(/exactly one/);
  });

  it('rejects a move of the B-Cell, which never moves', () => {
    expect(
      corrupt((l) => {
        step(l, 't1.walk1')['cell'] = 'bcell';
      }),
    ).toThrow(/never moves/);
  });

  it('rejects a step onto a place the board does not have', () => {
    expect(
      corrupt((l) => {
        step(l, 't1.walk4')['step'] = 6; // the nose route has five steps
      }),
    ).toThrow(/steps 1 to 5/);
    expect(
      corrupt((l) => {
        step(l, 't7.residentOut')['step'] = 3; // the heart's branch has steps 0 to 2
      }),
    ).toThrow(/steps 0 to 2/);
  });

  it('rejects two steps of one name, since a step’s name is what its sentence is found by', () => {
    expect(
      corrupt((l) => {
        step(l, 't1.walk2')['id'] = 't1.walk1';
      }),
    ).toThrow(/two steps are named/);
  });

  it('rejects a chapter that begins at no step of the lesson (step 3)', () => {
    expect(
      corrupt((l) => {
        (l.chapters[1] as Chapter).from = 't2.helpr';
      }),
      'A CHAPTER THAT BEGINS NOWHERE WAS ACCEPTED',
    ).toThrow(/which is no step of the lesson/);
  });

  it('rejects chapters out of order, a first chapter that names a step, and two of one name', () => {
    expect(
      corrupt((l) => {
        const [a, b] = [l.chapters[1], l.chapters[2]] as [Chapter, Chapter];
        l.chapters[1] = b;
        l.chapters[2] = a;
      }),
    ).toThrow(/begins before the chapter it follows/);
    expect(
      corrupt((l) => {
        (l.chapters[0] as Chapter).from = 't1.coat';
      }),
    ).toThrow(/names no step/);
    expect(
      corrupt((l) => {
        (l.chapters[2] as Chapter).id = (l.chapters[1] as Chapter).id;
      }),
    ).toThrow(/two chapters are named/);
  });

  it('rejects a crisis the rules do not know, and one after the lesson has ended', () => {
    expect(
      corrupt((l) => {
        l.crisis['event'] = 'plague of frogs';
      }),
    ).toThrow(/no crisis named/);
    expect(
      corrupt((l) => {
        l.crisis['turn'] = l.turns.length + 1;
      }),
    ).toThrow(/the lesson has/);
  });

  it('rejects a step the lesson has no word for, and a key it does not know', () => {
    expect(
      corrupt((l) => {
        step(l, 't3.net')['do'] = 'vaccinate';
      }),
    ).toThrow();
    expect(
      corrupt((l) => {
        step(l, 't3.net')['cell'] = 'neutrophil';
      }),
    ).toThrow();
  });

  it('is checked against the rules it is handed, not against a copy: other rules, other answer', () => {
    // The same file, held to a deck that has no Whooping cough: the first arrival is refused.
    const others = guidePackSchema(['Influenza']);
    // The error is Zod's, as JSON, so the name's own quotes are escaped in it.
    expect(() => others.parse(raw())).toThrow(/no card is named .{1,2}Whooping cough/);
  });
});
