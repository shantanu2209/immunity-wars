/**
 * DIFFICULTY SELECT (docs/APP_FLOW.md §4). Choose first; when a save exists, the
 * overwrite confirm appears AFTER the choice and BEFORE the old game is destroyed.
 * Phase 3's mode select inserts between Title and this screen.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import { t } from '../i18n';

const BTN: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 56,
  fontSize: 16,
  borderRadius: 10,
  border: '2px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
  marginTop: 12,
  textAlign: 'left',
  padding: '8px 14px',
};

const DIFFS = ['training', 'normal', 'hard'] as const;

export function DifficultyScreen({
  hasSave,
  onStart,
  onBack,
}: {
  /** When true, picking a difficulty asks before replacing the saved game. */
  hasSave: boolean;
  onStart: (difficulty: string) => void;
  onBack: () => void;
}): ReactElement {
  const [pendingDiff, setPendingDiff] = useState<string | null>(null);

  const pick = (d: string): void => {
    if (hasSave) setPendingDiff(d);
    else onStart(d);
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '32px 16px' }}>
      <h2 style={{ fontSize: 22, color: '#2E2A28' }}>{t('difficulty.heading')}</h2>
      {DIFFS.map((d) => (
        <button key={d} style={BTN} onClick={() => pick(d)}>
          <span style={{ fontWeight: 700 }}>{t(`difficulty.${d}`)}</span>
          <span style={{ display: 'block', fontSize: 13, color: '#7C6A61' }}>
            {t(`difficulty.${d}Desc`)}
          </span>
        </button>
      ))}
      <button style={{ ...BTN, textAlign: 'center', borderColor: '#C8877B' }} onClick={onBack}>
        {t('difficulty.back')}
      </button>
      {pendingDiff !== null ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(46,42,40,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
          }}
        >
          <div
            style={{
              width: 'min(88vw, 360px)',
              background: '#FFFDF9',
              border: '2px solid #B03A2E',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <p style={{ fontSize: 15 }}>{t('difficulty.overwriteWarning')}</p>
            <button
              style={{ ...BTN, textAlign: 'center', borderColor: '#B03A2E' }}
              onClick={() => onStart(pendingDiff)}
            >
              {t('difficulty.overwriteConfirm')}
            </button>
            <button style={{ ...BTN, textAlign: 'center' }} onClick={() => setPendingDiff(null)}>
              {t('difficulty.overwriteCancel')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
