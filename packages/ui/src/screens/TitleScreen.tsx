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
  onTogether,
  rejoin = null,
  onRejoin = () => undefined,
  onSettings,
  onHelp,
  onAbout,
}: {
  /** Present when an autosave exists; Continue renders only then. */
  save: SaveSummary | null;
  onContinue: () => void;
  onNewGame: () => void;
  /** Play together (P3.7, ruled 25 September 2026): beside New game, on the Title. */
  onTogether: () => void;
  /**
   * THE ROOM THIS DEVICE WAS IN (P3.7 piece C, ruling (a)), offered so a player whose phone closed
   * the app can go back to it, by choice (ruling 4). Null when there is none.
   */
  rejoin?: { code: string } | null;
  onRejoin?: () => void;
  /** The four P2.6 Title slots (APP_FLOW §4), in the order they are shown. */
  onSettings: () => void;
  onHelp: () => void;
  onAbout: () => void;
}): ReactElement {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
      {/* NO CREDIT LINE HERE (item 1, 19 September 2026): About carries it, and the Title is
          the screen a newcomer must read fastest. ONE LINE SAYING WHAT THE GAME IS stays, because
          removing the credit took the only sentence that did (§21 G). */}
      <h1 style={{ fontSize: '1.875rem', color: '#B03A2E' }}>{t('title.name')}</h1>
      <p style={{ fontSize: '0.875rem', color: '#78665D' }}>{t('title.blurb')}</p>
      {save ? (
        <button style={{ ...BTN, borderColor: '#B03A2E' }} onClick={onContinue}>
          {t('title.continue')}
          <span style={{ display: 'block', fontSize: '0.8125rem', color: '#78665D' }}>
            {/* The difficulty is a key, not display text — render its catalogue name. */}
            {t(`difficulty.${save.difficulty}`)} {t('title.continueTurn')} {save.turn}
          </span>
        </button>
      ) : null}
      {rejoin ? (
        <button style={{ ...BTN, borderColor: '#B03A2E' }} onClick={onRejoin} data-title="rejoin">
          {t('title.rejoin', { code: rejoin.code })}
        </button>
      ) : null}
      <button style={BTN} onClick={onNewGame}>
        {t('title.newGame')}
      </button>
      <button style={BTN} onClick={onTogether} data-title="together">
        {t('title.together')}
      </button>
      <button style={{ ...BTN, borderColor: '#C48377' }} onClick={onHelp}>
        {t('title.help')}
      </button>
      <button style={{ ...BTN, borderColor: '#C48377' }} onClick={onSettings}>
        {t('title.settings')}
      </button>
      <button style={{ ...BTN, borderColor: '#C48377' }} onClick={onAbout}>
        {t('title.about')}
      </button>
    </div>
  );
}
