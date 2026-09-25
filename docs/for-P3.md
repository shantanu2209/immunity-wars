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

---

## 4. P3.4, `RelaySession`: BUILT, 24 September 2026

### The question the brief did not see

`SessionView` is more than the engine's view. It also carries `queries` — what the UI reads on
every render to decide what is clickable — and `scoped`, the answers for the selected piece (its
move destinations, the selected family's production detail). **`LocalSession` computes both from
the full `GameState` with engine functions, and a relay client never holds a `GameState`**: that is
seam 1's rule, and the reason Phase 2 ruled Decision C at all ([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md)
§3). So in multiplayer they have to come from the relay, and there are two ways:

- **ALL:** with every authoritative view, the relay sends `queries` and the scoped answers for
  **every** cell and family. The client serves its own selection from them, exactly as
  `LocalSession` does, and a tap never waits on the network.
- **ASK:** the relay sends `queries` only, and a client asks for `scoped` whenever its selection
  changes. A round trip on every tap, which on Indian mobile networks is 100 to 300 ms before the
  move rings appear.

### The measurement

**Conditions:** `tools/perf/queries-measure.ts`, 18 two-player games through the room, 618
authoritative views; every answer taken through `LocalSession`'s own code path (resume the room's
state, set each selection, read the view), so the sizes are exact rather than modelled; gzip per
message; Node 24 on the development PC.

| One view message, gzipped | p50 | max |
|---|---|---|
| the view alone, as sent today | 1.7 KiB | 2.9 KiB |
| + `queries`, needed either way | 2.2 KiB | 3.5 KiB |
| **+ scoped answers for every cell and family (ALL)** | **2.5 KiB** | **3.9 KiB** |
| one scoped answer (an ASK reply) | 0.2 KiB | 0.2 KiB |

| Whole game per client, gzipped, views and bursts | p50 | max |
|---|---|---|
| ASK | 102.1 KiB | 149.1 KiB |
| **ALL** | **116.7 KiB** | **163.7 KiB** |

**ALL costs 0.3 KiB per view over what is needed either way, about 14% on a whole game.** Phase 2
measured the same everything-for-every-subject payload at 90% of the view
([`QUERY_PAYLOAD.md`](QUERY_PAYLOAD.md)) — uncompressed, single-player, bursts excluded. Compressed
and inside a whole game it nearly disappears, because move lists are exactly the repetitive structure
a dictionary coder is best at. **Phase 2's ruling was right for Phase 2's question and does not carry
over**: there the cost was bytes in memory on one device; here the alternative costs a round trip on
every tap.

**The whole-game margin from §3 moves by the same 14%**: the 45-turn extrapolation becomes roughly
1.1 to 1.8 MB against 2 MB. P3.6's re-measure on full-length games stands, and deltas remain the
fallback.

### The proposal

1. **ALL.** The relay sends the full query set with every authoritative view; `RelaySession` serves
   selection locally from it. The UI cannot tell the two sessions apart, which is what seam 1
   promised, and no tap waits on the network.
2. **The query builder moves out of `LocalSession` into its own small package**, imported by both
   `LocalSession` and the room. That is what makes "the relay computes what `LocalSession` computes"
   true by construction: one implementation, not two that agree by test. The alternative — a second
   copy in the room — is the duplicate-calculation shape Phase 2 ruled against when `apFor` became a
   wrapper over `apBreakdown`.

**Why (2) needs a ruling:** the brief's definition of done says *"`LocalSession` is untouched"* by
`RelaySession`. Moving the builder is a refactor of `LocalSession` with its behaviour unchanged —
proven by a test that the extracted builder produces byte-identical `queries` and `scoped` on the
state corpus — but it is not "untouched" in the letter. The amendment would read: *`LocalSession`'s
behaviour is untouched; its query builder is shared, with byte-identical output proven.*

### Ruled, 24 September 2026

*"I'll go with your recommendations."* Both: **ALL**, and **the builder moves**. The brief's
definition-of-done line becomes *"`LocalSession`'s behaviour untouched; its query builder shared,
byte-identical output proven"* ([`PHASE3_BRIEF.md`](PHASE3_BRIEF.md) v1.2).

### What was built

- **`@immunity-wars/session-core`**, a new package: `precompute` and `scope` (the bodies of
  `LocalSession.precompute` and `LocalSession.scope`, moved with `this.g` as `g`), the query lists,
  the view and selection types, and FINDINGS #56's `advanceIdsPast`. Added for the relay:
  `scopeAll` (every cell's and every family's scoped answer) and `scopeFrom` (one selection's,
  read out of them). `LocalSession` calls the moved functions; `@immunity-wars/session`
  re-exports the moved types, so its public API is what it was.
- **Protocol v2** (`packages/protocol`). A view carries `queries` and every scoped answer. An
  action carries an `id`, and the relay answers it with a `result` for that id, to its sender only.
  `create` asks the relay for a room, and the relay mints the code. New codes: `noSuchRoom`,
  `version`, `undoIsSinglePlayer`. **The framing** (`pack`/`unpack`) is written once, here, for
  both sides: gzip of the UTF-8 of `encode`'s text, with a limit on what a frame may unpack to,
  64 KiB for a client's message and 8 MiB for the relay's.
- **The room** sends views with the shared builder's answers. It advances the invader-id counter
  before every engine call. It answers actions by id, refuses undo, and hands the current board to
  anyone arriving mid-game.
- **The relay** (`packages/server`). `hub.ts` holds rooms, connections, framing and routing, with no
  platform in it, and handles every frame, close and sweep in one chain in arrival order. `node.ts`
  is the adapter: `ws`, 76 lines of code. `pnpm --filter @immunity-wars/server relay` runs it on
  this machine.
- **`RelayRoom` and `RelaySession`** (`packages/session/src/relay.ts`). `RelayRoom` is the
  connection and the lobby: create, join, seats, start, leave. `RelaySession` implements `Session`
  for the game, and is handed out when the first view arrives.

### What proves it

| Check | What it measured | How it is known to fire |
|---|---|---|
| `tools/perf/queries-identity.ts` | **650 states** (single-player and multiplayer), each under 14 selections: none, 7 cells, 6 families. **9,100 views**, one SHA-256 over all of them: **`68ae2c7d…6c2043` before the move and after it**, and again after the last change to `local.ts` | Flipping `boosted` in the builder gives `fae433ef…`; restored after |
| `relay-queries.test.ts` (tests/session) | `scopeFrom(scopeAll(g), s)` equals `scope(g, s)` for 16 selections on **208 states**: **1,248** cell selections with moves to compare, **1,456** family selections with a breakdown, **208 of them family X**, which the identity run did not cover. The same states show that computing everything leaves the game unchanged | `session-core-scope-from`, `session-core-pure` |
| `room.test.ts`, `wire.test.ts`, `ids.test.ts` | Results by id, the refused undo, the board sent to a rejoiner, and queries and scoped answers **byte for byte** on real views through encode and decode. Two rooms interleaved in one process never hand out one id twice | `room-undo-refused`, `room-rejoin-view`, `room-ids-across-rooms`. `ids.test.ts` failed 5 of 5 before the fix |
| `hub.test.ts` | One link's frames are handled in arrival order **when a later frame finishes unpacking first**. A takeover's old close changes nothing. Other versions are refused. Codes are normalised, discarded after the grace period, and minted without bias | `hub-order`, `hub-takeover` |
| `relay.test.ts` | Real sockets, gzip, versions. Two clients agree with each other and with the relay after every action. A relay client sees what `LocalSession` sees for every selection. The selection clears where `LocalSession` clears it, with both outcomes exercised. Covered too: rejoin, takeover, undo, ownership, both directions of version refusal, and a gzip bomb | `relay-selection-boundary`, `relay-scoped-selection` |

**Every new check was made to fail on purpose before it was trusted**, and ten product controls,
the nine above and `frame-limit` on the protocol's bomb test, are now permanent in `tools/ci/selftest.ts`, beside six boundary controls (#82).

### What it found

- **The framing could have taken the whole relay down.** When a frame failed to decompress, the
  writer's rejection was never awaited. The framing's own refusal tests reported **2 unhandled
  errors** beside a green test count. Under Node an unhandled rejection ends the process, so one bad
  frame from one client would have closed every room. Fixed before anything listened. A green count
  with errors beside it is a red run.
- **FINDINGS #79:** the engine's undo stack is the whole table's, so undo is refused in rooms.
- **FINDINGS #80:** the snapshot half of the id workaround reads a key the engine never writes.
  Unreachable for now.
- **FINDINGS #81:** a seat reassigned mid-game never reaches the engine's `owner` map, so every
  view names the old holder. The game still plays.
- **FINDINGS #82:** `room-no-downstream` refused the ruled edge `room → session-core`, and had
  never had a failure control. An instrument defect, fixed inline.
- **FINDINGS #83:** one UI test failed once and never again. Unexplained.

### What is not proven, and what P3.5 inherits

- **Everything above ran on one machine**, over loopback. Real networks, two devices and the
  22 coverage arms are P3.6's, as the brief orders them.
- **Nothing reconnects by itself.** Rejoining with the same code and the same `self` works, and is
  tested. Doing it without asking is the multiplayer screens' job (P3.7).
- **The Node relay has no rate limit, no connection cap and no TLS**
  ([`SECURITY_NOTES.md`](SECURITY_NOTES.md), "the relay"). These are owed at P3.5.
- ⚠️ *Superseded the same day by §5.* These two lines assumed Cloudflare: the limits "where the
  platform provides them", and "P3.5 writes a second `node.ts`, not a second hub", for one Durable
  Object per room. With the relay on Oracle, P3.5 deploys `node.ts` as it is, and the limits are the
  relay's own.

---

## 5. P3.5, the relay's home: ORACLE, ruled 24 September 2026. The deployment PROPOSED, nothing built

### The ruling

*"If this seems fine then let's adjust what needs adjusting from cloudflare to oracle."* Oracle
Cloud's Always Free tier replaces "Cloudflare, free plan, for now" (ruling 5, 20 September). Brief
v1.3. On keeping the server from being reclaimed: *"Pay as you go is also a genuine option to go
for"*, and other projects of ours may genuinely use the spare capacity, *"not just for the sake of
keeping the server up"*.

Also ruled the same day: a join naming a code the relay does not hold is refused (*"Yes incorrect
code should be refused"*), which is how P3.4 built it.

### The comparison that decided it

**Conditions.** The free allowances were read on each provider's pages on 24 September 2026. The
AWS, Azure and Oracle-reclamation rows were read from search-result summaries rather than the
providers' own pages; re-read them before relying on them. What a game costs was measured on the
development PC (Intel i7-12700F, Node 24) through the real hub with real gzip framing, over 30
two-player games that only drew, began, confirmed and ended each turn (9 turns median, so short):

- **Relay time per action:** p50 0.6 ms; an end of turn p50 1.5 ms, p95 3.9 ms, worst 9.5 ms.
- **Data out per player:** p50 14 KiB a turn, at most 24 KiB. For a full 45-turn game the planning
  figure is **up to 2 MB per player**, consistent with §3's extrapolation.
- **A room's state:** about 17 KiB. Memory is not a limit anywhere.

| | Free for how long | What binds us | Free games a month | Lag from India |
|---|---|---|---|---|
| **Oracle** | Always | Nothing at our scale: 10 TB a month out; 2 Arm cores, 12 GB | Effectively unlimited | Regions in Hyderabad and Mumbai |
| **Cloudflare** | Always | Running time: a room held in memory for a 40-minute game and the 10-minute grace costs about 384 of 13,000 GB-s a day | About 1,000 (33 a day) | Not documented: nothing says a data centre in India hosts Durable Objects |
| **Google** | Always | 1 GB a month out, and US regions only | About 125 four-player | A round trip to the US |
| **AWS** | 6 months | The free plan account closes when the credits or six months run out | — | — |
| **Azure** | 12 months (a VM) | Paid after the first year | — | — |

The lag column is typical internet behaviour, not a measurement of ours; measuring it from a phone is
this stage's first measurement.

### What the choice costs, so it is not forgotten

- **We own an operating system.** Patching is ours; security updates install themselves (below).
- **Oracle reclaims free servers that look idle**: CPU, network and, for Arm, memory all under 20%
  over seven days. Pay As You Go is reported by the community, not by Oracle's pages, to prevent it,
  charging only above the Always Free limits; a budget alert catches a mistake. By design nothing on
  the server needs keeping, so a reclaimed server is a rebuild from a script, not a loss.
- **Rate limiting, a connection cap and TLS are ours**, where a managed platform would have provided
  them.
- **A published allowance has an expiry date.** Oracle halved its Arm allowance in June 2026, from 4
  cores and 24 GB to 2 and 12. Gate B re-reads it on the day of deployment.

### The proposal: what P3.5 builds, in order

1. **On the development PC, nothing deployed:**
   - a per-address connection cap and a per-connection message rate in the Node adapter, with the
     address held in memory only and never logged;
   - the relay as **one bundled file** (esbuild, `ws` included), so the server runs one file on
     Node's long-term-support release and nothing is built or installed there;
   - **the server setup as a script**: an unprivileged user for the relay; a service that restarts
     it on failure and at boot; automatic security updates; a firewall open only for SSH (keys only)
     and HTTPS; Caddy for the certificate, with **no access logs**, because an IP address is personal
     data under the DPDP Act;
   - a deploy script from the development PC, and a rebuild script for a reclaimed server.
2. **Shantanu's steps**, which nobody else can take: the account, with a phone and a card that is
   not charged; the home region; Pay As You Go and the budget alert, if taken; the server created
   in Oracle's console, with the exact clicks supplied; the public key from the development PC added
   to it; a hostname.
3. **Setup over SSH from the development PC**, each step asked for first.
4. **Measured and recorded, for Gate B:** lag from a phone in India; relay time per action on the
   server itself (this section's measurement, re-run there); data per game; the free allowance
   re-read that day.

### Rulings needed before building

1. **The home region: Hyderabad or Mumbai.** It is chosen once, at sign-up; Always Free servers can
   exist only there; Oracle's pages do not say it can be changed.
2. **The hostname**, which the certificate needs and Android requires (it blocks unencrypted
   connections by default): a free subdomain, such as DuckDNS, or a domain of our own. The app will
   carry the address, so changing it later means an app update, and a free subdomain service can
   disappear. **Recommendation: a free subdomain is enough for P3.5 and P3.6; a domain of our own
   before any build reaches a tester.**
3. **Isolation when other projects share the server.** The free Arm allowance splits into two
   servers of one core and 6 GB each. **Recommendation: the relay's server runs only things that
   store no personal data, and anything that stores personal data gets the other server.** It costs
   nothing, and a break-in through one cannot reach the other.
4. **One bundled file rather than a checkout of the repository** on the server. **Recommendation:
   the bundle**: nothing to build or install there, and the smallest set of code on a machine the
   internet can reach.

### Ruled, 24 September 2026

1. **The home region: delegated** (*"Choose either. I leave it to you."*). **Chosen: Mumbai.** The
   difference is small: both are in India, a few milliseconds apart for most players. Mumbai is
   where most of India's undersea cables land and its largest internet exchanges are, so most
   Indian networks reach it directly. Neither region is known to have more free Arm capacity; if
   none is free at sign-up, the AMD servers are enough for the relay.
2. **The hostname: a subdomain of a domain we already hold**, pending one check: the domain
   carries a contributor's name, so the address the app carries would point at a personal site.
   **The name is kept out of this repository until that is settled.** If it is not used, another
   domain will be got.
3. **Isolation: ruled as recommended** (*"Makes sense."*): the relay's server runs only things that
   store no personal data; anything that stores personal data gets the other server.
4. **One bundled file: ruled as recommended** (*"I'll go with your recommendations."*). Its one real
   risk is that the bundle is not the code the tests ran, so **the relay's integration test runs
   against the bundled file itself** before any deploy, with a control that breaks the bundle and
   must turn it red.

### Settled: the hostname

The domain can be used: nothing is published at its root, and its one other subdomain sits behind a
sign-in. The relay's address is **`wss://immunity-wars.kartikchaudhary.com/relay`**, with the DNS
record added at the domain's registrar ([`packages/server/deploy/README.md`](../packages/server/deploy/README.md),
step 4).

### Open rulings, put to Shantanu on 24 September 2026

Built on the recommended default where the build needs one; each is a small change if ruled
otherwise.

1. **FINDINGS #80's one-word fix.** Recommended: take it, as its own PR after P3.5.
2. **FINDINGS #81, ownership after a reassignment.** Recommended: rule now that the multiplayer
   screens read ownership from the room's projection, never from the engine's `owner`.
3. **Multiplayer autosave (brief §5's open question).** New since the brief recommended it: a relay
   client holds no `GameState`, so a save would mean sending one device the whole game, hidden deck
   included, and a restart would mean the relay trusting a game uploaded from a phone.
   Recommended: **no autosave in multiplayer v1**; the grace period covers a lost connection, restarts
   happen at night, and deploys wait for an empty relay.
4. **The Phase 3 brief review.** Recommended: after P3.5, before P3.6, because P3.6 checks Gate A
   against the brief's words.
5. **Restarts for security updates.** Recommended, and built: automatic, at 03:30 IST, only when an
   update needs one. A restart ends every game in progress.
6. **The limits.** Recommended, and built: the generous values in
   [`SECURITY_NOTES.md`](SECURITY_NOTES.md), because shared addresses are common on Indian mobile
   networks.
7. **The server key.** Recommended, and written into the guide: a passphrase Shantanu types himself,
   held by the Windows key agent, so no script ever sees it.

### P3.5, part one: built on the development PC. Nothing deployed

- **The limits** in the hub, each with a refusing test, a permitting twin and a control:
  `hub-connection-limits`, `hub-message-rate`, `hub-wrong-codes`, `hub-join-deadline`.
- **The address** a connection is counted by, believing `X-Forwarded-For` only from the TLS front on
  the same machine (`node-forwarded-for-from-front-only`).
- **The heartbeat**, which found FINDINGS #84: a phone that loses its signal would otherwise have
  stayed "present" for up to hours (`node-heartbeat`).
- **The bundle**: `pnpm --filter @immunity-wars/server bundle` writes one file of about 1.2 MB. The
  bundle test builds it with the production recipe, starts it as its own Node process in a folder
  where nothing from this repository can be found, and plays a turn with two clients who agree
  (`bundle-recipe` breaks the recipe and the test goes red).
- **The server's setup, the deploy, and Shantanu's guide** in
  [`packages/server/deploy/`](../packages/server/deploy/README.md). **Not yet run anywhere**: they
  are checked on the server the first time, and that first run is where they will be found wrong if
  they are.

**Measured:** the server package's suite went from 22 tests to 35. Seven new controls, each run and
seen to fire on its own test.

**Not yet built:** the tool that measures the relay's time per action on the server itself, for Gate
B. It is written when there is a server to run it on.

### Superseded 25 September 2026: Google Cloud, because Oracle refused the sign-up

**What happened.** Oracle's sign-up verified the card and then refused to create the account, on
every attempt, with a generic *"an error occurred while creating your account"* that names no reason.
Shantanu asked *"can we try google cloud instead? using a VM or someting like that?"*. Brief v1.4.

**Google's free tier, read on 25 September 2026** (its own pages unless marked):

- One `e2-micro` server (a quarter of a processor sustained, 1 GB of memory), **only in Oregon,
  Iowa or South Carolina**; 30 GB of **standard** persistent disk; 1 GB a month of data out from
  North America. A card is required.
- **The billing account must be upgraded before the 90-day trial ends**, or the server is stopped;
  the free tier continues on a paid account, which is charged only beyond it.
- Data beyond the free gigabyte: $0.12 a GB at the base Premium rate, per third-party summaries;
  **the rate to Asia could not be read** and may be higher. About 8 MB a four-player game, so a few
  paise a game above about 125 games a month.
- **The external IP address is reported as free on the free tier**, in a search summary quoting
  Google; **not confirmed on Google's own pages**. The budget alert is what would show otherwise.

**Measured: the lag from the development PC to each region.**

**Conditions.** 25 September 2026, from the development PC on its usual connection; Google's own
per-region ping services (`gcping`), timing each request from the moment its secure connection was
set up to the first byte back, which is the round trip from Google's nearest edge to the region.
Eight requests per region, the first two discarded as warm-up, the median of the six reported.
These are Google's services, not our relay; the relay's own round trip is P3.5's first measurement
once the server exists.

| Region | Free | Median round trip |
|---|---|---|
| **`us-west1`, Oregon** | Yes | **242 ms** |
| `us-central1`, Iowa | Yes | 300 ms |
| `us-east1`, South Carolina | Yes | 309 ms |
| `asia-south1`, Mumbai | No | 34 ms |

**Chosen: Oregon**, the fastest free region by measurement. The home-region ruling for Oracle
(Mumbai) no longer applies. The isolation ruling stands, and has nothing to act on here: a 1 GB
server cannot host the other projects anyway.

**What changed in part one:** `packages/server/deploy/README.md` rewritten for Google; `setup.sh`
gains a 1 GB swap file (the server has 1 GB of memory), installs `iptables-persistent`, whose plugin
actually saves firewall rules and which Google's image lacks, and names no provider, since nothing
in it is Google's. The relay itself is unchanged.

### Ruled 25 September 2026: Mumbai, paid, for the lag

*"No going with Mumbai, we have 3 months of free then by upgrading I get to keep the free credits so
it should last a while."* Brief v1.5. The server is Google Cloud's `e2-micro` in `asia-south1`: 34 ms
a round trip from the development PC, against 242 ms to Oregon.

**One premise corrected, on Google's own Free Tier page, read the same day:** the $300 credit is
valid for 90 days, and *"you keep any unused credit until it expires 90 days from the Free Trial
signup"* — upgrading keeps the server running, not the credit. So the relay costs **about $12 a
month (roughly ₹1,000) from day 90**: about $8 for the server and its standard disk (the console's
estimate), about $3.65 for the public address ($0.005 an hour, Google's 2024 price), and every
gigabyte of data, since the free gigabyte applies only to data from North America.

**Gate B's "inside a free plan" is amended in the brief (§1, §8)** to "the cost recorded at measured
traffic", because by ruling it no longer runs on a free plan. The deploy guide says Mumbai, a budget
alert near the expected cost, and how to read the real bill before the credit hides it.

### P3.5 part two: DEPLOYED, 25 September 2026

**The relay is live at `wss://immunity-wars.kartikchaudhary.com/relay`**, on Google Cloud's
`e2-micro` in Mumbai: Ubuntu 26.04 LTS, Node 24.21.0, Caddy 2.11.4, a Let's Encrypt certificate.
Shantanu created the account, the server, the key and the DNS record from the guide; setup and
deploy ran from the development PC over SSH, with his go-ahead.

**Measured, live, from the development PC** (`tools/perf/relay-live.ts`): six scripted two-player
games through the internet, the TLS front and the relay in Mumbai, 42 turns and 168 actions.

| | p50 | p95 | max |
|---|---|---|---|
| Each action, from `sendAction` to its answer, the new view already in hand | **35 ms** | 44 ms | 345 ms, once |
| An end of turn, the heaviest action | 38 ms | 48 ms | 55 ms |
| Creating and joining a room, both clients | 285 ms | | 365 ms |
| Data to one player, gzipped as sent | **13.0 KiB a turn** | | 18.1 KiB |

- **On the server itself:** the relay used 1.56 s of processor time for those 168 actions and the
  rooms around them, about 9 ms an action on the `e2-micro`, including the first moments of a
  freshly started process; and 30 MB of memory idle, 48 MB at its peak.
- **A full-length game** at the measured rate would be about 0.6 to 0.8 MB per player, under §3's
  planning figure of 2 MB. Scripted games are short, so that is an extrapolation.
- **Not yet measured:** from a phone, on a mobile network (P3.6), and the real bill, which Google's
  report shows a day after use.

**What the live relay found, each fixed and each with a control:**

1. **An action's answer came before the room's end** when that action ended the game, so a client
   whose promise had resolved still thought the game was on, and the first live run was refused
   for sending its next draw into an ended room. The answer is now the last thing an action causes
   (`room-result-after-ending`).
2. **The deploy checked too early**: one request two seconds after the restart got 502 while the
   relay was still starting. It now asks for up to 30 seconds.
3. **Caddy's error log recorded the address of whoever's request failed** (FINDINGS #85). Now
   filtered out, and proved both ways on the live server with a deliberate 502.
4. **The setup validated Caddy's configuration after putting it live**, which a bad file would have
   turned into a Caddy that fails at the next restart. It now validates first.
5. **The server runs Ubuntu 26.04, not 24.04**, and Google's image has no host firewall at all; the
   setup now opens host ports only where the host rejects traffic.

### Ruled 25 September 2026: every open question, as recommended

*"I will go with your recommendations on each. I had added the passphrase. Do not want to revisit
anything."* The seven questions put to Shantanu on the 24th, two from brief §5 that P3.1 had built on
the recommended default, and one new one:

| # | Question | Ruled | Where it lands |
|---|---|---|---|
| 1 | Restarts for security updates | Automatic, 03:30 IST, only when an update needs one | As built (`setup.sh`) |
| 2 | The relay's limits | As built | `LIMITS` in `packages/server/src/hub.ts` |
| 3 | How long the server keeps its system log (new) | 7 days | `setup.sh`: retention 7 days, files closed daily, since the log is trimmed by whole file |
| 4 | Does the original captain get the captaincy back? | No | As built; brief v1.6 §5 |
| 5 | How long an empty room is kept | 10 minutes | As built; brief v1.6 §5 |
| 6 | Multiplayer autosave | Not in this version | Brief v1.6 §5, which reverses its own earlier "yes" |
| 7 | FINDINGS #80's one-word fix | Take it | Its own small PR, after this one |
| 8 | FINDINGS #81, whose piece | Screens read the room's projection, never the engine's `owner` | Binds P3.7; no engine change |
| 9 | The Phase 3 brief review | Before P3.6 | The next piece of work after #80 |

**Also settled:** the server key has a passphrase, held by the Windows key agent; and none of P3.4's
build choices is to be revisited (six-character codes, the frame limits, when the selection clears,
no automatic reconnect).

---

## 6. P3.7, the multiplayer screens: BUILT and audited

Ruled to come before P3.6 (brief v1.7, review R1). P3.7 is the whole of what a player sees to play
together: getting into a room, playing their part of a shared game, and what happens when someone
drops. P3.6 then plays full games on it, on two phones on two networks.

### What already exists to build on

- **The play screen takes any session of the right shape** (`PlaySessionLike`, `PlayScreen.tsx`), so a
  `RelaySession` fits it as it is. Nothing below the screens needs changing to show a shared game.
- **Phase 2 designed the allocation phase in**: `planning.ts` reads the pool and each player's budget,
  and the planning screen has a slot for it (block d), read-only, *"no controls until Phase 3 builds
  them"*.
- **The automatic draw already records the rule it must learn**: *"in a multiplayer game the engine
  accepts a draw only from the captain, so only the captain's client may send it. Nothing here
  decides that yet"* (`autoDraw.ts`).
- **The navigation stack, the catalogue and the title screen** take new screens the way Phase 2's did.
- **`RelayRoom`** creates, joins, claims and releases seats, starts, leaves, and reports the room, its
  refusals and a closed connection.

### What would go wrong as it stands, measured on 25 September 2026

1. **Every player would see the table's Action Points as their own.** In a multiplayer game the view's
   `ap` stays at the table's total while each player spends from their own budget. Measured: after
   the captain split 6 as 3 and 3, the view still said `ap: 6` to both. The screen reads `ap` in five
   places, including the one that decides which actions to offer, so it would offer actions a player
   cannot afford.
2. **Every player would be offered every piece.** The screen assumes one player holds all fourteen
   seats; the room refuses anyone else's (`notYourPiece`). Offers must come only from the player's own
   seats, read from the room's projection, never the engine's `owner` (ruled, FINDINGS #81).
3. **Every player's device would try the captain's actions**: the automatic draw, Begin command,
   confirming the allocation, End turn. The engine refuses them from anyone but the captain.
4. **The captain has no way to hand out Action Points**: the allocation slot has no controls.
5. **Refusals the relay words as codes have no words**: `notYourPiece`, `lobbyClosed`, `noSuchRoom`,
   `version` and the others arrive as codes, and the undo reason `multiplayer` has no line (#79).
6. **Nothing shows a lost connection, or rejoins.**

### The proposal, in four pieces

**A. The way in.** From the title screen, *Play together*: type a name, then **Create a room** or
**Join** with a code. A created room shows its code large, with the phone's share sheet and Copy. The
lobby shows who is in and who is away, and the fourteen seats: tap a free one to take it, tap your own
to give it back. The captain chooses the difficulty and starts; everyone else sees that the captain
is choosing. Every refusal is worded: no such room, the game has already started, the app needs
updating, too many attempts.

**B. Playing your part.** Actions are offered only for your own seats, and your Action Points are
your own budget. Other players' pieces show their player's name and can be inspected, not moved. The
captain's device alone draws, begins command and ends the turn; everyone else sees whose move it is.
The captain gets the allocation controls, and undo says it is single player only.

**C. When someone drops.** Away players are marked on the seat list and on their pieces. The captain
can hand an away player's seat to someone present, or free it, or the table waits (ruling 4). Your
own lost connection shows as such, and the app rejoins by itself.

**D. The end and leaving.** Everyone reaches the Result. *Leave* gives your seats back to the table,
where closing the app does not.

**Built as before:** each piece with tests that fail first, every string through the catalogue (the
Hindi edition), no dashes in player text, and the 360-pixel audit extended to the new screens, run
against a relay on the development PC. **First, a spike**: the existing play screen driven by a
`RelaySession` in the development shell, to find what reading has missed before anything is designed
around it.

### Rulings needed before building

1. **Where the way in lives.** A *Play together* button on the title screen, beside *New game*. Or
   inside *New game*, as a second choice after the difficulty. **Recommendation: the title screen**:
   the difficulty is the captain's choice in the lobby, not a first step for everyone.
2. **The name a player types.** Remember it on the device, so it is filled in next time; it is never
   sent anywhere except when joining a room, and Settings can clear it. Or ask for it every time.
   **Recommendation: remember it on the device.**
3. **How the captain hands out Action Points.** A row per player with minus and plus, starting from
   an even split already filled in, and the pool's remainder shown. Or starting from nothing.
   **Recommendation: the even split**, so the common case is one tap on Confirm.
4. **A dropped connection.** The app rejoins by itself for about 30 seconds, quietly, then shows
   *Reconnect*. Or it shows *Reconnect* at once. **Recommendation: rejoin by itself first**: a phone
   that loses signal in a lift should not need a child to notice.
5. **Other players' pieces.** Shown as normal, with the owner's name, inspectable but not movable. Or
   dimmed. **Recommendation: shown as normal**: in a cooperative game, the whole table is everyone's
   to read.
6. **Sharing the code.** The phone's share sheet (to WhatsApp and the rest) and Copy. Or Copy only.
   **Recommendation: both.**

### Ruled, 25 September 2026

1. **The way in is a *Play together* button on the title screen**, as recommended.
2. **The name is typed every time** (*"I think make them type every time for now"*). Nothing about a
   player is kept on the device between rooms. *Not the recommendation*, which was to remember it on
   the device.
3. **The allocation starts with every other player at zero and the whole pool with the captain**,
   who hands it out. *Not the recommendation* (an even split filled in). This is also what the engine
   does when the phase begins, so the controls start from the engine's own state.
4. **A dropped connection shows *Reconnect* at once** (*"Let the choice to rejoin be one that is made
   consciously"*). Nothing rejoins by itself. *Not the recommendation*, which was to rejoin quietly for
   about 30 seconds first.
5. **Other players' pieces are shown normally**, with their player's name, inspectable and not
   movable, as recommended.
6. **The code is shared through the phone's share sheet and Copy**, as recommended.

### The spike, 25 September 2026: the existing play screen on a `RelaySession`

A throwaway page (deleted, never committed) joined a room on the live relay and handed the existing
play screen a `RelaySession`: a host holding four cells and a guest holding three, in two browser
tabs on the development PC.

**It works where the proposal said it would.** The play screen took the relay's session unchanged.
Both players saw the goal, the drawn card, the planning screen, Phase 2's allocation block, and the
command phase, all from the relay's views, with nothing below the screens changed.

**What it confirmed, and what it added:**

1. **The table's Action Points shown as each player's own.** In the command phase the guest's screen
   said *AP 6* with a budget of 0.
2. **Every piece offered to everyone.** Selecting the host's Monocyte, the guest was offered Engulf
   and Strike.
3. **The captain's actions offered to everyone.** The guest's *Command your cells* was refused by the
   engine (*"Only the captain begins the command phase."*, shown in its own words); *Confirm the plan*
   and *End turn* were on the guest's screen too.
4. **New: the allocation block names players by the engine's ids**, *m1* and *m2*, not the names they
   typed. It must read the room's projection, as ruling 5 on #81 has every screen do.
5. **New, by timing:** the automatic draw fires on whichever device reaches the moment. The host's
   drew first here, so the guest's never fired; with the other timing the guest's would be refused.
6. **New, a wording question for piece B:** the goal says *"You command the body's immune cells"*,
   true in single player, where one person commands them all.

None of it changes the four pieces. It confirms that piece B is the heaviest.

### Piece A, the way in: BUILT, 25 September 2026

**What a player sees.** The title has *Play together* beside *New game* (ruling 1). It asks for a
name, typed every time and never kept (ruling 2), then offers **Create a room** or **Join** with a
code; a code is read however it is typed, in lower case or with spaces. The lobby shows the code
large, with the phone's share sheet where there is one and Copy always (ruling 6); who is in, who is
the captain, and who is away; and the fourteen seats, each naming its holder, a resident also naming
its organ. A free seat is taken with a tap and your own given back with another. The captain chooses
the difficulty and starts; everyone else reads *Waiting for Asha, the captain, to start the game.*
Start takes every player to the game. **Leave the room** gives the seats back, and says that closing
the app does not.

**Every refusal is in words**: each of the relay's codes, each reason it closes a connection for,
and *could not reach the game* for a connection that never opened, which is not the same as one that
was lost. A newcomer after the start reads *That game has already started. You can join the next
one.*

**A lost connection shows Reconnect at once** and nothing rejoins by itself (ruling 4). The seats
stay readable and cannot be tapped until the player chooses to come back.

**Decided here, not ruled, and easy to change:** the back gesture on the lobby does nothing. Leaving
a room is its own button with its own explanation, so a gesture made by accident should not do it;
and taking the player back to the title while still connected would leave them in a room with no way
to see it.

**Where the relay is:** the deployed one, unless a build names another with `VITE_RELAY_URL`.
`.claude/launch.json` has `relay-local` and `app-local-relay`, the pair every check below ran on.

**A game played together never deletes the single-player autosave.** The Result is where a finished
game's save is deleted, and a game played together never wrote one; without this, finishing a game
with friends would have thrown away the game the player had going on their own.

### What proves it

- **The rules, as pure functions** (`packages/ui/src/together/model.ts`), 12 tests: codes, names,
  the seat list in the engine's order, when the captain may start, and the words for every refusal
  code, every close code, a code nobody expected, and a connection that never opened.
- **Every key the three screens name is in the catalogue**, read out of their source, so a key added
  to a screen and forgotten in the catalogue fails without being listed twice. Control:
  `together-keys-in-catalogue`.
- **Two relay tests over real sockets**, for the two defects building this found (#88). Controls:
  `relay-entry-close-reason`, `relay-leave-sent-first`.
- **A walkthrough of three players at 360 × 740**, headless Chrome on the development PC against the
  local relay: 27 checks pass. Create, join by a code typed in lower case with spaces, take seats,
  give one back, a dropped connection shown at once and not rejoined by itself, Reconnect restoring
  the seats, a third player leaving and their seat coming free, the back gesture leaving the captain
  in the lobby, Start taking both players to the game, and a latecomer refused in words. The
  walkthrough is a throwaway script, not an instrument; the audit below is the instrument.
- **The one failure it reported is not this piece's:** the page asks for `/favicon.ico` and the app
  has none. It had none before P3.7; the app's icon is Phase 4's packaging.

**Found and fixed before it was committed:** a seat that cannot be tapped took the browser's grey for
a disabled button, so while a connection was lost the whole seat list, and at any time the seats
other players held, were close to unreadable. The seat's colour is now set: its name is 12.2 to 1
on a taken seat's ground and its smaller lines 4.68 to 1. The walkthrough checks every seat's colour
while the connection is lost, and reported all 14 faint with the fix removed.

### What piece A does not do

- **The 360-pixel audit is not yet extended to these screens.** It runs against a build, and a build
  talks to the deployed relay unless told otherwise; an audit must not fill the live relay with
  rooms. It is extended once, after piece D, over every new screen, against a build pointed at a
  relay on the development PC.
- **A player whose app is closed, or whose page reloads, cannot come back as themselves.** Rejoining
  needs the same `self`, which lives in memory only, so after a reload the player is a newcomer, and
  a newcomer is refused once the game has started. Their seats wait, away, until the captain hands
  them on. This is piece C's, and it needs a ruling: see below.
- **Everything the spike found is still true on the play screen**, and is piece B's.

### Ruling needed for piece C: coming back after the app closes

Phones close background pages. A player who switches to WhatsApp to send the code, and whose
browser is reclaimed, loses their place for good as things stand.

- **(a) Keep the room's code and the player's `self` on the device while they are in the room,**
  and forget both when they leave or the game ends. The title then offers *Rejoin room ABC123*,
  which the player chooses (ruling 4), and they type their name again (ruling 2). `self` is a random
  value made on the device; it identifies nothing and no one outside the room.
- **(b) Keep nothing.** A player who loses the app loses their place, and the captain hands their
  seats to someone present.

**Recommendation: (a).** It is what makes *closing the app is not leaving* true on a phone, where
the operating system closes the app more often than the player does. It keeps nothing about the
player, only which room they were in, and only until they leave it.

**Ruled, 25 September 2026: (a)** (*"Will go with your recommendations"*). Piece C builds it.

### Piece B, playing your part: BUILT, 25 September 2026

Everything the spike found on the play screen, fixed:

1. **Your Action Points are your own.** In a game played together the view's `ap` is the table's
   total, so the screen now reads each player's own budget where it reads `ap`
   (`packages/ui/src/play/table.ts`, `seenBy`). This reads the engine's rule rather than making one:
   the engine gives a player exactly `apBudget[pid]`. The bar, the offers and the reasons all follow
   from that one place. Tapping the AP figure shows the table's total, your own, and what every
   player has left, which is what the captain needs to see before ending the turn.
2. **You are offered only your own pieces.** Whose seat is whose comes from the room, never the
   engine's `owner` (FINDINGS #81). Another player's piece can be selected and read; it offers
   nothing, and its name is shown with *Asha plays this piece.* (ruling 5). The body's actions,
   such as ordering antivenom and vaccinating, belong to no piece and are open to anyone with the
   points.
3. **The captain's steps are the captain's alone.** Only the captain's device sends the draw, Begin,
   Confirm and End turn. Everyone else's button says who they are waiting for (*Waiting for Asha to
   begin*, *Asha ends the turn*) and is drawn as a status, not a button, because it can stay that
   way for a whole turn.
4. **The captain hands out the points** (ruling 3). Every other player starts at nothing and the
   pool is the captain's, which is the engine's own state when the phase begins; each row has −1
   and +1. Everyone else sees the same block, without buttons.
5. **Names, not `m1` and `m2`**, everywhere a player is named.
6. **Undo says why**: *Undo is only in games played alone* (FINDINGS #79).
7. **The goal is worded for the table**: *Together you command the body's immune cells, each player
   moving their own.*

**Decided here, not ruled, and easy to change:**

- **The captain's plus and minus change a draft on the captain's phone, and Confirm sends it.** The
  engine lets only a player give their own points back (`returnAP` takes the sender's), so a point
  sent on each tap could not be taken back by the captain. On a draft, minus is free; Confirm then
  sends one `allocateAP` per player and `confirmAllocation`, each checked by the engine as always.
  The cost: the other players see the points only when the captain confirms.
- **The first-game coach is off in a game played together.** Its steps (*tap End turn*) are the
  captain's there, so it would teach half the table something they cannot do.

**Also moved:** the engine's name for a member (`m` and their join order) and a resident's seat
key were private to the room; they are now in the protocol package, which the room and the screens
both read, so the two cannot drift.

### What proves it

- **Offered ⊆ accepted, at a table of two** (`tests/session/src/table-offers.test.ts`). Games are
  played through the room itself: two members take seven seats each, the captain draws, begins,
  hands out the points (a different split each turn, some leaving the other player with none) and
  confirms, and both players act, each only through what the screen offers them. At every state,
  every offer to either player, for every piece and for the body, is sent to a copy of the room.
  **Measured: 75 states, 6,488 offers, every one accepted**, including actions on pathogens for
  both players (Engulf, NET, Snipe, NK kill) and the body's.
  - **Both controls inside the test fire:** offers made as if every seat were the player's were
    refused `notYourPiece` 5,690 times, and offers made from the table's total were refused by the
    engine (*No Action Points.*) 3,267 times.
  - **It permits:** each player was offered and had accepted moves, actions on a pathogen, and the
    body's actions; another player's piece was offered nothing.
  - **The draw:** another player's device never sends it, and the engine refused it all 15 times it
    was tried from there (*Only the captain draws the next infection.*).
- **Three controls in `tools/ci/selftest.ts`, each run and each red with its own diagnostic:**
  `table-offers-own-seats` (the seat rule removed), `table-offers-own-budget` (the table's total
  read), `table-draw-captain-only` (every device draws).
- **15 tests of the table's rules** (`packages/ui/src/play/table.test.ts`): whose points, whose
  pieces, the captain, names, and the draft.
- **A two-player turn at 360 × 740**, headless Chrome against the local relay, 20 checks:
  - the goal is worded for the table;
  - only the captain's device draws, and both see the arrivals;
  - the other player waits, shown as waiting, while the captain begins and hands out points;
  - the captain gives 3 and takes 1 back;
  - each bar shows its own player's points (Asha 4, Ravi 2);
  - another player's piece names who plays it and offers nothing;
  - the undo line and the AP sheet;
  - the captain ends the turn for everyone, and the next draw comes to both.

**Found by the walkthrough and fixed before commit:**

- **The line naming who plays a piece was never on screen.** With a piece selected, the actions
  area shows the piece's name in place of the prompt line, so the line went nowhere; it is now
  beside the name.
- **The waiting button looked pressable.** It was drawn exactly like an active button.
- **The first version of the test proved less than its name.** Its "attacks" check counted producing
  antibodies, because the driver moved pieces at random and Asha's never met a pathogen; the driver
  now moves onto pathogens and counts only actions aimed at one.
- **Two of the three selftest controls failed for the right cause but without their diagnostic.**
  The games are played while the suite is collected, and the driver threw there, so the file failed
  without naming a test. The driver now records its problems and a named test reads them.

### Piece C, when someone drops: BUILT, 25 September 2026

**Your own lost connection** covers the game at once with *The connection to the game was lost. Your
seats wait for you while you are away.*, **Reconnect**, and **Back to the title**. Nothing rejoins
by itself (ruling 4). *Back to the title* closes the game without leaving it: the player stays a
member, away, and the Title offers the room again.

**Coming back after the phone closes the app** (ruling (a)). While a player is in a room, the room's
code and their `self` are kept on the device (`packages/app/src/rejoin.ts`); the Title then offers
**Rejoin room ABC123**, which asks only for the name, typed again (ruling 2). The record is forgotten
when the player leaves or the game ends, and when a rejoin is told the room is gone or has no place
for them, which is also said.

**Everyone sees who is away, and what the captain does about it:**

- **The Table**, a new button beside Messages, opens full height and lists every player: their
  pieces, the captain, and who is away. Below them, **the pieces nobody can move now**: those held
  by someone away, and those nobody took in the lobby. Its badge counts them, so the table can see
  that something waits without opening it.
- **The captain's handover** (ruling 4): on the captain's Table, each waiting piece has *Give to …*
  for every player who is here. Everyone else reads that the captain can hand them on, or the table
  can wait. Nothing forces the issue and no timer decides it.
- **What changed is said as it happens**, to everyone: *Meera is away.*, *Meera is back.*, *Ravi is
  the captain now.* (and *You are the captain now.* to Ravi), *Ravi now plays the NK Cell.* (and *You
  now play the NK Cell.* to Ravi).
- **A piece held by someone away** already says so when selected: *Meera plays this piece, and is
  away.* (piece B).

**Decided here, not ruled, and easy to change:**

- **The record of the room is forgotten after a day** in any case. A room is discarded 10 minutes
  after its last player goes, so a record older than that can only point at a room that no longer
  exists, and nothing should stay on a child's phone for longer than it can be used.
- **The captain can also hand out pieces nobody took in the lobby.** The room has always accepted it;
  without it they stay unmoved all game.
- **Away markers are not drawn on the board.** The Table's badge and page, the notices and the line
  beside a selected piece carry them.

### What proves it

- **The record of the room** (`packages/app/src/rejoin.test.ts`, 5 tests): a write is read back and
  holds only the code and `self`; it is offered for a day and not a moment longer, nor from a clock
  set back; anything malformed, or a `self` the device could not have made, is nothing; forgetting
  forgets; a store that throws never takes the app down. Control: `rejoin-forgotten-after-a-day`.
- **The Table's rules** (`packages/ui/src/play/table.test.ts`, 5 more tests): who holds what, which
  pieces wait, what is said and to whom. Controls: `table-away-pieces-waiting` (an away player's
  pieces counted as held), `table-changes-said` (nothing said).
- **Three players at 360 × 740**, headless Chrome against the local relay, 25 checks, in order:
  1. Meera drops mid-turn: her screen says so at once and does not rejoin by itself, and the others
     are told and see her two pieces counted.
  2. The others read that the captain can hand them on, and only the captain has the buttons.
  3. The captain gives her NK Cell to Ravi, and both are told.
  4. Meera reconnects with her Eosinophil and without the NK Cell, and everyone is told.
  5. The captain drops, and Ravi becomes captain on every screen.
  6. The old captain goes back to the title and rejoins as a player, not captain, as ruled.
  7. Meera's page is reloaded and she rejoins from the Title, as herself.
  8. A record naming a room that is gone is refused, said, and forgotten.

  The walkthrough's two reds on the way were both its own: it closed the Table by tapping the dimmed
  game behind it, which left the page open and the turn button hidden; then it tapped the floating
  Close in the render before the button existed.

### Piece D, the end and leaving: BUILT, 25 September 2026

- **Everyone still in the game reaches the Result**, measured: a three-player game on Hard, played
  to its end.
- **The Result after a game played together** offers *Play together again*, which goes to the way
  in, and *Back to the title*. *Play again* and *Change difficulty* both start a game alone, so they
  are not offered there. The room has ended with its game, so another game together is a new room
  and a new code (see the ruling asked below).
- **Two exits from the menu, each confirmed with what it does:**
  - *Back to the title* closes the game. *Your seats wait for you while you are away. You can rejoin
    from the title.* It no longer says *Your game is saved*, which was never true of a game played
    together.
  - *Leave the game* gives the seats back. *Leaving gives your seats back to the table, and you
    cannot come back into this game.* Everyone is told *Meera has left the game.*, and her pieces
    join the Table's waiting list for the captain to hand on. Alone, the menu is unchanged.
- **A crash during a game played together** says the game goes on and the player's seats wait,
  and to rejoin from the title. It does not read or mention the single-player save.
- **The single-player save survives a game played together**, measured: a game alone saved before a
  game together is still offered by *Continue* after that game's Result.

### What proves it

- **The walk to a real Result**, three players at 360 × 740, 20 checks, in order:
  1. Asha saves a game alone first, and the menu alone has no Leave and still says the game is
     saved.
  2. Together, Meera leaves from the menu: the confirmation says what leaving does, her title does
     not offer the room, and everyone is told.
  3. Ravi goes back to the title from the menu, is told his seats wait, and rejoins.
  4. The captain ends turns until the body falls, at turn 9 or 10 on Hard.
  5. Both players still in the game reach the Result, which offers only another game together.
  6. Asha's game alone is still there, and the ended room is not offered.
  7. No page errors anywhere.
- **Two controls on the change the walk forced** (FINDINGS #89): `view-queue-own-tail` and
  `view-queue-every-view`, each run and each red with its own diagnostic.
- **Pieces B and C's walks, re-run on the changed spread player:** 20 of 20 and 25 of 25.

### What the walk found

- **FINDINGS #89, fixed:** played together, the play screen dropped the views that arrived while a
  spread animated, and its own tail check failed on a correct game on the other players' screens.
  It is fixed, and the fix was proved both ways in the app.
- **FINDINGS #90, recorded, for a ruling:** a double tap on the play screen's one advance button does
  the next step too. Measured in single player: *Command your cells* tapped twice ends the turn with
  every point unspent, at every gap tried from 80 to 400 ms.

### Rulings asked, 25 September 2026

1. **#90, the double tap.** The bottom button ignores a tap for about half a second after its step
   changes. **Recommendation: yes, and before P3.6**: it costs a player a whole turn with no undo, in
   single player as much as together, and the P3.6 games are exactly where it would be hit.
2. **Another game in the same room.** Today a room ends with its game, so a rematch means a new room
   and a new code for everyone to type. The alternative: after the Result, the captain can start
   another game in the same room, with the same people and their seats, back through the lobby. It
   changes the room's rules (`ended` would lead back to `lobby`), so it is a ruling, not a default.
   **Recommendation: yes, as its own small piece after P3.6**: P3.6 does not need it, and friends
   who have just finished a game will want the next one.

**Ruled, 25 September 2026: both as recommended** (*"1. Agree with your recommendation 2.agree with
your recommendation"*). The guard for #90 is built before P3.6 (FINDINGS #90, fixed). Another game
in the same room is its own piece after P3.6, and changes the room's rules when it is built, so the
brief's §5 is amended then, not before.

### The 360-pixel audit, extended over every P3.7 screen: done, 25 September 2026

The Gate 1 audit now walks the twenty screens a game played together has, from the captain's side
and a guest's, in all four passes, against a build that talks to a relay on the development PC
(`walkTogether` in `tools/perf/gate1-audit.ts`; how to run it is in its header). A helper page, in a
context of its own, plays the other part.

**The result:** 80 screens per pass (82 under the app's own text size), up from 60. All 20 new
screens were reached in every pass, none NOT REACHED. Every check is 0, all 44 controls fire the
right way, 37 nesting paths all land right (four new: the way in closes to the title, the lobby
ignores the back gesture, and the AP sheet and the Table close to the game), and offline is met.
Recorded in [`GATE1_AUDIT.md`](GATE1_AUDIT.md) as the new bar.

**What its first run found, all fixed before the record:**

1. **The walk's own defect:** the first screen after each page load it made was measured before
   the 200% text size had applied. It now sets the size again after every load, as the main walk
   always has.
2. **Greyed borders too faint:** a seat another player holds, and the waiting button, used a border
   at 1.93:1. They now use the greyed rows' own border, 3.60:1.
3. **The lobby overflowed at 200%:** the room code overflowed by up to 86 pixels at 360 wide. It now
   wraps rather than push the page sideways, and still doubles with the text.

**Never against the live relay, proved both ways.** The walk refuses any relay not on this machine
before a socket is made. Against a build naming the deployed relay, every screen after the first
connection attempt is NOT REACHED in every pass, naming the address; against the local build, all
twenty are reached.

**P3.7 is therefore done**: all four pieces, the double-tap fix before P3.6 (FINDINGS #90), and the
audit. P3.6 is next.

## 7. P3.6, two phones on two networks: the app DEPLOYED, the session to come

### Ruled, 25 September 2026

- **R1 (a): the app is served from the relay's own server,** beside the relay, at
  `https://immunity-wars.kartikchaudhary.com/`. The alternative was GitHub Pages. The same server,
  certificate and deploy scripts, and nothing new to trust. The game is publicly reachable at that
  address, linked from nowhere, with no personal data in it.
- **R2 (a): Gate A's version refusal is checked on a real phone,** with a build that claims the
  protocol version before the current one, served at a temporary address for the session and taken
  away after it.

### What is prepared (packages/server/deploy)

- **`setup.sh`**: Caddy serves the app from `/opt/immunity-wars/app/current` beside the relay. The
  page, the service worker and its manifest are always asked for again, so a new version reaches a
  phone that has the app. `/old/` is a slot that answers 404 unless the version-check build is in it.
- **`deploy-app.sh`**: builds the app as players get it and **refuses a build that does not talk to
  this server's relay**. It installs a new version beside the last three, with no restart and no game
  touched, and checks the page served is that build's. The build is deployed exactly as the Gate 1
  audit measures it, the development page with it, because the service worker precaches that page.
- **`old-build.sh`**: `put` builds from HEAD in a temporary worktree, so the working copy is never
  patched. The build claims the previous protocol version, registers no service worker, and lives
  under `/old/`. `remove` takes it away.

**Proved on the development PC before any of it goes near the server:**

- The old build stamps `{v:1, …}` on every message where the current one stamps `{v:2, …}`, and
  loads from `/old/`. Its first build loaded from `/Git/old/`, because Git Bash rewrote the path
  argument; the script now prevents that and checks for it.
- Served under `/old/` against a relay on the PC, creating a room is refused with *"This app and
  the game server are on different versions. Update the app, then try again."* No lobby is
  reached, no service worker is registered, and the page has no errors.
- Git on Windows failed to delete one temporary worktree, whose paths were too long, and left 231 MB
  behind. The script's clean-up now removes the folder itself and prunes the record.

### What waits

1. **Shantanu's go-ahead to deploy:** `setup.sh` again (the Caddy change), `deploy-app.sh`, and on the
   day `old-build.sh put`.
2. **The session** ([`P3_6_SESSION.md`](P3_6_SESSION.md)): about an hour on two phones, one on home
   Wi-Fi and one on mobile data. It is one game on Training, with each Gate A item where it falls.
3. **The 20 deferred coverage arms**: automated tests, Claude's, after this is merged.
4. **Gate B's cost**, read from Google's billing report by SKU after the session.

### Deployed, 25 September 2026 (Shantanu: *"Please do 1 and 2. We can do 3 tomorrow."*)

1. **`setup.sh` again**, with nobody connected (checked first, because a reload of Caddy can end
   live connections). The new configuration was validated before it replaced the old one. Caddy and
   the relay are both active; the relay still answers 426 at `/relay`; `/old/` answers 404.
2. **`deploy-app.sh`**: version `20260925-211931-47fe0f5`, built from the merged `main` with a clean
   working copy. The build's relay was checked to be `wss://immunity-wars.kartikchaudhary.com/relay`;
   the page served is that build's, and the service worker is served with `Cache-Control: no-cache`.

**The app is at https://immunity-wars.kartikchaudhary.com/.** Checked from the development PC,
in headless Chrome at 360 × 740:

- the title renders and the service worker installs;
- one browser created a room through the live relay and a second joined it by its code, and each saw
  the other;
- both left, and neither title offered the room again;
- the one failed request is `/favicon.ico`, the app's missing icon since before P3.7 (§6, piece A).

**No visitor's address was written down.** Since the change, Caddy's log has 18 lines; the only one
naming an address is its admin interface recording the configuration reload, from the server to
itself (`127.0.0.1`). The relay logged nothing.

**Left for the session, as ruled:** `old-build.sh put` on the day, and `remove` after it.
