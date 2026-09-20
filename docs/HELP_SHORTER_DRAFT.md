# How to play, shortened: a DRAFT for Kartik to review

**Status: not in the app.** Nothing here has been shipped. Item 6 of 19 September asks for Help to
be "less wordy, with illustrations, more concise and neat", and Shantanu ruled on 20 September that
Claude drafts the shorter versions and **Kartik reviews them**, because the words are his science.

**What the current text costs:** 4,638 characters across the ten sections, on a screen 360px wide.
By section: s1 687, s2 770, s3 932, s4 370, s5 112, s6 20, s7 708, s8 465, s9 285, s10 289.
This draft is **2,290**, a little over half, and no fact is dropped: what goes is repetition, the
second way of saying the same thing, and detail the card or the screen already tells you at the
moment it matters.

**The art, all of it already in the repository** (`packages/app/public/art`), so nothing new is
drawn for this: `entry-*` for the six routes, `organ-*` for the seven organs, `cell-*` for the
seven cells, `path-*` for the nine kinds of pathogen. The proposal per section is under each one.

**How to review this:** read the RIGHT column against the left. Anything that reads as wrong
science, or that loses something a newcomer needs, gets marked and stays as it was. A shorter
sentence that is less true is not an improvement, and the standing rule is the smaller TRUE claim.

---

## 1. The idea — 687 → 300

> You command the body's immune cells. Infections keep arriving until the window closes: turn
> {training} on Training, {normal} on Normal, {hard} on Hard. Then destroy every pathogen still
> inside. That is the win. The body is lost if an organ fails, or if it is still infected {grace}
> turns after the window closes.
>
> Each player commands one cell. Alone each is nearly useless: the Monocyte cannot swallow a worm,
> the Killer T-Cell cannot touch a toxin, antibodies cannot reach what hides inside your own cells.
> Together you can hold.
>
> All seven organs count. Losing the spleen ends the game as surely as losing the heart.

**Art:** the seven `organ-*` icons in a row under the last line.
**Cut:** "New infections keep breaking in" → "Infections keep arriving"; "the B-Cell's antibodies"
→ "antibodies", since the B-Cell is section 5's.

## 2. A turn — 770 → 330

> Every turn has three phases. The app runs two of them.
>
> **Infection.** The app draws the turn's cards, places each new invader at the start of its route,
> and shows you what arrived and this turn's crisis, if one fired. Then the body from the outside,
> to plan against.
>
> **Command.** Yours. Spend your Action Points in any order, on any cells, then End turn. Unspent
> points are lost.
>
> **Spread.** Every invader advances one step. Anything reaching an organ takes 1 integrity from it.
>
> The spread plays frame by frame. Tap to move it on.

**Art:** none needed; this section is now short enough to read at a glance.

## 3. The board — 932 → 430

> **Six entry routes.** Nose, Contact, Gut, Wound and Bite are five steps long. Blood is three.
>
> **The bloodstream.** The red hub. Every cell starts here, every route ends here, every organ
> branch begins here. Any cell can Recall here for 1 Action Point, losing all its position.
>
> **Seven organ branches.** Numbered circles ending at the organ. A germ that reaches the organ
> attacks it.
>
> The pips above an organ are its integrity. A damaged organ costs you something, and its own line
> says what.
>
> **The Brain.** Inside the Brain branch every cell moves 1 step per point, however fast it is.
>
> Tap any node to see what stands there.

**Art:** the six `entry-*` icons beside the routes line; `organ-brain` beside the Brain rule.
**Cut:** "Germs enter here and march inward" (the next line says it), and the worked example of an
organ's damage line, which the sheet shows when you tap an organ.

## 4. Action Points — 370 → 200

> A fixed number each turn: {training} on Training, {normal} on Normal, {hard} on Hard. A damaged
> Heart or Lungs costs one each; some crises add or remove some for a turn.
>
> Every action costs 1 point unless it says otherwise.
>
> Tap the AP figure at the top of the screen for this turn's terms and total.

**Art:** none.

## 5. Your cells — 112, unchanged

> Seven cells, all starting in the bloodstream. Each has one job, and the card behind each one says
> why.

**Art:** the seven `cell-*` icons as a row of tappable names, which is what this section is for.

## 6. Beating each invader — 20, unchanged

The section is a table generated from the content pack, not prose.
**Art:** the nine `path-*` icons in the rows, which is the one place a picture does the most work:
a newcomer meeting "EUK" learns nothing, and a worm beside it teaches at once.

## 7. Antibodies — 708 → 400

> An antibody only fits its own class. Making the wrong one is wasted work.
>
> Six classes: **ENV** and **NAK** for enveloped and naked viruses, **EXB** and **ICB** for bacteria
> outside and inside your cells, **TOX** for toxins, **EUK** for worms, protozoa and fungi. Every
> pathogen card names its class.
>
> The B-Cell produces into one class at a time, up to the store's cap. Spend them to coat a
> bacterium, worm or parasite so your cells can attack it, or to neutralise a virus or toxin
> outright. **Coating does not kill. It makes the target attackable.**
>
> **Pathogen X.** Brand new: no antibody fits. Search for the clone, 3 AP, then produce it.

**Art:** `cell-bcell`.

## 8. Memory and vaccines — 465 → 260

> Once your body remembers a disease, it deals with that disease instantly whenever it returns:
> free on Training and Normal, 1 Action Point on Hard.
>
> On Training, beating a pathogen is enough to remember it. On Normal and Hard only a vaccine gives
> memory: 5 Action Points against a disease you have already seen, across as many turns as you like.
>
> A remembered pathogen shows a ring on the board. Tap it to destroy it at once.

**Art:** none.

## 9. Crisis events — 285, near unchanged

> Some cards carry a crisis. It takes effect the turn it is drawn, and the app names it. Each one is
> a real clinical phenomenon.
>
> A few cards carry rarer events that fire at the end of a spread, such as a malaria relapse or
> shingles. The log names each and says why.

**Cut:** "the reveal names it" → "the app names it", because piece 6 replaced the reveal dialog with
the arrivals stage and the old word would be wrong.

## 10. Difficulty — 289, unchanged

The one sentence is already a list of exactly what changes.

---

## What this draft does NOT do

- **It does not change any science.** Every claim above is the current claim, shortened. If a
  shortening has changed a meaning, that is a defect in the draft, and marking it is the point of
  the review.
- **It does not touch the disease entries** (the 666-string `diseases` namespace). Those are
  Kartik's written science and a separate piece of work, as `PHASE2_BRIEF.md` §5 says.
- **It does not add the art.** Wiring the icons into Help is a build change, and it waits on this
  review so the text and the pictures land together.
