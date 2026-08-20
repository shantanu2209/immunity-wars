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
- Co-located tokens fan out 16px horizontally so each stays visible — stacking/badging is a real
  design question. (`Board.tsx`)
- Spread pacing: 560/800ms kept from legacy for measurement comparability; whether that reads
  well is the open rendering decision the brief §4 names. (`main.tsx`)
- The spread shows only the frame label ("Bacteria divide") — legacy renders dice; how a spread
  narrates is P2.5's. (`main.tsx`)
- Entry labels render at a fixed 13px from geometry positions; collision with route art untested
  at phone widths. (`Board.tsx`)
- Board tokens at 360px are ~9.8 CSS px while Gate 1 needs ≥44px touch targets; node spacing
  caps a non-overlapping token at ~19.7px — token size vs hit-area strategy is a real decision.
  (P2.4 art measurement, 19 Aug 2026)
- The 16u fan spacing is narrower than a token at phone scale (8.7px vs 9.8px), so co-located
  tokens overlap — sharpens the stacking/badging entry above. (same measurement)
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
