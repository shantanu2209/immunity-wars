# Stack co-location — the shape of real play behind the stack-badge design

**Measured 20 August 2026**, before proposing, per the standing rule. The question
(Shantanu's): a top-token-plus-count stack makes 3 viruses identical to worm+virus+bacteria —
how often does that information loss actually occur?

**Instrument:** the house game driver (`tests/balance/src/play.ts` — the mirror of the
reference bot over the port engine, splitmix32 seeds), **200 games × 3 difficulties**, full
games to the 200-turn guard. Snapshots at two moments per turn: **plan** (the state when
`beginCommand` is accepted — the board as a player scans it to plan) and **spread** (after
`endCommand` resolves). **14,090 boards, ~42,000 occupied-node observations.**

**Label, per the balance-report rule:** these are numbers **under the mirror of the reference
bot**, which under-kills (it never NETs, never repositions a resident — `docs/FINDINGS.md`
§1). Weaker play leaves more invaders alive longer, so this measurement should
**overestimate** stacking relative to human play. The conclusions below survive the bias in
the safe direction.

---

## Distinct invader TYPES per occupied node — plan moment

| kind | 1 type | 2 types | 3 types | 4 types |
|---|---|---|---|---|
| route — training | 97.22% | 2.71% | 0.07% | never |
| route — normal | 94.08% | 5.75% | 0.17% | never |
| route — hard | 90.65% | 8.83% | 0.52% | never |
| branch — training | 98.41% | 1.50% | 0.09% | never |
| branch — normal | 97.55% | 2.38% | 0.07% | never |
| branch — hard | 95.73% | 4.09% | 0.18% | never |
| organ tissue — all | 99.65–100% | ≤0.35% | never | never |
| **hub — training** | 85.20% | 12.78% | 2.02% | never |
| **hub — normal** | 75.70% | 20.29% | 4.01% | never (0.10% at spread) |
| **hub — hard** | 65.11% | 27.33% | 6.75% | **0.80%** |

Distinct DISEASES track types closely (two same-type diseases co-locate on ~3–10% of occupied
nodes depending on difficulty); the disease maximum is also 4, also hub-only, hard 1.45%.

## The maxima

- **Per-board maximum distinct types anywhere** (14,090 boards): 0 types 6.2% · 1 type
  70.5% · 2 types 20.9% · 3 types 2.3% · **4 types 0.10%**.
- **Overall maximum across all ~42,000 observations: 4** — `[virus, parasite, fungus, toxin]`
  **at the hub**, normal, seed #96, turn 15. Four distinct types NEVER occurred on any route,
  branch or tissue node.
- Spread-moment distributions are within ~1% of plan-moment throughout.

## Stack SIZE (context for badge counts)

Off-hub stacks stay modest (routes: ≤3 invaders in ~94–97% of occupied nodes on
training/normal; hard branches reach 8–16 in the tail). **The hub is different in kind**: on
hard it routinely holds 16–30+ invaders and peaked at **49** — the hub is not a node with a
stack, it is a zone with a population.

---

## What the numbers say about the design (proposal, after the measurement)

1. **On routes, branches and tissue nodes, a fan-of-types loses nothing and is nearly free:**
   ≥99.3% of occupied off-hub nodes hold ≤2 distinct types, 3 is at worst 0.62% (hard
   routes), and 4 never occurred in 42,000 observations. One token per distinct type, each
   with its own count badge, is at worst 3 token-widths — and typically 1.
2. **What a fan-of-types still cannot show:** two diseases of the same type (~3–10% of
   occupied nodes) — a real mechanical difference (Shantanu's point). That distinction goes
   to the tap-to-inspect view, which already exists in the decided stack design.
3. **The hub needs its own treatment, not a bigger badge.** Up to 4 types, dozens of
   invaders, plus the player's seven cells, inside a 100u circle. Grouped display inside the
   hub (by type, with counts) plus inspect is a P2.5 design task — the one place where the
   node-stack pattern does not transfer.

**RULED, Shantanu, 20 Aug 2026: fan-of-types on routes/branches/tissue as proposed; the hub
recorded as its own design problem, explicitly not a variant of stacking.**

---

## The shape of the lesson, noted while fresh (Shantanu's observation)

This is the query-payload measurement's lesson again ([`QUERY_PAYLOAD.md`](QUERY_PAYLOAD.md)).
There, the cost was not in the expensive query but in the one with too many possible subjects
at once. Here, the difficulty is not the crowded nodes but the one place that is not a node
at all. **Both times the obvious framing pointed at the wrong object, and the measurement's
real value was reclassifying the problem, not sizing it.**
