/**
 * THE REACT PAIR — added 26 September 2026 (docs/FINDINGS.md #92). React refuses to start when
 * `react` and `react-dom` differ by any version at all, its error #527, and nothing here noticed:
 * Dependabot moved `react-dom` to 19.3.0 and left `react` at 19.2.8, typecheck, lint and every
 * suite stayed green, CI passed, and the app built from `main` was a blank page. The Gate 1 audit
 * found it, at its first wait, because it is the only check that starts the built app.
 *
 * React's rule is EXACT, not a range: `react-dom` 19.3.0 asks for `react` ^19.3.0, which a `react`
 * 19.4.0 would satisfy and React would still refuse. So this reads the lockfile, which is what
 * installs, and requires every `react-dom` resolved there to be paired with a `react` of the same
 * version. A lockfile in which it finds no `react-dom` at all is a failure, never a pass: a check
 * that read nothing has checked nothing.
 *
 * Runs in `pnpm verify` and in CI's static job, so a Dependabot PR that splits the pair is red
 * before it can be merged. Controls in `tools/ci/selftest.ts`: `react-pair-split` and
 * `react-pair-unread` must fire, `react-pair-moved-together` must stay green.
 *
 *   pnpm deps:check
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Every `react-dom@<version>(react@<version>)` the lockfile resolves, as [react-dom, react]. */
export function reactPairs(lockfile: string): Array<readonly [string, string]> {
  const pairs: Array<readonly [string, string]> = [];
  for (const m of lockfile.matchAll(/react-dom@([^\s()':]+)\(react@([^\s()':]+)\)/g)) {
    const dom = m[1];
    const react = m[2];
    if (dom !== undefined && react !== undefined) pairs.push([dom, react]);
  }
  return pairs;
}

const pairs = reactPairs(readFileSync(join(REPO, 'pnpm-lock.yaml'), 'utf8'));
if (pairs.length === 0) {
  console.error(
    'REACT PAIR UNREAD: no react-dom was found in pnpm-lock.yaml, so nothing was checked',
  );
  process.exit(1);
}
const split = pairs.filter(([dom, react]) => dom !== react);
if (split.length > 0) {
  for (const [dom, react] of split) {
    console.error(`REACT PAIR SPLIT: react-dom ${dom} is installed with react ${react}`);
  }
  console.error('React refuses to start unless the two are the same version (its error #527).');
  process.exit(1);
}
console.log(
  `react pair: ${String(pairs.length)} react-dom resolution(s), each with its own react version`,
);
