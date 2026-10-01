/**
 * THE KIT'S CARD: what a press-and-hold on a piece opens (docs/LOOK_PLAN.md §3, rule 4). A picture
 * of the piece on the table's own dark ground, its name, what it is, how it measures, and how to
 * beat it. Every word is the caller's, from the content pack and the catalogue: this lays them
 * out and writes none.
 */
import type { ReactElement, ReactNode } from 'react';

import { KitPiece } from './Piece';
import { KitMeter, kitCardStyle } from './Surface';
import { COLOUR, RADIUS, TYPE } from './tokens';

export interface KitCardRow {
  label: string;
  text: string;
}

export function KitPieceCard({
  piece,
  pieceLabel,
  kicker,
  name,
  chips,
  meters,
  adviceLabel,
  advice,
  rows,
  art,
  close,
}: {
  /** The pipeline's name for the picture, card view. */
  piece: string;
  pieceLabel: string;
  /** The small line over the picture saying what kind of card this is. */
  kicker: string;
  name: string;
  chips: ReactNode;
  meters: Array<{ label: string; value: number }>;
  adviceLabel: string;
  advice: string;
  rows: KitCardRow[];
  art?: string;
  /** The control that closes the card, when it is shown as a sheet over the game. */
  close?: ReactNode;
}): ReactElement {
  return (
    <article style={{ ...kitCardStyle, overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          padding: '1.6em 0 0.4em',
          background: `radial-gradient(90% 100% at 50% 40%, ${COLOUR.tableLit} 0%, ${COLOUR.board} 55%, ${COLOUR.well} 100%)`,
          boxShadow: 'inset 0 -6px 12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '1.1em',
            top: '1em',
            ...TYPE.label,
            color: COLOUR.onDarkSoft,
            fontFamily: TYPE.family,
          }}
        >
          {kicker}
        </div>
        {close ? (
          <div style={{ position: 'absolute', right: '0.75em', top: '0.75em' }}>{close}</div>
        ) : null}
        <KitPiece
          name={piece}
          view="card"
          size={168}
          label={pieceLabel}
          {...(art !== undefined ? { art } : {})}
        />
      </div>
      <div style={{ padding: '0.9em 1.1em 1.1em' }}>
        <h2 style={{ ...TYPE.title, margin: 0 }}>{name}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: '0.6em' }}>{chips}</div>
        {/* Two across while two fit; one across once the words are large (measured at 200%). */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(6.5rem, 1fr))',
            gap: '0.6em 1.1em',
            marginTop: '1em',
          }}
        >
          {meters.map((m) => (
            <KitMeter key={m.label} label={m.label} value={m.value} />
          ))}
        </div>
        <div
          style={{
            marginTop: '1em',
            borderRadius: RADIUS.control,
            padding: '0.7em 0.9em 0.8em',
            background: COLOUR.mintSoft,
            boxShadow: `0 3px 0 ${COLOUR.mintEdge}`,
          }}
        >
          <div style={{ ...TYPE.label, color: COLOUR.mintInk, marginBottom: '0.25em' }}>
            {adviceLabel}
          </div>
          <p style={{ ...TYPE.body, fontWeight: 700, margin: 0, color: COLOUR.mintInk }}>
            {advice}
          </p>
        </div>
        <dl style={{ margin: '0.8em 0 0' }}>
          {rows.map((r) => (
            <div
              key={r.label}
              style={{
                display: 'flex',
                gap: '0.7em',
                padding: '0.4em 0',
                borderTop: `1.5px solid ${COLOUR.creamEdge}`,
              }}
            >
              <dt
                style={{
                  flex: '0 0 6em',
                  ...TYPE.label,
                  color: COLOUR.inkSoft,
                  paddingTop: '0.15em',
                }}
              >
                {r.label}
              </dt>
              <dd style={{ margin: 0, ...TYPE.body, fontSize: '0.875rem' }}>{r.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
