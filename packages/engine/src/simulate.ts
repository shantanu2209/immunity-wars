/**
 * B6 — the balance simulator and its inlined bot.
 *
 * IMPORTANT CONTEXT BEFORE ANYONE READS A NUMBER OUT OF THIS FILE.
 *
 * This bot plays roughly six of the game's fourteen seats. It never emits 8 of the engine's 27
 * actions, it never moves the Neutrophil (so `netTargets` is always empty and the NET can never
 * fire), and it never repositions a resident macrophage (so all seven are inert). Measured
 * audit in docs/FINDINGS.md §1.
 *
 * Consequently its win rate is 0.2% on Normal and 0.0% on Hard, against humans who win
 * essentially every Normal game. **That gap is a bot-capability signal, not a difficulty
 * signal.** Any figure produced here is "win rate under the reference bot, vN, at N games per
 * difficulty" — never "the win rate". docs/FINDINGS.md #6.
 *
 * Ported bug-for-bug like everything else. Building a competent bot is a Phase 2 decision.
 */

import { apNow, canAct } from './ap.js';
import { newGame } from './construct.js';
import { famOf } from './primitives.js';
import {
  attackable,
  capFam,
  distToOrgan,
  helperLicensed,
  macrophageEatable,
  moveDestinations,
  nkTargets,
  placeDist,
  residentEatable,
  samePlace,
  snipeTargets,
  wormStrikeable,
} from './queries.js';
import { applyAction } from './actions.js';
import type { Flags, OrganKey } from './types.js';
import type { GameState, Invader, MoveDestination, Placed } from './state.js';

export interface SimulateResult {
  N: number;
  winRate: number;
  avgLossTurn: number | null;
  trunkKillPct: number;
  avgOrganHits: number;
  cascadePct: number;
  failOrgans: Record<string, number>;
}

export function simulate(difficulty: string, N: number, flags?: Partial<Flags>): SimulateResult {
  let wins = 0;
  const lossTurns: number[] = [];
  const failOrgans: Record<string, number> = {};
  const hits: number[] = [];
  let killTrunk = 0;
  let killBranch = 0;
  let cascade = 0;

  for (let i = 0; i < N; i += 1) {
    const g = newGame({ difficulty, science: false, flags });
    let guard = 0;
    while (!g.won && !g.lost && guard < 200) {
      guard += 1;
      applyAction(g, { action: 'draw' });
      applyAction(g, { action: 'beginCommand' });
      let s = 0;
      while (g.phase === 'command' && s < 60) {
        s += 1;
        const threats = [...g.invaders].sort((a, b) => distToOrgan(g, a) - distToOrgan(g, b));
        const th: Invader | undefined = threats[0];

        // free engulf first (costs nothing)
        if (g.cells.macrophage?.freeEngulf) {
          const e = macrophageEatable(g)[0];
          if (e && applyAction(g, { action: 'engulf', cell: 'macrophage', invaderId: e.id }).ok)
            continue;
        }

        // prime a resident if a germ is standing in its tissue (protects the organ)
        let primed = false;
        for (const o of g.organList) {
          const e = residentEatable(g, o)[0];
          if (e && applyAction(g, { action: 'resengulf', organ: o, invaderId: e.id }).ok) {
            primed = true;
            break;
          }
        }
        if (primed) continue;

        if (!canAct(g, 'nk') && g.ap <= 0) break;

        // NK kills an infected cell up close (no antigen needed)
        const nk = nkTargets(g)[0];
        if (nk && applyAction(g, { action: 'nkkill', cell: 'nk', invaderId: nk.id }).ok) continue;

        // Killer T snipes hidden viruses / liver malaria at range
        const sn = snipeTargets(g)[0];
        if (sn && applyAction(g, { action: 'snipe', cell: 'tcell', invaderId: sn.id }).ok) continue;

        // memory: destroy a remembered pathogen for free/cheap
        const mem = g.invaders.find((iv) => iv.remembered && attackable(iv));
        if (mem && applyAction(g, { action: 'memoryKill', invaderId: mem.id }).ok) continue;

        // Helper T-Cell: park it WITH the B-Cell (contact-dependent licensing)
        const helper = g.cells.helper;
        const bcell = g.cells.bcell;
        if (helper && bcell && helperLicensed(g) && !samePlace(helper, bcell)) {
          const hd = moveDestinations(g, 'helper')
            .map((d) => ({ d, s: placeDist(destAsPlace(d), bcell) }))
            .sort((a, b) => a.s - b.s);
          const best = hd[0];
          if (
            best &&
            best.s < placeDist(helper, bcell) &&
            applyAction(g, { action: 'move', cell: 'helper', ...best.d }).ok
          ) {
            continue;
          }
        }

        // novel antigen: go find the clone
        if (
          g.novelSeen &&
          !g.cloneFound &&
          g.invaders.some((x) => x.novel) &&
          applyAction(g, { action: 'clonalSelection' }).ok
        ) {
          continue;
        }
        if (
          g.novelSeen &&
          g.cloneFound &&
          (g.ab.X ?? 0) < 1 &&
          g.invaders.some((x) => x.novel) &&
          applyAction(g, { action: 'produce', cell: 'bcell', family: 'X' }).ok
        ) {
          continue;
        }

        // FOLLOW THROUGH: a coated bacterium/parasite a phagocyte is standing on -> engulf it
        {
          let done = false;
          const mac = g.cells.macrophage;
          if (mac) {
            for (const iv of g.invaders) {
              if (
                (iv.type === 'bacteria' || iv.type === 'parasite') &&
                iv.tagged &&
                samePlace(mac, iv) &&
                applyAction(g, { action: 'engulf', cell: 'macrophage', invaderId: iv.id }).ok
              ) {
                done = true;
                break;
              }
            }
          }
          if (done) continue;
        }

        // a coated worm/parasite the eosinophil can reach -> strike, or degranulate a 3-HP worm
        {
          const eo = g.cells.eosinophil;
          if (eo?.alive) {
            const hit = wormStrikeable(g, 'eosinophil')[0];
            if (hit) {
              const urgent =
                hit.type === 'worm' && (hit.hp ?? 0) >= 3 && (hit.zone === 'branch' || hit.lodged);
              const act = urgent ? 'degranulate' : 'strike';
              if (applyAction(g, { action: act, cell: 'eosinophil', invaderId: hit.id }).ok)
                continue;
            }
          }
        }

        // spend a MATCHING antibody on the most urgent threat (neutralise or tag)
        if (th) {
          const tf = famOf(th);
          if ((g.ab[tf] ?? 0) > 0) {
            if (
              (th.type === 'virus' ||
                th.type === 'toxin' ||
                th.type === 'venom' ||
                (th.type === 'malaria' && th.stage === 'blood')) &&
              applyAction(g, { action: 'neutralise', invaderId: th.id }).ok
            ) {
              continue;
            }
            if (
              (th.type === 'bacteria' || th.type === 'worm' || th.type === 'parasite') &&
              !th.tagged &&
              applyAction(g, { action: 'tag', invaderId: th.id }).ok
            ) {
              continue;
            }
          }
        }

        // produce antibodies against whichever class is most present
        {
          const need: Record<string, number> = {};
          g.invaders.forEach((x) => {
            if (x.type !== 'hidden' && !x.inMac) {
              const f = famOf(x);
              need[f] = (need[f] ?? 0) + 1;
            }
          });
          const want = Object.keys(need)
            .sort((a, b) => (need[b] ?? 0) - (need[a] ?? 0))
            .find((f) => (g.ab[f] ?? 0) < capFam(g, f as never) && (f !== 'X' || g.cloneFound));
          if (want && applyAction(g, { action: 'produce', cell: 'bcell', family: want }).ok)
            continue;
        }

        // VACCINATE — on Normal/Hard this is the ONLY way to earn memory, so invest spare AP.
        // Prefer a disease already in the body, else any seen, not-yet-immune one.
        if (g.difficulty !== 'training' && apNow(g) > 0) {
          const here = new Set(g.invaders.map((iv) => iv.disease));
          const cand = Object.keys(g.seen)
            .filter((dz) => !g.memory[dz] && dz !== 'Pathogen X')
            .sort((a, b) => (here.has(b) ? 1 : 0) - (here.has(a) ? 1 : 0));
          if (cand[0] && applyAction(g, { action: 'vaccinate', disease: cand[0], ap: 1 }).ok)
            continue;
        }

        // NET a swarm
        const n = g.cells.neutrophil;
        if (
          n?.alive &&
          n.zone !== 'hub' &&
          invadersWithNeutrophil(g).length >= 2 &&
          applyAction(g, { action: 'net', cell: 'neutrophil' }).ok
        ) {
          continue;
        }

        // POSITIONING: move the right specialist toward the highest-value target.
        // hidden virus (needs T/NK) > lodged worm (eosinophil) > coated bacterium (macrophage)
        {
          const byDist = (a: Invader, b: Invader): number => distToOrgan(g, a) - distToOrgan(g, b);
          const hidden = g.invaders
            .filter(
              (iv) =>
                (iv.type === 'hidden' ||
                  iv.inMac ||
                  (iv.type === 'malaria' && iv.stage === 'liver')) &&
                attackable(iv),
            )
            .sort(byDist)[0];
          const worm = g.invaders
            .filter((iv) => (iv.type === 'worm' || iv.type === 'parasite') && iv.tagged)
            .sort(byDist)[0];
          const coated = g.invaders
            .filter((iv) => (iv.type === 'bacteria' || iv.type === 'parasite') && iv.tagged)
            .sort(byDist)[0];

          let moved = false;
          const goTo = (cell: string, target: Invader | undefined): boolean => {
            if (!target) return false;
            const c = g.cells[cell];
            if (!c || samePlace(c, target)) return false;
            const ds = moveDestinations(g, cell as never)
              .map((d) => ({ d, s: placeDist(destAsPlace(d), target) }))
              .sort((a, b) => a.s - b.s);
            const best = ds[0];
            if (
              best &&
              best.s < placeDist(c, target) &&
              applyAction(g, { action: 'move', cell, ...best.d }).ok
            ) {
              return true;
            }
            return false;
          };

          // move Killer T (or NK) toward a hidden target it cannot yet reach
          if (hidden && !snipeTargets(g).length) {
            if (goTo('tcell', hidden)) moved = true;
            else if (goTo('nk', hidden)) moved = true;
          }
          // move eosinophil toward a coated worm/parasite
          if (
            !moved &&
            worm &&
            !wormStrikeable(g, 'eosinophil').length &&
            g.cells.eosinophil?.alive
          ) {
            if (goTo('eosinophil', worm)) moved = true;
          }
          // move macrophage toward a coated bacterium/parasite to engulf
          if (!moved && coated) {
            if (goTo('macrophage', coated)) moved = true;
          }
          // otherwise move macrophage to the nearest threat
          if (!moved && th) {
            const mac = g.cells.macrophage;
            if (goTo('macrophage', th)) moved = true;
            else if (
              mac &&
              samePlace(mac, th) &&
              applyAction(g, { action: 'engulf', cell: 'macrophage', invaderId: th.id }).ok
            ) {
              moved = true;
            }
          }
          if (moved) continue;
        }
        break;
      }
      applyAction(g, { action: 'endCommand' });
    }

    killTrunk += g.stats.killedTrunk;
    killBranch += g.stats.killedBranch;
    hits.push(g.stats.organHits);
    if (g.won) wins += 1;
    else if (g.lost) {
      lossTurns.push(g.lost.turn);
      const key = String(g.lost.organ);
      failOrgans[key] = (failOrgans[key] || 0) + 1;
      const dmg = g.organList.filter((o) => {
        const org = g.organs[o];
        return org && org.hp < org.max;
      }).length;
      if (dmg >= 2) cascade += 1;
    }
  }

  const kt = killTrunk + killBranch;
  return {
    N,
    winRate: wins / N,
    avgLossTurn: lossTurns.length ? lossTurns.reduce((a, b) => a + b, 0) / lossTurns.length : null,
    trunkKillPct: kt ? killTrunk / kt : 0,
    avgOrganHits: hits.reduce((a, b) => a + b, 0) / N,
    cascadePct: lossTurns.length ? cascade / lossTurns.length : 0,
    failOrgans,
  };
}

/** A move destination viewed as a board position, with legacy's null-coalescing defaults. */
function destAsPlace(d: MoveDestination): Placed {
  return {
    zone: d.zone,
    lane: d.lane ?? null,
    organ: (d.organ as OrganKey) ?? null,
    step: d.step ?? 0,
  };
}

/**
 * The bot's NET check uses invadersWith(neutrophil), NOT netTargets — so it counts things a NET
 * cannot actually catch.
 *
 * That difference is currently UNOBSERVABLE, and it is worth saying why rather than leaving it
 * as a mystery. This bot issues `move` for the helper only, and reaches goTo() for tcell, nk,
 * eosinophil and macrophage — never the Neutrophil. So the Neutrophil never leaves the hub, the
 * `n.zone !== 'hub'` guard above is permanently false, and this function is never called.
 * Verified by injecting netTargets in its place and finding zero divergence across 600 games at
 * N=200 per difficulty.
 *
 * It is kept exactly as legacy has it because it stops being dead the moment a competent bot
 * moves the Neutrophil — which is precisely what Phase 2 would build (docs/FINDINGS.md §1.4).
 * At that point invadersWith and netTargets give different answers and the bot's behaviour
 * changes with them.
 */
function invadersWithNeutrophil(g: GameState): Invader[] {
  const n = g.cells.neutrophil;
  if (!n) return [];
  return g.invaders.filter((iv) => samePlace(iv, n));
}
