# Asset provenance

**Purpose:** record where every visual asset in this project came from, so that the game
content licence can be settled. See [LICENSES.md](../LICENSES.md) for why this is blocking.

Until this file is complete and the terms below have been checked, the game content carries
**no redistribution licence**.

---

## Why this file exists

Some of the artwork was generated with an AI image tool. Whether we may redistribute that
output under CC BY-SA 4.0 depends on that tool's terms of service **as they stood on the date
the image was generated** — terms change, and what matters is the version in force at
generation time.

We cannot answer that question from the images themselves. It has to be written down.

---

## What to record

For every asset, we need:

| Field | Why |
|---|---|
| Asset | Which file, and where it is used |
| Origin | Tool name and version, or "hand-drawn", or "third-party" |
| Date | When it was generated or created — determines which ToS applies |
| Account/plan | Free vs paid tiers often carry different rights |
| Prompt or source | For regeneration, and to show the work is not derived from a specific artist |
| ToS checked | Date the terms were read, and the conclusion |
| Redistribution | Yes / No / Unknown — under CC BY-SA 4.0 specifically |

---

## Asset register

> **Status: started 20 Aug 2026** with the Path A regeneration. Every file that lands in
> `tools/art-pipeline/raw/` gets a row here at generation time. The licence stays undeclared
> until every row is complete and the ToS of the tool(s) actually used are confirmed.

| Asset | Origin | Date | Account/plan | Prompt or source | ToS checked | Redistribution |
|---|---|---|---|---|---|---|
| `tools/art-pipeline/raw/cell-macrophage.jpeg` (board token, Monocyte) | Google Flow (confirmed by Shantanu, 20 Aug 2026) | 20 Aug 2026 | TBC (Shantanu) | `ART_BRIEF.md` prompt 1, verbatim | not yet | Unknown |
| `tools/art-pipeline/raw/cell-neutrophil.jpeg` (board token, Neutrophil) | Google Flow | 20 Aug 2026 | TBC (Shantanu) | `ART_BRIEF.md` prompt 2, verbatim | not yet | Unknown |
| `tools/art-pipeline/raw/cell-bcell.jpeg` (board token, B-Cell) | Google Flow | 20 Aug 2026 | TBC (Shantanu) | `ART_BRIEF.md` prompt 3, verbatim | not yet | Unknown |
| `tools/art-pipeline/raw/cell-tcell.jpeg` (board token, Killer T-Cell) | Google Flow | 20 Aug 2026 | TBC (Shantanu) | `ART_BRIEF.md` prompt 4, verbatim | not yet | Unknown |
| `tools/art-pipeline/raw/cell-helper.jpeg` (board token, Helper T-Cell) | Google Flow | 20 Aug 2026 | TBC (Shantanu) | `ART_BRIEF.md` prompt 5, verbatim | not yet | Unknown |

---

## Known asset locations

These are the places assets currently live, as a starting checklist. This list is descriptive,
not exhaustive — confirm against the repository before concluding.

- `tools/legacy/art_data.js` — base64-encoded icon art (cells, pathogens, organs)
- `tools/legacy/public/body.png` — board body illustration
- `tools/legacy/body_crop.png` — cropped variant
- `ORGAN_ART` in `tools/legacy/v2_ui.html` — inline organ artwork
- `tools/geometry-from-a2/Immunity_Wars_BOARD_A2.pdf` — the printed A2 board (CLASSIC), located
  20 Aug 2026. Vector, script-generated (the script is lost; the PDF is the surviving record and
  now the input to `tools/geometry-from-a2/`). **Its 16 embedded rasters** — the print's organ
  and legend icons — carry the same unknown-tool provenance question as the icon art above; the
  vector drawing itself is original work, not AI output. The COLOUR variant exists outside the
  repository and shares the skeleton.

---

## Open questions

0. **For the P2.4 regeneration (Path A, ruled 20 Aug 2026): the tool may be Gemini OR Google
   Flow — and redistribution permission is a PER-TOOL question.** Whichever tool is actually
   used, its output terms as of the generation date must be confirmed to permit CC BY-SA 4.0
   redistribution before any content licence is declared. An answer obtained for one tool does
   not transfer to the other, and both may be in play across the set. Record the tool per
   asset in the register; `docs/ART_BRIEF.md` carries the same duty at the point of use.
1. Which tool generated the organ and cell illustrations, and on what date?
2. Was the account used a free or paid tier at that time?
3. Do that tool's terms permit redistribution of output under a share-alike licence?
4. Is the printed A2 board artwork the same source material, or separately produced?
5. Does the body illustration (`body.png`) have the same provenance as the icon art, or a
   different one?

---

## Resolution log

Record decisions here as they are made, with dates, so the reasoning survives.

_(no entries yet)_
