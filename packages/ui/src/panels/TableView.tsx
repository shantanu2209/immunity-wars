/**
 * THE TABLE (P3.7 piece C, docs/for-P3.md §6): who is playing, who is away, and who holds which
 * pieces, opened full height over the game like the messages.
 *
 * THE TABLE'S CHOICE (ruling 4): a piece held by someone away, or by nobody, cannot be moved. The
 * captain may hand it to anyone present, one piece at a time, or the table may simply wait; nothing
 * forces the issue and no timer decides it. Everyone sees the same page; only the captain's has the
 * buttons, because only the captain's handover the room accepts (`assignSeat`).
 */
import type { CSSProperties, ReactElement } from 'react';

import type { Seat } from '@immunity-wars/protocol';

import { t } from '../i18n';
import type { TableSummary } from '../play/table';

const GROUP: CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#78665D',
  margin: '10px 6px 4px',
};

const MARK: CSSProperties = { fontSize: '0.8125rem', color: '#78665D', marginLeft: 6 };

const GIVE: CSSProperties = {
  minHeight: 44,
  padding: '0 12px',
  borderRadius: 8,
  border: '1.5px solid #8E6E53',
  background: '#FFFDF9',
  color: '#2E2A28',
  fontSize: '0.875rem',
  cursor: 'pointer',
};

export function TableView({
  summary,
  captain,
  captainName,
  onGive,
}: {
  summary: TableSummary;
  /** This device is the captain's. */
  captain: boolean;
  captainName: string | null;
  /** The captain hands a waiting piece to a present member, by their public id. */
  onGive: (seat: Seat, to: number) => void;
}): ReactElement {
  return (
    <div data-table-view="" style={{ fontSize: '0.875rem', color: '#2E2A28' }}>
      <div style={GROUP}>{t('table.players')}</div>
      {summary.members.map((m) => (
        <div key={m.id} data-table-member={m.id} style={{ padding: '4px 6px' }}>
          <div>
            <span style={{ fontWeight: 700 }}>{m.name}</span>
            {m.you ? <span style={MARK}>{t('lobby.you')}</span> : null}
            {m.captain ? <span style={MARK}>{t('lobby.captain')}</span> : null}
            {m.away ? (
              <span data-away="" style={{ ...MARK, color: '#B03A2E', fontWeight: 700 }}>
                {t('lobby.away')}
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#78665D' }}>
            {m.pieces.length > 0 ? m.pieces.join(', ') : t('table.noPieces')}
          </div>
        </div>
      ))}

      {summary.waiting.length > 0 ? (
        <section data-table-waiting={String(summary.waiting.length)}>
          <div style={GROUP}>{t('table.waitingTitle')}</div>
          <div style={{ fontSize: '0.8125rem', color: '#78665D', margin: '0 6px 4px' }}>
            {captain
              ? t('table.waitingCaptain')
              : t('table.waitingOthers', { name: captainName ?? t('table.theCaptain') })}
          </div>
          {summary.waiting.map((w) => (
            <div
              key={w.seat}
              data-table-seat={w.seat}
              style={{ padding: '6px', borderTop: '1px solid #EADFD5' }}
            >
              <div>
                <span style={{ fontWeight: 700 }}>{w.name}</span>
                <span style={MARK}>
                  {w.holder ? t('table.heldAway', { name: w.holder.name }) : t('table.heldNobody')}
                </span>
              </div>
              {w.detail ? (
                <div style={{ fontSize: '0.8125rem', color: '#78665D' }}>{w.detail}</div>
              ) : null}
              {captain ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {summary.present.map((p) => (
                    <button
                      key={p.id}
                      data-give={`${w.seat}:${String(p.id)}`}
                      style={GIVE}
                      onClick={() => onGive(w.seat, p.id)}
                    >
                      {t('table.giveTo', { name: p.name })}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
