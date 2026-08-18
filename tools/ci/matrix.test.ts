/**
 * The matrix generator, and the drift it exists to prevent.
 *
 * A tier list written into a workflow is a second copy of what `tests/suites.json` already says.
 * Two copies drift, and the drift is SILENT: a suite gains a nightly tier, nobody edits the YAML,
 * and it never runs at night. Nothing goes red, because a job that does not exist cannot fail.
 *
 * These tests hold the generator to the manifest, and the last one holds the "does not prove"
 * sentence to it too — the sentence goes on the dashboard, and a hand-written one would be right
 * on the day it was typed and wrong the first time a scale changed.
 */

import { describe, expect, it } from 'vitest';

import { groupedMatrix, jobIdFor, loadManifest, matrixFor, perPushMeaning } from './matrix.js';

const manifest = loadManifest();

describe('the CI job matrix', () => {
  it('emits a job for every suite declaring the tier, and no others', () => {
    for (const tier of ['per-push', 'nightly', 'manual'] as const) {
      const expected = manifest.suites.filter((s) => s.tiers[tier]).map((s) => s.id);
      expect(matrixFor(manifest, tier).map((e) => e.id)).toEqual(expected);
    }
  });

  it('carries the command, scale and result file each job needs', () => {
    const entries = matrixFor(manifest, 'per-push');
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.command.length).toBeGreaterThan(0);
      expect(e.scale.length).toBeGreaterThan(0);
      expect(e.resultFile).toMatch(/^results\//);
      expect(e.approxSeconds).toBeGreaterThan(0);
    }
  });

  /**
   * The per-push tier is what a merge waits on, so an empty one would mean branch protection
   * guarding nothing. The CLI exits 2 on this; here it is asserted against the shipped manifest.
   */
  it('the per-push tier is not empty', () => {
    expect(matrixFor(manifest, 'per-push').length).toBeGreaterThan(0);
  });

  /** `manual` never appears in an automated tier — metrics-run.ts overwrites its own reference. */
  it('keeps the recalibration out of both automated tiers', () => {
    const automated = [...matrixFor(manifest, 'per-push'), ...matrixFor(manifest, 'nightly')];
    for (const e of automated) {
      expect(e.command, 'metrics-run.ts is scheduled — it OVERWRITES bands.json').not.toContain(
        'metrics-run.ts',
      );
    }
    expect(matrixFor(manifest, 'manual').some((e) => e.command.includes('metrics-run.ts'))).toBe(
      true,
    );
  });
});

describe('grouping jobs by command', () => {
  it('emits one job per distinct command, not one per suite', () => {
    const groups = groupedMatrix(manifest, 'per-push');
    const commands = groups.map((g) => g.command);
    expect(new Set(commands).size, 'a command was duplicated across jobs').toBe(commands.length);
    // Three suites share `pnpm test`; running it three times would triple the tightest budget
    // in the tier design for no extra coverage.
    expect(groups.length).toBeLessThan(matrixFor(manifest, 'per-push').length);
  });

  /**
   * THE PROPERTY THAT MATTERS: grouping must not lose a suite. A job that quietly covers fewer
   * suites than the manifest declares would leave a row on the dashboard with no result — which
   * renders red, but for a reason nobody could diagnose.
   */
  it('covers every suite in the tier, exactly once, across all groups', () => {
    for (const tier of ['per-push', 'nightly'] as const) {
      const expected = matrixFor(manifest, tier)
        .map((e) => e.id)
        .sort();
      const covered = groupedMatrix(manifest, tier)
        .flatMap((g) => g.suiteIds)
        .sort();
      expect(covered, `${tier}: grouping lost or duplicated a suite`).toEqual(expected);
    }
  });

  it('carries a result file for every suite it covers', () => {
    for (const g of groupedMatrix(manifest, 'per-push')) {
      expect(g.resultFiles.length).toBe(g.suiteIds.length);
    }
  });

  it('gives each job a stable id derived from its command', () => {
    expect(jobIdFor('pnpm test')).toBe('test');
    expect(jobIdFor('pnpm test:balance')).toBe('test-balance');
    expect(jobIdFor('npx tsx tests/equivalence/full-corpus.ts')).toBe('full-corpus');
    // Ids feed the aggregate gate's expected list, so they must be unique per tier.
    const ids = groupedMatrix(manifest, 'per-push').map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /** A group is blocking if any suite in it is. Merging must never downgrade a gate. */
  it('never downgrades a blocking suite by grouping it with a non-blocking one', () => {
    for (const g of groupedMatrix(manifest, 'per-push')) {
      const anyBlocking = matrixFor(manifest, 'per-push')
        .filter((e) => g.suiteIds.includes(e.id))
        .some((e) => e.blocking);
      expect(g.blocking).toBe(anyBlocking);
    }
  });
});

describe('the per-push meaning, generated from the manifest', () => {
  const meaning = perPushMeaning(manifest);

  it('lists every suite the per-push tier actually ran', () => {
    const titles = manifest.suites.filter((s) => s.tiers['per-push']).map((s) => s.title);
    expect(meaning.ran.map((r) => r.title)).toEqual(titles);
  });

  /**
   * The comparison that carries the meaning: for any suite with a larger nightly tier, the
   * per-push scale is shown against it. "The tests passed" and "210 of 2,000 games passed"
   * license different conclusions and only the second is true of a per-push run.
   */
  it('shows the nightly scale beside the per-push scale, where one exists', () => {
    const withNightly = meaning.ran.filter((r) => r.ofNightly !== null);
    expect(withNightly.length, 'no suite reports its nightly scale').toBeGreaterThan(0);
    for (const r of withNightly) expect(r.ofNightly?.length ?? 0).toBeGreaterThan(0);
  });

  it('names the suites that are only fully exercised nightly', () => {
    expect(meaning.doesNotProve).toContain('equivalence corpus');
    expect(meaning.doesNotProve).toContain('run nightly');
    expect(meaning.doesNotProve).toContain('strict subset');
  });

  /**
   * The clause that is not about tiers at all, and the one most likely to be dropped as editorial.
   * It is not editorial: FINDINGS #1 and the balance README exist because a green build reads as a
   * statement about the game to anyone who has not read them.
   */
  it('keeps the clause that none of it measures difficulty', () => {
    expect(meaning.doesNotProve).toContain('none of it measures difficulty');
    expect(meaning.doesNotProve).toContain('whether the game is any good');
  });

  /**
   * CONTROL: the sentence must be DERIVED, not stored. Change a scale in a copy of the manifest
   * and the text must follow. If this ever passes with a hardcoded string, the sentence has
   * stopped tracking what ran.
   */
  it('CONTROL: changing a tier scale changes the generated text', () => {
    const mutated = structuredClone(manifest) as typeof manifest;
    const corpus = mutated.suites.find((s) => s.id === 'equivalence-corpus');
    const nightly = corpus?.tiers.nightly;
    if (nightly) {
      (nightly as { scale: string }).scale = '9,999 recorded games';
    }
    const after = perPushMeaning(mutated);
    expect(after.ran.find((r) => r.title === 'Equivalence corpus')?.ofNightly).toBe(
      '9,999 recorded games',
    );
    expect(after.ran.find((r) => r.title === 'Equivalence corpus')?.ofNightly).not.toBe(
      meaning.ran.find((r) => r.title === 'Equivalence corpus')?.ofNightly,
    );
  });
});
