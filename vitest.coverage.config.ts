import { defineConfig } from 'vitest/config';

/**
 * Coverage configuration for the Task B gate (docs/TASK_B_PLAN.md §1.5).
 *
 * Measures `packages/engine/src` and `packages/content/src` — the things being proven — never
 * the rig that proves them.
 *
 * TASK C2 ADDED CONTENT, and not as bookkeeping. The pack loader and its Zod schemas are new
 * CODE with real failure paths. Left outside `coverage.include`, they would have been invisible
 * to the gate: the percentage would have stayed green while the gate quietly stopped measuring
 * the thing C2 added. A gate whose scope lags the code is a gate reporting on the past.
 *
 * `test.include` widens with it, because the content package's own tests are what reach the
 * loader's rejection paths. Adding the source without the tests would have counted ~25 uncovered
 * arms against a gate with six arms of headroom — failing for a bookkeeping reason rather than a
 * real one, which is its own kind of false signal.
 *
 * The distinction that matters is WHICH tests produce the number. "The equivalence corpus
 * proves X" and "all the tests together happen to touch X" are different claims, and only the
 * first is what the gate asks for. Tiers are selected by passing test files on the command line:
 *
 *   corpus  src/spread.test.ts -t "600 recorded bot games"   recorded games alone
 *   gens    spread + actions + construct + queries           the plan's four generators
 *   all     (no filter)                                      every test in the package
 *
 * Lives at the repo root because the v8 provider reports absolute paths, and the tests measuring
 * the engine sit outside the package they measure.
 */
export default defineConfig({
  test: {
    include: ['tests/equivalence/src/**/*.test.ts', 'packages/content/src/**/*.test.ts'],
    // SUITE-LEVEL TIME BUDGET — docs/FINDINGS.md #43, fourth entry point. This config runs the
    // equivalence suite from the repo root, so tests/equivalence/vitest.config.ts does NOT apply
    // here, and v8 instrumentation multiplies compute (~1.2-3x measured: the B4b fuzzer 10.9s ->
    // 12.9s, the all-seven-cells query sweep from under 5s to 5.9s). Observed slowest undeclared
    // test under coverage, 19 Aug 2026, 20-core i7-12700F, vitest 4.1.11: 12.9s. RESIZED to
    // 300s the same day with the sibling budgets, when CI showed the binding environment is a
    // 4-core runner (the un-instrumented B4b stretched to 65.1s there); instrumentation
    // multiplies on top. The corpus tests' own declared 300s-600s values override where larger.
    testTimeout: 300_000,
    coverage: {
      provider: 'v8',
      include: ['packages/engine/src/**/*.ts', 'packages/content/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'json-summary', 'json'],
      reportsDirectory: 'coverage',
      // Report every source file, including any a tier never loads. A file sitting at 0% is the
      // most important row in the table and must not be silently omitted.
      all: true,
    },
  },
});
