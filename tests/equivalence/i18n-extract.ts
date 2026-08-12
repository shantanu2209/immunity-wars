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
  fn: 'err' | 'pushLog';
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

export function engineSites(): Site[] {
  const out: Site[] = [];
  for (const f of readdirSync(ENGINE).sort()) {
    if (!f.endsWith('.ts') || f.endsWith('.test.ts')) continue;
    const path = `${ENGINE}/${f}`;
    const sf = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.ES2022, true);

    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const fn = n.expression.text;
        if (fn === 'err' || fn === 'pushLog') {
          const arg = fn === 'err' ? n.arguments[0] : n.arguments[1];
          if (!arg) {
            ts.forEachChild(n, visit);
            return;
          }
          const used = new Set<string>();
          let message: string | null = null;
          const params: string[] = [];

          if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
            message = arg.text;
          } else if (ts.isTemplateExpression(arg)) {
            let acc = arg.head.text;
            for (const span of arg.templateSpans) {
              const p = paramName(span.expression.getText(sf), used);
              params.push(p);
              acc += `{${p}}${span.literal.text}`;
            }
            message = acc;
          }

          if (message !== null) {
            const raw = arg.getText(sf);
            out.push({
              file: f,
              line: sf.getLineAndCharacterOfPosition(arg.getStart(sf)).line + 1,
              fn,
              message,
              params,
              // A ternary inside an interpolation, or a nested template — ICU select/plural.
              icuTodo:
                /\$\{[^}]*\?[^}]*:/.test(raw) || /\?\s*`/.test(raw) || /===\s*1\s*\?/.test(raw),
            });
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return out;
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
      messages: Object.keys(catalogue).length,
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
