/**
 * BLOCK A — the body from the outside (P2.5 item 12, step 4; layout approved by Shantanu,
 * 5 September 2026). The figure with the seven organs at their anatomical positions and their
 * integrity as pips, the six ways in on the outline at the point of entry, and the bloodstream at
 * the great vessels — every position from `board/anatomy.json`, in the frame's own space, which is
 * this SVG's viewBox. **No position of an organ or a way in is authored here**: the numbers below
 * are picture sizes, ring radii and badge offsets, the same class of rendering constant the board
 * authors.
 *
 * DRAWN IN CLAY (stage L5 of docs/LOOK_PLAN.md). The figure is the board's own material: a dark
 * shape on the table with a pale edge, and on it the SAME coins the board has for the organs and
 * the ways in (`art/clay/board/organ-*` and `entry-*`), so an organ in planning and that organ in
 * command are one picture, and the flight between the two stages lands a coin on itself.
 *
 * THE OUTLINE IS DRAWN IN CODE, below: a path in the frame's 224 by 380 space. It replaces a raster
 * outline that was among the art the look retires (plan §4: written in code is ours outright and
 * has nothing to license). It is a silhouette to hang places on, and it claims no anatomy: where
 * each organ and each way in sits is the content pack's, and the path was drawn round those places.
 * A test holds every place inside it.
 *
 * Each marker carries the count of invaders standing at that place — the same number as the
 * summary rows behind it, summed by place — in a coral badge with the number inside it, never
 * colour alone. Tapping a marker expands that place: the summary below filters to its rows. The
 * tap is COARSE POINTING, the board's own pattern: the nearest marker within a 44px-class radius,
 * resolved on the SVG in one handler, because thirty-pixel coins cannot each be a 44px target on a
 * figure this size.
 */
import { ANATOMY_ENTRY, ANATOMY_HUB, ANATOMY_POS, FRAME } from '@immunity-wars/content';
import type { PointerEvent as ReactPointerEvent, ReactElement } from 'react';

import { integrityState } from '../board/Board';
import { CLAY_HEALTH } from '../board/ClayBoard';
import { t } from '../i18n';
import { COLOUR, TYPE } from '../kit/tokens';
import { organDisplayName } from '../names';
import { pieceArt } from '../panels/onCard';

import type { PlaceMarker } from './planning';

interface Pt {
  x: number;
  y: number;
}

/** A coin's own width on the figure, in the frame's space: an organ's, and a way in's. */
const COIN = { organ: 30, entry: 24 } as const;
/**
 * How much of its picture a coin fills. The pictures are the board's, 90 board units square with
 * the coin in the middle (clay/pieces.py: a radius of 1.3 for an organ and 1.087 for a way in, at a
 * scale of 0.23, in a picture 0.9 wide), so a picture is drawn larger than the coin it shows.
 */
const COIN_SHARE = { organ: (1.3 * 0.23) / 0.45, entry: (1.087 * 0.23) / 0.45 } as const;
// Coarse pointing: the nearest marker within this radius takes the tap. 26 frame units is 46px across
// at the 339px the figure is drawn at on a 360px phone since piece 5 (for-P2.7.md §19).
const HIT_R = 26;

const frame = FRAME as { w: number; h: number };
const organPos = ANATOMY_POS as Record<string, Pt>;
const entryPos = ANATOMY_ENTRY as Record<string, Pt>;
const hubPos = ANATOMY_HUB as Pt;

/**
 * THE FIGURE'S OUTLINE, in the frame's space (224 by 380), symmetric about x = 112: a head, a neck,
 * shoulders, the arms to above the elbow, the trunk, and the legs to mid thigh. Exported so the
 * test can ask whether each place the content pack names lies inside it.
 */
export const BODY_OUTLINE = [
  'M 112 14',
  'C 132 14, 144 28, 144 52',
  'C 148 52, 149 64, 143 66',
  'C 141 82, 134 94, 128 100',
  'L 128 108',
  'C 140 116, 164 120, 176 128',
  'C 190 136, 198 150, 200 170',
  'L 207 214',
  'L 175 220',
  'L 169 196',
  'C 166 220, 160 250, 162 272',
  'C 164 292, 172 310, 171 336',
  'L 171 366',
  'L 123 366',
  'L 117 330',
  'Q 112 318 107 330',
  'L 101 366',
  'L 53 366',
  'L 53 336',
  'C 52 310, 60 292, 62 272',
  'C 64 250, 58 220, 55 196',
  'L 49 220',
  'L 17 214',
  'L 24 170',
  'C 26 150, 34 136, 48 128',
  'C 60 120, 84 116, 96 108',
  'L 96 100',
  'C 90 94, 83 82, 81 66',
  'C 75 64, 76 52, 80 52',
  'C 80 28, 92 14, 112 14',
  'Z',
].join(' ');

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
    // Through the SVG's own transform, as the board does (piece 5, §19): the figure fills the play
    // area's height now, and the transform stays right however its box is letterboxed.
    const ctm = e.currentTarget.getScreenCTM();
    if (!ctm) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const x = pt.x;
    const y = pt.y;
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
      style={{
        // THE PLAY AREA'S HEIGHT (piece 5, §19): the figure is as tall as the board is in command,
        // its width following from its frame's shape, so the two stages share one height.
        height: '100%',
        width: 'auto',
        maxWidth: '100%',
        display: 'block',
        margin: '0 auto',
        fontFamily: TYPE.family,
      }}
      onPointerDown={handlePointer}
    >
      {/* The figure: the board's ground, with the table's quiet ink for its edge. */}
      <path
        data-anatomy-outline=""
        d={BODY_OUTLINE}
        fill={COLOUR.board}
        stroke={COLOUR.onDarkSoft}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {placed.map(({ m, p }) => {
        const dim = m.hp?.failed === true;
        const kind = m.kind === 'organ' ? 'organ' : 'entry';
        const size = COIN[kind];
        const picture = size / COIN_SHARE[kind];
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
                r={COIN.organ / 2 + 5}
                fill="none"
                stroke={COLOUR.glow}
                strokeWidth={2.5}
              />
            ) : null}
            {m.kind === 'hub' ? (
              // The bloodstream, as the board draws it: a coral rim round a dark dish.
              <circle
                cx={p.x}
                cy={p.y}
                r={COIN.organ / 2 - 3}
                fill={COLOUR.well}
                stroke={COLOUR.coral}
                strokeWidth={4}
              />
            ) : (
              <image
                href={pieceArt(`${kind}-${m.place}`)}
                x={p.x - picture / 2}
                y={p.y - picture / 2}
                width={picture}
                height={picture}
                opacity={dim ? 0.35 : 1}
              />
            )}
          </g>
        );
      })}
      {/* A SECOND PASS, over every coin: what is hung on a place. The organs stand close, and drawn
          with its coin, the heart's pips lay under the lungs' coin (seen on the first picture of
          this figure). */}
      {placed.map(({ m, p }) => {
        const size = COIN[m.kind === 'organ' ? 'organ' : 'entry'];
        return (
          <g key={m.place} data-anatomy-over={m.place}>
            {m.hp ? (
              // INTEGRITY PIPS, ABOVE the coin (S25, 5 September 2026): one per point at full,
              // filled while it holds, in the board's own three colours for an organ's health; one
              // that is lost is an empty outline. The count is carried by shape; colour repeats it.
              <g data-anatomy-pips={m.hp.max} data-state={integrityState(m.hp.hp, m.hp.max)}>
                {Array.from({ length: m.hp.max }, (_, i) => {
                  const held = m.hp !== null && i < m.hp.hp;
                  const state = m.hp === null ? 'full' : integrityState(m.hp.hp, m.hp.max);
                  const max = m.hp?.max ?? 0;
                  return (
                    <rect
                      key={i}
                      x={p.x - (max * 7 - 1) / 2 + i * 7}
                      y={p.y - size / 2 - 7}
                      width={6}
                      height={4}
                      rx={1.5}
                      fill={held ? CLAY_HEALTH[state] : 'none'}
                      stroke={held ? CLAY_HEALTH[state] : COLOUR.onDarkSoft}
                      strokeWidth={0.8}
                    />
                  );
                })}
              </g>
            ) : null}
            {m.count > 0 ? (
              <g>
                <circle
                  cx={p.x + size / 2 - 2}
                  cy={p.y - size / 2 + 3}
                  r={8.5}
                  fill={COLOUR.coral}
                  stroke={COLOUR.coralEdge}
                  strokeWidth={1}
                />
                <text
                  x={p.x + size / 2 - 2}
                  y={p.y - size / 2 + 3}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10.5}
                  fontWeight={900}
                  fill={COLOUR.ink}
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
