/**
 * The antibody panel — CP2's panel, the first one (COMMAND_SURFACE_PLAN §2).
 *
 * THE CLASSES AND ONE PRODUCE, ABOVE THE FOLD (ruled 25 September 2026, after the first game on the
 * live server; the wording approved by Kartik). At 360 x 641 the middle is 126px; the chips wrapped
 * onto two rows under a hint, and the Produce button, labelled with the class's full name, changed
 * width and place with it and sat below the fold for the longer names (measured: ICB's at 132 to
 * 176px, ENV's at 108 to 152px and 116px further right). Its label also read "Produce Intracellular
 * bacterium (ICB)", which says the body makes the bacterium. Now:
 *
 *   1. the classes, one row of equal chips, each its code and its store;
 *   2. one Produce, a fixed size, centred on its own line, for the class chosen;
 *   3. what the chosen class targets, on the line below, and then the breakdown, which is what the
 *      middle scrolls for.
 *
 * Rows 1 and 2 are 94px. At 200% text they wrap and the middle scrolls, but nothing is clipped.
 *
 * Dumb by design: it decides nothing about legality. Produce sends the offer `produceFor` prepared,
 * or says why there is none (it always answers); the family names are content data; the framing text
 * is the catalogue's; the effect labels come from the engine and render through the engine catalogue.
 *
 * DRAWN IN CLAY since stage L4 of the look (docs/LOOK_PLAN.md §14). Each class's chip carries a dot
 * of that class's own colour, the content pack's, which is the colour the pieces of that class wear
 * on the board: an antibody matches a class, and the dot is how the two are seen to belong together.
 */
import { FAMILIES } from '@immunity-wars/content';

import type { CSSProperties, ReactElement } from 'react';

import { engineText } from '../engineText';
import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { COLOUR } from '../kit/tokens';
import { SAY, TONE } from './onCard';

const CHIP: CSSProperties = {
  minHeight: 44,
  minWidth: 0,
  padding: '2px',
  fontSize: '0.8125rem',
  flexDirection: 'column',
  gap: 0,
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
  produce,
  disabled = false,
  onSelectFamily,
  onProduce,
  onSay,
}: {
  rows: FamilyRow[];
  selectedFamily: string | null;
  /** The selection-scoped breakdown for `selectedFamily`, already shaped by the shell. */
  detail: FamilyDetail | null;
  /** For the chosen class: the offer Produce sends, or why there is none (`produceFor`). */
  produce: { offer: { id: string } | null; reason: string | null };
  disabled?: boolean;
  onSelectFamily: (family: string | null) => void;
  onProduce: (offerId: string) => void;
  /** Says why Produce cannot produce, in the play screen's toast. */
  onSay: (text: string | null) => void;
}): ReactElement {
  const name = (f: string): string =>
    String((FAMILIES as Record<string, { name?: unknown }>)[f]?.name ?? f);
  const colour = (f: string): string | null => {
    const c = (FAMILIES as Record<string, { col?: unknown }>)[f]?.col;
    return typeof c === 'string' ? c : null;
  };
  const selectedRow = rows.find((r) => r.family === selectedFamily) ?? null;
  const ready = produce.offer !== null;
  return (
    // NO BOX AND NO TITLE since piece 5 (docs/for-P2.7.md §19): the tab that opened this view
    // already names it, and in a 126px middle at 360 x 641 the repetition cost the action its room.
    <div>
      <div
        role="group"
        aria-label={t('antibody.title')}
        style={{
          display: 'grid',
          // Equal chips in one row: seven fit at 44px each on a 360px screen (the unknown antigen's
          // class is the seventh). At 200% text they wrap rather than clip.
          gridTemplateColumns: 'repeat(auto-fit, minmax(2.75rem, 1fr))',
          gap: '10px 4px',
        }}
      >
        {rows.map((r) => {
          const selected = r.family === selectedFamily;
          const mark = r.blocked
            ? ''
            : r.boosted
              ? t('antibody.boosted')
              : r.reduced
                ? t('antibody.reduced')
                : '';
          return (
            <KitButton
              key={r.family}
              data-family={r.family}
              aria-pressed={selected}
              aria-label={`${name(r.family)}, ${String(r.have)}/${String(r.cap)}${r.blocked ? `, ${t('antibody.blocked')}` : ''}`}
              selected={selected}
              style={CHIP}
              disabled={disabled}
              onPress={() => onSelectFamily(selected ? null : r.family)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 800 }}>
                {colour(r.family) !== null ? (
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: colour(r.family) ?? undefined,
                      boxShadow: `0 0 0 1px ${COLOUR.ink}`,
                      flex: '0 0 auto',
                    }}
                  />
                ) : null}
                {r.family}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: r.blocked ? TONE.bad : undefined,
                  opacity: r.blocked ? 1 : 0.8,
                }}
              >
                {[String(r.have), String(r.cap)].join('/')}
                {mark}
              </span>
            </KitButton>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <KitButton
          kind="go"
          data-produce={ready ? 'ready' : 'waiting'}
          aria-disabled={!ready}
          disabled={disabled}
          // FIXED: the same size and place whichever class is chosen, and whether or not it can be
          // produced; flat, and a press says why, when it cannot.
          unavailable={!ready}
          explains
          onPress={() => {
            if (produce.offer) onProduce(produce.offer.id);
            else onSay(produce.reason);
          }}
          style={{ width: '9rem', minHeight: 44 }}
        >
          {t('antibody.produce')}
        </KitButton>
      </div>
      <div
        data-antibody-targets=""
        style={{ ...SAY.body, fontSize: '0.8125rem', marginTop: 10, textAlign: 'center' }}
      >
        {selectedRow
          ? t('antibody.targets', { name: name(selectedRow.family), code: selectedRow.family })
          : t('antibody.choose')}
      </div>
      {selectedFamily !== null && detail ? (
        <div style={{ ...SAY.body, fontSize: '0.8125rem', marginTop: 6 }}>
          <div style={SAY.quiet}>
            {[
              `${t('antibody.base')} ${String(detail.base)}`,
              `${t('antibody.net')} ${String(detail.net)} ${t('antibody.perAction')}`,
            ].join(' · ')}
          </div>
          {detail.blocked !== null ? (
            <div style={{ color: TONE.bad }}>{engineText(detail.blocked)}</div>
          ) : null}
          {detail.effects.map((e, i) => (
            <div key={`fx-${String(i)}`} style={{ color: e.delta >= 0 ? TONE.good : TONE.bad }}>
              {e.delta >= 0 ? `+${String(e.delta)}` : String(e.delta)} {engineText(e.label)}
            </div>
          ))}
          {detail.capReasons.map((c, i) => (
            <div key={`cap-${String(i)}`} style={SAY.quiet}>
              {[t('antibody.storage'), engineText(c)].join(': ')}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
