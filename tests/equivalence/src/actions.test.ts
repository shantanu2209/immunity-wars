/**
 * B4 CHECKPOINT — applyAction, reported in four splits.
 *
 * This is generator (b) from docs/TASK_B_PLAN.md §1.4: at each step, enumerate every legal
 * action from the engine's own query functions, add deliberately ILLEGAL ones, and pick with
 * the seeded PRNG. It is not redundant with the recorded bot games — the bot never emits 8 of
 * the 27 actions, so a third of applyAction would otherwise have no coverage at all.
 *
 * Illegal actions are not filler either. They are how the exact error strings get compared, and
 * those strings are frozen player-facing text through the whole of Task B.
 *
 * endCommand is deliberately never issued: resolveSpread lands at B5 and throws until then.
 */

import { describe, expect, it } from 'vitest';

import * as port from '@immunity-wars/engine';

import { loadLegacy } from './engine.js';
import { canonical } from './hash.js';
import { drawCount, installRng, restoreRng } from './rng.js';
import { normalise } from './rig.js';
import type { Action, Engine, GameState } from './types.js';

const legacy = loadLegacy();
const DIFFICULTIES = ['training', 'normal', 'hard'] as const;

const CELL_KEYS = ['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil'];
const FAMILIES = ['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK', 'X'];
const LANES = ['nose', 'gut', 'contact', 'wound', 'bite', 'blood'];

/** Deterministic pick, driven by the same seeded stream both engines see. */
function pick<T>(xs: T[], r: number): T | undefined {
  return xs.length ? xs[Math.floor(r * xs.length) % xs.length] : undefined;
}

/**
 * Candidate actions for one split.
 *
 * Each returns a mix of legal moves (built from the engine's own target lists, so they mostly
 * succeed) and deliberately malformed ones (so the rejection paths and their exact strings get
 * compared too).
 */
type Split = 'phase' | 'movement' | 'combat' | 'residents';

function candidates(E: Engine, g: GameState, split: Split, r: number): Action[] {
  const inv = g.invaders;
  const ids = inv.map((iv) => iv.id);
  const organ = pick(g.organList as unknown as string[], r) ?? 'lungs';
  const ck = pick(CELL_KEYS, r) ?? 'macrophage';

  switch (split) {
    case 'phase':
      return [
        { action: 'draw' },
        { action: 'beginCommand' },
        { action: 'undo' },
        // out of phase on purpose
        { action: 'draw' },
        { action: 'beginCommand' },
        { action: 'allocateAP', pid: 'P1', toPid: 'P2', amount: 2 },
        { action: 'returnAP', pid: 'P2', amount: 1 },
        { action: 'confirmAllocation', pid: 'P1' },
        { action: 'nonsense' },
      ];

    case 'movement': {
      const dests = E.moveDestinations(g, ck);
      const d = pick(dests as unknown as Record<string, unknown>[], r);
      return [
        { action: 'move', cell: ck, ...(d ?? {}) },
        { action: 'move', cell: 'bcell', zone: 'hub' },
        { action: 'move', cell: ck, zone: 'branch', organ, step: 99 }, // illegal
        { action: 'recall', cell: ck },
        { action: 'hop', cell: ck },
        { action: 'hop', cell: ck, lane: pick(LANES, r) },
        { action: 'produce', family: pick(FAMILIES, r) },
        { action: 'produce' }, // no family
        { action: 'produce', family: 'NOPE' },
        { action: 'clonalSelection' },
        { action: 'vaccinate', disease: pick(Object.keys(g.seen), r), ap: 1 },
        { action: 'vaccinate' },
        { action: 'vaccinate', disease: 'Not A Disease' },
      ];
    }

    case 'combat': {
      const id = pick(ids, r);
      const eat = E.macrophageEatable(g)[0];
      const snipe = E.snipeTargets(g)[0];
      const nk = E.nkTargets(g)[0];
      const ven = E.antivenomTargets(g)[0];
      const worm = E.wormStrikeable(g, 'eosinophil')[0] ?? E.wormStrikeable(g, 'macrophage')[0];
      return [
        { action: 'neutralise', invaderId: id },
        { action: 'neutralise', invaderId: 'nope' },
        { action: 'tag', invaderId: id },
        { action: 'engulf', cell: 'macrophage', invaderId: eat?.id ?? id },
        { action: 'snipe', cell: 'tcell', invaderId: snipe?.id ?? id },
        { action: 'nkkill', cell: 'nk', invaderId: nk?.id ?? id },
        { action: 'net', cell: 'neutrophil' },
        { action: 'memoryKill', invaderId: id },
        { action: 'antivenom', invaderId: ven?.id ?? id },
        { action: 'orderAntivenom', ap: 2 },
        { action: 'strike', cell: 'eosinophil', invaderId: worm?.id ?? id },
        { action: 'strike', cell: 'nk', invaderId: worm?.id ?? id }, // wrong cell
        { action: 'degranulate', cell: 'eosinophil', invaderId: worm?.id ?? id },
        { action: 'activate', cell: 'helper' },
      ];
    }

    case 'residents':
      return [
        { action: 'resmove', organ, step: (r * 4) | 0 },
        { action: 'resmove', organ, step: -1 },
        { action: 'resmove', organ: 'nope', step: 1 },
        { action: 'resengulf', organ },
        { action: 'resengulf', organ, invaderId: pick(ids, r) },
        { action: 'resengulf', organ: 'nope' },
      ];

    default:
      return [];
  }
}

interface Divergence {
  index: number;
  action: Action;
  level: 'rng' | 'state' | 'result';
  legacy: string;
  port: string;
}

/**
 * Drive both engines through the same fuzzed action list, comparing after every action.
 *
 * The action LIST is chosen from legacy's state only, then replayed into the port — the same
 * discipline as the recorded bot games. If candidate selection consulted both engines, a
 * divergence would change what gets tried next and the comparison would stop being like-for-like.
 */
function fuzzSplit(split: Split, seeds: number, actionsPerGame: number): Divergence | null {
  for (let s = 0; s < seeds; s += 1) {
    for (const difficulty of DIFFICULTIES) {
      const multiplayer = split === 'phase' && s % 3 === 0;
      const cfg = multiplayer
        ? { difficulty, science: false, multiplayer: true, captain: 'P1', players: ['P1', 'P2'] }
        : { difficulty, science: false };

      // ---- choose the action list against legacy ----
      installRng(700000 + s);
      const gl = legacy.newGame(cfg);
      const chosen: Action[] = [];
      const legacySteps: { state: string; draws: number; result: string }[] = [];
      try {
        // Reach the command phase for the splits that need it.
        if (split !== 'phase') {
          legacy.applyAction(gl, { action: 'draw' });
          legacy.applyAction(gl, { action: 'beginCommand' });
        }
        for (let i = 0; i < actionsPerGame; i += 1) {
          const r = ((s * 31 + i * 17) % 97) / 97;
          const options = candidates(legacy, gl, split, r);
          const a = options[(i * 7 + s) % options.length];
          if (!a) continue;
          if (a.action === 'endCommand') continue; // B5
          chosen.push(a);
          const res = legacy.applyAction(gl, a);
          legacySteps.push({
            state: canonical(normalise(gl)),
            draws: drawCount(),
            result: canonical(res),
          });
        }
      } finally {
        restoreRng();
      }

      // ---- replay the SAME list into the port ----
      installRng(700000 + s);
      const gp = port.newGame(cfg) as unknown as GameState;
      try {
        if (split !== 'phase') {
          port.applyAction(gp as never, { action: 'draw' });
          port.applyAction(gp as never, { action: 'beginCommand' });
        }
        for (let i = 0; i < chosen.length; i += 1) {
          const a = chosen[i];
          if (!a) continue;
          const res = port.applyAction(gp as never, a as never);
          const want = legacySteps[i];
          if (!want) continue;
          const gotState = canonical(normalise(gp));
          const gotDraws = drawCount();
          const gotResult = canonical(res);
          if (gotDraws !== want.draws) {
            return {
              index: i,
              action: a,
              level: 'rng',
              legacy: String(want.draws),
              port: String(gotDraws),
            };
          }
          if (gotState !== want.state) {
            let k = 0;
            while (k < gotState.length && k < want.state.length && gotState[k] === want.state[k])
              k += 1;
            return {
              index: i,
              action: a,
              level: 'state',
              legacy: want.state.slice(Math.max(0, k - 50), k + 80),
              port: gotState.slice(Math.max(0, k - 50), k + 80),
            };
          }
          if (gotResult !== want.result) {
            return { index: i, action: a, level: 'result', legacy: want.result, port: gotResult };
          }
        }
      } finally {
        restoreRng();
      }
    }
  }
  return null;
}

function report(split: Split, d: Divergence | null): void {
  if (!d) return;
  throw new Error(
    `B4 ${split} diverged at action ${d.index} (${d.action.action}) — level ${d.level}\n` +
      `  legacy = ${d.legacy}\n  port   = ${d.port}`,
  );
}

/* ------------------------------------------------------------------ *
 * the four checkpoints
 * ------------------------------------------------------------------ */

describe('B4a — phase machine and multiplayer allocation', () => {
  it('draw, beginCommand, undo, allocateAP, returnAP, confirmAllocation, and out-of-phase misuse', () => {
    report('phase', fuzzSplit('phase', 60, 24));
  });
});

describe('B4b — movement and the B-cell', () => {
  it('move, hop, recall, produce, clonalSelection, vaccinate, plus illegal variants', () => {
    report('movement', fuzzSplit('movement', 60, 40));
  });
});

describe('B4c — combat', () => {
  it('neutralise, tag, engulf, snipe, nkkill, net, memoryKill, antivenom, strike, degranulate, activate', () => {
    report('combat', fuzzSplit('combat', 60, 40));
  });
});

describe('B4d — residents', () => {
  it('resmove and resengulf, including the patrol boundaries', () => {
    report('residents', fuzzSplit('residents', 60, 30));
  });
});

/* ------------------------------------------------------------------ *
 * the frozen error strings
 * ------------------------------------------------------------------ */

describe('B4 — error strings are byte-identical', () => {
  it('every rejection the fuzzer can provoke matches legacy exactly', () => {
    // Frozen player-facing text: Task C extracts these into i18n catalogues, so any rewording
    // during Task B is a silent behaviour change.
    //
    // Uses the same record-then-replay discipline as fuzzSplit. An earlier version built both
    // games under one shared RNG stream, so legacy consumed the first N draws and the port the
    // NEXT N — different decks, immediate divergence, and a failure that said nothing about the
    // port. Each engine has to start from the same seed, not share one stream.
    const pairs: { action: Action; error: string }[] = [];

    for (const split of ['phase', 'movement', 'combat', 'residents'] as Split[]) {
      for (let s = 0; s < 25; s += 1) {
        const chosen: Action[] = [];
        const wanted: (string | undefined)[] = [];

        installRng(810000 + s);
        try {
          const gl = legacy.newGame({ difficulty: 'normal', science: false });
          if (split !== 'phase') {
            legacy.applyAction(gl, { action: 'draw' });
            legacy.applyAction(gl, { action: 'beginCommand' });
          }
          for (let i = 0; i < 30; i += 1) {
            const r = ((s * 13 + i * 7) % 89) / 89;
            const options = candidates(legacy, gl, split, r);
            const a = options[(i * 5 + s) % options.length];
            if (!a || a.action === 'endCommand') continue;
            chosen.push(a);
            const rl = legacy.applyAction(gl, a) as { ok: boolean; error?: string };
            wanted.push(rl.error);
            if (rl.error) pairs.push({ action: a, error: rl.error });
          }
        } finally {
          restoreRng();
        }

        installRng(810000 + s);
        try {
          const gp = port.newGame({ difficulty: 'normal', science: false });
          if (split !== 'phase') {
            port.applyAction(gp as never, { action: 'draw' } as never);
            port.applyAction(gp as never, { action: 'beginCommand' } as never);
          }
          for (let i = 0; i < chosen.length; i += 1) {
            const a = chosen[i];
            if (!a) continue;
            const rp = port.applyAction(gp as never, a as never) as { ok: boolean; error?: string };
            expect(rp.error, `${split}/${a.action} (seed ${810000 + s}, step ${i})`).toBe(
              wanted[i],
            );
          }
        } finally {
          restoreRng();
        }
      }
    }

    // The fuzzer has to actually be provoking rejections, or this test proves nothing.
    const distinct = new Set(pairs.map((p) => p.error));
    expect(distinct.size).toBeGreaterThan(15);
  });
});

describe('B4 — endCommand, once B5 landed', () => {
  // This test previously asserted that endCommand THREW, because resolveSpread was deliberately
  // unported and a stub returning ok() would have let all four B4 checkpoints pass while
  // comparing nothing. B5 replaced the stub, so the assertion inverted — which is the signal
  // the scaffolding was designed to give.
  it('resolves a turn and returns frames, matching legacy', () => {
    installRng(123456);
    const gl = legacy.newGame({ difficulty: 'normal', science: false });
    legacy.applyAction(gl, { action: 'draw' });
    legacy.applyAction(gl, { action: 'beginCommand' });
    const rl = legacy.applyAction(gl, { action: 'endCommand' }) as {
      ok: boolean;
      frames?: unknown[];
    };
    restoreRng();

    installRng(123456);
    const gp = port.newGame({ difficulty: 'normal', science: false });
    port.applyAction(gp as never, { action: 'draw' } as never);
    port.applyAction(gp as never, { action: 'beginCommand' } as never);
    const rp = port.applyAction(gp as never, { action: 'endCommand' } as never) as {
      ok: boolean;
      frames?: unknown[];
    };
    restoreRng();

    expect(rp.ok).toBe(true);
    expect(rp.frames?.length, 'frame count is part of the compared result').toBe(rl.frames?.length);
    expect(canonical(rp)).toBe(canonical(rl));
    expect(canonical(normalise(gp as never))).toBe(canonical(normalise(gl)));
  });
});
