/**
 * THE LESSON'S DICE, FOUND BY SEARCH (stage L6, `docs/LOOK_PLAN.md` §19).
 *
 *   pnpm guide:seed            search seeds 1 to 5,000 and say which play the lesson
 *   pnpm guide:seed 20000      search further
 *
 * The guided game fixes the engine's dice with a seed (`packages/content/src/guide/lesson.json`).
 * The seed must make the game fall the lesson's way: the crisis it is written round on its turn,
 * the NK Cell's roll a hit, nothing unwritten breaking in. Which seeds do is not something to
 * reason out; this plays the whole lesson against the real engine for each and counts.
 *
 * WHEN TO RUN IT: when `tests/session/src/lesson.test.ts` says the lesson's seed no longer plays
 * it, which a change to the rules or to the lesson can cause. Put a seed it prints into the
 * lesson's file. It prints why the others fail, because a lesson no seed can play is a lesson
 * that asks the engine for something it refuses, and the reason says what.
 */
import { LESSON } from '@immunity-wars/content';
import { replayLesson } from '@immunity-wars/session';

const upTo = Number(process.argv[2] ?? 5000);
const good: number[] = [];
const why = new Map<string, number>();
for (let seed = 1; seed <= upTo; seed += 1) {
  const r = await replayLesson(LESSON, seed);
  if (r.ok) good.push(seed);
  else why.set(r.why, (why.get(r.why) ?? 0) + 1);
}
const steps = LESSON.turns.reduce((n, t) => n + t.steps.length, 0);
console.log(
  `the lesson: ${String(LESSON.turns.length)} turns, ${String(steps)} steps, ${String(LESSON.turns.reduce((n, t) => n + t.arrive.length, 0))} arrivals; its seed is ${String(LESSON.seed)}`,
);
console.log(
  `${String(good.length)} of ${String(upTo)} seeds play it whole, every step accepted and no organ hurt`,
);
for (const [k, n] of [...why.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`  ${String(n).padStart(6)}  ${k}`);
}
console.log(`the first of them: ${good.slice(0, 12).join(', ') || 'none'}`);
const own = await replayLesson(LESSON, LESSON.seed);
console.log(
  own.ok
    ? `its own seed plays it; the player is handed turn ${String(own.handed?.turn)}, ${String(own.handed?.remembered.length)} diseases remembered, in the body: ${own.handed?.inTheBody.join(', ') || 'nothing'}`
    : `ITS OWN SEED DOES NOT PLAY IT: ${own.why}`,
);
