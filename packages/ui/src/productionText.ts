/**
 * The production breakdown's prose, through the ENGINE catalogue (FINDINGS #53).
 *
 * `productionBreakdown` returns effect labels and cap reasons as English sentences composed
 * inside `packages/engine/src/queries.ts` — prose from a QUERY, which the Phase 1 extraction
 * (rejection and log sites only) never reached. The extractor now walks that class too, so the
 * static labels resolve through `engineText()` like any rejection. The one templated label —
 * "Rate ceiling (N/action on this mode)" — is stored with a placeholder and needs its number
 * put back, which is all this file still does. Loud on anything the catalogue does not know.
 *
 * Still a WORKAROUND in shape: the engine should emit ids, not prose — Phase 3's. Delete this
 * file when it does.
 */
import { ENGINE_I18N_EN } from '@immunity-wars/content';

import { engineText } from './engineText';

const RATE_CEILING = /^Rate ceiling \((\d+)\/action on this mode\)$/;
const RATE_CEILING_TEMPLATE = 'Rate ceiling ({capRate}/action on this mode)';

export function productionText(label: string): string {
  const m = RATE_CEILING.exec(label);
  if (m) {
    const key = Object.keys(ENGINE_I18N_EN).find(
      (k) => ENGINE_I18N_EN[k] === RATE_CEILING_TEMPLATE,
    );
    const template = key !== undefined ? ENGINE_I18N_EN[key] : undefined;
    if (template === undefined) return `⟪engine: ${label}⟫`;
    return template.replace('{capRate}', m[1] ?? '');
  }
  return engineText(label);
}
