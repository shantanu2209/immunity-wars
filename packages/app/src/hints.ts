/**
 * WHICH FIRST-ENCOUNTER HINTS THIS DEVICE HAS SEEN.
 *
 * Ruled by Shantanu on 8 September 2026 (`docs/for-P2.6-onboarding.md` point 5).
 *
 * ============================================================================================
 * WHY THIS IS ITS OWN KEY AND NOT A FIELD ON `Settings`
 * ============================================================================================
 *
 * `SettingsSchema` pins `v: z.literal(1)`. A record carrying an unknown field fails `safeParse`
 * and falls back to `DEFAULT_SETTINGS` — which means adding hints-seen to that object would
 * **silently reset every player's chosen text size** on the first load after the update. That
 * was measured before it was proposed, and it is the kind of thing found afterwards.
 *
 * The two also have different shapes and different lifetimes: settings are three small
 * preferences read before first paint, this is a growing set of up to nineteen ids that only
 * the play screen needs. They are separate because they are separate, not to avoid a migration.
 *
 * **The Settings SCREEN can clear this**, and that row lives there — the data does not. So
 * Settings now clears three things held in three places: the autosave in IndexedDB, the
 * preferences in one key, and these in another. That is deliberate and it is recorded rather
 * than discovered.
 *
 * Zod at the read, because a stored value is a trust boundary like any other: this is
 * `localStorage`, which a player, an extension or a previous version of this app can write.
 * A malformed record reads as "nothing seen", which shows a hint again — the harmless direction.
 *
 * A NULL store is the browser refusing `localStorage` entirely (private mode, site data blocked).
 * It reads as nothing seen and every write fails, so hints show and are never remembered. That is
 * the same degradation the settings module takes, and it is better than no game.
 */
import { z } from 'zod';

import type { KeyValueStore } from './settings';

export const HINTS_KEY = 'immunity-wars.hints';

/**
 * Ids are opaque here on purpose. This module must not know what a hint is about; the UI owns
 * the subject vocabulary, and a stored id whose subject no longer exists is simply never
 * matched rather than being an error to handle.
 */
const HintsSchema = z.object({
  v: z.literal(1),
  seen: z.array(z.string().min(1).max(64)).max(200),
});

export type HintsRecord = z.infer<typeof HintsSchema>;

export const NO_HINTS_SEEN: HintsRecord = { v: 1, seen: [] };

/** The same shape the settings module uses; re-exported by name so this module reads alone. */
export type HintStore = KeyValueStore;

/** Reads the seen set. Any failure at all reads as "nothing seen". */
export function readHints(store: HintStore | null): HintsRecord {
  if (store === null) return NO_HINTS_SEEN;
  let raw: string | null;
  try {
    raw = store.getItem(HINTS_KEY);
  } catch {
    return NO_HINTS_SEEN;
  }
  if (raw === null) return NO_HINTS_SEEN;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NO_HINTS_SEEN;
  }
  const r = HintsSchema.safeParse(parsed);
  return r.success ? r.data : NO_HINTS_SEEN;
}

/** Writes the seen set. Returns false if the write failed, so a caller can stop trying. */
export function writeHints(store: HintStore | null, seen: readonly string[]): boolean {
  if (store === null) return false;
  try {
    store.setItem(HINTS_KEY, JSON.stringify(HintsSchema.parse({ v: 1, seen: [...seen] })));
    return true;
  } catch {
    return false;
  }
}

/**
 * The Settings row. Removes the key rather than writing an empty record, so a cleared device is
 * indistinguishable from one that has never played — there is no state to get subtly wrong.
 *
 * It touches nothing else: not the autosave, not the preferences. The confirm says so.
 */
export function clearHints(store: HintStore | null): boolean {
  if (store === null) return false;
  try {
    store.removeItem(HINTS_KEY);
    return true;
  } catch {
    return false;
  }
}
