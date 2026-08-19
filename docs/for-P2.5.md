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
