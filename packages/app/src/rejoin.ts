/**
 * THE ROOM THIS DEVICE IS IN, so a player whose phone closed the app can come back as themselves
 * (P3.7 piece C, ruled 25 September 2026: option (a)).
 *
 * Rejoining needs the same `self` the player joined with, and a phone closes background apps: a
 * player who switched to WhatsApp to send the code could otherwise never get their seats back. So
 * the room's code and `self` are kept on the device while the player is in the room, and the Title
 * offers *Rejoin room ABC123*, which the player chooses (ruling 4). The name is typed again
 * (ruling 2): it is not kept.
 *
 * WHAT IT HOLDS AND FOR HOW LONG. The code, which names a room held only in the relay's memory, and
 * `self`, a random value made on this device that identifies nothing and no one outside that room.
 * Forgotten when the player leaves the room or the game ends, when a rejoin is told the room is gone,
 * and in any case after a day: a room is discarded 10 minutes after its last player goes (brief §5),
 * so a record older than that can only point at a room that no longer exists.
 *
 * ITS OWN KEY and Zod at the read, as `played.ts` and `hints.ts` do, for the reasons they give. Any
 * failure reads as "no room", which offers nothing: the harmless direction.
 */
import { z } from 'zod';

import type { KeyValueStore } from './settings';

export const REJOIN_KEY = 'immunity-wars.room';

/** A day. Chosen here (P3.7 piece C), not ruled: see the header. */
export const REJOIN_TTL_MS = 24 * 60 * 60 * 1000;

const RejoinSchema = z.object({
  v: z.literal(1),
  code: z.string().regex(/^[A-Z0-9]{6}$/),
  self: z.string().regex(/^p_[0-9a-f]{16}$/),
  savedAt: z.number(),
});

export type RejoinRecord = z.infer<typeof RejoinSchema>;

/** The room to offer, or null: none, unreadable, or older than a day. */
export function readRejoin(store: KeyValueStore | null, now: number): RejoinRecord | null {
  if (store === null) return null;
  let raw: string | null;
  try {
    raw = store.getItem(REJOIN_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const r = RejoinSchema.safeParse(parsed);
  if (!r.success) return null;
  const age = now - r.data.savedAt;
  return age >= 0 && age < REJOIN_TTL_MS ? r.data : null;
}

/** Remembers the room this device has just entered. Returns false if the write failed. */
export function writeRejoin(
  store: KeyValueStore | null,
  code: string,
  self: string,
  now: number,
): boolean {
  if (store === null) return false;
  try {
    store.setItem(
      REJOIN_KEY,
      JSON.stringify(RejoinSchema.parse({ v: 1, code, self, savedAt: now })),
    );
    return true;
  } catch {
    return false;
  }
}

/** Forgets it. */
export function clearRejoin(store: KeyValueStore | null): boolean {
  if (store === null) return false;
  try {
    store.removeItem(REJOIN_KEY);
    return true;
  } catch {
    return false;
  }
}
