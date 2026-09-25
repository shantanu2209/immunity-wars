# The Immunity Wars — Phase 3 Brief

**Version:** 1.4 · 25 September 2026
**Owner:** Shantanu (build direction) / Kartik (design)
**Status:** Written before any Phase 3 code exists, deliberately. **Not yet reviewed.**

Read alongside [`PHASE2_PAUSE.md`](PHASE2_PAUSE.md) (what Phase 2 leaves owed),
[`TASK_E_CLOSEOUT.md`](TASK_E_CLOSEOUT.md) (the measurements that already decided things),
[`SEAM_DECISIONS.md`](SEAM_DECISIONS.md) and [`FINDINGS.md`](FINDINGS.md) #40.

> ⚠️ **This brief expects to be wrong somewhere.** Phase 2's brief was reviewed before any of its
> code existed and **seven real defects were found in it** ([`PHASE2_BRIEF_REVIEW.md`](PHASE2_BRIEF_REVIEW.md)),
> including two sentences that contradicted each other. The same review is owed here, and the place
> to look hardest is §5, where the room's rules are written as prose and nothing has yet forced them
> to be consistent.

## What v1.4 records

v1.4 changes ruling 5 again (Shantanu, 25 September 2026: *"can we try google cloud instead? using a
VM or someting like that?"*), because **Oracle refused the sign-up**: after the card was verified,
its screening failed every attempt with a generic "an error occurred while creating your account".
Oracle does not say why.

- **The relay's home is Google Cloud's Free Tier: one `e2-micro` server in Oregon (`us-west1`).**
  The relay and its setup run there unchanged.
- **What it costs, measured and read on 25 September** ([`for-P3.md`](for-P3.md) §5):
  - **Lag.** Google's free server exists only in three US regions. Measured from the development PC,
    a round trip to Oregon takes **242 ms**, against **34 ms** to Google's Mumbai region, which is not
    free. Oregon was the fastest of the three.
  - **Data.** 1 GB a month out is free, which is about 125 four-player games; beyond it Google charges
    per GB, a few paise a game.
  - **Size.** A quarter of a processor and 1 GB of memory: enough for the relay and nothing else, so
    other projects of ours cannot share it.
  - **The account** must be upgraded to a paid billing account before the 90-day trial ends, or the
    server stops. Only use beyond the free amounts is then charged.
- **The right to move later is unchanged.** Oracle, if its sign-up ever succeeds, would bring the lag
  down to about 34 ms with the same scripts; Cloudflare remains the managed alternative.

§3 P3.5, §4 ruling 5 and §6 carry the marked amendments in place.

## What v1.3 records

v1.3 changes ruling 5, by ruling (Shantanu, 24 September 2026: *"let's adjust what needs adjusting
from cloudflare to oracle"*), after the comparison in [`for-P3.md`](for-P3.md) §5:

- **The relay's home is Oracle Cloud's Always Free tier, not Cloudflare's free plan.** Oracle's
  free allowance is far larger at our scale (10 TB a month out; two Arm cores and 12 GB), it has
  regions in India, and the Node relay P3.4 built runs there unchanged. Cloudflare's free plan would
  have held about 33 in-memory games a day, and its documentation does not say that any data centre
  in India hosts a Durable Object. **The cost is that we own an operating system**, and that Oracle
  reclaims free servers that look idle; both are carried into §6. Pay As You Go, which the community
  reports keeps a free server from being reclaimed, is *"a genuine option to go for"* in his words.
- **The right to move later is unchanged**, and is now a right to move TO Cloudflare, or to any
  other server, as much as away from Oracle.
- **Also recorded:** a join naming a code the relay does not hold is refused (*"Yes incorrect code
  should be refused"*), which is how P3.4 built it.

§1 Gate B, §3 P3.5, §4 ruling 5 and §6 carry the marked amendments in place.

## What v1.2 records

v1.2 changes one line of §8, by ruling (Shantanu, 24 September 2026: *"I'll go with your
recommendations."*, on [`for-P3.md`](for-P3.md) §4):

- **"`LocalSession` is untouched" now reads "`LocalSession`'s behaviour is untouched".** A relay
  client never holds a `GameState`, so the answers the UI reads to decide what is clickable must come
  from the relay. The ruling was that the relay computes them with the SAME code `LocalSession` uses,
  moved into a shared package (`@immunity-wars/session-core`), rather than with a second copy. That is
  a refactor of `LocalSession`, so it is not "untouched" in the letter. **The proof that its
  behaviour is:** 9,100 views over 650 real states, one hash, identical before and after the move,
  with a control that changes it. §8 carries the marked amendment in place.

## What v1.1 records

v1.1 changes one line of §8, by ruling (Shantanu, 21 September 2026: *"For the ruling happy to go
with your recommendation"*):

- **"The engine unchanged" now has one stated exception: `handOverCaptaincy`**
  ([`DEVIATIONS.md`](DEVIATIONS.md) #7, from [`FINDINGS.md`](FINDINGS.md) #78). P3.2 found that the
  engine keeps its own copy of the captain and enforces it, so a captain dropping mid-game stalled
  the table — the stall ruling 4 exists to prevent. The alternative fix re-implemented an engine
  rule in the room. **The corpus is the proof it is confined**: it stays green, and a direct
  comparison against legacy holds six other multiplayer paths byte-identical. §8 carries the marked
  amendment in place.

---

## 0. Objective

> Two people who know each other, in different cities, play one game on their own phones, by
> sharing a code. Nobody signs up for anything.

Phase 2 changed everything a player can see. **Phase 3 changes who is in the room, and nothing about
the rules.** The engine is fixed; the equivalence corpus remains the oracle.

---

## 1. The stopping rule

**Two gates. Both must pass. Neither implies the other.**

### Gate A — it works, objectively

- [ ] Two devices, different networks, join one room by code and play a full game to a Result
- [ ] Every action is applied **once**, in one order, and every client's view agrees at the end of
      each action — asserted by a check, not by watching
- [ ] A player who drops and rejoins with the same code gets their seats back and the game continues
- [ ] A player who drops and does **not** come back does not block the table: the captain reassigns
      or the table waits, and that choice is visible to everyone
- [ ] The captain dropping promotes a new captain deterministically, and every client agrees who
- [ ] The last player leaving ends the game; a room held open for the grace period and then
      discarded cannot be rejoined
- [ ] A client on an old protocol version is refused with a message a player can act on, and can
      **never** desynchronise a newer room
- [ ] **The 22 deferred multiplayer coverage arms are covered** ([`COVERAGE_DEFERRED.md`](COVERAGE_DEFERRED.md))
- [ ] Single player is unchanged and still works with no network at all

### Gate B — it is affordable and it is ours

- [ ] The relay runs inside a free plan at the measured traffic of a real game, with the numbers
      recorded and the plan's limits re-read **on the day**, not trusted from this document
- [ ] **The platform is replaceable:** the room's rules are a plain module with no platform types
      in it, and the platform adapter is small enough to rewrite in a day. Proven by a test that
      runs the room module with no platform runtime at all. ⚠️ *Amended in v1.3:* this said
      "Cloudflare" in both places, when Cloudflare was the platform
- [ ] No personal data anywhere: no accounts, no stored names, nothing on the server that outlives
      the room

---

## 2. What is already true, and must not be re-derived

Phase 3 starts further along than it looks.

| | |
|---|---|
| **The engine is already multiplayer** | `g.multiplayer`, `g.captain`, `owner: Record<seat, pid>`, per-player `apBudget`, the allocation phase, and ownership checks are all in `packages/engine/src/actions.ts`. **Phase 3 builds transport and seats for rules that already exist**, and changes none of them |
| **The seat model is the engine's** | 7 cells + 7 organ residents = 14 seats, keyed as the engine keys them (`res_<organ>` for a resident) |
| **There is a working reference** | `tools/legacy/server.js`, 346 lines: one room, 14 seats, a captain, ownership enforcement, reconnect by persistent id. READ-ONLY, like all of `tools/legacy` — the same role legacy played for the Phase 1 port |
| **`Session` was built for this** | `sendAction` is async even locally **so that `RelaySession` is a second implementation and not a rewrite**; `Session` never hands out `GameState`; the `view`/`burst` union already expresses what a spread is |
| **`PlayerRef` is device-local and opaque** | It authenticates nothing and is minted on the device. That is exactly right for an invite-only room and would be wrong for a public one, which is one more reason there is no public one |
| **The engine cannot be replayed** | Six unseeded `Math.random()` calls, no injection point (#40). Two clients applying one action diverge silently. **`viewState` is the unit of synchronisation, never `Action`** |
| **Size was measured** | Every measured state gzips **under 3.5 KiB**; deltas buy about 2× on that; **the tail is the burst at 25.6 KiB**, because `endCommand` returns up to 10 full projections. Every figure is a FLOOR: measured single-player, under a bot that dies at turn 8.6 |
| **`packages/protocol` is 11 lines of scaffold** | It becomes real here |

---

## 3. Order of work

Sequenced so the thing that could invalidate the rest happens first.

| # | Stage | Why here |
|---|---|---|
| **P3.1** | **The room as a pure module**, with no network: rooms, seats, captain, join, drop, rejoin, reassign, end. Driven by tests only | It is the half that carries every rule in §5, and it can be finished before a single byte crosses a wire |
| **P3.2** | **The protocol**: message types and Zod schemas both ways, `rulesVersion` and a protocol version on every message, with a refusal path proven by a control | Zod at every trust boundary is a standing rule; a relay is the largest trust boundary this project has ever had |
| **P3.3** | **The measurement: frames or state?** One room, two clients, a real spread. What it costs to send 10 frames versus one state and a dice log | The Task E question. Decided by measurement, before the transport is written around either answer |
| **P3.4** | **`RelaySession`** — the second implementation of `Session`, against a local relay on the development machine | No cloud involved yet |
| **P3.5** | **The deployment**: the P3.4 relay on Google Cloud's free server in Oregon, encrypted, supervised and patched, the free-tier numbers measured. ⚠️ *Amended in v1.4:* v1.3 put it on Oracle in India, whose sign-up refused us; v1.0 to v1.2 had "the Cloudflare adapter: one Durable Object per room" | Small by design; §6 |
| **P3.6** | **Two real devices, two networks**, a full game, and the 22 coverage arms | Gate A |
| **P3.7** | The multiplayer screens: create, join, the lobby, seat assignment, the away state | They are the last thing, because until P3.6 nobody knows what they must show |

---

## 4. The rulings already made

Given by Shantanu on 20 September 2026, in the conversation this brief was written from.

1. **An internet relay, not LAN.** The product is an installed Android app; LAN would mean a phone
   running a server, which is a second and harder transport that only works on one Wi-Fi.
2. **Private rooms by invite code. No lobby, no matchmaking, no strangers** — which is also
   `CLAUDE.md`'s standing rule, and the brief proposed something weaker before being corrected.
3. **No free-text chat in v1.** In a children's app it is the one feature that brings moderation
   obligations and Play Families scrutiny. The Messages panel keeps its System tab (piece 5).
4. **No AI. There is no seat-filling bot in Phase 3.** *"If some non captain player drops, captain
   can decide who takes over. If captain leaves we make someone else captain. If last player leaves
   game ends. Since it is code based sharing we can assume people know each other, so the person who
   drops can rejoin by entering the code again, and if the remaining players so choose they can wait
   for the player to rejoin before continuing."*
   **This deletes the ugliest thing in the phase.** The roadmap said Phase 3 would build AI takeover,
   which is the same work as a competent reference bot, which is an engine change that breaks the
   byte-identical corpus. **A rule that says "the table decides" needs no AI at all**, so the bot
   leaves Phase 3 entirely and the corpus is not re-baselined here.
   `COVERAGE_DEFERRED.md`'s 17 bot arms are relabelled accordingly, at the generator.
5. **Google Cloud, Free Tier: one `e2-micro` server in Oregon** — with the right to move later, which
   §6 makes a requirement rather than a hope. ⚠️ *Amended twice.* It read **"Cloudflare, free plan,
   for now"** (20 September), then **"Oracle Cloud, Always Free tier"** (v1.3, 24 September), until
   Oracle's sign-up refused us (v1.4, 25 September). What each change costs is in §6 and
   [`for-P3.md`](for-P3.md) §5.

---

## 5. The room's rules, written down so they can be argued with

This is the section most likely to be wrong. Every line is a ruling or a proposed default, marked.

**A room** is a code and a set of members. It exists in memory only. Nothing about it is written to
disk anywhere, ever.

- **Joining.** A member is a `PlayerRef` (device-local, opaque) plus a display name typed for this
  room. *Proposed:* the name lives in the room and dies with it. Nothing is stored on the server and
  nothing identifies a child.
- **Seats.** 14, the engine's own. A member holds zero or more. *Proposed:* the captain assigns at
  the start; a member may pick a free seat themselves before the game begins.
- **The captain** is the first member to join. The engine already gives the captain the allocation
  and End turn powers, so this is the engine's notion, not a new one.
- **Dropping** is the connection closing. The member stays a member and their seats stay theirs,
  **marked away**, visible to everyone (Gate A). Nothing is forfeited by dropping.
- **The table's choice.** *Ruled:* the captain may reassign an away member's seats to anyone
  present, or the table may simply wait. Nothing forces the issue and no timer decides it. The game
  advances when the captain ends the turn, which is already the engine's rule.
- **Captain succession.** *Proposed default:* when the captain is away, the **next member in join
  order who is connected** becomes captain. Deterministic, so every client agrees without a vote.
  *Open:* whether the original captain gets it back on return. **Recommendation: no** — a rule that
  swaps authority twice on a flaky connection is worse than one that swaps it once.
- **Rejoining.** The same code plus the same `PlayerRef` restores the member and any seats still
  theirs. Seats reassigned while away are gone; they take what is free.
- **The room's end.** When the last connected member leaves, the room is **held for a grace period
  and then discarded.** *Proposed default: 10 minutes.* A family losing Wi-Fi for ninety seconds
  should not destroy a forty-minute game; a room nobody returns to should not live forever.
- **After the grace period** the game is gone. There is no server-side save, because there is no
  server-side storage. *Open, and worth deciding deliberately:* whether the captain's device keeps
  the autosave it already writes in single player, so a dead room can be restarted from the last
  state. **Recommendation: yes, and say so in the UI** — the machinery exists.

---

## 6. The relay, and the right to leave it

⚠️ *Rewritten in v1.3 (24 September 2026) for Oracle, and again in v1.4 (25 September) for Google,
when Oracle's sign-up refused us.* v1.2 read: one room per Durable Object, about 3 million requests a
month free, incoming WebSocket messages billed 20 to 1 and outgoing free. v1.3 read: one Oracle
Always Free server in India, 10 TB a month out, Arm allowance of 2 cores and 12 GB.
[`for-P3.md`](for-P3.md) §5 has both comparisons.

**One Node process on one Google Cloud free-tier server in Oregon** holds every room in memory: the
relay P3.4 built (`packages/server`), behind a front that terminates TLS. Read on 25 September 2026:
one `e2-micro` (a quarter of a processor sustained, 1 GB), only in three US regions, 30 GB of
standard disk, and 1 GB a month out. Oracle's allowance was halved in June 2026, which is why **Gate B
requires the limits to be re-read on the day**: a published number in a brief is a claim with an
expiry date.

**What owning the server costs, carried here so it is not forgotten:**

- **Lag.** Every action is a round trip to the US: 242 ms measured from the development PC, against
  34 ms to Mumbai. Playable for a turn-based game; felt on every tap.
- **Data beyond the free gigabyte is charged**, a few paise a game above about 125 four-player games
  a month. A budget alert catches the bill.
- **An operating system to patch.** Security updates install themselves; the setup is a script. By
  design nothing on the server needs keeping, so a lost server is a rebuild, not a restore.
- **Rate limiting, a connection cap and TLS are ours**, where a managed platform would have provided
  them.
- **Nothing else fits on it.** Other projects of ours cannot share a 1 GB server; the P3.5 ruling that
  anything storing personal data gets a separate server stands for whatever they run on.

**The platform must be replaceable, and that is a gate item, not an intention.**

- The room's rules are a plain module: no platform types, no `env`, no `WebSocket` in its
  signatures. It takes messages in and returns messages out.
- The adapter is the only thing that knows about the platform (`packages/server/src/node.ts`), and
  it is small enough to rewrite in a day. **Proven by running the room module under plain Node in the
  test suite** — if that test passes, the module is portable by construction rather than by
  assertion.
- The fallback: any other server, Oracle in India included, which means the same adapter and the
  same scripts unchanged; or Cloudflare's Durable Objects, one room per object, which means a second
  adapter and the hub's per-room half. ⚠️ *Amended in v1.3 and v1.4* as the platform moved.

⚠️ **This is the project's first long-running listening process, and that changes a security
claim.** [`SECURITY_NOTES.md`](SECURITY_NOTES.md)'s current property is *"no open advisory is in a
process that listens; every open advisory is in a one-shot tool the maintainer runs on inputs the
maintainer chose."* **A relay breaks that sentence the day it ships.** The relay's dependency set is
therefore part of Gate B: it is kept minimal, and the property is restated to cover it.

---

## 7. Out of scope

No public matchmaking, no lobby of strangers, no friend lists — permanently, not just here.
No free-text chat. No accounts, ever.
**No AI seat-filling and no competent reference bot** (§4, ruling 4). It is an engine change that
deliberately re-baselines the corpus and it is its own piece of work, whenever it is taken.
No Capacitor packaging — Phase 4, and it must not start until [`PHASE2_PAUSE.md`](PHASE2_PAUSE.md)'s
handset measurement exists.
No spectators. The legacy server had them; nobody has asked for them.
No engine rule changes.

---

## 8. Definition of done

- [ ] Gate A — every item, verified, on two real devices on two networks
- [ ] Gate B — inside a free plan with the numbers recorded, portable by a passing test, no personal
      data
- [ ] `RelaySession` is a second implementation of `Session`, and `LocalSession`'s behaviour is
      untouched by it: its query builder is shared, byte-identical output proven. ⚠️ *Amended in
      v1.2 (24 September 2026):* this read "`LocalSession` is untouched by it". The builder moved to
      `@immunity-wars/session-core` by ruling, so the relay computes what `LocalSession` computes
      from one implementation ([`for-P3.md`](for-P3.md) §4)
- [ ] `rulesVersion` and a protocol version on every message and every state, with the refusal path
      proven by a control — the thing Phase 1 recorded as Phase 3's to make true
- [ ] The 22 multiplayer coverage arms covered; `COVERAGE_DEFERRED.md` regenerated and honest
- [ ] Corpus still green; the engine unchanged **but for `handOverCaptaincy`**. ⚠️ *Amended in
      v1.1 (21 September 2026):* this read "the engine unchanged". The one addition is ruled,
      recorded as DEVIATIONS #7, and held to legacy on every other multiplayer path
- [ ] A Phase 3 closeout: what is proven, what is not, what Phase 4 inherits

---

*Phase 4 preview: Capacitor packaging, signing, Play Console, the closed-testing period, and the
handset measurement Phase 2 still owes — which is the one thing that can still reopen Capacitor
versus React Native, and which must be taken before, not during.*
