# Phase 3 brief — review

**Written 25 September 2026**, reviewing [`PHASE3_BRIEF.md`](PHASE3_BRIEF.md) **v1.6**, after P3.1 to
P3.5 were built and the relay deployed, and before P3.6. Ruled on 25 September: the review is owed
before P3.6, because P3.6 checks Gate A against the brief's exact words.

> **STATUS: all four items ruled on, 25 September 2026. The brief is now v1.7.**
> **R1: (c)**, all of P3.7 before P3.6 (*"No let's do 3.7 first. No point building stuff that may not
> actually get used."*), not the recommended (a). **R2: (a)**, built. **R3** and **R4** as
> recommended. C1 to C7 are applied. Section references below are to brief v1.6; this document is
> left as written, as the record of what the brief said.

**How it was done.** The brief was read against what is built, not against itself, and every claim
that could be measured was: two of the four ruling items below were found by running the room, not
by reading. Phase 2's review found seven defects in a brief nobody had built against yet; this one
had four sub-stages of building to be wrong against.

---

## 1. Findings that need a ruling

### R1. ⚠️ P3.6 needs screens that the brief schedules for P3.7

§3 orders P3.6, *"Two real devices, two networks, a full game"*, before P3.7, *"The multiplayer
screens: create, join, the lobby, seat assignment, the away state"*, because *"until P3.6 nobody
knows what they must show"*.

**But a phone cannot create or join a room without a screen to do it with.** Everything below the
screens exists: `RelayRoom` creates, joins, claims seats and starts; `RelaySession` is a `Session`,
so the existing play screen can render a multiplayer game as it is. What does not exist is the few
steps between opening the app and being in a game.

- **(a) Move the minimum of P3.7 ahead of P3.6**: create, join by code, the lobby with seats, and
  start, plain but through the catalogues, handing the existing play screen a `RelaySession`. P3.7
  keeps the away state, the captain's reassignment, the refusal wording and the polish, which is
  what P3.6 teaches.
- **(b) A developer-only harness page** for P3.6, thrown away at P3.7. It keeps §3's order, but it
  is built to be discarded, and P3.6 would then test a path players never take.
- **(c) Reorder wholesale**: all of P3.7, then P3.6. It gives up the reason §3 gave for the order.

**Recommendation: (a).** The minimum screens are needed whatever P3.6 finds, and P3.6 then tests the
real path.

### R2. ⚠️ A member who joins after the game starts can be seated, and can never act (new: FINDINGS #86)

**Measured on 25 September**, playing through the room: A and B start a game; B drops; C joins; the
captain hands B's Neutrophil to C, which the room allows. Then:

- `allocateAP` to C is refused by the engine with *"Unknown player."*, while the same allocation to
  B is accepted. **The engine fixes its list of players at `newGame`**, and C is not on it. C holds a
  seat with no Action Points, and it can never have any.
- **The same check refuses `handOverCaptaincy` to C.** If the captain drops and C is the next member
  in line, the room names C captain and the engine keeps the old one: the stall FINDINGS #78 fixed,
  back for anyone who arrived late.

P3.4 made the room hand a latecomer the board *"since the captain may seat them in an away seat"*.
That was built for a case the engine refuses. The defect is in P3.4's room, not in the brief, but the
brief's Gate A (*"the captain reassigns"*) cannot be passed for a latecomer as things stand.

- **(a) The room refuses new members once the game has started** (with the existing code
  `lobbyClosed`, so no protocol change); rejoining is unaffected. A late arrival joins the next
  game. No engine change.
- **(b) An engine action that adds a player mid-game**, sent by the room when a newcomer joins, as
  `handOverCaptaincy` was: a second deviation, held to the corpus the same way.

**Recommendation: (a)** for this version. It is small and keeps the engine as it is. If a family
wants someone to take over mid-game, (b) is a contained change that can follow.

### R3. The definition of done asks for a version "on every state", which CLAUDE.md says is not there and is Phase 3's to decide

§8: *"`rulesVersion` and a protocol version on every message **and every state**."* `CLAUDE.md`:
*"`rulesVersion` is on the content pack and on every NETWORK MESSAGE — NOT on game state. **Saved
games still carry no version**, which is seam 7's deferred pack check and still Phase 3's to
decide."*

Every message carries both versions (P3.2, with controls). No state does. And since the ruling of 25
September there is no multiplayer save, so the only saved games are single player's.

- **The question is real, but it arrives with app updates.** A single-player save written by one
  version of the app and opened by the next, whose content pack has changed, would be read by rules
  it was not written under. That first happens when updates ship to installed phones: Phase 4.
- **(a) Amend §8 to "every message"**, and record saved-game versioning as Phase 4's, where app
  updates begin. **(b)** Build it now.

**Recommendation: (a).**

### R4. Refusing an old version is right in a room, and strands players once the app is in the Play Store

Gate A: *"A client on an old protocol version is refused with a message a player can act on."* The
relay refuses any peer whose protocol or rules version is not exactly its own (P3.2). That is right
for keeping a room consistent.

**The implication the brief does not state:** every protocol bump refuses every phone that has not
updated yet, and Play Store updates reach phones over days. A family mid-update would find one phone
refused until it updates. Nothing in Phase 3 needs to change; the relay could later accept the
previous version for a while, or bumps could be rare and announced.

**Recommendation: record it as a Phase 4 question** (the update policy), not a Phase 3 change.

---

## 2. Corrections that change no decision

| # | Where | What it says | What is true |
|---|---|---|---|
| **C1** | §0, §2 ("changes none of them"), §7 ("No engine rule changes") | The engine is fixed | One ruled exception, `handOverCaptaincy` (v1.1, DEVIATIONS #7), is amended in §8 but not in the three places that contradict it. The same kind of contradiction Phase 2's review found first |
| **C2** | §2, "The engine is already multiplayer" | *"…and ownership checks are all in `packages/engine/src/actions.ts`"* | **False, measured**: the engine reads `owner` nowhere in its rules; it only stores and projects it. Ownership is the room's check (P3.1), which is also why #81 was ruled as it was |
| **C3** | Gate A, §3 P3.6, §8 | 22 deferred multiplayer coverage arms | **20**, since the captaincy tests covered two (FINDINGS #78); `COVERAGE_DEFERRED.md` says 20 |
| **C4** | Gate B | *"nothing on the server that outlives the room"* | Nothing personal is written anywhere. In memory, the relay keeps each address's recent wrong room codes for up to 10 minutes, which can outlast a room. Stated precisely, it holds |
| **C5** | §5, "Dropping" | *"Dropping is the connection closing"* | Or failing to answer the relay's ping for about 40 seconds (P3.5, FINDINGS #84), which is how a phone out of signal is noticed |
| **C6** | §2, "Size was measured"; "`packages/protocol` is 11 lines" | Figures from before Phase 3, and a scaffold | Superseded by P3.3 to P3.5: live, 13 KiB a turn to each player; the protocol is built. Both rows are the brief's starting point, and should say so |
| **C7** | §6 warning; the header's "Not yet reviewed" | The listening-process property is still to be restated | Restated at P3.4 and P3.5 (`SECURITY_NOTES.md`); the header changes once this review is ruled |

---

## 3. Claims checked, and found true

- **Deterministic captain succession, agreed by every client** (Gate A): the room names the next
  connected member in join order, every client receives the same projection, and the engine is told
  (#78). Tested in the room and over real sockets. *R2 is the one gap, for latecomers.*
- **An old peer can never desynchronise a newer room** (Gate A): refused before its body is read,
  both directions, with controls (P3.2), and on the live relay's own code (P3.4, P3.5).
- **The room module runs with no platform runtime** (Gate B): the room's suites run under plain
  Node; the platform adapter is `node.ts`, 110 lines of code since P3.5 added the address rule and
  the heartbeat (76 at P3.4). Whether that is "a day to rewrite" is a judgement, not a measurement.
- **Every action applied once, in one order, and every client agreeing** (Gate A): asserted over
  real sockets for two clients (P3.4) and by the hub's ordering test with a control. P3.6 repeats it
  on two phones.

---

## 4. What happens on ruling

The rulings and C1 to C7 go into the brief as v1.7, each marked in place; R2's choice is built with a
test that fails first, and FINDINGS #86 records it; the header's "Not yet reviewed" becomes the date
of this review.
