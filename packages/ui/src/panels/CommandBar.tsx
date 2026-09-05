/**
 * The command bar — SELECTION AS A MODE THAT ALWAYS ANSWERS (ruling of 4 September 2026).
 *
 * When a cell is selected this bar always says something actionable: what the board is
 * offering (a hint that highlighted nodes / pathogens are tappable), the offers that have no
 * position (buttons), or — when there is nothing — WHY, as one localised line. Never silence.
 * It also carries the two things that are not about the selection: undo (moves only, from the
 * session's rule) and the last rejection, both localised by the shell.
 *
 * Dumb by design: it decides nothing. `offered.ts` decides what is legal; the shell hands the
 * results in as plain props. All text renders through the catalogue.
 */
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';
import { actionDisplayName } from '../names';
import type { ActionRow } from '../play/offered';
import { ActionList } from './ActionList';

const BTN: CSSProperties = {
  minHeight: 44,
  padding: '0 14px',
  fontSize: 14,
  borderRadius: 8,
  border: '1.5px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
};

export interface BarButton {
  id: string;
  label: string;
}

export function CommandBar({
  selectedCellName,
  qualifier = null,
  noSelectionHint = null,
  ap,
  hint = null,
  buttons = [],
  noAction = null,
  undo = { available: false, moves: 0 },
  inCommand = false,
  notice = null,
  canInspect = false,
  disabled = false,
  rows = [],
  hasMovement = false,
  onOffer,
  onCard,
  onButton,
  onUndo,
  onInspect,
  onDeselect,
}: {
  /**
   * THE ACTIONS LIVE IN THIS BOX (S25 second pass, 5 September 2026: one box per cell, not a
   * selection box and a second box of actions below the pieces). The selected piece's rows —
   * `actionRows` — render here between the hint and the footer; the body's rows while nothing
   * is selected.
   */
  rows?: ActionRow[];
  hasMovement?: boolean;
  onOffer?: (offerId: string) => void;
  /** Opens the selected CELL's card (item 12's cards; residents have none). The box is "the
   *  cell, its state, its actions" — and what it is, which must be reachable from anywhere,
   *  not only where the cell stands with something the inspect sheet can show. */
  onCard?: () => void;
  /** Display name of the selected cell, or null when nothing is selected. */
  selectedCellName: string | null;
  /** Muted line after the name — a resident's "resident of the Liver" (CP3). */
  qualifier?: string | null;
  /** Shown instead of the select prompt while nothing is selected and the body offers rings (CP4). */
  noSelectionHint?: string | null;
  ap: number;
  /** Localised line describing what the board is offering (tap a node / a pathogen). */
  hint?: string | null;
  /** Offers with no position — prepared by the shell, labels localised. */
  buttons?: BarButton[];
  /** When the selected cell has no legal action: the reason, already localised. */
  noAction?: string | null;
  /** The session's undo availability — moves only — with WHY when it is unavailable. */
  undo?: {
    available: boolean;
    moves: number;
    reason?: 'available' | 'not-command' | 'no-moves' | 'committed' | 'resumed';
    committedBy?: string | null;
  };
  /** True during the command phase — when the undo reason line is worth showing. */
  inCommand?: boolean;
  /** The last rejection or notice, already localised; null when there is none. */
  notice?: string | null;
  /** True when the selected cell stands with something worth inspecting. */
  canInspect?: boolean;
  disabled?: boolean;
  onButton?: (id: string) => void;
  onUndo?: () => void;
  onInspect?: () => void;
  onDeselect: () => void;
}): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minHeight: 52,
        padding: '6px 8px',
        background: '#FBEAE5',
        border: '1.5px solid #C8877B',
        borderRadius: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {selectedCellName === null ? (
          // Nothing selected: the prompt — or, when the BODY has rings on the board (a memory
          // response, an antivenom dose), what those rings are.
          <span style={{ fontSize: 14, color: noSelectionHint !== null ? '#1F6F8B' : '#7C6A61' }}>
            {noSelectionHint ?? t('commandBar.selectPrompt')}
          </span>
        ) : (
          <>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{selectedCellName}</span>
            {qualifier !== null ? (
              <span style={{ fontSize: 13, color: '#7C6A61' }}>{qualifier}</span>
            ) : null}
            <span style={{ fontSize: 13, color: '#7C6A61' }}>
              {t('commandBar.ap')} {ap}
            </span>
            {hint !== null ? <span style={{ fontSize: 13, color: '#2F6B4A' }}>{hint}</span> : null}
            {buttons.map((b) => (
              <button
                key={b.id}
                style={BTN}
                disabled={disabled || !onButton}
                onClick={() => onButton?.(b.id)}
              >
                {b.label}
              </button>
            ))}
            {noAction !== null ? (
              // Muted when the board still offers moves (the cell can act, just not attack);
              // red when nothing at all is offered.
              <span style={{ fontSize: 13, color: hint !== null ? '#7C6A61' : '#B03A2E' }}>
                {noAction}
              </span>
            ) : null}
          </>
        )}
        {undo.available ? (
          <button
            style={{ ...BTN, marginLeft: 'auto', borderColor: '#B03A2E' }}
            disabled={disabled}
            onClick={onUndo}
          >
            {t('commandBar.undo')} {undo.moves}
          </button>
        ) : null}
      </div>
      {/* The actions: the selected piece's rows, or the body's while nothing is selected. */}
      {onOffer ? (
        <ActionList rows={rows} hasMovement={hasMovement} disabled={disabled} onOffer={onOffer} />
      ) : null}
      {selectedCellName !== null ? (
        // The footer: what is about the SELECTION rather than an action — inspect what it
        // stands with, and let it go.
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canInspect ? (
            <button style={BTN} disabled={disabled} onClick={onInspect}>
              {t('commandBar.inspect')}
            </button>
          ) : null}
          {onCard ? (
            <button data-bar-card="1" style={BTN} disabled={disabled} onClick={onCard}>
              {t('commandBar.card')}
            </button>
          ) : null}
          <button style={BTN} disabled={disabled} onClick={onDeselect}>
            {t('commandBar.deselect')}
          </button>
        </div>
      ) : null}
      {notice !== null ? <div style={{ fontSize: 13, color: '#B03A2E' }}>{notice}</div> : null}
      {inCommand &&
      !undo.available &&
      undo.reason !== undefined &&
      undo.reason !== 'not-command' ? (
        // WHY undo is unavailable — S25 item 2's instrumentation, visible rather than behind a
        // flag because it doubles as a teaching line: only moves can be undone, and the first
        // committing action names itself.
        <div data-undo-reason={undo.reason} style={{ fontSize: 12, color: '#7C6A61' }}>
          {undo.reason === 'committed'
            ? t('undo.committed', { action: actionDisplayName(undo.committedBy ?? '') })
            : undo.reason === 'resumed'
              ? t('undo.resumed')
              : t('undo.noMoves')}
        </div>
      ) : null}
    </div>
  );
}
