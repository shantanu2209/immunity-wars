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

## Game content — ⚠️ NOT YET LICENSED FOR REDISTRIBUTION

**Status: PENDING an assets-provenance check. No licence is granted at this time.**

This covers the board artwork, card designs, organ and cell illustrations, the rulebook,
and the study materials — everything that makes up the game as a played object, as opposed
to the software that runs it.

### Why there is no licence here yet

We intend to release the game content under **CC BY-SA 4.0**, so that any school or teacher
can print, translate and adapt it freely. That is the whole point of the project.

Before we can do that, we have to confirm one thing: **some of the artwork was generated
with an AI image tool, and we have not yet verified that that tool's terms of service permit
us to redistribute its output under CC BY-SA 4.0.**

This matters because a Creative Commons licence is **irrevocable**. Once granted, it cannot
be withdrawn from anyone who has already received a copy. Declaring CC BY-SA 4.0 before the
check is complete would mean granting rights we may not hold — and we would have no way to
take it back. So the honest position, until the check is done, is to grant nothing.

### What this means for you right now

- **Reading, studying and running this repository:** fine, no restrictions beyond Apache 2.0.
- **Redistributing the game content, artwork or rulebook:** please don't, yet.
- **Using the game in a classroom:** this is exactly what it is for, and it is what the licence
  check is meant to unblock. If you want to use it before then, open an issue and ask —
  the answer is very likely yes, we would just rather say so explicitly than by silence.

### What has to happen to resolve this

1. Record, in [docs/ASSETS.md](docs/ASSETS.md), which tool generated which asset and when.
2. Read that tool's terms of service as they stood at the time of generation, on the
   question of commercial use and redistribution under an open licence.
3. Either declare CC BY-SA 4.0 here, or regenerate/replace the affected assets with ones
   whose provenance is unambiguous, and then declare it.

Until step 3 is complete, this section stays as it is.

---

## Game design credit

The game — its rules, its immunology, the board, the cards, and the balance of roles — was
designed by **Kartik Chaudhary**. That authorship is independent of how the code or the
artwork is licensed, and is not altered by anything in this document. See the
[README credits](README.md#credits).

---

## Third-party dependencies

Build and runtime dependencies are listed in the `package.json` files throughout this
repository and carry their own licences. None are vendored into this repository; they are
fetched by the package manager at install time.
