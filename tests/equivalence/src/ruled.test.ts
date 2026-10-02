/**
 * THE ORACLE'S OWN RULES (`ruled.ts`): the original as ruled is the original with every ruled edit
 * applied, each matching exactly once, in order. Both halves: an edit that matches is applied, and
 * one that does not, or that matches twice, is REFUSED, because a stale edit would leave the oracle
 * silently the original.
 */
import { describe, expect, it } from 'vitest';

import { applyRuled, legacySource, originalLegacySource } from './engine.js';
import { RULED } from './ruled.js';

describe('the original, as ruled', () => {
  it('is the original with every ruled edit applied, and only them', () => {
    expect(legacySource()).toBe(applyRuled(originalLegacySource(), RULED));
    if (RULED.length === 0) expect(legacySource()).toBe(originalLegacySource());
    else expect(legacySource()).not.toBe(originalLegacySource());
  });

  it('applies an edit that matches exactly once, in order', () => {
    const edits = [
      { queue: 'Q0', name: 'first', find: 'let _uid=0;', replace: 'let _uid=0; /*a*/' },
      { queue: 'Q0', name: 'second, over the first', find: '/*a*/', replace: '/*b*/' },
    ];
    const out = applyRuled(originalLegacySource(), edits);
    expect(out).toContain('let _uid=0; /*b*/');
    expect(out).not.toContain('/*a*/');
  });

  it('REFUSES an edit that matches nothing: it is stale', () => {
    expect(() =>
      applyRuled(originalLegacySource(), [
        { queue: 'Q0', name: 'stale', find: 'this is not in the original', replace: '' },
      ]),
    ).toThrow(/matched 0 times/);
  });

  it('REFUSES an edit that matches more than once: it would change what nobody ruled', () => {
    expect(() =>
      applyRuled(originalLegacySource(), [
        { queue: 'Q0', name: 'ambiguous', find: 'g.invaders', replace: 'g.invaders' },
      ]),
    ).toThrow(/expected exactly 1/);
  });

  it('names every edit by its place in the queue', () => {
    // Q1 to Q10, the queue as ruled on 5 and 6 September 2026; Q11, venom, ruled after it ran;
    // Q12, the gentlest difficulty called Easy, ruled on 1 and 2 October; Q13, a game's first
    // turns written, for the guided game, ruled on 2 October; Q14, coat as the one word for
    // what an antibody does to a bacterium, a worm or a parasite, ruled the same day; Q15,
    // Diphtheria and Anthrax as bacteria that release their toxins; and Q16, a hidden pathogen.
    for (const r of RULED) expect(r.queue, r.name).toMatch(/^Q([1-9]|1[0-6])$/);
  });
});
