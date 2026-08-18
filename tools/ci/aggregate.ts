/**
 * THE AGGREGATE GATE — the one required status check, and the trap it exists to avoid.
 *
 *   node --import tsx tools/ci/aggregate.ts '<toJSON(needs)>'
 *
 * ============================================================================================
 * LOGIC THAT LIVES IN YAML CANNOT BE FALSIFIED; LOGIC IN A SCRIPT CAN.
 * ============================================================================================
 *
 * Branch protection keys on ONE check. Every other job feeds it. So this decision — is the build
 * green? — is the single most load-bearing conditional in the repository, and the usual way to
 * write it is a workflow expression:
 *
 *     if: ${{ !contains(needs.*.result, 'failure') }}      # WRONG
 *
 * That is green when a needed job was **skipped**, and jobs skip for ordinary reasons: a path
 * filter did not match, an earlier job failed so a dependent never started, someone cancelled a
 * run. A skipped job produces no result, no red cross, and no signal that anything is missing —
 * the merge button turns green because a check did not happen.
 *
 * **That is the CI-shaped version of every blind check this project has found**, and it has the
 * same shape as all of them: a green that means "nothing ran" is indistinguishable from a green
 * that means "everything passed". `tests/equivalence/README.md` lists nine other instances.
 *
 * Written as an expression, it could only ever be tested by breaking a real build on the default
 * branch. Written here, `aggregate.test.ts` hands it a skipped job and requires exit 1.
 *
 * THE RULE THIS IMPLEMENTS: a build is green only when EVERY expected job reports `success`.
 * Anything else — failure, cancelled, skipped, absent, or a name nobody expected — is not green.
 * The default is red, and a state this file does not recognise is red rather than ignored.
 */

/** GitHub's per-job result. `skipped` is the dangerous one and is spelled out for that reason. */
export type JobResult = 'success' | 'failure' | 'cancelled' | 'skipped';

export interface JobReport {
  readonly name: string;
  readonly result: string;
}

export interface Verdict {
  readonly green: boolean;
  /** Every expected job with the reason it did or did not count. Never only the failures. */
  readonly lines: readonly string[];
  readonly reason: string;
}

/**
 * Decide.
 *
 * `expected` is the list of job names that MUST have reported. Passing it explicitly is what makes
 * an absent job detectable: reading only the keys `needs` happens to contain cannot notice that a
 * job never ran, because a job that never ran contributes no key.
 */
export function aggregate(
  needs: Readonly<Record<string, { result?: string } | undefined>>,
  expected: readonly string[],
): Verdict {
  const lines: string[] = [];
  const problems: string[] = [];

  for (const name of expected) {
    const entry = needs[name];
    if (!entry || typeof entry.result !== 'string' || entry.result.length === 0) {
      lines.push(`  ${name.padEnd(24)} ABSENT — this job did not report at all`);
      problems.push(`${name} absent`);
      continue;
    }
    const result = entry.result;
    if (result === 'success') {
      lines.push(`  ${name.padEnd(24)} success`);
      continue;
    }
    // Everything else is red, and each is named rather than lumped together, because "skipped"
    // and "failure" send a reader to completely different places.
    const note =
      result === 'skipped'
        ? 'SKIPPED — a check that did not happen is not a check that passed'
        : result === 'cancelled'
          ? 'CANCELLED — no verdict was reached'
          : result === 'failure'
            ? 'FAILURE'
            : `UNRECOGNISED RESULT (${result}) — treated as red by default`;
    lines.push(`  ${name.padEnd(24)} ${note}`);
    problems.push(`${name} ${result}`);
  }

  // A job that reported but was never expected. Not fatal — it cannot make a red build green —
  // but it means the expected list has drifted from the workflow and someone should know.
  for (const name of Object.keys(needs)) {
    if (!expected.includes(name)) {
      lines.push(`  ${name.padEnd(24)} reported but not in the expected list — update aggregate`);
    }
  }

  if (expected.length === 0) {
    // The vacuity guard. An empty expected list would make every build green forever.
    return {
      green: false,
      lines,
      reason: 'VACUITY: no jobs were expected, so nothing was checked. This is not a pass.',
    };
  }

  return {
    green: problems.length === 0,
    lines,
    reason:
      problems.length === 0
        ? `all ${expected.length} expected jobs succeeded`
        : problems.join(', '),
  };
}

/** Parse `${{ toJSON(needs) }}`, which is a JSON object of `{ result, outputs }` per job. */
export function parseNeeds(json: string): Record<string, { result?: string }> {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('needs must be a JSON object');
  }
  return parsed as Record<string, { result?: string }>;
}
