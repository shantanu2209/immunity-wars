/**
 * The history series, and the three rules that keep a figure honest once it becomes a dot.
 *
 * Pure functions, separated from `build.ts` so they can be tested. The bug that forced this split
 * is `mostRecentWith`: reading every figure off the newest record made the state-size section
 * VANISH the moment a CI night arrived without size data in it. Nothing failed, the page simply
 * stopped showing a measurement — and a figure that disappears looks like one that was never
 * taken, which is worse than one that is merely stale.
 */

export interface HistoryRecord {
  readonly at: string;
  readonly commit: string;
  /** 'ci' when a workflow measured it; 'local' for the seeded Task E / F0 figures. */
  readonly source?: 'ci' | 'local';
  readonly sourceNote?: string;
  readonly coveragePct?: number;
  readonly balance?: Record<string, Record<string, number>>;
  readonly sizeMedianChars?: Record<string, number>;
}

/**
 * Seeded records first, then CI records, sorted chronologically.
 *
 * Seeds keep `source: 'local'` and CI records default to `'ci'`, so provenance survives the merge.
 * Sorting matters because the two arrive from different places — a seed from 12 August must not
 * appear after a CI record from 19 August just because it was read second.
 */
export function mergeHistory(
  seeded: readonly HistoryRecord[],
  fromCi: readonly HistoryRecord[],
): HistoryRecord[] {
  const all = [
    ...seeded.map((r) => ({ ...r, source: 'local' as const })),
    ...fromCi.map((r) => ({ source: 'ci' as const, ...r })),
  ];
  return all.sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * The most recent record that actually CARRIES a field — not simply the newest record.
 *
 * Different jobs contribute different fields: the nightly records coverage, while the size figures
 * come only from the seeded run. Reading everything off the last record therefore drops any figure
 * the newest record happens not to include.
 */
export function mostRecentWith<K extends keyof HistoryRecord>(
  history: readonly HistoryRecord[],
  field: K,
): HistoryRecord | undefined {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const h = history[i];
    if (h && h[field] !== undefined) return h;
  }
  return undefined;
}

/**
 * The warning a series carries when it is not purely CI-measured.
 *
 * Two distinct facts, deliberately worded differently because they send a reader to different
 * places. A series that MIXES sources is a note about history. A series whose NEWEST point is
 * local means CI has never measured this metric at all — that is a gap in the pipeline, and the
 * series cannot grow until someone closes it.
 */
export function provenanceWarning(points: readonly HistoryRecord[]): string | null {
  if (points.length === 0) return null;
  const locals = points.filter((h) => h.source === 'local');
  if (locals.length === 0) return null;

  const newest = points[points.length - 1];
  if (newest?.source === 'local') {
    return (
      'NOT MEASURED BY CI. Every point here was measured on a developer machine — the newest is ' +
      `${newest.sourceNote ?? 'a local run'}. CI does not yet record this metric, so the series ` +
      'cannot grow until it does.'
    );
  }
  return (
    `${locals.length} of ${points.length} points were measured locally, before CI existed, ` +
    'and are not CI measurements.'
  );
}
