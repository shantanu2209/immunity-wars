# Phase 2 — inputs

**Not a plan. Not decisions.** The things Phase 1 measured that Phase 2 planning needs in front of
it. Shantanu writes the brief; this is the material it should be written against.

Written 18 August 2026, at the close of Phase 1.
Fuller detail: [`PHASE1_CLOSEOUT.md`](PHASE1_CLOSEOUT.md), [`SEAM_DECISIONS.md`](SEAM_DECISIONS.md),
[`FINDINGS.md`](FINDINGS.md).

---

## 1. The three seams, and who consumes each

Five of the brief's eight were declined with reasons — [`SEAM_DECISIONS.md`](SEAM_DECISIONS.md).
A seam with no consumer is the thing Phase 1 kept finding: code nobody exercises is code nobody
knows is wrong.

| Seam | Consumer | Note |
|---|---|---|
| **1 `Session`** | Every UI interaction, from the first one | **Build before any UI code.** A UI written against `applyAction` is the fork the brief warns about |
| **3 `PlayerRef`** | `Session.sendAction` — `applyAction` already reads `a.pid` | Built for the *type*: an opaque branded string means "no PII" is compiler-enforced. Users are minors; DPDP treats them as children |
| **8a `Storage`** | Save and resume | Round-trip already asserted: `viewState` survives JSON unchanged |

**The load-bearing half of seam 1 is not the interface.** It is a dependency-cruiser rule that `ui`
and `app` may never import `engine`, with a negative control proving it fires. `v2_ui.html` read 49
engine names when only 44 were in the proved contract, and nothing ever failed
([`FINDINGS.md`](FINDINGS.md) #39). An interface nobody is forced to use is a convention.

Three shape constraints, all measured:

- `applyAction(g, a)` **mutates in place** and returns only `{ok}`/`{ok,error}`. Session owns state; hands out `viewState`.
- `endCommand` returns a **`Frame[]`**, up to 9 frames each carrying a full `viewState` (#31). One callback cannot express that — the subscription needs an authoritative `view` and a skippable `burst`.
- **`sendAction` must be async even locally**, or `RelaySession` is a rewrite rather than a second implementation.

---

## 2. The non-determinism constraint — what it forecloses

[`FINDINGS.md`](FINDINGS.md) #40. The engine calls global `Math.random()` in six places with **no
injection point**.

**Forecloses:** action broadcast. Two clients applying the same action to the same state diverge on
the first die roll, silently, because both resulting states are internally consistent — no error,
just different boards.

**Does not foreclose:** authoritative-state broadcast. Task E measured that cost (`viewState`
distribution, and `frames.length × stateSize` for the burst) and it is affordable.

**Consequence for Phase 2, not Phase 3:** Session's interface must not assume replayability, and
that has to be true from the first line. `viewState` is the unit of synchronisation, not `Action`.
If action broadcast is ever wanted, the prerequisite is a seeded RNG **inside the engine** — an
engine change, measured against the corpus, not a protocol decision.

---

## 3. The rendering gap — and no, it is not moot

Nothing has ever compared the two engines **visually**. The frame check proves the *data* driving
the animation is identical across 13,338 frames; it says nothing about pixels
([`TASK_G_CLOSEOUT.md`](TASK_G_CLOSEOUT.md) §3–4).

The tempting reading is that replacing the renderer makes this irrelevant. **It does not, and the
reason is worth having explicitly:**

- The gap is not "is the legacy renderer correct". It is **"has anyone confirmed the port drives a
  renderer to the same result"** — and the answer is still no for *any* renderer.
- A new React renderer is a second unverified thing, not a replacement for an unverified thing. The
  legacy UI at least has years of play behind it; the new one will have none.
- **What survives and is genuinely useful:** the legacy-engine reference window
  (`immunity-wars-REFERENCE-legacy-engine.html`). It gives Phase 2 a known-good rendering of any
  game state, on demand, to compare a new component against. That is worth more during a rewrite
  than it was during a port.

So: the gap is inherited, not closed. Whether to close it is a Phase 2 decision, but it should be
made knowingly rather than by assuming the rewrite absorbed it.

---

## 4. The WebView performance spike

The brief's own note: it is **the one measurement that could reopen a locked decision** — whether
Capacitor holds or React Native becomes necessary.

| | |
|---|---|
| **What it decides** | Capacitor vs React Native. Locked decision #1 |
| **What it needs** | A low-end Android device, a renderer worth measuring, and a defined "acceptable" *before* the number exists |
| **What it cannot be answered without** | **A real renderer.** Nothing in Phase 1 timed anything, on any device, so there is no baseline and nothing to extrapolate from |

**The sequencing problem, stated plainly:** the spike needs a renderer, and the renderer is the
expensive thing the spike is meant to de-risk. A thin vertical slice — the SVG board from
`geometry.json`, one animated spread, no game logic — is probably enough to measure, and is far
cheaper than discovering the answer after the full UI exists.

**Define "acceptable" first.** A frame-rate target chosen after seeing the number is not a test.
This is the same failure the balance panel had ([`FINDINGS.md`](FINDINGS.md) #34): a threshold
fitted to the measurement it is supposed to judge.

---

## 5. The string debt

Definition-of-done item 4, **NOT MET**. Only the `engine` namespace exists — 149 messages, pinned
by a drift test.

| | |
|---|---|
| **Safe, cannot drift** | The UI *tables* — `DZINFO` (530 fields), `FACT`, `UM`, `UI_`, `RNAME`, `REGION_LABEL`. Already structured content in `packages/content`, with a test proving they still equal `v2_ui.html` |
| **Nothing at all** | **154 loose prose strings** — button labels, tooltips, modal text |
| **Needs a human call** | **46 strings** that are neither clearly prose nor clearly code. Listed by line in [`STRING_INVENTORY.md`](STRING_INVENTORY.md) §3 |
| **Own job** | The 666-string `diseases` namespace is Kartik's written science and needs a subject-matter translator, not a UI string pass. Split so the Hindi edition can be costed honestly |

**Why this is Phase 2 and not later:** the 154 loose strings live in the file being rewritten. Every
one of them will be retyped into a React component. Extracting them *during* the rewrite is nearly
free; extracting them afterwards means reading the new UI to find them again. The 46 ambiguous ones
need a decision from a person, and that is cheapest while someone is looking at the screen they
appear on.

---

## 6. The vitest trigger

⚠️ **A Vite dev server for the Phase 2 UI collapses the Dependabot acceptance.**

Every open advisory requires a long-running server accepting requests, and nothing in the repository
starts one — every command is one-shot ([`SECURITY_NOTES.md`](SECURITY_NOTES.md)). Phase 2 will want
a dev server. **Upgrade `vitest 2 → 3` in the same change that introduces it.** Not a reason to
avoid a dev server; a reason not to add one alone.

Also open: **TypeScript 6.0.3**, Dependabot PR #2, a major bump deliberately deferred past Task G.

---

## 7. Things a newcomer would not guess

Short list of the traps that cost time in Phase 1 and would cost it again.

- **The reference bot plays ~6 of 14 seats** and never emits 8 of 27 actions. It is not a difficulty
  measurement and must never be quoted as one. Humans win essentially every game on Normal; the bot
  wins 0.2%.
- **Training 79 / Normal 51 / Hard 19 are obsolete** — they describe a substantially simpler game
  from 6 July. Not targets, not sanity checks.
- **`newGame` takes a config object**, and passing a string is silently tolerated by sloppy-mode
  legacy. It cost a wrong measurement in Task G.
- **Organs carry `hp`, not `integrity`** — `integrity` is the content table's field. Reading the
  wrong one yields `undefined`, and NaN comparisons are false, so it fails *silently*.
- **Log entries are `{t, msg, kind}`**, newest first, not strings.
- **`viewState` and raw `GameState` are near-identical**, and the legacy UI used them
  interchangeably. Phase 2 should pick one — `viewState` — and never hand out the other.
- **The metric panel detects engine change, not difficulty**, and brain `branch:3→4` is a pinned,
  demonstrated gate-level blind spot.
- **The content licence is still pending** an assets-provenance check. Do not publish artwork or
  declare a content licence until the AI tool's terms are confirmed ([`ASSETS.md`](ASSETS.md)).

---

## 8. The one thing Phase 2 has that Phase 1 did not

**No objective stopping rule.**

Phase 1's gates were machine-checkable: the corpus agrees or it does not, coverage is above the
threshold or it is not, the property suite finds a violation or it does not. **"The UI looks right"
is not that**, and neither is "it feels fast enough".

Task G is the preview of the problem, at small scale: acceptance came down to one person playing one
game and forming a judgement, and the honest closeout had to say what that did and did not verify.
Phase 2 is that situation for an entire rewrite.

Worth settling **before** any UI code exists, because a stopping rule chosen afterwards is chosen
against work already done — and this project has a documented instance of exactly that failure mode
([`FINDINGS.md`](FINDINGS.md) #34: a band fitted to the measurement it was meant to judge).

Not a decision this file makes. An input.
