/**
 * Primitives: the small shared helpers the rest of the engine is built from.
 *
 * Two of these — shuffle and d6 — call Math.random directly, exactly as legacy does. That is
 * deliberate and load-bearing for the equivalence proof: the rig seeds the GLOBAL Math.random
 * and compares draw counts action by action, so introducing an injected generator here would
 * both change the public API and break the mechanism that catches wrong-dice bugs.
 * See docs/TASK_B_PLAN.md §1.1.
 */

import { LYMPH_GROUP, LYMPH_STEP, ORGANS, ORGAN_SETS, ROUTES, ROUTE_KEYS } from './data/board.js';
import { FAMILY } from './data/families.js';
import type { AbPoolKey, Difficulty, OrganKey, RouteKey } from './types.js';

/** In-place Fisher-Yates, returning the same array. Consumes one draw per element but the last. */
export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const ai = a[i];
    a[i] = a[j];
    a[j] = ai;
  }
  return a;
}

/**
 * Deep clone via JSON, matching legacy exactly.
 *
 * This is lossy in ways that matter and are therefore preserved: undefined-valued keys are
 * dropped, and NaN becomes null. The engine's stats counters really do go NaN
 * (docs/FINDINGS.md #3), so a "better" clone here would change observable behaviour.
 */
export function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}

let uidCounter = 0;

/** Invader ids. newGame resets the counter, which is why ids are stable per game and per seed. */
export function uid(): string {
  uidCounter += 1;
  return `i${uidCounter}`;
}

/** Reset the id counter. Called by newGame; exported so tests can reproduce a state exactly. */
export function resetUid(): void {
  uidCounter = 0;
}

export function d6(): number {
  return 1 + Math.floor(Math.random() * 6);
}

/** charAt rather than indexing: it returns '' out of range, so there is no miss to handle. */
export function cap1(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** The antigen class an invader's antibodies must match. Novel pathogens use the "X" pool. */
export function famOf(iv: { novel?: boolean; disease: string }): AbPoolKey {
  return iv.novel ? 'X' : (FAMILY[iv.disease] ?? 'EXB');
}

export function branchLen(o: OrganKey): number {
  return ORGANS[o].branch;
}

export function organsFor(
  diff: Difficulty,
  override?: readonly OrganKey[] | null,
): readonly OrganKey[] {
  return override ?? ORGAN_SETS[diff] ?? ORGAN_SETS.normal;
}

/**
 * The routes a cell at the lymph crossing can slide to.
 *
 * Group members only, and only those whose route is long enough to have a crossing at all.
 * Blood has no group, so it returns nothing — a needle bypasses the tissues entirely.
 */
export function lymphPartners(lane: RouteKey): RouteKey[] {
  const g = LYMPH_GROUP[lane];
  if (!g) return [];
  return ROUTE_KEYS.filter(
    (l) => l !== lane && LYMPH_GROUP[l] === g && ROUTES[l].len >= LYMPH_STEP,
  );
}
