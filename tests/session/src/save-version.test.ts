/**
 * A SAVED GAME SAYS WHICH RULES WROTE IT, AND ONE A NEWER VERSION WROTE IS NOT CONTINUED (seam 7,
 * built 5 October 2026: `docs/LOOK_PLAN.md` §28, step 4; `packages/session/src/saveFit.ts`).
 *
 * Every save is written through the session the app uses, into the in-memory store that round-trips
 * JSON as a real one does, and read back as the app reads it. Control: pnpm ci:selftest
 * save-from-a-newer-version-is-not-continued.
 */
import { RULES_VERSION } from '@immunity-wars/content';
import {
  LocalSession,
  MemoryStorage,
  SaveTooNew,
  canContinue,
  saveFit,
  type SavedGame,
} from '@immunity-wars/session';
import { describe, expect, it } from 'vitest';

/** A game played to its command stage and saved, as the app saves one. */
async function savedGame(): Promise<{ storage: MemoryStorage; save: SavedGame }> {
  const storage = new MemoryStorage();
  const s = LocalSession.createGame({ difficulty: 'training' }, { storage, saveId: 'autosave' });
  expect((await s.sendAction({ action: 'draw' })).ok).toBe(true);
  const save = await storage.get('autosave');
  if (!save) throw new Error('the session saved nothing');
  return { storage, save };
}

/** The same save, as a different version of the app would have written it. */
const writtenBy = (save: SavedGame, rulesVersion: unknown): SavedGame =>
  ({ ...save, rulesVersion }) as SavedGame;

describe('a saved game says which rules wrote it', () => {
  it('every save the session writes carries this app’s rules version', async () => {
    const { save } = await savedGame();
    expect(save.rulesVersion, 'A SAVE DOES NOT SAY WHICH RULES WROTE IT').toBe(RULES_VERSION);
    expect(saveFit(save)).toBe('this');
  });

  it('reads each version against this one', () => {
    const at = (v: unknown): string => saveFit({ rulesVersion: v }, '4.2.0');
    expect(at(undefined)).toBe('unstamped');
    expect(at('4.2.0')).toBe('this');
    expect(at('4.1.2')).toBe('older');
    expect(at('3.9.9')).toBe('older');
    expect(at('4.2.1')).toBe('newer');
    expect(at('4.10.0')).toBe('newer'); // by number, not by letter: "4.10" sorts before "4.2"
    expect(at('5.0.0')).toBe('newer');
    // Not a version this app writes: not continued, as continuing what cannot be read can lose it.
    expect(at('banana')).toBe('newer');
    expect(at(42)).toBe('newer');
  });
});

describe('what the app continues', () => {
  it('a game this version saved, played on from where it was', async () => {
    const { storage, save } = await savedGame();
    const s = LocalSession.fromSave(save, { storage, saveId: 'autosave' });
    expect(s.getView().game['turn']).toBe(1);
    expect((await s.sendAction({ action: 'beginCommand' })).ok).toBe(true);
  });

  it('a game saved before saves were stamped, carried forward as ruled on 30 September', async () => {
    const { storage, save } = await savedGame();
    const old = { id: save.id, state: save.state, savedAt: save.savedAt };
    expect(saveFit(old)).toBe('unstamped');
    expect(canContinue('unstamped')).toBe(true);
    const s = LocalSession.fromSave(old, { storage, saveId: 'autosave' });
    expect((await s.sendAction({ action: 'beginCommand' })).ok).toBe(true);
    // And once it is played on, it is saved with this version's stamp.
    expect((await storage.get('autosave'))?.rulesVersion).toBe(RULES_VERSION);
  });

  it('a game an older version saved, carried forward', async () => {
    const { storage, save } = await savedGame();
    const s = LocalSession.fromSave(writtenBy(save, '0.0.1'), { storage, saveId: 'autosave' });
    expect((await s.sendAction({ action: 'beginCommand' })).ok).toBe(true);
  });

  it('NOT a game a newer version saved, and nothing is written over it', async () => {
    const { storage, save } = await savedGame();
    const newer = writtenBy(save, '999.0.0');
    await storage.put(newer);
    let refused: unknown = null;
    try {
      LocalSession.fromSave(newer, { storage, saveId: 'autosave' });
    } catch (e) {
      refused = e;
    }
    expect(refused, 'A GAME A NEWER VERSION SAVED WAS CONTINUED').toBeInstanceOf(SaveTooNew);
    expect((refused as SaveTooNew).rulesVersion).toBe('999.0.0');
    expect((await storage.get('autosave'))?.rulesVersion).toBe('999.0.0');
  });
});
