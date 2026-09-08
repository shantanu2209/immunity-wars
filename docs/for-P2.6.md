# For P2.6 — the rulings at the kickoff, and the decisions deliberately not taken

**Opened 6 September 2026, the day P2.5 closed.** P2.6 is the brief's "screens an exhibition
demo never needed" ([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v1.7 §2), made concrete by
[`APP_FLOW.md`](APP_FLOW.md): the four Title slots (How to play, Disease library, Settings,
About), the first-run onboarding hook on Title, the error boundary screen and the
storage-failure notice. It inherits the audit's page-zoom pass from
[`P2_5_CLOSEOUT.md`](P2_5_CLOSEOUT.md) and the newcomer test's named specifics whenever
testers exist, which reorder everything below. Running record: [`P2_6_PROGRESS.md`](P2_6_PROGRESS.md).

This document is the same kind of record [`for-P2.5.md`](for-P2.5.md) was: what was ruled,
by whom, with the reasoning a judge would ask for, and what was noticed and deliberately not
taken.

---

## The six rulings of 6 September 2026 (Shantanu), and what each asks for

**1. The must-pass halves are taken.** A check expressed only as "forbid X" is half-specified,
since a check that forbade everything would satisfy every fail-control ever aimed at it. Added
to touch, contrast, non-text and offline in `tools/perf/gate1-audit.ts`, alongside the page-zoom
pass, in P2.6's first piece: eighteen controls, nine pairs, every check both ways
([`GATE1_AUDIT.md`](GATE1_AUDIT.md)).

**2. Offline on the Android build and the handset pass PASS THROUGH to Phase 4.** Both are
Phase 4's and P2.6 cannot close either. The closeout and the brief carry the correction so that
nobody later reads them as owed in P2.6.

**3. No offline screen.** APP_FLOW's ruling stands: offline is the app's normal state. The only
offline-shaped moment is a first visit with no network before the service worker exists, which
is an install problem rather than a screen. The brief's "offline states" wording is recorded as
superseded (v1.7) rather than left disagreeing with APP_FLOW.

**4. The science toggle: no Settings entry, and be precise about scope.** Nobody remembers what
it was for; the `science` field is read by nothing in either engine, so there is nothing to
toggle. The field is NOT removed: that is an engine change and the engine is frozen. It is
queued for Phase 3 as [`ENGINE_CHANGE_QUEUE.md`](ENGINE_CHANGE_QUEUE.md) Q10, with the note
that it is inert and unremembered, and left alone until then.

**5. Settings, the first set — deliberately small, since nobody yet knows what people will
want:**

- **Text size, in-app.** The important one, and accessibility rather than preference: Android's
  system font size reaches nothing on a web page, and Chrome's page zoom is buried three menus
  deep, so an in-app control is the only one a player will find. **It is a third scaling
  mechanism, so the audit needs a pass for it too, named for its mechanism like the other two.**
  That pass is built with the setting, not before it: a mechanism cannot be modelled before it
  exists, and the pass must drive the control the player will use rather than a stand-in for it.
- **Sound on or off, only if there is any sound.** Checked 6 September 2026: there is none — no
  audio element, no Audio API use, no sound asset anywhere in `packages/ui` or `packages/app`.
  So the row is left out rather than shipping a dead control, and comes in with sound if sound
  ever does.
- **Language, even with English as the only entry today.** It makes the Hindi edition an
  addition rather than a new screen, and it tells a player the intent exists.
- **Reset progress, with a confirm.** The autosave is a single slot with no other way to clear
  it.

Not now: a difficulty default, animation preferences, anything speculative. Shantanu adds as he
thinks of things, so the screen is built so that adding a row is trivial. **The layout is
proposed before it is built**, and if any row turns out to be more than a row, that is said.

*Noticed at the kickoff, for that proposal rather than decided here:* text size is more than a
row — it is a mechanism (a root font-size multiplier the `rem` sweep made possible) plus
somewhere to persist a device-local preference, which nothing in the app does yet (the autosave
is Session's IndexedDB slot; settings are the shell's, and the same no-personal-data rule
applies). Reset progress must say what it resets: the autosave, and whether the settings too.
Language is one row with one entry until the Hindi catalogue exists.

**6. Help is written fresh for the phone.** The rulebook and a help screen do different jobs,
and rulebook-length prose does not belong on a phone. Where a passage is already compatible it
is reused as is; otherwise it is written for the medium. Subject to the no-dashes rule like
everything else player-facing. **The structure is proposed first, before any prose**; Kartik
reviews the science with Shantanu, and the builder's job is making it fit a screen.

---

## The rulings on the Help draft (Shantanu, 6 September 2026)

Recorded in full in [`HELP_DRAFT.md`](HELP_DRAFT.md), "The rulings". In one line each: the NK
Cell's reach is 1 and the rulebook and quick reference are corrected to say so; section 9
keeps its length; the app's phase names win, which settles Infection and Command from the
app and Spread for the third phase the app never names, with the quick reference's March
corrected; the "not all hidden pathogens are viruses" note stays in Help. One premise
corrected: no resident wording was changed in any document, and the rulebook's resident
Recall stands as the table rule and Q6's target.

## The order, proposed at the kickoff (provisional until the newcomer test)

1. **The page-zoom pass and the must-pass halves** — done in the first piece
   ([`GATE1_AUDIT.md`](GATE1_AUDIT.md)), with this record, the P2.6 documents, and the stale
   lines the sweep cannot see (the roadmap's Phase 2 status, the closeout's library citation).
2. **Settings** — the layout proposal, then the build, then the audit's third scaling pass.
3. **How to play** — the structure proposal, Kartik's review, the prose, the screen.
4. **The disease library** — the pathogen card with an index over the disease keys; a prior
   version exists, so no design exploration is needed.
5. **About** — the credits as the README states them, the licences, the version.
6. **The error boundary and the storage-failure notice** — the two cross-cutting states.
7. **The onboarding hook** — held for a direction: brief §5 makes onboarding Claude Design's to
   explore, and the newcomer test is the evidence about what a first run needs.

Chosen this way because the first piece depends on nothing the test will change, Settings
carries the accessibility item, and onboarding is the one most likely to be reordered by what
a tester does.

## Noticed, recorded, not built

- **The audit's `ScreenResult` carries the measured width and root font size for the layout
  passes** from this piece on, so the record says what each screen was measured at rather than
  only that it passed. Added because the first green run of the restored pass could not say, from
  its own output, that the page had been 180 px wide.
- The Result screen is reached in the 180 px walk by the same idle loss as at 360 px, and the
  walk's click-by-label driving holds at half width.
- **The walk reached the inspect sheet by luck.** Found in the first piece by reading the
  JSON's screen list rather than the verdict: two green runs had never measured the sheet.
  Fixed inline (an instrument); the habit is the lesson. Seventeen screens deterministically is
  the difference between "clean" and "clean over everything" (Shantanu, at the merge of #58).
- **The habit, made a standing rule after its third catch in one day** (Shantanu, at the merge
  of #60; `CLAUDE.md`, "How to work here"): read the instrument that reports coverage, not the
  one that reports a verdict. The inspect sheet, the Continue button the walk could not click,
  and the overwrite confirm in the wrong place were all invisible in the totals and all plain
  in the per-screen counts. A green total over an incomplete walk is a green gate over an
  uncovered arm.

---

## PROPOSAL 1 — the structure of How to play (for ruling; no prose here)

**Asked for by Shantanu, 6 September 2026:** the sections, their order, what each answers,
and roughly how long each is on a phone. He takes the shape to Kartik and the two of them
settle the words. Nothing below is player text; the section names are working labels.

### The division of labour between Help and the two other places words already live

Help answers **how do I play**. The **cards** answer **why is it like this** (the cell card's
role and deficiency lines, the pathogen card's fact and "beat it" lines, Kartik's science,
already in the app). The **library** answers **what is this pathogen** (the card with an
index). So Help carries no biology beyond the one clause a rule needs to be memorable, and
every section that touches a cell or a pathogen ends by pointing at its card. This keeps Help
short and keeps the science in one place, which is also the place that is translated with the
diseases namespace rather than the UI one.

### Two readers, one document

A newcomer on the Title screen reads top to bottom before a first game. A player in the pause
menu wants one answer and back to the game. The structure serves both if every section is
**self-contained, one to two phone screens at 360 px, and reachable from an index**. Lean, for
the build rather than for this ruling: an index screen listing the sections, each opening as
its own page with Back to the index and Next to the following section, as a `help` state of
the shell machine carrying the section key. A single long page with anchors is the
alternative; it reads worse at 200%.

### The sections, in order

| # | Section (working label) | What it answers | Rough length on a phone | Where words already exist that fit as they are |
|---|---|---|---|---|
| 1 | **The idea** | What am I? What wins? What loses? When does it end? | 60 words, under one screen | The goal dialog's three sentences (in the app, approved); rulebook §1 "How you win / How you lose", trimmed of the attrition clause's reasoning |
| 2 | **A turn** | Why did the screen change? Which part is mine? What does the app do for me? | 80 words, one screen | Quick Reference "The turn", three lines, nearly as they are; plus one line that the app draws, places and spreads, and the player commands |
| 3 | **The board** | What is this map? What are routes, the bloodstream, the organ branches, the pips? What does "when damaged" mean? The Brain rule | 100 words, one to two screens, plus "tap a node for what stands there" | Rulebook §3's four openers, each cut to its first sentence; the organ table's "when damaged" column verbatim (already in the inspect sheet's organ row) |
| 4 | **Action Points** | Why do I have fewer this turn? What costs one? | 50 words, under one screen | Rulebook §5 Phase 2's two lines; the AP drill-in already lists the terms in the app, so this section says only that it exists |
| 5 | **Your cells** | Who does what? Who moves, who does not? What is a resident? | 120 words, two screens, the longest section: seven one-liners plus one for residents | Quick Reference "What it does" column, each cut to its verb clause; the biology column stays on the cell card |
| 6 | **Beating each invader** | What do I do about THIS thing? | 110 words, two screens: nine one-liners | Quick Reference "How you beat it" column, mostly as it is; the malaria stages stay on the card |
| 7 | **Antibodies** | Why does my antibody not work on that? Produce, then coat or neutralise; classes; the cap; Pathogen X in one line | 80 words, one screen | Quick Reference "Antibodies are specific" opener; rulebook §7's class table is the library's, not Help's |
| 8 | **Memory and vaccines** | What is a memory response? What does Vaccinate do? What differs by difficulty, in one line | 60 words, under one screen | Rulebook §8 "Immunological memory", cut to the rule; the "why" paragraph stays out |
| 9 | **Crisis events** | What was that section in the reveal? What does HIV do to me? | 50 words, under one screen | Rulebook §8's event table, one line per event, or only the principle plus "the reveal names each one" |
| 10 | **Difficulty** | Which should I pick? What changes? | 40 words, under one screen | The difficulty screen's three descriptions (in the app, approved), plus the antivenom and memory differences in one line each |

Ten sections, about 750 words, against the rulebook's 4,320 and the quick reference's 1,616.
Every section fits one to two screens at 360 px and two to four at 200%, which is the bound the
audit holds Help to like every other screen.

### Three things for the ruling, stated rather than decided

- **A tips section, or not.** "If you are stuck: tag then engulf; coat then strike; keep the
  Helper with the B-Cell" is the section a newcomer test would most likely ask for and the one
  that is strategy rather than rules. Kartik's call whether Help teaches play or only rules; the
  newcomer test is the evidence, and the section can be added later without reordering.
- **Whether the "why it works this way" boxes get a home in the app at all.** They are the
  rulebook's best writing and Help is the wrong place for them by the division above. The
  natural home is the library and the cards, which already carry Kartik's science; if he wants
  them reachable, that is a library decision, not a Help one.
- **Section 9's shape.** One line per crisis event duplicates the reveal, which already names
  and explains each event when it fires. The principle alone ("a crisis changes what you can do
  this turn; the reveal tells you how") is shorter and never drifts from the engine's text.

No dashes in any of it: the no-dashes test covers Help's catalogue keys like every other.

---

## PROPOSAL 2 — the Settings layout, with its pieces named separately (for ruling)

**Asked for by Shantanu, 6 September 2026**, with the rows ruled in ruling 5: text size,
language, reset progress; sound left out because there is none. Built so that adding a row is
trivial. What follows is the layout, then the three pieces the layout needs, each sized, then
what reset actually resets, confirmed from the code rather than assumed.

### The screen

Reached from the Title slot and from the pause menu; Back returns to where it was opened.
A list of rows, each a label on the left and its control on the right, every control at
least 44 px, the row wrapping to two lines at 180 px. Rows are grouped under two short
headings so that later rows have an obvious home:

| Group | Row | Control | Notes |
|---|---|---|---|
| **Reading** | Text size | four choices in a segmented control that wraps: Standard, Large, Larger, Largest (100%, 125%, 150%, 200%) | The whole screen rescales live as the choice changes, which is its own preview. 200% is the WCAG 1.4.4 bound and the size the audit already proves every screen survives |
| **Reading** | Language | a choice control whose options are the catalogue's available locales; one today, English | Display-only until a second catalogue exists; the row is there so that Hindi is an addition. The switch mechanism is not built with one locale, since nothing could test it |
| **Progress** | Reset progress | a button, then a confirm on the same screen: what it deletes, Delete, Keep | Disabled with a "no saved game" note when there is nothing to delete, so it never does nothing |

Adding a row is one entry in a `rows` table with a kind (`choice` or `action`), its catalogue
keys, and its handler; the screen renders the table. No row is special-cased in the layout.
About is not a row here: it is its own Title slot by APP_FLOW.

### The three pieces, named separately, with sizes

**A. The in-app scaling mechanism.** A root font-size multiplier: the shell writes the chosen
percentage to the document root's font size before the first render, and every `rem` size
follows, which is exactly what the P2.5 sweep made possible. The board's SVG text stays at the
board's scale, by the standing ruling. **Small in code, wide in effect** (it touches every
screen), so it lands as its own commit with the audit's third pass in the same PR. **The third
audit pass** is cheap and it is the point: the same auditor as FONT200, but the root is set by
driving the Settings control through the UI rather than by the instrument, so the pass proves
the control does what the instrument did by hand; its controls are FONT200's. Two things stated
rather than smoothed over: the mechanism is physically the same as the default-font-size
preference (a root size), which is why the audit already knows the layout survives it; and a
player who stacks it on page zoom reaches 400%, beyond the bound, which is not a requirement and
is not measured.

**B. The device-local preference store.** Nothing in the app persists a preference today
(checked: no `localStorage`, `sessionStorage` or cookie use anywhere in `app`, `ui` or
`session`). Requirements: device-local; no personal data (a size and a locale code); readable
**synchronously before the first paint**, or the first frame renders at the wrong size; Zod at
the read, since a stored value is a trust boundary like a saved game; survives a build update;
works in the Capacitor WebView. `localStorage` meets all five and IndexedDB fails the third,
so the recommendation is one `localStorage` key holding a versioned, schema-validated object,
with a negative control: a malformed stored value must fall back to defaults. **Small; its own
commit.** It is deliberately not the `Storage` seam: that seam serialises `GameState` and is
Session's; settings are the shell's, and mixing them would put a preference in the save's
trust boundary.

**C. Reset progress.** `storage.delete('autosave')` already exists (the Result screen calls
it); the row adds the confirm and re-reads the save on return to Title so that Continue
disappears. **Trivial.** The confirm's text says what it deletes and that settings stay.

**Is any of the three its own piece?** No; none is large. The recommendation is **one piece, two
PRs**: the store, the screen and reset first (B, the rows, C), then text size with the audit's
third pass (A), since A is the one that touches every screen and deserves its own verify and
its own audit run.

### What reset resets, confirmed from the code

Shantanu's expectation: the autosave and nothing else, since nothing else persists. **True for
everything the player's path writes.** The full list of what can persist on a device, so the
claim is checked rather than assumed:

| What | Where | Written by | Reset touches it? |
|---|---|---|---|
| The autosave | IndexedDB `immunity-wars`, store `saves`, key `autosave` | the app shell (`main.tsx`) on every accepted action | **Yes, the only thing** |
| The dev shell's save | the same store, key `dev-shell` | `dev.html`, which ships in `dist` as a build input by APP_FLOW ruling 6, so it exists on any device where someone opened `/dev.html` | No: it is the maintainer's, and the dev shell is where it is cleared |
| The dev shell's IndexedDB exercise | a separate database, `immunity-wars-dev-exercise` | the dev shell's checks panel, on demand | No, same reason |
| The build's precache | Cache Storage, the service worker's | the worker at the first visit; replaced at the next build | No: it is the app, not progress |
| The settings themselves | piece B's `localStorage` key, once it exists | the Settings screen | No, and the confirm says so |

Nothing else: no cookies, no `sessionStorage`, no other database. So the row's name is honest
as "Reset progress" only if progress means the saved game; if Shantanu would rather it read
"Delete saved game", that is the more literal label and the smaller true claim.

---

## The five rulings on the two proposals (Shantanu, 6 September 2026; two of them Kartik's)

**1. "Delete saved game", not "Reset progress".** The row clears only the autosave, confirmed
from the code above, and "Reset progress" overpromises: it sounds like statistics, unlocks or
achievements, none of which exist. The smaller true label, as everywhere else. Built so.

**2. The build order is agreed:** one piece, two PRs, text size last because it touches every
screen. PR 1 is the store, the screen with its language and delete rows, the two doors (the
Title slot and the pause menu), and the audit walking the new screen; PR 2 is text size with
the scaling mechanism and the audit's third pass.

*Decided in the build and flagged rather than hidden:* from the pause menu the delete row is
**disabled with its reason** ("You are playing the saved game. Quit to the title to delete
it."), because the save IS the game being played and the next accepted action would write it
again; deleting from inside the game would have to end the game, which is Quit's job. From the
Title the row is live when a save exists and disabled with "No saved game" when none does, so
it is never a control that does nothing. Settings over a paused game keeps the game mounted
underneath, hidden, so the session, the selection and any queued dialog are undisturbed; Back
returns to the game.

**3. No tips section, at least not yet. Help is rules.** Recorded as the shape it would take
if it ever happens, so nobody adds tips into Help by default: **a separate section behind a
spoiler warning that says plainly that reading it may cost the player their own path to
playing well.** Not a Help section by default, not folded into the rules, not first.

**4. The rulebook's "why it works this way" boxes go in the library (Kartik's ruling).** They
are his explanations of the biology behind each mechanic and they appear nowhere in the app.
This also settles part of what the library is for: not only what a pathogen is, but **why the
game models it the way it does.** The library piece carries them; they are content prose
(Kartik's science, translated with the diseases namespace), extracted from the rulebook into
the content pack like the card prose was, and pinned to the rulebook's text.

**5. Section 9 duplicates, does not reference (Kartik's ruling):** Help lists every crisis
event with what it does, so a player can look one up without waiting for it to fire.

**The string question, solved rather than discovered.** Where an event's words live today,
checked in the code rather than assumed: its **name** and its **why** are the content pack's
event table (`EVENTS[key]`), which the reveal renders directly; **what it does** is an effect
chip, a UI catalogue string (`effects.noProduce`, `effects.neutrophilOffline`, …) that the
strip and the reveal choose from the game state the event produced, not from the event key;
and the table's `tell` is the engine's **forecast** wording ("next turn"), set as the warning
the turn before a bad event, which one event lacks. So Help reads the same three sources and
copies none: for every key of `EVENTS`, its `name` and `why` from the table, and for its
effect line **the chip text that event produces when it fires**, through one keyed map from
event to effect key in the UI, **pinned by a test that fires each event on a constructed state
and requires the strip to produce exactly the mapped chip** (the state-injection pattern), with
a control that a wrong mapping fails. An event with no chip of its own (co-infection) shows its
`tell`, stated as the forecast it is. Nothing is copied into the catalogue, nothing can drift
without the pin going red, and a new event in the pack fails the pin until it is mapped. The
reveal keeps its shorter form by construction: it shows the one event that fired, with its
chips; Help shows all of them. Help's only catalogue strings of its own are its headings and
its intro line.

---

## PROPOSAL 3 — the disease library (for ruling; nothing built)

**Asked for by Shantanu, 8 September 2026:** the shape of an index over the diseases, and where
the rulebook's "why it works this way" boxes sit. His two conditions: the boxes are content to
present, not prose to rewrite, and repunctuation for the no-dashes rule is the only change
allowed to them; and the structure is proposed before anything is built, as Help's was.

### What there is to index, measured from the content pack

- **106 disease records**, every one with all five lines the card shows (discovered, causes,
  found, prevent, treat), four stat bars from 1 to 5 (contagion, severity, speed, cunning),
  and a **tier** word: Common 32, Rare 41, Legendary 33. The engine never reads the tier, so it
  is Kartik's classification and a card fact, not a rule. A **fact** line exists for 30.
- **97 are deck cards**, each with a type: bacteria 29, virus 25, hidden 13, fungus 8, worm 7,
  parasite 6, toxin 4, venom 3, malaria 2. **Pathogen X** is a card with no record, masked by
  design, and stays out of the library.
- **Nine records are not cards and arise in play from a parent**: three toxins released by
  Tetanus, Cholera and Gas gangrene; Malaria's blood stage and its relapse; Dengue's ADE;
  Tuberculosis reactivated; Shingles, from Chickenpox; Pneumococcal pneumonia, after
  Influenza. The engine names every one of them in its spread and rare-event code.
- **One record arises from nothing: Diphtheria toxin.** It has a class and a target organ, no
  card, no maker in the toxin table, and no line in the engine produces it. A library entry no
  game can reach; Kartik's call whether it is the toxin Diphtheria conceptually releases and
  should be shown as such, or a leftover to retire from the pack.
- **Antigen classes** over the 106: ENV 28, EUK 27, EXB 21, TOX 11, ICB 10, NAK 9. **Target
  organs** (a disease with two targets counts in both): lungs 29, brain 28, liver 27, kidneys
  18, heart 17, spleen 12, marrow 11, any organ 3.
- **No difficulty axis exists.** One deck serves all three difficulties and the dice decide
  the draw; nothing in the data says which diseases a Training player meets.

### The shape: grouped by type, with a name filter and section chips

**Nine sections in the order Help's section 6 uses** (virus, hidden, bacteria, fungus, toxin,
venom, worm, parasite, malaria), alphabetical within each, so the library's shape is Help's
shape and the card's. **Each section header carries the type's "beat it" line** from the
content pack, the same line the card shows, so the rule is read once per group rather than
once per disease. **Each row**: the name, the antigen class as a coloured badge in the class's
own colour (the antibody panel's), and the target organs in muted text. **A filter box at the
top** narrows every section by name as you type, for the player who met a disease and wants
it back; **a row of nine chips under it** jumps to a section without the keyboard, because
106 rows at 44 px is more than six phone screens. Tap a row: the existing pathogen card, with
Close returning to the index at the same place.

The nine derived records sit **indented under their parent** with an "arises from" line, so the
index reads 97 and the ten things a game can make of them show where they come from. The
parent map is a content table, pinned by a test to the engine's own spawn lines.

**Why type and not the others**, one each:

- **Alphabetical** serves lookup by name and teaches nothing; the filter box serves lookup by
  name better, so alphabetical order would buy nothing the filter does not.
- **Antigen class** is the game's central teaching, and it is the wrong partition for a
  library: EUK holds fungi beside worms and protozoa, which are beaten in three different ways,
  and the card already answers "what antibody" in its class line. The badge on every row keeps
  the class visible without making it the shape.
- **Organ** is a filter, not a partition: a disease with two targets appears twice, and the
  counts sum to 145 over 106. The row's organ text and the card's "can infect" line carry it.
- **Difficulty** does not exist in the data. Grouping by it would be an invention.
- **Tier** is Kartik's rarity label, which the engine does not read; the card shows it and the
  index does not group by it.

If a class or organ grouping is ever wanted, it is a sort toggle, one entry in a modes table;
flagged and not built.

### The boxes: their own section, per mechanic, with cross-links

None of the fifteen boxes is about a disease. Each is about a mechanic: the blood route, the
lymphatic shortcuts, the Brain, starting with no antibodies, worms, toxin-makers, coating,
priming, the NK Cell's die, the Eosinophil's burn, residents, malaria's stages, vaccines,
Pathogen X, and why surviving the window is not the win. So they sit **as their own section of
the library, "Why it works this way", fifteen entries in the rulebook's order**, one scrolling
page with the fifteen titles as jump chips, about 640 words in all. Each entry's title is a
fresh catalogue label naming the mechanic; the text is Kartik's, unchanged except that ten of
the fifteen carry a dash and are repunctuated, one of them only a hyphen in "blood-brain".

**Cross-links both ways.** Every Help section that has a matching box gets a "Why it works this
way" link at its foot, to the entry: section 1 to the window box; section 3 to the blood
route, the lymphatics and the Brain; section 5 to priming, the NK Cell, the Eosinophil and the
residents; section 6 to worms, toxin-makers and malaria; section 7 to coating and to starting
with no antibodies; section 8 to vaccines and Pathogen X. Each entry links back to its Help
section. Links from the pathogen cards (Malaria's card to the malaria box, a toxin-maker's to
the toxin box, a worm's to the worm box) are a small follow-on and are not in the first build.

**The boxes as content.** Extracted from the rulebook into the content pack's diseases
namespace, Kartik's science translated with the pack, keyed by mechanic; and **pinned to the
rulebook document by a test** that reads the docx in the repository and requires each box to
match its source exactly, dashes repunctuated aside, with a control that a changed word fails.
The same pattern that pinned the card prose to legacy.

### Doors, audit, length

The Title slot only, as APP_FLOW draws it; the pause menu's two additions are Settings and How
to play, and in play a card is already one tap from the reveal and the inspect sheet. Back
ordering: card, then index, then Title. The audit walks the index, one card and the why
section, three more screens per pass; every row of the index is a control it measures. The
index at 360 px is six to seven screens with the chips as the way through; the why section is
about four.

### For ruling

1. Type as the shape, with the filter and the chips, as above.
2. The nine derived records under their parents, and what to do with Diphtheria toxin.
3. Whether the index says, in one line at its foot, that one pathogen has no entry because
   nobody has ever seen it. Player text, so Kartik's words if it is said at all.
4. The boxes as their own section with the cross-links, and my titles as the entry labels.
5. The Title door only.
