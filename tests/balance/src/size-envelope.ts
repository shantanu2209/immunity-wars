/**
 * E1 — the constructed envelope.
 *
 * The reference bot dies at turn 8.8 of a 45-turn Hard game, so the sampled distribution contains
 * almost none of the late game and every figure derived from it is a floor. This module bounds
 * the tail instead of pretending to have sampled it.
 *
 * Nothing here is a claim about reachability. A state with 200 invaders is not asserted to occur
 * in play; it is a point on a curve, so a reader can size a protocol against an invader count
 * they believe in rather than against the one this bot happened to reach.
 *
 * **`forceInject*` is used, and `docs/FINDINGS.md` #16 is carried at the point of use:** those
 * functions bypass `noteWorm`, so a forced worm never increments `wormsSpawned` and the worm
 * accounting of any state built here is wrong. **Only the SIZE of these states may be read out.**
 * No worm statistic, no balance figure, nothing else. That is why this lives in its own module
 * with its own header rather than inside the sampler.
 */

import { DECK_MASTER } from '@immunity-wars/content';
import type { Engine } from '@immunity-wars/equivalence/types';
import { withSeed } from '@immunity-wars/equivalence/rng';

import { sizeOf, type Size } from './size.js';

export interface EnvelopePoint {
  readonly label: string;
  readonly invaders: number;
  readonly size: Size;
}

/**
 * State size at a chosen number of invaders.
 *
 * Invaders are forced in as ordinary bacteria, which is the CHEAPEST invader record — no `hp`,
 * no `stage`, no `embed`, no worm clock. So this curve is a lower bound at every point, which is
 * the direction an envelope should err in when it is being used to argue a protocol is
 * affordable.
 */
export function invaderCurve(
  engine: Engine,
  difficulty: string,
  counts: readonly number[],
  seed = 0xe1,
): EnvelopePoint[] {
  return counts.map((n) =>
    withSeed(seed, () => {
      const g = engine.newGame({ difficulty, science: false });
      for (let i = 0; i < n; i += 1) engine.forceInjectType(g, 'bacteria');
      return {
        label: `${n} invaders`,
        invaders: g.invaders.length,
        size: sizeOf(engine.viewState(g)),
      };
    }),
  );
}

/**
 * The content-bounded envelope: every card in the deck seen, in play, and immune.
 *
 * This one IS principled rather than arbitrary. `seen`, `memory` and `vaccine` are keyed by
 * disease, so the deck's size is their structural ceiling — there is no legal state with more
 * keys in them than there are diseases. Combined with one invader per card it gives the largest
 * state the CONTENT permits along those axes, whatever a bot ever manages to reach.
 */
export function fullDeckEnvelope(engine: Engine, difficulty: string, seed = 0xe1): EnvelopePoint {
  return withSeed(seed, () => {
    const g = engine.newGame({ difficulty, science: false });
    const cards = DECK_MASTER as readonly { dz: string }[];
    for (const c of cards) {
      engine.forceInjectCard(g, c.dz);
      g.seen[c.dz] = true;
      g.memory[c.dz] = true;
    }
    return {
      label: `all ${cards.length} deck cards seen, in play and immune`,
      invaders: g.invaders.length,
      size: sizeOf(engine.viewState(g)),
    };
  });
}
