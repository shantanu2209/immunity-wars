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
 *   #23  `Diphtheria toxin` has a FAMILY and a TROPISM entry and NOTHING can produce it.
 *        Found by grepping legacy: it appears exactly twice, both table entries.
 *   #21  the only `novel` card is a VIRUS, which is why `tag`'s refusal can never fire
 *   #4   the only `variant` card is a PARASITE, which is why the coat-change roll can never fire
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

// Resolved from THIS file, not from the working directory — vitest's cwd differs depending on
// whether the suite runs from the package root or the repo root.
const REPORT = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../docs/CONTENT_REACHABILITY.md'),
  'utf8',
);

describe('the reachability report finds what was found by hand', () => {
  it('names Diphtheria toxin as content nothing can produce — FINDINGS #23', () => {
    const section = REPORT.split('## 3. Content the engine cannot produce')[1]?.split('## 4.')[0];
    expect(section, 'section 3 is missing from the report').toBeDefined();
    expect(section).toContain('Diphtheria toxin');
  });

  it('names it and nothing else — the hand analysis found exactly one', () => {
    // A generator that flagged half the content would also "contain Diphtheria toxin" and would
    // be useless. The count is the part that says it is discriminating.
    const section =
      REPORT.split('## 3. Content the engine cannot produce')[1]?.split('## 4.')[0] ?? '';
    const rows = section.split('\n').filter((l) => /^\| \*\*/.test(l));
    expect(rows).toHaveLength(1);
  });

  it('names Pathogen X as the only card with no FAMILY entry — FINDINGS #13', () => {
    const section = REPORT.split('## 4.')[1] ?? '';
    expect(section).toMatch(/no FAMILY entry: \*\*Pathogen X\*\*\s*$/m);
  });

  it('is up to date with the content it describes', () => {
    // The report is committed, so it can rot. This fails if the content moved under it.
    // `npx tsx tests/equivalence/reachability-report.ts` regenerates it.
    const deck = content.DECK_MASTER.length;
    expect(REPORT).toContain(`Deck: **${deck} cards**`);
    expect(REPORT).toContain(`FAMILY: **${Object.keys(content.FAMILY).length} entries**`);
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

  it('the only variant card is a parasite — why the coat-change roll cannot fire (#4)', () => {
    expect(flagged('variant')).toEqual([{ dz: 'Sleeping sickness', type: 'parasite' }]);
  });

  it("the only hidesInMac card is a parasite — why neutralise's inMac guard cannot fire", () => {
    expect(flagged('hidesInMac')).toEqual([{ dz: 'Kala-azar', type: 'parasite' }]);
  });

  it('Diphtheria toxin is declared but has no producer', () => {
    const dz = 'Diphtheria toxin';
    expect(content.FAMILY[dz]).toBe('TOX');
    expect(dz in content.TROPISM).toBe(true);
    expect(content.DECK_MASTER.some((c) => c.dz === dz)).toBe(false);
    expect(Object.values(content.TOXIN_MAKERS)).not.toContain(dz);
  });
});
