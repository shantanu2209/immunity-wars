import { defineConfig } from 'vitest/config';

/**
 * SUITE-LEVEL TIME BUDGET, declared rather than inherited — `docs/FINDINGS.md` #43, third
 * instance. Same mechanism as `tests/balance` and `tests/property`: vitest 2 never enforced
 * `testTimeout` against a synchronous test, so the 5,000ms default was fictional until vitest 3
 * made it real. The tests ran to completion and their assertions held; only the elapsed-time
 * verdict changed.
 *
 * This package is the instructive instance. `spread.test.ts` and `simulate.test.ts` declare
 * per-test timeouts (120s–600s) and sailed through the upgrade — an 81.6s corpus run passed
 * while a 7s fuzzer failed, because the corpus authors declared their budget and the B4
 * fuzzers in `actions.test.ts` inherited a default that was never real. Declared budgets
 * survived the instrument change; inherited ones did not.
 *
 * This default covers the undeclared tests. The existing per-test declarations are LARGER and
 * override it per vitest's precedence, so nothing here loosens them.
 *
 * THE BASELINE, so whoever finds this slow later has a measurement rather than a bare number.
 * Observed 19 Aug 2026 on a 20-core i7-12700F under vitest 3.2.7, package run alone:
 *
 *   B4b movement/B-cell fuzzer                                10.9s   the slowest undeclared
 *   B4c combat fuzzer                                          7.1s
 *   B4d residents fuzzer                                       7.0s
 *   rig smoke batch / B3 viewState projection                  3.6–4.5s
 *
 * 60s is ~5.5x the slowest undeclared observation — headroom for a 4-core CI runner, not slack
 * for an accidental quadratic. A fuzzer hitting 60s of compute has changed, and should fail.
 */
export default defineConfig({
  test: {
    testTimeout: 60_000,
  },
});
