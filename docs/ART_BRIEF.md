# The Immunity Wars — Art brief for the token set (P2.4)

**For:** Kartik and Shantanu, at the generation tool (Gemini or Google Flow — see the
provenance duty at the end, it is per-tool).
**Decision this executes:** Path A, ruled 20 Aug 2026 — illustrated raster art, regenerated,
normalised through the P2.4 pipeline. The existing set is stylistically consistent; what failed
is that it was built for a dark screen.

**Two rulings from Kartik and Shantanu, 20 Aug 2026, folded in:**

1. **Organs are regenerated too.** The recoloured `ORGAN_ART` vectors were reviewed on the real
   board and rejected — flat silhouettes are not the look. Organs join the raster set in the
   same illustrated style.
2. **The duplicate pairs split.** Venom is separate from toxin, malaria from parasite, on the
   mechanical argument (recorded at the pairs in the list below): same icon for different rules
   means reading text to know which rules apply, which fails the accuracy constraint.

**The set is 29: 7 cells + 9 pathogens + 6 entry lanes + 7 organs.**

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

**Organs (7)** — recognisable anatomy, same illustrated style as the rest of the set. Their
colours are constrained hardest — see "The organ colour problem" below, which gives a measured
starting colour for each:

| asset | subject |
|---|---|
| brain | a brain in profile, folds as interior detail |
| lungs | paired lungs with trachea |
| heart | an anatomical heart (not a valentine) |
| liver | the wedge-shaped liver, lobe line as detail |
| spleen | the bean-curved spleen |
| kidneys | a kidney pair |
| marrow | a cut long bone showing marrow inside — see the marrow entry below, it is the one
organ whose natural colour cannot pass |

**Count: 29 assets** (7 cells + 9 pathogens + 6 entries + 7 organs).

### The duplicate pairs — DECIDED 20 Aug 2026: distinct icons

`toxin`/`venom` and `malaria`/`parasite` shared one image per pair. **They are mechanically
different in the engine, and that settled it:**

- **Toxin vs venom:** a toxin is neutralised by **your own antibodies** — that is the learning
  loop the game teaches. Venom explicitly is not: *"Antibodies can't neutralise venom — it acts
  far too fast for your B-cells to respond"* — it is killed only by **antivenom**, of which you
  hold 2 doses of borrowed (horse) antibodies that teach your body nothing.
- **Malaria vs parasite:** malaria **stages** — 3 turns hidden in the liver before it enters
  the blood — which is its whole character; the parasite is a tough multi-hit complex cell,
  the eosinophil's specialist prey, with no staging.

Same icon for mechanically different things means a player must read text to know which rules
apply, which fails the accuracy constraint. The board itself must say it.

## The organ colour problem — checked, not assumed

Organs are where the 3:1 bound bites hardest, because **identity is carried by hue**: a heart
that is not red is a maroon blob. All seven were worked through against the paper
(20 Aug 2026; ratios are dominant-colour vs `#FFFDF9`; "reads as" judgments were made on
rendered chips at 30px and 20px on paper, and are judgments, marked as such):

| organ | natural hue | measured verdict | starting colour |
|---|---|---|---|
| heart | red | **no strain** — dark heart-red passes at 7.31 and still reads unmistakably red, especially with a lighter highlight | `#9E2B25` |
| liver | red-brown | **no strain** — naturally dark (8.29) | `#7A3B2E` |
| spleen | purple-red | **no strain** — oxblood 10.01, plum 9.30 | `#6B2D3C` |
| kidneys | red-brown | **no strain** (7.17) | `#8A4133` |
| lungs | pink | **strained but survivable** — true pink fails (1.51); the family's deep end passes and still reads pink: dusty rose 4.58, deep rose 5.47. The eosinophil (3.46) is existing proof the dusty end works | `#A34D5D` |
| brain | pink-grey | **strained but survivable** — pale brain pink-grey fails (2.11); mauve-taupe passes at 4.58 and the fold-pattern silhouette carries most of the identity anyway | `#8D6B7A` |
| marrow | bone cream | **FAILS as its natural colour** — bone cream is 1.21, darker ivory 1.59; nothing that reads "cream" can reach 3:1. Resolution below | see below |

**The marrow resolution — two measured options, either acceptable:**

- **Dark ochre bone with cream interior detail:** base `#8A4B08` (6.69 alone); a composite of
  75% base + 25% cream `#F5E7C6` averages `#A57238` = **4.08:1**. Reads as golden bone.
- **Red-marrow emphasis** — scientifically the stronger choice: active (hematopoietic) marrow
  IS red, and the marrow is what the organ does in this game. Base `#7A2E2E` (9.16); 70% base
  + 30% cream averages **4.56:1**. Reads as cut bone showing red marrow.

**The general two-tone rule, measured rather than asserted:** a dark base carrying a lighter
interior detail keeps the icon's area-weighted colour past 3:1 with margin, **provided the
light region stays at or under ~30% of the icon's area.** Measured composites: heart 85/15 →
6.27, lungs 80/20 → 4.37, brain 80/20 → 4.49, marrow 70/30 → 4.56. This is how a strained hue
gets its brightness back — a light accent on a dark body, never a light body.

## Size optimisation per class

Each class is seen at a different size, so the amount of interior detail that survives differs.
DPR does not change this: 2×/3× screens add sharpness, not angular size — the detail budget is
set by CSS pixels.

| class | optimise for | must also survive | detail budget |
|---|---|---|---|
| cells + pathogens (tokens) | **20px** — the largest a board token can be | **10px** (today's render): colour + silhouette only | silhouette-first; at most one bold interior feature (the neutrophil's lobed nucleus, the B-cell's receptors); anything finer is invisible where it matters |
| organs | **30px** — their board rendering | 20px | one notch richer: an interior line or two survives (brain folds, liver lobe line, marrow interior); still silhouette-first |
| entry-lane icons | **24px** — board furniture at lane ends, near their labels | 16px | between the two; these sit next to text that names them, so the icon reinforces rather than carries the identity |

Tokens also appear larger elsewhere (the stack-inspect view, hand panels at 40–56px), which the
256px source covers — but **legibility is judged at the board size, not the panel size.**

## Output specification

- **256×256 px**, PNG, **transparent background** (no white matte, no card, no frame)
- one centered subject, ~8% margin to every edge (nothing touching the frame)
- flat colour, no gradients, no drop shadow, no background texture
- the pipeline (P2.4, built after the art exists) trims margins, normalises palette, verifies
  the 3:1 contrast against `#FFFDF9`, and emits WebP at 1×/2×/3× with a manifest — so generate
  clean and let the pipeline do the conforming

> **Field note from the first batch (20 Aug 2026, asset 1):** the tool exported JPEG with a
> *drawn checkerboard pattern* standing in for transparency, not a real alpha channel. Accepted
> — the checker is neutral and the art saturated, so the pipeline keys it out — but prefer a
> true transparent-PNG export where the tool offers one. Also watch for the tool making interior
> details genuinely translucent (one of the four candidates did): interiors must be opaque
> lighter *paint*, not transparency.

## The 29 prompts — copy-paste, one per asset

Rulings folded in (Shantanu, 20 Aug 2026): **marrow uses the red-marrow emphasis**; entry
subjects are **stomach for Gut, mosquito for Bite, syringe for Blood**; and every prompt
carries an assigned starting colour — **all 29 measured ≥3:1 against the paper** (ratio noted
per prompt). Colours are generation starting points: Kartik may swap any hex — pick the
replacement from the viable table or check it against the ≤0.295-luminance bound first.
Sixteen token colours cannot all sit far apart; where two are neighbours, the silhouettes are
deliberately unalike, which is what constraint 3 is for.

The anchor sentence is identical in every prompt. Paste a block as-is.

### Cells

**1 · macrophage — teal `#1D5C4D` (7.68:1)**
```text
Flat sticker-style game icon of a monocyte white blood cell, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The immune system's big eater: a large friendly amoeba-like cell with one broad pseudopod arm reaching forward to engulf, its single interior detail a kidney-shaped nucleus in a lighter tint. Dominant colour #1D5C4D, the lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**2 · neutrophil — stain violet `#5B3A8C` (8.51:1)**
```text
Flat sticker-style game icon of a neutrophil white blood cell, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The fast first responder: a round energetic cell whose single interior detail is its three-lobed nucleus in a lighter tint. Dominant colour #5B3A8C, the lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**3 · bcell — lymph blue `#1F6F8B` (5.58:1)**
```text
Flat sticker-style game icon of a B-cell lymphocyte, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The antibody factory: a round cell studded around its rim with small Y-shaped antibody receptors, the Y-shapes bold enough to survive tiny sizes. Dominant colour #1F6F8B, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**4 · tcell — forest green `#3D6B35` (6.16:1)**
```text
Flat sticker-style game icon of a killer T-cell lymphocyte, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The assassin: a taut, angular cell with one striking sharp edge, coiled to strike. Dominant colour #3D6B35, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**5 · helper — royal blue `#1D4ED8` (6.60:1)**
```text
Flat sticker-style game icon of a helper T-cell lymphocyte, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The coordinator: a round cell radiating short signal waves from its surface — its power is communication, not combat. Dominant colour #1D4ED8, the lighter signal waves covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**6 · nk — slate `#44546A` (7.59:1)**
```text
Flat sticker-style game icon of a natural killer cell, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. A dense, dangerous-looking round lymphocyte whose single interior detail is a scatter of heavy granules in a lighter tint. Dominant colour #44546A, the lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**7 · eosinophil — eosin pink `#D96180` (3.46:1, its real stain colour)**
```text
Flat sticker-style game icon of an eosinophil white blood cell, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The anti-worm specialist: a round granulocyte whose single interior detail is its two-lobed nucleus in a lighter tint. Dominant colour #D96180, the lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

### Pathogens

**8 · virus — deep crimson `#8B1E3F` (8.78:1)**
```text
Flat sticker-style game icon of a virus, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. A menacing spiked icosahedral virion, the spikes bold and few enough to survive tiny sizes. Dominant colour #8B1E3F, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**9 · hidden — shadow plum `#4A3B52` (10.14:1)**
```text
Flat sticker-style game icon of a hidden virus, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. A spiked virion half-concealed inside a plain host-cell outline — half seen, half hidden; its identity is concealment. Dominant colour #4A3B52, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**10 · bacteria — dark olive `#556B2F` (5.85:1)**
```text
Flat sticker-style game icon of a bacterium, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. A rod-shaped bacterium — a capsule with rounded ends — with one whip-like flagellum tail as detail it can afford to lose. Dominant colour #556B2F, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**11 · toxin — dark ochre `#8A4B08` (6.69:1)**
```text
Flat sticker-style game icon of a toxin, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. A poison droplet marked with a small skull — a chemical, not a creature. Dominant colour #8A4B08, the lighter skull mark covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**12 · venom — viper green `#2E5339` (8.57:1)**
```text
Flat sticker-style game icon of venom, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. A droplet pierced by two snake fangs — unmistakably the animal poison, a sibling of the toxin drop but clearly distinct. Dominant colour #2E5339, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**13 · fungus — aubergine `#5C3566` (9.59:1)**
```text
Flat sticker-style game icon of a fungus, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. A budding yeast: one large oval cell with a smaller bud growing from it, a few spore dots as detail it can afford to lose. Dominant colour #5C3566, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**14 · worm — umber `#6B4423` (8.35:1)**
```text
Flat sticker-style game icon of a parasitic worm, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. One thick S-coiled helminth, visibly too big for any cell to swallow. Dominant colour #6B4423, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**15 · malaria — indigo `#312E81` (11.24:1)**
```text
Flat sticker-style game icon of the malaria parasite, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. A crescent-shaped plasmodium — the banana-like gametocyte form. Dominant colour #312E81, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**16 · parasite — mulberry `#6E2F4B` (9.52:1)**
```text
Flat sticker-style game icon of a single-celled parasite, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. A complex layered teardrop-shaped protozoan with twin flagella trailing — tough and intricate, clearly not a simple microbe. Dominant colour #6E2F4B, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

### Entry lanes

**17 · nose — slate `#566270` (6.12:1)**
```text
Flat sticker-style game icon of a human nose in profile, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The airway entry: a simple side-profile nose, instantly readable. Dominant colour #566270, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**18 · contact — green `#2F6B4A` (6.22:1)**
```text
Flat sticker-style game icon of a hand pressing flat onto a surface, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The skin-and-mucous-contact entry: an open palm touching a plain surface edge. Dominant colour #2F6B4A, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**19 · gut — brown `#8C5A2B` (5.72:1)**
```text
Flat sticker-style game icon of a stomach, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The food-and-water entry: a simple J-shaped stomach. Dominant colour #8C5A2B, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**20 · blood — frame red `#B03A2E` (5.92:1)**
```text
Flat sticker-style game icon of a syringe, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The needle-and-transfusion entry: a simple syringe at a diagonal. Dominant colour #B03A2E, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**21 · wound — rust `#8B3A2A` (7.55:1)**
```text
Flat sticker-style game icon of a wound, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The broken-skin entry: a lens-shaped cut with parted edges. Dominant colour #8B3A2A, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**22 · bite — moss `#3E4E34` (8.82:1)**
```text
Flat sticker-style game icon of a mosquito, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The insect-or-animal-bite entry: a mosquito from above, wings and proboscis bold and simple. Dominant colour #3E4E34, any lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

### Organs

**23 · brain — mauve-taupe `#8D6B7A` (4.58:1)**
```text
Flat sticker-style game icon of a human brain, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. A brain in side profile, with two or three fold lines in a lighter tint as its only interior detail. Dominant colour #8D6B7A, the lighter fold lines covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**24 · lungs — deep rose `#A34D5D` (5.47:1)**
```text
Flat sticker-style game icon of human lungs, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. A paired set of lungs joined by a short trachea, one or two airway branch lines in a lighter tint as the only interior detail. Dominant colour #A34D5D, the lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**25 · heart — dark heart-red `#9E2B25` (7.31:1)**
```text
Flat sticker-style game icon of an anatomical human heart, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. A real anatomical heart, not a valentine, with short vessel stubs at the top and one lighter highlight. Dominant colour #9E2B25, the lighter highlight covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**26 · liver — liver brown `#7A3B2E` (8.29:1)**
```text
Flat sticker-style game icon of a human liver, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The wedge-shaped liver with its lobe line in a lighter tint as the only interior detail. Dominant colour #7A3B2E, the lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**27 · spleen — oxblood `#6B2D3C` (10.01:1)**
```text
Flat sticker-style game icon of a human spleen, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. The bean-curved spleen with its gently notched inner edge, one lighter highlight as the only interior detail. Dominant colour #6B2D3C, the lighter highlight covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**28 · kidneys — kidney brown `#8A4133` (7.17:1)**
```text
Flat sticker-style game icon of a pair of human kidneys, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. Two kidney-bean shapes side by side, each with one lighter inner curve as the only interior detail. Dominant colour #8A4133, the lighter interior covering at most 30% of the icon. 256x256 pixels, transparent background, PNG.
```

**29 · marrow — red marrow `#7A2E2E` (9.16:1; composite with cream 4.56:1)**
```text
Flat sticker-style game icon of a cut long bone showing its marrow, one bold dark solid-colour silhouette with minimal lighter interior detail, smooth rounded shapes, no outline stroke, no gradients, no shadow, no background, centered, filling the frame. A long bone cut open whose dark red marrow interior dominates the icon; the pale cream bone shell is a thin rim around it, covering at most 30% of the icon. Dominant colour #7A2E2E with the cream rim as the lighter detail. 256x256 pixels, transparent background, PNG.
```

## Provenance — record at generation time, per tool

Before the first image: open [`ASSETS.md`](ASSETS.md) and for **every** asset record tool +
version, date, account/plan, and the prompt used. **Whether output may be redistributed under
CC BY-SA 4.0 is a per-tool question decided by that tool's terms as of the generation date** —
Gemini and Google Flow are different products with different terms, and the answer for one is
not an answer for the other. The content licence stays undeclared until the register is filled
and the terms of the tool actually used are confirmed.
