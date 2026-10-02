/**
 * WHAT CHANGES BETWEEN EASY, NORMAL AND HARD (stage L6, `docs/LOOK_PLAN.md` §19 and §20), as data
 * for the table that shows it on the difficulty screen, on the result of a game on Easy and in How
 * to play.
 *
 * WHICH ROWS, AND WHY THESE (ruled 2 October 2026: "Make the call yourself please"). The printed
 * rulebook has this table already, in its section on difficulty, and the first eleven rows here
 * are its eleven, in its order. The last four are what the engine also does differently and that
 * table does not hold: how a bacterium divides, whether a hurt organ heals, whether infections
 * spread along the lymph, and how likely Pathogen X is. A player choosing Hard is choosing those
 * too. **Together they are every place the engine reads the difficulty,** and
 * `tests/session/src/differences.test.ts` counts those places in the engine's source, so that a
 * new one cannot arrive without this table being looked at.
 *
 * WHERE EACH ROW'S VALUE COMES FROM. A number is read from the content pack's own table wherever
 * the engine reads it from one. Where the engine has the rule written in itself, this file keeps a
 * small table of which sentence each difficulty gets, and the same test plays the engine on each
 * difficulty and holds the choice to what the engine does. It decides nothing in a game.
 */
import {
  AB_CAP_FAM_BY_DIFF,
  AFFINITY_AT,
  DIFF,
  HEAL_AFTER,
  MEMORY_RESPONSE_AP_HARD,
  PRESENT_TIER_BY_DIFF,
  RATE_CAP_BY_DIFF,
  SNIPE_RANGE_BY_DIFF,
  SPAWN_TABLE,
} from '@immunity-wars/content';

export const DIFFICULTIES = ['training', 'normal', 'hard'] as const;
export type DifficultyKey = (typeof DIFFICULTIES)[number];

/** Where a worm is put when it arrives: the entrance of its branch, halfway along it, the organ. */
export type WormStart = 'far' | 'half' | 'organ';
/** What gives memory of a disease, and whether using that memory costs anything. */
export type MemoryFrom = 'beating' | 'vaccine' | 'vaccineCosts';

export const WORM_START: Record<DifficultyKey, WormStart> = {
  training: 'far',
  normal: 'half',
  hard: 'organ',
};

export const MEMORY_FROM: Record<DifficultyKey, MemoryFrom> = {
  training: 'beating',
  normal: 'vaccine',
  hard: 'vaccineCosts',
};

/** Doses of antivenom a game starts with. */
export const ANTIVENOM_AT_START: Record<DifficultyKey, number> = {
  training: 2,
  normal: 1,
  hard: 0,
};

/** Does the count of antigens presented raise what one Produce makes? */
export const PRESENTATION_RAISES: Record<DifficultyKey, boolean> = {
  training: true,
  normal: true,
  hard: false,
};

/** Does making antibodies of one class again and again add one to what a Produce makes? */
export const PRACTICE_ADDS: Record<DifficultyKey, boolean> = {
  training: true,
  normal: false,
  hard: false,
};

/**
 * An uncoated bacterium divides on a roll of this or less; or, `always`, every turn, with a second
 * copy on a roll of `DIVIDES_TWICE_ON` or less.
 */
export const DIVIDES_ON: Record<DifficultyKey, number | 'always'> = {
  training: 2,
  normal: 3,
  hard: 'always',
};
export const DIVIDES_TWICE_ON = 3;

/** Does a hurt organ get its health back when its branch has been clear for a while? */
export const ORGAN_HEALS: Record<DifficultyKey, boolean> = {
  training: true,
  normal: true,
  hard: false,
};

/** Does an uncoated invader at a lymph node seed a neighbouring route, on a roll of this or less? */
export const LYMPH_SPREADS_ON: Record<DifficultyKey, number | null> = {
  training: null,
  normal: null,
  hard: 2,
};

/** In how many games of ten Pathogen X is due. */
export const PATHOGEN_X_IN_TEN: Record<DifficultyKey, number> = {
  training: 2,
  normal: 6,
  hard: 10,
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

/** One cell of the table: a bare number, or a sentence from the catalogue. */
export type DifferenceCell =
  { n: number } | { key: string; params?: Record<string, string | number> };

export type DifferenceId =
  | 'ap'
  | 'turns'
  | 'cards'
  | 'store'
  | 'rate'
  | 'range'
  | 'antivenom'
  | 'worm'
  | 'memory'
  | 'presentation'
  | 'practice'
  | 'divide'
  | 'organ'
  | 'lymph'
  | 'pathogenX';

export interface DifferenceRow {
  id: DifferenceId;
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

const row = (id: DifferenceId, cell: (d: DifficultyKey) => DifferenceCell): DifferenceRow => ({
  id,
  labelKey: `differences.${id}`,
  cells: each(cell),
});

const NO: DifferenceCell = { key: 'differences.no' };

export function differenceRows(): DifferenceRow[] {
  return [
    // The printed rulebook's eleven, in its order.
    row('ap', (d): DifferenceCell => ({ n: DIFF[d].ap })),
    row('turns', (d): DifferenceCell => ({ n: DIFF[d].turns })),
    row('cards', (d): DifferenceCell => {
      const c = cardsATurn(SPAWN_TABLE[d]);
      return { key: `differences.cards.${c.say}`, params: { least: c.least, most: c.most } };
    }),
    row('store', (d): DifferenceCell => ({ n: AB_CAP_FAM_BY_DIFF[d] })),
    row('rate', (d): DifferenceCell => {
      const n = RATE_CAP_BY_DIFF[d];
      return PRACTICE_ADDS[d]
        ? { key: 'differences.rate.practice', params: { n, more: n + 1 } }
        : { key: 'differences.rate.upTo', params: { n } };
    }),
    row('range', (d): DifferenceCell => ({ n: SNIPE_RANGE_BY_DIFF[d] })),
    row('antivenom', (d): DifferenceCell =>
      ANTIVENOM_AT_START[d] > 0 ? { n: ANTIVENOM_AT_START[d] } : { key: 'differences.none' },
    ),
    row('worm', (d): DifferenceCell => ({ key: `differences.worm.${WORM_START[d]}` })),
    row('memory', (d): DifferenceCell => ({
      key: `differences.memory.${MEMORY_FROM[d]}`,
      params: { n: MEMORY_RESPONSE_AP_HARD },
    })),
    row('presentation', (d): DifferenceCell => {
      const tier = PRESENT_TIER_BY_DIFF[d];
      return PRESENTATION_RAISES[d]
        ? { key: 'differences.presentation.yes', params: { a: tier[1] ?? 0, b: tier[2] ?? 0 } }
        : { key: 'differences.presentation.no' };
    }),
    row('practice', (d): DifferenceCell =>
      PRACTICE_ADDS[d] ? { key: 'differences.practice.yes', params: { at: AFFINITY_AT } } : NO,
    ),
    // What the engine also does differently, which the rulebook's table does not hold.
    row('divide', (d): DifferenceCell => {
      const on = DIVIDES_ON[d];
      return on === 'always'
        ? { key: 'differences.divide.always', params: { n: DIVIDES_TWICE_ON } }
        : { key: 'differences.divide.roll', params: { n: on } };
    }),
    row('organ', (d): DifferenceCell =>
      ORGAN_HEALS[d]
        ? { key: 'differences.organ.heals', params: { n: HEAL_AFTER } }
        : { key: 'differences.organ.never' },
    ),
    row('lymph', (d): DifferenceCell => {
      const on = LYMPH_SPREADS_ON[d];
      return on === null ? NO : { key: 'differences.lymph.yes', params: { n: on } };
    }),
    row('pathogenX', (d): DifferenceCell =>
      PATHOGEN_X_IN_TEN[d] >= 10
        ? { key: 'differences.pathogenX.always' }
        : { key: 'differences.pathogenX.some', params: { n: PATHOGEN_X_IN_TEN[d] } },
    ),
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
