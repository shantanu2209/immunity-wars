/**
 * RESULT — a screen, not a dialog (docs/APP_FLOW.md ruling 7): it ends the session cleanly
 * before navigation. States: win / loss (loss names the organ that fell). The shell clears
 * the autosave before showing this screen, so Continue never offers a finished game.
 */
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';

const BTN: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 52,
  fontSize: 16,
  borderRadius: 10,
  border: '2px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
  marginTop: 12,
};

export interface ResultStats {
  turns: number;
  organsDamaged: number;
  antibodiesMade: number;
}

export function ResultScreen({
  won,
  lossOrgan,
  stats,
  onPlayAgain,
  onChangeDifficulty,
  onTitle,
}: {
  won: boolean;
  /** Display name of the organ that fell; null on a win or a non-organ loss. */
  lossOrgan: string | null;
  stats: ResultStats;
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
  onTitle: () => void;
}): ReactElement {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 26, color: won ? '#2F6B4A' : '#B03A2E' }}>
        {won ? t('result.win') : t('result.loss')}
      </h1>
      {!won && lossOrgan !== null ? (
        <p style={{ fontSize: 15 }}>
          {t('result.lossOrgan')} <span style={{ fontWeight: 700 }}>{lossOrgan}</span>
        </p>
      ) : null}
      <div style={{ fontSize: 15, margin: '18px 0', color: '#2E2A28' }}>
        <div>
          {t('result.turns')} <span style={{ fontWeight: 700 }}>{stats.turns}</span>
        </div>
        <div>
          {t('result.organsDamaged')} <span style={{ fontWeight: 700 }}>{stats.organsDamaged}</span>
        </div>
        <div>
          {t('result.antibodies')} <span style={{ fontWeight: 700 }}>{stats.antibodiesMade}</span>
        </div>
      </div>
      <button style={BTN} onClick={onPlayAgain}>
        {t('result.playAgain')}
      </button>
      <button style={BTN} onClick={onChangeDifficulty}>
        {t('result.changeDifficulty')}
      </button>
      <button style={BTN} onClick={onTitle}>
        {t('result.title')}
      </button>
    </div>
  );
}
