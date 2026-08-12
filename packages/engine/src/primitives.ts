/**
 * Primitives: the small shared helpers the rest of the engine is built from.
 *
 * Two of these — shuffle and d6 — call Math.random directly, exactly as legacy does. That is
 * deliberate and load-bearing for the equivalence proof: the rig seeds the GLOBAL Math.random
 * and compares draw counts action by action, so introducing an injected generator here would
 * both change the public API and break the mechanism that catches wrong-dice bugs.
 * See docs/TASK_B_PLAN.md §1.1.
 */

import {
  FAMILY,
  LYMPH_GROUP,
  LYMPH_STEP,
  NOVEL_ANTIGENS,
  ORGAN_SETS,
  ORGANS,
  ROUTE_KEYS,
  ROUTES,
} from '@immunity-wars/content';
import type { AbPoolKey, Difficulty, OrganKey, RouteKey } from './types.js';

/** In-place Fisher-Yates, returning the same array. Consumes one draw per element but the last. */
export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    // Both indices are in range by construction: i runs from length-1 down to 1, and j is drawn
    // from [0, i]. The compiler cannot express that, so the swap is guarded with `in` rather
    // than asserted away.
    //
    // `in` and not `!== undefined` on purpose: an array holding a genuine `undefined` VALUE must
    // still swap, exactly as legacy does. Only a HOLE — which Fisher-Yates over a dense array
    // cannot produce — would skip, and the engine never shuffles a sparse array.
    if (i in a && j in a) {
      const ai = a[i] as T;
      const aj = a[j] as T;
      a[i] = aj;
      a[j] = ai;
    }
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
/**
 * Which antibody pool an invader answers to.
 *
 * DEVIATES FROM LEGACY — docs/DEVIATIONS.md #5, fixing docs/FINDINGS.md #13. Legacy reads:
 *
 *     return iv.novel ? 'X' : (FAMILY[iv.disease] ?? 'EXB');
 *
 * so the `novel` FLAG was the only thing keeping Pathogen X out of the EXB pool. Lose it
 * anywhere — a JSON round trip dropping a falsy field, a loader, a refactor — and the novel
 * pathogen silently became an ordinary extracellular bacterium: an EXB antibody the player
 * happened to hold for something unrelated would simply kill it, clonal selection would never
 * happen, and the card would still appear while the lesson it exists to teach quietly did not.
 * Every test still passed, because the miss was HANDLED and its handling was wrong for exactly
 * one card. No type system can say that.
 *
 * Now the content DECLARES it. `NOVEL_ANTIGENS` is the explicit exemption the schema requires
 * of any card with no `FAMILY` entry, so the pool no longer depends on a flag surviving.
 *
 * The `?? 'EXB'` fallback STAYS, and that is deliberate rather than left over. It is not a guard
 * against an impossible state (docs/FINDINGS.md #22) — it is legacy's documented answer for an
 * unknown disease, it is pinned by data.test.ts, and it is genuinely reachable: the engine mints
 * nine disease names that are not cards at all (three toxins from TOXIN_MAKERS, a bursting
 * liver-stage malaria, five rare-event pathogens), so a schema scoped to DECK_MASTER could not
 * make it dead even in principle. docs/CONTENT_REACHABILITY.md §6 lists them.
 */
export function famOf(iv: { novel?: boolean; disease: string }): AbPoolKey {
  if (iv.novel || NOVEL_ANTIGENS.has(iv.disease)) return 'X';
  return FAMILY[iv.disease] ?? 'EXB';
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
