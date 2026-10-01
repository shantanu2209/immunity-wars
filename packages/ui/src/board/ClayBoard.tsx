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
 *
 * IT MOVES, AND IT SOUNDS (the third pull request of L4). Each time it is drawn, the picture is
 * compared with the one before (`./changes`), and what differs is played with the kit's motions:
 * a piece that went somewhere hops there from where it was, a new one arrives, one that is gone
 * shrinks away, into the cell that swallowed it if one did, and a hurt organ flinches. The picture
 * gets one sound, for what matters most in it. A piece is always DRAWN where the game says it is;
 * the motion is only how it got there, so a motion cut short, or a phone that asks for none, leaves
 * the board right. The first picture a board is given plays nothing: nothing has happened yet.
 *
 * AND THE CAMERA MOVES IN (the fourth pull request). There is no camera: the board's own element is
 * drawn larger and shifted, one transform, eased. `./camera` says on what and how far; it goes wide
 * again a moment after the last thing happened, at once on a tap, and on a phone that asks for less
 * motion it never moves. A tap is still read where the board is drawn at that instant.
 */
import { ORGANS, ROUTES } from '@immunity-wars/content';
import type { ViewState } from '@immunity-wars/session';
import {
  memo,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from 'react';

import { t as say } from '../i18n';
import { play, prefersReducedMotion } from '../kit/motion';
import { kitAudio } from '../kit/sound';
import { COLOUR, MOTION, TYPE } from '../kit/tokens';
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
import { ZOOM_WATCHING, cameraTransform, focusFor, type Focus } from './camera';
import { boardChanges, soundFor, type Picture } from './changes';
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
        srcSet={`${board(1)} 400w, ${board(2)} 800w, ${board(3)} 1200w, ${board(5)} 2000w`}
        // As wide as it is ever drawn: the screen's width, times how far the camera moves in.
        sizes={`${String(Math.round(ZOOM_WATCHING * 100))}vw`}
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
  innerRef,
  leaving = false,
}: {
  /** Hands the board the piece's own element, which is what a motion is played on. */
  innerRef?: (el: HTMLDivElement | null) => void;
  /**
   * It is no longer on the board, and is drawn only while it goes. It carries none of the hooks a
   * driver or the audit finds a piece by: there is nothing there to find.
   */
  leaving?: boolean;
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
      ref={innerRef}
      data-leaving={leaving ? '1' : undefined}
      data-cell={leaving ? undefined : t.cell}
      data-resident={!leaving && t.resident === true ? t.organ : undefined}
      // An address for the headless drivers only (the Gate 1 audit opens the inspect sheet by
      // clicking an invader). Nothing shows it.
      data-invader={!leaving && t.kind === 'invader' ? t.label : undefined}
      data-piece={leaving ? undefined : (t.piece ?? undefined)}
      data-coated={!leaving && t.coated === true ? '1' : undefined}
      data-hidden={leaving ? undefined : t.hiddenIn}
      data-unavailable={leaving ? undefined : t.unavailable?.kind}
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

/** A piece that has left the board, drawn while it goes: what it was, and where it is going. */
interface Ghost {
  id: number;
  t: DisplayToken;
  at: Pt;
  scale: number;
  /** In px: toward the cell that swallowed it, or nowhere. */
  dx: number;
  dy: number;
}

function Leaving({
  ghost,
  art,
  onGone,
}: {
  ghost: Ghost;
  art: string;
  onGone: (id: number) => void;
}): ReactElement {
  const el = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    let here = true;
    const node = el.current;
    if (!node) {
      onGone(ghost.id);
      return undefined;
    }
    // Held at its last frame, gone, until it is taken off the page a moment later.
    void play(node, 'leave', { dx: ghost.dx, dy: ghost.dy, hold: true }).then(() => {
      if (here) onGone(ghost.id);
    });
    return () => {
      here = false;
    };
    // Played once, when it starts to go.
  }, []);
  return (
    <Piece
      t={ghost.t}
      at={ghost.at}
      scale={ghost.scale}
      art={art}
      outward={null}
      selected={false}
      tappable={false}
      leaving
      innerRef={(node) => {
        el.current = node;
      }}
    />
  );
}

/** How long the camera stays in after the last thing happened, in ms: a beat of the spread is 900. */
const HOLD_WATCHING = 1300;
const HOLD_CHOOSING = 900;

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
  watching = false,
}: {
  /**
   * The spread is playing and the player is watching, not choosing: the camera moves in further,
   * and on every beat that changes something (`./camera`).
   */
  watching?: boolean;
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

  // ── WHAT CHANGED SINCE THE LAST PICTURE, PLAYED ──────────────────────────────────────────────
  const surface = useRef<HTMLDivElement>(null);
  const pieceEls = useRef(new Map<string, HTMLDivElement>());
  const organEls = useRef(new Map<string, HTMLImageElement>());
  const before = useRef<Picture | null>(null);
  const drawnBefore = useRef(new Map<string, { t: DisplayToken; at: Pt; scale: number }>());
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const ghostId = useRef(0);
  const [camera, setCamera] = useState<Focus | null>(null);
  const goWide = useRef<number | null>(null);
  useLayoutEffect(
    () => () => {
      if (goWide.current !== null) window.clearTimeout(goWide.current);
    },
    [],
  );
  const picture: Picture = {
    pieces: drawnTokens.map(({ t, at, scale }) => ({
      key: t.key,
      kind: t.kind,
      at,
      scale,
      step: t.pos,
      ids: t.ids ?? [],
      coated: t.coated === true,
    })),
    organs: Object.fromEntries(BOARD_ORGANS.map((o) => [o, Number(organs[o]?.hp ?? 0)])),
  };
  // After every draw, and before the phone paints it: so a piece that moved is never seen standing
  // in its new place before it sets off from the old one.
  useLayoutEffect(() => {
    const was = before.current;
    const wasDrawn = drawnBefore.current;
    before.current = picture;
    drawnBefore.current = new Map(drawnTokens.map((d) => [d.t.key, d]));
    const el = surface.current;
    if (was === null || el === null) return;
    const changes = boardChanges(was, picture);
    if (changes.length === 0) return;
    /**
     * px to a board unit, in the board's own measure: its width as laid out, whatever the camera is
     * doing to it. A motion is played inside the board, so the camera enlarges it with everything
     * else.
     */
    const px = el.offsetWidth / CLAY_VIEW.w;
    const on = (key: string): HTMLDivElement | undefined => pieceEls.current.get(key);
    const going: Ghost[] = [];
    for (const c of changes) {
      if (c.kind === 'move') {
        const now = picture.pieces.find((p) => p.key === c.key);
        const node = on(c.key);
        if (now && node)
          // A step taken is a hop; a piece only making room for another slides.
          void play(node, c.stepped ? 'move' : 'shift', {
            dx: (c.from.x - now.at.x) * px,
            dy: (c.from.y - now.at.y) * px,
          });
      } else if (c.kind === 'arrive') {
        const node = on(c.key);
        if (node) void play(node, 'arrive');
      } else if (c.kind === 'coat') {
        const node = on(c.key);
        if (node) void play(node, 'coat');
      } else if (c.kind === 'grow') {
        // What it stands for has multiplied: it swells, and settles.
        const node = on(c.key);
        if (node) void play(node, 'engulf', { onTop: true });
      } else if (c.kind === 'thin') {
        const node = on(c.key);
        if (node) void play(node, 'hurt', { onTop: true });
      } else if (c.kind === 'hurt') {
        const node = organEls.current.get(c.organ);
        if (node) void play(node, 'hurt');
      } else {
        const gone = wasDrawn.get(c.piece.key);
        if (gone) {
          ghostId.current += 1;
          going.push({
            id: ghostId.current,
            ...gone,
            dx: c.eater ? (c.eater.at.x - c.piece.at.x) * px : 0,
            dy: c.eater ? (c.eater.at.y - c.piece.at.y) * px : 0,
          });
        }
        const eater = c.eater ? on(c.eater.key) : undefined;
        // Over the slide it may be making at the same moment, to the middle of a step it now has
        // to itself.
        if (eater) void play(eater, 'engulf', { onTop: true });
      }
    }
    if (going.length > 0) setGhosts((all) => [...all, ...going]);
    const sound = soundFor(changes);
    if (sound) kitAudio.answer(sound);
    // THE CAMERA: in on what changed, and wide again a moment after the last thing happened.
    if (!prefersReducedMotion()) {
      const focus = focusFor(changes, picture, watching);
      if (focus !== null || watching) {
        setCamera(focus);
        if (goWide.current !== null) window.clearTimeout(goWide.current);
        goWide.current =
          focus === null
            ? null
            : window.setTimeout(() => setCamera(null), watching ? HOLD_WATCHING : HOLD_CHOOSING);
      }
    }
  });

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
        kitAudio.answer('tap');
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
        kitAudio.answer('tap');
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
    // A tap that found a piece or a step answers the finger at once. One that found a legal move
    // does not: what it does is heard when the board changes.
    if (hit && hit.payload.kind !== 'target') kitAudio.answer('tap');
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
        // What the camera pushes past the play area's edge is not drawn.
        overflow: 'hidden',
      }}
    >
      <div
        ref={surface}
        data-clay-surface=""
        data-camera={camera === null ? 'wide' : 'in'}
        onClick={handleTap}
        // A finger on the board brings the whole of it back at once.
        onPointerDown={() => {
          if (camera !== null) setCamera(null);
        }}
        style={{
          position: 'relative',
          transform: cameraTransform(camera),
          transformOrigin: '0 0',
          transition: `transform ${String(MOTION.camera.ms)}ms ${MOTION.camera.curve}`,
          // As wide as the box, or as wide as its height allows: the board keeps its shape.
          width: `min(100cqw, calc(100cqh * ${ASPECT.toFixed(5)}))`,
          aspectRatio: String(ASPECT),
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'manipulation',
          // the numbers on the pieces are set in the kit's typeface, like every other
          fontFamily: TYPE.family,
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
              ref={(node) => {
                if (node) organEls.current.set(o, node);
                else organEls.current.delete(o);
              }}
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
            innerRef={(node) => {
              if (node) pieceEls.current.set(t.key, node);
              else pieceEls.current.delete(t.key);
            }}
            tappable={onTap !== undefined}
            selected={
              (t.cell !== undefined && t.cell === selectedCell) ||
              (t.resident === true && t.organ !== undefined && t.organ === selectedResident)
            }
          />
        ))}

        {/* what has just left the board, while it goes */}
        {ghosts.map((g) => (
          <Leaving
            key={g.id}
            ghost={g}
            art={art}
            onGone={(id) => setGhosts((all) => all.filter((x) => x.id !== id))}
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
