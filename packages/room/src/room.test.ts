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
import { CELL_KEYS, FAMILIES } from '@immunity-wars/session-core';
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
/**
 * The refusal CODES a step produced: the room sends codes, never English (P3.2). Read from both
 * places a refusal can be, since an action's refusal is a failed `result` (P3.4).
 */
type Sent = ReturnType<typeof step>['out'][number]['message'];
const refusal = (m: Sent): { code?: string; detail?: string } | null =>
  m.kind === 'error' ? m : m.kind === 'result' && !m.ok ? m : null;
const errorsOf = (out: ReturnType<typeof step>['out']): string[] =>
  out.flatMap((o) => {
    const r = refusal(o.message);
    return r ? [r.code ?? ''] : [];
  });
const detailsOf = (out: ReturnType<typeof step>['out']): (string | undefined)[] =>
  out.flatMap((o) => {
    const r = refusal(o.message);
    return r ? [r.detail] : [];
  });
const member = (room: RoomState, ref: string) => room.members.find((m) => m.ref === ref);

describe('joining', () => {
  it('makes the first member the captain', () => {
    const { room } = run([join('a', 'Kartik'), join('b', 'Shantanu')]);
    expect(room.captain).toBe('a');
    expect(room.members.map((m) => m.name)).toEqual(['Kartik', 'Shantanu']);
  });

  it('tells everyone, and the projection carries no game state at all', () => {
    const { out } = run([join('a', 'Kartik')]);
    // A join sends two things: 'joined' to the joiner alone, then the room to everyone.
    const broadcastOut = out.find((o) => o.message.kind === 'room');
    const msg = broadcastOut?.message;
    expect(broadcastOut?.to).toBe('all');
    expect(msg?.kind).toBe('room');
    if (msg?.kind !== 'room') throw new Error('expected a room message');
    expect(Object.keys(msg.room)).toEqual(['code', 'phase', 'captain', 'members', 'freeSeats']);
    expect(msg.room.freeSeats).toHaveLength(14);
  });
});

describe('what reaches a client, and what never does (P3.2, FINDINGS #77)', () => {
  it('names members by public id, and the captain by id too', () => {
    const { room } = run([join('a', 'Kartik'), join('b', 'Shantanu')]);
    const p = project(room);
    expect(p.members.map((m) => m.id)).toEqual([1, 2]);
    expect(p.captain).toBe(1);
  });

  it('never carries a ref, anywhere in anything it broadcasts', () => {
    // Refs chosen so that a match could not be a coincidence of ordinary text.
    const refA = 'p_SECRET_ref_aaaa';
    const refB = 'p_SECRET_ref_bbbb';
    let room = createRoom('ABC123', T0);
    const everything: string[] = [];
    for (const m of [
      join(refA, 'K'),
      join(refB, 'S'),
      seat(refB, 'nk'),
      { kind: 'disconnect', ref: refB } as Inbound,
      join(refB, 'S'),
    ]) {
      const st = step(room, m, T0);
      room = st.room;
      for (const o of st.out) everything.push(JSON.stringify(o.message));
    }
    const wire = everything.join('\n');
    expect(wire).not.toContain('SECRET');
  });

  it('tells a joiner its own id, and only that joiner', () => {
    const s = step(run([join('a', 'K')]).room, join('b', 'S'), T0);
    const joined = s.out.find((o) => o.message.kind === 'joined');
    expect(joined?.to).toBe('b');
    expect(joined?.message).toEqual({ kind: 'joined', id: 2 });
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
    expect(errorsOf(out)).toEqual(['seatTaken']);
    expect(detailsOf(out)).toEqual(['K']);
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
    expect(errorsOf(out)).toEqual(['noSuchSeat']);
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
    const s = step(away(), { kind: 'assignSeat', ref: 'a', seat: 'helper', to: 1 }, T0);
    expect(member(s.room, 'a')?.seats).toEqual(['helper']);
    expect(member(s.room, 'b')?.seats).toEqual([]);
  });

  it('frees it instead, when the table wants it free', () => {
    const s = step(away(), { kind: 'assignSeat', ref: 'a', seat: 'helper', to: null }, T0);
    expect(project(s.room).freeSeats).toContain('helper');
  });

  it('cannot take a seat from someone who is HERE — the ruling is about waiting, not overruling', () => {
    const room = run([join('a', 'K'), join('b', 'S'), seat('b', 'helper')]).room;
    const s = step(room, { kind: 'assignSeat', ref: 'a', seat: 'helper', to: 1 }, T0);
    expect(errorsOf(s.out)).toEqual(['seatHeldByPresent']);
    expect(member(s.room, 'b')?.seats).toEqual(['helper']);
  });

  it('cannot be done by anyone else', () => {
    const s = step(away(), { kind: 'assignSeat', ref: 'b', seat: 'helper', to: 2 }, T0);
    expect(errorsOf(s.out)).toEqual(['notCaptain']);
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
    const s = step(room, { kind: 'assignSeat', ref: 'a', seat: 'helper', to: 3 }, T0);
    expect(errorsOf(s.out)).toEqual(['memberAway']);
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
    room = step(room, { kind: 'assignSeat', ref: 'a', seat: 'eosinophil', to: 1 }, T0).room;
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
    // Public ids, never refs: the engine projects these into every view (FINDINGS #77).
    expect(g['captain']).toBe('m1');
    expect(g['owner']).toEqual({ bcell: 'm1', neutrophil: 'm2' });
    expect(s.out.some((o) => o.message.kind === 'view')).toBe(true);
  });

  it("is nobody else's", () => {
    const s = step(seated(), { kind: 'start', ref: 'b', difficulty: 'training' }, T0);
    expect(errorsOf(s.out)).toEqual(['notCaptain']);
  });

  it('needs somebody seated', () => {
    const room = run([join('a', 'K')]).room;
    const s = step(room, { kind: 'start', ref: 'a', difficulty: 'training' }, T0);
    expect(errorsOf(s.out)).toEqual(['nobodySeated']);
  });

  it('closes the lobby: seats are not claimed once it has begun', () => {
    const started = step(seated(), { kind: 'start', ref: 'a', difficulty: 'training' }, T0).room;
    const s = step(started, seat('b', 'nk'), T0);
    expect(errorsOf(s.out)).toEqual(['lobbyClosed']);
  });
});

describe('arriving after the game has started (P3.4)', () => {
  const started = (): RoomState =>
    step(
      run([join('a', 'K'), join('b', 'S'), seat('a', 'bcell'), seat('b', 'nk')]).room,
      { kind: 'start', ref: 'a', difficulty: 'training' },
      T0,
    ).room;

  it('hands a rejoining member the board, addressed to them alone', () => {
    const away = step(started(), { kind: 'disconnect', ref: 'b' }, T0).room;
    const s = step(away, join('b', 'S'), T0);
    const views = s.out.filter((o) => o.message.kind === 'view');
    // Without it they see nothing until somebody acts, and a table waiting on them will not.
    expect(views.map((o) => o.to)).toContain('b');
  });

  it('hands a new member the board too, since the captain may seat them in an away seat', () => {
    const s = step(started(), join('c', 'T'), T0);
    expect(s.out.some((o) => o.to === 'c' && o.message.kind === 'view')).toBe(true);
  });

  // The permitting twin's mirror: there is no board in the lobby, so nothing is sent.
  it('sends no view to someone joining the lobby', () => {
    const s = step(run([join('a', 'K')]).room, join('b', 'S'), T0);
    expect(s.out.some((o) => o.message.kind === 'view')).toBe(false);
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
      { kind: 'action', id: 1, ref: 'b', action: { action: 'move', cell: 'bcell' } },
      T0,
    );
    expect(errorsOf(s.out)).toEqual(['notYourPiece']);
  });

  // The permitting twin, and it matters: a room that refused every action would pass the test
  // above. The draw belongs to no seat, so it is the action that proves the path is open.
  it('reaches the engine when the room has no objection', () => {
    const s = step(playing(), { kind: 'action', id: 1, ref: 'a', action: { action: 'draw' } }, T0);
    expect(errorsOf(s.out)).toEqual([]);
    expect(s.out.some((o) => o.message.kind === 'view')).toBe(true);
  });

  it("is the ENGINE's to refuse when it is illegal, and the room passes that refusal on", () => {
    // Nothing is drawn yet, so commanding is the engine's to reject — not the room's.
    const s = step(
      playing(),
      { kind: 'action', id: 1, ref: 'a', action: { action: 'beginCommand' } },
      T0,
    );
    // The engine said no, in its own words, which the client renders through the engine
    // catalogue as single player does.
    expect(errorsOf(s.out)).toEqual(['engine']);
    expect(detailsOf(s.out)[0]).toBeTruthy();
  });

  it("cannot smuggle someone else's pid inside the action: the room stamps the sender's own", () => {
    // 'b' asks to begin command as the captain 'a'. The engine gives beginCommand to the captain
    // only, so if the smuggled pid won, this would be accepted.
    const drawn = step(
      playing(),
      { kind: 'action', id: 1, ref: 'a', action: { action: 'draw' } },
      T0,
    ).room;
    const s = step(
      drawn,
      { kind: 'action', id: 1, ref: 'b', action: { action: 'beginCommand', pid: 'a' } },
      T0,
    );
    expect(errorsOf(s.out)).toEqual(['engine']);
  });

  it('is refused before the game starts', () => {
    const room = run([join('a', 'K')]).room;
    const s = step(room, { kind: 'action', id: 1, ref: 'a', action: { action: 'draw' } }, T0);
    expect(errorsOf(s.out)).toEqual(['notStarted']);
  });

  it('is refused from someone who is not in the room at all', () => {
    const s = step(playing(), { kind: 'action', id: 1, ref: 'z', action: { action: 'draw' } }, T0);
    expect(errorsOf(s.out)).toEqual(['notInRoom']);
  });

  // PROTOCOL v2 (P3.4): every action is answered, by its own id, to its sender alone.
  it('is answered with a result carrying its own id, to the sender alone, after the view', () => {
    const s = step(playing(), { kind: 'action', id: 42, ref: 'a', action: { action: 'draw' } }, T0);
    const results = s.out.filter((o) => o.message.kind === 'result');
    expect(results).toEqual([{ to: 'a', message: { kind: 'result', id: 42, ok: true } }]);
    // Last, so a sender whose promise resolves on it already holds the view the action caused.
    expect(s.out.findIndex((o) => o.message.kind === 'result')).toBeGreaterThan(
      s.out.findIndex((o) => o.message.kind === 'view'),
    );
  });

  it('is answered by id when refused too, and a refusal is never an `error`', () => {
    const s = step(playing(), { kind: 'action', id: 7, ref: 'z', action: { action: 'draw' } }, T0);
    expect(s.out).toEqual([
      { to: 'z', message: { kind: 'result', id: 7, ok: false, code: 'notInRoom' } },
    ]);
  });

  it('carries every scoped answer beside the view, for every cell and every family', () => {
    const s = step(playing(), { kind: 'action', id: 1, ref: 'a', action: { action: 'draw' } }, T0);
    const view = s.out.find((o) => o.message.kind === 'view')?.message;
    if (view?.kind !== 'view') throw new Error('no view');
    expect(Object.keys(view.scoped.moveDestinations)).toEqual([...CELL_KEYS]);
    expect(Object.keys(view.scoped.productionDetail)).toEqual([...FAMILIES]);
    expect(Object.keys(view.queries).length).toBeGreaterThan(0);
  });

  // UNDO IS SINGLE-PLAYER IN v1 (FINDINGS #79): the engine's undo stack is the game's, not a
  // player's, so in a room it would unwind whoever moved last.
  it('is refused when it is an undo, before the engine sees it', () => {
    const drawn = step(
      playing(),
      { kind: 'action', id: 1, ref: 'a', action: { action: 'draw' } },
      T0,
    ).room;
    const snapshot = JSON.stringify(drawn.game);
    const s = step(drawn, { kind: 'action', id: 2, ref: 'a', action: { action: 'undo' } }, T0);
    expect(errorsOf(s.out)).toEqual(['undoIsSinglePlayer']);
    expect(JSON.stringify(drawn.game)).toBe(snapshot);
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
