/**
 * WHAT STANDS ON THE BOARD — the model the board is drawn from, and that a tap resolves against.
 *
 * It takes the raw projection and not `SessionView`: the same model must describe the
 * authoritative view (`sessionView.game`) and a burst frame's `frame.view`, so it takes the one
 * shape both carry.
 *
 * THE DRAWING IS NOT HERE. Until stage L4 of the look (docs/LOOK_PLAN.md §14) this file also held
 * the board drawn as SVG in the printed board's colours. `ClayBoard.tsx` draws it now, as pictures
 * on the page, from this same model; where things are still comes from `./geometry`.
 */

import type { ViewState } from '@immunity-wars/session';

import { CLASS_NEW, classOf, pieceFor } from './clay';
import { tokenPos, type Pt } from './geometry';

export interface Located {
  zone?: unknown;
  lane?: unknown;
  organ?: unknown;
  step?: unknown;
}

interface Invaderish extends Located {
  id?: unknown;
  disease?: unknown;
  type?: unknown;
  novel?: unknown;
  hp?: unknown;
  maxhp?: unknown;
  tagged?: unknown;
  stage?: unknown;
  inMac?: unknown;
  organ?: unknown;
}

interface Cellish extends Located {
  alive?: unknown;
  regenAt?: unknown;
}

/**
 * A cell that LOOKS available and is not (the board-state sweep, for-P2.5.md): spent after
 * its big move and regenerating, or offline under a crisis. `backIn` is turns until it acts
 * again, when the view carries it.
 */
export interface Unavailable {
  /**
   * spent / offline: the cell is out and returns. hiv: the Helper T-Cell while HIV has
   * destroyed the helper T-cells (6 September 2026 — its home is the piece, where the Helper
   * is described, not a strip chip). infected: a resident with a parasite living inside it.
   */
  kind: 'spent' | 'offline' | 'hiv' | 'infected';
  backIn: number | null;
}

/** The session's per-cell return turn (`queries.readyTurn`) — the ENGINE's answer, not `regenAt`. */
export type ReadyTurn = Readonly<Record<string, number | null>>;

function unavailability(
  view: ViewState,
  cell: string,
  c: Cellish,
  readyTurn: ReadyTurn,
): Unavailable | null {
  const turn = typeof view['turn'] === 'number' ? view['turn'] : null;
  if (c.alive === false) {
    const ready = readyTurn[cell];
    const back = typeof ready === 'number' && turn !== null ? Math.max(0, ready - turn) : null;
    return { kind: 'spent', backIn: back };
  }
  const sup = view['suppress'] as Record<string, unknown> | undefined;
  const n = sup?.[cell];
  if (typeof n === 'number' && n > 0) return { kind: 'offline', backIn: n };
  return null;
}

interface Organish {
  hp?: unknown;
  max?: unknown;
}

/**
 * INTEGRITY STATE, derived from the organ's own max (S25, 5 September 2026): full is green,
 * one point left (or none) is red, anything between is amber. The Brain's max of 2 therefore
 * has no amber state — green straight to red — with no special case, and it stays right if
 * any organ's integrity ever changes in content. The three colours all clear 3:1 on the paper.
 */
export type IntegrityState = 'full' | 'worn' | 'critical';
export function integrityState(hp: number, max: number): IntegrityState {
  if (hp >= max) return 'full';
  if (hp <= 1) return 'critical';
  return 'worn';
}
export const INTEGRITY_COLOUR: Record<IntegrityState, string> = {
  full: '#2F6B4A',
  worn: '#7A5600',
  critical: '#B03A2E',
};

const CELL_ART = new Set([
  'macrophage',
  'neutrophil',
  'bcell',
  'tcell',
  'helper',
  'nk',
  'eosinophil',
]);
const PATH_ART = new Set([
  'virus',
  'hidden',
  'bacteria',
  'toxin',
  'venom',
  'fungus',
  'worm',
  'malaria',
  'parasite',
]);

/** One invader as the inspect view lists it — ungrouped: inspect is the precise view. */
export interface InspectInvader {
  id: string;
  disease: string;
  type: string;
  novel: boolean;
  hp: number;
  maxhp: number;
  /**
   * Its antigen class, the content pack's FAMILY key, or `X` for one that matches none of the
   * six (a novel pathogen). It is what a Clay piece's colour says (ruled 1 October 2026).
   */
  cls: string;
  /** Coated in antibody (`tagged`): what a macrophage may eat and a strike may hit. */
  coated: boolean;
  /** Malaria's life-cycle stage (sporozoite / liver / blood), or null for everything else. */
  stage: string | null;
  /**
   * HIDING INSIDE A CELL — liver-stage malaria, or kala-azar inside a resident macrophage
   * (`inMac`). Only the Killer T-Cell or NK Cell can reach it; antibodies and macrophages
   * cannot. Drawn as a dashed ring, said in words by the sheet and the card.
   */
  hiddenIn: 'liver' | 'macrophage' | null;
  /** The organ the invader is in (for "hiding inside the Kupffer cell"), or null. */
  organ: string | null;
}

/** Everything standing on one node, handed to the shell when the node is tapped. */
export interface InspectInfo {
  /** viewBox coordinates of the node (for positioning UI, if wanted). */
  x: number;
  y: number;
  cells: string[];
  /** Spent or offline cells among `cells`, with turns until they are back. */
  unavailable: Record<string, Unavailable>;
  /** Organ key when that organ's resident macrophage stands here. */
  resident: string | null;
  invaders: InspectInvader[];
  /**
   * THE ORGAN ITSELF when this node is a branch's step 0 (6 September 2026): its integrity,
   * so the sheet can carry the organ's "When damaged" text one tap from the pips — the home
   * that let the permanent organ-damage chip leave the strip.
   */
  organ: { key: string; hp: number; max: number } | null;
}

/** Everything standing on the board, grouped by node — what the board draws AND what a tap resolves against. */
export interface NodeModel {
  pos: Pt;
  display: DisplayToken[];
  inspect: InspectInfo;
}

export interface DisplayToken {
  key: string;
  /** Not drawn (no label under any token, ruled 26 September 2026): the invader's is the
   *  `data-invader` hook the instruments find tokens by, and is never shown to a player. */
  label: string;
  kind: 'invader' | 'cell';
  pos: Pt;
  cell?: string;
  resident?: boolean;
  /** For a resident token: its organ — how it is selected and addressed (CP3). */
  organ?: string;
  /** A cell that looks available and is not — drawn dimmed, with its return in the badge slot. */
  unavailable?: Unavailable;
  /** An invader group coated in antibody — its own token, never mixed with uncoated ones. */
  coated?: boolean;
  /** An invader group hiding inside a cell — its own token, drawn with a dashed ring. */
  hiddenIn?: 'liver' | 'macrophage';
  art: string | null;
  /**
   * THE CLAY PICTURE that stands for it (stage L4): a cell's own key, or a kind and its antigen
   * class, `bacteria-EXB`, with `-coated` where the coat is part of the picture. Null only for a
   * cell the Clay set has no picture of.
   */
  piece: string | null;
  /** The coat is in the picture already; no badge is needed to say it. */
  coatDrawn?: boolean;
  /** Invaders of this type on this node; a badge shows when >= 2. */
  count: number;
  /** ATTACK targets are by invader id; a type-group token stands for every id in it. */
  ids?: string[];
}

/** The organ whose step-0 node sits at `pos`, with its integrity — or null for any other node. */
function organAtPos(view: ViewState, pos: Pt): InspectInfo['organ'] {
  const organs = (view['organs'] as Record<string, Organish> | undefined) ?? {};
  for (const [key, o] of Object.entries(organs)) {
    const at = tokenPos({ zone: 'branch', organ: key, step: 0 });
    if (at && at.x === pos.x && at.y === pos.y) {
      return {
        key,
        hp: typeof o.hp === 'number' ? o.hp : 0,
        max: typeof o.max === 'number' ? o.max : 0,
      };
    }
  }
  return null;
}

export function buildNodeModel(view: ViewState, readyTurn: ReadyTurn = {}): Map<string, NodeModel> {
  const invaders = (view['invaders'] as Invaderish[] | undefined) ?? [];
  const cells = (view['cells'] as Record<string, Cellish> | undefined) ?? {};
  const residents = (view['residents'] as Record<string, { step?: unknown }> | undefined) ?? {};

  // Everything standing on the board, grouped by resolved position. Invaders then collapse
  // to FAN-OF-TYPES per node (ruled 20 Aug 2026 on docs/STACK_COLOCATION.md): one display
  // token per distinct type with a count badge — off-hub nodes hold <=2 distinct types
  // >=99.3% of the time and never 4, so this loses nothing on lanes. Same-type disease
  // differences live in the inspect view. THE HUB IS A ZONE, NOT A NODE — its grouped
  // display is its own design piece; until it lands, the hub gets the same fan (scaffolding).
  interface Standing {
    kind: 'invader' | 'cell';
    pos: Pt;
    cell?: string;
    resident?: string;
    iv?: Invaderish;
  }
  const standing: Standing[] = [];
  for (const [organ, r] of Object.entries(residents)) {
    const step = typeof r.step === 'number' ? r.step : 0;
    const pos = tokenPos({ zone: 'branch', organ, step });
    if (pos) standing.push({ kind: 'cell', pos, resident: organ });
  }
  for (const iv of invaders) {
    const pos = tokenPos(iv);
    if (pos) standing.push({ kind: 'invader', pos, iv });
  }
  for (const [ck, c] of Object.entries(cells)) {
    const pos = tokenPos(c);
    if (pos) standing.push({ kind: 'cell', pos, cell: ck });
  }

  const byNode = new Map<string, NodeModel>();
  for (const s of standing) {
    const k = `${s.pos.x}:${s.pos.y}`;
    let node = byNode.get(k);
    if (!node) {
      node = {
        pos: s.pos,
        display: [],
        inspect: {
          x: s.pos.x,
          y: s.pos.y,
          cells: [],
          unavailable: {},
          resident: null,
          invaders: [],
          organ: organAtPos(view, s.pos),
        },
      };
      byNode.set(k, node);
    }
    if (s.kind === 'cell') {
      if (s.resident !== undefined) {
        node.inspect.resident = s.resident;
        // An INFECTED resident (a parasite living inside it) is drawn dimmed like a spent cell
        // (6 September 2026): the token is the surface, its reason line says why, and the
        // permanent strip chip that used to say it came out.
        const r = residents[s.resident] as { infectedBy?: unknown } | undefined;
        const infected = r?.infectedBy !== null && r?.infectedBy !== undefined;
        node.display.push({
          key: `res-${s.resident}`,
          label: '',
          kind: 'cell',
          pos: s.pos,
          resident: true,
          organ: s.resident,
          unavailable: infected ? { kind: 'infected', backIn: null } : undefined,
          art: 'cell-macrophage',
          piece: 'macrophage',
          count: 1,
        });
      } else if (s.cell !== undefined) {
        node.inspect.cells.push(s.cell);
        const unavailable =
          unavailability(view, s.cell, cells[s.cell] ?? {}, readyTurn) ?? undefined;
        if (unavailable) node.inspect.unavailable[s.cell] = unavailable;
        node.display.push({
          key: `cell-${s.cell}`,
          label: s.cell.slice(0, 4),
          kind: 'cell',
          pos: s.pos,
          cell: s.cell,
          unavailable,
          art: CELL_ART.has(s.cell) ? `cell-${s.cell}` : null,
          piece: CELL_ART.has(s.cell) ? s.cell : null,
          count: 1,
        });
      }
    } else if (s.iv) {
      node.inspect.invaders.push({
        id: String(s.iv.id ?? ''),
        disease: String(s.iv.disease ?? '?'),
        type: typeof s.iv.type === 'string' ? s.iv.type : '?',
        novel: s.iv.novel === true,
        cls: classOf(String(s.iv.disease ?? ''), s.iv.novel === true),
        hp: typeof s.iv.hp === 'number' ? s.iv.hp : 1,
        maxhp: typeof s.iv.maxhp === 'number' ? s.iv.maxhp : 1,
        coated: s.iv.tagged === true,
        stage: typeof s.iv.stage === 'string' ? s.iv.stage : null,
        hiddenIn:
          s.iv.inMac === true
            ? 'macrophage'
            : s.iv.type === 'malaria' && s.iv.stage === 'liver'
              ? 'liver'
              : null,
        organ: typeof s.iv.organ === 'string' ? s.iv.organ : null,
      });
    }
  }
  // Collapse each node's invaders into type groups (novel invaders group as 'novel', masked).
  //
  // THE GROUP KEY HAS THE ANTIGEN CLASS IN IT (stage L4, 1 October 2026). A Clay piece's colour
  // says its class, which is what an antibody has to match, so one token cannot stand for an
  // enveloped virus and a naked one: its colour would be false of one of them. Two classes of
  // one kind on a step are two tokens.
  //
  // THE GROUP KEY IS TYPE + COATED (the board-state sweep, 4 Sep 2026). A coated bacterium is
  // its own token beside the uncoated ones: a coat badge on a mixed group would be measuring
  // the collapse, not the invaders — and the Monocyte's engulf ring on a mixed group was
  // drawn around a token standing for both. STACK_COLOCATION's ≤2-types measurement gains at
  // most one extra group where a coat exists.
  for (const node of byNode.values()) {
    const groups = new Map<string, InspectInvader[]>();
    for (const iv of node.inspect.invaders) {
      // …and by HIDDEN-INSIDE-A-CELL, for the same reason: a liver-stage malaria and a
      // blood-stage one on a node are different questions, and the ring must not stand for both.
      const gk = iv.novel
        ? 'novel'
        : `${iv.type}:${iv.cls}${iv.coated ? ':coated' : ''}${iv.hiddenIn ? `:in-${iv.hiddenIn}` : ''}`;
      const list = groups.get(gk) ?? [];
      list.push(iv);
      groups.set(gk, list);
    }
    for (const [gk, list] of groups) {
      const first = list[0];
      if (!first) continue;
      const type = gk === 'novel' ? 'novel' : first.type;
      const picture = pieceFor(
        first.type,
        gk === 'novel' ? CLASS_NEW : first.cls,
        gk !== 'novel' && first.coated,
      );
      node.display.push({
        key: `ivg-${node.pos.x}:${node.pos.y}:${gk}`,
        // A masked pathogen's hook does not carry the start of its name: the page would then
        // hold what the game is hiding, for anyone who looked.
        label: gk === 'novel' || list.length !== 1 ? type : first.disease.slice(0, 6),
        kind: 'invader',
        pos: node.pos,
        coated: gk !== 'novel' && first.coated,
        hiddenIn: gk !== 'novel' && first.hiddenIn !== null ? first.hiddenIn : undefined,
        art: gk !== 'novel' && PATH_ART.has(type) ? `path-${type}` : null,
        piece: picture.piece,
        coatDrawn: picture.coatDrawn,
        count: list.length,
        ids: list.map((x) => x.id),
      });
    }
  }

  return byNode;
}

/** The node the given invader stands on, as the inspect sheet would show it — or null. */
export function inspectInfoForInvader(
  view: ViewState,
  invaderId: string,
  readyTurn: ReadyTurn = {},
): InspectInfo | null {
  for (const node of buildNodeModel(view, readyTurn).values()) {
    if (node.inspect.invaders.some((iv) => iv.id === invaderId)) return node.inspect;
  }
  return null;
}

/** The node the given cell stands on, as the inspect sheet would show it — or null. */
export function inspectInfoForCell(
  view: ViewState,
  cell: string,
  readyTurn: ReadyTurn = {},
): InspectInfo | null {
  for (const node of buildNodeModel(view, readyTurn).values()) {
    if (node.inspect.cells.includes(cell)) return node.inspect;
  }
  return null;
}

/** The node the given organ's resident stands on — or null. */
export function inspectInfoForResident(
  view: ViewState,
  organ: string,
  readyTurn: ReadyTurn = {},
): InspectInfo | null {
  for (const node of buildNodeModel(view, readyTurn).values()) {
    if (node.inspect.resident === organ) return node.inspect;
  }
  return null;
}

/**
 * A positioned offer the shell wants drawn and tappable (from offered.ts). A MOVE is at a
 * node; an ATTACK is on an invader, drawn around the type-group token that stands for it.
 * `payload` is the shell's — the board never reads it.
 */
export interface BoardTarget {
  key: string;
  /** `hop` is a move drawn in lymph blue at the partner crossing (CP3, ruling 3). */
  kind: 'move' | 'hop' | 'attack';
  located?: Located;
  invaderId?: string;
  payload: unknown;
}

/** What a board tap resolved to — the ONE tap path (tap.ts). The shell decides what it means. */
export type BoardTap =
  | { kind: 'target'; target: BoardTarget }
  | { kind: 'cell'; cell: string; node: InspectInfo }
  | { kind: 'resident'; organ: string; node: InspectInfo }
  | { kind: 'node'; node: InspectInfo }
  | { kind: 'nothing' };
