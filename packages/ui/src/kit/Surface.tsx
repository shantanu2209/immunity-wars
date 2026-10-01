/**
 * THE KIT'S SURFACES: what words and controls sit on.
 *
 *   KitCard    a slab of cream clay standing on the table: the piece in hand, a pathogen's card
 *   KitSheet   the same slab rising from the bottom edge, with a grip to drag it by
 *   KitPill    a well pressed into the table: the turn, the Action Points
 *   KitChip    a small label on a card: an antigen class, a tier, a state
 *   KitPips    Action Points: gold while they are there, an empty well when spent
 *   KitMeter   one to five, for a pathogen's four measures
 *   KitRow     controls side by side, which take a line each when they no longer fit
 *
 * No words are written here. Every label is the caller's, from the catalogue.
 */
import { Children } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { COLOUR, RADIUS, SHADOW, TYPE } from './tokens';

export const kitCardStyle: CSSProperties = {
  background: `linear-gradient(180deg, ${COLOUR.creamLit}, ${COLOUR.cream})`,
  borderRadius: RADIUS.card,
  boxShadow: `0 6px 0 ${COLOUR.creamEdge}, ${SHADOW.cast}, inset 0 2px 0 rgba(255, 255, 255, 0.8)`,
  color: COLOUR.ink,
  fontFamily: TYPE.family,
};

export function KitCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}): ReactElement {
  return (
    <div style={{ ...kitCardStyle, padding: '0.75em 0.875em 0.875em', ...style }}>{children}</div>
  );
}

export function KitSheet({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        ...kitCardStyle,
        borderRadius: `${RADIUS.sheet}px ${RADIUS.sheet}px 0 0`,
        boxShadow: `0 -10px 26px rgba(0, 0, 0, 0.36), inset 0 2px 0 rgba(255, 255, 255, 0.8)`,
        padding: '0.5em 1em 1em',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 40,
          height: 5,
          borderRadius: 3,
          background: COLOUR.creamEdge,
          margin: '0 auto 0.6em',
        }}
      />
      {children}
    </div>
  );
}

export function KitPill({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45em',
        minHeight: 40,
        padding: '0.3em 0.8em',
        borderRadius: RADIUS.pill,
        background: 'rgba(0, 0, 0, 0.28)',
        boxShadow: SHADOW.sunk,
        color: COLOUR.onDark,
        fontFamily: TYPE.family,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Controls side by side. Each takes an equal share while they fit, and a line of its own when
 * they do not: with the phone's text at 200% three buttons no longer fit across 360 px (measured
 * on the kit page, 1 October 2026), and a row that cannot wrap pushes the page wider than the
 * screen. `basis` is the narrowest a control may get before the row wraps.
 */
export function KitRow({
  children,
  basis = '5em',
}: {
  children: ReactNode;
  basis?: string;
}): ReactElement {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {Children.map(children, (child) => (
        <div style={{ flex: `1 1 ${basis}`, minWidth: 0 }}>{child}</div>
      ))}
    </div>
  );
}

/** `dot` is the colour of an antigen class, from the content pack; it sits beside the word, never in place of it. */
export function KitChip({
  children,
  dot,
  tone = 'plain',
}: {
  children: ReactNode;
  dot?: string;
  tone?: 'plain' | 'now';
}): ReactElement {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4em',
        padding: '0.25em 0.7em',
        borderRadius: RADIUS.pill,
        background: tone === 'now' ? COLOUR.gold : COLOUR.creamSunk,
        boxShadow: `0 2px 0 ${tone === 'now' ? COLOUR.goldEdge : COLOUR.creamSunkEdge}`,
        color: COLOUR.ink,
        fontFamily: TYPE.family,
        fontSize: '0.75rem',
        fontWeight: 800,
        lineHeight: 1.2,
      }}
    >
      {dot ? (
        <span
          aria-hidden="true"
          style={{
            width: '0.7em',
            height: '0.7em',
            borderRadius: '50%',
            background: dot,
            boxShadow: `0 0 0 1.5px ${COLOUR.ink}`,
          }}
        />
      ) : null}
      {children}
    </span>
  );
}

/** `label` says the count in words for a reader that cannot see the pips. */
export function KitPips({
  have,
  of,
  label,
}: {
  have: number;
  of: number;
  label: string;
}): ReactElement {
  return (
    <span role="img" aria-label={label} style={{ display: 'inline-flex', gap: '0.25em' }}>
      {Array.from({ length: of }, (_, i) => (
        <span
          key={i}
          style={{
            width: '0.95em',
            height: '0.95em',
            borderRadius: '50%',
            ...(i < have
              ? {
                  background: `radial-gradient(circle at 35% 30%, #FFF1BD, ${COLOUR.gold} 60%, #B98312)`,
                  boxShadow: `0 2px 0 ${COLOUR.goldEdge}`,
                }
              : {
                  background: 'rgba(0, 0, 0, 0.35)',
                  boxShadow: 'inset 0 2px 3px rgba(0, 0, 0, 0.6)',
                }),
          }}
        />
      ))}
    </span>
  );
}

export function KitMeter({
  label,
  value,
  of = 5,
}: {
  label: string;
  value: number;
  of?: number;
}): ReactElement {
  return (
    <div style={{ fontFamily: TYPE.family }}>
      <div style={{ ...TYPE.label, color: COLOUR.inkSoft, marginBottom: '0.3em' }}>{label}</div>
      <div role="img" aria-label={`${label} ${value} / ${of}`} style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: of }, (_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 9,
              borderRadius: 5,
              ...(i < value
                ? { background: COLOUR.coral, boxShadow: `0 2px 0 ${COLOUR.coralEdge}` }
                : {
                    background: COLOUR.creamSunk,
                    boxShadow: `inset 0 0 0 1.5px ${COLOUR.creamSunkEdge}`,
                  }),
            }}
          />
        ))}
      </div>
    </div>
  );
}
