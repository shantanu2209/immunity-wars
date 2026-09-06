/**
 * HELP'S CRISIS SECTION, PINNED TO THE ENGINE (P2.6 piece 3; docs/for-P2.6.md, "The string
 * question, solved rather than discovered").
 *
 * Kartik ruled that Help lists every crisis event with what it does. An event's NAME and WHY
 * are the content pack's own table, which the reveal and Help both render, so they cannot
 * drift. What an event DOES is a one-line sentence of Help's own (`help.event.<key>.effect`),
 * and a sentence about the engine's behaviour can drift from it silently. So each event is
 * FIRED here on a fresh game and the sentence is held to what the engine did: the numbers it
 * states must be the engine's, and the thing it says happened must have happened.
 *
 * Both ways: every event in the pack has a line and every line has an event; the real lines
 * pass; and a control mutates each numbered line by one and requires the same check to fail,
 * so a green here is known to be able to go red.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { EVENTS, FAM_KEYS } from '@immunity-wars/content';
import * as port from '@immunity-wars/engine';

const UI = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../packages/content/src/i18n/en/ui.json', import.meta.url)),
    'utf8',
  ),
) as Record<string, string>;

type G = Record<string, unknown>;

/** A fresh Training game with every antibody store filled well past any cap, so that an event
 *  which caps or fills the stores leaves the ENGINE's number behind, not the store's zero. */
function fresh(): G {
  const g = port.newGame({ difficulty: 'training' }) as unknown as G;
  const ab = g['ab'] as Record<string, number>;
  for (const f of FAM_KEYS) ab[f] = 9;
  return g;
}

function fx(g: G): Record<string, unknown> {
  return (g['fx'] as Record<string, unknown> | undefined) ?? {};
}
function suppress(g: G): Record<string, unknown> {
  return (g['suppress'] as Record<string, unknown> | undefined) ?? {};
}
function n(v: unknown): number {
  return typeof v === 'number' ? v : Number(v ?? 0);
}
function numbersIn(s: string): number[] {
  return (s.match(/\d+/g) ?? []).map(Number);
}

/** What Help's line must say about the state the event produced. Returns the disagreements. */
function checkLine(key: string, before: G, after: G, line: string): string[] {
  const out: string[] = [];
  const nums = numbersIn(line);
  const mustNumber = (v: number, what: string): void => {
    if (!nums.includes(v))
      out.push(`${key}: the line must state ${what} = ${v}; it states [${nums.join(', ')}]`);
  };
  const mustSay = (re: RegExp, what: string): void => {
    if (!re.test(line)) out.push(`${key}: the line must say ${what}`);
  };
  switch (key) {
    case 'immunosuppression':
      if (fx(after)['noProduce'] !== true) out.push(`${key}: the engine did not set noProduce`);
      mustSay(/antibod/i, 'that antibodies are affected');
      break;
    case 'neutropenia':
      mustNumber(n(suppress(after)['neutrophil']), 'the turns the Neutrophil is offline');
      mustSay(/offline/i, 'offline');
      break;
    case 'lymphopenia':
      mustNumber(n(suppress(after)['tcell']), 'the turns the Killer T-Cell is offline');
      mustSay(/offline/i, 'offline');
      break;
    case 'antibodyShortage': {
      mustNumber(n(fx(after)['capTurns']), 'the turns the cap lasts');
      // The stores were 9 before the event; whatever they are now is the cap the engine applied.
      const ab = after['ab'] as Record<string, number>;
      const cap = Math.max(...FAM_KEYS.map((f) => n(ab[f])));
      if (cap >= 9) out.push(`${key}: the engine did not cap the stores`);
      mustNumber(cap, 'the cap');
      mustSay(/capped/i, 'capped');
      break;
    }
    case 'fatigue':
      mustNumber(-n(fx(after)['apMod']), 'the Action Points lost');
      mustSay(/fewer/i, 'fewer');
      break;
    case 'coInfection': {
      const grew =
        (after['invaders'] as unknown[]).length - (before['invaders'] as unknown[]).length;
      if (grew < 1) out.push(`${key}: the engine did not add an invader`);
      mustSay(/extra invader/i, 'an extra invader');
      break;
    }
    case 'surge':
      mustNumber(n(fx(after)['apMod']), 'the Action Points gained');
      mustSay(/extra|\+\d/i, 'extra, or a plus sign');
      break;
    case 'passiveAntibodies': {
      const ab = after['ab'] as Record<string, number>;
      const capFam = (port as unknown as { capFam?: (g: unknown, f: string) => number }).capFam;
      for (const f of FAM_KEYS) {
        const want = capFam ? capFam(after, f) : n(ab[f]);
        if (n(ab[f]) !== want) out.push(`${key}: ${f} is ${n(ab[f])}, not its cap ${want}`);
      }
      mustSay(/cap/i, 'the cap');
      break;
    }
    case 'fever':
      if (fx(after)['skipMarch'] !== true) out.push(`${key}: the engine did not set skipMarch`);
      mustNumber(-n(fx(after)['apMod']), 'the Action Points lost');
      mustSay(/do not advance/i, 'that the invaders do not advance');
      mustSay(/fewer/i, 'fewer');
      break;
    default:
      out.push(`${key}: no check written for this event; add one`);
  }
  return out;
}

const keys = Object.keys(EVENTS);

describe('Help lists every crisis event, with what it does pinned to the engine', () => {
  it('every event in the pack has a Help line, and every Help line has an event', () => {
    const lines = Object.keys(UI)
      .filter((k) => /^help\.event\.[^.]+\.effect$/.test(k))
      .map((k) => k.split('.')[2] ?? '');
    expect([...lines].sort()).toEqual([...keys].sort());
  });

  /** What Help shows for an event: the pack's reason (Kartik's words, tags dropped) and
   *  Help's effect line. Two reasons already state the effect, so their Help line is empty
   *  and the reason itself carries the numbers the pin checks. */
  const shown = (key: string): string => {
    const why = String((EVENTS as Record<string, { why?: unknown }>)[key]?.why ?? '').replace(
      /<[^>]+>/g,
      '',
    );
    const effect = UI[`help.event.${key}.effect`];
    expect(effect).toBeDefined();
    return `${why} ${effect ?? ''}`.trim();
  };

  it.each(keys)('%s: what Help shows agrees with what firing it did', (key) => {
    const g = fresh();
    const before = JSON.parse(JSON.stringify(g)) as G;
    port.applyEvent(g as never, key);
    expect(checkLine(key, before, g, shown(key))).toEqual([]);
  });

  it('the two reasons that state their own effect are the only empty Help lines', () => {
    const empty = keys.filter((k) => (UI[`help.event.${k}.effect`] ?? '') === '');
    expect(empty.sort()).toEqual(['fatigue', 'surge']);
  });

  it('CONTROL: a line with each of its numbers moved by one is caught, for every numbered event', () => {
    let caught = 0;
    for (const key of keys) {
      const line = shown(key);
      if (numbersIn(line).length === 0) continue;
      const g = fresh();
      const before = JSON.parse(JSON.stringify(g)) as G;
      port.applyEvent(g as never, key);
      const wrong = line.replace(/\d+/g, (d) => String(Number(d) + 1));
      expect(checkLine(key, before, g, wrong)).not.toEqual([]);
      caught += 1;
    }
    expect(caught).toBeGreaterThanOrEqual(5);
  });

  it('CONTROL: a line that names the wrong effect is caught', () => {
    const g = fresh();
    const before = JSON.parse(JSON.stringify(g)) as G;
    port.applyEvent(g as never, 'fever');
    expect(checkLine('fever', before, g, 'The invaders advance as usual.')).not.toEqual([]);
  });
});
