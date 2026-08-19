/**
 * The IndexedDbStorage exercise, first executed at P2.2 commit 2 (9/9) and kept running on
 * every load of the dev shell since — `packages/session/src/indexeddb.ts`'s header promises
 * that a regression here surfaces the first time anyone opens the page. Moved out of the entry
 * file when the board took the page over; the checks are unchanged.
 */

import { IndexedDbStorage, LocalSession, type SavedGame } from '@immunity-wars/session';

export async function runIdbExercise(report: (line: string) => void): Promise<string> {
  let failures = 0;
  let count = 0;
  const check = (ok: boolean, what: string): void => {
    count += 1;
    if (!ok) failures += 1;
    const line = `${ok ? 'PASS' : 'FAIL'}  ${what}`;
    report(line);
    console.log(`[idb-exercise] ${line}`);
  };

  const storage = new IndexedDbStorage('immunity-wars-dev-exercise');

  // --- 1. The port, directly -----------------------------------------------------------------
  const probe: SavedGame = {
    id: 'probe',
    state: {
      nested: { deck: [1, 2, 3], label: 'µ-macrophage ✦' },
      flags: [true, false, null],
      n: 0.5,
    },
    savedAt: 1,
  };
  await storage.put(probe);
  const back = await storage.get('probe');
  check(back !== null, 'get returns what put stored');
  check(
    JSON.stringify(back) === JSON.stringify(probe),
    'the stored record survives a real structured clone byte-for-byte (as JSON)',
  );
  const again = await storage.get('probe');
  check(
    JSON.stringify(again) === JSON.stringify(back),
    'two reads of the same row agree with each other',
  );
  const listed = await storage.list();
  check(
    listed.some((r) => r.id === 'probe'),
    'list sees the row',
  );
  await storage.delete('probe');
  check((await storage.get('probe')) === null, 'delete removes it; get returns null after');

  // --- 2. The seam, the only way the UI may drive it -----------------------------------------
  const session = LocalSession.createGame(
    { difficulty: 'training' },
    { storage, saveId: 'exercise-game' },
  );
  const beforeView = JSON.stringify(session.getView().game);
  await session.save();
  const saved = await storage.get('exercise-game');
  check(saved !== null, 'session.save() reached IndexedDB through the Storage port');
  if (saved) {
    const resumed = LocalSession.resume(saved.state, { storage, saveId: 'exercise-game' });
    check(
      JSON.stringify(resumed.getView().game) === beforeView,
      'a game resumed from the saved GameState projects the identical view',
    );
    const deck = (saved.state as Record<string, unknown>)['deck'];
    check(
      Array.isArray(deck),
      'the saved state carries the deck itself — the field a ViewState save would silently lose',
    );
  }
  await session.save();
  const rows = await storage.list();
  check(
    rows.filter((r) => r.id === 'exercise-game').length === 1,
    'saving twice overwrites the row rather than duplicating it',
  );
  session.dispose();

  const summary =
    failures === 0
      ? `IDB EXERCISE: ${count}/${count} PASS`
      : `IDB EXERCISE: ${failures} FAILURE(S) of ${count}`;
  console.log(`[idb-exercise] ${summary}`);
  return summary;
}
