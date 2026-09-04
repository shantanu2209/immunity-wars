/**
 * The production breakdown's prose, through the catalogue (FINDINGS #53).
 *
 * `productionBreakdown` returns effect labels and cap reasons as English sentences composed
 * inside `packages/engine/src/queries.ts` — prose from a QUERY, which the Phase 1 extraction
 * (rejection and log sites only) never reached, so `ENGINE_I18N_EN` does not know them. The
 * antibody panel rendered them loudly as ⟪engine: …⟫ the first time a family was tapped, which
 * is the marker doing its job. This maps the fixed set the query can produce to `ui` catalogue
 * keys — the one templated label ("Rate ceiling (N/action on this mode)") by its number — and
 * stays loud on anything new, so a label added to the query announces itself here.
 *
 * A WORKAROUND, like the neutralise-cost mirror (#52): the engine should emit ids, not prose,
 * and that is Phase 3's. Delete this file when it does.
 */
import { t } from './i18n';

const STATIC: Readonly<Record<string, string>> = {
  'Helper T-cell licensing': 'production.effect.helperLicensing',
  'Affinity maturation': 'production.effect.affinityMaturation',
  'Helper T-cell present but NOT yet primed — no antigen has been presented to it yet':
    'production.effect.helperUnprimed',
  'Production is shut down this turn': 'production.blocked',
  'liver damaged': 'production.cap.liverDamaged',
  'a temporary effect': 'production.cap.temporary',
};

const RATE_CEILING = /^Rate ceiling \((\d+)\/action on this mode\)$/;

export function productionText(label: string): string {
  const key = STATIC[label];
  if (key !== undefined) return t(key);
  const m = RATE_CEILING.exec(label);
  if (m) return t('production.effect.rateCeiling', { n: m[1] ?? '' });
  return `⟪production: ${label}⟫`;
}
