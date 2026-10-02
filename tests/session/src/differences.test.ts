/**
 * THE CARD OF THE MAIN DIFFERENCES SAYS WHAT THE ENGINE DOES (stage L6, `docs/LOOK_PLAN.md` §19).
 *
 * The card on the difficulty screen and on an Easy game's result has six rows
 * (`packages/ui/src/screens/difficultyFacts.ts`). Four are numbers read from the content pack's
 * tables; two are rules the engine has written in itself, for which the screens keep a small table
 * of which sentence each difficulty gets. A table like that is a second copy of a rule, and a
 * second copy drifts: so every row is held here to a game the engine plays, on each difficulty.
 *
 * Nothing here reads the engine's source. Each fact is what a game DID.
 * Controls: pnpm ci:selftest differences-worm-start-is-the-engines,
 *           pnpm ci:selftest differences-memory-is-the-engines.
 */
import { DECK_MASTER, FAMILY, MEMORY_RESPONSE_AP_HARD } from '@immunity-wars/content';
import * as engine from '@immunity-wars/engine';
import { LocalSession, seededDice } from '@immunity-wars/session';
import {
  DIFFICULTIES,
  MEMORY_FROM,
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
            : worm.step === 1
              ? 'near'
              : ('nowhere the card has a sentence for' as WormStart),
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
