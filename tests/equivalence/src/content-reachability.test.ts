/**
 * THE REACHABILITY REPORT IS A GENERATOR, SO IT NEEDS A KNOWN-ANSWER TEST.
 *
 * `reachability-report.ts` writes `docs/CONTENT_REACHABILITY.md` — the mechanical answer to
 * docs/FINDINGS.md #22 and #23. A generator that produces a plausible document nobody checks is
 * exactly the failure docs/FINDINGS.md #24 describes: an instrument that is wrong in a region
 * nobody is looking at.
 *
 * So it is held to answers established BY HAND, before the generator existed:
 *
 *   #23  `Diphtheria toxin` had a FAMILY and a TROPISM entry and NOTHING could produce it.
 *        Found by grepping legacy: it appeared exactly twice, both table entries. Since queue Q15
 *        (2 October 2026) Diphtheria is a bacterium that releases it, so the content has no such
 *        row; the answer is still demanded of the generator, with Diphtheria taken out of the
 *        toxin makers it is handed.
 *   #21  the only `novel` card is a VIRUS, which is why `tag`'s refusal can never fire
 *   #4   the only `variant` card is a PARASITE, which is why the coat-change roll never fired in
 *        the original, whose `neutralise` refused parasites (reachable since queue Q1)
 *   #13  Pathogen X is the only card with no FAMILY entry
 *
 * If the generator disagrees with any of these, THE GENERATOR IS WRONG and the rest of its
 * output cannot be trusted. Fix the generator, never the expectation.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import * as content from '@immunity-wars/content';

import { report, unproducible } from '../reachability-report.js';

// Resolved from THIS file, not from the working directory — vitest's cwd differs depending on
// whether the suite runs from the package root or the repo root.
const REPORT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/CONTENT_REACHABILITY.md'),
  'utf8',
);

describe('the reachability report finds what was found by hand', () => {
  it('finds Diphtheria toxin, and nothing else, when nothing releases it — FINDINGS #23', () => {
    // The hand analysis found exactly one such row, without being told where to look. A generator
    // that flagged half the content would also "contain Diphtheria toxin" and would be useless:
    // the count is the part that says it is discriminating.
    const { Diphtheria: _released, ...others } = content.TOXIN_MAKERS as Record<string, string>;
    expect(_released).toBe('Diphtheria toxin');
    const found = unproducible(others);
    if (found.family.join() !== 'Diphtheria toxin' || found.tropism.join() !== 'Diphtheria toxin')
      throw new Error(
        `THE REPORT DID NOT FIND THE ROW NOTHING PRODUCES: family [${found.family.join(', ')}], tropism [${found.tropism.join(', ')}]`,
      );
  });

  it('finds nothing in the content as it is: every declared disease has a producer', () => {
    expect(unproducible()).toEqual({ family: [], tropism: [] });
    const section =
      REPORT.split('## 3. Content the engine cannot produce')[1]?.split('## 4.')[0] ?? '';
    expect(section).toContain('_None. Every declared disease has a producer._');
    expect(section.split('\n').filter((l) => /^\| \*\*/.test(l))).toHaveLength(0);
  });

  it('names Pathogen X as the only card with no FAMILY entry — FINDINGS #13', () => {
    const section = REPORT.split('## 4.')[1] ?? '';
    expect(section).toMatch(/no FAMILY entry: \*\*Pathogen X\*\*\s*$/m);
  });

  it('is up to date with the content it describes', () => {
    // The report is committed, so it can rot. This fails if the content moved under it.
    // `npx tsx tests/equivalence/reachability-report.ts` regenerates it.
    //
    // The WHOLE report, as the generator makes it today (FINDINGS #104). This sampled two numbers,
    // the deck's and FAMILY's, so when queue Q3 gave Pathogen X a TROPISM entry the report went on
    // saying it had none, and this passed. The generator writes only when run directly, so
    // importing it here cannot rewrite the file this reads.
    expect(REPORT).toBe(report());
  });
});

/**
 * The same three facts, asserted against the CONTENT rather than against the report.
 *
 * Two independent routes to the same answers: if the report and these ever disagree, one of them
 * is lying and the difference says which.
 */
describe('the underlying facts, checked against the content directly', () => {
  const flagged = (flag: string): { dz: string; type: string }[] =>
    content.DECK_MASTER.filter((c) => flag in (c as object)).map((c) => ({
      dz: c.dz,
      type: c.type,
    }));

  it("the only novel card is a virus — why tag's guard cannot fire (#21)", () => {
    expect(flagged('novel')).toEqual([{ dz: 'Pathogen X', type: 'virus' }]);
  });

  it('the only variant card is a parasite — why the coat-change roll never fired in the original (#4)', () => {
    expect(flagged('variant')).toEqual([{ dz: 'Sleeping sickness', type: 'parasite' }]);
  });

  it("the only hidesInMac card is a parasite — why neutralise's inMac guard cannot fire", () => {
    expect(flagged('hidesInMac')).toEqual([{ dz: 'Kala-azar', type: 'parasite' }]);
  });

  it('Diphtheria toxin is declared, is no card, and is released by the Diphtheria bacterium', () => {
    const dz = 'Diphtheria toxin';
    expect(content.FAMILY[dz]).toBe('TOX');
    expect(dz in content.TROPISM).toBe(true);
    expect(content.DECK_MASTER.some((c) => c.dz === dz)).toBe(false);
    expect((content.TOXIN_MAKERS as Record<string, string>)['Diphtheria']).toBe(dz);
    expect(content.DECK_MASTER.find((c) => c.dz === 'Diphtheria')?.type).toBe('bacteria');
  });
});
