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

`engine` may import `content` types only. CI fails on any other cross-import.

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

- **Simulate before building.** Validate a design in a standalone model before touching
  production code. Never commit on an unvalidated design assumption.
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

- **Balance baseline is UNVALIDATED.** The Brain branch was shortened from 4 steps to 3 on
  ~27 July 2026, in both the physical board and `v2_engine.js`. This is a rule change, not a
  cosmetic one: the Brain went from hardest-to-reach organ to as reachable as the others, and
  it has only 2 integrity. There is no record that the balance simulation was re-run afterwards.
  **The historical figures (Training 79 / Normal 51 / Hard 19) therefore describe a game that no
  longer exists.** Treat them as history, not as targets. Measure the real numbers in Task E.

- **Stale builds.** `tools/legacy/stale/` contains `index.html` and `spectator.html`, built
  before the Brain fix. They still contain `branch:4` and contradict the current rules.
  Reference only — never build from them, never cite their behaviour.

## Balance targets

**Not yet established.** Task E measures the current win rates for Training / Normal / Hard.
CI tolerance bands are set from that measurement, never from the historical figures above.

If the measured numbers turn out to be poor game design, that is a design conversation with
Shantanu and Kartik — it is NOT fixed by adjusting knobs until a number looks familiar.
Report what you measure.
