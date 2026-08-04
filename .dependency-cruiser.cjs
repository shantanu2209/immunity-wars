/**
 * Dependency boundary rules.
 *
 * Enforces docs/PHASE1_BRIEF.md §2: "engine may import content types only. engine must
 * never import ui, app, server, or any DOM/Node API."
 *
 * This is one half of the purity guarantee. The other half is in packages/engine/tsconfig.json,
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
        'the app or the server. CLAUDE.md: "No game logic in UI, server, or content."',
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
