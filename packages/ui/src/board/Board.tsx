/**
 * P2.2 steps 3–5 — the board, rendered from geometry and a PLAIN `ViewState`.
 *
 * The prop is deliberately the raw projection and not `SessionView`: the same component must
 * render the authoritative view (`sessionView.game`) and a burst frame's `frame.view`, so it
 * takes the one shape both carry. Clickability never comes from a frame — this component has no
 * interaction at all; the dev shell drives the game and hands views in.
 *
 * MEASURABLE, NOT BEAUTIFUL (PHASE2_BRIEF §2). Every number authored here is a stroke width, a
 * radius, or a fan-out offset — rendering necessities. Layout comes entirely from
 * `./geometry`, which reads `geometry.json` through content's validated loader. Anything worth
 * deciding visually is in docs/for-P2.5.md, untouched.
 */

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

export function Board({ view }: { view: ViewState }): ReactElement {
  const invaders = (view['invaders'] as Invaderish[] | undefined) ?? [];
  const cells = (view['cells'] as Record<string, Cellish> | undefined) ?? {};
  const organs = (view['organs'] as Record<string, Organish> | undefined) ?? {};

  // Group everything standing on the board by its resolved position, so co-located tokens fan.
  const tokens: { key: string; label: string; kind: 'invader' | 'cell'; pos: Pt }[] = [];
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
    if (pos) tokens.push({ key: `cell-${ck}`, label: ck.slice(0, 4), kind: 'cell', pos });
  }
  const byNode = new Map<string, typeof tokens>();
  for (const t of tokens) {
    const k = `${t.pos.x}:${t.pos.y}`;
    const list = byNode.get(k) ?? [];
    list.push(t);
    byNode.set(k, list);
  }

  return (
    <svg viewBox={VIEWBOX} style={{ width: '100%', maxWidth: 660, display: 'block' }}>
      {/* routes: hub -> steps -> entry */}
      {LANES.map((lane) => {
        const stepsOf = routeSteps(lane);
        const entry = entryOf(lane);
        const run: Pt[] = [HUB_POS, ...stepsOf, ...(entry ? [entry] : [])];
        return (
          <g key={lane}>
            <polyline points={polyPoints(run)} fill="none" stroke="#999" strokeWidth={2} />
            {stepsOf.map((p) => (
              <circle key={p.step} cx={p.x} cy={p.y} r={7} fill="#fff" stroke="#999" />
            ))}
            {entry ? (
              <text x={entry.x} y={entry.y - 10} textAnchor="middle" fontSize={13} fill="#555">
                {entry.t}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* organ branches: hub -> steps -> organ */}
      {BOARD_ORGANS.map((o) => {
        const stepsOf = branchSteps(o);
        const pos = organPos(o);
        if (!pos) return null;
        const run: Pt[] = [HUB_POS, ...stepsOf, pos];
        const hp = Number((organs[o] ?? {}).hp ?? 0);
        return (
          <g key={o}>
            <polyline points={polyPoints(run)} fill="none" stroke="#bbb" strokeWidth={2} />
            {stepsOf.map((p) => (
              <circle key={p.step} cx={p.x} cy={p.y} r={7} fill="#fff" stroke="#bbb" />
            ))}
            <circle cx={pos.x} cy={pos.y} r={17} fill="#eee" stroke="#777" strokeWidth={2} />
            <text x={pos.x} y={pos.y - 22} textAnchor="middle" fontSize={13} fill="#333">
              {o}
            </text>
            <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize={12} fill="#333">
              {hp}
            </text>
          </g>
        );
      })}

      {/* the bloodstream hub */}
      <circle cx={HUB_POS.x} cy={HUB_POS.y} r={12} fill="#ddd" stroke="#555" strokeWidth={2} />

      {/* tokens, fanned per node */}
      {[...byNode.values()].map((list) =>
        list.map((t, i) => {
          const p = fan(t.pos, i, list.length);
          return (
            <g key={t.key}>
              <circle
                cx={p.x}
                cy={p.y}
                r={9}
                fill={t.kind === 'invader' ? '#b33' : '#fff'}
                stroke={t.kind === 'invader' ? '#711' : '#236'}
                strokeWidth={2}
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
