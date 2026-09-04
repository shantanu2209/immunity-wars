/**
 * ENGINE i18n CATALOGUE — Task C5b.
 *
 * Extracts every `err()` and `pushLog()` string from `packages/engine/src` into
 * `packages/content/src/i18n/en/engine.json`.
 *
 * NOTHING CONSUMES THE CATALOGUE YET. docs/PHASE1_BRIEF.md §3 says so and requires extraction
 * anyway, because retrofitting i18n is expensive and the Hindi edition is a committed grant
 * deliverable. It also names the consequence: with no consumer, the catalogue can drift from the
 * source silently. `tests/equivalence/src/i18n-engine.test.ts` is the whole safety mechanism.
 *
 * THE ERROR STRINGS ARE FROZEN. Every `err()` message has been byte-identical to
 * `tools/legacy/v2_engine.js` since Task B, held that way specifically so this extraction could
 * happen — `actions.test.ts` compares them against legacy. **The catalogue must reproduce them
 * exactly**, which is what leg 2 asserts.
 *
 * KEYS ARE DERIVED FROM THE MESSAGE, not from file and line. Line numbers drift on every edit
 * above them, and this project has already been bitten by positional keying once — the coverage
 * gate's multiplayer classifier, docs/FINDINGS.md #24. A message-derived key also makes an edit
 * to a frozen string fail loudly: the key changes, and leg 1 reports both a missing and an
 * unexpected entry.
 *
 * INTERPOLATIONS BECOME PLACEHOLDERS, NOT ICU YET. `${iv.disease}` becomes `{disease}`. The 9
 * cases needing ICU `select`/`plural` (docs/STRING_INVENTORY.md) keep a single placeholder and
 * are listed in `$icuTodo`. Authoring real ICU for them is Phase 2 work, with the consumer
 * present — see docs/TASK_C_HANDOFF.md §3a.
 *
 *   npx tsx tests/equivalence/i18n-extract.ts
 *   npx tsx tests/equivalence/i18n-extract.ts --check
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = resolve(HERE, '../../packages/engine/src');
const OUT_DIR = resolve(HERE, '../../packages/content/src/i18n/en');
const OUT = `${OUT_DIR}/engine.json`;

export interface Site {
  file: string;
  line: number;
  /**
   * 'err' / 'pushLog': the two call sites Phase 1 walked. 'query': prose the engine returns
   * as DATA — a `label:` or `disease:` property, a `capReasons.push(...)`, a `blocked = ...`,
   * a `.why += ...`, a `snap('...')` frame headline — found at P2.5 CP2 when the antibody panel
   * rendered a query's effect label as a missing-key marker (docs/FINDINGS.md #53).
   */
  fn: 'err' | 'pushLog' | 'query';
  /** The message with every `${…}` replaced by `{name}`. This is what the catalogue stores. */
  message: string;
  /** Placeholder names, in source order. */
  params: string[];
  /** Needs ICU select/plural authoring in Phase 2. */
  icuTodo: boolean;
}

/** `iv.disease` -> `disease`, `cname(ck as string)` -> `cname`, `pool` -> `pool`. */
function paramName(expr: string, used: Set<string>): string {
  const cleaned = expr.replace(/\s+/g, ' ').trim();
  // Property access wins: the last identifier segment is the most descriptive part.
  const props = cleaned.match(/\.([A-Za-z_$][\w$]*)/g);
  let base = props?.length
    ? props[props.length - 1]!.slice(1)
    : (/^([A-Za-z_$][\w$]*)/.exec(cleaned)?.[1] ?? 'value');
  base = base.replace(/[^A-Za-z0-9]/g, '') || 'value';
  let name = base;
  let n = 2;
  while (used.has(name)) name = `${base}${n++}`;
  used.add(name);
  return name;
}

/** Message -> stable key: `<file-stem>.<camelCased first words>`. */
function keyFor(file: string, message: string, used: Set<string>): string {
  const stem = file.replace(/\.ts$/, '');
  const words = message
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  const slug =
    words
      .map((w, i) => (i === 0 ? w.toLowerCase() : w[0]!.toUpperCase() + w.slice(1).toLowerCase()))
      .join('') || 'message';
  let key = `${stem}.${slug}`;
  let n = 2;
  while (used.has(key)) key = `${stem}.${slug}${n++}`;
  used.add(key);
  return key;
}

/**
 * A call site whose message is NOT a literal — an identifier, a call, a conditional — which the
 * extractor cannot follow. Phase 1's walker skipped these silently; they are now LISTED in the
 * catalogue's $meta so the drift test pins them and a new one is a visible diff. The message
 * they carry is composed elsewhere and reaches the player uncatalogued: Phase 3's to fix by
 * having the engine emit ids (docs/FINDINGS.md #53).
 */
export interface Unextracted {
  file: string;
  line: number;
  fn: 'err' | 'pushLog';
  /** The argument's source text, e.g. `msg` or `entryMsg`. */
  expr: string;
}

const literalMessage = (
  arg: ts.Expression,
  sf: ts.SourceFile,
): { message: string; params: string[]; raw: string } | null => {
  const used = new Set<string>();
  const params: string[] = [];
  if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
    return { message: arg.text, params, raw: arg.getText(sf) };
  }
  if (ts.isTemplateExpression(arg)) {
    let acc = arg.head.text;
    for (const span of arg.templateSpans) {
      const p = paramName(span.expression.getText(sf), used);
      params.push(p);
      acc += `{${p}}${span.literal.text}`;
    }
    return { message: acc, params, raw: arg.getText(sf) };
  }
  return null;
};

/** Walk one source file. Exported so a control can feed it a synthetic file. */
export function sitesIn(file: string, text: string): { sites: Site[]; unextracted: Unextracted[] } {
  const sites: Site[] = [];
  const unextracted: Unextracted[] = [];
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  const lineOf = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const push = (fn: Site['fn'], arg: ts.Expression): boolean => {
    const lit = literalMessage(arg, sf);
    if (!lit) return false;
    sites.push({
      file,
      line: lineOf(arg),
      fn,
      message: lit.message,
      params: lit.params,
      // A ternary inside an interpolation, or a nested template — ICU select/plural.
      icuTodo:
        /\$\{[^}]*\?[^}]*:/.test(lit.raw) || /\?\s*`/.test(lit.raw) || /===\s*1\s*\?/.test(lit.raw),
    });
    return true;
  };

  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      // err(...) / pushLog(...) — Phase 1's two sites, plus the unextracted list.
      if (ts.isIdentifier(n.expression)) {
        const fn = n.expression.text;
        if (fn === 'err' || fn === 'pushLog') {
          const arg = fn === 'err' ? n.arguments[0] : n.arguments[1];
          if (arg && !push(fn, arg)) {
            unextracted.push({ file, line: lineOf(arg), fn, expr: arg.getText(sf) });
          }
        }
        // snap('Bacteria divide') — a spread frame's headline, shown by the narration banner.
        if (fn === 'snap') {
          const arg = n.arguments[0];
          if (arg) push('query', arg);
        }
      }
      // capReasons.push('liver damaged') — a breakdown's storage reason.
      if (
        ts.isPropertyAccessExpression(n.expression) &&
        n.expression.name.text === 'push' &&
        ts.isIdentifier(n.expression.expression) &&
        n.expression.expression.text === 'capReasons'
      ) {
        const arg = n.arguments[0];
        if (arg) push('query', arg);
      }
    }
    // { label: '...' } / { disease: '...' } — an effect label or an engine-invented disease name.
    if (
      ts.isPropertyAssignment(n) &&
      ts.isIdentifier(n.name) &&
      (n.name.text === 'label' || n.name.text === 'disease')
    ) {
      push('query', n.initializer);
    }
    // blocked = '...' / x.disease = '...' / x.why += '...' — prose assigned into a return value.
    if (
      ts.isBinaryExpression(n) &&
      (n.operatorToken.kind === ts.SyntaxKind.EqualsToken ||
        n.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken)
    ) {
      const left = n.left;
      const target = ts.isIdentifier(left)
        ? left.text
        : ts.isPropertyAccessExpression(left)
          ? left.name.text
          : '';
      if (target === 'blocked' || target === 'disease' || target === 'why') push('query', n.right);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { sites, unextracted };
}

export function engineSitesFull(): { sites: Site[]; unextracted: Unextracted[] } {
  const sites: Site[] = [];
  const unextracted: Unextracted[] = [];
  for (const f of readdirSync(ENGINE).sort()) {
    if (!f.endsWith('.ts') || f.endsWith('.test.ts')) continue;
    const r = sitesIn(f, readFileSync(`${ENGINE}/${f}`, 'utf8'));
    sites.push(...r.sites);
    unextracted.push(...r.unextracted);
  }
  return { sites, unextracted };
}

export function engineSites(): Site[] {
  return engineSitesFull().sites;
}

export function engineUnextracted(): Unextracted[] {
  return engineSitesFull().unextracted;
}

/** The catalogue: message -> key, deduplicated by message text. */
export function buildCatalogue(sites: Site[]): {
  catalogue: Record<string, string>;
  keyOf: Map<string, string>;
  icuTodo: string[];
} {
  const usedKeys = new Set<string>();
  const keyOf = new Map<string, string>();
  const catalogue: Record<string, string> = {};
  const icuTodo = new Set<string>();

  // Sorted by file then line so the key numbering is stable across runs.
  const ordered = [...sites].sort((a, b) =>
    a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file),
  );

  for (const s of ordered) {
    // Identical text at several sites is ONE catalogue entry. That is correct: a translator
    // translates a message, not a call site.
    let key = keyOf.get(s.message);
    if (!key) {
      key = keyFor(s.file, s.message, usedKeys);
      keyOf.set(s.message, key);
      catalogue[key] = s.message;
    }
    if (s.icuTodo) icuTodo.add(key);
  }
  return { catalogue, keyOf, icuTodo: [...icuTodo].sort() };
}

function render(): string {
  const sites = engineSites();
  const { catalogue, icuTodo } = buildCatalogue(sites);

  const doc: Record<string, unknown> = {
    $meta: {
      namespace: 'engine',
      locale: 'en',
      generatedBy: 'tests/equivalence/i18n-extract.ts',
      sites: sites.length,
      queryProseSites: sites.filter((x) => x.fn === 'query').length,
      messages: Object.keys(catalogue).length,
      // Call sites whose message is composed elsewhere (an identifier, not a literal). Listed so
      // the drift test pins them; each is a player-visible string outside the catalogue.
      unextractedSites: engineUnextracted().map(
        (u) => `${u.file}:${String(u.line)} ${u.fn}(${u.expr})`,
      ),
      note: 'Nothing consumes this yet — Phase 2 does. tests/equivalence/src/i18n-engine.test.ts is what keeps it honest.',
    },
    /**
     * Messages still carrying a raw placeholder where ICU select/plural is needed.
     * Authoring them belongs in Phase 2, with a consumer — docs/TASK_C_HANDOFF.md §3a.
     */
    $icuTodo: icuTodo,
    ...Object.fromEntries(Object.entries(catalogue).sort(([a], [b]) => a.localeCompare(b))),
  };
  return JSON.stringify(doc, null, 2) + '\n';
}

/**
 * ONLY RUN THE GENERATOR WHEN EXECUTED DIRECTLY. NEVER ON IMPORT.
 *
 * This guard is load-bearing and it was added because its absence made the drift test
 * completely blind while showing 19 green tests.
 *
 * `i18n-engine.test.ts` imports `engineSites` and `buildCatalogue` from this file. ES module
 * imports are evaluated BEFORE the importing module's body, so with the generator running at
 * top level, importing it REGENERATED `engine.json` — and the test then read the file it had
 * just rewritten. Every negative control was erased microseconds before it was checked: change
 * a message, delete an entry, add a new `err()` to the engine — all five mutations passed.
 *
 * **A test that regenerates its own oracle cannot fail.** It is not a weak test; it is not a
 * test. Found only because every new check in this repository gets a negative control before it
 * is trusted (tests/equivalence/README.md, "Read this first").
 */
const executedDirectly =
  process.argv[1] !== undefined && /i18n-extract\.[tj]s$/.test(process.argv[1]);

if (!executedDirectly) {
  // Imported for engineSites()/buildCatalogue(). Do nothing else.
} else {
  runCli();
}

function runCli(): void {
  const text = render();
  if (process.argv.includes('--check')) {
    let existing = '';
    try {
      existing = readFileSync(OUT, 'utf8');
    } catch {
      console.error(`${OUT} does not exist — run i18n-extract.ts`);
      process.exit(1);
    }
    if (existing !== text) {
      console.error(`${OUT} is out of date — re-run i18n-extract.ts`);
      process.exit(1);
    }
    console.log('engine catalogue is up to date');
  } else {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT, text);
    const sites = engineSites();
    const { catalogue, icuTodo } = buildCatalogue(sites);
    console.log(`wrote ${OUT}`);
    console.log(`  ${sites.length} sites -> ${Object.keys(catalogue).length} messages`);
    console.log(`  ${icuTodo.length} need ICU authoring in Phase 2`);
  }
}
