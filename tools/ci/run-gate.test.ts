/**
 * The self-test must hold everything a gate prints (docs/FINDINGS.md #125). Each case is a real
 * command, three megabytes long: three times what `execSync` keeps when it is not told otherwise.
 *
 * Control: pnpm ci:selftest selftest-holds-a-long-gate.
 */
import { describe, expect, it } from 'vitest';

import { GateOutputCut, runGate } from './run-gate.js';

const CWD = process.cwd();
const LAST = 'THE LAST WORDS';

/**
 * Prints three megabytes to one stream, then its last words, and ends with the code given.
 *
 * BY `process.exitCode`, NEVER `process.exit()`. On Linux a write to a pipe is not finished when it
 * returns, and `process.exit()` drops what is still waiting: this test's first version called it,
 * passed on the PC, and on GitHub's runner read 2,265,729 characters of the 3,000,014 written. The
 * fault was in the command the test ran, not in what is under test. Setting the code and letting
 * the process end by itself lets the stream drain first.
 */
const long = (exit: number, stream: 'stdout' | 'stderr'): string =>
  `node -e "process.${stream}.write('x'.repeat(3000000)); process.${stream}.write('${LAST}'); process.exitCode = ${String(exit)}"`;

describe('a gate that prints more than a megabyte', { timeout: 60_000 }, () => {
  it('is read to its last words when it fails', () => {
    const verdict = runGate(long(1, 'stderr'), CWD);
    expect(verdict.failed).toBe(true);
    expect(verdict.output.length).toBeGreaterThan(3_000_000);
    expect(verdict.output.includes(LAST), 'A LONG GATE’S LAST WORDS WERE CUT OFF').toBe(true);
  });

  it('is not called failed when it passes, and is read whole', () => {
    // The half a failure control cannot show: with the output cut, a gate that passed was
    // reported as one that failed.
    const verdict = runGate(long(0, 'stdout'), CWD);
    expect(verdict.failed, 'A LONG GATE THAT PASSED WAS CALLED FAILED').toBe(false);
    expect(verdict.output.length).toBeGreaterThan(3_000_000);
    expect(verdict.output.includes(LAST), 'A LONG GATE’S LAST WORDS WERE CUT OFF').toBe(true);
  });

  it('is never given a verdict when it prints more than is held', () => {
    // A limit set low on purpose. Neither "failed" nor "passed" may come back: the run must stop
    // and say why.
    expect(() => runGate(long(0, 'stdout'), CWD, 1000)).toThrow(GateOutputCut);
    expect(() => runGate(long(1, 'stderr'), CWD, 1000)).toThrow(/ITS OUTPUT WAS CUT/);
  });

  it('still tells a short gate that fails from one that passes', () => {
    expect(runGate('node -e "process.exitCode = 0"', CWD).failed).toBe(false);
    const failed = runGate(`node -e "console.error('${LAST}'); process.exitCode = 3"`, CWD);
    expect(failed.failed).toBe(true);
    expect(failed.output).toContain(LAST);
  });
});
