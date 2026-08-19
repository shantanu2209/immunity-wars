# The Immunity Wars

[![CI](https://github.com/shantanu2209/immunity-wars/actions/workflows/ci.yml/badge.svg)](https://github.com/shantanu2209/immunity-wars/actions/workflows/ci.yml)
[![Nightly](https://github.com/shantanu2209/immunity-wars/actions/workflows/nightly.yml/badge.svg)](https://github.com/shantanu2209/immunity-wars/actions/workflows/nightly.yml)

> The CI badge reflects the **per-push** tier only. What that does and does not prove is
> stated on the [results dashboard](https://shantanu2209.github.io/immunity-wars/), which is
> the honest place to look — a green badge is a smaller claim than it appears.

**A cooperative board game where players are immune cells defending a body against real diseases — and accurate immunology is the winning strategy.**

Seven immune cell types. Six antigen classes. Ninety-six real diseases. Four infection routes
into the body, seven organs to protect, and eighteen turns to survive. Nobody wins alone:
remove any single cell role from the team and the win rate collapses. That structural
interdependence is the point — it is what makes the cooperation genuine rather than asserted.

The game exists as a printed board and as a digital version. This repository is the digital one,
currently being rebuilt as an offline-capable app for web, Android and iOS.

Where this is going: [ROADMAP.md](ROADMAP.md).

---

## Why it exists

Most games that claim to teach science teach a simplified cartoon of it. This one takes the
opposite bet: that the real immunology is *more* interesting than the simplification, and that a
child who learns why an encapsulated bacterium resists being eaten until an antibody tags it has
learned something true and durable.

Every mechanic is grounded in real biology and defensible to a scientist. That is a hard
constraint on the design, not a marketing line — and it is also what makes the game balanced.
When the accurate mechanics were added during development, an exploit that let one cell win
alone collapsed from a 100% win rate to 2%.

The longer aim is reach: a free, printable, offline-capable game in the languages Indian children
actually learn in, so that a school without reliable internet or a budget for materials can still
use it.

---

## Status

Under active development. The playable browser version works; the app rebuild is at **Phase 2**
— the renderer rewrite. Phase 1 (foundations and test infrastructure) is closed. Nothing a player
can see has changed yet: Phase 2's first sub-phase built the seam the new UI will talk through and
the boundary that stops it reaching past. Expect things to move.

### About the security alerts

GitHub's Dependabot page currently shows critical vulnerabilities. **It is one advisory, counted
once per manifest, in test tooling that never runs a server and never reaches a player.**

Every open advisory requires a long-running server accepting requests, and nothing in this
repository starts one — every test command is one-shot and exits. The only third-party runtime
dependency in anything installable is `zod`.

The full reasoning, advisory by advisory, plus the trigger that would make it urgent, is in
[docs/SECURITY_NOTES.md](docs/SECURITY_NOTES.md). It is written to be read by someone who has just
seen the alert count and wants to know whether it means anything.

---

## Credits

**Game design and concept — Kartik Chaudhary.** The rules, the immunology, the board, the cards,
the balance of roles. Every mechanic in this game is his, and every one is grounded in real
biology. He was 13 when this version was built.

**Build direction and project lead — Shantanu Chaudhary.** Architecture decisions, design review,
testing, and the standard that nothing ships unless the science is right.

**Code implementation — written with Claude (Anthropic).** The TypeScript engine, test suites and
application code were generated in collaboration with Claude, under the direction above. Kartik
designed the game; he did not write the source code, and this repository should not be read as
claiming otherwise.

Repository hosted on Shantanu's GitHub account; Kartik does not have one.

---

## Recognition

- 3rd prize, KVRSS Awards
- Presented at the University of Hyderabad grant showcase, August 2026

---

## Licence

Source code is licensed under the **Apache License 2.0** — see [LICENSE](LICENSE).

Game content — board artwork, card designs, rulebook and study materials — is **not yet licensed
for redistribution.** We intend to release it under CC BY-SA 4.0 once we have confirmed that the
terms of the tool used to generate the artwork permit it. Until that check is complete, please
don't redistribute the game content. See [LICENSES.md](LICENSES.md).

If you are a teacher who wants to use this in a classroom: that is exactly what it is for, and
the intent is that you'll be able to, freely, in any language. Finishing the licence check above
is the last step before we can say so formally.
