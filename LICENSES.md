# Licences

This repository contains two different kinds of material with two different licensing
situations. Please read both sections before redistributing anything.

---

## Source code — Apache License 2.0

All source code in this repository is licensed under the **Apache License 2.0**.
The full text is in [LICENSE](LICENSE).

This covers:

- `packages/` — the rules engine, content loaders, protocol, UI and application code
- `tools/` — build tooling, simulation harnesses and the legacy reference sources
- `tests/` — all test suites
- Configuration files, CI workflows and build scripts

You may use, modify and redistribute the code, including commercially, provided you
retain the copyright and licence notices. See the LICENSE file for the exact terms.

Copyright 2026 Shantanu Chaudhary.

---

## Game content — all rights reserved, by decision

**Status: DECIDED, 20 August 2026. No content licence is declared, and none is pending.**

This covers the board artwork, card designs, organ and cell illustrations, the rulebook,
and the study materials — everything that makes up the game as a played object, as opposed
to the software that runs it.

**The game's documents are in the repository under this same status** (decided 5 September
2026): `docs/Immunity_Wars_Rulebook_v3_1.docx`, `docs/Immunity_Wars_Quick_Reference_v3.docx`
and `docs/Immunity_Wars_Study_Packet_v3_1.docx` are Kartik's design work, committed so that
his rulings on the rules are durable rather than living on one machine, and **all rights
reserved** like the rest of the content. They were kept out of git while the content licence
was pending; that reason expired with the decision above.

### Why there is no licence, and why that is the answer rather than a delay

The artwork was generated with Google Flow, and the provenance check was completed on
20 August 2026 ([docs/ASSETS.md](docs/ASSETS.md) has the full register). What it found:

- **Google is not the obstacle.** Google does not claim ownership of Flow output, and
  commercial use is permitted. If the question were "may we use this art", the answer is yes.
- **The question a licence actually turns on is different:** "Google does not claim
  ownership" is not the same as "we hold a copyright we can license to others." A Creative
  Commons licence works by granting rights *we hold* — and whether AI-generated images are
  copyrightable at all is legally unsettled.

Rather than resolve an unsettled legal question ourselves, we sidestep it: **no content
licence is declared.** Teachers and schools using the app are unaffected. The only thing
this forecloses is third-party redistribution of modified artwork — which nobody has asked
for. If that ever becomes a real need, it can be revisited, and it would be a question for
a lawyer, not for us.

### What this means for you

- **Reading, studying and running this repository:** fine, no restrictions beyond Apache 2.0
  on the code.
- **Using the game in a classroom:** this is exactly what the project is for. Go ahead; if
  you want it in writing for your school, open an issue and ask.
- **Redistributing the game content or artwork, modified or not:** not granted. All rights
  reserved.

---

## Game design credit

The game — its rules, its immunology, the board, the cards, and the balance of roles — was
designed by **Kartik Chaudhary**. That authorship is independent of how the code or the
artwork is licensed, and is not altered by anything in this document. See the
[README credits](README.md#credits).

---

## Third-party dependencies

Build and runtime dependencies are listed in the `package.json` files throughout this
repository and carry their own licences. They are fetched by the package manager at install
time. One asset is vendored deliberately: the **Nunito** font
(`packages/app/public/fonts/`), bundled so the app works fully offline, under the SIL Open
Font License 1.1 — the licence text is committed beside it as `OFL.txt`.
