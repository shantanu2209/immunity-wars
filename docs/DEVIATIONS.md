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

*Entries are appended as they are decided, never retroactively edited — if a decision is
reversed, add a new entry saying so.*
