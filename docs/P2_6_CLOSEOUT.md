# P2.6 closeout — 9 September 2026

Onboarding, error states and settings; How to play, the disease library and About
([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v1.7 §2, and [`APP_FLOW.md`](APP_FLOW.md)'s Title slots).
This is the record of what P2.6 proved, what it accepted, what it did not prove, and what P2.7
inherits. Running record: [`P2_6_PROGRESS.md`](P2_6_PROGRESS.md); decisions:
[`for-P2.6.md`](for-P2.6.md), [`for-P2.6-errors.md`](for-P2.6-errors.md),
[`for-P2.6-onboarding.md`](for-P2.6-onboarding.md); the splits sent to Kartik:
[`HINT_SPLITS.md`](HINT_SPLITS.md); the Gate 1 instrument: [`GATE1_AUDIT.md`](GATE1_AUDIT.md).

## Proven

- **All four Title slots exist and are walked:** How to play (ten sections), the disease library
  (106 records, the fifteen why boxes, the card over the index), Settings (text size, language,
  delete saved game, reset hints), About.
- **The two text-at-200% mechanisms are both audited**, which is the gap P2.5 handed over:
  **FONT200** (the browser default-font-size preference) and **ZOOM200** (Chrome for Android's
  page zoom, at 180 px), each named for what it models, plus **SIZE200**, which drives the app's
  own text-size control and checks the option shown, the value stored and the size rendered all
  agree, then that a reload keeps them.
- **Text scaling as a shipped feature**: four sizes, written to the document root before first
  paint, clearing only what it set.
- **The engine unchanged in behaviour and root surface**, with one addition on the seam rather
  than in it: `SessionEvent` gained a third arm, `notice`. The corpus is green throughout.
- **Save health is visible to the player.** A failed autosave was swallowed; it now reaches the
  UI once, and the notice is worded so it cannot imply a guarantee it cannot make.
- **The app survives a crash with the game intact:** an error boundary plus two window listeners,
  four cases, every exit a reload, and **no path from the crash screen to a write**.
- **First-encounter hints**, on first contact, capped at two per turn, one on screen, the
  displaced one not consumed, resettable from Settings.
- **The per-thing text has exactly one copy.** Each entry is a hint and a rest; the hint surface
  renders the first, How to play renders both. Sixteen of the seventeen compose byte-identically
  to the pre-split entry, verified against git at the moment of the split.
- **Gate 1's machine-checkable half on the shipped web build, the final run: 44 screens per
  pass** (46 under SIZE200), **843 controls**, **2,243 text runs**; touch 0, contrast 0,
  non-text 0, scale 0, layout 0 under all four mechanisms; **no screen NOT REACHED**;
  **27 controls all firing correctly**; offline met, including a reload with no network and a
  full turn played.
- **The two documents corrected in place** where they and the app disagreed: the NK Cell's reach
  is 1, and the quick reference's third phase is Spread.

## Accepted, not verified by finger

- **Every P2.6 screen is headless-audited and none has been used on the S25.** Settings, How to
  play, the library, About, the crash screen and the hints were all built and measured after the
  last phone pass. The audit covers touch size, contrast, scaling and layout; it does not cover
  whether the hint's placement reads well under a thumb, or whether the library's index is
  pleasant to scroll at 106 rows.
- **The crash screen has never been seen by a person in a real crash.** It is reached in the
  audit by dispatching the events the boundary listens for, and by three deliberate-throw
  controls in the dev shell. That is the boundary proven, not the experience.
- **The storage-failure notice has never fired on a real device.** Its five tests drive a storage
  that refuses every write.

## Not proven, stated plainly

- **Kartik has not yet corrected the splits.** All seventeen are approved by Shantanu, including
  the Helper's rewrite, and the mechanism is built against them. His corrections remain content
  edits that change no code. **The Helper's entry is the one place where How to play's words
  changed**, and that is recorded rather than absorbed.
- **The newcomer test.** Protocol approved; no testers. It lands against this closeout when they
  exist. P2.6 is the sub-phase most likely to be reordered by it, because the hints and How to
  play are exactly what it measures.
- **The performance budget on real low-end hardware.** Unchanged from P2.5 and still unmeasured;
  **locked decision #1 goes unresolved into Phase 4** in those words. Nothing in P2.6 improved
  or worsened it, and nothing in P2.6 measured it.
- **Offline on the Android build**, and **the handset pass** — passing THROUGH P2.6 to Phase 4 by
  ruling, not P2.6's to close.
- **Gate 2.** Not sought. P2.7's.

## Claude Design was not used, and that is not a shortfall

[`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §5 names Claude Design for "exploring screens that do not
exist yet and have no prior version to copy", listing onboarding and settings among them. **It
was used at no point in Phase 2, and every screen now exists.**

**The commitment was not that the tool would be used. It was that screens with no prior version
would be EXPLORED before being built** — and they were, in five written proposals ruled before
any code: the Help structure, the Settings layout, the library, the error boundary, the hints.
Nothing was skipped; the exploration happened in prose rather than in mockups.

**Its role is P2.7**, and there it is the right instrument: Gate 2 is a visual approval given
explicitly, and the round that seeks it is exactly where generating alternatives side by side
beats iterating one version in code (Shantanu, 9 September 2026).

## What P2.7 inherits

- **Gate 2**, and the two-polish-round shape the brief describes, with named specifics rather
  than a verdict at the end of each round.
- **Every P2.6 screen unseen on a phone**, listed above. The first S25 pass of P2.7 is the
  cheapest place to find what the audit cannot.
- **Kartik's corrections to the seventeen splits**, as content edits.
- **The instruments, each with its controls as its warrant:** `pnpm gate1:audit` (four passes,
  27 controls), `pnpm coverage:positions` (four controls), the hint controller and store suites,
  `why-boxes.test.ts` pinning the fifteen boxes to the rulebook document, `derived-rare.test.ts`
  pinning the derived records to the engine, `help-events.test.ts` pinning the crisis lines.
- **Three things reported and not built**, each with its reasoning recorded rather than its
  absence: the startup storage probe (ruling 5 of the error proposal), the Diphtheria toxin
  producer design question (Kartik's, in the queue's not-queued list), and the string inventory's
  `--check` mode being wired into nothing.
- **Nothing owed to onboarding.** The ruled shape was first-encounter hints and they are built.

## Lessons this sub-phase paid for

**Four times, a green total hid an unmeasured screen, and the per-screen list found every one.**
Three were screens the walk failed to reach. The fourth is different enough to have its own
entry ([`FINDINGS.md`](FINDINGS.md) #66): the walk was right, the app was fine, and the screen
was absent because an earlier pass had **legitimately consumed** it. There was no defect anywhere
to find. What carries forward is a question rather than a rule, now in `CLAUDE.md`: **does this
screen consume something when it is shown?**

**A pin exists because two things could drift. Where the second thing can be removed instead,
remove it.** The hints could have been a shorter copy of the Help text held equal by a test; they
are the first part of it instead, so there is one copy and nothing to pin. The same instinct, one
level up, is why the inertness check of the split was run and deliberately not committed: a frozen
copy of the old text would have been a second copy of exactly the words the change existed to stop
duplicating.

**Four claims about one four-line function, each plausible, each killed by a check rather than an
argument** ([`FINDINGS.md`](FINDINGS.md) #64). The standing rule says a check that has never
failed is not known to work; that sub-phase pointed it at reasoning instead of at instruments and
it held there too.

**A new USE of an existing content value is a new surface** ([`FINDINGS.md`](FINDINGS.md) #63).
The class colours had been trusted for months as fills; the first time text sat on one, 212
contrast findings. Reviewing the value would have told you nothing, because the value is not what
changed.
