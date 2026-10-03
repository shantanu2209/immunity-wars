/**
 * PAUSE MENU (sheet over Play) — Gate 1's "no screen without an exit", made real.
 * Quit KEEPS the save (docs/APP_FLOW.md save semantics), and the sheet says so.
 * Back-ordering: this sheet closes before quit-confirm can appear; the confirm is modal.
 *
 * It closes from the floating close (docs/for-P2.7.md §9, ruling 8), which is why it has no Resume
 * button: Resume WAS its close. It stays open under Settings and How to play, so closing either
 * returns here (ruling 9).
 *
 * A NEW VERSION IS READY (ruled 3 October 2026): said here, last, when one has downloaded, so that
 * a player in the middle of a game hears of it and chooses when. Nothing reloads by itself outside
 * the title. Alone, Update now is offered, because the game is saved after every move and Continue
 * brings it back. Together it is said and not offered: a reload would drop this player from the
 * table, so it waits for the title, which takes it by itself.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { kitCardStyle } from '../kit/Surface';
import { FLOAT_RESERVE, useNavLayer } from '../nav/NavHost';
import { SAY } from './onCard';
import { UpdateNow } from './UpdateNow';

/** Room above each button for the one before it to stand on its edge. */
const BTN: CSSProperties = { marginTop: 12 };

export function PauseSheet({
  onResume,
  onQuit,
  onSettings,
  onHelp,
  onLeave = null,
  update = null,
  onUpdate = () => undefined,
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
  /** A newer version has downloaded: said alone with Update now, together without it. Null when
   *  there is none, and during the guided game's lesson, which is not saved and would start again. */
  update?: 'alone' | 'together' | null;
  onUpdate?: () => void;
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
        background: 'rgba(4, 18, 22, 0.66)',
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
          boxSizing: 'border-box',
          ...kitCardStyle,
          padding: '6px 16px 22px',
        }}
      >
        {confirming === 'leave' && onLeave !== null ? (
          <>
            <p style={{ ...SAY.body, margin: '12px 0 0' }}>{t('pause.leaveNote')}</p>
            <KitButton kind="main" data-pause="leave-confirm" style={BTN} onPress={onLeave}>
              {t('pause.leaveConfirm')}
            </KitButton>
            <KitButton style={BTN} onPress={() => setConfirming(null)}>
              {t('pause.quitCancel')}
            </KitButton>
          </>
        ) : confirming === 'quit' ? (
          <>
            <p style={{ ...SAY.body, margin: '12px 0 0' }}>
              {together ? t('pause.closeNote') : t('pause.quitNote')}
            </p>
            <KitButton kind="main" data-pause="quit-confirm" style={BTN} onPress={onQuit}>
              {together ? t('pause.closeConfirm') : t('pause.quitConfirm')}
            </KitButton>
            <KitButton style={BTN} onPress={() => setConfirming(null)}>
              {t('pause.quitCancel')}
            </KitButton>
          </>
        ) : (
          <>
            {/* RESUME IS THE FIRST ROW (§21 I): the floating close does the same thing, but
                nothing on the menu said so, and it is the one thing a paused player wants. */}
            <KitButton kind="go" style={BTN} onPress={onResume}>
              {t('pause.resume')}
            </KitButton>
            <KitButton style={BTN} onPress={onHelp}>
              {t('pause.help')}
            </KitButton>
            <KitButton style={BTN} onPress={onSettings}>
              {t('pause.settings')}
            </KitButton>
            <KitButton data-pause="quit" style={BTN} onPress={() => setConfirming('quit')}>
              {together ? t('pause.close') : t('pause.quit')}
            </KitButton>
            {together ? (
              <KitButton data-pause="leave" style={BTN} onPress={() => setConfirming('leave')}>
                {t('pause.leave')}
              </KitButton>
            ) : null}
            {update !== null ? (
              <div data-pause="update-ready">
                <p style={{ ...SAY.body, margin: '16px 0 0' }}>
                  {t('update.ready')}{' '}
                  {update === 'alone' ? t('update.readyAlone') : t('update.readyTogether')}
                </p>
                {update === 'alone' ? <UpdateNow onUpdate={onUpdate} /> : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
