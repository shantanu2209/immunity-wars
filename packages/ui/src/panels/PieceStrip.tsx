/**
 * THE PIECE STRIP (S25 item 1, ruled 4 September 2026) — every piece a player commands as a
 * 44px chip in one horizontally scrolling row: the seven cells, then the seven residents by
 * their real names. Tapping selects (tap again deselects), exactly as a board tap does; the
 * board tap keeps working. Spent and offline cells are dimmed with their return in the chip,
 * the selected chip is ringed. The strip exists so the SELECTED piece is never in doubt — the
 * ambiguity behind the S25's dimmed Neutrophil was not knowing which cell a tap acted for.
 *
 * Dumb by design: the shell says which pieces exist and which is selected; names are content.
 */
import type { CSSProperties, ReactElement } from 'react';

import type { Unavailable } from '../board/Board';
import { t } from '../i18n';
import { cellDisplayName, organDisplayName, residentDisplayName } from '../names';

export interface PieceChip {
  kind: 'cell' | 'resident';
  /** Cell key or organ key. */
  key: string;
  unavailable: Unavailable | null;
}

const CHIP: CSSProperties = {
  minHeight: 44,
  minWidth: 64,
  padding: '3px 8px',
  borderRadius: 10,
  border: '1.5px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flex: '0 0 auto',
  fontSize: 12,
  lineHeight: 1.15,
  textAlign: 'left',
};

export function PieceStrip({
  pieces,
  selectedCell,
  selectedResident,
  disabled = false,
  onSelectCell,
  onSelectResident,
  onDeselect,
}: {
  pieces: PieceChip[];
  selectedCell: string | null;
  selectedResident: string | null;
  disabled?: boolean;
  onSelectCell: (cell: string) => void;
  onSelectResident: (organ: string) => void;
  onDeselect: () => void;
}): ReactElement {
  return (
    <div data-panel="pieces" style={{ marginTop: 6 }}>
      <div style={{ fontSize: 12, color: '#7C6A61', fontWeight: 700, marginBottom: 2 }}>
        {t('pieces.title')}
      </div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {pieces.map((p) => {
          const selected = p.kind === 'cell' ? p.key === selectedCell : p.key === selectedResident;
          const art = p.kind === 'cell' ? `cell-${p.key}` : 'cell-macrophage';
          const name = p.kind === 'cell' ? cellDisplayName(p.key) : residentDisplayName(p.key);
          return (
            <button
              key={`${p.kind}-${p.key}`}
              data-piece={`${p.kind}:${p.key}`}
              data-selected={selected ? '1' : undefined}
              disabled={disabled}
              onClick={() => {
                if (selected) onDeselect();
                else if (p.kind === 'cell') onSelectCell(p.key);
                else onSelectResident(p.key);
              }}
              style={{
                ...CHIP,
                borderColor: selected ? '#e80' : p.kind === 'resident' ? '#8E6E53' : '#C8877B',
                borderWidth: selected ? 3 : 1.5,
                borderStyle: p.kind === 'resident' ? 'double' : 'solid',
                background: selected ? '#FBEAE5' : '#FFFDF9',
                opacity: p.unavailable ? 0.55 : 1,
              }}
            >
              <img
                src={`/art/${art}@3x.webp`}
                width={28}
                height={28}
                alt=""
                style={p.unavailable ? { filter: 'grayscale(1)' } : undefined}
              />
              <span>
                <span style={{ fontWeight: 700 }}>{name}</span>
                <span style={{ display: 'block', color: '#7C6A61' }}>
                  {p.kind === 'resident'
                    ? organDisplayName(p.key)
                    : p.unavailable
                      ? p.unavailable.backIn !== null
                        ? t(p.unavailable.kind === 'spent' ? 'inspect.spent' : 'inspect.offline') +
                          ' ' +
                          String(p.unavailable.backIn)
                        : t(p.unavailable.kind === 'spent' ? 'inspect.spent' : 'inspect.offline')
                      : ''}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
