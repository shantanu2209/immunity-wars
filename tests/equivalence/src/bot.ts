/**
 * The sequence generator.
 *
 * This mirrors the decision logic of simulate()'s inlined bot (v2_engine.js:1616) closely
 * enough to produce long, realistic, legal games.
 *
 * IT IS NOT A BEHAVIOUR ORACLE. Its only job is to emit legal action sequences; the recorded
 * sequence is what gets replayed and compared. Two consequences follow:
 *
 *   1. It runs against LEGACY ONLY during recording. If it ran live against both engines, a
 *      divergence would change its subsequent decisions and the comparison would become
 *      apples-to-oranges. Recording freezes the sequence into an oracle.
 *   2. Its fidelity to the real bot only matters at checkpoint B6, where simulate() itself is
 *      compared across engines and each runs its OWN internal bot. So nothing here needs to
 *      be exact — see docs/FINDINGS.md #10.
 *
 * Four helpers below (samePlace, placeDist, apNow, canAct) are reimplemented because the
 * legacy engine does not export them. They are transcribed from v2_engine.js:781, :1757,
 * :859 and :860.
 */

import type { Action, ActionResult, Cell, Engine, GameState, Invader } from './types.js';

type Placed = { zone: string; lane?: string | null; organ?: string | null; step?: number };

function samePlace(a: Placed, b: Placed): boolean {
  if (a.zone !== b.zone) return false;
  if (a.zone === 'hub') return true;
  if (a.zone === 'route') return a.lane === b.lane && a.step === b.step;
  return a.organ === b.organ && a.step === b.step;
}

function placeDist(a: Placed, b: Placed): number {
  const toHub = (p: Placed): number => (p.zone === 'hub' ? 0 : (p.step ?? 0));
  if (a.zone === b.zone) {
    if (a.zone === 'hub') return 0;
    if (a.zone === 'route' && a.lane === b.lane) return Math.abs((a.step ?? 0) - (b.step ?? 0));
    if (a.zone === 'branch' && a.organ === b.organ) return Math.abs((a.step ?? 0) - (b.step ?? 0));
  }
  return toHub(a) + toHub(b);
}

const apNow = (g: GameState): number => g.ap;
const canAct = (g: GameState, cellKey: string): boolean =>
  apNow(g) > 0 || (g.free?.[cellKey] ?? 0) > 0;

export type Emit = (a: Action) => ActionResult;

/** Play one command phase. Emits every action it takes, including the closing endCommand. */
export function botCommandPhase(E: Engine, g: GameState, emit: Emit): void {
  let steps = 0;
  while (g.phase === 'command' && steps < 60) {
    steps += 1;
    const threats = [...g.invaders].sort((a, b) => E.distToOrgan(g, a) - E.distToOrgan(g, b));
    const th: Invader | undefined = threats[0];

    if (g.cells.macrophage?.freeEngulf) {
      const e = E.macrophageEatable(g)[0];
      if (e && emit({ action: 'engulf', cell: 'macrophage', invaderId: e.id }).ok) continue;
    }

    let primed = false;
    for (const o of g.organList) {
      const e = E.residentEatable(g, o)[0];
      if (e && emit({ action: 'resengulf', organ: o, invaderId: e.id }).ok) {
        primed = true;
        break;
      }
    }
    if (primed) continue;

    if (!canAct(g, 'nk') && g.ap <= 0) break;

    const nk = E.nkTargets(g)[0];
    if (nk && emit({ action: 'nkkill', cell: 'nk', invaderId: nk.id }).ok) continue;

    const sn = E.snipeTargets(g)[0];
    if (sn && emit({ action: 'snipe', cell: 'tcell', invaderId: sn.id }).ok) continue;

    const mem = g.invaders.find((iv) => iv.remembered && E.attackable(iv));
    if (mem && emit({ action: 'memoryKill', invaderId: mem.id }).ok) continue;

    const helper = g.cells.helper;
    const bcell = g.cells.bcell;
    if (helper && bcell && E.helperLicensed(g) && !samePlace(helper, bcell)) {
      const ranked = E.moveDestinations(g, 'helper')
        .map((d) => ({
          d,
          s: placeDist(
            { zone: d.zone, lane: d.lane ?? null, organ: d.organ ?? null, step: d.step ?? 0 },
            bcell,
          ),
        }))
        .sort((a, b) => a.s - b.s);
      const best = ranked[0];
      if (
        best &&
        best.s < placeDist(helper, bcell) &&
        emit({ action: 'move', cell: 'helper', ...best.d }).ok
      ) {
        continue;
      }
    }

    if (
      g.novelSeen &&
      !g.cloneFound &&
      g.invaders.some((x) => x.novel) &&
      emit({ action: 'clonalSelection' }).ok
    ) {
      continue;
    }
    if (
      g.novelSeen &&
      g.cloneFound &&
      (g.ab.X ?? 0) < 1 &&
      g.invaders.some((x) => x.novel) &&
      emit({ action: 'produce', cell: 'bcell', family: 'X' }).ok
    ) {
      continue;
    }

    {
      let done = false;
      const mac = g.cells.macrophage;
      if (mac) {
        for (const iv of g.invaders) {
          if (
            (iv.type === 'bacteria' || iv.type === 'parasite') &&
            iv.tagged &&
            samePlace(mac, iv) &&
            emit({ action: 'engulf', cell: 'macrophage', invaderId: iv.id }).ok
          ) {
            done = true;
            break;
          }
        }
      }
      if (done) continue;
    }

    {
      const eo = g.cells.eosinophil;
      if (eo?.alive) {
        const hit = E.wormStrikeable(g, 'eosinophil')[0];
        if (hit) {
          const urgent =
            hit.type === 'worm' && (hit.hp ?? 0) >= 3 && (hit.zone === 'branch' || hit.lodged);
          if (
            emit({
              action: urgent ? 'degranulate' : 'strike',
              cell: 'eosinophil',
              invaderId: hit.id,
            }).ok
          ) {
            continue;
          }
        }
      }
    }

    if (th) {
      const tf = E.famOf(th);
      if ((g.ab[tf] ?? 0) > 0) {
        if (
          (th.type === 'virus' ||
            th.type === 'toxin' ||
            th.type === 'venom' ||
            (th.type === 'malaria' && th.stage === 'blood')) &&
          emit({ action: 'neutralise', invaderId: th.id }).ok
        ) {
          continue;
        }
        if (
          (th.type === 'bacteria' || th.type === 'worm' || th.type === 'parasite') &&
          !th.tagged &&
          emit({ action: 'tag', invaderId: th.id }).ok
        ) {
          continue;
        }
      }
    }

    {
      const need: Record<string, number> = {};
      for (const x of g.invaders) {
        if (x.type !== 'hidden' && !x.inMac) {
          const f = E.famOf(x);
          need[f] = (need[f] ?? 0) + 1;
        }
      }
      const want = Object.keys(need)
        .sort((a, b) => (need[b] ?? 0) - (need[a] ?? 0))
        .find((f) => (g.ab[f] ?? 0) < E.capFam(g, f) && (f !== 'X' || g.cloneFound));
      if (want && emit({ action: 'produce', cell: 'bcell', family: want }).ok) continue;
    }

    if (g.difficulty !== 'training' && apNow(g) > 0) {
      const here = new Set(g.invaders.map((iv) => iv.disease));
      const cand = Object.keys(g.seen)
        .filter((dz) => !g.memory[dz] && dz !== 'Pathogen X')
        .sort((a, b) => (here.has(b) ? 1 : 0) - (here.has(a) ? 1 : 0));
      if (cand[0] && emit({ action: 'vaccinate', disease: cand[0], ap: 1 }).ok) continue;
    }

    const n = g.cells.neutrophil;
    if (
      n?.alive &&
      n.zone !== 'hub' &&
      E.netTargets(g).length >= 2 &&
      emit({ action: 'net', cell: 'neutrophil' }).ok
    ) {
      continue;
    }

    {
      const byDist = (a: Invader, b: Invader): number => E.distToOrgan(g, a) - E.distToOrgan(g, b);
      const hidden = g.invaders
        .filter(
          (iv) =>
            (iv.type === 'hidden' || iv.inMac || (iv.type === 'malaria' && iv.stage === 'liver')) &&
            E.attackable(iv),
        )
        .sort(byDist)[0];
      const worm = g.invaders
        .filter((iv) => (iv.type === 'worm' || iv.type === 'parasite') && iv.tagged)
        .sort(byDist)[0];
      const coated = g.invaders
        .filter((iv) => (iv.type === 'bacteria' || iv.type === 'parasite') && iv.tagged)
        .sort(byDist)[0];

      const goTo = (cellKey: string, target: Invader | undefined): boolean => {
        if (!target) return false;
        const c: Cell | undefined = g.cells[cellKey];
        if (!c || samePlace(c, target)) return false;
        const ranked = E.moveDestinations(g, cellKey)
          .map((d) => ({
            d,
            s: placeDist(
              { zone: d.zone, lane: d.lane ?? null, organ: d.organ ?? null, step: d.step ?? 0 },
              target,
            ),
          }))
          .sort((a, b) => a.s - b.s);
        const best = ranked[0];
        return Boolean(
          best &&
          best.s < placeDist(c, target) &&
          emit({ action: 'move', cell: cellKey, ...best.d }).ok,
        );
      };

      let moved = false;
      if (hidden && E.snipeTargets(g).length === 0) {
        if (goTo('tcell', hidden)) moved = true;
        else if (goTo('nk', hidden)) moved = true;
      }
      if (
        !moved &&
        worm &&
        E.wormStrikeable(g, 'eosinophil').length === 0 &&
        g.cells.eosinophil?.alive
      ) {
        if (goTo('eosinophil', worm)) moved = true;
      }
      if (!moved && coated && goTo('macrophage', coated)) moved = true;
      if (!moved && th) {
        const mac = g.cells.macrophage;
        if (goTo('macrophage', th)) moved = true;
        else if (
          mac &&
          samePlace(mac, th) &&
          emit({ action: 'engulf', cell: 'macrophage', invaderId: th.id }).ok
        ) {
          moved = true;
        }
      }
      if (moved) continue;
    }

    break;
  }

  emit({ action: 'endCommand' });
}

/** Play a whole game, emitting every action. */
export function botGame(E: Engine, g: GameState, emit: Emit, maxTurns: number): void {
  let guard = 0;
  while (!g.won && !g.lost && guard < maxTurns) {
    guard += 1;
    emit({ action: 'draw' });
    emit({ action: 'beginCommand' });
    botCommandPhase(E, g, emit);
  }
}
