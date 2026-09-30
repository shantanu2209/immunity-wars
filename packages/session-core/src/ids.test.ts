/**
 * A SAVED GAME FROM BEFORE THE ENGINE CHANGE QUEUE, CARRIED FORWARD (`ids.ts`; ruled 30 September
 * 2026). An old save has no id counter (queue Q5 put it in the state): it is worked out from every id
 * the game still holds, so the next pathogen never reuses one. And the fields Q10 and Q2 removed are
 * dropped. A save made since is left exactly as it is.
 *
 * FINDINGS #80 still applies to the working-out: an invader killed this phase, which an undo would
 * bring back, survives only in an undo snapshot, under the key the engine writes (`inv`). The snapshot
 * here is the ENGINE's, taken by its own `pushUndo` on a real game, not one written by hand: a
 * hand-written snapshot would only test the key its author believed in, which is exactly the belief
 * that was wrong.
 */
import { applyAction, newGame, pushUndo } from '@immunity-wars/engine';
import type { Action, GameState } from '@immunity-wars/engine';
import { uid } from '@immunity-wars/engine/internal';
import { describe, expect, it } from 'vitest';

import { highestId, migrateSavedGame } from './ids.js';

type Raw = Record<string, unknown>;
const num = (id: unknown): number => Number(/^i(\d+)$/.exec(String(id))?.[1] ?? 0);

const act = (g: GameState, action: string): void => {
  applyAction(g, { action } as unknown as Action);
};

/** A real single-player game, played turn by turn until at least three invaders are in the body. */
function withInvaders(): GameState {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const g = newGame({ difficulty: 'hard' }) as GameState;
    const raw = g as unknown as Raw;
    for (let turn = 0; turn < 20 && !raw['won'] && !raw['lost']; turn += 1) {
      act(g, 'draw');
      if ((raw['invaders'] as unknown[]).length >= 3) return g;
      act(g, 'beginCommand');
      act(g, 'endCommand');
    }
  }
  throw new Error('no game reached three invaders');
}

/** The same game in the shape a save had before the queue: no counter, and the removed fields. */
function asOldSave(g: GameState): Raw {
  const raw = JSON.parse(JSON.stringify(g)) as Raw;
  delete raw['idCounter'];
  raw['science'] = false;
  raw['free'] = {};
  for (const snap of (raw['undo'] as Raw[] | undefined) ?? []) snap['free'] = {};
  return raw;
}

describe('a saved game from before the queue', () => {
  it("advances past an id that only the engine's own undo snapshot still holds", () => {
    const g = withInvaders();
    const raw = g as unknown as Raw;
    pushUndo(g);
    // The TWO highest ids are killed after the snapshot, so only an undo still holds them.
    const body = [...(raw['invaders'] as { id: string }[])].sort((a, b) => num(a.id) - num(b.id));
    const top = body[body.length - 1];
    raw['invaders'] = body.slice(0, -2);
    const bodyMax = Math.max(0, ...(raw['invaders'] as { id: string }[]).map((iv) => num(iv.id)));
    // NOT VACUOUS: the highest id is above everything still in the body.
    expect(num(top?.id)).toBeGreaterThan(bodyMax);

    const old = asOldSave(g);
    migrateSavedGame(old);
    expect(num(uid(old as { idCounter: number }))).toBeGreaterThan(num(top?.id));
  });

  it("works out the counter from the body's ids and a resident's infection", () => {
    expect(
      highestId({
        invaders: [{ id: 'i5' }],
        undo: [],
        residents: { liver: { infectedBy: 'i12' } },
      }),
    ).toBe(12);
    const old: Raw = { invaders: [{ id: 'i5' }], undo: [], residents: {} };
    migrateSavedGame(old);
    expect(old['idCounter']).toBe(5);
  });

  it('drops the fields the queue removed, from the game and from every undo snapshot', () => {
    const g = withInvaders();
    pushUndo(g);
    const old = asOldSave(g);
    migrateSavedGame(old);
    expect('science' in old).toBe(false);
    expect('free' in old).toBe(false);
    for (const snap of old['undo'] as Raw[]) expect('free' in snap).toBe(false);
  });

  it('leaves a save made since exactly as it is, its own counter included', () => {
    const g = withInvaders();
    pushUndo(g);
    const now = JSON.parse(JSON.stringify(g)) as Raw;
    const before = JSON.stringify(now);
    migrateSavedGame(now);
    expect(JSON.stringify(now)).toBe(before);
  });
});
