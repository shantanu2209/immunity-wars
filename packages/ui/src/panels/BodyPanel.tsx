/**
 * THE BODY PANEL — CP4's panel (COMMAND_SURFACE_PLAN §2): the home of the five actions that
 * have no cell. Always visible under the antibody panel; its buttons are the offers
 * `bodyOffers` prepared, routed here by `place: 'panel'`.
 *
 * Four things, each with its own why-not in place — the body's "always answers":
 *   - ANTIVENOM: doses in stock, and the order in progress toward the next vial. Antivenom is
 *     antibodies raised in horses, brought to you — the body cannot make it, and a shortage is
 *     a real and deadly problem in rural India (the engine's own log says so when it lands).
 *   - THE MEMORY RESPONSE: once a remembered pathogen is in the body, its ring is on the board
 *     while nothing is selected; the panel says it is ready so the ring is explained.
 *   - CLONAL SELECTION: appears once an unknown antigen has been met; progress toward the one
 *     clone that fits it. This search is why a first response to a new germ takes days.
 *   - THE VACCINE LAB: every disease the body has seen and does not yet remember, with its
 *     progress; invest at your own pace. On Training there is no lab — immunity comes from
 *     surviving — and the panel says so instead of hiding the section.
 *
 * Dumb by design: it decides nothing about legality; every string is the catalogue's; disease
 * and family names are content data.
 */
import { ANTIVENOM_ORDER, FAMILY, VACCINE_COST } from '@immunity-wars/content';
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';

const BTN: CSSProperties = {
  minHeight: 44,
  padding: '0 12px',
  fontSize: 14,
  borderRadius: 8,
  border: '1.5px solid #B03A2E',
  background: '#FFFDF9',
  cursor: 'pointer',
};
const LABEL: CSSProperties = { fontSize: 12, color: '#7C6A61', fontWeight: 700 };
const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: 44,
  flexWrap: 'wrap',
};

export interface PanelButton {
  id: string;
  label: string;
}

export interface VaccineRow {
  disease: string;
  /** Display name — the novel antigen masked. */
  name: string;
  family: string;
  put: number;
  buttons: PanelButton[];
}

export interface BodyPanelData {
  antivenom: number;
  avOrder: number;
  orderButtons: PanelButton[];
  /** A remembered pathogen is in the body and reachable: its ring is on the board. */
  memoryReady: number;
  hard: boolean;
  training: boolean;
  novelSeen: boolean;
  cloneFound: boolean;
  clone: number;
  cloneButton: PanelButton | null;
  vaccines: VaccineRow[];
  immune: string[];
}

function Progress({ put, cost }: { put: number; cost: number }): ReactElement {
  const pct = Math.max(0, Math.min(100, Math.round((100 * put) / cost)));
  return (
    <span
      style={{
        display: 'inline-block',
        width: 70,
        height: 8,
        borderRadius: 4,
        background: '#EADFD5',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          display: 'block',
          width: `${String(pct)}%`,
          height: '100%',
          background: '#B03A2E',
        }}
      />
    </span>
  );
}

export function BodyPanel({
  data,
  disabled = false,
  onOffer,
}: {
  data: BodyPanelData;
  disabled?: boolean;
  onOffer?: (offerId: string) => void;
}): ReactElement {
  const button = (b: PanelButton): ReactElement => (
    <button key={b.id} style={BTN} disabled={disabled || !onOffer} onClick={() => onOffer?.(b.id)}>
      {b.label}
    </button>
  );
  const familyName = (dz: string): string =>
    String((FAMILY as Record<string, string | undefined>)[dz] ?? '');
  return (
    <div
      data-panel="body"
      style={{
        marginTop: 6,
        padding: '6px 8px',
        border: '1.5px solid #C8877B',
        borderRadius: 10,
        background: '#FFFDF9',
        fontSize: 14,
      }}
    >
      <div style={{ ...LABEL, marginBottom: 2 }}>{t('body.title')}</div>

      {data.memoryReady > 0 ? (
        <div style={{ color: '#1F6F8B', fontWeight: 700, padding: '4px 0' }}>
          {t(data.hard ? 'body.memoryReadyHard' : 'body.memoryReady', { n: data.memoryReady })}
        </div>
      ) : null}

      <div style={ROW}>
        <span style={{ flex: '1 1 160px' }}>
          <span style={LABEL}>{t('body.antivenom')}</span>{' '}
          {t(data.antivenom === 1 ? 'body.doseOne' : 'body.doses', { n: data.antivenom })}
          <span style={{ display: 'block', fontSize: 13, color: '#7C6A61' }}>
            {t('body.order', { n: ANTIVENOM_ORDER })}{' '}
            <Progress put={data.avOrder} cost={ANTIVENOM_ORDER} />{' '}
            {[data.avOrder, ANTIVENOM_ORDER].join('/')}
          </span>
        </span>
        {data.orderButtons.map(button)}
      </div>

      {data.novelSeen ? (
        <div style={ROW}>
          <span style={{ flex: '1 1 160px' }}>
            <span style={LABEL}>{t('body.clone')}</span>
            <span style={{ display: 'block', fontSize: 13, color: '#7C6A61' }}>
              {data.cloneFound ? t('body.cloneFound') : t('body.cloneHint')}
            </span>
          </span>
          {data.cloneButton ? button(data.cloneButton) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 4 }}>
        <span style={LABEL}>{t('body.vaccines')}</span>
        {data.training ? (
          <div style={{ fontSize: 13, color: '#7C6A61' }}>{t('body.trainingNoVaccine')}</div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#7C6A61' }}>
              {t('body.vaccineHint', { cost: VACCINE_COST })}
            </div>
            {data.vaccines.length === 0 ? (
              <div style={{ fontSize: 13, color: '#7C6A61' }}>{t('body.vaccineNone')}</div>
            ) : (
              data.vaccines.map((v) => (
                <div key={v.disease} style={ROW} data-vaccine={v.disease}>
                  <span style={{ flex: '1 1 160px' }}>
                    {v.name}{' '}
                    <span style={{ fontSize: 12, color: '#7C6A61' }}>
                      {familyName(v.disease) || v.family}
                    </span>
                    <span style={{ display: 'block', fontSize: 13, color: '#7C6A61' }}>
                      <Progress put={v.put} cost={VACCINE_COST} /> {[v.put, VACCINE_COST].join('/')}
                    </span>
                  </span>
                  {v.buttons.map(button)}
                </div>
              ))
            )}
          </>
        )}
        {data.immune.length > 0 ? (
          <div style={{ fontSize: 13, color: '#1F6F8B', marginTop: 4 }}>
            <span style={LABEL}>{t('body.immune')}</span> {data.immune.join(', ')}
          </div>
        ) : null}
      </div>
    </div>
  );
}
