/**
 * Internals — NOT part of the public API.
 *
 * docs/PHASE1_BRIEF.md §5 makes legacy's 67 exports the contract, so the package root must
 * publish exactly those and no more. But several helpers legacy keeps private are genuinely
 * needed outside the engine:
 *
 *   - the equivalence rig's sequence generator needs samePlace and placeDist, which legacy
 *     does not export either (docs/FINDINGS.md #12);
 *   - the B2 differential test needs to call every query, including the private ones.
 *
 * Putting them here keeps the public contract exact while still making them reachable, instead
 * of the alternative — widening the public API for the convenience of a test.
 *
 * That alternative is not hypothetical: 38 data tables and tuning constants had leaked onto the
 * root by B7 for exactly that reason. They are back to being module-local; ALL_ORGANS is the
 * only one anything outside the engine ever reached, so it is the only one that lands here.
 * Add to this list one name at a time, on demonstrated need — never in bulk.
 */

export { ALL_ORGANS } from '@immunity-wars/content';

export {
  abTotal,
  apFor,
  brainSlow,
  capFor,
  damaged,
  divideOn,
  hasAb,
  invadersWith,
  kidneyLeak,
  marrowBroken,
  memoryHit,
  placeDist,
  samePlace,
  spawnCount,
} from './queries.js';

export { cap1, clone, d6, lymphPartners, organsFor, resetUid, shuffle, uid } from './primitives.js';

export { knobs, resetKnobs } from './knobs.js';

export { fireTurnStart, noteWorm, pushLog, rollOrgan, scheduleEvents } from './construct.js';

export { apAvail, apNow, apOwnerOf, canAct, hasFree, spend, spendAP } from './ap.js';
export { cname, hurtInvader, killInvader, placeName, present } from './effects.js';

export { checkRareTriggers } from './spread.js';
