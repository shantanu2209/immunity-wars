# How to play: the draft, for Shantanu and Kartik to read together

**Drafted 6 September 2026 on the structure agreed with Kartik** ([`for-P2.6.md`](for-P2.6.md),
PROPOSAL 1 and the rulings on it). This is the readable form; the catalogue entries are cut
from it after the words are settled, not before. Nothing here is in the app yet.

**How to read the tags.** Every paragraph carries one:

- **[Rulebook §N, as it is]**: Kartik's sentence, unchanged.
- **[Rulebook §N, repunctuated]**: Kartik's sentence with its dashes made into colons or
  full stops and nothing else changed, because no player text carries a dash.
- **[Quick Reference, as it is]** and **[Quick Reference, repunctuated]**: the same, from the
  table card.
- **[In the app already]**: approved text the app shows today (the goal dialog, the
  difficulty screen, the organ rows, the effects strip), reused so Help and the screen never
  disagree.
- **[Fresh]**: written for the phone. These are the sentences to check hardest.

**The register**: real vocabulary explained in passing, not simplified, as the goal dialog set
it and the cell cards held it. **The division**: Help answers how to play; the cards say why a
cell or a pathogen is the way it is; the library says what a pathogen is and, from this
sub-phase, why the game models it that way. So a section that touches a cell or a pathogen
ends by pointing at its card, and the biology stays where Kartik put it.

**What Help describes is the app**, and the app is the engine's rules. Where the rulebook and
the app differ, Help follows the app and the difference is listed at the end for Kartik.

Length: each section is one to two phone screens at 360 px. Word counts are given per
section against the proposal's budget.

---

## 1. The idea

*Answers: what am I, what wins, what loses, when does it end. Budget 60 words; draft 103.*

[In the app already: the goal dialog] You command the body's immune cells. New infections
will keep breaking in until turn {maxTurn}. After that, destroy every pathogen still inside
the body. That is the win. If an organ fails, or the body is still infected at turn
{lastTurn}, the body is lost.

[Rulebook §1, as it is] Each of you commands one immune cell. Alone, every cell is nearly
useless: the Monocyte cannot swallow a worm, the Killer T-Cell cannot touch a toxin, and the
B-Cell's antibodies cannot reach anything hiding inside your own cells. Together, you can
hold.

[Fresh] All seven organs count. Losing the spleen ends the game as surely as losing the heart.

---

## 2. A turn

*Answers: why did the screen change, which part is mine, what does the app do for me.
Budget 80 words; draft 135.*

[Fresh] Every turn has three phases, and the app runs two of them for you.

[Fresh] **Infection.** Tap Draw. The app draws this turn's cards, places each new invader at
the start of its route, and shows you what arrived, with this turn's crisis event if one
fired. Then it shows the body from the outside so you can plan: what is coming, where it is
heading, and how many Action Points you have.

[Fresh] **Command.** Your part. Tap Command your cells and spend your Action Points in any
order, on any cells. Unspent points are lost at the end of the turn.

[Rulebook §5, as it is] **Spread.** Every invader advances one step toward its target.
Anything reaching an organ box attacks that organ, removing 1 integrity.

[Fresh] The app plays the spread out frame by frame. Tap anywhere to move it on.

---

## 3. The board

*Answers: what is this map, what are routes, the bloodstream, the organ branches, the pips,
what "when damaged" means, the Brain rule. Budget 100 words; draft 188.*

[Rulebook §3, as it is] **The six entry routes.** Germs enter here and march inward. Nose,
Contact, Gut, Wound and Bite are five steps long. Blood is only three.

[Rulebook §3, repunctuated] **The bloodstream.** The red hub at the centre. All cells start
here. Every route ends here and every organ branch begins here. Any cell may Recall to the
bloodstream from anywhere for 1 Action Point, losing all its forward position.

[Rulebook §3, as it is] **The seven organ branches.** Each organ hangs off the bloodstream on
a short branch of numbered circles, with the organ box itself as the final position. A germ
that reaches the organ box attacks the organ.

[Fresh] The pips above each organ are its integrity. A damaged organ also costs you
something, and the organ's own line says what: tap an organ, or its resident, and the sheet
reads, for example, [In the app already: the organ rows] "Liver, defence organ, integrity 2
of 3. When damaged: your antibody storage cap falls to 2 per class."

[Rulebook §3, as it is] **The Brain rule.** Inside the Brain branch, every cell moves only 1
step per Action Point, no matter how fast it normally is.

[Fresh] Tap any node to see what stands there and what it can do.

---

## 4. Action Points

*Answers: why do I have fewer this turn, what costs one. Budget 50 words; draft 70.*

[Fresh] You get a fixed number of Action Points each turn: 6 on Training, 5 on Normal, 4 on
Hard. A damaged Heart or Lungs costs you one each, and some crisis events add or take some for
one turn.

[Rulebook §5, as it is] Every action costs 1 Action Point unless stated otherwise.

[Fresh] Tap the AP figure, in the command bar or on the planning screen, and it lists this
turn's terms and their total.

---

## 5. Your cells

*Answers: who does what, who moves, what a resident is. Budget 120 words; draft 352, the
longest section.*

[Fresh] Seven cells, all starting in the bloodstream. Each has one job, and the card behind
each one says why.

[Quick Reference, repunctuated, cut to the verb clause] **Monocyte.** Speed 1. Engulf: free
once a turn, then 1 AP. Swallows a virus, a coated bacterium, a fungus, blood-stage malaria,
or a parasite already down to its last hit point. Strike: 1 damage to a coated worm or
parasite.

[Quick Reference, repunctuated] **Neutrophil.** Speed 2. NET: traps every living microbe on
its own space. Then it is spent and returns after 4 turns, or 2 if a primed Helper T-Cell is
in the bloodstream.

[Quick Reference, repunctuated] **B-Cell.** Never moves. Produce antibodies of one antigen
class. Coat a bacterium, worm or parasite. Neutralise a virus, or a toxin for 2 AP. Vaccinate,
5 AP in total. Search for the clone, 3 AP, for Pathogen X.

[Quick Reference, repunctuated] **Killer T-Cell.** Speed 1. Snipe: destroys a pathogen hiding
inside one of your cells. Never misses. Range 3 on Training, 2 on Normal and Hard, one more
while a primed Helper stands with it.

[Quick Reference, repunctuated] **Helper T-Cell.** Speed 1. Licenses the others, but only once
it has been primed: an antigen must have been presented, which happens the first time any of
your cells engulfs or destroys a pathogen. With the B-Cell: one more antibody per action. With
the Killer T-Cell: one more range. With the Eosinophil: one more step. In the bloodstream: the
Neutrophil returns in 2 turns.

[Quick Reference, repunctuated] **NK Cell.** Speed 2. NK strike: attacks a hidden or infected
cell within one step, on a die roll of 3 or more. Needs no antigen and no antibody.

[Quick Reference, repunctuated] **Eosinophil.** Speed 1. Strike: 2 damage to a coated worm or
parasite. Degranulate, 2 AP: 3 damage, enough to kill a worm outright, but it burns the organ
it stands in and the cell is spent for 4 turns.

[Rulebook §6, repunctuated, the Recall sentence removed: see the differences] **Resident
macrophages.** One lives in each organ. Patrol: 1 AP per step along its own organ branch. It
may never leave that branch, and it must be out on the branch to meet anything: nothing can
be engulfed in the organ box itself. Engulf, free once per turn: destroy one virus or coated
bacterium on its space.

---

## 6. Beating each invader

*Answers: what do I do about this thing. Budget 110 words; draft 239, nine entries. The
malaria stages stay on the card.*

[Quick Reference, repunctuated] **Virus.** Neutralise with a matching antibody, or the
Monocyte engulfs it. If it hides inside a cell, only the Killer T-Cell or NK Cell can reach it.

[Quick Reference, repunctuated] **Hidden.** It is inside one of your own cells, where
antibodies cannot go. Killer T-Cell (never misses) or NK Cell (3 or more). Not all are
viruses: Toxoplasmosis and Chagas are protozoa that live inside cells.

[Quick Reference, repunctuated] **Bacterium.** Coat it with a matching antibody, then engulf
it, or trap the swarm in a NET. It divides if you ignore it. Up to 8 can pack into one space.

[Quick Reference, repunctuated] **Fungus.** It cannot be coated. The Monocyte engulfs it
directly (2 hits, so that chips it) and a NET kills it outright.

[Quick Reference, repunctuated] **Toxin.** Not alive: nothing can eat it, trap it or snipe
it. Antitoxin antibodies only, and neutralising costs 2 AP.

[Quick Reference, repunctuated] **Venom.** Not alive, and far too fast for your B-cells. Only
a ready-made antivenom dose works.

[Quick Reference, repunctuated] **Worm.** Too big to swallow and immune to NETs. Coat it, then
the Eosinophil strikes (2) or degranulates (3). It lodges in an organ and chews it every 3
turns.

[Quick Reference, repunctuated] **Parasite.** Coat it, then strike it down: Eosinophil 2
damage, Monocyte 1. Once it is on its last hit point the Monocyte can finally swallow it.

[Quick Reference, repunctuated] **Malaria.** Three stages. Travelling in the blood: antibodies
or the Monocyte. Inside liver cells: Killer T-Cell or NK Cell only. Back in the blood:
antibodies again. The card has the stages.

---

## 7. Antibodies

*Answers: why does my antibody not work on that; produce, then coat or neutralise; classes;
the cap; Pathogen X. Budget 80 words; draft 127.*

[Quick Reference, as it is] An antibody only fits its own antigen class. Making the wrong one
is wasted work.

[Fresh] Six classes: ENV and NAK for enveloped and naked viruses, EXB and ICB for bacteria
outside and inside your cells, TOX for toxins, EUK for worms, protozoa and fungi. Every
pathogen card names its class, and the antibody panel shows each store.

[Fresh] The B-Cell produces into one class at a time, up to the store's cap. Then the
antibodies are spent: coat a bacterium, worm or parasite so your cells can attack it, or
neutralise a virus or toxin outright.

[Rulebook §6, repunctuated] Coating does not kill; it makes the target attackable.

[Quick Reference, repunctuated] **Pathogen X.** Brand new: no antibody fits. Search for the
clone, 3 AP, to find the one B-cell that does, then produce it.

---

## 8. Memory and vaccines

*Answers: what is a memory response, what does Vaccinate do, what differs by difficulty.
Budget 60 words; draft 81.*

[Rulebook §8, repunctuated] Once your body remembers a disease, that disease is dealt with
instantly whenever it reappears: free on Training and Normal, and for 1 Action Point on Hard.

[Fresh] On Training, beating a pathogen is enough: your body remembers it. On Normal and
Hard, only a vaccine gives memory: invest 5 Action Points across as many turns as you like
against a disease you have already seen.

[Fresh] A remembered pathogen shows a ring on the board. Tap it to destroy it at once.

---

## 9. Crisis events

*Answers: what was that section in the reveal. Kartik's ruling: every event listed with what
it does, so a player can look one up before it fires. Budget 50 words; draft 192 for nine
events, and the names and reasons are the content pack's own words, which the reveal shows.*

[Fresh] Some cards carry a crisis. It takes effect on the turn it is drawn, and the reveal
names it. Each one is a real clinical phenomenon.

[In the app already: the event table's name and reason; the effect from the engine's rule]
**Immunosuppression.** Stress or malnutrition blunts the response. No antibodies can be made
this turn.

**Neutropenia.** Neutrophil count crashes. The Neutrophil goes offline for 2 turns.

**Lymphopenia.** A virus is destroying lymphocytes. The Killer T-Cell goes offline for 2
turns.

**Antibody shortage.** Plasma cells can't keep up. Every antibody store is capped at 2 for 3
turns.

**Fatigue.** The whole body is exhausted. 1 fewer Action Point this turn.

**Co-infection.** A second germ slips in while you're busy. An extra invader breaks in at
once.

**Acute-phase surge.** Inflammation floods the tissue with defenders. 2 extra Action Points
this turn.

**Passive antibodies.** A booster tops up your antibodies. Every store is filled to its cap.

**Fever.** Raised temperature slows the invaders, at an energy cost. The invaders do not
advance this turn, and you have 1 fewer Action Point.

[Fresh] A few cards carry rarer events that fire at the end of a spread, such as a malaria
relapse or shingles. The log names each one and says why.

---

## 10. Difficulty

*Answers: which should I pick, what changes. Budget 40 words; draft 80.*

[In the app already: the difficulty screen] **Training.** The gentlest start. Learn the immune
system as you play. Recommended for your first game. **Normal.** The full game, balanced for
a real fight. **Hard.** Faster spread, tighter caps. For veterans.

[Fresh] What changes: Action Points per turn (6, 5, 4), how long the infections keep coming
(15, 20, 30 turns), how many cards a turn can bring, how many antibodies a store holds, where
a worm starts, and whether surviving a disease gives memory or only a vaccine does.

---

## Totals

Ten sections, 1,567 words measured against the proposal's 750. The overrun is in sections 2, 3, 5, 6
and 9. In 5, 6 and 9 each entry is one line and the count of entries is fixed by the game:
seven cells and the residents, nine invaders, nine events. In 2 and 3 the words are the
app's own screens being named, which the rulebook did not have to do. Every section still fits two phone
screens at 360 px, which is the bound that matters; the budget was an estimate and the
entries are the content.

## Where the app and the rulebook differ, so Kartik knows which sentences follow which

- **Resident recall is not in the app.** The rulebook gives residents a 1 AP Recall to their
  organ box; the engine has only Patrol, one step at a time, and Recall is queued for Phase 3
  ([`ENGINE_CHANGE_QUEUE.md`](ENGINE_CHANGE_QUEUE.md) Q6). The sentence is left out of section
  5 rather than promised.
- **The crisis pool is the content pack's nine**, six bad and three good. The rulebook's table
  lists HIV, Dengue ADE, antigenic variation and lymphatic blockage as crisis events; in the app
  HIV and lymphatic blockage are effects carried by their own disease cards, and Dengue ADE is
  a rare event. Section 9 lists the nine and points at the log for the rare ones.
- **Fever** in the app halts the march for a turn and costs 1 Action Point; the rulebook's
  table gives Fever and Fatigue the same single effect.
- **Antibody production's arithmetic** (presentation tiers, the Helper's +1, affinity on
  Training, the per-action cap) is in the app's antibody panel, term by term, so section 7
  does not restate it.
- **Degranulate's burn.** The rule as designed is the organ the Eosinophil stands in; the
  engine today burns when the target is anywhere on a branch (FINDINGS #57, Q9). Help states
  the rule as designed, since that is what the fix restores.

## The rulings (Shantanu, 6 September 2026), and what the app now carries

1. **The NK Cell's reach is 1, and the rulebook was wrong**: it said both "on its own space"
   and "within 1 step", so it contradicted itself and the engine settled it. Help says within
   one step. The rulebook's NK row and the quick reference's NK line now say "within 1 step".
2. **Section 9 keeps its length.** The overrun follows Kartik's ruling that it duplicates
   rather than references, and a reference section is long by nature.
3. **The app's phase names win.** Stated precisely, because the premise needed one correction:
   the app names only two phases to a player, "Infection!" on the reveal and "Command your
   cells" on the button, and never names the third. So Infection and Command are the app's,
   and for the third Help uses **Spread**, which is the rulebook's word and the engine's own;
   the quick reference's "March" heading is corrected to Spread. Two documents and the app now
   agree, and if the app ever labels the third phase it is Spread. The verb "march" for what
   germs do stays, in the rulebook and in the fever chip: it is a verb, not a phase name.
4. **"Not all hidden pathogens are viruses" stays in Help**: a rules fact a player needs before
   they meet one; the card is read after the fact.

*One premise corrected rather than acted on.* The ruling on the NK reach asked for the fix "in
the same pass as the resident wording you already fixed". No document's resident wording was
changed: Help left resident Recall out because the app lacks it, while the rulebook keeps it as
the table game's rule and the Phase 3 queue's target (Q6). The rulebook's Recall sentence
stands.

**Section 1 in the app** differs from the draft in one respect: the goal dialog's sentences
carry {maxTurn} and {lastTurn} for the game in play, and Help is read outside a game, so
Help's first paragraph states the window for all three difficulties and the fifteen-turn
grace after it, every number read from the content pack rather than typed. The words are
otherwise the goal dialog's.

**Section 9 in the app, one difference from the draft, found by reading the screen.** The
draft trimmed two reasons to their first clause; the app shows each reason whole, as the
reveal does, and two of Kartik's reasons already state the effect in his own words (Fatigue:
"1 fewer Action Point this turn only"; Acute-phase surge: "+2 Action Points this turn only",
with its acute-phase note). Rendered with Help's line as well, each said its effect twice. So
those two Help lines are empty and the reason carries the effect; the pin checks the reason's
numbers for them and requires that exactly those two are the empty ones.

**Every number Help states that a difficulty sets** (Action Points, the window, the grace) is
read from the content pack at render; section 3's example organ row is the inspect sheet's
own composition of the Liver at 2 of 3; section 9's names and reasons are the event table the
reveal renders, and its effect lines are pinned to the engine by firing each event
(`tests/equivalence/src/help-events.test.ts`, with two controls).

## For Kartik to rule on, beyond the words (ruled above; kept as the record of what was asked)

1. **The NK Cell's reach.** The rulebook's own table says "on its own space"; its Killer
   T-Cell passage says "within 1 step"; the engine's range is 1. Section 5 says "within one
   step". Which is the rule?
2. **Section 9's shape.** Nine entries at about 150 words is three times the budget. The
   alternative that keeps the ruling is the same nine at one line each, without the reason,
   since the reveal shows the reason when the event fires.
3. **Section 2's names for the phases.** The app says Draw, Command your cells, End turn; the
   rulebook says Infection, Command, Spread; the quick reference says March. Help uses the
   rulebook's three names as headings and the app's button names in the text.
4. **"Hidden" in section 6** keeps the quick reference's note that not all hidden pathogens
   are viruses. It is science, and it is short; it could also go to the card.
