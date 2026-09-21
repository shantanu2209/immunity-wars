# Phase 3 — the running record

Decisions, measurements and what each sub-phase actually built. The spec is
[`PHASE3_BRIEF.md`](PHASE3_BRIEF.md); this is the log beside it.

---

## 1. P3.1, the room as a pure module: BUILT, 21 September 2026

The brief's first stage: *"rooms, seats, captain, join, drop, rejoin, reassign, end. Driven by tests
only."* No network, and none of the brief's later stages anticipated.

### What was built

**`packages/room`** — one reducer and one sweep, both pure:

```
step(room, inbound, now) -> { room, out }      sweep(room, now, graceMs?) -> room | null
```

- **No sockets.** `step` returns `Outbound[]`: addressed messages the adapter sends. The room never
  holds a connection; "connected" is a field the adapter maintains by telling the room when one
  opens or closes.
- **No clock.** Every entry point takes `now`, so the grace period is a comparison against a number
  the caller supplies and a test can move time without waiting.
- **No randomness of its own.** Room codes are minted by the caller; the engine's dice stay the
  engine's ([`FINDINGS.md`](FINDINGS.md) #40).

**The rules, as §5 wrote them**, each with a test and most with a mutation control:

| Rule | Where it comes from |
|---|---|
| The captain is the first member to join | §5, and it is the engine's own notion: `g.captain` already carries the allocation and End turn powers |
| **A disconnection keeps the member and their seats, marked away** | Ruling 4. `disconnect` and `leave` are different messages, and that difference IS the ruling |
| The captain may hand an **away** member's seat on, or free it, but may not take a seat from someone present | Ruling 4, read as "the table decides not to wait" rather than "the captain overrules a player" |
| Captain succession is the next member in **join order** who is connected, and the old captain does not get it back | §5, recommendation taken. Deterministic, so two clients agree without a vote |
| Rejoining with the same ref restores the member and the seats still theirs; join order is the one first held | §5 |
| The last connection leaving starts the grace period; `sweep` discards after 10 minutes | §5 |
| Ownership is the room's business; **legality is the engine's** | The room checks only that the sender holds the seat the action names, and passes everything else to `applyAction` unaltered |

### What is deliberately NOT here

- **No protocol.** Messages are TypeScript types, not wire formats. Zod schemas and versioning are
  P3.2, at the trust boundary where they belong.
- **No frames-or-state decision.** The room forwards the engine's burst as it comes. Whether every
  frame crosses the wire is P3.3's measurement, and writing the transport around an answer before
  measuring is what the brief forbids.
- **No AI**, no chat, no lobby: ruled out (§4 and §7).

### The instruments

**Two boundary rules, each with both halves** (`.dependency-cruiser.cjs`, controls in
`tools/ci/selftest.ts`):

- `room-no-downstream` — the room may not reach ui, app, server or session.
- **`room-no-node-builtins` — Gate B's portability requirement, as a check.** The room may not
  import a Node builtin, so it cannot grow a platform inside it. Its `mustPass` twin adds an
  `@immunity-wars/engine` import and requires the gate to stay green, because a rule that forbade
  everything downstream would satisfy the fail-control while making the room unbuildable.

**Five mutation controls on the rules themselves**, because 36 tests passing on their first run is
not evidence that they can fail. Each breaks one rule in the way someone actually would, and each
must redden the test named for it:

| Control | The mutation | Must redden |
|---|---|---|
| `room-away-seats` | a disconnection also clears the seats | *keeps an away member and their seats* |
| `room-captain-order` | succession reads array order, not join order | *passes to the next member in join order* |
| `room-seat-of-present-player` | the captain may take a seat from someone present | *cannot take a seat from someone who is HERE* |
| `room-ownership` | the seat check is skipped | *is refused when the sender does not hold that seat* |
| `room-grace` | `sweep` never discards | *discards it once the period is up* |

**All seven fired the right way on their first run.**

### The suite's own shape

36 tests, and **each forbidding test has a permitting twin**, because a room that let nobody do
anything would satisfy every "must be rejected" test ever written. The twin that matters most is on
actions: `room-ownership` proves a stranger's action is refused, and beside it a test proves the
draw — which belongs to no seat — reaches the engine and comes back with a view.

### Found while building it: an instrument that had gone inert

`pnpm ci:selftest` reported **`docs-phase-marker` INERT** on its first run of the sub-phase: the
control's mutation was the literal string `**Current phase: Phase 2**`, and the marker had moved to
Phase 3 the day before. Fixed inline (it reads the number out of the file now) and recorded as
[`FINDINGS.md`](FINDINGS.md) #76, with the rule it earns: **a control whose mutation is a literal
from the document it guards has the same lifetime as that literal.**

The harness caught it because an inert control is reported as a failure rather than a pass — a
branch written when the harness was and never fired until now.

### What P3.2 inherits

- The message shapes in `packages/room/src/types.ts`, which are the obvious first draft of the
  protocol and are **not yet validated at any boundary**. Zod, both directions, is P3.2's.
- `rulesVersion` and a protocol version appear on no message yet. The brief's definition of done
  requires both, with the refusal path proven by a control.
- The room suite is package-local, like `packages/ui`'s, so it is not in `tests/suites.json`. The
  manifest lists cross-package suites; P3.6's two-device suite is where an entry becomes due.

---

## 2. P3.2, the protocol: BUILT, 21 September 2026

*"Message types and Zod schemas both ways, `rulesVersion` and a protocol version on every message,
with a refusal path proven by a control."*

### The measurement taken before any schema was written

The view is the engine's projection and it must cross the wire **byte for byte**: seam 1's burst
tail assertion compares the last frame's view with the authoritative one as JSON text. Task C2 had
already found that Zod rebuilds objects in schema key order, so the candidate spellings were run
against **real multiplayer views** — 320 views and 448 burst frames from 9 games across the three
difficulties, generated by the engine and read back as JSON, as a client would receive them.

**Conditions:** Node 24, Zod 4.6.2, the development PC; views p50 9,304 bytes and max 23,302 bytes
as JSON.

| Spelling | Arrived byte for byte | Why |
|---|---|---|
| `z.unknown()` | 768 of 768 | passes the value itself through, and accepts anything at all |
| **`z.record(z.string(), z.unknown())`** | **768 of 768** | a new top-level object, same keys in the same order, nested objects untouched; **rejects a view that is not an object** |
| `z.looseObject({})` | 768 of 768 | the same, spelled differently |
| `z.looseObject({ turn: z.number() })` | **0 of 320** | declaring one key **moves it to the front**: `phase,turn,…` arrived as `turn,phase,…` |
| `z.object({})` | **0 of 768** | **strips every field** and reports success |

**The most natural spelling delivers an empty view and reports success.** Chosen: `z.record` — it
refuses a non-object and is otherwise the identity on bytes. Cost: 0.044 ms per view. The view's
fields are not described in the protocol at all, deliberately: their shape is the engine's, their
oracle is the corpus, and a second description here would be a second copy of the projection with
nothing keeping the two in step.

### What was built

**`packages/protocol`** (was 11 lines of scaffold):

- **`PROTOCOL_VERSION`** (1) and **`RULES_VERSION`** (the content pack's, `3.1.0`), compared for
  **exact equality**. A patch release might change only text, but "might" is the wrong word to build
  a desynchronisation guard on.
- **`encode`** is the only way a message is written, and it stamps both versions — so "every
  message carries them" is a property of the encoder, not of every call site remembering to.
- **`decodeClient` / `decodeServer`** check the versions **first and on their own**, before the body
  is read: a body shaped for another version is exactly what cannot be trusted to parse as meant.
  A mismatch is a `version` refusal carrying both sides' versions, so a client can tell a player
  which side is out of date. Anything that is not an object, or not a well-formed message, is
  `malformed`.
- **Errors are codes**, not English (`ERROR_CODES`): the client words them through its catalogue,
  because the Hindi edition is a committed deliverable. The one exception is `engine`, whose detail
  is the engine's own text — which the UI already renders through the engine catalogue in single
  player.
- **The seats and the codes live here**, the package both sides depend on. The room imports them.

### What it found, and fixed — FINDINGS #77

**Every member's credential was being handed out twice**: in the room projection (found reading
P3.1), and **inside every engine view** (found by the wire suite on its first run against real
views, which the protocol's own constructed view could not have caught). The engine projects
`captain`, `owner` and `apBudget` keyed by player id, and the room had been giving it refs as player
ids. Now members are named on the wire by public id, the engine is given `m<id>` as player ids, and a
ref crosses the wire once, in `join`. The room's `assignSeat` takes a public id accordingly.

### What it found, and fixed after a ruling — FINDINGS #78

**Captain succession does not reach the engine.** The room moves the captaincy when the captain
drops; the engine keeps enforcing its own copy, so the new captain is refused and the table stalls
until the old one returns. Both fixes cross a line — re-implementing an engine rule in the room, or
adding an engine action in a phase whose definition of done says the engine is unchanged.
Recommendation: a small, isolated engine action, the corpus proving nothing else moved. **Pinned
as a known-gap test** that goes red when the gap closes.

**Ruled the same day: fix (2).** The engine gained `handOverCaptaincy` (DEVIATIONS #7), the room
sends it on every succession during a game, and the known-gap test was inverted as it was written
to be. Brief v1.1 amends "engine unchanged" to name the exception. On its way in the fix tripped the
engine catalogue's drift test and `coverage:positions`, both correctly, and covered two multiplayer
arms nothing had reached: the deferred list is 20, from 22.

### The instruments

- **Protocol suite, 16 tests**, both halves: every kind of message in both directions must round-trip
  as well as every refusal firing. The view's byte-identity is pinned on an object built to catch
  both measured failures (keys in an order no schema would declare, `turn` late).
- **Wire suite, 6 tests** in `packages/room`: a real two-player game through the room, every message
  encoded and decoded as a client receives it — views byte for byte including inside every burst,
  the burst's tail equal to the view after it on the far side, and no ref in any message.
- **Six mutation controls**, all firing the right way on their first run: the version check removed,
  the encoder not stamping, the view schema as `z.object({})` against both the constructed and the
  real views, and each of #77's two doors re-opened.

### What P3.3 inherits

The room forwards the engine's bursts whole. Whether ten full projections should cross the wire,
or one state plus the dice, is P3.3's measurement — and it now has a real, versioned, byte-exact
wire to measure on.

---

## 3. P3.3, frames or state: the criteria, written BEFORE the measurement

This section was committed with the measurement script and before its first run, deliberately: a
threshold fitted to the number it judges is not a test ([`FINDINGS.md`](FINDINGS.md) #34). The
numbers below are mine, proposed; each carries its reason, so it can be argued with rather than
inherited.

### What is being decided

How a spread reaches a client. Today the engine returns up to ten frames per `endCommand`, each a
**full projection**, and the room forwards them whole. The candidates:

| | What crosses the wire | What it needs |
|---|---|---|
| **A. Frames whole** | every frame's full view, as now | nothing new |
| **C. Frames as deltas** | the first frame whole, each later one as a JSON diff against the one before | a diff on the relay and a patch in `RelaySession` |
| **B. State plus the dice** | the full `GameState` before the spread and every random draw it made, so the client re-runs the spread | the engine in the client's session, every RNG draw captured on the relay, and **the full state — deck order included — sent to every client** |

**B is disqualified before measuring, and on grounds that are not size.** The full `GameState`
includes `deck`, which is the future: a client holding it knows what arrives next turn, in a
cooperative game whose tension is not knowing. Sending it would also contradict seam 1, which keeps
`GameState` inside the session and never hands it out. B's size is measured anyway, so the record
says what it would have saved.

### Two worlds, because the platform is not yet known

**Whether Cloudflare's relay compresses WebSocket messages is UNKNOWN until P3.5 connects to one.**
The runtime supports `permessage-deflate` only behind a compatibility flag, and a closed workerd
issue reports the server side never accepting it, with no resolution visible. Task E recorded that
compression is the load-bearing assumption under this whole question. So every figure is taken in
both worlds:

- **uncompressed**, what a client receives if the transport compresses nothing;
- **gzip per message**, what `permessage-deflate` without context takeover gives, and equally what
  application-level `CompressionStream` gives, which exists in both Workers and Android's WebView
  and does not depend on the platform negotiating anything.

### The criteria

1. **A whole game costs a client at most 2 MB of data, as actually sent.** A common Indian mobile
   plan gives 1 to 2 GB a day; 2 MB is a tenth of a percent of that for a forty-minute game, which
   no family should notice. Checked in the world the platform actually provides.
2. **No single message exceeds 64 KiB as sent**, so the largest burst arrives in under half a second
   on a 1 Mbps link — a crowded 4G or a decent 3G connection — and a spread never waits on bytes.
3. **Choose the simplest candidate that meets both in the WORSE of the two worlds.** If A does,
   choose A: it needs nothing new, and it keeps the relay forwarding what the engine said.
   Otherwise choose whichever of "A with application-level compression" and C is simpler to get
   right, and say why.

**What the numbers will not be able to say**, stated now: the games measured are idle multiplayer
games driven through the room, which end early, like Task E's bot; late-game states are larger by an
amount these games cannot reach. So the verdict is judged on its margin: a candidate that passes
by 10× is a different claim from one that passes by 10%.

### The measurement, run after the criteria above were committed

**Conditions:** `tools/perf/frames-measure.ts`, 18 two-player games through the room (6 per
difficulty), all 14 seats held, idle play (draw, begin, confirm, end the turn); every message as the
protocol encodes it, counted for one client; gzip at Node's default level, per message; Node 24 on
the development PC. **Games lasted 5 to 11 turns (p50 9)**, because idle play loses early.

| Candidate | Whole game, max | vs 2 MB | Largest spread message | vs 64 KiB |
|---|---|---|---|---|
| A, frames whole, uncompressed | 3,370 KiB | **164%: fails** | 593 KiB | **927%: fails** |
| **A, frames whole, gzip per message** | **197 KiB** | **9.6%** | **25.9 KiB** | **40.5%** |
| C, deltas, uncompressed | 2,415 KiB | **118%: fails** | 444 KiB | **694%: fails** |
| C, deltas, gzip per message | 150 KiB | 7.3% | 15.7 KiB | 24.6% |
| B, state plus the dice (disqualified) | 1,440 / 128 KiB | 70% / 6.3% | 79 / 4.8 KiB | 124% / 7.6% |

**A view as sent: p50 8.5 KiB, max 70.5 KiB, uncompressed.**

**What a turn costs as the game ages** (candidate A, gzip): median **7.0 KiB at turn 2, rising to
12.8 KiB by turn 10 and 13.7 KiB at turn 11**; the worst turn seen was **35.4 KiB**, at turn 9.

### The verdict, by the rule committed before the run

**No candidate passes uncompressed.** The worse of the two worlds — a relay that compresses nothing —
fails every candidate on both criteria, frames whole by 9× on the largest message. So compression is
not an optimisation here: **it is required**, and it cannot be left to a platform that has not been
shown to negotiate it.

**Chosen: A with application-level compression.** Frames stay whole, as the engine produced them, and
the relay gzips each message itself (`CompressionStream`, in Workers and in Android's WebView), so
nothing depends on `permessage-deflate`. It passes both criteria on every game measured, and it is
simpler to get right than C, which would add a diff on the relay and a patch in `RelaySession` for a
further saving.

**And the margin is thinner than the table makes it look, which is the finding that matters.** The
games measured are a quarter the length of a real one, and a turn's cost roughly doubles over them.
Extrapolated in the open — not measured — a 45-turn game costs a client **about 1.0 MB at the median
trend and 1.6 MB if every turn cost the worst seen** (78% of the limit). The largest single message
grows the same way, so a long game's late spreads could approach 64 KiB. **Neither criterion is known
to hold for a whole real game; both are known to hold for every game these measurements could
reach.**

**So two things are owed, and both are recorded rather than assumed:**

1. **P3.6 re-measures on real two-device games** that run their full length. The script re-runs as it
   is; it needs longer games, not a new instrument.
2. **C is the prepared fallback.** On the measured games deltas cut the largest message by 40%
   (25.9 to 15.7 KiB), plausibly because deflate looks back only 32 KiB and a burst's frames sit up to
   ~60 KiB apart — so gzip alone cannot see most of the repetition between them. That cause is the
   likely one, not a measured one.

**B stays disqualified.** It would have been the smallest compressed (4.8 KiB for the largest message)
and it would have sent the deck — the future — to every client, and handed out `GameState`, which
seam 1 never does.

**A cross-check that agrees.** Task E measured the largest compressed burst at **25.6 KiB**, from
single-player games under the reference bot ([`TASK_E_CLOSEOUT.md`](TASK_E_CLOSEOUT.md)). This
measurement, from multiplayer games through the room and the protocol, finds **25.9 KiB**. Two
instruments that share nothing but the engine landing within 2% of each other is some evidence that
neither is measuring itself.

### What P3.4 inherits

- **Compression is the adapter's and the session's job, not the protocol's.** `encode` keeps
  returning text; the relay adapter compresses each message before it leaves, and `RelaySession`
  decompresses it on arrival. Both sides have `CompressionStream`, so nothing waits on the platform.
- **P3.6 owes the re-measure on full-length games**, with the criteria above unchanged: this section
  states in advance what "passing" means, so a later run cannot move the line.
