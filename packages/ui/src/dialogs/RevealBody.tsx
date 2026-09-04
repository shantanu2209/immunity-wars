/**
 * The card reveal's body — the dialog queue's first client (docs/APP_FLOW.md ruling 5).
 *
 * One row per NEW arrival this draw, diffed by invader id in PlayScreen — not read from
 * `drawn`, which carries only the first card (`drawnList`, which carries them all, is one of
 * the 13 state-only keys the view deliberately drops). Disease and route names are content
 * data; the framing strings come from the catalogue. The remembered/novel flags render when
 * the view says so — they are attributes of the arrival, not separate modal decisions.
 */
import { ROUTES } from '@immunity-wars/content';

import type { ReactElement } from 'react';

import { t } from '../i18n';

export interface RevealArrival {
  disease: string;
  lane: string | null;
  remembered: boolean;
  novel: boolean;
}

function routeName(lane: string | null): string {
  if (!lane) return '';
  const r = (ROUTES as Record<string, { name?: unknown }>)[lane];
  return typeof r?.name === 'string' ? r.name : lane;
}

export function RevealBody({ arrivals }: { arrivals: readonly RevealArrival[] }): ReactElement {
  return (
    <div>
      {arrivals.map((a, i) => (
        <div
          key={[a.disease, String(i)].join('-')}
          style={{
            minHeight: 44,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderTop: i === 0 ? 'none' : '1px solid #EADFD5',
            padding: '6px 0',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: '#2E2A28' }}>{a.disease}</span>
          <span style={{ fontSize: 13, color: '#7C6A61' }}>
            {t('reveal.enteredVia')} {routeName(a.lane)}
          </span>
          {a.novel ? (
            <span style={{ fontSize: 13, color: '#B03A2E', fontWeight: 700 }}>
              {t('reveal.novel')}
            </span>
          ) : null}
          {a.remembered ? (
            <span style={{ fontSize: 13, color: '#1F6F8B', fontWeight: 700 }}>
              {t('reveal.remembered')}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
