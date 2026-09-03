/**
 * Regenerates `packages/content/src/board/geometry.json` from the physical A2 board.
 *
 * The A2 PDFs (July 2026) were produced by a Python script that is LOST — the PDFs are the
 * only surviving record of the board Kartik presents, and they are vector, so the layout is
 * fully recoverable from their drawing operators. This tool is that recovery, kept in the
 * repository so the board's generator can never be lost again (that lesson has now been paid
 * for once). FINDINGS #49 is the record of the divergence this closes.
 *
 * What it reads from `Immunity_Wars_BOARD_A2.pdf` (CLASSIC; COLOUR shares the skeleton):
 *   - the hub (largest circle, #F7CFC7 fill)
 *   - 6 route lines (#C8877B) and 7 branch lines (#C89A6B) — straight segments
 *   - 28 route step nodes (23 white-filled + 5 lymph nodes, #E6F2F7 fill at LYMPH_STEP)
 *   - 20 branch step nodes (#FDF3EC fill)
 *   - 7 organ boxes (#8E6E53-stroked rounded rects)
 *   - 20 integrity dots (#2E2A28-filled, r≈6pt) → CHIP_POS centroids
 *   - entry/organ text labels, to name each lane
 *
 * Conventions preserved from the engine's existing geometry (verified before writing):
 *   - ROUTE steps number 1..len ASCENDING from the hub; ENTRY is the line's outer endpoint
 *   - BRANCH steps number 1 at the ORGAN side, increasing toward the hub
 *   - step counts must equal rules/board.json (ROUTES.len / ORGANS.branch); this tool asserts
 *     it and the content schema's parity check re-verifies independently at every load
 *
 * Usage:
 *   pnpm geometry:from-a2                 regenerate geometry.json
 *   pnpm geometry:from-a2 --dry           print the JSON and report, write nothing
 *   pnpm geometry:from-a2 --control       negative control: perturb the expected counts and
 *                                         REQUIRE the count assertion to fire (exit 0 iff it did)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const PDF = join(HERE, 'Immunity_Wars_BOARD_A2.pdf');
const GEOMETRY_OUT = join(HERE, '../../packages/content/src/board/geometry.json');
const BOARD_RULES = join(HERE, '../../packages/content/src/rules/board.json');

const DRY = process.argv.includes('--dry');
const CONTROL = process.argv.includes('--control');

/** Output canvas: width is fixed by convention; height derives from the print's aspect. */
const VW = 660;
/** Margin (output units) reserved around the content for labels drawn outside entry points. */
const MARGIN = 30;

interface Pt {
  x: number;
  y: number;
}
interface Circle extends Pt {
  r: number;
  fill: string | null;
  stroke: string | null;
}
interface Seg {
  a: Pt;
  b: Pt;
  stroke: string | null;
  dashed: boolean;
}
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string | null;
}

// ---------------------------------------------------------------------------
// 1. PDF content-stream extraction
// ---------------------------------------------------------------------------

function inflateStreams(buf: Buffer): string[] {
  const streams: string[] = [];
  let i = 0;
  for (;;) {
    const s = buf.indexOf('stream', i);
    if (s === -1) break;
    let ds = s + 6;
    if (buf[ds] === 13) ds++;
    if (buf[ds] === 10) ds++;
    const e = buf.indexOf('endstream', ds);
    if (e === -1) break;
    try {
      streams.push(inflateSync(buf.subarray(ds, e)).toString('latin1'));
    } catch {
      /* raster data etc. — not a Flate text stream */
    }
    i = e + 9;
  }
  return streams;
}

const hex = (r: string, g: string, b: string): string =>
  '#' +
  [r, g, b]
    .map((v) =>
      Math.round(parseFloat(v) * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase(),
    )
    .join('');

function extractPrimitives(streams: string[]): { circles: Circle[]; segs: Seg[]; boxes: Box[] } {
  const circles: Circle[] = [];
  const segs: Seg[] = [];
  const boxes: Box[] = [];
  for (const st of streams) {
    const toks = st.match(
      /(?:[\d.-]+\s+){1,6}(?:m|l|c|re|w|RG|rg)\b|\[[^\]]*\]\s*[\d.]+\s*d\b|\b(?:S|s|f|F|B|b|h)\b/g,
    );
    if (!toks) continue;
    let fill: string | null = null;
    let stroke: string | null = null;
    let dashed = false;
    let path: { x: number; y: number; op: string }[] = [];
    let closed = false;
    let subpaths: { pts: typeof path; closed: boolean }[] = [];
    const endSubpath = (): void => {
      if (path.length > 1) subpaths.push({ pts: path, closed });
      path = [];
      closed = false;
    };
    const paint = (): void => {
      endSubpath();
      for (const sp of subpaths) classify(sp.pts, sp.closed);
      subpaths = [];
    };
    const classify = (pts: typeof path, isClosed: boolean): void => {
      if (pts.length === 2 && pts[0].op === 'm' && pts[1].op === 'l') {
        segs.push({
          a: { x: pts[0].x, y: pts[0].y },
          b: { x: pts[1].x, y: pts[1].y },
          stroke,
          dashed,
        });
        return;
      }
      const curves = pts.filter((p) => p.op === 'c').length;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const w = Math.max(...xs) - Math.min(...xs);
      const h = Math.max(...ys) - Math.min(...ys);
      if (curves === 4 && pts[0].op === 'm' && Math.abs(w - h) < 1) {
        circles.push({
          x: Math.min(...xs) + w / 2,
          y: Math.min(...ys) + h / 2,
          r: w / 2,
          fill,
          stroke,
        });
        return;
      }
      if (isClosed && pts.length >= 8) {
        boxes.push({ x: Math.min(...xs), y: Math.min(...ys), w, h, stroke });
      }
    };
    for (const t of toks) {
      const parts = t.trim().split(/\s+/);
      const op = parts[parts.length - 1];
      if (op === 'RG') stroke = hex(parts[0], parts[1], parts[2]);
      else if (op === 'rg') fill = hex(parts[0], parts[1], parts[2]);
      else if (op === 'd') dashed = !/\[\s*\]/.test(t);
      else if (op === 'm') {
        endSubpath();
        path.push({ x: +parts[0], y: +parts[1], op: 'm' });
      } else if (op === 'l') path.push({ x: +parts[0], y: +parts[1], op: 'l' });
      else if (op === 'c') path.push({ x: +parts[4], y: +parts[5], op: 'c' });
      else if (op === 'h') closed = true;
      else if (/^[SsfFBb]$/.test(op)) paint();
    }
  }
  return { circles, segs, boxes };
}

/** Text runs with their positions (Tm sets, Td/TD accumulate). */
function extractLabels(streams: string[]): { text: string; x: number; y: number }[] {
  const out: { text: string; x: number; y: number }[] = [];
  for (const st of streams) {
    let x = 0;
    let y = 0;
    // The TJ-array branch's fallback excludes BOTH parens: with only ']' excluded, a '(…)'
    // string could be consumed either by the string alternative or character by character,
    // which is exponential backtracking (CodeQL js/redos, PR #29). Output byte-identical —
    // verified by regenerating geometry.json over the committed PDF after the change.
    const toks = st.match(
      /(?:[\d.-]+ ){6}Tm|(?:[\d.-]+ ){2}T[dD]|\[(?:\((?:[^()\\]|\\.)*\)|[^\]()])*\]\s*TJ|\((?:[^()\\]|\\.)*\)\s*Tj/g,
    );
    if (!toks) continue;
    for (const t of toks) {
      if (t.endsWith('Tm')) {
        const p = t.trim().split(/\s+/);
        x = +p[4];
        y = +p[5];
      } else if (/T[dD]$/.test(t)) {
        const p = t.trim().split(/\s+/);
        x += +p[0];
        y += +p[1];
      } else {
        const parts = [...t.matchAll(/\(((?:[^()\\]|\\.)*)\)/g)].map((m) =>
          m[1].replace(/\\([()\\])/g, '$1'),
        );
        const text = parts.join('');
        if (text) out.push({ text, x, y });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. Reconstruction in print space
// ---------------------------------------------------------------------------

const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Distance from point p to segment ab. */
function segDist(p: Pt, s: Seg): number {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const len2 = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / len2));
  return dist(p, { x: s.a.x + t * dx, y: s.a.y + t * dy });
}

function main(): void {
  const streams = inflateStreams(readFileSync(PDF));
  const { circles, segs, boxes } = extractPrimitives(streams);
  const labels = extractLabels(streams);

  const rules = JSON.parse(readFileSync(BOARD_RULES, 'utf8')) as {
    ORGANS: Record<string, { branch: number }>;
    ROUTES: Record<string, { len: number }>;
  };
  const current = JSON.parse(readFileSync(GEOMETRY_OUT, 'utf8')) as {
    ENTRY: Record<string, { x: number; y: number; t: string }>;
    ORGAN_POS: Record<string, Pt>;
    ROUTE: Record<string, Record<string, Pt>>;
  };

  const expectedRoute: Record<string, number> = Object.fromEntries(
    Object.entries(rules.ROUTES).map(([k, v]) => [k, v.len]),
  );
  const expectedBranch: Record<string, number> = Object.fromEntries(
    Object.entries(rules.ORGANS).map(([k, v]) => [k, v.branch]),
  );
  if (CONTROL) {
    // Negative control: a wrong expectation MUST make the count assertion fire.
    expectedBranch['heart'] = expectedBranch['heart'] + 1;
  }

  // The hub is the single biggest circle on the board.
  const hub = circles.reduce((a, b) => (b.r > a.r ? b : a));

  // Lane lines by colour. The two #C8877B lymph arrowhead strokes are lines too, but tiny —
  // lane lines are the long ones.
  const routeLines = segs.filter(
    (s) => s.stroke === '#C8877B' && !s.dashed && dist(s.a, s.b) > 100,
  );
  const branchLines = segs.filter(
    (s) => s.stroke === '#C89A6B' && !s.dashed && dist(s.a, s.b) > 100,
  );
  if (routeLines.length !== 6 || branchLines.length !== 7) {
    throw new Error(
      `expected 6 route + 7 branch lines, got ${routeLines.length}+${branchLines.length}`,
    );
  }

  // Node circles. Route steps are white OR lymph-blue filled; branch steps are #FDF3EC.
  // All step nodes share one radius (~27pt); the integrity dots (~6pt) must not match.
  const nodeR = 20; // pt, lower bound separating step nodes from integrity dots
  const routeNodes = circles.filter(
    (c) => c.r > nodeR && (c.fill === '#FFFFFF' || c.fill === '#E6F2F7') && c.stroke !== '#B03A2E',
  );
  const branchNodes = circles.filter((c) => c.r > nodeR && c.fill === '#FDF3EC');
  const chipDots = circles.filter((c) => c.r < 10 && c.fill === '#2E2A28');

  // Organ boxes: the seven #8E6E53-stroked rounded rects.
  const organBoxes = boxes.filter((b) => b.stroke === '#8E6E53');
  if (organBoxes.length !== 7) throw new Error(`expected 7 organ boxes, got ${organBoxes.length}`);

  // Name the lanes from the printed labels.
  const entryNames: Record<string, string> = {
    NOSE: 'nose',
    CONTACT: 'contact',
    GUT: 'gut',
    BLOOD: 'blood',
    WOUND: 'wound',
    BITE: 'bite',
  };
  const organNames: Record<string, string> = {
    BRAIN: 'brain',
    LUNGS: 'lungs',
    HEART: 'heart',
    LIVER: 'liver',
    SPLEEN: 'spleen',
    KIDNEYS: 'kidneys',
    BONEMARROW: 'marrow',
  };
  const labelPos = (names: Record<string, string>): Record<string, Pt> => {
    const out: Record<string, Pt> = {};
    for (const l of labels) {
      const key = names[l.text];
      if (key && !(key in out)) out[key] = { x: l.x, y: l.y };
    }
    return out;
  };
  const entryLabels = labelPos(entryNames);
  const organLabels = labelPos(organNames);
  for (const k of Object.values(entryNames))
    if (!entryLabels[k]) throw new Error(`entry label ${k} not found`);
  for (const k of Object.values(organNames))
    if (!organLabels[k]) throw new Error(`organ label ${k} not found`);

  // Each lane line's outer end is the end farther from the hub.
  const outerEnd = (s: Seg): Pt => (dist(s.a, hub) > dist(s.b, hub) ? s.a : s.b);

  // Route lanes: match each label to the nearest line's outer end.
  const routeOf: Record<string, Seg> = {};
  for (const [key, lp] of Object.entries(entryLabels)) {
    const line = routeLines.reduce((a, b) =>
      dist(outerEnd(b), lp) < dist(outerEnd(a), lp) ? b : a,
    );
    routeOf[key] = line;
  }
  const organOf: Record<string, Box> = {};
  for (const [key, lp] of Object.entries(organLabels)) {
    const box = organBoxes.reduce((a, b) => {
      const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      return dist(cb, lp) < dist(ca, lp) ? b : a;
    });
    organOf[key] = box;
  }
  const branchOf: Record<string, Seg> = {};
  for (const [key, box] of Object.entries(organOf)) {
    const c = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    branchOf[key] = branchLines.reduce((a, b) =>
      dist(outerEnd(b), c) < dist(outerEnd(a), c) ? b : a,
    );
  }
  // Lane assignments must be bijections — a shared line means labels matched wrongly.
  if (new Set(Object.values(routeOf)).size !== 6)
    throw new Error('route label→line assignment collided');
  if (new Set(Object.values(branchOf)).size !== 7)
    throw new Error('branch label→line assignment collided');

  // Assign nodes to their nearest lane line, then order by hub distance.
  const nodesOn = (nodes: Circle[], lanes: Record<string, Seg>): Record<string, Pt[]> => {
    const out: Record<string, Pt[]> = Object.fromEntries(Object.keys(lanes).map((k) => [k, []]));
    for (const n of nodes) {
      let best: string | null = null;
      let bestD = Infinity;
      for (const [k, s] of Object.entries(lanes)) {
        const d = segDist(n, s);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
      if (best !== null && bestD < 30) out[best].push({ x: n.x, y: n.y });
    }
    for (const list of Object.values(out)) list.sort((a, b) => dist(a, hub) - dist(b, hub));
    return out;
  };
  const routeSteps = nodesOn(routeNodes, routeOf); // ascending from hub = step 1..len
  const branchSteps = nodesOn(branchNodes, branchOf); // will be reversed: step 1 is organ-side

  // THE COUNT ASSERTION — the extraction must reproduce the rules' board exactly.
  const countErrors: string[] = [];
  for (const [k, n] of Object.entries(expectedRoute)) {
    if ((routeSteps[k] ?? []).length !== n)
      countErrors.push(`route ${k}: extracted ${(routeSteps[k] ?? []).length}, rules say ${n}`);
  }
  for (const [k, n] of Object.entries(expectedBranch)) {
    if ((branchSteps[k] ?? []).length !== n)
      countErrors.push(`branch ${k}: extracted ${(branchSteps[k] ?? []).length}, rules say ${n}`);
  }
  if (CONTROL) {
    if (countErrors.length === 0) {
      console.error('CONTROL FAILED: perturbed expectation did not fire the count assertion');
      process.exit(1);
    }
    console.log(`CONTROL PASS: perturbed expectation fired as required — ${countErrors[0]}`);
    process.exit(0);
  }
  if (countErrors.length > 0)
    throw new Error('count assertion fired:\n  ' + countErrors.join('\n  '));

  // CHIP_POS: centroid of the integrity dots nearest each organ box.
  const chipsFor: Record<string, Pt[]> = Object.fromEntries(
    Object.keys(organOf).map((k) => [k, []]),
  );
  for (const d of chipDots) {
    let best: string | null = null;
    let bestD = Infinity;
    for (const [k, box] of Object.entries(organOf)) {
      const c = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
      const dd = dist(d, c);
      if (dd < bestD) {
        bestD = dd;
        best = k;
      }
    }
    if (best !== null) chipsFor[best].push(d);
  }
  for (const [k, list] of Object.entries(chipsFor)) {
    if (list.length === 0) throw new Error(`no integrity dots found for ${k}`);
  }

  // ---------------------------------------------------------------------------
  // 3. RADIALIZE — the A2 supplies each lane's ANGLE and the lane order; the screen
  //    supplies the symmetry (Shantanu, 20 Aug 2026; FINDINGS #49's relaxation makes the
  //    geometry free to change for screen reasons, and the next print inherits this).
  //
  //    The board becomes a true radial figure on a square canvas, hub centred. EVERY
  //    PLAYABLE SLOT SITS FULLY INSIDE the play circle (R_PLAY) — including the ORGAN
  //    TISSUE slot (engine branch step 0, where residents patrol and attackers stand),
  //    which is ORGAN_POS at R_TISSUE: node edge 222 + 17.1 < 242. Ruled 20 Aug 2026
  //    after the first radial cut put it ON the circle. ENTRY stays ON the circle: it is
  //    a line endpoint, not a slot — nothing ever occupies an entry point. Icons OUTSIDE
  //    the circle are annotations the renderer places by angle, not geometry.
  //
  //    Radii are chosen against measured floors, not taste:
  //      - adjacent-lane nodes must clear the ~34.2u node diameter: organs sit 25° apart,
  //        so the innermost branch ring at 111 gives chord 2*111*sin(12.5deg) = 48 >= 36.7;
  //        routes sit 30° apart, so their innermost ring needs R >= 71 -> 75.
  //      - within a lane, the binding spacings are the len-5 routes (224-75)/4 = 37.25u
  //        and the 3-step branches (185-111)/2 = 37u, both >= the 36.7u (20px) token
  //        floor; tissue<->step-1 = 222-185 = 37u likewise. Shorter lanes stretch across
  //        the same span, as on the print.
  // ---------------------------------------------------------------------------
  const VH = VW; // square canvas, radial figure
  const CENTER: Pt = { x: VW / 2, y: VH / 2 };
  const R0_ROUTE = 75;
  const R0_BRANCH = 111;
  const R_STEPEND_ROUTE = 224;
  const R_STEPEND_BRANCH = 185; // step 1, adjacent to the tissue slot
  const R_TISSUE = 222; // ORGAN_POS: the organ tissue slot, fully inside the circle
  const R_PLAY = 242;

  const angleOf = (lane: Seg): number => {
    const e = outerEnd(lane);
    return Math.atan2(e.y - hub.y, e.x - hub.x);
  };
  const at = (theta: number, r: number): Pt => ({
    x: Math.round((CENTER.x + r * Math.cos(theta)) * 10) / 10,
    y: Math.round((CENTER.y + r * Math.sin(theta)) * 10) / 10,
  });

  /** Steps 1..n evenly spaced along [rInner, R_STEPEND]; `organSide` numbers 1 outermost. */
  const radialSteps = (
    theta: number,
    n: number,
    rInner: number,
    organSide: boolean,
  ): Record<string, Pt> => {
    const out: Record<string, Pt> = {};
    for (let k = 1; k <= n; k++) {
      const frac = n === 1 ? 1 : (k - 1) / (n - 1);
      const rEnd = organSide ? R_STEPEND_BRANCH : R_STEPEND_ROUTE;
      const r = organSide ? rEnd - frac * (rEnd - rInner) : rInner + frac * (rEnd - rInner);
      out[String(k)] = at(theta, r);
    }
    return out;
  };

  // Preserve the current file's key orders so the diff reads as movement, not churn.
  const routeOrder = Object.keys(current.ROUTE);
  const organOrder = Object.keys(current.ORGAN_POS);
  const ordered = <T>(order: string[], obj: Record<string, T>): Record<string, T> =>
    Object.fromEntries(order.map((k) => [k, obj[k]]));

  // Note: chipsFor validated above (every organ has integrity dots on the print) but the
  // radial CHIP_POS is a derived annotation anchor, not an extracted position.
  const routeAngle: Record<string, number> = Object.fromEntries(
    Object.entries(routeOf).map(([k, s]) => [k, angleOf(s)]),
  );
  const organAngle: Record<string, number> = Object.fromEntries(
    Object.entries(branchOf).map(([k, s]) => [k, angleOf(s)]),
  );

  const geometry = {
    VW,
    VH,
    HUB: CENTER,
    ORGAN_POS: ordered(
      organOrder,
      Object.fromEntries(organOrder.map((k) => [k, at(organAngle[k] ?? 0, R_TISSUE)])),
    ),
    CHIP_POS: ordered(
      organOrder,
      Object.fromEntries(organOrder.map((k) => [k, at(organAngle[k] ?? 0, R_PLAY + 40)])),
    ),
    BRANCH: ordered(
      organOrder,
      Object.fromEntries(
        organOrder.map((k) => [
          k,
          radialSteps(organAngle[k] ?? 0, (branchSteps[k] ?? []).length, R0_BRANCH, true),
        ]),
      ),
    ),
    ROUTE: ordered(
      routeOrder,
      Object.fromEntries(
        routeOrder.map((k) => [
          k,
          radialSteps(routeAngle[k] ?? 0, (routeSteps[k] ?? []).length, R0_ROUTE, false),
        ]),
      ),
    ),
    ENTRY: ordered(
      routeOrder,
      Object.fromEntries(
        routeOrder.map((k) => [
          k,
          { ...at(routeAngle[k] ?? 0, R_PLAY), t: current.ENTRY[k]?.t ?? k },
        ]),
      ),
    ),
  };

  // ---------------------------------------------------------------------------
  // 4. Report — the numbers Board.tsx's authored constants derive from
  // ---------------------------------------------------------------------------
  let minSpace = Infinity;
  const spacePts: Pt[] = [geometry.HUB, ...Object.values(geometry.ORGAN_POS)];
  for (const t of [...Object.values(geometry.ROUTE), ...Object.values(geometry.BRANCH)])
    spacePts.push(...Object.values(t));
  for (let i = 0; i < spacePts.length; i++)
    for (let j = i + 1; j < spacePts.length; j++) {
      const d = dist(spacePts[i], spacePts[j]);
      if (d > 0 && d < minSpace) minSpace = d;
    }

  console.log(
    `radial canvas ${VW}x${VH}, hub (${CENTER.x},${CENTER.y}) · rings: routes ${R0_ROUTE}..${R_STEPEND_ROUTE}, ` +
      `branches ${R0_BRANCH}..${R_STEPEND_BRANCH} · play circle R_PLAY ${R_PLAY}`,
  );
  console.log(
    `min node spacing: ${minSpace.toFixed(1)}u = ${((minSpace * 360) / VW).toFixed(1)}px at 360px`,
  );
  const ang = (p: Pt): number =>
    (Math.atan2(p.y - geometry.HUB.y, p.x - geometry.HUB.x) * 180) / Math.PI;
  console.log(
    'entry angles:',
    Object.entries(geometry.ENTRY)
      .map(([k, e]) => `${k}:${ang(e).toFixed(0)}`)
      .join(' '),
  );
  console.log(
    'organ angles:',
    Object.entries(geometry.ORGAN_POS)
      .map(([k, p]) => `${k}:${ang(p).toFixed(0)}`)
      .join(' '),
  );

  const json = JSON.stringify(geometry, null, 2) + '\n';
  if (DRY) {
    console.log(json);
  } else {
    writeFileSync(GEOMETRY_OUT, json);
    console.log(`\nwrote ${GEOMETRY_OUT}`);
  }
}

main();
