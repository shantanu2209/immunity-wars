/**
 * Display names, one source: the rules tables in content (the rule set at the P2.4
 * label-case fix — never two sources that can disagree on case or wording).
 */
import { CNAME, ORGANS, RESIDENT_NAME, UI_ } from '@immunity-wars/content';

import { t } from './i18n';

/**
 * CNAME is the legacy table and predates the Eosinophil, so it has no entry for it; the
 * catalogue carries the missing name (`cell.eosinophil`). Any other miss renders loudly as
 * ⟪cell.<key>⟫ rather than as a raw key in a player's face (found on the S25: "eosinophil").
 */
export const cellDisplayName = (ck: string): string => {
  const known = (CNAME as Record<string, string | undefined>)[ck];
  return known !== undefined ? String(known) : t(`cell.${ck}`);
};

export const typeDisplayName = (ty: string): string =>
  String((UI_ as Record<string, { n?: string }>)[ty]?.n ?? ty);

/**
 * A resident macrophage's REAL name — Kupffer cell, Microglia, Alveolar macrophage — from
 * the rules pack. CP3 leans on the biology to tell a resident from the player's Monocyte
 * rather than adding labels: a monocyte is the blood-borne precursor, and the residents are
 * the tissue macrophages under their historical names. A miss renders loudly.
 */
export const residentDisplayName = (organ: string): string => {
  const known = (RESIDENT_NAME as Record<string, string | undefined>)[organ];
  return known !== undefined ? String(known) : t(`resident.${organ}`);
};

export const organDisplayName = (organ: string): string =>
  String((ORGANS as Record<string, { name?: string }>)[organ]?.name ?? organ);
