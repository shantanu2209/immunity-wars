# Task G — the single-file harness

**Plan approved 19 August 2026, with two corrections from Shantanu recorded below.**
Nothing built yet. This document exists so the plan survives a cleared session.

---

## 0. What G is, and why it is unlike every other Phase 1 task

> `vite-plugin-singlefile` to emit a self-contained HTML build, preserving the double-click-to-play
> test loop that exists today. — [`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §5

**Every other task in Phase 1 is verified by a machine. G is verified by a human, playing the
game.** That changes what should be built: the deliverable is not the harness, it is *Shantanu's
ability to reach a confident verdict*. If he cannot tell whether a difference he notices is a real
regression or a rendering artefact, the task has failed even though the file opened.

The brief resolves its own apparent contradiction — `packages/app` stays empty because the harness
stitches the **new TypeScript engine** into the **legacy `v2_ui.html`**. It is a build tool, not an
application.

### The proposition under test

> **The ported engine, driving the original UI, plays identically to today.**

No automated instrument in this repository can make that claim. The equivalence corpus proves
agreement on *state*, action for action — but `rig.ts`'s `normalise()` round-trips both engines
through JSON before hashing, and the corpus has never rendered a pixel. Everything UI-facing is
outside it.

---

## 1. ⚠️ Correction 1 — the target is a Windows PC, not the iPad

`PHASE1_BRIEF.md` §5 and `CLAUDE.md` both say the single-file build is "how Shantanu tests on
iPad". **That was his own wording, and it hardened a habit into a requirement.** Corrected by him
on 19 Aug 2026:

**Testing happens on the Windows PC**, current Chrome or Edge, opened by double-clicking the file.
It is the better environment and the reasons are worth keeping:

- two browser windows side by side on a large screen, so comparison is direct;
- a developer console, so a JS error is **visible** rather than presenting as "the button did
  nothing";
- the file is already local — no transfer step;
- no `file://` restrictions to design around;
- a rebuild-and-retest loop measured in seconds.

**What the single-file requirement actually protects is unchanged and still non-negotiable:**

> **Double-click to play. No server, no dev command, no toolchain.**

Mobile testing belongs in Phase 2, where there is a mobile UI worth testing.

**Consequence for the design:** the comparison protocol is built for two side-by-side windows.

---

## 2. ⚠️ Correction 2 — frame-for-frame animation is checked automatically, not by eye

The original plan asked whether frame-for-frame animation matching was in scope. **It is in scope,
and it is not Shantanu's job.**

`endCommand` does not return a state — it returns a `Frame[]`, and **each frame carries a full
`viewState`** (`resolveSpread` has 20 `snap()` sites; [`FINDINGS.md`](FINDINGS.md) #31). The legacy
UI animates that burst. If the port's frame sequence differs in count, order or content, the spread
will *look* different even though the final state agrees — and the corpus would never catch it,
because it compares end states.

**So the frames are compared automatically, before he opens anything:** `frames.length` and every
frame's `viewState`, legacy against port, across the corpus.

> **If that check is green, any visual difference he notices is a RENDERING artefact rather than an
> engine one — and he knows which kind of thing he is looking at.**

That converts a judgement call into a measurement and leaves him judging only what a human can
judge. **If the frame comparison finds a real difference: stop and report. That is a finding, not
an obstacle to work around.**

---

## 3. The steps, in order

### Step 1 — measure the seam (REPORT BEFORE BUILDING)

`v2_ui.html` calls the legacy engine through a set of globals. Establish, **by measurement rather
than assumption**:

- the exact list of engine globals the UI reads;
- whether the port's 67 exports cover every one;
- for each, whether exposing it is a **rename** or something more.

**This decides whether G is a day or a week.** Report before writing any shim.

> **Anything needing more than a rename is a FINDING and goes to Shantanu before it is worked
> around.** A shim that quietly reimplements engine behaviour to make the UI happy would put logic
> outside `packages/engine`, which `CLAUDE.md` forbids, and would do it in the one file nobody
> would think to audit.

### Step 2 — static string-drift check (BEFORE he opens anything)

Task C extracted every player-visible string into i18n catalogues, but `v2_ui.html` holds its own
copies. If they have drifted, he will see wrong text **and it will look like an engine bug**.
Checked statically, because a wasted session is expensive and this costs minutes.

### Step 3 — the shim

A thin adapter exposing the port's ESM exports under the globals the UI expects. **No logic** — a
rename layer.

### Step 4 — the frame-burst comparison

Per correction 2. Legacy vs port, `frames.length` and every frame's `viewState`, across the corpus.
Green before he is asked to look at anything.

### Step 5 — the bundle

Vite + `vite-plugin-singlefile` → one HTML file. No external requests. Opens from a double-click.

### Step 6 — prove it is actually the new engine

**This is the most important part of G**, and Shantanu named it as such.

> A build that silently fell back to the legacy engine would pass his test perfectly and prove
> nothing. That is the C5b shape exactly, and **he would have no way to detect it from the
> browser.**

Two mechanisms, and both get negative controls:

1. **A visible build stamp** in the page naming the engine and the commit it was built from.
2. **An automated check that the legacy engine source is absent from the bundle**, so the harness
   is structurally incapable of running legacy.

**Negative-control both: construct a build that DOES contain legacy, and confirm the check fires.**
A check that has never failed is not known to work — and this is the one check standing between a
convincing demonstration and a worthless one.

### Step 7 — the comparison protocol

Not "play it and see". **He is the instrument, so the protocol is specified as carefully as any
other instrument here.** A short scripted comparison for two side-by-side windows:

- a fixed seed;
- a written list of ~10 actions;
- the expected board state after each;
- the same script against today's build in the other window;
- **specific things to look at**: AP counts, invader positions, the log text, an organ taking
  damage, a spread animation running to completion.

"Play it and see" would make him responsible for a judgement without giving him the means to make
it.

---

## 4. Risks, stated before starting

| risk | why it matters | handled by |
|---|---|---|
| **The 20-snapshot spread burst** | most likely place for a real difference AND for a false alarm | step 4, automatically |
| **Pre-i18n string drift** | wrong text reads as an engine bug and wastes a session | step 2, statically |
| **Silent fallback to legacy** | a perfect-looking pass that proves nothing | step 6, with both controls |
| **The seam needs more than renames** | logic would end up outside `packages/engine` | step 1, reported before any workaround |

---

## 5. What "done" means

- One HTML file, opened by double-clicking on the Windows PC, no toolchain.
- The build stamp names the ported engine and its commit, and the legacy-absent check passes —
  both negative-controlled.
- The frame-burst comparison is green across the corpus, so any visual difference is known to be a
  rendering artefact.
- The string-drift check is green.
- Shantanu runs the scripted comparison in two windows and reaches a verdict he can defend.
