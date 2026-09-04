/**
 * Display names, one source: the rules tables in content (the rule set at the P2.4
 * label-case fix — never two sources that can disagree on case or wording).
 */
import { CNAME, UI_ } from '@immunity-wars/content';

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
