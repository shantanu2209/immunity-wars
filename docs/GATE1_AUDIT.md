# Gate 1 hygiene — the headless audit (6 September 2026)

> ⚠️ **Corrected the same evening (FINDINGS #61).** The scaling pass below sets the root font
> size to 200% by an inline style. That models the browser DEFAULT-FONT-SIZE preference
> (desktop Chrome, Firefox), which the `rem` sweep made the app follow; it does not model
> Chrome for Android, whose user-facing setting is PAGE ZOOM (Settings › Accessibility), a zoom
> that scales everything and lays a 360 px phone out at 180 CSS px, which is the pass this
> document's earlier runs used and #60 removed as a proxy. Android's SYSTEM font size reaches
> neither, and that is what the phone session changed. Two mechanisms, two passes: both are to
> be carried, named for what they model. The "0 unscaled" row is true of the
> first mechanism only. The offline row's phone-session confirmation is struck (it tested the
> network); the headless check stands, and offline is checked by hand on the Android build.
>
> **Checked by hand later that day (FINDINGS #61):** Page zoom at 200% on the shipped build,
> Chrome for Android, doubled the text and everything Shantanu checked was still playable.
>
> ✅ **Both passes carried from P2.6's first piece (6 September 2026), each named for its
> mechanism:** FONT200 (the root at 200% on a 360 px page: the default-font-size preference)
> and ZOOM200 (a 180 × 390 CSS px page at a doubled device scale: Chrome for Android's page
> zoom). The same layout auditor runs under both. Every check now has a control both ways.
> The numbers below are from that run.

**What this is.** [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §1's Gate 1 has four items a machine can
check and one it cannot. This is the record of the machine's half, produced by
`pnpm gate1:audit <url>` (`tools/perf/gate1-audit.ts`). The numbers below are from the
SHIPPED WEB BUILD (`pnpm --filter @immunity-wars/app build:web`, served by `preview` on port
4173), not the dev server, because the offline item can only be true of a build with its
service worker. Every number is the instrument's.

**The instrument, and its controls.** Twenty-one screens are driven in a real game on the app
shell: title, Settings from the Title with no save, difficulty, the goal dialog, the play
screen in the infection phase, the reveal, the planning screen with and without the AP terms
open, the command screen with nothing, the inspect sheet, the B-Cell and the Neutrophil
selected, the antibody family detail, the cell card, the pause sheet, Settings over the paused
game, a spread frame, the next turn, then after a quit that keeps the save Settings from the
Title with a save and its delete confirm, and after Continue the Result screen (an idle
Training game is lost within a handful of turns). *The four Settings screens were added in
P2.6 piece 2 (6 September 2026); before it, seventeen.* On each it measures every visible control outside the
SVG board (the board is coarse pointing by ruling; the inspect sheet is its precise surface,
P2.5 piece 1), every visible text run outside the board against the first opaque background
behind it, and every control's full border against the surface behind it. Then the same
seventeen screens twice more, once under each mechanism a person has for text at 200%:
**FONT200**, the same 360 px width with the root font size at 200%, where every text run's
computed size must be at least 1.9× its size at 100%; and **ZOOM200**, a 180 × 390 CSS px
page at a doubled device scale, the layout Chrome for Android's page zoom gives a 360 px
phone, where scaling is given because a zoom scales everything. Under both, the layout must
survive: no horizontal scrolling, every control in the viewport, no text clipped to an
ellipsis. Then the network is cut.

*The inspect sheet, corrected in P2.6's first piece.* This paragraph said "sixteen screens"
and listed "the inspect sheet where the piece stands with something". That sheet has two
doors: the bar's "What's here", offered only when the selected cell stands with something,
which the deck decides — so the first runs reached the sheet by luck and the first two runs of
the rebuilt instrument did not reach it at all, which the screen list in the JSON showed. The
walk now opens it by its other door, a click on an invader token with nothing selected (the
token groups carry a `data-invader` address for the drivers, rendering nothing), so the sheet
is measured on every run; when the deck also offers "What's here", that variant is recorded
under its own name.

**Eighteen controls, nine pairs, run before any screen is measured, or the run stops.** For
every check a planted defect must be flagged (fires) and a planted sound element must not be
(passes) — "forbid X" is half a specification, since a check that forbade everything would
satisfy every fires-control ever aimed at it (ruled for this instrument by Shantanu, 6
September 2026, at the P2.6 kickoff; the rule is P2.1's). Touch: a 20 px button, a 44 px one.
Contrast: #999 on white (2.85:1), #000 on white (21:1). Non-text: a #eee border on white, a
#000 one. Scale, at the root's 200%: a 13 px span, a 0.8125rem span. Layout under the
font-size mechanism at 360 px: a 600 px block, a block that fits. Layout under the page-zoom
mechanism at 180 px: a 600 px block, a block that fits; a control past the viewport edge,
one inside; an ellipsis that clips its text, one whose text fits. Offline: a fetch of a fresh
URL with the network cut must fail, and a fetch of the precached bundle must be served by the
worker (on an origin with no worker that half cannot run, says so, and the offline item
reports not met). **All eighteen fired the right way on the first run of the rebuilt
instrument and on every run since.** *Before P2.6 this read "seven planted defects": every
check had a fires-control and only the scale check had a passes-control.*

## What the audit found, in the order it found it

**Run one (the dev server, 360 px and a 180 px proxy for 200% text):** 62 text-contrast and
93 non-text findings, all from six colours, and two layout faults; fixed, all rendering-only:

| Finding | Where | Was | Now |
|---|---|---|---|
| muted text on the pink bar | every muted line in the command bar, `#7C6A61` on `#FBEAE5` | 4.40:1 | `#78665D`, 4.67:1 (5.3:1 on paper). The board's own print ink stays `#7C6A61`: it is the physical board's and the SVG is not this instrument's |
| greyed action rows, text | the rows a player taps for their reason, `#9A8C84` on `#F6F1EC` | 2.90:1 | `#7A6C64`, 4.50:1 |
| greyed action rows, border | the same rows, `#C8B8AE` on pink | 1.65:1 | `#94847A`, 3.08:1 |
| piece chips and the Back button, border | `#C8877B` on white | 2.91:1 | `#C48377`, 3.06:1 |
| the selected chip's ring | `#e80` on white | 2.57:1 | `#DE7800`, 3.09:1 |
| the reveal dialog at 200% | content-box padding, and a single long word ("Immunosuppression" at 16 px bold) | overflow | border-box at 92vw, `overflow-wrap: anywhere` |
| the piece grid at 200% | three fixed columns clipped every name | clipped | `auto-fill, minmax(7rem, 1fr)`, tighter chip padding: three columns at 360 px, one at 180 px |
| the planning row at 200% | the depth label could not shrink; caught only once the instrument named the outermost element past the edge | 6 px overflow | the row wraps |

**Shantanu's finding on the phone, one hour after that pass reported 200% text green
(FINDINGS #60):** Android's font size at 200% changed nothing on the page. Every font size was
a fixed pixel number, and the 180 px pass had measured a proxy — the layout that doubled text
produces — never whether the text doubled. **Both halves fixed:** all 121 sizes are `rem`
(the board's SVG text stays in board units on purpose: the drawn board at the board's scale,
like the print, with the inspect sheet as its text surface), and the proxy pass is replaced by
the real one described above, with its two scaling controls. The new pass's first run then
found the instrument's own second defect (the title screen measured before the 200% root had
applied, because the app renders from a module script before DOMContentLoaded) and the root is
now set explicitly before the first screen.

## The numbers (the shipped build, the P2.6 piece 2 run, 6 September 2026)

Windows PC, headless Chrome, `vite preview` of `build:web` on port 4173; 21 screens; every
row's width and root font size are the instrument's own readings, recorded per screen in the
JSON. Eighteen controls fired the right way first.

| Check | Mechanism it models | Measured | Findings |
|---|---|---|---|
| Touch targets ≥ 44 × 44 CSS px | — | 369 controls across 21 screens at 360 px | **0** |
| Text contrast (4.5:1, 3:1 large) | — | 936 text runs | **0** |
| Non-text contrast (3:1, control boundaries) | — | 369 controls | **0** |
| **Text scales at 200%** (≥ 1.9× per run) | FONT200: the default-font-size preference | 937 text runs across 21 screens, root 32 px at 360 px | **0** unscaled |
| Layout under FONT200 | the default-font-size preference | 21 screens at 360 px, root 32 px | **0**: no overflow, no control off-screen, nothing clipped |
| **Layout under ZOOM200** | Chrome for Android's page zoom | 21 screens at 180 px, root 16 px, device scale 2 | **0**: no overflow, no control off-screen, nothing clipped |
| **Offline** | — | first visit online, then the network cut | **MET**: service worker active; a turn played with 0 of 14 images broken and 0 failed requests; a reload with no network rendered the app and played a full turn (all eight steps, turn 2, 14 images, 0 broken, 0 failed) |

*The P2.6 piece 1 run read 357 controls and 911 text runs across 17 screens; the difference is
the four Settings screens (10 controls, 33 text runs) and the deck. P2.5's final run read 327
controls and 825 text runs across 16 screens, 836 runs scaled, with no ZOOM200 row.*

**Two instrument defects found by the first run over the Settings screens, fixed inline.**
The walk now quits to the Title mid-game to measure Settings with a save; its Continue click
then failed silently, because the Title's Continue button carries its subtitle ("Training
turn 2") inside the button and the exact-text click could not find it, so the Result was never
reached and the save survived into the later passes. Those passes run as tabs of one browser
and share its profile, and a Title with a save puts the overwrite confirm AFTER the difficulty
pick, where the walk was not looking: the scaled passes sat on the difficulty screen and
measured 12 text runs per "screen". Both were visible only in the JSON's per-screen text-run
counts and the "NOT REACHED" line, not in the totals, which still read zero findings. The
Continue click matches the label's start; the overwrite confirm is clicked after the pick. The layout faults the first 180 px pass found and fixed
in P2.5 (the reveal dialog, the piece grid, the planning row; the table above) are what a
zero here rests on, and this is the first machine measurement of the layout at 180 px since
the `rem` sweep, which changes nothing at a 16 px root.

What the instrument does not reach: text inside the SVG board (the print ink, 5.05:1 on paper
by the same formula; at the board's scale, not the text setting's) and the art, whose contrast
is the pipeline's measured value per asset ([`ASSETS.md`](ASSETS.md)); the phone's own rendering
of Nunito and its fallback stack.

## Offline: how it is met, and what keeps it true

`vite-plugin-pwa` (Workbox `generateSW`, `registerType: 'autoUpdate'`) precaches everything the
game needs at the first visit — the app, the art at every scale, the anatomy frame, the fonts:
193 entries, 985 KiB — and serves them from the cache afterwards; a new build replaces the
worker on the next visit. The dev server does not register a worker (the instruments and HMR
must see the network), so the offline item is only ever measured on the build. Phase 4's
Capacitor build bundles the same files and is offline by construction. The security posture
is recorded in [`SECURITY_NOTES.md`](SECURITY_NOTES.md) ("Added 6 September 2026").

## For the phone

*This section read "one item left": Android font size at 200%.* That item produced FINDINGS
#60 and #61 — the phone's system font size reaches no web page, and the setting a
Chrome-on-Android user has is page zoom — and Shantanu's page-zoom check on the shipped build
passed by hand (the head note). Nothing is left for the phone from this record. **What comes
next is a third scaling mechanism:** P2.6's Settings carry an in-app text size, ruled 6
September 2026 because neither of the two mechanisms above is one a player will find, and the
audit gains a pass for it, named for its mechanism, built with the setting
([`for-P2.6.md`](for-P2.6.md), ruling 5).
