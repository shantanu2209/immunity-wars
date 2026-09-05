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

/**
 * A GRID, three per row, every chip the same width (S25 second pass, 5 September 2026: a
 * single scrolling line was poor). The chip's text is one line each, clipped with an ellipsis
 * rather than wrapped, so fourteen chips of unequal names keep fourteen equal boxes.
 */
const CHIP: CSSProperties = {
  minHeight: 44,
  minWidth: 0,
  padding: '3px 6px',
  borderRadius: 10,
  border: '1.5px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 12,
  lineHeight: 1.15,
  textAlign: 'left',
};
const CLIP: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 6,
          paddingBottom: 4,
        }}
      >
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
                width={26}
                height={26}
                alt=""
                style={{ flex: '0 0 auto', ...(p.unavailable ? { filter: 'grayscale(1)' } : {}) }}
              />
              <span style={{ minWidth: 0, flex: '1 1 auto' }}>
                <span style={{ ...CLIP, fontWeight: 700 }}>{name}</span>
                <span style={{ ...CLIP, color: '#7C6A61' }}>
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
