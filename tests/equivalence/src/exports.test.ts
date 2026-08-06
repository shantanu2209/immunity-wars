/**
 * THE PUBLIC SURFACE IS THE CONTRACT — and this is the test that says so.
 *
 * docs/PHASE1_BRIEF.md §5: "The public API is the contract: 67 exports at v2_engine.js:1767."
 * docs/DEVIATIONS.md #2 cited a test named "port exports exactly the 67 names legacy resolves
 * to". THAT TEST DID NOT EXIST. The claim was carried in prose in three places — the header of
 * index.ts, the header of internal.ts, and DEVIATIONS #2 — and measured in none, and it was
 * false: the root published 106 runtime names.
 *
 * Nothing was MISSING, so no consumer ever broke. The surface had widened: 38 data tables and
 * tuning constants that legacy keeps module-private were re-exported for convenience, plus the
 * Task A scaffold marker. A superset is not a contract violation you notice — which is exactly
 * why it needs a test rather than a sentence.
 *
 * Two directions, and both matter for different reasons:
 *
 *   MISSING  — a legacy name the port does not publish. Breaks a real consumer. Never happened.
 *   EXTRA    — a name legacy does not publish. Breaks nobody today, and silently becomes API
 *              that Phase 2 and Phase 3 will build against and then cannot remove.
 *
 * A "the port is a superset of legacy" test would pass on both the broken and the correct
 * state, so it would be incapable of failing usefully. This asserts SET EQUALITY.
 *
 * Scope: RUNTIME exports. `export type` is erased and no consumer can observe it, so the type
 * exports are deliberately outside the contract.
 */

import { describe, expect, it } from 'vitest';

import * as content from '@immunity-wars/content';
import * as port from '@immunity-wars/engine';

import { loadLegacy } from './engine.js';

const legacy = loadLegacy();

/**
 * The ONE documented exemption.
 *
 * Every package scaffolded in Task A carries a PACKAGE_NAME marker, asserted by that package's
 * own index.test.ts — it is what proves the workspace resolves. It is not game API and legacy
 * has no equivalent. Named here rather than tolerated by a rule, so the exemption list is a
 * list of one that anybody can read, and growing it is a visible act.
 */
const SCAFFOLD_EXEMPTIONS = ['PACKAGE_NAME'] as const;

const portNames = new Set(Object.keys(port));
const legacyNames = new Set(Object.keys(legacy));

describe('the engine root publishes exactly legacy resolved surface', () => {
  it("legacy's module.exports resolves to 67 unique names", () => {
    // 70 entries, 3 of them repeated — macrophageEatable, snipeTargets, rateForFam. The later
    // binding overwrites the earlier, so the module resolves to 67. docs/DEVIATIONS.md #2.
    expect(legacyNames.size).toBe(67);
  });

  it('publishes every name legacy publishes — nothing missing', () => {
    const missing = [...legacyNames].filter((n) => !portNames.has(n)).sort();
    expect(missing).toEqual([]);
  });

  it('publishes nothing legacy does not, beyond the documented scaffold exemption', () => {
    const extra = [...portNames]
      .filter((n) => !legacyNames.has(n))
      .filter((n) => !(SCAFFOLD_EXEMPTIONS as readonly string[]).includes(n))
      .sort();
    expect(extra).toEqual([]);
  });

  it('is 67 names plus the exemptions, counted', () => {
    expect(portNames.size).toBe(legacyNames.size + SCAFFOLD_EXEMPTIONS.length);
  });

  it('every exemption is actually present, so the list cannot rot unnoticed', () => {
    // An exemption for a name that no longer exists is a licence nobody is using. It should be
    // deleted, and this is what says so.
    for (const n of SCAFFOLD_EXEMPTIONS)
      expect(portNames.has(n), `${n} is exempted but absent`).toBe(true);
  });
});

/**
 * TASK C1 — "the engine contains no data", the half dependency-cruiser cannot see.
 *
 * The boundary invariant is: content contains no logic, engine contains no data. Three of its
 * four directions are import-graph properties and .dependency-cruiser.cjs enforces them. This
 * one is not: a table RE-DECLARED inside packages/engine imports nothing, so it casts no edge
 * on the graph and dependency-cruiser is structurally blind to it.
 *
 * Identity — `toBe`, not `toEqual` — is what closes that. A copy-pasted table would still be
 * deeply equal to content's and would pass every value test in data.test.ts, including the
 * key-order comparison. It would fail this one on the first assertion, because it would be a
 * different object.
 *
 * That failure mode is not hypothetical for this project: the data tables spent all of Task B
 * inside packages/engine, and the whole of C1 is moving them out. Something that drifts back is
 * exactly the shape of mistake to expect.
 */
describe('C1: every data export of the engine IS content, by identity', () => {
  /** The 22 tables legacy publishes. Same list data.test.ts proves against legacy. */
  const DATA_EXPORTS = [
    'ORGANS',
    'ORGAN_SETS',
    'ROUTES',
    'TROPISM',
    'DECK_MASTER',
    'FAMILIES',
    'FAM_KEYS',
    'FAMILY',
    'EVENTS',
    'RARE',
    'INV_HP',
    'INV_SPEED',
    'FAST_DISEASE',
    'NOT_ALIVE',
    'TOXIN_MAKERS',
    'RESIDENT_NAME',
    'CELL_KEYS',
    'DIFF',
    'FLAGS',
    'VACCINE_COST',
    'CLONE_COST',
    'ANTIVENOM_ORDER',
  ] as const;

  const at = (m: unknown, k: string): unknown => (m as Record<string, unknown>)[k];

  for (const name of DATA_EXPORTS) {
    it(`${name} is re-exported from content, not re-declared`, () => {
      expect(at(content, name), `${name} is missing from @immunity-wars/content`).toBeDefined();
      // Scalars (VACCINE_COST, CLONE_COST, ANTIVENOM_ORDER) compare by value; that is all
      // identity means for a number, and a re-declared 5 is genuinely indistinguishable.
      // The tables are objects, where toBe is a real constraint.
      expect(at(port, name)).toBe(at(content, name));
    });
  }

  it('covers every data export the engine publishes, with none missed', () => {
    // Guards the list above from going stale: if a 23rd data table is ever published, this
    // fails rather than letting it slip past unchecked.
    const publishedData = [...portNames]
      .filter((n) => typeof at(port, n) !== 'function')
      .filter((n) => n !== 'PACKAGE_NAME')
      .sort();
    expect(publishedData).toEqual([...DATA_EXPORTS].sort());
  });
});
