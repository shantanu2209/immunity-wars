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
/** Prints three megabytes to stderr, then its last words, then exits with the code given. */
const long = (exit: number): string =>
  `node -e "process.stderr.write('x'.repeat(3000000)); process.stderr.write('${LAST}'); process.exit(${String(exit)})"`;

describe('a gate that prints more than a megabyte', { timeout: 60_000 }, () => {
  it('is read to its last words when it fails', () => {
    const verdict = runGate(long(1), CWD);
    expect(verdict.failed).toBe(true);
    expect(verdict.output.length).toBeGreaterThan(3_000_000);
    expect(verdict.output.includes(LAST), 'A LONG GATE’S LAST WORDS WERE CUT OFF').toBe(true);
  });

  it('is not called failed when it passes', () => {
    // The half a failure control cannot show: with the output cut, a gate that passed was
    // reported as one that failed.
    const verdict = runGate(long(0), CWD);
    expect(verdict.failed, 'A LONG GATE THAT PASSED WAS CALLED FAILED').toBe(false);
  });

  it('is never given a verdict when it prints more than is held', () => {
    // A limit set low on purpose. Neither "failed" nor "passed" may come back: the run must stop
    // and say why.
    expect(() => runGate(long(0), CWD, 1000)).toThrow(GateOutputCut);
    expect(() => runGate(long(1), CWD, 1000)).toThrow(/ITS OUTPUT WAS CUT/);
  });

  it('still tells a short gate that fails from one that passes', () => {
    expect(runGate('node -e "process.exit(0)"', CWD).failed).toBe(false);
    const failed = runGate(`node -e "console.error('${LAST}'); process.exit(3)"`, CWD);
    expect(failed.failed).toBe(true);
    expect(failed.output).toContain(LAST);
  });
});
