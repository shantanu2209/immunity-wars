# The fifteen why boxes, with the titles put over them — for Kartik

**8 September 2026.** The boxes are yours, from the rulebook. **The titles are not.** They were
written by the builder, on Shantanu's ruling of the same day, so the library had something to list
each box under. **Overrule any that miss.** Changing one is a single line in the catalogue and
nothing else moves.

Your text underneath each title is unchanged from the rulebook except for punctuation: ten of the
fifteen had a dash, and no player-facing text in this app carries one. The words are pinned to the
rulebook document in the repository by a test that reads the document itself, so if the two ever
disagree the build fails rather than quietly drifting.

**Where they live in the app.** Title, then Disease library, then "Why it works this way". Each box
also links to the How to play section it belongs to, and each of those sections links back to its
boxes.

---

## One thing to know before you read title 11

**Title 11 describes a rule the game does not follow yet.**

I wrote "Why the Eosinophil burns the organ it stands in". That is what you ruled, and it is what
the Eosinophil's own cell card in the game already says. **The engine currently does something
broader:** it burns the organ when the target is anywhere on that organ's branch. So an Eosinophil
striking at step 1 of the Brain branch costs the Brain a point while standing nowhere near it.

**Your box text is not the problem, and does not need changing.** "Killing a parasite inside tissue
damages that tissue" is the biology, and it is exactly the biology the engine change exists to
obey. It is the *title* and the *card* that say where the damage lands.

The fix is queued as **Q9** and is a one-line change to the engine. When it lands, both texts become
true with no edit at all. You are being told now rather than finding it in play.

---

## The fifteen

### 1. Why surviving the window is not the win
*How to play: The idea*

Real infections do not end when the exposure stops. They end when the last organism is cleared. A
person is not well the moment they stop being infected; they are well when their body has finished
the job. That is why surviving the window is not a win.

### 2. Why the Blood route is short
*How to play: The board*

The Blood route is short because a needle, a transfusion or a deep wound puts an infection straight
into the bloodstream, skipping the skin, the mucus and the stomach acid that stop almost everything
else. Bloodborne infection is fast because it has cheated the barriers.

### 3. Why the lymphatic shortcuts join the routes they do
*How to play: The board*

Mucosal surfaces share a common defensive system (MALT), and skin wounds drain to shared regional
lymph nodes. A needle into a vein bypasses lymphatic drainage entirely, which is exactly why the
Blood route has no shortcut.

### 4. Why the Brain is so hard to defend
*How to play: The board*

The blood-brain barrier deliberately keeps immune cells out, to protect neurons that cannot be
replaced. That protection is also a weakness: it is why brain infections are so hard to clear, and
why the Brain has only 2 integrity instead of 3.

### 5. Why you start with no antibodies
*How to play: Antibodies*

You start with zero antibodies because the first adaptive response genuinely takes five to ten
days: the one matching B-cell must be found among millions and then multiplied. The innate cells
exist to buy exactly those days.

### 6. Why worms do not multiply inside you
*How to play: Beating each invader*

Worms are large animals that burrow into tissue rather than travelling in the blood like a virus.
And unlike bacteria they cannot multiply inside you: most human worms lay eggs that must leave the
body and develop outside. A person's worm burden grows through repeated exposure, not internal
breeding, which is why two per game is biologically honest as well as playable.

### 7. Why coating a toxin-maker stops its countdown
*How to play: Beating each invader*

Coating a toxin-making bacterium stops its countdown completely: a coated bacterium never advances
toward releasing its toxin. That is the game rewarding you for dealing with tetanus early, which is
exactly the clinical advice.

### 8. Why coating is not killing
*How to play: Antibodies*

Coating is separated from killing on purpose. An antibody is a handle, not a weapon. This is
opsonisation, and it is why the B-Cell and the Monocyte have to work as a pair.

### 9. Why the Helper must be primed first
*How to play: Your cells*

A naive helper T-cell genuinely cannot help anyone until a dendritic cell presents it an antigen.
The three bonuses are the real T-helper subsets: Th2 releases IL-5 to recruit eosinophils, Th17
releases IL-17 which drives G-CSF and steps up neutrophil production in the marrow, and helper
contact is what licenses a B-cell to make antibodies properly.

### 10. Why the NK Cell rolls a die
*How to play: Your cells*

The NK cell is innate: it needs no antibody, no antigen presentation and no priming, so it works
from turn one. The die is the honest price of that speed. It is fast and always available, but less
precise than a Killer T-Cell.

### 11. Why the Eosinophil burns the organ it stands in
*How to play: Your cells* — **see the note above: this title is ahead of the engine, by Q9**

Eosinophil granules are indiscriminate poison. Killing a parasite inside tissue damages that
tissue, which is why parasitic infections cause chronic inflammation and scarring, and why
degranulating should feel like a decision rather than a free hit.

### 12. Why a resident never leaves its organ
*How to play: Your cells*

Tissue-resident macrophages, Kupffer cells in the liver, alveolar macrophages in the lungs,
microglia in the brain, live permanently in one organ and never circulate. The 'never leaves' rule
is what tissue-residency means.

### 13. Why malaria needs three different defences
*How to play: Beating each invader*

This is the clearest example in medicine of why the same pathogen needs different defences at
different moments. The RTS,S malaria vaccine targets the travelling sporozoite precisely because
that brief window is when antibodies can act at all.

### 14. Why you must vaccinate on Normal and Hard
*How to play: Memory and vaccines*

On the harder modes the game forces the real public-health lesson: waiting to catch a disease is a
terrible strategy. A vaccine gives you the memory without the illness, and paying 5 Action Points
before an outbreak is far cheaper than fighting it twice.

### 15. Why Pathogen X takes so long to answer
*How to play: Memory and vaccines*

This is clonal selection, and the delay is the point: it is precisely why a genuinely new virus is
so dangerous. Your body is not missing the tools; it is searching a library of a hundred million
receptor shapes for the one that fits.
