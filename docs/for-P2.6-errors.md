# PROPOSAL 4 — the error boundary and the storage-failure notice

> ✅ **ALL FIVE RULED, 8 September 2026, and BUILT.** The proposal is left exactly as it was
> written, unedited, so that what was proposed can still be read against what was decided. The
> rulings, and the leanings that preceded them, are at the end of this document.

**8 September 2026.** Shantanu asked for one thing to be designed rather than discovered: **what
the error boundary does with a game in progress.** That question turns out to have a clean
answer, and asking it surfaced a second one that does not, so both are here.

Nothing is built. There is **no error boundary in the app today** — no `componentDidCatch`, no
`getDerivedStateFromError`, no `window.onerror` handler, anywhere in `packages/app` or
`packages/ui`. A render error today is a white screen with the game still in memory and no way
back to it.

---

## 1. What is already true, measured from the code rather than assumed

This is the part that decides the design, so it is stated first.

**The autosave is written by the session on every accepted action, and awaited**
(`packages/session/src/local.ts:198`, and again after an undo at `:266`). The write is ordered
before `sendAction` resolves. The UI never writes it and cannot: it never sees `GameState`.

**So a crash cannot lose a turn.** At worst it loses the action being applied when the process
died, and only if the storage write had not committed. Everything before that is on disk. This
matters because it means **"offer to continue" is the honest answer in almost every case**, and
the screen does not have to hedge.

**What is NOT saved is presentation only:** the current selection, a queued dialog, and the
position within a spread burst. A resumed game starts at the top of the phase it was in, with
nothing selected. A player loses their place in a sentence, not their turn.

**One case does lose the game, and it is invisible today.** `save()` failures are swallowed
(`.catch(() => undefined)`), deliberately and correctly: a device whose storage does not work
degrades to no-save rather than to an unplayable game. But **nothing tells the player**, so a
game that has silently not been saved for forty turns looks exactly like one that has. That is
the storage-failure notice's job, and it is section 3.

---

## 2. THE ERROR BOUNDARY — proposed, and the two decisions inside it

### 2.1 What it catches, stated so the gaps are visible rather than discovered

A React error boundary catches errors thrown during **render, in lifecycle methods, and in
constructors of the tree below it**. It does **not** catch: errors in event handlers, errors in
`setTimeout` or promise callbacks, or errors during server rendering (not applicable here).

**Proposed: one boundary at the app root, plus two window-level listeners** (`error` and
`unhandledrejection`) that route into the same screen. Without the listeners, the most likely
real crash — something throwing inside an action handler or inside the burst timer — would not
be caught at all, and the boundary would look like it was working because it had never fired.

⚠️ **A boundary that has never fired is not known to work**, so this gets the usual treatment:
a deliberate throw behind a dev-only control, and the audit walking the resulting screen.

### 2.2 Decision one: it RELOADS. It does not try to resume in place.

**Proposed: the boundary never attempts to keep the current React tree alive.** Continue means
reload the page and resume from the autosave.

The reasoning, and it is the whole of the answer to Shantanu's question:

- A tree that threw during render is in an **undefined** state. The session object may be
  mid-`sendAction`, the burst timer may still be scheduled, the view may be half-applied.
- The autosave is **current**, by section 1. So a reload has a **defined** starting state that
  is at most one action behind.
- Choosing "recover in place" trades a defined state for an undefined one to save a reload of a
  page that precaches its whole build. It buys about a second and costs the only guarantee in
  the situation.

### 2.3 Decision two: it NEVER WRITES. This is the safety property.

**Proposed, and this is the part most worth ruling on explicitly: the error boundary must not
write to storage, ever, under any button.** Not to save the current game, not to clear a
corrupt one, not to "reset" anything.

A crashed render is precisely the state in which the in-memory game is least trustworthy, and
the autosave is precisely the thing that is still good. **The failure this rules out is a crash
screen that helpfully saves, and overwrites forty good turns with whatever was in memory when
the tree threw.** Reading the save to report it is fine; writing is not.

### 2.4 What the screen says, given that it knows which case it is in

It reads the autosave (a read, per 2.3) and tells the player the truth for their case:

| Case | What it says | Buttons |
|---|---|---|
| A save exists, and a game was in progress | Something went wrong. Your game is saved. You will start again at the beginning of turn N. | **Continue your game** (reload, resume) · Back to the title |
| A save exists, but the crash was outside play (Title, Help, library) | Something went wrong. Your saved game is safe. | Back to the title (reload) |
| No save at all | Something went wrong. There was no game in progress. | Back to the title (reload) |
| A save exists but **failed to load** | Something went wrong, and the saved game could not be read. | Start a new game · Back to the title. **No delete button** (2.3) |

**Four points on the wording, for ruling:**

1. **It names the turn** in case A, because "your game is saved" is a claim and a number is
   evidence a player can check when they land back in the game.
2. **It does not apologise twice** and does not use the word "crash". "Something went wrong" is
   what it is.
3. **It does not show the error text by default.** There is nowhere to send it (no network, no
   form, by design), so an exception message on screen is noise to a 13-year-old and to a
   teacher. ⚠️ **Open for ruling:** a collapsed "technical details" line is one small control,
   and it is the difference between a useful and a useless bug report over WhatsApp. My lean is
   **include it, collapsed**, because the alternative when something does go wrong is a player
   describing a white screen.
4. **No dashes**, and every line through the catalogue, as everywhere else.

### 2.5 Where it sits in the flow

`APP_FLOW.md` §1's taxonomy has screens, sheets, dialogs and overlays. **The crash screen is a
SCREEN**, not a dialog: a dialog implies the thing underneath is still there and can be returned
to, and the whole premise here is that it cannot. It replaces everything, and both its exits
reload.

It is reached from nowhere and returns to the Title, so it does not enter the Title's slot list
and does not appear in the back-ordering rule.

---

## 3. THE STORAGE-FAILURE NOTICE — the same question, and it needs a seam decision

This is the one that cannot be settled without a ruling, because **the information does not
currently exist anywhere the UI can see it.**

`save()` failures are swallowed inside the session. The UI is told nothing, and by design the UI
never sees `GameState`, so it cannot check for itself. To tell a player their game is not being
saved, **the session has to say so**, and that is a change to seam 1's surface.

**Three ways, and I have a lean rather than a preference:**

| | Shape | Cost |
|---|---|---|
| **A** | A fourth field on `ViewState`, e.g. `saveHealth: 'ok' \| 'failing'` | Changes the view's shape, which Phase 3 broadcasts. Cheap to read, always current |
| **B** | A third arm on the subscribe union: `{kind: 'notice', notice}` beside `view` and `burst` | The union already exists for exactly this reason, and a notice is not a view. But the UI must hold the state itself |
| **C** | `ActionOutcome` gains `{ok: true, saved: false}` | Closest to the failure, and the UI would have to notice it on every action |

**Lean: B.** The discriminated union was built because one callback could not express two kinds
of thing; a third kind is what it is for. It also keeps `ViewState` unchanged, which matters
because §3 of the brief makes `viewState` the unit of synchronisation in Phase 3, and a health
flag is about **this device** rather than about the game.

**What the notice would say and how it behaves, proposed:** shown once per session, not on every
action; non-blocking, dismissable; "This game cannot be saved on this device. You can keep
playing, but the game will not be here if you close it." Then the Title's Continue does not
appear, which is already what happens and is now explained rather than mysterious.

⚠️ **The honest caveat, stated because it will otherwise be discovered:** this notice can only
fire once a save has already failed, which means the first failure is always silent. A device
with broken storage is detectable earlier by writing and reading back a probe at startup, and
that is a real extra piece of work. **Not proposed here.** Flagged so the ruling is made knowing
the notice is a late warning rather than a guarantee.

---

## 4. What is being asked for

1. **The boundary reloads rather than recovering in place** (2.2). This is the answer to the
   question asked, and it rests on the autosave being current, which is measured.
2. **The boundary never writes to storage** (2.3). The one line I would most like ruled
   explicitly, because it is the difference between a crash screen and a data-loss event.
3. **The four cases and their wording** (2.4), and specifically whether the collapsed technical
   details line is in. Lean: in.
4. **Which seam carries the save-failure signal** (3). Lean: a third arm on the subscribe union.
5. **Whether the early storage probe is in scope.** Lean: no, and say so in the closeout.

Once ruled, the build is: the boundary and its screen, the two window listeners, the dev-only
throw and its control, the catalogue entries, the audit walking all four cases, and, separately,
the session change and the notice.

---

# The leanings, and then the rulings — kept apart on purpose

Shantanu asked for the record to show which was which
(*"record the leanings as leanings and the rulings as rulings, so the record shows which was
which"*). This project's briefs do the same thing wherever a decision had a preceding opinion:
a lean that turned out right and a lean that was overruled look identical afterwards unless
somebody wrote down that it was a lean.

## What was LEANED, before any ruling

**Mine, in the proposal above**, offered as leanings and marked as such at the time:

| # | The lean | What happened |
|---|---|---|
| 3 | **Include the technical details line, collapsed** | Ruled in, and on a better reason than mine |
| 4 | **The third shape: a new arm on the subscribe union** | Ruled in, on the reasoning given |
| 5 | **Do not build the startup storage probe** | Ruled, with a condition mine did not carry |

**Shantanu's, given as leanings before he had read all five** (8 September 2026, stated in those
words: *"which you can take as leaning rather than ruling until I have the whole set"*): reload
rather than recover, never write from the crash screen, and that the save-failure signal is the
one that matters structurally. All three later became rulings unchanged. **They are recorded as
leanings anyway**, because that is what they were when they were said, and a record that
promotes them retroactively teaches that leanings are just early rulings.

## What was RULED, 8 September 2026

All five, after the full set was sent.

### 1. Reload rather than recover in place — RULED

> A tree that threw is undefined and the save is current. Reloading is the honest recovery, and
> pretending otherwise is how a crash becomes a corruption.

Built: every exit from `CrashScreen` is `location.reload()`.

### 2. Never write to storage from the crash screen — RULED

> A crash handler that helpfully saves would overwrite good turns with whatever was in memory
> when things went wrong. That is helpfulness that reads as care and does damage.

Built, and **enforced by shape rather than by comment**: `CrashScreen` takes no storage handle,
no session and no save callback, so there is nothing under it that could write. `AppRoot` reads
the save and passes the answer down. No delete button in the unreadable case either.

### 3. The four cases as worded, and the technical details line is IN, collapsed — RULED

The deciding reason was **not** the one in my lean, and it is worth the difference being visible:

> This game has been presented at a showcase and will be in classrooms, and the only bug channel
> is a person telling us. A collapsed line they can read out is the difference between "it broke"
> and something actionable.

Mine reached the same place from "a player describing a white screen". His names *why* that is
the failure mode that matters here: there is no other channel and there will be strangers using
this.

Naming the turn in case A confirmed for the reason given: a claim that a game is saved is a
claim, and a number is evidence the player can check when they land back in it.

### 4. The seam: a new arm on the subscribe union — RULED

> Save health is a fact about THIS DEVICE, not about the game. The view is what crosses the
> network in Phase 3, so a device-local fact does not belong in it, and the union exists
> precisely because one callback could not express two kinds of thing. One boolean held by the UI
> is a fair price.

Built: `SessionEvent` gains `{kind: 'notice', notice: 'save-failed'}`. `ViewState` is untouched.

### 5. The probe: do not build it — RULED, with a condition

> Record the caveat exactly as you framed it. The notice is a late warning rather than a
> guarantee, the first failure is always silent, and a device with broken storage is rare enough
> that the probe is real work for a rare case. **What matters is that the notice does not IMPLY a
> guarantee it cannot make, so check its wording against that.**

The condition is the part that changed the build. **The guarantee the notice cannot make is
"your game was saved up to now"** — it fires on the first failure the session sees, and a store
that never worked and a store that broke midway produce it identically. So the wording says only
what is true in both cases: *this game cannot be saved on this device*, present tense, plus the
consequence the player can act on. It does not say "from now on", "so far", or "your progress is
saved", each of which would imply the guarantee. `SaveFailedNotice.tsx` carries that reasoning,
and the catalogue script that added the strings **fails the build on those phrases** rather than
leaving it to a reading.

### 6. One piece, not two — RULED

> The session change and the notice land together as one piece.

Correct, and for a reason worth keeping: **a notice has nothing to notice until the signal
exists.** Shipping the notice first would have been a component nothing could ever render.
