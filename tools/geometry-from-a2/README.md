# geometry-from-a2 — the board's generator, recovered

`packages/content/src/board/geometry.json` is **generated from the physical A2 board** by this
tool. The A2 PDFs (July 2026) were produced by a Python script that was lost; the PDFs are
vector, so the layout is fully recoverable from their drawing operators, and this tool is that
recovery — kept in the repository so the board's generator cannot be lost a second time.
`Immunity_Wars_BOARD_A2.pdf` (CLASSIC) is committed beside it as the input; the COLOUR variant
shares the same skeleton and differs only in palette. FINDINGS #49 records the layout
divergence this closed.

```
pnpm geometry:from-a2             # regenerate geometry.json from the PDF
pnpm geometry:from-a2 --dry       # print the JSON and report, write nothing
pnpm geometry:from-a2 --control   # negative control (see below)
```

## What makes its output trustworthy

- **The count assertion.** Extracted step counts per lane must equal `rules/board.json`
  (`ROUTES.len`, `ORGANS.branch`) or the tool refuses to write. `--control` perturbs the
  expected counts and requires the assertion to fire — run it after any change to this tool.
- **The independent oracle.** The content schema's parity check (`schema.ts`) re-verifies the
  same counts, plus in-viewBox bounds, on every load — with its own negative controls in
  `load.test.ts` (a mutated heart branch and a missing brain step both throw).
- **The report.** Every run prints the derived numbers `Board.tsx`'s `CLASSIC` constant copies
  (node radius, hub radii, organ box size, stroke widths at the run's scale, min node spacing,
  entry/organ angular order). Change those constants only from this report, never by eye.

## Conventions it preserves (verified against the engine's geometry before the first run)

- ROUTE steps number 1..len **ascending from the hub**; ENTRY is each route line's outer end.
- BRANCH steps number 1 at the **organ** side, increasing toward the hub.
- Lane key order and `ENTRY.t` label strings are carried over from the existing file, so a
  regeneration diff reads as movement, not churn.
