/**
 * Dependency boundary rules.
 *
 * THE INVARIANT: content contains no logic, the engine contains no data.
 *
 * docs/PHASE1_BRIEF.md §2 and CLAUDE.md used to say "engine may import content TYPES only",
 * and claimed CI enforced it. CI did not — there was no such rule here — and the rule could not
 * have held anyway: legacy publishes ORGANS, DECK_MASTER, TROPISM and 19 other tables as part
 * of its 67-export public API, so an engine that could see only the types would have to stop
 * publishing the values and break the contract Task B was measured against. Both documents are
 * corrected to the invariant above rather than left asserting something nothing checks.
 *
 * So: `engine -> content` is INTENDED and unrestricted. Its converse is not, and neither is
 * data drifting back into the engine.
 *
 * WHAT THIS FILE CAN AND CANNOT DO. Three of the four directions are import-graph shaped and
 * are enforced below. "The engine contains no data" is NOT an import-graph property — a table
 * re-declared inside packages/engine imports nothing and would be invisible here. That half is
 * enforced by tests/equivalence/src/exports.test.ts, which asserts every data export of the
 * engine is the SAME OBJECT as content's, by identity. A re-declared copy fails it.
 * Neither check subsumes the other, and saying so is cheaper than discovering it later.
 *
 * The purity guarantee has a second half in packages/engine/tsconfig.json,
 * which sets lib to ES2022 (no DOM) and types to [] (no @types/node). Neither check subsumes
 * the other:
 *
 *   - The compiler catches ambient globals — `document`, `process`, `Buffer` — which are
 *     never imported and so are invisible to dependency-cruiser.
 *   - dependency-cruiser catches `import ... from 'node:fs'` or from a sibling package,
 *     which the compiler would happily resolve if the types were present.
 *
 * Run with: pnpm boundaries
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'engine-no-downstream-packages',
      severity: 'error',
      comment:
        'The rules engine must not depend on the UI, the app shell or the server. Rules live ' +
        'in packages/engine and nothing downstream of it may be reached from inside it. ' +
        'If the engine appears to need something from the UI, the dependency is inverted: ' +
        'pass it in, or move the rule into the engine.',
      from: { path: '^packages/engine' },
      to: { path: '^packages/(ui|app|server)' },
    },
    {
      name: 'engine-no-node-builtins',
      severity: 'error',
      comment:
        'The engine must be pure: no filesystem, no network, no process, no crypto. It must ' +
        'run unchanged in a browser, in a test, and inside the balance simulator. Loading ' +
        'and saving happen at the boundary, in the caller.',
      from: { path: '^packages/engine' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'content-stays-data',
      severity: 'error',
      comment:
        'Content is validated data, not behaviour. It must not import the engine, the UI, ' +
        'the app or the server. CLAUDE.md: "No game logic in UI, server, or content." ' +
        'Note the asymmetry is deliberate: engine -> content is intended and unrestricted, ' +
        'content -> engine is forbidden. Content that reached into the engine could encode a ' +
        'rule, which is the thing this whole boundary exists to prevent.',
      from: { path: '^packages/content' },
      to: { path: '^packages/(engine|ui|app|server)' },
    },
    {
      name: 'content-no-node-builtins',
      severity: 'error',
      comment:
        'Content packs are plain data. Reading them off disk or over the network is the ' +
        "caller's job, at the trust boundary where Zod validation happens.",
      from: { path: '^packages/content' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'protocol-no-implementations',
      severity: 'error',
      comment:
        'Protocol is shared message types and schemas. Both client and server depend on it, ' +
        'so it must depend on neither.',
      from: { path: '^packages/protocol' },
      to: { path: '^packages/(engine|ui|app|server)' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make load order undefined and break tree-shaking.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'A module nothing imports is usually dead code or a forgotten rename.',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$',
          '\\.d\\.ts$',
          '(^|/)tsconfig\\.json$',
          '(^|/)package\\.json$',
          '/index\\.ts$',
        ],
      },
      to: {},
    },
  ],

  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: {
      path: ['node_modules', 'dist', '\\.turbo', 'coverage', 'tools/legacy'],
    },
    tsConfig: {
      fileName: 'tsconfig.base.json',
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.ts', '.mjs', '.cjs'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
