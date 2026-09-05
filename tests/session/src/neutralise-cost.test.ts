/**
 * THE MIRROR'S PIN (FINDINGS #52): the UI withholds Neutralise on a toxin below
 * NEUTRALISE_TOXIN_AP because the engine's 2 is a literal, not content. This test drives the
 * engine directly so the mirror cannot drift silently: a neutralisable toxin must be REJECTED
 * at NEUTRALISE_TOXIN_AP - 1 and ACCEPTED at NEUTRALISE_TOXIN_AP. Delete with the mirror when
 * the number moves to content (Phase 3).
 *
 * The state is found, not built: recorded bot games are searched for a command-phase state
 * where a toxin is neutralisable with the store the game has. A search that finds nothing
 * fails loudly rather than passing over nothing.
 */
import { describe, expect, it } from 'vitest';

import * as engine from '@immunity-wars/engine';
import { botGame } from '@immunity-wars/equivalence/bot';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import type { Engine, GameState } from '@immunity-wars/equivalence/types';
import { NEUTRALISE_TOXIN_AP } from '@immunity-wars/ui';

const PORT = engine as unknown as Engine;
const ns = engine as unknown as Record<string, (...a: unknown[]) => unknown>;
/** Resolve an engine function by name, or fail loudly — a miss is a surface change to report. */
const call = (name: string, ...a: unknown[]): unknown => {
  const f = ns[name];
  if (typeof f !== 'function') throw new Error(`the engine does not export ${name}`);
  return f(...a);
};
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

interface Found {
  state: Record<string, unknown>;
  invaderId: string;
}

function findNeutralisableToxin(): Found | null {
  for (const seed of [0x51de, 0x7f2a, 0x1234, 0x9abc, 0x2468, 0x1357, 0xbeef, 0xfeed]) {
    for (const difficulty of ['normal', 'hard', 'training']) {
      let found: Found | null = null;
      installRng(seed);
      try {
        const g = PORT.newGame({ difficulty, science: false }) as GameState;
        botGame(
          PORT,
          g,
          (a) => {
            const r = PORT.applyAction(g, a);
            const s = g as unknown as Record<string, unknown>;
            if (!found && s['phase'] === 'command') {
              const invaders = (s['invaders'] as Record<string, unknown>[]) ?? [];
              for (const iv of invaders) {
                if (iv['type'] === 'toxin' && call('canNeutralise', g, iv) === true) {
                  const memory = (s['memory'] as Record<string, unknown>) ?? {};
                  // A remembered toxin is free — the cost rule does not apply; skip it.
                  if (memory[String(iv['disease'])] === true) continue;
                  found = { state: clone(s), invaderId: String(iv['id']) };
                  break;
                }
              }
            }
            return r;
          },
          120,
        );
      } finally {
        restoreRng();
      }
      if (found) return found;
    }
  }
  return null;
}

describe('neutralise on a toxin costs NEUTRALISE_TOXIN_AP — the mirror agrees with the engine', () => {
  const found = findNeutralisableToxin();

  it('a neutralisable, unremembered toxin exists in the recorded games (vacuity guard)', () => {
    expect(found, 'no neutralisable toxin found — the pin below would test nothing').not.toBeNull();
  });

  it(`rejected at ${String(NEUTRALISE_TOXIN_AP - 1)} AP, accepted at ${String(NEUTRALISE_TOXIN_AP)} AP`, () => {
    if (!found) return;
    const pid = (found.state['players'] as string[])[0] ?? '';
    const at = (ap: number): { ok: boolean; error?: string } => {
      const g = clone(found.state);
      g['ap'] = ap;
      g['free'] = {};
      installRng(1);
      try {
        return call('applyAction', g, {
          action: 'neutralise',
          invaderId: found.invaderId,
          pid,
        }) as {
          ok: boolean;
          error?: string;
        };
      } finally {
        restoreRng();
      }
    };
    const below = at(NEUTRALISE_TOXIN_AP - 1);
    expect(below.ok, 'the engine accepted below the mirrored cost — the mirror is stale').toBe(
      false,
    );
    expect(below.error ?? '').toMatch(/takes 2 Action Points/);
    const exact = at(NEUTRALISE_TOXIN_AP);
    expect(exact.ok, `rejected at the mirrored cost: ${exact.error ?? ''}`).toBe(true);
  });
});
