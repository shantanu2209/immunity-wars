# The suite manifest

[`../suites.json`](../suites.json) — what each test suite proves, what it does not, and how
[`docs/PHASE1_BRIEF.md`](../../docs/PHASE1_BRIEF.md) §7's seven-row table reconciles with what is
actually on disk.

---

## Read this first

> ### Four suites and three cross-cutting properties. There is no unit suite. What exists is the equivalence corpus, which proves AGREEMENT and not CORRECTNESS — a bug-for-bug port is green on a violation both engines share.

That sentence is the single most important thing anyone arriving at this repository needs to
understand about what is and is not proven here.

**It is not a criticism, and it is the sentence most likely to be softened by someone who reads it
as one.** It is the reason the property suite exists: agreement with legacy and correctness are
different claims, the corpus can only make the first, and Task D built a second instrument
precisely because the first cannot reach the second. 6,000 identical games say the port matches
legacy and say nothing about whether legacy was right.

It is pinned **verbatim** in `schema.ts` as `RECONCILIATION`, asserted by `manifest.test.ts`, and
rendered verbatim on the dashboard. Softening it turns a test red rather than passing quietly into
the published page.

---

## Why §7 could not simply be transcribed

The table describes seven suites. The disk has four, and the mismatch runs in **both** directions:

| §7 row | Reality |
|---|---|
| `property` · `balance` · `schema` | Real, separable suites |
| `unit` | **Does not exist.** No suite tests each engine rule in isolation |
| `negative` | Cross-cutting. Every suite carries its own controls — 77 of them |
| `boundary` | Cross-cutting. Two mechanisms, neither subsuming the other |
| `serialisation` | Cross-cutting. Two invariants inside the property suite |

And the direction that is easy to miss: **the equivalence corpus realises no §7 row at all.** The
largest test asset in this repository — 315 assertions, 2,000 nightly games — does not appear in
that table. §7 is not merely optimistic about a suite that does not exist; it is also silent about
one that does. `manifest.test.ts` asserts both halves.

---

## What makes this load-bearing rather than decorative

A file listing suites drifts from the suites the moment one is added, renamed, or quietly stops
running, and nothing goes red. This repository has found **eleven** documented-but-false claims;
an unchecked manifest would have been the twelfth. So three things consume it:

1. **The CI workflows** build their job matrix from it — no tier list duplicated in YAML.
2. **The dashboard** renders one row per entry, and an entry whose result file is **missing renders
   RED rather than being omitted**, because a suite that silently stopped running must look worse
   than one that failed.
3. **`manifest.test.ts`** checks every claim in it.

---

## The controls

Per the standing rule — *a check that has never failed is not known to work* — every assertion in
`manifest.test.ts` has been made to fire on purpose. Each mutation below was applied to
`suites.json`, the suite run, and the file restored.

| # | Mutation | Fires |
|---|---|---|
| 1 | Remove "There is no unit suite" from the sentence | schema + verbatim pin |
| 2 | Change the unit row to `realised-inside-other-suites` | four-and-three count + absent-unit |
| 3 | Point a tier at `pnpm test:nonexistent` | real-command check |
| 4 | Claim 99 negative controls where 7 exist | controls-exist check |
| 5 | Delete the `serialisation` cross-cutting row | §7-accounted-for + four-and-three |
| 6 | Set a `doesNotProve` to `"N/A"` | substantive-doesNotProve + corpus caveat |

Reproduce with:

```bash
npx tsx tests/manifest/controls.ts
```

Each one fires on **exactly** the assertion it targets and no others, which is the part worth
checking — a control that reddens the whole suite proves only that the file is read.

Two of the assertions carry vacuity guards, because their bodies sit inside loops or behind a
`continue`: the command check counts what it examined, and the negative-control count is a floor
rather than an equality so an unrelated addition cannot force it to be weakened.

---

## Adding a suite

1. Add the entry to [`../suites.json`](../suites.json), including `doesNotProve` — the schema
   rejects a short one, because a table listing only what each suite proves is how "the corpus is
   green" becomes "the engine is correct".
2. Name its control files and count them honestly. Zero is rejected.
3. If it realises a §7 row, say which. If it realises none, say `null` — that is a real answer and
   the corpus uses it.
4. Run `npx vitest run --root tests/manifest`.
