/**
 * P2.5 — UNDO IS FOR MOVES ONLY, and it is a SESSION rule (Shantanu, 4 September 2026).
 *
 * The design distinction, not a safety valve: movement is repositioning — no dice, no hidden
 * information, you can see where a cell would land — so undoing a move corrects a mis-tap.
 * Everything else is COMMITMENT: attacks roll dice, engulf consumes a target, produce changes
 * the pool. Undoing those would re-roll a bad die and turn a cooperative puzzle into
 * trial-and-error.
 *
 * Three things the ruling said to get right, each pinned below:
 *   1. SESSION rule — the engine's snapshot stack does not know action types and is frozen.
 *   2. ALL moves, not just the last: undo unwinds to the start of the command phase.
 *   3. A REJECTED committing action does not end undo: nothing happened.
 *
 * Written before the implementation and run red first.
 */

import { describe, expect, it } from 'vitest';

import { canonical } from '@immunity-wars/equivalence/hash';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import { LocalSession, MemoryStorage } from '@immunity-wars/session';

async function atCommandPhase(): Promise<LocalSession> {
  const s = LocalSession.createGame(
    { difficulty: 'training' },
    { storage: new MemoryStorage(), now: () => 0 },
  );
  await s.sendAction({ action: 'draw' });
  await s.sendAction({ action: 'beginCommand' });
  return s;
}

/** Move `cell` to its first legal destination, through the selection-scoped view. */
async function moveOnce(s: LocalSession, cell = 'macrophage'): Promise<void> {
  s.setSelection({ cell, family: null });
  const dests = (s.getView().scoped.moveDestinations ?? []) as Record<string, unknown>[];
  const d = dests[0];
  if (!d) throw new Error(`${cell} has no destination — this test cannot move`);
  const out = await s.sendAction({
    action: 'move',
    cell,
    zone: d['zone'],
    lane: d['lane'],
    organ: d['organ'],
    step: d['step'],
  });
  if (!out.ok) throw new Error(`move rejected: ${out.error ?? ''}`);
}

describe('P2.5: undo is for moves only — a session rule', () => {
  it('before any move, undo is unavailable and an undo request is rejected', async () => {
    installRng(0x51de);
    try {
      const s = await atCommandPhase();
      expect(s.getView().undo).toEqual({ available: false, moves: 0 });
      const out = await s.sendAction({ action: 'undo' });
      expect(out.ok).toBe(false);
      s.dispose();
    } finally {
      restoreRng();
    }
  });

  it('ALL moves unwind: two moves, one undo, back to the start of the phase with AP restored', async () => {
    installRng(0x51de);
    try {
      const s = await atCommandPhase();
      const start = canonical(s.getView().game);
      const apStart = Number(s.getView().game['ap']);

      await moveOnce(s);
      await moveOnce(s);
      expect(Number(s.getView().game['ap']), 'moves should have spent AP').toBe(apStart - 2);
      expect(s.getView().undo).toEqual({ available: true, moves: 2 });

      const out = await s.sendAction({ action: 'undo' });
      expect(out.ok).toBe(true);
      expect(Number(s.getView().game['ap']), 'AP is part of the undo').toBe(apStart);
      expect(canonical(s.getView().game), 'not back at the start of the phase').toBe(start);
      expect(s.getView().undo).toEqual({ available: false, moves: 0 });
      s.dispose();
    } finally {
      restoreRng();
    }
  });

  it('a committing action ends undo for the phase — even one the engine snapshots (produce)', async () => {
    installRng(0x51de);
    try {
      const s = await atCommandPhase();
      await moveOnce(s);
      expect(s.getView().undo.available).toBe(true);
      const commit = await s.sendAction({ action: 'produce', family: 'ENV' });
      expect(commit.ok, 'the control committing action was supposed to be accepted').toBe(true);
      expect(s.getView().undo).toEqual({ available: false, moves: 0 });
      expect((await s.sendAction({ action: 'undo' })).ok).toBe(false);
      // A later move does not bring it back: the die has been cast this phase.
      await moveOnce(s, 'neutrophil');
      expect(s.getView().undo.available).toBe(false);
      s.dispose();
    } finally {
      restoreRng();
    }
  });

  it('a committing action the engine does NOT snapshot (orderAntivenom) still ends undo', async () => {
    installRng(0x51de);
    try {
      const s = await atCommandPhase();
      await moveOnce(s);
      const commit = await s.sendAction({ action: 'orderAntivenom' });
      expect(commit.ok, 'the control committing action was supposed to be accepted').toBe(true);
      expect(s.getView().undo.available).toBe(false);
      s.dispose();
    } finally {
      restoreRng();
    }
  });

  it('a REJECTED committing action does not end undo — nothing happened', async () => {
    installRng(0x51de);
    try {
      const s = await atCommandPhase();
      await moveOnce(s);
      const start = canonical(s.getView().game);
      const bad = await s.sendAction({ action: 'strike', cell: 'tcell' });
      expect(bad.ok, 'the control action was supposed to be rejected').toBe(false);
      expect(s.getView().undo).toEqual({ available: true, moves: 1 });
      // And the rejected produce (no family) leaves an engine snapshot behind; undo must still
      // land exactly at the phase start, not one snapshot short.
      const bad2 = await s.sendAction({ action: 'produce' });
      expect(bad2.ok).toBe(false);
      expect((await s.sendAction({ action: 'undo' })).ok).toBe(true);
      // `start` was taken after the move; the phase start is one move earlier.
      expect(canonical(s.getView().game)).not.toBe(start);
      expect(Number(s.getView().game['ap'])).toBe(6);
      s.dispose();
    } finally {
      restoreRng();
    }
  });

  it('undo is a command-phase thing: a new command phase starts clean', async () => {
    installRng(0x51de);
    try {
      const s = await atCommandPhase();
      await moveOnce(s);
      await s.sendAction({ action: 'endCommand' });
      await s.sendAction({ action: 'draw' });
      await s.sendAction({ action: 'beginCommand' });
      expect(s.getView().undo).toEqual({ available: false, moves: 0 });
      s.dispose();
    } finally {
      restoreRng();
    }
  });
});

describe('P2.5: selection clears at phase boundaries — in the session', () => {
  it('draw clears it; end of command clears it', async () => {
    installRng(0x51de);
    try {
      const s = LocalSession.createGame(
        { difficulty: 'training' },
        { storage: new MemoryStorage(), now: () => 0 },
      );
      s.setSelection({ cell: 'macrophage', family: null });
      await s.sendAction({ action: 'draw' });
      expect(s.getView().selection.cell, 'draw did not clear the selection').toBeNull();

      await s.sendAction({ action: 'beginCommand' });
      s.setSelection({ cell: 'macrophage', family: null });
      await moveOnce(s);
      expect(s.getView().selection.cell, 'a move should keep the selection (chaining)').toBe(
        'macrophage',
      );
      await s.sendAction({ action: 'endCommand' });
      expect(s.getView().selection.cell, 'end of command did not clear the selection').toBeNull();
      s.dispose();
    } finally {
      restoreRng();
    }
  });
});
