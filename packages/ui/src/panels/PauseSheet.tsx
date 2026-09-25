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
  onLeave = null,
}: {
  /** Quit to title. The shell keeps the autosave — quitting never deletes a game. */
  /** Back to the game: the same thing the floating close does. */
  onResume: () => void;
  onQuit: () => void;
  /** Settings and How to play over the paused game (APP_FLOW §4: "P2.6 adds: Settings ·
   *  How to play"). */
  onSettings: () => void;
  onHelp: () => void;
  /**
   * A GAME PLAYED TOGETHER (P3.7 piece D): leaving it, which gives this player's seats back to the
   * table for good. Null alone. With it, quitting is closing: the player is away, their seats wait,
   * and the title offers the room again (piece C), so the two exits are worded apart and each is
   * confirmed with what it does.
   */
  onLeave?: (() => void) | null;
}): ReactElement {
  const together = onLeave !== null;
  const [confirming, setConfirming] = useState<'quit' | 'leave' | null>(null);
  // The confirm is a dialog on the stack: the back gesture cancels it.
  useNavLayer('quit-confirm', confirming !== null, () => setConfirming(null), false);
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
        {confirming === 'leave' && onLeave !== null ? (
          <>
            <p style={{ fontSize: '0.875rem', color: '#78665D' }}>{t('pause.leaveNote')}</p>
            <button
              data-pause="leave-confirm"
              style={{ ...BTN, borderColor: '#B03A2E' }}
              onClick={onLeave}
            >
              {t('pause.leaveConfirm')}
            </button>
            <button style={BTN} onClick={() => setConfirming(null)}>
              {t('pause.quitCancel')}
            </button>
          </>
        ) : confirming === 'quit' ? (
          <>
            <p style={{ fontSize: '0.875rem', color: '#78665D' }}>
              {together ? t('pause.closeNote') : t('pause.quitNote')}
            </p>
            <button
              data-pause="quit-confirm"
              style={{ ...BTN, borderColor: '#B03A2E' }}
              onClick={onQuit}
            >
              {together ? t('pause.closeConfirm') : t('pause.quitConfirm')}
            </button>
            <button style={BTN} onClick={() => setConfirming(null)}>
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
            <button data-pause="quit" style={BTN} onClick={() => setConfirming('quit')}>
              {together ? t('pause.close') : t('pause.quit')}
            </button>
            {together ? (
              <button data-pause="leave" style={BTN} onClick={() => setConfirming('leave')}>
                {t('pause.leave')}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
