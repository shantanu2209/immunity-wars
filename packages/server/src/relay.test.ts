/**
 * TWO CLIENTS, ONE RELAY, REAL SOCKETS (P3.4): `RelaySession` against the Node relay on this
 * machine, which is the brief's P3.4 in full — "the second implementation of `Session`, against a
 * local relay on the development machine". Every frame is gzipped and every message versioned,
 * exactly as on the wire.
 *
 * What it holds, against Gate A's wording where there is one:
 * - every action is applied once, in one order, and every client's view AGREES after each action,
 *   and agrees with the relay's own game — asserted, not watched;
 * - a relay client sees what `LocalSession` sees on the same state, for every selection;
 * - the selection clears where `LocalSession` clears it, action for action;
 * - a player who drops and rejoins with the same code gets their seats back and the board;
 * - a client on another version is refused, and the room is untouched.
 */
import { WebSocketServer } from 'ws';
import {
  PROTOCOL_VERSION,
  RULES_VERSION,
  SERVER_FRAME_LIMIT,
  decodeServer,
  encode,
  pack,
  unpack,
} from '@immunity-wars/protocol';
import {
  LocalSession,
  NO_SELECTION,
  RelayError,
  RelayRoom,
  newPlayerRef,
  type RelaySession,
  type Selection,
  type SessionView,
} from '@immunity-wars/session';
import { CELL_KEYS, FAMILIES } from '@immunity-wars/session-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CLOSE, listen, type Relay } from './index.js';

let relay: Relay;
let url: string;

beforeAll(async () => {
  relay = await listen({ port: 0 });
  url = `ws://127.0.0.1:${String(relay.port)}`;
});

afterAll(async () => {
  await relay.close();
});

/** Waits for something another socket will make true, and fails loudly if it never does. */
async function until(what: string, ok: () => boolean, ms = 3000): Promise<void> {
  const end = Date.now() + ms;
  while (!ok()) {
    if (Date.now() > end) throw new Error(`timed out waiting for: ${what}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}

/** Counts the authoritative views a session has received, so a test can wait for the next one. */
function counted(s: RelaySession): () => number {
  let n = 0;
  s.subscribe((e) => {
    if (e.kind === 'view') n += 1;
  });
  return () => n;
}

interface Table {
  a: RelayRoom;
  b: RelayRoom;
  sa: RelaySession;
  sb: RelaySession;
  code: string;
}

async function table(): Promise<Table> {
  const a = await RelayRoom.create({ url, name: 'Kartik' });
  const b = await RelayRoom.join({ url, code: a.code, name: 'Shantanu' });
  a.claimSeat('bcell');
  b.claimSeat('neutrophil');
  await until('both seated', () => a.room?.members.every((m) => m.seats.length > 0) === true);
  a.start('training');
  const [sa, sb] = await Promise.all([a.session(), b.session()]);
  return { a, b, sa, sb, code: a.code };
}

const gameOf = (t: Table): Record<string, unknown> =>
  JSON.parse(JSON.stringify(relay.hub.roomState(t.code)?.game)) as Record<string, unknown>;

const same = (x: SessionView, y: SessionView): void => {
  expect(JSON.stringify(x.game)).toBe(JSON.stringify(y.game));
  expect(JSON.stringify(x.queries)).toBe(JSON.stringify(y.queries));
  expect(JSON.stringify(x.scoped)).toBe(JSON.stringify(y.scoped));
};

/**
 * The same game with the captain's player id swapped for a device-minted ref, so a `LocalSession`
 * can act as the captain. The relay names players `m<id>`, which a `PlayerRef` may never be.
 */
function asCaptain(g: Record<string, unknown>, ref: string): Record<string, unknown> {
  const swap = (p: unknown): unknown => (p === g['captain'] ? ref : p);
  const entries = (o: unknown): [string, unknown][] => Object.entries((o ?? {}) as object);
  return {
    ...g,
    captain: ref,
    players: ((g['players'] as unknown[] | undefined) ?? []).map(swap),
    owner: Object.fromEntries(entries(g['owner']).map(([k, v]) => [k, swap(v)])),
    apBudget: Object.fromEntries(entries(g['apBudget']).map(([k, v]) => [String(swap(k)), v])),
  };
}

const TURN = ['draw', 'beginCommand', 'confirmAllocation', 'endCommand'] as const;

describe('two clients play one game through the relay', () => {
  it('agree with each other and with the relay after every action', async () => {
    const t = await table();
    const seenA = counted(t.sa);
    const seenB = counted(t.sb);
    let actions = 0;
    for (let turn = 0; turn < 3; turn += 1) {
      for (const action of TURN) {
        const outcome = await t.sa.sendAction({ action });
        expect(outcome, action).toEqual({ ok: true });
        actions += 1;
        // Every accepted action is ONE view to each client, so the counts agree when both have it.
        await until(`B has view ${String(seenA())}`, () => seenB() === seenA());
        same(t.sa.getView(), t.sb.getView());
        // And what both see is the relay's game, not merely each other's.
        const local = LocalSession.resume(gameOf(t));
        expect(JSON.stringify(t.sa.getView().game)).toBe(JSON.stringify(local.getView().game));
      }
      if (t.a.room?.phase !== 'playing') break;
    }
    expect(actions).toBeGreaterThanOrEqual(4);
    expect(seenA()).toBe(actions);
    t.a.close();
    t.b.close();
  });

  it('shows a relay client exactly what LocalSession shows on the same state, for every selection', async () => {
    const t = await table();
    for (const action of ['draw', 'beginCommand', 'confirmAllocation'])
      await t.sa.sendAction({ action });
    // A command phase: cells can move, so the scoped answers are not empty.
    const local = LocalSession.resume(gameOf(t));
    const selections: Selection[] = [
      NO_SELECTION,
      ...CELL_KEYS.map((cell) => ({ cell, family: null, resident: null })),
      ...FAMILIES.map((family) => ({ cell: null, family, resident: null })),
    ];
    let moves = 0;
    for (const selection of selections) {
      local.setSelection(selection);
      t.sa.setSelection(selection);
      same(t.sa.getView(), local.getView());
      moves += t.sa.getView().scoped.moveDestinations?.length ?? 0;
    }
    expect(moves).toBeGreaterThan(0);
    t.a.close();
    t.b.close();
  });

  it('clears the selection where LocalSession clears it, action for action', async () => {
    const t = await table();
    const pick: Selection = { cell: 'bcell', family: 'ENV', resident: null };
    const outcomes = { cleared: 0, kept: 0 };
    for (let turn = 0; turn < 2; turn += 1) {
      for (const action of TURN) {
        // The same state, the same selection, the same action, on both implementations. The engine
        // is unseeded, so the two games may diverge in their dice; whether the selection survives
        // depends only on which action was accepted.
        const self = newPlayerRef();
        const local = LocalSession.resume(asCaptain(gameOf(t), self), { self });
        local.setSelection(pick);
        t.sa.setSelection(pick);
        const l = await local.sendAction({ action });
        const r = await t.sa.sendAction({ action });
        expect([l.ok, r.ok], action).toEqual([true, true]);
        expect(t.sa.getView().selection, action).toEqual(local.getView().selection);
        if (local.getView().selection === NO_SELECTION) outcomes.cleared += 1;
        else outcomes.kept += 1;
      }
    }
    // Both outcomes were exercised: a rule that always cleared, or never did, would fail above.
    expect(outcomes.cleared).toBeGreaterThan(0);
    expect(outcomes.kept).toBeGreaterThan(0);
    t.a.close();
    t.b.close();
  });

  it('refuses undo in a room, and says so in the view', async () => {
    const t = await table();
    expect(t.sa.getView().undo.reason).toBe('multiplayer');
    const r = await t.sa.sendAction({ action: 'undo' });
    expect(r).toMatchObject({ ok: false, code: 'undoIsSinglePlayer' });
    t.a.close();
    t.b.close();
  });

  it("refuses a move of another player's piece, and passes the engine's own words through", async () => {
    const t = await table();
    const theirs = await t.sa.sendAction({ action: 'recall', cell: 'neutrophil' });
    expect(theirs).toMatchObject({ ok: false, code: 'notYourPiece' });
    // Nothing is drawn yet, so the engine refuses this, in its own text.
    const early = await t.sa.sendAction({ action: 'beginCommand' });
    expect(early.ok).toBe(false);
    expect(early.code).toBe('engine');
    expect(early.error).not.toBe('engine');
    t.a.close();
    t.b.close();
  });
});

describe('dropping and coming back (Gate A)', () => {
  it('gives a player who rejoins with the same code their seats back, and the board', async () => {
    const t = await table();
    await t.sa.sendAction({ action: 'draw' });
    t.b.close();
    await until('B shown away', () => t.a.room?.members[1]?.connected === false);
    expect(t.a.room?.members[1]?.seats).toEqual(['neutrophil']);

    const back = await RelayRoom.join({ url, code: t.code, name: 'Shantanu', self: t.b.self });
    const session = await back.session();
    expect(back.room?.members[1]).toMatchObject({ connected: true, seats: ['neutrophil'] });
    // The board as it stands, without anyone having to act for them to see it.
    expect(JSON.stringify(session.getView().game)).toBe(JSON.stringify(t.sa.getView().game));
    t.a.close();
    back.close();
  });

  it('keeps the member present when they rejoin before the old connection is known to be dead', async () => {
    const t = await table();
    const closes: number[] = [];
    t.b.subscribe((e) => {
      if (e.kind === 'closed') closes.push(e.code);
    });
    const again = await RelayRoom.join({ url, code: t.code, name: 'Shantanu', self: t.b.self });
    await until('old connection replaced', () => closes.length > 0);
    expect(closes).toEqual([CLOSE.replaced]);
    await new Promise((r) => setTimeout(r, 50));
    expect(t.a.room?.members.map((m) => m.connected)).toEqual([true, true]);
    t.a.close();
    again.close();
  });

  it('answers an action in flight when the connection drops, rather than leaving it hanging', async () => {
    const t = await table();
    const pending = t.sb.sendAction({ action: 'draw' });
    t.b.close();
    const outcome = await pending;
    // Either the relay answered before the close, or the session answered for it; never neither.
    expect(typeof outcome.ok).toBe('boolean');
    t.a.close();
  });
});

describe('who may come in', () => {
  it('refuses a code nobody holds', async () => {
    await expect(RelayRoom.join({ url, code: 'QQQQQQ', name: 'X' })).rejects.toMatchObject({
      code: 'noSuchRoom',
    });
  });

  it('refuses a client on another version, and the room it asked for is untouched', async () => {
    const t = await table();
    const before = JSON.stringify(relay.hub.roomState(t.code));
    const socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    const frames: ArrayBuffer[] = [];
    socket.addEventListener('message', (e: MessageEvent) => frames.push(e.data as ArrayBuffer));
    const closed = new Promise<number>((resolve) => {
      socket.addEventListener('close', (e: CloseEvent) => resolve(e.code));
    });
    await new Promise((r) => socket.addEventListener('open', r, { once: true }));
    const old = JSON.stringify({
      v: PROTOCOL_VERSION - 1,
      rules: RULES_VERSION,
      kind: 'join',
      code: t.code,
      ref: 'p_old',
      name: 'Old',
    });
    socket.send(await pack(old));
    expect(await closed).toBe(CLOSE.version);
    const reply = decodeServer(
      await unpack(new Uint8Array(frames[0] ?? new ArrayBuffer(0)), SERVER_FRAME_LIMIT),
    );
    expect(reply).toMatchObject({ ok: true, message: { kind: 'error', code: 'version' } });
    expect(JSON.stringify(relay.hub.roomState(t.code))).toBe(before);
    t.a.close();
    t.b.close();
  });

  it('tells a client when the RELAY is on another version, instead of misreading it', async () => {
    // A relay that answers every frame from a newer protocol: the client must refuse to read it.
    const server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
    server.on('connection', (socket) => {
      socket.on('message', () => {
        const newer = JSON.stringify({
          v: PROTOCOL_VERSION + 1,
          rules: RULES_VERSION,
          kind: 'joined',
          id: 1,
        });
        void pack(newer).then((bytes) => socket.send(bytes));
      });
    });
    await new Promise((r) => server.once('listening', r));
    const port = (server.address() as { port: number }).port;
    const attempt = RelayRoom.create({ url: `ws://127.0.0.1:${String(port)}`, name: 'X' });
    await expect(attempt).rejects.toBeInstanceOf(RelayError);
    await expect(attempt).rejects.toMatchObject({ code: 'version' });
    await new Promise<void>((r) => server.close(() => r()));
  });

  it('closes a gzip bomb as malformed, and goes on serving everyone else', async () => {
    const socket = new WebSocket(url);
    const closed = new Promise<number>((resolve) => {
      socket.addEventListener('close', (e: CloseEvent) => resolve(e.code));
    });
    await new Promise((r) => socket.addEventListener('open', r, { once: true }));
    // Four megabytes that pack to a few kilobytes: inside the transport's limit, far past the frame's.
    socket.send(await pack(encode({ kind: 'leave' }).padEnd(4 * 1024 * 1024, ' ')));
    expect(await closed).toBe(CLOSE.malformed);
    const t = await table();
    expect(t.a.room?.members).toHaveLength(2);
    t.a.close();
    t.b.close();
  });
});
