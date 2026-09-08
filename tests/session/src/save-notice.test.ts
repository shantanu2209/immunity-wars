/**
 * THE SAVE-FAILURE NOTICE — the third arm of the subscription union.
 *
 * Ruled by Shantanu on 8 September 2026 (`docs/for-P2.6-errors.md` point 4). Before it, a failed
 * autosave was swallowed by `.catch(() => undefined)`, so a player could believe their game was
 * saved for forty turns when it was not, and the UI could not find out: it never sees
 * `GameState` and cannot check for itself.
 *
 * The arm went on the SUBSCRIPTION rather than on the view because save health is a fact about
 * this DEVICE, not about the game, and the view is what crosses a network in Phase 3.
 *
 * These tests are about three things that are each easy to get silently wrong:
 *
 *   1. It fires at all when the write fails.
 *   2. It fires ONCE, not once per action — a broken storage layer fails every write.
 *   3. It does NOT fire when the write succeeds, which is the half that a "forbid X" test set
 *      would never check and which would make a notice that always fires look perfect.
 *
 * And one that is not about the notice at all: **a failing storage must still not break the
 * game.** The engine has already applied the action when the save runs, so a rejection here
 * would fail something that already happened.
 */

import {
  LocalSession,
  MemoryStorage,
  type SessionEvent,
  type SavedGame,
} from '@immunity-wars/session';
import { describe, expect, it } from 'vitest';

/** Storage that accepts reads and refuses every write. The shape of a device with no quota. */
class RefusingStorage extends MemoryStorage {
  public attempts = 0;
  override put(save: SavedGame): Promise<void> {
    this.attempts += 1;
    void save;
    return Promise.reject(new Error('quota exceeded'));
  }
}

/** Fails the first `n` writes and then works. Storage that recovers is not a state the session
 *  models, and this exists to pin that the latch does NOT reset rather than to endorse it. */
class FlakyStorage extends MemoryStorage {
  public attempts = 0;
  constructor(private readonly failFirst: number) {
    super();
  }
  override put(save: SavedGame): Promise<void> {
    this.attempts += 1;
    if (this.attempts <= this.failFirst) return Promise.reject(new Error('transient'));
    return super.put(save);
  }
}

const record = (storage: MemoryStorage): { events: SessionEvent[]; session: LocalSession } => {
  const session = LocalSession.createGame({ difficulty: 'training' }, { storage, now: () => 0 });
  const events: SessionEvent[] = [];
  session.subscribe((e) => events.push(e));
  return { events, session };
};

const notices = (events: SessionEvent[]): SessionEvent[] =>
  events.filter((e) => e.kind === 'notice');

/** A handful of accepted actions, whatever the opening offers. Draw is always available. */
const playALittle = async (session: LocalSession): Promise<number> => {
  let accepted = 0;
  for (const action of ['draw', 'draw', 'beginCommand']) {
    const out = await session.sendAction({ action });
    if (out.ok) accepted += 1;
  }
  return accepted;
};

describe('the save-failure notice', () => {
  it('fires when the autosave fails, and the action is still accepted', async () => {
    const storage = new RefusingStorage();
    const { events, session } = record(storage);
    const accepted = await playALittle(session);
    // The point of the swallow: a device that cannot save still plays.
    expect(accepted).toBeGreaterThan(0);
    expect(storage.attempts).toBeGreaterThan(0);
    expect(notices(events)).toHaveLength(1);
    expect(notices(events)[0]).toEqual({ kind: 'notice', notice: 'save-failed' });
    session.dispose();
  });

  it('fires ONCE however many writes fail, since a broken store fails all of them', async () => {
    const storage = new RefusingStorage();
    const { events, session } = record(storage);
    await playALittle(session);
    await playALittle(session);
    // More than one write was attempted and every one of them failed...
    expect(storage.attempts).toBeGreaterThan(1);
    // ...and the player was told once. Asserting the attempts matters: without it this would
    // also pass on a session that stopped saving entirely after the first failure.
    expect(notices(events)).toHaveLength(1);
    session.dispose();
  });

  it('CONTROL: does NOT fire when the storage works, or the notice would be worthless', async () => {
    const { events, session } = record(new MemoryStorage());
    const accepted = await playALittle(session);
    expect(accepted).toBeGreaterThan(0);
    expect(notices(events)).toHaveLength(0);
    // And the views still arrive, so this is not a session that emitted nothing at all.
    expect(events.filter((e) => e.kind === 'view').length).toBeGreaterThan(0);
    session.dispose();
  });

  it('does not reset the latch when storage starts working, and that is deliberate', async () => {
    const storage = new FlakyStorage(1);
    const { events, session } = record(storage);
    await playALittle(session);
    // One notice from the first failure; later successes neither repeat nor retract it.
    expect(notices(events)).toHaveLength(1);
    expect(storage.attempts).toBeGreaterThan(1);
    session.dispose();
  });

  it('an explicit save() still REJECTS, because its caller asked and deserves the answer', async () => {
    const session = LocalSession.createGame(
      { difficulty: 'training' },
      { storage: new RefusingStorage(), now: () => 0 },
    );
    await expect(session.save()).rejects.toThrow();
    session.dispose();
  });
});
