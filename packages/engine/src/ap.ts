/**
 * Action Point plumbing.
 *
 * Single-device play uses ONE shared pool: g.ap. Multiplayer splits it into per-player budgets
 * (g.apBudget[pid]) during an allocation phase, after which each player spends only their own.
 * Anything the captain leaves unallocated stays in the captain's budget.
 *
 * These functions are the single choke points, which is what lets the rest of the engine stay
 * agnostic about which mode it is in.
 */

import type { Action, GameState } from './state.js';

/** Which player's budget an action draws from. The server passes a.pid (the acting member). */
export function apOwnerOf(g: GameState, a: Action | null | undefined): string | null {
  return g.multiplayer && a && a.pid ? (a.pid as string) : null;
}

export function apAvail(g: GameState, pid: string | null | undefined): number {
  if (!g.multiplayer) return g.ap;
  return g.apBudget && pid && g.apBudget[pid] ? g.apBudget[pid] : 0;
}

export function spendAP(g: GameState, pid: string | null | undefined, n?: number): void {
  const amount = n || 1;
  if (!g.multiplayer) {
    g.ap -= amount;
    return;
  }
  if (pid == null) return;
  g.apBudget[pid] = Math.max(0, (g.apBudget[pid] || 0) - amount);
}

/** A free action granted by the Helper T-Cell is consumed before any AP is. */
export function spend(g: GameState, ck: string | null | undefined): void {
  // Read the free-action count ONCE. The guard is what establishes the key is present, so
  // reusing its value is the handling — re-indexing afterwards is what created a lookup the
  // compiler could not prove.
  const free = ck && g.free ? (g.free[ck] ?? 0) : 0;
  if (ck && g.free && free > 0) {
    g.free[ck] = free - 1;
    return;
  }
  spendAP(g, g._actingPid, 1);
}

export function hasFree(g: GameState, ck: string | null | undefined): boolean {
  return !!(ck && g.free && (g.free[ck] ?? 0) > 0);
}

/** AP available to whoever is currently acting. */
export function apNow(g: GameState): number {
  return g.multiplayer ? apAvail(g, g._actingPid) : g.ap;
}

export function canAct(g: GameState, ck: string | null | undefined): boolean {
  return apNow(g) > 0 || hasFree(g, ck);
}
