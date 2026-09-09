# P2.6 progress note — opened 6 September 2026

The running record of P2.6: where each piece landed, what it measured, what is left. The
rulings behind the pieces are in [`for-P2.6.md`](for-P2.6.md); the brief is
[`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v1.7; what P2.6 inherited is stated in
[`P2_5_CLOSEOUT.md`](P2_5_CLOSEOUT.md). This note is superseded by the P2.6 closeout in the
usual discipline.

---

## Piece 1 — the page-zoom pass and the must-pass halves (done, 6 September 2026)

**What it was for.** The closeout's one inherited instrument gap: the Gate 1 audit measured
text at 200% under one mechanism (the browser default-font-size preference) and none under the
one a Chrome-on-Android user has (page zoom), which FINDINGS #61 had found and Shantanu's check
by hand had passed. And the ruling of the kickoff: every check gets its passes-control as well
as its fires-control.

**What landed** (`tools/perf/gate1-audit.ts`; record in [`GATE1_AUDIT.md`](GATE1_AUDIT.md)):

- Two text-at-200% passes, each named for the mechanism it models — **FONT200** (the root at
  200% on a 360 px page) and **ZOOM200** (a 180 × 390 CSS px page at a doubled device scale) —
  sharing one layout auditor, so the two differ only in mechanism. Each layout result records
  the width and root font size it measured at.
- **Eighteen controls, nine pairs**, run before any screen is measured: touch, contrast,
  non-text, scale, layout under each mechanism (overflow; a control past the edge; an ellipsis
  that clips), offline. All eighteen fired the right way on the rebuilt instrument's first run.
- The audit's default URL is the preview of the shipped build (port 4173), since offline can
  only be true of a build with its service worker.
- **An instrument defect found and fixed inline:** the walk reached the inspect sheet only when
  the deck stood something beside the Neutrophil, and the first two runs of the rebuilt
  instrument did not reach it at all. It now opens the sheet by a click on an invader token with
  nothing selected; invader token groups carry a `data-invader` address for the drivers
  (`Board.tsx`, rendering nothing). Seventeen screens on every run.

**The run on the shipped build:** 357 controls and 911 text runs across 17 screens; touch 0,
contrast 0, non-text 0; 0 unscaled under FONT200; layout 0 under FONT200 at 360 px and **0
under ZOOM200 at 180 px**; offline met. Numbers with their widths in `GATE1_AUDIT.md`.

**Also in this piece, the records:** the six rulings of the kickoff ([`for-P2.6.md`](for-P2.6.md));
the brief to v1.7 (no offline state; offline-on-Android and the handset pass are Phase 4's);
the closeout's two corrections (the pass-through items, the library citation); the science
field into the Phase 3 queue as Q10; the roadmap's Phase 2 status, which had said "P2.1
complete" and "v1.1" since August.

## The two proposals (written 6 September 2026, awaiting rulings; nothing built)

Shantanu reordered the two: **How to play first**, since it is cheaper and unblocks a
conversation with Kartik that can run in parallel with anything else; then Settings. Both are
in [`for-P2.6.md`](for-P2.6.md) as PROPOSAL 1 and PROPOSAL 2:

- **How to play:** ten sections, about 750 words against the rulebook's 4,320, each one to two
  phone screens, with what each answers and which rulebook or quick-reference passages already
  fit as they are; the division of labour with the cards and the library; three things left for
  the ruling (a tips section, a home for the "why it works this way" boxes, the crisis section's
  shape).
- **Settings:** three rows in two groups, a rows table so adding one is trivial; the three
  pieces named and sized (the scaling mechanism with the audit's third pass; the preference
  store, `localStorage` for the synchronous read before first paint; reset), one piece in two
  PRs; and what reset resets, confirmed from the code: the autosave and nothing else the
  player's path writes, with the two dev-shell stores and the precache listed as the things
  that also persist and are left alone.

**Both proposals ruled the same day** (five rulings, [`for-P2.6.md`](for-P2.6.md), "The five
rulings on the two proposals"): "Delete saved game" as the label; one piece, two PRs, text size
last; no tips section, and the shape one would take; the rulebook's "why it works this way"
boxes go in the library (Kartik); Help lists every crisis event (Kartik), reading the same
sources as the reveal rather than copies, with the effect line pinned by firing each event.

## Piece 2, PR 1 — Settings: the store, the screen, two rows, two doors (done, 6 September 2026)

- **The preference store** (`packages/app/src/settings.ts`): one `localStorage` key holding a
  versioned object of a text size and a locale, Zod-validated at the read because a stored
  value is a trust boundary; read synchronously before the first render. Its tests run both
  ways: a valid value round-trips exactly; seven malformed shapes, including the right keys
  with an unlisted size, fall back to the defaults; a throwing store reads as the defaults and
  reports the failed write. Not the `Storage` seam, which is Session's and serialises `GameState`.
- **The screen** (`packages/ui/src/screens/SettingsScreen.tsx`): rows from a table in two
  groups, so a row is one entry. Reading: Language, shown as a value rather than a control while
  the catalogue has one locale, since a control with one option is a control that does nothing.
  Progress: **Delete saved game** (ruling 1), live when a save exists and disabled with its
  reason otherwise: "No saved game", or from the pause menu "You are playing the saved game.
  Quit to the title to delete it", because the game being played IS the save and the next
  accepted action would write it again. The confirm says settings stay. Fourteen catalogue
  keys, no dashes.
- **Two doors:** the Title slot, and the pause menu. Over a paused game the game stays mounted
  underneath, hidden, so the session, the selection and any queued dialog are untouched; Back
  returns to it.
- **The audit walks the four Settings states** (no save; over play; with a save, after a quit
  that keeps it; the delete confirm), and its first run over them found two defects in the walk
  itself, fixed inline and recorded in [`GATE1_AUDIT.md`](GATE1_AUDIT.md): the Title's Continue
  button could not be clicked by its exact text, and the overwrite confirm moved after the
  difficulty pick once a save survived between the passes, which share one browser profile.
  Both showed only in the per-screen counts, not the totals.
- **The run on the shipped build:** 369 controls and 936 text runs across 21 screens; every
  check 0 under both mechanisms; offline met.

**Not in this PR, by ruling 2:** text size, with the scaling mechanism and the audit's third
pass. That is PR 2.

## Piece 2, PR 2 — text size: the mechanism, the row, the audit's third pass (done, 6 September 2026)

- **The mechanism** (`applyTextSize` in `packages/app/src/settings.ts`): the chosen size written
  to the document root as a percentage, before the first paint and on every change, so every
  `rem` follows. At Standard it clears only a size it set itself, recorded in `data-text-size`,
  and leaves alone a root size something else set: the audit's FONT200 pass sets the root by
  the same inline style to model the browser preference, and an app that cleared it at every
  load would fight its own instrument. Tests both ways, including that guard.
- **The row:** Text size, four options (Standard, Large, Larger, Largest: 100 to 200 percent),
  first in Reading; the option buttons carry addresses for the drivers.
- **The audit's third pass, SIZE200,** drives the real control and checks that the option shown
  pressed, the stored value and the rendered root agree, reloads to prove persistence, then
  measures every screen under FONT200's own auditors, and ends by choosing Standard through the
  control. **Its six controls are planted on the real control**, because the failure they guard
  is a control that appears to work: Shantanu's requirement, FINDINGS #60's shape. Stored 200
  and shown pressed but rendered at 16 px is flagged; a choice that did not persist is flagged;
  the three honest states are not. All six fired the right way on the first run.
- **One more walk defect, from the per-screen list:** the inspect sheet's token door can
  resolve to a resident standing beside the token; the walk now tries every token and records
  NOT REACHED when none opens the sheet. Recorded in [`GATE1_AUDIT.md`](GATE1_AUDIT.md).
- **The run on the shipped build:** 385 controls and 966 text runs across 21 screens; 1,028
  runs scaled under FONT200 and 966 under the app's own setting across 23; every check 0 under
  all four mechanisms; every pass reached every screen; offline met at Standard.
- **Recorded as a standing rule** (`CLAUDE.md`, "How to work here"): read the instrument that
  reports coverage, not the one that reports a verdict.

**Stated, not measured:** a player who stacks Largest on the browser's own 200% reaches 400%,
beyond WCAG 1.4.4's bound; not a requirement, not audited. Settings is complete for its ruled
first set; adding a row is one entry in the table.

## Piece 3 — How to play: the prose, drafted for review (6 September 2026; nothing in the app)

[`HELP_DRAFT.md`](HELP_DRAFT.md): the ten sections on the agreed structure, as a readable
document for Shantanu and Kartik to read together, Kartik checking the science and Shantanu
how it reads on a phone. Every paragraph carries a provenance tag (the rulebook as it is, the
rulebook repunctuated because no player text carries a dash, the quick reference, text the
app already shows, or fresh), so Kartik knows which sentences are his. Help follows the app
where the app and the rulebook differ, and the differences are listed for him: resident
recall is Phase 3's and left out; the crisis pool is the content pack's nine; fever halts the
march and costs a point; degranulate's burn is stated as designed. Four points are put to him
beyond the words. The catalogue entries are cut from the settled words, not before.

**Ruled the same day** (four rulings, [`HELP_DRAFT.md`](HELP_DRAFT.md), "The rulings"): the
NK Cell's reach is 1 and the rulebook and quick reference are corrected to say so; section 9
keeps its length; the app's phase names win, which settles Infection and Command from the app
and Spread for the third, with the quick reference's March corrected; the hidden-protozoa
note stays. One premise corrected: no resident wording was changed anywhere, and the
rulebook's resident Recall stands as the table rule and Q6's target.

## Piece 3, built — How to play in the app (6 September 2026)

- **The screen** (`packages/ui/src/screens/HelpScreen.tsx`): an index of the ten sections,
  each opening as its own page with Next and All sections; Back from the index leaves Help.
  Two doors: the Title slot and the pause menu, the game kept mounted underneath as for
  Settings. Every section fits two phone screens at 360 px, held by the audit.
- **Nothing retyped that the game already knows:** the numbers a difficulty sets come from the
  content pack at render; a cell's speed likewise; section 3's example organ row is the
  inspect sheet's own composition of the Liver at 2 of 3; section 9's names and reasons are the
  event table the reveal renders; section 10 reuses the difficulty screen's descriptions. The
  words themselves are 84 catalogue entries, two of them punctuation (`help.stop`,
  `help.number`), because Hindi ends a sentence with a danda and the i18n rule was right to
  refuse a bare full stop in JSX.
- **Section 9's effect lines are pinned to the engine** (`tests/equivalence/src/help-events.test.ts`):
  each event is fired on a fresh game whose stores are filled past any cap, and what Help shows
  must state the engine's numbers and name the thing that happened; every event has a line
  and every line an event; two controls, a line with its numbers moved by one and a line
  naming the wrong effect, both caught. **Found by reading the screen, not the draft:** two of
  Kartik's reasons (Fatigue, Acute-phase surge) already state the effect in his words, so Help
  said it twice; those two Help lines are empty, the reason carries the effect, and the pin
  requires exactly those two to be the empty ones.
- **The two documents corrected in place** (`docs/Immunity_Wars_Rulebook_v3_1.docx`,
  `docs/Immunity_Wars_Quick_Reference_v3.docx`, by direct edit of their XML, since no Word
  library is installed): the NK Cell attacks within 1 step; the quick reference's third phase
  is Spread. Three replacements, each asserted to match exactly once.
- **The audit walks Help:** the index from the Title, all ten sections by Next, the index over
  the paused game. **The run on the shipped build:** 428 controls and 1,111 text runs across 33
  screens, Help's twelve among them (41 controls, 151 text runs); every check 0 under all four
  mechanisms; every pass reached every screen; offline met; 24 controls fired.

## Piece 4 — the disease library: the structure, proposed (8 September 2026; nothing built)

[`for-P2.6.md`](for-P2.6.md), PROPOSAL 3. Measured first: 106 disease records, 97 of them deck
cards across nine types, nine that arise in play from a parent, and one, Diphtheria toxin,
that nothing in the pack or the engine produces (for Kartik). No difficulty axis exists in the
data. The shape proposed: **grouped by type** in Help's order, alphabetical within, each
section header carrying the type's "beat it" line, a name filter and nine jump chips; the
derived records indented under their parents with a pinned parent table; the existing card as
the leaf. The fifteen "why it works this way" boxes as **their own section, per mechanic**,
Kartik's text unchanged except ten repunctuated, extracted into the content pack and pinned
to the rulebook document by a test, with cross-links to and from the Help sections. Five
points for ruling. Between pieces: the merged bot bumps (fast-check 4, @eslint/js 10,
@types/react-dom, puppeteer-core 25) verified green on main and the audit re-run under
puppeteer 25 with full coverage.

**Ruled the same day** (five rulings, [`for-P2.6.md`](for-P2.6.md), "The five rulings on the
library"): grouped by type; the Title door only; the index mentions Pathogen X in one line;
Diphtheria toxin kept and labelled as readable but never produced (Kartik), with the design
question underneath it recorded as his; the fifteen box titles are the builder's, sent for
Kartik to overrule.

## Piece 4, built — the disease library (8 September 2026)

- **Two content tables.** `why.json`: the rulebook's fifteen boxes, Kartik's text, ten of them
  repunctuated and nothing else changed, each naming its How to play section; **pinned word
  for word to the rulebook document** by the equivalence suite's `why-boxes.test.ts`, which
  reads the `.docx` in the repository through a small zip reader, with a control that a changed
  word fails and a control that a changed punctuation mark passes. `derived.json`: the ten
  disease records that are not deck cards, each with the parent it arises from, its type and
  how it arises; held to the deck, the disease records and the toxin makers by the content
  package's `derived.test.ts`, and to the engine by `derived-rare.test.ts`, which fires each
  rare event and requires the outcome's disease and type. The one record nothing produces is
  required to be the only such entry.
- **The screen** (`LibraryScreen.tsx`): nine groups in Help's order, alphabetical within, the
  type's "beat it" line on each header, a name filter, nine jump chips; rows carry the class
  badge in its colour and the target organs; the derived records sit indented under their
  parents with "arises from", Diphtheria toxin with "readable, but nothing in the game releases
  it"; the Pathogen X line at the foot; the existing card opens over the index. The why
  section is its own page with the fifteen entries, jump chips, and a link from each entry to
  its How to play section; each Help section links to its boxes in turn.
- **Doors:** the Title slot. From play the library is reached only through a Help section's
  "Why it works this way" link, over the paused game, and its own link leads back.
- **Records:** FINDINGS #23 carries Kartik's ruling; the queue's "not queued" list carries the
  design question; `for-P2.6.md` the rulings.
- **Two defects found on the way, both in the build, fixed before the first run:** a `$note`
  key in each new JSON tripped the pack's strict schema, since a note belongs in the schema's
  comments and not in the data; and the docx pin cannot live in the content package, whose
  test program carries no Node types on purpose, so it lives in the equivalence suite.
- **One found by the audit's first run and fixed:** 212 contrast findings, every one the class
  badge's cream text on the class's own colour, which the pack gives at 2.4:1 to 3.7:1 against
  cream. A scripted read of the rendered index had passed minutes earlier; a read checks the
  words are there, the audit checks they can be read. The badge is dark text with the colour
  as a bar beside it. Recorded in [`GATE1_AUDIT.md`](GATE1_AUDIT.md).
- **The run on the shipped build:** 712 controls and 1,965 text runs across 36 screens, the
  library's three among them (268 controls, 813 text runs); every check 0 under all four
  mechanisms; every pass reached every screen; offline met; 24 controls fired.

**The fifteen titles, the builder's labels over Kartik's text, for him to overrule any that
miss** (the catalogue's `library.why.<key>.title`):

| Box | Title |
|---|---|
| 1 | Why surviving the window is not the win |
| 2 | Why the Blood route is short |
| 3 | Why the lymphatic shortcuts join the routes they do |
| 4 | Why the Brain is so hard to defend |
| 5 | Why you start with no antibodies |
| 6 | Why worms do not multiply inside you |
| 7 | Why coating a toxin-maker stops its countdown |
| 8 | Why coating is not killing |
| 9 | Why the Helper must be primed first |
| 10 | Why the NK Cell rolls a die |
| 11 | Why the Eosinophil burns the organ it stands in |
| 12 | Why a resident never leaves its organ |
| 13 | Why malaria needs three different defences |
| 14 | Why you must vaccinate on Normal and Hard |
| 15 | Why Pathogen X takes so long to answer |

The list as sent to him, with his text under each title, is
[`WHY_BOX_TITLES.md`](WHY_BOX_TITLES.md).

**Title 11 is flagged to Kartik specifically** (Shantanu, 8 September 2026), because it is the
one title that describes a rule the engine does not yet follow. "Burns the organ it **stands
in**" is what he ruled and what the engine will do once **Q9** lands; today the burn is keyed to
the target being on a branch at any step, so a strike at step 1 of the Brain branch costs the
Brain a point while the Eosinophil is nowhere near it ([`FINDINGS.md`](FINDINGS.md) #57). The
Eosinophil's **cell card already says the same thing**, so this is not a new disagreement — it is
the same one, now in a second place. **His box text is unaffected**: "killing a parasite inside
tissue damages that tissue" is the biology Q9 exists to make the engine obey. Both texts become
true with no edit the moment Q9 lands, and the two of them are listed under Q9 in
[`ENGINE_CHANGE_QUEUE.md`](ENGINE_CHANGE_QUEUE.md) so that landing it is a one-line engine change
rather than a hunt through the catalogue.

## Piece 5 — the two instrument fixes carried forward from the #70 failures (8 September 2026)

Neither is library work; both came out of what made PR #70 red.

- **`pnpm coverage:positions`, inside `pnpm verify`** (`tools/ci/coverage-positions.ts`): the
  half of the generated coverage documents that can be checked **without running coverage**. Every
  entry records a position, and a line number is a property of everything above the arm, so any
  insertion in the instrumented sources staled the committed copies while the gate itself passed.
  Verify does not run coverage, so the class was invisible locally and red on CI. The documents
  quote the source line beside every position, so the check is a comparison they make possible
  themselves: **232 entries, three entry shapes, milliseconds.** A necessary condition and not a
  sufficient one, said in its own output. **Four controls**, two of them one edit at opposite ends
  of one file: a line prepended must go red, the same line appended must stay green.
  [`FINDINGS.md`](FINDINGS.md) #62.
- **The three older tag-stripping sites**, fixed as the fourth was and reduced to one tested
  function with a shared home. **The justification was corrected by measurement before it was
  committed:** the alert's name implies a second pass would find more, and brute force over every
  string to length 9 says the old spelling was already idempotent. The whole measured difference
  is the empty tag `<>`. Both generators re-run and byte-identical, which is what makes the change
  safe. **Then CodeQL rejected the replacement too**, and was right: the fixpoint loop that had
  been kept as belt-and-braces is a linear pass inside a loop, so it is polynomial on input
  starting with many `<`. Since the measurement had already shown the loop bought nothing, it
  went. What ships is a **scanner with no regular expression in it**, linear by construction,
  asserted equal to the single-pass regex over **every string up to length 8** on the alphabet
  that matters rather than over examples. Two claims about one four-line function, each believed
  briefly and each corrected by a check.
- **Recorded, not built** ([`for-P2.6.md`](for-P2.6.md)): `STRING_INVENTORY.md` is generated and
  carries a hand-written correction note that regeneration silently deletes.
- **The badge contrast result kept as its own instance**, at Shantanu's direction:
  [`FINDINGS.md`](FINDINGS.md) #63. A new **use** of an existing content value is a new surface,
  even when the value is unchanged and trusted everywhere it already appears.

## Piece 6 — About, the card-to-box link, and the generated-file trap closed (8 September 2026)

- **About** (`AboutScreen.tsx`), the fourth and last Title slot. `APP_FLOW.md` names it and says
  nothing about its contents, so the contents are a decision: **three of the project's hard rules
  land on this one screen**, and the credits are the README's, in the same three parts and the
  same order, because this is where a stranger forms their idea of who made this. He designed the
  game, he did not write the source, and the screen says so. Two names and one age, nothing else
  about anybody. Twenty catalogue entries, no dashes. **No version string**, deliberately: it
  would need a build identifier injected through Vite and its use is telling someone which build
  a problem came from, and there is no way to report a problem by design. That becomes worth its
  plumbing in Phase 4.
- **The card-to-box link** (ruled by Shantanu, 8 September 2026), which closes the loop from
  "what is this" to "why does the game model it that way". It also **corrected a claim in the
  library's own header**: it said none of the boxes was about a disease, and **four of them are**.
  `whyForDisease` is **derived from the pack, never assigned by hand** — worm cards, the toxin
  makers and their toxins, every malaria record, and whatever the pack marks novel — because a
  hand-written table of 106 diseases against 15 boxes would be 106 claims about biology that
  nobody checked. Eight tests, none of which lists a disease: they ask the pack and require the
  function to agree, so a card added to the deck is covered the day it is added. One control
  requires the four rules to match something and to be a strict subset, so a function returning
  every box for every disease fails rather than sails through. The play card is untouched: a door
  into the library from mid-game is a design change, and it is left for Shantanu.
- **The generated-file trap closed** ([`FINDINGS.md`](FINDINGS.md) #65). The string inventory's
  hand-typed line-number note now lives in its generator and is emitted with the document. It is
  also **computed and checked** rather than moved: the offset is derived from the script's
  position and verified against every line the document lists, and when the check fails the note
  says the mapping is not uniform instead of printing a number wrong for most of the table. The
  file has two script blocks, so one offset holding for both is a fact about its layout, not a
  law. Seven tests, four of them controls, and **both defects in the checking logic were found by
  those controls** before it landed.
- **The regex sequence recorded** ([`FINDINGS.md`](FINDINGS.md) #64), at Shantanu's direction, as
  a sequence rather than an outcome: four claims about one four-line function, each plausible,
  each killed by a check rather than by an argument.
- **The run on the shipped build:** **39 screens** per pass (41 under SIZE200), up from 36; every
  check 0 under all four mechanisms; **no screen NOT REACHED**; 24 controls all firing correctly;
  offline met. The card carrying a why link is reached by **filtering to a worm** rather than by
  hoping the first row has one, since only four boxes are disease-specific: reaching a screen by
  luck is what the inspect sheet did for two green runs.

## Piece 7 — the error boundary and the storage-failure notice, one piece (8 September 2026)

All five points of [`for-P2.6-errors.md`](for-P2.6-errors.md) ruled, and the document now carries
the leanings as leanings and the rulings as rulings, kept apart on Shantanu's instruction.

- **The boundary reloads and never writes** (rulings 1 and 2). Ruling 2 is enforced by SHAPE
  rather than by a comment: `CrashScreen` takes no storage handle, no session and no save
  callback, so nothing under it can write. The shell reads the save and passes the answer down.
  No delete button in the unreadable case either, because a save that failed to LOAD may be fine
  and the loader may be what broke.
- **Two window listeners beside the boundary**, and they are not optional: React catches render,
  lifecycle and constructors, which is **not** where this app fails. Every action is an
  `onClick`, the spread walks on a timer, `sendAction` is async. A boundary alone would catch
  nothing and look like it worked.
- **The four cases and the collapsed details line** (ruling 3), the deciding reason being
  Shantanu's rather than mine: the only bug channel this project has is a person telling us, and
  a line they can read out is the difference between "it broke" and something actionable.
- **The third arm of the subscription union** (ruling 4), `{kind: 'notice'}`. `ViewState` is
  untouched, because save health is a fact about this device and the view is what crosses a
  network in Phase 3. Five session tests, one of them the control that it does NOT fire when
  storage works, since a notice that always fired would look perfect to a fail-only test set.
- **The notice's wording checked against ruling 5's condition.** The guarantee it cannot make is
  "your game was saved up to now": it fires on the first failure the session sees, and a store
  that never worked is indistinguishable from one that broke midway. The catalogue script that
  adds the strings **fails on the phrases that would imply it** rather than leaving it to a
  reading. The probe is not built, and the caveat is recorded as framed.
- **Three boundary controls in the audit**, on a real browser rather than a DOM shim, because the
  event and promise routes are exactly what a shim models least faithfully. Two fire, one passes:
  without the passes half, a boundary that showed the crash screen unconditionally would satisfy
  both fail-controls and make the app unusable.
- **An instrument defect found by this change and fixed inline.** The crash screen's exit reloads,
  and the walk's reload **dropped the 200% root font size** the FONT200 pass had set, so
  difficulty and every screen after it were measured at 100% and reported as unscaled: nine scale
  findings, not one a product defect. The totals said `scale: 9` and named nothing. Found by
  reading the per-screen list, which is the third time that habit has paid in this sub-phase.
- **The run on the shipped build:** **41 screens** per pass, 43 under SIZE200, up from 39; every
  check 0 under all four mechanisms; no screen NOT REACHED; **27 controls** all firing correctly;
  offline met.

## Superseded — the proposal, before it was ruled

[`for-P2.6-errors.md`](for-P2.6-errors.md), PROPOSAL 4, written because Shantanu asked for the
behaviour with a game in progress to be designed rather than discovered. The measurement that
decides it: **the autosave is written on every accepted action and awaited**, so a crash cannot
lose a turn, and "offer to continue" is the honest answer. Proposed: the boundary **reloads**
rather than recovering in place, because a tree that threw is undefined and the save is current;
and it **never writes to storage**, because a crash screen that helpfully saves would overwrite
good turns with whatever was in memory. The storage-failure notice needs a seam decision, since
the session swallows save failures today and the UI cannot see them. Five points for ruling.

## Piece 8 — first-encounter hints, built (9 September 2026)

All five points ruled as proposed. [`HINT_SPLITS.md`](HINT_SPLITS.md) carries the eighteen entries
with the cut marked, for Kartik to correct; the mechanism is built against those proposals so it
is testable today, and his corrections are content edits that change no code.

- **The text is not duplicated, it is composed.** Each of the seventeen prose entries is now
  `<key>.hint` and `<key>.rest`; the hint surface renders the first, How to play renders both.
  **Sixteen of the seventeen compose byte-identically to the pre-split entry**, verified against
  git at the moment of the change. The seventeenth is the Helper, flagged in the splits document
  as needing rewriting rather than cutting: its first sentence is 170 characters and one sentence,
  so there is nowhere to cut it.
- **The inertness check was run and NOT committed**, deliberately. It is a migration check, not
  an invariant: a frozen copy of the old text kept forever would be a second copy of exactly the
  words this change exists to stop duplicating, and Kartik's first correction would put it out of
  date. What is permanent instead: every subject has both parts, no hint is empty, every hint is
  inside a length band, and **every hint ends a sentence** so it cannot dangle when shown alone.
- **The controller is pure and tested directly** (17 tests). The consumption rule is one sentence
  and it earns the most coverage: *a hint is consumed when it leaves the screen for any reason
  except being displaced by another hint.* A hint consumed too eagerly is never seen and nobody
  can tell; one consumed too lazily repeats and is reported immediately, so the silent direction
  gets the tests.
- **The store is its own key** (8 tests), and every malformed shape reads as "nothing seen" rather
  than "everything seen" — the direction that shows a hint again rather than switching the feature
  off invisibly. `KeyValueStore` gained `removeItem` so a reset REMOVES the key: a cleared device
  is then indistinguishable from a new one, with no third state to get subtly wrong.
- **Contact is derived from the selection, not intercepted at each tap handler.** The two are the
  same moment, and deriving means the four tap paths cannot drift and a fifth is covered without
  anyone remembering.
- **The Settings action row was generalised**, because the hints reset is the SECOND one and the
  first had been written straight into the renderer. That is the shape the rows table exists to
  avoid.
- **Two defects found by the audit's per-screen list, both mine, both fixed inline.** The Help
  screen's `Named` helper serves eight entries that are NOT split, and composing there rendered
  their key names, overflowing the page at 200% text: the totals said two layout findings and
  named neither screen. And the four passes share one browser profile, so a hint consumed by the
  first pass could never fire again and the other three measured a screen that was not there.
  **A hint is the one screen in this walk whose whole nature is to appear once**, which is why it
  is the one that needed the reset saying out loud, and it is now [`FINDINGS.md`](FINDINGS.md)
  **#66** in its own right rather than a fourth tick: the walk was right and the app was fine, and
  the screen was absent because the previous pass had legitimately consumed it. A third defect, in
  the walk rather than the app: an element handle held across a click detached once a tap could
  re-render the board region.
- **The run on the shipped build:** **44 screens** per pass, 46 under SIZE200, up from 41; every
  check 0 under all four mechanisms; no screen NOT REACHED; 27 controls all firing; offline met.

**Reported rather than built:** the window hint has no contact trigger. A hint fires on first
contact and the window is a number in the bar, not a thing a player touches, so under the rule as
ruled it would never fire. Three ways out are named in [`HINT_SPLITS.md`](HINT_SPLITS.md) and none
is taken.

## Superseded — the proposal, before it was ruled

[`for-P2.6-onboarding.md`](for-P2.6-onboarding.md), PROPOSAL 5, to Shantanu's direction of
8 September 2026: not a tutorial, hints on first CONTACT, resettable. Four measurements taken
before anything was proposed, two of which changed the answer. **A first turn on Training puts
seventeen things within reach of a tap** (7 cells, 7 residents, 7 organs, 1 to 2 invaders across
eight fresh games), so the set is not what breaks the no-narration constraint, the pace is; a cap
of two new hints per turn is proposed, with the alternative named rather than assumed. **No
mechanical truncation of the existing text gives a usable hint** (the first sentence fails 8 of
18, the first two fail 4 of 18, and "Never moves." is a true first sentence), so the proposal is
a third answer: the long form is **composed from** the hint, one entry split in two, and no pin
is needed because nothing is duplicated. **The settings object cannot hold the seen set** without
resetting every player's text size, since its schema pins `v: 1`. Five points for ruling.

## FOR THE CLOSEOUT — Claude Design has not been used in Phase 2, and that is not a shortfall

Recorded here so the P2.6 closeout carries it and the brief's mention does not read as an unmet
commitment (Shantanu, 9 September 2026).

[`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §5 names **Claude Design** for "exploring screens that do not
exist yet and have no prior version to copy", listing mode select, lobby, onboarding, settings and
store screenshots. **It was used at no point in Phase 2, and every screen now exists**: Settings,
How to play, the disease library, About, the crash screen and the hints all went straight into
code, each against a written structure ruled before it was built.

**The commitment was never that Claude Design would be used. It was that screens with no prior
version would be explored before being built** — and they were, in `for-P2.6.md` and its four
sibling proposals, which is the same activity in a different medium. Nothing was skipped.

**Its role is P2.7**, the polish rounds, and there it is genuinely the right tool: exploring
alternatives side by side is what it is for, and iterating one version in code is what it is not.
Gate 2 is a visual approval given explicitly, so the round that seeks it is exactly where
alternatives are worth generating rather than converged on.

## What is next

**Onboarding is DONE** (piece 8): the ruled shape was first-encounter hints, and they are built.
Shantanu's constraint is recorded because it governs anything further in this area:

> Gate 1 requires a newcomer to start and finish a game **unaided**. If onboarding does the
> teaching, the newcomer test measures the onboarding rather than the app. So the app has to be
> legible enough that onboarding is a **helpful extra rather than a prerequisite**, and
> onboarding is to be **minimal by design rather than by budget**.

The hints as built satisfy it by construction: they are not a tutorial, they do not gate play,
they never require dismissal to continue, and a player who ignores every one of them can finish a
game. The per-turn cap of two is the same constraint expressed as a number.

**What remains in P2.6:** Kartik's corrections to the eighteen splits, which are content edits;
the window hint's trigger, reported and not built; and the closeout.
