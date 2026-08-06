/**
 * The pack loader and its schema.
 *
 * TWO JOBS, and the second is the one that makes the first mean anything:
 *
 *   1. The bundled pack loads and is what the engine expects.
 *   2. A MALFORMED pack is REJECTED. A validator nobody has watched reject something is
 *      indistinguishable from no validator at all — and this project has found that exact
 *      shape of vacuous pass eight times (tests/equivalence/README.md, "things that will bite
 *      you", rule 2). So every schema rule that matters is exercised against a pack that
 *      breaks it.
 *
 * The negative cases build a corrupted copy of the REAL pack rather than a toy object, so they
 * cannot drift into testing a schema the product does not use.
 */

import { describe, expect, it } from 'vitest';

import * as pack from './load.js';
import { RulesPackS } from './schema.js';

import boardJson from './rules/board.json';
import deckJson from './rules/deck.json';
import eventsJson from './rules/events.json';
import familiesJson from './rules/families.json';
import invadersJson from './rules/invaders.json';
import packJson from './rules/pack.json';
import tropismJson from './rules/tropism.json';
import tuningJson from './rules/tuning.json';

/** A deep, mutable copy of exactly what load.ts assembles. */
const rawPack = (): Record<string, unknown> =>
  JSON.parse(
    JSON.stringify({
      ...packJson,
      ...boardJson,
      ...deckJson,
      ...eventsJson,
      ...familiesJson,
      ...invadersJson,
      ...tropismJson,
      ...tuningJson,
    }),
  ) as Record<string, unknown>;

describe('the bundled pack loads', () => {
  it('validates as it ships', () => {
    expect(() => RulesPackS.parse(rawPack())).not.toThrow();
  });

  it('carries its stamp', () => {
    expect(pack.PACK_ID).toBe('immunity-wars-core');
    expect(pack.PACK_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pack.RULES_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('rebuilds NOT_ALIVE as a Set — the one table JSON cannot hold', () => {
    expect(pack.NOT_ALIVE).toBeInstanceOf(Set);
    expect(pack.NOT_ALIVE.has('toxin')).toBe(true);
    expect(pack.NOT_ALIVE.has('venom')).toBe(true);
    expect(pack.NOT_ALIVE.has('bacteria')).toBe(false);
  });
});

/**
 * KEY ORDER SURVIVES THE LOADER.
 *
 * load.ts discards Zod's return value precisely so it cannot reorder anything. This is the test
 * that would fail if someone "tidied" `RulesPackS.parse(raw)` into `return RulesPackS.parse(raw)`
 * — measured, not assumed: z.object rebuilds in SCHEMA order and z.record with a key enum
 * rebuilds in ENUM order.
 */
describe('the loader does not rebuild the tables', () => {
  it('TROPISM key order is the JSON key order — it feeds rollOrgan', () => {
    const fromJson = Object.keys(
      (tropismJson as unknown as { TROPISM: Record<string, unknown> }).TROPISM,
    );
    expect(Object.keys(pack.TROPISM)).toEqual(fromJson);
  });

  it('FAM_KEYS order is unchanged — it feeds the kidney antibody leak', () => {
    expect([...pack.FAM_KEYS]).toEqual(['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK']);
  });

  it('ORGANS key order is the JSON key order, not the schema enum order', () => {
    // The schema's OrganKeyS enum starts heart,lungs,liver,marrow,brain,... and so does the
    // JSON, so this test would pass by luck on order alone. Compare against the FILE.
    const fromJson = Object.keys(
      (boardJson as unknown as { ORGANS: Record<string, unknown> }).ORGANS,
    );
    expect(Object.keys(pack.ORGANS)).toEqual(fromJson);
  });

  it('every table is the SAME OBJECT as its JSON module, not a copy', () => {
    // The strongest form: if Zod's output were being returned, these would be equal but not
    // identical. Same argument as the engine/content identity test in exports.test.ts.
    expect(pack.ORGANS).toBe((boardJson as unknown as { ORGANS: unknown }).ORGANS);
    expect(pack.DECK_MASTER).toBe((deckJson as unknown as { DECK_MASTER: unknown }).DECK_MASTER);
    expect(pack.TROPISM).toBe((tropismJson as unknown as { TROPISM: unknown }).TROPISM);
    expect(pack.FLAGS).toBe((tuningJson as unknown as { FLAGS: unknown }).FLAGS);
  });
});

/**
 * THE NEGATIVE CASES. Each corrupts the real pack in one way and expects a throw.
 *
 * `it.each` over a table so adding a rule to the schema without a rejection case for it is
 * visibly a gap rather than an oversight.
 */
describe('a malformed pack is rejected', () => {
  const corrupt = (fn: (p: Record<string, unknown>) => void): (() => unknown) => {
    const p = rawPack();
    fn(p);
    return () => RulesPackS.parse(p);
  };

  const cases: [string, (p: Record<string, unknown>) => void][] = [
    ['a missing table', (p) => delete p['TROPISM']],
    ['an unknown table (typo) — strictObject, not silently stripped', (p) => (p['TROPSIM'] = {})],
    [
      'an unknown key inside a card',
      (p) => ((p['DECK_MASTER'] as Record<string, unknown>[])[0]!['sneaky'] = true),
    ],
    [
      'a card with an invalid invader type',
      (p) => ((p['DECK_MASTER'] as Record<string, unknown>[])[0]!['type'] = 'gremlin'),
    ],
    [
      'a card with an invalid lane',
      (p) => ((p['DECK_MASTER'] as Record<string, unknown>[])[0]!['lane'] = 'earlobe'),
    ],
    [
      'a card with an empty disease name',
      (p) => ((p['DECK_MASTER'] as Record<string, unknown>[])[0]!['dz'] = ''),
    ],
    ['an empty deck', (p) => (p['DECK_MASTER'] = [])],
    [
      'an organ that is not a real organ',
      (p) => ((p['ORGANS'] as Record<string, unknown>)['spleeen'] = {}),
    ],
    [
      'an organ with a missing field',
      (p) => delete (p['ORGANS'] as Record<string, Record<string, unknown>>)['brain']!['bio'],
    ],
    [
      'an organ with zero integrity',
      (p) => ((p['ORGANS'] as Record<string, Record<string, unknown>>)['brain']!['integrity'] = 0),
    ],
    [
      'a tropism naming an organ that does not exist',
      (p) => ((p['TROPISM'] as Record<string, unknown>)['Influenza'] = ['pancreas']),
    ],
    [
      'a tropism with an empty organ list',
      (p) => ((p['TROPISM'] as Record<string, unknown>)['Influenza'] = []),
    ],
    [
      'a FAMILY value that is not one of the six antigen classes',
      (p) => ((p['FAMILY'] as Record<string, unknown>)['Influenza'] = 'ZZZ'),
    ],
    [
      'a family colour that is not a hex code',
      (p) =>
        ((p['FAMILIES'] as Record<string, Record<string, unknown>>)['ENV']!['col'] = 'reddish'),
    ],
    [
      'a SPAWN_TABLE row that is not six faces of a d6',
      (p) => ((p['SPAWN_TABLE'] as Record<string, unknown>)['hard'] = [1, 2, 3]),
    ],
    ['a missing difficulty', (p) => delete (p['DIFF'] as Record<string, unknown>)['hard']],
    ['a REINFECT_PC above 1', (p) => (p['REINFECT_PC'] = 1.5)],
    ['a non-integer tuning constant', (p) => (p['VACCINE_COST'] = 2.5)],
    ['a negative tuning constant', (p) => (p['WORM_MAX_PER_GAME'] = -1)],
    ['a missing feature flag', (p) => delete (p['FLAGS'] as Record<string, unknown>)['worms']],
    [
      'an unknown feature flag',
      (p) => ((p['FLAGS'] as Record<string, unknown>)['telepathy'] = true),
    ],
    ['a malformed pack version', (p) => (p['packVersion'] = 'v1')],
    ['a missing rulesVersion', (p) => delete p['rulesVersion']],
    ['a NOT_ALIVE entry that is not an invader type', (p) => (p['NOT_ALIVE'] = ['toxin', 'ghost'])],
  ];

  it.each(cases)('rejects %s', (_label, mutate) => {
    expect(corrupt(mutate)).toThrow();
  });

  it('the corruption helper does not itself invalidate the pack', () => {
    // Guards the negative suite from the failure it exists to prevent: if rawPack() produced
    // something invalid, every case above would "pass" while testing nothing at all.
    expect(() => RulesPackS.parse(rawPack())).not.toThrow();
  });
});
