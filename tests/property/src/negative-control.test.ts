/**
 * NEGATIVE CONTROLS — the exit criterion for this suite.
 *
 * A check that has never failed is not known to work. Not "probably works" — not known. This has
 * been true roughly ten times in this project and ZERO times has the check turned out to be fine
 * (tests/equivalence/README.md, "Read this first").
 *
 * So none of the invariants in `invariants.ts` counts until it has been made to fire on purpose.
 * Four levels, each guarding a different way a green run can be worthless:
 *
 *   L0  VACUITY      the predicate never had anything to look at
 *   L1  PREDICATE    the predicate cannot see the violation (and does not see a near miss)
 *   L2  HARNESS      the runner never applied the predicate, or erased the evidence first
 *   L3  WRONG ENGINE the checks are wired to synthetic states rather than real transitions
 *
 * L2 is the one that matters, and it must go through `runGame` — the SAME entry point the real
 * properties use. A control that drives a parallel copy of the runner proves the copy works. That
 * is precisely the Task C5b failure: nineteen green tests, against an oracle the test itself had
 * regenerated at import time.
 */

import { describe, expect, it } from 'vitest';

import { loadMutatedLegacy } from '@immunity-wars/equivalence/engine';
import type { Action, ActionResult, Engine, GameState } from '@immunity-wars/equivalence/types';

import * as portNs from '@immunity-wars/engine';

import {
  ALL_INVARIANTS,
  ANTIBODY_CEILING,
  AP_NON_NEGATIVE,
  MEMORY_ON_KILL,
  NO_DEAD_CELL_ACTS,
  PLACEMENT_COHERENCE,
  PRODUCTION_RESPECTS_CAP,
  UNDO_ROUND_TRIPS,
  VIEWSTATE_ROUND_TRIPS,
  type Ctx,
  type EngineUnderTest,
  type Invariant,
  type Violation,
} from './invariants.js';
import { runGame, shrinkViolation, type Saboteur } from './runner.js';

/* ================================================================== *
 * L0 — VACUITY
 * ================================================================== */

describe('L0: every invariant actually examined something', () => {
  /**
   * An invariant with `checked: 0` is not passing. It is a check that never ran, reported in
   * green. The floors below are deliberately well under what a real run produces (measured:
   * 3,148 / 33,553 / 22,036 / 616 / 1,247 / 3,148 / 2,444 / 221 over 30 games) so this test
   * fails on a predicate going silent, not on ordinary variance.
   */
  const FLOORS: Record<string, number> = {
    'ap-non-negative': 200,
    'placement-coherence': 500,
    'antibody-ceiling': 1000,
    'production-respects-cap': 10,
    'no-dead-cell-acts': 20,
    'viewstate-round-trip': 200,
    'undo-round-trip': 100,
    'memory-on-kill': 5,
  };

  it('reaches every invariant across a small batch, above a floor', () => {
    const totals: Record<string, number> = {};
    for (const inv of ALL_INVARIANTS) totals[inv.id] = 0;
    for (const difficulty of ['training', 'normal', 'hard']) {
      for (let i = 0; i < 6; i += 1) {
        const run = runGame({ seed: 820000 + i, difficulty });
        for (const [id, n] of Object.entries(run.checks)) totals[id] = (totals[id] ?? 0) + n;
      }
    }
    for (const inv of ALL_INVARIANTS) {
      expect(
        totals[inv.id] ?? 0,
        `${inv.id} examined nothing (or almost nothing). A check that never ran is not a ` +
          'check that passed — find out whether the generator stopped reaching it.',
      ).toBeGreaterThanOrEqual(FLOORS[inv.id] ?? 1);
    }
  });

  it('the injected actions are what reach the 8 the bot never emits', () => {
    // docs/FINDINGS.md §1.1: the reference bot never emits net, resengulf, resmove, antivenom,
    // orderAntivenom, hop, recall or undo. If injection ever silently stops working, the suite
    // would keep passing while testing a third less of the engine.
    const withInjection = new Set<string>();
    const without = new Set<string>();
    for (let i = 0; i < 6; i += 1) {
      for (const a of runGame({ seed: 821000 + i, difficulty: 'normal' }).emitted) {
        withInjection.add(a);
      }
      for (const a of runGame({ seed: 821000 + i, difficulty: 'normal', injectEvery: 0 }).emitted) {
        without.add(a);
      }
    }
    for (const a of ['net', 'resmove', 'hop', 'recall', 'orderAntivenom', 'undo']) {
      expect(withInjection.has(a), `injection never produced ${a}`).toBe(true);
      expect(without.has(a), `${a} came from the bot, not from injection — check the comment`).toBe(
        false,
      );
    }
  });
});

/* ================================================================== *
 * L1 — PREDICATE
 * ================================================================== */

/** Drive one invariant directly against a hand-built state. */
function probe(
  inv: Invariant,
  g: GameState,
  a: Action = { action: 'endCommand' },
  r: ActionResult = { ok: true },
  pre: unknown = null,
): { checked: number; violations: string[] } {
  let checked = 0;
  const violations: string[] = [];
  const ctx: Ctx = { engine: portNs as unknown as EngineUnderTest };
  inv.after(ctx, g, a, r, pre, {
    checked: (n = 1) => {
      checked += n;
    },
    violate: (d) => violations.push(d),
  });
  return { checked, violations };
}

describe('L1: each predicate fires on a violation and stays silent on a near miss', () => {
  it('ap-non-negative sees a negative AP, and NaN, and passes on zero', () => {
    const g = { ap: -1, invaders: [], cells: {}, turn: 3 } as unknown as GameState;
    expect(probe(AP_NON_NEGATIVE, g).violations).toHaveLength(1);

    // THE SPELLING TEST. `!(ap < 0)` is true for NaN and would let docs/FINDINGS.md #20 through.
    // This is why the predicate is written `Number.isFinite(ap) && ap >= 0` and not negated.
    // Held in a variable rather than written `NaN < 0`, which the use-isnan lint rule rejects —
    // the rule exists for exactly the confusion being demonstrated here.
    const notANumber = Number('not a number');
    expect(notANumber < 0).toBe(false); // the trap, stated so nobody re-introduces it
    expect(Number.isFinite(notANumber) && notANumber >= 0).toBe(false); // the correct spelling
    const nan = { ap: NaN, invaders: [], cells: {}, turn: 3 } as unknown as GameState;
    expect(probe(AP_NON_NEGATIVE, nan).violations).toHaveLength(1);

    // NEAR MISS: zero is legal, and is the value an exhausted turn actually holds.
    const zero = { ap: 0, invaders: [], cells: {}, turn: 3 } as unknown as GameState;
    const ok = probe(AP_NON_NEGATIVE, zero);
    expect(ok.violations).toEqual([]);
    expect(ok.checked).toBeGreaterThan(0);
  });

  it('ap-non-negative sees a NaN in a per-player budget too', () => {
    // docs/FINDINGS.md #20 exactly: returnAP wrote NaN into apBudget for an unrecognised pid.
    const g = {
      ap: 4,
      invaders: [],
      cells: {},
      turn: 3,
      apBudget: { P1: 4, ghost: NaN },
    } as unknown as GameState;
    expect(probe(AP_NON_NEGATIVE, g).violations).toHaveLength(1);
  });

  it('placement-coherence sees an out-of-range step and a branch with no organ', () => {
    const base = { ap: 4, cells: {}, turn: 3 } as unknown as GameState;

    const offRoute = {
      ...base,
      invaders: [
        { id: 'a', disease: 'Influenza', type: 'virus', zone: 'route', lane: 'nose', step: 9 },
      ],
    } as unknown as GameState;
    expect(probe(PLACEMENT_COHERENCE, offRoute).violations).toHaveLength(1);

    const noOrgan = {
      ...base,
      invaders: [
        { id: 'b', disease: 'Influenza', type: 'virus', zone: 'branch', organ: null, step: 1 },
      ],
    } as unknown as GameState;
    expect(probe(PLACEMENT_COHERENCE, noOrgan).violations).toHaveLength(1);

    const badZone = {
      ...base,
      invaders: [{ id: 'c', disease: 'Influenza', type: 'virus', zone: 'nowhere', step: 0 }],
    } as unknown as GameState;
    expect(probe(PLACEMENT_COHERENCE, badZone).violations).toHaveLength(1);

    // NEAR MISS, AND THE IMPORTANT ONE. A branch invader legitimately keeps the `lane` it
    // entered through — the march never clears it. An invariant that flagged this would be
    // wrong, and would have been "fixed" by weakening it. See PLACEMENT_COHERENCE's comment.
    const branchWithLane = {
      ...base,
      invaders: [
        {
          id: 'd',
          disease: 'Influenza',
          type: 'virus',
          zone: 'branch',
          organ: 'lungs',
          lane: 'nose',
          step: 1,
        },
      ],
    } as unknown as GameState;
    const ok = probe(PLACEMENT_COHERENCE, branchWithLane);
    expect(ok.violations).toEqual([]);
    expect(ok.checked).toBe(1);
  });

  it('antibody-ceiling sees a pool over the undamaged cap, and NOT one merely over capFam', () => {
    const base = {
      ap: 4,
      cells: {},
      turn: 3,
      invaders: [],
      difficulty: 'normal',
      organs: {},
      fx: { capTurns: 0, noProduce: false, apMod: 0, skipMarch: false },
    } as unknown as GameState;

    const over = { ...base, ab: { EXB: 5 } } as unknown as GameState; // normal's cap is 4
    expect(probe(ANTIBODY_CEILING, over).violations).toHaveLength(1);

    // NEAR MISS, AND THE WHOLE POINT OF docs/FINDINGS.md #27. A pool of 4 on Normal with a
    // damaged liver is over `capFam` (which clamps to 2) and is entirely legal — it happens in
    // 288 of 1200 measured games. The brief's wording would have failed here.
    const overCapFamOnly = {
      ...base,
      ab: { EXB: 4 },
      organs: { liver: { hp: 1, max: 3, clear: 0 } },
    } as unknown as GameState;
    const ok = probe(ANTIBODY_CEILING, overCapFamOnly);
    expect(ok.violations).toEqual([]);
    expect(ok.checked).toBe(7);
  });

  it('production-respects-cap sees a write above the cap that was in force', () => {
    const g = { ap: 4, cells: {}, turn: 3, invaders: [], ab: { EXB: 6 } } as unknown as GameState;
    const pre = { family: 'EXB', cap: 4, had: 3 };
    const bad = probe(
      PRODUCTION_RESPECTS_CAP,
      g,
      { action: 'produce', family: 'EXB' },
      { ok: true },
      pre,
    );
    expect(bad.violations).toHaveLength(1);

    // NEAR MISS: landing exactly ON the cap is what a correct produce does.
    const atCap = { ...g, ab: { EXB: 4 } } as unknown as GameState;
    const ok = probe(
      PRODUCTION_RESPECTS_CAP,
      atCap,
      { action: 'produce', family: 'EXB' },
      { ok: true },
      pre,
    );
    expect(ok.violations).toEqual([]);
    expect(ok.checked).toBe(1);

    // NEAR MISS: a REJECTED produce writes nothing and must not be judged.
    const rejected = probe(
      PRODUCTION_RESPECTS_CAP,
      g,
      { action: 'produce', family: 'EXB' },
      { ok: false, error: 'full' },
      pre,
    );
    expect(rejected.violations).toEqual([]);
    expect(rejected.checked).toBe(0);
  });

  it('no-dead-cell-acts sees a success for a cell that was not alive', () => {
    const g = { ap: 4, cells: {}, turn: 3, invaders: [] } as unknown as GameState;
    const bad = probe(
      NO_DEAD_CELL_ACTS,
      g,
      { action: 'net', cell: 'neutrophil' },
      { ok: true },
      { ck: 'neutrophil', aliveBefore: false },
    );
    expect(bad.violations).toHaveLength(1);

    // NEAR MISS: a dead cell whose action was REJECTED is the engine working correctly.
    const ok = probe(
      NO_DEAD_CELL_ACTS,
      g,
      { action: 'net', cell: 'neutrophil' },
      { ok: false, error: 'regenerating' },
      { ck: 'neutrophil', aliveBefore: false },
    );
    expect(ok.violations).toEqual([]);
    expect(ok.checked).toBe(1);
  });

  it('memory-on-kill sees BOTH directions of the difficulty rule', () => {
    const base = {
      ap: 4,
      cells: {},
      turn: 3,
      invaders: [],
      memory: {},
    } as unknown as GameState;
    const pre = { diseases: ['Cholera'], memory: {} };
    const kill: Action = { action: 'engulf', cell: 'macrophage', invaderId: 'x' };

    // Training: the last one died and NOTHING was recorded.
    const trainingMiss = { ...base, difficulty: 'training', memory: {} } as unknown as GameState;
    expect(probe(MEMORY_ON_KILL, trainingMiss, kill, { ok: true }, pre).violations).toHaveLength(1);

    // Normal: memory was recorded, which is the design decision being pinned. Immunity on
    // Normal and Hard must be EARNED BY VACCINATION — a port that generalised the Training rule
    // would delete that lesson with every other test still green.
    const normalGranted = {
      ...base,
      difficulty: 'normal',
      memory: { Cholera: true },
    } as unknown as GameState;
    expect(probe(MEMORY_ON_KILL, normalGranted, kill, { ok: true }, pre).violations).toHaveLength(
      1,
    );

    // NEAR MISSES: each difficulty behaving correctly.
    const trainingOk = {
      ...base,
      difficulty: 'training',
      memory: { Cholera: true },
    } as unknown as GameState;
    expect(probe(MEMORY_ON_KILL, trainingOk, kill, { ok: true }, pre).violations).toEqual([]);

    const normalOk = { ...base, difficulty: 'normal', memory: {} } as unknown as GameState;
    const ok = probe(MEMORY_ON_KILL, normalOk, kill, { ok: true }, pre);
    expect(ok.violations).toEqual([]);
    expect(ok.checked).toBe(1);
  });

  it('memory-on-kill sees memory being un-set', () => {
    const g = {
      ap: 4,
      cells: {},
      turn: 3,
      invaders: [],
      memory: {},
      difficulty: 'normal',
    } as unknown as GameState;
    const pre = { diseases: [], memory: { Cholera: true } };
    const out = probe(MEMORY_ON_KILL, g, { action: 'engulf' }, { ok: true }, pre);
    expect(out.violations).toHaveLength(1);
    expect(out.violations[0]).toContain('un-set memory');
  });
});

/* ================================================================== *
 * L2 — HARNESS
 * ================================================================== */

/**
 * Saboteurs, routed through `runGame`.
 *
 * L1 proved each predicate can see a violation when handed one directly. That is necessary and
 * not sufficient: it says nothing about whether the RUNNER hands it one. These corrupt a live
 * game mid-play, through the real entry point, and assert the real machinery reports it.
 */
const SABOTEURS: ReadonlyArray<{ saboteur: Saboteur; expect: string }> = [
  {
    saboteur: {
      name: 'AP driven negative',
      when: (g) => g.phase === 'command' && g.turn >= 2,
      apply: (g) => {
        g.ap = -1;
      },
    },
    expect: 'ap-non-negative',
  },
  {
    saboteur: {
      name: 'an invader marched off the end of its route',
      when: (g) => g.invaders.some((iv) => iv.zone === 'route'),
      apply: (g) => {
        const iv = g.invaders.find((x) => x.zone === 'route');
        if (iv) iv.step = 99;
      },
    },
    expect: 'placement-coherence',
  },
  {
    saboteur: {
      name: 'an antibody pool over the undamaged ceiling',
      when: (g) => g.phase === 'command' && g.turn >= 2,
      apply: (g) => {
        g.ab.EXB = 99;
      },
    },
    expect: 'antibody-ceiling',
  },
  {
    /**
     * The macrophage has no `alive` field in a normal game — only the Neutrophil and Eosinophil
     * do — so writing one the engine does not consult produces exactly the state this invariant
     * exists to catch: a cell recorded as not alive whose action nevertheless succeeds.
     */
    saboteur: {
      name: 'a cell marked not alive while the engine keeps letting it act',
      when: (g) => g.phase === 'command',
      apply: (g) => {
        for (const c of Object.values(g.cells)) c.alive = false;
      },
    },
    expect: 'no-dead-cell-acts',
  },
  {
    saboteur: {
      name: 'memory withheld on Training, where beating a disease must record it',
      when: (g) => g.difficulty === 'training',
      apply: (g) => {
        for (const dz of Object.keys(g.memory)) delete g.memory[dz];
      },
    },
    expect: 'memory-on-kill',
  },
  {
    /**
     * THE CONTROL FOR "THE RUNNER DOES NOT COPY THE STATE" — and the value matters.
     *
     * FIRST DRAFT WROTE `NaN` AND PROVED NOTHING. `JSON.parse(JSON.stringify({x: NaN}))` yields
     * `{x: null}`, the key survives, and `Number.isFinite(null)` is false — so the predicate
     * would have fired identically whether or not the runner copied the state. A control that
     * passes under both the correct and the broken implementation is not a control.
     *
     * `undefined` is the discriminating value: the key VANISHES under a JSON round-trip, so a
     * copying runner would iterate an empty object and report nothing at all. The assertion
     * below states that difference as a fact rather than as a comment, so the next person
     * cannot "simplify" this back to NaN.
     */
    saboteur: {
      name: 'a value that a JSON round-trip would ERASE, not merely mangle',
      when: (g) => g.phase === 'command' && g.turn >= 2,
      apply: (g) => {
        (g as unknown as Record<string, unknown>).apBudget = { ghost: undefined };
      },
    },
    expect: 'ap-non-negative',
  },
];

describe('L2: the RUNNER reports a corruption injected into a live game', () => {
  for (const { saboteur, expect: expected } of SABOTEURS) {
    it(`detects — ${saboteur.name}`, () => {
      let found: readonly Violation[] = [];
      for (const difficulty of ['normal', 'hard', 'training']) {
        for (let i = 0; i < 4 && found.length === 0; i += 1) {
          const run = runGame({ seed: 840000 + i, difficulty, saboteur });
          found = run.violations.filter((v) => v.invariant === expected);
        }
        if (found.length > 0) break;
      }
      expect(
        found.length,
        `the runner did not report ${expected} for an injected corruption. Either the ` +
          'predicate is not being applied, or something erased the corruption before it was seen.',
      ).toBeGreaterThan(0);
    });
  }

  it('the JSON-hostile saboteur is DISCRIMINATING, which NaN would not have been', () => {
    // Stated as executable fact because the first draft of the saboteur above used NaN and was
    // not discriminating: a copying runner would have reported the violation anyway. This is
    // what makes the control above evidence rather than decoration.
    const mangled = JSON.parse(JSON.stringify({ ghost: NaN })) as Record<string, unknown>;
    expect(Object.keys(mangled)).toEqual(['ghost']); // survives — a copying runner still sees it
    expect(Number.isFinite(mangled['ghost'] as number)).toBe(false); // and still violates

    const erased = JSON.parse(JSON.stringify({ ghost: undefined })) as Record<string, unknown>;
    expect(Object.keys(erased)).toEqual([]); // vanishes — a copying runner sees NOTHING to check
  });

  it('a clean run of the SAME code path reports nothing (the control is not always-on)', () => {
    // Without this, a runner that reported a violation unconditionally would pass every test
    // above. The coverage gate's exclusion list failed exactly this way — it matched both arms
    // of an `if` and nobody noticed, because only one arm was ever looked at.
    for (const difficulty of ['training', 'normal', 'hard']) {
      for (let i = 0; i < 4; i += 1) {
        const run = runGame({ seed: 840000 + i, difficulty, saboteur: null });
        expect(run.violations, `${difficulty} seed ${840000 + i}`).toEqual([]);
      }
    }
  });

  it('a violation shrinks to a minimal reproducing action list', () => {
    const saboteur: Saboteur = {
      name: 'AP driven negative',
      when: (g) => g.phase === 'command' && g.turn >= 2,
      apply: (g) => {
        g.ap = -1;
      },
    };
    const run = runGame({ seed: 840000, difficulty: 'normal', saboteur });
    expect(run.violations.length).toBeGreaterThan(0);

    const report = shrinkViolation(run, ALL_INVARIANTS, saboteur, 150);
    expect(report).not.toBeNull();
    if (!report) return;

    expect(report.minimalActions.length).toBeLessThan(report.originalLength);
    expect(report.text).toContain('minimal repro');
    expect(report.text).toContain('ap-non-negative');
  });
});

/* ================================================================== *
 * L3 — WRONG ENGINE
 * ================================================================== */

/**
 * FOUR CONTROLS HERE, NOT THE ONE THE PLAN BUDGETED — and the reason was discovered rather
 * than chosen.
 *
 * A saboteur writes a bad value into a correct engine's state. That works for invariants about
 * WHAT THE STATE CONTAINS, and it cannot work for invariants about WHAT THE ENGINE DOES. Three
 * of the eight are the second kind, and each was found by a control that would not fire:
 *
 *   undo-round-trip    push-then-pop is the engine's own machinery. No value written into the
 *                      state can make a correct implementation fail. (First draft tampered with
 *                      the undo stack; the invariant pushes a fresh snapshot and pops that one.)
 *   memory-on-kill     the Normal/Hard arm is a BEFORE/AFTER DELTA — memory going false→true
 *                      across a kill. A saboteur that writes memory on every action poisons the
 *                      "before" of every later action, so a persistent corruption is invisible
 *                      to a delta check. Firing it once cannot be aimed at the kill either.
 *   production-respects-cap  a check on WRITE LOGIC. Inflating the stores is self-defeating:
 *                      `produce` then refuses outright, so the corruption makes the engine more
 *                      careful rather than less.
 *   antibody-ceiling   works either way; kept as a mutant so a legitimate `produce` reaches the
 *                      bad state rather than an injected write.
 *
 * Three general properties worth stating, because each cost a failing control to find:
 *
 *   A DELTA CHECK cannot be falsified by a PERSISTENT corruption.
 *   A MACHINERY CHECK cannot be falsified by a DATA corruption.
 *   A WRITE-LOGIC CHECK cannot be falsified by corrupting the input the write guards against —
 *     that only makes the guard fire.
 *
 * Where a saboteur will not do, the control has to be a wrong engine.
 *
 * `loadMutatedLegacy` patches the legacy engine's source — the port is an ES module and cannot
 * be string-patched. That is sound here because each invariant takes its expected value from
 * `@immunity-wars/content` or from first principles, never from the engine under test.
 */
describe('L3: an invariant fires against a genuinely wrong engine, not only a saboteur', () => {
  it('a raised antibody cap is caught by antibody-ceiling', () => {
    const mutant = loadMutatedLegacy({
      name: 'per-family antibody cap raised past the difficulty ceiling',
      find: 'const AB_CAP_FAM_BY_DIFF = { training:5, normal:4, hard:3 };',
      replace: 'const AB_CAP_FAM_BY_DIFF = { training:9, normal:9, hard:9 };',
    }) as unknown as Engine;

    let violations: readonly Violation[] = [];
    for (let i = 0; i < 8 && violations.length === 0; i += 1) {
      const run = runGame({
        seed: 850000 + i,
        difficulty: 'training',
        engine: mutant,
        invariants: [ANTIBODY_CEILING],
      });
      violations = run.violations;
    }
    expect(
      violations.length,
      'a mutated engine produced antibodies past the ceiling and the invariant stayed silent',
    ).toBeGreaterThan(0);
  });

  it('a produce that overshoots its own cap is caught by production-respects-cap', () => {
    /**
     * A THIRD INVARIANT THAT NO SABOTEUR CAN FALSIFY, found the same way as the other two.
     *
     * The obvious state corruption — inflate the stores so the next produce lands over the cap —
     * is self-defeating: `produce` refuses outright when the store is already full, so the
     * engine correctly returns `{ok:false}` and the invariant rightly says nothing. The
     * corruption makes the engine MORE careful, not less.
     *
     * That is the tell that this is a check on WRITE LOGIC. Legacy's clamp is
     * `Math.min(rateForFam(g,f), cap-(g.ab[f]||0))`; removing it lets a legitimate produce
     * overshoot, which is the only way the claim can actually be false.
     */
    const mutant = loadMutatedLegacy({
      name: 'produce no longer clamps to the remaining headroom',
      find: 'const made=Math.min(rateForFam(g,f), cap-(g.ab[f]||0));',
      replace: 'const made=rateForFam(g,f);',
    }) as unknown as Engine;

    let violations: readonly Violation[] = [];
    for (let i = 0; i < 8 && violations.length === 0; i += 1) {
      const run = runGame({
        seed: 857000 + i,
        difficulty: 'training',
        engine: mutant,
        invariants: [PRODUCTION_RESPECTS_CAP],
      });
      violations = run.violations;
    }
    expect(
      violations.length,
      'an engine whose produce ignores the remaining headroom went unreported',
    ).toBeGreaterThan(0);
  });

  it('memory recorded on a Normal-difficulty kill is caught by memory-on-kill', () => {
    /**
     * PINS THE DESIGN DECISION, BY BREAKING IT ON PURPOSE.
     *
     * Removing `g.difficulty==="training" &&` is exactly the "tidy up the inconsistency" edit a
     * future contributor might make in good faith — and it would silently delete the lesson that
     * on Normal and Hard immunity must be EARNED BY VACCINATION rather than by surviving the
     * disease. Every other test in this repository would stay green. This one goes red.
     */
    const mutant = loadMutatedLegacy({
      name: 'memory-on-kill granted at every difficulty',
      find: 'if(g.difficulty==="training" && g.memory && !g.memory[iv.disease]',
      replace: 'if(g.memory && !g.memory[iv.disease]',
    }) as unknown as Engine;

    let violations: readonly Violation[] = [];
    for (const difficulty of ['normal', 'hard']) {
      for (let i = 0; i < 6 && violations.length === 0; i += 1) {
        const run = runGame({
          seed: 855000 + i,
          difficulty,
          engine: mutant,
          invariants: [MEMORY_ON_KILL],
        });
        violations = run.violations;
      }
      if (violations.length > 0) break;
    }
    expect(
      violations.length,
      'an engine that grants memory for surviving a disease on Normal went unreported. That ' +
        'is a deliberate design decision of the game, not an implementation detail.',
    ).toBeGreaterThan(0);
  });
});

/* ================================================================== *
 * The two serialisation invariants get their own controls
 * ================================================================== */

describe('L1/L2: the serialisation invariants, which the corpus is blind to by construction', () => {
  it('viewstate-round-trip sees a value JSON cannot carry', () => {
    // A direct probe is not possible — the invariant calls viewState itself — so the control is
    // a saboteur that plants a NaN in a field viewState DOES expose. `g.antivenom` is at
    // view.ts:106. JSON.stringify renders NaN as null; canonical() does not, which is the whole
    // reason this predicate uses canonical().
    const saboteur: Saboteur = {
      name: 'NaN in a viewState field',
      when: (g) => g.phase === 'command' && g.turn >= 2,
      apply: (g) => {
        (g as unknown as Record<string, unknown>).antivenom = NaN;
      },
    };
    let found = 0;
    for (let i = 0; i < 4 && found === 0; i += 1) {
      const run = runGame({
        seed: 860000 + i,
        difficulty: 'normal',
        saboteur,
        invariants: [VIEWSTATE_ROUND_TRIPS],
      });
      found = run.violations.length;
    }
    expect(
      found,
      'a NaN reached viewState and the round-trip invariant did not notice. If this passes ' +
        'silently the suite is using JSON.stringify somewhere it must use canonical().',
    ).toBeGreaterThan(0);
  });

  it('undo-round-trip sees an engine whose snapshot does not restore', () => {
    /**
     * THIS CONTROL FAILED ON ITS FIRST DRAFT, AND THE FAILURE IS THE REASON `Ctx` EXISTS.
     *
     * The first attempt tampered with the top of `g.undo` from a saboteur. It could never work:
     * the invariant PUSHES a fresh snapshot and immediately pops it, so the tampered one
     * underneath is never read. Worse, chasing it exposed that the invariant was calling the
     * PORT's `pushUndo` regardless of which engine produced the state — so a broken engine would
     * have been checked with a correct implementation and reported nothing.
     *
     * No state-level corruption can falsify this invariant, because the invariant is about the
     * engine's own capture-and-restore. So the control is a WRONG ENGINE: legacy's `pushUndo`
     * with `ap` dropped from the snapshot. `undo` then writes `g.ap = undefined`, which
     * `canonical()` distinguishes from a number and `JSON.stringify` would not — which is also
     * why the predicate uses `canonical()`.
     */
    const mutant = loadMutatedLegacy({
      name: 'pushUndo drops ap from the snapshot',
      find: 'ap:g.ap, antibodies:g.antibodies,',
      replace: 'antibodies:g.antibodies,',
    }) as unknown as Engine;

    let found = 0;
    for (let i = 0; i < 4 && found === 0; i += 1) {
      const run = runGame({
        seed: 870000 + i,
        difficulty: 'normal',
        engine: mutant,
        invariants: [UNDO_ROUND_TRIPS],
      });
      found = run.violations.length;
    }
    expect(
      found,
      'an engine whose undo snapshot omits a field restored cleanly, which cannot be right',
    ).toBeGreaterThan(0);
  });
});
