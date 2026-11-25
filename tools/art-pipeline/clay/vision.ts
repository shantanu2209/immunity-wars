/**
 * A PIECE'S CLASS IS ITS COLOUR, AND NOT EVERY EYE SEES EVERY COLOUR (ruled 25 November 2026,
 * `docs/LOOK_PLAN.md` §34 and §35). The kit's rule since stage L3 is that shape says what kind of
 * thing a piece is and colour says its antigen class, which is what an antibody has to match.
 * Red-green colour blindness is common: about one boy in twelve is the figure usually given, most
 * of them with a milder form than the one simulated here, which is the worst case. So wherever two
 * classes are drawn in ONE shape, the two colours are the only thing that tells them apart, and
 * they must stay two colours to every kind of colour vision.
 *
 * WHAT IS HELD. Each piece's body colour is the one the pipeline already measures from its render.
 * For every kind drawn in more than one class, each pair of its classes is put through a simulation
 * of the three kinds of colour blindness, and the difference between the two colours is required to
 * be at least `APART_MIN` to each, and to full colour vision.
 *
 * THE SIMULATION is Machado, Oliveira and Fernandes, "A Physiologically-based Model for Simulation
 * of Color Vision Deficiency" (IEEE TVCG 2009), at its highest severity, which the authors give as
 * the case of a dichromat. The three matrices below were read against the authors' own table, digit
 * for digit, on 25 November 2026. They are applied to linear RGB, as implementations of the model
 * do; the authors' page does not say which encoding.
 *
 * THE DIFFERENCE is CIE76: the distance between two colours in CIELAB (D65). About 2 is the least an
 * eye can tell between two swatches laid side by side. A piece on a phone is far smaller than a
 * swatch and stands apart from its neighbour, so far more is asked.
 *
 * WHAT IS NOT HELD, said here so that a green run is not read as more than it is:
 *  - Pieces of DIFFERENT shapes. Several come within 3 to 5 of each other to a green-blind eye (a
 *    toxin and a naked virus, say). Their shapes tell them apart, which is the kit's first rule.
 *  - A HIDDEN PATHOGEN. Its piece is one of the body's own cells with something showing through
 *    it, and its class is in what shows through, which the body's colour does not measure. Its
 *    three classes read 3 to 10 apart by this measure with any eyes. Nothing a player can do to a
 *    hidden pathogen depends on its class, and its class is said in words one tap away.
 *  - A coated piece against the same piece uncoated: the coat is drawn, as antibodies on it.
 *  - How the pieces look on a real screen, to a real eye. This is arithmetic on measured colours.
 */

export type Vision = 'full' | 'protan' | 'deutan' | 'tritan';

/** What each is called when a problem is reported. */
export const VISION_NAMES: Record<Vision, string> = {
  full: 'full colour vision',
  protan: 'a red-blind eye (protan)',
  deutan: 'a green-blind eye (deutan)',
  tritan: 'a blue-blind eye (tritan)',
};

/** Machado, Oliveira and Fernandes (2009), severity 1.0; `full` changes nothing. */
const SEEN: Record<Vision, readonly (readonly [number, number, number])[]> = {
  full: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export const VISIONS = Object.keys(SEEN) as Vision[];

/**
 * The least two classes of one shape may differ by, to any kind of colour vision. SET AFTER THE
 * FIRST READING, not before it, and said so: the set as rendered reads 10.7 at its lowest (the two
 * viruses, to a blue-blind eye, the rarest kind), which passes with nothing to spare, and 22 or
 * more to every other eye. Ten is about five times the least difference an eye can tell between two
 * swatches. It is Shantanu's to move.
 */
export const APART_MIN = 10;

/** A kind whose class is not in its body's colour (see the header). */
const CLASS_NOT_IN_THE_BODY = new Set(['hidden']);

const linear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function rgbOf(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`not a colour: ${hex}`);
  return [m[1], m[2], m[3]].map((x) => linear(parseInt(x ?? '0', 16) / 255)) as [
    number,
    number,
    number,
  ];
}

const curve = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

/** A colour as a kind of colour vision sees it, in CIELAB (D65). */
export function seenAs(hex: string, vision: Vision): [number, number, number] {
  const v = rgbOf(hex);
  const [r, g, b] = SEEN[vision].map((row) =>
    Math.min(1, Math.max(0, row[0] * v[0] + row[1] * v[1] + row[2] * v[2])),
  ) as [number, number, number];
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  return [116 * curve(y) - 16, 500 * (curve(x) - curve(y)), 200 * (curve(y) - curve(z))];
}

/** How far apart two colours are to a kind of colour vision (CIE76). */
export function apart(a: string, b: string, vision: Vision): number {
  const p = seenAs(a, vision);
  const q = seenAs(b, vision);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

export interface ShapeReading {
  /** The kind the two pieces share: their shape. */
  kind: string;
  /** The two classes. */
  a: string;
  b: string;
  by: Record<Vision, number>;
}

/**
 * Every pair of classes drawn in one shape, with how far apart their body colours are to each kind
 * of colour vision. `bodies` is each piece's measured body colour by its name, `kind-CLASS`; a
 * coated piece and the piece for a pathogen new to the body are not classes of a shape.
 */
export function sameShapeReadings(bodies: Readonly<Record<string, string>>): ShapeReading[] {
  const byKind = new Map<string, [string, string][]>();
  for (const [name, colour] of Object.entries(bodies)) {
    const m = /^([a-z]+)-([A-Z]+)$/.exec(name);
    if (!m?.[1] || !m[2] || CLASS_NOT_IN_THE_BODY.has(m[1])) continue;
    byKind.set(m[1], [...(byKind.get(m[1]) ?? []), [m[2], colour]]);
  }
  const out: ShapeReading[] = [];
  for (const [kind, classes] of [...byKind].sort(([x], [y]) => x.localeCompare(y))) {
    const sorted = [...classes].sort(([x], [y]) => x.localeCompare(y));
    for (let i = 0; i < sorted.length; i += 1)
      for (let j = i + 1; j < sorted.length; j += 1) {
        const p = sorted[i];
        const q = sorted[j];
        if (!p || !q) continue;
        const by = Object.fromEntries(VISIONS.map((v) => [v, apart(p[1], q[1], v)])) as Record<
          Vision,
          number
        >;
        out.push({ kind, a: p[0], b: q[0], by });
      }
  }
  return out;
}

/** The pairs that some kind of colour vision cannot tell apart, each as a problem to report. */
export function sameShapeProblems(readings: readonly ShapeReading[], min = APART_MIN): string[] {
  const out: string[] = [];
  for (const r of readings)
    for (const v of VISIONS)
      if (r.by[v] < min)
        out.push(
          `TWO CLASSES OF ONE SHAPE CANNOT BE TOLD APART: ${r.kind} ${r.a} and ${r.b} are ${r.by[v].toFixed(1)} apart to ${VISION_NAMES[v]}, and the least allowed is ${String(min)}`,
        );
  return out;
}

/** The lowest reading of all, for the gate's own line: what was held, and how nearly. */
export function lowest(
  readings: readonly ShapeReading[],
): { kind: string; a: string; b: string; vision: Vision; apart: number } | null {
  let low: { kind: string; a: string; b: string; vision: Vision; apart: number } | null = null;
  for (const r of readings)
    for (const v of VISIONS)
      if (!low || r.by[v] < low.apart)
        low = { kind: r.kind, a: r.a, b: r.b, vision: v, apart: r.by[v] };
  return low;
}
