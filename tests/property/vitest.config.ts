import { defineConfig } from 'vitest/config';

/**
 * SUITE-LEVEL TIME BUDGET, declared rather than inherited — `docs/FINDINGS.md` #43, second
 * instance. Same mechanism as `tests/balance`: vitest 2 never enforced `testTimeout` against a
 * synchronous test, so the 5,000ms default was fictional until vitest 3 made it real. The tests
 * ran to completion and their assertions held; only the elapsed-time verdict changed.
 *
 * This suite was hidden behind the first instance: turbo cancels queued tasks on the first
 * failure, so the run that found `tests/balance` red never executed this package at all.
 *
 * Suite-level and not per-test, by the same ruling: these tests play full games — 120
 * fast-check runs in the seeded property, 36 + 18 fixed-seed games in the others — and the L2
 * runner controls sit at 2.4–3.7s, which would cross 5s on a slower machine anyway.
 *
 * THE BASELINE, so whoever finds this slow later has a measurement rather than a bare number.
 * Observed 19 Aug 2026 on a 20-core i7-12700F under vitest 3.2.7:
 *
 *   holds across randomly seeded games (120 fc runs)          25.8s   the slowest
 *   per-difficulty sweep (36 games)                           11.5s
 *   non-vacuity counts (18 games)                              5.5s
 *   L2 runner controls                                        2.4–3.7s
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
