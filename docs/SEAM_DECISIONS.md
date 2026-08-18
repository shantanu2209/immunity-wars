# The eight seams — what gets built, and what was declined

**Decided 18 August 2026, by Shantanu, at the close of Phase 1.**
Supersedes [`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §6's list of eight.

> Eight seams was my guess written before anyone knew what the code looked like. Three that earn
> their place beats eight as ceremony. — Shantanu

**None of the eight was built during Phase 1** ([`PHASE1_CLOSEOUT.md`](PHASE1_CLOSEOUT.md) §2,
item 9 — NOT MET). This file records what happens to each, so a future reader knows the five that
are not being built were **considered and declined**, not forgotten.

| # | Seam | Decision |
|---|---|---|
| 1 | `Session` | **BUILD FIRST**, before any UI code |
| 3 | `IdentityProvider` → `PlayerRef` | **BUILD**, minimally |
| 8a | `Storage` | **BUILD** |
| 2 | Room entry — code only | **FOLD INTO SESSION** — not a seam |
| 5 | `HelpProvider.ask()` | **DEFER** — low retrofit risk, measured |
| 7 | Content packs + `rulesVersion` | **ALREADY PARKED** — no new work |
| 4 | `CommsPolicy` | **DROPPED** |
| 6 | `Entitlements` | **DROPPED** |
| 8b | `Telemetry` | **DROPPED** |

---

## 1. Why seam 1 is built at all — and it is not the interface

The obvious reason to build `Session` is the brief's:

> **Seam 1 is load-bearing: single-player must go through it too.** One code path, not a fork.

That is right, and it is not the whole reason. **The interface is the smaller half of what is being
bought. The larger half is the enforcement.**

### The transfer from [`FINDINGS.md`](FINDINGS.md) #39

`v2_ui.html` reads **49** engine names. Only **44** of them were in the **67-export contract** Task
B was measured against, because script injection exposes all **153** top-level declarations. The
documented surface and the used surface were different for the entire life of the project, and
**nothing ever failed** — the UI simply reached past the contract, and no instrument was looking at
the place where it did.

> **An interface nobody is forced to use is a convention.** This project has found roughly a dozen
> conventions that were quietly false — a CI rule nobody wrote (#9), a harness that never existed
> (#6), `rulesVersion` on states that do not carry it (#26), a coverage exclusion that was not dead
> (#25), an inventory missing its largest entry (#37). Every one of them was believed because it was
> written down.

If `packages/ui` can `import { applyAction } from '@immunity-wars/engine'`, then one afternoon under
deadline it will, and **nothing will fail until Phase 3 tries to put a network in that gap**. That
is #39 again, with a worse blast radius: not five missing names in a shim, but a UI written against
a synchronous in-process call that a relay cannot satisfy.

**So the deliverable is two things, and the second is the load-bearing one:**

1. the `Session` interface, with `LocalSession` as its single implementation;
2. **a `.dependency-cruiser.cjs` rule that `ui` and `app` may import the session package and must
   never import `engine`** — with a negative control proving the rule fires, per the standing rule
   that a check which has never failed is not known to work.

Without (2), seam 1 is a convention. With it, the fork the brief warns about is a build failure.

The same reasoning applies in reverse to `engine`, which already may not import `ui`, `app`,
`server` or any DOM/Node API. This extends an existing, working mechanism rather than inventing one.

---

## 2. The three being built

### Seam 1 — `Session`

Shape, and the measurements behind it, are in the assessment of 18 Aug 2026. In brief:

- `applyAction(g, a)` **mutates `g` in place** and returns only `{ok}` / `{ok, error}`. Session must
  own the state and hand out `viewState(g)`, never `g`.
- `endCommand` returns a **`Frame[]`**, not a state ([`FINDINGS.md`](FINDINGS.md) #31). The brief's
  `onStateChange` cannot express that: nine calls are indistinguishable from nine real actions, one
  call loses the animation. The subscription therefore carries a discriminated union — an
  **authoritative `view`** and a skippable **presentation `burst`**.
- That split is only sound because **the last frame of a burst equals the post-action `viewState`**.
  Measured at 908/908 bursts and now **asserted** as the `burst-tail-authoritative` invariant with a
  negative control, because reconnection depends on it.
- **`sendAction` is async even in `LocalSession`.** A synchronous local implementation would have
  every call site written synchronously, and `RelaySession` would be a rewrite.
- **It must not assume replayability** — [`FINDINGS.md`](FINDINGS.md) #40.

### Seam 3 — `IdentityProvider` → `PlayerRef`, minimally

Built for the **type**, not the identity. `applyAction` already reads `a.pid` and sets
`g._actingPid`, so `sendAction` has to carry a player reference from the first line of code.

Making `PlayerRef` an **opaque branded string** turns "no PII in a player reference" from a rule
someone has to remember into one the compiler enforces. Users are under 18 and India's DPDP Act
treats them as children; a type that cannot hold an email address is a cheap and permanent
guarantee. Device-local generation, no accounts, no server-side record.

Roughly twenty lines. It is small precisely because it is doing one thing.

### Seam 8a — `Storage`

A real Phase 2 consumer: save and resume. The serialisation round-trip is already a Phase 1 test
requirement and `viewState` already round-trips through JSON unchanged (asserted). One port, one
IndexedDB implementation.

---

## 3. Folded and deferred

### Seam 2 — room entry, folded into Session

It is a typed code string. `createGame(config)` and `joinGame(code)` are two methods on the same
interface; a separate seam adds a file and no capability. The brief's own note — "Matchmaker
supplies the code" — is satisfied by the parameter existing, whoever produces it.

### Seam 5 — `HelpProvider`, deferred

The retrofit argument that makes i18n urgent **does not apply here, and that was checked rather than
assumed.** The science corpus is already extracted as structured content: `DZINFO` is 530 fields
across 106 diseases in `packages/content`, with a test proving it still equals `v2_ui.html`
([`STRING_INVENTORY.md`](STRING_INVENTORY.md) §2). **The data is safe and cannot drift.** What is
missing is only the lookup, and a lookup over data that already exists can be added at any time at
the same cost.

Locked decision #4 defers the AI tutor regardless. Revisit when there is a UI surface asking a
question.

### Seam 7 — content packs, already parked correctly

Packs exist, are Zod-validated, and carry `{packId, packVersion, rulesVersion}`. Two pieces are
deliberately outstanding and both have owners:

- `rulesVersion` on states and messages — [`FINDINGS.md`](FINDINGS.md) #26, **Phase 3**.
- the pack-version *check* — deferred to whoever builds the downloadable-pack loader, because that
  is the first point at which a pack can genuinely disagree with the engine reading it. Before then
  it compares a constant with a constant, which is the [`FINDINGS.md`](FINDINGS.md) #22 pattern.

No new work now.

---

## 4. The three dropped — considered and declined

These are **not oversights**. Each was evaluated at Phase 1 close and declined for a stated reason.
Anyone who wants one back should argue against the reason rather than assume it was missed.

### Seam 4 — `CommsPolicy: 'free' | 'phrases' | 'off'` — DROPPED

**There is no chat.** Locked decision #2 rules out strangers and matchmaking in v1, so there is no
communication surface for a policy to govern. Defining a policy type for a feature that does not
exist is precisely the "speculative machinery" §6 forbids **in the sentence that introduces the
seams**.

It is a three-value union. When there is something to police it costs one line, and it will then be
written against a real feature rather than an imagined one.

> **Reinstate when:** a chat or canned-phrase feature is actually specified.

### Seam 6 — `Entitlements` — DROPPED

**The monetisation principle is explicitly still open** — [`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §0
lists it under "Still open". An interface encoding an undecided business model will encode a guess,
and an interface is stickier than a guess: it becomes the thing every feature is designed around,
and the guess stops being visible as one.

This is the clearest drop of the three. Decide the principle first; the object is trivial afterwards.

> **Reinstate when:** the monetisation principle is decided.

### Seam 8b — `Telemetry` — DROPPED

The brief asks for "telemetry no-op with real call sites". **Real call sites for data nobody has
decided to collect** is the [`FINDINGS.md`](FINDINGS.md) #22 shape — machinery guarding a state the
system cannot produce — and #21, #13 and #29 are all instances of the same thing costing more than
it returned.

There is a harder constraint too. [`CLAUDE.md`](../CLAUDE.md): *no analytics IDs, no persistent user
identifiers* — a design constraint, not a preference, because of who plays this. The honest position
is **no telemetry surface at all** until a grant report names a specific metric it needs. At that
point the metric defines the interface, and the call sites go where that metric lives rather than
being scattered in advance.

> **Reinstate when:** a funder or grant report names a metric. Note that anonymous aggregate
> reporting is a *design* question for Shantanu and Kartik before it is an interface question.

---

## 5. What this changes about the definition of done

[`PHASE1_BRIEF.md`](PHASE1_BRIEF.md) §9 item 10 reads "Eight seam interfaces defined, one
implementation each". **That item is superseded by this file, not quietly satisfied by it.**

Phase 1 closed with it **NOT MET** and it is recorded that way in
[`PHASE1_CLOSEOUT.md`](PHASE1_CLOSEOUT.md) §2. This document does not retroactively convert an unmet
item into a met one — it records the decision that three of the eight will be built in Phase 2 and
five will not, so that nobody later reads "8 seams" against a repository containing three and
concludes work was lost.
