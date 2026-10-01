/**
 * THE SCREENS AND THE ROOM AGREE ON WHOSE EACH ACTION IS (FINDINGS #94).
 *
 * The room refuses an action from anyone who does not hold its piece, and the body's actions from
 * anyone but the captain, reading both from the protocol's tables. The screens decide what to offer
 * from their own list, `ACTION_CATALOGUE`, piece by piece. Two lists of one fact drift, and the
 * failure would be a button the room refuses, or an action the room lets a stranger to the piece
 * send. So the two are held together here, both ways.
 */
import { describe, expect, it } from 'vitest';

import { BODY_ACTIONS, CELL_SEATS, SEAT_OF_ACTION } from '@immunity-wars/protocol';
import { ACTION_CATALOGUE } from '@immunity-wars/ui';

/** Actions that name their own piece in the message, so the room reads the piece from it. */
const NAMES_ITS_PIECE = new Set(['strike', 'degranulate', 'resengulf']);

describe("whose an action is: the screens' list and the room's table", () => {
  it('every action a cell is offered, that names no piece, is that cell’s in the room', () => {
    let checked = 0;
    for (const cell of CELL_SEATS) {
      for (const action of ACTION_CATALOGUE[cell] ?? []) {
        if (NAMES_ITS_PIECE.has(action)) continue;
        checked += 1;
        expect(SEAT_OF_ACTION[action], `${cell}: ${action}`).toBe(cell);
      }
    }
    expect(checked, 'no action was compared: a vacuous pass').toBeGreaterThanOrEqual(7);
  });

  it('every action the room ties to a piece is on that piece’s list on the screens', () => {
    for (const [action, seat] of Object.entries(SEAT_OF_ACTION)) {
      expect(ACTION_CATALOGUE[seat], `${action} -> ${seat}`).toContain(action);
    }
  });

  it('the body’s rings on the board are among the actions the room keeps for the captain', () => {
    const rings = ACTION_CATALOGUE['body'] ?? [];
    expect(rings.length).toBeGreaterThan(0);
    for (const action of rings) expect(BODY_ACTIONS.has(action), action).toBe(true);
  });

  it('no action is both a piece’s and the body’s', () => {
    for (const action of Object.keys(SEAT_OF_ACTION)) expect(BODY_ACTIONS.has(action)).toBe(false);
  });
});
