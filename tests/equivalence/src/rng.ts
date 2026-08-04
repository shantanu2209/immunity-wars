/**
 * Seeded randomness for the equivalence rig.
 *
 * The engine calls Math.random() directly — in shuffle, d6, rollOrgan, the reinfection draw,
 * the cytokine-storm organ pick, and three places in newGame. There is no injection point,
 * and adding one would change the API surface the port is contracted to preserve. So the rig
 * swaps the GLOBAL Math.random instead, which works on any engine without modifying either.
 *
 * The draw COUNTER is as important as the values. It forces the port to consume randomness in
 * the same order and the same quantity as legacy, which catches "right answer, wrong dice"
 * bugs that a state comparison would miss for many turns. The sharpest case is newGame's own
 * object literal: `rare:{armed:Math.random()<0.5}` is evaluated BEFORE `deck:shuffle(...)`,
 * so property order there is load-bearing. A draw-count mismatch catches a reordering on the
 * first action; a state diff might not surface it for twenty turns.
 */

/** mulberry32 — small, fast, and identical across machines and Node versions. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NATIVE_RANDOM = Math.random;
let draws = 0;

/** Install a seeded generator as the global Math.random and reset the draw counter. */
export function installRng(seed: number): void {
  const next = mulberry32(seed);
  draws = 0;
  Math.random = () => {
    draws += 1;
    return next();
  };
}

/** Restore the real Math.random. Always call this, including on a failure path. */
export function restoreRng(): void {
  Math.random = NATIVE_RANDOM;
}

/** How many values have been drawn since the last installRng. */
export function drawCount(): number {
  return draws;
}

/** Run fn with a seeded Math.random, restoring the real one even if fn throws. */
export function withSeed<T>(seed: number, fn: () => T): T {
  installRng(seed);
  try {
    return fn();
  } finally {
    restoreRng();
  }
}
