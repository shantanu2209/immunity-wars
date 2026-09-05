/**
 * CP4 — THE BODY'S OFFERS ARE HONEST ABOUT WHAT THEY COST, and only exist where the rule says.
 *
 * The offered ⊆ accepted harness proves the engine ACCEPTS every body offer. This file pins
 * the things acceptance cannot see: `vaccinate` and `orderAntivenom` take an amount and the
 * engine CLAMPS a larger one to what is left — so "+2" at 1 AP would be accepted while
 * spending 1, a mislabelled button. Every amount offered must be exactly what the engine will
 * spend: within the AP, and within what the progress still needs. And the rows the panel
 * shows follow the engine's own gates: no vaccine on Training (immunity comes from
 * surviving), no clone search before an unknown antigen has been met, no antivenom dose
 * without stock.
 *
 * On recorded states, read through the session, as the panel reads them.
 */

import { describe, expect, it } from 'vitest';

import { ANTIVENOM_ORDER, VACCINE_COST } from '@immunity-wars/content';
import type { GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage, type SessionView } from '@immunity-wars/session';
import { bodyOffers } from '@immunity-wars/ui';

import { SEARCH_SEEDS, clone, commandStates } from './constructed.js';

type Raw = Record<string, unknown>;

function view(state: GameState): SessionView {
  const s = LocalSession.resume(clone(state), { storage: new MemoryStorage(), now: () => 0 });
  const v = s.getView();
  s.dispose();
  return v;
}

describe('CP4: the body panel offers exactly what the engine will spend', () => {
  let states = 0;
  let plus2 = 0;
  let vaccineOffers = 0;
  let trainingStates = 0;
  let cloneOffers = 0;
  let antivenomDoses = 0;
  const wrong: string[] = [];
  for (const seed of SEARCH_SEEDS.slice(0, 4)) {
    for (const difficulty of ['training', 'normal', 'hard']) {
      for (const st of commandStates(seed, difficulty, 100)) {
        states += 1;
        const v = view(st);
        const g = v.game as Raw;
        const ap = Number(g['ap'] ?? 0);
        const o = bodyOffers(v);
        if (difficulty === 'training') trainingStates += 1;
        for (const b of o.buttons) {
          if (b.action === 'vaccinate') {
            vaccineOffers += 1;
            if (difficulty === 'training') wrong.push(`${b.id}: vaccinate offered on Training`);
            const need =
              VACCINE_COST -
              Number(((g['vaccine'] as Raw | undefined) ?? {})[String(b.disease)] ?? 0);
            if ((b.amount ?? 0) > ap || (b.amount ?? 0) > need)
              wrong.push(
                `${b.id}: amount ${String(b.amount)} with ap ${String(ap)}, need ${String(need)}`,
              );
            if (b.amount === 2) plus2 += 1;
          }
          if (b.action === 'orderAntivenom') {
            const need = ANTIVENOM_ORDER - Number(g['avOrder'] ?? 0);
            if ((b.amount ?? 0) > ap || (b.amount ?? 0) > need)
              wrong.push(
                `${b.id}: amount ${String(b.amount)} with ap ${String(ap)}, need ${String(need)}`,
              );
            if (b.amount === 2) plus2 += 1;
          }
          if (b.action === 'clonalSelection') {
            cloneOffers += 1;
            if (g['novelSeen'] !== true || g['cloneFound'] === true)
              wrong.push('clonalSelection offered without an unknown antigen to search for');
          }
        }
        for (const t of o.board) {
          if (t.action === 'antivenom') {
            antivenomDoses += 1;
            if (Number(g['antivenom'] ?? 0) <= 0) wrong.push('antivenom offered with no stock');
            if (ap < 3) wrong.push('antivenom offered under 3 AP');
          }
          if (t.action === 'memoryKill' && difficulty === 'hard' && ap < 1)
            wrong.push('memory response offered on Hard at 0 AP');
        }
      }
    }
  }

  it('walked enough of the corpus to mean something (vacuity guards)', () => {
    expect(states).toBeGreaterThan(200);
    expect(trainingStates).toBeGreaterThan(0);
    expect(vaccineOffers, 'no vaccine was ever offered').toBeGreaterThan(0);
    expect(
      plus2,
      'a +2 button was never offered — the clamp rule was never exercised',
    ).toBeGreaterThan(0);
    expect(cloneOffers, 'the clone search was never offered').toBeGreaterThan(0);
    expect(antivenomDoses, 'an antivenom dose was never offered').toBeGreaterThan(0);
  });

  it('every amount is within the AP and within the need; every row follows its gate', () => {
    expect(wrong, wrong.slice(0, 10).join('\n')).toEqual([]);
  });

  it('CONTROL: a +2 at 1 AP would be caught by the same check', () => {
    // The check is a predicate on (amount, ap, need); a mislabelled button must fail it.
    const amount = 2;
    const ap = 1;
    const need = 3;
    expect(amount > ap || amount > need).toBe(true);
  });
});
