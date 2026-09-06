/**
 * THE BREAKDOWN QUERIES AGREE WITH THE NUMBERS THEY EXPLAIN (P2.5, 6 September 2026).
 *
 * `apBreakdown` and `regenBreakdown` are additive engine queries on the `./internal` entry
 * point: they return the TERMS behind two numbers the UI shows (the Action Point total, and
 * the turn a spent cell returns) so the UI lists causes instead of re-deriving them.
 * `neutrophilReadyTurn` is untouched; `apFor` became a wrapper over `apBreakdown(g).total`
 * (ruled the same day: one rule in one place). Shantanu's condition on the addition (6
 * September 2026): the explanation must not be able to drift from the number it explains.
 * This is the check that makes that a property rather than a hope — on every harvested and
 * synthetic state, the terms sum to the total and the total is what LEGACY reports as
 * `apMax`, the oracle that computed it the old way and never changes.
 *
 * Coverage: this suite is inside `vitest.coverage.config.ts`'s include list, so the new
 * functions count toward the engine gate through it, and every term kind is required to occur
 * (vacuity guards), with constructed states for the kinds the harvest cannot reach.
 */
import { describe, expect, it } from 'vitest';

import * as port from '@immunity-wars/engine';
import * as internal from '@immunity-wars/engine/internal';

import { loadLegacy } from './engine.js';
import { augment, harvest } from './states.js';
import type { GameState } from './types.js';

const legacy = loadLegacy();
const HARVESTED = harvest(legacy, 12);
const SYNTHETIC = augment(HARVESTED.filter((_, i) => i % 40 === 0));
const STATES: GameState[] = [...HARVESTED, ...SYNTHETIC];

type Eng = Parameters<typeof internal.apFor>[0];
const eng = (s: GameState): Eng => JSON.parse(JSON.stringify(s)) as Eng;
const sum = (terms: readonly { delta: number }[]): number => terms.reduce((n, t) => n + t.delta, 0);

/**
 * The predicate the suite applies — named so the control can aim a wrong breakdown at it.
 * The oracle is LEGACY's number (its `viewState.apMax`), not the port's `apFor`: since the
 * wrapper ruling of 6 September 2026 `apFor` IS `apBreakdown(g).total`, so comparing the two
 * would prove nothing. Legacy computed the total the old way and never changes.
 */
function agrees(s: GameState, b: { total: number; terms: readonly { delta: number }[] }): boolean {
  const view = legacy.viewState(JSON.parse(JSON.stringify(s)) as GameState) as { apMax: number };
  return b.total === view.apMax && sum(b.terms) === b.total;
}

/* Constructed states for the term kinds a bot game rarely produces. Found, then edited. */
function withFloor(base: GameState): GameState {
  const s = JSON.parse(JSON.stringify(base)) as GameState;
  s.fx.apMod = -20;
  return s;
}
function withHelpedNeutrophil(base: GameState): GameState {
  const s = JSON.parse(JSON.stringify(base)) as GameState & Record<string, unknown>;
  const cells = s.cells as unknown as Record<string, Record<string, unknown>>;
  const n = cells['neutrophil'];
  const h = cells['helper'];
  if (n) Object.assign(n, { alive: false, spentAt: s.turn, regenAt: s.turn + 4 });
  if (h) Object.assign(h, { zone: 'hub', lane: null, organ: null, step: 0 });
  (s as Record<string, unknown>)['presentations'] = 5;
  return s as GameState;
}
function withMarrowBroken(base: GameState): GameState {
  const s = withHelpedNeutrophil(base) as GameState & Record<string, unknown>;
  const organs = s.organs as unknown as Record<string, Record<string, unknown>>;
  const m = organs['marrow'];
  if (m) Object.assign(m, { hp: 1, compensated: false });
  return s as GameState;
}

describe('apBreakdown: the terms sum to the total, and the total is apFor', () => {
  const kinds = { base: 0, drain: 0, organ: 0, event: 0, floor: 0 };
  const problems: string[] = [];
  const all = [...STATES, ...STATES.slice(0, 3).map(withFloor)];
  for (const s of all) {
    const g = eng(s);
    const b = internal.apBreakdown(g);
    if (!agrees(s, b))
      problems.push(
        `turn ${String(s.turn)} ${s.difficulty}: total ${String(b.total)} apFor ${String(internal.apFor(g))} sum ${String(sum(b.terms))}`,
      );
    for (const t of b.terms) kinds[t.kind] += 1;
    // Every organ term names a real organ that IS damaged; every drain term a real invader.
    for (const t of b.terms) {
      if (t.kind === 'organ' && (t.organ === undefined || !internal.damaged(g, t.organ)))
        problems.push(`organ term without a damaged organ at turn ${String(s.turn)}`);
      if (t.kind === 'drain' && !g.invaders.some((iv) => iv.disease === t.disease))
        problems.push(`drain term for an absent invader at turn ${String(s.turn)}`);
    }
  }

  it('holds on every state', () => {
    expect(all.length).toBeGreaterThan(300);
    expect(problems, problems.slice(0, 5).join('\n')).toEqual([]);
  });

  it('every term kind occurred (vacuity guards)', () => {
    for (const [k, n] of Object.entries(kinds)) expect(n, `${k} never occurred`).toBeGreaterThan(0);
  });

  it('CONTROL: a breakdown that forgot the heart is caught by the same predicate', () => {
    const damagedHeart = all.find((s) => {
      const g = eng(s);
      return internal.apBreakdown(g).terms.some((t) => t.kind === 'organ' && t.organ === 'heart');
    });
    expect(damagedHeart, 'no state with a damaged heart to aim the control at').toBeDefined();
    if (!damagedHeart) return;
    const g = eng(damagedHeart);
    const honest = internal.apBreakdown(g);
    const forgetful = {
      total: honest.total + 1,
      terms: honest.terms.filter((t) => !(t.kind === 'organ' && t.organ === 'heart')),
    };
    expect(agrees(damagedHeart, honest)).toBe(true);
    expect(agrees(damagedHeart, forgetful)).toBe(false);
  });
});

describe("regenBreakdown: the return turn is the engine's, and the why matches the rule", () => {
  const seen = { spent: 0, helped: 0, marrow: 0, eosinophil: 0 };
  const problems: string[] = [];
  const spentBase = STATES.find((s) => {
    const cells = s.cells as Record<string, { alive?: boolean } | undefined>;
    return cells['neutrophil']?.alive === false;
  });
  const all = [
    ...STATES,
    ...(spentBase ? [withHelpedNeutrophil(spentBase), withMarrowBroken(spentBase)] : []),
  ];
  for (const s of all) {
    const g = eng(s);
    const r = internal.regenBreakdown(g);
    const n = g.cells.neutrophil;
    if (n && !n.alive) {
      seen.spent += 1;
      if (!r.neutrophil) {
        problems.push('spent Neutrophil without a breakdown');
        continue;
      }
      const broken = internal.marrowBroken(g);
      const expected = broken ? null : port.neutrophilReadyTurn(g);
      if (r.neutrophil.readyTurn !== expected) problems.push('Neutrophil readyTurn ≠ engine');
      if (r.neutrophil.marrowBroken !== broken) problems.push('marrowBroken flag ≠ engine');
      if (r.neutrophil.helped) seen.helped += 1;
      if (broken) seen.marrow += 1;
      if (r.neutrophil.helped && r.neutrophil.wait !== 2) problems.push('helped wait is not 2');
      if (!r.neutrophil.helped && r.neutrophil.wait !== 4) problems.push('unhelped wait is not 4');
    } else if (r.neutrophil !== null) {
      problems.push('a breakdown for a Neutrophil that is not spent');
    }
    const e = g.cells.eosinophil;
    if (e && !e.alive) {
      seen.eosinophil += 1;
      if (r.eosinophil?.readyTurn !== (e.regenAt ?? null))
        problems.push('Eosinophil readyTurn ≠ regenAt');
    } else if (r.eosinophil !== null) {
      problems.push('a breakdown for an Eosinophil that is not spent');
    }
  }

  it('holds on every state', () => {
    expect(problems, problems.slice(0, 5).join('\n')).toEqual([]);
  });

  it('each case occurred (vacuity guards)', () => {
    for (const [k, n] of Object.entries(seen)) expect(n, `${k} never occurred`).toBeGreaterThan(0);
  });
});
