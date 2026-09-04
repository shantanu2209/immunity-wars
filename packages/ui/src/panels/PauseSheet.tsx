/**
 * PAUSE MENU (sheet over Play) — Gate 1's "no screen without an exit", made real.
 * Quit KEEPS the save (docs/APP_FLOW.md save semantics), and the sheet says so.
 * Back-ordering: this sheet closes before quit-confirm can appear; the confirm is modal.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import { t } from '../i18n';

const BTN: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 48,
  fontSize: 15,
  borderRadius: 10,
  border: '2px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
  marginTop: 10,
};

export function PauseSheet({
  onResume,
  onQuit,
}: {
  onResume: () => void;
  /** Quit to title. The shell keeps the autosave — quitting never deletes a game. */
  onQuit: () => void;
}): ReactElement {
  const [confirming, setConfirming] = useState(false);
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
            <p style={{ fontSize: 14, color: '#7C6A61' }}>{t('pause.quitNote')}</p>
            <button style={{ ...BTN, borderColor: '#B03A2E' }} onClick={onQuit}>
              {t('pause.quitConfirm')}
            </button>
            <button style={BTN} onClick={() => setConfirming(false)}>
              {t('pause.quitCancel')}
            </button>
          </>
        ) : (
          <>
            <button style={BTN} onClick={onResume}>
              {t('pause.resume')}
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
