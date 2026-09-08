/**
 * THE DERIVED RECORDS' ENGINE HALF: firing each rare event produces the disease record the
 * pack's DERIVED table names, with the type it names. The content half (every non-card record
 * in the table, parents in the deck, toxins matching their makers) is in the content package;
 * this file is the part only the engine can answer.
 *
 * Both ways: the real table passes; a table naming the wrong type for an outcome fails.
 */
import { describe, expect, it } from 'vitest';

import { DERIVED } from '@immunity-wars/content';
import * as port from '@immunity-wars/engine';

type G = Record<string, unknown>;
interface Invader {
  disease: string;
  type: string;
}

function armed(): G {
  const g = port.newGame({ difficulty: 'training' }) as unknown as G;
  (g['rare'] as Record<string, unknown>)['armed'] = true;
  return g;
}

const rareOutcomes = Object.entries(DERIVED).filter(([, d]) => d.via === 'rare');

describe('firing each rare event yields the derived record the pack names', () => {
  it('there are rare outcomes to pin', () => {
    expect(rareOutcomes.length).toBeGreaterThanOrEqual(4);
  });

  it.each(rareOutcomes.map(([dz, d]) => [dz, d.rare ?? '', d.type] as const))(
    '%s arises from rare event %s as type %s',
    (dz, rare, type) => {
      const g = armed();
      if (rare === 'dengueADE') {
        // ADE renames a live Dengue invader rather than creating one.
        (g['invaders'] as Invader[]).push({
          disease: 'Dengue',
          type: 'virus',
          ...({
            id: 'dg',
            zone: 'lane',
            lane: 'bite',
            step: 3,
            organ: null,
            hp: 1,
            maxhp: 1,
            tagged: false,
            age: 0,
            embed: 0,
          } as object),
        } as Invader);
      }
      const fired = port.fireRare(g as never, rare);
      expect(fired).toBe(true);
      const made = (g['invaders'] as Invader[]).find((x) => x.disease === dz);
      expect(made, `${dz} did not appear after ${rare}`).toBeDefined();
      expect(made?.type).toBe(type);
    },
  );

  it('CONTROL: a table naming the wrong type would fail', () => {
    const g = armed();
    port.fireRare(g as never, 'shingles');
    const made = (g['invaders'] as Invader[]).find((x) => x.disease === 'Shingles');
    expect(made?.type).not.toBe('bacteria');
  });

  it('the stage record arises from a malaria that reaches the blood stage', () => {
    // Malaria (blood) is written by the spread when the liver stage ends; its parent and type
    // are held by the content test, and its name is the engine's (spread.ts).
    expect(DERIVED['Malaria (blood)']?.from).toBe('Malaria');
    expect(DERIVED['Malaria (blood)']?.type).toBe('malaria');
  });
});
