/**
 * THE PIECE STRIP (S25 item 1, ruled 4 September 2026) — every piece a player commands as a
 * 44px chip: the seven cells, then the seven residents behind a control. Tapping selects (tap
 * again deselects), exactly as a board tap does; the board tap keeps working. Spent and offline
 * cells are dimmed with their return on the chip, the selected chip is ringed. The strip exists so
 * the SELECTED piece is never in doubt — the ambiguity behind the S25's dimmed Neutrophil was not
 * knowing which cell a tap acted for.
 *
 * Dumb by design: the shell says which pieces exist and which is selected; names are content.
 *
 * DRAWN IN CLAY since stage L4 of the look (docs/LOOK_PLAN.md §14): each chip is the kit's button
 * with the piece's own picture on its base, and the selected one is pressed in and ringed.
 *
 * ONE ROW OF PIECES, NO NAMES (Gate 2's polish, piece 2, ruled 24 November 2026; §33). Seven chips
 * with a name each were two columns of 44 px rows in a 162 px middle, and scrolled inside it. A
 * chip is now the piece on its base, as the board draws it, and its name is on the selected piece's
 * card the moment it is picked, as it is after a board tap; the name is still the chip's label for
 * a reader that reads labels. A spent cell's return hangs on its chip as a number, as it does on
 * the board.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import type { Unavailable } from '../board/Board';
import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { COLOUR, RADIUS, TOUCH } from '../kit/tokens';
import { cellDisplayName, organDisplayName, residentDisplayName } from '../names';
import { SAY, TONE, pieceArt } from './onCard';

export interface PieceChip {
  kind: 'cell' | 'resident';
  /** Cell key or organ key. */
  key: string;
  unavailable: Unavailable | null;
}

const CHIP: CSSProperties = {
  minHeight: TOUCH.min,
  minWidth: TOUCH.min,
  width: '100%',
  padding: 4,
  justifyContent: 'center',
};
/** The base and the piece, one over the other, filling the picture's square. */
const PICTURE: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};
/** The number on a chip's corner: the turns until a spent cell is back. */
const BADGE: CSSProperties = {
  position: 'absolute',
  right: -4,
  bottom: -4,
  minWidth: 16,
  height: 16,
  padding: '0 3px',
  borderRadius: RADIUS.pill,
  background: COLOUR.ink,
  color: COLOUR.cream,
  fontSize: '0.6875rem',
  fontWeight: 900,
  lineHeight: '16px',
  textAlign: 'center',
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
   * shell from the engine's `regenBreakdown`: shown under the selected chip only, so the row stays
   * seven equal boxes and the explanation sits one tap from the number.
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
          // Seven to a row at phone width, each a touch target; the residents, when shown, wrap
          // to a second row of the same chips.
          gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
          gap: 2,
          paddingBottom: 4,
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
              aria-label={labelText(p, name)}
              title={labelText(p, name)}
              // THE RING IS THE KIT'S, AND TAKES NO ROOM (FINDINGS #73).
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
                {badgeNumber(p) !== null ? (
                  <span style={{ ...BADGE, filter: 'none', opacity: 1 }}>{badgeNumber(p)}</span>
                ) : null}
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

/** The turns until a spent or offline cell is back, for the chip's corner; null when none. */
function badgeNumber(p: PieceChip): string | null {
  const u = p.unavailable;
  if (p.kind !== 'cell' || !u) return null;
  if (u.kind !== 'spent' && u.kind !== 'offline') return null;
  return u.backIn !== null ? String(u.backIn) : null;
}

/** The chip's label: its name, and a resident's organ, a cell's state and its return. */
function labelText(p: PieceChip, name: string): string {
  if (p.kind === 'resident') {
    const organ = organDisplayName(p.key);
    const where = `${name} ${t('inspect.sep')} ${organ}`;
    return p.unavailable ? `${where} ${t('inspect.sep')} ${t('inspect.infected')}` : where;
  }
  const u = p.unavailable;
  if (!u) return name;
  if (u.kind === 'hiv') return `${name} ${t('inspect.sep')} ${t('inspect.hiv')}`;
  if (u.kind === 'infected') return `${name} ${t('inspect.sep')} ${t('inspect.infected')}`;
  const what = t(u.kind === 'spent' ? 'inspect.spent' : 'inspect.offline');
  const state = u.backIn !== null ? `${what} ${String(u.backIn)}` : what;
  return `${name} ${t('inspect.sep')} ${state}`;
}
