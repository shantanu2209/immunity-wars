import { defineConfig } from 'vitest/config';

/**
 * Coverage configuration for the Task B gate (docs/TASK_B_PLAN.md §1.5).
 *
 * Measures `packages/engine/src` — the thing being proven — never the rig that proves it.
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
    include: ['tests/equivalence/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/engine/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'json-summary', 'json'],
      reportsDirectory: 'coverage',
      // Report every source file, including any a tier never loads. A file sitting at 0% is the
      // most important row in the table and must not be silently omitted.
      all: true,
    },
  },
});
