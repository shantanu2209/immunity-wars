/**
 * "RIGHT NOW" — the one line about THIS invader rather than its disease: where malaria is in
 * its life cycle, or that a parasite is hiding inside a resident macrophage. The two invader
 * states the board-state sweep deferred to the card (for-P2.5.md, 4 Sep 2026), because who
 * can act on the invader depends on them: inside liver cells or inside a macrophage, only the
 * Killer T-Cell or NK Cell can reach it. Rendered by the inspect sheet's row and the card.
 */
import type { InspectInvader } from '../board/Board';
import { t } from '../i18n';
import { residentDisplayName } from '../names';

export function invaderNowLine(iv: InspectInvader): string | null {
  if (iv.hiddenIn === 'macrophage' && iv.organ) {
    return t('inspect.hiddenInMacrophage', { name: residentDisplayName(iv.organ) });
  }
  if (iv.type === 'malaria') {
    if (iv.stage === 'liver') return t('inspect.stageLiver');
    if (iv.stage === 'sporozoite') return t('inspect.stageSporozoite');
    if (iv.stage === 'blood') return t('inspect.stageBlood');
  }
  return null;
}
