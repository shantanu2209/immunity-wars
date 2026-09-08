# PROPOSAL 4 — the error boundary and the storage-failure notice (for ruling; nothing built)

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
