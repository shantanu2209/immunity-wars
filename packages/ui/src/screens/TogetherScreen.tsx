/**
 * PLAY TOGETHER — the way in (P3.7 piece A, docs/for-P3.md §6). A name, then create a room or join
 * one with the code someone shared.
 *
 * THE NAME IS TYPED EVERY TIME (ruled 25 September 2026). Nothing about a player is kept on the
 * device between rooms: the name lives in the room and dies with it, and the box starts empty.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import { t } from '../i18n';
import { codeComplete, nameReady, normaliseCode, refusalText } from '../together/model';
import { BODY, BTN, GROUP, LEAD, PAGE, TITLE } from './chrome';

const FIELD: CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 48,
  fontSize: '1rem',
  borderRadius: 10,
  border: '2px solid #8E6E53',
  background: '#FFFDF9',
  padding: '8px 12px',
  marginTop: 6,
};

export function TogetherScreen({
  busy,
  refusal,
  onCreate,
  onJoin,
  rejoinCode = null,
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
        <button
          data-together="rejoin"
          style={{ ...BTN, borderColor: '#B03A2E', marginTop: 18 }}
          disabled={busy || !named}
          onClick={() => onJoin(name.trim(), rejoinCode)}
        >
          {t('together.rejoin')}
        </button>
      ) : (
        <>
          <button
            data-together="create"
            style={{ ...BTN, borderColor: '#B03A2E', marginTop: 18 }}
            disabled={busy || !named}
            onClick={() => onCreate(name.trim())}
          >
            {t('together.create')}
          </button>

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
          <button
            data-together="join"
            style={BTN}
            disabled={busy || !named || !codeComplete(code)}
            onClick={() => onJoin(name.trim(), code)}
          >
            {t('together.join')}
          </button>
        </>
      )}

      {busy ? (
        <p style={BODY} data-together="busy">
          {t('together.connecting')}
        </p>
      ) : null}
      {refusal ? (
        <p style={{ ...BODY, color: '#B03A2E' }} data-together="refusal" role="alert">
          {refusalText(refusal.code, refusal.detail)}
        </p>
      ) : null}
    </div>
  );
}
