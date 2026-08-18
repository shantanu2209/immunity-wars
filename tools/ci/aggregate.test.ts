/**
 * THE AGGREGATE GATE, MADE TO FAIL — including on the case that motivates its existence.
 *
 * The gate decides whether the build is green, and branch protection keys on it alone. A gate that
 * has never been made to fail is not known to work, and this one cannot be exercised by any other
 * means: as a workflow `if:` expression its only test would be breaking a real build on main.
 *
 * The case that matters is `skipped`. Jobs skip for ordinary reasons — an unmatched path filter, a
 * dependency that failed, a cancelled run — and the naive expression
 *
 *     if: ${{ !contains(needs.*.result, 'failure') }}
 *
 * is GREEN for every one of them. The first test below is that expression's counterexample.
 */

import { describe, expect, it } from 'vitest';

import { aggregate, parseNeeds } from './aggregate.js';

const EXPECTED = ['static', 'suites', 'coverage', 'balance'];

const allGood = {
  static: { result: 'success' },
  suites: { result: 'success' },
  coverage: { result: 'success' },
  balance: { result: 'success' },
};

describe('the aggregate gate', () => {
  it('is green only when every expected job succeeded', () => {
    const v = aggregate(allGood, EXPECTED);
    expect(v.green).toBe(true);
    expect(v.reason).toContain('all 4');
  });

  /**
   * THE ONE THIS EXISTS FOR. A skipped job must be red. `!contains(needs.*.result, 'failure')`
   * returns true here, which is exactly the silent-green this gate replaces.
   */
  it('CONTROL: a SKIPPED job is not green', () => {
    const v = aggregate({ ...allGood, balance: { result: 'skipped' } }, EXPECTED);
    expect(
      v.green,
      'a skipped job passed the gate — this is the trap the gate exists to avoid',
    ).toBe(false);
    expect(v.reason).toContain('balance skipped');
    expect(v.lines.join('\n')).toContain('did not happen is not a check that passed');
  });

  /**
   * An ABSENT job — one that never reported at all — is the harder half. Reading only the keys
   * `needs` contains cannot detect it, because a job that never ran contributes no key. This is
   * why `expected` is passed explicitly rather than derived from the object.
   */
  it('CONTROL: a job that never reported at all is not green', () => {
    const { balance: _dropped, ...missing } = allGood;
    const v = aggregate(missing, EXPECTED);
    expect(v.green).toBe(false);
    expect(v.reason).toContain('balance absent');
    expect(v.lines.join('\n')).toContain('did not report at all');
  });

  it('CONTROL: a failed job is not green', () => {
    const v = aggregate({ ...allGood, suites: { result: 'failure' } }, EXPECTED);
    expect(v.green).toBe(false);
    expect(v.reason).toContain('suites failure');
  });

  it('CONTROL: a cancelled job is not green', () => {
    const v = aggregate({ ...allGood, coverage: { result: 'cancelled' } }, EXPECTED);
    expect(v.green).toBe(false);
    expect(v.reason).toContain('coverage cancelled');
  });

  /**
   * A result string this file does not recognise must be RED, not ignored. If GitHub ever adds a
   * status, the failure mode should be a build that stops rather than a gate that waves it through.
   */
  it('CONTROL: an unrecognised result is red by default, not ignored', () => {
    const v = aggregate({ ...allGood, static: { result: 'neutral' } }, EXPECTED);
    expect(v.green).toBe(false);
    expect(v.lines.join('\n')).toContain('UNRECOGNISED RESULT');
  });

  /** An empty result string is absence wearing a present job's clothes. */
  it('CONTROL: an empty result string counts as absent', () => {
    const v = aggregate({ ...allGood, suites: { result: '' } }, EXPECTED);
    expect(v.green).toBe(false);
    expect(v.reason).toContain('suites absent');
  });

  /**
   * THE VACUITY GUARD. An empty expected list would make every build green forever — the gate
   * would report success having checked nothing, which is the failure this repository has found
   * repeatedly in its own test suites.
   */
  it('CONTROL: expecting no jobs is not a pass', () => {
    const v = aggregate(allGood, []);
    expect(v.green).toBe(false);
    expect(v.reason).toContain('VACUITY');
  });

  /**
   * Reports every expected job, not only the problems. A verdict listing only failures cannot show
   * that the other three ran — the same reason `PanelVerdict.shifts` carries every metric.
   */
  it('reports every expected job, not only the failures', () => {
    const v = aggregate({ ...allGood, balance: { result: 'failure' } }, EXPECTED);
    for (const name of EXPECTED) expect(v.lines.join('\n')).toContain(name);
  });

  /** An unexpected job cannot turn a red build green, but it is surfaced as drift. */
  it('surfaces a job that reported but was not expected', () => {
    const v = aggregate({ ...allGood, mystery: { result: 'success' } }, EXPECTED);
    expect(v.green).toBe(true);
    expect(v.lines.join('\n')).toContain('not in the expected list');
  });

  it('parses the shape GitHub actually passes', () => {
    const needs = parseNeeds('{"static":{"result":"success","outputs":{}}}');
    expect(needs.static?.result).toBe('success');
    expect(() => parseNeeds('[]')).toThrow();
    expect(() => parseNeeds('null')).toThrow();
  });
});
