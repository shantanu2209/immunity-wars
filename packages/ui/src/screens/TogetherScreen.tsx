/**
 * PLAY TOGETHER — the way in (P3.7 piece A, docs/for-P3.md §6). A name, then create a room or join
 * one with the code someone shared.
 *
 * THE NAME IS TYPED EVERY TIME (ruled 25 September 2026). Nothing about a player is kept on the
 * device between rooms: the name lives in the room and dies with it, and the box starts empty.
 */
import { useState, type ReactElement } from 'react';

import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { UpdateNow } from '../panels/UpdateNow';
import {
  codeComplete,
  nameReady,
  normaliseCode,
  offersUpdate,
  refusalText,
} from '../together/model';
import { FIELD, GROUP, LEAD, PAGE, SAY, TITLE, WARN } from './chrome';

export function TogetherScreen({
  busy,
  refusal,
  onCreate,
  onJoin,
  rejoinCode = null,
  onUpdate,
}: {
  /** A room is being created or joined; the buttons wait. */
  busy: boolean;
  /** Why the last attempt failed, as the relay's code. */
  refusal: { code: string; detail?: string } | null;
  onCreate: (name: string) => void;
  onJoin: (name: string, code: string) => void;
  /**
   * REJOINING (P3.7 piece C, ruling (a)): the room this device was in. The screen then asks only
   * for the name, typed again (ruling 2), and goes back to that room; nothing else is offered.
   */
  rejoinCode?: string | null;
  /** Takes the newer version and reloads (FINDINGS #93), offered under a version refusal only. */
  onUpdate?: () => void;
}): ReactElement {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const named = nameReady(name);
  return (
    <div style={PAGE} data-screen="together">
      <h1 style={TITLE}>{rejoinCode ? t('together.rejoinTitle') : t('together.title')}</h1>
      <p style={LEAD}>
        {rejoinCode ? t('together.rejoinLead', { code: rejoinCode }) : t('together.lead')}
      </p>

      <label style={{ ...GROUP, display: 'block', marginTop: 18 }}>
        {t('together.nameLabel')}
        <input
          data-together="name"
          style={FIELD}
          value={name}
          maxLength={24}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <p style={LEAD}>{t('together.nameNote')}</p>

      {rejoinCode ? (
        <KitButton
          kind="main"
          data-together="rejoin"
          style={{ marginTop: 18 }}
          unavailable={busy || !named}
          onPress={() => onJoin(name.trim(), rejoinCode)}
        >
          {t('together.rejoin')}
        </KitButton>
      ) : (
        <>
          <KitButton
            kind="main"
            data-together="create"
            style={{ marginTop: 18 }}
            unavailable={busy || !named}
            onPress={() => onCreate(name.trim())}
          >
            {t('together.create')}
          </KitButton>

          <label style={{ ...GROUP, display: 'block', marginTop: 24 }}>
            {t('together.codeLabel')}
            <input
              data-together="code"
              style={{ ...FIELD, letterSpacing: '0.3em', textTransform: 'uppercase' }}
              value={code}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setCode(normaliseCode(e.target.value))}
            />
          </label>
          <KitButton
            data-together="join"
            style={{ marginTop: 12 }}
            unavailable={busy || !named || !codeComplete(code)}
            onPress={() => onJoin(name.trim(), code)}
          >
            {t('together.join')}
          </KitButton>
        </>
      )}

      {busy ? (
        <p style={SAY} data-together="busy">
          {t('together.connecting')}
        </p>
      ) : null}
      {refusal ? (
        <p style={WARN} data-together="refusal" role="alert">
          {refusalText(refusal.code, refusal.detail)}
        </p>
      ) : null}
      {refusal && onUpdate && offersUpdate(refusal.code) ? <UpdateNow onUpdate={onUpdate} /> : null}
    </div>
  );
}
