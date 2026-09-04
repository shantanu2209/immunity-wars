/**
 * CONTROLS for the extractor's P2.5 rules (docs/FINDINGS.md #53): prose the engine returns as
 * DATA, and call sites whose message is composed elsewhere. Fed a synthetic source through
 * `sitesIn()`, so each rule is made to fire on purpose — and the permitted case (a `label:`
 * that is an identifier, not prose) is required to stay silent, per the mustPass half of the
 * standing rule.
 */
import { describe, expect, it } from 'vitest';

import { sitesIn } from '../i18n-extract.js';

const SRC = `
const effects: { label: string }[] = [];
effects.push({ label: 'Helper cell here', delta: 1 });
effects.push({ label: someVariable, delta: 1 });
capReasons.push('liver damaged now');
let blocked: string | null = null;
blocked = 'Production is shut';
g.rareBanner.why += \` The \${name} took it.\`;
d.disease = 'Dengue (ADE)';
snap('Cells burst');
pushLog(g, msg, 'good');
pushLog(g, 'A literal log line', 'good');
err('A literal error');
err(someError);
`;

describe('extractor controls — query prose and unextracted sites', () => {
  const { sites, unextracted } = sitesIn('synthetic.ts', SRC);
  const query = sites.filter((s) => s.fn === 'query').map((s) => s.message);

  it('mustFail: every query-prose shape is extracted — label, capReasons, blocked, why +=, disease, snap', () => {
    expect(query).toEqual([
      'Helper cell here',
      'liver damaged now',
      'Production is shut',
      ' The {name} took it.',
      'Dengue (ADE)',
      'Cells burst',
    ]);
  });

  it('mustPass: a label that is an identifier is NOT a site — data is not prose', () => {
    expect(query.some((m) => m.includes('someVariable'))).toBe(false);
    expect(query).toHaveLength(6);
  });

  it('the two Phase 1 shapes still extract, and a composed argument is LISTED rather than skipped', () => {
    expect(sites.filter((s) => s.fn === 'pushLog').map((s) => s.message)).toEqual([
      'A literal log line',
    ]);
    expect(sites.filter((s) => s.fn === 'err').map((s) => s.message)).toEqual(['A literal error']);
    expect(unextracted.map((u) => `${u.fn}(${u.expr})`)).toEqual([
      'pushLog(msg)',
      'err(someError)',
    ]);
  });
});
