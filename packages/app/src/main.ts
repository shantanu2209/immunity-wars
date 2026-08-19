/**
 * P2.2 commit 2 — the dev entry, whose only job today is the FIRST EXECUTION of
 * `IndexedDbStorage` (`packages/session/src/indexeddb.ts` was written at P2.1 with "NOTHING
 * EXERCISES THIS FILE" at the top; this is the browser that finally does).
 *
 * Two layers, deliberately:
 *
 *   1. The PORT, driven directly — put/get fidelity through a real structured clone, list,
 *      delete. The same shape as `MemoryStorage`'s tests, against the real thing.
 *   2. The SEAM, driven the only way the UI ever may — `session.save()` then
 *      `LocalSession.resume` from what `Storage` hands back, with the projections compared.
 *      This file reads a `GameState` only out of `Storage` to verify fidelity; it never gets
 *      one from Session, because Session does not hand them out.
 *
 * The board replaces this page from the next commit onward.
 */

import { IndexedDbStorage, LocalSession, type SavedGame } from '@immunity-wars/session';

const lines: string[] = [];
let failures = 0;

function report(ok: boolean, what: string): void {
  if (!ok) failures += 1;
  const line = `${ok ? 'PASS' : 'FAIL'}  ${what}`;
  lines.push(line);
  console.log(`[idb-exercise] ${line}`);
  const el = document.getElementById('report');
  if (el) el.textContent = lines.join('\n');
}

async function main(): Promise<void> {
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
  report(back !== null, 'get returns what put stored');
  report(
    JSON.stringify(back) === JSON.stringify(probe),
    'the stored record survives a real structured clone byte-for-byte (as JSON)',
  );
  const again = await storage.get('probe');
  report(
    JSON.stringify(again) === JSON.stringify(back),
    'two reads of the same row agree with each other',
  );
  const listed = await storage.list();
  report(
    listed.some((r) => r.id === 'probe'),
    'list sees the row',
  );
  await storage.delete('probe');
  report((await storage.get('probe')) === null, 'delete removes it; get returns null after');

  // --- 2. The seam, the only way the UI may drive it -----------------------------------------
  const session = LocalSession.createGame(
    { difficulty: 'training' },
    { storage, saveId: 'exercise-game' },
  );
  const beforeView = JSON.stringify(session.getView().game);
  await session.save();
  const saved = await storage.get('exercise-game');
  report(saved !== null, 'session.save() reached IndexedDB through the Storage port');
  if (saved) {
    const resumed = LocalSession.resume(saved.state, { storage, saveId: 'exercise-game' });
    report(
      JSON.stringify(resumed.getView().game) === beforeView,
      'a game resumed from the saved GameState projects the identical view',
    );
    const deckCount = (saved.state as Record<string, unknown>)['deck'];
    report(
      Array.isArray(deckCount),
      'the saved state carries the deck itself — the field a ViewState save would silently lose',
    );
  }
  await session.save();
  const rows = await storage.list();
  report(
    rows.filter((r) => r.id === 'exercise-game').length === 1,
    'saving twice overwrites the row rather than duplicating it',
  );
  session.dispose();

  const summary =
    failures === 0
      ? `IDB EXERCISE: ${lines.length}/${lines.length} PASS`
      : `IDB EXERCISE: ${failures} FAILURE(S) of ${lines.length}`;
  lines.push('', summary);
  console.log(`[idb-exercise] ${summary}`);
  const el = document.getElementById('report');
  if (el) el.textContent = lines.join('\n');
}

void main().catch((e: unknown) => {
  const el = document.getElementById('report');
  const msg = `THREW: ${String(e)}`;
  if (el) el.textContent = `${lines.join('\n')}\n${msg}`;
  console.log(`[idb-exercise] ${msg}`);
});
