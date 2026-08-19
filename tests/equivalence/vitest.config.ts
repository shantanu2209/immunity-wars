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
