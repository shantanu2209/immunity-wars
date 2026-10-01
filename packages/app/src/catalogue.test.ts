/**
 * THE CATALOGUE AND THE SCREENS AGREE, BOTH WAYS (2 October 2026).
 *
 * `t()` takes any string, so nothing at compile time joins a screen to the catalogue. Two things
 * can then go wrong in silence, and each is held here.
 *
 *  1. A SENTENCE NO SCREEN ASKS FOR. When screens are replaced their sentences stay behind: 22 had
 *     by the time the Clay screens were done, found when Shantanu ruled that what is no longer
 *     needed is removed. Nobody sees them, and a Hindi translator would be handed every one.
 *  2. A KEY A SCREEN ASKS FOR THAT IS NOT THERE. It renders as ⟪key⟫, loudly, but only on the
 *     screen it is on, and only when somebody opens that screen.
 *
 * HOW A KEY IS FOUND TO BE USED. Sources are read as text, comments taken out, tests left out.
 *   named    the whole key stands in quotes somewhere:            'title.newGame'
 *   built    a template starts with its prefix:                   `difficulty.${d}`
 *   grown    a template grows a key that IS named, by one part:   `${row.labelKey}.${o}`
 * "Grown" is allowed only for a key whose parent is named and only while some template begins
 * with `${`, which is how the settings rows and the help's cells are written.
 *
 * WHY IT LIVES IN `packages/app`. It reads the sources of `packages/ui` and of this package. The
 * test cache hashes a package's own files and its dependencies' (the `^test` edge): this package
 * depends on `ui` and on `content`, so here everything the test reads is in its hash. In
 * `packages/ui`, where it was first written, a change in this package's sources would have
 * replayed a cached green (docs/FINDINGS.md #112).
 *
 * WHAT THIS CANNOT SEE: whether a named key is ever REACHED. A sentence asked for by code that
 * is switched off (the hints and the coach, until the guided game replaces them) counts as used.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { UI_I18N_EN } from '@immunity-wars/content';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../../..');
const ROOTS = ['packages/ui/src', 'packages/app/src'];

function sourcesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourcesUnder(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith('.d.ts')
      ? [path]
      : [];
  });
}

/** Comments out: a key named only in a comment is not asked for by anything. */
const code = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

export interface Reading {
  /** Catalogue keys nothing names, builds or grows. */
  readonly unused: string[];
  /** Keys handed to `t()` whole, as a plain string, that the catalogue does not have. */
  readonly missing: string[];
  /** How many keys were counted used only because a template builds or grows them. */
  readonly byTemplate: number;
}

export function readCatalogue(keys: readonly string[], source: string): Reading {
  const text = code(source);
  const quoted = new Set(
    [...text.matchAll(/['"`]([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)['"`]/g)].map((m) => m[1] ?? ''),
  );
  const prefixes = [...text.matchAll(/`([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*\.)\$\{/g)].map(
    (m) => m[1] ?? '',
  );
  const grows = /`\$\{[^}]+\}\./.test(text);
  const known = new Set(keys);
  const unused: string[] = [];
  let byTemplate = 0;
  for (const key of keys) {
    if (quoted.has(key)) continue;
    const parent = key.slice(0, key.lastIndexOf('.'));
    if (prefixes.some((p) => key.startsWith(p)) || (grows && quoted.has(parent))) {
      byTemplate += 1;
      continue;
    }
    unused.push(key);
  }
  const asked = [...text.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '');
  const missing = [...new Set(asked.filter((k) => !known.has(k)))];
  return { unused, missing, byTemplate };
}

describe('the catalogue and the screens agree', () => {
  const files = ROOTS.flatMap((r) => sourcesUnder(join(REPO, r)));
  const source = files.map((f) => readFileSync(f, 'utf8')).join('\n');
  const keys = Object.keys(UI_I18N_EN);
  const reading = readCatalogue(keys, source);

  it('the sources and the catalogue were read', () => {
    // Read the instrument that reports coverage: a walk that found no file, or a catalogue with
    // no key, would pass both lines below.
    expect(files.length, 'THE SOURCES WERE NOT FOUND').toBeGreaterThan(80);
    expect(keys.length, 'THE CATALOGUE WAS NOT READ').toBeGreaterThan(500);
    // Some keys are only ever built. If none were counted that way the templates were not read,
    // and "unused" would be a list of every difficulty, cell and action.
    expect(reading.byTemplate, 'NO BUILT KEY WAS RECOGNISED').toBeGreaterThan(50);
  });

  it('every sentence in the catalogue is asked for by a screen', () => {
    expect(reading.unused, `NO SCREEN ASKS FOR: ${reading.unused.slice(0, 5).join(', ')}`).toEqual(
      [],
    );
  });

  it('every key a screen asks for by name is in the catalogue', () => {
    expect(
      reading.missing,
      `ASKED FOR AND NOT IN THE CATALOGUE: ${reading.missing.slice(0, 5).join(', ')}`,
    ).toEqual([]);
  });
});

describe('the reading itself, on planted sources', () => {
  const KEYS = ['a.named', 'b.x', 'b.y', 'row.size', 'row.size.big', 'left.behind'];
  const SRC = [
    "t('a.named');",
    't(`b.${which}`);',
    "const row = { labelKey: 'row.size' };",
    't(`${row.labelKey}.${o}`);',
  ].join('\n');

  it('CONTROL, must fail: a sentence nothing asks for is reported, and only that one', () => {
    expect(readCatalogue(KEYS, SRC).unused).toEqual(['left.behind']);
  });

  it('CONTROL, must pass: a named key, a built key and a grown key are each counted used', () => {
    const r = readCatalogue(
      KEYS.filter((k) => k !== 'left.behind'),
      SRC,
    );
    expect(r.unused).toEqual([]);
    expect(r.byTemplate).toBe(3);
  });

  it('CONTROL: a key named only in a comment is not used', () => {
    expect(
      readCatalogue(['only.inAComment'], "// see 'only.inAComment'\nconst x = 1;").unused,
    ).toEqual(['only.inAComment']);
  });

  it('CONTROL: a key asked for by name that the catalogue lacks is reported', () => {
    expect(readCatalogue(KEYS, SRC + "\nt('a.mistyped');").missing).toEqual(['a.mistyped']);
    expect(readCatalogue(KEYS, SRC).missing).toEqual([]);
  });
});
