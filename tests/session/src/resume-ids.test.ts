/**
 * A GAME SAVED BEFORE THE ENGINE CHANGE QUEUE RESUMES WITH EVERY ID UNIQUE (ruled 30 September 2026:
 * carried forward, not thrown away; FINDINGS #56).
 *
 * Until queue Q5 a save carried every invader's id but not the counter, which lived in the engine's
 * module. Q5 put the counter in the game as `idCounter`, so a save made since carries it. A save made
 * before has none, and the session works it out on resume (`migrateSavedGame`), dropping the fields
 * the queue removed as it goes.
 *
 * THE OLD SAVES HERE ARE REAL: games played in the ORIGINAL engine, untouched. Until the queue the
 * port's state agreed with the original's key for key (the equivalence corpus held it so), so the
 * original's state is exactly the shape a save had before this update: `science` and `free`, and no
 * counter. They are resumed through `LocalSession`, played on through a draw, and every id in the
 * body must be unique. THE CONTROL drives the engine alone on the same save, with no migration, and
 * requires the ids to break, so the check is known to see the defect and the session is known to be
 * what prevents it.
 */

import { describe, expect, it } from 'vitest';

import * as engine from '@immunity-wars/engine';
import { loadOriginalLegacy } from '@immunity-wars/equivalence/engine';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import type { Engine, GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage } from '@immunity-wars/session';

const PORT = engine as unknown as Engine;
type Raw = Record<string, unknown>;

const ids = (g: unknown): string[] =>
  (((g as Raw)['invaders'] as { id?: unknown }[] | undefined) ?? []).map((iv) => String(iv.id));
const duplicates = (xs: string[]): string[] => xs.filter((x, i) => xs.indexOf(x) !== i);

const TURN = ['beginCommand', 'endCommand', 'draw'] as const;

/**
 * Saves as they were before the queue: the original's own games, played turn by turn until at least
 * two invaders are in the body, then written out as the app's storage writes a state, as JSON.
 */
function oldSaves(): Raw[] {
  const original = loadOriginalLegacy();
  const out: Raw[] = [];
  for (const difficulty of ['training', 'normal', 'hard'])
    for (let seed = 1; seed <= 30 && out.length < 6; seed += 1) {
      installRng(seed);
      try {
        const g = original.newGame({ difficulty }) as unknown as Raw;
        for (let turn = 0; turn < 12 && !g['won'] && !g['lost']; turn += 1) {
          original.applyAction(g as never, { action: 'draw' } as never);
          if (ids(g).length >= 2) {
            out.push(JSON.parse(JSON.stringify(g)) as Raw);
            break;
          }
          original.applyAction(g as never, { action: 'beginCommand' } as never);
          original.applyAction(g as never, { action: 'endCommand' } as never);
        }
      } finally {
        restoreRng();
      }
    }
  return out;
}

describe('a game saved before the queue resumes with every id unique (Q5, FINDINGS #56)', () => {
  const saves = oldSaves();

  it('found real old saves, in the shape they had (vacuity guard)', () => {
    expect(saves.length).toBeGreaterThanOrEqual(3);
    for (const s of saves) {
      expect('idCounter' in s).toBe(false);
      expect('science' in s).toBe(true);
      expect('free' in s).toBe(true);
    }
  });

  it('CONTROL: the engine alone, with no migration, cannot hand out a proper id to the next arrival', () => {
    let broken = 0;
    for (const save of saves) {
      const g = JSON.parse(JSON.stringify(save)) as Raw;
      installRng(7);
      try {
        for (const action of TURN) PORT.applyAction(g as unknown as GameState, { action } as never);
      } finally {
        restoreRng();
      }
      const after = ids(g);
      if (duplicates(after).length > 0 || after.some((id) => !/^i\d+$/.test(id))) broken += 1;
    }
    expect(
      broken,
      'the defect did not reproduce: the check below would be vacuous',
    ).toBeGreaterThan(0);
  });

  it('through the session, the same save plays on with every id unique, in the new shape', async () => {
    for (const save of saves) {
      const s = LocalSession.resume(JSON.parse(JSON.stringify(save)), {
        storage: new MemoryStorage(),
        now: () => 0,
      });
      installRng(7);
      try {
        for (const action of TURN) {
          const r = await s.sendAction({ action });
          if (!r.ok) break; // a game can end on the spread; what arrived before that still counts
        }
      } finally {
        restoreRng();
      }
      const game = s.getView().game;
      const after = ids(game);
      s.dispose();
      expect(duplicates(after)).toEqual([]);
      expect(
        after.every((id) => /^i\d+$/.test(id)),
        after.join(' '),
      ).toBe(true);
      expect('science' in game).toBe(false);
      expect('free' in game).toBe(false);
    }
  });
});
