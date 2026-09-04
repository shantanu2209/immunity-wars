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

import { clone, findResidentMeal } from './constructed.js';

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
  s.setSelection({ cell, family: null, resident: null });
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
      s.setSelection({ cell: 'macrophage', family: null, resident: null });
      await s.sendAction({ action: 'draw' });
      expect(s.getView().selection.cell, 'draw did not clear the selection').toBeNull();

      await s.sendAction({ action: 'beginCommand' });
      s.setSelection({ cell: 'macrophage', family: null, resident: null });
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

/** Move `cell` to an explicit destination, through the session. */
async function moveTo(
  s: LocalSession,
  cell: string,
  d: { zone: string; lane?: string; organ?: string; step?: number },
): Promise<void> {
  const out = await s.sendAction({ action: 'move', cell, ...d });
  if (!out.ok) throw new Error(`move rejected: ${out.error ?? ''}`);
}

const cellOf = (s: LocalSession, cell: string): Record<string, unknown> =>
  (s.getView().game['cells'] as Record<string, Record<string, unknown>>)[cell] ?? {};
const residentOf = (s: LocalSession, organ: string): Record<string, unknown> =>
  (s.getView().game['residents'] as Record<string, Record<string, unknown>>)[organ] ?? {};

describe('CP3: the move class is move, hop, recall and resmove; resengulf commits', () => {
  it('two patrols unwind: the resident back at its organ, AP restored', async () => {
    installRng(0x51de);
    try {
      const s = await atCommandPhase();
      const start = canonical(s.getView().game);
      const apStart = Number(s.getView().game['ap']);
      expect((await s.sendAction({ action: 'resmove', organ: 'liver', step: 1 })).ok).toBe(true);
      expect((await s.sendAction({ action: 'resmove', organ: 'liver', step: 2 })).ok).toBe(true);
      expect(residentOf(s, 'liver')['step']).toBe(2);
      expect(Number(s.getView().game['ap'])).toBe(apStart - 2);
      expect(s.getView().undo).toEqual({ available: true, moves: 2 });

      expect((await s.sendAction({ action: 'undo' })).ok).toBe(true);
      expect(residentOf(s, 'liver')['step']).toBe(0);
      expect(Number(s.getView().game['ap'])).toBe(apStart);
      expect(canonical(s.getView().game)).toBe(start);
      expect(s.getView().undo).toEqual({ available: false, moves: 0 });
      s.dispose();
    } finally {
      restoreRng();
    }
  });

  it('a hop unwinds with the moves that reached the crossing: lane and position restored', async () => {
    installRng(0x51de);
    try {
      const s = await atCommandPhase();
      const start = canonical(s.getView().game);
      // The Monocyte walks to the Nose crossing (speed 1, three moves), then slides to the Gut.
      await moveTo(s, 'macrophage', { zone: 'route', lane: 'nose', step: 1 });
      await moveTo(s, 'macrophage', { zone: 'route', lane: 'nose', step: 2 });
      await moveTo(s, 'macrophage', { zone: 'route', lane: 'nose', step: 3 });
      const hop = await s.sendAction({ action: 'hop', cell: 'macrophage', lane: 'gut' });
      expect(hop.ok, `hop rejected: ${hop.error ?? ''}`).toBe(true);
      expect(cellOf(s, 'macrophage')['lane']).toBe('gut');
      expect(cellOf(s, 'macrophage')['step']).toBe(3);
      expect(s.getView().undo).toEqual({ available: true, moves: 4 });

      expect((await s.sendAction({ action: 'undo' })).ok).toBe(true);
      expect(cellOf(s, 'macrophage')['zone']).toBe('hub');
      expect(canonical(s.getView().game)).toBe(start);
      s.dispose();
    } finally {
      restoreRng();
    }
  });

  it('a recall unwinds: back where the cell stood, AP restored', async () => {
    installRng(0x51de);
    try {
      const s = await atCommandPhase();
      const start = canonical(s.getView().game);
      const apStart = Number(s.getView().game['ap']);
      await moveTo(s, 'macrophage', { zone: 'route', lane: 'nose', step: 1 });
      expect((await s.sendAction({ action: 'recall', cell: 'macrophage' })).ok).toBe(true);
      expect(cellOf(s, 'macrophage')['zone']).toBe('hub');
      expect(Number(s.getView().game['ap'])).toBe(apStart - 2);
      expect(s.getView().undo).toEqual({ available: true, moves: 2 });

      expect((await s.sendAction({ action: 'undo' })).ok).toBe(true);
      expect(Number(s.getView().game['ap'])).toBe(apStart);
      expect(canonical(s.getView().game)).toBe(start);
      s.dispose();
    } finally {
      restoreRng();
    }
  });

  it('resengulf ENDS undo — after the patrols that reached the meal', async () => {
    const meal = findResidentMeal();
    expect(meal, 'no reachable resident meal in the recorded games').not.toBeNull();
    if (!meal) return;
    installRng(1);
    try {
      // `from` was captured right after beginCommand: an empty engine stack, so the resumed
      // session starts with undo clean rather than conservatively unavailable.
      const s = LocalSession.resume(clone(meal.from), {
        storage: new MemoryStorage(),
        now: () => 0,
      });
      for (let k = 1; k <= meal.steps; k += 1) {
        const r = await s.sendAction({ action: 'resmove', organ: meal.organ, step: k });
        expect(r.ok, `patrol ${String(k)} rejected: ${r.error ?? ''}`).toBe(true);
      }
      expect(s.getView().undo).toEqual({ available: true, moves: meal.steps });
      const eat = await s.sendAction({
        action: 'resengulf',
        organ: meal.organ,
        invaderId: meal.invaderId,
      });
      expect(eat.ok, `resengulf rejected: ${eat.error ?? ''}`).toBe(true);
      const ids = ((s.getView().game['invaders'] as { id?: unknown }[]) ?? []).map((iv) => iv.id);
      expect(ids).not.toContain(meal.invaderId);
      expect(s.getView().undo).toEqual({ available: false, moves: 0 });
      expect((await s.sendAction({ action: 'undo' })).ok).toBe(false);
      s.dispose();
    } finally {
      restoreRng();
    }
  });

  it('a selected resident clears at the end of command, like a cell', async () => {
    installRng(0x51de);
    try {
      const s = await atCommandPhase();
      s.setSelection({ cell: null, family: null, resident: 'liver' });
      expect(s.getView().selection.resident).toBe('liver');
      await s.sendAction({ action: 'resmove', organ: 'liver', step: 1 });
      expect(s.getView().selection.resident, 'a patrol keeps the selection (chaining)').toBe(
        'liver',
      );
      await s.sendAction({ action: 'endCommand' });
      expect(s.getView().selection.resident).toBeNull();
      s.dispose();
    } finally {
      restoreRng();
    }
  });
});
