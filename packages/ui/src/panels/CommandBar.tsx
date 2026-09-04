/**
 * The command bar — SELECTION AS A MODE THAT ALWAYS ANSWERS (ruling of 4 September 2026).
 *
 * When a cell is selected this bar always says something actionable: the legal targets the
 * view already computed (moves as highlighted board nodes, engulf as buttons), or — when
 * there are none — WHY, as one localised line. Never silence. It also carries the two things
 * that are not about the selection: undo (moves only, from the session's rule) and the last
 * rejection, both localised by the shell. Dumb by design: the shell computes everything from
 * the session view and hands plain props in; nothing here reaches past the session boundary.
 * All text renders through the catalogue.
 */
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';

const BTN: CSSProperties = {
  minHeight: 44,
  padding: '0 14px',
  fontSize: 14,
  borderRadius: 8,
  border: '1.5px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
};

export interface EngulfTarget {
  id: string;
  label: string;
}

export function CommandBar({
  selectedCellName,
  ap,
  moveTargetCount,
  engulfTargets = [],
  noAction = null,
  undo = { available: false, moves: 0 },
  notice = null,
  canInspect = false,
  disabled = false,
  onEngulf,
  onUndo,
  onInspect,
  onDeselect,
}: {
  /** Display name of the selected cell, or null when nothing is selected. */
  selectedCellName: string | null;
  ap: number;
  /** How many destinations are highlighted on the board for the selected cell. */
  moveTargetCount: number;
  engulfTargets?: EngulfTarget[];
  /** When the selected cell has no legal action: the reason, already localised. */
  noAction?: string | null;
  /** The session's undo availability — moves only. */
  undo?: { available: boolean; moves: number };
  /** The last rejection or notice, already localised; null when there is none. */
  notice?: string | null;
  /** True when the selected cell stands with something worth inspecting. */
  canInspect?: boolean;
  disabled?: boolean;
  onEngulf?: (invaderId: string) => void;
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
          <span style={{ fontSize: 14, color: '#7C6A61' }}>{t('commandBar.selectPrompt')}</span>
        ) : (
          <>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{selectedCellName}</span>
            <span style={{ fontSize: 13, color: '#7C6A61' }}>
              {t('commandBar.ap')} {ap}
            </span>
            {moveTargetCount > 0 ? (
              <span style={{ fontSize: 13, color: '#2F6B4A' }}>{t('commandBar.moveHint')}</span>
            ) : null}
            {engulfTargets.map((e) => (
              <button
                key={e.id}
                style={BTN}
                disabled={disabled || !onEngulf}
                onClick={() => onEngulf?.(e.id)}
              >
                {t('commandBar.engulf')} {e.label}
              </button>
            ))}
            {noAction !== null && moveTargetCount === 0 && engulfTargets.length === 0 ? (
              <span style={{ fontSize: 13, color: '#B03A2E' }}>{noAction}</span>
            ) : null}
            {canInspect ? (
              <button style={BTN} disabled={disabled} onClick={onInspect}>
                {t('commandBar.inspect')}
              </button>
            ) : null}
            <button style={BTN} disabled={disabled} onClick={onDeselect}>
              {t('commandBar.deselect')}
            </button>
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
      {notice !== null ? <div style={{ fontSize: 13, color: '#B03A2E' }}>{notice}</div> : null}
    </div>
  );
}
