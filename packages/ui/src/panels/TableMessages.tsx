/**
 * THE TABLE'S MESSAGES (ruled 25 September 2026, after the first game on the live server: "all
 * players will not be in the same room and we need coordination"). The Messages drawer's second
 * tab, in a game played together: the table's fixed messages to send, and what has happened at the
 * table, newest first, which the passing notices otherwise take away after a few seconds.
 *
 * FIXED MESSAGES ONLY: there is no free-text chat in v1 (brief §4, ruling 3). A button sends a
 * message's id; every screen words it from its own catalogue, and shows nothing for an id it has
 * no words for, so a message added later is simply not shown by an older app.
 */
import { SAY_MESSAGES } from '@immunity-wars/protocol';
import { useEffect, useState, type ReactElement } from 'react';

import { t } from '../i18n';

/** One line of the table's record: a message someone said, or something that happened. */
export interface TableLine {
  readonly at: number;
  readonly text: string;
  readonly mine: boolean;
}

/** A message's words, or null when this app has none for its id. */
export function sayText(id: string): string | null {
  const text = t(`say.${id}`);
  return text.includes('⟪') ? null : text;
}

export function TableMessages({
  lines,
  onSay,
}: {
  lines: readonly TableLine[];
  onSay: (message: string) => void;
}): ReactElement {
  // A second tap within a second is ignored: a message is for saying, not for repeating.
  const [resting, setResting] = useState(false);
  useEffect(() => {
    if (!resting) return undefined;
    const id = window.setTimeout(() => setResting(false), 1000);
    return () => window.clearTimeout(id);
  }, [resting]);
  return (
    <div data-table-messages="" style={{ fontSize: '0.875rem', color: '#2E2A28' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78665D', margin: '4px 4px' }}>
        {t('chat.say')}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(9rem, 1fr))',
          gap: 6,
          padding: '0 4px',
        }}
      >
        {SAY_MESSAGES.map((id) => (
          <button
            key={id}
            data-say={id}
            disabled={resting}
            onClick={() => {
              setResting(true);
              onSay(id);
            }}
            style={{
              minHeight: 44,
              padding: '4px 8px',
              borderRadius: 8,
              border: '1.5px solid #8E6E53',
              background: '#FFFDF9',
              color: '#2E2A28',
              fontSize: '0.8125rem',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            {sayText(id)}
          </button>
        ))}
      </div>
      <div
        style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78665D', margin: '12px 4px 4px' }}
      >
        {t('chat.log')}
      </div>
      {lines.length === 0 ? (
        <div style={{ color: '#78665D', padding: '0 4px' }}>{t('chat.nothing')}</div>
      ) : (
        <ul data-table-log="" style={{ listStyle: 'none', margin: 0, padding: '0 4px' }}>
          {[...lines]
            .sort((a, b) => b.at - a.at)
            .map((l, i) => (
              <li
                key={`${String(l.at)}-${String(i)}`}
                style={{
                  padding: '4px 0',
                  borderTop: '1px solid #EADFD5',
                  fontWeight: l.mine ? 700 : 400,
                }}
              >
                {l.text}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
