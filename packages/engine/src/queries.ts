/**
 * B2 — the pure query layer.
 *
 * Every function here is `(state) => value` with no mutation. That is what makes this stage
 * cheap to prove: the checkpoint harvests thousands of real states from legacy games and calls
 * every query on both engines, with no action sequencing needed and no turn engine in
 * existence yet.
 *
 * Transcribed from tools/legacy/v2_engine.js. Where legacy is surprising, the comment says so
 * rather than the code quietly improving it.
 */

import { LYMPH_STEP, ROUTES, ROUTE_KEYS } from './data/board.js';
import {
  AB_CAP_FAM,
  AB_CAP_FAM_BY_DIFF,
  AFFINITY_AT,
  ANTIBODY_CAP,
  ANTIBODY_RATE,
  NEUTROPHIL_REGEN,
  NEUTROPHIL_REGEN_HELPED,
  NK_RANGE,
  PRESENT_TIER_BY_DIFF,
  RATE_CAP_BY_DIFF,
  SNIPE_RANGE,
  SNIPE_RANGE_BY_DIFF,
  SPAWN_TABLE,
  SPEED,
  WORM_MAX_PER_GAME,
  WORM_MAX_PER_TURN,
} from './data/tuning.js';
import { FAST_DISEASE, INV_SPEED, NOT_ALIVE } from './data/invaders.js';
import { FAM_KEYS } from './data/families.js';
import { knobs } from './knobs.js';
import { branchLen, d6, famOf, lymphPartners } from './primitives.js';
import type {
  AbPoolKey,
  GameState,
  Invader,
  MoveDestination,
  Placed,
  ProductionBreakdown,
  ProductionEffect,
} from './state.js';
import type { CellKey, OrganKey } from './types.js';

/* ------------------------------------------------------------------ *
 * position
 * ------------------------------------------------------------------ */

export function samePlace(a: Placed, b: Placed): boolean {
  if (a.zone !== b.zone) return false;
  if (a.zone === 'hub') return true;
  if (a.zone === 'route') return a.lane === b.lane && a.step === b.step;
  return a.organ === b.organ && a.step === b.step;
}

export function invadersWith(g: GameState, pos: Placed): Invader[] {
  return g.invaders.filter((iv) => samePlace(iv, pos));
}

/** With HUB_SAFE on, the bloodstream is a sanctuary and only tissue can be fought in. */
export function attackable(iv: Invader): boolean {
  return !(knobs.hubSafe && iv.zone === 'hub');
}

/** How many marches until this invader reaches an organ. Used for AI and threat sorting. */
export function distToOrgan(g: GameState, iv: Invader): number {
  if (iv.zone === 'branch') return iv.step;
  const worst = Math.min(...g.organList.map(branchLen));
  if (iv.zone === 'hub') return 1 + worst;
  return iv.step + 1 + worst;
}

/** Crude distance between two places, for bot pathing. Everything routes via the hub. */
export function placeDist(a: Placed, b: Placed): number {
  const toHub = (p: Placed): number => (p.zone === 'hub' ? 0 : (p.step ?? 0));
  if (a.zone === b.zone) {
    if (a.zone === 'hub') return 0;
    if (a.zone === 'route' && a.lane === b.lane) return Math.abs((a.step ?? 0) - (b.step ?? 0));
    if (a.zone === 'branch' && a.organ === b.organ) return Math.abs((a.step ?? 0) - (b.step ?? 0));
  }
  return toHub(a) + toHub(b);
}

/* ------------------------------------------------------------------ *
 * organ damage and its knock-on effects
 * ------------------------------------------------------------------ */

/**
 * Is this organ's functional penalty currently in force?
 *
 * On Hard, lost integrity is permanent but the PENALTY lifts once the tissue compensates — so
 * a compensated organ reads as undamaged here while still showing reduced hp.
 */
export function damaged(g: GameState, o: OrganKey): boolean {
  const x = g.organs[o];
  if (!(x && x.hp < x.max)) return false;
  if (g.difficulty === 'hard' && x.compensated) return false;
  return true;
}

export function marrowBroken(g: GameState): boolean {
  return !!(g.organs.marrow && damaged(g, 'marrow'));
}

export function kidneyLeak(g: GameState): boolean {
  return !!(g.organs.kidneys && damaged(g, 'kidneys'));
}

/** Immune privilege: the blood-brain barrier clamps every cell to speed 1 inside the brain. */
export function brainSlow(_g: GameState, cell: Placed): boolean {
  return cell.zone === 'branch' && cell.organ === 'brain';
}

/* ------------------------------------------------------------------ *
 * special pathogens
 * ------------------------------------------------------------------ */

/** HIV has destroyed your helper T-cells — but only once it is out of the entry route. */
export function hivActive(g: GameState): boolean {
  return g.flags.specials && g.invaders.some((iv) => iv.killsHelper && iv.zone !== 'route');
}

/** Filarial worms block the lymphatic vessels outright. This is what causes elephantiasis. */
export function lymphBlocked(g: GameState): boolean {
  return g.flags.specials && g.invaders.some((iv) => iv.blocksLymph);
}

/** A resident with a parasite living inside it cannot eat anything. */
export function macDisabled(g: GameState, o: OrganKey): boolean {
  const r = g.residents[o];
  return !!(r && r.infectedBy);
}

/**
 * How many steps this invader marches per turn.
 *
 * Name beats type: the fulminant diseases move faster at every difficulty. Fungi are
 * OPPORTUNISTIC — they speed up exactly when your neutrophil defence is down.
 */
export function invSpeed(g: GameState, iv: Invader): number {
  const fast = FAST_DISEASE[iv.disease];
  if (fast) return fast;
  if (iv.ade) return 2; // your own antibodies are helping it in
  if (iv.type === 'fungus') {
    const weak =
      !g.cells.neutrophil?.alive ||
      !!(g.organs.marrow && damaged(g, 'marrow')) ||
      (g.suppress && g.suppress.neutrophil > 0);
    return weak ? 2 : 1;
  }
  return INV_SPEED[iv.type] || 1;
}

/* ------------------------------------------------------------------ *
 * the helper T-cell
 * ------------------------------------------------------------------ */

/**
 * A naive helper T-cell can only license anything AFTER a dendritic cell has presented it an
 * antigen. That is real T-cell priming, and it is why turn 1 feels slow.
 */
export function helperLicensed(g: GameState): boolean {
  return g.flags.helperT && (!g.flags.dendritic || g.presentations > 0);
}

/** Licensing is contact-dependent: the helper must be standing on the same space. */
export function helperWith(g: GameState, ck: CellKey): boolean {
  if (hivActive(g)) return false;
  if (!helperLicensed(g)) return false;
  const helper = g.cells.helper;
  const target = g.cells[ck];
  if (!helper || !target) return false;
  return samePlace(helper, target);
}

/**
 * Th17 help: a primed helper circulating in the BLOOD signals the marrow (IL-17 → G-CSF) to
 * step up granulopoiesis, so a spent neutrophil returns sooner. Re-checked every turn, so
 * parking the helper in the bloodstream speeds up a neutrophil that is ALREADY regenerating.
 */
export function helperInBlood(g: GameState): boolean {
  if (hivActive(g)) return false;
  if (!helperLicensed(g)) return false;
  return g.cells.helper?.zone === 'hub';
}

/* ------------------------------------------------------------------ *
 * action points and antibody production
 * ------------------------------------------------------------------ */

export function apFor(g: GameState): number {
  let ap = knobs.apOverride ?? g.apMax;
  // Giardia blocks absorption. You eat, but you starve — so you have less energy to spend.
  if (g.flags.specials) ap -= g.invaders.reduce((n, iv) => n + (iv.drain ?? 0), 0);
  if (g.organs.lungs && damaged(g, 'lungs')) ap -= 1;
  if (g.organs.heart && damaged(g, 'heart')) ap -= 1;
  if (g.fx) ap += g.fx.apMod ?? 0;
  return Math.max(1, ap);
}

/** Per-class antibody storage cap. A damaged liver cannot support the same protein output. */
export function capFam(g: GameState, _f: AbPoolKey): number {
  let c = AB_CAP_FAM_BY_DIFF[g.difficulty] ?? AB_CAP_FAM;
  if (g.organs.liver && damaged(g, 'liver')) c = Math.min(c, 2);
  if (g.fx && g.fx.capTurns > 0) c = Math.min(c, 2);
  return c;
}

/** Tier-A leftover: g.antibodies never leaves 0, but viewState still reports this cap. */
export function capFor(g: GameState): number {
  let c = g.organs.liver && damaged(g, 'liver') ? 2 : ANTIBODY_CAP;
  if (g.fx && g.fx.capTurns > 0) c = Math.min(c, 2);
  return c;
}

export function abTotal(g: GameState): number {
  return [...FAM_KEYS, 'X'].reduce((n, f) => n + (g.ab[f] ?? 0), 0);
}

export function hasAb(g: GameState, iv: Invader): boolean {
  return (g.ab[famOf(iv)] ?? 0) > 0;
}

export function memoryHit(g: GameState, dz: string): boolean {
  return !!g.memory[dz];
}

/**
 * Antibodies made per Produce action.
 *
 * On HARD, antigen presentation does NOT raise output — only the helper-T contact boost does.
 * On Training/Normal, presentation ramps it over time.
 */
export function rateFor(g: GameState): number {
  let base: number;
  if (!g.flags.dendritic) {
    base = ANTIBODY_RATE;
  } else if (g.difficulty === 'hard') {
    base = 1;
  } else {
    const p = g.presentations;
    const tier = PRESENT_TIER_BY_DIFF[g.difficulty] ?? PRESENT_TIER_BY_DIFF.normal;
    base = p >= (tier[2] ?? 0) ? 3 : p >= (tier[1] ?? 0) ? 2 : 1;
  }
  if (helperWith(g, 'bcell')) base += 1;
  const capRate = RATE_CAP_BY_DIFF[g.difficulty] ?? RATE_CAP_BY_DIFF.normal;
  return Math.min(base, capRate);
}

/** Affinity maturation is Training-only: practice against one class improves your antibodies. */
export function rateForFam(g: GameState, f: AbPoolKey): number {
  let r = rateFor(g);
  if (g.difficulty === 'training' && (g.made[f] ?? 0) >= AFFINITY_AT) r += 1;
  return r;
}

/**
 * Explain the per-class production rate: the net number AND every effect that built it, so the
 * UI can show a net value with a boost/penalty cue and reveal the breakdown on demand.
 *
 * Note this recomputes `base` rather than calling rateFor — and applies the rate ceiling BEFORE
 * affinity maturation, so on Training an affinity bonus can push the result above capRate.
 * rateForFam does the same thing in the same order. Preserved deliberately.
 */
export function productionBreakdown(g: GameState, f: AbPoolKey): ProductionBreakdown {
  const effects: ProductionEffect[] = [];
  let base: number;
  if (!g.flags.dendritic) {
    base = ANTIBODY_RATE;
  } else if (g.difficulty === 'hard') {
    base = 1;
  } else {
    const p = g.presentations;
    const tier = PRESENT_TIER_BY_DIFF[g.difficulty] ?? PRESENT_TIER_BY_DIFF.normal;
    base = p >= (tier[2] ?? 0) ? 3 : p >= (tier[1] ?? 0) ? 2 : 1;
  }
  let r = base;
  if (helperWith(g, 'bcell')) {
    r += 1;
    effects.push({ label: 'Helper T-cell licensing', delta: +1, kind: 'boost' });
  } else if (
    g.flags.helperT &&
    !hivActive(g) &&
    g.cells.helper &&
    g.cells.bcell &&
    samePlace(g.cells.helper, g.cells.bcell) &&
    !helperLicensed(g)
  ) {
    effects.push({
      label: 'Helper T-cell present but NOT yet primed — no antigen has been presented to it yet',
      delta: 0,
      kind: 'penalty',
    });
  }
  const capRate = RATE_CAP_BY_DIFF[g.difficulty] ?? RATE_CAP_BY_DIFF.normal;
  let capped = false;
  if (r > capRate) {
    effects.push({
      label: `Rate ceiling (${capRate}/action on this mode)`,
      delta: capRate - r,
      kind: 'penalty',
    });
    r = capRate;
    capped = true;
  }
  if (g.difficulty === 'training' && (g.made[f] ?? 0) >= AFFINITY_AT) {
    r += 1;
    effects.push({ label: 'Affinity maturation', delta: +1, kind: 'boost' });
  }
  let blocked: string | null = null;
  if (g.fx && g.fx.noProduce) blocked = 'Production is shut down this turn';

  const have = g.ab[f] ?? 0;
  const scap = capFam(g, f);
  const baseCap = AB_CAP_FAM_BY_DIFF[g.difficulty] ?? AB_CAP_FAM;
  const capReasons: string[] = [];
  if (scap < baseCap) {
    if (g.organs.liver && damaged(g, 'liver')) capReasons.push('liver damaged');
    if (g.fx && g.fx.capTurns > 0) capReasons.push('a temporary effect');
  }
  const net = blocked ? 0 : r;
  return {
    net,
    base,
    effects,
    capRate,
    capped,
    blocked,
    storage: { have, cap: scap, baseCap, capReasons },
    boosted: net > base,
    reduced: net < base || !!blocked,
  };
}

/** The novel-antigen pool needs a matching clone found first, and something novel to use it on. */
export function canProduceFam(g: GameState, f: AbPoolKey): boolean {
  if (f === 'X') return g.cloneFound && g.invaders.some((iv) => iv.novel);
  return true;
}

/* ------------------------------------------------------------------ *
 * antibody targeting
 * ------------------------------------------------------------------ */

/** How many matching-class antibodies you hold for this invader. */
export function abMatch(g: GameState, iv: Invader): number {
  const f = famOf(iv);
  if (f === 'X' && !g.cloneFound) return 0;
  return (g.ab && g.ab[f]) || 0;
}

/** Can the B-Cell's antibodies NEUTRALISE this invader right now? */
export function canNeutralise(g: GameState, iv: Invader): boolean {
  if (iv.ade) return false;
  // Venom acts far too fast for antibodies. ANTIVENOM only.
  if (iv.type === 'venom') return false;
  if (iv.type === 'malaria' && iv.stage === 'liver') return false;
  if (iv.inMac) return false;
  if (!attackable(iv)) return false;
  const kind =
    iv.type === 'virus' ||
    iv.type === 'toxin' ||
    (iv.type === 'malaria' && (iv.stage === 'blood' || iv.stage === 'sporozoite'));
  return kind && abMatch(g, iv) >= 1;
}

/** Can antibodies TAG/COAT this invader right now? */
export function canTag(g: GameState, iv: Invader): boolean {
  const kind =
    (iv.type === 'bacteria' || iv.type === 'worm' || iv.type === 'parasite') && !iv.tagged;
  if (!kind) return false;
  if (iv.inMac) return false;
  if (!attackable(iv)) return false;
  return abMatch(g, iv) >= 1;
}

export function anyNeutralisable(g: GameState): boolean {
  return (g.invaders ?? []).some((iv) => canNeutralise(g, iv));
}

export function anyTaggable(g: GameState): boolean {
  return (g.invaders ?? []).some((iv) => canTag(g, iv));
}

/* ------------------------------------------------------------------ *
 * per-cell target lists
 * ------------------------------------------------------------------ */

export function macrophageEatable(g: GameState): Invader[] {
  const m = g.cells.macrophage;
  if (!m) return [];
  return invadersWith(g, m).filter(
    (iv) =>
      attackable(iv) &&
      (iv.type === 'virus' ||
        (iv.type === 'bacteria' && iv.tagged) ||
        (iv.type === 'malaria' && (iv.stage === 'blood' || iv.stage === 'sporozoite')) ||
        // a protozoan can only be swallowed once struck down to its last HP
        (iv.type === 'parasite' && iv.tagged && !iv.inMac && (iv.hp ?? 0) <= 1) ||
        iv.type === 'fungus'), // chips it (HP 2) — a NET kills it outright
  );
}

/**
 * Killer T-Cell reach.
 *
 * From the bloodstream hub it can reach into ANY adjacent tissue within range, because the hub
 * is distance 0 and a germ at step S is S steps away. Otherwise cell and target must share the
 * same tissue — except that a cell in a route or branch can still snipe back into the hub.
 */
export function snipeTargets(g: GameState): Invader[] {
  const t = g.cells.tcell;
  if (!t) return [];
  const R = (SNIPE_RANGE_BY_DIFF[g.difficulty] ?? SNIPE_RANGE) + (helperWith(g, 'tcell') ? 1 : 0);
  return g.invaders.filter((iv) => {
    if (
      !(iv.type === 'hidden' || iv.inMac || (iv.type === 'malaria' && iv.stage === 'liver')) ||
      !attackable(iv)
    ) {
      return false;
    }
    if (t.zone === 'hub') {
      if (iv.zone === 'hub') return true;
      if (iv.zone === 'route') return iv.step <= R;
      if (iv.zone === 'branch') return iv.step <= R;
      return false;
    }
    if (t.zone !== iv.zone) {
      if (iv.zone === 'hub') return t.step <= R;
      return false;
    }
    if (t.zone === 'route' && iv.lane !== t.lane) return false;
    if (t.zone === 'branch' && iv.organ !== t.organ) return false;
    return Math.abs(iv.step - t.step) <= R;
  });
}

/**
 * A NET is a sticky web of DNA. It traps living microbes it can physically hold — so toxins and
 * venom (not alive) and worms and protozoa (far too big) all escape it.
 */
export function netTargets(g: GameState): Invader[] {
  const n = g.cells.neutrophil;
  if (!n || !n.alive || n.zone === 'hub') return [];
  return invadersWith(g, n)
    .filter(attackable)
    .filter((iv) => !NOT_ALIVE.has(iv.type) && iv.type !== 'worm' && iv.type !== 'parasite');
}

/** NK reaches its short range from the blood, or shares a tissue. Innate: no antigen needed. */
export function nkTargets(g: GameState): Invader[] {
  const n = g.cells.nk;
  if (!n) return [];
  return g.invaders.filter((iv) => {
    if (!(iv.type === 'hidden' || iv.inMac || (iv.type === 'malaria' && iv.stage === 'liver'))) {
      return false;
    }
    if (n.zone === 'hub') {
      if (iv.zone === 'hub') return true;
      if (iv.zone === 'route' || iv.zone === 'branch') return iv.step <= NK_RANGE;
      return false;
    }
    if (n.zone !== iv.zone) {
      if (iv.zone === 'hub') return n.step <= NK_RANGE;
      return false;
    }
    if (n.zone === 'route' && iv.lane !== n.lane) return false;
    if (n.zone === 'branch' && iv.organ !== n.organ) return false;
    return Math.abs(iv.step - n.step) <= NK_RANGE;
  });
}

/** Coated worms and parasites a given cell is standing on. Too big to engulf, so struck instead. */
export function wormStrikeable(g: GameState, ck: CellKey): Invader[] {
  const c = g.cells[ck];
  if (!c) return [];
  if (ck === 'eosinophil' && !g.cells.eosinophil?.alive) return [];
  return g.invaders.filter(
    (iv) => (iv.type === 'worm' || iv.type === 'parasite') && iv.tagged && samePlace(iv, c),
  );
}

export function antivenomTargets(g: GameState): Invader[] {
  return g.invaders.filter((iv) => iv.type === 'venom');
}

/**
 * What a resident macrophage can engulf where it stands.
 *
 * NOTE: from its STARTING position (step 0, at the organ) this is always empty — an invader
 * reaching branch step 0 is processed as an arrival and removed in the same resolveSpread, and
 * the three things that do persist there are all ineligible types. Measured 0 eligible targets
 * across 37,828 organ-turns. The resident must be patrolled onto the branch first.
 * docs/FINDINGS.md #5. Behaviour preserved exactly; this is a design conversation, not a bug.
 */
export function residentEatable(g: GameState, o: OrganKey): Invader[] {
  const r = g.residents[o];
  if (!r || r.infectedBy) return [];
  return g.invaders.filter(
    (iv) =>
      iv.zone === 'branch' &&
      iv.organ === o &&
      iv.step === r.step &&
      (iv.type === 'virus' ||
        (iv.type === 'bacteria' && iv.tagged) ||
        (iv.type === 'malaria' && (iv.stage === 'blood' || iv.stage === 'sporozoite'))),
  );
}

/* ------------------------------------------------------------------ *
 * movement
 * ------------------------------------------------------------------ */

/**
 * Everywhere this cell could legally move to.
 *
 * ORDER MATTERS and is preserved exactly: the bot reads ds[0] after sorting, and `hop` reads
 * opts[0]. Route step 1 is the node nearest the bloodstream; on a branch, step L is nearest the
 * blood and step 0 is AT the organ — so leaving the hub toward an organ means the HIGH steps.
 */
export function moveDestinations(g: GameState, ck: CellKey): MoveDestination[] {
  const c = g.cells[ck];
  if (!c || ck === 'bcell') return [];
  let sp = SPEED[ck];
  // Th2 help: a primed helper standing WITH the eosinophil pours out IL-5, recruiting and
  // activating it — +1 step, but only while the two are on the same spot.
  if (ck === 'eosinophil' && helperWith(g, 'eosinophil')) sp += 1;
  if (brainSlow(g, c)) sp = 1; // the blood-brain barrier overrides everything

  const out: MoveDestination[] = [];
  if (c.zone === 'hub') {
    ROUTE_KEYS.forEach((l) => {
      for (let s = 1; s <= Math.min(sp, ROUTES[l].len); s += 1) {
        out.push({ zone: 'route', lane: l, step: s });
      }
    });
    g.organList.forEach((o) => {
      const L = branchLen(o);
      for (let k = 0; k < sp; k += 1) {
        const st = L - k;
        if (st >= 0) out.push({ zone: 'branch', organ: o, step: st });
      }
    });
  } else if (c.zone === 'route' && c.lane) {
    const L = ROUTES[c.lane].len;
    for (let d = -sp; d <= sp; d += 1) {
      if (!d) continue;
      const ns = c.step + d;
      if (ns === 0) out.push({ zone: 'hub' });
      else if (ns >= 1 && ns <= L) out.push({ zone: 'route', lane: c.lane, step: ns });
    }
  } else if (c.zone === 'branch' && c.organ) {
    const L = branchLen(c.organ);
    for (let d = -sp; d <= sp; d += 1) {
      if (!d) continue;
      const ns = c.step + d;
      if (ns > L)
        out.push({ zone: 'hub' }); // past the top of the branch = back into the blood
      else if (ns >= 0 && ns <= L) out.push({ zone: 'branch', organ: c.organ, step: ns });
    }
  }

  // Lymphatic crossing. Crossing is not a separate action — it uses 1 of the cell's movement,
  // so a speed-2 cell can cross AND continue up to (sp-1) further steps in the new lane.
  if (g.flags.lymph && !lymphBlocked(g) && c.zone === 'route' && c.step === LYMPH_STEP && c.lane) {
    lymphPartners(c.lane).forEach((to) => {
      const L = ROUTES[to].len;
      out.push({ zone: 'route', lane: to, step: LYMPH_STEP, lymph: true });
      for (let extra = 1; extra <= sp - 1; extra += 1) {
        [LYMPH_STEP - extra, LYMPH_STEP + extra].forEach((ns) => {
          if (ns >= 1 && ns <= L) out.push({ zone: 'route', lane: to, step: ns, lymph: true });
          if (ns === 0) out.push({ zone: 'hub', lymph: true });
        });
      }
    });
  }

  // Dedupe. Note the key ignores `lymph`, so a destination reachable both directly and through
  // the lymphatics keeps whichever came first — which is the direct one.
  const seen = new Set<string>();
  return out.filter((d) => {
    const k = `${d.zone}:${d.lane ?? d.organ ?? ''}:${d.step ?? 0}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* ------------------------------------------------------------------ *
 * regeneration, spawning, division
 * ------------------------------------------------------------------ */

export function neutrophilReadyTurn(g: GameState): number | null {
  const n = g.cells.neutrophil;
  if (!n || n.alive) return null;
  const wait = helperInBlood(g) ? NEUTROPHIL_REGEN_HELPED : NEUTROPHIL_REGEN;
  return n.spentAt != null ? n.spentAt + wait : (n.regenAt ?? null);
}

/**
 * Bacterial division threshold on a d6. Hard is handled separately (guaranteed), so this is
 * Training ≤2 and Normal ≤3. Losing the spleen makes filtering fail and division worse.
 */
export function divideOn(g: GameState): number {
  let base = g.difficulty === 'normal' ? 3 : 2;
  if (g.organs.spleen && damaged(g, 'spleen')) base = Math.min(6, base + 1);
  return base;
}

/** How many infections break in this turn. Consumes a die roll unless a test override is set. */
export function spawnCount(g: GameState): number {
  const mode = knobs.spawnMode;
  if (!mode) {
    const t = SPAWN_TABLE[g.difficulty] ?? SPAWN_TABLE.normal;
    return t[d6() - 1] ?? 1;
  }
  switch (mode) {
    case 'flat2':
      return 2;
    case 'every3':
      return g.turn % 3 === 0 ? 2 : 1;
    case 'every2':
      return g.turn % 2 === 0 ? 2 : 1;
    case 'ramp':
      return g.turn > Math.floor(g.maxTurn / 2) ? 2 : 1;
    default:
      return 1;
  }
}

/** Worm caps: at most one per turn, two per game. See docs/FINDINGS.md #14. */
export function wormAllowed(g: GameState): boolean {
  return (g.wormsSpawned ?? 0) < WORM_MAX_PER_GAME && (g.wormsThisTurn ?? 0) < WORM_MAX_PER_TURN;
}
