/**
 * P2.4 showcase — the restyled board with the pipeline's emitted art, at real sizes,
 * as ONE self-contained HTML file (art inlined as data URIs; open by double-click).
 *
 * Mirrors Board.tsx's rendering: tokens at 20px (36.7u), organs/entries at 30px (55u),
 * CLASSIC palette, on a representative mid-game demo state. Regenerable at any time from
 * the committed pipeline output:
 *
 *   pnpm art:showcase       -> tools/art-pipeline/showcase/board-with-art.html
 *
 * The output is NOT committed (it is a re-derivable 500KB re-encoding of the committed
 * WebP); the generator is, so the file can never be lost the way a scratch copy can.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = join(HERE, '../../packages/app/public/art');
const OUT_DIR = join(HERE, 'showcase');
const OUT = join(OUT_DIR, 'board-with-art.html');

interface Pt {
  x: number;
  y: number;
}
type StepTable = Record<string, Record<string, Pt>>;

const geo = JSON.parse(
  readFileSync(join(HERE, '../../packages/content/src/board/geometry.json'), 'utf8'),
) as {
  VW: number;
  VH: number;
  HUB: Pt;
  ORGAN_POS: Record<string, Pt>;
  BRANCH: StepTable;
  ROUTE: StepTable;
  ENTRY: Record<string, Pt & { t: string }>;
};
const board = JSON.parse(
  readFileSync(join(HERE, '../../packages/content/src/rules/board.json'), 'utf8'),
) as { LYMPH_GROUP: Record<string, string | null>; LYMPH_STEP: number };
const manifest = JSON.parse(readFileSync(join(ART, 'manifest.json'), 'utf8')) as {
  assets: Record<string, unknown>;
};

const uri = (key: string): string =>
  `data:image/webp;base64,${readFileSync(join(ART, `${key}@3x.webp`)).toString('base64')}`;
const ARTD: Record<string, string> = Object.fromEntries(
  Object.keys(manifest.assets).map((k) => [k, uri(k)]),
);

// Mirrors Board.tsx's CLASSIC constant and art sizes.
const C = {
  paper: '#FFFDF9',
  ink: '#7C6A61',
  inkDark: '#2E2A28',
  route: '#C8877B',
  branch: '#C89A6B',
  branchNodeFill: '#FDF3EC',
  hubFill: '#F7CFC7',
  frame: '#B03A2E',
  lymph: '#1F6F8B',
  lymphNodeFill: '#E6F2F7',
  wash: '#FBEAE5',
  washAlpha: 0.36,
  wLine: 2.2,
  wNode: 1.6,
  wHub: 3.4,
  wLymph: 3.6,
  wBoundary: 1.1,
  lymphDash: '9.9 4.5',
  boundaryDash: '7.2 5.4',
  rNode: 17.1,
  rHub: 50.3,
  rHubInner: 42.3,
  rWash: 248.1,
} as const;
const TOKEN_U = 36.7;
const LARGE_U = 55;

const stepsOf = (t: Record<string, Pt> | undefined): (Pt & { step: number })[] =>
  Object.keys(t ?? {})
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((k) => {
      const p = (t ?? {})[String(k)];
      return p ? [{ step: k, x: p.x, y: p.y }] : [];
    });

// A representative mid-game state: one pathogen per lane at step 2, a macrophage + hidden
// virus pair on the heart branch, the seven cells piled in the hub (the pile is the honest
// pre-stacking state; P2.5 builds the decided stack-with-badge).
const LANE_PATHOGEN: Record<string, string> = {
  nose: 'path-virus',
  contact: 'path-bacteria',
  gut: 'path-worm',
  blood: 'path-malaria',
  wound: 'path-toxin',
  bite: 'path-venom',
};
const HUB_CELLS = ['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil'];

function boardSvg(): string {
  let s = `<rect x="0" y="0" width="${geo.VW}" height="${geo.VH}" fill="${C.paper}"/>`;
  s += `<circle cx="${geo.HUB.x}" cy="${geo.HUB.y}" r="${C.rWash}" fill="${C.wash}" opacity="${C.washAlpha}"/>`;
  s += `<circle cx="${geo.HUB.x}" cy="${geo.HUB.y}" r="${C.rWash}" fill="none" stroke="${C.route}" stroke-width="${C.wBoundary}" stroke-dasharray="${C.boundaryDash}" opacity="${C.washAlpha}"/>`;
  const poly = (pts: Pt[], col: string, w: number, dash?: string): string =>
    `<polyline points="${pts.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  const node = (p: Pt & { step: number }, fill: string, col: string): string =>
    `<circle cx="${p.x}" cy="${p.y}" r="${C.rNode}" fill="${fill}" stroke="${col}" stroke-width="${C.wNode}"/>` +
    `<text x="${p.x}" y="${p.y + 3.5}" text-anchor="middle" font-size="10" fill="${C.ink}">${p.step}</text>`;
  const img = (key: string, x: number, y: number, side: number): string =>
    `<image href="${ARTD[key] ?? ''}" x="${x - side / 2}" y="${y - side / 2}" width="${side}" height="${side}"/>`;

  for (const [lane, t] of Object.entries(geo.ROUTE)) {
    const st = stepsOf(t);
    const entry = geo.ENTRY[lane];
    s += poly([geo.HUB, ...st, ...(entry ? [entry] : [])], C.route, C.wLine);
    const lymphStep = board.LYMPH_GROUP[lane] ? board.LYMPH_STEP : -1;
    for (const p of st)
      s += node(
        p,
        p.step === lymphStep ? C.lymphNodeFill : '#fff',
        p.step === lymphStep ? C.lymph : C.route,
      );
    if (entry) {
      const d = Math.hypot(entry.x - geo.HUB.x, entry.y - geo.HUB.y) || 1;
      const off = LARGE_U / 2 + 12;
      s += img(`entry-${lane}`, entry.x, entry.y, LARGE_U);
      s += `<text x="${entry.x + ((entry.x - geo.HUB.x) / d) * off}" y="${entry.y + ((entry.y - geo.HUB.y) / d) * off + 4}" text-anchor="middle" font-size="13" fill="${C.ink}">${entry.t}</text>`;
    }
  }
  const groups = new Map<string, (Pt & { step: number })[]>();
  for (const [lane, grp] of Object.entries(board.LYMPH_GROUP)) {
    if (typeof grp !== 'string') continue;
    const n = stepsOf(geo.ROUTE[lane]).find((p) => p.step === board.LYMPH_STEP);
    if (!n) continue;
    const list = groups.get(grp) ?? [];
    list.push(n);
    groups.set(grp, list);
  }
  for (const arc of groups.values()) {
    arc.sort(
      (a, b) =>
        Math.atan2(a.y - geo.HUB.y, a.x - geo.HUB.x) - Math.atan2(b.y - geo.HUB.y, b.x - geo.HUB.x),
    );
    if (arc.length >= 2) s += poly(arc, C.lymph, C.wLymph, C.lymphDash);
  }
  for (const [o, t] of Object.entries(geo.BRANCH)) {
    const st = stepsOf(t);
    const pos = geo.ORGAN_POS[o];
    if (!pos) continue;
    s += poly([geo.HUB, ...st, pos], C.branch, C.wLine);
    for (const p of st) s += node(p, C.branchNodeFill, C.branch);
  }
  for (const [o, pos] of Object.entries(geo.ORGAN_POS)) {
    s += img(`organ-${o}`, pos.x, pos.y, LARGE_U);
    s += `<text x="${pos.x}" y="${pos.y - LARGE_U / 2 - 6}" text-anchor="middle" font-size="13" fill="${C.inkDark}">${o}</text>`;
  }
  s += `<circle cx="${geo.HUB.x}" cy="${geo.HUB.y}" r="${C.rHub}" fill="${C.hubFill}" stroke="${C.frame}" stroke-width="${C.wHub}"/>`;
  s += `<circle cx="${geo.HUB.x}" cy="${geo.HUB.y}" r="${C.rHubInner}" fill="none" stroke="${C.frame}" stroke-width="${C.wNode}"/>`;

  let toks = '';
  HUB_CELLS.forEach((ck, i) => {
    toks += img(
      `cell-${ck}`,
      geo.HUB.x + (i - (HUB_CELLS.length - 1) / 2) * 16,
      geo.HUB.y,
      TOKEN_U,
    );
  });
  for (const [lane, key] of Object.entries(LANE_PATHOGEN)) {
    const st = stepsOf(geo.ROUTE[lane]);
    const p = st[Math.min(1, st.length - 1)];
    if (p) toks += img(key, p.x, p.y, TOKEN_U);
  }
  const bs = stepsOf(geo.BRANCH['heart'])[0];
  if (bs) {
    toks += img('cell-macrophage', bs.x - 8, bs.y, TOKEN_U);
    toks += img('path-hidden', bs.x + 8, bs.y, TOKEN_U);
  }
  return `<svg viewBox="0 0 ${geo.VW} ${geo.VH}" xmlns="http://www.w3.org/2000/svg">${s}${toks}</svg>`;
}

const svg = boardSvg();
const html = `<!doctype html>
<meta charset="utf-8">
<title>The board with its art</title>
<style>
  body{background:#efe9e2;color:#2E2A28;font:14px/1.5 system-ui,sans-serif;margin:24px}
  h1{font-size:20px} h2{font-size:16px;margin-top:28px}
  .board{border:1px solid #b0a48f}
  .cap{font-size:12px;color:#6b5d4f;margin:6px 0 0}
</style>
<h1>The Immunity Wars board — P2.4 art wired, real sizes</h1>
<p>Board.tsx's exact rendering: pipeline WebP via the manifest, tokens at 20px (36.7u), organs and
entry icons at 30px (55u), on the CLASSIC A2 board. Demo state: one pathogen per lane at step 2,
macrophage + hidden virus co-located on the heart branch, the seven cells piled in the hub (the
pile is the honest pre-stacking state; P2.5 builds the decided stack-with-badge). Regenerate with
<code>pnpm art:showcase</code>.</p>
<h2>Phone scale — 360px (what a 1× device shows)</h2>
<div class="board" style="width:360px">${svg}</div>
<h2>2× — the same 360 CSS px as a 2× device renders them (720 physical)</h2>
<div class="board" style="width:720px">${svg}</div>
<h2>3× — as a 3× device renders them (1080 physical)</h2>
<div class="board" style="width:1080px">${svg}</div>
`;
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html);
console.log(`wrote ${OUT} (${html.length} bytes)`);
