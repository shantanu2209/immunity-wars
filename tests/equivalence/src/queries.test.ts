/**
 * B2 CHECKPOINT — the pure query layer.
 *
 * Every function under test is `(state) => value` with no mutation, which makes a much stronger
 * proof available than action replay: harvest thousands of REAL states out of legacy games,
 * then call every query on both engines and compare. No action sequencing, and no turn engine
 * needed — B4 and B5 do not exist yet.
 *
 * Three things this is careful about:
 *
 *   1. States come from actual play, snapshotted at random turns across all three difficulties,
 *      so they contain the awkward combinations (damaged organs, spent cells, suppressed cells,
 *      lodged worms, embedded malaria, infected residents) that hand-built states never do.
 *   2. Array-returning queries are compared ORDER-SENSITIVELY. Order is load-bearing:
 *      moveDestinations feeds `ds[0]` after a sort in the bot and `opts[0]` in `hop`, so a
 *      correct set in the wrong order is a real bug.
 *   3. The port is fed the SAME state object legacy produced, not a re-derived one. That
 *      isolates the query under test from B3's state construction, which does not exist yet.
 */

import { describe, expect, it } from 'vitest';

import * as port from '@immunity-wars/engine';
import * as internal from '@immunity-wars/engine/internal';

import { augment, harvest } from './states.js';
import {
  CELL_KEYS,
  FAMILIES,
  PER_CELL,
  PER_FAMILY,
  PER_INVADER,
  PER_ORGAN,
  STATE_ONLY,
} from './query-shapes.js';
import { loadLegacy } from './engine.js';
import { canonical } from './hash.js';
import type { GameState } from './types.js';

const legacy = loadLegacy();

/* ------------------------------------------------------------------ *
 * state corpus
 * ------------------------------------------------------------------ */

/**
 * Harvested states plus synthetic ones.
 *
 * The synthetic half is not padding. The harvest inherits the reference bot's blind spots: the
 * bot never moves the Neutrophil, so it never NETs, so a SPENT Neutrophil appears in ZERO
 * harvested states — and invSpeed()'s opportunistic-fungus branch reads exactly that field. The
 * bot's capability holes would otherwise become the port's coverage holes. See src/states.ts.
 */
const HARVESTED = harvest(legacy, 25);
const SYNTHETIC = augment(HARVESTED.filter((_, i) => i % 40 === 0));
const STATES = [...HARVESTED, ...SYNTHETIC];

describe('B2: the state corpus is actually varied', () => {
  it('is large, and both halves are present', () => {
    expect(HARVESTED.length).toBeGreaterThan(1000);
    expect(SYNTHETIC.length).toBeGreaterThan(200);
  });

  it('covers all three difficulties, many turns, and non-trivial boards', () => {
    expect([...new Set(STATES.map((s) => s.difficulty))].sort()).toEqual([
      'hard',
      'normal',
      'training',
    ]);
    expect(new Set(STATES.map((s) => s.turn)).size).toBeGreaterThan(5);
    expect(STATES.some((s) => s.invaders.length > 5)).toBe(true);
  });

  it('the HARVEST alone cannot produce a spent Neutrophil — the gap synthesis exists for', () => {
    // This is a measured property of the reference bot, not an accident of these seeds:
    // no Neutrophil move -> netTargets() always empty -> the NET never fires. FINDINGS.md #1.
    expect(HARVESTED.some((s) => s.cells.neutrophil?.alive === false)).toBe(false);
    expect(SYNTHETIC.some((s) => s.cells.neutrophil?.alive === false)).toBe(true);
  });

  it('reaches the awkward states that hand-written fixtures miss', () => {
    const any = (p: (s: GameState) => boolean): boolean => STATES.some(p);
    const org = (s: GameState, o: string): { hp?: number; max?: number } | undefined => s.organs[o];
    expect(any((s) => s.organList.some((o) => (org(s, o)?.hp ?? 3) < (org(s, o)?.max ?? 3)))).toBe(
      true,
    );
    expect(any((s) => s.cells.neutrophil?.alive === false)).toBe(true);
    expect(any((s) => s.invaders.some((iv) => iv.tagged === true))).toBe(true);
    expect(any((s) => s.invaders.some((iv) => iv.type === 'hidden'))).toBe(true);
    expect(any((s) => s.invaders.some((iv) => iv.zone === 'branch'))).toBe(true);
    expect(any((s) => s.invaders.some((iv) => iv.type === 'venom'))).toBe(true);
    expect(any((s) => s.invaders.some((iv) => iv.lodged === true))).toBe(true);
    expect(any((s) => s.invaders.some((iv) => iv.inMac === true))).toBe(true);
    expect(any((s) => s.invaders.length === 0)).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * differential comparison
 * ------------------------------------------------------------------ */

type Unary = (g: unknown) => unknown;

const L = legacy as unknown as Record<string, Unary>;
const P = { ...port, ...internal } as unknown as Record<string, Unary>;

// The four groups and the two key lists moved to ./query-shapes.ts at P2.1, unchanged — same
// names, same order, same groups. They moved because P2.1's query-payload measurement needs the
// SAME argument shapes to know what a precomputing ViewState would have to carry, and a second
// copy is how two lists agree today and disagree later. Nothing about this comparison changed.

/**
 * Compare one query across every harvested state.
 *
 * Uses canonical() rather than toEqual so that array ORDER and property order both count, and
 * so NaN never silently compares equal to null.
 */
function compareAll(name: string, call: (fn: Unary, g: GameState) => unknown): void {
  const legacyFn = L[name];
  const portFn = P[name];
  expect(legacyFn, `legacy does not export ${name}`).toBeTypeOf('function');
  expect(portFn, `the port does not export ${name}`).toBeTypeOf('function');
  if (!legacyFn || !portFn) return;

  for (let i = 0; i < STATES.length; i += 1) {
    const state = STATES[i];
    if (!state) continue;
    // Fresh deep copies for each engine: a query that accidentally mutated would otherwise
    // poison the other side's input and hide itself.
    const a = call(legacyFn, JSON.parse(JSON.stringify(state)) as GameState);
    const b = call(portFn, JSON.parse(JSON.stringify(state)) as GameState);
    if (canonical(a) !== canonical(b)) {
      throw new Error(
        `${name} diverged on state #${i} (turn ${state.turn}, ${state.difficulty}, ` +
          `${state.invaders.length} invaders)\n  legacy=${canonical(a).slice(0, 400)}\n  port  =${canonical(b).slice(0, 400)}`,
      );
    }
  }
}

describe('B2: pure queries match legacy across the whole state corpus', () => {
  for (const name of STATE_ONLY) {
    it(`${name}(g)`, () => compareAll(name, (fn, g) => fn(g)));
  }

  for (const name of PER_INVADER) {
    it(`${name}(g, invader) — every invader in every state`, () => {
      compareAll(name, (fn, g) =>
        g.invaders.map((iv) => (fn as unknown as (a: unknown, b: unknown) => unknown)(g, iv)),
      );
    });
  }

  for (const name of PER_CELL) {
    it(`${name}(g, cell) — all seven cells`, () => {
      compareAll(name, (fn, g) =>
        CELL_KEYS.map((ck) => (fn as unknown as (a: unknown, b: unknown) => unknown)(g, ck)),
      );
    });
  }

  for (const name of PER_ORGAN) {
    it(`${name}(g, organ) — all seven organs`, () => {
      compareAll(name, (fn, g) =>
        g.organList.map((o) => (fn as unknown as (a: unknown, b: unknown) => unknown)(g, o)),
      );
    });
  }

  for (const name of PER_FAMILY) {
    it(`${name}(g, family) — all seven antibody pools`, () => {
      compareAll(name, (fn, g) =>
        FAMILIES.map((f) => (fn as unknown as (a: unknown, b: unknown) => unknown)(g, f)),
      );
    });
  }
});

/* ------------------------------------------------------------------ *
 * queries legacy keeps private — no counterpart to diff against
 * ------------------------------------------------------------------ */

describe('B2: private helpers, tested behaviourally', () => {
  // These four are why the rig has its own copies (docs/FINDINGS.md #12). There is no legacy
  // export to diff against, so they are pinned against the engine's observable consequences.

  it('samePlace treats the hub as one space and tissue as coordinates', () => {
    const hub = { zone: 'hub' as const, lane: null, organ: null, step: 0 };
    expect(internal.samePlace(hub, { zone: 'hub', lane: 'gut', organ: 'brain', step: 9 })).toBe(
      true,
    );
    const a = { zone: 'route' as const, lane: 'gut' as const, organ: null, step: 2 };
    expect(internal.samePlace(a, { ...a })).toBe(true);
    expect(internal.samePlace(a, { ...a, step: 3 })).toBe(false);
    expect(internal.samePlace(a, { ...a, lane: 'nose' })).toBe(false);
  });

  it('placeDist routes everything through the hub unless the tissue is shared', () => {
    const hub = { zone: 'hub' as const, step: 0 };
    expect(internal.placeDist(hub, hub)).toBe(0);
    const gut2 = { zone: 'route' as const, lane: 'gut' as const, step: 2 };
    const gut5 = { zone: 'route' as const, lane: 'gut' as const, step: 5 };
    expect(internal.placeDist(gut2, gut5)).toBe(3);
    // different lanes: out to the hub and back in
    const nose4 = { zone: 'route' as const, lane: 'nose' as const, step: 4 };
    expect(internal.placeDist(gut2, nose4)).toBe(6);
  });

  it('apFor agrees with what legacy reports as apMax', () => {
    // apFor is private, but viewState exposes it as apMax — so legacy can still be the oracle.
    for (const state of STATES.slice(0, 400)) {
      const view = legacy.viewState(JSON.parse(JSON.stringify(state)) as GameState) as {
        apMax: number;
      };
      expect(internal.apFor(JSON.parse(JSON.stringify(state)))).toBe(view.apMax);
    }
  });

  it('capFor agrees with what legacy reports as antibodyCap', () => {
    for (const state of STATES.slice(0, 400)) {
      const view = legacy.viewState(JSON.parse(JSON.stringify(state)) as GameState) as {
        antibodyCap: number;
      };
      expect(internal.capFor(JSON.parse(JSON.stringify(state)))).toBe(view.antibodyCap);
    }
  });
});

/* ------------------------------------------------------------------ *
 * the knob deviation
 * ------------------------------------------------------------------ */

describe('B2: setKnobs', () => {
  it("throws a named error for the unimplemented 'heal' knob", () => {
    // docs/DEVIATIONS.md #1. Legacy's real behaviour here is a SILENT no-op — it assigns to an
    // undeclared HEALV, which sloppy mode turns into a stray global nobody reads. The
    // ReferenceError strict mode would raise is new behaviour, not preserved behaviour, so
    // neither reproducing the throw nor the no-op is faithful. Shantanu chose to fail loudly.
    expect(() => port.setKnobs({ heal: 2 })).toThrow("setKnobs: 'heal' is not implemented");
  });

  it('accepts the knobs that legacy actually reads, and leaves SPAWN dead', () => {
    internal.resetKnobs();
    port.setKnobs({ spawn: 3 }); // dead knob — assigned, never read (docs/FINDINGS.md #7)
    expect(internal.knobs.spawn).toBe(3);
    port.setKnobs({ hubSafe: true });
    expect(internal.knobs.hubSafe).toBe(true);
    internal.resetKnobs();
    expect(internal.knobs.hubSafe).toBe(false);
  });

  it('HUB_SAFE makes the bloodstream a sanctuary, in both engines', () => {
    const hubInvader = {
      id: 'x',
      type: 'virus' as const,
      disease: 'Influenza',
      zone: 'hub' as const,
      step: 0,
    };
    internal.resetKnobs();
    expect(port.attackable(hubInvader)).toBe(true);
    port.setKnobs({ hubSafe: true });
    expect(port.attackable(hubInvader)).toBe(false);
    legacy.setKnobs({ hubSafe: true });
    expect(legacy.attackable(hubInvader)).toBe(false);
    internal.resetKnobs();
    legacy.setKnobs({ hubSafe: false });
  });
});
