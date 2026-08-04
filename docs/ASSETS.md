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

> **Status: not yet started.** This table is a stub. It must be filled in before the game
> content licence can be declared.

| Asset | Origin | Date | Account/plan | Prompt or source | ToS checked | Redistribution |
|---|---|---|---|---|---|---|
| _(unfilled)_ | | | | | | |

---

## Known asset locations

These are the places assets currently live, as a starting checklist. This list is descriptive,
not exhaustive — confirm against the repository before concluding.

- `tools/legacy/art_data.js` — base64-encoded icon art (cells, pathogens, organs)
- `tools/legacy/public/body.png` — board body illustration
- `tools/legacy/body_crop.png` — cropped variant
- `ORGAN_ART` in `tools/legacy/v2_ui.html` — inline organ artwork
- The printed A2 board artwork (not in this repository)

---

## Open questions

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
