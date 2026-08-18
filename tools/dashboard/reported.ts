/**
 * ============================================================================================
 * A FIGURE CANNOT LEAVE THIS DASHBOARD WITHOUT THE CONDITIONS THAT PRODUCED IT.
 * ============================================================================================
 *
 * This is `tests/balance/src/metrics.ts`'s reporting constraint, applied to the published page.
 * The rule there, and here:
 *
 *   > A caveat in a document travels separately from the number it qualifies.
 *   > A caveat in the RENDERER does not: a figure cannot be produced without it.
 *
 * These are the first numbers from this project that will be read outside the repository — by
 * judges, by funders, by anyone Kartik shows the page to. A reader who takes a bot-conditional
 * figure as a statement about human play draws a false conclusion, and the bot wins ~0% on Normal
 * where humans win essentially every game (`docs/FINDINGS.md` #1).
 *
 * SO THE CAVEAT IS ENFORCED TWICE, at two different times, because neither catch is sufficient:
 *
 *   1. COMPILE TIME. Every render function takes `Reported<T>`, never a bare `number` or `string`.
 *      Passing a naked figure is a type error, so the failure happens while writing the code
 *      rather than while reading the page.
 *
 *   2. RUN TIME. `provenance()` throws on an empty field. TypeScript cannot see a JSON round-trip:
 *      a result file with `"generator": ""` satisfies every type and would render a figure with a
 *      blank qualifier, which reads as no qualifier at all.
 *
 * `render.test.ts` carries a control for each, because a constraint that has never rejected
 * anything is not known to constrain.
 */

/** Where a figure came from. Every published number carries one; there is no constructor without. */
export interface Provenance {
  /** What produced the figure — "reference bot", "coverage gate", "CI". Never blank. */
  readonly generator: string;
  /** That generator's version. `v1` matters: the bot will change and old figures must not merge. */
  readonly generatorVersion: string;
  /** How much was measured — "2,000 games on normal", "1,381 coverable arms". */
  readonly scale: string;
  /** The commit the figure describes. */
  readonly commit: string;
  /** When it was measured, ISO. Drives the staleness banner. */
  readonly measuredAt: string;
  /**
   * A caveat that MUST be shown beside the figure, or `null` when the figure genuinely has none.
   *
   * `null` is deliberately not the default — it has to be typed, so "this number needs no caveat"
   * is a decision someone made rather than a field they forgot.
   */
  readonly caveat: string | null;
}

/** A value that cannot be rendered without its conditions. */
export interface Reported<T> {
  readonly value: T;
  readonly provenance: Provenance;
}

const REQUIRED = ['generator', 'generatorVersion', 'scale', 'commit', 'measuredAt'] as const;

/**
 * Build a provenance, rejecting a blank field.
 *
 * The blank check is not defensive padding. A result file is JSON produced by another job, and JSON
 * is exactly where a required field becomes `""` without anyone noticing: TypeScript checks the
 * shape at compile time and the file is read at run time, so the type system never sees it. This is
 * the same gap `Zod at every trust boundary` exists to close, and a dashboard is a trust boundary
 * — it publishes.
 */
export function provenance(p: Provenance): Provenance {
  for (const field of REQUIRED) {
    const v = p[field];
    if (typeof v !== 'string' || v.trim().length === 0) {
      throw new Error(
        `provenance.${field} is empty. A figure cannot be published without the conditions that ` +
          'produced it — see tools/dashboard/reported.ts. This is not a formatting problem: a ' +
          'blank qualifier reads to a viewer as no qualifier at all.',
      );
    }
  }
  return p;
}

/** Attach conditions to a value. The only way to make something renderable. */
export function reported<T>(value: T, p: Provenance): Reported<T> {
  return { value, provenance: provenance(p) };
}

/**
 * The qualifier line rendered beneath every figure.
 *
 * Always includes the generator and its version, because "win rate 0.5%" and "win rate 0.5% under
 * the reference bot v1" are different claims and only the second is true.
 */
export function qualifier(p: Provenance): string {
  const base = `under ${p.generator} ${p.generatorVersion}, ${p.scale}`;
  return p.caveat ? `${base} — ${p.caveat}` : base;
}

/**
 * Names that must never appear on the page unqualified.
 *
 * `winRate` is the one that matters: the panel deliberately has no such field, only
 * `winRateUnderReferenceBot`, so that a value pasted into a slide drags its condition along in its
 * own field name (`docs/FINDINGS.md` #1 and #6). The dashboard inherits that constraint —
 * publishing "win rate: 0.0%" would undo the naming discipline the harness enforces.
 */
export const FORBIDDEN_LABELS = ['win rate', 'winRate', 'success rate'] as const;
