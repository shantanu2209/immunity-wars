/**
 * THE i18n DRIFT TEST — engine catalogue, legs 1 and 2. Task C5b.
 *
 * `packages/content/src/i18n/en/engine.json` has NO CONSUMER. docs/PHASE1_BRIEF.md §3 requires
 * the extraction anyway — retrofitting i18n is expensive and the Hindi edition is a committed
 * grant deliverable — and names the risk plainly: with nothing rendering the catalogue, it can
 * drift from the engine silently, and no amount of green tests elsewhere would say so.
 *
 * **This file is the entire safety mechanism.** Two static legs:
 *
 *   LEG 1  COMPLETENESS. Every call site has a catalogue entry and every entry has a call site.
 *          Catches a string added or deleted in the engine without the catalogue moving.
 *   LEG 2  BYTE FIDELITY. Each entry equals its source exactly, once interpolations are
 *          normalised to placeholders. Catches a wording edit on either side.
 *
 * LEG 3 — proving `format(catalogue[key], args)` reproduces the rendered bytes — is Phase 2
 * work. There is no formatter in the product yet, so it could only validate a test harness
 * against itself. Reasoning in docs/TASK_C_HANDOFF.md §3a.
 *
 * THE ERROR STRINGS ARE FROZEN and have been since Task B, specifically so this could happen:
 * `actions.test.ts` compares every one against `tools/legacy/v2_engine.js`. So the chain is
 *
 *     legacy  <->  engine        (actions.test.ts, already passing)
 *     engine  <->  catalogue     (this file)
 *
 * and the catalogue is transitively pinned to legacy without ever comparing to it directly.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildCatalogue, engineSites, type Site } from '../i18n-extract.js';

const CATALOGUE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../packages/content/src/i18n/en/engine.json',
);

const raw = JSON.parse(readFileSync(CATALOGUE_PATH, 'utf8')) as Record<string, unknown>;
const meta = raw['$meta'] as Record<string, unknown>;
const icuTodoInFile = raw['$icuTodo'] as string[];

/** The catalogue proper: everything that is not a `$`-prefixed metadata key. */
const catalogue = Object.fromEntries(
  Object.entries(raw).filter(([k]) => !k.startsWith('$')),
) as Record<string, string>;

const sites = engineSites();
const built = buildCatalogue(sites);

describe('LEG 1 — completeness: sites and catalogue entries agree', () => {
  it('every call site resolves to a catalogue entry', () => {
    const missing: string[] = [];
    for (const s of sites) {
      const key = built.keyOf.get(s.message);
      if (!key || !(key in catalogue))
        missing.push(`${s.file}:${s.line}  ${s.message.slice(0, 60)}`);
    }
    expect(missing).toEqual([]);
  });

  it('every catalogue entry is used by at least one call site', () => {
    const live = new Set(sites.map((s) => built.keyOf.get(s.message)));
    const orphans = Object.keys(catalogue).filter((k) => !live.has(k));
    expect(orphans).toEqual([]);
  });

  it('the key sets match exactly, in both directions', () => {
    expect(Object.keys(catalogue).sort()).toEqual(Object.keys(built.catalogue).sort());
  });

  it('the counts in $meta match what the engine actually contains', () => {
    // The header is the number a reader trusts at a glance, so it is asserted rather than
    // assumed to have been regenerated.
    expect(meta['sites']).toBe(sites.length);
    expect(meta['messages']).toBe(Object.keys(catalogue).length);
  });

  it('identical text at several sites is ONE entry, not several', () => {
    // A translator translates a message, not a call site. 164 sites collapse to 149 messages.
    expect(sites.length).toBeGreaterThan(Object.keys(catalogue).length);
    const byMessage = new Set(sites.map((s) => s.message));
    expect(byMessage.size).toBe(Object.keys(catalogue).length);
  });
});

describe('LEG 2 — byte fidelity: each entry equals its source', () => {
  it('every catalogue value is byte-identical to the engine string it came from', () => {
    const wrong: string[] = [];
    for (const [key, value] of Object.entries(built.catalogue)) {
      if (catalogue[key] !== value) {
        wrong.push(`${key}\n    catalogue: ${catalogue[key]}\n    engine:    ${value}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('error strings survive extraction unchanged — they are frozen against legacy', () => {
    // Spot-checked against strings actions.test.ts pins byte-for-byte to v2_engine.js. If the
    // extractor ever mangles quoting, escaping or an apostrophe, this says so in plain terms.
    const frozen = [
      'Game over.',
      'Draw first.',
      'Not in command.',
      'No Action Points.',
      'Illegal move.',
      'B-Cell is stationary.',
      'Unknown player.',
      "You don't have that much AP to return.",
      'Antibodies cannot neutralise that.',
      'No such pathogen.',
    ];
    const values = new Set(Object.values(catalogue));
    for (const f of frozen) {
      expect(values.has(f), `frozen error string missing from the catalogue: ${f}`).toBe(true);
    }
  });

  it('HTML in log messages is preserved verbatim, tags and entities alike', () => {
    // 50 of the 164 carry markup. ICU treats `{` as syntax, so this is where a careless
    // escaping pass would do damage — and it would do it silently.
    const withHtml = Object.values(catalogue).filter((v) => /<[a-z]+>/i.test(v));
    expect(withHtml.length).toBeGreaterThan(30);
    for (const v of withHtml) {
      const open = (v.match(/<b>/g) ?? []).length;
      const close = (v.match(/<\/b>/g) ?? []).length;
      expect(open, `unbalanced <b> in: ${v.slice(0, 70)}`).toBe(close);
    }
  });

  it('every placeholder is a bare {name} — no ICU syntax has been invented yet', () => {
    // Phase 2 authors the select/plural forms. Until then a placeholder must be exactly what
    // the extractor produced, so a half-finished ICU edit is visible rather than plausible.
    for (const [key, value] of Object.entries(catalogue)) {
      for (const ph of value.match(/\{[^}]*\}/g) ?? []) {
        expect(ph, `${key} has non-placeholder braces`).toMatch(/^\{[A-Za-z][A-Za-z0-9]*\}$/);
      }
    }
  });
});

/**
 * THE 8 ICU-HARD SITES, ONE NAMED TEST EACH.
 *
 * docs/STRING_INVENTORY.md enumerates them: 8 sites carrying a ternary inside an interpolation,
 * one of which is a plural. They ride separately rather than in the bulk comparison above
 * because they are where the format decision actually bites, and because Phase 2 has to find
 * them again. A named failing test is a better handover than a line in a document.
 *
 * What is asserted here is what CAN be asserted statically: the site still exists, the catalogue
 * still carries it, and it is still flagged as needing ICU authoring. Whether the eventual ICU
 * renders correctly is leg 3, in Phase 2.
 */
describe('the 8 sites needing ICU select/plural in Phase 2', () => {
  const icu = sites.filter((s) => s.icuTodo);
  const keyOf = (s: Site): string => built.keyOf.get(s.message) ?? '(no key)';

  it('there are exactly 8, and no more have appeared', () => {
    // If this rises, a new interpolated ternary was written and Phase 2 inherits more work than
    // the handoff says. If it falls, one was simplified and the list below is stale.
    expect(new Set(icu.map((s) => `${s.file}:${s.line}`)).size).toBe(8);
  });

  const expected: [string, string, string][] = [
    ['plural — Action Point/Points', 'actions.ts', 'Action Point{pool2} to distribute'],
    ['select — optional AP cost suffix', 'actions.ts', 'antibody <b>neutralised</b>'],
    ['select — degranulate, died or damaged', 'actions.ts', 'Eosinophil DEGRANULATED'],
    ['select — memory response AP on hard', 'actions.ts', 'Memory response</b> destroyed'],
    ['select — resident name fallback', 'actions.ts', 'moved to'],
    ['select — co-infection burrowing clause', 'construct.ts', 'Co-infection: an extra'],
    ['select — event good/bad glyph', 'construct.ts', '</b> — '],
    ['select — burst, EUK or virus wording', 'spread.ts', 'cell(s) <b>burst</b>'],
  ];

  for (const [name, file, fragment] of expected) {
    it(`${name} (${file}) is present, catalogued, and flagged for Phase 2`, () => {
      const site = icu.find((s) => s.file === file && s.message.includes(fragment));
      expect(site, `no ICU site in ${file} containing ${JSON.stringify(fragment)}`).toBeDefined();

      const key = keyOf(site!);
      expect(catalogue[key], `${key} missing from the catalogue`).toBeDefined();
      expect(catalogue[key]).toBe(site!.message);
      expect(icuTodoInFile, `${key} is not flagged in $icuTodo`).toContain(key);
    });
  }

  it('$icuTodo lists exactly the flagged messages, with nothing stale', () => {
    const fromSource = [...new Set(icu.map((s) => keyOf(s)))].sort();
    expect([...icuTodoInFile].sort()).toEqual(fromSource);
  });
});
