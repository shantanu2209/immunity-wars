# P2.7 — what a fresh session needs to start

**Opened 9 September 2026**, the day P2.6 closed. This is the handover document, written so that
someone picking this up cold can begin without reconstructing the phase from its history. It is
not a plan: P2.7's shape is Shantanu's to set, and the first thing it needs is his specifics.

Read alongside [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §1 (the two gates) and §5 (the division of
labour), and [`P2_6_CLOSEOUT.md`](P2_6_CLOSEOUT.md) (what is proven and what is not).

---

## 1. Where the project actually stands

**Every screen exists and Gate 1's capability bar is met.** P2.6 closed with the four Title slots
built (How to play, the disease library, Settings, About), the error boundary and the
storage-failure notice, and first-encounter hints. Shantanu's S25 pass over all of it, 9 September
2026: everything works as described, How to play reads well on a phone, the library is navigable
at 106 rows, the hints fire two per turn, Settings works at all four text sizes.

**Gate 1 is the capability gate and it is met.** Gate 2 is not implied by it, and this is stated
in the brief in those words: *"Not implied by Gate 1. Not implied by a review going well."*

**Nothing is owed by anyone.** The hint splits are settled. There is no pending review, no
outstanding correction, and no half-finished piece.

---

## 2. THE ONE THING TO DO FIRST, and it is not building

**Shantanu already saw refinements to navigation and placement on the S25, and ruled them Gate 2's
rather than P2.6's. He did not list them, and they were deliberately not written down.**

> **So P2.7's first action is to ask him for those named specifics.** Not to guess at them, not to
> propose a polish list, not to start improving things that look improvable.

This is the brief's own rule, from §1: *"Each round ends with named specifics, not a verdict.
'The organ labels are hard to read at phone size' is actionable. 'It needs work' produces guessing
and a fourth round."* P2.7 is unusual in having its input available **before** the first round
rather than after it, and the cheapest possible start is to collect it.

**Do not open a PR before that conversation.** A polish round built against a guess is the one
shape this sub-phase can waste weeks on.

---

## 3. CLAUDE DESIGN — this is where it gets used, and what for

**It has not been used at any point in Phase 2**, and P2.6's closeout records why that is not a
shortfall: the brief's commitment was that screens with no prior version be **explored** before
being built, and that happened in five written proposals ruled before any code. The exploration
was real; it was in prose.

**P2.7 is its role** (Shantanu's ruling, 9 September 2026), and the reason is specific rather than
ceremonial:

> **It is for exploring ALTERNATIVES side by side. It is not for iterating one version in code.**

That distinction is the whole of when to reach for it:

| Use Claude Design when | Build it in code when |
|---|---|
| Three plausible layouts exist and nobody knows which reads better | One layout is agreed and needs implementing |
| The question is "what else could this look like" | The question is "make this one better" |
| Comparing costs less than committing | The change is small and reversible |

**How it works here** (brief §5): Shantanu directs it separately, in chat, and **brings back a
direction**. It does not produce code and its output does not enter the repository. What comes
back is a direction; the build against that direction is ordinary work in code.

**What it is likely to be worth using on**, once his specifics exist: anything where his note is
about arrangement rather than a value. "The board is hard to navigate at 360 px" is an
alternatives question. "This label is too small" is not — that is a number, and it changes in a
commit.

---

## 4. Gate 2, stated so nobody mistakes it for a checklist

**Gate 2 is a separate, explicit act:** *"the visual design is approved"*, said by Shantanu. It is
not implied by a review going well, by an audit being green, or by a round ending.

**Two polish rounds are the expected shape, not a limit in either direction.** If he is satisfied
after one, the second is not owed. If he is not satisfied after three, work continues.

**What is explicitly NOT in either gate**, and should not be drifted into: animation elegance
beyond function, palette refinement, spacing beyond legibility, screen-reader support (deferred
with a reinstate condition), anything Phase 6 could revisit. These are real and endless, and the
brief names them precisely so that a polish sub-phase does not absorb them.

---

## 5. What must not regress, and how to know

Every one of these is enforced by something that fails, so a polish change that breaks one is
caught rather than noticed later. **Run `pnpm verify` before every commit, and the audit whenever
a screen's layout, text or controls change.**

| Instrument | What it holds | Its warrant |
|---|---|---|
| `pnpm gate1:audit` | touch ≥ 44 px, contrast, text at 200% under three mechanisms, layout, offline | 27 controls, fire and pass halves |
| `pnpm verify` | typecheck, lint, format, boundaries, docs, turbo hash, every suite | `pnpm ci:selftest` |
| `pnpm coverage:positions` | the generated coverage documents' positions | 4 controls |
| `iw/no-hardcoded-jsx-text` | all player text through the catalogue | both control halves |
| `no-dashes.test.ts` | no dashes in player text | its own control |
| the equivalence corpus | the engine's behaviour and its 67-name root surface | the whole of Phase 1 |

**The audit's numbers to beat, from the final P2.6 run:** 843 controls and 2,243 text runs across
**44 screens** per pass (46 under SIZE200), every check **0**, no screen NOT REACHED, offline met.
**Read the per-screen list, not the total** — four times in P2.6 a green total hid an unmeasured
screen ([`FINDINGS.md`](FINDINGS.md) #66 and `CLAUDE.md`).

---

## 6. Two rules that will bite a polish sub-phase specifically

- **Player text inside `packages/engine/src` is not editable for style.** It is state the corpus
  compares byte for byte against legacy. A polish round is exactly when someone will want to
  reword a log line; the answer is no, and the reason is that it breaks the primary oracle.
- **A new USE of an existing content value is a new surface** ([`FINDINGS.md`](FINDINGS.md) #63).
  Moving a colour from a fill to a text background, or a value from one panel to another, is a new
  check even though the value is unchanged and trusted where it already appears. 212 contrast
  findings came from exactly that in P2.6.

---

## 7. What is NOT P2.7's, so it is not picked up by mistake

- **The handset performance measurement**, and with it locked decision #1 (Capacitor vs React
  Native). Phase 4's, and unresolved by ruling.
- **Offline on the Android build.** Phase 4's.
- **The newcomer test.** Protocol approved, no testers; it lands against the P2.6 closeout when
  they exist, and its named specifics can reorder work.
- **Any engine change**, including the queued ones (Q6 to Q10) and the bot. Phase 3's.
- **The startup storage probe**, the Diphtheria toxin producer question, and the string
  inventory's unwired `--check` — all reported with reasoning and deliberately not built.

---

## 8. The first three actions, in order

1. **Ask Shantanu for the S25 refinements as named specifics.** He has them.
2. **Sort them into two piles**: alternatives worth exploring (his, through Claude Design) and
   values that just change (mine, in a commit). Say which is which and why.
3. **Build the second pile, propose against the first.** Then the round ends with him saying what
   is still wrong, in specifics, and the second round starts from that.

**Nothing here is started until step 1 has an answer.**
