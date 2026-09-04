/**
 * The command bar — P2.5 piece 2's slice of the player UI: shows the selected cell, its AP
 * context, and the actions the view already answers for it (move via highlighted board
 * nodes; engulf targets when the Macrophage is selected). Dumb by design: the shell computes
 * eligibility from the session view and hands plain props in; nothing here reaches past the
 * `viewState`/session boundary. All text renders through the catalogue.
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
  disabled = false,
  onEngulf,
  onDeselect,
}: {
  /** Display name of the selected cell, or null when nothing is selected. */
  selectedCellName: string | null;
  ap: number;
  /** How many destinations are highlighted on the board for the selected cell. */
  moveTargetCount: number;
  engulfTargets?: EngulfTarget[];
  disabled?: boolean;
  onEngulf?: (invaderId: string) => void;
  onDeselect: () => void;
}): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        minHeight: 52,
        padding: '4px 8px',
        background: '#FBEAE5',
        border: '1.5px solid #C8877B',
        borderRadius: 10,
      }}
    >
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
          <button style={BTN} disabled={disabled} onClick={onDeselect}>
            {t('commandBar.deselect')}
          </button>
        </>
      )}
    </div>
  );
}
