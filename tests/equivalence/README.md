# The equivalence rig

Proves `packages/engine/` behaves identically to `tools/legacy/v2_engine.js`.

Built for Task B, but it does not retire with it: **every later task that touches the engine or
the content tables should re-run the corpus**, because it is the only thing that can tell you a
refactor changed behaviour. Task C moving the data tables to `packages/content/` is exactly that
kind of change.

Method and rationale: [`docs/TASK_B_PLAN.md`](../../docs/TASK_B_PLAN.md).
Status and limits: [`docs/TASK_B_CLOSEOUT.md`](../../docs/TASK_B_CLOSEOUT.md).

---

## How it works, in one paragraph

Both engines are driven from the **same seeded `Math.random`**, so a run is reproducible and the
number of random draws is itself comparable. A bot plays against **legacy only** and its action
log is recorded; that log is then replayed into the port. After every action the two are compared
on three levels — full state hash, RNG draw count, and `applyAction`'s return value. The draw
count is what catches "right answer, wrong dice", which a state diff misses for many turns.

---

## Running it

```bash
pnpm verify                 # typecheck + lint + boundaries + all tests. Run BEFORE committing
pnpm coverage:gate          # the coverage gate. Must pass; regenerates the two coverage docs
```

Longer runs, on demand rather than in CI:

```bash
npx tsx tests/equivalence/full-corpus.ts            # 6,000 games, ~9 min. The nightly tier
npx tsx tests/equivalence/full-corpus.ts 1500       # a subset, ~2.5 min
npx tsx tests/equivalence/demonstrate-dead-arms.ts  # must print DEAD on every line
```

Coverage tiers — **which tests produce the number is the point**, so it is measured three ways:

```bash
pnpm coverage:corpus        # recorded bot games alone           the narrowest reading
pnpm coverage:generators    # + fuzz, scenarios, query corpus    THE HEADLINE TIER
pnpm coverage:all           # every test                         the loosest reading
pnpm coverage:gaps          # classify what is still uncovered
```

---

## The tools

| File | What it is for |
|---|---|
| `src/rig.ts` | Record / replay / compare. Also holds **`DELIBERATE_DIVERGENCES`** — see the warning below |
| `src/rng.ts` | Seeded `Math.random` and the draw counter |
| `src/hash.ts` | `canonical()` — NaN-aware, order-preserving serialisation. **Not** `JSON.stringify` |
| `src/shrink.ts` | Delta-debugs a divergence to a minimal repro. An rng-level bug shrinks ~98 actions → 1 |
| `src/diff.ts` | Path-level structural diff, so a failure names the field rather than dumping two blobs |
| `src/bot.ts` | Sequence generator. **Not a behaviour oracle** — it only needs to produce legal games |
| `src/states.ts` | Harvests states from real games, then augments with 28 mutations the bot cannot reach |
| `src/engine.ts` | Loads legacy (and deliberately-mutated copies) without touching `tools/legacy/` |
| `src/corpus.ts` | Expands `corpus/seeds.json` into cases. Seeds are committed; logs regenerate |
| `full-corpus.ts` | The nightly run, with shrinking on failure |
| `confined-change.ts` | **Run this before any deliberate behaviour change.** Proves only the intended paths moved |
| `coverage-gate.ts` | The restated gate, self-policing. Writes `COVERAGE_EXCLUSIONS.md` and `COVERAGE_DEFERRED.md` |
| `demonstrate-dead-arms.ts` | The executable demonstrations behind the gate's rule-B exclusions |
| `classify-gaps.ts`, `uncovered.ts` | Enumerate and bucket uncovered branches |

---

## Three things that will bite you

**1. `DELIBERATE_DIVERGENCES` in `src/rig.ts` is a liability, not a convenience.**
Every path on it is a place the corpus has **stopped watching**. It currently holds
`stats.arrivals` and `stats.gotThrough`, excluded after the FINDINGS #3 fix. Nothing joins it
without `confined-change.ts` evidence first, and if it grows past a handful the corpus no longer
proves what the closeout claims it proves.

Any new comparison must apply `normalise()` from `src/rig.ts`, or it will fail on those paths.

**2. A green first run is not a result until you have tried to break it.**
This project has found the same failure five times: a check that appears to pass because nobody
measured the thing that would have said otherwise. Concretely, twice in this rig:

- A rare-trigger test called a function *neither* engine exports, through an optional chain. Both
  sides silently did nothing and it passed while comparing absolutely nothing.
- The coverage gate's exclusion list matched **both** arms of an `if`, quietly removing covered
  arms from the denominator.

Both were found by going looking after a green run, not by the tests failing. Inject a mutation
the check should catch. If it does not catch it, establish whether that is a blind spot or a
genuinely unreachable branch **before** assuming either — a negative control that correctly finds
nothing is a result worth recording (see FINDINGS #19).

**3. `as number` is `!` spelled differently.**
`packages/engine` bans non-null assertions by lint rule, but a cast bypasses the same check
silently. At B7 `noUncheckedIndexedAccess` reported 8 problems when the real number was 10 —
casts written during B5 had hidden the two most interesting lookups from the flag that existed to
find them. When a strictness check comes back clean, check whether you disabled it earlier.

---

## Adding a case

Prefer a scenario that runs against **both** engines and compares, over one that only exercises
the port. A port-only test raises coverage while proving nothing, which is the failure mode above.
`src/coverage-scenarios.test.ts` is the table-driven pattern to copy.
