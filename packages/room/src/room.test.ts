/**
 * THE ROOM'S RULES, each held to the line of the brief it comes from (docs/PHASE3_BRIEF.md §5).
 *
 * **Both halves, as CLAUDE.md requires.** Every rule here is a rule about who may do what, and a
 * rule of that shape has two ways to be wrong: it can fail to forbid, and it can fail to permit.
 * A room that let nobody do anything would satisfy every "must be rejected" test ever written. So
 * each forbidding test has a permitting twin, and where the twin is not obvious it is named.
 *
 * **What this suite does NOT test:** whether an action is legal. That is `applyAction`'s, and the
 * corpus is its oracle. The room decides ownership only, and these tests hold exactly that line.
 */
import { describe, expect, it } from 'vitest';

import { createRoom, project, step, sweep } from './room.js';
import { GRACE_MS, type Inbound, type RoomState } from './types.js';

const T0 = 1_000_000;

/** Runs a script of messages from a fresh room; returns the room and the last step's output. */
function run(
  msgs: readonly Inbound[],
  now = T0,
): { room: RoomState; out: ReturnType<typeof step>['out'] } {
  let room = createRoom('ABC123', now);
  let out: ReturnType<typeof step>['out'] = [];
  for (const m of msgs) {
    const s = step(room, m, now);
    room = s.room;
    out = s.out;
  }
  return { room, out };
}

const join = (ref: string, name: string): Inbound => ({ kind: 'join', ref, name });
const seat = (ref: string, s: string): Inbound => ({ kind: 'claimSeat', ref, seat: s });
const errorsOf = (out: ReturnType<typeof step>['out']): string[] =>
  out.flatMap((o) => (o.message.kind === 'error' ? [o.message.error] : []));
const member = (room: RoomState, ref: string) => room.members.find((m) => m.ref === ref);

describe('joining', () => {
  it('makes the first member the captain', () => {
    const { room } = run([join('a', 'Kartik'), join('b', 'Shantanu')]);
    expect(room.captain).toBe('a');
    expect(room.members.map((m) => m.name)).toEqual(['Kartik', 'Shantanu']);
  });

  it('tells everyone, and the projection carries no game state at all', () => {
    const { out } = run([join('a', 'Kartik')]);
    const msg = out[0]?.message;
    expect(out[0]?.to).toBe('all');
    expect(msg?.kind).toBe('room');
    if (msg?.kind !== 'room') throw new Error('expected a room message');
    expect(Object.keys(msg.room)).toEqual(['code', 'phase', 'captain', 'members', 'freeSeats']);
    expect(msg.room.freeSeats).toHaveLength(14);
  });
});

describe('a seat', () => {
  it('is taken by whoever asks first, and the second asker is told who has it', () => {
    const { room, out } = run([
      join('a', 'K'),
      join('b', 'S'),
      seat('a', 'bcell'),
      seat('b', 'bcell'),
    ]);
    expect(member(room, 'a')?.seats).toEqual(['bcell']);
    expect(member(room, 'b')?.seats).toEqual([]);
    expect(errorsOf(out)[0]).toContain('K');
  });

  // The permitting twin: a rule that rejected every claim would pass the test above.
  it('is taken by anyone while the room is in the lobby, captain or not', () => {
    const { room } = run([join('a', 'K'), join('b', 'S'), seat('b', 'nk'), seat('b', 'res_liver')]);
    expect(member(room, 'b')?.seats).toEqual(['nk', 'res_liver']);
  });

  it('is released by its holder', () => {
    const { room } = run([
      join('a', 'K'),
      seat('a', 'nk'),
      { kind: 'releaseSeat', ref: 'a', seat: 'nk' },
    ]);
    expect(member(room, 'a')?.seats).toEqual([]);
    expect(project(room).freeSeats).toContain('nk');
  });

  it('that does not exist is refused', () => {
    const { out } = run([join('a', 'K'), seat('a', 'pancreas')]);
    expect(errorsOf(out)).toEqual(['No such seat.']);
  });
});

describe('dropping is not leaving, which is the whole of ruling 4', () => {
  it('keeps an away member and their seats', () => {
    const { room } = run([
      join('a', 'K'),
      join('b', 'S'),
      seat('b', 'tcell'),
      { kind: 'disconnect', ref: 'b' },
    ]);
    expect(member(room, 'b')?.connected).toBe(false);
    expect(member(room, 'b')?.seats).toEqual(['tcell']);
  });

  it('frees the seats of a member who chooses to leave', () => {
    const { room } = run([
      join('a', 'K'),
      join('b', 'S'),
      seat('b', 'tcell'),
      { kind: 'leave', ref: 'b' },
    ]);
    expect(member(room, 'b')).toBeUndefined();
    expect(project(room).freeSeats).toContain('tcell');
  });
});

describe('the captaincy', () => {
  it('passes to the next member in join order who is connected', () => {
    const { room } = run([
      join('a', 'K'),
      join('b', 'S'),
      join('c', 'T'),
      { kind: 'disconnect', ref: 'a' },
    ]);
    expect(room.captain).toBe('b');
  });

  it('does not come back when the old captain returns', () => {
    const { room } = run([
      join('a', 'K'),
      join('b', 'S'),
      { kind: 'disconnect', ref: 'a' },
      join('a', 'K'),
    ]);
    expect(room.captain).toBe('b');
    expect(member(room, 'a')?.connected).toBe(true);
  });

  it('skips an away member and takes the next one', () => {
    const { room } = run([
      join('a', 'K'),
      join('b', 'S'),
      join('c', 'T'),
      { kind: 'disconnect', ref: 'b' },
      { kind: 'disconnect', ref: 'a' },
    ]);
    expect(room.captain).toBe('c');
  });

  it('is nobody in a room where nobody is connected', () => {
    const { room } = run([join('a', 'K'), { kind: 'disconnect', ref: 'a' }]);
    expect(room.captain).toBeNull();
  });
});

describe('the captain reassigning seats', () => {
  const away = (): RoomState =>
    run([join('a', 'K'), join('b', 'S'), seat('b', 'helper'), { kind: 'disconnect', ref: 'b' }])
      .room;

  it("hands an away member's seat to someone present", () => {
    const s = step(away(), { kind: 'assignSeat', ref: 'a', seat: 'helper', to: 'a' }, T0);
    expect(member(s.room, 'a')?.seats).toEqual(['helper']);
    expect(member(s.room, 'b')?.seats).toEqual([]);
  });

  it('frees it instead, when the table wants it free', () => {
    const s = step(away(), { kind: 'assignSeat', ref: 'a', seat: 'helper', to: null }, T0);
    expect(project(s.room).freeSeats).toContain('helper');
  });

  it('cannot take a seat from someone who is HERE — the ruling is about waiting, not overruling', () => {
    const room = run([join('a', 'K'), join('b', 'S'), seat('b', 'helper')]).room;
    const s = step(room, { kind: 'assignSeat', ref: 'a', seat: 'helper', to: 'a' }, T0);
    expect(errorsOf(s.out)[0]).toContain('holding that seat');
    expect(member(s.room, 'b')?.seats).toEqual(['helper']);
  });

  it('cannot be done by anyone else', () => {
    const s = step(away(), { kind: 'assignSeat', ref: 'b', seat: 'helper', to: 'b' }, T0);
    expect(errorsOf(s.out)).toEqual(['Only the captain assigns seats.']);
  });

  it('cannot hand a seat to someone who is away either', () => {
    const room = run([
      join('a', 'K'),
      join('b', 'S'),
      join('c', 'T'),
      seat('b', 'helper'),
      { kind: 'disconnect', ref: 'b' },
      { kind: 'disconnect', ref: 'c' },
    ]).room;
    const s = step(room, { kind: 'assignSeat', ref: 'a', seat: 'helper', to: 'c' }, T0);
    expect(errorsOf(s.out)[0]).toContain('away');
  });
});

describe('rejoining', () => {
  it('restores the member and the seats still theirs', () => {
    const { room } = run([
      join('a', 'K'),
      join('b', 'S'),
      seat('b', 'eosinophil'),
      { kind: 'disconnect', ref: 'b' },
      join('b', 'S'),
    ]);
    expect(member(room, 'b')?.connected).toBe(true);
    expect(member(room, 'b')?.seats).toEqual(['eosinophil']);
  });

  it('gives back nothing that was reassigned while away, and says so by silence', () => {
    let room = run([
      join('a', 'K'),
      join('b', 'S'),
      seat('b', 'eosinophil'),
      { kind: 'disconnect', ref: 'b' },
    ]).room;
    room = step(room, { kind: 'assignSeat', ref: 'a', seat: 'eosinophil', to: 'a' }, T0).room;
    room = step(room, join('b', 'S'), T0).room;
    expect(member(room, 'b')?.seats).toEqual([]);
    expect(member(room, 'a')?.seats).toEqual(['eosinophil']);
  });

  it('keeps the join order it first had, so succession cannot be gamed by reconnecting', () => {
    const { room } = run([
      join('a', 'K'),
      join('b', 'S'),
      { kind: 'disconnect', ref: 'b' },
      join('b', 'S'),
    ]);
    expect(member(room, 'b')?.joinOrder).toBe(2);
  });
});

describe('the grace period', () => {
  it('holds a room whose last member has just gone', () => {
    const room = run([join('a', 'K'), { kind: 'disconnect', ref: 'a' }]).room;
    expect(room.emptySince).toBe(T0);
    expect(sweep(room, T0 + GRACE_MS - 1)).not.toBeNull();
  });

  it('discards it once the period is up', () => {
    const room = run([join('a', 'K'), { kind: 'disconnect', ref: 'a' }]).room;
    expect(sweep(room, T0 + GRACE_MS)).toBeNull();
  });

  it('never discards a room somebody is in, however old', () => {
    const room = run([join('a', 'K')]).room;
    expect(room.emptySince).toBeNull();
    expect(sweep(room, T0 + GRACE_MS * 1000)).not.toBeNull();
  });

  it('starts again from the moment the LAST connection goes, not the first', () => {
    let room = run([join('a', 'K'), join('b', 'S')]).room;
    room = step(room, { kind: 'disconnect', ref: 'a' }, T0).room;
    room = step(room, { kind: 'disconnect', ref: 'b' }, T0 + 5000).room;
    expect(room.emptySince).toBe(T0 + 5000);
    expect(sweep(room, T0 + GRACE_MS)).not.toBeNull();
  });

  it('clears when somebody comes back', () => {
    let room = run([join('a', 'K'), { kind: 'disconnect', ref: 'a' }]).room;
    room = step(room, join('a', 'K'), T0 + 1000).room;
    expect(room.emptySince).toBeNull();
  });
});

describe('starting the game', () => {
  const seated = (): RoomState =>
    run([join('a', 'K'), join('b', 'S'), seat('a', 'bcell'), seat('b', 'neutrophil')]).room;

  it("is the captain's to do, and hands the engine the seats as owners", () => {
    const s = step(seated(), { kind: 'start', ref: 'a', difficulty: 'training' }, T0);
    expect(s.room.phase).toBe('playing');
    const g = s.room.game as Record<string, unknown>;
    expect(g['multiplayer']).toBe(true);
    expect(g['captain']).toBe('a');
    expect(g['owner']).toEqual({ bcell: 'a', neutrophil: 'b' });
    expect(s.out.some((o) => o.message.kind === 'view')).toBe(true);
  });

  it("is nobody else's", () => {
    const s = step(seated(), { kind: 'start', ref: 'b', difficulty: 'training' }, T0);
    expect(errorsOf(s.out)).toEqual(['Only the captain starts.']);
  });

  it('needs somebody seated', () => {
    const room = run([join('a', 'K')]).room;
    const s = step(room, { kind: 'start', ref: 'a', difficulty: 'training' }, T0);
    expect(errorsOf(s.out)).toEqual(['Take a seat before starting.']);
  });

  it('closes the lobby: seats are not claimed once it has begun', () => {
    const started = step(seated(), { kind: 'start', ref: 'a', difficulty: 'training' }, T0).room;
    const s = step(started, seat('b', 'nk'), T0);
    expect(errorsOf(s.out)[0]).toContain('before the game starts');
  });
});

describe('an action', () => {
  const playing = (): RoomState => {
    const room = run([
      join('a', 'K'),
      join('b', 'S'),
      seat('a', 'bcell'),
      seat('b', 'neutrophil'),
    ]).room;
    return step(room, { kind: 'start', ref: 'a', difficulty: 'training' }, T0).room;
  };

  it("is refused when the sender does not hold that seat: ownership is the room's business", () => {
    const s = step(
      playing(),
      { kind: 'action', ref: 'b', action: { action: 'move', cell: 'bcell' } },
      T0,
    );
    expect(errorsOf(s.out)).toEqual(['That is not one of your pieces.']);
  });

  // The permitting twin, and it matters: a room that refused every action would pass the test
  // above. The draw belongs to no seat, so it is the action that proves the path is open.
  it('reaches the engine when the room has no objection', () => {
    const s = step(playing(), { kind: 'action', ref: 'a', action: { action: 'draw' } }, T0);
    expect(errorsOf(s.out)).toEqual([]);
    expect(s.out.some((o) => o.message.kind === 'view')).toBe(true);
  });

  it("is the ENGINE's to refuse when it is illegal, and the room passes that refusal on", () => {
    // Nothing is drawn yet, so commanding is the engine's to reject — not the room's.
    const s = step(playing(), { kind: 'action', ref: 'a', action: { action: 'beginCommand' } }, T0);
    expect(errorsOf(s.out)).toHaveLength(1);
    expect(errorsOf(s.out)[0]).not.toBe('That is not one of your pieces.');
  });

  it('is refused before the game starts', () => {
    const room = run([join('a', 'K')]).room;
    const s = step(room, { kind: 'action', ref: 'a', action: { action: 'draw' } }, T0);
    expect(errorsOf(s.out)).toEqual(['The game has not started.']);
  });

  it('is refused from someone who is not in the room at all', () => {
    const s = step(playing(), { kind: 'action', ref: 'z', action: { action: 'draw' } }, T0);
    expect(errorsOf(s.out)).toEqual(['You are not in this room.']);
  });
});

describe('the reducer itself', () => {
  it('never mutates the room it was given', () => {
    const before = run([join('a', 'K'), join('b', 'S')]).room;
    const snapshot = JSON.stringify(before);
    step(before, seat('a', 'nk'), T0);
    step(before, { kind: 'disconnect', ref: 'a' }, T0);
    step(before, { kind: 'leave', ref: 'b' }, T0);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('answers an unknown sender without throwing', () => {
    const room = run([join('a', 'K')]).room;
    expect(() => step(room, { kind: 'disconnect', ref: 'nobody' }, T0)).not.toThrow();
    expect(step(room, { kind: 'disconnect', ref: 'nobody' }, T0).out).toEqual([]);
  });
});
