/**
 * WHAT A PLAYER MUST READ NOW RENDERS THROUGH THE CATALOGUE: a rejection in the toast, a frame's
 * headline, a query's label (queue Q8; FINDINGS #102).
 *
 * `engineText` looked a string up EXACTLY, so any rejection carrying a value rendered loudly as
 * ⟪engine: …⟫ whatever the catalogue held: "Your ENV antibody store is full (5).", and from queue
 * Q7 on, "Antivenom costs 3 AP." too, which had been a literal. The recorded games could not show
 * it, because the screens offer only what the engine accepts; a refusal reaches the toast when the
 * state moves under a tap, as when another player spends the points first.
 *
 * So this is checked over the WHOLE catalogue, not over what play happens to reach: every entry,
 * with a value in each placeholder, must come back through `engineText` as itself, and by its own
 * entry, which is the one the Hindi edition will translate. Then two refusals the engine really
 * writes, and the rare event's line, which the log once carried twice (FINDINGS #58).
 */
import { describe, expect, it } from 'vitest';

import { ENGINE_I18N_EN } from '@immunity-wars/content';
import * as engine from '@immunity-wars/engine';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import type { GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage } from '@immunity-wars/session';
import { engineLogText, engineText, logLinesOf } from '@immunity-wars/ui';

import { clone } from './constructed.js';

type Raw = Record<string, unknown>;
const PORT = engine as unknown as {
  newGame(cfg: Raw): Raw;
  applyAction(g: Raw, a: Raw): { ok: boolean; error?: string };
  forceInjectCard(g: Raw, dz: string): void;
  fireRare(g: Raw, key: string): boolean;
};

/** A game under a fixed seed, set up, then the engine's answer to one action. */
function refusal(setup: (g: Raw) => Raw): string {
  installRng(7);
  try {
    const g = PORT.newGame({ difficulty: 'normal' });
    const action = setup(g);
    const r = PORT.applyAction(g, action);
    expect(r.ok, 'the engine accepted what the test meant it to refuse').toBe(false);
    return String(r.error);
  } finally {
    restoreRng();
  }
}

describe('Q8: a string a player must read now renders through the catalogue', () => {
  const entries = Object.entries(ENGINE_I18N_EN);

  it('every catalogue message, with values in its placeholders, comes back as itself, by its own entry', () => {
    const templated = entries.filter(([, v]) => v.includes('{'));
    expect(
      templated.length,
      'the catalogue has almost no templates: a vacuous pass',
    ).toBeGreaterThan(50);
    const wrong: string[] = [];
    for (const [key, v] of entries) {
      const filled = v.replace(/\{\w+\}/g, '7');
      const text = engineText(filled);
      const got = engineLogText(filled).key;
      if (text !== filled) wrong.push(`${key}: rendered ${text.slice(0, 70)}`);
      else if (got !== key) wrong.push(`${key}: claimed by ${String(got)}`);
    }
    expect(wrong).toEqual([]);
  });

  it('two refusals the engine writes with a value in them render as themselves', () => {
    const venom = "Russell's viper venom";
    const antivenom = refusal((g) => {
      PORT.forceInjectCard(g, venom);
      Object.assign(g, { phase: 'command', ap: 2, antivenom: 1 });
      const iv = (g['invaders'] as { id: string; disease: string }[]).find(
        (x) => x.disease === venom,
      );
      return { action: 'antivenom', invaderId: iv?.id };
    });
    const full = refusal((g) => {
      Object.assign(g, { phase: 'command', ap: 5 });
      (g['ab'] as Raw)['ENV'] = 99;
      return { action: 'produce', family: 'ENV' };
    });
    expect(antivenom).toMatch(/^Antivenom costs \d+ AP\.$/);
    expect(full).toMatch(/^Your ENV antibody store is full \(\d+\)\.$/);
    for (const m of [antivenom, full]) expect(engineText(m)).toBe(m);
  });

  it('CONTROL: a string the catalogue does not hold still renders loudly', () => {
    expect(engineText('The engine never says this.')).toBe('⟪engine: The engine never says this.⟫');
  });

  it('a rare event is in the log once, as the engine wrote it, by its own entry', () => {
    installRng(3);
    try {
      const g = PORT.newGame({ difficulty: 'normal' });
      Object.assign(g['rare'] as Raw, { armed: true });
      expect(PORT.fireRare(g, 'rheumaticFever'), 'the rare event did not fire').toBe(true);
      const name = String((g['rareBanner'] as Raw)['name']);
      const s = LocalSession.resume(clone(g) as unknown as GameState, {
        storage: new MemoryStorage(),
        now: () => 0,
      });
      const lines = logLinesOf(s.getView().game).filter((l) => l.msg.includes(name));
      s.dispose();
      expect(lines.length, `lines naming ${name}`).toBe(1);
      expect(engineLogText(lines[0]?.msg ?? '').key).toBe('spread.message');
    } finally {
      restoreRng();
    }
  });
});
