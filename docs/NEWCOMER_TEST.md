# The Newcomer Test — protocol

**Status: APPROVED by Shantanu, 30 August 2026**, with two amendments applied in place and
marked below: the difficulty choice is **unaided** (the reviewed draft's "choose Training"
came out of the script — the ruling is recorded at the script), and the two testers run
**staggered**, not in parallel. Everything else stands as reviewed.

**NOT READY TO RUN — 4 September 2026, from the S25 touch pass.** Only `move` and `engulf`
exist as touch actions; a newcomer cannot finish a game by touch. The readiness bar is stated
in the pre-test section below, and the test moves after the panels/command-surface work.

---

## What this is, and why it is written down before anyone runs it

Gate 1 carries one item that is human-tested by design ([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md)
§1): *a person who has never seen the game can start and finish a game unaided, on Training —
a loss counts as finishing.* What is being tested is whether the **app** can be navigated to a
conclusion, not whether the newcomer is any good at the game.

The protocol exists for the same reason the balance bands were defined before the number
existed ([`FINDINGS.md`](FINDINGS.md) #34): **a test run badly gives a confident wrong answer.**
A helped newcomer who finishes proves nothing; a stalled newcomer rescued at the first
hesitation proves nothing; and both produce the sentence "a newcomer finished the game", which
would then be defended to a judge. The rules below are what make the sentence true when it is
said.

It also has one demonstrated justification already: the minimum-shell walkthrough — one person
walking the app like a player — found a bug no instrument had found or could have found
([`FINDINGS.md`](FINDINGS.md) #50, the autosave that was never called). Walking the player's
path checks the joins nobody thought to instrument. This test is that, formalised.

## Who

- **Someone who has never seen the game.** Never played the board game, never watched Kartik
  demo it, never had the rules described to them, never seen this app. Prior exposure
  discovered after the run voids the run.
- Kartik and Shantanu are disqualified, as is anyone in the household.
- **Age:** any never-seen person satisfies Gate 1's wording. The most honest tester is in the
  game's own audience — a bright 12–15-year-old — because the app is meant to teach exactly
  that person. Recommendation: at least one tester from that group.
- **How many: two testers, STAGGERED — ruled 30 August 2026.** Run one, learn, fix the
  obvious breakages, run the second on the fixed build. Two testers on the same build mostly
  find the same top-level problem twice, and testers are single-use, so parallel runs spend
  the scarce resource on duplicate information.
- **Each tester is single-use.** A person who has run once is no longer a newcomer; after
  fixes, the re-test needs a fresh tester. Recruit accordingly.

## Device and setup

- **A phone, portrait.** Not a desktop, not a tablet. Record the exact model and browser.
  The 2–3GB handset is the ideal instrument if it exists by then; Shantanu's S25 is
  acceptable for THIS test because this test measures navigability, not performance — but the
  run must then not be quoted as evidence about low-end hardware.
- **Fresh state:** a browser profile (or cleared site data) with **no autosave present**, so
  the Title shows exactly what a stranger sees — no Continue button.
- **Online or offline:** either, but record which. (Offline capability is a separate Gate 1
  item; do not conflate the two by treating this run as its evidence.)
- The **app entry** (`index.html`), never the dev shell.

## The script — everything the tester is told, in full

> "This is a game. Play until it tells you the game is over. I can't answer questions — the
> app has to do the explaining."

Nothing else. Not the game's subject, not what any button does, not which difficulty to pick,
not that it is Kartik's, not how long it takes.

> ⚠️ **Amended by ruling, 30 August 2026.** The reviewed draft's script included "when it
> asks you to choose, choose Training", argued as implementing Gate 1's setting rather than
> hinting. **Overruled: the difficulty screen is one of the screens under test, and telling
> someone which button to press on a screen under test means that screen is not tested.**
> "Can a newcomer tell which difficulty to start with?" is a real usability question with a
> real answer in the interface. So the interface carries the guidance the script was
> carrying — Training is marked **"Recommended for your first game"** on the difficulty
> screen — and the test now tells us whether that works. **A tester who picks Hard and loses
> in eight turns is a FINDING, not a wasted run:** the screen failed to communicate where to
> start. That is worth more than the run the instruction would have bought.

## What the observer does

- Stays where the screen is visible and **says nothing**. Not beside them offering presence,
  not narrating, not reacting audibly to mistakes.
- If asked anything, one fixed deflection, every time: **"The app has to answer that — I
  can't."** Then records the question verbatim.
- Records observations **during the run**, not reconstructed afterwards.
- Never touches the device.

## What is recorded, per tester

1. Tester label (e.g. "Tester A"), age bracket, relationship distance ("classmate", "cousin")
   — **no names; this repository is public.**
2. Device model, browser, online/offline.
3. Start and end time.
4. **Outcome: finished (won / lost) or abandoned (at which screen, doing what).** A loss is a
   finish. Quitting to the title and stopping is an abandonment, not a finish.
5. Every stall of roughly 30 seconds or more: which screen, what they appeared to be trying
   to do, how it resolved.
6. Every tap that visibly expected a response and got none, and every control they tried that
   did nothing.
7. Every question asked, verbatim, with where in the game they asked it.
8. Anything they figured out visibly late (e.g. discovered the inspect sheet at turn 9).
9. Any bug encountered — a bug that blocks progress voids the run *as a usability datum* and
   files as a defect; the tester is still spent.

## What is NOT done, ever, during a run

- No hints, no explanation, before or during — including tone-of-voice and pointing.
- No answering questions beyond the fixed deflection.
- No rescuing a stall. A stall that never resolves becomes an abandonment, which is a result.
- No touching the device, no restarting the app for them.
- No recording of the person. Screen capture only if the tester (and for a minor, their
  parent) agrees; the capture stays off the repository.

## What invalidates a run

Any hint or answered question · observer touched the device · prior exposure discovered ·
a blocking bug · the dev shell was used · the state was not fresh. An invalidated run is
recorded as invalidated, with the reason — it is never quietly rerun with the same tester.

## Reading the result

- **Pass, for Gate 1:** the tester reached the Result screen unaided. A loss counts.
  Choosing a difficulty is part of "starting unaided". Training is the *expected* setting —
  the recommendation on the difficulty screen should produce it, and whether it does is
  itself under test. A tester who finishes unaided on another difficulty has demonstrated
  the capability the gate names; the recommendation's failure to steer them is recorded as a
  finding about the screen, not a defect in the run.
- The stall list, dead taps and verbatim questions are **findings regardless of outcome** —
  they are the "named specifics" Gate 2's polish rounds run on.
- **One failed run does not fail the app**, and one passed run does not exhaust the
  protocol's value; the staggered two-tester shape above is the ruled minimum for a gate
  this project intends to state publicly.
- The write-up quotes outcomes in this document's terms: *"finished unaided on Training
  (lost), Tester A, [device]"* — never "usability tested" or any claim broader than the runs
  performed.

## Consent and privacy

Testers are likely minors. Parental agreement before the run; no names, contact details,
school, photographs or recordings in the repository or the write-up (`CLAUDE.md`, hard
rules). The run record uses tester labels only.

---

## Pre-test readiness — the day-of checklist

*Added 31 August 2026. Operational, not protocol: nothing below changes a ruling. The aim is
to spend the single-use tester on what we do NOT know — anything on this list found broken on
the day is a free fix, not a finding.*

### The readiness bar (ruled 4 September 2026)

**A full game playable to a conclusion by touch, in the app shell, with no dev-shell controls
involved.** Every player action the engine accepts in single-player must be reachable by touch — nineteen actions plus undo and the turn controls (the list is in `P2_5_PROGRESS.md`; the engine also names `activate`, a stub that always rejects). As of
4 September, `move` and `engulf` are the only two built. Until the bar is met, running the
test spends a single-use tester on a gap already known, which is the one thing the protocol
exists to prevent.

### Known gaps to settle BEFORE tester one (each is cheap; rulings where marked)

- [x] **Shantanu plays by touch on the S25** — DONE 4 September 2026: runs, playable, the goal
      dialog, reveal, spread and tap-to-advance all work with a finger. Found the command
      surface incomplete — the pass did its job. (The item below is the original; kept so the
      date is visible.)

- [x] **The goal is stated nowhere in the UI** — was the one known gap most likely to
      dominate the run. **DONE, 31 Aug 2026:** the goal dialog opens every new game through
      the dialog queue, wording approved as written, turn numbers interpolated per difficulty
      (P2.5 piece 3c). The full log panel stays later work. Test expectations for it are
      stated in `P2_5_PROGRESS.md`.
- [ ] **Shantanu plays 2–3 full turns BY TOUCH on the S25 first.** He is disqualified as a
      tester, so this spends nothing — but any purely mechanical trip (a target too small to
      hit, a tap that misfires, the spread unreadable on a real screen) that HE hits is a
      free fix. Tap-to-advance in particular has only been exercised with synthetic events
      and a mouse; one finger on one real spread settles it.
- [ ] **Missing-key sweep on the build being tested.** Title → difficulty → play → reveal →
      command → spread → pause: no ⟪…⟫ marker anywhere. (Swept clean on the dev build,
      31 Aug 2026 — re-check on the built artefact on the day.)

### The build, on the day

- [ ] **Production build, not the dev server:** `pnpm build`, serve `packages/app/dist` over
      the LAN, open **`index.html`'s page** on the phone — never `/dev.html`.
- [ ] Art and fonts confirmed on the phone: board icons render (they ship in `dist` from
      `public/`), Nunito loads, no console errors.
- [ ] One full turn played on the phone by Shantanu — draw, reveal, command, spread with
      tap-to-advance — before handing anything to a tester.
- [ ] **Fresh state:** clear site data for the origin (or a fresh browser profile) so the
      Title shows no Continue. Verify it actually shows none.
- [ ] Record device model, browser, online/offline — the protocol's own fields.

### Have ready

- [ ] The recording sheet, matching "What is recorded" above (stalls ≥30s, dead taps,
      verbatim questions, timestamps, outcome).
- [ ] Parental agreement done before the day.
- [ ] The fixed deflection, verbatim: *"The app has to answer that — I can't."*
- [ ] Time budget: an idle loss can end by turn ~6, but a tester who engages runs long —
      hold an hour, and do not schedule anything that pressures an abandonment.

### Expected behaviour worth knowing (not defects)

- If the phone is locked or the app backgrounded mid-spread, the burst pauses and resumes on
  foreground; taps still advance it. Known and verified (for-P2.5.md) — do not treat it as a
  crash on the day, and record it if the tester encounters it.
- After turn 15, a draw can announce nothing (no new infections arrive in mop-up). Mechanically
  fine; if the tester visibly expects a card and stalls, that is a finding to record.
