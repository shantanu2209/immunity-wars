# The 46 ambiguous strings, for ruling in one sitting

**Written 6 September 2026** at Shantanu's request, from
[`STRING_INVENTORY.md`](STRING_INVENTORY.md) §3 ("The 46 that need a human call"). The
inventory listed each string with a line number and nothing else; this document adds where it
lived in the legacy UI, where the same thing now appears in the app (or that it does not), and
the call each one needs. Shantanu works through the calls with the screens in front of him.

**A note on the line numbers.** The inventory's lines are counted inside the legacy file's
`<script>`, not from the top of the file. Every location below is the real line in
`tools/legacy/v2_ui.html`, which is the inventory's line **plus 543** (checked on three
probes). The inventory is left as it is, with this note as the correction.

**The tally, so the sitting is sized before it starts.** Of the 46: **13** are already carried
into the app through the catalogue and need no call; **10** are code that only looked like
prose; **2** live in a developer panel and are not player text; **21** need a decision, and 14 of
those are one decision (the antigen-class long names).

Legend for "Now": the `ui.json` key that carries the same meaning in the app, and the screen it
renders on. "Play" is the command screen; "Planning" the plan-your-turn screen; "Card" the
pathogen card.

## Carried already, no call needed (13)

| # | Legacy line | String | Where it was | Now |
|---|---|---|---|---|
| 1 | 751 `actionList` | Move ▸ | the Move button when the lane panel showed the hub | `action.move` "Move", Play, selection box; the glyph dropped |
| 2 | 759 `actionList` | ✚ Produce X | Produce for the novel family | `action.produce` with the family name, Play, antibody panel |
| 3 | 760 `actionList` | Produce ▾ | the Produce button | `action.produce`, Play, antibody panel |
| 4 | 763 `actionList` | Antivenom (3AP· | the Antivenom button with stock | `action.antivenom` + `commandBar.antivenomHint` (3 AP) + `body.doses`, Play |
| 5 | 801 `residentActionBar` | Move (1 AP) | the resident's move | `action.patrol` "Patrol", Play; the cost shows as `selection.needsAp` only when short |
| 6 | 802 `residentActionBar` | Engulf (free) | the resident's engulf | `action.resengulf` "Engulf", Play; the reason line says "one free engulf per turn" after it eats |
| 7 | 929 `renderLanePanel` | Resident macrophage | fallback name for a resident | `inspect.resident`, Play, inspect sheet; residents are named by organ (Kupffer cell, …) |
| 8 | 995 `wireLinearPanel` | any organ | the tropism line | `card.anyOrgan` "Any organ", Card, "Can infect" |
| 9 | 996 `wireLinearPanel` | → targets | the flash line "X → targets liver or lungs" | the Card's "Can infect" row, `card.canInfect` |
| 10 | 1980 `side` | Engulfed ✓ | the resident's button after it ate | `selection.residentAte`, Play, reason line |
| 11 | 1981 `side` | the organ | "at the organ" in the resident's position line | `planning.whereOrgan` "In the {organ} itself", Planning; the inspect sheet's resident row |
| 12 | 2011 `side` | unknown pathogen | alt text on the novel pathogen's art | `inspect.unknown` "Unknown pathogen", as text on the sheet and the reveal. Alt text itself is out of scope with screen-reader support (brief §1) |
| 13 | 2083 `side` | ${ANTIVENOM_ORDER} AP for +1 | the order line in the antivenom row | `body.order` "Order a vial. It must be brought to you, {n} AP in all", Play, body panel |

## Code that looked like prose (10)

| # | Legacy line | String | What it is |
|---|---|---|---|
| 14 | 827 `whyNotTarget` | This is  | a fragment: "This is " + type + "." inside a rejection. Rejections now come from the engine catalogue and the `selection.*` reasons; the fragment has no equivalent and needs none |
| 15 | 1299 `captureSolo` | application/json | a MIME type in a developer capture |
| 16–21 | 1875 `famIcon` | `<line x1="` · `" y1="` · `" x2="` · `" y2="` · `" stroke="` · `" cy="` | SVG attribute fragments building the family icon |
| 22 | 1910 `abPanel` | onclick="act({action:'produce',…})" | an inline handler |
| 23 | 1965 `side` | sl span2 | CSS class names |

## Developer panel only (2)

| # | Legacy line | String | What it is |
|---|---|---|---|
| 24 | 1614 `forcePanel` | Hidden virus | the force-a-spawn panel's type list. The app's type names come from content (`UI_[type].n`); the dev shell is not player text |
| 25 | 1616 `forcePanel` | Sleeping sickness | a disease name in the same panel's named list; disease names are the `diseases` namespace |

## Needs a call (21)

| # | Legacy line | String | Where it was | Now | The call |
|---|---|---|---|---|---|
| 26 | 762 `actionList` | Tag / Coat | the one button for tagging a bacterium or coating a worm | `action.tag` "Tag", Play, selection box; "Coated in antibody" appears in the sheet after | **Should the row read "Coat" when the target is a worm or parasite?** The engine's own log says "coated"; the row says "Tag" for both |
| 27, 28 | 768 `actionList` | (2 dmg) · (1 dmg) | the Strike button's damage, Eosinophil vs Monocyte | `action.strike` "Strike", no figure | **Does the damage belong on the action row?** The cell card states it; the row does not |
| 29 | 771 `actionList` | Kill (d6 3+) | the NK button with its odds | `action.nkkill` "NK strike", no odds | **Do the odds belong on the row?** Same question as 27 |
| 30 | 931 `renderLanePanel` | · speed | "Monocyte · speed 1" in the lane panel's cell line | not shown anywhere; the cell cards say "two steps per Action Point" for the Neutrophil and NK Cell | **Show a cell's speed in the inspect sheet's cell row?** |
| 31–44 | 1803–1815 (the `FAM_LONG` table) | ENVeloped virus · Hepatitis B · NAKed virus · Hepatitis A · Common cold · EXtracellular Bacterium · Tuberculosis · Scrub typhus · TOXin (antitoxin) · Tetanus toxin · Shiga toxin · EUKaryotic parasite · UNKNOWN antigen · Pathogen X | the antibody panel's family tooltip: the acronym expanded, with example diseases | not carried. Content has `FAMILIES.name` and `.bio`; the expanded acronym and the examples exist only in legacy (noted in the 5 September handoff) | **One call for all fourteen: do the expanded acronyms and example diseases belong in the antibody panel's family detail?** If yes, they are content (`FAMILIES` gains the long name and the examples), and the eight example names are disease names, so they are Kartik's translation job, not a UI string |
| 45, 46 | 1986 `side` | defence organ · vital organ | the organ's kind under its name in the side panel | not shown anywhere; `ORGANS.kind` is content and the rulebook uses the words | **Show the organ's kind?** If the organ gets a row in the inspect sheet (proposed for the "When damaged" text, [`for-P2.5.md`](for-P2.5.md), the strip sweep), the kind has a home there |

## After the sitting

Each "needs a call" that is ruled IN becomes a `ui.json` key (or a content field, for 31 to 46)
and renders through the catalogue like everything else; the `iw/no-hardcoded-jsx-text` rule
holds it there. Each ruled OUT is recorded here as out, so the count is closed rather than
re-opened by the next person who reads the inventory. The brief's definition of done says "the
46 ambiguous strings decided" (§8), and this document is where the decisions land.
