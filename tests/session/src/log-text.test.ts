/**
 * CP5, AS OF QUEUE Q8: EVERY LOG LINE THE ENGINE WRITES IS IN THE CATALOGUE, AND REACHES ITS OWN
 * ENTRY (FINDINGS #53, #102). The log panel renders the catalogue's templates and renders a miss
 * plainly; this is what keeps "plainly" from hiding anything, since a miss fails here.
 *
 * Until Q8 (30 September 2026) five composed sites were known misses, listed below as shapes and
 * allowed. Each is now one literal per sentence. The shapes stay, as OCCURRENCE guards: the test
 * shows those lines MATCHED on recorded play, by their own entries, rather than merely absent.
 *
 * Two more things are pinned. The template match RECOVERS the message: in the English edition the
 * rendered text equals the engine's text exactly, so the matcher adds nothing and loses nothing.
 * And no recorded line is AMBIGUOUS: where two templates match one line, the one fixing the most
 * text wins, strictly. English cannot see a wrong choice, which renders the same words; the Hindi
 * edition renders the chosen entry's translation, so a wrong one is the wrong sentence.
 */

import { describe, expect, it } from 'vitest';

import { ENGINE_I18N_EN } from '@immunity-wars/content';
import type { GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage } from '@immunity-wars/session';
import { engineLogText } from '@immunity-wars/ui';

import { SEARCH_SEEDS, clone, commandStates } from './constructed.js';

/** The five sites that were composed until Q8, as shapes, and the entries that now hold them. */
const FORMERLY_COMPOSED: { site: string; shape: RegExp; keys: string[] }[] = [
  {
    site: 'actions.ts produce',
    shape: /^<b>B-Cell<\/b> produced \d+ <b>[A-Z]+<\/b> antibod(y|ies) \(\d+\/\d+\)\./,
    keys: ['actions.bCellProducedAntibod', 'actions.bCellProducedAntibodAffinityMaturation'],
  },
  {
    site: 'actions.ts strike',
    shape: /^<b>[^<]+<\/b> (killed|struck) the .+/,
    keys: ['actions.killedThe', 'actions.struckTheForLeft'],
  },
  {
    site: 'actions.ts tag',
    shape: /^Antibod(ies|y) <b>coated<\/b> .+/,
    keys: ['actions.antibodiesCoatedTheCellsCanNow', 'actions.antibodyCoated'],
  },
  {
    site: 'actions.ts engulf',
    shape: /^<b>Monocyte<\/b> (engulfed|chipped) .+/,
    keys: ['actions.monocyteEngulfed', 'actions.monocyteChippedTheLeftFungiAre'],
  },
  {
    site: 'actions.ts draw entry',
    shape: /^(Infection: )?<b>[^<]+<\/b> entered via the .+/,
    keys: ['actions.infectionEnteredViaThe', 'actions.enteredViaTheAndIsBurrowing'],
  },
];

/**
 * Every catalogue entry that matches a line, found WITHOUT the matcher under test: an exact entry,
 * or a template compiled here on its own. The oracle for ambiguity cannot be the ordering it judges.
 */
const COMPILED = Object.entries(ENGINE_I18N_EN)
  .filter(([, v]) => v.includes('{'))
  .map(([key, v]) => ({
    key,
    literal: v.replace(/\{\w+\}/g, '').length,
    pattern: new RegExp(
      `^${v
        .split(/(\{\w+\})/)
        .map((part) =>
          /^\{\w+\}$/.test(part)
            ? '[\\s\\S]*?'
            : part.replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`),
        )
        .join('')}$`,
    ),
  }));

function entriesMatching(message: string): { key: string; literal: number }[] {
  const exact = Object.entries(ENGINE_I18N_EN)
    .filter(([, v]) => v === message)
    .map(([key]) => ({ key, literal: message.length }));
  return [...exact, ...COMPILED.filter((c) => c.pattern.test(message))];
}

function logsOf(state: GameState): { msg: string; kind: string }[] {
  const s = LocalSession.resume(clone(state), { storage: new MemoryStorage(), now: () => 0 });
  const log = (s.getView().game['log'] as { msg?: unknown; kind?: unknown }[] | undefined) ?? [];
  s.dispose();
  return log.map((l) => ({ msg: String(l.msg ?? ''), kind: String(l.kind ?? '') }));
}

describe('CP5: every log line renders through the catalogue, by its own entry', () => {
  const seen = new Map<string, string>();
  for (const seed of SEARCH_SEEDS.slice(0, 4)) {
    for (const difficulty of ['training', 'normal', 'hard']) {
      for (const st of commandStates(seed, difficulty, 100)) {
        for (const l of logsOf(st)) if (!seen.has(l.msg)) seen.set(l.msg, difficulty);
      }
    }
  }
  const messages = [...seen.keys()];
  const missed = messages.filter((m) => !engineLogText(m).matched);
  const perSite = FORMERLY_COMPOSED.map((k) => ({
    ...k,
    lines: messages.filter((m) => k.shape.test(m)),
  }));

  it('walked a real log (vacuity guards): many distinct lines, and the formerly composed ones among them', () => {
    expect(messages.length).toBeGreaterThan(80);
    // Strike never occurred in the recorded corpus: the bots do not strike.
    for (const s of perSite.filter((p) => p.site !== 'actions.ts strike')) {
      expect(s.lines.length, `${s.site} never occurred in the corpus`).toBeGreaterThan(0);
    }
  });

  it('no log line misses the catalogue', () => {
    expect(
      missed,
      `log lines the catalogue does not hold:\n  ${missed.slice(0, 8).join('\n  ')}`,
    ).toEqual([]);
  });

  it('the formerly composed lines are matched, each by one of its own entries', () => {
    for (const s of perSite)
      for (const m of s.lines) expect(s.keys, `${s.site}: ${m}`).toContain(engineLogText(m).key);
  });

  it('no line is ambiguous: of the entries that match it, the chosen one fixes strictly the most text', () => {
    const wrong: string[] = [];
    for (const m of messages) {
      const all = entriesMatching(m).sort((a, b) => b.literal - a.literal);
      const [best, next] = all;
      const chosen = engineLogText(m).key;
      if (!best || chosen !== best.key || (next && next.literal === best.literal))
        wrong.push(
          `${m.slice(0, 60)}  chose ${String(chosen)} of ${all.map((e) => e.key).join(', ')}`,
        );
    }
    expect(wrong).toEqual([]);
  });

  it('a template match recovers the message exactly in the English edition', () => {
    const byTemplate = messages.filter((m) => !Object.values(ENGINE_I18N_EN).includes(m));
    expect(byTemplate.length, 'no line was matched by template — only exact hits').toBeGreaterThan(
      0,
    );
    for (const m of byTemplate) expect(engineLogText(m).text).toBe(m);
  });

  it('CONTROL: an invented line is a miss', () => {
    expect(engineLogText('<b>Monocyte</b> did something the engine never says.').matched).toBe(
      false,
    );
  });

  it('CONTROL: the template matcher does not swallow a different message that shares a prefix', () => {
    // "recalled to the bloodstream" is a template with {cname}; a message that starts the same
    // way but ends differently must not match it.
    const r = engineLogText('<b>Monocyte</b> recalled to the bloodstream and then some.');
    expect(r.matched).toBe(false);
  });
});
