/**
 * RESULT — a screen, not a dialog (docs/APP_FLOW.md ruling 7): it ends the session cleanly
 * before navigation. States: win / loss (loss names the organ that fell). The shell clears
 * the autosave before showing this screen, so Continue never offers a finished game.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import { t } from '../i18n';
import { LogPanel, type LogLine } from '../panels/LogPanel';

const BTN: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 52,
  fontSize: '1rem',
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
  log = [],
  onPlayAgain,
  onChangeDifficulty,
  onTitle,
}: {
  won: boolean;
  /** Display name of the organ that fell; null on a win or a non-organ loss. */
  lossOrgan: string | null;
  stats: ResultStats;
  /**
   * The finished game's log (§21 H): a player who has just lost asks what happened, and Messages
   * lived inside the play frame, which is gone by the time they can ask.
   */
  log?: readonly LogLine[];
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
  onTitle: () => void;
}): ReactElement {
  const [showLog, setShowLog] = useState(false);
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.625rem', color: won ? '#2F6B4A' : '#B03A2E' }}>
        {won ? t('result.win') : t('result.loss')}
      </h1>
      {!won && lossOrgan !== null ? (
        <p style={{ fontSize: '0.9375rem' }}>
          {t('result.lossOrgan')} <span style={{ fontWeight: 700 }}>{lossOrgan}</span>
        </p>
      ) : null}
      <div style={{ fontSize: '0.9375rem', margin: '18px 0', color: '#2E2A28' }}>
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
      {log.length > 0 ? (
        <>
          <button
            style={BTN}
            data-result-log={showLog ? 'open' : 'closed'}
            aria-expanded={showLog}
            onClick={() => setShowLog((v) => !v)}
          >
            {showLog ? t('result.hideLog') : t('result.showLog')}
          </button>
          {showLog ? (
            <div style={{ textAlign: 'left', maxHeight: '40dvh', overflowY: 'auto' }}>
              <LogPanel lines={log} titled={false} />
            </div>
          ) : null}
        </>
      ) : null}
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
