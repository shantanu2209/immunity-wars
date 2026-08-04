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
**Test:** `port exports exactly the 67 names legacy resolves to` — compares
`Object.keys()` of both modules as sets.

---

*No further deviations recorded. Entries are appended as they are decided, never
retroactively edited — if a decision is reversed, add a new entry saying so.*
