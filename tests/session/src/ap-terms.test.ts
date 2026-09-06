/**
 * THE AP DRILL-IN AND THE REVEAL'S CRISIS SECTION, AS THE UI WORDS THEM (6 September 2026).
 *
 * `apTermLines` turns the engine's `apBreakdown` (carried by the session) into localised
 * lines; the engine-side equality with `apFor` is asserted in `tests/equivalence`. What is
 * asserted HERE is the UI half: on every recorded command state the lines' deltas sum to the AP
 * the view shows, every line has words (no missing-key marker), and the crisis section the
 * reveal shows names the banner's event with the effect lines the strip folded into it.
 */
import { describe, expect, it } from 'vitest';

import type { GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage, type SessionView } from '@immunity-wars/session';
import { apTermLines, effectChips, revealCrisis } from '@immunity-wars/ui';

import { SEARCH_SEEDS, clone, commandStates } from './constructed.js';

function view(st: GameState): SessionView {
  const s = LocalSession.resume(clone(st), { storage: new MemoryStorage(), now: () => 0 });
  const v = s.getView();
  s.dispose();
  return v;
}

describe('the AP figure drills into terms that sum to it', () => {
  const problems: string[] = [];
  let states = 0;
  let withEvent = 0;
  let withOrgan = 0;
  let crises = 0;
  for (const seed of SEARCH_SEEDS.slice(0, 4)) {
    for (const difficulty of ['training', 'normal', 'hard']) {
      for (const st of commandStates(seed, difficulty, 120)) {
        states += 1;
        const v = view(st);
        const lines = apTermLines(v);
        const total = lines.reduce((n, l) => n + l.delta, 0);
        const shown = Number(v.game['apMax']);
        if (total !== shown)
          problems.push(`terms sum to ${String(total)}, the view shows ${String(shown)}`);
        if (v.queries.ap.total !== shown) problems.push('queries.ap.total ≠ view.apMax');
        for (const l of lines)
          if (l.text.includes('⟪') || l.text.includes('{') || l.text.trim() === '')
            problems.push(`bad term text: ${l.text}`);
        if (v.queries.ap.terms.some((t) => t.kind === 'event')) withEvent += 1;
        if (v.queries.ap.terms.some((t) => t.kind === 'organ')) withOrgan += 1;

        // The crisis section: present exactly when the view carries a banner, named after it,
        // its effect lines the strip's folded chips with the name taken off.
        const chips = effectChips(v);
        const crisis = revealCrisis(v.game, chips);
        const banner = v.game['banner'] as { name?: unknown } | null;
        if ((crisis !== null) !== (banner !== null && typeof banner.name === 'string'))
          problems.push('crisis section ≠ banner');
        if (crisis && banner) {
          crises += 1;
          if (crisis.name !== banner.name) problems.push('crisis section names the wrong event');
          const folded = chips.filter(
            (c) => c.event === crisis.name && c.text !== crisis.name,
          ).length;
          if (crisis.effects.length !== folded) problems.push('crisis effects ≠ folded chips');
          for (const e of crisis.effects)
            if (e.startsWith(`${crisis.name} ·`) || e.includes('⟪') || e.trim() === '')
              problems.push(`bad effect line: ${e}`);
          // The strip never doubles the event's name in front of an effect that opens with it.
          for (const c of chips)
            if (c.text.startsWith(`${crisis.name} · ${crisis.name}`))
              problems.push(`doubled event name: ${c.text}`);
        }
      }
    }
  }

  it('on every recorded command state', () => {
    expect(states).toBeGreaterThan(200);
    expect(problems, problems.slice(0, 8).join('\n')).toEqual([]);
  });

  it('the cases occurred (vacuity guards)', () => {
    expect(withEvent, 'no state with a crisis AP modifier').toBeGreaterThan(0);
    expect(withOrgan, 'no state with a damaged Lungs or Heart').toBeGreaterThan(0);
    expect(crises, 'no state with a banner').toBeGreaterThan(0);
  });

  it('CONTROL: a line whose delta was dropped would break the sum', () => {
    const st = commandStates(SEARCH_SEEDS[0] ?? 0, 'normal', 40).at(-1);
    expect(st).toBeDefined();
    if (!st) return;
    const v = view(st);
    const lines = apTermLines(v);
    const shown = Number(v.game['apMax']);
    expect(lines.reduce((n, l) => n + l.delta, 0)).toBe(shown);
    const dropped = lines.map((l, i) => (i === 0 ? { ...l, delta: l.delta - 1 } : l));
    expect(dropped.reduce((n, l) => n + l.delta, 0)).not.toBe(shown);
  });
});
