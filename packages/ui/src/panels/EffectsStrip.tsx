/**
 * THE EFFECTS STRIP (S25 items 5 and 7) — at the top of the play surface, one chip per effect in
 * force, for as long as it is in force. Nothing here is decided; `effects.ts` derives the chips
 * from the view. Rendered only when there is something to say.
 */
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';
import { COLOUR, RADIUS } from '../kit/tokens';
import type { EffectChip } from '../play/effects';
import { RichText } from './LogPanel';
import { SAY, TONE } from './onCard';

/**
 * What kind of news each is: said by the bar at its left edge and by the colour of its words. Bad
 * news in the warning's coral, good in the mint that means healthy, anything else in plain ink.
 */
const KIND: Record<EffectChip['kind'], { edge: string; text: string; bg: string }> = {
  bad: { edge: COLOUR.coral, text: TONE.bad, bg: COLOUR.creamSunk },
  good: { edge: COLOUR.mintEdge, text: TONE.good, bg: COLOUR.mintSoft },
  info: { edge: COLOUR.creamSunkEdge, text: COLOUR.ink, bg: COLOUR.creamSunk },
};

const CHIP: CSSProperties = {
  borderRadius: RADIUS.control / 2,
  padding: '5px 9px',
  fontSize: '0.8125rem',
  fontWeight: 700,
  lineHeight: 1.3,
};

export function EffectsStrip({ chips }: { chips: EffectChip[] }): ReactElement | null {
  if (chips.length === 0) return null;
  return (
    <div data-panel="effects">
      <div style={{ ...SAY.label, marginBottom: 4 }}>{t('effects.title')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {chips.map((c) => {
          const col = KIND[c.kind];
          return (
            <div
              key={c.id}
              data-effect={c.id}
              data-effect-kind={c.kind}
              style={{
                ...CHIP,
                borderLeft: `5px solid ${col.edge}`,
                color: col.text,
                background: col.bg,
              }}
            >
              <span>{c.text}</span>
              {c.duration !== null ? (
                <span style={{ color: COLOUR.inkSoft, fontWeight: 600 }}>
                  {' '}
                  {t('inspect.sep')} {c.duration}
                </span>
              ) : null}
              {c.detail ? (
                // An event's why is content prose carrying the engine's <b> emphasis.
                <span
                  data-effect-detail="1"
                  style={{ display: 'block', color: COLOUR.inkSoft, fontWeight: 600 }}
                >
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
