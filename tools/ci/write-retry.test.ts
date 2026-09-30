/**
 * The self-test's writes outlast a brief lock, and a lock that never lifts is reported rather than
 * swallowed (docs/FINDINGS.md #106). A runner that died restoring a file left the engine mutated.
 */
import { describe, expect, it } from 'vitest';

import { writeRetrying } from './write-retry.js';

/** A writer refused `locked` times, then willing; it records what it wrote. */
function lockedFor(locked: number): {
  write: (p: string, t: string) => void;
  tries: () => number;
  written: string[];
} {
  let tries = 0;
  const written: string[] = [];
  return {
    write: (_p, t) => {
      tries += 1;
      if (tries <= locked) throw new Error('UNKNOWN: unknown error, open');
      written.push(t);
    },
    tries: () => tries,
    written,
  };
}

const noNap = (): void => undefined;

describe('the self-test writes a file back through a lock', () => {
  it('writes at once when nothing holds the file', () => {
    const w = lockedFor(0);
    writeRetrying('primitives.ts', 'original', w.write, 20, 1, noNap);
    expect(w.written).toEqual(['original']);
    expect(w.tries()).toBe(1);
  });

  it('survives a lock that lifts, writing once the file is free', () => {
    const w = lockedFor(3);
    writeRetrying('primitives.ts', 'original', w.write, 20, 1, noNap);
    expect(w.written).toEqual(['original']);
    expect(w.tries()).toBe(4);
  });

  it('CONTROL: a lock that never lifts is an error naming the file, not a silent pass', () => {
    const w = lockedFor(Number.POSITIVE_INFINITY);
    expect(() => writeRetrying('primitives.ts', 'original', w.write, 5, 1, noNap)).toThrow(
      /could not write primitives\.ts after 5 attempts/,
    );
    expect(w.written).toEqual([]);
  });
});
