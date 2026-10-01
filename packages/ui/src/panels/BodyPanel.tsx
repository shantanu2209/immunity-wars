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
import { KitButton } from '../kit/Button';
import { COLOUR } from '../kit/tokens';
import { ROW, SAY, SMALL } from './onCard';

const LABEL: CSSProperties = SAY.label;

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
        background: COLOUR.creamSunk,
        boxShadow: `inset 0 0 0 1px ${COLOUR.creamSunkEdge}`,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          display: 'block',
          width: `${String(pct)}%`,
          height: '100%',
          background: COLOUR.coralEdge,
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
    <KitButton
      key={b.id}
      kind="go"
      style={SMALL}
      disabled={disabled || !onOffer}
      onPress={() => onOffer?.(b.id)}
    >
      {b.label}
    </KitButton>
  );
  const familyName = (dz: string): string =>
    String((FAMILY as Record<string, string | undefined>)[dz] ?? '');
  return (
    <div
      data-panel="body"
      // NO BOX AND NO TITLE since piece 5 (§19): The body tab that opened this view names it.
      style={SAY.body}
    >
      <div style={ROW}>
        <span style={{ flex: '1 1 160px' }}>
          <span style={LABEL}>{t('body.antivenom')}</span>{' '}
          {t(data.antivenom === 1 ? 'body.doseOne' : 'body.doses', { n: data.antivenom })}
          <span style={{ ...SAY.quiet, display: 'block' }}>
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
            <span style={{ ...SAY.quiet, display: 'block' }}>
              {data.cloneFound ? t('body.cloneFound') : t('body.cloneHint')}
            </span>
          </span>
          {data.cloneButton ? button(data.cloneButton) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 4 }}>
        <span style={LABEL}>{t('body.vaccines')}</span>
        {data.training ? (
          <div style={SAY.quiet}>{t('body.trainingNoVaccine')}</div>
        ) : (
          <>
            <div style={SAY.quiet}>{t('body.vaccineHint', { cost: VACCINE_COST })}</div>
            {data.vaccines.length === 0 ? (
              <div style={SAY.quiet}>{t('body.vaccineNone')}</div>
            ) : (
              data.vaccines.map((v) => (
                <div key={v.disease} style={ROW} data-vaccine={v.disease}>
                  <span style={{ flex: '1 1 160px' }}>
                    {v.name}{' '}
                    <span style={{ ...SAY.quiet, fontSize: '0.75rem' }}>
                      {familyName(v.disease) || v.family}
                    </span>
                    <span style={{ ...SAY.quiet, display: 'block' }}>
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
          <div style={{ ...SAY.body, fontSize: '0.8125rem', marginTop: 4 }}>
            <span style={LABEL}>{t('body.immune')}</span> {data.immune.join(', ')}
          </div>
        ) : null}
      </div>
    </div>
  );
}
