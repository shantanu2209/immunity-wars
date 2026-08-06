/**
 * Killing things, and the bookkeeping that hangs off it.
 *
 * killInvader is where a surprising amount of the game's memory, rare-event and statistics
 * machinery actually lives — it is called from a dozen action arms and from resolveSpread, and
 * every one of those paths depends on the side effects here happening in this exact order.
 */

import { CNAME, ORGANS, RESIDENT_NAME, ROUTES } from '@immunity-wars/content';
import { cap1 } from './primitives.js';
import { pushLog } from './construct.js';
import type { GameState, Invader, MoveDestination } from './state.js';

export function cname(ck: string): string {
  return CNAME[ck] || cap1(ck);
}

export function placeName(d: MoveDestination): string {
  if (d.zone === 'hub') return 'the bloodstream';
  if (d.zone === 'route') return `${ROUTES[d.lane as keyof typeof ROUTES].name} ${d.step}`;
  const organ = ORGANS[d.organ as keyof typeof ORGANS];
  return d.step === 0 ? `the ${organ.name} itself` : `${organ.name} branch ${d.step}`;
}

/** Antigen presentation. Silently does nothing when the dendritic-cell rule is off. */
export function present(g: GameState, n?: number): void {
  if (!g.flags.dendritic) return;
  g.presentations += n || 1;
}

export function hurtInvader(g: GameState, iv: Invader, dmg: number, by: string): boolean {
  iv.hp = (iv.hp ?? 0) - dmg;
  if ((iv.hp ?? 0) <= 0) {
    killInvader(g, iv, by);
    return true;
  }
  return false;
}

export function killInvader(g: GameState, iv: Invader, by: string): void {
  g.invaders = g.invaders.filter((x) => x.id !== iv.id);

  // Kala-azar: killing the parasite frees the macrophage it was living inside.
  if (iv.hidesInMac && g.residents) {
    for (const o in g.residents) {
      const r = g.residents[o];
      if (r && r.infectedBy === iv.id) {
        r.infectedBy = null;
        const how =
          by === 'tcell'
            ? ' The Killer T-Cell did not kill your macrophage — it <b>switched it on</b>. A T-cell signal (interferon-gamma) orders the infected macrophage to destroy what is living inside it.'
            : '';
        pushLog(
          g,
          `The ${RESIDENT_NAME[o as keyof typeof RESIDENT_NAME]} is FREE again — the parasite inside it is dead.${how}`,
          'good',
        );
      }
    }
  }

  if (g.rare) {
    g.rare.killedThisTurn = (g.rare.killedThisTurn || 0) + 1;
    const s2 = g.rare.seen;
    if (/Cellulitis/.test(iv.disease) && by === 'antibody') s2.strepKilledByAntibody = true;

    // BEATING a pathogen leaves memory cells behind — but only on TRAINING. On Normal/Hard,
    // surviving one infection does NOT pre-arm you; immunity must be EARNED with a vaccine.
    if (
      g.difficulty === 'training' &&
      g.memory &&
      !g.memory[iv.disease] &&
      !g.invaders.some((x) => x.disease === iv.disease)
    ) {
      g.memory[iv.disease] = true;
      pushLog(
        g,
        `<b>${iv.disease} defeated.</b> Memory cells for it now survive in your body — if it ever returns, your response will be immediate.`,
        'good',
      );
    }

    if (/Dengue/.test(iv.disease)) s2.dengueKilled = true;
    if (/Chickenpox/.test(iv.disease)) s2.chickenpoxKilled = true;
    if (/Tuberculosis/.test(iv.disease)) s2.tbKilled = true;
  }

  if (iv.zone === 'branch') {
    g.stats.killedBranch += 1;
    // DENDRITIC CELL: a resident sentinel picks up the debris and presents the antigen.
    if (g.flags.dendritic && by !== 'resident') present(g, 1);
  } else {
    g.stats.killedTrunk += 1; // trunk = route + hub
  }
}
