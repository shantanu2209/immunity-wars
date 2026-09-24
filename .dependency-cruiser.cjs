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
      name: 'ui-app-no-engine',
      severity: 'error',
      comment:
        'THE LOAD-BEARING HALF OF SEAM 1. The UI and the app shell talk to the game through ' +
        'the Session interface and nothing else. They may import @immunity-wars/content ' +
        'freely — content is validated data, not behaviour, which is what the two rules above ' +
        'exist to keep true — and they may import the session package. They may NEVER import ' +
        'the engine, by any path: not the package specifier, not a relative reach across ' +
        'packages/, not the ./internal entry point. ' +
        'Why a rule rather than a convention: v2_ui.html read 49 engine names when only 44 ' +
        'were in the 67-export contract Task B was measured against, and nothing ever failed, ' +
        'because script injection made all 153 top-level declarations reachable ' +
        '(docs/FINDINGS.md #39). An interface nobody is forced to use is a convention, and ' +
        'this project has found roughly a dozen conventions that were quietly false. ' +
        'What it buys concretely: a UI written against a synchronous in-process applyAction is ' +
        'a fork that nothing fails on until Phase 3 tries to put a network in that gap. ' +
        'docs/PHASE2_BRIEF.md v1.1 §3, docs/SEAM_DECISIONS.md §1. ' +
        "SESSION-CORE IS ENGINE CODE FOR THIS RULE (P3.4): it runs the engine's queries on a " +
        'GameState, so the UI reaches it only through the session, which re-exports its types.',
      from: { path: '^packages/(ui|app)' },
      to: { path: '^packages/(engine|session-core)/' },
    },
    {
      name: 'session-no-downstream',
      severity: 'error',
      comment:
        'Session is the seam, not a participant. It may reach the engine and the content pack — ' +
        'it is the one package permitted to reach the engine at all — and it must never reach ' +
        'back down into the UI, the app shell or the server. A session that imported the UI ' +
        'would make the seam bidirectional, and RelaySession could not then be a second ' +
        'implementation of the same interface: it would need a UI to exist. ' +
        'docs/SEAM_DECISIONS.md §1. ' +
        'THE TRAILING SLASH IS LOAD-BEARING (P3.4): without it this rule also matched ' +
        'packages/session-core, which has a rule of its own below.',
      from: { path: '^packages/session/' },
      to: { path: '^packages/(ui|app|server)/' },
    },
    {
      name: 'room-no-downstream',
      severity: 'error',
      comment:
        'The room is the authority in multiplayer, not a participant. It may reach the engine ' +
        'and the content pack, as packages/session does on a single device, and it must never ' +
        'reach the UI, the app shell, the server or the session. A room that imported the UI ' +
        'could not run on a server at all; a room that imported the session would have two ' +
        'copies of the seam. docs/PHASE3_BRIEF.md §2. ' +
        'THE TRAILING SLASH IS LOAD-BEARING (P3.4, found by the first real import): written as ' +
        '^packages/(ui|app|server|session) this rule matched packages/session-core as well, and ' +
        'refused the one edge the P3.4 ruling requires, room -> session-core, the shared builder. ' +
        'Pinned both ways in tools/ci/selftest.ts.',
      from: { path: '^packages/room/' },
      to: { path: '^packages/(ui|app|server|session)/' },
    },
    {
      name: 'session-core-no-downstream',
      severity: 'error',
      comment:
        'SESSION-CORE IS WHAT EVERY HOLDER OF A GameState SHARES (P3.4, ruled 24 September ' +
        '2026): the query builder LocalSession and the room both call, so the relay computes ' +
        'what a single-player session computes by construction. It may reach the engine and the ' +
        'content pack and nothing that uses it: a builder that imported the session or the room ' +
        'would be one of two copies again, which is what moving it was for.',
      from: { path: '^packages/session-core/' },
      to: { path: '^packages/(ui|app|server|session|room)/' },
    },
    {
      name: 'session-core-no-node-builtins',
      severity: 'error',
      comment:
        'GATE B REACHES THROUGH THE ROOM (docs/PHASE3_BRIEF.md §6). The room runs session-core on ' +
        'every view it sends, so a platform API here is a platform API in the room, and ' +
        "room-no-node-builtins, which looks only at the room's own files, could not see it.",
      from: { path: '^packages/session-core/' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'room-no-node-builtins',
      severity: 'error',
      comment:
        'GATE B, AS A CHECK RATHER THAN AN INTENTION (docs/PHASE3_BRIEF.md §6). The room must be ' +
        'replaceable-platform code: no filesystem, no network, no process, no timers of its own. ' +
        'Its entry points take a timestamp and return messages, so it runs under the Node relay, ' +
        'under plain Node in a test, and under whatever replaces them. The day this rule is ' +
        'relaxed is the day the portability claim in the brief stops being true, and the brief ' +
        'makes that claim a gate item.',
      from: { path: '^packages/room' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'ui-app-no-unresolvable',
      severity: 'error',
      comment:
        'THE HOLE IN THE RULE ABOVE, closed. dependency-cruiser matches `to.path` against the ' +
        'RESOLVED module path, so an import it cannot resolve has no path to match and slips ' +
        'past ui-app-no-engine silently. Measured, not assumed: with `@immunity-wars/engine` ' +
        'absent from packages/ui/package.json, `import { applyAction } from ' +
        '"@immunity-wars/engine"` produces couldNotResolve and ui-app-no-engine does NOT fire. ' +
        'Only a relative reach across packages/ fires it. Both spellings are things a person ' +
        'under deadline actually writes, so both must be caught — and "the typecheck would ' +
        'have caught it" is exactly the reasoning that left #39 undetected for years. ' +
        'This rule makes the unresolved case red HERE, in the boundary gate, where someone ' +
        'reading the failure is being told about the boundary. ' +
        'Scoped to ui and app deliberately: it is a boundary control, not a general hygiene ' +
        'rule, and widening it to every package is a separate decision with its own noise.',
      from: { path: '^packages/(ui|app)' },
      to: { couldNotResolve: true },
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
      extensions: ['.js', '.ts', '.tsx', '.mjs', '.cjs'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
