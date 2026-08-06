/**
 * Cells, difficulty settings and every tuning constant.
 *
 * Transcribed from tools/legacy/v2_engine.js at B1 with values and key order taken from the
 * running module, so this file is equal to legacy by construction rather than by careful
 * retyping. tests/equivalence/src/data.test.ts proves it, entry by entry, key order included.
 *
 * TASK C1 — moved here from packages/engine/src/data/ with the values untouched. Still
 * TypeScript: C2 converts these to JSON behind a Zod loader. Two commits rather than one, so
 * that if the corpus goes red it says WHICH mechanism broke — the move or the serialisation.
 *
 * KEY ORDER IS LOAD-BEARING. TROPISM's order feeds rollOrgan, FAM_KEYS' order feeds the kidney
 * antibody leak. Do not sort, normalise, or rebuild these from a schema default.
 */

import type { CellKey, Difficulty, DifficultyDef, Flags } from '../types.js';

export const CELL_KEYS: readonly CellKey[] = [
  'macrophage',
  'neutrophil',
  'bcell',
  'tcell',
  'helper',
  'nk',
  'eosinophil',
];

export const SPEED: Record<CellKey, number> = {
  macrophage: 1,
  neutrophil: 2,
  bcell: 1,
  tcell: 1,
  helper: 1,
  nk: 2,
  eosinophil: 1,
};

export const CNAME: Record<string, string> = {
  macrophage: 'Monocyte',
  neutrophil: 'Neutrophil',
  bcell: 'B-Cell',
  tcell: 'Killer T-Cell',
  helper: 'Helper T-Cell',
  nk: 'NK Cell',
};

export const DIFF: Record<Difficulty, DifficultyDef> = {
  training: { ap: 6, turns: 15, spawn: 'dice' },
  normal: { ap: 5, turns: 20, spawn: 'dice' },
  hard: { ap: 4, turns: 30, spawn: 'dice' },
};

/** d6 -> how many infections break in this turn. */
export const SPAWN_TABLE: Record<Difficulty, readonly number[]> = {
  training: [1, 1, 1, 1, 1, 2], // avg 1.17
  normal: [1, 1, 1, 1, 2, 2], // avg 1.33
  hard: [1, 1, 1, 2, 2, 3], // avg 1.67
};

export const FLAGS: Flags = {
  organs: true,
  residents: true,
  residentMove: true,
  primeResident: true,
  lymph: true,
  crisisEvents: true,
  heartOrgan: true,
  dendritic: true,
  helperT: true,
  nkCell: true,
  complement: true,
  toxins: true,
  fungus: true,
  worms: true,
  malaria: true,
  eosinophil: true,
  rareEvents: true,
  specials: true,
  tierB: true,
};

/* --- innate cells --- */
export const NK_RANGE = 1; // NK kills infected cells up close, no antigen needed
export const NK_HITS = 3; // ...but innate killing is imprecise: succeeds on a d6 of 3+

/* --- antibodies --- */
export const ANTIBODY_RATE = 2;
export const ANTIBODY_CAP = 4;
export const AB_CAP_FAM_BY_DIFF: Record<Difficulty, number> = { training: 5, normal: 4, hard: 3 };
export const AB_CAP_FAM = 3; // legacy fallback, see capFam
export const AFFINITY_AT = 4; // produce this many times against one class -> antibodies improve

/** Antigens needed to reach +2 / +3 per Produce, by difficulty. Higher = slower to ramp. */
export const PRESENT_TIER_BY_DIFF: Record<Difficulty, readonly number[]> = {
  training: [0, 1, 3], // ramps fast — a gentle learning curve
  normal: [0, 3, 7],
  hard: [0, 5, 12], // slow: a high production rate must be EARNED
};
export const PRESENT_TIER: readonly number[] = [0, 1, 4]; // legacy — kept for reference

/** The absolute ceiling on antibodies-per-Produce. Hard: nothing exceeds 2. */
export const RATE_CAP_BY_DIFF: Record<Difficulty, number> = { training: 3, normal: 3, hard: 2 };

/* --- combat --- */
export const INFECT_ON = 2;
export const BURST_ON = 2;
export const SNIPE_RANGE = 3;
export const SNIPE_RANGE_BY_DIFF: Record<Difficulty, number> = { training: 3, normal: 2, hard: 2 };
export const NEUTROPHIL_REGEN = 4;
export const NEUTROPHIL_REGEN_HELPED = 2; // Th17: a primed Helper in the BLOOD drives granulopoiesis
export const EOSINOPHIL_REGEN = 4;

/* --- pathogen lifecycles --- */
export const TOXIN_AFTER = 3;
export const MALARIA_LIVER_TURNS = 3;
export const ANTIVENOM_CHARGES = 2;
export const ANTIVENOM_ORDER = 4; // AP to procure ONE more vial. Antivenom is a SUPPLY problem.

/**
 * WORM CAPS (playtest 27-07): worms lodge AT an organ and only the Eosinophil can shift them,
 * so a pile-up is unwinnable. At most ONE worm may arrive per turn, and TWO in a whole game.
 * A worm drawn past either cap is swapped for a non-worm card, so total infection pressure is
 * unchanged — only the mix. The Force tool bypasses these caps on purpose (it is a test tool).
 */
export const WORM_MAX_PER_GAME = 2;
export const WORM_MAX_PER_TURN = 1;
export const WORM_DAMAGE_EVERY = 3; // a lodged worm chews the organ for -1 integrity every N turns

/* --- pacing --- */
export const HEAL_AFTER = 2; // clear turns on a branch before an organ heals +1
export const GRACE_CLEAR = 15; // after the spawn window, turns to fully clear the body or lose
export const SPACE_CAP = 8; // max bacteria per tissue space (density-limited growth)
export const REINFECT_PC = 0.25; // chance a new infection is one already met

/* --- adaptive immunity --- */
export const VACCINE_COST = 5; // total AP to develop a vaccine — invest at your own pace
export const CLONE_COST = 3; // AP to find the matching B-cell clone for a NOVEL antigen
export const MEMORY_BOOST = 3; // antibodies granted INSTANTLY when a remembered pathogen returns
