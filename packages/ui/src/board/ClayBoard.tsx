/**
 * THE BOARD, DRAWN IN CLAY — stage L4 of docs/LOOK_PLAN.md (§14).
 *
 * PICTURES ON THE PAGE (ruled at L2, 1 October 2026): the board is one picture Blender rendered,
 * and every organ, way in and piece is its own picture laid over it as an ordinary page element.
 * No canvas and no live 3D. So every piece is still something the audit, the drivers and a finger
 * can find, and the kit's motions can move it.
 *
 * WHAT IT DECIDES: nothing. What stands where is `buildNodeModel` (./Board), where a step is is
 * `./geometry`, which picture and how large is `./clay`, and what a tap means is `./tap`, the one
 * tap path. This file turns those into elements.
 *
 * NO WORDS ON THE BOARD (ruled 1 October 2026, plan §3 rule 1). The organs' and the ways in's
 * names are not drawn; each picture carries its name as its label, from the content pack, and the
 * cards say it in full.
 *
 * AN ORGAN'S HEALTH is an arc round its coin, one segment for each point it can have. A segment it
 * still has is thick and coloured; one it has lost is a thin pale line. So how many are left is
 * carried by shape, and the colour (mint at full, coral at one left, gold between) only repeats it.
 *
 * NOTHING ON A PIECE'S OWN ELEMENT IS A TRANSFORM. A piece is placed by `left`, `top` and `width`,
 * because the kit's motions are transforms and would replace one (kit/motion.ts).
 */
import { ORGANS, ROUTES } from '@immunity-wars/content';
import type { ViewState } from '@immunity-wars/session';
import {
  memo,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from 'react';

import { t as say } from '../i18n';
import { COLOUR } from '../kit/tokens';
import { cellDisplayName, residentDisplayName, typeDisplayName } from '../names';
import {
  buildNodeModel,
  integrityState,
  type BoardTap,
  type BoardTarget,
  type DisplayToken,
  type IntegrityState,
  type ReadyTurn,
} from './Board';
import {
  BASE_R,
  BODY_R,
  CLAY_VIEW,
  HUB_WELL_R,
  PIECE_SPAN,
  entryCoin,
  organCoin,
  place,
} from './clay';
import { clayLayout } from './clayLayout';
import { BOARD_ORGANS, HUB_POS, LANES, tokenPos, type Pt } from './geometry';
import { resolveTap, type TapCandidate } from './tap';

const ASPECT = CLAY_VIEW.w / CLAY_VIEW.h;
const FILL: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};
/** A length in board units, as a share of a piece's own square. */
const ofPiece = (units: number): string => `${(units / PIECE_SPAN) * 100}%`;

const organName = (o: string): string =>
  String((ORGANS as Record<string, { name?: unknown }>)[o]?.name ?? o);
const routeName = (lane: string): string =>
  String((ROUTES as Record<string, { name?: unknown }>)[lane]?.name ?? lane);

/** What an invader's picture is called: its kind, from the content pack, and whether it is coated. */
function invaderName(t: DisplayToken): string {
  const kind = (t.piece ?? '').split('-')[0] ?? '';
  const named = kind === 'unknown' || kind === '' ? say('inspect.unknown') : typeDisplayName(kind);
  return t.coated === true ? `${named}, ${say('inspect.coated')}` : named;
}

/** Health, by state. Each is held to 3:1 against the board by the kit's own test. */
export const CLAY_HEALTH: Record<IntegrityState, string> = {
  full: COLOUR.mint,
  worn: COLOUR.gold,
  critical: COLOUR.coralLit,
};

/** The arc of health round an organ's coin: where it starts and how far it runs, in degrees. */
const ARC = { r: 35.5, sweep: 150, gap: 7 };
function arcPath(c: Pt, from: number, to: number): string {
  const at = (deg: number): string => {
    const a = (deg * Math.PI) / 180;
    return `${(c.x + ARC.r * Math.cos(a)).toFixed(2)} ${(c.y + ARC.r * Math.sin(a)).toFixed(2)}`;
  };
  return `M${at(from)} A${ARC.r} ${ARC.r} 0 0 1 ${at(to)}`;
}

/** What does not change while a game is played: the board, and the six ways in. */
const Still = memo(function Still({ art }: { art: string }): ReactElement {
  const board = (scale: number): string => `${art}clay/table/board@${scale}x.webp`;
  return (
    <>
      <img
        alt=""
        draggable={false}
        src={board(2)}
        srcSet={`${board(1)} 400w, ${board(2)} 800w, ${board(3)} 1200w`}
        sizes="100vw"
        style={FILL}
      />
      {LANES.map((lane) => {
        const at = entryCoin(lane);
        if (!at) return null;
        return (
          <img
            key={lane}
            data-entry={lane}
            alt={routeName(lane)}
            draggable={false}
            src={`${art}clay/board/entry-${lane}@3x.webp`}
            style={{ position: 'absolute', ...place(at, PIECE_SPAN), aspectRatio: '1' }}
          />
        );
      })}
    </>
  );
});

function Health({ hp, max, at }: { hp: number; max: number; at: Pt }): ReactElement | null {
  if (max <= 0) return null;
  const state = integrityState(hp, max);
  // The arc is centred on the side of the coin away from the bloodstream, where nothing else is.
  const out = (Math.atan2(at.y - HUB_POS.y, at.x - HUB_POS.x) * 180) / Math.PI;
  const each = (ARC.sweep - ARC.gap * (max - 1)) / max;
  return (
    <>
      {Array.from({ length: max }, (_, i) => {
        const from = out - ARC.sweep / 2 + i * (each + ARC.gap);
        const held = i < hp;
        return (
          <path
            key={i}
            d={arcPath(at, from, from + each)}
            fill="none"
            stroke={held ? CLAY_HEALTH[state] : COLOUR.onDarkSoft}
            strokeWidth={held ? 5.5 : 1.6}
            strokeLinecap="round"
          />
        );
      })}
    </>
  );
}

/**
 * A NUMBER ON A PIECE is 12 px at rest, like any other text, however small the piece is drawn. So
 * it is hung on the piece's edge and not over its middle: `badgeAt` puts its centre a fixed way
 * beyond the body, along a direction. Up and to the right for a count; up and to the left for the
 * turns until a cell is back; and for a cell in the bloodstream, straight outward, onto the rim,
 * where it covers no other piece. (Found by looking: laid over a cell in the bloodstream, the
 * number was larger than the cell.)
 */
const UP_RIGHT: Pt = { x: 0.64, y: -0.77 };
const UP_LEFT: Pt = { x: -0.64, y: -0.77 };
function badgeAt(dir: Pt, scale: number): { left: string; top: string } {
  const reach = BODY_R * scale * 0.75 + 7;
  const share = (v: number): string => `${50 + ((v * reach) / (PIECE_SPAN * scale)) * 100}%`;
  return { left: share(dir.x), top: share(dir.y) };
}

const BADGE: CSSProperties = {
  position: 'absolute',
  minWidth: '1.45em',
  height: '1.45em',
  padding: '0 0.3em',
  boxSizing: 'border-box',
  display: 'grid',
  placeItems: 'center',
  borderRadius: 999,
  fontSize: '0.75rem',
  fontWeight: 900,
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
  boxShadow: `0 0 0 1.5px ${COLOUR.table}`,
  transform: 'translate(-50%, -50%)',
};

function Piece({
  t,
  at,
  scale,
  selected,
  tappable,
  art,
  outward,
}: {
  t: DisplayToken;
  at: Pt;
  scale: number;
  /** For a cell in the bloodstream: the way out from its centre, where its number hangs. */
  outward: Pt | null;
  selected: boolean;
  tappable: boolean;
  art: string;
}): ReactElement {
  const own = t.kind === 'cell';
  const name =
    t.resident === true && t.organ !== undefined
      ? residentDisplayName(t.organ)
      : t.cell !== undefined
        ? cellDisplayName(t.cell)
        : invaderName(t);
  const dim: CSSProperties | undefined = t.unavailable
    ? { opacity: 0.45, filter: 'grayscale(1)' }
    : undefined;
  const ring = (units: number, style: CSSProperties): ReactElement => (
    <span
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: ofPiece(units * 2),
        aspectRatio: '1',
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
  return (
    <div
      data-cell={t.cell}
      data-resident={t.resident === true ? t.organ : undefined}
      // An address for the headless drivers only (the Gate 1 audit opens the inspect sheet by
      // clicking an invader). Nothing shows it.
      data-invader={t.kind === 'invader' ? t.label : undefined}
      data-piece={t.piece ?? undefined}
      data-coated={t.coated === true ? '1' : undefined}
      data-hidden={t.hiddenIn}
      data-unavailable={t.unavailable?.kind}
      style={{
        position: 'absolute',
        ...place(at, PIECE_SPAN * scale),
        aspectRatio: '1',
        pointerEvents: 'none',
      }}
    >
      {own ? (
        <img
          alt=""
          draggable={false}
          src={`${art}clay/board/base@3x.webp`}
          style={{ ...FILL, ...dim }}
        />
      ) : null}
      {t.piece !== null ? (
        <img
          alt={name}
          draggable={false}
          src={`${art}clay/board/${t.piece}@3x.webp`}
          style={{ ...FILL, ...dim }}
        />
      ) : null}
      {selected
        ? ring(BASE_R + 4, {
            border: `2.5px solid ${COLOUR.onDark}`,
            boxShadow: `0 0 10px 2px ${COLOUR.glow}`,
          })
        : null}
      {t.hiddenIn !== undefined
        ? // HIDING INSIDE A CELL: liver-stage malaria and kala-azar inside a resident are one
          // class, reached only by the Killer T-Cell or the NK Cell, so they share one mark. The
          // sheet and the card say it in words.
          ring(BODY_R + 4, { border: `2px dashed ${COLOUR.onDark}` })
        : null}
      {own && tappable ? (
        // What a finger lands on is the piece's own body, not the empty corners of its square.
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: ofPiece(BASE_R * 2),
            aspectRatio: '1',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
        />
      ) : null}
      {t.count >= 2 ? (
        <span
          data-count={t.count}
          style={{
            ...BADGE,
            ...badgeAt(UP_RIGHT, scale),
            background: COLOUR.coral,
            color: COLOUR.ink,
          }}
        >
          {t.count}
        </span>
      ) : null}
      {t.coated === true && t.coatDrawn !== true ? (
        // A coat the picture does not show: a gold dot marks it. Only reached if the rules ever
        // coat a kind the Clay set has no coated picture of; the three that can be coated have one.
        <span
          style={{
            ...BADGE,
            ...badgeAt(UP_LEFT, scale),
            minWidth: '0.9em',
            height: '0.9em',
            padding: 0,
            background: COLOUR.gold,
            boxShadow: `0 0 0 1.5px ${COLOUR.goldEdge}`,
          }}
        />
      ) : null}
      {t.unavailable && t.unavailable.backIn !== null ? (
        // Turns until the cell acts again, where a coat's mark would be: a spent cell has none.
        <span
          data-back-in={t.unavailable.backIn}
          style={{
            ...BADGE,
            ...badgeAt(outward ?? UP_LEFT, scale),
            background: COLOUR.table,
            color: COLOUR.onDark,
            boxShadow: `0 0 0 1.5px ${COLOUR.onDarkSoft}`,
          }}
        >
          {t.unavailable.backIn}
        </span>
      ) : null}
    </div>
  );
}

/** The way out from the bloodstream's centre, for a piece standing inside its dish; else null. */
function outwardOf(at: Pt): Pt | null {
  const dx = at.x - HUB_POS.x;
  const dy = at.y - HUB_POS.y;
  const d = Math.hypot(dx, dy);
  return d > 0 && d < HUB_WELL_R ? { x: dx / d, y: dy / d } : null;
}

/** Where an offer is drawn, and how: a move glows at its step, an attack rings what it would hit. */
const OFFER: Record<BoardTarget['kind'], { r: number; style: CSSProperties }> = {
  move: {
    r: 15,
    style: {
      border: `2.5px solid ${COLOUR.glow}`,
      background: 'rgba(255, 224, 138, 0.22)',
      boxShadow: `0 0 12px 3px rgba(255, 224, 138, 0.55)`,
    },
  },
  // A hop along the lymph is a move drawn in the lymph's own blue (ruled 4 September 2026).
  hop: {
    r: 15,
    style: {
      border: `2.5px solid ${COLOUR.lymph}`,
      background: 'rgba(143, 211, 232, 0.22)',
      boxShadow: `0 0 12px 3px rgba(143, 211, 232, 0.55)`,
    },
  },
  attack: {
    r: BODY_R + 5,
    style: { border: `3px solid ${COLOUR.coralLit}`, background: 'rgba(245, 138, 110, 0.14)' },
  },
};

export function ClayBoard({
  view,
  selectedCell = null,
  selectedResident = null,
  targets = [],
  readyTurn = {},
  onTap,
  fill = false,
  art = '/art/',
}: {
  view: ViewState;
  /** The cell whose selection the view carries. */
  selectedCell?: string | null;
  /** The organ whose resident macrophage is selected. */
  selectedResident?: string | null;
  /** Positioned offers (moves at steps, attacks on invaders); each is drawn and is a tap candidate. */
  targets?: BoardTarget[];
  /** The session's per-cell return turn: what a spent cell's badge shows. */
  readyTurn?: ReadyTurn;
  /**
   * THE ONE TAP PATH (ruling of 4 September 2026; tap.ts). Every tap on the board resolves to the
   * nearest candidate within reach: a legal target, one of the player's cells where it is drawn,
   * or a step with something to inspect; nothing within reach is `nothing`, which the shell treats
   * as a tap away. A direct hit on a cell is that cell. Absent means a board that does not answer.
   */
  onTap?: (hit: BoardTap) => void;
  /** Fill the box it is placed in, keeping its shape. */
  fill?: boolean;
  /** Where the app serves its art from. */
  art?: string;
}): ReactElement {
  const organs =
    (view['organs'] as Record<string, { hp?: unknown; max?: unknown }> | undefined) ?? {};
  const byNode = buildNodeModel(view, readyTurn);

  const drawnTokens: { t: DisplayToken; at: Pt; scale: number }[] = [];
  const candidates: TapCandidate<BoardTap>[] = [];
  for (const node of byNode.values()) {
    node.display.forEach((t, i) => {
      const { pos, scale } = clayLayout(node, i);
      drawnTokens.push({ t, at: pos, scale });
      if (t.cell !== undefined)
        candidates.push({
          kind: 'cell',
          pos,
          payload: { kind: 'cell', cell: t.cell, node: node.inspect },
        });
      else if (t.resident === true && t.organ !== undefined)
        // A resident is a tap candidate of the CELL kind: selectable where it is drawn exactly as
        // a player's cell is, so the one tap path needs no new priority.
        candidates.push({
          kind: 'cell',
          pos,
          payload: { kind: 'resident', organ: t.organ, node: node.inspect },
        });
    });
    if (node.inspect.invaders.length > 0 || node.inspect.resident !== null)
      candidates.push({
        kind: 'node',
        pos: node.pos,
        payload: { kind: 'node', node: node.inspect },
      });
  }
  const offers: { tg: BoardTarget; at: Pt; scale: number }[] = [];
  for (const tg of targets) {
    let at: Pt | null = null;
    let scale = 1;
    if (tg.kind === 'move' || tg.kind === 'hop') at = tg.located ? tokenPos(tg.located) : null;
    else {
      const d = drawnTokens.find((x) => x.t.ids?.includes(tg.invaderId ?? '') === true);
      if (d) {
        at = d.at;
        scale = d.scale;
      }
    }
    if (!at) continue;
    offers.push({ tg, at, scale });
    candidates.push({ kind: 'target', pos: at, payload: { kind: 'target', target: tg } });
  }

  const handleTap = (e: ReactMouseEvent<HTMLDivElement>): void => {
    if (!onTap) return;
    // A direct hit on a cell is unambiguous, and it is how the drivers tap: a click on
    // [data-cell] that carries no position.
    const direct = (e.target as Element | null)?.closest?.('[data-cell],[data-resident]');
    const directCell = direct?.getAttribute('data-cell');
    if (directCell) {
      const hit = candidates.find(
        (c) => c.payload.kind === 'cell' && c.payload.cell === directCell,
      );
      if (hit) {
        onTap(hit.payload);
        return;
      }
    }
    const directResident = direct?.getAttribute('data-resident');
    if (directResident) {
      const hit = candidates.find(
        (c) => c.payload.kind === 'resident' && c.payload.organ === directResident,
      );
      if (hit) {
        onTap(hit.payload);
        return;
      }
    }
    // The board's own rectangle, as it is drawn now, turns a place on the screen into a place on
    // the board. It is read at the tap, so a board that has been moved or enlarged still answers.
    const box = e.currentTarget.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    const p = {
      x: CLAY_VIEW.x + ((e.clientX - box.left) / box.width) * CLAY_VIEW.w,
      y: CLAY_VIEW.y + ((e.clientY - box.top) / box.height) * CLAY_VIEW.h,
    };
    const hit = resolveTap(candidates, p);
    onTap(hit ? hit.payload : { kind: 'nothing' });
  };

  return (
    <div
      data-clay-board=""
      style={{
        containerType: 'size',
        width: '100%',
        ...(fill ? { height: '100%' } : { aspectRatio: String(ASPECT), maxWidth: 660 }),
        display: 'grid',
        placeItems: 'center',
        background: COLOUR.table,
      }}
    >
      <div
        data-clay-surface=""
        onClick={handleTap}
        style={{
          position: 'relative',
          // As wide as the box, or as wide as its height allows: the board keeps its shape.
          width: `min(100cqw, calc(100cqh * ${ASPECT.toFixed(5)}))`,
          aspectRatio: String(ASPECT),
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'manipulation',
        }}
      >
        <Still art={art} />

        {/* the seven organs: a coin each, and its health round it */}
        {BOARD_ORGANS.map((o) => {
          const at = organCoin(o);
          if (!at) return null;
          return (
            <img
              key={o}
              data-organ-icon={o}
              alt={organName(o)}
              draggable={false}
              src={`${art}clay/board/organ-${o}@3x.webp`}
              style={{ position: 'absolute', ...place(at, PIECE_SPAN), aspectRatio: '1' }}
            />
          );
        })}
        <svg
          aria-hidden="true"
          viewBox={`${CLAY_VIEW.x} ${CLAY_VIEW.y} ${CLAY_VIEW.w} ${CLAY_VIEW.h}`}
          style={{ ...FILL, pointerEvents: 'none' }}
        >
          {BOARD_ORGANS.map((o) => {
            const at = organCoin(o);
            if (!at) return null;
            const hp = Number(organs[o]?.hp ?? 0);
            const max = Number(organs[o]?.max ?? 0);
            return (
              <g
                key={o}
                data-organ-pips={o}
                data-hp={hp}
                data-max={max}
                data-state={max > 0 ? integrityState(hp, max) : undefined}
              >
                <Health hp={hp} max={max} at={at} />
              </g>
            );
          })}
        </svg>

        {/* everything standing on the board */}
        {drawnTokens.map(({ t, at, scale }) => (
          <Piece
            key={t.key}
            t={t}
            at={at}
            scale={scale}
            art={art}
            outward={outwardOf(at)}
            tappable={onTap !== undefined}
            selected={
              (t.cell !== undefined && t.cell === selectedCell) ||
              (t.resident === true && t.organ !== undefined && t.organ === selectedResident)
            }
          />
        ))}

        {/* what the piece in hand may do: a legal move glows, an attack rings its target */}
        {offers.map(({ tg, at, scale }) => {
          const o = OFFER[tg.kind];
          return (
            <span
              key={tg.key}
              data-offer={tg.kind}
              style={{
                position: 'absolute',
                ...place(at, o.r * 2 * scale),
                aspectRatio: '1',
                borderRadius: '50%',
                boxSizing: 'border-box',
                pointerEvents: 'none',
                ...o.style,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
