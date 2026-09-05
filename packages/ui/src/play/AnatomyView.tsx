/**
 * BLOCK A — the body from the outside (P2.5 item 12, step 4; layout approved by Shantanu,
 * 5 September 2026). The keyed frame with the seven organs at their anatomical positions and
 * their integrity as pips, the six entry chips on the outline at the point of entry, and the
 * bloodstream at the great vessels — every position from `board/anatomy.json`, in the frame's
 * own pixel space, which is this SVG's viewBox. **No coordinate is authored here**: the
 * numbers below are icon sizes, ring radii and badge offsets, the same class of rendering
 * constant Board.tsx authors.
 *
 * Each marker carries the count of invaders standing at that place — the same number as the
 * summary rows behind it, summed by place — coloured by depth (red organ lane, amber
 * bloodstream, green entry lane) with the number inside it, never colour alone. Tapping a
 * marker expands that place: the summary below filters to its rows. The tap is COARSE
 * POINTING, the board's own pattern: the nearest marker within a 44px-class radius, resolved
 * on the SVG in one handler, because thirty-pixel icons cannot each be a 44px target on a
 * figure this size.
 */
import { ANATOMY_ENTRY, ANATOMY_HUB, ANATOMY_POS, FRAME } from '@immunity-wars/content';
import type { PointerEvent as ReactPointerEvent, ReactElement } from 'react';

import { t } from '../i18n';
import { organDisplayName } from '../names';
import type { Depth, PlaceMarker } from './planning';

interface Pt {
  x: number;
  y: number;
}

const ICON = 30; // the board's LARGE_PX, in the frame's 1× space
const HIT_R = 24; // coarse pointing: nearest marker within this radius takes the tap
const DEPTH_COLOUR: Record<Depth, string> = {
  entry: '#2F6B4A',
  blood: '#7A5600',
  organ: '#B03A2E',
};

const frame = FRAME as { asset: string; w: number; h: number };
const organPos = ANATOMY_POS as Record<string, Pt>;
const entryPos = ANATOMY_ENTRY as Record<string, Pt>;
const hubPos = ANATOMY_HUB as Pt;

export function markerPos(m: PlaceMarker): Pt | null {
  if (m.kind === 'organ') return organPos[m.place] ?? null;
  if (m.kind === 'entry') return entryPos[m.place] ?? null;
  return hubPos;
}

export function AnatomyView({
  markers,
  focus,
  disabled = false,
  onTap,
}: {
  markers: PlaceMarker[];
  /** The expanded place, ringed — or null. */
  focus: string | null;
  disabled?: boolean;
  /** A tap on (or near) a marker: expand that place; a tap on nothing clears the focus. */
  onTap: (place: string | null) => void;
}): ReactElement {
  const placed = markers.flatMap((m) => {
    const p = markerPos(m);
    return p ? [{ m, p }] : [];
  });

  const handlePointer = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (disabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * frame.w) / r.width;
    const y = ((e.clientY - r.top) * frame.h) / r.height;
    let best: { place: string; d: number } | null = null;
    for (const { m, p } of placed) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d <= HIT_R && (!best || d < best.d)) best = { place: m.place, d };
    }
    onTap(best ? best.place : null);
  };

  return (
    <svg
      data-anatomy="1"
      viewBox={`0 0 ${String(frame.w)} ${String(frame.h)}`}
      style={{ width: '100%', maxWidth: 280, height: 'auto', display: 'block', margin: '0 auto' }}
      onPointerDown={handlePointer}
    >
      <image href={`/art/${frame.asset}@3x.webp`} x={0} y={0} width={frame.w} height={frame.h} />
      {placed.map(({ m, p }) => {
        const colour = DEPTH_COLOUR[m.depth];
        const dim = m.hp?.failed === true;
        return (
          <g
            key={m.place}
            data-anatomy-place={m.place}
            data-anatomy-count={m.count}
            data-anatomy-hp={m.hp ? [m.hp.hp, m.hp.max].join('/') : undefined}
            data-cx={p.x}
            data-cy={p.y}
            aria-label={
              m.kind === 'organ'
                ? organDisplayName(m.place)
                : m.kind === 'hub'
                  ? t('planning.depthBlood')
                  : undefined
            }
          >
            {focus === m.place ? (
              <circle
                cx={p.x}
                cy={p.y}
                r={ICON / 2 + 5}
                fill="none"
                stroke="#e80"
                strokeWidth={2.5}
              />
            ) : null}
            {m.kind === 'hub' ? (
              <>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={ICON / 2 - 2}
                  fill="#FFFDF9"
                  stroke={colour}
                  strokeWidth={3}
                />
                <circle cx={p.x} cy={p.y} r={ICON / 6} fill={colour} />
              </>
            ) : (
              <image
                href={`/art/${m.kind === 'organ' ? 'organ' : 'entry'}-${m.place}@3x.webp`}
                x={p.x - ICON / 2}
                y={p.y - ICON / 2}
                width={ICON}
                height={ICON}
                opacity={dim ? 0.35 : 1}
              />
            )}
            {m.hp ? (
              // INTEGRITY PIPS: one per point at full, filled while it holds — shape, not colour.
              <g data-anatomy-pips={m.hp.max}>
                {Array.from({ length: m.hp.max }, (_, i) => (
                  <rect
                    key={i}
                    x={p.x - (m.hp!.max * 7 - 1) / 2 + i * 7}
                    y={p.y + ICON / 2 + 2}
                    width={6}
                    height={4}
                    rx={1}
                    fill={i < m.hp!.hp ? '#8E6E53' : '#FFFDF9'}
                    stroke="#8E6E53"
                    strokeWidth={0.8}
                  />
                ))}
              </g>
            ) : null}
            {m.count > 0 ? (
              <g>
                <circle cx={p.x + ICON / 2 - 3} cy={p.y - ICON / 2 + 3} r={8} fill={colour} />
                <text
                  x={p.x + ICON / 2 - 3}
                  y={p.y - ICON / 2 + 3}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                  fontWeight={700}
                  fill="#FFFDF9"
                >
                  {m.count}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
