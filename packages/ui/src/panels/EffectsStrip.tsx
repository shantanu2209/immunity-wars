/**
 * THE EFFECTS STRIP (S25 items 5 and 7) — at the top of the play surface, one chip per effect in
 * force, for as long as it is in force. Nothing here is decided; `effects.ts` derives the chips
 * from the view. Rendered only when there is something to say.
 */
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';
import type { EffectChip } from '../play/effects';
import { RichText } from './LogPanel';

const COLOUR: Record<EffectChip['kind'], { border: string; text: string; bg: string }> = {
  bad: { border: '#B03A2E', text: '#B03A2E', bg: '#FBEAE5' },
  good: { border: '#2F6B4A', text: '#2F6B4A', bg: '#EAF3EC' },
  info: { border: '#1F6F8B', text: '#1F6F8B', bg: '#E6F2F7' },
};

const CHIP: CSSProperties = {
  borderRadius: 8,
  padding: '4px 8px',
  fontSize: 13,
  lineHeight: 1.25,
  border: '1.5px solid',
};

export function EffectsStrip({ chips }: { chips: EffectChip[] }): ReactElement | null {
  if (chips.length === 0) return null;
  return (
    <div data-panel="effects" style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 12, color: '#78665D', fontWeight: 700, marginBottom: 2 }}>
        {t('effects.title')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {chips.map((c) => {
          const col = COLOUR[c.kind];
          return (
            <div
              key={c.id}
              data-effect={c.id}
              data-effect-kind={c.kind}
              style={{ ...CHIP, borderColor: col.border, color: col.text, background: col.bg }}
            >
              <span>{c.text}</span>
              {c.duration !== null ? (
                <span style={{ color: '#78665D' }}>
                  {' '}
                  {t('inspect.sep')} {c.duration}
                </span>
              ) : null}
              {c.detail ? (
                // An event's why is content prose carrying the engine's <b> emphasis.
                <span data-effect-detail="1" style={{ display: 'block', color: '#78665D' }}>
                  <RichText text={c.detail} />
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
