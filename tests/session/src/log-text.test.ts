/**
 * CP5 — EVERY LOG LINE THE ENGINE WRITES IS EITHER IN THE CATALOGUE OR ONE OF THE FIVE KNOWN
 * COMPOSED SITES (FINDINGS #53). The log panel renders the catalogue's templates and renders a
 * miss plainly; this is what keeps "plainly" honest — a NEW miss fails here rather than
 * hiding in the panel. The five shapes below are the test's oracle for "known composed";
 * they mirror `$meta.unextractedSites` in engine.json, which the extractor's own test pins at
 * five. When the engine emits ids (Phase 3), both lists and this file go.
 *
 * Also pinned: the template match RECOVERS the message — in the English edition the rendered
 * text equals the engine's text exactly, so the matcher adds nothing and loses nothing.
 */

import { describe, expect, it } from 'vitest';

import { ENGINE_I18N_EN } from '@immunity-wars/content';
import type { GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage } from '@immunity-wars/session';
import { engineLogText } from '@immunity-wars/ui';

import { SEARCH_SEEDS, clone, commandStates } from './constructed.js';

/** The five composed sites, as shapes. */
const KNOWN_COMPOSED: { site: string; shape: RegExp }[] = [
  {
    site: 'actions.ts produce',
    shape: /^<b>B-Cell<\/b> produced \d+ <b>[A-Z]+<\/b> antibod(y|ies) \(\d+\/\d+\)\./,
  },
  { site: 'actions.ts strike', shape: /^<b>[^<]+<\/b> (killed|struck) the .+/ },
  { site: 'actions.ts tag', shape: /^Antibod(ies|y) <b>(coated|tagged)<\/b> .+/ },
  { site: 'actions.ts engulf', shape: /^<b>Monocyte<\/b> (engulfed|chipped) .+/ },
  { site: 'actions.ts draw entry', shape: /^(Infection: )?<b>[^<]+<\/b> entered via the .+/ },
];

function logsOf(state: GameState): { msg: string; kind: string }[] {
  const s = LocalSession.resume(clone(state), { storage: new MemoryStorage(), now: () => 0 });
  const log = (s.getView().game['log'] as { msg?: unknown; kind?: unknown }[] | undefined) ?? [];
  s.dispose();
  return log.map((l) => ({ msg: String(l.msg ?? ''), kind: String(l.kind ?? '') }));
}

describe('CP5: the log renders through the catalogue, and the only misses are the five known composed sites', () => {
  const seen = new Map<string, string>();
  for (const seed of SEARCH_SEEDS.slice(0, 4)) {
    for (const difficulty of ['training', 'normal', 'hard']) {
      for (const st of commandStates(seed, difficulty, 100)) {
        for (const l of logsOf(st)) if (!seen.has(l.msg)) seen.set(l.msg, difficulty);
      }
    }
  }
  const messages = [...seen.keys()];
  const matched = messages.filter((m) => engineLogText(m).matched);
  const missed = messages.filter((m) => !engineLogText(m).matched);
  const unknownMisses = missed.filter((m) => !KNOWN_COMPOSED.some((k) => k.shape.test(m)));
  const perSite = KNOWN_COMPOSED.map((k) => ({
    site: k.site,
    n: missed.filter((m) => k.shape.test(m)).length,
  }));

  it('walked a real log (vacuity guards): many distinct lines, most matched, some composed', () => {
    expect(messages.length).toBeGreaterThan(80);
    expect(matched.length).toBeGreaterThan(missed.length);
    expect(
      missed.length,
      'no composed line ever occurred — the plain-render path was never exercised',
    ).toBeGreaterThan(0);
    for (const s of perSite.filter((p) => p.site !== 'actions.ts strike')) {
      expect(s.n, `${s.site} never occurred in the corpus`).toBeGreaterThan(0);
    }
  });

  it('every miss is one of the five known composed sites — nothing new hides in the panel', () => {
    expect(
      unknownMisses,
      `log lines the catalogue does not hold and no known composed site explains:\n  ${unknownMisses.slice(0, 8).join('\n  ')}\n  (matched ${String(matched.length)}, composed ${String(missed.length)}: ${perSite.map((p) => `${p.site}=${String(p.n)}`).join(', ')})`,
    ).toEqual([]);
  });

  it('a template match recovers the message exactly in the English edition', () => {
    const byTemplate = matched.filter((m) => !Object.values(ENGINE_I18N_EN).includes(m));
    expect(byTemplate.length, 'no line was matched by template — only exact hits').toBeGreaterThan(
      0,
    );
    for (const m of byTemplate) expect(engineLogText(m).text).toBe(m);
  });

  it('CONTROL: an invented line is a miss that no known site explains', () => {
    const fake = '<b>Monocyte</b> did something the engine never says.';
    expect(engineLogText(fake).matched).toBe(false);
    expect(KNOWN_COMPOSED.some((k) => k.shape.test(fake))).toBe(false);
  });

  it('CONTROL: the template matcher does not swallow a different message that shares a prefix', () => {
    // "recalled to the bloodstream" is a template with {cname}; a message that starts the same
    // way but ends differently must not match it.
    const r = engineLogText('<b>Monocyte</b> recalled to the bloodstream and then some.');
    expect(r.matched).toBe(false);
  });
});
