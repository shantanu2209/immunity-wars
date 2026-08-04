/**
 * Per-type invader statistics.
 *
 * TASK B1 — transcribed from tools/legacy/v2_engine.js with values and key order taken from
 * the running module, so this file is equal to legacy by construction rather than by careful
 * retyping. packages/engine/src/data/data.test.ts proves it, entry by entry.
 *
 * These tables move to packages/content/ in Task C, behind a Zod loader. They live here for
 * Task B so the port has exactly one moving part at a time.
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
