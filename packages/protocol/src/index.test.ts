/**
 * THE PROTOCOL, held to what it promises (docs/PHASE3_BRIEF.md, P3.2).
 *
 * Both halves, as CLAUDE.md requires: a decoder that refused everything would pass every "must be
 * refused" test here, so every refusal has a round trip beside it that must be ACCEPTED, for every
 * kind of message in both directions.
 */
import { describe, expect, it } from 'vitest';

import {
  PACKAGE_NAME,
  PROTOCOL_VERSION,
  RULES_VERSION,
  decodeClient,
  decodeServer,
  encode,
  type ClientMessage,
  type ServerMessage,
} from './index.js';

const CLIENT: readonly ClientMessage[] = [
  { kind: 'join', code: 'ABC123', ref: 'p_device', name: 'Kartik' },
  { kind: 'create', ref: 'p_device', name: 'Kartik' },
  { kind: 'leave' },
  { kind: 'claimSeat', seat: 'bcell' },
  { kind: 'releaseSeat', seat: 'res_liver' },
  { kind: 'assignSeat', seat: 'nk', to: 2 },
  { kind: 'assignSeat', seat: 'nk', to: null },
  { kind: 'start', difficulty: 'training' },
  { kind: 'action', id: 7, action: { action: 'move', cell: 'neutrophil', to: 3 } },
];

/** What a view carries beside itself since v2 (P3.4): the relay's answers, as LocalSession's. */
const BESIDE = {
  queries: { state: { hivActive: false }, perCell: { helperWith: { bcell: null } } },
  scoped: {
    moveDestinations: { neutrophil: [{ zone: 'hub' }], bcell: [] },
    productionDetail: { ENV: { base: 1, net: 1 } },
  },
};

const SERVER: readonly ServerMessage[] = [
  { kind: 'joined', id: 1 },
  {
    kind: 'room',
    room: {
      code: 'ABC123',
      phase: 'lobby',
      captain: 1,
      members: [{ id: 1, name: 'Kartik', connected: true, seats: ['bcell'] }],
      freeSeats: ['nk'],
    },
  },
  { kind: 'view', view: { phase: 'infection', turn: 1 }, ...BESIDE },
  { kind: 'result', id: 7, ok: true },
  { kind: 'result', id: 8, ok: false, code: 'engine', detail: 'Draw first.' },
  { kind: 'result', id: 9, ok: false, code: 'undoIsSinglePlayer' },
  { kind: 'burst', frames: [{ label: 'The march', dice: null, view: { turn: 2 } }] },
  { kind: 'error', code: 'notCaptain' },
  { kind: 'error', code: 'noSuchRoom' },
  { kind: 'error', code: 'version' },
  { kind: 'error', code: 'engine', detail: 'Draw first.' },
];

const withHeader = (v: unknown, rules: unknown, body: object): string =>
  JSON.stringify({ v, rules, ...body });

describe('the package', () => {
  it('is importable by the test runner', () => {
    expect(PACKAGE_NAME).toBe('@immunity-wars/protocol');
  });
});

describe('every message carries both versions', () => {
  it('because the encoder stamps them, whatever the message', () => {
    for (const m of [...CLIENT, ...SERVER]) {
      const raw = JSON.parse(encode(m)) as { v?: unknown; rules?: unknown };
      expect(raw.v).toBe(PROTOCOL_VERSION);
      expect(raw.rules).toBe(RULES_VERSION);
    }
  });
});

describe('a round trip is accepted, for every kind both ways', () => {
  it('client to relay', () => {
    for (const m of CLIENT) {
      const d = decodeClient(encode(m));
      expect(d.ok, m.kind).toBe(true);
      if (d.ok) expect(d.message).toEqual(m);
    }
  });

  it('relay to client', () => {
    for (const m of SERVER) {
      const d = decodeServer(encode(m));
      expect(d.ok, m.kind).toBe(true);
      if (d.ok) expect(d.message).toEqual(m);
    }
  });
});

describe('a peer on another version is refused, before its body is read', () => {
  it('refuses a peer on another protocol version, and says which side is behind', () => {
    const d = decodeClient(withHeader(PROTOCOL_VERSION + 1, RULES_VERSION, { kind: 'leave' }));
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.refusal.refused).toBe('version');
    if (d.refusal.refused !== 'version') return;
    expect(d.refusal.theirs.v).toBe(PROTOCOL_VERSION + 1);
    expect(d.refusal.ours.v).toBe(PROTOCOL_VERSION);
  });

  it('refuses a peer on another rules version', () => {
    const d = decodeServer(withHeader(PROTOCOL_VERSION, '0.0.1', { kind: 'joined', id: 1 }));
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.refusal.refused).toBe('version');
  });

  it('refuses a peer that sends no versions at all, as a version question', () => {
    const d = decodeClient(JSON.stringify({ kind: 'leave' }));
    expect(d.ok).toBe(false);
    if (!d.ok && d.refusal.refused === 'version')
      expect(d.refusal.theirs).toEqual({ v: null, rules: null });
    else throw new Error('expected a version refusal');
  });

  it('refuses even a perfectly formed body when the version is wrong', () => {
    // The body would parse. It must not be looked at.
    const body = { kind: 'action', id: 1, action: { action: 'draw' } };
    expect(decodeClient(withHeader(PROTOCOL_VERSION + 1, RULES_VERSION, body)).ok).toBe(false);
  });
});

describe('a malformed message is refused as malformed', () => {
  it('when it is not JSON', () => {
    const d = decodeClient('{not json');
    expect(!d.ok && d.refusal.refused).toBe('malformed');
  });

  it('when it is JSON but not an object', () => {
    for (const t of ['5', '"join"', 'null', '[]']) {
      const d = decodeClient(t);
      expect(!d.ok && d.refusal.refused, t).toBe('malformed');
    }
  });

  it('when the kind is unknown, the seat does not exist, or the name is empty', () => {
    for (const body of [
      { kind: 'teleport' },
      { kind: 'claimSeat', seat: 'pancreas' },
      { kind: 'join', code: 'ABC123', ref: 'p', name: '   ' },
      { kind: 'start', difficulty: 'impossible' },
    ]) {
      const d = decodeClient(withHeader(PROTOCOL_VERSION, RULES_VERSION, body));
      expect(!d.ok && d.refusal.refused, JSON.stringify(body)).toBe('malformed');
    }
  });

  it('when a name is long enough to be a payload rather than a name', () => {
    const body = { kind: 'join', code: 'ABC123', ref: 'p', name: 'x'.repeat(25) };
    expect(decodeClient(withHeader(PROTOCOL_VERSION, RULES_VERSION, body)).ok).toBe(false);
  });
});

describe('a ref rides on join and nowhere else', () => {
  it('is dropped from any other message, so it cannot be smuggled', () => {
    const d = decodeClient(
      withHeader(PROTOCOL_VERSION, RULES_VERSION, { kind: 'leave', ref: 'someone_else' }),
    );
    expect(d.ok).toBe(true);
    if (d.ok) expect('ref' in d.message).toBe(false);
  });
});

describe('a view arrives byte for byte (the measurement in docs/for-P3.md §2, pinned)', () => {
  // Built to catch the two ways a schema breaks a view, both measured on real views: keys in an
  // order no schema would declare them in, with `turn` late (declaring it would pull it to the
  // front), and nested objects and arrays a stripping schema would drop.
  const view = {
    zeta: 1,
    phase: 'command',
    organs: { liver: { hp: 3, max: 3 }, heart: { hp: 2, max: 3 } },
    invaders: [{ id: 'i1', type: 'virus', lane: 'nose', step: 4 }],
    turn: 7,
    alpha: null,
  };

  it('delivers a view byte for byte', () => {
    const d = decodeServer(encode({ kind: 'view', view, ...BESIDE }));
    expect(d.ok).toBe(true);
    if (d.ok && d.message.kind === 'view') {
      expect(JSON.stringify(d.message.view)).toBe(JSON.stringify(view));
    }
  });

  it('delivers what comes beside a view byte for byte too: its queries and scoped answers', () => {
    // Engine-derived like the view, so held to the same standard: nothing reordered or dropped.
    const queries = { zeta: { b: 2, a: 1 }, state: { hivActive: true }, alpha: [3, 1, 2] };
    const scoped = {
      moveDestinations: { nk: [{ step: 3 }, { step: 1 }], macrophage: [] },
      productionDetail: { TOX: { reduced: true, base: 2 }, ENV: null },
    };
    const d = decodeServer(encode({ kind: 'view', view, queries, scoped }));
    expect(d.ok).toBe(true);
    if (d.ok && d.message.kind === 'view') {
      expect(JSON.stringify(d.message.queries)).toBe(JSON.stringify(queries));
      expect(JSON.stringify(d.message.scoped)).toBe(JSON.stringify(scoped));
    }
  });

  it('delivers every view inside a burst byte for byte too', () => {
    const d = decodeServer(
      encode({ kind: 'burst', frames: [{ label: 'The march', dice: [3, 5], view }] }),
    );
    expect(d.ok).toBe(true);
    if (d.ok && d.message.kind === 'burst') {
      expect(JSON.stringify(d.message.frames[0]?.view)).toBe(JSON.stringify(view));
    }
  });

  it('still refuses a view that is not an object', () => {
    const d = decodeServer(
      withHeader(PROTOCOL_VERSION, RULES_VERSION, { kind: 'view', view: 'x' }),
    );
    expect(!d.ok && d.refusal.refused).toBe('malformed');
  });
});
