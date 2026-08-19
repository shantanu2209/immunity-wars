/**
 * THE CONTROL DEFINITIONS, split from the runner so they can be imported without running it.
 *
 * `coupling.test.ts` imports this to assert, inside `pnpm test`, that every title these controls
 * expect to redden still exists in `manifest.test.ts` — the check that replaced a cadence rule
 * after the cadence failed (`docs/FINDINGS.md` #45): P2.1 renamed a test title and these
 * expectations sat stale for a whole sub-phase because running the harness was a practice, and
 * practices drift. The runner (`controls.ts`) executes mutations against `tests/suites.json`;
 * importing THIS file executes nothing.
 */

export interface Control {
  readonly name: string;
  /** Applied to the manifest text. Must change it — an inert mutation is a control that lies. */
  readonly mutate: (text: string) => string;
  /** Substrings of the test titles this must redden. Exact set: no more, no fewer. */
  readonly expectFailing: readonly string[];
}

export const CONTROLS: readonly Control[] = [
  {
    name: 'soften the pinned sentence — remove "There is no unit suite"',
    mutate: (t) => t.replace('There is no unit suite. ', ''),
    expectFailing: ['validates against the schema', 'carries the reconciliation sentence verbatim'],
  },
  {
    name: 'claim the unit suite exists after all',
    mutate: (t) =>
      t.replace('"status": "does-not-exist"', '"status": "realised-inside-other-suites"'),
    expectFailing: [
      // 'four' until P2.1 added the session suite; the title tracks tests/suites.json's count.
      // coupling.test.ts now fails the fast tier the moment this string and the title in
      // manifest.test.ts disagree — the drift #45 records can no longer wait for someone to
      // remember to run the harness.
      'is five suites and three cross-cutting properties',
      'records the absent unit suite as absent',
    ],
  },
  {
    name: 'point a tier at a command that does not exist',
    mutate: (t) =>
      t.replace('"command": "pnpm test:property"', '"command": "pnpm test:nonexistent"'),
    expectFailing: ['names a real command for every tier of every suite'],
  },
  {
    name: 'overclaim negative controls — 7 becomes 99',
    mutate: (t) => t.replace('"negativeControls": 7,', '"negativeControls": 99,'),
    expectFailing: ['declares negative controls that exist, for every suite'],
  },
  {
    name: 'drop a brief §7 row entirely — serialisation',
    mutate: (t) => {
      const d = JSON.parse(t) as { crossCutting: { briefSuite: string }[] };
      d.crossCutting = d.crossCutting.filter((c) => c.briefSuite !== 'serialisation');
      return `${JSON.stringify(d, null, 2)}\n`;
    },
    expectFailing: [
      'accounts for every one of the brief §7 rows',
      'is five suites and three cross-cutting properties',
    ],
  },
  {
    name: 'drop a nightly tier — the permanently-red-row trap',
    mutate: (t) => {
      const d = JSON.parse(t) as { suites: { id: string; tiers: Record<string, unknown> }[] };
      const balance = d.suites.find((s) => s.id === 'balance-panel');
      if (balance) delete balance.tiers.nightly;
      return `${JSON.stringify(d, null, 2)}\n`;
    },
    expectFailing: ['every suite declares a nightly tier'],
  },
  {
    name: 'blank out a doesNotProve field',
    mutate: (t) => {
      const d = JSON.parse(t) as { suites: { id: string; doesNotProve: string }[] };
      const corpus = d.suites.find((s) => s.id === 'equivalence-corpus');
      if (corpus) corpus.doesNotProve = 'N/A';
      return `${JSON.stringify(d, null, 2)}\n`;
    },
    expectFailing: [
      'states what each suite does not prove, substantively',
      'the corpus suite says plainly that agreement is not correctness',
    ],
  },
];
