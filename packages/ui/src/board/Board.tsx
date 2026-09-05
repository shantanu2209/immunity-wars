/**
 * P2.2 steps 3–5 — the board, rendered from geometry and a PLAIN `ViewState`.
 *
 * The prop is deliberately the raw projection and not `SessionView`: the same component must
 * render the authoritative view (`sessionView.game`) and a burst frame's `frame.view`, so it
 * takes the one shape both carry. Clickability never comes from a frame — this component has no
 * interaction at all; the dev shell drives the game and hands views in.
 *
 * Every number authored here is a stroke width, a radius, or a fan-out offset — rendering
 * necessities. Layout comes entirely from `./geometry`, which reads `geometry.json` through
 * content's validated loader. Colours and stroke weights are the physical board's CLASSIC
 * design (P2.4 restyle — see the CLASSIC constant below); anything visual beyond matching the
 * print is in docs/for-P2.5.md.
 */

import { LYMPH_GROUP, LYMPH_STEP, ORGANS, ROUTES, LABEL_SIDE } from '@immunity-wars/content';
import type { ViewState } from '@immunity-wars/session';
import type { MouseEvent as ReactMouseEvent, ReactElement } from 'react';

import {
  BOARD_ORGANS,
  HUB_POS,
  LANES,
  VIEWBOX,
  branchSteps,
  entryOf,
  organPos,
  polyPoints,
  routeSteps,
  tokenPos,
  type Pt,
} from './geometry';
import { resolveTap, type TapCandidate } from './tap';

/**
 * CLASSIC palette, stroke weights and element sizes, extracted from the physical A2 board
 * (Immunity_Wars_BOARD_A2.pdf, vector ops read directly — P2.4 restyle, 20 Aug 2026).
 * `geometry.json` is itself regenerated from the same PDF (`tools/geometry-from-a2/`), and
 * every derived number below is printed by that generator's report at its scale of
 * 0.6343 u/pt — change one only by re-running the generator, never by eye.
 */
const CLASSIC = {
  paper: '#FFFDF9',
  ink: '#7C6A61', // label/step-number ink
  inkDark: '#2E2A28', // organ names
  route: '#C8877B',
  branch: '#C89A6B',
  branchNodeFill: '#FDF3EC',
  organ: '#8E6E53',
  hubFill: '#F7CFC7',
  frame: '#B03A2E', // hub ring carries the frame red
  lymph: '#1F6F8B',
  lymphNodeFill: '#E6F2F7', // the print draws LYMPH_STEP nodes as blue lymph nodes
  wash: '#FBEAE5', // translucent disc behind the play area
  washAlpha: 0.36, // the PDF's ExtGState ca
  wLine: 2.2, // 3.40pt (1.2mm) — route and branch lines
  wNode: 1.6, // 2.55pt (0.9mm) — step-node rings
  wHub: 3.4, // 5.39pt (1.9mm)
  wLymph: 3.6, // 5.67pt (2.0mm)
  wBoundary: 1.1, // 1.70pt (0.6mm) — the dashed play-area ring
  lymphDash: '9.9 4.5', // print dash [15.59 7.09]pt
  boundaryDash: '7.2 5.4', // print dash [11.34 8.50]pt
  rNode: 17.1, // step nodes (print 26.9pt)
  rHub: 50.3, // outer hub circle (print 79.4pt)
  rHubInner: 42.3, // inner hub ring (print 66.6pt)
  // The wash disc / dashed boundary now sit at R_PLAY (derived below): since the radial
  // regeneration, the play circle is MEANINGFUL — every lane terminates on it, and organ
  // and entry icons are annotations OUTSIDE it (decision: icons are labels, not slots).
} as const;

/** The board's typography, DECIDED at P2.5 piece 2: Nunito (OFL), bundled by the app at
 *  /fonts/ so it works fully offline; the humanist stack behind it is the fallback. */
const BOARD_FONT = "'Nunito', 'Trebuchet MS', 'Segoe UI', Verdana, system-ui, sans-serif";

/** The uniform play circle: every ENTRY and ORGAN_POS sits on it by construction
 *  (tools/geometry-from-a2 radialization) — derived, never authored. */
const R_PLAY = Math.max(
  ...[...LANES.map((l): Pt | null => entryOf(l)), ...BOARD_ORGANS.map((o) => organPos(o))]
    .filter((p): p is Pt => p !== null)
    .map((p) => Math.hypot(p.x - HUB_POS.x, p.y - HUB_POS.y)),
);

/** Display names come from the rules tables — ONE source (rules/board.json), fixing the
 *  mixed-case labels that came from two (organ KEYS vs geometry ENTRY.t). i18n catalogues
 *  are these strings' eventual home (P2.5's hardcoded-string check will insist). */
const organName = (o: string): string =>
  String((ORGANS as Record<string, { name?: unknown }>)[o]?.name ?? o);
const routeName = (lane: string): string =>
  String((ROUTES as Record<string, { name?: unknown }>)[lane]?.name ?? lane);

/** Per-asset content-box metrics from the art pipeline's manifest (fractions of the emitted
 *  square). Icons are spaced from the play circle by their NEAREST CONTENT EDGE — a long
 *  thin lung and a compact kidney space evenly only when measured this way. */
export type ArtMetrics = Record<string, { content?: { w?: number; h?: number } }>;

function annotationPlacement(
  anchor: Pt,
  metrics: ArtMetrics | undefined,
  key: string,
): { icon: Pt; label: Pt; anchor: 'start' | 'middle' } {
  const dx = anchor.x - HUB_POS.x;
  const dy = anchor.y - HUB_POS.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const cw = metrics?.[key]?.content?.w ?? 1;
  const ch = metrics?.[key]?.content?.h ?? 1;
  // Half-extent of the icon's content rectangle along the radial ray (support function).
  const ext = ((Math.abs(ux) * cw + Math.abs(uy) * ch) / 2) * LARGE_ART_U;
  const GAP = 8; // uniform clearance: play circle -> nearest content edge
  const LABEL_GAP = 14; // uniform clearance: content edge -> label
  // Annotations sit off the PLAY CIRCLE, not off their anchor: the organ tissue slot is
  // inside the circle, and measuring from it would pull organ icons off the uniform ring.
  const iconDist = R_PLAY + GAP + ext;
  const icon = { x: HUB_POS.x + ux * iconDist, y: HUB_POS.y + uy * iconDist };
  // THE LABEL'S SIDE comes from the geometry pack (S25 item 11): BELOW the icon at the board's
  // left and right, to the RIGHT of it at top and bottom — the side margins freed, the print
  // following the same data. Side extents use the icon's content box in that direction.
  const side = (LABEL_SIDE as Record<string, 'below' | 'right' | undefined>)[
    key.replace(/^(organ|entry)-/, '')
  ];
  if (side === 'right') {
    return {
      icon,
      label: { x: icon.x + (cw * LARGE_ART_U) / 2 + LABEL_GAP / 2, y: icon.y + 4 },
      anchor: 'start',
    };
  }
  return {
    icon,
    label: { x: icon.x, y: icon.y + (ch * LARGE_ART_U) / 2 + LABEL_GAP },
    anchor: 'middle',
  };
}

/**
 * Lymphatic arcs: one dashed connector per LYMPH_GROUP, through the LYMPH_STEP node of each
 * member route — both facts from content, so the UI hardcodes no lane grouping. Members are
 * ordered by angle around the hub so the connector does not zigzag; that ordering is
 * derivation, not design (arc shape and labelling are for-P2.5.md).
 */
const lymphGroupOf = (lane: string): string | null => {
  const grp = (LYMPH_GROUP as Record<string, string | null>)[lane];
  return typeof grp === 'string' ? grp : null;
};

function lymphArcs(): Pt[][] {
  const groups = new Map<string, Pt[]>();
  for (const [lane, grp] of Object.entries(LYMPH_GROUP as Record<string, string | null>)) {
    if (typeof grp !== 'string') continue;
    const node = routeSteps(lane).find((s) => s.step === (LYMPH_STEP as number));
    if (!node) continue;
    const list = groups.get(grp) ?? [];
    list.push(node);
    groups.set(grp, list);
  }
  const angle = (p: Pt): number => Math.atan2(p.y - HUB_POS.y, p.x - HUB_POS.x);
  return [...groups.values()]
    .filter((l) => l.length >= 2)
    .map((l) => l.slice().sort((a, b) => angle(a) - angle(b)));
}
const LYMPH_ARCS = lymphArcs();

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
  kind: 'spent' | 'offline';
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

/** Fan a node's DISPLAY tokens out horizontally. With fan-of-types this list is short
 *  (measured: <=2 type groups on >=99.3% of off-hub nodes) — 26u leaves each token's edge
 *  visible. The HUB still piles: its grouped-zone display is its own P2.5 piece. */
const fan = (p: Pt, i: number, n: number): Pt =>
  n <= 1 ? p : { x: p.x + (i - (n - 1) / 2) * 26, y: p.y };

/**
 * THE HUB IS A ZONE, NOT A NODE — VARIANT B (ruled 20 Aug 2026, built at S25 item 8): invader
 * type-tokens clustered in the centre (a 2×2 grid, the most legible region — threats are the
 * decision-relevant information), the player's cells ringed at the inner edge (cells LEAVING
 * the hub is the normal state of a game, so a ring degrades gracefully where an arc would
 * lopside). Proportions follow the ruled mock-up (`pnpm art:showcase`): cluster tokens ~22u,
 * ring tokens ~16u on a 38u ring inside the 42u inner circle. Everywhere else: fan-of-types.
 */
const HUB_CLUSTER_U = 22;
const HUB_RING_U = 16;
const HUB_RING_R = 38;
export function tokenLayout(node: NodeModel, i: number): { pos: Pt; size: number } {
  const t = node.display[i];
  if (!t) return { pos: node.pos, size: TOKEN_ART_U };
  if (node.pos.x !== HUB_POS.x || node.pos.y !== HUB_POS.y) {
    return { pos: fan(t.pos, i, node.display.length), size: TOKEN_ART_U };
  }
  const invaders = node.display.filter((d) => d.kind === 'invader');
  const cells = node.display.filter((d) => d.kind === 'cell');
  if (t.kind === 'invader') {
    const k = invaders.indexOf(t);
    const n = invaders.length;
    const cols = n <= 1 ? 1 : 2;
    const rows = Math.ceil(n / cols);
    const col = k % cols;
    const row = Math.floor(k / cols);
    const step = HUB_CLUSTER_U + 4;
    return {
      pos: {
        x: HUB_POS.x + (col - (cols - 1) / 2) * step,
        y: HUB_POS.y + (row - (rows - 1) / 2) * step,
      },
      size: HUB_CLUSTER_U,
    };
  }
  const k = cells.indexOf(t);
  const a = (2 * Math.PI * k) / Math.max(1, cells.length) - Math.PI / 2;
  return {
    pos: { x: HUB_POS.x + HUB_RING_R * Math.cos(a), y: HUB_POS.y + HUB_RING_R * Math.sin(a) },
    size: HUB_RING_U,
  };
}

/**
 * P2.4 art, emitted by tools/art-pipeline into the app's public dir and served at /art/.
 * The 3x rendition is referenced everywhere: SVG scales it down, and 3x covers every DPR.
 * Sizes are the brief's per-class display sizes (tokens 20px, organs/entries 30px) in
 * viewBox units at the 360px reference width (20 / (360/660) etc.).
 */
const ART_URL = (key: string): string => `/art/${key}@3x.webp`;
const TOKEN_ART_U = 36.7; // 20 CSS px at 360

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

/** The antibody coat badge's colours — the legacy renderer's antibody gold, with the dark
 *  stroke that carries the contrast (the fill alone is 1.8:1 against the paper). */
const COAT = { fill: '#F2B705', stroke: '#7A5600' } as const;
/** A Y in two strokes: the V, then the stem — an antibody's shape, at any size. */
const yGlyph = (cx: number, cy: number): string =>
  `M${cx - 4},${cy - 4.5} L${cx},${cy} L${cx + 4},${cy - 4.5} M${cx},${cy} L${cx},${cy + 5}`;
const LARGE_ART_U = 55; // 30 CSS px at 360
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
}

/** Everything standing on the board, grouped by node — what the board draws AND what a tap resolves against. */
export interface NodeModel {
  pos: Pt;
  display: DisplayToken[];
  inspect: InspectInfo;
}

export interface DisplayToken {
  key: string;
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
  /** Invaders of this type on this node; a badge shows when >= 2. */
  count: number;
  /** ATTACK targets are by invader id; a type-group token stands for every id in it. */
  ids?: string[];
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
        },
      };
      byNode.set(k, node);
    }
    if (s.kind === 'cell') {
      if (s.resident !== undefined) {
        node.inspect.resident = s.resident;
        node.display.push({
          key: `res-${s.resident}`,
          label: '',
          kind: 'cell',
          pos: s.pos,
          resident: true,
          organ: s.resident,
          art: 'cell-macrophage',
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
          count: 1,
        });
      }
    } else if (s.iv) {
      node.inspect.invaders.push({
        id: String(s.iv.id ?? ''),
        disease: String(s.iv.disease ?? '?'),
        type: typeof s.iv.type === 'string' ? s.iv.type : '?',
        novel: s.iv.novel === true,
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
        : `${iv.type}${iv.coated ? ':coated' : ''}${iv.hiddenIn ? `:in-${iv.hiddenIn}` : ''}`;
      const list = groups.get(gk) ?? [];
      list.push(iv);
      groups.set(gk, list);
    }
    for (const [gk, list] of groups) {
      const first = list[0];
      if (!first) continue;
      const type = gk === 'novel' ? 'novel' : first.type;
      node.display.push({
        key: `ivg-${node.pos.x}:${node.pos.y}:${gk}`,
        label: list.length === 1 ? first.disease.slice(0, 6) : type,
        kind: 'invader',
        pos: node.pos,
        coated: gk !== 'novel' && first.coated,
        hiddenIn: gk !== 'novel' && first.hiddenIn !== null ? first.hiddenIn : undefined,
        art: gk !== 'novel' && PATH_ART.has(type) ? `path-${type}` : null,
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

export function Board({
  view,
  selectedCell = null,
  selectedResident = null,
  artMetrics,
  targets = [],
  readyTurn = {},
  onTap,
}: {
  /** The session's per-cell return turn — what a spent cell's badge shows. */
  readyTurn?: ReadyTurn;
  view: ViewState;
  /** The cell whose selection the view carries — P2.3's real tap renders as a highlight. */
  selectedCell?: string | null;
  /** The organ whose resident macrophage is selected (CP3). */
  selectedResident?: string | null;
  /** The art manifest's per-asset metrics (fetched by the shell); absent means icons are
   *  spaced as full squares. */
  artMetrics?: ArtMetrics;
  /** Positioned offers (moves at nodes, attacks on invaders); each renders as a ring and is a
   *  tap candidate. */
  targets?: BoardTarget[];
  /**
   * THE ONE TAP PATH (ruling of 4 September 2026; tap.ts). Every board tap resolves to the
   * nearest candidate within 60u — a legal target, one of the player's cell tokens at its
   * drawn position, or a node with something to inspect — and nothing within reach resolves
   * to `nothing`, which the shell treats as tap-away. A direct hit on a cell token is that
   * cell (the perf driver dispatches coordinate-less clicks on `[data-cell]`). Absent means a
   * non-interactive board. Tokens are 20px; the hit area is the radius, well over 44px.
   */
  onTap?: (hit: BoardTap) => void;
}): ReactElement {
  const organs = (view['organs'] as Record<string, Organish> | undefined) ?? {};
  const byNode = buildNodeModel(view, readyTurn);

  // Tap candidates, in the resolver's terms. Cells at their FANNED positions (a stack's cells
  // are individually addressable); a node is a candidate only if it has something to inspect.
  const candidates: TapCandidate<BoardTap>[] = [];
  const targetPos = (tg: BoardTarget): Pt | null => {
    if (tg.kind === 'move' || tg.kind === 'hop') return tg.located ? tokenPos(tg.located) : null;
    for (const node of byNode.values()) {
      const i = node.display.findIndex((t) => t.ids?.includes(tg.invaderId ?? '') === true);
      if (i >= 0) return tokenLayout(node, i).pos;
    }
    return null;
  };
  const drawn: { tg: BoardTarget; pos: Pt }[] = [];
  for (const tg of targets) {
    const pos = targetPos(tg);
    if (!pos) continue;
    drawn.push({ tg, pos });
    candidates.push({ kind: 'target', pos, payload: { kind: 'target', target: tg } });
  }
  for (const node of byNode.values()) {
    node.display.forEach((t, i) => {
      if (t.cell !== undefined) {
        candidates.push({
          kind: 'cell',
          pos: tokenLayout(node, i).pos,
          payload: { kind: 'cell', cell: t.cell, node: node.inspect },
        });
      } else if (t.resident === true && t.organ !== undefined) {
        // A resident is a tap candidate of the CELL kind (CP3): selectable at its fanned
        // position exactly like a player cell, so the one tap path needs no new priority.
        candidates.push({
          kind: 'cell',
          pos: tokenLayout(node, i).pos,
          payload: { kind: 'resident', organ: t.organ, node: node.inspect },
        });
      }
    });
    if (node.inspect.invaders.length > 0 || node.inspect.resident !== null) {
      candidates.push({
        kind: 'node',
        pos: node.pos,
        payload: { kind: 'node', node: node.inspect },
      });
    }
  }

  const handleTap = (e: ReactMouseEvent<SVGSVGElement>): void => {
    if (!onTap) return;
    // A direct hit on a cell token is unambiguous — and it is how the perf driver taps
    // (a click on [data-cell] with no coordinates).
    const direct = (e.target as Element | null)?.closest?.('[data-cell],[data-resident]');
    const directCell = direct?.getAttribute('data-cell');
    if (directCell) {
      const node = candidates.find(
        (c) => c.payload.kind === 'cell' && c.payload.cell === directCell,
      )?.payload;
      if (node && node.kind === 'cell') {
        onTap(node);
        return;
      }
    }
    const directResident = direct?.getAttribute('data-resident');
    if (directResident) {
      const node = candidates.find(
        (c) => c.payload.kind === 'resident' && c.payload.organ === directResident,
      )?.payload;
      if (node && node.kind === 'resident') {
        onTap(node);
        return;
      }
    }
    const svg = e.currentTarget;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const hit = resolveTap(candidates, { x: p.x, y: p.y });
    onTap(hit ? hit.payload : { kind: 'nothing' });
  };

  return (
    <svg
      viewBox={VIEWBOX}
      onClick={handleTap}
      style={{
        width: '100%',
        maxWidth: 660,
        display: 'block',
        background: CLASSIC.paper,
        fontFamily: BOARD_FONT,
      }}
    >
      {/* the play circle: wash disc and dashed boundary at R_PLAY — everything inside is
          playable (numbered nodes + bloodstream), everything outside is annotation */}
      <circle
        cx={HUB_POS.x}
        cy={HUB_POS.y}
        r={R_PLAY}
        fill={CLASSIC.wash}
        opacity={CLASSIC.washAlpha}
      />
      <circle
        cx={HUB_POS.x}
        cy={HUB_POS.y}
        r={R_PLAY}
        fill="none"
        stroke={CLASSIC.route}
        strokeWidth={CLASSIC.wBoundary}
        strokeDasharray={CLASSIC.boundaryDash}
        opacity={CLASSIC.washAlpha}
      />

      {/* routes: hub -> steps -> entry */}
      {LANES.map((lane) => {
        const stepsOf = routeSteps(lane);
        const entry = entryOf(lane);
        const run: Pt[] = [HUB_POS, ...stepsOf, ...(entry ? [entry] : [])];
        // The entry icon is an ANNOTATION outside the play circle — the lane line stops at
        // the circle's edge (the ENTRY anchor), because nothing ever occupies an entry point.
        const placed = entry ? annotationPlacement(entry, artMetrics, `entry-${lane}`) : null;
        const lymphStep = lymphGroupOf(lane) === null ? -1 : (LYMPH_STEP as number);
        return (
          <g key={lane}>
            <polyline
              points={polyPoints(run)}
              fill="none"
              stroke={CLASSIC.route}
              strokeWidth={CLASSIC.wLine}
            />
            {stepsOf.map((p) => (
              <g key={p.step}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={CLASSIC.rNode}
                  fill={p.step === lymphStep ? CLASSIC.lymphNodeFill : '#fff'}
                  stroke={p.step === lymphStep ? CLASSIC.lymph : CLASSIC.route}
                  strokeWidth={CLASSIC.wNode}
                />
                <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize={10} fill={CLASSIC.ink}>
                  {p.step}
                </text>
              </g>
            ))}
            {placed ? (
              <image
                href={ART_URL(`entry-${lane}`)}
                x={placed.icon.x - LARGE_ART_U / 2}
                y={placed.icon.y - LARGE_ART_U / 2}
                width={LARGE_ART_U}
                height={LARGE_ART_U}
              />
            ) : null}
            {placed ? (
              <text
                x={placed.label.x}
                y={placed.label.y}
                textAnchor={placed.anchor}
                fontSize={13}
                fill={CLASSIC.ink}
              >
                {routeName(lane)}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* lymphatic connectors, over the routes they shortcut */}
      {LYMPH_ARCS.map((arc, i) => (
        <polyline
          key={`lymph-${i}`}
          points={polyPoints(arc)}
          fill="none"
          stroke={CLASSIC.lymph}
          strokeWidth={CLASSIC.wLymph}
          strokeDasharray={CLASSIC.lymphDash}
        />
      ))}

      {/* organ branches: hub -> steps -> organ box */}
      {BOARD_ORGANS.map((o) => {
        const stepsOf = branchSteps(o);
        const pos = organPos(o);
        if (!pos) return null;
        // hub -> steps -> the tissue slot, and the line STOPS there: the tissue is a
        // terminal node, and a tail past it would say pieces can go further (they cannot).
        // Routes differ deliberately — their tail is the germ arriving from outside.
        const run: Pt[] = [HUB_POS, ...stepsOf, pos];
        const hp = Number((organs[o] ?? {}).hp ?? 0);
        return (
          <g key={o}>
            <polyline
              points={polyPoints(run)}
              fill="none"
              stroke={CLASSIC.branch}
              strokeWidth={CLASSIC.wLine}
            />
            {stepsOf.map((p) => (
              <g key={p.step}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={CLASSIC.rNode}
                  fill={CLASSIC.branchNodeFill}
                  stroke={CLASSIC.branch}
                  strokeWidth={CLASSIC.wNode}
                />
                <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize={10} fill={CLASSIC.ink}>
                  {p.step}
                </text>
              </g>
            ))}
            {/* The organ icon is an ANNOTATION outside the play circle; the branch ends at
                ORGAN_POS on the circle — the terminal anchor where an attacker or a
                resident (branch step 0) stands. hp stays at the anchor, inside play. */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={CLASSIC.rNode}
              fill={CLASSIC.branchNodeFill}
              stroke={CLASSIC.organ}
              strokeWidth={CLASSIC.wNode}
            />
            {/* Step 0 — matching the engine's addressing (tokenPos maps branch step 0 here),
                so the display never needs translating during a debug session. */}
            <text x={pos.x} y={pos.y + 3.5} textAnchor="middle" fontSize={10} fill={CLASSIC.ink}>
              {0}
            </text>
            {(() => {
              const p = annotationPlacement(pos, artMetrics, `organ-${o}`);
              return (
                <>
                  <image
                    data-organ-icon={o}
                    href={ART_URL(`organ-${o}`)}
                    x={p.icon.x - LARGE_ART_U / 2}
                    y={p.icon.y - LARGE_ART_U / 2}
                    width={LARGE_ART_U}
                    height={LARGE_ART_U}
                  />
                  <text
                    x={p.label.x}
                    y={p.label.y}
                    textAnchor={p.anchor}
                    fontSize={13}
                    fill={CLASSIC.inkDark}
                  >
                    {organName(o)}
                  </text>
                </>
              );
            })()}
            {/* INTEGRITY AS PIPS ABOVE the organ icon (S25, ruled 5 September 2026; moved
                above at the second pass — below, they met the organ names). The digit that sat
                inward of the tissue slot read as one number with step 1's label ("13") at phone
                size and is gone. One pip per point at full, filled while it holds, coloured by
                STATE from the organ's own max — green at full, red at one left, amber between,
                so the Brain's 2 goes green straight to red without a special case. Shape and
                colour both carry it. */}
            {(() => {
              const p = annotationPlacement(pos, artMetrics, `organ-${o}`);
              const max = Number((organs[o] ?? {}).max ?? 0);
              if (max <= 0) return null;
              const pip = 9;
              const gap = 3;
              const x0 = p.icon.x - (max * pip + (max - 1) * gap) / 2;
              const y0 = p.icon.y - LARGE_ART_U / 2 - 8;
              const state = integrityState(hp, max);
              return (
                <g data-organ-pips={o} data-hp={hp} data-max={max} data-state={state}>
                  {Array.from({ length: max }, (_, i) => (
                    <rect
                      key={i}
                      x={x0 + i * (pip + gap)}
                      y={y0}
                      width={pip}
                      height={5}
                      rx={1.5}
                      fill={i < hp ? INTEGRITY_COLOUR[state] : CLASSIC.paper}
                      stroke={INTEGRITY_COLOUR[state]}
                      strokeWidth={1}
                    />
                  ))}
                </g>
              );
            })()}
          </g>
        );
      })}

      {/* the bloodstream hub — a double circle on the print */}
      <circle
        cx={HUB_POS.x}
        cy={HUB_POS.y}
        r={CLASSIC.rHub}
        fill={CLASSIC.hubFill}
        stroke={CLASSIC.frame}
        strokeWidth={CLASSIC.wHub}
      />
      <circle
        cx={HUB_POS.x}
        cy={HUB_POS.y}
        r={CLASSIC.rHubInner}
        fill="none"
        stroke={CLASSIC.frame}
        strokeWidth={CLASSIC.wNode}
      />
      {/* The bloodstream is route step 0 (tokenPos maps route step<1 here) — numbered like
          the tissue slots so every occupiable place carries its engine address. */}
      <text x={HUB_POS.x} y={HUB_POS.y + 3.5} textAnchor="middle" fontSize={10} fill={CLASSIC.ink}>
        {0}
      </text>

      {/* tokens: fan-of-types per node (cells individual, invaders one token per type) */}
      {[...byNode.values()].map((node) =>
        node.display.map((t, i) => {
          const { pos: p, size: SZ } = tokenLayout(node, i);
          const selected =
            (t.cell !== undefined && t.cell === selectedCell) ||
            (t.resident === true && t.organ !== undefined && t.organ === selectedResident);
          return (
            <g
              key={t.key}
              data-cell={t.cell}
              data-resident={t.resident === true ? t.organ : undefined}
              data-coated={t.coated === true ? '1' : undefined}
              data-hidden={t.hiddenIn}
              data-unavailable={t.unavailable?.kind}
              style={(t.cell || t.resident === true) && onTap ? { cursor: 'pointer' } : undefined}
            >
              {selected ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={SZ / 2 + 3}
                  fill="none"
                  stroke="#e80"
                  strokeWidth={4}
                />
              ) : null}
              {t.resident === true ? (
                // A DOUBLE RING in the organ brown tells a resident from the Monocyte, which
                // shares its art (CP3). No new colour: the primary distinction is the name in
                // the bar and the sheet — Kupffer cell versus Monocyte — and distinct resident
                // art is the real answer, recorded in for-P2.5.md for the art pass.
                <>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={SZ / 2 + 2}
                    fill="none"
                    stroke={CLASSIC.organ}
                    strokeWidth={1.8}
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={SZ / 2 + 6}
                    fill="none"
                    stroke={CLASSIC.organ}
                    strokeWidth={1.8}
                  />
                </>
              ) : null}
              {t.art !== null ? (
                // A SPENT or OFFLINE cell is drawn dimmed and desaturated (the board-state
                // sweep): the message is "not this one", so it is the art that changes, not a
                // badge added — the badge slot carries its return instead, below.
                <image
                  href={ART_URL(t.art)}
                  x={p.x - SZ / 2}
                  y={p.y - SZ / 2}
                  width={SZ}
                  height={SZ}
                  opacity={t.unavailable ? 0.38 : 1}
                  style={t.unavailable ? { filter: 'grayscale(1)' } : undefined}
                />
              ) : (
                // No art (a novel invader stays masked): the placeholder circle.
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={9}
                  fill={t.kind === 'invader' ? '#b33' : '#fff'}
                  stroke={t.kind === 'invader' ? '#711' : '#236'}
                  strokeWidth={2}
                />
              )}
              {t.count >= 2 ? (
                <>
                  <circle
                    cx={p.x + SZ / 2 - 3}
                    cy={p.y - SZ / 2 + 3}
                    r={10}
                    fill={CLASSIC.frame}
                    stroke="#fff"
                    strokeWidth={1.6}
                  />
                  <text
                    x={p.x + SZ / 2 - 3}
                    y={p.y - SZ / 2 + 7.2}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight="bold"
                    fill="#fff"
                  >
                    {t.count}
                  </text>
                </>
              ) : null}
              {t.hiddenIn !== undefined ? (
                // HIDING INSIDE A CELL — a dashed ring in the organ brown: liver-stage malaria
                // and kala-azar inside a resident are one biological class (intracellular —
                // only the Killer T-Cell or NK Cell reach it), so they share one mark. The
                // sheet and the card say it in words.
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={SZ / 2 + 2}
                  fill="none"
                  stroke={CLASSIC.organ}
                  strokeWidth={2.2}
                  strokeDasharray="4 3"
                />
              ) : null}
              {t.coated === true ? (
                // THE COAT BADGE — top-LEFT, the corner the count badge does not use: antibody
                // gold with a dark-gold stroke (6.5:1 against the paper, 3.7:1 against the
                // fill — Gate 1's 3:1 for non-text UI, computed 4 Sep 2026) and a Y drawn as
                // two strokes, because an antibody IS Y-shaped and a drawn glyph survives 6px
                // where a letter does not. Opsonisation, made visible.
                <g>
                  <circle
                    cx={p.x - SZ / 2 + 3}
                    cy={p.y - SZ / 2 + 3}
                    r={10}
                    fill={COAT.fill}
                    stroke={COAT.stroke}
                    strokeWidth={1.6}
                  />
                  <path
                    d={yGlyph(p.x - SZ / 2 + 3, p.y - SZ / 2 + 3)}
                    fill="none"
                    stroke={COAT.stroke}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ) : null}
              {t.unavailable && t.unavailable.backIn !== null ? (
                // The return, in the badge slot: turns until the cell acts again.
                <>
                  <circle
                    cx={p.x - SZ / 2 + 3}
                    cy={p.y - SZ / 2 + 3}
                    r={10}
                    fill={CLASSIC.ink}
                    stroke="#fff"
                    strokeWidth={1.6}
                  />
                  <text
                    x={p.x - SZ / 2 + 3}
                    y={p.y - SZ / 2 + 7.2}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight="bold"
                    fill="#fff"
                  >
                    {t.unavailable.backIn}
                  </text>
                </>
              ) : null}
              {/* No label under hub tokens (Variant B): the ring and cluster are dense, and the strip,
                  the bar and the sheet name every piece there. */}
              {SZ === TOKEN_ART_U ? (
                <text
                  x={p.x}
                  y={p.y + SZ / 2 + 10}
                  textAnchor="middle"
                  fontSize={10}
                  fill={t.kind === 'invader' ? '#711' : '#236'}
                >
                  {t.label}
                </text>
              ) : null}
            </g>
          );
        }),
      )}

      {/* offers: move rings at nodes, attack rings around pathogen tokens — tap candidates all */}
      {drawn.map(({ tg, pos }) =>
        tg.kind === 'move' || tg.kind === 'hop' ? (
          // A hop is a move ring in LYMPH BLUE (ruling 3, CP3): the board already teaches
          // lymph in blue through the dashed connectors, so this reuses an established signal.
          <circle
            key={tg.key}
            cx={pos.x}
            cy={pos.y}
            r={CLASSIC.rNode + 6}
            fill={tg.kind === 'hop' ? 'rgba(31,111,139,0.14)' : 'rgba(47,107,74,0.12)'}
            stroke={tg.kind === 'hop' ? CLASSIC.lymph : '#2F6B4A'}
            strokeWidth={3}
            strokeDasharray="6 4"
            style={onTap ? { cursor: 'pointer' } : undefined}
          />
        ) : (
          <circle
            key={tg.key}
            cx={pos.x}
            cy={pos.y}
            r={TOKEN_ART_U / 2 + 5}
            fill="rgba(176,58,46,0.10)"
            stroke="#B03A2E"
            strokeWidth={3.5}
            style={onTap ? { cursor: 'pointer' } : undefined}
          />
        ),
      )}
    </svg>
  );
}
