/**
 * THE MAIN DIFFERENCES BETWEEN EASY, NORMAL AND HARD (stage L6, `docs/LOOK_PLAN.md` §18, row 3): the
 * six that How to play's section on difficulty names, as data for the card that shows them on the
 * difficulty screen and on the result of a game on Easy.
 *
 * THEY ARE NOT ALL THE DIFFERENCES, and the card does not say they are: its heading is "The main
 * differences". The engine reads the difficulty in other places too: the Killer T-Cell's range, how
 * fast antibodies are made, how often bacteria divide, the stock of antivenom, how likely Pathogen
 * X is, whether pathogens hop along the lymph, whether a hurt organ regrows. Which of those a
 * player should be told, and where, is the designer's to say (`docs/FINDINGS.md` #116).
 *
 * FOUR OF THE SIX ARE NUMBERS, and are read here from the content pack's own tables, the ones the
 * engine reads. TWO ARE RULES, written in the engine and not in a table: where a worm starts, and
 * what makes the body remember a disease. For those this file says WHICH sentence each difficulty
 * gets, and `tests/session/src/differences.test.ts` drives the engine on each difficulty and holds
 * the choice to what the engine does. It decides nothing in a game.
 */
import {
  AB_CAP_FAM_BY_DIFF,
  DIFF,
  MEMORY_RESPONSE_AP_HARD,
  SPAWN_TABLE,
} from '@immunity-wars/content';

export const DIFFICULTIES = ['training', 'normal', 'hard'] as const;
export type DifficultyKey = (typeof DIFFICULTIES)[number];

/** Where a worm is put when it arrives: `far` is the branch's far end, `near` one step from the organ. */
export type WormStart = 'far' | 'near' | 'organ';
/** What gives memory of a disease, and whether using that memory costs anything. */
export type MemoryFrom = 'beating' | 'vaccine' | 'vaccineCosts';

export const WORM_START: Record<DifficultyKey, WormStart> = {
  training: 'far',
  normal: 'near',
  hard: 'organ',
};

export const MEMORY_FROM: Record<DifficultyKey, MemoryFrom> = {
  training: 'beating',
  normal: 'vaccine',
  hard: 'vaccineCosts',
};

/** How many new infections a turn's die can bring, read off its table of six faces. */
export interface CardsATurn {
  least: number;
  most: number;
  /** Which sentence says it. */
  say: 'one' | 'sometimes' | 'or' | 'to';
}

export function cardsATurn(table: readonly number[]): CardsATurn {
  const least = Math.min(...table);
  const most = Math.max(...table);
  if (most === least) return { least, most, say: 'one' };
  if (most - least > 1) return { least, most, say: 'to' };
  // Two numbers next to each other. "Sometimes" when the larger is one face of the six.
  const larger = table.filter((n) => n === most).length;
  return { least, most, say: larger * 6 <= table.length ? 'sometimes' : 'or' };
}

/** One cell of the card: a bare number, or a sentence from the catalogue. */
export type DifferenceCell =
  { n: number } | { key: string; params?: Record<string, string | number> };

export interface DifferenceRow {
  id: 'ap' | 'turns' | 'cards' | 'store' | 'worm' | 'memory';
  /** The catalogue key of what the row is about. */
  labelKey: string;
  cells: Record<DifficultyKey, DifferenceCell>;
}

const each = (
  cell: (d: DifficultyKey) => DifferenceCell,
): Record<DifficultyKey, DifferenceCell> => ({
  training: cell('training'),
  normal: cell('normal'),
  hard: cell('hard'),
});

export function differenceRows(): DifferenceRow[] {
  return [
    { id: 'ap', labelKey: 'differences.ap', cells: each((d) => ({ n: DIFF[d].ap })) },
    { id: 'turns', labelKey: 'differences.turns', cells: each((d) => ({ n: DIFF[d].turns })) },
    {
      id: 'cards',
      labelKey: 'differences.cards',
      cells: each((d) => {
        const c = cardsATurn(SPAWN_TABLE[d]);
        return { key: `differences.cards.${c.say}`, params: { least: c.least, most: c.most } };
      }),
    },
    {
      id: 'store',
      labelKey: 'differences.store',
      cells: each((d) => ({ n: AB_CAP_FAM_BY_DIFF[d] })),
    },
    {
      id: 'worm',
      labelKey: 'differences.worm',
      cells: each((d) => ({ key: `differences.worm.${WORM_START[d]}` })),
    },
    {
      id: 'memory',
      labelKey: 'differences.memory',
      cells: each((d) => ({
        key: `differences.memory.${MEMORY_FROM[d]}`,
        params: { n: MEMORY_RESPONSE_AP_HARD },
      })),
    },
  ];
}

/** The numbers the result's two sentences are filled with. */
export function differenceSummary(): Record<string, number> {
  return {
    apT: DIFF.training.ap,
    apN: DIFF.normal.ap,
    apH: DIFF.hard.ap,
    wN: DIFF.normal.turns,
    wH: DIFF.hard.turns,
  };
}
