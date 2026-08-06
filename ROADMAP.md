# The Immunity Wars — Roadmap

**Last updated:** 5 August 2026
Where the project is going, what each stage produces, and how you know it is finished.

---

## The shape of it

Six phases. Phase 1 changes nothing a player can see and is the reason the other five are
affordable. Each phase ends with something you can hold, open, or install.

```
Phase 1  Foundations ─────────── in progress (A, B done)
Phase 2  The app people see
Phase 3  Playing together
Phase 4  Android
Phase 5  iOS
Phase 6  The classroom layer
         ↓
         Release
         ↓
         What comes after
```

---

## Phase 1 — Foundations

**Goal:** replace the ground the game stands on without moving the game.

| Task | One line | Done when |
|---|---|---|
| **A** ✅ | Build the empty workshop — repo, toolchain, scaffold | Every guard proven to fire by deliberately breaking it |
| **B** ✅ | Port the rules engine to TypeScript, prove it identical | 6,000 games, 0 divergences |
| **C** | Lift data out of code into validated content packs; extract all text for translation | Every table behind a schema; every player-visible string in a catalogue |
| **D** | Build the seven test suites, including property tests that attack invariants | 10,000+ random games with no invariant violated |
| **E** | Measure what the engine actually does | State size and balance metrics reported, with variance |
| **F** | Turn on CI; publish a live test dashboard | A URL you can open on your phone showing green |
| **G** | Prove it end-to-end | One file, opened on the iPad, plays identically to today |

**What you get:** nothing visibly different, and a codebase where a mistake announces itself
instead of waiting to be discovered.

**Coverage gate:** met at 95.46% of coverable arms, with exclusions enumerated and self-policing.
Two deferred lists carry into Phases 2 and 3.

---

## Phase 2 — The app people see

**Goal:** stop being a browser page and become an application.

- UI rebuilt in React; the board becomes SVG generated from the geometry content pack, so
  one source drives screen **and** printed board
- Mobile-first, built for a 360px screen and a thumb, not a mouse
- The screens an exhibition demo never needed: first-run tutorial, mode select, settings,
  offline and error states, empty states
- Art pipeline: deterministic icon normalisation, WebP, consistent contrast
- **The performance spike** — full board, worst case, in a WebView on a ₹6–8k Android phone

**The one measurement that could reopen a locked decision.** If the WebView fails the budget,
Capacitor is out and React Native comes back on the table. Everything downstream depends on it,
which is why it happens early.

**What you get:** something a stranger can install and understand without Kartik standing beside
them. That last part is the real work — at Hyderabad, a human explained the game.

---

## Phase 3 — Playing together

**Goal:** two people in different cities play the same game.

- Multi-room relay replacing the single-room LAN server
- Private rooms by invite code. **No strangers, no public matchmaking** — that decision holds
- Reconnection, and AI takeover when someone drops mid-game
- Protocol versioning so an old client can never desynchronise a new server
- The measured decision from Task E: full-state broadcast or deltas
- **Multiplayer test coverage** — Task B's corpus was single-player and this is a known gap

**What you get:** a game you can play with a cousin in another city.

---

## Phase 4 — Android

**Goal:** an installable app in the Play Store.

- Capacitor packaging, signing, store listing, screenshots
- Offline-first: the entire game bundled, playable with no connection
- Play Console setup (~₹2,000 one-time) and the closed-testing period new accounts require

**What you get:** a real app. This is the first release most people will ever see.

---

## Phase 5 — iOS

Same build, different shell. Requires a Mac (or a cloud Mac) and the Apple developer programme
at roughly ₹8,700/year — which is why it comes after Android rather than beside it.

---

## Phase 6 — The classroom layer

**Goal:** the thing the whole project was for.

- Teacher mode: set up a class, run a session, no accounts for children
- Hindi edition, then regional languages — the string catalogues from Task C are what make this
  a translation job rather than a rebuild
- Printable pack: board, cards, tokens, rulebook, generated from the same content packs
- Learning-evidence collection that is anonymous, aggregate and teacher-mediated — **no personal
  data from children, by design**

**What you get:** something a school with no budget and no reliable internet can actually use.

---

## Release

The first public release is the end of Phase 4 — Android, offline, single-player and private
multiplayer, in English. Everything after that is addition, not completion.

**Before release, three things must be settled:**

1. **Art provenance.** What the AI tool's terms permit for redistribution. Until then the game
   content stays unlicensed and unpublished.
2. **Content licence.** CC BY-SA 4.0 is the intent, pending (1).
3. **Store compliance.** Play Families policy and Apple's Kids Category both have specific
   requirements for apps used by children.

---

## What comes after

Not planned in detail, deliberately. Roughly in order of how much they'd matter:

**Depth.** The design problem Kartik identified himself in July and the bot confirmed in August:
skilled players win essentially every game on Normal. That isn't a difficulty problem and no AP
tuning fixes it. It needs asymmetric roles, crisis events with real trade-offs, and games that
do not unfold the same way twice.

**A competent bot.** Currently plays ~6 of 14 seats and never uses 8 of 27 actions. Dual-use:
it is both the instrument that can measure balance and the AI that fills an empty seat when a
player drops.

**Tier-2 expansion.** 6–8 players, coordination-requiring parasites, malaria staging. Built as a
content pack, which is what Task C makes possible.

**The AI tutor.** Curated retrieval first — offline, free, and accurate, which matters more than
cleverness when a child asks an immunology question. An on-device or cloud model later, tiered,
possibly paid.

**Sustainability.** If it ever needs to fund itself: sold to schools and adults, never an
in-app purchase tapped by a child. The child-facing app stays free and collects no data.

**Public matchmaking.** Deliberately shelved. It would need legal review, a moderation plan, and
ongoing cost. Revisit only if there is real demand and real capacity.

---

## Honest timing

This is a father-and-son project running alongside school and work, so ranges rather than dates:

| | |
|---|---|
| Phase 1 | Weeks. A and B took two sessions each; C–G are smaller |
| Phase 2 | The longest phase. A UI is more work than an engine |
| Phase 3 | Weeks |
| Phase 4 | Weeks, plus a fixed testing period imposed by the Play Store |
| Phase 5 | Short, gated on hardware and the Apple fee |
| Phase 6 | Open-ended — it grows with schools using it |

**The thing that would most change this timeline** is the Phase 2 performance spike. Everything
else is work; that is a decision waiting on a measurement.
