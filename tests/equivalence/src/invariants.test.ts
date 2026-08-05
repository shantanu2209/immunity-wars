/**
 * Standing safety properties — rules that hold for reasons nobody wrote down.
 *
 * These are not equivalence checks. They pin invariants the game DEPENDS on but does not
 * enforce directly, where the thing actually preventing the failure is incidental to some
 * other decision. That is the same failure shape as a guard that silently stops running: the
 * rule keeps holding right up until an unrelated change removes the reason, and nothing says
 * why it broke.
 *
 * Every test here is named so that a failure explains the CONSEQUENCE, not just the assertion.
 */

import { describe, expect, it } from 'vitest';

import { legacySource, loadLegacy } from './engine.js';
import { installRng, restoreRng } from './rng.js';
import type { Engine, GameState } from './types.js';

const legacy = loadLegacy();
const DIFFICULTIES = ['training', 'normal', 'hard'];

/** Play a game to the end of the spawn window, calling `look` after every resolved turn. */
function playThrough(
  E: Engine,
  seed: number,
  difficulty: string,
  turns: number,
  look: (g: GameState) => void,
): void {
  installRng(seed);
  try {
    const g = E.newGame({ difficulty, science: false });
    for (let t = 0; t < turns; t += 1) {
      E.applyAction(g, { action: 'draw' });
      E.applyAction(g, { action: 'beginCommand' });
      E.applyAction(g, { action: 'endCommand' });
      look(g);
      if (g.won || g.lost) break;
    }
  } finally {
    restoreRng();
  }
}

describe('INVARIANT: a worm is never on a route', () => {
  /**
   * WHY THIS MATTERS, and what breaks if it fails.
   *
   * "Worms do not multiply" is one of three worm safeguards (docs/FINDINGS.md #14). The engine
   * duplicates an existing invader in exactly three places:
   *
   *   bacterial division        gated on iv.type === "bacteria"
   *   lytic burst               operates on iv.type === "hidden"
   *   hard-mode lymph spread    gated on iv.zone === "route"   <-- NOT type-gated
   *
   * The third has no type check at all. Worms are safe from it ONLY because makeInvader always
   * places a worm at zone:"branch", at every difficulty. That is a consequence of how worms
   * enter the board, not a decision anyone made about cloning.
   *
   * So if a future change ever lets a worm start on, or travel through, a route — a new worm
   * card, a different placement rule, a route-based rare event — hard-mode lymphatic spread
   * will clone it, the "worms never multiply" safeguard will fail silently, and the unwinnable
   * pile-up the worm caps exist to prevent comes straight back.
   *
   * If this test fails, do not relax it. Either restore branch-only placement, or add an
   * explicit type gate to the lymphatic-spread filter so the rule stops being accidental.
   */
  it('because hard-mode lymphatic spread clones anything on a route, and does NOT check type', () => {
    const offenders: string[] = [];
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 300; i += 1) {
        playThrough(legacy, 660000 + i, difficulty, 30, (g) => {
          for (const iv of g.invaders) {
            if (iv.type === 'worm' && iv.zone === 'route') {
              offenders.push(`${difficulty} seed ${660000 + i} turn ${g.turn}: ${iv.disease}`);
            }
          }
        });
      }
    }
    expect(
      offenders.slice(0, 5),
      'A worm reached a route. Hard-mode lymphatic spread does not type-check its ' +
        'candidates, so it will now clone worms and the "worms never multiply" safeguard is ' +
        'broken. See docs/FINDINGS.md #14.',
    ).toEqual([]);
  });

  it('makeInvader places a worm on a branch at every difficulty, which is the actual reason', () => {
    // Stated separately from the observational test above so the MECHANISM is pinned too, not
    // only its consequence. A change here is the early warning.
    for (const difficulty of DIFFICULTIES) {
      installRng(1234);
      try {
        const g = legacy.newGame({ difficulty, science: false });
        for (const card of legacy.DECK_MASTER.filter((c) => c.type === 'worm')) {
          const iv = legacy.makeInvader(g, card);
          expect(iv.zone, `${card.dz} on ${difficulty}`).toBe('branch');
          expect(iv.organ, `${card.dz} on ${difficulty}`).toBeTruthy();
        }
      } finally {
        restoreRng();
      }
    }
  });

  it('the lymphatic-spread filter really is the unguarded path (documents the gap it leaves)', () => {
    // Reading the source rather than asserting behaviour, on purpose: the point is that the
    // filter has no type clause. If someone adds one, this test fails and should be DELETED —
    // the invariant would then be enforced properly and no longer need pinning.
    const src = legacySource();
    const filter = /const hoppers=g\.invaders\.filter\([\s\S]{0,240}?\);/.exec(src)?.[0] ?? '';
    expect(filter, 'could not locate the lymphatic-spread filter').toContain('zone==="route"');
    expect(
      /iv\.type!=="worm"/.test(filter),
      'The lymphatic-spread filter now type-checks worms directly. The invariant is enforced ' +
        'rather than accidental, so this pinning test can be removed.',
    ).toBe(false);
  });
});
