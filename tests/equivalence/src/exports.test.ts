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
