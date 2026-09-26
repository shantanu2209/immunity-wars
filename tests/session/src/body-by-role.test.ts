/**
 * THE BODY'S ACTIONS ARE THE CAPTAIN'S (ruled 26 September 2026, after the P3.6 session): played
 * together, the actions with no piece, the Body drawer's and the memory response's and antivenom's
 * rings on the board, are offered to the captain and to nobody else (FINDINGS #94). The drawer is
 * held by `drawersFor`; this holds the board's half, where hiding the drawer would not have reached.
 *
 * Held on recorded games, with nothing selected, where the body's offers live:
 *   - alone, and for the captain, `offeredActions` offers exactly what `bodyOffers` does, unchanged;
 *   - for anyone else it offers nothing: no ring and no button;
 *   - and the games do offer the body's rings and buttons somewhere, so an empty answer for
 *     everyone else is a refusal, not an empty game.
 */
import { describe, expect, it } from 'vitest';

import { LocalSession, MemoryStorage, type SessionView } from '@immunity-wars/session';
import { EVERY_SEAT, bodyOffers, offeredActions, type SeatRule } from '@immunity-wars/ui';

import { clone, commandStates } from './constructed.js';

const SEEDS = [0x51de, 0x7f2a, 0x0b0d];
const NOT_THE_CAPTAIN: SeatRule = { mine: () => true, theirs: () => '', body: false };

function viewOf(state: unknown): SessionView {
  const s = LocalSession.resume(clone(state) as never, {
    storage: new MemoryStorage(),
    now: () => 0,
  });
  const v = s.getView();
  s.dispose();
  return v;
}

describe("the body's actions, by role", () => {
  const states = SEEDS.flatMap((seed) =>
    ['training', 'normal', 'hard'].flatMap((d) => commandStates(seed, d, 40)),
  );
  let rings = 0;
  let buttons = 0;
  const problems: string[] = [];
  for (const st of states) {
    const view = viewOf(st);
    const own = bodyOffers(view);
    rings += own.board.length;
    buttons += own.buttons.length;
    const alone = offeredActions(view, EVERY_SEAT);
    if (JSON.stringify(alone) !== JSON.stringify(own)) problems.push('alone: not bodyOffers');
    const other = offeredActions(view, NOT_THE_CAPTAIN);
    if (other.board.length > 0 || other.buttons.length > 0)
      problems.push(
        `not the captain: offered ${String(other.board.length + other.buttons.length)}`,
      );
  }

  it('offers them unchanged alone and to the captain, and none of them to anyone else', () => {
    expect(states.length).toBeGreaterThan(40);
    expect(problems.slice(0, 8)).toEqual([]);
  });

  it("PERMITS: these games do offer the body's rings and buttons, to the captain", () => {
    expect(rings).toBeGreaterThan(0);
    expect(buttons).toBeGreaterThan(0);
  });
});
