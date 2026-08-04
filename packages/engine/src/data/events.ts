/**
 * Crisis events and rare events.
 *
 * TASK B1 — transcribed from tools/legacy/v2_engine.js with values and key order taken from
 * the running module, so this file is equal to legacy by construction rather than by careful
 * retyping. packages/engine/src/data/data.test.ts proves it, entry by entry.
 *
 * These tables move to packages/content/ in Task C, behind a Zod loader. They live here for
 * Task B so the port has exactly one moving part at a time.
 */

import type { EventDef, RareDef } from '../types.js';

export const EVENTS: Record<string, EventDef> = {
  immunosuppression: {
    bad: true,
    name: 'Immunosuppression',
    why: 'Stress or malnutrition blunts the response.',
    tell: 'No antibodies can be made next turn.',
  },
  neutropenia: {
    bad: true,
    name: 'Neutropenia',
    why: 'Neutrophil count crashes.',
    tell: 'The Neutrophil goes offline for 2 turns.',
  },
  lymphopenia: {
    bad: true,
    name: 'Lymphopenia',
    why: 'A virus is destroying lymphocytes.',
    tell: 'The Killer T-Cell goes offline for 2 turns.',
  },
  antibodyShortage: {
    bad: true,
    name: 'Antibody shortage',
    why: "Plasma cells can't keep up.",
    tell: 'Antibody store capped at 2 for 3 turns.',
  },
  fatigue: {
    bad: true,
    name: 'Fatigue',
    why: 'The whole body is exhausted: <b>1 fewer Action Point this turn only</b>.',
    tell: '1 fewer Action Point next turn.',
  },
  coInfection: {
    bad: true,
    name: 'Co-infection',
    why: "A second germ slips in while you're busy.",
    tell: 'An extra invader breaks in next turn.',
  },
  surge: {
    bad: false,
    name: 'Acute-phase surge',
    why: 'Inflammation floods the tissue with defenders: <b>+2 Action Points this turn only</b>. (Acute-phase proteins and a burst of cells released from the marrow.)',
  },
  passiveAntibodies: {
    bad: false,
    name: 'Passive antibodies',
    why: 'A booster tops up your antibodies.',
  },
  fever: {
    bad: false,
    name: 'Fever',
    why: 'Raised temperature slows the invaders (at an energy cost).',
  },
};

export const BAD_POOL: readonly string[] = [
  'immunosuppression',
  'neutropenia',
  'lymphopenia',
  'antibodyShortage',
  'fatigue',
  'coInfection',
];
export const GOOD_POOL: readonly string[] = ['surge', 'passiveAntibodies', 'fever'];

/** Max ONE per game, 50% chance, fired by something the player did. */
export const RARE: Record<string, RareDef> = {
  malariaRelapse: {
    name: 'Malaria relapse',
    why: 'A dormant hypnozoite of P. vivax woke up in your liver — months later, from nothing. This is why vivax malaria needs a second drug to clear the liver.',
  },
  dengueADE: {
    name: 'Dengue — antibody-dependent enhancement',
    why: 'Your dengue antibodies from last time do NOT neutralise this serotype — they HELP it into your cells. Your own immune memory is being used against you. This is why the second dengue infection is the dangerous one.',
  },
  tbReactivation: {
    name: 'TB reactivation',
    why: 'Latent TB woke up while your defences were down. A quarter of the world carries TB silently.',
  },
  shingles: {
    name: 'Shingles',
    why: 'The chickenpox virus never left — it hid in your nerves for years and has re-emerged.',
  },
  postFluPneumonia: {
    name: 'Post-influenza pneumonia',
    why: 'Flu stripped your airway lining and bacteria moved in. This is what killed most victims of the 1918 pandemic — not the flu itself.',
  },
  rheumaticFever: {
    name: 'Rheumatic fever',
    why: 'MOLECULAR MIMICRY: your anti-Strep antibodies cannot tell the difference between the bacterium and your own heart valve — so they are attacking your heart. A leading cause of heart disease in Indian children.',
  },
  cytokineStorm: {
    name: 'Cytokine storm',
    why: 'Your immune response went into overdrive and the inflammation itself burned an organ. This is what killed young, healthy people in COVID and in 1918 — the response, not the germ.',
  },
};
