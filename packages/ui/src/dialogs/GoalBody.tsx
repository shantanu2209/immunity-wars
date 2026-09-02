/**
 * The goal dialog's body — the first player-facing prose in the app, shown once at the start
 * of a NEW game (never on resume). Ruled in (Shantanu, 31 Aug 2026): stating what winning is
 * belongs to the play screen itself; onboarding (P2.6) teaches HOW to play.
 *
 * The engine's own game-start line packs three rules into one sentence; this unpacks them,
 * one idea per line, for someone reading once on a phone. The numbers are interpolated, not
 * hardcoded — maxTurn varies by difficulty (15/20/30) and the deadline is maxTurn +
 * GRACE_CLEAR. Wording APPROVED as written (Shantanu, 31 Aug 2026): "that is the win" stays a
 * statement because it carries a real rule (no win before the arrival window closes), and
 * "pathogen" stays because the real immunology is the premise. Whether "pathogen" is
 * understood from context is a stated newcomer-test expectation (P2_5_PROGRESS.md).
 */
import type { ReactElement } from 'react';

import { t } from '../i18n';

const LINE = { fontSize: 15, color: '#2E2A28', margin: '8px 0' } as const;

export function GoalBody({
  maxTurn,
  lastTurn,
}: {
  maxTurn: number;
  lastTurn: number;
}): ReactElement {
  return (
    <div>
      <div style={LINE}>{t('goal.arrive', { maxTurn })}</div>
      <div style={LINE}>{t('goal.win')}</div>
      <div style={LINE}>{t('goal.lose', { lastTurn })}</div>
    </div>
  );
}
