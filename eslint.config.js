import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // tools/legacy is read-only reference material (CLAUDE.md: "Never edit"). Linting it
    // would produce thousands of findings we have committed not to act on, and would bury
    // real findings in the packages we are actually building.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      'tools/legacy/**',
      'pnpm-lock.yaml',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Must come last: turns off every rule that would fight Prettier over formatting.
  prettier,

  {
    files: ['**/*.ts'],
    rules: {
      // Unused variables are an error, but an underscore prefix is an explicit
      // "I know, and I mean it" escape hatch.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  {
    // CLAUDE.md: "No `any` in engine." Stated as a hard rule, so it is enforced as an
    // error here rather than left to review. Elsewhere it stays at the recommended level.
    files: ['packages/engine/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  {
    // Build scripts run on Node and are allowed to say so.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
);
