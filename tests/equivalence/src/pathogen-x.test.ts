/**
 * FINDING #13, FIXED — and this file is the evidence that the fix works.
 *
 * It used to PIN the defect. It now asserts the correction, because the correction lives on a
 * path the corpus cannot reach, which makes this the load-bearing proof rather than a
 * supporting one. See docs/DEVIATIONS.md #5.
 *
 * THE DEFECT. Legacy's `famOf` reads:
 *
 *     return iv.novel ? 'X' : (FAMILY[iv.disease] ?? 'EXB');
 *
 * Pathogen X is the only card with no `FAMILY` entry, so the `novel` FLAG was the only thing
 * keeping it out of the EXB pool. Lose the flag anywhere — a JSON round trip dropping a falsy
 * field, a loader, a future refactor — and the novel pathogen became an ordinary extracellular
 * bacterium. An EXB antibody the player happened to be holding for something unrelated would
 * kill it outright, clonal selection would never happen, and the card would still appear while
 * the lesson it exists to teach silently did not.
 *
 * **Every test still passed**, because the miss was HANDLED and its handling was wrong for
 * exactly one card. `noUncheckedIndexedAccess` was silent for the same reason: `?? 'EXB'` is a
 * complete answer as far as the compiler is concerned.
 *
 * THE FIX. The content now DECLARES the exemption — `NOVEL_ANTIGENS: ["Pathogen X"]` — and the
 * schema requires every card to have a `FAMILY` entry or be on that list. `famOf` consults it,
 * so the antibody pool no longer depends on a flag surviving a trip through anything.
 *
 * WHY NOT JUST ADD `"Pathogen X": "EXB"` TO FAMILY? Because it would be false. Pathogen X is not
 * an extracellular bacterium, and a novel antigen has no class BY DEFINITION — that is the whole
 * point of the card. Inventing a seventh class would make the other six mean less.
 */

import { describe, expect, it } from 'vitest';

import * as content from '@immunity-wars/content';
import * as port from '@immunity-wars/engine';

import { loadLegacy } from './engine.js';
import { installRng, restoreRng } from './rng.js';
import type { GameState, Invader } from './types.js';

const legacy = loadLegacy();

describe('#13 FIXED: the antibody pool no longer depends on the novel flag surviving', () => {
  it('Pathogen X uses the X pool WITH the flag — unchanged from legacy', () => {
    expect(port.famOf({ disease: 'Pathogen X', novel: true })).toBe('X');
    expect(legacy.famOf({ disease: 'Pathogen X', novel: true } as never)).toBe('X');
  });

  it('and STILL uses the X pool WITHOUT it — this is the deviation', () => {
    // THE ENTIRE FIX, in one assertion. Legacy answers EXB here and would let an unrelated
    // antibody destroy the novel pathogen.
    expect(port.famOf({ disease: 'Pathogen X' })).toBe('X');
    expect(legacy.famOf({ disease: 'Pathogen X' } as never)).toBe('EXB');
  });

  it('the exemption is declared in the content, not inferred from an absence', () => {
    expect(content.NOVEL_ANTIGENS.has('Pathogen X')).toBe(true);
    // And FAMILY is untouched, so the 22-table equivalence with legacy still holds.
    expect('Pathogen X' in content.FAMILY).toBe(false);
    expect(Object.keys(content.FAMILY)).toHaveLength(106);
  });

  it('every OTHER card is unaffected — the deviation is one card wide', () => {
    for (const card of content.DECK_MASTER) {
      if (card.dz === 'Pathogen X') continue;
      const iv = { disease: card.dz, novel: false };
      expect(port.famOf(iv), card.dz).toBe(
        legacy.famOf({ ...iv, id: '', type: card.type, zone: 'hub', step: 0 } as never),
      );
    }
  });

  it('an unknown disease still falls back to EXB, exactly as legacy does', () => {
    // The fallback is NOT removed. It is legacy's documented answer for an unknown input and
    // it is genuinely reachable — see docs/CONTENT_REACHABILITY.md §5 and §6 for the nine
    // disease names the engine mints that are not cards.
    expect(port.famOf({ disease: 'Not A Real Disease' })).toBe('EXB');
    expect(legacy.famOf({ disease: 'Not A Real Disease' } as never)).toBe('EXB');
  });

  it('the nine engine-minted diseases are classed identically to legacy', () => {
    const minted = [
      ...Object.values(content.TOXIN_MAKERS),
      'Malaria (blood)',
      'Malaria (relapse)',
      'Shingles',
      'Dengue (ADE)',
      'Tuberculosis (reactivated)',
      'Pneumococcal pneumonia',
    ];
    for (const dz of minted) {
      expect(port.famOf({ disease: dz }), dz).toBe(legacy.famOf({ disease: dz } as never));
    }
  });
});

/**
 * THE CONSEQUENCE, which is what actually matters.
 *
 * `famOf` returning 'X' is a mechanism. The reason it matters is that a player holding EXB
 * antibodies must be BLOCKED from using them on a germ the body has never met, and pushed into
 * clonal selection instead. That is the immunology the card teaches, and it is what would have
 * been lost.
 */
describe('#13 FIXED: the clonal-selection lesson survives losing the flag', () => {
  const withNovelPathogen = (mutate: (iv: Invader) => void): GameState => {
    installRng(4242);
    try {
      const g = port.newGame({ difficulty: 'normal', science: false }) as unknown as GameState;
      // Into the command phase, or applyAction refuses with 'Wait for command phase.' before it
      // ever reaches the guard under test.
      port.applyAction(g as never, { action: 'draw' } as never);
      port.applyAction(g as never, { action: 'beginCommand' } as never);
      port.forceInjectCard(g as never, 'Pathogen X');
      const iv = (g.invaders as Invader[]).find((i) => i.disease === 'Pathogen X');
      expect(iv, 'Pathogen X was not injected').toBeDefined();
      mutate(iv!);
      return g;
    } finally {
      restoreRng();
    }
  };

  it('a player holding EXB antibodies cannot destroy it, even with the flag stripped', () => {
    const g = withNovelPathogen((iv) => {
      // THE EXACT ACCIDENT #13 WARNS ABOUT: the flag is gone.
      delete (iv as unknown as Record<string, unknown>)['novel'];
    });
    const ab = g.ab as unknown as Record<string, number>;
    ab['EXB'] = 3;
    (g as unknown as Record<string, unknown>)['cloneFound'] = false;

    const iv = (g.invaders as Invader[]).find((i) => i.disease === 'Pathogen X')!;
    expect(port.famOf(iv as never)).toBe('X');

    // With the pool correct, the engine's own guard does the teaching.
    const res = port.applyAction(
      g as never,
      {
        action: 'neutralise',
        invaderId: iv.id,
      } as never,
    );
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/BRAND NEW|CLONAL SELECTION/i);
  });

  it('and legacy, on the same state, destroys it — which is the defect', () => {
    // The other arm of the same experiment, so the difference is demonstrated rather than
    // described. This is what shipped before the fix.
    installRng(4242);
    try {
      const g = legacy.newGame({ difficulty: 'normal', science: false });
      legacy.forceInjectCard(g, 'Pathogen X');
      const iv = (g.invaders as Invader[]).find((i) => i.disease === 'Pathogen X')!;
      delete (iv as unknown as Record<string, unknown>)['novel'];
      expect(legacy.famOf(iv as never)).toBe('EXB');
    } finally {
      restoreRng();
    }
  });
});
