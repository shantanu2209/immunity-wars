# The Immunity Wars — Art brief for the token set (P2.4)

**For:** Kartik and Shantanu, at the generation tool (Gemini or Google Flow — see the
provenance duty at the end, it is per-tool).
**Decision this executes:** Path A, ruled 20 Aug 2026 — illustrated raster art, regenerated,
normalised through the P2.4 pipeline. The existing set is stylistically consistent; what failed
is that it was built for a dark screen. Organs are expected to stay vector (`ORGAN_ART`,
recoloured) pending Shantanu's look at the comparison page, so this set is cells, pathogens and
entry icons.

Every constraint below is one the current set measurably fails. Generate against them; do not
rediscover them afterwards. Numbers are from the P2.4 measurement pages (20 Aug 2026, WCAG 2.1
relative-luminance contrast, dominant-colour method).

---

## The four constraints

### 1. Solid filled shapes — not thin outlines

The current set is thin neon line art. At board-token size (~10–20 CSS px) a 2px stroke is a
sub-pixel thread and aliases away; only the fill survives.

The evidence is the set's own exception: **the eosinophil is the only solid-filled asset, and
it is the only one of 23 that both stays legible at 20px and passes contrast (3.46:1). The
other 22 fail, at 1.26–2.92:1.** That is not a coincidence of subject — it is fills versus
strokes.

**Rule: every icon is a filled silhouette. Line work may sit ON the fill as interior detail,
never carry the shape.**

### 2. Dark enough for cream paper — dominant colour ≥3:1 against `#FFFDF9`

The board is warm near-white paper (`#FFFDF9`, relative luminance 0.983). For a meaningful
graphic WCAG 2.1 requires **3:1**, which means the icon's dominant colour needs relative
luminance **≤ 0.295** — mid-tone or darker, never pastel, never neon.

Viable and non-viable, measured:

| works on paper | ratio | | fails on paper | ratio |
|---|---|---|---|---|
| deep crimson `#8B1E3F` | 8.78 | | toxin yellow `#E4EC3E` (current) | 1.26 |
| deep violet `#5B3A8C` | 8.51 | | pale cyan `#80EEF0` (current) | 1.34 |
| deep teal `#1D5C4D` | 7.68 | | pale pink `#EE95BB` (current) | 2.14 |
| dark ochre `#8A4B08` | 6.69 | | marrow orange `#EAA341` (current) | 2.11 |
| forest green `#3D6B35` | 6.16 | | **dark yellow `#CA8A04`** | **2.89** |
| frame red `#B03A2E` (A2) | 5.92 | | A2 mucosal amber `#E29944` | 2.33 |
| brick red `#C0392B` | 5.35 | | A2 blood tan `#C08B62` | 2.91 |
| organ brown `#8E6E53` (A2) | 4.59 | | | |

Two consequences worth saying out loud:

- **Yellow cannot be rescued.** A colour cannot stay recognisably yellow and reach 3:1 —
  dark goldenrod (`#B8860B`, 3.20) barely scrapes past and no longer reads as yellow at a
  glance. If an identity is currently yellow (toxin, worm, helper, bacteria), it changes
  family or goes ochre/brown.
- **The A2's own lane tints are line colours, not token colours.** Mucosal amber and blood
  tan fail as a dominant fill. Tokens must sit a step darker than the board they stand on.

### 3. Legible at 20px — the silhouette carries the identity

20.0px is the largest a board token can be before it collides with a neighbouring node; today
they render at 9.8px. At those sizes **internal detail does not survive** — measured on the
current set, everything inside the outline is gone by ~20px and the icon is its silhouette
plus its colour.

**Rule: one strong, distinct outer shape per identity. Interior detail is allowed but must be
decoration the icon can lose without losing its identity.** Squint test: at arm's length,
thumbnail-sized, each icon should be tellable from every other in the set by shape alone.

### 4. The set coheres — one style anchor in every prompt

Consistency-across-the-set is the risk, not quality (brief §5). Repeat this sentence, verbatim,
at the start of every prompt, whatever else the prompt says:

> **"Flat sticker-style game icon of [SUBJECT], one bold dark solid-colour silhouette with
> minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no
> shadow, no background, centered, filling the frame."**

Then the subject line, then the colour: *"dominant colour [HEX from the viable table]."*

## The board's palette, so the art sits in its world

The tokens stand on the CLASSIC board: paper `#FFFDF9`, route dusty rose `#C8877B`, branch tan
`#C89A6B`, node fills white/`#FDF3EC`, organ brown `#8E6E53`, hub blush `#F7CFC7` ringed
`#B03A2E`, lymph blue `#1F6F8B`, ink `#7C6A61`/`#2E2A28`, wash `#FBEAE5`. The COLOUR variant
tints lanes mucosal amber `#E29944`, skin green `#50A06E`, blood tan `#C08B62`, with per-organ
pastels. **Token colours should read as the saturated, darker relatives of this family** —
warm, natural, slightly muted — not as a neon set visiting from the old dark UI.

## The asset list

Each is a single centered subject. Names in quotes are the player-facing names (content's
`CNAME`/`UI_`).

**Cells (7)** — the player's pieces; friendly, capable, distinct:

| asset | subject |
|---|---|
| macrophage | "Monocyte" — the big eater; a large amoeba-like blob engulfing, one pseudopod reaching |
| neutrophil | "Neutrophil" — the fast first responder; multi-lobed nucleus visible as interior detail |
| bcell | "B-Cell" — the antibody factory; a round cell studded with Y-shaped receptors |
| tcell | "Killer T-Cell" — the assassin; sharp, directed, a cell with a striking edge |
| helper | "Helper T-Cell" — the coordinator; a cell radiating signal (its power is communication) |
| nk | "NK Cell" — the natural killer; granular interior, dangerous-looking |
| eosinophil | "Eosinophil" — the anti-worm specialist; bilobed nucleus, distinctly pink-red family (the one identity that may keep its current colour: `#D96180` passes at 3.46) |

**Pathogens (9 identities — see the pair question below)** — menacing, clearly "other":

| asset | subject |
|---|---|
| virus | spiked icosahedral/spherical virion |
| hidden | the hidden virus — a virion half-concealed (inside a cell outline / behind a mask shape); its identity is concealment |
| bacteria | a capsule/rod bacterium, flagellum allowed as lost-able detail |
| toxin | a poison droplet/skull-tagged drop — **not alive**; antibodies neutralise it |
| venom | a fang/sting-marked drop — antibodies canNOT touch it, only antivenom; visually a sibling of toxin but unmistakably the animal one |
| fungus | budding yeast / mushroom-spore form |
| worm | a large coiled helminth — too big to eat |
| malaria | the shape-shifter — crescent/ring parasite form (it stages through the liver before the blood) |
| parasite | a complex single-celled parasite, tough, layered — the eosinophil's other specialist target |

**Entry-lane icons (6)** — new; today the entries are text-only. One-line meanings from the
board's own rubric:

| asset | subject |
|---|---|
| nose | the airway — a nose in profile |
| contact | skin and mucous contact — a hand touching a surface |
| gut | food and water — a stomach or a cup/plate |
| blood | needle/transfusion — a syringe or blood drop with a cannula |
| wound | broken skin — a cut with parted edges |
| bite | insect or animal — a mosquito (or fang pair) |

**Count: 20 assets** (7+7+6) if the two shared-art pairs stay shared, **22** if they split.

### The question for Kartik — stated mechanically, not aesthetically

`toxin`/`venom` and `malaria`/`parasite` currently share one image per pair. **They are
mechanically different in the engine:**

- **Toxin vs venom:** a toxin is neutralised by **your own antibodies** — that is the learning
  loop the game teaches. Venom explicitly is not: *"Antibodies can't neutralise venom — it acts
  far too fast for your B-cells to respond"* — it is killed only by **antivenom**, of which you
  hold 2 doses of borrowed (horse) antibodies that teach your body nothing.
- **Malaria vs parasite:** malaria **stages** — 3 turns hidden in the liver before it enters
  the blood — which is its whole character; the parasite is a tough multi-hit complex cell,
  the eosinophil's specialist prey, with no staging.

Same icon for mechanically different things means a player must read text to know which rules
apply. Distinct icons let the board itself say it. **Kartik decides**; the count moves 20→22.

## Output specification

- **256×256 px**, PNG, **transparent background** (no white matte, no card, no frame)
- one centered subject, ~8% margin to every edge (nothing touching the frame)
- flat colour, no gradients, no drop shadow, no background texture
- the pipeline (P2.4, built after the art exists) trims margins, normalises palette, verifies
  the 3:1 contrast against `#FFFDF9`, and emits WebP at 1×/2×/3× with a manifest — so generate
  clean and let the pipeline do the conforming

## Provenance — record at generation time, per tool

Before the first image: open [`ASSETS.md`](ASSETS.md) and for **every** asset record tool +
version, date, account/plan, and the prompt used. **Whether output may be redistributed under
CC BY-SA 4.0 is a per-tool question decided by that tool's terms as of the generation date** —
Gemini and Google Flow are different products with different terms, and the answer for one is
not an answer for the other. The content licence stays undeclared until the register is filled
and the terms of the tool actually used are confirmed.
