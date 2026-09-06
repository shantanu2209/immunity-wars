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
