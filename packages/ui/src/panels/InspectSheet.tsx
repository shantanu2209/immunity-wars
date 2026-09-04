/**
 * The inspect sheet — the PRECISE half of the touch pattern set at P2.5 piece 1: the board
 * is coarse pointing, and every consequential control here is a ≥44px row, which is how a
 * 20px token satisfies Gate 1's target rule. Moved into `ui` at piece 2 as the first player
 * component: all text renders through the catalogue (t()), under the negative-controlled
 * hardcoded-string check.
 *
 * CP1: when the shell has offers on the invaders shown here (an Eosinophil that can strike
 * OR degranulate the same worm), each invader row carries its offers as buttons — the sheet
 * is where a choice between attacks is made, because a 20px pathogen token cannot present two.
 */
import type { CSSProperties, ReactElement } from 'react';

import type { InspectInfo } from '../board/Board';
import { t } from '../i18n';
import {
  cellDisplayName as cellName,
  organDisplayName,
  residentDisplayName,
  typeDisplayName as typeName,
} from '../names';

const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minHeight: 44,
};

const BTN: CSSProperties = {
  minHeight: 44,
  padding: '0 12px',
  fontSize: 14,
  borderRadius: 8,
  border: '1.5px solid #B03A2E',
  background: '#FFFDF9',
  cursor: 'pointer',
};

export interface InvaderOffer {
  id: string;
  label: string;
}

export function InspectSheet({
  info,
  selectedCell,
  disabled = false,
  offers = {},
  onOffer,
  onSelectCell,
  onSelectResident,
  selectedResident = null,
  onClose,
}: {
  info: InspectInfo;
  selectedCell?: string | null;
  disabled?: boolean;
  /** Offers by invader id — prepared by the shell from `offered.ts`. */
  offers?: Record<string, InvaderOffer[]>;
  onOffer?: (offerId: string) => void;
  onSelectCell?: (cell: string) => void;
  /** CP3: the resident row selects the organ's resident, exactly like a cell row. */
  onSelectResident?: (organ: string) => void;
  selectedResident?: string | null;
  onClose: () => void;
}): ReactElement {
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 12,
        transform: 'translateX(-50%)',
        width: 'min(92vw, 420px)',
        maxHeight: '46vh',
        overflowY: 'auto',
        background: '#FFFDF9',
        border: '2px solid #8E6E53',
        borderRadius: 12,
        boxShadow: '0 6px 24px rgba(46,42,40,0.25)',
        padding: 8,
        zIndex: 10,
      }}
    >
      {info.invaders.map((iv, i) => (
        <div key={`iv-${String(i)}`} style={{ ...ROW, flexWrap: 'wrap' }}>
          <img
            src={`/art/path-${iv.novel ? 'virus' : iv.type}@3x.webp`}
            width={36}
            height={36}
            alt=""
            style={iv.novel ? { filter: 'brightness(0.2)' } : undefined}
          />
          <span style={{ fontSize: 14, flex: '1 1 auto' }}>
            {iv.novel ? t('inspect.unknown') : iv.disease}
            <span style={{ color: '#7C6A61' }}>
              {' '}
              {iv.novel ? null : typeName(iv.type)} {t('inspect.hp')} {[iv.hp, iv.maxhp].join('/')}
            </span>
          </span>
          {(offers[iv.id] ?? []).map((o) => (
            <button
              key={o.id}
              style={BTN}
              disabled={disabled || !onOffer}
              onClick={() => onOffer?.(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      ))}
      {info.cells.map((ck) => (
        <button
          key={`cell-${ck}`}
          onClick={() => onSelectCell?.(ck)}
          disabled={disabled || !onSelectCell}
          style={{
            ...ROW,
            width: '100%',
            background: selectedCell === ck ? '#FBEAE5' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            textAlign: 'left',
          }}
        >
          <img src={`/art/cell-${ck}@3x.webp`} width={36} height={36} alt="" />
          {cellName(ck)}
        </button>
      ))}
      {info.resident !== null ? (
        // The resident's REAL name, then "resident of the Liver" — the sheet is where a
        // resident and the Monocyte on one node are told apart, as two ≥44px rows.
        <button
          onClick={() => {
            if (info.resident !== null) onSelectResident?.(info.resident);
          }}
          disabled={disabled || !onSelectResident}
          style={{
            ...ROW,
            width: '100%',
            background: selectedResident === info.resident ? '#FBEAE5' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            textAlign: 'left',
          }}
        >
          <img src="/art/cell-macrophage@3x.webp" width={36} height={36} alt="" />
          <span>
            {residentDisplayName(info.resident)}
            <span style={{ color: '#7C6A61' }}>
              {' '}
              {t('resident.of', { organ: organDisplayName(info.resident) })}
            </span>
          </span>
        </button>
      ) : null}
      <button
        onClick={onClose}
        style={{ minHeight: 44, width: '100%', fontSize: 14, marginTop: 4 }}
      >
        {t('inspect.close')}
      </button>
    </div>
  );
}
