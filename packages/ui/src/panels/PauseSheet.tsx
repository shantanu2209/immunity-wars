/**
 * PAUSE MENU (sheet over Play) — Gate 1's "no screen without an exit", made real.
 * Quit KEEPS the save (docs/APP_FLOW.md save semantics), and the sheet says so.
 * Back-ordering: this sheet closes before quit-confirm can appear; the confirm is modal.
 *
 * It closes from the floating close (docs/for-P2.7.md §9, ruling 8), which is why it has no Resume
 * button: Resume WAS its close. It stays open under Settings and How to play, so closing either
 * returns here (ruling 9).
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import { t } from '../i18n';
import { FLOAT_RESERVE, useNavLayer } from '../nav/NavHost';

const BTN: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 48,
  fontSize: '0.9375rem',
  borderRadius: 10,
  border: '2px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
  marginTop: 10,
};

export function PauseSheet({
  onResume,
  onQuit,
  onSettings,
  onHelp,
}: {
  /** Quit to title. The shell keeps the autosave — quitting never deletes a game. */
  /** Back to the game: the same thing the floating close does. */
  onResume: () => void;
  onQuit: () => void;
  /** Settings and How to play over the paused game (APP_FLOW §4: "P2.6 adds: Settings ·
   *  How to play"). */
  onSettings: () => void;
  onHelp: () => void;
}): ReactElement {
  const [confirming, setConfirming] = useState(false);
  // The quit confirm is a dialog on the stack: the back gesture cancels it.
  useNavLayer('quit-confirm', confirming, () => setConfirming(false), false);
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(46,42,40,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 15,
        paddingBottom: FLOAT_RESERVE,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 'min(88vw, 340px)',
          background: '#FFFDF9',
          border: '2px solid #8E6E53',
          borderRadius: 12,
          padding: 16,
        }}
      >
        {confirming ? (
          <>
            <p style={{ fontSize: '0.875rem', color: '#78665D' }}>{t('pause.quitNote')}</p>
            <button style={{ ...BTN, borderColor: '#B03A2E' }} onClick={onQuit}>
              {t('pause.quitConfirm')}
            </button>
            <button style={BTN} onClick={() => setConfirming(false)}>
              {t('pause.quitCancel')}
            </button>
          </>
        ) : (
          <>
            {/* RESUME IS THE FIRST ROW (§21 I): the floating close does the same thing, but
                nothing on the menu said so, and it is the one thing a paused player wants. */}
            <button style={{ ...BTN, borderColor: '#B03A2E' }} onClick={onResume}>
              {t('pause.resume')}
            </button>
            <button style={BTN} onClick={onHelp}>
              {t('pause.help')}
            </button>
            <button style={BTN} onClick={onSettings}>
              {t('pause.settings')}
            </button>
            <button style={BTN} onClick={() => setConfirming(true)}>
              {t('pause.quit')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
