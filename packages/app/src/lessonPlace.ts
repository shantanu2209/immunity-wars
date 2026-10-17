/**
 * HOW FAR THROUGH THE GUIDED GAME'S LESSON THIS DEVICE HAS GOT (step 3, `docs/LOOK_PLAN.md` §28):
 * the number of its chapters done. A player who stops at a chapter's end, or leaves from anywhere in
 * the next, comes back to the chapter after the last one done; the session plays the lesson to it
 * again on its own dice (`playLessonTo`), since a game on rails is never saved.
 *
 * ITS OWN KEY, for the reason `played.ts` gives: adding a field to the settings record would reset
 * every player's settings. Zod at the read, because a stored value is a trust boundary; anything
 * missing or malformed reads as no chapter done, which begins the lesson again, the harmless way.
 *
 * It keeps the most chapters ever done: playing the lesson again from Settings and stopping early
 * does not take a player's place back.
 */
import { z } from 'zod';

import type { KeyValueStore } from './settings';

export const LESSON_KEY = 'immunity-wars.lesson';

const PlaceSchema = z.object({ v: z.literal(1), done: z.number().int().nonnegative() });

/** The chapters done. Any failure at all reads as none. */
export function readChaptersDone(store: KeyValueStore | null): number {
  if (store === null) return 0;
  try {
    const raw = store.getItem(LESSON_KEY);
    if (raw === null) return 0;
    const r = PlaceSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data.done : 0;
  } catch {
    return 0;
  }
}

/** Records that `done` chapters are done, keeping the most. Returns false if the write failed. */
export function writeChaptersDone(store: KeyValueStore | null, done: number): boolean {
  if (store === null) return false;
  try {
    const most = Math.max(done, readChaptersDone(store));
    store.setItem(LESSON_KEY, JSON.stringify(PlaceSchema.parse({ v: 1, done: most })));
    return true;
  } catch {
    return false;
  }
}
