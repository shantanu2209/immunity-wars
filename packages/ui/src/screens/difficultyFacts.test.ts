/**
 * The table of what changes between the difficulties, as data (`difficultyFacts.ts`). That each row
 * says what the engine does is `tests/session/src/differences.test.ts`'s, which plays the engine;
 * here is what needs no game: every sentence the table can ask for is in the catalogue, the die's
 * table is read rightly, and the result's two sentences say nothing the rows do not.
 */
import { DIFF, UI_I18N_EN } from '@immunity-wars/content';
import { describe, expect, it } from 'vitest';

import { t } from '../i18n';

import {
  DIFFICULTIES,
  MEMORY_FROM,
  PATHOGEN_X_IN_TEN,
  cardsATurn,
  differenceRows,
  differenceSummary,
} from './difficultyFacts';

const has = (key: string): boolean => key in (UI_I18N_EN as Record<string, string>);

describe('the table of what changes', () => {
  it('has the rulebook’s eleven rows in its order, then the four the engine adds', () => {
    const rows = differenceRows();
    expect(rows.map((r) => r.id)).toEqual([
      'ap',
      'turns',
      'cards',
      'store',
      'rate',
      'range',
      'antivenom',
      'worm',
      'memory',
      'presentation',
      'practice',
      'divide',
      'organ',
      'lymph',
      'pathogenX',
    ]);
    for (const row of rows) {
      if (!has(row.labelKey)) throw new Error(`A ROW HAS NO SENTENCE: ${row.labelKey}`);
      for (const d of DIFFICULTIES) {
        const cell = row.cells[d];
        if ('n' in cell) {
          // A bare number is a count of something there is: where there is none, a word says so.
          expect(Number.isInteger(cell.n) && cell.n > 0, `${row.id} on ${d}`).toBe(true);
          continue;
        }
        if (!has(cell.key)) throw new Error(`A CELL HAS NO SENTENCE: ${cell.key}`);
        // Every blank in the sentence is filled: none is left showing its name in braces.
        expect(t(cell.key, cell.params), cell.key).not.toMatch(/[{}⟪⟫]/);
      }
    }
  });

  it('every sentence a cell could ask for is in the catalogue', () => {
    for (const key of [
      'differences.no',
      'differences.none',
      'differences.cards.one',
      'differences.cards.sometimes',
      'differences.cards.or',
      'differences.cards.to',
      'differences.rate.upTo',
      'differences.rate.practice',
      'differences.worm.far',
      'differences.worm.half',
      'differences.worm.organ',
      'differences.memory.beating',
      'differences.memory.vaccine',
      'differences.memory.vaccineCosts',
      'differences.presentation.yes',
      'differences.presentation.no',
      'differences.practice.yes',
      'differences.divide.roll',
      'differences.divide.always',
      'differences.organ.heals',
      'differences.organ.never',
      'differences.lymph.yes',
      'differences.pathogenX.some',
      'differences.pathogenX.always',
    ])
      expect(has(key), key).toBe(true);
  });

  it('reads a die’s six faces', () => {
    expect(cardsATurn([1, 1, 1, 1, 1, 2])).toEqual({ least: 1, most: 2, say: 'sometimes' });
    expect(cardsATurn([1, 1, 1, 1, 2, 2])).toEqual({ least: 1, most: 2, say: 'or' });
    expect(cardsATurn([1, 1, 1, 2, 2, 3])).toEqual({ least: 1, most: 3, say: 'to' });
    expect(cardsATurn([2, 2, 2, 2, 2, 2])).toEqual({ least: 2, most: 2, say: 'one' });
  });

  it('the result’s two sentences say only what the rows say', () => {
    const n = differenceSummary();
    expect(n).toEqual({
      apT: DIFF.training.ap,
      apN: DIFF.normal.ap,
      apH: DIFF.hard.ap,
      wN: DIFF.normal.turns,
      wH: DIFF.hard.turns,
    });
    expect(t('differences.resultLead', n)).not.toMatch(/[{}⟪⟫]/);
    // "Normal and Hard ask more of you": fewer Action Points and a longer window, on both.
    expect(n['apN']).toBeLessThan(Number(n['apT']));
    expect(n['apH']).toBeLessThan(Number(n['apN']));
    expect(n['wN']).toBeGreaterThan(DIFF.training.turns);
    expect(n['wH']).toBeGreaterThan(Number(n['wN']));
    // "On both, only a vaccine makes the body remember a disease."
    if (MEMORY_FROM.normal === 'beating' || MEMORY_FROM.hard === 'beating')
      throw new Error('THE RESULT SAYS ONLY A VACCINE GIVES MEMORY ON NORMAL AND HARD');
  });

  it('How to play’s sentence on Pathogen X says only what the table says', () => {
    // "in {easy} games of 10 on Easy, {normal} on Normal, and every game on Hard"
    expect(PATHOGEN_X_IN_TEN.hard).toBe(10);
    expect(PATHOGEN_X_IN_TEN.training).toBeLessThan(PATHOGEN_X_IN_TEN.normal);
    const said = t('help.s7.x.arrives', {
      easy: PATHOGEN_X_IN_TEN.training,
      normal: PATHOGEN_X_IN_TEN.normal,
    });
    expect(said).not.toMatch(/[{}⟪⟫]/);
  });
});
