/**
 * Experiment knobs — module-level mutable state, exactly as legacy has it.
 *
 * This is the one place where "pure" and "identical to legacy" genuinely conflict. These
 * variables make the engine non-reentrant across games: setting one changes every game created
 * afterwards in the same process. That is a real design problem and it is NOT fixed here —
 * fixing it would change behaviour, which is the one thing Task B may not do. Making them
 * per-game is a Phase 2 conversation (docs/TASK_B_PLAN.md §7).
 *
 * In practice nothing in the repository calls setKnobs. It is only defined, and inlined
 * verbatim into the six built HTML bundles.
 */

import type { OrganKey } from './types.js';

/**
 * Infection cards drawn per turn.
 *
 * DEAD KNOB. Assigned by setKnobs and never read — spawnCount() consults only SPAWN_MODE, so
 * setKnobs({spawn: 3}) does nothing at all. Ported as-is; docs/FINDINGS.md #7.
 */
let SPAWN = 1;

/** null = use the difficulty's own schedule; otherwise override it (testing). */
let SPAWN_MODE: string | null = null;

/** If true, invaders in the bloodstream hub cannot be attacked — only in tissue. */
let HUB_SAFE = false;

let ORGAN_OVERRIDE: readonly OrganKey[] | null = null;
let AP_OVERRIDE: number | null = null;

export const knobs = {
  get spawn(): number {
    return SPAWN;
  },
  get spawnMode(): string | null {
    return SPAWN_MODE;
  },
  get hubSafe(): boolean {
    return HUB_SAFE;
  },
  get organOverride(): readonly OrganKey[] | null {
    return ORGAN_OVERRIDE;
  },
  get apOverride(): number | null {
    return AP_OVERRIDE;
  },
};

export interface Knobs {
  spawn?: number;
  spawnMode?: string | null;
  organs?: readonly OrganKey[] | null;
  ap?: number | null;
  hubSafe?: boolean;
  heal?: number;
}

export function setKnobs(k: Knobs): void {
  if (k.spawn !== undefined) SPAWN = k.spawn;
  if (k.spawnMode !== undefined) SPAWN_MODE = k.spawnMode;
  if (k.organs !== undefined) ORGAN_OVERRIDE = k.organs;
  if (k.ap !== undefined) AP_OVERRIDE = k.ap;
  if (k.hubSafe !== undefined) HUB_SAFE = k.hubSafe;

  // DELIBERATE DEVIATION — docs/DEVIATIONS.md #1.
  //
  // Legacy assigns to an undeclared HEALV here, which under CommonJS sloppy mode silently
  // creates a stray global that nothing ever reads. Its real behaviour is therefore a SILENT
  // NO-OP, not a crash — the ReferenceError strict mode would raise is new behaviour, not
  // preserved behaviour, so neither reproducing the throw nor reproducing the no-op is
  // faithful.
  //
  // Decided by Shantanu: fail loudly and clearly instead. setKnobs is developer-facing, and a
  // silent no-op during balance tuning means confusing numbers with no clue why. The
  // incidental ReferenceError would have said "HEALV is not defined", naming an implementation
  // artefact that was never meant to exist.
  if (k.heal !== undefined) throw new Error("setKnobs: 'heal' is not implemented");
}

/** Test-only: restore knobs to their construction defaults so cases cannot leak into each other. */
export function resetKnobs(): void {
  SPAWN = 1;
  SPAWN_MODE = null;
  HUB_SAFE = false;
  ORGAN_OVERRIDE = null;
  AP_OVERRIDE = null;
}
