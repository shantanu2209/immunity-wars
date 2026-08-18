# CI

Two workflows and a self-test. What runs, what it proves, and the two traps this pipeline is
built around.

---

## Read this first

> ### Logic that lives in YAML cannot be falsified; logic in a script can.

The aggregate gate — the single check branch protection keys on — decides whether the build is
green. Written the obvious way it is a workflow expression:

```yaml
if: ${{ !contains(needs.*.result, 'failure') }}   # WRONG
```

**That is green when a needed job was SKIPPED.** Jobs skip for ordinary reasons: an unmatched path
filter, a dependency that failed so a dependent never started, a cancelled run. A skipped job
produces no result, no red cross, and no signal that anything is missing — the merge button turns
green because a check *did not happen*.

> ### A green build because a needed job was SKIPPED is the CI-shaped version of every blind check this project has found.

It is the same shape as all ten of them: a green that means "nothing ran" is indistinguishable from
a green that means "everything passed". As an expression it could only ever be tested by
deliberately breaking a build on `main`. So the decision lives in
[`tools/ci/aggregate.ts`](../tools/ci/aggregate.ts), and
[`aggregate.test.ts`](../tools/ci/aggregate.test.ts) hands it a skipped job and requires exit 1 —
along with an absent job, a cancelled one, an unrecognised status, and an empty expected list.

**Everything else that can be a script, is one.** The job matrix comes from
[`tools/ci/matrix.ts`](../tools/ci/matrix.ts) reading `tests/suites.json`; the dashboard's caveats
are enforced by TypeScript. The YAML is plumbing.

---

## The tiers

Derived from [`tests/suites.json`](../tests/suites.json), never written twice. A suite that gains a
tier gets a job automatically; a tier list in YAML would drift, and the drift would be silent —
a job that does not exist cannot fail.

### Per-push — [`ci.yml`](workflows/ci.yml)

Runs on every push and pull request. `plan`, `static` and `coverage` all start immediately;
`suites` waits on `plan`; `ci-green` waits on everything.

**Measured on GitHub-hosted `ubuntu-latest`, 19 Aug 2026** — the first two real runs, not a
projection:

| job | cold cache | warm cache |
|---|---|---|
| `plan` — derive the matrix from the manifest | 24s | 25s |
| `static` — typecheck · lint · format:check · boundaries | 1m 00s | 54s |
| `test` — equivalence, property and content in one vitest run | 4m 00s | 3m 00s |
| `test-balance` — one unseen arm per difficulty | 59s | 56s |
| **`coverage`** — `coverage:all` + the 95% gate + the regenerated exclusion list | **5m 00s** | **4m 00s** |
| `ci-green` — the aggregate, **the only required check** | 16s | 23s |
| **tier wall clock** | **~5m 16s** | **~4m 23s** |

**`coverage` is the critical path in both runs** — it is very nearly the whole tier, and every
other job finishes inside it.

Two things about reading these numbers:

- **The cold/warm split is the pnpm store cache, not noise.** The first run populated it; the
  second hit it. Steady state is the warm column, so the tier sits around **4m 23s** against a
  5-minute budget — under, but with roughly 35 seconds of headroom and `coverage` owning four
  minutes of it.
- **GitHub reports JOB duration, which excludes queue time.** Real push-to-green wall clock is
  longer than the table, by an amount that depends on runner availability rather than on anything
  in this repository.

> **The trigger, recorded so it is a decision rather than a judgement call later:** `coverage`
> moves to the nightly tier if it sits **above 5 minutes on warm-cache runs**. One cold-cache run
> over budget is not that — the first push measured 5m 00s with an empty cache and 4m 00s with a
> warm one, and demoting on that would be reacting to cache state rather than to cost.
>
> **If it moves, the fact goes on the dashboard, not into this file.** A gate that quietly stopped
> running per-push is exactly the kind of thing nobody notices, and a reader of the page has no
> reason to come looking here.

### Nightly — [`nightly.yml`](workflows/nightly.yml)

02:00 UTC and on demand. **Runs every suite**, not only the slow ones: the full corpus at 2,000
games and the property suite at 10,002 run in parallel with the balance panel and the content
schema, so the tier costs ~15 minutes rather than the sum. Also measures coverage and serialised
state size for the trends, appends one history record to the `results-data` branch, and publishes
the dashboard.

**Why every suite, and not just the slow tiers.** This workflow is what publishes the page, and the
page renders one row per manifest suite with a missing result shown RED. So a suite the nightly
does not run has a row that can never go green, no matter how often it passes per-push. The first
real nightly proved it: `balance-panel` and `content-schema` declared per-push tiers only, the
matrix held two jobs instead of four, and the page read INCOMPLETE with two permanent NO RESULT
rows. The missing-is-red rule was working exactly as designed — nothing made it agree with the
tier list. `manifest.test.ts` now requires every suite to declare a nightly tier.

**`metrics-run.ts` is deliberately in neither automated tier.** It recalibrates the balance bands
and *overwrites* `bands.json`; a scheduled recalibration would regenerate the panel's own reference
and it could never fail again — the Task C5b shape. It is `manual` in the manifest, a human runs
it, and the matrix generator's tests assert it appears in no automated tier.

---

## What a per-push green does not prove

The sentence on the dashboard is **generated from the manifest**, not typed, so it cannot drift
from what actually ran. Today it says the per-push tier runs 210 of the corpus's 2,000 games and
120 of the property suite's 10,002 — and that none of it measures difficulty, or whether the game
is any good.

Regenerate it with:

```bash
npx tsx tools/ci/matrix.ts --sentence
```

---

## The self-test

> ### A CI pipeline that has never gone red is not known to work.

Same rule as everything else here, with one wrinkle: making a pipeline fail on purpose normally
means pushing a broken commit, which marks the branch history forever and tempts everyone to skip
it. So [`tools/ci/selftest.ts`](../tools/ci/selftest.ts) mutates a file in the working tree, runs
one gate, requires it to fail, and reverts. Nothing is committed and `main` never goes red.

```bash
npx tsx tools/ci/selftest.ts          # every gate
npx tsx tools/ci/selftest.ts lint     # one, by id
```

**The diagnostic is the point, not the exit code.** `pnpm lint` exits non-zero if the config is
broken, a dependency is missing, or the file will not parse. Each control requires the expected
rule *name* in the output — that is what separates "this gate caught my mutation" from "something
went wrong". A gate that fails for the wrong reason has not been demonstrated.

It also refuses an inert mutation (one that no longer changes the file, because the code moved
under it) and verifies the tree matches its state **before** the run — not that it is clean, since
uncommitted work is the normal case and a check that cannot tell "I failed to restore your files"
from "you had edits already" gets deleted.

---

## Secrets and permissions

**This pipeline needs zero repository secrets.** If a step ever appears to need one, that is a
design change to discuss, not a value to add.

- `permissions: contents: read` at the top of both workflows, so every job starts read-only.
- Exactly one job elevates: `record` in the nightly takes `contents: write`, and writes only to the
  orphan `results-data` branch. Nothing writes to `main`.
- `publish` takes `pages: write` and `id-token: write` and nothing else.
- `pull_request`, never `pull_request_target`.
- Every action pinned to a full commit SHA. Dependabot updates them monthly.
- **No `${{ }}` interpolated into a `run:` block.** Values reach the shell through `env:`, because
  `${{ }}` is substituted before bash sees it — a crafted branch name or manifest string would
  otherwise execute. This is a public repository and anyone can open a pull request.
- Logs are public. No `set -x` over anything sensitive, no environment dumps.
- The site is built from an explicit `site/` directory, **never from `docs/` wholesale**: `docs/`
  holds the rulebook and study packet, which are gitignored and unlicensed, and publishing the
  folder would be one careless change away from publishing Kartik's design work.
- History commits are authored by `github-actions[bot]` with GitHub's no-reply address. Commit
  metadata is permanent and routinely scraped.

---

## Repository settings

Several things cannot be set from a file and must be switched on in the GitHub UI — Pages source,
Dependabot alerts, secret scanning, default workflow permissions, and branch protection. The
ordered list is in [`docs/CI_SETUP.md`](../docs/CI_SETUP.md). **Branch protection goes last**, once
the checks it names have run at least once and are known green.
