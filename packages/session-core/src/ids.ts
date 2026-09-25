/**
 * FINDINGS #56's WORKAROUND, shared: the engine's invader-id counter is not in `GameState`, and
 * `newGame` resets it. `LocalSession` needs this on resume; the room needs it before EVERY engine
 * call, because a relay hosts many rooms in one process and a game starting in one resets the
 * counter for all of them (`packages/room/src/ids.test.ts`, P3.4). Moved here from `LocalSession`
 * unchanged, including a wrong undo-snapshot key, FINDINGS #80, fixed on its own afterwards.
 */
import { uid } from '@immunity-wars/engine/internal';

/**
 * THE ENGINE'S ID COUNTER IS NOT IN THE STATE (FINDINGS #56, found 5 September 2026 by the
 * planning screen's walkthrough). Invader ids come from a module-level counter that `newGame`
 * resets; a saved game carries the ids but not the counter, so in a fresh process — a page
 * reload, a phone unlocked hours later — the counter starts at zero and the next arrival is
 * `i1` again, colliding with an invader already in the body. Every id-keyed path then answers
 * for the wrong pathogen: attack rings, the inspect sheet, the memory response, the planning
 * rows. `gamestate-round-trip` cannot see it: the counter is outside the state it round-trips.
 *
 * WORKAROUND, at the join that owns resume: read the largest id the save carries (in the body
 * and in the undo snapshots) and advance the counter past it. Only ever ADVANCE — the counter
 * is shared by every session in the process, and lowering it for one would poison another.
 * One id is consumed to read the counter; ids need only be unique, so that costs nothing.
 * The engine is frozen in Phase 2; Phase 3 puts the counter in `GameState` and deletes this.
 *
 * ⚠️ *P3.4, 24 September 2026:* the sentence above was the plan in Phase 2. Phase 3's brief keeps
 * the engine unchanged but for `handOverCaptaincy`, so the counter is still outside the state and
 * this still runs, now before every engine call a room makes. The undo-snapshot half read a key
 * the engine does not write until FINDINGS #80 was fixed, on 25 September 2026.
 */
export function advanceIdsPast(g: Record<string, unknown>): void {
  let max = 0;
  const seen = (id: unknown): void => {
    const m = /^i(\d+)$/.exec(String(id));
    if (m) max = Math.max(max, Number(m[1]));
  };
  for (const iv of (g['invaders'] as { id?: unknown }[] | undefined) ?? []) seen(iv.id);
  // `inv` is the key the engine's `pushUndo` writes. Until FINDINGS #80 this read `invaders`, a key
  // no snapshot has, so this loop never saw an id.
  for (const snap of (g['undo'] as { inv?: { id?: unknown }[] }[] | undefined) ?? []) {
    for (const iv of snap.inv ?? []) seen(iv.id);
  }
  for (const r of Object.values(
    (g['residents'] as Record<string, { infectedBy?: unknown }> | undefined) ?? {},
  )) {
    if (r.infectedBy) seen(r.infectedBy);
  }
  let current = Number(uid().slice(1));
  while (current < max) current = Number(uid().slice(1));
}
