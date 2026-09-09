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
  fontSize: '1rem',
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
      <h2 style={{ fontSize: '1.375rem', color: '#2E2A28' }}>{t('difficulty.heading')}</h2>
      {/*
        THE GOAL, said once before the game starts (Shantanu's ruling, 9 September 2026).
        Ruled here rather than as a first-encounter hint, and the distinction is the point: this
        fires on SIGHT and is read once by everyone, so it is screen copy. Calling it a hint
        would have been the exception to "first contact" that the hint rule exists to avoid.
        It is here because a hint could not do this job: the effects strip already says the same
        thing, but only once the window has closed, and the windows are 15, 20 and 30 turns, so
        a newcomer who loses on turn 8 was never told at all. This is the moment the
        misconception forms, which is earlier than any contact.
      */}
      <p style={{ fontSize: '0.8125rem', lineHeight: 1.45, color: '#78665D', margin: '4px 0 0' }}>
        {t('difficulty.goal')}
      </p>
      {DIFFS.map((d) => (
        <button
          key={d}
          style={d === 'training' ? { ...BTN, borderColor: '#1F6F8B' } : BTN}
          onClick={() => pick(d)}
        >
          <span style={{ fontWeight: 700 }}>{t(`difficulty.${d}`)}</span>
          {d === 'training' ? (
            // The interface carries the first-game guidance, not the newcomer-test script —
            // Shantanu's ruling, 30 Aug 2026 (docs/NEWCOMER_TEST.md): whether a newcomer can
            // tell where to start is part of what the test measures.
            <span
              style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1F6F8B' }}
            >
              {t('difficulty.trainingRecommended')}
            </span>
          ) : null}
          <span style={{ display: 'block', fontSize: '0.8125rem', color: '#78665D' }}>
            {t(`difficulty.${d}Desc`)}
          </span>
        </button>
      ))}
      <button style={{ ...BTN, textAlign: 'center', borderColor: '#C48377' }} onClick={onBack}>
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
            <p style={{ fontSize: '0.9375rem' }}>{t('difficulty.overwriteWarning')}</p>
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
