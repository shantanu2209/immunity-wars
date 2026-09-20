# Phase 2 — PAUSED, 20 September 2026. Not closed.

**Ruled by Shantanu, 20 September 2026:** *"Can we pause phase 2 at this stage, the ux is quite
acceptable at this stage. We may of course have further refinement and beautification later but it's
enough for now. Things work the way they are supposed to."*

**This document exists so that "paused" never quietly becomes "closed".** Phase 2 has a definition of
done ([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §8) and three of its items are not met. A phase that stops
without saying which ones is a phase that gets remembered as finished.

---

## What is proven

Seven of the eight definition-of-done items, each with its record:

| Item | Where |
|---|---|
| `ui` and `app` provably cannot import `engine`, and provably **may** import `content`; both controls fire | [`P2_1_CLOSEOUT.md`](P2_1_CLOSEOUT.md), [`FINDINGS.md`](FINDINGS.md) #41, #42 |
| Session, PlayerRef, Storage built; single-player goes through Session | [`P2_1_CLOSEOUT.md`](P2_1_CLOSEOUT.md), [`SEAM_DECISIONS.md`](SEAM_DECISIONS.md) |
| `Storage` serialises `GameState` and is consumed by `Session`; the round-trip asserted with a control **before** `Storage` depended on it | [`P2_1_CLOSEOUT.md`](P2_1_CLOSEOUT.md) |
| SVG board generated from `geometry.json`; no coordinate hardcoded elsewhere | [`P2_2_CLOSEOUT.md`](P2_2_CLOSEOUT.md) |
| The UI renders all player-visible text through the catalogue, with a check that fails on a hardcoded string and a control proving it fires; the 46 ambiguous strings decided | [`AMBIGUOUS_STRINGS.md`](AMBIGUOUS_STRINGS.md) |
| Art pipeline deterministic; provenance recorded for every asset | [`P2_4_CLOSEOUT.md`](P2_4_CLOSEOUT.md), [`ASSETS.md`](ASSETS.md) |
| Corpus green; the engine's behaviour unchanged and its root surface exactly legacy's 67 names | every `pnpm verify` |

**Gate 1's machine half is green** on the build this pause is taken at: 44 controls firing the right
way, 60 screens per pass (62 under SIZE200), every check 0 under all four mechanisms, nesting 33
landings 0 wrong, no page scroll at rest including at 360 × 641, offline met
([`for-P2.7.md`](for-P2.7.md) §21).

---

## What is OWED, and what each one costs to leave

### 1. The handset performance pass — the one that can bite

The budget was screened on a throttled development PC and passed at every level
([`P2_3_MEASUREMENT.md`](P2_3_MEASUREMENT.md)). **The deciding pass on a 2–3GB, ₹6–8k Android
handset has not happened**, and a pass on flagship hardware cannot substitute: the distribution
story is about the ₹7,000 device.

**The cost of leaving it, in the brief's own words (§4): locked decision #1 — Capacitor versus React
Native — goes unresolved into Phase 4**, where reversing it costs a rewrite rather than a spike.

**It does not block Phase 3**, which is why pausing here is cheap and arriving at Phase 4 without it
is not.

### 2. The newcomer test — Gate 1's one human item

A person who has never seen the game starts and finishes one unaided, on Training, a loss counting
as finishing. The protocol is written ([`NEWCOMER_TEST.md`](NEWCOMER_TEST.md)) and has not been run.

### 3. Gate 2 — visual approval

**Not given, and this pause is not it.** "The UX is quite acceptable at this stage" is a decision to
stop spending on it now; Gate 2 is a separate stated act, and the brief says so in those words
(§1). Phase 2's definition of done stays unmet until it happens.

---

## Also unfinished, smaller

- **The shorter How to play** is drafted and not shipped, awaiting Kartik's review; the app carries the
  long text. The draft is `HELP_SHORTER_DRAFT.md`, which is on PR #91 and not yet on `main` — so
  this sentence deliberately does not link it, and the link is owed once that merges.
- **The first-encounter hints and the coach have never been used by a stranger on a phone**, only
  measured. Whether the two together are too much is an open question §21 records.
- **Two surfaces still scroll** at 360 × 641: planning's list when the body is busy (352px against
  176), and the Cells view (252px against 126). Both were halved; neither was solved.
- **No Phase 2 closeout exists.** When the phase resumes, one is written in the usual discipline:
  what is proven, what is not, what the next phase inherits. This document is a pause note, not
  that closeout.

---

## What resuming looks like

Not a new sub-phase: three errands and a gate.

1. A handset, or BrowserStack's open-source programme, and the deciding measurement.
2. The newcomer test, one stranger, one Training game.
3. Kartik's Help review, then the shorter text and its illustrations in one change.
4. Then Gate 2, or another polish round and then Gate 2.

**Until all four, Phase 2 is paused and Phase 4 must not start.** Phase 3 may, and does.
