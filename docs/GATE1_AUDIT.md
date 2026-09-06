# Gate 1 hygiene — the headless audit (6 September 2026)

**What this is.** [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §1's Gate 1 has four items a machine can
check and one it cannot. This is the record of the machine's half, produced by
`pnpm gate1:audit` (`tools/perf/gate1-audit.ts`) against the APP SHELL (`index.html`, the
thing a player installs) on the Vite dev server, at 360 × 780 CSS px and again at 180 × 390,
the layout 200% zoom produces on that phone. Every number below is the instrument's. The two
items that need a finger are listed at the end, for the phone session.

**The instrument, and its controls.** Sixteen screens are driven in a real game: title,
difficulty, the goal dialog, the play screen in the infection phase, the reveal, the planning
screen with and without the AP terms open, the command screen with nothing, the B-Cell and the
Neutrophil selected, the antibody family detail, the cell card, the inspect sheet where the
piece stands with something, the pause sheet, a spread frame, the next turn, and the Result
screen (an idle Training game is lost within a handful of turns). On each, the audit measures
every visible control outside the SVG board (the board is coarse pointing by ruling; the
inspect sheet is its precise surface, P2.5 piece 1), every visible text run outside the board
against the first opaque background behind it (WCAG 1.4.3: 4.5:1, or 3:1 for large text), and
every control's full border against the surface behind it (1.4.11: 3:1; a top-only border is a
divider and is not a component boundary). **Before any screen is measured, four planted
defects must be flagged or the run stops:** a 20 px button, #999 text on white (2.85:1), a #eee
border on white, and a 600 px block at a 180 px viewport; a fifth control confirms a fresh
fetch fails with the network cut. All five fired on every run.

## Fixed by the audit before the numbers below were taken

The first run found 62 text-contrast and 93 non-text findings, all from six colours, and two
layout faults at 200%:

| Finding | Where | Was | Now |
|---|---|---|---|
| muted text on the pink bar | every muted line in the command bar, `#7C6A61` on `#FBEAE5` | 4.40:1 | `#78665D`, 4.67:1 (5.3:1 on paper). The board's own print ink stays `#7C6A61`: it is the physical board's, it measures 5.05:1 on paper, and the SVG is not this instrument's |
| greyed action rows, text | the rows a player taps for their reason, `#9A8C84` on `#F6F1EC` | 2.90:1 | `#7A6C64`, 4.50:1 |
| greyed action rows, border | the same rows, `#C8B8AE` on pink | 1.65:1 | `#94847A`, 3.08:1 |
| piece chips and the Back button, border | `#C8877B` on white | 2.91:1 | `#C48377`, 3.06:1 |
| the selected chip's ring | `#e80` on white | 2.57:1 | `#DE7800`, 3.09:1 |
| the reveal dialog at 200% | content-box padding pushed it 8 px past a 180 px viewport | overflow | border-box sizing at 92vw |
| the piece grid at 200% | three fixed columns clipped every name to one letter | clipped | `auto-fill, minmax(110px, 1fr)`, chip padding 4px: three columns at 360 px, one at 180 px, nothing clipped |

## The numbers (final run, after the fixes)

| Check | Measured | Findings |
|---|---|---|
| Touch targets ≥ 44 × 44 | 327 controls across 16 screens | **0** |
| Text contrast (4.5:1, 3:1 large) | 838 text runs | **0** |
| Non-text contrast (3:1, control boundaries) | 327 controls | **0** |
| 200% layout (180 × 390): horizontal overflow, controls off-screen, text clipped | 16 screens | **0** after four fixes found across six runs (the fourth: the planning row's depth label could not shrink and a long place text pushed it 6 px past the viewport, caught only once the instrument was taught to name the outermost element past the edge; the row now wraps): the dialog's box sizing; the piece grid and chip padding (the last clip, "Alveolar macrophage" by 3 px, went with the padding); and `overflow-wrap: anywhere` on the dialog, because one run drew a crisis whose single word at 16px bold ("Immunosuppression") was wider than a 180 px dialog and pushed the page 8 px past the viewport. Content-dependent findings like that are why the audit walks a real game rather than fixtures |
| Offline | one turn with the network cut; then a reload | **NOT MET**, see below |

What the instrument does not reach: text inside the SVG board (the print ink, 5.05:1 on paper
by the same formula) and the art, whose contrast is the pipeline's measured value per asset
([`ASSETS.md`](ASSETS.md)); the phone's own rendering of Nunito and its fallback stack.

## Offline — measured, NOT met by the web build, and a decision for Shantanu

The audit loads the app, cuts the network, and plays a turn: the game runs (the engine and the
session are in the bundle already loaded) but **every lazily fetched asset fails**: the 20
board and panel images requested on first use, the anatomy frame, the Nunito font, 23 distinct
URLs, 14 of 14 images broken on the command screen. Then a reload with no network: **the page
loads from the browser's cache but the app does not render.** So the web build is not offline
today, in either sense the gate means.

Why, and the two halves of the fix. A Vite SPA has no service worker, so nothing is cached on
purpose. (1) **A service worker with a precache manifest** (`vite-plugin-pwa`, `generateSW`,
`registerType: 'autoUpdate'`) precaches the bundle, the art and the font at first visit; after
that the app loads and plays with no network at all, and the reload works. It is the standard
answer and a bounded change, but it is a new build dependency with caching semantics (a stale
worker serving an old build until the next visit) and it needs the production build to test,
not the dev server. (2) **The Capacitor build (Phase 4) bundles every asset inside the app**,
so the native app is offline by construction, without a worker. The gate says "works offline,
fully, with no network at all" of the app; the web build is what P2.5 ships and what the
newcomer test runs on. **Not built here: it is a build-and-caching decision, not a component**,
the same class as the command tap's fix. Recommendation: (1), on the production build, with
this audit's offline check pointed at `vite preview`; one dependency and one config block, and
the web build becomes honest before Phase 4 makes the native one so.

## For the phone session (the two items only a finger can settle)

- **Text at 200%.** The phone's own text size at its largest, or the browser's zoom at 200%:
  every screen scrolls vertically only, every control is reachable, no name is clipped. If
  anything overlaps or is cut, name the screen.
- **Offline.** Airplane mode after the app is loaded: play a turn. Expected TODAY: the board's
  icons and the panels' art are missing and the font falls back; the game itself continues.
  That is the measured state, not a pass, and it is what the decision above changes. A fresh
  launch in airplane mode is expected to fail until the service worker exists.

Contrast and touch targets need no finger: the numbers above are the whole check for the
surfaces the instrument reaches, and the art's contrast is the pipeline's measured value.
