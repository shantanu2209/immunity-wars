/**
 * The spread narration banner — shown while a burst plays (docs/APP_FLOW.md, Play screen:
 * "Spread narration overlay during bursts").
 *
 * The frame LABEL is an engine string ("Bacteria divide"), so it is rendered through the
 * catalogue via a `spread.label.*` key — a label the catalogue does not know renders loudly
 * as ⟪spread.label.…⟫, which is how a new engine label announces itself instead of shipping
 * untranslated. Dice labels are disease names: content data, not catalogue strings.
 *
 * Visual design is Gate 2's business; this is structure and information only.
 */
import type { ReactElement } from 'react';

import { engineText } from '../engineText';
import { t } from '../i18n';

export interface DieResult {
  label: string;
  face: number;
  hit: boolean;
  full?: boolean;
}

/** Read the engine's loosely-typed dice payload defensively. */
export function diceOf(raw: unknown): DieResult[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((d) => ({
    label: String(d['label'] ?? ''),
    face: typeof d['face'] === 'number' ? d['face'] : 0,
    hit: d['hit'] === true,
    full: d['full'] === true,
  }));
}

export function SpreadNarration({
  label,
  n,
  of,
  dice,
}: {
  label: string;
  n: number;
  of: number;
  dice: readonly DieResult[];
}): ReactElement {
  return (
    <div
      style={{
        border: '2px solid #C8877B',
        background: '#FBEAE5',
        borderRadius: 10,
        padding: '8px 12px',
        margin: '4px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#2E2A28' }}>
          {/* An engine string: the frame headline is a query-prose site in the engine
              catalogue since FINDINGS #53 — one catalogue, loud on a miss. */}
          {engineText(label)}
        </span>
        <span style={{ fontSize: 13, color: '#7C6A61' }}>{[String(n), String(of)].join('/')}</span>
        <span style={{ fontSize: 13, color: '#7C6A61', marginLeft: 'auto' }}>
          {t('spread.tapToContinue')}
        </span>
      </div>
      {dice.length > 0 ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {dice.map((d, i) => (
            <span
              key={[d.label, String(i)].join('-')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 13,
                color: d.hit ? '#B03A2E' : '#7C6A61',
                fontWeight: d.hit ? 700 : 400,
                border: `1.5px solid ${d.hit ? '#B03A2E' : '#C8877B'}`,
                borderRadius: 6,
                padding: '1px 6px',
                background: '#FFFDF9',
              }}
            >
              {d.label}
              <span
                style={{
                  minWidth: 16,
                  textAlign: 'center',
                  border: '1px solid currentcolor',
                  borderRadius: 4,
                  padding: '0 2px',
                }}
              >
                {d.full ? t('spread.full') : String(d.face)}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
