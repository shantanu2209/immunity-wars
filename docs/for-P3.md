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
