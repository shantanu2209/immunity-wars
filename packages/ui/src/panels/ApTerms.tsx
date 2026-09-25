/**
 * THE ACTION POINT FIGURE'S BREAKDOWN (6 September 2026, Shantanu's principle: show the effect
 * where the number appears, and let the player drill into the number to see what is making it
 * that way). One line per term of the engine's `apBreakdown`, signed and coloured, then the
 * total — which is the number already on screen. Positive minus negative equals it, by an
 * assertion on the corpus, not by this component.
 *
 * Dumb by design: the shell localises the terms (`apTermLines`); this lays them out. Used by
 * the command bar (the AP beside the selected cell) and the planning screen (the AP line).
 */
import type { ReactElement } from 'react';

import { t } from '../i18n';

export function ApTerms({
  terms,
  total,
  yours = null,
  players = [],
}: {
  terms: readonly { text: string; delta: number }[];
  total: number;
  /**
   * IN A GAME PLAYED TOGETHER (P3.7): the top bar shows this player's own points, and the terms
   * add up to the table's. So the sheet says both, and what every player has left to spend, which
   * is what the captain needs to see before ending the turn. Null and empty alone.
   */
  yours?: number | null;
  players?: readonly { name: string; ap: number }[];
}): ReactElement {
  return (
    <div
      data-ap-terms="1"
      style={{
        marginTop: 4,
        padding: '6px 10px',
        borderRadius: 8,
        border: '1.5px solid #C8B8AE',
        background: '#FFFDF9',
        fontSize: '0.8125rem',
        color: '#2E2A28',
      }}
    >
      <div style={{ fontSize: '0.75rem', color: '#78665D', fontWeight: 700 }}>{t('ap.title')}</div>
      {terms.map((term, i) => (
        <div
          key={String(i)}
          data-ap-term={String(i)}
          style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '2px 0' }}
        >
          <span>{term.text}</span>
          <span
            style={{
              fontWeight: 700,
              color: term.delta < 0 ? '#B03A2E' : i === 0 ? '#2E2A28' : '#2F6B4A',
            }}
          >
            {term.delta < 0 || i === 0 ? String(term.delta) : `+${String(term.delta)}`}
          </span>
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          borderTop: '1px solid #EADFD5',
          marginTop: 2,
          paddingTop: 4,
          fontWeight: 700,
        }}
      >
        <span>{t('ap.total')}</span>
        <span>{total}</span>
      </div>
      {yours !== null ? (
        <div
          data-ap-yours="1"
          style={{ display: 'flex', justifyContent: 'space-between', gap: 8, paddingTop: 4 }}
        >
          <span>{t('ap.yours')}</span>
          <span style={{ fontWeight: 700 }}>{yours}</span>
        </div>
      ) : null}
      {players.length > 0 ? (
        <div data-ap-players="1" style={{ marginTop: 6 }}>
          <div style={{ fontSize: '0.75rem', color: '#78665D', fontWeight: 700 }}>
            {t('ap.players')}
          </div>
          {players.map((p, i) => (
            <div
              key={String(i)}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '2px 0' }}
            >
              <span>{p.name}</span>
              <span>{p.ap}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
