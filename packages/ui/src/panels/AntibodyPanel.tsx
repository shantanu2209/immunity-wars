/**
 * The antibody panel — CP2's panel, the first one (COMMAND_SURFACE_PLAN §2).
 *
 * Always visible on the play surface: one chip per antibody family showing store / cap and
 * the net production rate, with the boosted / reduced / blocked state the session summary
 * already carries. Tapping a chip selects the family (a session selection, so the view's
 * selection-scoped `productionBreakdown` answers with the full detail — the base rate, every
 * effect on it, and why the store is capped). When the B-cell is selected and the family may
 * be produced, the row carries the Produce button — the offer prepared by `offered.ts`.
 *
 * Dumb by design: it decides nothing about legality; the family names are content data; the
 * framing text is the catalogue's; the effect labels come from the engine and render through
 * the engine catalogue (loud on a miss, which is a finding).
 */
import { FAMILIES } from '@immunity-wars/content';

import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';
import { productionText } from '../productionText';

const CHIP: CSSProperties = {
  minHeight: 44,
  padding: '4px 10px',
  fontSize: 13,
  borderRadius: 8,
  border: '1.5px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  lineHeight: 1.2,
};

export interface FamilyRow {
  family: string;
  have: number;
  cap: number;
  net: number;
  boosted: boolean;
  reduced: boolean;
  blocked: boolean;
}

export interface FamilyDetail {
  base: number;
  net: number;
  blocked: string | null;
  effects: { label: string; delta: number }[];
  capReasons: string[];
}

export function AntibodyPanel({
  rows,
  selectedFamily,
  detail,
  produce = {},
  disabled = false,
  onSelectFamily,
  onProduce,
}: {
  rows: FamilyRow[];
  selectedFamily: string | null;
  /** The selection-scoped breakdown for `selectedFamily`, already shaped by the shell. */
  detail: FamilyDetail | null;
  /** Produce offers by family — present only when the B-cell may produce that family. */
  produce?: Record<string, { id: string; label: string }>;
  disabled?: boolean;
  onSelectFamily: (family: string | null) => void;
  onProduce?: (offerId: string) => void;
}): ReactElement {
  const name = (f: string): string =>
    String((FAMILIES as Record<string, { name?: unknown }>)[f]?.name ?? f);
  return (
    <div
      style={{
        marginTop: 6,
        padding: '6px 8px',
        border: '1.5px solid #C8877B',
        borderRadius: 10,
        background: '#FFFDF9',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#2E2A28' }}>
          {t('antibody.title')}
        </span>
        <span style={{ fontSize: 12, color: '#7C6A61' }}>{t('antibody.selectHint')}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        {rows.map((r) => {
          const selected = r.family === selectedFamily;
          return (
            <button
              key={r.family}
              style={{
                ...CHIP,
                borderColor: selected ? '#B03A2E' : r.blocked ? '#C8877B' : '#8E6E53',
                background: selected ? '#FBEAE5' : '#FFFDF9',
                opacity: r.blocked ? 0.7 : 1,
              }}
              disabled={disabled}
              onClick={() => onSelectFamily(selected ? null : r.family)}
            >
              <span style={{ fontWeight: 700 }}>
                {r.family} {[String(r.have), String(r.cap)].join('/')}
              </span>
              <span style={{ color: r.blocked ? '#B03A2E' : '#7C6A61' }}>
                {r.blocked
                  ? t('antibody.blocked')
                  : `+${String(r.net)} ${r.boosted ? t('antibody.boosted') : r.reduced ? t('antibody.reduced') : ''}`}
              </span>
            </button>
          );
        })}
      </div>
      {selectedFamily !== null ? (
        <div style={{ marginTop: 8, fontSize: 13, color: '#2E2A28' }}>
          <div style={{ fontWeight: 700 }}>{name(selectedFamily)}</div>
          {detail ? (
            <>
              <div style={{ color: '#7C6A61' }}>
                {[
                  `${t('antibody.base')} ${String(detail.base)}`,
                  `${t('antibody.net')} ${String(detail.net)} ${t('antibody.perAction')}`,
                ].join(' · ')}
              </div>
              {detail.blocked !== null ? (
                <div style={{ color: '#B03A2E' }}>{productionText(detail.blocked)}</div>
              ) : null}
              {detail.effects.map((e, i) => (
                <div
                  key={`fx-${String(i)}`}
                  style={{ color: e.delta >= 0 ? '#2F6B4A' : '#B03A2E' }}
                >
                  {e.delta >= 0 ? `+${String(e.delta)}` : String(e.delta)} {productionText(e.label)}
                </div>
              ))}
              {detail.capReasons.map((c, i) => (
                <div key={`cap-${String(i)}`} style={{ color: '#7C6A61' }}>
                  {[t('antibody.storage'), productionText(c)].join(': ')}
                </div>
              ))}
            </>
          ) : null}
          {produce[selectedFamily] ? (
            <button
              style={{
                minHeight: 44,
                marginTop: 6,
                padding: '0 14px',
                fontSize: 14,
                borderRadius: 8,
                border: '1.5px solid #B03A2E',
                background: '#FFFDF9',
                cursor: 'pointer',
              }}
              disabled={disabled || !onProduce}
              onClick={() => onProduce?.(produce[selectedFamily]?.id ?? '')}
            >
              {produce[selectedFamily]?.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
