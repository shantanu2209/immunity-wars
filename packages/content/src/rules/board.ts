/**
 * Organs, routes and the lymphatic map.
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

import type { Difficulty, OrganDef, OrganKey, RouteDef, RouteKey } from '../types.js';

/**
 * kind: "vital" = the body dies if it fails, but immunity is unaffected.
 *       "defence" = damaging it weakens the immune system itself.
 *
 * Note the Brain is integrity 2 (lowest on the board) at branch 3, and the Heart is branch 2
 * — the shortest branch there is.
 */
export const ORGANS: Record<OrganKey, OrganDef> = {
  heart: {
    name: 'Heart',
    kind: 'vital',
    integrity: 3,
    branch: 2,
    effect: '-1 Action Point (weak pump)',
    bio: 'The heart itself can be infected — Staph on the valves (endocarditis), Lyme carditis, viral myocarditis. Germs only passing through the bloodstream do NOT infect it; only germs that target heart tissue do.',
  },
  lungs: {
    name: 'Lungs',
    kind: 'vital',
    integrity: 3,
    branch: 3,
    effect: '-1 Action Point',
    bio: 'Damaged lungs mean poor gas exchange — the whole body weakens.',
  },
  liver: {
    name: 'Liver',
    kind: 'defence',
    integrity: 3,
    branch: 3,
    effect: 'Antibody storage capped at 2 per class',
    bio: 'The liver makes many defence proteins; damage it and antibody supply falls.',
  },
  marrow: {
    name: 'Bone Marrow',
    kind: 'defence',
    integrity: 3,
    branch: 3,
    effect: 'Neutrophil cannot regenerate',
    bio: 'All immune cells are made in the marrow.',
  },
  brain: {
    name: 'Brain',
    kind: 'vital',
    integrity: 2,
    branch: 3,
    effect: 'None — but fragile & slow to defend',
    bio: 'Immune privilege: the blood-brain barrier keeps immune cells out, so it is hard to defend and cannot take much damage.',
  },
  spleen: {
    name: 'Spleen',
    kind: 'defence',
    integrity: 3,
    branch: 3,
    effect: 'Bacteria divide on 1–3',
    bio: 'The spleen filters encapsulated bacteria from the blood — without it, bacterial infection runs wild.',
  },
  kidneys: {
    name: 'Kidneys',
    kind: 'vital',
    integrity: 3,
    branch: 3,
    effect: 'Lose 1 antibody each turn',
    bio: 'Damaged kidneys leak antibodies into the urine — a real cause of secondary immunodeficiency.',
  },
};

export const ALL_ORGANS: readonly OrganKey[] = [
  'heart',
  'lungs',
  'liver',
  'marrow',
  'brain',
  'spleen',
  'kidneys',
];

/**
 * Every difficulty uses the SAME full body — 7 organs — so the printed board is identical at
 * every level. Only AP, spawn rate and division scale with difficulty.
 */
export const ORGAN_SETS: Record<Difficulty, readonly OrganKey[]> = {
  training: ['heart', 'lungs', 'liver', 'marrow', 'brain', 'spleen', 'kidneys'],
  normal: ['heart', 'lungs', 'liver', 'marrow', 'brain', 'spleen', 'kidneys'],
  hard: ['heart', 'lungs', 'liver', 'marrow', 'brain', 'spleen', 'kidneys'],
};

/** Blood is SHORT: a needle bypasses the tissue barrier entirely. */
export const ROUTES: Record<RouteKey, RouteDef> = {
  nose: { name: 'Nose', len: 5 },
  gut: { name: 'Gut', len: 5 },
  contact: { name: 'Contact', len: 5 },
  wound: { name: 'Wound', len: 5 },
  bite: { name: 'Bite', len: 5 },
  blood: { name: 'Blood', len: 3 },
};

export const ROUTE_KEYS: readonly RouteKey[] = ['nose', 'gut', 'contact', 'wound', 'bite', 'blood'];

/**
 * LYMPH GROUPS (not pairs). Mucosal surfaces share defences — the common mucosal immune
 * system (MALT). Skin routes share regional drainage. BLOOD has NO lymphatic link: a needle
 * goes straight in, bypassing the tissues, which is exactly why it is the most dangerous
 * way to be infected.
 */
export const LYMPH_GROUP: Record<RouteKey, string | null> = {
  nose: 'mucosal',
  gut: 'mucosal',
  contact: 'mucosal',
  wound: 'skin',
  bite: 'skin',
  blood: null,
};

/** Superseded by LYMPH_GROUP and unreferenced in legacy. Ported dead — docs/FINDINGS.md #11. */
export const PAIR: Record<string, RouteKey> = {
  nose: 'gut',
  gut: 'nose',
  bite: 'wound',
  wound: 'bite',
};

/** The lymphatic crossing point on each route (mid-route). */
export const LYMPH_STEP = 3;

export const RESIDENT_NAME: Record<OrganKey, string> = {
  heart: 'Cardiac macrophage',
  lungs: 'Alveolar macrophage',
  liver: 'Kupffer cell',
  brain: 'Microglia',
  marrow: 'Marrow macrophage',
  spleen: 'Splenic macrophage',
  kidneys: 'Renal macrophage',
};
