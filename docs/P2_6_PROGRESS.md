# P2.6 progress note — opened 6 September 2026

The running record of P2.6: where each piece landed, what it measured, what is left. The
rulings behind the pieces are in [`for-P2.6.md`](for-P2.6.md); the brief is
[`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v1.7; what P2.6 inherited is stated in
[`P2_5_CLOSEOUT.md`](P2_5_CLOSEOUT.md). This note is superseded by the P2.6 closeout in the
usual discipline.

---

## Piece 1 — the page-zoom pass and the must-pass halves (done, 6 September 2026)

**What it was for.** The closeout's one inherited instrument gap: the Gate 1 audit measured
text at 200% under one mechanism (the browser default-font-size preference) and none under the
one a Chrome-on-Android user has (page zoom), which FINDINGS #61 had found and Shantanu's check
by hand had passed. And the ruling of the kickoff: every check gets its passes-control as well
as its fires-control.

**What landed** (`tools/perf/gate1-audit.ts`; record in [`GATE1_AUDIT.md`](GATE1_AUDIT.md)):

- Two text-at-200% passes, each named for the mechanism it models — **FONT200** (the root at
  200% on a 360 px page) and **ZOOM200** (a 180 × 390 CSS px page at a doubled device scale) —
  sharing one layout auditor, so the two differ only in mechanism. Each layout result records
  the width and root font size it measured at.
- **Eighteen controls, nine pairs**, run before any screen is measured: touch, contrast,
  non-text, scale, layout under each mechanism (overflow; a control past the edge; an ellipsis
  that clips), offline. All eighteen fired the right way on the rebuilt instrument's first run.
- The audit's default URL is the preview of the shipped build (port 4173), since offline can
  only be true of a build with its service worker.
- **An instrument defect found and fixed inline:** the walk reached the inspect sheet only when
  the deck stood something beside the Neutrophil, and the first two runs of the rebuilt
  instrument did not reach it at all. It now opens the sheet by a click on an invader token with
  nothing selected; invader token groups carry a `data-invader` address for the drivers
  (`Board.tsx`, rendering nothing). Seventeen screens on every run.

**The run on the shipped build:** 357 controls and 911 text runs across 17 screens; touch 0,
contrast 0, non-text 0; 0 unscaled under FONT200; layout 0 under FONT200 at 360 px and **0
under ZOOM200 at 180 px**; offline met. Numbers with their widths in `GATE1_AUDIT.md`.

**Also in this piece, the records:** the six rulings of the kickoff ([`for-P2.6.md`](for-P2.6.md));
the brief to v1.7 (no offline state; offline-on-Android and the handset pass are Phase 4's);
the closeout's two corrections (the pass-through items, the library citation); the science
field into the Phase 3 queue as Q10; the roadmap's Phase 2 status, which had said "P2.1
complete" and "v1.1" since August.

## The two proposals (written 6 September 2026, awaiting rulings; nothing built)

Shantanu reordered the two: **How to play first**, since it is cheaper and unblocks a
conversation with Kartik that can run in parallel with anything else; then Settings. Both are
in [`for-P2.6.md`](for-P2.6.md) as PROPOSAL 1 and PROPOSAL 2:

- **How to play:** ten sections, about 750 words against the rulebook's 4,320, each one to two
  phone screens, with what each answers and which rulebook or quick-reference passages already
  fit as they are; the division of labour with the cards and the library; three things left for
  the ruling (a tips section, a home for the "why it works this way" boxes, the crisis section's
  shape).
- **Settings:** three rows in two groups, a rows table so adding one is trivial; the three
  pieces named and sized (the scaling mechanism with the audit's third pass; the preference
  store, `localStorage` for the synchronous read before first paint; reset), one piece in two
  PRs; and what reset resets, confirmed from the code: the autosave and nothing else the
  player's path writes, with the two dev-shell stores and the precache listed as the things
  that also persist and are left alone.

## What is next

Rulings on the two proposals. Everything else proceeds on the proposed order in
`for-P2.6.md`: after Settings, the disease library, About, the error boundary and the
storage-failure notice, then onboarding held for a direction.
