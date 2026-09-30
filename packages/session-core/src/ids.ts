/**
 * A GAME SAVED BEFORE THE ENGINE CHANGE QUEUE, CARRIED FORWARD (ruled by Shantanu on 30 September
 * 2026: carried forward, not thrown away).
 *
 * THE COUNTER (FINDINGS #56). Until queue Q5 the engine handed out invader ids from a counter in its
 * module, which `newGame` reset. A saved game carried every id and not the counter, so a fresh
 * process (a page reload, a phone unlocked hours later) could hand out an id the game still held; and
 * a relay, hosting many rooms in one process, had every table's game reset the counter under the
 * others. Until Q5 this module advanced the shared counter past a game's ids on resume, and the room
 * did the same before every engine call. Q5 moved the counter into the game as `idCounter`, so neither
 * can happen to a game made since. A save made before has no counter: here it is worked out from every
 * id the game still holds (in its body, in its undo snapshots under the key the engine writes, `inv`,
 * FINDINGS #80, and in a resident's infection), so the next pathogen never reuses one.
 *
 * THE FIELDS THE QUEUE REMOVED are dropped: Q10's `science`, and Q2's `free`, from the game and from
 * each undo snapshot. A save made since is left exactly as it is.
 */

/** The highest invader id a game holds anywhere, as a number; 0 if it holds none. */
export function highestId(g: Record<string, unknown>): number {
  let max = 0;
  const seen = (id: unknown): void => {
    const m = /^i(\d+)$/.exec(String(id));
    if (m) max = Math.max(max, Number(m[1]));
  };
  for (const iv of (g['invaders'] as { id?: unknown }[] | undefined) ?? []) seen(iv.id);
  for (const snap of (g['undo'] as { inv?: { id?: unknown }[] }[] | undefined) ?? []) {
    for (const iv of snap.inv ?? []) seen(iv.id);
  }
  for (const r of Object.values(
    (g['residents'] as Record<string, { infectedBy?: unknown }> | undefined) ?? {},
  )) {
    if (r.infectedBy) seen(r.infectedBy);
  }
  return max;
}

/** Brings a saved game from before the queue to the queue's shape; leaves a newer one alone. */
export function migrateSavedGame(g: Record<string, unknown>): void {
  delete g['science'];
  delete g['free'];
  for (const snap of (g['undo'] as Record<string, unknown>[] | undefined) ?? [])
    delete snap['free'];
  if (typeof g['idCounter'] !== 'number') g['idCounter'] = highestId(g);
}
