/**
 * THE ROOM THROUGH THE WIRE: a real game played through the room, every message it sends encoded
 * and decoded exactly as a client would receive it, and held to the three things P3.2 promises.
 *
 * The protocol's own suite pins these on a constructed object, because `packages/protocol` may not
 * import the engine (`protocol-no-implementations`). This suite is where the engine and the
 * protocol meet, so it is where they are checked against REAL views: the measurement in
 * `docs/for-P3.md` §2, kept as a test rather than left as a number in a document.
 */
import { decodeServer, encode, type ServerMessage } from '@immunity-wars/protocol';
import { describe, expect, it } from 'vitest';

import { createRoom, step } from './room.js';
import type { Inbound, Outbound, RoomState } from './types.js';

const T0 = 1_000_000;

/** Plays a short two-player game through the room, returning every message it sent. */
function playThroughTheRoom(): { sent: Outbound[]; room: RoomState } {
  let room = createRoom('ABC123', T0);
  const sent: Outbound[] = [];
  const say = (m: Inbound): void => {
    const s = step(room, m, T0);
    room = s.room;
    sent.push(...s.out);
  };
  say({ kind: 'join', ref: 'p_one', name: 'Kartik' });
  say({ kind: 'join', ref: 'p_two', name: 'Shantanu' });
  say({ kind: 'claimSeat', ref: 'p_one', seat: 'bcell' });
  say({ kind: 'claimSeat', ref: 'p_two', seat: 'neutrophil' });
  say({ kind: 'start', ref: 'p_one', difficulty: 'training' });
  // Several turns, so bursts are included: draw, allocate, confirm, end the turn.
  for (let turn = 0; turn < 4; turn += 1) {
    say({ kind: 'action', ref: 'p_one', action: { action: 'draw' } });
    say({ kind: 'action', ref: 'p_one', action: { action: 'beginCommand' } });
    say({ kind: 'action', ref: 'p_one', action: { action: 'confirmAllocation' } });
    say({ kind: 'action', ref: 'p_one', action: { action: 'endCommand' } });
    if (room.phase === 'ended') break;
  }
  return { sent, room };
}

/** What a client receives: the encoded text, decoded. */
const received = (o: Outbound): ServerMessage => {
  const d = decodeServer(encode(o.message as ServerMessage));
  if (!d.ok)
    throw new Error(`a message the room sent did not decode: ${JSON.stringify(d.refusal)}`);
  return d.message;
};

describe('a real game, through the wire', () => {
  const { sent } = playThroughTheRoom();

  it('actually exercised views and bursts, so the checks below are not vacuous', () => {
    const kinds = sent.map((o) => o.message.kind);
    expect(kinds.filter((k) => k === 'view').length).toBeGreaterThan(8);
    expect(kinds.filter((k) => k === 'burst').length).toBeGreaterThan(0);
    expect(kinds).toContain('room');
    expect(kinds).toContain('joined');
  });

  it('decodes every message the room sent', () => {
    for (const o of sent) expect(() => received(o)).not.toThrow();
  });

  it('delivers every real view byte for byte, including every view inside every burst', () => {
    let views = 0;
    for (const o of sent) {
      const got = received(o);
      if (got.kind === 'view' && o.message.kind === 'view') {
        expect(JSON.stringify(got.view)).toBe(JSON.stringify(o.message.view));
        views += 1;
      }
      if (got.kind === 'burst' && o.message.kind === 'burst') {
        got.frames.forEach((f, i) => {
          const orig =
            o.message.kind === 'burst' ? (o.message.frames[i] as { view: unknown }) : null;
          expect(JSON.stringify(f.view)).toBe(JSON.stringify(orig?.view));
          views += 1;
        });
      }
    }
    expect(views).toBeGreaterThan(8);
  });

  it('keeps the burst tail equal to the view after it, as seam 1 requires, on the far side', () => {
    // LocalSession asserts that the last frame of a burst equals the authoritative view that
    // follows it (burst-tail-authoritative). If the wire reordered keys, this is where it would
    // break, because the comparison is made on JSON text.
    const got = sent.map(received);
    let checked = 0;
    got.forEach((m, i) => {
      if (m.kind !== 'burst') return;
      const next = got.slice(i + 1).find((x) => x.kind === 'view');
      const tail = m.frames[m.frames.length - 1];
      if (next?.kind === 'view' && tail) {
        expect(JSON.stringify(tail.view)).toBe(JSON.stringify(next.view));
        checked += 1;
      }
    });
    expect(checked).toBeGreaterThan(0);
  });

  it('never carries a ref, in any message, across a whole game', () => {
    const wire = sent.map((o) => encode(o.message as ServerMessage)).join('\n');
    expect(wire).not.toContain('p_one');
    expect(wire).not.toContain('p_two');
  });
});

/**
 * ⚠️ A KNOWN GAP, PINNED RATHER THAN LEFT IN PROSE (docs/FINDINGS.md #78). Open, awaiting a ruling.
 *
 * The room passes the captaincy on when the captain drops (ruling 4), but the ENGINE holds its own
 * copy of who the captain is — `g.captain`, given once at `newGame` — and enforces it for the
 * allocation, Begin command and End turn. Nothing keeps the two in step, so after a succession
 * mid-game the new captain is refused by the engine and the table cannot move until the old
 * captain returns: exactly the stall ruling 4 exists to prevent.
 *
 * This test asserts the gap as it stands, so that fixing it turns this red and forces whoever
 * fixes it to invert the assertion — a gap that closes silently is as bad as one that opens so.
 */
describe('KNOWN GAP #78: captain succession does not reach the engine', () => {
  it('leaves the engine refusing the new captain after the old one drops mid-game', () => {
    let room = createRoom('ABC123', T0);
    const say = (m: Inbound): ReturnType<typeof step> => {
      const s = step(room, m, T0);
      room = s.room;
      return s;
    };
    say({ kind: 'join', ref: 'p_one', name: 'Kartik' });
    say({ kind: 'join', ref: 'p_two', name: 'Shantanu' });
    say({ kind: 'claimSeat', ref: 'p_one', seat: 'bcell' });
    say({ kind: 'claimSeat', ref: 'p_two', seat: 'neutrophil' });
    say({ kind: 'start', ref: 'p_one', difficulty: 'training' });
    say({ kind: 'action', ref: 'p_one', action: { action: 'draw' } });
    say({ kind: 'disconnect', ref: 'p_one' });
    expect(room.captain).toBe('p_two'); // the room has moved on
    const s = say({ kind: 'action', ref: 'p_two', action: { action: 'beginCommand' } });
    const refusal = s.out.find((o) => o.message.kind === 'error')?.message;
    // …and the engine has not: it still answers to the old captain.
    expect(refusal).toEqual({
      kind: 'error',
      code: 'engine',
      detail: 'Only the captain begins the command phase.',
    });
  });
});
