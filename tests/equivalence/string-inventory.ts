/**
 * THE PLAYER-VISIBLE STRING INVENTORY — Task C5a.
 *
 * docs/PHASE1_BRIEF.md §3: "All player-visible strings must be extracted to i18n message
 * catalogues in this phase." Before extracting anything, this counts what there is, exactly.
 *
 * WHY A COUNT AND NOT AN ESTIMATE. A regex sweep put the loose UI prose at "~60". That is the
 * same shape of number that was wrong about which arm left the coverage exclusion list at C4 —
 * asserted from a pattern rather than enumerated. The catalogues are built against this file, so
 * an approximation here becomes a silently incomplete catalogue later, and the i18n drift test
 * would happily prove a partial catalogue matches its partial source.
 *
 * Writes docs/STRING_INVENTORY.md. Sources:
 *
 *   ENGINE   every err() and pushLog() call site, parsed from the AST rather than grepped, so a
 *            template literal spanning lines or containing braces is handled correctly
 *   UI       the string tables in v2_ui.html, via legacy-ui.ts
 *   UI PROSE everything else in v2_ui.html that reaches a player — the part that needed counting
 *
 *   npx tsx tests/equivalence/string-inventory.ts
 *   npx tsx tests/equivalence/string-inventory.ts --check   # fail if it would change
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import ts from 'typescript';

import { legacyUiTable } from './src/legacy-ui.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = resolve(HERE, '../../packages/engine/src');
const UI = resolve(HERE, '../../tools/legacy/v2_ui.html');
const OUT = resolve(HERE, '../../docs/STRING_INVENTORY.md');

/* ================================================================== *
 * ENGINE — err() and pushLog(), from the AST
 * ================================================================== */

interface EngineString {
  file: string;
  line: number;
  fn: 'err' | 'pushLog';
  raw: string;
  slots: number;
  hasHtml: boolean;
  hasSelect: boolean;
  hasPlural: boolean;
}

function engineStrings(): EngineString[] {
  const out: EngineString[] = [];
  for (const f of readdirSync(ENGINE).sort()) {
    if (!f.endsWith('.ts') || f.endsWith('.test.ts')) continue;
    const path = `${ENGINE}/${f}`;
    const sf = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.ES2022, true);
    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const fn = n.expression.text;
        if (fn === 'err' || fn === 'pushLog') {
          const arg = fn === 'err' ? n.arguments[0] : n.arguments[1];
          if (
            arg &&
            (ts.isStringLiteral(arg) ||
              ts.isTemplateExpression(arg) ||
              ts.isNoSubstitutionTemplateLiteral(arg))
          ) {
            const raw = arg.getText(sf);
            out.push({
              file: f,
              line: sf.getLineAndCharacterOfPosition(arg.getStart(sf)).line + 1,
              fn,
              raw,
              slots: ts.isTemplateExpression(arg) ? arg.templateSpans.length : 0,
              hasHtml: /<[a-z]+[ >]/i.test(raw),
              // A ternary INSIDE an interpolation -> ICU select
              hasSelect: /\$\{[^}]*\?[^}]*:/.test(raw) || /\?\s*`/.test(raw),
              hasPlural: /===\s*1\s*\?/.test(raw),
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

/* ================================================================== *
 * UI — the string tables
 * ================================================================== */

interface TableCount {
  name: string;
  entries: number;
  strings: number;
  what: string;
  namespace: string;
}

function uiTables(): TableCount[] {
  const t = <T>(n: string): T => legacyUiTable<T>(n);
  const keys = (o: object): number => Object.keys(o).length;

  const FACT = t<Record<string, string>>('FACT');
  const DZINFO = t<Record<string, Record<string, string>>>('DZINFO');
  const S = t<Record<string, unknown[]>>('S');
  const UM = t<Record<string, Record<string, string>>>('UM');
  const UI_ = t<Record<string, Record<string, string>>>('UI_');
  const RNAME = t<Record<string, string>>('RNAME');
  const RGLYPH = t<Record<string, string>>('RGLYPH');
  const REGION_LABEL = t<Record<string, string>>('REGION_LABEL');
  const ENTRY = t<Record<string, { t: string }>>('ENTRY');

  const dzinfoFields = Object.values(DZINFO).reduce((s, v) => s + keys(v), 0);

  return [
    {
      name: 'DZINFO',
      entries: keys(DZINFO),
      strings: dzinfoFields,
      what: 'discovered / causes / found / prevent / treat, per disease',
      namespace: '**diseases**',
    },
    {
      name: 'FACT',
      entries: keys(FACT),
      strings: keys(FACT),
      what: 'one-line hook shown on the card',
      namespace: '**diseases**',
    },
    {
      name: 'S (DZSTATS)',
      entries: keys(S),
      strings: keys(S),
      what: 'rarity label only — the four ratings are numbers',
      namespace: '**diseases**',
    },
    {
      name: 'UM',
      entries: keys(UM),
      strings: Object.values(UM).reduce((s, v) => s + (v['n'] ? 1 : 0) + (v['r'] ? 1 : 0), 0),
      what: 'cell name + role blurb (glyph is not translatable)',
      namespace: 'ui',
    },
    {
      name: 'UI_',
      entries: keys(UI_),
      strings: Object.values(UI_).filter((v) => v['n']).length,
      what: 'invader type name (colour and glyph are not text)',
      namespace: 'ui',
    },
    {
      name: 'RNAME',
      entries: keys(RNAME),
      strings: keys(RNAME),
      what: 'resident macrophage names',
      namespace: 'ui',
    },
    {
      name: 'RGLYPH',
      entries: keys(RGLYPH),
      strings: 0,
      what: 'single glyphs — NOT translatable',
      namespace: '—',
    },
    {
      name: 'REGION_LABEL',
      entries: keys(REGION_LABEL),
      strings: keys(REGION_LABEL),
      what: 'region names for the zoom UI',
      namespace: 'ui',
    },
    {
      name: 'ENTRY[].t',
      entries: keys(ENTRY),
      strings: Object.values(ENTRY).filter((v) => v.t).length,
      what: 'entry-lane labels drawn on the board',
      namespace: 'board',
    },
  ];
}

/* ================================================================== *
 * UI PROSE — everything else in v2_ui.html that reaches a player
 *
 * COUNTED, not estimated. Every string literal in the script, minus the ones already accounted
 * for by a table, minus anything that is plainly not prose (CSS, selectors, keys, glyphs).
 * The exclusions are listed in the report so the number can be argued with.
 * ================================================================== */

interface Prose {
  text: string;
  line: number;
}

const TABLE_NAMES = [
  'FACT',
  'DZINFO',
  'S',
  'UM',
  'UI_',
  'RNAME',
  'RGLYPH',
  'REGION_LABEL',
  'ENTRY',
  'REGIONS',
  'REGION_BOX',
  'ORGAN_ART',
  'ORGAN_POS',
  'CHIP_POS',
  'BRANCH',
  'ROUTE',
  'HUB',
];

function uiProse(): { prose: Prose[]; ambiguous: Prose[]; dropped: Map<string, number> } {
  const html = readFileSync(UI, 'utf8');
  const blocks: string[] = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) if (m[1]) blocks.push(m[1]);
  const src = blocks.join('\n;\n');
  const sf = ts.createSourceFile('ui.js', src, ts.ScriptTarget.ES2022, true);

  /* Ranges belonging to the known data tables — their strings are counted above, not here. */
  const tableRanges: [number, number][] = [];
  const findTables = (n: ts.Node): void => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      TABLE_NAMES.includes(n.name.text) &&
      n.initializer
    ) {
      tableRanges.push([n.initializer.getStart(sf), n.initializer.getEnd()]);
    }
    ts.forEachChild(n, findTables);
  };
  findTables(sf);
  const inTable = (pos: number): boolean => tableRanges.some(([a, b]) => pos >= a && pos <= b);

  const prose: Prose[] = [];
  const ambiguous: Prose[] = [];
  const dropped = new Map<string, number>();
  // Block body, not a concise one. `(): void => map.set(...)` returns the Map and TS2322s on the
  // annotation — harmless at runtime, which is exactly why it survived until this file was
  // brought inside `pnpm typecheck`.
  const drop = (why: string): void => {
    dropped.set(why, (dropped.get(why) ?? 0) + 1);
  };
  const seen = new Set<string>();

  /**
   * THREE BUCKETS, NOT TWO — because a two-way filter is wrong in both directions.
   *
   * The first version of this counted 316 and was precise and WRONG. It kept
   * `translate(0,0) scale(1)` (a CSS transform: lowercase letters and a space, so it passed
   * every exclusion) and it dropped `End turn` (8 characters, under the length floor) — a real
   * button label that needs translating. Over-counting and under-counting at once.
   *
   * There is no mechanical test for "does a player read this". So: classify confidently where
   * the evidence is strong, and put the rest in AMBIGUOUS, enumerated for a human. A range with
   * a documented middle is honest; a single wrong number is not.
   */
  const CODE_SHAPED =
    /=>|\bfunction\b|;\s*$|^\s*[{[]|\$\{[^}]*\}\s*$|^\w+\(|\bdocument\.|\bwindow\./;
  const CSS_SHAPED =
    /^(translate|scale|rotate|matrix|calc|rgba?|hsla?|var|url|linear-gradient)\(|^[.#][a-zA-Z-]|^[a-z-]+\s*:\s*[^ ]|\d(px|%|em|rem|vh|vw|deg|s)\b/;
  const SENTENCE = /[.!?…]/;
  /** A capitalised word then a lowercase word, e.g. "Draw a card" — reads as English. */
  const ENGLISH = /\b[A-Z][a-z]+\b.*\b[a-z]{2,}\b|\b[a-z]{2,}\b.*\b[a-z]{2,}\b/;

  const visit = (n: ts.Node): void => {
    if (
      ts.isStringLiteral(n) ||
      ts.isNoSubstitutionTemplateLiteral(n) ||
      ts.isTemplateExpression(n)
    ) {
      const pos = n.getStart(sf);
      const text = n.getText(sf).slice(1, -1);
      if (!inTable(pos)) {
        const line = sf.getLineAndCharacterOfPosition(pos).line + 1;
        const bare = text
          .replace(/<[^>]+>/g, '')
          .replace(/\$\{[^}]*\}/g, '§')
          .trim();

        const tokens = bare.split(/\s+/).filter(Boolean);
        /** camelCase or kebab identifiers only — a CSS class list or an action key, never prose. */
        const identifiersOnly =
          tokens.length > 0 &&
          tokens.every((t) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(t)) &&
          tokens.some((t) => /[a-z][A-Z]|-/.test(t));

        /**
         * Strong evidence of prose, measured on `bare` — the text with tags and interpolations
         * already stripped. Checked BEFORE the markup and identifier drops, and the order is
         * load-bearing: a template like `<div class="x">Some sentence.</div>` carries BOTH a
         * markup attribute and a player-visible sentence, and dropping it for the attribute
         * would silently lose the sentence.
         */
        const looksProse = SENTENCE.test(bare) || (tokens.length >= 3 && ENGLISH.test(bare));

        if (!/[a-z]/.test(text)) drop('no lowercase letter (glyph, code, symbol)');
        else if (seen.has(text)) drop('duplicate of a string already counted');
        // The unambiguous non-text shapes go first: nothing here can contain prose.
        else if (CSS_SHAPED.test(text.trim())) drop('CSS selector, declaration, value or function');
        else if (CODE_SHAPED.test(text.trim())) drop('code-shaped (expression, selector, call)');
        else if (looksProse) {
          seen.add(text);
          prose.push({ text, line });
        } else if (/\b(class|data-[a-z]+|style|id)\s*=\s*["'`]/.test(text)) {
          drop('markup with no prose outside the tags');
        } else if (identifiersOnly) drop('identifier or CSS class list, not prose');
        else if (!/\s/.test(bare) && bare.length < 12) drop('single short token (key, id, class)');
        else if (bare.length < 3) drop('shorter than 3 characters after stripping markup');
        else {
          seen.add(text);
          ambiguous.push({ text, line });
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { prose, ambiguous, dropped };
}

/* ================================================================== *
 * the report
 * ================================================================== */

function report(): string {
  const eng = engineStrings();
  const tables = uiTables();
  const { prose, ambiguous, dropped } = uiProse();

  const errs = eng.filter((e) => e.fn === 'err');
  const logs = eng.filter((e) => e.fn === 'pushLog');
  const selects = eng.filter((e) => e.hasSelect);
  const plurals = eng.filter((e) => e.hasPlural);

  const hardCount = new Set([...selects, ...plurals]).size;
  const tableStrings = tables.reduce((s, t) => s + t.strings, 0);
  const diseaseStrings = tables
    .filter((t) => t.namespace === '**diseases**')
    .reduce((s, t) => s + t.strings, 0);
  const total = eng.length + tableStrings + prose.length;

  const L: string[] = [
    '# Player-visible string inventory',
    '',
    '**Generated by `npx tsx tests/equivalence/string-inventory.ts`. Do not edit by hand.**',
    '',
    'Task C5a. What must go into the i18n catalogues, counted rather than estimated — the',
    'catalogues are built against this file, so an approximation here becomes a silently',
    'incomplete catalogue, and the drift test would happily prove a partial catalogue matches a',
    'partial source.',
    '',
    '| source | strings |',
    '|---|---|',
    `| engine \`err()\` | ${errs.length} |`,
    `| engine \`pushLog()\` | ${logs.length} |`,
    `| UI tables | ${tableStrings} |`,
    `| UI prose (loose) | ${prose.length} |`,
    `| UI, needs a human call | ${ambiguous.length} |`,
    `| **TOTAL (confident)** | **${total}** |`,
    `| **TOTAL (upper bound)** | **${total + ambiguous.length}** |`,
    '',
    `Of which **${diseaseStrings}** are the \`diseases\` namespace — see below.`,
    '',
    '---',
    '',
    '## 1. Engine strings',
    '',
    `${eng.length} call sites, ${new Set(eng.map((e) => e.raw)).size} distinct literals.`,
    'Parsed from the AST, not grepped, so multi-line templates and braces inside strings are',
    'handled rather than approximated.',
    '',
    '**These are frozen byte-for-byte** and have been since Task B, specifically so C5 could',
    'extract them: `tests/equivalence/src/actions.test.ts` compares every error string against',
    'legacy. The catalogue must reproduce them exactly.',
    '',
    '| file | err() | pushLog() |',
    '|---|---|---|',
  ];
  const files = [...new Set(eng.map((e) => e.file))].sort();
  for (const f of files) {
    L.push(
      `| \`${f}\` | ${errs.filter((e) => e.file === f).length} | ${logs.filter((e) => e.file === f).length} |`,
    );
  }

  const bySlots = new Map<number, number>();
  for (const e of eng) bySlots.set(e.slots, (bySlots.get(e.slots) ?? 0) + 1);
  L.push(
    '',
    '### Interpolation',
    '',
    '| slots | strings |',
    '|---|---|',
    ...[...bySlots.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `| ${k} | ${v} |`),
    '',
    `${eng.filter((e) => e.hasHtml).length} contain HTML tags. That matters for ICU, which treats`,
    '`{` as syntax: every literal brace needs escaping, and a mis-escaped one parses fine and',
    'formats wrongly. Leg 3 of the drift test exists for exactly that failure.',
    '',
    '### The ICU-hard cases — the only ones, enumerated',
    '',
    `**${hardCount} sites**, of which **${plurals.length} needs \`plural\`** and the rest need`,
    '`select` (a ternary inside an interpolation). Everything else is a straight substitution.',
    '',
    'Counted as SITES, not as rules. The plural case also contains a ternary, so adding "selects"',
    'and "plurals" would report 9 for what is 8 sites — an earlier draft of this line did exactly',
    'that.',
    '',
    'Each of these gets **its own named test** rather than riding in the bulk comparison.',
    '',
    '| # | site | kind | source |',
    '|---|---|---|---|',
  );
  const hardList = [...selects, ...plurals.filter((p) => !selects.includes(p))];
  const hard = hardList.sort((a, b) =>
    a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file),
  );
  hard.forEach((h, i) => {
    const kind = h.hasPlural ? 'plural' : 'select';
    const src = h.raw.replace(/\s+/g, ' ').slice(0, 120).replace(/\|/g, '\\|');
    L.push(`| ${i + 1} | \`${h.file}:${h.line}\` | ${kind} | \`${src}\` |`);
  });

  L.push(
    '',
    '## 2. UI tables',
    '',
    'Already extracted as structured content at C3, so these are **not** at risk of the drift the',
    'catalogues exist to prevent. Listed because they are player-visible text and the brief',
    'requires them catalogued.',
    '',
    '| table | entries | strings | namespace | what |',
    '|---|---|---|---|---|',
  );
  for (const t of tables) {
    L.push(`| \`${t.name}\` | ${t.entries} | ${t.strings} | ${t.namespace} | ${t.what} |`);
  }

  L.push(
    '',
    `### The \`diseases\` namespace — ${diseaseStrings} strings, and a separate job`,
    '',
    `\`DZINFO\` alone is ${tables.find((t) => t.name === 'DZINFO')?.strings ?? 0} fields:`,
    'discovered, causes, found, prevent and treat, for every disease in the game. With `FACT` and',
    'the rarity labels it is **the majority of all player-visible text in the product**.',
    '',
    "**It is not UI chrome. It is Kartik's written science.** Translating it into Hindi needs a",
    'subject-matter translator who can carry immunology accurately, not a UI string pass — a',
    'mistranslated "prevent" line is misinformation about a real disease, in a product aimed at',
    'schoolchildren.',
    '',
    'So it gets its own namespace, and **the split is about COMMISSIONING, not safety**:',
    '`packages/content/src/diseases/diseases.json` already holds this text as validated content',
    'with a test proving it still matches `v2_ui.html`, so it cannot drift regardless. Separating',
    'the namespace is what lets the Hindi edition — a committed grant deliverable — be scoped and',
    'costed honestly instead of hidden inside one large number.',
    '',
    '## 3. Loose UI prose',
    '',
    `**${prose.length} confidently prose**, plus **${ambiguous.length} that need a human call**,`,
    'counted from the AST rather than estimated.',
    '',
    'Two earlier numbers were wrong and both are recorded so the method is visible. A regex sweep',
    'during planning guessed **~60**. A first pass of this tool said **316** — precise and still',
    'wrong in BOTH directions: it kept `translate(0,0) scale(1)`, a CSS transform that has',
    'lowercase letters and a space so it passed every exclusion, and it dropped `End turn` for',
    'being under an 8-character floor, which is a real button label that needs translating.',
    '',
    '**There is no mechanical test for "does a player read this".** So strings are classified',
    'confidently where the evidence is strong — real sentence punctuation, or several English',
    'words — and everything else is listed as ambiguous for a human to rule on. A range with a',
    'documented middle is honest; a single wrong number is not.',
    '',
    "Everything is a string literal in `v2_ui.html`'s script that is not inside a known data",
    'table, after these exclusions:',
    '',
    '| dropped because | count |',
    '|---|---|',
    ...[...dropped.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => `| ${w} | ${n} |`),
    '',
    '**The exclusions are listed so the number can be argued with.** If one of these rules is',
    'wrong, the catalogue is short by exactly that many strings and this table says where to look.',
    '',
    `### The ${ambiguous.length} that need a human call`,
    '',
    'Neither clearly prose nor clearly code. **Someone has to read these and decide** — which is',
    'the point of listing them rather than folding them into a number in either direction.',
    '',
    '| line | string |',
    '|---|---|',
    ...ambiguous
      .sort((a, b) => a.line - b.line)
      .map((p) => `| ${p.line} | ${p.text.replace(/\|/g, '\\|').slice(0, 160)} |`),
    '',
    '<details><summary>All ' + prose.length + ' confident strings</summary>',
    '',
    '| line | string |',
    '|---|---|',
    ...prose
      .sort((a, b) => a.line - b.line)
      .map((p) => `| ${p.line} | ${p.text.replace(/\|/g, '\\|').slice(0, 160)} |`),
    '',
    '</details>',
  );

  return L.join('\n') + '\n';
}

/**
 * ONLY RUN WHEN EXECUTED DIRECTLY. NEVER ON IMPORT.
 *
 * Same guard, same reason as `reachability-report.ts` — see its note. At Task C5b a generator
 * with top-level side effects, imported by its own test, made that test unable to fail while
 * showing nineteen green tests. Nothing imports this file yet; the guard is what keeps that
 * from mattering when something does.
 */
const executedDirectly =
  process.argv[1] !== undefined && /string-inventory\.[tj]s$/.test(process.argv[1]);

if (executedDirectly) {
  const text = report();
  if (process.argv.includes('--check')) {
    if (readFileSync(OUT, 'utf8') !== text) {
      console.error(`${OUT} is out of date — re-run string-inventory.ts`);
      process.exit(1);
    }
    console.log('string inventory is up to date');
  } else {
    writeFileSync(OUT, text);
    console.log(`wrote ${OUT}`);
  }
}
