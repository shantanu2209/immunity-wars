/**
 * THE COACH'S LINE, as it appears on screen (piece 8, docs/for-P2.7.md §20).
 *
 * Deliberately the same shape as a first-encounter hint (`HintLine`), and for the same reason: it
 * is anchored in the layout, not floated against board geometry, so it needs no re-placing at 200%
 * text or when the board pans. Two differences, both of which say what it is:
 *
 * - it carries its own colour, because it is guidance about the TURN rather than about a thing
 *   that was just tapped;
 * - it has a second control, which ends the coaching for good. A teacher who cannot be stopped is
 *   the thing this must not become, so stopping is one tap away at every step, not buried in
 *   Settings. Settings is where it is turned back ON.
 */
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';

const WRAP: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 6,
  border: '2px solid #1F6F8B',
  borderLeft: '5px solid #1F6F8B',
  background: '#F2F8FA',
  borderRadius: 10,
  padding: '6px 8px',
  marginBottom: 6,
};

const BTN: CSSProperties = {
  flex: '0 0 auto',
  minWidth: 44,
  minHeight: 44,
  fontSize: '0.75rem',
  borderRadius: 8,
  border: '1.5px solid #1F6F8B',
  background: '#FFFDF9',
  color: '#1F6F8B',
  cursor: 'pointer',
};

export function CoachLine({
  text,
  onNext,
  onStop,
}: {
  text: string;
  /** Understood: this step goes away until the game moves on to another one. */
  onNext: () => void;
  /** No more coaching, this game and after it, until Settings turns it back on. */
  onStop: () => void;
}): ReactElement {
  return (
    <div style={WRAP} role="note" data-coach="">
      <p
        style={{
          flex: '1 1 auto',
          margin: 0,
          fontSize: '0.8125rem',
          lineHeight: 1.4,
          color: '#2E2A28',
        }}
        data-coach-text=""
      >
        {text}
      </p>
      <button style={BTN} onClick={onNext} data-coach-next="" aria-label={t('coach.ok')}>
        {t('coach.ok')}
      </button>
      <button style={BTN} onClick={onStop} data-coach-stop="" aria-label={t('coach.stop')}>
        {t('coach.stop')}
      </button>
    </div>
  );
}
