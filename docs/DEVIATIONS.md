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

*Entries are appended as they are decided, never retroactively edited — if a decision is
reversed, add a new entry saying so.*
