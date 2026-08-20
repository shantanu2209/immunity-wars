# For P2.5 — visual decisions noticed early and deliberately not taken

The P2.2 tripwire is *deciding how something should look rather than whether it renders*
([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §2). Anything that trips it lands here as a note and waits.
An entry is one line: what was noticed, and where. No mockups, no rankings — P2.5 decides.

- Token palette: the slice uses placeholder red-fill invaders / blue-outline cells and gray board
  lines, chosen only to be distinguishable. Real palette is P2.5's. (`Board.tsx`)
- Organ labels: the slice shows the organ KEY (`marrow`), not a display name — display names,
  their catalogue home, and label typography are P2.5's. (`Board.tsx`)
- Token art: letters-in-circles now; §5 of the brief says raster illustrations via `<image>`
  through the art pipeline. (`Board.tsx`)
- ✅ DECIDED (Shantanu, 20 Aug 2026) — co-located tokens STACK at one position with a count
  badge; tapping the stack expands it into an INSPECT view (not playable, so collisions with
  lanes/nodes don't matter there); tapping a pathogen's card brings it to the top. This
  replaces fanning entirely — 7 tokens fanned at 20px would span 138px, 38% of a phone's
  width. The 16u fan spacing in geometry terms is thereby IRRELEVANT, not a value to change.
  P2.5 builds this; `Board.tsx`'s fan is dev-slice scaffolding until then.
- Spread pacing: 560/800ms kept from legacy for measurement comparability; whether that reads
  well is the open rendering decision the brief §4 names. (`main.tsx`)
- The spread shows only the frame label ("Bacteria divide") — legacy renders dice; how a spread
  narrates is P2.5's. (`main.tsx`)
- Entry labels render at a fixed 13px from geometry positions; collision with route art untested
  at phone widths. (`Board.tsx`)
- Tokens render at 20px and organs/entries at 30px since the P2.4 art landed (Shantanu's
  showcase ruling) — but Gate 1's ≥44px touch targets still need a hit-area strategy
  (invisible expanded hit regions, or the stack-inspect view as the touch surface).
  (`Board.tsx`, 20 Aug 2026)
- ~~Fan spacing narrower than a token~~ — superseded by the stack-with-badge decision above;
  the overlap problem dissolves with fanning itself. (20 Aug 2026)
- `toxin`/`venom` and `malaria`/`parasite` share byte-identical art in `art_data.js`; whether
  those pairs deserve distinct icons is Kartik's call. (same measurement)
- Lymph connectors are straight dashed segments through the `LYMPH_STEP` nodes — short and
  local now that the layout matches the A2 (FINDINGS #49 resolution), but the print curves
  them and adds arrowheads and a "LYMPH" label (needs an i18n home). (`Board.tsx`, P2.4)
- ~~Wash disc omitted~~ and ~~step nodes half the print's proportion~~ — both resolved by the
  A2-layout regeneration (`tools/geometry-from-a2`): the wash renders at the print's radius and
  alpha, and node/hub/box sizes now come from the generator's report. (P2.4, second pass)
- Print label typography: entry names ~6.6u, step numbers ~8.5u, organ names ~10u equivalent —
  the app's authored 13px labels do not match the print's scale. (same)
