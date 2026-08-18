/**
 * TASK G, STEP 4 — THE FRAME-BURST COMPARISON.
 *
 *   npx tsx tools/legacy-harness/frames.ts [games-per-difficulty]
 *
 * docs/TASK_G_PLAN.md §2, correction 2, is the reason this exists:
 *
 *   > `endCommand` does not return a state — it returns a `Frame[]`, and **each frame carries a
 *   > full `viewState`**. The legacy UI animates that burst. If the port's frame sequence differs
 *   > in count, order or content, the spread will *look* different even though the final state
 *   > agrees.
 *
 * And the reason it matters to a human:
 *
 *   > **If that check is green, any visual difference he notices is a RENDERING artefact rather
 *   > than an engine one — and he knows which kind of thing he is looking at.**
 *
 * The UI consumes the burst at `v2_ui.html:1341` — `if(o.action==="endCommand"){ return
 * spread(r.frames); }` — walking `f.view` and `f.dice` with a delay per frame. So the compared
 * surface is exactly `frames.length`, every `frame.view`, and every `frame.dice`.
 *
 * ── ONE CORRECTION TO THE PLAN, MEASURED RATHER THAN ASSUMED ────────────────────────────────────
 *
 * Correction 2 justifies this step by saying "the corpus would never catch it, because it compares
 * end states". **That is not what the corpus does.** `rig.ts` records `resultHash: hashValue(r)`
 * for every action, and for `endCommand` the result IS `{ok:true, frames:[...]}` with a full
 * `viewState` inside every frame — rig.ts's own comment at line 162 says so. The corpus has been
 * comparing frame bursts all along, wherever the bot issues an endCommand.
 *
 * The step is still worth doing, and this file reports the overlap honestly rather than claiming
 * to be the first to look:
 *
 *   1. it isolates the burst, so a divergence is reported as "game 12, turn 7, frame 4 of 19,
 *      view differs" instead of "resultHash differs at index 118" — the corpus proves agreement,
 *      this one explains a disagreement, and a human comparing two windows needs the second;
 *   2. it names `frames.length` as its own assertion, so a count difference cannot present as a
 *      content difference;
 *   3. it checks the FRAME OBJECT SHAPE — `view` and `dice`, the two properties the UI actually
 *      reads. A port that renamed `view` to `viewState` would still hash equal under a
 *      structural comparison of the whole result if the key order happened to match, and would
 *      break the animation on the first spread.
 *
 * Exit codes: 0 identical · 1 a divergence, which docs/TASK_G_PLAN.md §2 says is a finding to
 * report and not an obstacle to work around.
 */

import { botGame } from '@immunity-wars/equivalence/bot';
import { loadLegacy, loadMutatedLegacy } from '@immunity-wars/equivalence/engine';
import { canonical } from '@immunity-wars/equivalence/hash';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import type { Action, Engine, GameState } from '@immunity-wars/equivalence/types';

import * as portEngine from '@immunity-wars/engine';

const DIFFICULTIES = ['training', 'normal', 'hard'] as const;
const DEFAULT_GAMES = 40;
const MAX_TURNS = 60;

interface Burst {
  /** Index of the action in the recorded sequence, for reporting. */
  readonly at: number;
  readonly frames: readonly { view: unknown; dice: unknown }[];
}

/**
 * The engine's own entry shape, matching `rig.ts` exactly.
 *
 * `newGame` takes a CONFIG OBJECT, not a difficulty string. Passing a string is silently tolerated
 * by legacy — it is sloppy-mode JavaScript — so every game would quietly run at the default
 * difficulty while the report claimed three. The typechecker caught it; nothing at runtime would
 * have. Spelled out here because the corpus and this file must build games the same way or they
 * are not measuring the same thing.
 */
function newGameFor(E: Engine, difficulty: string, science: boolean): GameState {
  return E.newGame({ difficulty, science });
}

/** Record a legal action sequence against LEGACY, per the rig's rule that the sequence is frozen. */
function record(seed: number, difficulty: string, science: boolean): Action[] {
  const E = loadLegacy();
  const actions: Action[] = [];
  installRng(seed);
  try {
    const g = newGameFor(E, difficulty, science);
    botGame(
      E,
      g,
      (a) => {
        actions.push(a);
        return E.applyAction(g, a);
      },
      MAX_TURNS,
    );
  } finally {
    restoreRng();
  }
  return actions;
}

/** Replay a recorded sequence into an engine, keeping only the endCommand frame bursts. */
function bursts(
  E: Engine,
  seed: number,
  difficulty: string,
  science: boolean,
  actions: readonly Action[],
): Burst[] {
  const out: Burst[] = [];
  installRng(seed);
  try {
    const g = newGameFor(E, difficulty, science);
    actions.forEach((a, i) => {
      const r = E.applyAction(g, a) as { frames?: { view: unknown; dice: unknown }[] };
      if (r?.frames) out.push({ at: i, frames: r.frames });
    });
  } finally {
    restoreRng();
  }
  return out;
}

export interface Divergence {
  readonly seed: number;
  readonly difficulty: string;
  readonly kind:
    'burst-count' | 'frame-count' | 'frame-shape' | 'frame-view' | 'frame-dice' | 'frame-other';
  readonly detail: string;
}

/**
 * Compare one game's bursts, legacy against the port.
 *
 * `legacyFor` is injectable ONLY so the controls below can substitute a deliberately broken legacy
 * and prove this function can report a difference. The recorded action sequence always comes from
 * the REAL legacy, so a mutation cannot change the sequence out from under the comparison.
 */
export function compareGame(
  seed: number,
  difficulty: string,
  science: boolean,
  legacyFor: () => Engine = loadLegacy,
): Divergence | null {
  const actions = record(seed, difficulty, science);
  const a = bursts(legacyFor(), seed, difficulty, science, actions);
  const b = bursts(portEngine as unknown as Engine, seed, difficulty, science, actions);

  if (a.length !== b.length) {
    return {
      seed,
      difficulty,
      kind: 'burst-count',
      detail: `legacy produced ${a.length} endCommand bursts, the port ${b.length}`,
    };
  }

  for (let i = 0; i < a.length; i += 1) {
    const la = a[i];
    const lb = b[i];
    if (!la || !lb) continue;

    if (la.frames.length !== lb.frames.length) {
      return {
        seed,
        difficulty,
        kind: 'frame-count',
        detail: `action ${la.at}: legacy burst has ${la.frames.length} frames, the port ${lb.frames.length}`,
      };
    }

    for (let f = 0; f < la.frames.length; f += 1) {
      const fa = la.frames[f];
      const fb = lb.frames[f];
      if (!fa || !fb) continue;

      // The two properties v2_ui.html:1357 reads. A renamed key breaks the animation even when
      // the states agree, and nothing else in the repository looks at the frame's shape.
      const shapeA = Object.keys(fa).sort().join(',');
      const shapeB = Object.keys(fb).sort().join(',');
      if (shapeA !== shapeB) {
        return {
          seed,
          difficulty,
          kind: 'frame-shape',
          detail: `action ${la.at}, frame ${f + 1}/${la.frames.length}: legacy keys {${shapeA}}, port keys {${shapeB}}`,
        };
      }

      if (canonical(fa.view) !== canonical(fb.view)) {
        return {
          seed,
          difficulty,
          kind: 'frame-view',
          detail: `action ${la.at}, frame ${f + 1}/${la.frames.length}: viewState differs`,
        };
      }
      if (canonical(fa.dice) !== canonical(fb.dice)) {
        return {
          seed,
          difficulty,
          kind: 'frame-dice',
          detail: `action ${la.at}, frame ${f + 1}/${la.frames.length}: dice differ`,
        };
      }
      // Catch-all. The UI reads only `view` and `dice`, so the checks above are the ones that can
      // break the animation — but a frame also carries `label`, and a difference there is still an
      // engine difference. Reported separately so it is never mistaken for a rendering-relevant one.
      if (canonical(fa) !== canonical(fb)) {
        return {
          seed,
          difficulty,
          kind: 'frame-other',
          detail: `action ${la.at}, frame ${f + 1}/${la.frames.length}: frame differs outside view/dice (label?)`,
        };
      }
    }
  }
  return null;
}

export interface Totals {
  games: number;
  bursts: number;
  frames: number;
  maxBurst: number;
}

/** Count what was actually compared, so a green result cannot be a green vacuum. */
export function measure(seed: number, difficulty: string, science: boolean, t: Totals): void {
  const actions = record(seed, difficulty, science);
  const a = bursts(loadLegacy(), seed, difficulty, science, actions);
  t.games += 1;
  t.bursts += a.length;
  for (const b of a) {
    t.frames += b.frames.length;
    t.maxBurst = Math.max(t.maxBurst, b.frames.length);
  }
}

// --- the negative controls -----------------------------------------------------------------------

/**
 * A comparison that has never reported a difference is not known to be able to.
 *
 * Each control breaks LEGACY in one specific way and requires this file to report the matching
 * KIND of divergence — not merely some divergence (docs/FINDINGS.md #32). `loadMutatedLegacy`
 * asserts each mutation matches exactly once, so a stale mutation cannot pass vacuously.
 *
 * Nothing is written: the mutation is applied to a copy of the source in memory.
 */
interface FrameControl {
  readonly what: string;
  readonly find: string;
  readonly replace: string;
  readonly expect: Divergence['kind'];
}

const FRAME_CONTROLS: readonly FrameControl[] = [
  {
    what: 'one snap() site is removed — the burst is a frame shorter',
    find: 'snap("The march");',
    replace: ';',
    expect: 'frame-count',
  },
  {
    what: 'the view projection emits a different value',
    find: 'maxTurn:g.maxTurn,',
    replace: 'maxTurn:g.maxTurn+1,',
    expect: 'frame-view',
  },
  {
    what: 'the dice attached to a frame are dropped',
    find: 'dice:dice||null',
    replace: 'dice:null',
    expect: 'frame-dice',
  },
  {
    // THE ONE THE PLAN NAMES: a renamed key leaves every state agreeing and breaks the animation,
    // because v2_ui.html:1357 reads `f.view` by name.
    what: 'the frame key `view` is renamed — states agree, the animation breaks',
    find: 'frames.push({label,dice:dice||null,view:viewState(g)})',
    replace: 'frames.push({label,dice:dice||null,viewState:viewState(g)})',
    expect: 'frame-shape',
  },
  {
    what: 'a frame label changes — an engine difference the UI would not show',
    find: 'snap("Cells burst",dice);',
    replace: 'snap("Cells burst!",dice);',
    expect: 'frame-other',
  },
];

/** Seeds the controls run over. Fixed, so "did it fire" is deterministic. */
const CONTROL_SEEDS: readonly [number, string][] = [
  [1_000_003, 'training'],
  [2_000_006, 'normal'],
  [3_000_009, 'hard'],
  [4_000_012, 'normal'],
];

function runFrameControls(): string[] {
  const failures: string[] = [];
  console.log('-- NEGATIVE CONTROLS — CAN THIS COMPARISON REPORT A DIFFERENCE? ------------------');
  for (const c of FRAME_CONTROLS) {
    const factory = (): Engine =>
      loadMutatedLegacy({ name: c.expect, find: c.find, replace: c.replace });

    let fired: Divergence | null = null;
    let threw: string | null = null;
    try {
      for (const [seed, difficulty] of CONTROL_SEEDS) {
        const d = compareGame(seed, difficulty, true, factory);
        if (d && d.kind === c.expect) {
          fired = d;
          break;
        }
        if (d && !fired) fired = d;
      }
    } catch (e) {
      threw = e instanceof Error ? e.message : String(e);
    }

    const ok = !threw && fired?.kind === c.expect;
    if (!ok) {
      failures.push(
        `${c.expect}: ${threw ?? `expected kind "${c.expect}", got "${fired?.kind ?? 'no divergence at all'}"`}`,
      );
    }
    console.log(`     ${ok ? 'FIRES ' : 'BROKEN'} ${c.expect.padEnd(13)} ${c.what}`);
    if (!ok) console.log(`            -> ${threw ?? `got ${fired?.kind ?? 'nothing'}`}`);
  }
  return failures;
}

async function main(): Promise<void> {
  const perDifficulty = Number(process.argv[2] ?? DEFAULT_GAMES);
  const LINE = '='.repeat(95);
  console.log(LINE);
  console.log('TASK G STEP 4 — FRAME-BURST COMPARISON, LEGACY vs PORT');
  console.log(LINE);
  console.log(`  ${perDifficulty} games per difficulty, up to ${MAX_TURNS} turns each\n`);

  const totals: Totals = { games: 0, bursts: 0, frames: 0, maxBurst: 0 };
  const divergences: Divergence[] = [];

  // BOTH science settings, because the two entry points disagree and nothing had noticed.
  // `newG()` in v2_ui.html:1335 creates games with `science:true`; the equivalence rig and
  // simulate() both use `science:false`. The flag is written into state and echoed by
  // `viewState`, and read by NOTHING in either engine — so it cannot change play. That is a
  // measurement, not an assumption, and this is where it gets made: the harness runs the
  // configuration the corpus never has.
  for (const science of [true, false]) {
    for (const difficulty of DIFFICULTIES) {
      const before = { ...totals };
      for (let i = 0; i < perDifficulty; i += 1) {
        // Seeds are spread rather than consecutive: docs/FINDINGS.md #33 — linearly-spaced seeds
        // are not independent samples, and that defect has already been found here once.
        const seed = 1_000_003 * (i + 1) + difficulty.length * 7919;
        measure(seed, difficulty, science, totals);
        const d = compareGame(seed, difficulty, science);
        if (d) divergences.push(d);
      }
      console.log(
        `  science:${String(science).padEnd(5)} ${difficulty.padEnd(9)} ` +
          `${totals.bursts - before.bursts} bursts, ${totals.frames - before.frames} frames compared`,
      );
    }
  }

  console.log('');
  console.log(`  games compared    ${totals.games}`);
  console.log(`  endCommand bursts ${totals.bursts}`);
  console.log(`  frames            ${totals.frames}  (largest single burst: ${totals.maxBurst})`);
  console.log('');

  // A comparison that compared nothing would print a confident green. FINDINGS #32 and the C5b
  // lesson both say the same thing: assert the instrument had something to work on.
  if (totals.frames === 0) {
    console.log(LINE);
    console.log('VACUOUS — no frames were compared. The result is not evidence.');
    console.log(LINE);
    process.exit(1);
  }

  const controlFailures = runFrameControls();
  console.log('');

  console.log(LINE);
  if (divergences.length === 0) {
    console.log('IDENTICAL — every burst, every frame, every viewState and every dice roll.');
    console.log('A visual difference in the harness is therefore a RENDERING artefact.');
  } else {
    console.log(`${divergences.length} DIVERGENCE(S) — this is a finding, not an obstacle:`);
    for (const d of divergences.slice(0, 10)) {
      console.log(`  [${d.kind}] seed ${d.seed} ${d.difficulty}: ${d.detail}`);
    }
  }
  if (controlFailures.length === 0) {
    console.log('CONTROL: all five kinds of divergence are reported, each on its own mutation.');
  } else {
    console.log('CONTROL: FAILED — the result above is not evidence of anything.');
    for (const f of controlFailures) console.log(`         ${f}`);
  }
  console.log(LINE);
  process.exit(divergences.length === 0 && controlFailures.length === 0 ? 0 : 1);
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  await main();
}
