# Deviations — where the port is deliberately not byte-identical to legacy

The Task B contract is a **bug-for-bug port**: `packages/engine/` must reproduce
`tools/legacy/v2_engine.js` exactly, including its defects. That is what makes the
equivalence proof mean anything.

This file is the **standing, complete record of every place that contract is deliberately
broken.** If a behaviour differs from legacy and it is not listed here, it is a bug in the
port, not a decision.

Rules for this file:

- **One entry per deviation.** Nothing lives only in a commit message.
- **Every entry names who decided it**, so the reasoning survives the people.
- **Every entry has a test** that asserts the new behaviour, referenced by name. A deviation
  without a test is a regression waiting to happen.
- Bugs that are *preserved* rather than deviated from belong in
  [`FINDINGS.md`](FINDINGS.md), not here.

---

## 1. `setKnobs({heal})` throws explicitly instead of silently doing nothing

**Legacy behaviour.** `setKnobs` (`v2_engine.js:372`) ends with:

```js
if(k.heal!==undefined) HEALV = k.heal;
```

`HEALV` is **never declared anywhere in the file.** Under CommonJS sloppy mode this silently
creates a stray global that nothing ever reads. So legacy's actual behaviour is a **silent
no-op**.

**Port behaviour.**

```ts
if (k.heal !== undefined) throw new Error("setKnobs: 'heal' is not implemented");
```

**Why not preserve it.** Two options were considered and both rejected:

- *Reproduce the `ReferenceError`.* This was initially proposed on the reasoning that strict
  mode would throw and the port should throw identically. **That reasoning was wrong.** The
  legacy behaviour is a silent no-op; the `ReferenceError` is not preserved behaviour at all,
  it is *new* behaviour that ESM strict mode would impose. Neither faithful nor useful.
- *Reproduce the silent no-op.* Faithful, but actively harmful. During Task E tuning, a
  developer setting `heal` would get unchanged balance numbers and no indication why.

**Why an explicit throw.** `setKnobs` is developer-facing, not player-facing. The incidental
`ReferenceError` would say `HEALV is not defined` — naming an implementation artefact and
sending someone hunting for a variable that was never meant to exist. The explicit message
names the actual situation. Developer-facing surfaces should fail loudly and clearly.

**Blast radius: none.** `setKnobs` is not called anywhere in the repository — only defined,
and inlined verbatim into the six built HTML bundles. The equivalence corpus never invokes
it, so this deviation cannot affect any corpus result.

**Decided by:** Shantanu, 4 Aug 2026.
**Test:** `setKnobs throws a named error for the unimplemented 'heal' knob` — asserts both
that it throws and that the message is exactly `setKnobs: 'heal' is not implemented`.
**Related:** [`FINDINGS.md`](FINDINGS.md) #7 (`SPAWN`, the other dead knob, which *is*
ported as-is because its no-op is silent *by construction* rather than by accident).

---

## 2. Duplicate exports are exported once

**Legacy behaviour.** `module.exports` (`v2_engine.js:1767`) lists 70 names, of which 3 are
repeated: `macrophageEatable`, `snipeTargets`, `rateForFam`. In an object literal the later
binding simply overwrites the earlier one, so the module resolves to 67 unique exports.

**Port behaviour.** Each name is exported exactly once. TypeScript rejects duplicate export
bindings outright, so this is not optional.

**Blast radius: none.** The resolved module shape is identical — 67 names bound to the same
functions. No consumer can observe the difference.

**Decided by:** forced by the language; recorded for completeness.
**Test:** `tests/equivalence/src/exports.test.ts`, `"legacy's module.exports resolves to 67
unique names"` and the two set-comparison cases either side of it.

> **Correction, 6 Aug 2026 (Task C prerequisite).** This entry previously cited a test named
> *"port exports exactly the 67 names legacy resolves to"*. **No such test existed**, and the
> claim it was standing in for was false: the root published **106** runtime names — legacy's 67
> plus 38 module-private data tables and tuning constants, plus the Task A `PACKAGE_NAME`
> scaffold marker. Nothing was missing, so no consumer had broken; the surface had silently
> widened because nothing measured it.
>
> Closed by making the claim true rather than by weakening it: the 38 are module-local again,
> `ALL_ORGANS` — the only one anything outside the engine reached — moved to
> `@immunity-wars/engine/internal`, and `exports.test.ts` now asserts **set equality** in both
> directions with `PACKAGE_NAME` as the single named exemption. A superset test was rejected
> because it would pass on both the broken and the correct state.
>
> Per this file's own rule, entries are not retroactively edited — so the original claim is
> quoted above rather than deleted, and this note is the amendment.

---

## 3. `stats.arrivals` and `stats.gotThrough` no longer accumulate NaN

**Legacy behaviour.** Both counters are initialised with four keys —
`virus`, `hidden`, `bacteriaTagged`, `bacteriaUntagged` — but indexed by `tally()`, which
returns the RAW invader type for everything non-bacterial. So `arrivals.worm`, `arrivals.toxin`,
`arrivals.venom`, `arrivals.fungus`, `arrivals.malaria` and `arrivals.parasite` are created by
`undefined + 1` and are **NaN for the rest of the game**. Recorded as
[`FINDINGS.md`](FINDINGS.md) #3.

**Port behaviour.** `(g.stats.arrivals[k] ?? 0) + 1`.

**Why this was not done during the port.** It is a behaviour change, and a bug-for-bug port is
what makes the equivalence proof mean anything. It was carried through B1–B7 unchanged, and
landed only after the full corpus was clean.

**Evidence that the change is confined.** `tests/equivalence/confined-change.ts` runs the corpus
and records every JSON path that differs. Over 1,500 games:

```
games identical to legacy : 445
games that changed        : 1055

PATHS THAT CHANGED (allowed):
    467x  stats.arrivals.worm        411x  stats.arrivals.venom
    411x  stats.gotThrough.venom     383x  stats.arrivals.fungus
    383x  stats.gotThrough.fungus    356x  stats.arrivals.toxin
    356x  stats.gotThrough.toxin     129x  stats.arrivals.parasite
    115x  stats.gotThrough.parasite   26x  stats.arrivals.malaria

CHANGE IS CONFINED
```

**Nothing outside those two counters moved** — not a single organ, cell, invader, log line or
die roll. Note `arrivals.worm` appears but `gotThrough.worm` does not, which is itself a
consistency check: worms are spliced out of `arrivals` when they lodge, before `gotThrough` is
counted.

**Blast radius: none in play.** `viewState()` does not expose `stats`, so no UI ever saw the
NaN. The counters exist for balance measurement, which makes this a prerequisite for Task E
rather than a gameplay change.

**Decided by:** Shantanu — port bug-for-bug, then fix after equivalence, as its own commit with
corpus evidence.
**Test:** the rig's `DELIBERATE_DIVERGENCES` list in `tests/equivalence/src/rig.ts` excludes
exactly these two paths from the comparison hash, so the corpus stays meaningful. That list is a
liability and is kept short — everything on it is a place the corpus has stopped watching.

## 4. `returnAP` validates its pid, so it can no longer write NaN into the AP budget

**Legacy behaviour.** `allocateAP` checks its target is a real player. `returnAP` does not. An
unknown or stale pid therefore reached the arithmetic with no budget entry, and the guard let it
through whenever `amount` was 0:

```js
if((g.apBudget[from]||0) < amt) return err("You don't have that much AP to return.");
//  (undefined || 0) < 0  is  false   -> falls through
g.apBudget[from] -= amt;                //  undefined - 0  ->  NaN
```

**Port behaviour.** The same check `allocateAP` has always had, down to the error string:

```ts
if (!g.players || !g.players.includes(from)) return err('Unknown player.');
```

**Why this one was fixed and not merely recorded.** It is reachable in shipped multiplayer,
where pids arrive from the **relay** rather than from trusted local code — a reconnecting client
with a regenerated pid, or a stale client retrying after the turn moved on. The NaN lands in
`apBudget`, which `viewState()` broadcasts to every client. Recorded as
[`FINDINGS.md`](FINDINGS.md) #20.

**Evidence that the change is confined.** The equivalence corpus is single-player, so it never
issues `returnAP` — its silence is not evidence. `tests/equivalence/src/returnap.test.ts`
supplies the missing half: eight legal allocation sequences × 5 seeds compared against legacy
byte for byte, covering give-and-take-back, return-everything, **return-zero for a real player**
(the exact shape that used to poison the map), return-more-than-held, captain-returns-to-self,
out-of-phase, and through to `confirmAllocation`. All identical.

Exactly one path differs:

| | legacy | port |
|---|---|---|
| `returnAP{pid:'ghost', amount:0}` | `{ok:true}`, `apBudget.ghost = NaN` | `{ok:false, error:'Unknown player.'}`, no entry |
| `returnAP{pid:'ghost', amount:3}` | already refused | refused, different string |
| `allocateAP{toPid:'ghost'}` | refused | **unchanged** |

The non-zero case was already refused by the old guard, so the behavioural change is narrower
than "unknown pids are now rejected" — only the zero-amount case changes outcome. The error
*string* changes on both, from "You don't have that much AP to return." to "Unknown player.",
which is the one legacy already used for the same condition in `allocateAP`.

**Decided by:** Shantanu — fix it, own commit, after the #3 fix, with evidence.
**Test:** `tests/equivalence/src/returnap.test.ts`, four cases including an explicit assertion
that `allocateAP` is untouched.

---

## 5. `famOf` classes a novel antigen by DECLARATION, not by a lookup miss

**Legacy behaviour.**

```js
return iv.novel ? 'X' : (FAMILY[iv.disease] || "EXB");
```

`Pathogen X` is the only card in `DECK_MASTER` with no `FAMILY` entry, so the **`novel` flag was
the only thing** keeping it out of the `EXB` antibody pool. Lose the flag anywhere — a JSON round
trip dropping a falsy field, a content loader, a future refactor — and the novel pathogen became
an ordinary extracellular bacterium. An `EXB` antibody the player happened to be holding for
something unrelated would destroy it outright, clonal selection would never happen, and the card
would still appear while the lesson it exists to teach silently did not.

**Every test still passed**, and `noUncheckedIndexedAccess` was silent, because the miss was
**handled** and its handling was wrong for exactly one card. Recorded at length as
[`FINDINGS.md`](FINDINGS.md) #13.

**Port behaviour.** The content declares the exemption, and the schema requires it:

```ts
// packages/content/src/rules/families.json
"NOVEL_ANTIGENS": ["Pathogen X"]

// packages/engine/src/primitives.ts
if (iv.novel || NOVEL_ANTIGENS.has(iv.disease)) return 'X';
return FAMILY[iv.disease] ?? 'EXB';
```

`RulesPackS` now fails the build if any card has neither a `FAMILY` entry nor a `NOVEL_ANTIGENS`
exemption — and equally if a disease has both, or is exempted without being a card.

**Why not `"Pathogen X": "EXB"` in FAMILY.** Because it would be false. Pathogen X is not an
extracellular bacterium. A novel antigen has no class *by definition* — that is the entire point
of the card — and inventing a seventh class would make the other six mean less. `FAMILY` is
therefore left **byte-identical to legacy**, which is also why the 22-table comparison in
`data.test.ts` still passes unchanged.

**Why the `?? 'EXB'` fallback stays.** It is not a guard against an impossible state
([`FINDINGS.md`](FINDINGS.md) #22). It is legacy's documented answer for an unknown disease, it
is pinned by `data.test.ts`, and it is genuinely reachable: the engine mints **nine disease names
that are not cards at all** — three toxins from `TOXIN_MAKERS`, a bursting liver-stage malaria,
and five rare-event pathogens — so a schema scoped to `DECK_MASTER` could not make it dead even
in principle. Listed in [`CONTENT_REACHABILITY.md`](CONTENT_REACHABILITY.md) §5 and §6.

### Evidence — and read the two halves in the right order

**The corpus result is a VACUOUS PASS, and that was predicted before it was run.**

```
CONFINED-CHANGE CHECK — 1500 games
allowed to differ: stats.arrivals, stats.gotThrough
games identical to legacy : 445
games that changed        : 1055
CHANGE IS CONFINED
```

Those figures are **byte-identical to deviation #3's**, path counts included, which is the actual
content of the result: this change contributed **exactly zero** additional divergence. In real
play Pathogen X always carries `novel: true`, set by `makeInvader` from the card, so the modified
branch is never taken.

**So the corpus proves "no side effect on reachable play" and NOTHING MORE.** It does not prove
the fix works. It could not — the path it fixes is one the corpus cannot reach, which is the same
reason the defect survived Task B in the first place. Anyone citing this run as evidence the fix
is correct has misread it.

**The load-bearing evidence is the direct test.** `tests/equivalence/src/pathogen-x.test.ts` was
rewritten from pinning the defect to asserting the correction, and demonstrates the consequence
rather than the mechanism: with the `novel` flag **deliberately stripped**, a player holding 3
EXB antibodies is refused with *"BRAND NEW … run CLONAL SELECTION"*, where legacy on the same
state classes it `EXB` and destroys it. Both arms are run, so the difference is shown rather than
described.

> **Note for the next deviation.** `confined-change.ts` compares raw states and does **not** apply
> the rig's `normalise()`, so its allow-list must include **every previously accepted deviation**,
> not just the new one. Run with only `famOf` allowed it reports `NOT CONFINED — 10 unexpected
> paths`, all of them deviation #3's counters. That is the tool working correctly and the
> invocation being wrong.

**Decided by:** Shantanu — fix it at the content boundary rather than with a fallback that
guesses; own commit, after the extraction was green, with the vacuous-pass caveat stated up
front rather than discovered afterwards.
**Test:** `tests/equivalence/src/pathogen-x.test.ts` (8 cases, including both arms of the
flag-stripped experiment), plus five schema-rejection cases in
`packages/content/src/load.test.ts`.
**Related:** [`FINDINGS.md`](FINDINGS.md) #13 (the defect), #22 (the pattern),
#23 (the mirror), [`CONTENT_REACHABILITY.md`](CONTENT_REACHABILITY.md) (the generated evidence).

---

## 6. An unknown cell key errs in the port and CRASHES legacy

**Legacy behaviour.** `moveDestinations` (`v2_engine.js`, the `brainSlow` helper it calls) reads
`cell.zone` with no guard. An action whose `cell` is not a roster key — `{action: 'move', cell:
'zzz', …}` — therefore **throws a `TypeError` out of `applyAction`** instead of returning an
error result.

**Port behaviour.** `packages/engine/src/queries.ts` opens `moveDestinations` with
`if (!c || ck === 'bcell') return [];`, so the same action flows to the `!d` guard in `move` and
returns `err('Illegal move.')` like every other rejected action.

**Why not preserve it.** The contract is bug-for-bug, but this bug is UNREACHABLE through the
proof: the corpus's action vocabulary — the bot's and the fuzzer's — never contains an unknown
cell key, so no recorded game can distinguish the engines here, and `noUncheckedIndexedAccess`
forces the port to write *something* for the miss. Reproducing a crash that nothing can reach
would mean hand-writing a `throw` the compiler otherwise forbids, to be faithful to behaviour no
test can observe. An engine boundary that errs beats one that throws, and Phase 3 puts network
input behind this exact surface.

**How it was found** — worth recording because nothing was looking for it: a rule-B
demonstration at the v4-provider reconciliation ([`FINDINGS.md`](FINDINGS.md) #46) exhibited the
port's guard by replaying the action against legacy, and legacy crashed. The demonstration was
rewritten to exhibit the port and the crash became this entry.

**Decided by:** Shantanu — "leave it recorded and unfixed; it is legacy behaviour and the port's
is better", at the P2.2 board session.
**Test:** `tests/equivalence/src/queries.test.ts`, `deviation #6` describe block — both
directions asserted: the port errs `'Illegal move.'`, legacy throws `TypeError`.

---

## 7. `handOverCaptaincy`: the engine can be told the room has a new captain

**Legacy behaviour.** No such action. The captain is set once, by `newGame`, and nothing can change
it; `applyAction` answers the unknown name with a refusal. `tools/legacy/server.js` moves its ROOM'S
captain in `ensureCaptain()` and never the game's, so a captain dropping mid-game left the table
unable to allocate, begin command or end the turn until they came back. It was never hit on a LAN
table, where the captain rarely drops.

**Port behaviour.** One new action, inside the multiplayer block of `applyAction`:

```ts
{ action: 'handOverCaptaincy', pid: <current captain>, toPid: <new captain> }
```

- **Only the current captain may send it** — the room sends it on behalf of one who has dropped — so
  no player can use it to seize the captaincy. The room also refuses it from every client, a second
  and independent guard.
- `toPid` must be a player in the game, as `allocateAP` already requires, with the same error.
- **During allocation, the unallocated pool moves with the captaincy**, because "unallocated AP sits
  with the captain" is the engine's own rule (`allocateAP`) and a new captain with an empty pool
  would have nothing to hand out. **In command, budgets are left alone**: a player's budget is theirs
  to spend, the old captain's included.
- Handing it to the captain already holding it is a no-op and a success.

**Why an engine change, in a phase whose definition of done said the engine is unchanged.**
[`FINDINGS.md`](FINDINGS.md) #78 set out the two fixes. The other was for the room to write
`g.captain` and move the pool itself — but where the pool lives is a rule, and a rule re-implemented
outside the engine is the exact failure the architecture exists to prevent. **The rule stays in the
engine, and the cost is stated rather than hidden:** [`PHASE3_BRIEF.md`](PHASE3_BRIEF.md) v1.1
amends the phase's "engine unchanged" line to say so.

**Evidence that the change is confined.** The corpus is single-player and never sends the action,
so its silence is not evidence — the argument #4 makes. `tests/equivalence/src/captaincy.test.ts`
supplies both halves: legacy refuses the action and the port hands over; and **six other multiplayer
paths × 5 seeds stay byte-identical to legacy** — plain allocation, give and return, confirm then
end the turn, and a non-captain trying to confirm or begin. The addition answers to its own action
name and nothing else.

Exactly one path differs:

| | legacy | port |
|---|---|---|
| `handOverCaptaincy` from the captain | refused (no such action) | the captaincy moves; in allocation, so does the pool |
| `handOverCaptaincy` from anyone else | refused | refused: *"Only the captain can hand over the captaincy."* |

The new error string is in the engine catalogue (`actions.onlyTheCaptainCanHandOver`), regenerated by
`tests/equivalence/i18n-extract.ts` and held there by the drift test — which is how its absence was
found: the drift test failed until it was added.

**Decided by:** Shantanu, 21 September 2026 — *"For the ruling happy to go with your recommendation."*
**Test:** `tests/equivalence/src/captaincy.test.ts`, seven cases including the confinement check; and
in the room, `packages/room/src/wire.test.ts`, *"captain succession reaches the engine"*. Mutation
controls `engine-captaincy-holder-only`, `room-captain-reaches-engine` and `room-only-action`.

## 8. Undo gives a player's Action Points back in a game played together

**Legacy behaviour.** `pushUndo` (`v2_engine.js`) snapshots the undoable slice of the state, and the
Action Points it holds are `g.ap`, single player's. Played together a player spends from their own
budget (`spendAP` charges `g.apBudget[pid]`), which the snapshot does not hold, so an undo returned
the piece and **kept its point spent**. Measured on 27 September 2026 in a two-player game: a budget
of 2, 1 after a move, and still 1 after the undo, with the piece back in the bloodstream. Legacy's
relay (`tools/legacy/server.js`) let an undo through from any player, since its seat check names no
seat for one, and its table display had a "director undo" as well: either took back whatever was
last on the table's one stack, whoever had done it, and kept the point spent. This relay refused undo
in a room until v4 ([`FINDINGS.md`](FINDINGS.md) #79).

**Port behaviour.** The snapshot also holds the budgets, **in a game played together only**, and an
undo restores them with everything else it restores:

```ts
...(g.multiplayer ? { apBudget: clone(g.apBudget) } : {}),   // pushUndo
if (u.apBudget !== undefined) g.apBudget = u.apBudget;       // undo
```

Alone the key is never written, so a single-player snapshot is legacy's to the byte.

**Why an engine change.** Undo together was ruled on 27 September 2026, after the P3.6 session, where
an accidental tap cost a player points (*"an accidental touch wastes precious APs"*). The room allows
an undo only for a player's own moves while nobody else has acted since, which it can decide without
the engine; but refunding the points is a rule about the state, and a rule re-implemented in the room
is what the architecture exists to prevent (the argument #7 makes). Of three ways offered, this one
was ruled: *"Go with A"*. [`PHASE3_BRIEF.md`](PHASE3_BRIEF.md) v1.9 amends "the engine unchanged" to
name it beside #7.

**Evidence that the change is confined.** The corpus is single-player, so its silence is not
evidence, the argument #4 makes; it stays green (400 of 400, run uncached on the change).
`tests/equivalence/src/undo-budget.test.ts` supplies both halves:

- **What changed:** after a move and an undo, legacy's budget is one short and the port's is back,
  the piece back in both, on three seeds.
- **What did not:** alone, a snapshot never holds the budgets, and a move and its undo are
  byte-identical to legacy on five seeds. Together, with the snapshots' budgets set aside, every path
  without an undo (moves, repeated moves, the end of the turn) is byte-identical to legacy on five
  seeds. The snapshots themselves are the one other place the change shows, and they are where it
  was made.

| | legacy | port |
|---|---|---|
| a snapshot, alone | no budgets | no budgets |
| a snapshot, together | no budgets | the budgets |
| an undo, together | the piece back, the point spent | the piece back, the point back |

**Decided by:** Shantanu, 27 September 2026 — *"Go with A"*.
**Test:** `tests/equivalence/src/undo-budget.test.ts`, four cases including the confinement checks;
in the room, `packages/room/src/room.test.ts`, *"undo, played together"*; over real sockets,
`packages/server/src/relay.test.ts`. Mutation controls `engine-undo-refunds-budget`,
`engine-undo-budget-together-only`, `room-undo-own-moves-only` and `room-undo-ends-when-others-act`.

---

## 9. `spendAP` for no player writes nothing, where legacy writes a budget named "null"

**Legacy behaviour.** `spendAP` (`v2_engine.js:852`), played together, charges whichever player it is
given and does not check that it was given one:

```js
g.apBudget[pid] = Math.max(0, (g.apBudget[pid]||0) - n);
```

Given no player, JavaScript makes `null` the key `"null"`, and a budget of 0 for nobody appears in the
state.

**Port behaviour.** Played together, it returns first:

```ts
if (pid == null) return;
```

Alone, both charge single player's points before either reaches this line, so nothing changes there.

**Why an entry only now.** The guard has been in the port since Task B4 (5 August 2026) with no entry
here, so by this file's own rule it was a bug in the port until it was ruled on. It was found on 28
September 2026, holding the multiplayer arms Phase 3 owed to legacy's own functions
([`FINDINGS.md`](FINDINGS.md) #98). It is kept because it keeps a budget for nobody out of the game's
state, and keeping it changes no code.

**This is not an engine change.** No line of the engine moved for it. The Phase 3 brief's "the engine
unchanged but for `handOverCaptaincy` and undo's Action Points together" (#7, #8) still holds: this
records a difference the port has had since Task B4, not a new one.

**Evidence that it is confined.** No game reaches it. `spendAP` is internal to legacy and on the port's
`./internal` entry only, and its callers pass the acting player, which played together is never
missing: the room gives every action the player who sent it (`packages/room/src/room.ts`,
`pid: pidOfMember(me)`). A hand-built action with no player does reach it, in a state given a free
action by hand, which no game has, since nothing grants one ([`FINDINGS.md`](FINDINGS.md) #99, #29).
`tests/equivalence/src/multiplayer-arms.test.ts` holds everything around it to legacy: `spendAP` for
real players, never below 0; five paths through `applyAction` on five seeds, byte-identical; and that
hand-built action on five seeds, byte-identical but for the budget named "null".

| | legacy | port |
|---|---|---|
| `spendAP`, alone | single player's points charged | the same |
| `spendAP` for a player, together | their budget charged, never below 0 | the same |
| `spendAP` for no player, together | `apBudget.null = 0` | nothing written |

**Decided by:** Shantanu, 30 September 2026 — *"I will go with your suggestion"*, which was to keep
the guard.
**Test:** `tests/equivalence/src/multiplayer-arms.test.ts`, two cases: *"spendAP for no player: legacy
writes a budget named "null", the port writes nothing"*, and *"an action with no player reaches it, let
through by another cell's free action"*. Mutation control `engine-spendap-no-player`, which removes
the guard and sees both fail.

---

## 10. The engine change queue: nine ruled changes, and the oracle becomes "the original, as ruled"

**What changed, and why an entry.** The queue ([`ENGINE_CHANGE_QUEUE.md`](ENGINE_CHANGE_QUEUE.md))
ran on 30 September 2026, as its own piece between Phase 3 and Phase 4 ([`FINDINGS.md`](FINDINGS.md)
#101). Nine of its ten changes make the port differ from `tools/legacy/v2_engine.js` as it stands,
so by this file's own rule each is listed here, below. The tenth, Q8, changed how five log lines are
written in the source and not a byte of what the engine writes, so it is not a deviation.

**The oracle.** A deliberate rule change breaks the corpus by design, and the obvious repair,
comparing the port with a snapshot of itself, is a test that cannot fail. Each change was instead
made twice, independently: in the port, and as an edit to the original's source applied in memory by
the harness (`tests/equivalence/src/ruled.ts`; the file in `tools/legacy/` is never touched). **The
corpus now compares the port with the original as ruled**, over every recorded game. Each edit must
match exactly once or the harness refuses it, so an edit made stale by any later change is caught
rather than silently skipped (`ruled.test.ts`). The untouched original stays loadable
(`loadOriginalLegacy`), and every rule change below is also run against it as a CONTROL, which must
show the OLD rule: that is what shows each test looks where its rule changed.

**Decided by:** the method, Shantanu, 30 September 2026 (*"1. Yes"*, to the oracle; *"Do it one
shot please"*, one PR with a commit per change). Each change's own ruling is in its row.

### 10.1 to 10.9, one per change

| # | Change | Legacy | Port | Decided by | Test, and control |
|---|---|---|---|---|---|
| 10.1 | **Q1** antibodies may attempt a trypanosome | `neutralise` and `canNeutralise` refuse every parasite, so the coat-change roll on its only `variant` card never fires | a parasite carrying a `variant` may be neutralised, and the roll can fire | Kartik, 5 September 2026, option (a); [`FINDINGS.md`](FINDINGS.md) #4 | `queue-rules.test.ts`, Q1; `reachability.test.ts`, *"SINCE QUEUE Q1, the same real play makes the coat change"*. Control `queue-q1-antigenic-variation-reachable` |
| 10.2 | **Q2** the Helper T-Cell's free-action slot removed | `g.free`, `hasFree`, `spend`'s free branch and the `free` view key, which nothing ever grants | none of them | Kartik, 5 September 2026; #29, #99 | `multiplayer-arms.test.ts`, *"queue Q2 closes FINDINGS #99"*. Control `queue-q2-no-free-actions` |
| 10.3 | **Q3** Pathogen X's tropism declared | no `TROPISM` entry; `rollOrgan` falls through its `!declared` branch | `"Pathogen X": "any"` | Kartik, 5 September 2026; #13, whose other lookup miss is #5 above | `pathogen-x.test.ts`, *"Q3: declaring Pathogen X a generalist changes no play"*: the same organ in the original, the original as ruled and the port, on 120 seeds. Control `queue-q3-no-play-change` |
| 10.4 | **Q4** an antivenom kill teaches no memory | on Training, a kill by antivenom grants memory of the venom, which its own log line denies | it does not | Kartik, option (a); #55 | `queue-rules.test.ts`, Q4. Control `queue-q4-antivenom-no-memory` |
| 10.5 | **Q5** the invader id counter kept in the game | a module counter, reset at `newGame`, absent from the state, so a resumed game reuses ids | `g.idCounter`; a save from before carries forward, its counter worked out from its own ids | queued at P2.5; the carrying forward, Shantanu, 30 September 2026 (*"3. Ok"*); #56 | `resume-ids.test.ts`, on real saves from the original. Control `queue-q5-old-save-carried-forward` |
| 10.6 | **Q6** a resident's Recall, a new action | no such action: a resident walks back one step at a time | `resrecall` returns it to its organ box in one move for one Action Point, undoable | Kartik, ruling 1, 5 September 2026; its words approved by Shantanu, 30 September 2026; #5 | `queue-rules.test.ts`, Q6; `resident-reasons.test.ts`; `offered.test.ts`. Controls `queue-q6-recall-undoable`, `queue-q6-recall-in-the-move-class`, `queue-q6-recall-offered-where-accepted` |
| 10.7 | **Q7** the actions' numbers moved into content | six literals in the engine: neutralise's toxin cost, the antivenom dose, degranulate's cost and damage, strike's damage, the memory response on Hard | the same six values, read from `tuning.json` | Shantanu, at CP2, widened 6 September 2026; #52 | no change in play: the corpus holds it to the original with no edit made for it. Control `queue-q7-engine-reads-content` |
| 10.8 | **Q9** degranulate burns the organ only where the fight is | the organ burns when the target is anywhere on its branch | only at step 0, in the organ | Shantanu, S25 pass, 5 September 2026; #57 | `queue-rules.test.ts`, Q9. Control `queue-q9-burn-where-the-fight-is` |
| 10.9 | **Q10** the inert `science` field removed | set from a config flag, copied into the view, read nowhere | gone from the state, the view, `newGame`'s config and the session's | Shantanu, 6 September 2026 | `construct.test.ts`, *"projects identically across the whole B2 state corpus"*. Control `queue-q10-science-gone` |

**What the reference bot sees.** Under the balance panel, Normal and Hard play identically before
and after, to the fourth decimal of every metric, and only Training moved, by about 1σ
([`ENGINE_CHANGE_QUEUE.md`](ENGINE_CHANGE_QUEUE.md), "How it ran"). That is a statement about the
bot as much as the rules: it plays about six of the fourteen seats (`CLAUDE.md`, Known issues).

---

*Entries are appended as they are decided, never retroactively edited — if a decision is
reversed, add a new entry saying so.*
