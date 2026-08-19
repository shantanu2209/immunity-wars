/**
 * `Storage` over IndexedDB — the browser implementation.
 *
 * ============================================================================================
 * ⚠️ NOTHING EXERCISES THIS FILE. It is written and it is NOT KNOWN TO WORK.
 * ============================================================================================
 *
 * Said at the top rather than discovered later, because this repository's standing rule is that a
 * check which has never failed is not known to work, and the same reasoning applies with more
 * force to code that has never RUN. There is no browser in the test environment and no IndexedDB
 * shim among the dependencies, so every assertion about this file today is a reading of it.
 *
 * `MemoryStorage` is the implementation the `Storage` port is actually tested through, and it
 * round-trips through JSON on purpose so that it shares this one's failure modes rather than
 * being an easier fake that proves nothing.
 *
 * **The first thing P2.2 does with a browser is exercise this.** It is the natural moment: P2.2
 * introduces a dev server, which is also what pulls the `vitest 2 -> 3` trigger
 * (`docs/SECURITY_NOTES.md`), so the browser, the upgrade and this file's first execution belong
 * in one change.
 *
 * WHAT IS BEING RISKED BY WRITING IT NOW ANYWAY: very little. It is ~60 lines behind a four-method
 * port with a working alternative implementation, so if it turns out to be wrong the blast radius
 * is this file. What would NOT be acceptable is shipping it as though it were verified — hence
 * this header, and hence the P2.1 closeout listing it as unproven.
 *
 * ONE REAL CONSTRAINT IT IS BUILT AGAINST, from the measurement that justified `Storage` at all:
 * a `GameState` is stored, not a `ViewState`. IndexedDB's structured clone would happily store
 * either, and the one that fails only on reload is the wrong one.
 */

import type { SavedGame, Storage } from './storage.js';

const STORE = 'saves';

export class IndexedDbStorage implements Storage {
  constructor(
    private readonly dbName = 'immunity-wars',
    private readonly version = 1,
  ) {}

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const idb = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
      if (!idb) {
        reject(new Error('IndexedDB is not available in this environment'));
        return;
      }
      const req = idb.open(this.dbName, this.version);
      req.onupgradeneeded = (): void => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = (): void => {
        resolve(req.result);
      };
      req.onerror = (): void => {
        reject(req.error ?? new Error('could not open IndexedDB'));
      };
    });
  }

  private async run<T>(
    mode: IDBTransactionMode,
    body: (s: IDBObjectStore) => IDBRequest,
  ): Promise<T> {
    const db = await this.open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = body(tx.objectStore(STORE));
        req.onsuccess = (): void => {
          resolve(req.result as T);
        };
        req.onerror = (): void => {
          reject(req.error ?? new Error('IndexedDB request failed'));
        };
      });
    } finally {
      db.close();
    }
  }

  async put(save: SavedGame): Promise<void> {
    await this.run<unknown>('readwrite', (s) => s.put(save));
  }

  async get(id: string): Promise<SavedGame | null> {
    const row = await this.run<SavedGame | undefined>('readonly', (s) => s.get(id));
    return row ?? null;
  }

  async list(): Promise<readonly SavedGame[]> {
    const rows = await this.run<SavedGame[]>('readonly', (s) => s.getAll());
    return [...rows].sort((a, b) => b.savedAt - a.savedAt);
  }

  async delete(id: string): Promise<void> {
    await this.run<unknown>('readwrite', (s) => s.delete(id));
  }
}
