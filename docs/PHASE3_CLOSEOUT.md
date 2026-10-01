# Phase 3 — closeout

**Objective, from [`PHASE3_BRIEF.md`](PHASE3_BRIEF.md) §0:** *"Two people who know each other, in
different cities, play one game on their own phones, by sharing a code. Nobody signs up for anything."*

**Status: CLOSED, with nothing owing, 1 October 2026.** Shantanu waived the two phone checks Gate A
still owed (*"Please ignore the 2 remaining phase 3 checks and close phase 3 please"*). They are
**waived, not met**: items 6 and 7 below stay as measured, and §3 still says what they would have
proven. The unplaced work ran the day before (the engine change queue, below).

*As written on 30 September:* **Status: complete, with one definition-of-done item NOT fully met, and
one piece of planned work found unplaced. Accepted by Shantanu, 30 September 2026** (*"Yes"*), with
the rulings in §4.

- **The unmet item:** the first, *"Gate A, every item, verified, on two real devices on two
  networks"*. Two of Gate A's nine items still owe a phone (§2).
- **The unplaced work:** the engine change queue, planned for this phase and never taken into it
  ([`FINDINGS.md`](FINDINGS.md) #101). *It ran on 30 September, between this phase and the next, and
  was deployed that evening* ([`ENGINE_CHANGE_QUEUE.md`](ENGINE_CHANGE_QUEUE.md), "How it ran").

Both are named here, and neither is hidden behind a qualifier.

Written 30 September 2026, on `main` at the deploy of protocol version 5.

---

## 1. What Phase 3 delivered

| Stage | Delivered | Record |
|---|---|---|
| **P3.1** The room | The room's rules as a pure reducer: no sockets, no clock, no platform. Join, seats, captain, drop, rejoin, reassign, succession, the grace period | [`for-P3.md`](for-P3.md) §1 |
| **P3.2** The protocol | Zod schemas both ways; every message stamped with the protocol version and `RULES_VERSION`, and a peer on another version refused before its body is read. Versions 1 to 5, each recorded in `vocabulary.ts` | §2 |
| **P3.3** Frames or state | Decided by measurement, against criteria written first: frames sent whole, gzipped per message. The largest message 25.9 KiB, within 2% of Task E's independent figure. Measured live since, 14 KiB a turn to each player and at most 24, so a full 45-turn game costs a player up to about 2 MB | §3, §5 |
| **P3.4** `RelaySession` | The second implementation of `Session`, against a Node relay. The answers the screens read are computed by the relay with the same code `LocalSession` uses, moved into `@immunity-wars/session-core` | §4 |
| **P3.5** The deployment | Google Cloud `e2-micro` in Mumbai: Caddy for TLS, systemd, automatic security updates, no visitor addresses in any log. Deploy scripts that refuse a build that would not start, and a relay restart while anyone is connected | §5 |
| **P3.7** The screens | Play together, the lobby, seats, the away state, the table's fixed messages, leaving and rejoining. Audited at 360 px in all four Gate 1 passes | §6 |
| **P3.6** Two phones | 26 September 2026: Shantanu on a Samsung S25 on home Wi-Fi, Kartik on an iPhone 16 on mobile data, both in Chrome, which met two browser engines. Steps 1 to 11 played, every one as expected | §9 |
| **After P3.6**, by ruling | The lobby's rules (v4); undo, played together (v4, DEVIATIONS #8); planning's buttons; each drawer only for the player whose it is; no labels under the pieces | §9 |
| **Update now**, by ruling | The version refusal became one a player can act on: Update now under it, and the title taking a newer version by itself | §11 |
| **Another game in the same room**, by ruling | The captain takes an ended room back to its lobby, same people, same seats (v5) | §12 |
| **The coverage arms** | The 20 multiplayer arms owed, all covered, held to legacy | §9, "The multiplayer coverage arms" |
| **Gate B's cost** | Recorded from the September bill and the prices read on the day | §10 |

**Instruments built on the way**, each with controls that fire:

- **`pnpm start:check`:** a build that does not start is never deployed.
- **`pnpm deps:check`:** React's two halves on one version.
- **`pnpm update:check`:** Update now and the title's update, replayed in Chrome on two real builds.
- **`pnpm ci:selftest:inert`:** a negative control whose mutation no longer lands fails `verify`.
- **The coverage gate, corrected** (#97): it now balances its own ledger on every run.
- **The Gate 1 audit, extended:** its walk now plays a game together, as captain and as guest.

---

## 2. Definition of done, item by item

From [`PHASE3_BRIEF.md`](PHASE3_BRIEF.md) §8.

| # | Item | Verdict |
|---|---|---|
| 1 | **Gate A: every item, verified, on two real devices on two networks** | **NOT fully met.** Five of the nine items were verified on the two phones (one of them on one phone); two are checks by their own wording; **two owe a phone.** Item by item below |
| 2 | Gate B: the cost recorded at measured traffic, portable by a passing test, no personal data | **MET.** Below |
| 3 | `RelaySession` a second implementation of `Session`; `LocalSession`'s behaviour untouched, its query builder shared, byte-identical output proven | **MET.** 9,100 views over 650 real states, one SHA-256 before the move to `session-core` and after it, and again after the last change to `local.ts`; flipping one field in the builder changes it (`tools/perf/queries-identity.ts`, for-P3 §4) |
| 4 | `rulesVersion` and a protocol version on every message, the refusal proven by a control | **MET.** Controls `protocol-version-check` and `protocol-encode-stamps`. Saved games carry no version, ruled Phase 4's (review R3) |
| 5 | The 20 multiplayer coverage arms covered; `COVERAGE_DEFERRED.md` regenerated and honest | **MET**, 28 September 2026. The gate's Phase 3 list is empty; 97.41% of coverable arms covered against a target of 95%. Two defects in the gate were found and fixed on the way (#97) |
| 6 | Corpus green; the engine unchanged but for `handOverCaptaincy` and undo's Action Points together | **MET.** The corpus runs in every `pnpm verify` and in CI. The two ruled changes are DEVIATIONS #7 and #8. DEVIATIONS #9 (30 September) records a difference the port has had since Task B4, not a change |
| 7 | A Phase 3 closeout | This document |

### Gate A, item by item

| # | Item | On the phones? | Evidence |
|---|---|---|---|
| 1 | Two devices, different networks, one room by code, a full game to a Result | **Yes**, 26 September | for-P3 §9 |
| 2 | Every action applied once, in one order, every view agreeing at the end of each action, *"asserted by a check, not by watching"* | Watched; **the check is the evidence**, as the item asks | `relay.test.ts`, *"agree with each other and with the relay after every action"*, over real sockets |
| 3 | A player who drops and rejoins gets their seats back, and the game continues | **Yes**: from aeroplane mode, and from the browser closed | §9; `relay.test.ts`, *"gives a player who rejoins with the same code their seats back, and the board"* |
| 4 | A player who does not come back does not block the table; the choice visible to everyone | **Yes** | §9; the room's reassign tests |
| 5 | The captain dropping promotes a new captain deterministically, every client agreeing | **Yes** | §9; the room's succession tests; DEVIATIONS #7 |
| 6 | The last player leaving ends the game; a room discarded after its grace period cannot be rejoined | **No**: step 12, the eleven-minute wait, was not played | `room.test.ts`, *"the grace period"*; `hub.test.ts`, *"stop working once the room is discarded after its grace period (Gate A)"* |
| 7 | An old version refused with a message a player can act on, never desynchronising a newer room | **The refusal, yes** (step 10). **The action, no** | The refusal: the protocol's controls; nothing is read before the version. The action: on the phones the words were not actionable on the web (#93). Built on 30 September as Update now and the title's update, and proven by `pnpm update:check` in headless Chrome on two real builds, **not yet on a phone** |
| 8 | The 20 deferred multiplayer coverage arms covered | A check by nature | §2 item 5 |
| 9 | Single player unchanged, and working with no network at all | **Yes, on the S25**; not tried on the iPhone | §9 step 11; the Gate 1 audit plays a turn offline on every run; the corpus; item 3 above |

**What closes item 1:** one short session, listed in §4. It costs an eleven-minute wait and a
version change, and today's deploy of version 5 is already one. **Waived by Shantanu, 1 October 2026:
item 1 stands at seven of nine on the phones or by check, and the phase is closed on it.**

### Gate B, item by item

| Item | Verdict | Evidence |
|---|---|---|
| The relay's cost at a real game's measured traffic, prices re-read on the day | **MET** | for-P3 §10: ₹107.90 billed over the server's first 104.69 hours; **about ₹750 a month**, or about ₹1,100 if the public address starts billing at its listed $0.005 an hour. A full four-player game costs under ₹0.10 in data |
| The platform replaceable: a plain room module, and an adapter small enough to rewrite in a day, proven by a test with no platform runtime | **MET** | `packages/room` has no sockets, no clock and no Node APIs, held by `room-no-node-builtins` and `room-no-downstream`, and its suite runs under plain Node. The adapter is `packages/server/src/node.ts`, 164 lines; `bundle.test.ts` starts the production bundle on plain Node and plays a turn |
| No personal data: no accounts, no stored names, nothing personal written on the server | **MET** | The relay's code imports no filesystem API at all, so it writes nothing; a name lives in its room and dies with it. No visitor address in any log, Caddy's error log included (#85, fixed the day it was found). In memory, a room lives until its grace period ends, and an address's recent wrong codes for up to 10 minutes (review C4) |

---

## 3. What Phase 3 does NOT prove

| Not proven | Why, and where |
|---|---|
| **Anything on more than two phones, or more than one pair** | One session, two players, one S25 and one iPhone 16. Three players were played only headless, in P3.7's walk to a real Result (for-P3 §6) |
| **Update now and the title's update, on a phone** | Measured in headless Chrome on two real builds. The first real test comes when a phone next meets a newer version (§4) |
| **Another game in the same room, on a phone** | Built and deployed on 30 September. Proven over real sockets, and by the audit's walk to the lobby after a game |
| **The grace period on a phone** | Step 12 was not played; the room's and the hub's tests hold it |
| **Single player offline on an iPhone** | Tried on the S25 only |
| **Load** | No test has run many rooms at once. The relay's limits are set (for-P3 §5); what an `e2-micro` holds under them has not been measured |
| **The relay against a modified app** | The room checks who holds a piece only for actions that name one (#94, its relay half open and unruled). The rooms are private and among friends, which is the whole of the defence today. *Built 1 October 2026: the room refuses those actions from anyone but the piece's holder, and the body's from anyone but the captain* |
| **Security beyond the automatic** | CodeQL, Dependabot and `pnpm audit` run, and the relay's inputs are bounded and schema-checked. Nobody has tried to break it |
| **That a game survives the night** | The server reboots itself at 03:30 when a security update needs it, and a restart ends every room in memory |
| **The cost after day 90** | Extrapolated from 104.69 hours of one month's bill; the trial credit pays until 90 days from sign-up |
| **That the rules are right** | Phase 3 changed who is in the room, not the rules. The queue of ruled rule changes waits (#101) |
| **Phase 2's owed items** | The handset performance pass, the newcomer test and Gate 2 are all still owed ([`PHASE2_PAUSE.md`](PHASE2_PAUSE.md)) |

---

## 4. Decisions, and the checks still owed

### For Shantanu, with Kartik on the first

**Ruled 30 September 2026:** *"1. Now 2. Yes 3. Yes"*. The queue runs now, before Phase 4; the room
will refuse body and antibody actions from anyone but their owners, before Phase 4 ships; and this
closeout is accepted. The items below are kept as they were put.

1. **When the engine change queue runs** (#101). Ten ruled changes: five of them Kartik's, on the
   biology, and one of those (Q4) a live inaccuracy the engine's own log contradicts. Each breaks the
   corpus, so they land together.
   - **(a) Now, as its own short piece before Phase 4.** The corpus is re-baselined once, and
     `RULES_VERSION` moves once, which Update now and the title can now carry to every phone.
   - **(b) As Phase 4's first work.** It lands before the store build.
   - **(c) After Phase 4's packaging.**
   - **Recommendation: (a).** Kartik's rulings are nearly four weeks old, the first store version
     should carry them, and a re-baseline is cheapest while no store build depends on the corpus. It
     needs no hardware, so it can run while the handset and a newcomer for Phase 2's errands are
     found.
2. **#94's relay half:** whether the room refuses body and antibody actions from anyone but their
   owners, as the screens already do. A small room change and one refusal code.
   **Recommendation: yes, before Phase 4 ships**, when a modified app stops being far-fetched.
3. **Accepting this closeout**, after which `CLAUDE.md`'s phase marker moves to whatever is ruled
   next.

### The phone checks owed: one short session closes Gate A item 1

**Waived, 1 October 2026** (Shantanu). The session below was not played; it is kept as the list of
what a phone would still show.

1. **Open the app on each phone.** Today's deploy is version 5, so a phone on version 4 is refused.
   - On the build from 30 September's first deploy, it offers **Update now**. Press it, and note
     how long it takes.
   - On an older build, close the app completely and reopen it, once.
2. **Play to the Result together.** The captain presses **Another game in this room**; both phones
   should land in the lobby, in their seats.
3. **Both leave, wait eleven minutes, and try the code:** it should be refused. This is step 12, which
   closes Gate A item 6.
4. **Single player with no network, on the iPhone.**
5. **At the next deploy,** each phone on the title should take the new version by itself.

---

## 5. What Phase 4 inherits

### First: what Phase 2 still owes

**The handset performance pass, before Phase 4 starts.** It is the one measurement that can reopen
Capacitor against React Native, and reversing that inside Phase 4 costs a rewrite. The newcomer test
and Gate 2 are owed with it ([`PHASE2_PAUSE.md`](PHASE2_PAUSE.md)).

### Also inherited

| Thing | Note |
|---|---|
| **The update policy for installed apps** (review R4) | The relay refuses any other protocol version exactly. On the web, Update now and the title fix that in a second. An installed app updates through its store, which can lag by days, so a store rollout needs either a window of accepted versions or a store-forced update, decided before the first store build |
| **Versioned saved games** (review R3) | Saves carry no version. The first app update that changes the rules is where one is needed |
| **The relay** | Mumbai `e2-micro`, about ₹750 to ₹1,100 a month once the trial credit ends. A budget alert catches anything more. The 03:30 reboot ends games in progress, so it may want moving |
| **The engine change queue** | It ran on 30 September 2026, before Phase 4 (#101; [`ENGINE_CHANGE_QUEUE.md`](ENGINE_CHANGE_QUEUE.md)) |
| **The coverage still open** | 18 arms that wait for a competent bot, and 28 uncategorised ([`COVERAGE_DEFERRED.md`](COVERAGE_DEFERRED.md)) |
| **#83** | One UI test failed once, under a forced concurrent run, and never again. Unexplained, and recorded as that |
| **The instruments** | Every one in §1, and the toolchain battery in `CLAUDE.md`, which a runner or toolchain move must pass in full |
| **The seams** | `Session` has two implementations now. The relay, its protocol and its deployment are replaceable by a passing test, and the fallbacks are named in the brief's §6 |

---

## 6. What to say about Phase 3, and what not to

**Accurate:**

> Kartik and Shantanu, on their own phones (an Android phone and an iPhone) on two different
> networks, played a full game together by sharing a room code, with no accounts, through a relay we
> run in Mumbai for about ₹750 a month. The rules did not change to make it multiplayer: the engine
> already was, and two small ruled changes, to handing over the captaincy and to undo's Action Points,
> made it work across phones.

**Not accurate:**

- "Tested across devices": one session, one pair of phones.
- "Works for up to fifteen players": fifteen is the rule; two played on phones, three headless.
- "Updates itself on phones": proven in Chrome on a computer; not yet seen on a phone.
- "Secure against cheating": a modified app could act for pieces it does not hold, in some actions
  (#94). The rooms are private, among friends. *Since 1 October the room refuses those actions; it
  is still not a claim to make, since nothing here was built or tested as a defence against cheating.*
- "The science was corrected in Phase 3": Kartik's rulings on the science wait in the queue (#101).

**Design credit is Kartik's; the implementation is Claude's, directed by Shantanu.** That
distinction holds in every document here and should hold in anything written from them.
