# PROPOSAL 5 — first-encounter hints (for ruling; nothing built)

**8 September 2026.** To Shantanu's direction: not a tutorial, not a guided first turn. When a
player meets something for the first time, tell them what it is at that moment. Resettable from
Settings. Trigger is first CONTACT, not first sight.

Everything below rests on four measurements taken before anything was proposed. They are first,
because two of them change the answer.

---

## 0. What was measured

**M1 — a first turn on Training puts SEVENTEEN things within reach of a tap.** Eight fresh
Training games, drawn and advanced to the command phase: **7 cells, 7 residents and 7 organs on
the board every time**, plus **1 or 2 invaders** of 1 or 2 distinct types. A curious newcomer
tapping cells to find out what they are can contact seven hint subjects before ending turn one.

**M2 — the per-thing text already has exactly ONE copy, and Help is its only reader.**
`help.cell.<key>` and `help.invader.<type>` in `ui.json`, 18 entries, rendered by
`HelpScreen.tsx` and nowhere else. The cell CARD does not read them: it reads `CELL_CARDS` from
the content pack, which is Kartik's science (role, home, best against, deficiency, a fact) and a
different body of text with a different job.

**M3 — no mechanical truncation gives a usable hint.** Taking a hint as the first sentence of
the existing text puts **8 of 18** outside a 40 to 150 character band; the first two sentences
puts **4 of 18** outside it. The failures are not near-misses:

| Subject | First sentence | Why it fails alone |
|---|---|---|
| B-Cell | "Never moves." | 12 characters, and says nothing about what it is for |
| Malaria | "Three stages." | 13 characters, and the three are the whole point |
| Fungus | "It cannot be coated." | Says what does not work and not what does |
| Helper T-Cell | 170 characters, one sentence | Cannot be cut at all; there is no second sentence |

**M4 — the settings store cannot absorb this without resetting people's settings.**
`SettingsSchema` pins `v: z.literal(1)`, so a record with a new field fails `safeParse` and falls
back to `DEFAULT_SETTINGS`. Adding hints-seen to that object would **silently reset every
player's chosen text size** on first load after the update.

---

## a. THE SET — 19 subjects, and the cut is toward what is visible

### The rule applied

Shantanu: *"the cut should be toward things a player cannot work out by looking."* So the test
for each candidate is not "is this important" but **"is this on the screen already?"**

### IN — 19, and 17 of them already have their text

| Group | Count | Why a player cannot work it out by looking |
|---|---|---|
| **The seven cells** | 7 | A token's picture does not say that the Neutrophil is spent for four turns after it acts, or that the Helper kills nothing |
| **Resident macrophages** | 1 | Nothing on screen says they may never leave their organ. One hint for the class, not seven |
| **The nine invader types** | 9 | This is the heart of it. Nothing visible distinguishes a fungus, which cannot be coated, from a bacterium, which must be |
| **Antibody classes must match** | 1 | The panel shows classes; that the wrong one is wasted work is invisible until it is wasted |
| **The window closing** | 1 | The turn number is visible. That surviving to the end is not the win is not |

### OUT, and each for the same reason: it is on the screen

| Cut | Where a player already sees it |
|---|---|
| **Action Points** | A number beside the turn that goes down when you act |
| **The three phases** | Named on screen, and the app runs two of them |
| **Organ integrity** | Shown on the organ, and it drops in front of you |
| **The deck** | A count, and drawing is a button that says so |
| **Undo** | A button labelled Undo |
| **Movement and steps** | The destinations light up when a cell is selected |

### OUT for a different reason — already said by a hint that is IN

| Cut | Already carried by |
|---|---|
| **Coating is not killing** | Every coatable type's own hint says it: *"Coat it with a matching antibody, then engulf it"* names two steps. A separate hint would be the third statement of one idea |
| **Priming the Helper** | The Helper's own hint, which is where a player meets it |

### The honest problem with this set, and it is M1

**Nineteen subjects is not too many. Seventeen reachable in turn one is.** If every selection
fires a hint, a newcomer who taps four cells gets four hints before doing anything, which is the
narration Shantanu ruled against — and it is worse than narration, because they asked four
questions and got four answers, so nothing about it feels wrong until you count.

**The set cannot be cut past this without cutting the point.** Removing cells or invader types
removes exactly the things a player cannot work out by looking. So the proposal is a **pace**, not
a smaller set:

> **At most TWO new hints per turn.** A third subject contacted in the same turn is not consumed
> and not shown: it stays unseen and fires on its next contact, in a later turn.

On the measured first turn this yields **exactly two hints**, whatever the player taps. Across a
45-turn game all 19 are reachable with room to spare.

⚠️ **This is the piece of the proposal I am least sure of, and it is a ruling rather than a
detail.** The alternative is to move the trigger from *selecting* a thing to *acting* with it,
which prunes turn one to one or two naturally and needs no cap. It contradicts the direction as
written ("selecting a Neutrophil"), so I have not assumed it. It is worth a sentence either way.

---

## b. WHERE THE TEXT LIVES — a third answer

Shantanu offered two: the hint is a shorter form pinned to Help, or Help's first line is short
enough to serve as both. **M3 kills the second as a mechanical rule** — no truncation works for
8 of 18, or 4 of 18 if two sentences are allowed, and the failures are not fixable by a better
regex, because "Never moves." is a true first sentence and a useless hint.

The first is buildable, and I am proposing against it, for one reason: **a pin is a test that two
things still agree, and it only exists because they are two things.** This project has a rule
about that shape. Where agreement can be made structural instead, it should be.

### The proposal: the long form is COMPOSED FROM the hint

Each subject's single entry becomes two:

```
help.cell.neutrophil.hint   "NET: traps every living microbe on its own space."
help.cell.neutrophil.rest   "Then it is spent and returns after 4 turns, or 2 with a primed Helper."
```

- **The hint surface renders `hint`.**
- **Help renders `hint` followed by `rest`**, exactly as it renders the single entry today.

**There is one copy. The hint is not a shorter version of the Help text; it is the first part of
it.** Nothing can drift, because nothing is duplicated. No pin is needed and none is proposed,
which is better than a pin that passes.

### What still needs checking, and what cannot be

**Checkable, and proposed with controls:** every subject has both parts; no `hint` is empty; every
`hint` is within a length band; `rest` may be empty (some subjects need no more) but a subject
with `rest` and no `hint` is an error.

**Not checkable, and said so rather than dressed up:** whether a hint READS as a complete thought
on its own. "Never moves." would pass every check above. That is a person's judgement, and since
the text is Kartik's science being split, **the split points are his to correct.** I would bring
the 18 splits as a table, as with the fifteen box titles.

### The cost, stated

Splitting 18 entries touches text that is already written and already rendered. The Help screen's
output must be **identical before and after** the split, and I would hold that with a test that
composes and compares against the current strings, so the refactor is provably inert.

The two subjects with no existing text (antibody classes, the window) are new writing, and small.

---

## c. THE SURFACE

**A single line anchored inside the panel that is already open**, not floating over the board:

- selecting a cell opens the cell panel, so the hint sits under the selected cell's name;
- tapping an invader opens the inspect sheet, so the hint sits inside the sheet.

**This avoids a positioning problem rather than solving one.** A floating callout on a 360px
portrait screen has to be placed against board geometry, must not cover the thing it explains,
and has to be re-placed at 200% text. Anchoring it inside a panel that is already laid out and
already audited removes all of that.

Behaviour, per the direction: it does not interrupt, does not block play, and can be dismissed.
It does **not** auto-dismiss on a timer, because a player who glances away should not lose it.

### If two would fire at once

**One on screen, ever. The most recently contacted thing wins**, because the hint is an answer to
the tap that just happened, and an answer to a previous tap is the wrong answer.

**The displaced hint is NOT consumed.** It returns to unseen and fires on its next contact. This
is what keeps "once per thing, ever" true rather than "at most once".

The per-turn cap of two composes with this: the third contact in a turn shows nothing and stays
unseen.

---

## d. WHERE "SEEN" IS STORED — not in the settings object

**M4:** adding it to `Settings` would reset every player's text size, because the schema pins
`v: 1` and an unknown shape falls back to defaults.

**Proposed: its own `localStorage` key**, versioned independently, holding the set of seen
subject ids. Settings keeps its shape and nobody's preferences are touched.

The **Settings screen** gets one row, which is one entry in the rows table built at P2.5: *Show
first-time hints again*. It clears that key and nothing else, and its confirm says so — the
delete-saved-game confirm already sets that precedent by saying settings stay.

⚠️ Note for the ruling: this makes **three** things Settings can clear, held in three places (the
autosave in IndexedDB, the preferences in one key, the hints in another). That is three, not one,
and it is deliberate: they have different lifetimes and different failure modes. It is worth
knowing before it is agreed.

---

## e. What is being asked for

1. **The set of 19, and the cuts.** Especially whether the window and the antibody-class hints
   earn their place, since they are the two with no existing text.
2. **The pace, and the alternative.** Two new hints per turn, versus moving the trigger from
   selecting to acting. This is the one I am least sure of.
3. **The composed form for the text** — one entry split into `hint` and `rest`, no pin because
   nothing is duplicated. And whether the 18 split points go to Kartik as a table.
4. **The surface**: anchored in the open panel, one at a time, most recent wins, displaced hints
   not consumed.
5. **A separate storage key**, and the third thing Settings can clear.

Nothing is built. On a ruling, the build is: the content split with its inertness test, the store
and its controls, the hint component, the two new strings, the Settings row, and the audit
walking a hint shown, a hint dismissed, and the reset.
