/**
 * THE TABLE OF WHAT CHANGES SAYS WHAT THE ENGINE DOES (stage L6, `docs/LOOK_PLAN.md` §19 and §20).
 *
 * The table on the difficulty screen, on an Easy game's result and in How to play has fifteen rows
 * (`packages/ui/src/screens/difficultyFacts.ts`). Some are numbers read from the content pack's
 * tables. The rest are rules the engine has written in itself, for which the screens keep a small
 * table of which sentence each difficulty gets. A table like that is a second copy of a rule, and
 * a second copy drifts: so EVERY row is held here to what the engine does on each difficulty, in
 * a game it plays or a position it is handed.
 *
 * AND THE TABLE IS HELD TO BEING WHOLE. Its last test counts, in the engine's source, the lines
 * that read the difficulty. That is the one thing here that reads source and not behaviour, and it
 * proves nothing about any row: it is a tripwire, so that a new read cannot arrive without someone
 * asking whether it belongs on the table.
 *
 * Controls: pnpm ci:selftest differences-worm-start-is-the-engines,
 *           differences-memory-is-the-engines, differences-numbers-are-the-engines,
 *           differences-cards-are-the-dies, differences-antivenom-is-the-engines,
 *           differences-division-is-the-engines, differences-organ-is-the-engines,
 *           differences-lymph-is-the-engines, differences-table-is-whole.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AFFINITY_AT,
  DECK_MASTER,
  DIFF,
  FAMILY,
  HEAL_AFTER,
  LYMPH_STEP,
  MEMORY_RESPONSE_AP_HARD,
  ORGAN_SETS,
  PRESENT_TIER_BY_DIFF,
} from '@immunity-wars/content';
import * as engine from '@immunity-wars/engine';
import { LocalSession, seededDice } from '@immunity-wars/session';
import {
  ANTIVENOM_AT_START,
  DIFFICULTIES,
  DIVIDES_ON,
  DIVIDES_TWICE_ON,
  LYMPH_SPREADS_ON,
  MEMORY_FROM,
  ORGAN_HEALS,
  PATHOGEN_X_IN_TEN,
  PRACTICE_ADDS,
  PRESENTATION_RAISES,
  WORM_START,
  differenceRows,
  type DifficultyKey,
  type MemoryFrom,
  type WormStart,
} from '@immunity-wars/ui';
import { describe, expect, it } from 'vitest';

type Loose = Record<string, unknown>;
type Inv = {
  id: string;
  disease: string;
  type: string;
  zone: string;
  organ?: string;
  step: number;
  remembered?: boolean;
};

const rows = differenceRows();
const numberOn = (id: string, d: DifficultyKey): number => {
  const cell = rows.find((r) => r.id === id)?.cells[d];
  if (!cell || !('n' in cell)) throw new Error(`the row "${id}" has no number on ${d}`);
  return cell.n;
};

const game = (difficulty: DifficultyKey, written: string[][], seed = 1): LocalSession =>
  LocalSession.createGame({ difficulty, written }, { rails: { dice: seededDice(seed) } });
const state = (s: LocalSession): Loose => s.getView().game;
const invaders = (s: LocalSession): Inv[] => state(s)['invaders'] as Inv[];
const send = async (s: LocalSession, action: Loose): Promise<boolean> =>
  (await s.sendAction(action)).ok;
const must = async (s: LocalSession, action: Loose): Promise<void> => {
  expect(await send(s, action), JSON.stringify(action)).toBe(true);
};
/** To the command stage of the turn that is about to be drawn. */
const toCommand = async (s: LocalSession): Promise<void> => {
  await must(s, { action: 'draw' });
  await must(s, { action: 'beginCommand' });
};

describe('the four rows that are numbers', () => {
  it.each(DIFFICULTIES)('on %s: Action Points, the window and a store’s cap', (d) => {
    const g = engine.newGame({ difficulty: d });
    const v = engine.viewState(g);
    expect(v['maxTurn'], 'the turn new infections arrive until').toBe(numberOn('turns', d));
    expect(engine.capFam(g, 'ENV'), 'the most one store holds').toBe(numberOn('store', d));
    // The turn's Action Points before anything has hurt an organ. A crisis may change them for a
    // turn; the game's own base is what the card names.
    expect(g.ap, 'Action Points each turn').toBe(numberOn('ap', d));
  });

  it.each(DIFFICULTIES)('on %s: what each face of the die brings', (d) => {
    const cell = rows.find((r) => r.id === 'cards')?.cells[d];
    if (!cell || !('key' in cell)) throw new Error('the cards row has no sentence');
    // Each face of the die in turn: the first random number of a draw is the die for how many.
    const brought: number[] = [];
    const real = Math.random;
    try {
      for (let face = 1; face <= 6; face += 1) {
        const g = engine.newGame({ difficulty: d });
        Math.random = (): number => (face - 0.5) / 6;
        const before = g.invaders.length;
        expect(engine.applyAction(g, { action: 'draw' }).ok).toBe(true);
        brought.push(g.invaders.length - before);
        Math.random = real;
      }
    } finally {
      Math.random = real;
    }
    expect(Math.min(...brought), 'the fewest a turn brings').toBe(cell.params?.['least']);
    expect(Math.max(...brought), 'the most a turn brings').toBe(cell.params?.['most']);
    // "Sometimes" is said only where the larger number is one face of the six.
    const larger = brought.filter((n) => n === Math.max(...brought)).length;
    if (cell.key === 'differences.cards.sometimes') expect(larger).toBe(1);
    if (cell.key === 'differences.cards.or') expect(larger).toBeGreaterThan(1);
  });
});

describe('where a worm starts', () => {
  // Every worm in the deck, once each: a worm goes to the organ its disease favours, so one worm
  // would show one branch.
  const worms = [
    ...new Set(
      (DECK_MASTER as readonly { dz: string; type: string }[])
        .filter((c) => c.type === 'worm')
        .map((c) => c.dz),
    ),
  ];
  it.each(DIFFICULTIES)('on %s the card says where the engine puts it', async (d) => {
    const seen = new Set<WormStart>();
    const organs = new Set<string>();
    expect(worms.length).toBeGreaterThan(1);
    for (const [i, dz] of worms.entries()) {
      const s = game(d, [[dz]], i + 1);
      await must(s, { action: 'draw' });
      const worm = invaders(s).find((x) => x.type === 'worm');
      if (!worm || worm.zone !== 'branch' || worm.organ === undefined)
        throw new Error('the worm did not arrive on a branch');
      const length = engine.branchLen(worm.organ as Parameters<typeof engine.branchLen>[0]);
      organs.add(worm.organ);
      seen.add(
        worm.step === 0
          ? 'organ'
          : worm.step === length
            ? 'far'
            : worm.step === Math.max(1, Math.floor(length / 2))
              ? 'half'
              : ('nowhere the table has a sentence for' as WormStart),
      );
      s.dispose();
    }
    // More than one organ, so that "the far end" was not read off a branch one step long.
    expect(organs.size).toBeGreaterThan(1);
    if (seen.size !== 1 || !seen.has(WORM_START[d]))
      throw new Error(
        `THE CARD SAYS A WORM STARTS "${WORM_START[d]}" ON ${d}, AND THE ENGINE PUT IT: ${[...seen].join(', ')}`,
      );
  });
});

describe('what makes the body remember a disease', () => {
  const family = String((FAMILY as Record<string, string>)['Influenza']);
  const remembers = (s: LocalSession): boolean =>
    (state(s)['memory'] as Record<string, boolean>)['Influenza'] === true;

  /** Does beating a disease leave memory of it? The B-Cell makes antibodies and neutralises it. */
  async function beatingGivesMemory(d: DifficultyKey): Promise<boolean> {
    const s = game(d, [['Influenza']]);
    await toCommand(s);
    await must(s, { action: 'produce', family });
    const flu = invaders(s).find((x) => x.disease === 'Influenza');
    await must(s, { action: 'neutralise', invaderId: flu?.id });
    expect(invaders(s).some((x) => x.disease === 'Influenza')).toBe(false);
    const out = remembers(s);
    s.dispose();
    return out;
  }

  /**
   * Does a vaccine give memory, and what does using the memory cost? Null when the engine refuses
   * the vaccine. The disease arrives again once it is remembered, and the memory is used on it.
   */
  async function vaccineThenUse(d: DifficultyKey): Promise<{ cost: number } | null> {
    const s = game(d, [['Influenza'], [], [], ['Influenza']]);
    await toCommand(s);
    let turn = 1;
    while (!remembers(s)) {
      const ap = Number(state(s)['ap']);
      if (ap > 0 && !(await send(s, { action: 'vaccinate', disease: 'Influenza', ap }))) {
        s.dispose();
        return null;
      }
      if (remembers(s)) break;
      expect(turn, 'the vaccine was not done by turn 3').toBeLessThan(3);
      await must(s, { action: 'endCommand' });
      await toCommand(s);
      turn += 1;
    }
    for (; turn < 4; turn += 1) {
      await must(s, { action: 'endCommand' });
      await toCommand(s);
    }
    const known = invaders(s).find((x) => x.disease === 'Influenza' && x.remembered === true);
    if (!known) throw new Error('the disease did not arrive again as one the body remembers');
    const before = Number(state(s)['ap']);
    await must(s, { action: 'memoryKill', invaderId: known.id });
    const cost = before - Number(state(s)['ap']);
    s.dispose();
    return { cost };
  }

  it.each(DIFFICULTIES)('on %s the card says what the engine does', async (d) => {
    const beaten = await beatingGivesMemory(d);
    const vaccine = await vaccineThenUse(d);
    const does: MemoryFrom | string = beaten
      ? vaccine === null
        ? 'beating'
        : 'beating, and a vaccine too'
      : vaccine === null
        ? 'nothing'
        : vaccine.cost === 0
          ? 'vaccine'
          : 'vaccineCosts';
    if (does !== MEMORY_FROM[d])
      throw new Error(
        `THE CARD SAYS MEMORY COMES FROM "${MEMORY_FROM[d]}" ON ${d}, AND THE ENGINE DOES: ${does}`,
      );
    // The cost the card names is the cost the engine took.
    if (vaccine !== null && vaccine.cost !== 0) expect(vaccine.cost).toBe(MEMORY_RESPONSE_AP_HARD);
  });
});

/** A game of the engine's own, to be handed a position. */
type G = ReturnType<typeof engine.newGame>;
const fresh = (d: DifficultyKey): G => engine.newGame({ difficulty: d });
const cellOf = (
  id: string,
  d: DifficultyKey,
): { key: string; params?: Record<string, unknown> } => {
  const cell = rows.find((r) => r.id === id)?.cells[d];
  if (!cell || !('key' in cell)) throw new Error(`the row "${id}" has no sentence on ${d}`);
  return cell;
};
/** With every die showing one face: the engine's die is 1 + floor(random x 6). */
function withFace<T>(face: number, run: () => T): T {
  const real = Math.random;
  Math.random = (): number => (face - 0.5) / 6;
  try {
    return run();
  } finally {
    Math.random = real;
  }
}
const FACES = [1, 2, 3, 4, 5, 6];
/** Put a card's invader on a step of a route, whatever its own way in. */
function placed(g: G, disease: string, lane: string, step: number): { id: string } {
  const iv = engine.forceInjectCard(g, disease) as unknown as Loose | null;
  if (!iv) throw new Error(`no card is named ${disease}`);
  Object.assign(iv, { zone: 'route', lane, organ: null, step });
  return iv as unknown as { id: string };
}
const count = (g: G, disease: string): number =>
  (g.invaders as unknown as Inv[]).filter((x) => x.disease === disease).length;

describe('what one Produce makes', () => {
  /** With the Helper T-Cell beside the B-Cell or away, so many antigens presented, so much practice. */
  const makes = (
    d: DifficultyKey,
    presented: number,
    produces: number,
    helper: boolean,
  ): number => {
    const g = fresh(d);
    g.presentations = presented;
    (g.made as Record<string, number>)['ENV'] = produces;
    if (!helper) Object.assign(g.cells.helper as object, { zone: 'route', lane: 'nose', step: 1 });
    // Both stand in the bloodstream at the start, and one antigen presented licenses the Helper.
    expect(engine.helperWith(g, 'bcell'), 'the Helper T-Cell beside the B-Cell').toBe(
      helper && presented > 0,
    );
    return engine.rateForFam(g, 'ENV');
  };

  it.each(DIFFICULTIES)('on %s: the most, and whether practice adds to it', (d) => {
    const cell = cellOf('rate', d);
    const most = makes(d, 99, 0, true);
    const practised = makes(d, 99, AFFINITY_AT, true);
    expect(cell.params?.['n'], 'the most one Produce makes').toBe(most);
    const adds = practised > makes(d, 99, AFFINITY_AT - 1, true);
    if (adds !== PRACTICE_ADDS[d])
      throw new Error(
        `THE TABLE SAYS PRACTICE ${PRACTICE_ADDS[d] ? 'ADDS' : 'ADDS NOTHING'} ON ${d}, AND THE ENGINE MADE ${String(most)} THEN ${String(practised)}`,
      );
    if (adds) {
      expect(cell.key).toBe('differences.rate.practice');
      expect(cell.params?.['more'], 'the most with practice').toBe(practised);
      expect(cellOf('practice', d).params?.['at']).toBe(AFFINITY_AT);
    } else expect(cell.key).toBe('differences.rate.upTo');
  });

  it.each(DIFFICULTIES)('on %s: whether antigens presented raise it, and after how many', (d) => {
    const tier = PRESENT_TIER_BY_DIFF[d];
    const [a, b] = [tier[1] ?? 0, tier[2] ?? 0];
    const raises = makes(d, 99, 0, false) > makes(d, 0, 0, false);
    if (raises !== PRESENTATION_RAISES[d])
      throw new Error(
        `THE TABLE SAYS PRESENTATION ${PRESENTATION_RAISES[d] ? 'RAISES' : 'DOES NOT RAISE'} WHAT A PRODUCE MAKES ON ${d}, AND THE ENGINE DISAGREES`,
      );
    if (!raises) {
      // Only the Helper T-Cell adds to it.
      expect(makes(d, 99, 0, false)).toBe(1);
      expect(makes(d, 99, 0, true)).toBe(2);
      return;
    }
    expect(cellOf('presentation', d).params).toEqual({ a, b });
    expect([a - 1, a, b - 1, b].map((p) => makes(d, p, 0, false))).toEqual([1, 2, 2, 3]);
  });
});

describe('the Killer T-Cell’s range', () => {
  it.each(DIFFICULTIES)(
    'on %s: a hidden virus that many steps out is reached, one more is not',
    (d) => {
      const n = numberOn('range', d);
      const g = fresh(d);
      const iv = placed(g, 'Hepatitis B', 'blood', 1) as unknown as Loose;
      for (const step of [1, 2, 3, 4, 5]) {
        iv['step'] = step;
        const reached = engine
          .snipeTargets(g)
          .some((x) => (x as unknown as Loose)['id'] === iv['id']);
        expect(reached, `${String(step)} steps out`).toBe(step <= n);
      }
    },
  );
});

describe('antivenom at the start', () => {
  it.each(DIFFICULTIES)('on %s the table’s doses are the game’s', (d) => {
    const doses = fresh(d).antivenom;
    if (doses !== ANTIVENOM_AT_START[d])
      throw new Error(
        `THE TABLE SAYS ${String(ANTIVENOM_AT_START[d])} DOSES OF ANTIVENOM ON ${d}, AND THE GAME STARTS WITH ${String(doses)}`,
      );
  });
});

describe('an uncoated bacterium divides', () => {
  const BACTERIUM = 'Whooping cough';
  it.each(DIFFICULTIES)('on %s: what each face of the die does', (d) => {
    const born = FACES.map((face) => {
      const g = fresh(d);
      // One step from the bloodstream: not at a lymph node, so nothing but division copies it.
      placed(g, BACTERIUM, 'nose', 1);
      withFace(face, () => engine.resolveSpread(g));
      return count(g, BACTERIUM) - 1;
    });
    const on = DIVIDES_ON[d];
    const said =
      on === 'always'
        ? FACES.map((face) => 1 + (face <= DIVIDES_TWICE_ON ? 1 : 0))
        : FACES.map((face) => (face <= on ? 1 : 0));
    if (JSON.stringify(born) !== JSON.stringify(said))
      throw new Error(
        `THE TABLE SAYS A BACTERIUM ON ${d} MAKES ${said.join(',')} COPIES ON THE SIX FACES, AND THE ENGINE MADE ${born.join(',')}`,
      );
  });
});

describe('a hurt organ', () => {
  it.each(DIFFICULTIES)('on %s: whether it heals, and after how many clear turns', (d) => {
    const g = fresh(d);
    const lungs = g.organs['lungs'];
    if (!lungs) throw new Error('the game has no lungs');
    lungs.hp -= 1;
    // Hurt lungs cost an Action Point a turn.
    expect(engine.viewState(g)['apMax']).toBe(DIFF[d].ap - 1);
    for (let turn = 1; turn < HEAL_AFTER; turn += 1) withFace(6, () => engine.resolveSpread(g));
    expect(lungs.hp, 'not yet').toBe(lungs.max - 1);
    withFace(6, () => engine.resolveSpread(g));
    const healed = lungs.hp === lungs.max;
    if (healed !== ORGAN_HEALS[d])
      throw new Error(
        `THE TABLE SAYS A HURT ORGAN ${ORGAN_HEALS[d] ? 'HEALS' : 'NEVER HEALS'} ON ${d}, AND THE ENGINE LEFT THE LUNGS AT ${String(lungs.hp)} OF ${String(lungs.max)}`,
      );
    // Healed or not, its penalty has lifted: the Action Point is back.
    expect(engine.viewState(g)['apMax'], 'the penalty').toBe(DIFF[d].ap);
  });
});

describe('infections spread along the lymph', () => {
  const VIRUS = 'Influenza';
  it.each(DIFFICULTIES)('on %s: what each face of the die does at a lymph node', (d) => {
    const spread = FACES.map((face) => {
      const g = fresh(d);
      placed(g, VIRUS, 'nose', LYMPH_STEP);
      withFace(face, () => engine.resolveSpread(g));
      return (g.invaders as unknown as (Inv & { lane?: string })[]).some(
        (x) => x.disease === VIRUS && x.zone === 'route' && x.lane !== 'nose',
      );
    });
    const on = LYMPH_SPREADS_ON[d];
    const said = FACES.map((face) => on !== null && face <= on);
    if (JSON.stringify(spread) !== JSON.stringify(said))
      throw new Error(
        `THE TABLE SAYS AN INFECTION ON ${d} SPREADS BY THE LYMPH ON ${JSON.stringify(said)}, AND THE ENGINE DID ON ${JSON.stringify(spread)}`,
      );
    const cell = rows.find((r) => r.id === 'lymph')?.cells[d];
    if (on !== null) expect(cell).toEqual({ key: 'differences.lymph.yes', params: { n: on } });
  });
});

describe('Pathogen X', () => {
  it.each(DIFFICULTIES)('on %s: in how many games of ten it is due', (d) => {
    const GAMES = 4000;
    const real = Math.random;
    Math.random = seededDice(7);
    let due = 0;
    const turns = new Set<number>();
    try {
      for (let i = 0; i < GAMES; i += 1) {
        const turn = fresh(d).novelTurn;
        if (turn === undefined) continue;
        due += 1;
        turns.add(turn);
      }
    } finally {
      Math.random = real;
    }
    // WHEN IT COMES: the rulebook says a turn from 2 to 8 on Easy, 2 to 11 on Normal, 2 to 16 on
    // Hard, and How to play says the first half of the window. Every one of those turns, and no
    // other, in 4,000 games.
    const last = 1 + Math.floor(DIFF[d].turns / 2);
    expect([...turns].sort((a, b) => a - b)).toEqual(
      Array.from({ length: last - 1 }, (_, i) => i + 2),
    );
    expect(last).toBe({ training: 8, normal: 11, hard: 16 }[d]);
    const said = PATHOGEN_X_IN_TEN[d] / 10;
    // 4,000 games: at 6 in 10 one standard deviation is 0.008, so 0.03 is nearly four of them.
    expect(Math.abs(due / GAMES - said), `${String(due)} of ${String(GAMES)} games`).toBeLessThan(
      said === 1 ? 1e-9 : 0.03,
    );
  });
});

describe('the table is whole', () => {
  it('the organs are the same seven on all three', () => {
    expect(ORGAN_SETS.normal).toEqual(ORGAN_SETS.training);
    expect(ORGAN_SETS.hard).toEqual(ORGAN_SETS.training);
  });

  it('every line of the engine that reads the difficulty is one the table was written from', () => {
    // THE TRIPWIRE. The engine's source, comments out, the bot left out (it plays, it does not
    // rule): the lines that read the difficulty, file by file. Each is behind a row:
    //   actions.ts     the vaccine refused on Easy; the memory response's cost on Hard (3 lines)
    //   construct.ts   where a worm starts; the Action Points and the window; antivenom; Pathogen X
    //   effects.ts     memory from beating a disease, on Easy
    //   primitives.ts  the organs, which are the same on all three (the test above)
    //   queries.ts     a hurt organ's penalty on Hard; the store's cap; what a Produce makes;
    //                  the Killer T-Cell's range; how a bacterium divides; the cards a turn
    //   spread.ts      a bacterium dividing on Hard; the lymph on Hard; an organ healing
    //   view.ts        the difficulty itself, handed to the screens
    const KNOWN: Record<string, number> = {
      'actions.ts': 4,
      'construct.ts': 8,
      'effects.ts': 1,
      'primitives.ts': 1,
      'queries.ts': 19,
      'spread.ts': 3,
      'view.ts': 1,
    };
    const READS = /\.difficulty\b|\bdiff ===|\bdiff\]|_BY_DIFF\b|\bDIFF\[|SPAWN_TABLE\b/;
    const SRC = join(dirname(fileURLToPath(import.meta.url)), '../../../packages/engine/src');
    const code = (text: string): string =>
      text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
    const found: Record<string, number> = {};
    for (const name of readdirSync(SRC)) {
      if (!name.endsWith('.ts') || name === 'simulate.ts') continue;
      const lines = code(readFileSync(join(SRC, name), 'utf8')).split('\n');
      const n = lines.filter((line) => READS.test(line)).length;
      if (n > 0) found[name] = n;
    }
    // The count was read at all: an empty reading would agree with nothing and prove nothing.
    expect(Object.keys(found).length).toBeGreaterThan(3);
    if (JSON.stringify(found) !== JSON.stringify(KNOWN))
      throw new Error(
        `THE ENGINE READS THE DIFFICULTY SOMEWHERE THE TABLE WAS NOT WRITTEN FROM. Found ${JSON.stringify(found)}, known ${JSON.stringify(KNOWN)}. Is the new one on the table of what changes?`,
      );
  });
});
