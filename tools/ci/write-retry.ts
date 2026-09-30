/**
 * A WRITE THAT OUTLASTS A BRIEF LOCK (docs/FINDINGS.md #106).
 *
 * The self-test mutates a file, runs a gate, and writes the original back. On Windows the write
 * back can be refused for a moment, "UNKNOWN: unknown error, open", while something else still
 * holds the file: a gate's worker winding down, or a scanner reading what was just written. On 30
 * September 2026 that refusal came in the `finally` that restores the file, the runner died, and
 * `packages/engine/src/primitives.ts` stayed MUTATED in the tree. So every write the runner makes
 * is retried through a lock that lifts, and one that never lifts is an error naming the file.
 */
import { writeFileSync } from 'node:fs';

export type Writer = (path: string, text: string) => void;

/** A synchronous pause: the runner is synchronous from top to bottom. */
function nap(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function writeRetrying(
  path: string,
  text: string,
  write: Writer = (p, t) => writeFileSync(p, t, 'utf8'),
  attempts = 20,
  waitMs = 250,
  sleep: (ms: number) => void = nap,
): void {
  let last: unknown = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      write(path, text);
      return;
    } catch (e) {
      last = e;
      sleep(waitMs);
    }
  }
  throw new Error(`could not write ${path} after ${String(attempts)} attempts: ${String(last)}`);
}
