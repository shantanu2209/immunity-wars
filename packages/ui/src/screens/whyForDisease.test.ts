/**
 * THE CARD-TO-BOX LINK, held to the content pack rather than to a list written here.
 *
 * `whyForDisease` decides which of the rulebook's fifteen "why it works this way" boxes a
 * disease card offers. The boxes are Kartik's science, so "this box explains this disease" is a
 * claim about biology; the function is allowed to make it only where the PACK ALREADY SAYS the
 * disease has that mechanic, which turns each link into a restatement of existing data.
 *
 * These tests therefore never list the diseases they expect. They ask the pack, and require the
 * function to agree with it — so a card added to the deck is covered on the day it is added, and
 * a card whose type changes moves its links without anyone remembering to come back here.
 *
 * Ruled in by Shantanu on 8 September 2026, correcting a claim in `LibraryScreen.tsx`'s header
 * that none of the boxes was about a disease. Four of them are.
 */

import { DECK_MASTER, DERIVED, NOVEL_ANTIGENS, TOXIN_MAKERS, WHY } from '@immunity-wars/content';
import { describe, expect, it } from 'vitest';

import { libraryType, whyForDisease } from './LibraryScreen';

/** Every disease record the library or the inspect sheet can card, with the type it cards under. */
const everyRecord = (): { disease: string; type: string }[] => [
  ...DECK_MASTER.map((c) => ({ disease: c.dz, type: c.type })),
  ...Object.keys(DERIVED).map((dz) => ({ disease: dz, type: libraryType(dz) })),
];

describe('whyForDisease', () => {
  it('offers only keys that exist in the pack, so no card can link to a missing box', () => {
    const known = new Set(WHY.map((w) => w.key));
    for (const { disease, type } of everyRecord()) {
      for (const key of whyForDisease(disease, type)) expect(known.has(key)).toBe(true);
    }
  });

  it('offers the worms box to exactly the worm cards, asked of the pack', () => {
    const expected = DECK_MASTER.filter((c) => c.type === 'worm').map((c) => c.dz);
    expect(expected.length).toBeGreaterThan(0);
    const actual = everyRecord()
      .filter(({ disease, type }) => whyForDisease(disease, type).includes('worms'))
      .map((r) => r.disease);
    expect(actual.sort()).toEqual(expected.sort());
  });

  it('offers the toxin-makers box to the makers AND to the toxins they release', () => {
    const makers = Object.keys(TOXIN_MAKERS);
    const toxins = everyRecord()
      .filter((r) => r.type === 'toxin')
      .map((r) => r.disease);
    expect(makers.length).toBeGreaterThan(0);
    expect(toxins.length).toBeGreaterThan(0);
    const actual = new Set(
      everyRecord()
        .filter(({ disease, type }) => whyForDisease(disease, type).includes('toxinMakers'))
        .map((r) => r.disease),
    );
    for (const m of makers) expect(actual.has(m)).toBe(true);
    for (const x of toxins) expect(actual.has(x)).toBe(true);
    expect(actual.size).toBe(new Set([...makers, ...toxins]).size);
  });

  it('offers the malaria box to every malaria record, derived ones included', () => {
    const expected = everyRecord()
      .filter((r) => r.type === 'malaria')
      .map((r) => r.disease);
    // Both the deck's two and the derived stages, or this test is weaker than it reads.
    expect(expected.length).toBeGreaterThan(2);
    for (const dz of expected) expect(whyForDisease(dz, 'malaria')).toContain('malaria');
  });

  it('offers the Pathogen X box to whatever the pack calls novel, not to a name typed here', () => {
    expect(NOVEL_ANTIGENS.size).toBeGreaterThan(0);
    for (const dz of NOVEL_ANTIGENS) expect(whyForDisease(dz, 'virus')).toContain('pathogenX');
  });

  it('says nothing for a plain virus or bacterium, which is the honest answer', () => {
    // The other eleven boxes are about a cell, the board, or the response in general. A card
    // that linked to them would be asserting a connection the pack does not make.
    const plain = DECK_MASTER.filter(
      (c) => (c.type === 'virus' || c.type === 'bacteria') && !(c.dz in TOXIN_MAKERS),
    ).filter((c) => !NOVEL_ANTIGENS.has(c.dz));
    expect(plain.length).toBeGreaterThan(20);
    for (const c of plain) expect(whyForDisease(c.dz, c.type)).toEqual([]);
  });

  it('returns the boxes in the order the why section lists them', () => {
    const order = WHY.map((w) => w.key);
    for (const { disease, type } of everyRecord()) {
      const got = whyForDisease(disease, type);
      const positions = got.map((k) => order.indexOf(k));
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    }
  });

  it('CONTROL: the pack-derived expectations are not vacuous — each rule matches something', () => {
    // Every assertion above is "the pack says X, so the function must say X". If the pack said
    // nothing, all of them would pass over empty sets. This requires each to be non-empty, and
    // requires the four rules together to be a strict subset of the records — so a function
    // that returned every box for every disease would fail here rather than sail through.
    const records = everyRecord();
    const withLinks = records.filter((r) => whyForDisease(r.disease, r.type).length > 0);
    expect(withLinks.length).toBeGreaterThan(0);
    expect(withLinks.length).toBeLessThan(records.length);
    const keys = new Set(withLinks.flatMap((r) => whyForDisease(r.disease, r.type)));
    expect([...keys].sort()).toEqual(['malaria', 'pathogenX', 'toxinMakers', 'worms']);
  });
});
