# Phase 2 — closeout

**Objective, from [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §0:** *"Replace the renderer. The game becomes
a mobile-first application a stranger can install, understand and finish without anyone standing
next to them."* And from v2.0, when the phase resumed on 1 October 2026: the look of the best modern
mobile games, on modern phones only, before Phase 4.

**Status: WRITTEN, NOT YET ACCEPTED.** Written 25 November 2026, on `main` at `c2058e8`, the build
deployed that evening. It is put to Shantanu with the decisions in §4. Gate 2 was given the same
day (*"the approval is for everything gate 2 related"*), before he had played the last of the
polish, which he is playing on the live web app; what that play finds is made before this is
accepted.

**Three items of the definition of done are not met as written,** and each is named here first:

- **The newcomer test,** Gate 1's one human item: **deferred indefinitely by ruling, not met**
  (2 October 2026). Nobody who has never seen the game has been watched starting and finishing one.
- **The deciding performance measurement:** the play screen holds 60 frames a second on the S25 in
  a Chrome tab, and a first reading inside the Android app gave 120. **The measurement the plan's
  last stage takes inside the app, which confirms Capacitor against React Native, has not been
  taken.** Unless it is taken before this is accepted (§4, decision 1), **locked decision #1 goes
  unresolved into Phase 4**, in the brief's own words.
- **"The engine's behaviour is unchanged":** it changed five times in Phase 2, each by ruling
  (queue Q12 to Q16, rules 4.1.1 to 4.2.0), each measured against the original as ruled. Its root
  surface is still exactly legacy's 67 names.

---

## 1. What Phase 2 delivered

| Stage | Delivered | Record |
|---|---|---|
| **P2.1** The seams and the rule | `Session`, `PlayerRef` and `Storage`; `ui` and `app` cannot import the engine and may import content, both proven by controls; the view scoped to the selection; the `GameState` round trip asserted before `Storage` relied on it | [`P2_1_CLOSEOUT.md`](P2_1_CLOSEOUT.md) |
| **P2.2, P2.3** The slice, the screening | The first board drawn from `geometry.json`; vitest 2 to 4; the screening budget passed at every throttle on the PC | [`P2_2_CLOSEOUT.md`](P2_2_CLOSEOUT.md), [`P2_3_MEASUREMENT.md`](P2_3_MEASUREMENT.md) |
| **P2.4 to P2.6** The first screens | The first art pipeline; every screen; all player text through the catalogue, with a rule that fails on text written into a component | [`P2_4_CLOSEOUT.md`](P2_4_CLOSEOUT.md), [`P2_5_CLOSEOUT.md`](P2_5_CLOSEOUT.md), [`P2_6_CLOSEOUT.md`](P2_6_CLOSEOUT.md) |
| **Paused**, 20 September | P2.7's polish stopped partway; three items owed | [`PHASE2_PAUSE.md`](PHASE2_PAUSE.md) |
| **L1 to L4** The look, 1 October | Clay picked from three style frames; the board drawn as Blender's pictures on the page, measured three ways on the S25; the kit approved on his phone; the play screen, measured at 60 frames a second on the S25 | [`LOOK_PLAN.md`](LOOK_PLAN.md) §11 to §14, [`LOOK_L2_MEASUREMENT.md`](LOOK_L2_MEASUREMENT.md), [`LOOK_L4_MEASUREMENT.md`](LOOK_L4_MEASUREMENT.md) |
| **L5** Every other screen, in Clay | The title, the difficulties, the cards, planning, the result, How to play, the library, Settings, About, the lobby | §15 |
| **L6** Easy, and the guided game | Training called Easy; the lesson written and held to the engine, then cut into seven chapters to choose from (69 cards); the table of every difference between the difficulties, held to the engine | §16 to §20, §28, §29 |
| **The engine, by ruling** | Q12 to Q16: Easy, written first turns, *coat*, Diphtheria and Anthrax as bacteria that release toxins, a hidden pathogen. The printed rulebook brought to the game | §16, §19, §20, §22, §23; [`DEVIATIONS.md`](DEVIATIONS.md) #12 to #16 |
| **The Android app** | The Capacitor shell; the closed test from 3 October; **released on Google Play on 20 October**, version 0.9, in every country Play offers | §26, §31 |
| **Keeping copies current** | The web app finds its own updates; About names the version; saved games carry their rules version | §27, §28 |
| **The Hindi edition** | Every screen, the engine's sentences, the names and the library in Hindi, chosen in Settings; its own face, bundled | §32, §34 |
| **Gate 2's polish** | The four pieces: a card opens its full card; the screens that fit one screen; planning folded away when playing alone; the small things | §33, §37 |
| **Accessibility** | A standing check that colour holds for every kind of colour vision; screen reader support in three parts | §35, §36, §38, §39 |
| **Gate 2** | Given, 25 November 2026 | §37; brief v2.5 |

**Instruments built on the way**, each with controls that fire:

- **The Gate 1 audit, re-aimed at Clay**, its checks reading what only a screen reader sees.
- **`pnpm art:clay:check`:** every picture held to its contrast bound and, now, to colour vision.
- **`pnpm guide:walk`:** the lesson, pressed only where it is lit, in English and Hindi.
- **`pnpm sr:walk`:** the app played by Chrome's accessibility tree alone.
- **The lesson's own test,** and the table of differences held to the engine on each difficulty.
- **The measuring page,** `/measure.html`, which counts a real game's frames on a phone.
- **The full self-test, every night,** on GitHub's runner (`.github/workflows/selftest.yml`).

---

## 2. Definition of done, item by item

From [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §8.

| # | Item | Verdict |
|---|---|---|
| 1 | **Gate 1: every capability item verified, including contrast and 200% text** | **NOT fully met.** Seven of its eight items are measured, on the closing build (below). **The newcomer test is deferred indefinitely, not met** |
| 2 | **Gate 2: visual approval, stated by Shantanu** | **MET,** 25 November 2026: *"the approval is for everything gate 2 related"* |
| 3 | **The performance budget on real hardware, or the shortfall stated plainly** | **NOT fully met.** The hardware is the S25 alone, by ruling (v2.0). In a Chrome tab: 6 of 2,324 frames missed one refresh, at 60 a second. Inside the Android app: a first reading only, 120 a second. **Stage L7's measurement inside the app has not been taken;** the meter cannot yet count a missed refresh at 120 (`TODO.md` row 11). The tap on the phone was waived at L2, not met. Below, and §4 |
| 4 | **`ui` and `app` cannot import `engine`, and may import `content`; both controls fire** | **MET.** In every `pnpm verify` (`pnpm boundaries`), with controls both ways in the self-test: `boundaries-ui-engine-bare` must fail and `boundaries-ui-content-permitted` must pass |
| 5 | **`Session`, `PlayerRef`, `Storage` built; single player through `Session`** | **MET.** `Session` has two implementations since Phase 3; a game on rails for the lesson goes through it too |
| 6 | **`Storage` serialises `GameState`, consumed by `Session`; the round trip asserted with a control before `Storage` depended on it** | **MET** at P2.1. Since 5 October a save also carries the rules version that wrote it, and one from a newer version is not continued |
| 7 | **The board generated from `geometry.json`; no coordinate written anywhere else** | **MET, in a new form.** The board is no longer an SVG: by ruling at L2 it is Blender's pictures on the page. Blender reads `geometry.json`, and the page lays the pieces out from it; a test holds the two to each other (`clay-page-and-blender-agree`, `clay-board-read-where-geometry-says`). **One drawn size differs:** the bloodstream's dish is 53 units across, the print's 50.3. **The printed A2 board does not agree with the app's** ([`FINDINGS.md`](FINDINGS.md) #49), which he ruled is not a priority unless it is printed again (`TODO.md` row 3) |
| 8 | **All player text through the catalogue, with a check that fails on a hardcoded string; the 46 ambiguous strings decided** | **MET,** 6 September 2026, and held since. Both catalogues are held whole against each other |
| 9 | **The art pipeline deterministic; provenance recorded for every asset** | **MET.** `pnpm art:clay:check` re-measures every committed render and requires the output to be what the renders make, on any machine. Every file's origin is a row of [`ASSETS.md`](ASSETS.md). Of what the app ships, three files are not made here: the app's icon, generated with OpenAI's image model through Codex; and two faces under the Open Font License, Nunito and Noto Sans Devanagari. **Not held:** that Blender renders the same pictures again from the scripts |
| 10 | **Corpus green; the engine's behaviour unchanged and its root surface exactly legacy's 67 names** | **NOT met as written, by ruling.** Q12 to Q16 changed it, each made twice, in the port and as an edit to the original applied in memory, so that the corpus compares the port with the original as ruled; green in every `pnpm verify` and in CI. The root surface is legacy's 67 names and the one documented exemption (`exports.test.ts`) |
| 11 | **A Phase 2 closeout in the same discipline** | This document |

### Gate 1, item by item

Measured by the Gate 1 audit, alone and together, on the closing build, 25 November 2026, in
headless Chrome on the PC: 82 screens in each of the four passes (84 in one), a game played together as captain and as guest among them; every check at zero over 1,081 controls and 2,448 text runs, the name check over 1,733 controls, pictures and dialogs; 62 controls of the audit's own, each as it must be. **Not reached, each by the dice, and each measured clean in the other three passes:** at 200% text, a place tapped on the Body tile's figure and its card; at 200% page zoom, a cell's card from a tapped step, a row's several targets, and the Result with its two screens, the idle game not being lost in 14 turns.

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Fully playable on a 360 px screen, portrait | **Met** | Every screen of the audit's four passes is measured at 360 px, or its 180 px under page zoom; the play area one height on 39 screens across its four stages; no scroll at rest on 20, measured at 360 by 641, his Chrome tab's size |
| 2 | Every control reachable by touch; targets at least 44 px | **Met** | No control under 44 px on any screen measured, at rest and at 200% |
| 3 | **A newcomer starts and finishes a game unaided** | **Deferred indefinitely, not met** | Ruled 2 October 2026. The protocol, [`NEWCOMER_TEST.md`](NEWCOMER_TEST.md), predates the guided game and would need re-aiming |
| 4 | No unreachable state: no dead end, no control that does nothing, no screen without an exit | **Met, as measured** | 38 ways back from a screen, none wrong; every action offered only where the engine accepts it (P2.5's harness, and `moves-are-one-list`) |
| 5 | Works offline, fully | **Met on the web** | With the network cut, the app came back and a turn was played, with no request failed. The Android app carries every file inside it; offline was not checked on the phone |
| 6 | Text to 200% without loss | **Met** | Every check at zero under each of the three ways the text is doubled: the browser's font size, page zoom, and the game's own text size; the seven screens required to fit one screen each fit |
| 7 | Contrast: text 4.5:1, large text and meaningful graphics 3:1 | **Met** | No text or control below its bound on any screen measured; every Clay picture held to 3:1 against the board by `pnpm art:clay:check`; the kit's colour pairings held by its own test |
| 8 | The performance budget | **Met in a tab; not confirmed in the app** | Item 3 above |

---

## 3. What Phase 2 does NOT prove

| Not proven | Why, and where |
|---|---|
| **That a stranger can learn the game** | The newcomer test is deferred. The closed test's players said the game was too hard to understand (§28); the chapters and the why of each beat were built from that, and **nobody new has been watched since** |
| **Anything about phones other than the S25** | The one device measured, by ruling. Low-end phones are out of scope; how it runs on anything slower is unknown. Since the look, an iPhone was seen showing the title and About in Chrome (§27), and nothing more was checked there |
| **120 frames a second** | One first reading inside the app, on the screens before his review |
| **The tap on a phone** | The 100 ms line was waived at L2 and never read on the S25 |
| **The Android app offline, or its update link** | Offline is the web's, measured; the app's link to Google Play is Capacitor's documented behaviour, not watched (`TODO.md` row 8) |
| **The Hindi** | He ruled the strings to stand; whether each was read is not recorded. Six of the engine's lines still carry an English fragment. The glossary is content no screen draws. The audit is not run in Hindi; the lesson is walked in it |
| **Screen reader support** | Built and held in Chrome's tree on a PC. **Nobody who uses TalkBack or VoiceOver has played it,** and the game is not to be said to support blind players. The lesson is not led by ear |
| **Colour vision** | Arithmetic on measured colours. Nobody colour blind has played |
| **How it looks, sounds and feels** | His approval is the gate, and it is given. No check here measures a finger, an eye or an ear |
| **That the printed board matches** | #49: it does not, and is ruled not a priority unless it is printed again |
| **Difficulty** | The reference bot plays about six of fourteen seats; its win rates measure the bot. People win almost every game on Normal |
| **The rules' science, beyond what was ruled** | Q12 to Q16 were reviewed and ruled; the rulebook was brought to the game where they differed (§21 to §23) |

---

## 4. Decisions for Shantanu

Each with what it leads to and a recommendation.

1. **Stage L7's measurement inside the Android app, before this is accepted.**
   - **What it is:** fix the meter's line for a slow frame so it follows the screen's refresh
   (`TODO.md` row 11, a small change to the measuring page), install the app on the S25 over the
   cable, and press Measure once inside it: about forty seconds of the phone left alone.
   - **If it is taken and holds:** locked decision #1 is confirmed, as the plan has said since
   1 October, and Phase 4 inherits nothing open about Capacitor.
   - **If it is not:** the decision goes into Phase 4 resting on a tab at 60 and one first reading at
   120. The release was made on 20 October before this measurement, which the roadmap said must come
   first; the ruling of that day put the release ahead of Gate 2 and did not speak to it.
   - **Recommendation: take it, after your play test,** so it measures the screens that ship.
   - **Put to him again the same evening with its whole context,** at his asking: what the decision
   is and why it was locked, what has been measured and why the first reading in the app is not the
   last, what he does (the phone on the cable, left alone for a couple of minutes), and that a phone
   holding the Google Play version must have it removed first, which loses only that app's own saved
   game. **Not yet ruled.**
2. **The two older measuring scripts** (`measure.ts` and `measure-full.ts` in `tools/perf/`), left
   for this stage to decide.
   - They drove the developer's page of the screens before Clay, and were never run against the new
   ones; the measuring page replaced them.
   - **Ruled 25 November 2026, as recommended: removed** ([`LOOK_PLAN.md`](LOOK_PLAN.md) §40). They
   are in the history.
3. **The store's screenshots, retaken after Gate 2** (`TODO.md` row 12).
   - **Ruled 25 November 2026, as recommended:** with the next store build, after his play test, so
   the listing shows what that build is.
4. **Accepting this closeout.**
   - Then `CLAUDE.md`'s marker moves to Phase 4, the brief's last boxes are ticked or marked as
   above, and the roadmap says Phase 2 is closed.
   - **Ruled 25 November 2026, as recommended:** after his play test and decision 1, with this
   document brought level with whatever they find.

---

## 5. What Phase 4 inherits

Much of Phase 4's own list is already done, by ruling, inside this phase: the Capacitor shell, its
signing, the closed test, the store listing and the public release.

| Thing | Note |
|---|---|
| **The next store build** | Held until his play test (`TODO.md` row 18). Version code 3 is on `main`; it carries the Hindi edition, Gate 2's pieces and the screen reader's three parts, none of which is on Google Play yet |
| **Locked decision #1** | Confirmed or not by decision 1 |
| **The newcomer test** | Deferred indefinitely. If it is ever run, its protocol is re-aimed at the guided game first |
| **A person who uses a screen reader** | The one thing that would let the game say it supports blind players (`TODO.md` row 17) |
| **The rulings waiting** | A hurt Spleen on Hard; a shape for each disease; the printed board and the printed Diphtheria and Anthrax cards, if they are printed again (`TODO.md` rows 1 to 4) |
| **Two advisories, accepted** | `glob` 11 and `minimatch` 10, under `workbox-build` at build time, in no process that listens ([`SECURITY_NOTES.md`](SECURITY_NOTES.md)) |
| **Coverage** | 97.49% of coverable arms; 20 arms wait for a competent bot ([`COVERAGE_DEFERRED.md`](COVERAGE_DEFERRED.md)) |
| **The reference bot** | Still the one that cannot measure difficulty; the balance panel detects engine change and nothing else |
| **The content licence** | None declared. The art is now all made here but the icon; whether to declare one is his |
| **The audience** | 13 and above on Google Play; the rules for children's apps are not taken on, and would be a small change if Google asks |
| **iOS** | Phase 5. Nothing has been built or measured for it |
| **The instruments** | Every one above, and the toolchain battery in `CLAUDE.md`, which a runner or toolchain move must pass in full |

---

## 6. What to say about Phase 2, and what not to

**Accurate:**

> The Immunity Wars is an app on Google Play and on the web. Its pieces are soft clay cells and
> pathogens modelled in Blender. A guided game in seven short chapters teaches it by playing, and it
> can be played in Hindi. Measured on a Samsung Galaxy S25, it runs at 60 frames a second in Chrome.
> The rules are Kartik's: the app's engine is compared, over every recorded game, with his original
> engine as the rule changes since were ruled, and the two agree.

**Not accurate:**

- "A newcomer can learn it alone": nobody new has been watched, and the testers found it hard.
- "Runs on any Android phone": one phone was measured.
- "Accessible to blind players": built and checked by machine, never played by someone who uses a
  screen reader.
- "Translated into Hindi by a translator": written here, and ruled to stand.
- "Every picture made by us": all but the icon, which was generated, and two open-licence faces.
- "The app and the printed board are the same": the board differs (#49).

**Design credit is Kartik's; the implementation is Claude's, directed by Shantanu.** That
distinction holds in every document here and should hold in anything written from them.
