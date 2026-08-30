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
const BOARD_FONT = "'Trebuchet MS', 'Segoe UI', Verdana, system-ui, sans-serif";
const rules = JSON.parse(
  readFileSync(join(HERE, '../../packages/content/src/rules/board.json'), 'utf8'),
) as {
  ORGANS: Record<string, { name?: string }>;
  ROUTES: Record<string, { name?: string }>;
  LYMPH_GROUP: Record<string, string | null>;
  LYMPH_STEP: number;
};
const R_PLAY = Math.max(
  ...[...Object.values(geo.ENTRY), ...Object.values(geo.ORGAN_POS)].map((p) =>
    Math.hypot(p.x - geo.HUB.x, p.y - geo.HUB.y),
  ),
);
function place(anchor: Pt, key: string): { icon: Pt; label: Pt } {
  const dx = anchor.x - geo.HUB.x;
  const dy = anchor.y - geo.HUB.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const asset = (manifest.assets as Record<string, { content?: { w?: number; h?: number } }>)[key];
  const cw = asset?.content?.w ?? 1;
  const ch = asset?.content?.h ?? 1;
  const ext = ((Math.abs(ux) * cw + Math.abs(uy) * ch) / 2) * LARGE_U;
  const iconDist = R_PLAY + 8 + ext; // off the play circle, not the anchor (tissue is inside)
  const labelDist = iconDist + ext + 14;
  return {
    icon: { x: geo.HUB.x + ux * iconDist, y: geo.HUB.y + uy * iconDist },
    label: { x: geo.HUB.x + ux * labelDist, y: geo.HUB.y + uy * labelDist + 4 },
  };
}

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
  s += `<circle cx="${geo.HUB.x}" cy="${geo.HUB.y}" r="${R_PLAY}" fill="${C.wash}" opacity="${C.washAlpha}"/>`;
  s += `<circle cx="${geo.HUB.x}" cy="${geo.HUB.y}" r="${R_PLAY}" fill="none" stroke="${C.route}" stroke-width="${C.wBoundary}" stroke-dasharray="${C.boundaryDash}" opacity="${C.washAlpha}"/>`;
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
      const p = place(entry, `entry-${lane}`);
      s += img(`entry-${lane}`, p.icon.x, p.icon.y, LARGE_U);
      s += `<text x="${p.label.x}" y="${p.label.y}" text-anchor="middle" font-size="13" fill="${C.ink}">${rules.ROUTES[lane]?.name ?? lane}</text>`;
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
    // The line STOPS at the tissue slot — terminal node, no tail past it.
    s += poly([geo.HUB, ...st, pos], C.branch, C.wLine);
    for (const p of st) s += node(p, C.branchNodeFill, C.branch);
  }
  for (const [o, pos] of Object.entries(geo.ORGAN_POS)) {
    s += `<circle cx="${pos.x}" cy="${pos.y}" r="${C.rNode}" fill="${C.branchNodeFill}" stroke="#8E6E53" stroke-width="${C.wNode}"/>`;
    s += `<text x="${pos.x}" y="${pos.y + 3.5}" text-anchor="middle" font-size="10" fill="${C.ink}">0</text>`;
    const p = place(pos, `organ-${o}`);
    s += img(`organ-${o}`, p.icon.x, p.icon.y, LARGE_U);
    s += `<text x="${p.label.x}" y="${p.label.y}" text-anchor="middle" font-size="13" fill="${C.inkDark}">${rules.ORGANS[o]?.name ?? o}</text>`;
  }
  s += `<circle cx="${geo.HUB.x}" cy="${geo.HUB.y}" r="${C.rHub}" fill="${C.hubFill}" stroke="${C.frame}" stroke-width="${C.wHub}"/>`;
  s += `<circle cx="${geo.HUB.x}" cy="${geo.HUB.y}" r="${C.rHubInner}" fill="none" stroke="${C.frame}" stroke-width="${C.wNode}"/>`;
  s += `<text x="${geo.HUB.x}" y="${geo.HUB.y + 3.5}" text-anchor="middle" font-size="10" fill="${C.ink}">0</text>`;

  let toks = '';
  // Resident macrophages: one per organ, patrolling at the tissue slot (step 0), macrophage
  // art with an organ-brown ring — as Board.tsx renders them.
  for (const pos of Object.values(geo.ORGAN_POS)) {
    toks += `<circle cx="${pos.x}" cy="${pos.y}" r="${TOKEN_U / 2 + 2}" fill="none" stroke="#8E6E53" stroke-width="2.5"/>`;
    toks += img('cell-macrophage', pos.x, pos.y, TOKEN_U);
  }
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
  // STACK MOCK-UP (question 9): the proposed stack-with-badge, drawn so the badge design can
  // be judged before P2.5 builds it. One token shows (the top of the stack); the badge counts
  // the whole stack. Nose step 4: three viruses. Gut step 3: a worm and a bacterium.
  const badge = (x: number, y: number, n: number): string =>
    `<circle cx="${x + TOKEN_U / 2 - 3}" cy="${y - TOKEN_U / 2 + 3}" r="10" fill="${C.frame}" stroke="#fff" stroke-width="1.6"/>` +
    `<text x="${x + TOKEN_U / 2 - 3}" y="${y - TOKEN_U / 2 + 7.2}" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff">${n}</text>`;
  const noseStack = stepsOf(geo.ROUTE['nose']).find((p) => p.step === 4);
  if (noseStack) {
    toks += img('path-virus', noseStack.x, noseStack.y, TOKEN_U);
    toks += badge(noseStack.x, noseStack.y, 3);
  }
  const gutStack = stepsOf(geo.ROUTE['gut']).find((p) => p.step === 3);
  if (gutStack) {
    toks += img('path-worm', gutStack.x, gutStack.y, TOKEN_U);
    toks += badge(gutStack.x, gutStack.y, 2);
  }
  return `<svg viewBox="0 0 ${geo.VW} ${geo.VH}" xmlns="http://www.w3.org/2000/svg" style="font-family:${BOARD_FONT.replace(/"/g, '')}">${s}${toks}</svg>`;
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
<p>Board.tsx's exact rendering on the RADIAL geometry: lanes stop at the play circle, organ and
entry icons are annotations outside it (spaced by their content edge, labels on the far side,
names from the rules tables), tokens at 20px, icons at 30px. Demo state: one pathogen per lane
at step 2, macrophage + hidden virus co-located on the heart branch, the seven cells piled in
the hub (stack-with-badge replaces the pile at P2.5). <b>Stack mock-ups for judging the badge:
3 viruses on Nose step 4, 2 mixed invaders on Gut step 3.</b> Regenerate with
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
