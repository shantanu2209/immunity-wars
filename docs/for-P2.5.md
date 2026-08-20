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
- Lymph connectors are straight dashed segments through the `LYMPH_STEP` nodes; the print's
  curved arcs assume its bilateral layout and do not transpose to the radial board (FINDINGS
  #49), so shape, arrowheads and the "LYMPH" label (needs an i18n home) are all open.
  (`Board.tsx`, P2.4 restyle)
- The print carries a translucent `#FBEAE5` wash disc behind the whole play area; its extent is
  layout-tied, so the restyle omitted it. (A2 PDF, P2.4 restyle)
- Print step nodes are proportionally twice the app's (r≈14.9u equivalent vs authored r=7) and
  carry their numbers comfortably; at r=7 the numbers are cramped at phone scale. (same)
- Print label typography: entry names ~6.6u, step numbers ~8.5u, organ names ~10u equivalent —
  the app's authored 13px labels do not match the print's scale. (same)
