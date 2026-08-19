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
 * RESIZED to 300s the same day, when CI falsified the first sizing: the budgets were sized
 * from 20-core SOLO observations, and the binding environment is a 4-core CI runner executing
 * the whole workspace concurrently — where the B4b fuzzer stretched to 65.1s (6x its solo
 * time) and the balance blind-spot control to 50.5s, red in one run and green in the other.
 * 300s is ~4.5-6x the worst CI-concurrent observation: still far below any hang, and wall
 * clock under contention is what vitest actually measures. A test at five minutes has changed
 * or hung, and should fail.
 */
export default defineConfig({
  test: {
    testTimeout: 300_000,
  },
});
