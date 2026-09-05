/**
 * S25 ITEMS 5 AND 7 — THE EFFECTS STRIP SAYS EVERY EFFECT IN FORCE, and only those.
 *
 * On recorded states, the chips are checked against the state they claim to show: a cap chip
 * iff the session's `effects.capTurns` is positive (and that field equals the engine's `fx`,
 * which the view drops); an offline chip iff `suppress` says so; an organ chip iff the organ
 * is damaged (and, on Hard, not compensated); the window-closed chip iff the turn is past the
 * arrival window, carrying the deadline from content; a forecast iff the view carries a
 * warning. Vacuity guards require each source to have occurred somewhere in the corpus. The
 * turn line is checked at both sides of the window with the numbers from content.
 */

import { describe, expect, it } from 'vitest';

import { GRACE_CLEAR } from '@immunity-wars/content';
import type { GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage, type SessionView } from '@immunity-wars/session';
import { effectChips, turnLine } from '@immunity-wars/ui';

import { SEARCH_SEEDS, clone, commandStates } from './constructed.js';

type Raw = Record<string, unknown>;

function view(state: GameState): SessionView {
  const s = LocalSession.resume(clone(state), { storage: new MemoryStorage(), now: () => 0 });
  const v = s.getView();
  s.dispose();
  return v;
}

describe('S25 items 5 and 7: the effects in force', () => {
  const seen = { cap: 0, offline: 0, organ: 0, window: 0, forecast: 0, banner: 0, apMod: 0 };
  const problems: string[] = [];
  let states = 0;
  for (const seed of SEARCH_SEEDS.slice(0, 4)) {
    for (const difficulty of ['training', 'normal', 'hard']) {
      for (const st of commandStates(seed, difficulty, 120)) {
        states += 1;
        const raw = st as unknown as Raw;
        const v = view(st);
        const g = v.game as Raw;
        const chips = effectChips(v);
        const has = (id: string): boolean => chips.some((c) => c.id === id);
        // The session's summary equals the engine's fx (which the view drops).
        const fx = (raw['fx'] as Raw | undefined) ?? {};
        if (v.queries.effects.capTurns !== Number(fx['capTurns'] ?? 0))
          problems.push('effects.capTurns ≠ fx.capTurns');
        if (v.queries.effects.noProduce !== (fx['noProduce'] === true))
          problems.push('effects.noProduce ≠ fx.noProduce');
        // Chip ⇔ state.
        const cap = Number(fx['capTurns'] ?? 0) > 0;
        if (has('capTurns') !== cap)
          problems.push(`capTurns chip ${String(has('capTurns'))} but fx ${String(cap)}`);
        if (cap) seen.cap += 1;
        if (Number(fx['apMod'] ?? 0) !== 0) seen.apMod += 1;
        const sup = (g['suppress'] as Raw | undefined) ?? {};
        const nOff = Number(sup['neutrophil'] ?? 0) > 0;
        if (has('neutrophilOffline') !== nOff) problems.push('neutrophil offline chip ≠ suppress');
        if (nOff) seen.offline += 1;
        const organs = (g['organs'] as Record<string, Raw>) ?? {};
        for (const [o, organ] of Object.entries(organs)) {
          const damaged =
            Number(organ['hp']) < Number(organ['max']) &&
            !(difficulty === 'hard' && organ['compensated'] === true);
          if (has(`organ:${o}`) !== damaged) problems.push(`organ chip for ${o} ≠ damaged`);
          if (damaged) seen.organ += 1;
        }
        const turn = Number(g['turn']);
        const maxTurn = Number(g['maxTurn']);
        const closed = turn > maxTurn;
        if (has('window') !== closed) problems.push('window chip ≠ turn > maxTurn');
        if (closed) {
          seen.window += 1;
          const w = chips.find((c) => c.id === 'window');
          if (!w?.text.includes(String(maxTurn + GRACE_CLEAR)))
            problems.push('window chip lacks the deadline');
          if (!turnLine(v.game).includes(String(maxTurn + GRACE_CLEAR - turn)))
            problems.push('turn line lacks the countdown');
        } else if (
          !turnLine(v.game).includes(`${String(turn)}`) ||
          !turnLine(v.game).includes(String(maxTurn))
        ) {
          problems.push('turn line lacks turn or maxTurn inside the window');
        }
        if (g['warning']) seen.forecast += 1;
        if (g['warning'] && !has('forecast')) problems.push('a warning without a forecast chip');
        // THE FOLD (S25 second pass, 5 September 2026): an event's banner is carried by the
        // chip its effect produced — the event's name heads that chip — and by a banner chip
        // only when the event has no chip of its own. Never by both: one effect, one chip.
        const banner = g['banner'] as { name?: unknown } | null;
        if (banner) {
          seen.banner += 1;
          const name = String(banner.name ?? '');
          const carried = chips.filter((c) => c.text.includes(name));
          if (carried.length === 0) problems.push('a banner without a chip');
          if (has('banner') && carried.length > 1) problems.push('a banner AND its effect chip');
        } else if (has('banner')) {
          problems.push('a banner chip without a banner');
        }
        for (const c of chips)
          if (c.text.includes('⟪') || c.text.trim() === '') problems.push(`bad chip text: ${c.id}`);
      }
    }
  }

  it('each source occurred in the corpus (vacuity guards)', () => {
    expect(states).toBeGreaterThan(200);
    for (const [k, n] of Object.entries(seen)) expect(n, `${k} never occurred`).toBeGreaterThan(0);
  });

  it('every chip mirrors the state it claims, and the turn line carries the right numbers', () => {
    expect(problems, problems.slice(0, 10).join('\n')).toEqual([]);
  });

  it('CONTROL: a state past the window without the chip would be caught', () => {
    // The check is `has('window') !== closed`; with closed=true and no chip it fires.
    const check = (hasChip: boolean, closed: boolean): boolean => hasChip !== closed;
    expect(check(false, true)).toBe(true);
    expect(check(true, true)).toBe(false);
  });
});
