# Gate 1 hygiene — the headless audit (6 September 2026)

> ⚠️ **Corrected the same evening (FINDINGS #61).** The scaling pass below sets the root font
> size to 200% by an inline style. That models the browser DEFAULT-FONT-SIZE preference
> (desktop Chrome, Firefox), which the `rem` sweep made the app follow; it does not model
> Chrome for Android, whose user-facing setting is PAGE ZOOM (Settings › Accessibility), a zoom
> that scales everything and lays a 360 px phone out at 180 CSS px, which is the pass this
> document's earlier runs used and #60 removed as a proxy. Android's SYSTEM font size reaches
> neither, and that is what the phone session changed. Two mechanisms, two passes: both are to
> be carried, named for what they model; not built here. The "0 unscaled" row is true of the
> first mechanism only. The offline row's phone-session confirmation is struck (it tested the
> network); the headless check stands, and offline is checked by hand on the Android build.

**What this is.** [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §1's Gate 1 has four items a machine can
check and one it cannot. This is the record of the machine's half, produced by
`pnpm gate1:audit <url>` (`tools/perf/gate1-audit.ts`). The numbers below are from the
SHIPPED WEB BUILD (`pnpm --filter @immunity-wars/app build:web`, served by `preview` on port
4173), not the dev server, because the offline item can only be true of a build with its
service worker. Every number is the instrument's.

**The instrument, and its controls.** Sixteen screens are driven in a real game on the app
shell: title, difficulty, the goal dialog, the play screen in the infection phase, the reveal,
the planning screen with and without the AP terms open, the command screen with nothing, the
B-Cell and the Neutrophil selected, the antibody family detail, the cell card, the inspect
sheet where the piece stands with something, the pause sheet, a spread frame, the next turn,
and the Result screen (an idle Training game is lost within a handful of turns). On each it
measures every visible control outside the SVG board (the board is coarse pointing by ruling;
the inspect sheet is its precise surface, P2.5 piece 1), every visible text run outside the
board against the first opaque background behind it, and every control's full border against
the surface behind it. Then the same sixteen screens again at the same 360 px width **with the
root font size at 200%**, and on each: every text run's computed size must be at least 1.9×
its size at 100%, and the layout must survive (no horizontal scrolling, every control in the
viewport, no text clipped to an ellipsis). Then the network is cut.

**Seven planted defects must be flagged before any screen is measured, or the run stops:** a
20 px button; #999 text on white (2.85:1); a #eee border on white; a 13 px span, which must be
flagged as NOT scaling at 200%, beside a 0.8125rem span, which must not be; a 600 px block,
which must overflow; and a fetch of a fresh URL with the network cut, which must fail. All
seven fired on every run.

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

## The numbers (the shipped build, final run)

| Check | Measured | Findings |
|---|---|---|
| Touch targets ≥ 44 × 44 CSS px | 327 controls across 16 screens | **0** |
| Text contrast (4.5:1, 3:1 large) | 825 text runs | **0** |
| Non-text contrast (3:1, control boundaries) | 327 controls | **0** |
| **Text scales at 200%** (≥ 1.9× per run) | 836 text runs across 16 screens | **0** unscaled |
| Layout at 200% text, 360 px | 16 screens | **0**: no overflow, no control off-screen, nothing clipped |
| **Offline** | first visit online, then the network cut | **MET**: service worker active; a turn played with 0 of 14 images broken and 0 failed requests; a reload with no network rendered the app and played a full turn (all eight steps, turn 2, 14 images, 0 broken, 0 failed) |

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

## For the phone (one item left)

Android font size at 200% on this build: every screen's text should be twice its size, the
layout should hold, and the board's own labels stay at the board's scale. If anything is cut
or overlaps, name the screen. Contrast, touch targets and offline need no finger.
