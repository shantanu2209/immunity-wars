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

## What is next

The library, which now also carries the rulebook's "why it works this way" boxes; About; the
error boundary and the storage-failure notice; onboarding held for a direction.
