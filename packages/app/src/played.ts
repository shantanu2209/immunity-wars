/**
 * WHETHER THIS DEVICE HAS EVER STARTED A GAME.
 *
 * One boolean, its own key, for two things that must agree about the same question (piece 7 and
 * piece 8, docs/for-P2.7.md §20):
 *
 * - the difficulty screen's "Recommended for your first game", which item 8 of 19 September says
 *   should be shown to a newcomer and not to a returning player;
 * - the coach, which runs through a first game and not after it.
 *
 * ITS OWN KEY, for the reason `hints.ts` states at length: `SettingsSchema` pins `v: z.literal(1)`,
 * so a record carrying an unknown field fails `safeParse` and falls back to the defaults — adding a
 * field to that object would silently reset every player's chosen text size.
 *
 * Zod at the read, because a stored value is a trust boundary. A malformed or missing record reads
 * as "never played", which shows the guidance again: the harmless direction, and the same
 * degradation the other two preference modules take when the browser refuses `localStorage`.
 */
import { z } from 'zod';

import type { KeyValueStore } from './settings';

export const PLAYED_KEY = 'immunity-wars.played';

const PlayedSchema = z.object({ v: z.literal(1), played: z.boolean() });

export type PlayedRecord = z.infer<typeof PlayedSchema>;

export const NEVER_PLAYED: PlayedRecord = { v: 1, played: false };

/** Reads the flag. Any failure at all reads as "never played". */
export function readPlayed(store: KeyValueStore | null): PlayedRecord {
  if (store === null) return NEVER_PLAYED;
  let raw: string | null;
  try {
    raw = store.getItem(PLAYED_KEY);
  } catch {
    return NEVER_PLAYED;
  }
  if (raw === null) return NEVER_PLAYED;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NEVER_PLAYED;
  }
  const r = PlayedSchema.safeParse(parsed);
  return r.success ? r.data : NEVER_PLAYED;
}

/** Records that a game has been started. Returns false if the write failed. */
export function writePlayed(store: KeyValueStore | null): boolean {
  if (store === null) return false;
  try {
    store.setItem(PLAYED_KEY, JSON.stringify(PlayedSchema.parse({ v: 1, played: true })));
    return true;
  } catch {
    return false;
  }
}

/**
 * The Settings row's other half: removes the key, so the device is again indistinguishable from
 * one that has never played. It touches nothing else, and the confirm says so.
 */
export function clearPlayed(store: KeyValueStore | null): boolean {
  if (store === null) return false;
  try {
    store.removeItem(PLAYED_KEY);
    return true;
  } catch {
    return false;
  }
}
