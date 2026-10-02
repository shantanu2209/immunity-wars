/**
 * RUNS ONE GATE AND KEEPS EVERYTHING IT PRINTS (docs/FINDINGS.md #125, 2 October 2026).
 *
 * The self-test judges a gate by its exit AND by words in its output, so the output must be whole.
 * `execSync` keeps one megabyte of each stream unless told otherwise, and past that it stops the
 * command and throws. That is wrong for the self-test twice over:
 *
 *   - THE WORDS ARE CUT OFF. A gate that fails prints its reasons in order, and the one a control
 *     looks for can be the last. One gate prints 975,464 characters on the PC with its words in the
 *     final few hundred; on GitHub's runner, where every path in a stack trace is longer, the same
 *     output passed the megabyte and the control read as "failed, but without its words". It had
 *     passed on the PC with 7% to spare, and nothing said so.
 *   - A GATE THAT PASSES IS CALLED FAILED. The throw for a full buffer looks the same, to a caller
 *     that only catches, as the throw for a non-zero exit. A mustPass control on a long gate would
 *     have gone red with the gate green.
 *
 * So the limit is far past anything a gate prints, and reaching it is never a verdict: it is said
 * by name, and the run stops.
 */
import { execSync } from 'node:child_process';

/** 512 MB a stream. The longest gate measured prints under one megabyte. */
export const GATE_OUTPUT_LIMIT = 512 * 1024 * 1024;

/** The gate printed more than was held, so nothing can be said about it. */
export class GateOutputCut extends Error {
  constructor(gate: string, limit: number) {
    super(
      `THE GATE PRINTED MORE THAN THE SELF-TEST HOLDS (${String(limit)} bytes a stream), SO ` +
        `ITS OUTPUT WAS CUT. That is not a verdict on the gate: ${gate}`,
    );
    this.name = 'GateOutputCut';
  }
}

export function runGate(
  gate: string,
  cwd: string,
  limit: number = GATE_OUTPUT_LIMIT,
): { failed: boolean; output: string } {
  try {
    const out = execSync(gate, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: limit,
    });
    return { failed: false, output: out };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; code?: string };
    if (err.code === 'ENOBUFS') throw new GateOutputCut(gate, limit);
    return { failed: true, output: `${err.stdout ?? ''}\n${err.stderr ?? ''}` };
  }
}
