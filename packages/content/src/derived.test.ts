/**
 * THE DERIVED RECORDS: every disease record that is not a deck card, and where it arises from.
 * Held to the pack's other tables both ways, so the library's index can never show a record
 * the pack does not have or miss one it does; the engine half (that firing a rare event yields
 * the disease and type the table says) is in the equivalence suite, which can reach the engine.
 */
import { describe, expect, it } from 'vitest';

import { DECK_MASTER, DERIVED, DZINFO, TOXIN_MAKERS } from './load.js';

const deck = new Set(DECK_MASTER.map((c) => c.dz));
const notCards = Object.keys(DZINFO).filter((dz) => !deck.has(dz));

describe('DERIVED covers exactly the disease records that are not deck cards', () => {
  it('every non-card record is in DERIVED, and every DERIVED key is a non-card record', () => {
    expect([...Object.keys(DERIVED)].sort()).toEqual([...notCards].sort());
  });

  it('every parent is a deck card, except the one record nothing produces', () => {
    for (const [dz, d] of Object.entries(DERIVED)) {
      if (d.via === 'none') {
        expect(d.from).toBeNull();
        expect(dz).toBe('Diphtheria toxin');
      } else {
        expect(d.from).not.toBeNull();
        expect(deck.has(d.from ?? '')).toBe(true);
      }
    }
  });

  it('the toxins agree with the toxin makers, both ways', () => {
    const fromMakers = Object.entries(TOXIN_MAKERS).map(
      ([maker, toxin]) => [toxin, maker] as const,
    );
    for (const [toxin, maker] of fromMakers) {
      expect(DERIVED[toxin]?.via).toBe('toxin');
      expect(DERIVED[toxin]?.from).toBe(maker);
      expect(DERIVED[toxin]?.type).toBe('toxin');
    }
    const toxinsDerived = Object.entries(DERIVED)
      .filter(([, d]) => d.via === 'toxin')
      .map(([dz]) => dz)
      .sort();
    expect(toxinsDerived).toEqual(fromMakers.map(([toxin]) => toxin).sort());
  });

  it('a rare outcome names the rare event that fires it', () => {
    for (const d of Object.values(DERIVED)) {
      if (d.via === 'rare') expect(typeof d.rare).toBe('string');
      else expect(d.rare).toBeUndefined();
    }
  });

  it('CONTROL: a record the pack does not have would be caught', () => {
    const withGhost = [...Object.keys(DERIVED), 'Ghost toxin'].sort();
    expect(withGhost).not.toEqual([...notCards].sort());
  });
});
