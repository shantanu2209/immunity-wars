# P2.4 closeout — the art, its pipeline, and the board that wears them

**Closed 20 August 2026.** Spec: [`PHASE2_BRIEF.md`](PHASE2_BRIEF.md) v1.4 §2 and §5.
`pnpm verify` green; **the engine is unchanged**; the corpus is untouched.

---

## 1. What is proven

| | how |
|---|---|
| 29 raw assets, every one selected against measured constraints | contrast ≥3:1 vs paper, ≤30% light share, 20px/10px (tokens) and 30px/20px (icons) downsample gates — per-batch, before storing |
| The brief steered the generator | organ batch: 28/28 arrived in the briefed hue families; marrow arrived as the ruled red-marrow treatment; the cream-bound prediction (≤30%) rejected exactly the two candidates it said it would |
| The contrast gate is known to work AND known to permit | `pnpm art:build --control`: synthetic 1.25:1 disc REJECTED, synthetic 4.62:1 disc ACCEPTED — both halves, run before the first trusted build |
| The pipeline is deterministic | `pnpm art:build --verify`: 88 files byte-identical across independent rebuilds |
| The manifest is the contract | per asset: MEASURED contrast (re-measured every build, never trusted from the register), dominant colour, light share, content box, output+source hashes, provenance row |
| The geometry is radial, symmetric, and regenerable | `tools/geometry-from-a2` radializes: A2 angles + lane order in, uniform rings out; hub centred on a 660×660 canvas; min node spacing 37.0u ≥ the 36.7u (20px) token floor, held by construction; count assertion + `--control` + content-schema parity all green |
| Icons are labels, not slots | lanes terminate on the play circle (R_PLAY, derived); organ/entry icons are annotations outside it, spaced by CONTENT edge (manifest metrics), labels uniform on the far side; names from one source (`rules/board.json`) |
| Provenance is closed for the whole set | all 29 register rows complete: Google Flow, Pro, 20 Aug 2026, terms as of that date; machine copy in the manifest |
| The licence question is SETTLED | by deciding not to answer it: no content licence declared, code Apache 2.0, content all rights reserved — reasoning in `LICENSES.md` and the `ASSETS.md` Resolution log |

## 2. What is NOT proven, stated plainly

- **Contrast is measured by the dominant-colour (alpha-weighted average) method** — a proxy,
  stated wherever the numbers appear. Gate 1's formal contrast check at Phase-2 close is a
  separate verification.
- **Nothing has been looked at on a handset.** All art judgments were made on downsampled
  renders on a PC; the P2.3 deciding pass on 2–3GB hardware still owns the final word.
- **The stack-with-badge is a mock-up**, not an implementation — P2.5's opening item. The hub
  pile and the 16u fan remain scaffolding until then.
- **Gate 1's ≥44px touch targets are unaddressed** (tokens are 20px); hit-area strategy is
  P2.5's, noted in `for-P2.5.md`.
- **The i18n duty is untouched**: board names render from content's rules tables, which is one
  source but not yet the catalogue; the hardcoded-string check with its negative control is
  still owed by the Phase 2 DoD.
- **The July art's provenance hole is permanent** (tool unknown) — recorded, superseded, moot
  for licensing.

## 3. What P2.5 inherits

[`for-P2.5.md`](for-P2.5.md) carries the queue. The load-bearing ones: stack-with-badge
(opening item; badge mock-up in the showcase awaits Shantanu's judgment) · token hit-area vs
44px · Nunito bundling proposal (font stack shipped as interim) · organ integrity/name as UI ·
lymph connector shape/label · the i18n catalogue duty with its negative-controlled check ·
the per-redraw re-measure the P2.3 ruling made mandatory once the full UI lands.

## 4. What I know that the repository would otherwise not say

- **⚠️ The showcase (`pnpm art:showcase`) mirrors `Board.tsx` BY HAND.** If Board.tsx's
  rendering changes, the showcase lies until it is updated — it is a demo generator, not a
  render of the component. (The live dev shell is the truth; the showcase is the shareable
  copy.)
- **⚠️ `R_PLAY` is derived from geometry (max anchor distance), never authored.** If a future
  geometry regeneration moves the anchors off a common circle, every annotation's placement
  quietly changes meaning — the radialization is what guarantees the invariant.
- **Background keying is edge flood-fill, not saturation** (`raw/README.md`) — asset 2's pale
  nucleus is low-saturation and a saturation key would punch holes in it.
- **sharp's install script is deliberately blocked** (`pnpm-workspace.yaml`): the platform
  binary arrives as an optional-dependency prebuild.
- **One commit (6ffb48a) landed on a red verify** — the chain gated on the wrong step; owned
  in `bf33b69`'s message. The failure was prettier sweeping a generated untracked file, not a
  source defect.

## 5. Decisions taken in P2.4, recorded where they live

Path A (regenerate, illustrated raster) · organs join the raster set · duplicate pairs split
on the mechanical argument · organ boxes removed (print affordance) · icons are labels, not
slots · radial layout, A2 angles kept · stack-with-badge replaces fanning (build at P2.5) ·
no content licence, by decision · `ART_BRIEF.md` v3 carries the 29 prompts and every measured
constraint they were generated against.

**Phase 2 continues at P2.5.** The board looks like the game; the game is not yet playable on it.
