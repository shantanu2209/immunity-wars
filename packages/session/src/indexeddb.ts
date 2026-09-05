/**
 * `Storage` over IndexedDB — the browser implementation.
 *
 * ============================================================================================
 * FIRST EXECUTED 19 August 2026, at P2.2 commit 2 — 9/9 checks PASS in a real browser.
 * ============================================================================================
 *
 * This header said "NOTHING EXERCISES THIS FILE. It is written and it is NOT KNOWN TO WORK"
 * from the day it was written at P2.1 until the dev server existed — deliberately, because the
 * standing rule is that code which has never run is not known to work, and the P2.1 closeout
 * listed it as unproven. The exercise is `packages/app/src/main.ts`, run against a live page:
 *
 *   - the PORT directly: put/get fidelity through a real structured clone, two reads agreeing,
 *     list, delete-then-null;
 *   - the SEAM as the UI drives it: `session.save()` → `LocalSession.resume` from what Storage
 *     handed back, projections identical, and the saved state carrying the 96-card `deck` — the
 *     field a `ViewState` save would silently lose;
 *   - confirmed independently by a raw `indexedDB` read outside the exercised code path
 *     (one row, 50 state keys, deckLen 96).
 *
 * WHAT THIS DOES NOT PROVE, kept honest: one browser (desktop Chromium), one profile, no
 * quota-pressure or concurrent-tab behaviour, no schema migration (`version` is still 1). The
 * exercise page reruns on every load of the dev shell, so regressions here surface the first
 * time anyone opens it.
 *
 * `MemoryStorage` remains the implementation the port's TESTS run through, round-tripping JSON
 * on purpose so it shares this one's failure modes rather than being an easier fake.
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
