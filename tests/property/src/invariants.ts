/**
 * The invariants.
 *
 * Each one is a claim about what the engine must never do, checked against states produced by
 * generated LEGAL play. Read `../README.md` first for why this suite exists at all — the short
 * version is that the equivalence corpus is an oracle for AGREEMENT, not for correctness, and a
 * bug-for-bug port is green on a violation both engines share.
 *
 * THREE OF THE BRIEF'S SEVEN WERE WRONG AND ARE NOT WRITTEN AS STATED.
 *
 *   §7 "antibodies never exceed the per-family cap"  — FALSE in legal play. docs/FINDINGS.md #27
 *   §7 "turn number never decreases"                 — cannot fail; wrong shape. See
 *                                                      undo-snapshot.test.ts
 *   §7 "killing the last invader records memory"     — only on Training, by design. See
 *                                                      MEMORY_ON_KILL below
 *
 * Every invariant here reports `checked` as well as `violations`, because an invariant that was
 * never applicable is not a passing invariant — it is a check that has never run. The runner
 * enforces a floor on each. See `runner.ts`.
 */

import { AB_CAP_FAM_BY_DIFF, ROUTES } from '@immunity-wars/content';
import * as portNs from '@immunity-wars/engine';
import { canonical } from '@immunity-wars/equivalence/hash';
import type { Action, ActionResult, GameState } from '@immunity-wars/equivalence/types';

/**
 * Board geometry is read from the CONTENT PACK, never from the engine under test.
 *
 * An invariant that asked the engine for its own expected value would be checking the engine
 * against itself and could not fail. `branchLen` is a pure function of `content/board`, and the
 * boundary invariant guarantees the engine's copy IS content's (exports.test.ts), so taking it
 * from the port here is a fixed reference rather than a self-comparison.
 */
const geometry = portNs as unknown as { branchLen: (organ: string) => number };

/**
 * What an invariant is handed alongside the state.
 *
 * `engine` is THE ENGINE THAT PRODUCED THIS STATE, not a module-level import. That distinction
 * was found by a negative control that failed to fire: the undo round-trip invariant called the
 * port's `pushUndo` while a deliberately-broken engine was producing the states, so it exercised
 * a correct implementation against a corrupt game and reported nothing. An invariant about an
 * engine's own machinery has to run THAT engine's machinery.
 */
export interface Ctx {
  readonly engine: EngineUnderTest;
}

export interface EngineUnderTest {
  capFam(g: GameState, f: string): number;
  pushUndo(g: GameState): void;
  undo(g: GameState): unknown;
  viewState(g: GameState): Record<string, unknown>;
}

const FAMILIES = ['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK', 'X'] as const;

/** Actions that can remove an invader WITHOUT running the spread phase. */
const KILL_ACTIONS = new Set([
  'neutralise',
  'engulf',
  'resengulf',
  'snipe',
  'nkkill',
  'memoryKill',
  'strike',
  'degranulate',
  'net',
  'antivenom',
]);

/** Actions that commit a specific cell to acting. `a.cell` names it. */
const CELL_ACTIONS = new Set([
  'move',
  'strike',
  'degranulate',
  'net',
  'snipe',
  'nkkill',
  'engulf',
  'produce',
]);

export interface Violation {
  readonly invariant: string;
  readonly detail: string;
  readonly turn: number;
  readonly action: string;
}

/** Handed to each invariant so it can record work done as well as work failed. */
export interface Report {
  /** Call once per thing actually examined. A checked count of 0 fails the run. */
  checked(n?: number): void;
  violate(detail: string): void;
}

export interface Invariant {
  readonly id: string;
  readonly title: string;
  /** Optional pre-action observation. Its return value is handed back to `after`. */
  before?(ctx: Ctx, g: GameState, a: Action): unknown;
  after(ctx: Ctx, g: GameState, a: Action, r: ActionResult, pre: unknown, report: Report): void;
}

/* ------------------------------------------------------------------ *
 * 1. AP is never negative
 * ------------------------------------------------------------------ */

/**
 * Single-player `spendAP` is a bare `g.ap -= amount` (ap.ts:27) — the `Math.max(0, …)` clamp
 * exists only on the multiplayer branch. So nothing structural keeps this true; what keeps it
 * true is that every one of the 27 actions guards its own cost before spending. That is 27
 * independent chances to be wrong, which is precisely the shape worth testing generatively
 * rather than by hand.
 *
 * NOTE THE SPELLING. `Number.isFinite(ap) && ap >= 0` is written out rather than negated,
 * because `!(ap < 0)` is TRUE for NaN and would let exactly the docs/FINDINGS.md #20 defect
 * through. The negative control feeds NaN to prove this predicate sees it.
 */
export const AP_NON_NEGATIVE: Invariant = {
  id: 'ap-non-negative',
  title: 'AP is never negative, and never NaN',
  after(_ctx, g, _a, _r, _pre, report) {
    report.checked();
    if (!(Number.isFinite(g.ap) && g.ap >= 0)) {
      report.violate(`g.ap = ${String(g.ap)}`);
    }
    const budget = g['apBudget'] as Record<string, number> | undefined;
    if (budget) {
      for (const [pid, v] of Object.entries(budget)) {
        report.checked();
        if (!(Number.isFinite(v) && v >= 0)) report.violate(`g.apBudget[${pid}] = ${String(v)}`);
      }
    }
  },
};

/* ------------------------------------------------------------------ *
 * 2. Placement coherence
 * ------------------------------------------------------------------ */

/**
 * The brief says "no invader occupies two locations". Read literally that is unfalsifiable — an
 * invader is one record with one `zone`. The falsifiable claim is that the fields the zone makes
 * AUTHORITATIVE are present and in range.
 *
 * And the obvious stronger version is WRONG, which is why this is spelled out. `lane` is never
 * cleared when an invader leaves its route: `makeInvader` sets it from the card and the march
 * (spread.ts:537, :547) rewrites `zone`, `organ` and `step` while leaving `lane` alone. So a
 * branch invader legitimately still carries the lane it entered through. Asserting `branch ⇒
 * lane === null` would have gone red on the first game and been "fixed" by weakening it, which
 * is how a real invariant gets quietly deleted.
 *
 * What IS load-bearing: `zone === 'branch'` with a null `organ` reaches
 * `ORGANS[iv.organ].name` in spread.ts and throws.
 */
export const PLACEMENT_COHERENCE: Invariant = {
  id: 'placement-coherence',
  title: 'every invader is somewhere the board actually has',
  after(_ctx, g, _a, _r, _pre, report) {
    for (const iv of g.invaders) {
      report.checked();
      if (iv.zone === 'route') {
        const route = (ROUTES as Record<string, { len: number } | undefined>)[iv.lane ?? ''];
        if (!route) {
          report.violate(`${iv.disease} on route with unknown lane ${String(iv.lane)}`);
          continue;
        }
        if (!(iv.step >= 0 && iv.step <= route.len)) {
          report.violate(`${iv.disease} at ${iv.lane} step ${iv.step}, route length ${route.len}`);
        }
      } else if (iv.zone === 'branch') {
        if (!iv.organ) {
          report.violate(`${iv.disease} on a branch with no organ — ORGANS[null] throws`);
          continue;
        }
        const len = geometry.branchLen(iv.organ);
        if (!(iv.step >= 0 && iv.step <= len)) {
          report.violate(`${iv.disease} at ${iv.organ} step ${iv.step}, branch length ${len}`);
        }
      } else if (iv.zone === 'hub') {
        if (iv.step !== 0) report.violate(`${iv.disease} in the hub at step ${iv.step}`);
      } else {
        report.violate(`${iv.disease} in unknown zone ${String(iv.zone)}`);
      }
    }
  },
};

/* ------------------------------------------------------------------ *
 * 3a. The standing antibody ceiling
 * ------------------------------------------------------------------ */

/**
 * NOT the brief's invariant. The brief says antibodies never exceed `capFam`, and that is false
 * in ordinary play — 288 of 1200 measured games reach it, because a damaged liver lowers
 * `capFam` to 2 without touching stores already made. The full measurement and the immunology
 * (reduced synthesis does not destroy circulating antibody) are docs/FINDINGS.md #27.
 *
 * What is true, across 793,408 measured pool checks with zero violations, is the ceiling: no
 * pool ever exceeds the difficulty's UNDAMAGED cap. That is the number production is allowed to
 * reach, and it is falsifiable — affinity maturation lets `rateForFam` exceed the rate ceiling
 * on Training, and `passiveAntibodies` writes stores directly.
 */
export const ANTIBODY_CEILING: Invariant = {
  id: 'antibody-ceiling',
  title: "no antibody pool exceeds the difficulty's undamaged cap",
  after(_ctx, g, _a, _r, _pre, report) {
    const ceiling = (AB_CAP_FAM_BY_DIFF as Record<string, number>)[g.difficulty];
    if (ceiling === undefined) {
      report.checked();
      report.violate(`no undamaged cap defined for difficulty ${g.difficulty}`);
      return;
    }
    for (const f of FAMILIES) {
      report.checked();
      const have = g.ab[f] ?? 0;
      if (!(Number.isFinite(have) && have <= ceiling)) {
        report.violate(`${f} = ${String(have)}, ceiling ${ceiling} on ${g.difficulty}`);
      }
    }
  },
};

/* ------------------------------------------------------------------ *
 * 3b. Production respects the cap in force at the moment it writes
 * ------------------------------------------------------------------ */

/**
 * This is the real "the cap is respected" claim, and it is checked AT THE WRITE rather than over
 * the state. That is what makes it survive the cap moving underneath a legally-made store — the
 * distinction that #27 turns on.
 */
export const PRODUCTION_RESPECTS_CAP: Invariant = {
  id: 'production-respects-cap',
  title: 'produce never raises a pool above the cap in force when it writes',
  before(ctx, g, a) {
    if (a.action !== 'produce') return null;
    const f = String(a.family ?? '');
    return { family: f, cap: ctx.engine.capFam(g, f), had: g.ab[f] ?? 0 };
  },
  after(_ctx, g, a, r, pre, report) {
    const p = pre as { family: string; cap: number; had: number } | null;
    if (!p || !r.ok) return;
    report.checked();
    const now = g.ab[p.family] ?? 0;
    if (now > p.cap) {
      report.violate(`produce ${p.family}: ${p.had} -> ${now}, cap was ${p.cap}`);
    }
    if (now < p.had) {
      report.violate(`produce ${p.family} REDUCED the pool: ${p.had} -> ${now}`);
    }
  },
};

/* ------------------------------------------------------------------ *
 * 4. A dead cell never acts
 * ------------------------------------------------------------------ */

/**
 * The Neutrophil is spent by its NET and the Eosinophil by regeneration, so both spend real
 * turns at `alive: false`. Nothing centralises the check — each action tests `alive` itself, or
 * does not.
 */
export const NO_DEAD_CELL_ACTS: Invariant = {
  id: 'no-dead-cell-acts',
  title: 'an action never succeeds for a cell that was dead when it started',
  before(ctx, g, a) {
    if (!CELL_ACTIONS.has(a.action)) return null;
    const ck = String(a.cell ?? '');
    const cell = g.cells[ck];
    if (!cell) return null;
    return { ck, aliveBefore: cell.alive !== false };
  },
  after(_ctx, _g, a, r, pre, report) {
    const p = pre as { ck: string; aliveBefore: boolean } | null;
    if (!p) return;
    report.checked();
    if (r.ok && !p.aliveBefore) {
      report.violate(`${a.action} succeeded for ${p.ck}, which was not alive`);
    }
  },
};

/* ------------------------------------------------------------------ *
 * 5. Serialisation round-trips
 * ------------------------------------------------------------------ */

/**
 * THE CORPUS IS BLIND TO THIS BY CONSTRUCTION, which is why it is here.
 *
 * `rig.ts`'s `normalise()` runs `JSON.parse(JSON.stringify(g))` on BOTH engines before hashing.
 * Anything a JSON round-trip destroys is destroyed identically on both sides, the hashes still
 * match, and 6,000 games say nothing about it. `hash.test.ts` proves `canonical()` can SEE such
 * differences; nothing until now asked whether the engine's own state survives one.
 *
 * `viewState` is the projection that crosses the wire and lands in a save file, so a value it
 * cannot survive is a value the client never sees correctly. `g.apBudget` is in there
 * (view.ts:100) and docs/FINDINGS.md #20 is exactly a NaN reaching it.
 *
 * `canonical()` and not `JSON.stringify`: the latter renders NaN and undefined as `null` and so
 * cannot tell a survived round-trip from a destroyed one — it would pass on the failure.
 */
export const VIEWSTATE_ROUND_TRIPS: Invariant = {
  id: 'viewstate-round-trip',
  title: 'viewState survives a JSON round-trip unchanged',
  after(ctx, g, _a, _r, _pre, report) {
    report.checked();
    const v = ctx.engine.viewState(g);
    const before = canonical(v);
    const after = canonical(JSON.parse(JSON.stringify(v)));
    if (before !== after) {
      const at = firstDifference(before, after);
      report.violate(`viewState changed under JSON round-trip near ${at}`);
    }
  },
};

/**
 * THE SAME PROPERTY, OVER THE WHOLE STATE — the precondition `Storage` is built on.
 *
 * WHY THIS IS NOT COVERED BY THE ONE ABOVE. `viewState` is a PROJECTION, and it drops 13 of
 * `GameState`'s 53 keys: `_actingPid`, `complement`, `deck`, `discard`, `drawnList`, `events`,
 * `everInfected`, `fx`, `novelTurn`, `stats`, `undo`, `wormsSpawned`, `wormsThisTurn`. It reports
 * `deckCount: 95` and not the 95 cards. So a value JSON destroys, sitting in any of those 13, is
 * invisible to `viewstate-round-trip` — and `negative-control.test.ts` demonstrates exactly that
 * rather than leaving it as an argument.
 *
 * WHY IT MATTERS NOW, at P2.1 rather than whenever someone gets to it. Phase 2 builds `Storage`,
 * whose consumer is `Session` and whose serialisation unit is `GameState` — a game cannot be
 * resumed from a `viewState`, because the deck is not in one (docs/PHASE2_BRIEF.md v1.1 §3,
 * review item B). Before this invariant, the strongest thing anyone could say about that was that
 * ONE state had been observed to survive `JSON.parse(JSON.stringify(…))` byte-identically. One
 * state is not an invariant, and `Storage` would have been built on it.
 *
 * docs/PHASE1_BRIEF.md §7 listed a "Serialisation — every reachable state round-trips
 * identically" suite. It was never built (`tests/suites.json` has four suites and that is not one
 * of them). This is the half of it that Phase 2 actually depends on, put where the other
 * round-trip property already lives rather than in a new suite that would carry one check.
 *
 * `canonical()` and not `JSON.stringify`, for the same reason as above: `JSON.stringify` renders
 * both `NaN` and `undefined` as `null`, so it cannot tell a survived round-trip from a destroyed
 * one and would pass on the failure.
 */
export const GAMESTATE_ROUND_TRIPS: Invariant = {
  id: 'gamestate-round-trip',
  title: 'the whole GameState survives a JSON round-trip unchanged',
  after(_ctx, g, _a, _r, _pre, report) {
    report.checked();
    const before = canonical(g);
    const after = canonical(JSON.parse(JSON.stringify(g)) as GameState);
    if (before !== after) {
      report.violate(
        `GameState changed under JSON round-trip near ${firstDifference(before, after)}`,
      );
    }
  },
};

/**
 * The engine's only genuine capture-and-restore. `pushUndo` snapshots 15 fields and `undo`
 * writes them back, so push-then-pop must be the identity.
 *
 * Run on the LIVE state on purpose. Copying it first would send the state through
 * `JSON.parse(JSON.stringify(…))` — destroying exactly the values this is trying to catch before
 * the check ever sees them. That is the Task C5b shape: an oracle regenerated before it is read.
 * A push immediately followed by a pop leaves the stack where it was, so a correct engine is
 * unaffected; an incorrect one corrupts the run, which is the finding rather than a hazard.
 */
export const UNDO_ROUND_TRIPS: Invariant = {
  id: 'undo-round-trip',
  title: 'pushUndo followed by undo is the identity',
  after(ctx, g, _a, _r, _pre, report) {
    if (g.phase !== 'command') return; // beginCommand clears the stack; outside it, undo is a no-op
    report.checked();
    const before = canonical(g);
    ctx.engine.pushUndo(g);
    ctx.engine.undo(g);
    const after = canonical(g);
    if (before !== after) {
      report.violate(`pushUndo/undo changed the state near ${firstDifference(before, after)}`);
    }
  },
};

/* ------------------------------------------------------------------ *
 * 6. Memory is recorded exactly once, and ONLY on Training
 * ------------------------------------------------------------------ */

/**
 * PINS A DESIGN DECISION, NOT AN IMPLEMENTATION DETAIL.
 *
 * The brief states this invariant unconditionally: "killing the last invader of a disease always
 * records memory, exactly once". The engine does that on TRAINING ONLY (effects.ts:67). On
 * Normal and Hard, surviving a disease grants nothing — immunity must be EARNED BY VACCINATION.
 *
 * That is deliberate and it is biologically pointed: it is the difference between recovering from
 * an illness and being protected from one, and it is why `vaccinate` is the only route to memory
 * at the difficulties people actually play. A port that "tidied" this into a consistent rule
 * would have deleted the lesson while every other test stayed green, so the difficulty-
 * conditional form is asserted in BOTH directions — set on Training, NOT set on Normal/Hard.
 *
 * Scope, stated because it is a real limit: only command-phase kill actions are examined. During
 * `endCommand` an invader can also leave `g.invaders` by ARRIVING at an organ, which is not a
 * kill and correctly records nothing — checking there would report false violations.
 */
export const MEMORY_ON_KILL: Invariant = {
  id: 'memory-on-kill',
  title: 'a kill records memory on Training, and never on Normal or Hard',
  before(ctx, g, a) {
    if (!KILL_ACTIONS.has(a.action)) return null;
    return {
      diseases: g.invaders.map((iv) => iv.disease),
      memory: { ...g.memory },
    };
  },
  after(_ctx, g, a, r, pre, report) {
    const p = pre as { diseases: string[]; memory: Record<string, boolean> } | null;
    if (!p || !r.ok) return;

    const remaining = new Set(g.invaders.map((iv) => iv.disease));
    const cleared = [...new Set(p.diseases)].filter((dz) => !remaining.has(dz));

    for (const dz of cleared) {
      report.checked();
      const had = Boolean(p.memory[dz]);
      const has = Boolean(g.memory[dz]);
      if (g.difficulty === 'training') {
        if (!has) {
          report.violate(`${a.action} killed the last ${dz} on Training and recorded no memory`);
        }
      } else if (has && !had) {
        report.violate(
          `${a.action} killed the last ${dz} on ${g.difficulty} and recorded memory — ` +
            'immunity must be earned by vaccination at this difficulty (docs/FINDINGS.md, effects.ts:67)',
        );
      }
    }

    // "Exactly once" — memory is a boolean map, so the failure shape is a key going back to
    // false and then true again. Nothing but `undo` may un-set one, and `undo` is not a kill.
    for (const dz of Object.keys(p.memory)) {
      if (p.memory[dz] && !g.memory[dz]) {
        report.checked();
        report.violate(`${a.action} un-set memory for ${dz}`);
      }
    }
  },
};

/* ------------------------------------------------------------------ *
 * 9. The last frame of a burst IS the authoritative state
 * ------------------------------------------------------------------ */

/**
 * `endCommand` returns a `Frame[]`, not a state — up to 9 frames, each carrying a full
 * `viewState` (docs/FINDINGS.md #31). This asserts that **the last frame equals the state the
 * action actually left behind**.
 *
 * WHY IT IS AN INVARIANT AND NOT A MEASUREMENT. It was first measured while assessing seam 1 —
 * 908 of 908 bursts, 4,131 frames — and a measurement is a statement about the past. This is
 * load-bearing for the future, in two places:
 *
 *   1. **It licenses splitting `view` from `burst` in the Session interface.** The burst is
 *      presentation and the view is authority; that separation is only sound because a consumer
 *      which ignores every frame still lands on the right state.
 *   2. **Reconnection depends on it.** A client that drops mid-burst — a phone that slept, a
 *      relay that reconnected — resyncs by taking the authoritative view. If the tail could
 *      differ, the last thing the player saw would not be the state the game is in, and the
 *      disagreement would be invisible until they acted on it.
 *
 * So if it ever stops being true it has to fail loudly, here, rather than be rediscovered in
 * Phase 3 as a desync nobody can reproduce.
 *
 * Compared with `canonical()` rather than `toEqual`, because property ORDER is part of the
 * claim — the same reason every other comparison in this repository uses it.
 */
export const BURST_TAIL_IS_AUTHORITATIVE: Invariant = {
  id: 'burst-tail-authoritative',
  title: 'the last frame of an endCommand burst equals the post-action viewState',
  after(ctx, g, _a, r, _pre, report) {
    const frames = (r as { frames?: { view?: unknown; label?: string }[] }).frames;
    if (!frames || frames.length === 0) return; // not a burst-producing action
    report.checked();

    const last = frames[frames.length - 1];
    const tail = canonical(last?.view);
    const authoritative = canonical(ctx.engine.viewState(g));
    if (tail !== authoritative) {
      report.violate(
        `last frame ("${last?.label ?? '?'}", ${frames.length} in burst) is not the ` +
          `post-action state — ${firstDifference(tail, authoritative)}`,
      );
    }
  },
};

export const ALL_INVARIANTS: readonly Invariant[] = [
  AP_NON_NEGATIVE,
  PLACEMENT_COHERENCE,
  ANTIBODY_CEILING,
  PRODUCTION_RESPECTS_CAP,
  NO_DEAD_CELL_ACTS,
  VIEWSTATE_ROUND_TRIPS,
  GAMESTATE_ROUND_TRIPS,
  UNDO_ROUND_TRIPS,
  MEMORY_ON_KILL,
  BURST_TAIL_IS_AUTHORITATIVE,
];

/** Locate roughly where two canonical strings part company, so a failure names a field. */
function firstDifference(a: string, b: string): string {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return `offset ${i}: ${JSON.stringify(a.slice(Math.max(0, i - 40), i + 40))} vs ${JSON.stringify(
    b.slice(Math.max(0, i - 40), i + 40),
  )}`;
}
