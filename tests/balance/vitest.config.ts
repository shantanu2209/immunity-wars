import { defineConfig } from 'vitest/config';

/**
 * SUITE-LEVEL TIME BUDGET, declared rather than inherited — `docs/FINDINGS.md` #43.
 *
 * These tests do real computation: the E2 controls calibrate on 1,600 simulated games per
 * difficulty and judge mutated engines against the result. The 5,000ms default was never their
 * real ceiling — vitest 2 simply never enforced `testTimeout` against a synchronous test, so the
 * limit was fictional until vitest 3 made it real (retroactively: the tests still run to
 * completion and their assertions still hold; only the elapsed-time verdict changed).
 *
 * Suite-level and not per-test, by ruling: per-test values would fix the two tests that failed
 * and leave their siblings to cross 5s later on a slower machine, looking like a new and
 * unrelated problem. The budget states the truth about the whole suite.
 *
 * THE BASELINE, so whoever finds this slow later has a measurement rather than a bare number.
 * Observed 19 Aug 2026 on a 20-core i7-12700F under vitest 3.2.7, across two runs:
 *
 *   blind-spot control (2nd calibration + two mutant arms)   11.5s and 13.3s   the slowest
 *   baseline held-out arm (pays the normal calibration)       7.6s
 *   remaining E2 detection controls                           1.4–1.9s each
 *   fidelity controls (the siblings the ruling covers)        up to 2.8s
 *
 * 60s is ~4.5x the slowest observation — headroom for a 4-core CI runner, not slack for an
 * accidental quadratic. A test hitting 60s of compute has changed, and should fail.
 */
export default defineConfig({
  test: {
    testTimeout: 60_000,
  },
});
