/**
 * THE PIECE STRIP (S25 item 1, ruled 4 September 2026) — every piece a player commands as a
 * 44px chip in one horizontally scrolling row: the seven cells, then the seven residents by
 * their real names. Tapping selects (tap again deselects), exactly as a board tap does; the
 * board tap keeps working. Spent and offline cells are dimmed with their return in the chip,
 * the selected chip is ringed. The strip exists so the SELECTED piece is never in doubt — the
 * ambiguity behind the S25's dimmed Neutrophil was not knowing which cell a tap acted for.
 *
 * Dumb by design: the shell says which pieces exist and which is selected; names are content.
 *
 * DRAWN IN CLAY since stage L4 of the look (docs/LOOK_PLAN.md §14): each chip is the kit's button
 * with the piece's own picture on its base, and the selected one is pressed in and ringed.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import type { Unavailable } from '../board/Board';
import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { cellDisplayName, organDisplayName, residentDisplayName } from '../names';
import { SAY, TONE, pieceArt } from './onCard';

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
  justifyContent: 'flex-start',
  gap: 4,
  fontSize: '0.75rem',
  lineHeight: 1.15,
  textAlign: 'left',
};
/** The base and the piece, one over the other, filling the picture's square. */
const PICTURE: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
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
  why = {},
  disabled = false,
  emptyText = null,
  onSelectCell,
  onSelectResident,
  onDeselect,
}: {
  pieces: PieceChip[];
  selectedCell: string | null;
  selectedResident: string | null;
  /**
   * WHY a spent cell is back when it is back (6 September 2026), by cell key, localised by the
   * shell from the engine's `regenBreakdown`: shown under the selected chip only, so the grid
   * stays fourteen equal boxes and the explanation sits one tap from the number.
   */
  why?: Readonly<Record<string, string>>;
  disabled?: boolean;
  /** Said when there are no pieces to list: a player holding none, in a game played together. */
  emptyText?: string | null;
  onSelectCell: (cell: string) => void;
  onSelectResident: (organ: string) => void;
  onDeselect: () => void;
}): ReactElement {
  const [showResidents, setShowResidents] = useState(false);
  /**
   * WHAT CAN ACT COMES FIRST, AND THE RESIDENTS WAIT BEHIND A CONTROL (§21 A). Fourteen chips were
   * 414px of content in a 126px middle at 360 x 641, for the commonest action in the game, and half
   * of them were resident macrophages which are rarely the answer. Order is stable within each
   * group, so a chip does not move between renders for any reason but becoming unavailable.
   */
  const cells = pieces.filter((p) => p.kind === 'cell');
  const residents = pieces.filter((p) => p.kind !== 'cell');
  const ready = cells.filter((p) => !p.unavailable);
  const waiting = cells.filter((p) => p.unavailable);
  const shown = [...ready, ...waiting, ...(showResidents ? residents : [])];
  return (
    // NO TITLE since piece 5 (§19): the Cells tab that opened this view already says what it is.
    <div data-panel="pieces">
      {pieces.length === 0 && emptyText !== null ? (
        <div data-pieces-none="" style={SAY.quiet}>
          {emptyText}
        </div>
      ) : null}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(7rem, 1fr))',
          gap: '10px 6px',
          paddingBottom: 6,
        }}
      >
        {shown.map((p) => {
          const selected = p.kind === 'cell' ? p.key === selectedCell : p.key === selectedResident;
          // A resident is one of the body's own macrophages, under its tissue's name.
          const art = pieceArt(p.kind === 'cell' ? p.key : 'macrophage');
          const name = p.kind === 'cell' ? cellDisplayName(p.key) : residentDisplayName(p.key);
          return (
            <KitButton
              key={`${p.kind}-${p.key}`}
              data-piece={`${p.kind}:${p.key}`}
              data-selected={selected ? '1' : undefined}
              disabled={disabled}
              // THE RING IS THE KIT'S, AND TAKES NO ROOM (FINDINGS #73): a wider border took 3px
              // from the name, which then clipped at a 180px layout (200% page zoom).
              selected={selected}
              onPress={() => {
                if (selected) onDeselect();
                else if (p.kind === 'cell') onSelectCell(p.key);
                else onSelectResident(p.key);
              }}
              style={CHIP}
            >
              <span
                aria-hidden="true"
                style={{
                  position: 'relative',
                  width: 34,
                  height: 34,
                  flex: '0 0 auto',
                  // A piece that cannot act is the picture that changes, as on the board.
                  ...(p.unavailable ? { filter: 'grayscale(1)', opacity: 0.5 } : {}),
                }}
              >
                <img alt="" src={pieceArt('base')} style={PICTURE} />
                <img alt="" src={art} style={PICTURE} />
              </span>
              <span style={{ minWidth: 0, flex: '1 1 auto' }}>
                <span style={{ ...CLIP, fontWeight: 800 }}>{name}</span>
                <span style={{ ...CLIP, fontWeight: 600, opacity: 0.8 }}>{badgeText(p)}</span>
              </span>
            </KitButton>
          );
        })}
      </div>
      {residents.length > 0 ? (
        <KitButton
          data-pieces-residents={showResidents ? 'open' : 'closed'}
          aria-expanded={showResidents}
          onPress={() => setShowResidents((v) => !v)}
          style={{ minHeight: 44, marginTop: 4, fontSize: '0.8125rem' }}
        >
          {showResidents
            ? t('pieces.hideResidents')
            : t('pieces.showResidents', { n: residents.length })}
        </KitButton>
      ) : null}
      {selectedCell !== null && why[selectedCell] !== undefined ? (
        <div
          data-piece-why={selectedCell}
          style={{ ...SAY.quiet, fontSize: '0.75rem', color: TONE.note, marginTop: 8 }}
        >
          {why[selectedCell]}
        </div>
      ) : null}
    </div>
  );
}

/** The chip's second line: a resident's organ; a cell's state and its return, or nothing. */
function badgeText(p: PieceChip): string {
  if (p.kind === 'resident') {
    const organ = organDisplayName(p.key);
    return p.unavailable ? `${organ} ${t('inspect.sep')} ${t('inspect.infected')}` : organ;
  }
  const u = p.unavailable;
  if (!u) return '';
  if (u.kind === 'hiv') return t('inspect.hiv');
  if (u.kind === 'infected') return t('inspect.infected');
  const what = t(u.kind === 'spent' ? 'inspect.spent' : 'inspect.offline');
  return u.backIn !== null ? `${what} ${String(u.backIn)}` : what;
}
