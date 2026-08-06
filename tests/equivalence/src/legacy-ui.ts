/**
 * Read data tables out of `tools/legacy/v2_ui.html` without running the UI.
 *
 * `engine.ts` can load `v2_engine.js` wholesale because it is a CommonJS module with no DOM.
 * `v2_ui.html` is neither: it is a browser document whose script talks to `document`,
 * `localStorage` and the engine. Evaluating it wholesale would need a DOM and would run game
 * code; what is actually wanted is a handful of `const NAME = <literal>` declarations.
 *
 * So this parses the script with the TypeScript compiler, finds the declaration BY NAME, and
 * evaluates only its initialiser. Parsing rather than regex-matching matters for real reasons:
 *
 *   - `ORGAN_ART` holds SVG markup in TEMPLATE LITERALS containing `{`, `}` and `$`
 *   - the allocation-style tables contain `{` inside quoted strings
 *   - several declarations are separated by comments, and some share one statement
 *     (`const VW = 660, VH = 930;`)
 *
 * A brace-counting scan desynchronises on all three. This does not.
 *
 * `tools/legacy/` IS READ-ONLY — docs/TASK_C_HANDOFF.md §5. This module only ever reads.
 *
 * Used by:
 *   - the C3 content check, proving the extracted JSON still equals the legacy tables
 *   - the C5 i18n drift test, proving the catalogues still match the legacy source strings
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
const UI_PATH = resolve(HERE, '../../../tools/legacy/v2_ui.html');

/** The script text of the legacy UI, concatenated across every inline <script> block. */
function scriptText(): string {
  const html = readFileSync(UI_PATH, 'utf8');
  const blocks: string[] = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) if (m[1]) blocks.push(m[1]);
  if (!blocks.length) throw new Error(`no <script> blocks found in ${UI_PATH}`);
  return blocks.join('\n;\n');
}

let cachedInits: Map<string, string> | undefined;

/** Every top-level `const NAME = …` initialiser, by name, as source text. */
function initialisers(): Map<string, string> {
  if (cachedInits) return cachedInits;
  const sf = ts.createSourceFile('v2_ui.js', scriptText(), ts.ScriptTarget.ES2022, true);
  const out = new Map<string, string>();
  const visit = (n: ts.Node): void => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      // First declaration wins: the legacy file declares each of these exactly once, and a
      // later shadow inside a function would not be the table we mean.
      if (!out.has(n.name.text)) out.set(n.name.text, n.initializer.getText(sf));
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  cachedInits = out;
  return out;
}

/**
 * Evaluate one named table from the legacy UI.
 *
 * The initialisers wanted here are pure data — object, array and string/number literals, plus
 * the template literals in ORGAN_ART. `eval` on source WE read from a read-only file in our own
 * repository is the same trust boundary `engine.ts` already sits on, and it is what makes the
 * legacy file usable as an oracle at all.
 */
export function legacyUiTable<T = unknown>(name: string): T {
  const init = initialisers().get(name);
  if (init === undefined) {
    throw new Error(`v2_ui.html has no top-level declaration named ${name}`);
  }
  // eslint-disable-next-line no-eval
  return eval(`(${init})`) as T;
}

/** Names of every top-level const in the legacy UI — for tests that assert nothing was missed. */
export function legacyUiNames(): string[] {
  return [...initialisers().keys()];
}
