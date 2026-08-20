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

import { LYMPH_GROUP, LYMPH_STEP } from '@immunity-wars/content';
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
 * CLASSIC palette and stroke weights, extracted from the physical A2 board
 * (Immunity_Wars_BOARD_A2.pdf, vector ops read directly — P2.4 restyle, 20 Aug 2026).
 * Widths were authored in mm on a 1190.55pt-wide A2 page; converted to viewBox units at
 * 660u / 1190.55pt = 0.5543 u/pt. Colours are exact; widths are the print's, rescaled.
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
  wLine: 1.89, // 3.40pt (1.2mm) — route and branch lines
  wNode: 1.41, // 2.55pt (0.9mm) — step-node rings
  wOrgan: 2.67, // 4.82pt (1.7mm) — organ boxes
  wHub: 2.99, // 5.39pt (1.9mm)
  wLymph: 3.14, // 5.67pt (2.0mm)
  lymphDash: '8.6 3.9', // print dash [15.59 7.09]pt, rescaled
} as const;

/**
 * Lymphatic arcs: one dashed connector per LYMPH_GROUP, through the LYMPH_STEP node of each
 * member route — both facts from content, so the UI hardcodes no lane grouping. Members are
 * ordered by angle around the hub so the connector does not zigzag; that ordering is
 * derivation, not design (arc shape and labelling are for-P2.5.md).
 */
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
  hp?: unknown;
  maxhp?: unknown;
}

interface Cellish extends Located {
  alive?: unknown;
}

interface Organish {
  hp?: unknown;
}

/** Fan tokens sharing one node out horizontally so each stays visible. Rendering necessity. */
const fan = (p: Pt, i: number, n: number): Pt =>
  n <= 1 ? p : { x: p.x + (i - (n - 1) / 2) * 16, y: p.y };

export function Board({
  view,
  selectedCell = null,
  onCellClick,
}: {
  view: ViewState;
  /** The cell whose selection the view carries — P2.3's real tap renders as a highlight. */
  selectedCell?: string | null;
  /** Wired by the shell to `session.setSelection`; absent means a non-interactive board. */
  onCellClick?: (cell: string) => void;
}): ReactElement {
  const invaders = (view['invaders'] as Invaderish[] | undefined) ?? [];
  const cells = (view['cells'] as Record<string, Cellish> | undefined) ?? {};
  const organs = (view['organs'] as Record<string, Organish> | undefined) ?? {};

  // Group everything standing on the board by its resolved position, so co-located tokens fan.
  const tokens: {
    key: string;
    label: string;
    kind: 'invader' | 'cell';
    pos: Pt;
    cell?: string;
  }[] = [];
  invaders.forEach((iv, i) => {
    const pos = tokenPos(iv);
    if (pos) {
      tokens.push({
        key: `iv-${String(iv.id ?? i)}`,
        label: String(iv.disease ?? '?').slice(0, 6),
        kind: 'invader',
        pos,
      });
    }
  });
  for (const [ck, c] of Object.entries(cells)) {
    const pos = tokenPos(c);
    if (pos) tokens.push({ key: `cell-${ck}`, label: ck.slice(0, 4), kind: 'cell', pos, cell: ck });
  }
  const byNode = new Map<string, typeof tokens>();
  for (const t of tokens) {
    const k = `${t.pos.x}:${t.pos.y}`;
    const list = byNode.get(k) ?? [];
    list.push(t);
    byNode.set(k, list);
  }

  return (
    <svg
      viewBox={VIEWBOX}
      style={{ width: '100%', maxWidth: 660, display: 'block', background: CLASSIC.paper }}
    >
      {/* routes: hub -> steps -> entry */}
      {LANES.map((lane) => {
        const stepsOf = routeSteps(lane);
        const entry = entryOf(lane);
        const run: Pt[] = [HUB_POS, ...stepsOf, ...(entry ? [entry] : [])];
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
                  r={7}
                  fill="#fff"
                  stroke={CLASSIC.route}
                  strokeWidth={CLASSIC.wNode}
                />
                <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize={8} fill={CLASSIC.ink}>
                  {p.step}
                </text>
              </g>
            ))}
            {entry ? (
              <text
                x={entry.x}
                y={entry.y - 10}
                textAnchor="middle"
                fontSize={13}
                fill={CLASSIC.ink}
              >
                {entry.t}
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

      {/* organ branches: hub -> steps -> organ */}
      {BOARD_ORGANS.map((o) => {
        const stepsOf = branchSteps(o);
        const pos = organPos(o);
        if (!pos) return null;
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
                  r={7}
                  fill={CLASSIC.branchNodeFill}
                  stroke={CLASSIC.branch}
                  strokeWidth={CLASSIC.wNode}
                />
                <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize={8} fill={CLASSIC.ink}>
                  {p.step}
                </text>
              </g>
            ))}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={17}
              fill="#fff"
              stroke={CLASSIC.organ}
              strokeWidth={CLASSIC.wOrgan}
            />
            <text x={pos.x} y={pos.y - 22} textAnchor="middle" fontSize={13} fill={CLASSIC.inkDark}>
              {o}
            </text>
            <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize={12} fill={CLASSIC.ink}>
              {hp}
            </text>
          </g>
        );
      })}

      {/* the bloodstream hub */}
      <circle
        cx={HUB_POS.x}
        cy={HUB_POS.y}
        r={12}
        fill={CLASSIC.hubFill}
        stroke={CLASSIC.frame}
        strokeWidth={CLASSIC.wHub}
      />

      {/* tokens, fanned per node */}
      {[...byNode.values()].map((list) =>
        list.map((t, i) => {
          const p = fan(t.pos, i, list.length);
          const selected = t.cell !== undefined && t.cell === selectedCell;
          return (
            <g
              key={t.key}
              data-cell={t.cell}
              onClick={t.cell && onCellClick ? () => onCellClick(t.cell as string) : undefined}
              style={t.cell && onCellClick ? { cursor: 'pointer' } : undefined}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={selected ? 11 : 9}
                fill={t.kind === 'invader' ? '#b33' : '#fff'}
                stroke={selected ? '#e80' : t.kind === 'invader' ? '#711' : '#236'}
                strokeWidth={selected ? 4 : 2}
              />
              <text
                x={p.x}
                y={p.y + 18}
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
