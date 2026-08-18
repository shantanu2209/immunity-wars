/**
 * THE DASHBOARD'S CAVEATS, EACH MADE TO FIRE.
 *
 * The page is the one artefact of this project that people outside it will read. Every caveat on it
 * is built into the renderer rather than appended, for the reason `tests/balance/src/metrics.ts`
 * gives: a caveat in a document travels separately from the number it qualifies, and a caveat in
 * the renderer cannot.
 *
 * "Built in" is a claim, so each is tested twice: that it appears, and — the half that matters —
 * that a page missing it FAILS the same check. A test asserting only that a string is present
 * passes just as happily when the string is present for some unrelated reason.
 */

import { describe, expect, it } from 'vitest';

import { loadManifest } from '@immunity-wars/ci/matrix';
import { RECONCILIATION } from '@immunity-wars/manifest/schema';

import { provenance, qualifier, reported, FORBIDDEN_LABELS } from './reported.js';
import {
  ageHours,
  headlineStatus,
  MIN_TREND_POINTS,
  renderDashboard,
  renderTrend,
  type DashboardInput,
  type SizeFigure,
  type SuiteRow,
} from './render.js';

const NOW = new Date('2026-08-18T12:00:00Z');
const manifest = loadManifest();

const prov = {
  generator: 'reference bot',
  generatorVersion: 'v1',
  scale: '2,000 games on normal',
  commit: 'abc1234',
  measuredAt: '2026-08-18T04:00:00Z',
  caveat: null,
};

const row = (over: Partial<SuiteRow> = {}): SuiteRow => ({
  id: 'property',
  title: 'Property / invariant suite',
  status: 'pass',
  detail: '33 assertions',
  doesNotProve: 'Coverage of the engine — it checks eight claims.',
  ranAt: '2026-08-18T11:00:00Z',
  ...over,
});

const input = (over: Partial<DashboardInput> = {}): DashboardInput => ({
  manifest,
  commit: 'abc1234',
  builtAt: '2026-08-18T12:00:00Z',
  perPush: { status: 'pass', at: '2026-08-18T11:00:00Z' },
  nightly: { status: 'pass', at: '2026-08-18T04:00:00Z' },
  rows: [row()],
  coverage: reported('95.66% of coverable branch arms', {
    ...prov,
    generator: 'coverage gate',
    scale: '1,381 coverable arms',
  }),
  sizes: [
    {
      label: 'Median mid-game state, Hard',
      value: reported('21,812 chars', { ...prov, scale: '57,723 states' }),
      censoring: 'The reference bot dies at turn 8.6 of a 45-turn Hard game — 19% of the window.',
    },
  ],
  trends: [],
  ...over,
});

describe('the reconciliation sentence', () => {
  it('is rendered verbatim, not paraphrased', () => {
    const html = renderDashboard(input(), NOW);
    // Rendered through the same HTML escaping the page uses, so this compares what a reader sees.
    const escaped = RECONCILIATION.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    expect(html).toContain(escaped);
  });

  it('CONTROL: a page missing it fails this check', () => {
    const html = renderDashboard(input(), NOW).replace(RECONCILIATION, 'All tests pass.');
    const escaped = RECONCILIATION.replace(/&/g, '&amp;');
    expect(html).not.toContain(escaped);
  });

  it('carries the three clauses most likely to be softened', () => {
    const html = renderDashboard(input(), NOW);
    expect(html).toContain('There is no unit suite');
    expect(html).toContain('AGREEMENT and not CORRECTNESS');
    expect(html).toContain('bug-for-bug port is green');
  });
});

describe('the per-push meaning, generated from the manifest', () => {
  it('states what a green run does not mean, and names the nightly scales', () => {
    const html = renderDashboard(input(), NOW);
    expect(html).toContain('does NOT mean');
    expect(html).toContain('run nightly');
    expect(html).toContain('none of it measures difficulty');
  });

  /** It must come from the manifest, not from a string in the renderer. */
  it('CONTROL: it tracks the manifest rather than a hardcoded string', () => {
    const mutated = structuredClone(manifest) as typeof manifest;
    const corpus = mutated.suites.find((s) => s.id === 'equivalence-corpus');
    if (corpus?.tiers.nightly) (corpus.tiers.nightly as { scale: string }).scale = '9,999 games';
    const html = renderDashboard(
      input({ manifest: mutated, rows: [row({ title: 'Equivalence corpus' })] }),
      NOW,
    );
    expect(html).toContain('9,999 games');
  });
});

describe('a missing result', () => {
  it('renders RED and says what a missing result means', () => {
    const html = renderDashboard(input({ rows: [row({ status: 'missing' })] }), NOW);
    expect(html).toContain('NO RESULT');
    expect(html).toContain('That is not a pass');
  });

  /** The headline must follow the worst row — a missing suite cannot leave the page green. */
  it('CONTROL: a missing suite is never omitted, and drags the headline down', () => {
    expect(headlineStatus([row(), row({ id: 'x', status: 'missing' })])).toBe('missing');
    expect(headlineStatus([row(), row({ id: 'x', status: 'fail' })])).toBe('fail');
    expect(headlineStatus([row(), row({ id: 'x' })])).toBe('pass');

    const html = renderDashboard(
      input({ rows: [row(), row({ id: 'x', status: 'missing' })] }),
      NOW,
    );
    expect(html).toContain('INCOMPLETE');
    expect(html).not.toContain('>Green<');
  });
});

describe('size figures', () => {
  it('render the censoring row adjacent, and call the figure a floor', () => {
    const html = renderDashboard(input(), NOW);
    expect(html).toContain('This is a floor, not an estimate');
    expect(html).toContain('dies at turn 8.6');
  });

  /**
   * CONTROL: the censoring text must sit in the SAME block as the figure. A floor separated from
   * the reason it is a floor becomes, in a reader's head, an estimate.
   */
  it('CONTROL: the censoring row sits with the figure, not in a footnote', () => {
    const html = renderDashboard(input(), NOW);
    const block = html.slice(html.indexOf('21,812 chars'));
    const censorAt = block.indexOf('This is a floor');
    expect(censorAt).toBeGreaterThan(-1);
    // Within the same card: a few hundred characters, not at the bottom of the page.
    expect(censorAt).toBeLessThan(400);
  });
});

describe('trends', () => {
  const pts = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ at: `2026-08-${10 + i}`, value: 10 + i }));

  it('refuses to draw a line below three points, and says how many it has', () => {
    for (const n of [0, 1, 2]) {
      const html = renderTrend({ label: 'x', points: pts(n), qualifierLine: 'q' });
      expect(html).toContain('Insufficient history');
      expect(html).toContain(`${n} point`);
      expect(html, `drew a line from ${n} points`).not.toContain('<polyline');
    }
  });

  it('draws one at three or more', () => {
    const html = renderTrend({ label: 'x', points: pts(MIN_TREND_POINTS), qualifierLine: 'q' });
    expect(html).toContain('<polyline');
    expect(html).not.toContain('Insufficient history');
  });

  it('every trend carries its qualifier line', () => {
    const html = renderTrend({
      label: 'x',
      points: pts(5),
      qualifierLine: 'under reference bot v1',
    });
    expect(html).toContain('under reference bot v1');
  });
});

describe('staleness', () => {
  it('is always stated, even when fresh', () => {
    expect(renderDashboard(input(), NOW)).toContain('nightly tier ran');
  });

  it('CONTROL: old and never-run data are called out', () => {
    const old = renderDashboard(
      input({ nightly: { status: 'pass', at: '2026-08-01T04:00:00Z' } }),
      NOW,
    );
    expect(old).toContain('days ago');
    expect(old).toContain('stale');

    const never = renderDashboard(input({ nightly: { status: 'missing', at: null } }), NOW);
    expect(never).toContain('never reported');
  });

  it('ageHours handles absent and malformed timestamps', () => {
    expect(ageHours(null, NOW)).toBeNull();
    expect(ageHours('not a date', NOW)).toBeNull();
    expect(ageHours('2026-08-18T11:00:00Z', NOW)).toBeCloseTo(1, 5);
  });
});

/**
 * THE COMPILE-TIME HALF, asserted at compile time.
 *
 * `@ts-expect-error` is a real check, not a comment: if the expression below ever stops being an
 * error — because someone widened a signature to accept a bare figure — then `tsc` fails on the
 * unused directive. So this file goes red when the constraint is loosened, which no runtime test
 * could do.
 *
 * This is the difference between "renderers take Reported<T>" as a convention and as a guarantee.
 */
describe('a bare figure cannot be rendered', () => {
  it('is a type error to publish a number without its conditions', () => {
    const withBareCoverage = (): DashboardInput => ({
      ...input(),
      // @ts-expect-error a bare string has no provenance and must not be renderable
      coverage: '95.66%',
    });
    // The assertion is the directive above; this keeps the value used so lint stays quiet.
    expect(typeof withBareCoverage).toBe('function');
  });

  it('is a type error to publish a size figure without its censoring row', () => {
    // The return annotation is what makes the directive load-bearing: without it the literal's
    // type is merely inferred and nothing checks the missing field.
    const withoutCensoring = (): SizeFigure => ({
      label: 'Median mid-game state',
      value: reported('21,812 chars', prov),
      // @ts-expect-error `censoring` is required — a size figure without it is not a floor
      censoring: undefined,
    });
    expect(typeof withoutCensoring).toBe('function');
  });
});

describe('provenance is required, at both compile time and run time', () => {
  /**
   * The compile-time half is the type signature: `renderDashboard` takes `Reported<string>` for
   * every figure, so a bare number is a type error and never reaches here. What this file can test
   * is the run-time half, which exists because a JSON round-trip produces `""` and TypeScript
   * cannot see it.
   */
  it('CONTROL: a blank provenance field is rejected', () => {
    for (const field of ['generator', 'generatorVersion', 'scale', 'commit', 'measuredAt']) {
      expect(
        () => provenance({ ...prov, [field]: '' }),
        `${field} was allowed to be blank — a blank qualifier reads as no qualifier`,
      ).toThrow(new RegExp(field));
      expect(() => provenance({ ...prov, [field]: '   ' })).toThrow();
    }
  });

  it('the qualifier always names the generator and its version', () => {
    expect(qualifier(prov)).toContain('reference bot v1');
    expect(qualifier({ ...prov, caveat: 'a floor' })).toContain('a floor');
  });

  it('every rendered figure carries a qualifier', () => {
    const html = renderDashboard(input(), NOW);
    expect(html).toContain('under reference bot v1');
    expect(html).toContain('under coverage gate v1');
  });
});

describe('the naming discipline the harness enforces', () => {
  /**
   * `winRateUnderReferenceBot` exists so a value pasted into a slide drags its condition along in
   * its own field name. Publishing "win rate: 0.0%" would undo that, which is why the dashboard
   * inherits the constraint rather than trusting the page author.
   */
  it('never renders an unqualified win rate', () => {
    const html = renderDashboard(input(), NOW).toLowerCase();
    for (const label of FORBIDDEN_LABELS) {
      expect(html, `the page renders "${label}" unqualified`).not.toContain(`${label}:`);
      expect(html).not.toContain(`>${label}<`);
    }
  });

  it('CONTROL: the check would catch one if it appeared', () => {
    const bad = `${renderDashboard(input(), NOW)}<p>win rate: 0.0%</p>`.toLowerCase();
    expect(FORBIDDEN_LABELS.some((l) => bad.includes(`${l}:`))).toBe(true);
  });
});
