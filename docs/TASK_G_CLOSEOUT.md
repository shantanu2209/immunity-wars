# Task G — closeout

**The single-file harness: the ported TypeScript engine driving the original `v2_ui.html`,
built to one self-contained HTML file that plays by double-clicking.**

Human acceptance met 18 August 2026 — Shantanu played a full game on Normal in the ported build
and reported it works. The scripted 12-step comparison was **descoped by him**; §4 records that
decision and what it costs, because it is the part of this closeout most likely to be misread
later.

---

## 1. What was delivered

| | |
|---|---|
| `tools/legacy-harness/seam-lib.ts` | The demand surface, measured once and shared by every step |
| `seam.ts` | Step 1 report — which names the UI reads from the injected engine |
| `drift.ts` | Step 2 — value drift across the seam, 4 legs, 4 controls |
| `shim.ts` + `shim.test.ts` | Step 3 — the rename layer, 49 bindings, asserted against the measurement |
| `frames.ts` | Step 4 — frame-burst comparison, legacy vs port, 5 controls |
| `build.ts` | Step 5 — the bundle, and the legacy-engine reference window |
| `legacy-absent.ts` + `controls.ts` | Step 6 — the two "is this really the new engine" mechanisms, 5 controls |
| `protocol.ts` → [`TASK_G_PROTOCOL.md`](TASK_G_PROTOCOL.md) | Step 7 — the comparison protocol, generated |

`pnpm build:single` emits **two** files:

```
tools/legacy-harness/dist/immunity-wars-harness.html            1,178 KB   ported engine, GREEN badge
tools/legacy-harness/dist/immunity-wars-REFERENCE-legacy-engine.html  546 KB   legacy engine, RED badge
```

Both are built from the same `v2_ui.html` and the same `art_data.js`. **The engine is the only
difference between them**, which is what makes a side-by-side observation attributable to anything
at all.

---

## 2. What the harness PROVES

| Claim | Evidence |
|---|---|
| The UI's real demand surface is known | 49 names measured from the AST, not assumed — and it is **not** the 67-export contract Task B proved ([`FINDINGS.md`](FINDINGS.md) #39) |
| Every one of those 49 holds legacy's value | Byte for byte **and in key order**, compared against legacy's top-level bindings as injection exposes them |
| The spread animation is identical | 240 games, 2,890 `endCommand` bursts, **13,338 frames** — every `frames.length`, every `frame.view`, every `frame.dice` |
| The bundle cannot be running legacy | None of 1,123 distinctive legacy lines appear in it; the reference window contains 1,120 of them |
| The artifact is genuinely self-contained | No external `src`/`href`, no `fetch`/XHR/`importScripts`. Art is already base64 data URIs |
| **The artifact is playable** | **A full game on Normal, played by Shantanu, 18 Aug 2026** |

**Fourteen negative controls**, every one required to redden *exactly* the assertion it targets
rather than merely to go red ([`FINDINGS.md`](FINDINGS.md) #32). The one that matters most is the
legacy-absent check, and `legacy-absent.ts` says plainly why: its fingerprints are everything in
legacy that a legitimate build does not contain, so **a clean build passes by construction** and
the controls are the entire source of its credibility.

---

## 3. What the harness does NOT prove

This section matters more than §2.

| Not proven | Why | Mitigated by |
|---|---|---|
| **That the port and legacy render identically** | Never compared visually, by anything. The frame check proves the *data* driving the animation is identical; it says nothing about pixels | Nothing. §4 |
| **Anything about the UI's own code** | `v2_ui.html` is embedded unchanged and untested. It is Phase 2's rewrite target | Phase 2 |
| **Performance** | The port is a different code path. Nothing here timed anything, on any device | Phase 2's WebView spike |
| **Anything on mobile** | The requirement is double-click on the Windows PC ([`TASK_G_PLAN.md`](TASK_G_PLAN.md) §1). No mobile browser was opened | Phase 2 |
| **That the 49 names stay correct** | `shim.test.ts` pins the list against the measurement, but the measurement is of *today's* `v2_ui.html` | The test fails if either side moves |
| **That the protocol's 12-step sequence reproduces** | It was generated and agreed by both engines, and then **never executed by a human** | §4 — descoped |
| **Multiplayer, in the harness** | The harness is single-player, like everything else in Phase 1 | Phase 3 |

**The build stamp is a claim, not a proof.** It says "PORTED ENGINE" because the build wrote that
string. What makes it trustworthy is the legacy-absent check standing behind it, and what makes
*that* trustworthy is the controls. A reader who takes the badge on its own has taken the weakest
link in the chain.

---

## 4. The scripted comparison was DESCOPED — by Shantanu, 18 August 2026

[`TASK_G_PLAN.md`](TASK_G_PLAN.md) §3 step 7 specified a scripted side-by-side comparison: a fixed
seed, ~10 actions, the expected board state after each, run in two windows. **It was not
performed.** The decision is his and the reasoning is recorded here in his terms:

> The automated evidence is strong enough: 6,000 corpus games, 13,338 identical frames, legacy
> provably absent, property suite green. The marginal value of me clicking through scripted actions
> is low, and if something surfaces in Phase 2 we fix it then.

Two things pushed it over: the automated frame and state equivalence made it **redundant**, and the
protocol generator's own defect rate (§5) made it **expensive** — the seeding snippet failed on
first use, which is four defects in one instrument.

**Acceptance was reduced to: does the artifact work at all.** Shantanu opened the green-badge build
and played a full game on Normal. It exercised draw, command, spread, organ damage and end-of-game
in the real artifact, judged by someone who knows how the game should play.

### What that means we did NOT verify

Stated plainly, because a closeout that reports the descope without its cost is worse than one that
does not mention it:

1. **No two-window comparison was ever run.** Legacy and port have never been observed side by side
   by anyone. Every equivalence claim in §2 is machine-made, at the level of engine data.
2. **No expected-state checkpoint was ever confirmed by eye.** The protocol's twelve tables were
   generated and cross-checked between engines; no human has confirmed a single one against a
   running board.
3. **Rendering is unverified in both directions.** The frame check licenses the sentence "a visual
   difference is a rendering artefact" — but *no visual difference was looked for*, so the sentence
   has not been used. If the port's data drives the legacy renderer into a different-looking
   result, nothing here would know.
4. **A full game is one seed's worth of paths.** It is strong evidence of *playability* and weak
   evidence of *coverage*: one game touches a small fraction of 27 actions and 106 diseases.

### Why this is nonetheless a defensible close

The claim Task G is required to support is the brief's:

> the single-file harness plays identically to today, opened by double-clicking — no server, no
> toolchain.

The "no server, no toolchain, double-click" half is **verified directly**. The "identically" half
is verified **at the engine level, exhaustively** — 13,338 frames and ~6,000 corpus games — and
**not at all at the rendering level**. A full game played by the game's own co-designer is better
evidence of playability than twelve scripted actions would have been, and worse evidence of
step-by-step equivalence. Both halves of that sentence are true and the second one should travel
with the first.

**Anyone citing Task G to a funder or a judge should say "the ported engine drives the original UI
and the game plays correctly", not "the app was proven identical".**

---

## 5. Four defects in the protocol generator — the pattern is the finding

The step 7 generator produced, in sequence, four wrong outputs. Individually they are careless;
together they are the finding, and it is the same one this project keeps meeting.

| # | Defect | What it produced |
|---|---|---|
| 1 | `newGame` takes a **config object**, not a difficulty string | Every game ran at the default difficulty while the report claimed three |
| 2 | Organs carry **`hp`**, not `integrity` | `heart undefined` in twelve tables — **and** organ damage became undetectable, because a NaN comparison is false, so the checklist reported "not reached" |
| 3 | Log entries are **`{t,msg,kind}`**, not strings | Every expected log line read `[object Object]` |
| 4 | The seeding snippet reached for `lab` and `newG` from console scope | `TypeError: "" is not a function` — a message naming neither. **Broke on first use by the human it was written for** |

> **None of the four crashed. All four produced a confident, well-formatted, wrong answer.**

That is the shape behind [`FINDINGS.md`](FINDINGS.md) #24, #28, #30 and #38, and behind the C5b
lesson in [`CLAUDE.md`](../CLAUDE.md). It recurs here because a *generator* has the same weakness as
a *test*: nothing downstream disagrees with it. The equivalence corpus has an oracle — legacy. The
protocol generator had none, so its output looked authoritative at exactly the moments it was
wrong.

**Three of the four were caught by an instrument, not by reading.** #1 by `tsc`, #2 and #3 by
looking at the emitted document. **#4 was caught by the user**, which is the one that should not
have happened: the snippet was the single line of generated output that no check ever executed.

**The response, in the standing idiom:**

- #2 now **throws** rather than emit `undefined` — a silent `undefined` is what made it invisible.
- #4 is rewritten to depend on nothing it cannot verify: `typeof x !== 'undefined'` is the only form
  that cannot throw on an undeclared identifier, the seeding always happens, and if `newG` is out of
  reach it says so and points at the difficulty button, which runs the same calls from page scope.
  **Both paths are exercised in a jsdom harness** — the real artifact, and a blank page with neither
  global present — because a fallback that has never run is not known to work.

**The original failure was never reproduced.** The old snippet, run against the real built artifact
under jsdom, seeds and starts a game cleanly. So the fix does not claim to have found the cause; it
removes the dependency that could produce one. That distinction is stated in `protocol.ts` at the
snippet itself, so nobody later reads it as a diagnosis.

**The generalisable rule, for Phase 2:**

> **A generator with no oracle is a test that regenerates its own answer.** If its output is going
> to be handed to a human as an instruction, at least one line of that output must be executed by a
> machine first.

---

## 6. Departures from the plan and the brief, all measured

| Where | Said | Actually |
|---|---|---|
| `PHASE1_BRIEF.md` §5 | Use `vite-plugin-singlefile` | **Not used.** It inlines a Vite build's assets into a Vite HTML entry; there is no Vite HTML entry here, and `packages/app` stays empty by the brief's own instruction. One esbuild call to an IIFE instead; the property the plugin was named for is asserted on the artifact |
| `TASK_G_PLAN.md` §3 step 2 | The i18n catalogues are the drift risk | **They cannot be.** Nothing renders them — the catalogue's own `$meta` says so. Rebuilt around the surface that actually changes hands |
| `TASK_G_PLAN.md` §2 correction 2 | "the corpus would never catch it, because it compares end states" | **Not what the corpus does.** `rig.ts` hashes `applyAction`'s full result, deeply; for `endCommand` that result *is* the frames array with a `viewState` per frame. The corpus has compared bursts all along. Step 4 still earns its place — it isolates the burst and checks the frame *shape*, which nothing else does |
| `TASK_G_PLAN.md` §3 step 7 | "~10 actions" **and** "an organ taking damage" | **Incompatible**, measured over 400 seeds — an organ cannot be reached in ten actions. Scripted section stays at 12; one continuation block reaches lungs damage at step 72 |
| — | — | **`newG()` uses `science:true`; the rig uses `science:false`.** The harness runs a configuration the corpus never has. The flag is inert in both engines — measured by running the whole frame comparison both ways |

`seam.ts` was also corrected: it judged coverage against the engine alone and so reported red
against a harness that works — the [`FINDINGS.md`](FINDINGS.md) #38 permanently-red-instrument
shape. It now asks whether the *shim* binds the name.

---

## 7. What Phase 2 inherits

| Thing | Why it matters there |
|---|---|
| **[`FINDINGS.md`](FINDINGS.md) #39 — the 153-name surface** | The React UI will read whatever it reads. The 67-export contract is not a specification of the engine's real surface, and Phase 2 should not treat it as one |
| **`seam-lib.ts`** | The demand surface as a library. Point it at a new UI and it answers the same question |
| **The reference window** | A legacy-engine build of the same UI, on demand. Any "did the port change this?" question in Phase 2 has a control to compare against |
| **The harness itself** | A working end-to-end path from `packages/engine` to a playable page, with the bundling already solved |
| **The rendering gap** | §3 and §4: nothing has ever compared the two engines visually. Phase 2 replaces the renderer, so this is the moment to decide whether that gap is worth closing or is now moot |
| **The generator rule** | §5. Phase 2 will generate more than this one document |

**Not inherited, deliberately:** the scripted protocol. It exists and is regenerable
(`npx tsx tools/legacy-harness/protocol.ts`), but it was written for a comparison that is no longer
planned. If Phase 2 wants a human comparison against legacy, the reference window is the mechanism
and the protocol is a starting point — not a suite to keep green.
