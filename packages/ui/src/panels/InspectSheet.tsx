/**
 * The inspect sheet — the PRECISE half of the touch pattern set at P2.5 piece 1: the board
 * is coarse pointing, and every consequential control here is a ≥44px row, which is how a
 * 20px token satisfies Gate 1's target rule. Moved into `ui` at piece 2 as the first player
 * component: all text renders through the catalogue (t()), under the negative-controlled
 * hardcoded-string check.
 */
import { CNAME, UI_ } from '@immunity-wars/content';
import type { CSSProperties, ReactElement } from 'react';

import type { InspectInfo } from '../board/Board';
import { t } from '../i18n';

const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minHeight: 44,
};

// Display names from the rules tables — the same one-source rule as the board's labels.
const cellName = (ck: string): string => String((CNAME as Record<string, string>)[ck] ?? ck);
const typeName = (ty: string): string =>
  String((UI_ as Record<string, { n?: string }>)[ty]?.n ?? ty);

export function InspectSheet({
  info,
  selectedCell,
  disabled = false,
  onSelectCell,
  onClose,
}: {
  info: InspectInfo;
  selectedCell?: string | null;
  disabled?: boolean;
  onSelectCell?: (cell: string) => void;
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
        <div key={`iv-${String(i)}`} style={ROW}>
          <img
            src={`/art/path-${iv.novel ? 'virus' : iv.type}@3x.webp`}
            width={36}
            height={36}
            alt=""
            style={iv.novel ? { filter: 'brightness(0.2)' } : undefined}
          />
          <span style={{ fontSize: 14 }}>
            {iv.novel ? t('inspect.unknown') : iv.disease}
            <span style={{ color: '#7C6A61' }}>
              {' '}
              {iv.novel ? null : typeName(iv.type)} {t('inspect.hp')} {[iv.hp, iv.maxhp].join('/')}
            </span>
          </span>
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
        <div style={ROW}>
          <img src="/art/cell-macrophage@3x.webp" width={36} height={36} alt="" />
          <span style={{ fontSize: 14 }}>
            {t('inspect.resident')}
            <span style={{ color: '#7C6A61' }}> {info.resident}</span>
          </span>
        </div>
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
