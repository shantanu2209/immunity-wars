# The Immunity Wars — App

## What this is

A cooperative immunology board game that teaches real biology through play.

**Designed by Kartik Chaudhary (age 13)** — the rules, the immunology, the board, the cards,
the balance of roles are his. Won 3rd at the KVRSS awards; presented at a University of
Hyderabad grant showcase, August 2026.

**Built with his father Shantanu**, who directs the engineering and holds the line on
scientific accuracy. Code is written with Claude under that direction — see README credits.
Repository is on Shantanu's account; Kartik does not have one.

Being rebuilt as a mobile-responsive web app, packaged to Android and iOS via Capacitor.

**Current phase: Phase 2** — the renderer rewrite. Spec: @docs/PHASE2_BRIEF.md (v1.3).
Phase 1 is closed; its spec and closeout are `docs/PHASE1_BRIEF.md` and
`docs/PHASE1_CLOSEOUT.md`, kept as the record of what was and was not proven.

**This is a public repository.** Do not commit personal details of either contributor beyond
what is in the README credits — no school, no address, no contact details, no photographs.
No API keys or secrets, ever.

## Hard rules

- **Scientific accuracy is non-negotiable.** Every mechanic must be defensible to a scientist.
  If a change would make the biology wrong, stop and say so — do not ship it and flag it later.
- **Rules live in `packages/engine/` and nowhere else.** No game logic in UI, server, or content.
- **Physical/digital parity.** The printed board and the app must agree. Board geometry has one
  source: `packages/content/src/board/geometry.json`. Never hardcode coordinates elsewhere.
- **No personal data.** No accounts, no emails, no persistent user identifiers, no analytics IDs.
  Users are under 18; India's DPDP Act treats them as children. Staying out of scope is a
  design constraint, not a preference.
- **No strangers, no matchmaking.** Private code-joined rooms only. Do not build public
  matchmaking, ban lists, or moderation systems in v1.

## Commands

```
pnpm install
pnpm typecheck        # must pass before any commit
pnpm lint
pnpm test             # unit + property + negative + schema
pnpm test:balance     # slow; run on engine/content changes
pnpm build
pnpm build:single     # self-contained HTML harness — double-click to play, no toolchain
```

## Layout

```
packages/engine/    Pure rules. No DOM, no Node APIs, no I/O. TypeScript strict.
packages/content/   Board geometry, diseases, labels, rules tables. Zod-validated JSON.
packages/protocol/  Client↔server message types + Zod schemas.
packages/ui/        React components.
packages/app/       Vite app shell.
packages/server/    Relay.
tools/legacy/       Original .js/.html. READ-ONLY reference. Never edit.
```

**The boundary invariant: content contains no logic, engine contains no data.**
`engine` → `content` is intended and unrestricted. `content` → anything is forbidden.

Enforced in two places, because neither can see the other's half:
- `.dependency-cruiser.cjs` — the import-graph directions (`pnpm boundaries`)
- `tests/equivalence/src/exports.test.ts` — that every data export of the engine is the *same
  object* as content's, by identity. A table re-declared inside `engine` imports nothing, so it
  casts no edge on the graph and dependency-cruiser is structurally blind to it.

*Corrected 6 Aug 2026.* This previously read "engine may import content types only. CI fails on
any other cross-import." CI did not — no such rule existed — and the rule could not hold anyway:
legacy publishes `ORGANS`, `DECK_MASTER`, `TROPISM` and 19 other tables as part of its 67-export
public API, so a types-only engine would have to stop publishing the values and break the
contract Task B was measured against.

## Conventions

- TypeScript `strict: true`. No `any` in `engine`. Keep types boring — no clever generics.
- **`noUncheckedIndexedAccess` is OFF for the Task B port, and is turned ON as an isolated
  commit at the END of Task B.** When enabling it, `!` (non-null assertion) is NOT an
  acceptable way to make a lookup compile — if a lookup can miss, handle the miss. `!` is
  already a lint error in `engine`, so the escape hatch is closed. Rationale in
  `tsconfig.base.json`.
- Zod at every trust boundary: network messages, content pack loading, saved games.
  Types are compile-time only and do nothing for malformed runtime input.
- **`rulesVersion` is on the content pack only — NOT on game state, NOT on network messages.**
  This line previously asserted that every state and message carries it. Neither does, and
  `packages/protocol` is a 20-line scaffold. Phase 3 owns making it true, alongside seam 7's
  deferred pack check — see `docs/FINDINGS.md` #26. *Corrected 12 Aug 2026, at Task D.*
- All player-visible strings go in i18n catalogues. Never hardcode UI text — a Hindi edition
  is a committed grant deliverable and retrofitting is expensive.

## How to work here

- **A check that has never failed is not known to work.** Not "probably works" — *not known*.
  Every new check gets a negative control that makes it fire on purpose, before it is trusted.
  This has been true ~10 times here and **zero times has the check turned out to be fine**. The
  worst case was Task C5b: nineteen green tests proving nothing, because the test imported its
  own generator, which regenerated the catalogue at import time — so every mutation was erased
  before it was checked. **A test that regenerates its own oracle cannot fail.** Full list of
  instances and the four instrument blind spots: `tests/equivalence/README.md`, "Read this first".

- **A check that has never been required to PASS on purpose is not known to permit anything.**
  The other half of the rule above, and it applies to every rule that expresses a boundary.
  **"Forbid X" is half a specification**: a rule that forbade *everything* would satisfy every
  negative control ever aimed at it, because forbidding more only makes a mustFail control pass
  harder. So **every boundary rule gets a `mustPass` control as well as a `mustFail` one** — a
  mutation in a PERMITTED edge, with the gate required to stay green.
  `tools/ci/selftest.ts` carries both kinds.

  *Added 18 Aug 2026, at P2.1, by a control that fired on its first run.* The `ui`/`app` boundary
  had two fail-controls, both green and both correct. The permitted edge — `ui` importing
  `@immunity-wars/content`, which the brief explicitly allows — came back **red**, because a
  companion rule reddens on unresolvable imports and `packages/ui` had not declared the
  dependency. The boundary gate was rejecting the one import it was supposed to allow, and no
  failure control could ever have said so. `docs/FINDINGS.md` #42; #41 is the resolved-path
  defect in the same rule.

- **Every sub-phase ends with a documentation sweep, before its closing commit.** Not a habit —
  **`pnpm docs:check`**, which runs inside `pnpm verify`. It checks the phase marker resolves and
  agrees with the brief version it names, that every test package reaches `tests/suites.json`, and
  that every relative markdown link resolves. Two negative controls prove it fires.

  It deliberately does **not** read prose: the parts a machine can falsify are checked, the rest
  is still a person's job, and a green run is not a claim that the documentation is true.

  *Added 19 Aug 2026, at the close of P2.1, because the habit had already failed.* `CLAUDE.md`
  said **"Current phase: Phase 1"** through the entire first session of Phase 2 and `ROADMAP.md`
  agreed with it. Nobody was badly misled, and that is the problem — a stale phase marker is not
  wrong enough to notice, so it survives in the document everyone reads first. **The check found
  both on its first run, along with a new test suite missing from the manifest.** A sweep that
  depends on someone remembering to sweep would have been the thirteenth documented-but-false
  claim in a repository that has found twelve.

- **When a control fires: FIX INLINE IF IT IS IN THE INSTRUMENT. FILE IF IT IS IN THE PRODUCT.**

  A control firing on a **check** — a boundary rule that cannot see the violation, a manifest
  missing a package, a gate sitting below its floor — means **the measuring apparatus is wrong,
  and everything measured with it until it is fixed is untrustworthy.** That is a stop-the-line
  condition, not scope creep. Fix it before continuing, in the same change.

  A control firing on **the thing being built** — a component, a layout, a rendering bug — is
  ordinary work. It goes in `docs/FINDINGS.md` and waits its turn.

  > **The test: does anything downstream depend on this being right?**
  > Instrument defects poison results. Product defects do not.

  *Agreed 19 Aug 2026, at the close of P2.1.* P2.1 absorbed four unplanned pieces of work and
  three of them were controls firing — the two-rule boundary defect, the permitted edge the gate
  was rejecting, the suite missing from the manifest. Each was fixed inline and each was right to
  fix inline, because all three were instruments. The rule exists so that the next sub-phase can
  stay scoped **without** teaching anyone to ignore a firing control, which is the failure this
  project would least survive.

- **Build what the task specifies. For anything beyond it, the test is PURPOSE, not cost:**
  does this make later work faster or safer, or is it completeness for its own sake? Build the
  first kind freely — the negative-control rule qualifies, because it catches a *class* of error
  and so compounds. **Flag the second in `docs/FINDINGS.md` and keep going; do not build it.**
  Say what a proposed addition makes cheaper or safer later and it will usually be approved.
  What this exists to prevent is good ideas accumulating one at a time without anyone asking
  what they are for. *Agreed 12 Aug 2026, after a session where several unasked-for additions
  were good and still cost more than they returned.*

- **Simulate before building.** Validate a design in a standalone model before touching
  production code. Never commit on an unvalidated design assumption. Task C2 is the case that
  earned this: measuring Zod's behaviour first showed that `z.object` **rebuilds objects in
  schema key order** and `z.record` with a key enum rebuilds in enum order — so the more
  strongly typed spelling was the unsafe one, and the natural schema would have silently
  desynchronised `TROPISM`, which feeds `rollOrgan`.
- **Behaviour preservation is testable — so test it.** When porting, run old and new engines
  on identical action sequences and diff the states. Demonstrate equivalence; don't assert it.
- **One strong idea at a time.** Discuss significant changes before rewriting. Explain the
  trade-offs so Kartik can make the call himself.
- **Flag uncertainty honestly.** A surprising measurement is a finding to report, not a
  problem to smooth over. Never overclaim to judges or funders.
- **Teach, don't just do.** Explain concepts at a level a bright 13-year-old can grasp.
  Kartik must be able to defend every mechanic to scientists.
- **Never imply Kartik wrote the code.** He designed the game; the implementation is Claude's,
  directed by Shantanu. Keep commit messages, docs and comments accurate about this. Overclaiming
  would put him in front of a question he should not have to answer.

## Known issues

- **Training 79 / Normal 51 / Hard 19 are OBSOLETE.** They date from **6 July 2026** and
  predate organs, resident macrophages, crisis events, rare events, malaria staging, worms,
  toxins, antivenom, Pathogen X, memory and vaccines, lymphatic hops, hard-mode division and
  production caps. They are a baseline for a **substantially simpler game** — not, as this file
  and `docs/PHASE1_BRIEF.md` §4 previously said, a pre-brain-fix baseline. The brain branch
  change is a minor part of the difference. Never use them as targets, sanity checks or
  comparison points. Details in `docs/FINDINGS.md` #2.

- **The game is NOT broken — but the reference bot is far behind it.** Shantanu and Kartik win
  essentially every game on Normal and roughly 7 in 10 on Hard. `simulate()`'s bot wins 0.2%
  on Normal and 0.0% on Hard. That gap is a **bot-capability signal, not a difficulty signal**:
  the bot never emits 8 of the engine's 27 actions, never moves the Neutrophil (so it can never
  NET), and never repositions a resident macrophage (so all seven are inert). It plays about
  six of the game's fourteen seats. Full audit in `docs/FINDINGS.md` §1. Building a competent
  bot is a **Phase 3** decision, taken there alongside seat-filling AI — the two are the same
  piece of work. **Do not tune the game to the bot's numbers.**

  *Corrected 18 Aug 2026, at the Phase 2 brief review.* This said **Phase 2**. It cannot be:
  the bot is **inlined inside `packages/engine/src/simulate.ts`**, and `simulate()` is compared
  **byte-identically** by the B6 corpus check (`tests/equivalence/src/simulate.test.ts`). So a
  competent bot is an **engine change that necessarily breaks the corpus** — while Phase 2's
  definition of done requires "the engine is unchanged". Re-baselining the project's primary
  oracle during a renderer rewrite is the worst available timing. The 9 coverage arms move with
  it (`docs/COVERAGE_DEFERRED.md`). Record: `docs/PHASE2_BRIEF.md` v1.1 §6, review item A.

- **The vitest trigger has FIRED, deliberately early: vitest is on 4.1.11.** The advisory
  acceptance below survives with one advisory left, and the dev server no longer waits on a
  runner move.

  *Corrected 19 Aug 2026, at P2.2 commit 1.* This block previously said `vitest 2 → 3` becomes
  urgent the moment anything listens on a port, and to upgrade in the same change that introduces
  the server. The upgrade landed **before** the server instead, alone, so a runner break could be
  attributed to the runner — and it broke twice, which is why the landing version is 4 and not 3:
  vitest 2 had never enforced `testTimeout` on synchronous tests (8 tests across 3 suites ran on
  a fictional budget; suite-level budgets now declared at four entry points), and vitest 3.2.7 —
  the final 3.x — can fail a run in which every test passed, a false-red its closed line will
  never fix. `docs/FINDINGS.md` #43 and #44.

  **Nothing remains accepted: `pnpm audit` is clean.** The last advisory (esbuild ≤0.24.2 via
  `tools/legacy-harness`'s own pin) was cleared later the same day by ruling — the pin moved to
  ^0.28, and the bump was verified the strong way: `build:single` rebuilt, both artifacts opened
  in a browser and **played** through a full turn including a spread, with zero console errors.
  If an advisory appears in future, the structural acceptance test in `docs/SECURITY_NOTES.md`
  still applies — but note the dev server exists from P2.2 commit 2 onward, so "nothing listens
  on a port" is no longer the automatic answer it was.

- **Stale builds.** `tools/legacy/stale/` contains `index.html` and `spectator.html`, built
  before the Brain fix. They still contain `branch:4` and contradict the current rules.
  Reference only — never build from them, never cite their behaviour.

## Balance targets

**There is no win-rate target, and CI must not gate on one.** A bot win rate pinned at 0.0%
cannot fall, so it is incapable of failing usefully. Human play is the only source of truth
about difficulty, and by that measure the game is already well balanced (see Known issues).

Task E instead establishes a **continuous metric panel that detects ENGINE CHANGE, not
difficulty** — `avgTurnsSurvived`, `trunkKillPct`, `avgAntibodiesMade`, `avgOrgansDamaged`.
Measured bands live in `tests/balance/bands.json`; the rule is:

> Compare the **mean of one arm** of 20 × 100 games against the band. **FAIL when two or more
> metrics are past ±3 sd(arm), OR when any one is past ±6 sd(arm).** `sd(arm)` is **measured
> from 24 independent arms** — never recomputed as `sd(batch)/√batches` — and is **never allowed
> below `sd(one game)/√gamesPerArm`**, the analytic floor a mean of that many independent games
> cannot go under. `trunkKillPct` is a ratio of sums, not a mean of a per-game value, so it has
> no floor and keeps its measured sd.

*Corrected 18 Aug 2026, at Task F0.* This said **8** independent arms, and said nothing about a
floor. Both mattered: the 8-arm bands sat at **0.72× their analytic floor** on Normal, so every σ
the panel printed was inflated by ~28% and an *unchanged* engine came back at 2.6σ and 2.7σ against
a two-past-3σ rule. Widening to 24 arms helped and was not enough — more arms sharpens an estimate
but cannot reveal spread the sample never contained. **A measured `sd(arm)` below its floor is
proof the calibration under-sampled**, and it is now checked on every calibration
(`tests/balance/README.md`, "The calibration sanity check"). Applying the floor costs no detection
at the shipped arm shape, measured. Full record: `docs/FINDINGS.md` #35.

*Corrected 12 Aug 2026, at Task E2.* This previously said "failing the build only when two or
more breach ±3 sd together", quoting `docs/FINDINGS.md` § "Task E metrics". Built exactly as
written, that gate detected **neither an Action Point removed from every turn nor the Brain
losing half its integrity**. All three parts — the band, how its width is obtained, and the
failure rule — were corrected by measurement. Full record: `docs/FINDINGS.md` #34, and #33 for
the seed-independence defect found alongside it.

**The panel does not fail on brain `branch:3 → 4`, and this is pinned as a demonstrated blind
spot** rather than left in prose (`tests/balance/src/metrics-control.test.ts`). It is not blind
to it either — that change moves one metric by 3.2σ — so the accurate statement is the
gate-level one. `docs/FINDINGS.md` #34.4 corrects #17's wording accordingly.

Any win rate that is reported is always **"win rate under the reference bot, vN, at N games
per difficulty"** — never "the win rate". The bot cannot measure difficulty and we do not
pretend otherwise, least of all to funders.

If a measurement ever suggests poor game design, that is a design conversation with Shantanu
and Kartik — it is NOT fixed by adjusting knobs until a number looks familiar. Report what you
measure.
