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

import { LYMPH_GROUP, LYMPH_STEP, ORGANS, ROUTES } from '@immunity-wars/content';
import type { ViewState } from '@immunity-wars/session';
import type { ReactElement } from 'react';

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

/** The board's first deliberate typography: a warm humanist stack available offline on every
 *  platform. Proposal for P2.5: bundle Nunito (OFL) and put it first — see docs/for-P2.5.md. */
const BOARD_FONT = "'Trebuchet MS', 'Segoe UI', Verdana, system-ui, sans-serif";

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
): { icon: Pt; label: Pt } {
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
  const LABEL_GAP = 14; // uniform clearance: far content edge -> label baseline
  // Annotations sit off the PLAY CIRCLE, not off their anchor: the organ tissue slot is
  // inside the circle, and measuring from it would pull organ icons off the uniform ring.
  const iconDist = R_PLAY + GAP + ext;
  const labelDist = iconDist + ext + LABEL_GAP;
  return {
    icon: { x: HUB_POS.x + ux * iconDist, y: HUB_POS.y + uy * iconDist },
    label: { x: HUB_POS.x + ux * labelDist, y: HUB_POS.y + uy * labelDist + 4 },
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

interface Located {
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
}

interface Cellish extends Located {
  alive?: unknown;
}

interface Organish {
  hp?: unknown;
}

/** Fan a node's DISPLAY tokens out horizontally. With fan-of-types this list is short
 *  (measured: <=2 type groups on >=99.3% of off-hub nodes) — 26u leaves each token's edge
 *  visible. The HUB still piles: its grouped-zone display is its own P2.5 piece. */
const fan = (p: Pt, i: number, n: number): Pt =>
  n <= 1 ? p : { x: p.x + (i - (n - 1) / 2) * 26, y: p.y };

/**
 * P2.4 art, emitted by tools/art-pipeline into the app's public dir and served at /art/.
 * The 3x rendition is referenced everywhere: SVG scales it down, and 3x covers every DPR.
 * Sizes are the brief's per-class display sizes (tokens 20px, organs/entries 30px) in
 * viewBox units at the 360px reference width (20 / (360/660) etc.).
 */
const ART_URL = (key: string): string => `/art/${key}@3x.webp`;
const TOKEN_ART_U = 36.7; // 20 CSS px at 360
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
  disease: string;
  type: string;
  novel: boolean;
  hp: number;
  maxhp: number;
}

/** Everything standing on one node, handed to the shell when the node is tapped. */
export interface InspectInfo {
  /** viewBox coordinates of the node (for positioning UI, if wanted). */
  x: number;
  y: number;
  cells: string[];
  /** Organ key when that organ's resident macrophage stands here. */
  resident: string | null;
  invaders: InspectInvader[];
}

export function Board({
  view,
  selectedCell = null,
  onCellClick,
  artMetrics,
  onNodeInspect,
}: {
  view: ViewState;
  /** The cell whose selection the view carries — P2.3's real tap renders as a highlight. */
  selectedCell?: string | null;
  /** Wired by the shell to `session.setSelection`; absent means a non-interactive board. */
  onCellClick?: (cell: string) => void;
  /** The art manifest's per-asset metrics (fetched by the shell); absent means icons are
   *  spaced as full squares. */
  artMetrics?: ArtMetrics;
  /**
   * THE TOUCH PATTERN (P2.5 piece 1, deliberate): the board is COARSE pointing — a tap
   * resolves to the nearest occupied node — and the inspect view the shell opens from this
   * callback is where PRECISE, ≥44px interaction happens. A 20px token cannot be a 44px
   * target; what a tap opens can be. Direct token clicks (onCellClick) still work and stay
   * `data-cell`-addressable for the perf driver.
   */
  onNodeInspect?: (info: InspectInfo) => void;
}): ReactElement {
  const invaders = (view['invaders'] as Invaderish[] | undefined) ?? [];
  const cells = (view['cells'] as Record<string, Cellish> | undefined) ?? {};
  const organs = (view['organs'] as Record<string, Organish> | undefined) ?? {};
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

  interface Display {
    key: string;
    label: string;
    kind: 'invader' | 'cell';
    pos: Pt;
    cell?: string;
    resident?: boolean;
    art: string | null;
    /** Invaders of this type on this node; a badge shows when >= 2. */
    count: number;
  }
  const byNode = new Map<string, { pos: Pt; display: Display[]; inspect: InspectInfo }>();
  for (const s of standing) {
    const k = `${s.pos.x}:${s.pos.y}`;
    let node = byNode.get(k);
    if (!node) {
      node = {
        pos: s.pos,
        display: [],
        inspect: { x: s.pos.x, y: s.pos.y, cells: [], resident: null, invaders: [] },
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
          art: 'cell-macrophage',
          count: 1,
        });
      } else if (s.cell !== undefined) {
        node.inspect.cells.push(s.cell);
        node.display.push({
          key: `cell-${s.cell}`,
          label: s.cell.slice(0, 4),
          kind: 'cell',
          pos: s.pos,
          cell: s.cell,
          art: CELL_ART.has(s.cell) ? `cell-${s.cell}` : null,
          count: 1,
        });
      }
    } else if (s.iv) {
      node.inspect.invaders.push({
        disease: String(s.iv.disease ?? '?'),
        type: typeof s.iv.type === 'string' ? s.iv.type : '?',
        novel: s.iv.novel === true,
        hp: typeof s.iv.hp === 'number' ? s.iv.hp : 1,
        maxhp: typeof s.iv.maxhp === 'number' ? s.iv.maxhp : 1,
      });
    }
  }
  // Collapse each node's invaders into type groups (novel invaders group as 'novel', masked).
  for (const node of byNode.values()) {
    const groups = new Map<string, InspectInvader[]>();
    for (const iv of node.inspect.invaders) {
      const gk = iv.novel ? 'novel' : iv.type;
      const list = groups.get(gk) ?? [];
      list.push(iv);
      groups.set(gk, list);
    }
    for (const [gk, list] of groups) {
      const first = list[0];
      if (!first) continue;
      node.display.push({
        key: `ivg-${node.pos.x}:${node.pos.y}:${gk}`,
        label: list.length === 1 ? first.disease.slice(0, 6) : gk,
        kind: 'invader',
        pos: node.pos,
        art: gk !== 'novel' && PATH_ART.has(gk) ? `path-${gk}` : null,
        count: list.length,
      });
    }
  }

  const openInspect = (clientX: number, clientY: number, svg: SVGSVGElement): void => {
    if (!onNodeInspect) return;
    const pt = new DOMPoint(clientX, clientY);
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = pt.matrixTransform(ctm.inverse());
    let best: InspectInfo | null = null;
    let bestD = 60; // coarse-pointing radius, viewBox units
    for (const node of byNode.values()) {
      const d = Math.hypot(node.pos.x - p.x, node.pos.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = node.inspect;
      }
    }
    if (best) onNodeInspect(best);
  };

  return (
    <svg
      viewBox={VIEWBOX}
      onClick={(e) => openInspect(e.clientX, e.clientY, e.currentTarget)}
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
                textAnchor="middle"
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
              0
            </text>
            {(() => {
              const p = annotationPlacement(pos, artMetrics, `organ-${o}`);
              return (
                <>
                  <image
                    href={ART_URL(`organ-${o}`)}
                    x={p.icon.x - LARGE_ART_U / 2}
                    y={p.icon.y - LARGE_ART_U / 2}
                    width={LARGE_ART_U}
                    height={LARGE_ART_U}
                  />
                  <text
                    x={p.label.x}
                    y={p.label.y}
                    textAnchor="middle"
                    fontSize={13}
                    fill={CLASSIC.inkDark}
                  >
                    {organName(o)}
                  </text>
                </>
              );
            })()}
            {/* hp sits just inward of the tissue slot — a resident usually stands ON it. */}
            {(() => {
              const d = Math.hypot(pos.x - HUB_POS.x, pos.y - HUB_POS.y) || 1;
              const hx = pos.x - ((pos.x - HUB_POS.x) / d) * (CLASSIC.rNode + 14);
              const hy = pos.y - ((pos.y - HUB_POS.y) / d) * (CLASSIC.rNode + 14);
              return (
                <text x={hx} y={hy + 4} textAnchor="middle" fontSize={12} fill={CLASSIC.ink}>
                  {hp}
                </text>
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
        0
      </text>

      {/* tokens: fan-of-types per node (cells individual, invaders one token per type) */}
      {[...byNode.values()].map((node) =>
        node.display.map((t, i) => {
          const p = fan(t.pos, i, node.display.length);
          const selected = t.cell !== undefined && t.cell === selectedCell;
          return (
            <g
              key={t.key}
              data-cell={t.cell}
              onClick={
                t.cell && onCellClick
                  ? (e) => {
                      e.stopPropagation(); // direct token click selects; it must not ALSO inspect
                      onCellClick(t.cell as string);
                    }
                  : undefined
              }
              style={t.cell && onCellClick ? { cursor: 'pointer' } : undefined}
            >
              {selected ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={TOKEN_ART_U / 2 + 3}
                  fill="none"
                  stroke="#e80"
                  strokeWidth={4}
                />
              ) : null}
              {t.resident === true ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={TOKEN_ART_U / 2 + 2}
                  fill="none"
                  stroke={CLASSIC.organ}
                  strokeWidth={2.5}
                />
              ) : null}
              {t.art !== null ? (
                <image
                  href={ART_URL(t.art)}
                  x={p.x - TOKEN_ART_U / 2}
                  y={p.y - TOKEN_ART_U / 2}
                  width={TOKEN_ART_U}
                  height={TOKEN_ART_U}
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
                    cx={p.x + TOKEN_ART_U / 2 - 3}
                    cy={p.y - TOKEN_ART_U / 2 + 3}
                    r={10}
                    fill={CLASSIC.frame}
                    stroke="#fff"
                    strokeWidth={1.6}
                  />
                  <text
                    x={p.x + TOKEN_ART_U / 2 - 3}
                    y={p.y - TOKEN_ART_U / 2 + 7.2}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight="bold"
                    fill="#fff"
                  >
                    {t.count}
                  </text>
                </>
              ) : null}
              <text
                x={p.x}
                y={p.y + TOKEN_ART_U / 2 + 10}
                textAnchor="middle"
                fontSize={10}
                fill={t.kind === 'invader' ? '#711' : '#236'}
              >
                {t.label}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}
