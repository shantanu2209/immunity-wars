/**
 * THIS PLAYER'S CONNECTION IS LOST, in a game played together (P3.7 piece C).
 *
 * SHOWN AT ONCE, AND NOTHING REJOINS BY ITSELF (ruled 25 September 2026, ruling 4: "Let the choice
 * to rejoin be one that is made consciously"). It covers the game, because nothing on it can be sent
 * until the player is back: every action would be refused. Their seats wait for them meanwhile, and
 * the sheet says so, because that is what makes waiting a choice rather than a loss.
 *
 * *Back to the title* closes the game without leaving it: the player stays a member, away, and the
 * title offers the room again (ruling (a)).
 */
import type { ReactElement } from 'react';

import { t } from '../i18n';
import { BTN } from '../screens/chrome';

export function ConnectionLost({
  reconnecting,
  refusal,
  onReconnect,
  onTitle,
}: {
  reconnecting: boolean;
  /** Why the last attempt to reconnect failed, in words, or null. */
  refusal: string | null;
  onReconnect: () => void;
  onTitle: () => void;
}): ReactElement {
  return (
    <>
      <div
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, background: 'rgba(46,42,40,0.45)', zIndex: 40 }}
      />
      <div
        data-connection-lost=""
        role="alertdialog"
        aria-label={t('lobby.connectionLost')}
        style={{
          position: 'fixed',
          left: 16,
          right: 16,
          top: '30%',
          margin: '0 auto',
          maxWidth: 420,
          padding: '14px 16px',
          borderRadius: 14,
          border: '2px solid #B03A2E',
          background: '#FFFDF9',
          zIndex: 41,
        }}
      >
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#B03A2E' }}>
          {t('lobby.connectionLost')}
        </div>
        <p style={{ fontSize: '0.9375rem', color: '#2E2A28', margin: '8px 0 0' }}>
          {t('table.lostBody')}
        </p>
        {refusal !== null ? (
          <p
            data-connection-refusal=""
            role="alert"
            style={{ fontSize: '0.875rem', color: '#B03A2E', margin: '8px 0 0' }}
          >
            {refusal}
          </p>
        ) : null}
        <button
          data-reconnect=""
          style={{ ...BTN, borderColor: '#B03A2E' }}
          disabled={reconnecting}
          onClick={onReconnect}
        >
          {reconnecting ? t('table.reconnecting') : t('lobby.reconnect')}
        </button>
        <button data-lost-title="" style={BTN} onClick={onTitle}>
          {t('table.backToTitle')}
        </button>
      </div>
    </>
  );
}
