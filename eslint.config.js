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

  // THE HARDCODED-STRING CHECK (P2.5 piece 2) — what makes DoD item 4 real rather than a
  // second unconsumed catalogue: player components must render text through the i18n
  // catalogue (packages/ui/src/i18n.ts t()), and this rule REJECTS hardcoded JSX text.
  // Scope is packages/ui (the player-component home); the dev shell in packages/app is
  // developer scaffolding, exempt on purpose and recorded as such. Negative-controlled in
  // packages/ui/src/i18n-check.control.test.ts — a check that has never rejected a
  // hardcoded string is not known to work.
  {
    files: ['packages/ui/src/**/*.tsx'],
    plugins: {
      iw: {
        rules: {
          'no-hardcoded-jsx-text': {
            meta: {
              type: 'problem',
              schema: [],
              messages: {
                hardcoded:
                  'Hardcoded player-visible string in JSX — render it through the i18n catalogue (t()) instead.',
              },
            },
            create(ctx) {
              return {
                JSXText(node) {
                  if (node.value.trim() !== '') ctx.report({ node, messageId: 'hardcoded' });
                },
                JSXExpressionContainer(node) {
                  if (node.parent && node.parent.type === 'JSXAttribute') return; // props are not player-visible text
                  const e = node.expression;
                  if (e.type === 'Literal' && typeof e.value === 'string' && e.value.trim() !== '')
                    ctx.report({ node: e, messageId: 'hardcoded' });
                  if (e.type === 'TemplateLiteral') ctx.report({ node: e, messageId: 'hardcoded' });
                },
              };
            },
          },
        },
      },
    },
    rules: { 'iw/no-hardcoded-jsx-text': 'error' },
  },
  ...tseslint.configs.recommended,

  // Must come last: turns off every rule that would fight Prettier over formatting.
  prettier,

  {
    files: ['**/*.ts', '**/*.tsx'],
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

      // `!` asserts "this is never null or undefined" and switches the compiler off for
      // that expression. It is wrong exactly when it matters: the lookup that actually
      // can miss.
      //
      // This is load-bearing for the noUncheckedIndexedAccess decision recorded in
      // tsconfig.base.json. That flag is enabled at the end of Task B, and the condition
      // attached to it is that `!` may not be used to satisfy it. Banning it now, while
      // the engine is still empty, means the escape hatch is already closed when the
      // flag is flipped — nobody has to remember the rule under deadline pressure.
      //
      // If a lookup can miss, handle the miss.
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // ENABLED SO AN EXISTING DISABLE COMMENT BECOMES LOAD-BEARING.
      //
      // `no-eval` is not part of eslint:recommended, so it was never on — which made the
      // `eslint-disable-next-line no-eval` in tests/equivalence/src/legacy-ui.ts a dead
      // directive suppressing a rule that was not running. It reported as an unused-directive
      // warning and read, to anyone skimming, as though eval were being guarded. It was not.
      //
      // Deleting the directive would have been the smaller change and the worse one: the repo
      // would then have an unguarded `eval` and nothing to stop a second one. Turning the rule
      // on instead makes the single documented use explicit and every future one an error.
      //
      // That one use is `legacyUiTable()`, which evaluates a table initialiser lifted out of
      // tools/legacy/v2_ui.html — a read-only file in this repository, the same trust boundary
      // engine.ts already sits on, and the thing that makes the legacy UI usable as an oracle.
      'no-eval': 'error',
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
