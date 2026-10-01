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
import { KitButton } from '../kit/Button';
import { kitCardStyle } from '../kit/Surface';
import { COLOUR, TYPE } from '../kit/tokens';
import { offersUpdate, refusalText } from '../together/model';

import { UpdateNow } from './UpdateNow';

export function ConnectionLost({
  reconnecting,
  refusal,
  onReconnect,
  onTitle,
  onUpdate,
}: {
  reconnecting: boolean;
  /** Why the last attempt to reconnect failed, as the relay's code, or null. */
  refusal: { code: string; detail?: string } | null;
  onReconnect: () => void;
  onTitle: () => void;
  /** Takes the newer version and reloads (FINDINGS #93), offered under a version refusal only. */
  onUpdate?: () => void;
}): ReactElement {
  return (
    <>
      <div
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, background: 'rgba(4, 18, 22, 0.72)', zIndex: 40 }}
      />
      <div
        data-connection-lost=""
        role="alertdialog"
        aria-label={t('lobby.connectionLost')}
        style={{
          ...kitCardStyle,
          position: 'fixed',
          left: 12,
          right: 12,
          top: '24%',
          margin: '0 auto',
          maxWidth: 420,
          padding: '1em',
          zIndex: 41,
        }}
      >
        <div style={{ ...TYPE.heading, color: COLOUR.coralInk }}>{t('lobby.connectionLost')}</div>
        <p style={{ ...TYPE.body, color: COLOUR.ink, margin: '8px 0 0' }}>{t('table.lostBody')}</p>
        {refusal !== null ? (
          <p
            data-connection-refusal=""
            role="alert"
            style={{ ...TYPE.body, color: COLOUR.coralInk, margin: '8px 0 0' }}
          >
            {refusalText(refusal.code, refusal.detail)}
          </p>
        ) : null}
        {refusal !== null && onUpdate && offersUpdate(refusal.code) ? (
          <UpdateNow onUpdate={onUpdate} />
        ) : null}
        <KitButton
          kind="main"
          data-reconnect=""
          style={{ marginTop: 12 }}
          unavailable={reconnecting}
          onPress={onReconnect}
        >
          {reconnecting ? t('table.reconnecting') : t('lobby.reconnect')}
        </KitButton>
        <KitButton data-lost-title="" style={{ marginTop: 12 }} onPress={onTitle}>
          {t('table.backToTitle')}
        </KitButton>
      </div>
    </>
  );
}
