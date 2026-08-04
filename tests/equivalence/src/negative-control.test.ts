/**
 * B0 EXIT CRITERION.
 *
 * A comparison harness that has never been seen to fail is not evidence. Before the port
 * begins, the rig must demonstrate BOTH directions:
 *
 *   1. legacy vs legacy            -> reports identical
 *   2. legacy vs mutated legacy    -> reports a divergence, at the right level, and shrinks
 *                                     it to a minimal reproducing case
 *
 * Direction 2 is the one that matters. Without it, a rig that silently compared nothing would
 * pass direction 1 perfectly and every subsequent checkpoint would be worthless.
 */

import { describe, expect, it } from 'vitest';

import { batch } from './corpus.js';
import { loadLegacy, loadMutatedLegacy, type Mutation } from './engine.js';
import { checkGame, record, compareTrace, type Divergence } from './rig.js';
import { shrink } from './shrink.js';

const legacy = () => loadLegacy();

describe('rig: legacy vs legacy is identical', () => {
  it('reports no divergence across the smoke batch', () => {
    for (const c of batch('smoke')) {
      const divergence = checkGame(legacy, legacy, c.seed, c.difficulty, c.maxTurns);
      expect(divergence, `seed=${c.seed} ${c.difficulty}`).toBeNull();
    }
  });

  it('records a non-trivial number of actions (the comparison is not vacuous)', () => {
    // Guards against the failure mode where the rig "passes" because it compared nothing.
    const trace = record(legacy, 900000, 'normal', 12);
    expect(trace.actions.length).toBeGreaterThan(20);
    expect(trace.steps.length).toBe(trace.actions.length);
    expect(new Set(trace.steps.map((s) => s.stateHash)).size).toBeGreaterThan(10);
  });

  it('is reproducible: the same seed yields the same trace twice', () => {
    const a = record(legacy, 900001, 'hard', 12);
    const b = record(legacy, 900001, 'hard', 12);
    expect(b.steps.map((s) => s.stateHash)).toEqual(a.steps.map((s) => s.stateHash));
    expect(b.steps.map((s) => s.draws)).toEqual(a.steps.map((s) => s.draws));
  });

  it('different seeds yield different traces', () => {
    const a = record(legacy, 900002, 'normal', 12);
    const b = record(legacy, 900003, 'normal', 12);
    expect(b.steps.map((s) => s.stateHash)).not.toEqual(a.steps.map((s) => s.stateHash));
  });
});

/**
 * Each mutation is a single-token change with a known blast radius, chosen to land on a
 * different level of the comparison contract. loadMutatedLegacy asserts the find-string
 * matched exactly once, so a stale mutation fails loudly instead of quietly testing nothing.
 */
const MUTATIONS: ReadonlyArray<Mutation & { expectLevel: Divergence['level'] }> = [
  {
    name: 'result: every action result carries an extra field',
    find: 'const ok=()=>({ok:true});',
    replace: 'const ok=()=>({ok:true,__mutant:1});',
    expectLevel: 'result',
  },
  {
    name: 'rng: d6 burns an extra draw',
    find: 'const d6=()=>1+Math.floor(Math.random()*6);',
    replace: 'const d6=()=>{Math.random();return 1+Math.floor(Math.random()*6);};',
    expectLevel: 'rng',
  },
  {
    name: 'state: viruses hide inside cells more readily',
    find: 'INFECT_ON=2',
    replace: 'INFECT_ON=3',
    expectLevel: 'state',
  },
  {
    // The regression this whole project exists to never repeat: the pre-27-July brain
    // branch length. If the rig cannot catch THIS, it cannot catch anything that matters.
    name: 'state: the brain branch is back to 4 steps',
    find: 'integrity:2, branch:3',
    replace: 'integrity:2, branch:4',
    expectLevel: 'state',
  },
];

describe('rig: legacy vs mutated legacy diverges', () => {
  for (const mutation of MUTATIONS) {
    it(`detects — ${mutation.name}`, () => {
      const mutant = () => loadMutatedLegacy(mutation);

      let found: Divergence | null = null;
      for (const c of batch('smoke')) {
        found = checkGame(legacy, mutant, c.seed, c.difficulty, c.maxTurns);
        if (found) break;
      }

      expect(found, 'rig failed to detect an injected mutation').not.toBeNull();
      if (!found) return;
      expect(found.level).toBe(mutation.expectLevel);
    });
  }

  it('shrinks a divergence to a minimal reproducing case', () => {
    const mutation = MUTATIONS[2];
    expect(mutation).toBeDefined();
    if (!mutation) return;
    const mutant = () => loadMutatedLegacy(mutation);

    let found: Divergence | null = null;
    for (const c of batch('smoke')) {
      const trace = record(legacy, c.seed, c.difficulty, c.maxTurns);
      found = compareTrace(trace, mutant);
      if (found) break;
    }
    expect(found).not.toBeNull();
    if (!found) return;

    const report = shrink(legacy, mutant, found, 200);

    // The whole point: the reported case must be small enough to read.
    expect(report.minimalActions.length).toBeLessThan(report.originalLength);
    expect(report.minimalActions.length).toBeLessThanOrEqual(20);

    // And it must name what actually differs, not just that something did.
    expect(report.differences.length).toBeGreaterThan(0);
    expect(report.text).toContain('minimal repro');
    expect(report.text).toContain('first difference at action');
  });

  it('refuses to run a stale mutation rather than reporting a false pass', () => {
    expect(() =>
      loadMutatedLegacy({
        name: 'stale',
        find: 'this string is not in the engine',
        replace: 'x',
      }),
    ).toThrow(/matched 0 times/);
  });
});
