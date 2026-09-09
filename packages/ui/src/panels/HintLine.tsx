/**
 * A FIRST-ENCOUNTER HINT, as it appears on screen.
 *
 * Ruled by Shantanu on 8 September 2026 (`docs/for-P2.6-onboarding.md` points 3 and 4).
 *
 * **It is anchored inside the panel that is already open, not floating over the board**, and
 * that avoids a positioning problem rather than solving one. A callout placed against board
 * geometry on a 360px portrait screen must not cover the thing it explains, must be re-placed at
 * 200% text, and must be re-placed again when the board pans. A line inside a panel that is
 * already laid out and already audited has none of those problems.
 *
 * It does not interrupt and does not block: the game underneath stays live, and a player who
 * ignores it entirely can play the whole game. It has a dismiss control and **no timer** — a
 * player who glances away should not lose it.
 *
 * The words are the first part of the How to play entry for the same thing, not a copy of it.
 * See `screens/HelpScreen.tsx`'s `composed`.
 */
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';

const WRAP: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  border: '2px solid #8E6E53',
  borderLeft: '5px solid #B03A2E',
  background: '#FFFDF9',
  borderRadius: 10,
  padding: '8px 10px',
  margin: '6px 0',
};

export function HintLine({
  text,
  onDismiss,
}: {
  text: string;
  onDismiss: () => void;
}): ReactElement {
  return (
    <div style={WRAP} role="note" data-hint="">
      <p
        style={{
          flex: '1 1 auto',
          margin: 0,
          fontSize: '0.875rem',
          lineHeight: 1.45,
          color: '#2E2A28',
        }}
        data-hint-text=""
      >
        {text}
      </p>
      <button
        style={{
          flex: '0 0 auto',
          minWidth: 44,
          minHeight: 44,
          fontSize: '0.8125rem',
          borderRadius: 8,
          border: '2px solid #8E6E53',
          background: '#F6F1EC',
          cursor: 'pointer',
        }}
        onClick={onDismiss}
        aria-label={t('hint.dismiss')}
        data-hint-dismiss=""
      >
        {t('hint.ok')}
      </button>
    </div>
  );
}
