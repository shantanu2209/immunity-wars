# P2.2 / P2.3 closeout — the slice, the runner, and the screening measurement

**Closed 19 August 2026.** Spec: [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v1.4 §2–§4; plan:
[`P2_2_PLAN.md`](P2_2_PLAN.md). `pnpm verify` green; **the engine is unchanged**; the corpus is
untouched.

---

## 1. What is proven

| | how |
|---|---|
| The board renders from `geometry.json`, no coordinate hardcoded in `ui` | runtime derivation (`packages/ui/src/board/geometry.ts`); the only authored numbers are radii/strokes/fan-out |
| One component renders authoritative views AND burst frames | `Board` takes a plain `ViewState`; both paths exercised live |
| `burst-tail-authoritative` survives a real consumer | tail assertion in the shell: PASS on every animated burst, 12/12 across three throttle levels |
| Bursts are skippable, in practice | the skip toggle: a 6-frame burst ignored, board lands on the correct authoritative state — the Phase 3 reconnection rehearsal, working two phases early |
| `IndexedDbStorage` works in a real browser | 9/9 first execution; the exercise reruns on every dev-shell load, plus a raw-IDB read outside the exercised path (50 state keys, deck of 96) |
| The screening budget passes at every throttle level | [`P2_3_MEASUREMENT.md`](P2_3_MEASUREMENT.md): at 6×, initial render ~8× headroom, tap ~3×, per-redraw ~30% |
| Not memoising was right | measured, not argued: unmemoised full-tree re-render 22.7ms p50 at 6× |
| The boundary gate sees `.tsx` | extended BEFORE the first component existed, with `boundaries-ui-engine-tsx` firing on a real `.tsx` file (FINDINGS #41's pattern line: a boundary rule is only as wide as its matcher) |
| vitest 4.1.11, audit and peers clean | FINDINGS #43/#44/#45; suite budgets at five entry points, sized against the binding environment |
| The coverage gate reconciled to the v4 provider, target unchanged at 95% | FINDINGS #46 (rule C, ratio cap, 30 demonstrated exclusions); gate at 96.46% |

## 2. What is NOT proven, stated plainly

- **Nothing has been measured on a handset.** The Capacitor ruling is **confirmed by
  screening, not decided**; locked decision #1 is formally open until the 2–3GB pass.
- **Row 3's headroom is a lower bound spent by nobody yet.** ~30% at 6× covers board+spread
  only; the full UI's panels/log/hand/dialogs will spend it. **Re-measure at P2.5 is expected,
  not optional** (recorded in the measurement doc's ruling).
- **The rendering-gap inheritance stands** (brief §5): no one has compared the two engines
  *visually*; the tail assertion compares projections, not pixels.
- **18 named test-debt arms** remain open (FINDINGS #46), plus the bot and multiplayer deferred
  lists Phase 3 inherits.

## 3. What P2.4+ inherits, and what P2.4 actually needs

**P2.4 (art pipeline) starts from a `.gitkeep`.** Its inputs, gathered here so nobody re-derives
them: the spec is brief §5 (trim transparent margins → normalise palette → hit a contrast
target **at least as strict as Gate 1's** — text ≥4.5:1, graphics ≥3:1 — → emit WebP at
1×/2×/3× → write a manifest); provenance (tool, prompt, date) goes in [`ASSETS.md`](ASSETS.md)
**at generation time** because the content-licence question is still open; the raster sources
come from Gemini/ChatGPT as now, and consistency-across-the-set is the risk, not quality.
**The board's hook for output already exists:** content exports `ORGAN_ART` (7 entries,
currently inline SVG path data) and the brief mounts raster art into the SVG via `<image>` —
the pipeline's manifest wants to key on the same organ/cell/pathogen identifiers the content
pack already uses. `Board.tsx` currently draws letters-in-circles; swapping to `<image>` per
token kind is the intended seam.

**P2.5 (full UI)** inherits [`for-P2.5.md`](for-P2.5.md), currently seven entries: token
palette · organ display names · token art · co-located-token stacking · the 560/800ms pacing ·
spread narration (labels vs dice) · entry-label metrics at phone widths. Plus the i18n duty:
the dev shell's text was scaffolding-exempt; the player UI is not, and the hardcoded-string
check with its negative control is still owed by the DoD.

## 4. What I know that the repository would otherwise not say

Written down at the boundary, same as `P2_2_PLAN.md` §2 — several are traps.

- **⚠️ Burst frames render under `flushSync`, and that is INSTRUMENTATION, not style.** The
  busy-time channel's definition depends on it (FINDINGS #48 — the probe raced React's
  scheduler without it). Refactoring it away silently changes what row 3 measures; if P2.5
  restructures the shell, the measurement path moves with it or the numbers stop meaning what
  the doc says.
- **⚠️ `tools/perf/measure.ts` is coupled to the shell by button TEXT and `[data-cell]`
  attributes.** Renaming "Draw" / "Begin command" / "End command" or dropping `data-cell`
  breaks the driver — loudly (it throws), but a session could burn time on why. The same
  driver is intended for the handset pass over remote debugging; keep it working.
- **⚠️ The in-app browser pane does NOT composite** (screenshots time out, `requestAnimationFrame`
  never fires), so the rAF-anchored metrics cannot be validated there — they read as
  empty/null. The headless driver Chrome composites normally. Do not "fix" metrics.ts because
  the pane shows nothing.
- **Phase gating in the shell:** after `draw`, the phase REMAINS `'infection'` with `g.drawn`
  set — `beginCommand`'s guard is `phase !== 'infection' || !drawn`. The Draw/Begin buttons
  gate on `drawn`, not on a phase named "threat".
- **Token placement semantics** (`geometry.ts#tokenPos`): branch step 0 = the organ tissue
  (`ORGAN_POS`), branch step ≥1 = `BRANCH[organ][step]`; route step <1 = hub. Unknown keys
  resolve to null and the token simply doesn't render — no throw.
- **The IDB exercise must keep rerunning on dev-shell load** — `indexeddb.ts`'s header promises
  it. If P2.5 replaces the shell, move `packages/app/src/idb-exercise.ts`'s invocation, don't
  drop it.
- **`ui`/`app` tsconfigs**: `"jsx": "react-jsx"` with `"types": []` still deliberately empty —
  React's types resolve through imports, not the types array. The `.tsx` globs are in
  `include`/`exclude`; a new file EXTENSION anywhere repeats FINDINGS #41's pattern — check
  dependency-cruiser's `extensions` list and eslint's `files` globs first.
- **`launch.json` has `autoPort: true`** — port 5173 is not guaranteed, and nothing may assume
  it (the measurement doc's repro command takes the URL as an argument for this reason).
- **The perf driver's Chrome path** defaults to the x86 install
  (`C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`), overridable with
  `CHROME_PATH`.
- **Deviation #6** (unknown cell key: port errs, legacy crashes) means malformed-action tests
  can never be both-engine comparisons — port-only assertions, as `queries.test.ts` does it.

## 5. Findings raised across P2.2/P2.3

#43 (fictional timeouts, five entry points) · #44 (the 3.x false-red that made it 2→4) ·
#45 (documented-but-unpractised, now a fast-tier check) · #46 (the v4 reconciliation; target
unchanged) · #47 (two instruments blind in the same place — the NET path) · #48 (a timing probe
measures whatever clock it is attached to) · DEVIATIONS #6 · FINDINGS #41's pattern line.

**Phase 2 continues at P2.4/P2.5.** The measurable artefact exists, measured; the beautiful one
is still deliberately unbuilt.
