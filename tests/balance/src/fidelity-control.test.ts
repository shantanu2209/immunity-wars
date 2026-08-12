/**
 * E0a's negative controls — the fidelity check made to fail on purpose, and measured for how
 * hard it is to fool.
 *
 * `fidelity.test.ts` reports that the harness bot and `simulate()`'s inlined bot agree across
 * 3,000 games. That report is worth exactly as much as the check's ability to say otherwise, and
 * "it fired once" is not that measurement — the first draft of this file passed on a mutation
 * that diverged on **1 game in 150**, which is a lucky pass wearing a working control's clothes.
 *
 * So this does not ask *can it fire*. It asks *how strongly, against what*. Five one-line
 * mutations to `simulate()`'s bot — a part the harness-side bot does not share, because it is a
 * separate implementation — measured at 50 seeds x 3 difficulties:
 *
 *   ```
 *     0/150  (  0.0%)  unmutated legacy                          <- baseline
 *   144/150  ( 96.0%)  threats sorted FURTHEST-first
 *    50/150  ( 33.3%)  memoryKill step removed
 *    44/150  ( 29.3%)  NK step removed
 *     1/150  (  0.7%)  vaccinate 2 AP instead of 1               <- the sensitivity FLOOR
 *     0/150  (  0.0%)  NET check: invadersWith -> netTargets     <- DEMONSTRATED BLIND SPOT
 *   ```
 *
 * **What that table actually says.** The comparator is strong against changes to *what the bot
 * does* and weak against changes to *how much AP it spends*. It compares outcomes, not
 * behaviour, so a bot difference that never changes a win, a loss turn, a failed organ, an organ
 * hit, the trunk-kill ratio or the dice count is invisible to it. The floor row is the honest
 * measure of that, and it is why the E0a verdict is worded as agreement on outcomes rather than
 * as identity of the two procedures.
 *
 * **The last row is the point, not an embarrassment.** `invadersWith` vs `netTargets` is the one
 * textual difference between the two bots that genuinely exists, and it is undetectable here —
 * because the Neutrophil never leaves the hub, so the guard above it is never true and neither
 * expression is ever evaluated (`docs/FINDINGS.md` §1.2). Pinning it executably means the blind
 * spot cannot be forgotten, and it means a future competent bot that DOES move the Neutrophil
 * will turn this row non-zero and say so.
 *
 * Legacy is mutated rather than the port because the port is an ES module and cannot be patched
 * at load — the same constraint the property suite's L3 controls work under. `loadMutatedLegacy`
 * throws unless the string matches exactly once, so a stale mutation cannot quietly become a
 * no-op and report a false PASS.
 */

import { describe, expect, it } from 'vitest';

import { loadLegacy, loadMutatedLegacy, type Mutation } from '@immunity-wars/equivalence/engine';

import { compareFidelity } from './fidelity.js';

const SEEDS = 50;
const DIFFICULTIES = ['training', 'normal', 'hard'];
const GAMES = SEEDS * DIFFICULTIES.length;

const detected = (m: Mutation): number =>
  compareFidelity(DIFFICULTIES, SEEDS, loadMutatedLegacy(m)).mismatched;

describe('E0a controls: how hard is the fidelity check to fool?', () => {
  /**
   * The baseline arm, and it is load-bearing. Without it, a mutant that diverged for some
   * unrelated reason — "legacy and the port simply differ", say — would look like a working
   * control while measuring something else entirely.
   */
  it('baseline: unmutated legacy shows no divergence at all', () => {
    const r = compareFidelity(DIFFICULTIES, SEEDS, loadLegacy());
    expect(r.compared).toBe(GAMES);
    expect({ mismatched: r.mismatched, examples: r.examples }).toEqual({
      mismatched: 0,
      examples: [],
    });
  });

  it('detects a gross change to the bot"s priorities — 144/150', () => {
    const n = detected({
      name: 'threats sorted furthest-first',
      find: 'const threats=[...g.invaders].sort((a,b)=>distToOrgan(g,a)-distToOrgan(g,b));',
      replace: 'const threats=[...g.invaders].sort((a,b)=>distToOrgan(g,b)-distToOrgan(g,a));',
    });
    expect(n / GAMES).toBeGreaterThan(0.9);
  });

  it('detects a whole action removed from the bot"s repertoire — 50/150 and 44/150', () => {
    const memoryKill = detected({
      name: 'memoryKill step removed',
      find: 'if(mem && applyAction(g,{action:"memoryKill",invaderId:mem.id}).ok) continue;',
      replace: 'if(false && mem) continue;',
    });
    const nk = detected({
      name: 'NK step removed',
      find: 'const nk=nkTargets(g)[0]; if(nk && applyAction(g,{action:"nkkill",cell:"nk",invaderId:nk.id}).ok) continue;',
      replace: 'const nk=nkTargets(g)[0]; if(false && nk) continue;',
    });
    expect(memoryKill / GAMES).toBeGreaterThan(0.2);
    expect(nk / GAMES).toBeGreaterThan(0.2);
  });

  /**
   * THE SENSITIVITY FLOOR, asserted so it cannot drift unnoticed.
   *
   * One game in 150. Deterministic, because the seeds are fixed — not flaky, just thin. This is
   * the weakest real bot change the comparator still catches, and quoting E0a's clean run without
   * quoting this number would overstate what the clean run proves.
   */
  it('barely detects a change to how much AP the bot spends — 1/150, and that is the floor', () => {
    const n = detected({
      name: 'vaccinate 2 AP instead of 1',
      find: 'applyAction(g,{action:"vaccinate",disease:cand[0],ap:1})',
      replace: 'applyAction(g,{action:"vaccinate",disease:cand[0],ap:2})',
    });
    expect(n, 'the comparator no longer catches its weakest measured case').toBeGreaterThan(0);
    expect(n / GAMES).toBeLessThan(0.05);
  });

  /**
   * THE DEMONSTRATED BLIND SPOT.
   *
   * This is the one difference between the two bots that actually exists in the source, and the
   * check cannot see it. Asserted as ZERO rather than omitted, because a gate shipping with a
   * demonstrated blind spot is more trustworthy than one shipping with only a green light.
   *
   * If this ever goes non-zero, nothing is broken — it means the Neutrophil has started leaving
   * the hub, which is exactly what a competent Phase 2 bot would do (`docs/FINDINGS.md` §1.4),
   * and at that point the two expressions stop being interchangeable. The failure message says so.
   */
  it('CANNOT detect the one difference the two bots really have — 0/150, by construction', () => {
    const n = detected({
      name: 'NET check: invadersWith -> netTargets',
      find: 'if(n.alive && n.zone!=="hub" && invadersWith(g,n).length>=2',
      replace: 'if(n.alive && n.zone!=="hub" && netTargets(g).length>=2',
    });
    expect(
      n,
      'The NET-check difference became observable. That is NOT a regression — it means the ' +
        'Neutrophil now leaves the hub, so invadersWith and netTargets no longer agree. ' +
        'Re-read docs/FINDINGS.md §1.2 and re-label the generator.',
    ).toBe(0);
  });
});
