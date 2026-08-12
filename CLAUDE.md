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

**Current phase: Phase 1.** Spec: @docs/PHASE1_BRIEF.md

**This is a public repository.** Do not commit personal details of either contributor beyond
what is in the README credits — no school, no address, no contact details, no photographs.
No API keys or secrets, ever.

## Hard rules

- **Scientific accuracy is non-negotiable.** Every mechanic must be defensible to a scientist.
  If a change would make the biology wrong, stop and say so — do not ship it and flag it later.
- **Rules live in `packages/engine/` and nowhere else.** No game logic in UI, server, or content.
- **Physical/digital parity.** The printed board and the app must agree. Board geometry has one
  source: `packages/content/board/geometry.json`. Never hardcode coordinates elsewhere.
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
pnpm build:single     # self-contained HTML harness — Shantanu tests this on iPad
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
- Every game state and network message carries `rulesVersion`.
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
  bot is a **Phase 2** decision — it is dual-use, since online play needs AI to fill dropped
  seats. **Do not tune the game to the bot's numbers.**

- **Stale builds.** `tools/legacy/stale/` contains `index.html` and `spectator.html`, built
  before the Brain fix. They still contain `branch:4` and contradict the current rules.
  Reference only — never build from them, never cite their behaviour.

## Balance targets

**There is no win-rate target, and CI must not gate on one.** A bot win rate pinned at 0.0%
cannot fall, so it is incapable of failing usefully. Human play is the only source of truth
about difficulty, and by that measure the game is already well balanced (see Known issues).

Task E instead establishes a **continuous metric panel that detects ENGINE CHANGE, not
difficulty** — `avgTurnsSurvived`, `trunkKillPct`, `avgAntibodiesMade`, `avgOrgansDamaged`,
each measured with its cross-seed noise band, failing the build only when two or more breach
±3 sd together. Candidates, measured variance and rationale in `docs/FINDINGS.md`
§ "Task E metrics".

Any win rate that is reported is always **"win rate under the reference bot, vN, at N games
per difficulty"** — never "the win rate". The bot cannot measure difficulty and we do not
pretend otherwise, least of all to funders.

If a measurement ever suggests poor game design, that is a design conversation with Shantanu
and Kartik — it is NOT fixed by adjusting knobs until a number looks familiar. Report what you
measure.
