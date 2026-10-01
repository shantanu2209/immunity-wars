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
import { KitButton } from '../kit/Button';
import { COLOUR } from '../kit/tokens';
import type { TableSummary } from '../play/table';
import { SAY, SMALL, TONE } from './onCard';

const GROUP: CSSProperties = { ...SAY.label, margin: '10px 6px 4px' };

const MARK: CSSProperties = { ...SAY.quiet, marginLeft: 6 };

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
    <div data-table-view="" style={SAY.body}>
      <div style={GROUP}>{t('table.players')}</div>
      {summary.members.map((m) => (
        <div key={m.id} data-table-member={m.id} style={{ padding: '4px 6px' }}>
          <div>
            <span style={{ fontWeight: 800 }}>{m.name}</span>
            {m.you ? <span style={MARK}>{t('lobby.you')}</span> : null}
            {m.captain ? <span style={MARK}>{t('lobby.captain')}</span> : null}
            {m.away ? (
              <span data-away="" style={{ ...MARK, color: TONE.bad, fontWeight: 800 }}>
                {t('lobby.away')}
              </span>
            ) : null}
          </div>
          <div style={SAY.quiet}>
            {m.pieces.length > 0 ? m.pieces.join(', ') : t('table.noPieces')}
          </div>
        </div>
      ))}

      {summary.waiting.length > 0 ? (
        <section data-table-waiting={String(summary.waiting.length)}>
          <div style={GROUP}>{t('table.waitingTitle')}</div>
          <div style={{ ...SAY.quiet, margin: '0 6px 4px' }}>
            {captain
              ? t('table.waitingCaptain')
              : t('table.waitingOthers', { name: captainName ?? t('table.theCaptain') })}
          </div>
          {summary.waiting.map((w) => (
            <div
              key={w.seat}
              data-table-seat={w.seat}
              style={{ padding: '6px', borderTop: `1.5px solid ${COLOUR.creamEdge}` }}
            >
              <div>
                <span style={{ fontWeight: 800 }}>{w.name}</span>
                <span style={MARK}>
                  {w.holder ? t('table.heldAway', { name: w.holder.name }) : t('table.heldNobody')}
                </span>
              </div>
              {w.detail ? <div style={SAY.quiet}>{w.detail}</div> : null}
              {captain ? (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px 6px',
                    margin: '4px 0 6px',
                  }}
                >
                  {summary.present.map((p) => (
                    <KitButton
                      key={p.id}
                      kind="go"
                      data-give={`${w.seat}:${String(p.id)}`}
                      style={SMALL}
                      onPress={() => onGive(w.seat, p.id)}
                    >
                      {t('table.giveTo', { name: p.name })}
                    </KitButton>
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
