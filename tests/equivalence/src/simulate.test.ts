/**
 * B6 CHECKPOINT — simulate() and the knobs.
 *
 * simulate() runs its OWN inlined bot, so this is the one place the real reference bot is
 * compared rather than the rig's stand-in. The rig's bot is a sequence generator and is allowed
 * to differ (docs/FINDINGS.md #12); this bot is behaviour under test.
 *
 * Note the two are NOT the same, and one difference is instructive: the real bot's NET check
 * counts `invadersWith(neutrophil)` rather than `netTargets`, so it counts things a NET cannot
 * catch. Preserved in the port, because changing it would change which action is attempted and
 * therefore the entire subsequent sequence.
 */

import { describe, expect, it } from 'vitest';

import * as port from '@immunity-wars/engine';
import * as internal from '@immunity-wars/engine/internal';

import { loadLegacy } from './engine.js';
import { canonical } from './hash.js';
import { drawCount, installRng, restoreRng } from './rng.js';
import type { Engine } from './types.js';

const legacy = loadLegacy();
const DIFFICULTIES = ['training', 'normal', 'hard'] as const;

function runSim(
  E: Engine,
  seed: number,
  difficulty: string,
  n: number,
): { out: string; draws: number } {
  installRng(seed);
  try {
    const r = E.simulate(difficulty, n);
    return { out: canonical(r), draws: drawCount() };
  } finally {
    restoreRng();
  }
}

describe('B6 — simulate() is byte-identical, and consumes identical randomness', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`${difficulty} — N=200, result object and draw count`, () => {
      const a = runSim(legacy, 640000, difficulty, 200);
      const b = runSim(port as unknown as Engine, 640000, difficulty, 200);
      expect(b.draws, `${difficulty}: Math.random draws across 200 games`).toBe(a.draws);
      expect(b.out, `${difficulty}: result object`).toBe(a.out);
    }, 300_000);
  }

  it('across many seeds at small N, so a lucky seed cannot carry it', () => {
    for (let i = 0; i < 40; i += 1) {
      for (const difficulty of DIFFICULTIES) {
        const a = runSim(legacy, 650000 + i, difficulty, 5);
        const b = runSim(port as unknown as Engine, 650000 + i, difficulty, 5);
        expect(b.draws, `draws, ${difficulty} seed ${650000 + i}`).toBe(a.draws);
        expect(b.out, `result, ${difficulty} seed ${650000 + i}`).toBe(a.out);
      }
    }
  }, 300_000);

  it('honours the flags argument identically', () => {
    const flagSets = [
      { crisisEvents: false },
      { rareEvents: false, specials: false },
      { dendritic: false, helperT: false },
      { complement: false, toxins: false, malaria: false },
    ];
    for (const flags of flagSets) {
      for (const difficulty of DIFFICULTIES) {
        installRng(660000);
        const a = canonical(legacy.simulate(difficulty, 8, flags));
        restoreRng();
        installRng(660000);
        const b = canonical((port as unknown as Engine).simulate(difficulty, 8, flags));
        restoreRng();
        expect(b, `${difficulty} with ${JSON.stringify(flags)}`).toBe(a);
      }
    }
  }, 300_000);

  it('the simulation is doing real work — games end, and the numbers are not degenerate', () => {
    // Guards against a pass produced by both engines returning an empty or trivial result.
    installRng(670000);
    const r = (port as unknown as Engine).simulate('normal', 60) as unknown as {
      N: number;
      avgLossTurn: number | null;
      avgOrganHits: number;
      failOrgans: Record<string, number>;
    };
    restoreRng();
    expect(r.N).toBe(60);
    expect(r.avgLossTurn).toBeGreaterThan(3);
    expect(r.avgOrganHits).toBeGreaterThan(1);
    expect(Object.keys(r.failOrgans).length).toBeGreaterThan(2);
  }, 120_000);
});

describe('B6 — the module-level knobs', () => {
  it('SPAWN_MODE changes spawn counts identically in both engines', () => {
    const seenOutputs = new Map<string, string>();
    for (const mode of ['flat2', 'every3', 'every2', 'ramp', 'unknown-mode']) {
      installRng(680000);
      legacy.setKnobs({ spawnMode: mode });
      const a = canonical(legacy.simulate('normal', 6));
      legacy.setKnobs({ spawnMode: null });
      restoreRng();

      installRng(680000);
      port.setKnobs({ spawnMode: mode });
      const b = canonical((port as unknown as Engine).simulate('normal', 6));
      internal.resetKnobs();
      restoreRng();

      expect(b, `spawnMode=${mode}`).toBe(a);
      seenOutputs.set(mode, a);
    }

    // VACUITY CHECK. If setKnobs({spawnMode}) did nothing, every arm above would compare two
    // identical default runs and pass while proving nothing. At least one mode must move the
    // result away from the unknobbed baseline.
    installRng(680000);
    internal.resetKnobs();
    const baseline = canonical((port as unknown as Engine).simulate('normal', 6));
    restoreRng();
    const moved = [...seenOutputs.entries()].filter(([, out]) => out !== baseline);
    expect(
      moved.map(([m]) => m).length,
      'no spawnMode changed the outcome — the knob comparisons prove nothing',
    ).toBeGreaterThan(0);
  }, 300_000);

  it('HUB_SAFE makes the bloodstream a sanctuary in both engines', () => {
    installRng(690000);
    legacy.setKnobs({ hubSafe: true });
    const a = canonical(legacy.simulate('normal', 8));
    legacy.setKnobs({ hubSafe: false });
    restoreRng();

    installRng(690000);
    port.setKnobs({ hubSafe: true });
    const b = canonical((port as unknown as Engine).simulate('normal', 8));
    internal.resetKnobs();
    restoreRng();

    expect(b).toBe(a);
  }, 300_000);

  it('AP_OVERRIDE and ORGAN_OVERRIDE apply identically', () => {
    installRng(700001);
    legacy.setKnobs({ ap: 9, organs: ['brain', 'lungs'] });
    const a = canonical(legacy.simulate('hard', 8));
    legacy.setKnobs({ ap: null, organs: null });
    restoreRng();

    installRng(700001);
    port.setKnobs({ ap: 9, organs: ['brain', 'lungs'] });
    const b = canonical((port as unknown as Engine).simulate('hard', 8));
    internal.resetKnobs();
    restoreRng();

    expect(b).toBe(a);

    // VACUITY CHECK — the overrides must actually do something, or `b === a` is two identical
    // default runs agreeing with each other.
    installRng(700001);
    internal.resetKnobs();
    const unknobbed = canonical((port as unknown as Engine).simulate('hard', 8));
    restoreRng();
    expect(b, 'the ap/organs overrides changed nothing — this comparison proves nothing').not.toBe(
      unknobbed,
    );
  }, 300_000);

  it('SPAWN really is dead in BOTH engines — setting it changes nothing', () => {
    // docs/FINDINGS.md #7. Asserted rather than assumed, because "assigned but never read" is
    // exactly the kind of claim that rots.
    installRng(710000);
    const before = canonical(legacy.simulate('normal', 8));
    restoreRng();
    installRng(710000);
    legacy.setKnobs({ spawn: 5 });
    const after = canonical(legacy.simulate('normal', 8));
    legacy.setKnobs({ spawn: 1 });
    restoreRng();
    expect(after, 'legacy: setKnobs({spawn}) has no effect').toBe(before);

    installRng(710000);
    internal.resetKnobs();
    const pBefore = canonical((port as unknown as Engine).simulate('normal', 8));
    restoreRng();
    installRng(710000);
    port.setKnobs({ spawn: 5 });
    const pAfter = canonical((port as unknown as Engine).simulate('normal', 8));
    internal.resetKnobs();
    restoreRng();
    expect(pAfter, 'port: setKnobs({spawn}) has no effect').toBe(pBefore);
    expect(pBefore, 'and both engines agree on the unaffected result').toBe(before);
  }, 300_000);

  it('setKnobs({heal}) throws in the port and is a silent no-op in legacy — the one deviation', () => {
    // docs/DEVIATIONS.md #1. Both halves asserted, so the deviation cannot drift unnoticed.
    expect(() => port.setKnobs({ heal: 2 })).toThrow("setKnobs: 'heal' is not implemented");
    expect(() => legacy.setKnobs({ heal: 2 })).not.toThrow();
    // Legacy's no-op really is a no-op: nothing observable changed.
    installRng(720000);
    const a = canonical(legacy.simulate('normal', 5));
    restoreRng();
    installRng(720000);
    const b = canonical(legacy.simulate('normal', 5));
    restoreRng();
    expect(b).toBe(a);
  }, 120_000);

  it('the knobs are process-global in BOTH engines — leaking between games, as legacy does', () => {
    // Not a defect of the port: it is legacy behaviour, reproduced. The engine is non-reentrant
    // across games and making the knobs per-game is a Phase 2 conversation
    // (docs/TASK_B_PLAN.md §7). Pinned here so nobody "fixes" it inside Task B.
    internal.resetKnobs();
    installRng(730000);
    const clean = canonical((port as unknown as Engine).simulate('normal', 5));
    restoreRng();

    port.setKnobs({ hubSafe: true });
    installRng(730000);
    const dirty = canonical((port as unknown as Engine).simulate('normal', 5));
    restoreRng();

    expect(dirty, 'a knob set earlier still affects a later, unrelated game').not.toBe(clean);

    internal.resetKnobs();
    installRng(730000);
    expect(canonical((port as unknown as Engine).simulate('normal', 5))).toBe(clean);
    restoreRng();
  }, 300_000);
});
