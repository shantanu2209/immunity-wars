/**
 * THE ONE PRODUCE BUTTON (ruled 25 September 2026, after the first game on the live server): for the
 * class the player chose, `produceFor` answers either the offer to send or why there is none.
 *
 * Held on recorded games, for every class at every command-phase state:
 *   - exactly one of the two is ever set, so the button always answers;
 *   - the offer is `produceOffers`' own for that class, never a second decision about what is legal
 *     (that one is held to the engine by `offered.test.ts` and to the room by `table-offers.test.ts`);
 *   - and it answers every way it can: an offer, and each kind of reason, are all met somewhere,
 *     so a clean run is not an empty one.
 */
import { describe, expect, it } from 'vitest';

import { LocalSession, MemoryStorage, type SessionView } from '@immunity-wars/session';
import { EVERY_SEAT, produceFor, produceOffers, type SeatRule } from '@immunity-wars/ui';

import { clone, commandStates } from './constructed.js';

const FAMILIES = ['ENV', 'NAK', 'EXB', 'ICB', 'TOX', 'EUK', 'X'];
const SEEDS = [0x51de, 0x7f2a];

function viewOf(state: unknown, family: string | null): SessionView {
  const s = LocalSession.resume(clone(state) as never, {
    storage: new MemoryStorage(),
    now: () => 0,
  });
  s.setSelection({ cell: null, family, resident: null });
  const v = s.getView();
  s.dispose();
  return v;
}

describe('the one Produce button', () => {
  const states = SEEDS.flatMap((seed) =>
    ['training', 'normal', 'hard'].flatMap((d) => commandStates(seed, d, 40)),
  );
  const reasons = new Map<string, number>();
  let offers = 0;
  const problems: string[] = [];
  for (const st of states) {
    for (const family of FAMILIES) {
      const view = viewOf(st, family);
      const r = produceFor(view, family);
      if ((r.offer === null) === (r.reason === null)) problems.push(`${family}: both or neither`);
      const own = produceOffers(view).find((o) => o.family === family) ?? null;
      if ((own?.id ?? null) !== (r.offer?.id ?? null))
        problems.push(`${family}: not produceOffers' offer`);
      if (r.offer) offers += 1;
      if (r.reason) reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
    }
  }

  it('always answers, and only ever with the offer produceOffers makes', () => {
    expect(states.length).toBeGreaterThan(40);
    expect(problems.slice(0, 8)).toEqual([]);
  });

  it('PERMITS: it offers to produce, and gives more than one kind of reason, on these games', () => {
    expect(offers).toBeGreaterThan(0);
    expect(reasons.size).toBeGreaterThan(1);
  });

  it('asks for a class first, before one is chosen', () => {
    const r = produceFor(viewOf(states[0], null), null);
    expect(r.offer).toBeNull();
    expect(r.reason).toBeTruthy();
  });

  it("says whose the B-Cell is when it is another player's, and offers nothing", () => {
    const theirs: SeatRule = { mine: (s) => s !== 'bcell', theirs: () => 'Ravi plays this piece.' };
    const withOffer = states.find((st) => produceFor(viewOf(st, 'ENV'), 'ENV').offer !== null);
    expect(withOffer, 'a state where ENV could be produced').toBeDefined();
    const r = produceFor(viewOf(withOffer, 'ENV'), 'ENV', theirs);
    expect(r.offer).toBeNull();
    expect(r.reason).toContain('Ravi');
    expect(produceFor(viewOf(withOffer, 'ENV'), 'ENV', EVERY_SEAT).offer).not.toBeNull();
  });
});
