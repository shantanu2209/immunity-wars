/**
 * CONSTRUCTED STATES — where the recorded corpus cannot go (FINDINGS #54).
 *
 * The offered ⊆ accepted harness replays recorded bot games. The bot never moves the
 * Neutrophil and never repositions a resident (FINDINGS #1, #5), so in 652 recorded command
 * states `net` was offered ZERO times and no resident ever left step 0 — a harness green over
 * `net` had never checked it, and `resengulf` was about to inherit the same blind spot.
 * A generator's capability gap propagates to every instrument built on it, and each looks
 * healthy on its own terms; only a per-subject floor can see it (offered.test.ts).
 *
 * These states are FOUND, then DRIVEN — never hand-built: a recorded state is searched for
 * the precondition, and the engine itself is walked to the position the bot never reaches
 * (the Neutrophil moved onto a pathogen it can NET; a resident patrolled up to a virus on
 * its branch). Every state here is one the engine produced. A search that finds nothing
 * returns null and the caller fails loudly rather than passing over nothing.
 *
 * Test infrastructure only — nothing in packages/ imports out of tests/.
 */

import * as engine from '@immunity-wars/engine';
import { botGame } from '@immunity-wars/equivalence/bot';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import type { Engine, GameState } from '@immunity-wars/equivalence/types';

const PORT = engine as unknown as Engine;
type Raw = Record<string, unknown>;

export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Command-phase states along a recorded bot game, one per accepted action. */
export function commandStates(seed: number, difficulty: string, maxActions: number): GameState[] {
  const states: GameState[] = [];
  installRng(seed);
  try {
    const g = PORT.newGame({ difficulty, science: false }) as GameState;
    botGame(
      PORT,
      g,
      (a) => {
        const r = PORT.applyAction(g, a);
        if ((g as unknown as Raw)['phase'] === 'command') states.push(clone(g));
        return r;
      },
      maxActions,
    );
  } finally {
    restoreRng();
  }
  return states;
}

export const SEARCH_SEEDS = [0x51de, 0x7f2a, 0x1234, 0x9abc, 0x2468, 0x1357, 0xbeef, 0xfeed];
const DIFFICULTIES = ['training', 'normal', 'hard'];

const pidOf = (g: GameState): string =>
  (((g as unknown as Raw)['players'] as string[] | undefined) ?? [])[0] ?? '';

/** Apply an action to a clone under a fixed RNG; the accepted clone, or null. */
function step(g: GameState, a: Raw): GameState | null {
  const g2 = clone(g);
  installRng(1);
  try {
    const r = PORT.applyAction(g2, { ...a, pid: pidOf(g2) } as never) as { ok: boolean };
    return r.ok ? g2 : null;
  } finally {
    restoreRng();
  }
}

export interface ResidentMeal {
  /** The recorded state the patrol starts from — captured right after `beginCommand`, so
   *  its engine undo stack is empty and a session resumed from it starts with undo clean. */
  from: GameState;
  organ: string;
  /** The branch step the meal stands on; also the number of patrols to reach it. */
  steps: number;
  invaderId: string;
  /** `from` after the patrols: the resident stands with the meal, `residentEatable` non-empty. */
  fed: GameState;
}

const EATABLE_ON_BRANCH = (iv: Raw): boolean =>
  iv['zone'] === 'branch' &&
  typeof iv['organ'] === 'string' &&
  typeof iv['step'] === 'number' &&
  (iv['step'] as number) >= 1 &&
  (iv['type'] === 'virus' ||
    (iv['type'] === 'bacteria' && iv['tagged'] === true) ||
    (iv['type'] === 'malaria' && (iv['stage'] === 'blood' || iv['stage'] === 'sporozoite')));

/**
 * A resident with something to eat — reached by PATROLLING it up its branch through the
 * engine from a recorded state. Null when no recorded state has a reachable meal.
 */
export function findResidentMeal(): ResidentMeal | null {
  for (const seed of SEARCH_SEEDS) {
    for (const difficulty of DIFFICULTIES) {
      for (const st of commandStates(seed, difficulty, 120)) {
        const s = st as unknown as Raw;
        if (((s['undo'] as unknown[] | undefined)?.length ?? 0) > 0) continue;
        const flags = s['flags'] as Raw;
        if (flags['residentMove'] !== true) continue;
        const ap = Number(s['ap'] ?? 0);
        const residents = s['residents'] as Record<string, Raw>;
        for (const iv of (s['invaders'] as Raw[] | undefined) ?? []) {
          if (!EATABLE_ON_BRANCH(iv)) continue;
          const organ = iv['organ'] as string;
          const r = residents[organ];
          if (!r || r['infectedBy'] || r['ate'] === true || r['step'] !== 0) continue;
          const steps = iv['step'] as number;
          if (steps > ap) continue;
          let g: GameState | null = st;
          for (let k = 1; k <= steps && g; k += 1)
            g = step(g, { action: 'resmove', organ, step: k });
          if (!g) continue;
          const eat = PORT.residentEatable(g, organ) as unknown as Raw[];
          if (!eat.some((x) => x['id'] === iv['id'])) continue;
          return { from: st, organ, steps, invaderId: String(iv['id']), fed: g };
        }
      }
    }
  }
  return null;
}

/**
 * The Neutrophil standing on something it can NET — reached by MOVING it there through the
 * engine from a recorded state (the bot never moves it). Null when unreachable.
 */
export function findNetStand(): GameState | null {
  for (const seed of SEARCH_SEEDS) {
    for (const difficulty of DIFFICULTIES) {
      for (const st of commandStates(seed, difficulty, 120)) {
        const s = st as unknown as Raw;
        const n = (s['cells'] as Record<string, Raw>)['neutrophil'];
        if (!n || n['alive'] !== true || Number(s['ap'] ?? 0) < 1) continue;
        const sup = s['suppress'] as Raw | undefined;
        if (Number(sup?.['neutrophil'] ?? 0) > 0) continue;
        for (const d of PORT.moveDestinations(st, 'neutrophil') as unknown as Raw[]) {
          if (d['zone'] === 'hub') continue;
          const g = step(st, { action: 'move', cell: 'neutrophil', ...d });
          if (!g) continue;
          if ((PORT.netTargets(g) as unknown[]).length > 0) return g;
        }
      }
    }
  }
  return null;
}

/** Every constructed state, for the harness to judge beside the corpus. */
export function constructedStates(): { label: string; state: GameState }[] {
  const out: { label: string; state: GameState }[] = [];
  const meal = findResidentMeal();
  if (meal) out.push({ label: 'resident meal', state: meal.fed });
  const net = findNetStand();
  if (net) out.push({ label: 'net stand', state: net });
  return out;
}

/**
 * HIDING INSIDE A CELL — the two invader states the board-state sweep deferred to the card.
 * Both are DRIVEN: the card is forced into play (`forceInjectCard`, a dev-only engine entry
 * point that exists for exactly this) and the game is cycled turn by turn through the engine
 * until the state arises — kala-azar reaching its organ and moving INSIDE the resident
 * macrophage; malaria reaching the liver and embedding. Idle cycles: no cell acts, so the
 * only actor is the spread. Null when the state does not arise within the turn budget.
 */
export function findHidden(
  dz: string,
  arrived: (g: GameState) => boolean,
  maxTurns = 14,
): GameState | null {
  for (const seed of SEARCH_SEEDS) {
    for (const difficulty of ['normal', 'hard', 'training']) {
      installRng(seed);
      try {
        const g = PORT.newGame({ difficulty, science: false }) as GameState;
        const forced = (PORT as unknown as Record<string, (...a: unknown[]) => unknown>)[
          'forceInjectCard'
        ]?.(g, dz);
        if (!forced) continue;
        for (let turn = 0; turn < maxTurns; turn += 1) {
          PORT.applyAction(g, { action: 'draw' } as never);
          PORT.applyAction(g, { action: 'beginCommand' } as never);
          if (arrived(g)) return clone(g);
          const s = g as unknown as Raw;
          if (s['won'] === true || s['lost']) break;
          PORT.applyAction(g, { action: 'endCommand' } as never);
        }
      } finally {
        restoreRng();
      }
    }
  }
  return null;
}
