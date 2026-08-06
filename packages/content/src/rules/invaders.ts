/**
 * Per-type invader statistics.
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

import type { InvaderType } from '../types.js';

export const INV_HP: Record<InvaderType, number> = {
  virus: 1,
  hidden: 1,
  bacteria: 1,
  toxin: 1,
  venom: 1,
  fungus: 2,
  worm: 3,
  malaria: 1,
  parasite: 2,
};

export const INV_SPEED: Record<InvaderType, number> = {
  virus: 1,
  hidden: 1,
  bacteria: 1,
  toxin: 2,
  venom: 2,
  fungus: 1,
  worm: 1,
  malaria: 1,
  parasite: 1,
};

/**
 * EMERGENCY pathogens — famously fulminant real diseases that race toward the body. Speed by
 * NAME overrides the type default, at every difficulty. This teaches that some infections are
 * true medical emergencies you must answer the turn they appear.
 * (Anthrax is a toxin and is already speed 2.)
 */
export const FAST_DISEASE: Record<string, number> = {
  Meningitis: 3,
  'Gas gangrene': 3,
  Cholera: 2,
  Plague: 2,
  Ebola: 2,
  'Catheter sepsis': 2,
  Endocarditis: 2,
};

/** Not alive: cannot be eaten, NETted or sniped. Antibody only. */
export const NOT_ALIVE: ReadonlySet<InvaderType> = new Set<InvaderType>(['toxin', 'venom']);

/** An untagged toxin-making bacterium emits this after TOXIN_AFTER turns. */
export const TOXIN_MAKERS: Record<string, string> = {
  Tetanus: 'Tetanus toxin',
  Cholera: 'Cholera toxin',
  'Gas gangrene': 'Clostridial toxin',
};
