/**
 * PLAYING TOGETHER — the rules the way-in screens follow (P3.7 piece A, docs/for-P3.md §6).
 *
 * Pure, so each rule is tested before a phone sees it, and the screens stay thin: they render what
 * these return and send what the player chose.
 *
 * WHAT A ROOM LOOKS LIKE HERE is the relay's own projection (`RoomProjection`, from the protocol,
 * the vocabulary both sides share). Members are named by their public id and the name they typed
 * for this room, and nothing else about them reaches this screen: no ref, ever (FINDINGS #77).
 */
import { CELL_SEATS, ORGAN_SEATS, type RoomProjection, type Seat } from '@immunity-wars/protocol';

import { t } from '../i18n';
import { cellDisplayName, organDisplayName, residentDisplayName } from '../names';

export type LobbyRoom = RoomProjection;

/** Codes are typed by people, and the relay ignores case and spaces; so does the box. */
export function normaliseCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

/** Six characters, the length the relay mints. */
export const codeComplete = (code: string): boolean => /^[A-Z0-9]{6}$/.test(code);

/** A name the protocol accepts: one to 24 characters once trimmed. */
export const nameReady = (name: string): boolean => {
  const n = name.trim();
  return n.length >= 1 && n.length <= 24;
};

export interface SeatRow {
  readonly seat: Seat;
  /** The piece's name as the player knows it. */
  readonly name: string;
  /** For a resident, the organ it lives in; for a cell, nothing. */
  readonly detail: string | null;
  /** Who holds it, or null when it is free. */
  readonly holder: { readonly id: number; readonly name: string; readonly away: boolean } | null;
  readonly mine: boolean;
}

/** The fourteen seats, in the engine's order: the seven cells, then the seven residents. */
export function seatRows(room: LobbyRoom, me: number): SeatRow[] {
  const holderOf = new Map<string, LobbyRoom['members'][number]>();
  for (const m of room.members) for (const s of m.seats) holderOf.set(s, m);
  const row = (seat: Seat, name: string, detail: string | null): SeatRow => {
    const h = holderOf.get(seat);
    return {
      seat,
      name,
      detail,
      holder: h ? { id: h.id, name: h.name, away: !h.connected } : null,
      mine: h?.id === me,
    };
  };
  return [
    ...CELL_SEATS.map((s) => row(s, cellDisplayName(s), null)),
    ...ORGAN_SEATS.map((s) => {
      const organ = s.slice('res_'.length);
      return row(
        s,
        residentDisplayName(organ),
        t('resident.of', { organ: organDisplayName(organ) }),
      );
    }),
  ];
}

/** The captain can start once someone holds a seat; the room refuses a game with nobody seated. */
export const canStart = (room: LobbyRoom): boolean => room.members.some((m) => m.seats.length > 0);

/**
 * WHY SOMETHING WAS REFUSED, in the player's words. The relay sends codes, never English (P3.2), and
 * a connection that ends says why with a close code (`CLOSE` in the relay's hub). Anything not
 * listed gets the general line, so an unexpected code never reaches the screen as a raw key.
 */
const REFUSALS: readonly string[] = [
  'noSuchRoom',
  'lobbyClosed',
  'gameEnded',
  'version',
  'seatTaken',
  'notCaptain',
  'nobodySeated',
  'alreadyStarted',
  'notInRoom',
  'seatHeldByPresent',
  'memberAway',
  'noSuchMember',
  'closed',
  'busy',
  'slowDown',
  'replaced',
  'unreachable',
];

/** The relay's close codes, 4001 to 4009, as the refusal each one is. */
const CLOSE_CODES: Readonly<Record<number, string>> = {
  4001: 'version',
  4002: 'closed',
  4003: 'closed',
  4004: 'replaced',
  4005: 'closed',
  4006: 'busy',
  4007: 'closed',
  4008: 'slowDown',
  4009: 'closed',
};

export const refusalFromClose = (closeCode: number): string => CLOSE_CODES[closeCode] ?? 'closed';

/**
 * WHY A ROOM COULD NOT BE ENTERED, from what `RelayRoom.create` or `join` rejected with: the room's
 * own refusal when it gave one; the reason the relay closed with when it closed instead (busy, too
 * many wrong codes); and otherwise `unreachable`, because a connection that never opened was not
 * "lost" and the player's next step is their own internet, not the room.
 */
export function entryRefusal(code: string, closeCode: number | null): string {
  if (code !== 'closed') return code;
  return (closeCode === null ? undefined : CLOSE_CODES[closeCode]) ?? 'unreachable';
}

export function refusalText(code: string, detail?: string): string {
  const key = REFUSALS.includes(code) ? code : 'other';
  return t(`together.refusal.${key}`, { name: detail ?? '' });
}

/** Every catalogue key this module can produce, so a test can hold each one to the catalogue. */
export const REFUSAL_KEYS: readonly string[] = [...REFUSALS, 'other'].map(
  (k) => `together.refusal.${k}`,
);
