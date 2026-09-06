/**
 * THE ACTION LIST (S25 item 1, ruled 4 September 2026) — the selected piece's full set of
 * non-movement actions, always visible. An available row names its target and cost and sends
 * exactly the offer a board ring would ("Engulf Rotavirus", "NET the swarm"); a greyed row is
 * an action this piece cannot take right now, and tapping it says why, inline. That is the
 * "always answers" rule completed per action: the command bar answers for the piece, this
 * answers for each thing it might do. Movement stays on the board, as ruled.
 *
 * Dumb by design: `offered.ts` decides availability and reasons; this renders rows.
 */
import type { CSSProperties, ReactElement } from 'react';
import { useState } from 'react';

import { t } from '../i18n';
import type { ActionRow } from '../play/offered';

const ROW: CSSProperties = {
  minHeight: 44,
  width: '100%',
  padding: '4px 12px',
  fontSize: '0.875rem',
  borderRadius: 8,
  border: '1.5px solid #B03A2E',
  background: '#FFFDF9',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 8,
  textAlign: 'left',
};

export function ActionList({
  rows,
  hasMovement,
  disabled = false,
  onOffer,
}: {
  rows: ActionRow[];
  /** The board is offering moves for this piece — say so, since movement has no row here. */
  hasMovement: boolean;
  disabled?: boolean;
  onOffer: (offerId: string) => void;
}): ReactElement {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div
      data-panel="actions"
      style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      <div style={{ fontSize: '0.75rem', color: '#78665D', fontWeight: 700 }}>
        {t('actions.title')}
      </div>
      {hasMovement ? (
        <div style={{ fontSize: '0.75rem', color: '#2F6B4A' }}>{t('actions.movementOnBoard')}</div>
      ) : null}
      {rows.length === 0 ? (
        <div style={{ fontSize: '0.8125rem', color: '#78665D' }}>{t('actions.none')}</div>
      ) : null}
      {rows.map((r) => (
        <div key={r.id}>
          <button
            data-action-row={r.action}
            data-available={r.available ? '1' : '0'}
            disabled={disabled}
            onClick={() => {
              if (r.available && r.offerId !== null) onOffer(r.offerId);
              else setOpen((o) => (o === r.id ? null : r.id));
            }}
            style={{
              ...ROW,
              borderColor: r.available ? '#B03A2E' : '#94847A',
              color: r.available ? '#2E2A28' : '#7A6C64',
              background: r.available ? '#FFFDF9' : '#F6F1EC',
            }}
          >
            <span>{r.label}</span>
            {r.detail !== null || r.cost !== null ? (
              // THE ROW'S DETAIL (ruled 6 September 2026: rows carry odds and cost where the
              // number is content's): right-aligned, muted, and allowed to wrap under the label
              // at 360px rather than truncate — `flexWrap` on the row.
              <span data-action-detail="1" style={{ fontSize: '0.75rem', color: '#78665D' }}>
                {[r.detail, r.cost].filter((x) => x !== null).join(` ${t('inspect.sep')} `)}
              </span>
            ) : null}
          </button>
          {!r.available && open === r.id && r.reason !== null ? (
            <div
              data-action-reason={r.action}
              style={{ fontSize: '0.75rem', color: '#78665D', padding: '2px 12px 4px' }}
            >
              {r.reason}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
