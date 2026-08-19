import { defineConfig } from 'vitest/config';

/**
 * SUITE-LEVEL TIME BUDGET, declared rather than inherited — `docs/FINDINGS.md` #43, fifth
 * entry point, and the one the ruling PREDICTED. When the first four budgets landed, the
 * recorded reasoning was that per-test values would "leave the siblings to cross 5s later on a
 * 4-core CI runner, looking like a new and unrelated problem." This suite was the sibling: every
 * local run on a 20-core i7-12700F stayed under the 5,000ms default, so it got no budget — and
 * PR #21's first CI run failed exactly here, exactly that way.
 *
 * THE BASELINE, so whoever finds this slow later has a measurement rather than a bare number.
 * Observed 19 Aug 2026 under vitest 4.1.11:
 *
 *   a full game through LocalSession, step for step    5,769ms   GitHub-hosted 4-core runner
 *                                                      (red in one CI run, green in the other —
 *                                                       a race at the exact boundary)
 *   same test locally                                  under 5s  20-core i7-12700F
 *
 * 60s is ~10x the CI observation — the same headroom philosophy as the sibling suites: room for
 * a slow runner, not slack for an accidental quadratic. A replayed game hitting a minute of
 * compute has changed, and should fail.
 */
export default defineConfig({
  test: {
    testTimeout: 60_000,
  },
});
