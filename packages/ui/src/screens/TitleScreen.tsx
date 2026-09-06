/**
 * TITLE — the entry screen (docs/APP_FLOW.md §4). States: with-save / without-save.
 * Continue appears only when a save exists and names what it resumes. Visual design is
 * Claude Design's; this is the structure and the elements.
 */
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';

const BTN: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 52,
  fontSize: '1.0625rem',
  borderRadius: 10,
  border: '2px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
  marginTop: 12,
};

export interface SaveSummary {
  difficulty: string;
  turn: number;
}

export function TitleScreen({
  save,
  onContinue,
  onNewGame,
  onSettings,
}: {
  /** Present when an autosave exists; Continue renders only then. */
  save: SaveSummary | null;
  onContinue: () => void;
  onNewGame: () => void;
  /** The first of the four P2.6 Title slots (APP_FLOW §4). */
  onSettings: () => void;
}): ReactElement {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.875rem', color: '#B03A2E' }}>{t('title.name')}</h1>
      <p style={{ fontSize: '0.875rem', color: '#78665D' }}>{t('title.tagline')}</p>
      {save ? (
        <button style={{ ...BTN, borderColor: '#B03A2E' }} onClick={onContinue}>
          {t('title.continue')}
          <span style={{ display: 'block', fontSize: '0.8125rem', color: '#78665D' }}>
            {/* The difficulty is a key, not display text — render its catalogue name. */}
            {t(`difficulty.${save.difficulty}`)} {t('title.continueTurn')} {save.turn}
          </span>
        </button>
      ) : null}
      <button style={BTN} onClick={onNewGame}>
        {t('title.newGame')}
      </button>
      <button style={{ ...BTN, borderColor: '#C48377' }} onClick={onSettings}>
        {t('title.settings')}
      </button>
    </div>
  );
}
