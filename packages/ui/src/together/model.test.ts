/**
 * THE WAY IN, held to its rules before a phone sees it (P3.7 piece A).
 *
 * And its words: every key the together screens and the lobby name is held to the catalogue here,
 * because `t()` answers a missing key with ⟪the key⟫ on screen and nothing else would notice until a
 * player did. The keys are read out of the screens' own source, so a key added to a screen and
 * forgotten in the catalogue fails this without anyone having to list it twice.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { ERROR_CODES, SEATS } from '@immunity-wars/protocol';
import { describe, expect, it } from 'vitest';

import { t } from '../i18n';
import {
  REFUSAL_KEYS,
  canStart,
  codeComplete,
  nameReady,
  entryRefusal,
  normaliseCode,
  refusalFromClose,
  refusalText,
  seatRows,
  type LobbyRoom,
} from './model';

const loud = (s: string): boolean => s.includes('⟪');

const room = (over: Partial<LobbyRoom> = {}): LobbyRoom => ({
  code: 'ACDEFG',
  phase: 'lobby',
  captain: 1,
  members: [
    { id: 1, name: 'Asha', connected: true, seats: ['bcell', 'res_liver'] },
    { id: 2, name: 'Ravi', connected: false, seats: ['nk'] },
  ],
  freeSeats: [],
  ...over,
});

describe('a room code as typed', () => {
  it('ignores case, spaces and anything that is not a letter or digit, and stops at six', () => {
    expect(normaliseCode(' ac d-e f7 ')).toBe('ACDEF7');
    expect(normaliseCode('acdefg9')).toBe('ACDEFG');
  });

  it('is complete at six characters and not before', () => {
    expect(codeComplete('ACDEF')).toBe(false);
    expect(codeComplete('ACDEFG')).toBe(true);
  });
});

describe('a name', () => {
  it('is ready at one to 24 characters once trimmed, as the protocol accepts', () => {
    expect(nameReady('')).toBe(false);
    expect(nameReady('   ')).toBe(false);
    expect(nameReady('x'.repeat(25))).toBe(false);
    expect(nameReady('  Asha ')).toBe(true);
  });
});

describe('the seats', () => {
  it('are all fourteen, in the engine order, each with a name the player can read', () => {
    const rows = seatRows(room(), 1);
    expect(rows.map((r) => r.seat)).toEqual([...SEATS]);
    for (const r of rows) expect(loud(r.name) || loud(r.detail ?? ''), r.seat).toBe(false);
    // A resident says which organ it lives in; a cell does not need to.
    expect(rows.find((r) => r.seat === 'res_liver')?.detail).toBeTruthy();
    expect(rows.find((r) => r.seat === 'bcell')?.detail).toBeNull();
  });

  it('say who holds each, whether they are away, and which are mine', () => {
    const rows = seatRows(room(), 1);
    const at = (s: string) => rows.find((r) => r.seat === s);
    expect(at('bcell')).toMatchObject({ mine: true, holder: { id: 1, name: 'Asha', away: false } });
    expect(at('nk')).toMatchObject({ mine: false, holder: { id: 2, name: 'Ravi', away: true } });
    expect(at('tcell')).toMatchObject({ mine: false, holder: null });
  });

  it('let the captain start once someone holds a seat, and not before', () => {
    expect(canStart(room())).toBe(true);
    expect(canStart(room({ members: [{ id: 1, name: 'A', connected: true, seats: [] }] }))).toBe(
      false,
    );
  });
});

describe('a refusal', () => {
  it('has words for every code the relay can send, never a raw key', () => {
    for (const code of ERROR_CODES) expect(loud(refusalText(code, 'Ravi')), code).toBe(false);
    expect(refusalText('noSuchRoom')).not.toBe(refusalText('lobbyClosed'));
  });

  it('has words for every way a connection can end, and for a code nobody expected', () => {
    for (let c = 4000; c <= 4010; c += 1)
      expect(loud(refusalText(refusalFromClose(c))), String(c)).toBe(false);
    expect(loud(refusalText(refusalFromClose(1006)))).toBe(false);
    expect(loud(refusalText('somethingNew'))).toBe(false);
  });

  it('at the way in, names the refusal of the room, else the reason the relay closed with, else unreachable', () => {
    expect(entryRefusal('noSuchRoom', null)).toBe('noSuchRoom');
    expect(entryRefusal('closed', 4006)).toBe('busy');
    expect(entryRefusal('closed', 4008)).toBe('slowDown');
    // A connection that never opened, or dropped with the transport's own code: not "lost".
    expect(entryRefusal('closed', 1006)).toBe('unreachable');
    expect(entryRefusal('closed', null)).toBe('unreachable');
    expect(refusalText('unreachable')).not.toBe(refusalText('closed'));
  });

  it('every refusal key is in the catalogue', () => {
    for (const k of REFUSAL_KEYS) expect(loud(t(k)), k).toBe(false);
  });
});

describe('every key the new screens name', () => {
  const screens = [
    '../screens/TogetherScreen.tsx',
    '../screens/LobbyScreen.tsx',
    '../screens/TitleScreen.tsx',
    '../panels/TableView.tsx',
    '../panels/ConnectionLost.tsx',
  ];
  const keys = screens.flatMap((f) => {
    const src = readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8');
    return [...src.matchAll(/\bt\(\s*'([a-zA-Z0-9.]+)'/g)].map((m) => m[1] ?? '');
  });

  it('were found, so this is not a check of nothing', () => {
    expect(keys.length).toBeGreaterThan(30);
  });

  it('are in the catalogue', () => {
    for (const k of keys) expect(loud(t(k)), k).toBe(false);
  });
});
