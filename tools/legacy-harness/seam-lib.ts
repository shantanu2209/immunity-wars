/**
 * THE SEAM, as a library — shared by every Task G step that must talk about the same surface.
 *
 * Step 1 measured which names `v2_ui.html` reads from the injected engine. Steps 2 and 3 both
 * need that same list, and they must not each derive their own: two lists that drift apart would
 * let a check pass over a surface that is not the one the harness actually exposes. That is the
 * C5b shape — a green check measuring the wrong thing — so the list is computed once, here.
 *
 * `seam.ts` is the step 1 report over this. It is the only thing that prints.
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
// Resolved through a function so the non-null result is the EXPORTED type: a module-level
// `if (!board) throw` narrows only at module scope, and measureSeam() reads it from inside a
// function body where that narrowing does not reach.
function boardScript(): string {
  const s = scripts[marker + 1];
  if (!s) throw new Error('board script not found after the engine marker');
  return s;
}
export const board: string = boardScript();

/** Legacy's public API — the names it puts in scope once module.exports is stripped. */
export function legacyExports(): string[] {
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
export function legacyTopLevelNames(): Set<string> {
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
export function portExports(): string[] {
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
export function freeIdentifiers(code: string): Map<string, number> {
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
export const BROWSER = new Set([
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

// --- the classification every step shares --------------------------------------------------------

export interface Seam {
  /** Legacy's documented `module.exports` contract. */
  readonly exportsLegacy: string[];
  /** Every top-level declaration in legacy — what script injection actually puts in scope. */
  readonly topLevelLegacy: Set<string>;
  /** What the port publishes from `packages/engine/src/index.ts`. */
  readonly exportsPort: string[];
  /** Board-script identifiers read but never declared, with reference counts. */
  readonly free: Map<string, number>;
  /** Free identifiers after removing browser globals. */
  readonly demanded: string[];
  /** Of those, the ones the legacy engine declares — the demand surface. */
  readonly fromEngine: string[];
  /** Free names legacy does not declare (art data, other script blocks, unlisted browser APIs). */
  readonly notFromEngine: string[];
  /** Demand-surface names the port already publishes. */
  readonly covered: string[];
  /** Demand-surface names the port does not publish. */
  readonly missing: string[];
}

let cached: Seam | undefined;

export function measureSeam(): Seam {
  if (cached) return cached;
  const exportsLegacy = legacyExports();
  const topLevelLegacy = legacyTopLevelNames();
  const exportsPort = portExports();
  const free = freeIdentifiers(board);

  const demanded = [...free.keys()].filter((n) => !BROWSER.has(n)).sort();
  const fromEngine = demanded.filter((n) => topLevelLegacy.has(n));
  const notFromEngine = demanded.filter((n) => !topLevelLegacy.has(n));
  const portHas = new Set(exportsPort);

  cached = {
    exportsLegacy,
    topLevelLegacy,
    exportsPort,
    free,
    demanded,
    fromEngine,
    notFromEngine,
    covered: fromEngine.filter((n) => portHas.has(n)),
    missing: fromEngine.filter((n) => !portHas.has(n)),
  };
  return cached;
}
