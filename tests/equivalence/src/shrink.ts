/**
 * Divergence shrinking.
 *
 * "Diverged at action 4,122 of 50,000" is nearly useless. Shrinking is what makes a failure
 * actionable. The pipeline is:
 *
 *   1. LOCATE    — already exact: the comparison is deterministic, so the first mismatching
 *                  index IS the first divergence, and its level (rng/result/state) usually
 *                  names the category of bug on its own.
 *   2. SHRINK    — delta-debug the action list down to a minimal still-diverging sequence.
 *   3. MATERIALISE — re-run both engines on the minimal case with full state retained, and
 *                  emit a path-level structural diff.
 *
 * A note on why shrinking is sound here even though it looks like it should not be. Removing
 * an action changes downstream Math.random consumption, so a reduced list is a genuinely
 * DIFFERENT game — not a subsequence of the original one. That is fine: the reduced list is
 * still a legal action sequence, both engines still run it from the same seed, and a
 * divergence on it is still a real divergence. Reductions that stop reproducing are simply
 * discarded. Actions that become nonsensical (a neutralise whose target was never spawned)
 * do not need repairing either — they just return {ok:false}, and both engines must agree on
 * that too.
 */

import { diff, formatDiff, type Difference } from './diff.js';
import { installRng, restoreRng } from './rng.js';
import { replay, type Divergence, type EngineFactory } from './rig.js';
import type { Action, GameState } from './types.js';

/** Does this action list still diverge between the two engines? */
function stillDiverges(
  legacy: EngineFactory,
  candidate: EngineFactory,
  seed: number,
  difficulty: string,
  actions: readonly Action[],
): boolean {
  if (actions.length === 0) return false;
  const a = replay(legacy, seed, difficulty, actions);
  const b = replay(candidate, seed, difficulty, actions);
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const x = a[i];
    const y = b[i];
    if (!x || !y) continue;
    if (x.draws !== y.draws || x.resultHash !== y.resultHash || x.stateHash !== y.stateHash) {
      return true;
    }
  }
  return false;
}

/**
 * Delta debugging (ddmin) over the action list.
 *
 * `budget` caps the number of candidate replays so a shrink cannot itself become the slow
 * part of a CI run. Hitting the budget yields a partially-shrunk case, which is still far
 * more useful than the raw one.
 */
export function shrinkActions(
  legacy: EngineFactory,
  candidate: EngineFactory,
  seed: number,
  difficulty: string,
  actions: readonly Action[],
  budget = 400,
): readonly Action[] {
  let best = actions.slice(0, actions.length);
  let spent = 0;

  const test = (candidateList: readonly Action[]): boolean => {
    if (spent >= budget) return false;
    spent += 1;
    return stillDiverges(legacy, candidate, seed, difficulty, candidateList);
  };

  // Cheap first pass: truncate the tail. Everything after the first divergence is noise.
  let lo = 1;
  let hi = best.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (test(best.slice(0, mid))) hi = mid;
    else lo = mid + 1;
  }
  if (lo <= best.length && test(best.slice(0, lo))) best = best.slice(0, lo);

  // Then ddmin over the remaining prefix, removing chunks that are not needed.
  let granularity = 2;
  while (best.length > 1 && spent < budget) {
    const size = Math.ceil(best.length / granularity);
    let reduced = false;
    for (let start = 0; start < best.length; start += size) {
      const withoutChunk = [...best.slice(0, start), ...best.slice(start + size)];
      if (withoutChunk.length > 0 && test(withoutChunk)) {
        best = withoutChunk;
        granularity = Math.max(granularity - 1, 2);
        reduced = true;
        break;
      }
    }
    if (!reduced) {
      if (granularity >= best.length) break;
      granularity = Math.min(granularity * 2, best.length);
    }
  }

  return best;
}

export interface ShrunkReport {
  readonly seed: number;
  readonly difficulty: string;
  readonly level: Divergence['level'];
  readonly originalLength: number;
  readonly minimalActions: readonly Action[];
  readonly firstDivergentIndex: number;
  readonly differences: readonly Difference[];
  readonly text: string;
}

function fullStateAfter(
  factory: EngineFactory,
  seed: number,
  difficulty: string,
  actions: readonly Action[],
  upTo: number,
): GameState {
  const E = factory();
  installRng(seed);
  try {
    const g = E.newGame({ difficulty, science: false });
    for (let i = 0; i <= upTo && i < actions.length; i += 1) {
      const a = actions[i];
      if (a) E.applyAction(g, a);
    }
    return g;
  } finally {
    restoreRng();
  }
}

function describe(a: Action): string {
  const rest = Object.entries(a)
    .filter(([k]) => k !== 'action')
    .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
    .join(',');
  return rest ? `${a.action}{${rest}}` : a.action;
}

/** Produce the minimal reproducing case and a human-readable report. */
export function shrink(
  legacy: EngineFactory,
  candidate: EngineFactory,
  divergence: Divergence,
  budget = 400,
): ShrunkReport {
  const { seed, difficulty } = divergence;
  const minimal = shrinkActions(legacy, candidate, seed, difficulty, divergence.actions, budget);

  // Re-locate within the shrunk case.
  const a = replay(legacy, seed, difficulty, minimal);
  const b = replay(candidate, seed, difficulty, minimal);
  let index = minimal.length - 1;
  let level: Divergence['level'] = divergence.level;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const x = a[i];
    const y = b[i];
    if (!x || !y) continue;
    // Same precedence as rig.ts classify(): rng, then state, then result.
    if (x.draws !== y.draws) {
      index = i;
      level = 'rng';
      break;
    }
    if (x.stateHash !== y.stateHash) {
      index = i;
      level = 'state';
      break;
    }
    if (x.resultHash !== y.resultHash) {
      index = i;
      level = 'result';
      break;
    }
  }

  const legacyState = fullStateAfter(legacy, seed, difficulty, minimal, index);
  const candidateState = fullStateAfter(candidate, seed, difficulty, minimal, index);
  const differences = diff(legacyState, candidateState);

  const divergent = minimal[index];
  const lines = [
    `DIVERGENCE  seed=${seed}  difficulty=${difficulty}  level=${level}`,
    `shrunk ${divergence.actions.length} actions -> ${minimal.length}`,
    `minimal repro (${minimal.length} action${minimal.length === 1 ? '' : 's'}):`,
    `  ${minimal.map(describe).join(' / ')}`,
    `first difference at action ${index} (${divergent ? describe(divergent) : '<none>'}):`,
  ];

  if (level === 'rng') {
    // A draw-count divergence usually has NO state difference yet — that is the whole point
    // of tracking it separately. Reporting "no structural difference found" and stopping
    // would read as a rig failure rather than as the finding it is.
    const x = a[index];
    const y = b[index];
    lines.push(
      `  Math.random draws   legacy=${x?.draws ?? '?'}  candidate=${y?.draws ?? '?'}`,
      differences.length === 0
        ? '  state is still identical at this point — the port consumed randomness out of step,'
        : '  and the state has already diverged:',
    );
    if (differences.length === 0) {
      lines.push(
        '  which will desynchronise every subsequent roll. Fix this before anything else.',
      );
    } else {
      lines.push(formatDiff([...differences]));
    }
  } else {
    lines.push(formatDiff([...differences]));
  }

  const text = lines.join('\n');

  return {
    seed,
    difficulty,
    level,
    originalLength: divergence.actions.length,
    minimalActions: minimal,
    firstDivergentIndex: index,
    differences,
    text,
  };
}
