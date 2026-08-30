# The Newcomer Test — protocol

**Status: DRAFT, awaiting Shantanu's review. DO NOT RUN A TEST UNTIL THIS IS APPROVED.**
An approved version replaces this line with the approval date.

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
- **How many: two testers minimum, recommended.** Gate 1's wording is satisfied by one
  finished unaided run, but one person is a coin with unknown bias — two independent runs cost
  one more afternoon and stop a fluke (in either direction) from deciding the gate.
  Shantanu rules on the count.
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

> "This is a game. When it asks you to choose, choose Training. Play until it tells you the
> game is over. I can't answer questions — the app has to do the explaining."

Nothing else. Not the game's subject, not what any button does, not that it is Kartik's, not
how long it takes.

**Why "choose Training" is in the script and is not a hint:** Gate 1 fixes the setting — the
test runs on Training by ruling (brief §1, review item E). Telling the tester which difficulty
to pick implements the ruling; finding the difficulty screen and everything after it is still
unaided. The alternative — saying nothing and voiding the run if they pick Hard — burns a
single-use tester on a coin flip. *(Flagged for review: if Shantanu prefers the silent
variant, this sentence comes out and a non-Training pick is recorded as "run void, tester
spent".)*

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
- The stall list, dead taps and verbatim questions are **findings regardless of outcome** —
  they are the "named specifics" Gate 2's polish rounds run on.
- **One failed run does not fail the app**, and one passed run does not exhaust the
  protocol's value; the recommendation above (two testers) is the honest minimum for a gate
  this project intends to state publicly.
- The write-up quotes outcomes in this document's terms: *"finished unaided on Training
  (lost), Tester A, [device]"* — never "usability tested" or any claim broader than the runs
  performed.

## Consent and privacy

Testers are likely minors. Parental agreement before the run; no names, contact details,
school, photographs or recordings in the repository or the write-up (`CLAUDE.md`, hard
rules). The run record uses tester labels only.
