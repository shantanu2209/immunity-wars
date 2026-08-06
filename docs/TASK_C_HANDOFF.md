# Task C — what it inherits from Task B

Written at the end of Task B so nothing needed for Task C lives only in a conversation.

**Task C** ([`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §3): move the content tables out of the engine
into `packages/content/` behind Zod schemas and a loader, and extract every player-visible string
into i18n catalogues.

---

## 1. The cut line already exists

B1 put all 22 data tables in **`packages/engine/src/data/`** — `board.ts`, `deck.ts`,
`events.ts`, `families.ts`, `invaders.ts`, `tropism.ts`, `tuning.ts` — deliberately, so Task C
is a move rather than an excavation. They are re-exported from `index.ts` under legacy's exact
names.

They were **generated from the running legacy module**, not retyped, and
`tests/equivalence/src/data.test.ts` proves all 22 identical to legacy including key order. Task C
must keep that test passing or replace it with a schema-based equivalent that is at least as
strong.

---

## 2. Four things that will silently break if you are not looking for them

### Key order is load-bearing

`canonical()` compares property order, and two tables are iterated with `Object.keys`:

- **`TROPISM`** order feeds `rollOrgan` — a differently-ordered table changes which organ a
  generalist pathogen picks for a given die roll
- **`FAM_KEYS`** order feeds the kidney antibody leak

A JSON round-trip preserves insertion order for string keys, so this survives a straightforward
move. It does **not** survive anything that sorts, normalises, or rebuilds a table from a schema
default. `data.test.ts` will catch it.

### `viewState` field order is a measurement, not a style choice

Task E must report `JSON.stringify(viewState(g)).length`, and that number decides whether the
Phase 3 relay can broadcast full state or must send deltas. Reordering `viewState` changes the
byte count and makes the measurement an artefact of the port rather than a fact about the game.
`view.ts` says so at the site.

### Error strings are frozen, and Task C is what unfreezes them

Every `err(...)` string in `actions.ts` — plus the `pushLog` HTML in `actions.ts`, `spread.ts`
and `construct.ts` — is byte-identical to legacy and has been held that way through the whole
port specifically so Task C could extract them.

The brief requires **a test asserting the catalogue still matches the legacy source strings**,
because nothing will consume the catalogues until Phase 2 and they would otherwise drift
unnoticed. `tests/equivalence/src/actions.test.ts` already compares error strings exactly; that
comparison must keep passing after extraction, or the catalogue and the engine have diverged.

### The corpus is the acceptance test for the move

Moving tables must be **value-preserving**, and there is already a tool that proves it:

```bash
npx tsx tests/equivalence/full-corpus.ts     # must stay clean: 6,000 games, 0 divergences
pnpm coverage:gate                          # must still pass
```

If the corpus goes red after a content move, the move changed a value. If you intend a change,
use `confined-change.ts` first and record it in [`DEVIATIONS.md`](DEVIATIONS.md) — see
[`tests/equivalence/README.md`](../tests/equivalence/README.md).

---

## 3. The schema should catch a real bug

[`FINDINGS.md`](FINDINGS.md) **#22** names a pattern found at B7: **six guards in the engine
defend against states the content tables cannot produce.** Each is correct as a rule; the deck
simply contains no card satisfying it. A guard that never fires is never tested, so nobody knows
whether it is right — and **#13 proves the point**, because its handling *is* wrong for the one
card it concerns and no test could have said so.

Two concrete asks for the schema work:

1. **Require every `DECK_MASTER.dz` to have a `FAMILY` entry, or an explicit documented
   exemption.** Pathogen X is currently absent from `FAMILY` and reaches the `X` antibody pool
   only because `famOf` short-circuits on `iv.novel` first. Lose that flag anywhere — a loader, a
   JSON round-trip dropping a falsy field — and the novel pathogen silently becomes an ordinary
   `EXB` bacterium and the clonal-selection lesson stops being taught. This is #13's real fix, and
   the boundary is the right place for it, not a fallback that guesses.
2. **Emit the `(type, flag)` combinations the deck actually contains**, so a guard against an
   impossible combination is visible at build time rather than discovered by a coverage run
   months later.

`tests/equivalence/src/pathogen-x.test.ts` pins the consequence today. When the schema fixes it,
that test should change to assert the new behaviour — and the change belongs in
[`DEVIATIONS.md`](DEVIATIONS.md), because it is a departure from legacy.

---

## 4. Do not lose these

| Thing | Where | Why it matters |
|---|---|---|
| `DELIBERATE_DIVERGENCES` | `tests/equivalence/src/rig.ts` | Paths the corpus has stopped watching. A liability; keep it short |
| Coverage exclusions | [`COVERAGE_EXCLUSIONS.md`](COVERAGE_EXCLUSIONS.md) | Generated, self-policing. Regenerate with `pnpm coverage:gate` |
| Coverage deferred | [`COVERAGE_DEFERRED.md`](COVERAGE_DEFERRED.md) | 10 multiplayer arms for Phase 3, 9 bot arms for Phase 2. **In** the denominator, not excluded |
| The four deviations | [`DEVIATIONS.md`](DEVIATIONS.md) | Anything differing from legacy and not listed there is a bug |
| Five design questions | [`TASK_B_CLOSEOUT.md`](TASK_B_CLOSEOUT.md) §7 | Awaiting Kartik. #5 (residents) is the one to read first |

---

## 5. Two standing constraints, easy to forget

- **`tools/legacy/` is read-only.** The rig loads it by reading the file and evaluating it, never
  by editing. A scratch file was once written there by accident; check `git status` if a `cd`
  fails mid-command.
- **`docs/*.docx` is gitignored on purpose.** The rulebook, quick reference and study packet are
  Kartik's design work in a public repo, and the content licence is blocked on the assets-
  provenance check. Resolve the licence before removing that rule.
