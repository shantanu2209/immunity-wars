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
 * 120s is ~4.6x the slowest observation — the same headroom ratio as tests/balance, for the
 * same reason: a 4-core CI runner, not slack for an accidental quadratic. A test hitting two
 * minutes of compute has changed, and should fail.
 */
export default defineConfig({
  test: {
    testTimeout: 120_000,
  },
});
