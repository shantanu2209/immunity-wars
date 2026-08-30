# For P2.5 — visual decisions noticed early and deliberately not taken

> **P2.5 plan, approved by Shantanu 20 Aug 2026 — readable, then playable, then finishable:**
> **1** stacks: fan-of-types + tap-to-inspect, WITH the inspect view designed deliberately as
> the touch-target pattern Gate 1 rests on (board = coarse pointing at nodes; inspect =
> precise ≥44px controls); hub-zone mock-up for ruling, not settled unilaterally.
> **2** command UI slice, i18n-first (hardcoded-string check + negative control land with the
> first screen), and the **Nunito decision moves here by reorder** — OFL file committed and
> the stack set when the first real screen lands, not after three screens exist.
> **3** turn loop (draw/reveal, spread narration + pacing decision, win/loss) — the first
> moment a stranger can play, i.e. Gate 1's human test; **the newcomer-test protocol is
> drafted as part of this piece** (who, device, difficulty, what counts as finished — a loss
> counts — and what is recorded) and Shantanu reviews it before it runs.
> Then: panels (organ integrity, production/antibodies, memory/vaccine, log) · dialogs
> (events, rares, antivenom, Pathogen X) · the hub zone build · 46 strings screen-by-screen ·
> touch/200%/contrast audits · the mandatory per-redraw re-measure.

The P2.2 tripwire is *deciding how something should look rather than whether it renders*
([`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) §2). Anything that trips it lands here as a note and waits.
An entry is one line: what was noticed, and where. No mockups, no rankings — P2.5 decides.

- Token palette: the slice uses placeholder red-fill invaders / blue-outline cells and gray board
  lines, chosen only to be distinguishable. Real palette is P2.5's. (`Board.tsx`)
- Organ labels: the slice shows the organ KEY (`marrow`), not a display name — display names,
  their catalogue home, and label typography are P2.5's. (`Board.tsx`)
- Token art: letters-in-circles now; §5 of the brief says raster illustrations via `<image>`
  through the art pipeline. (`Board.tsx`)
- ✅ DECIDED (Shantanu, 20 Aug 2026) — co-located tokens STACK at one position with a count
  badge; tapping the stack expands it into an INSPECT view (not playable, so collisions with
  lanes/nodes don't matter there); tapping a pathogen's card brings it to the top. This
  replaces fanning entirely — 7 tokens fanned at 20px would span 138px, 38% of a phone's
  width. The 16u fan spacing in geometry terms is thereby IRRELEVANT, not a value to change.
  P2.5 builds this; `Board.tsx`'s fan is dev-slice scaffolding until then.
- ✅ RULED (Shantanu, 30 Aug 2026) — spread pacing is **900ms standard / 1400ms dice, with
  tap-anywhere-to-advance**, replacing the legacy 560/800ms. The reasoning that carried it:
  for a newcomer the frame headline is information, not confirmation — 560ms does not fit
  reading a label AND registering which tokens changed — and the tap makes the exact numbers
  low-stakes while reusing a surface that is already dead during bursts. Nothing re-run,
  confirmed: the P2.3 budget rows are all per-frame or per-tap, none depend on the
  inter-frame delay, and `tools/perf/measure.ts` waits on DOM conditions with 30–120s
  timeouts. Built in `PlayScreen.tsx` + `SpreadNarration.tsx`; the ruled numbers verified
  live (dice frame held ~1374ms, standard frames ~935/~869ms, a tap ended the final wait
  immediately).
- **For the P2.5 closeout** (noted by Shantanu, 30 Aug 2026): the card reveal's arrival diff
  earned its keep on its second turn of existence — the walkthrough drew two Strep throat
  cards in one turn and the dialog listed both, where the view's `drawn` (first card only)
  would have silently shown one. The diff-by-invader-id design was necessary, not defensive.
- **The Play → Result join was crossed for real, on the LOSS path** (30 Aug 2026, applying
  FINDINGS #50's lesson that a wired join is not a verified one): a headless driver played an
  idle Training game in the real app shell — idling guarantees a conclusion by turn 30 — and
  lost at turn 6 to the Kidneys. The Result screen rendered the organ name and stats, all
  three nav buttons present, and **the autosave was confirmed deleted at Result** (the saves
  store read back empty), so Continue can never offer a finished game. The WIN path has not
  been crossed; it needs a played game, and is expected to fall out of the newcomer test or
  the first full human playthrough — the closeout should check it happened.
- Background-tab behaviour, observed while driving bursts in a hidden tab: Chrome throttles
  timers, so a burst pauses mid-spread and resumes on foreground — with tap-to-advance still
  working, since taps are event-driven. Valid state throughout, no defect; worth remembering
  when a phone backgrounds the app mid-spread.
- The spread shows only the frame label ("Bacteria divide") — legacy renders dice; how a spread
  narrates is P2.5's. (`main.tsx`)
- ~~Entry-label collision with route art~~ — resolved by the radial annotation layout
  (20 Aug 2026): icons and labels sit outside the play circle at uniform ray distances.
  (`Board.tsx`)
- Tokens render at 20px and organs/entries at 30px since the P2.4 art landed (Shantanu's
  showcase ruling) — but Gate 1's ≥44px touch targets still need a hit-area strategy
  (invisible expanded hit regions, or the stack-inspect view as the touch surface).
  (`Board.tsx`, 20 Aug 2026)
- ~~Fan spacing narrower than a token~~ — superseded by the stack-with-badge decision above;
  the overlap problem dissolves with fanning itself. (20 Aug 2026)
- `toxin`/`venom` and `malaria`/`parasite` share byte-identical art in `art_data.js`; whether
  those pairs deserve distinct icons is Kartik's call. (same measurement)
- Lymph connectors are straight dashed segments through the `LYMPH_STEP` nodes — short and
  local now that the layout matches the A2 (FINDINGS #49 resolution), but the print curves
  them and adds arrowheads and a "LYMPH" label (needs an i18n home). (`Board.tsx`, P2.4)
- ~~Wash disc omitted~~ and ~~step nodes half the print's proportion~~ — both resolved by the
  A2-layout regeneration (`tools/geometry-from-a2`): the wash renders at the print's radius and
  alpha, and node/hub/box sizes now come from the generator's report. (P2.4, second pass)
- ✅ Typography DECIDED and shipped (P2.5 piece 2, per Shantanu's reorder): Nunito (OFL)
  bundled at `packages/app/public/fonts/` (39KB latin variable woff2 + `OFL.txt`), first in
  the board's stack with the humanist fallbacks behind it; fully offline. The A2's DejaVu
  deliberately not carried over (a print face, not shipped on phones). Label sizes still
  unmatched to the print's scale. (`Board.tsx`, `packages/app/index.html`)
- ✅ DECIDED (Shantanu, 20 Aug 2026, on the measurement in
  [`STACK_COLOCATION.md`](STACK_COLOCATION.md)) — **FAN-OF-TYPES on routes, branches and
  organ tissue**: one token per distinct type, each with its own count badge; two diseases of
  the same type stay in tap-to-inspect. Off-hub nodes hold ≤2 distinct types ≥99.3% of the
  time and never 4, so this loses nothing. P2.5's opening item.
- **THE HUB IS A ZONE, NOT A NODE — its own design problem, ruled explicitly NOT a variant
  of stacking** (Shantanu, 20 Aug 2026). Up to 49 invaders, 4 distinct types, plus the
  player's seven cells, in one 100u circle. Whenever the co-location numbers are quoted,
  their label travels with them: mirror of the reference bot, which under-kills — stacking
  OVERESTIMATED relative to human play, wrong in the safe direction.
- ✅ **HUB LAYOUT DECIDED: VARIANT B** — invader type-tokens (badged) clustered in the
  centre, cells ringed at the inner edge. Ruled by Shantanu and Kartik independently of the
  builder's lean, which matched (noted deliberately: two readers, one answer, before seeing
  each other's reasoning). Grounds: (1) threats are the decision-relevant information and
  belong in the hub's most legible region; (2) graceful degradation — cells LEAVING the hub
  is the normal state of a game in progress, so variant A (cells arced above, types below)
  would be lopsided most of the time and balanced mainly at setup. **A's counter-argument is
  recorded so this reads as a considered choice, not a default:** A's two-register layout
  ("yours above, threats below") is calmer and more teachable in a first game — but that is
  an onboarding problem, which is P2.6's job, and solving a teaching problem with a permanent
  layout compromise is the wrong trade. Both variants render in the showcase
  (`pnpm art:showcase`) at magnified and true size.
