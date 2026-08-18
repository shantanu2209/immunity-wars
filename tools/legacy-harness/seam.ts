/**
 * TASK G, STEP 1 — MEASURE THE SEAM.
 *
 *   npx tsx tools/legacy-harness/seam.ts
 *
 * `v2_ui.html` carries a literal injection point:
 *
 *     <script>
 *     /* __ENGINE__ *\/
 *     </script>
 *
 * and `tools/legacy/spectator_build.js` shows the contract: read the engine, strip its
 * `module.exports`, substitute it at the marker. The engine therefore arrives as a CLASSIC SCRIPT
 * whose top-level declarations become globals that the board script below it can see.
 *
 * So the harness's real question is not "does the port export enough", it is:
 *
 *   > WHICH NAMES DOES THE BOARD SCRIPT ACTUALLY REFERENCE THAT IT DOES NOT DECLARE ITSELF,
 *   > and does the ported engine provide every one?
 *
 * This measures that, rather than assuming it. A name the UI needs and the port does not publish
 * is a `ReferenceError` at the worst possible moment — mid-game, in a build a human is trying to
 * judge — and it would look like a gameplay bug rather than a missing export.
 *
 * METHOD. Parse the board script with the TypeScript compiler API, walk every scope, and collect
 * identifiers that are read but never declared in any enclosing scope. Subtract the browser
 * globals and the names the UI declares at its own top level. What remains is the demand surface.
 *
 * This is deliberately a MEASUREMENT SCRIPT, not part of the build: step 1 reports before any shim
 * is written, because anything needing more than a rename is a finding rather than something to
 * work around quietly.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const LEGACY = join(REPO, 'tools', 'legacy');

// --- the two sides of the seam -----------------------------------------------------------------

const uiHtml = readFileSync(join(LEGACY, 'v2_ui.html'), 'utf8');
const scripts = [...uiHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1] ?? '');
const marker = scripts.findIndex((s) => s.includes('__ENGINE__'));
if (marker < 0) throw new Error('engine marker missing from v2_ui.html');

// The board script is the one after the marker script, per spectator_build.js.
const board = scripts[marker + 1];
if (!board) throw new Error('board script not found after the engine marker');

/** Legacy's public API — the names it puts in scope once module.exports is stripped. */
function legacyExports(): string[] {
  const src = readFileSync(join(LEGACY, 'v2_engine.js'), 'utf8');
  const m = src.match(/module\.exports\s*=\s*\{([\s\S]*?)\};?\s*$/);
  if (!m?.[1]) throw new Error('could not find module.exports in v2_engine.js');
  return [
    ...new Set(
      m[1]
        .split(',')
        .map((s) => s.trim().split(':')[0]?.trim() ?? '')
        .filter((s) => /^[A-Za-z_$][\w$]*$/.test(s)),
    ),
  ].sort();
}

/** Every top-level declaration in the legacy engine — what actually lands in global scope. */
function legacyTopLevelNames(): Set<string> {
  const src = readFileSync(join(LEGACY, 'v2_engine.js'), 'utf8');
  const sf = ts.createSourceFile('v2_engine.js', src, ts.ScriptTarget.ES2022, true);
  const names = new Set<string>();
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) names.add(st.name.text);
    else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) names.add(d.name.text);
      }
    } else if (ts.isClassDeclaration(st) && st.name) names.add(st.name.text);
  }
  return names;
}

/** What the ported engine publishes. */
function portExports(): string[] {
  const src = readFileSync(join(REPO, 'packages', 'engine', 'src', 'index.ts'), 'utf8');
  const sf = ts.createSourceFile('index.ts', src, ts.ScriptTarget.ES2022, true);
  const names = new Set<string>();
  const visit = (n: ts.Node): void => {
    if (ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause)) {
      for (const e of n.exportClause.elements) names.add(e.name.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return [...names].sort();
}

// --- the demand surface -------------------------------------------------------------------------

/**
 * Identifiers the board script READS but never declares, in any enclosing scope.
 *
 * Scope tracking is deliberately conservative: a name is only reported as free when no enclosing
 * function, block, parameter list or top-level statement declares it. Over-reporting would bury
 * the real answer in noise; under-reporting would hide a missing export, so where the two conflict
 * this errs toward reporting.
 */
function freeIdentifiers(code: string): Map<string, number> {
  const sf = ts.createSourceFile('board.js', code, ts.ScriptTarget.ES2022, true);
  const free = new Map<string, number>();

  const declare = (name: string, scope: Set<string>): void => {
    scope.add(name);
  };

  const bindingNames = (n: ts.BindingName, scope: Set<string>): void => {
    if (ts.isIdentifier(n)) declare(n.text, scope);
    else if (ts.isObjectBindingPattern(n) || ts.isArrayBindingPattern(n)) {
      for (const el of n.elements) {
        if (ts.isBindingElement(el)) bindingNames(el.name, scope);
      }
    }
  };

  /** Hoist declarations that belong to a scope before walking its body. */
  const hoist = (nodes: readonly ts.Node[], scope: Set<string>): void => {
    for (const st of nodes) {
      if (ts.isFunctionDeclaration(st) && st.name) declare(st.name.text, scope);
      else if (ts.isClassDeclaration(st) && st.name) declare(st.name.text, scope);
      else if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) bindingNames(d.name, scope);
      }
    }
  };

  const walk = (node: ts.Node, scopes: Set<string>[]): void => {
    const inScope = (name: string): boolean => scopes.some((s) => s.has(name));

    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node)
    ) {
      const scope = new Set<string>();
      for (const p of node.parameters) bindingNames(p.name, scope);
      if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) && node.name) {
        scope.add(node.name.text);
      }
      const body = node.body;
      if (body && ts.isBlock(body)) hoist(body.statements, scope);
      const next = [...scopes, scope];
      for (const p of node.parameters) if (p.initializer) walk(p.initializer, next);
      if (body) walk(body, next);
      return;
    }

    if (ts.isBlock(node) || ts.isCaseBlock(node)) {
      const scope = new Set<string>();
      // A CaseBlock holds clauses, each with its own statements; a Block holds statements directly.
      const stmts: readonly ts.Node[] = ts.isBlock(node)
        ? node.statements
        : node.clauses.flatMap((c) => [...c.statements]);
      hoist(stmts, scope);
      const next = [...scopes, scope];
      ts.forEachChild(node, (c) => walk(c, next));
      return;
    }

    if (ts.isForStatement(node) || ts.isForOfStatement(node) || ts.isForInStatement(node)) {
      const scope = new Set<string>();
      const init = ts.isForStatement(node) ? node.initializer : node.initializer;
      if (init && ts.isVariableDeclarationList(init)) {
        for (const d of init.declarations) bindingNames(d.name, scope);
      }
      const next = [...scopes, scope];
      ts.forEachChild(node, (c) => walk(c, next));
      return;
    }

    if (ts.isIdentifier(node)) {
      const p = node.parent;
      // Property names, member access after the dot, and declaration names are not references.
      const isMemberName = ts.isPropertyAccessExpression(p) && p.name === node;
      const isPropName = ts.isPropertyAssignment(p) && p.name === node;
      const isShorthandValue = ts.isShorthandPropertyAssignment(p);
      const isDeclName =
        (ts.isVariableDeclaration(p) || ts.isFunctionDeclaration(p) || ts.isParameter(p)) &&
        p.name === node;
      const isLabel = ts.isLabeledStatement(p) || ts.isBreakOrContinueStatement(p);
      if (!isMemberName && !isPropName && !isDeclName && !isLabel) {
        void isShorthandValue;
        if (!inScope(node.text)) free.set(node.text, (free.get(node.text) ?? 0) + 1);
      }
      return;
    }

    ts.forEachChild(node, (c) => walk(c, scopes));
  };

  const top = new Set<string>();
  hoist(sf.statements, top);
  walk(sf, [top]);
  return free;
}

/** Names the browser provides. Not exhaustive — extended as the report shows noise. */
const BROWSER = new Set([
  'window',
  'document',
  'console',
  'Math',
  'JSON',
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Date',
  'Set',
  'Map',
  'Promise',
  'RegExp',
  'Error',
  'isNaN',
  'parseInt',
  'parseFloat',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'requestAnimationFrame',
  'navigator',
  'location',
  'history',
  'alert',
  'confirm',
  'prompt',
  'fetch',
  'localStorage',
  'sessionStorage',
  'undefined',
  'NaN',
  'Infinity',
  'globalThis',
  'encodeURIComponent',
  'decodeURIComponent',
  'Blob',
  'URL',
  'FileReader',
  'Image',
  'event',
  'performance',
  'structuredClone',
  'CustomEvent',
  'Event',
  'HTMLElement',
  'getComputedStyle',
  'matchMedia',
  'crypto',
  'requestIdleCallback',
  'cancelAnimationFrame',
  'TextEncoder',
  'TextDecoder',
  'Intl',
  'Symbol',
  'BigInt',
  'Proxy',
  'Reflect',
  'WeakMap',
  'WeakSet',
  'ArrayBuffer',
  'Uint8Array',
  'parse',
  'arguments',
  'this',
]);

// --- report -------------------------------------------------------------------------------------

const exportsLegacy = legacyExports();
const topLevelLegacy = legacyTopLevelNames();
const exportsPort = portExports();
const free = freeIdentifiers(board);

const demanded = [...free.keys()].filter((n) => !BROWSER.has(n)).sort();

// A name the UI needs is satisfiable if the legacy engine declares it at top level, because that
// is what injection puts in scope. Legacy's module.exports list is the CONTRACT, but the injected
// script exposes every top-level declaration, so the two can differ — and that difference is
// exactly the kind of thing worth knowing before building a shim.
const fromEngine = demanded.filter((n) => topLevelLegacy.has(n));
const notFromEngine = demanded.filter((n) => !topLevelLegacy.has(n));

const portHas = new Set(exportsPort);
const covered = fromEngine.filter((n) => portHas.has(n));
const missing = fromEngine.filter((n) => !portHas.has(n));

const line = '='.repeat(95);
console.log(line);
console.log('TASK G STEP 1 — THE SEAM, MEASURED');
console.log(line);
console.log(
  `legacy module.exports          ${exportsLegacy.length} names (the documented contract)`,
);
console.log(
  `legacy top-level declarations  ${topLevelLegacy.size} names (what injection ACTUALLY exposes)`,
);
console.log(`port index.ts exports          ${exportsPort.length} names`);
console.log(
  `board script free identifiers  ${free.size} (${demanded.length} after removing browser globals)`,
);
console.log('');

console.log(
  '-- WHAT THE UI DEMANDS FROM THE ENGINE ----------------------------------------------',
);
console.log(
  `  ${fromEngine.length} names the board script reads that the legacy engine declares.\n`,
);
console.log(`  COVERED by the port : ${covered.length}`);
console.log(`  MISSING from the port: ${missing.length}`);
if (missing.length > 0) {
  console.log('');
  for (const n of missing) console.log(`    MISSING  ${n}  (referenced ${free.get(n)}x)`);
  console.log(
    '\n  Each of these is a ReferenceError mid-game in a build a human is trying to judge.',
  );
} else {
  console.log('\n  The port covers every engine name the UI reads.');
}

console.log('');
console.log(
  '-- FREE NAMES THE ENGINE DOES NOT DECLARE -------------------------------------------',
);
console.log('   Expected: art data, UI globals defined in other script blocks, browser APIs this');
console.log('   script did not list. Reported so nothing is silently assumed to be fine.\n');
for (const n of notFromEngine.slice(0, 60)) {
  console.log(`    ${n.padEnd(28)} ${free.get(n)}x`);
}
if (notFromEngine.length > 60) console.log(`    ... and ${notFromEngine.length - 60} more`);

console.log('');
console.log(
  '-- PORT EXPORTS THE UI NEVER READS ---------------------------------------------------',
);
const unused = exportsPort.filter((n) => !demanded.includes(n));
console.log(
  `   ${unused.length} of ${exportsPort.length}. Not a problem — the engine's contract is`,
);
console.log("   legacy's 67 exports, not the UI's needs. Listed for completeness.\n");
console.log(
  unused.length > 0
    ? `    ${unused.slice(0, 40).join(', ')}${unused.length > 40 ? ', ...' : ''}`
    : '    (none)',
);

process.exit(missing.length > 0 ? 1 : 0);
