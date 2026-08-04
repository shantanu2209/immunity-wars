# ⚠️ STALE BUILDS — DO NOT USE

The two HTML files in this directory are **obsolete builds that contradict the current
game rules.** They are kept for historical reference only.

**Never build from them. Never cite their behaviour as current. Never copy rules out of them.**

---

## What is wrong with them

Both files were built on **20 July 2026**. On **~27 July 2026** the Brain organ's branch
length was shortened from **4 steps to 3**, in both the physical A2 board and the rules
engine. These builds predate that change and still contain:

```js
brain: { name:"Brain", kind:"vital", integrity:2, branch:4, ... }
```

The current rule is `branch:3`.

## Why that matters — it is not cosmetic

Branch length sets how many turns the defenders have before an invader travelling down a
branch reaches the organ. It is a difficulty lever, not decoration.

At `branch:4` the Brain was the hardest organ in the body to reach. At `branch:3` it is as
reachable as every other organ — and the Brain has only **2 integrity**, the lowest on the
board. So brain infections now land sooner *and* the Brain tolerates less damage than
anything else. These builds therefore play a measurably easier game than the real one.

Anyone reading these files to answer "how does the game work?" will get the wrong answer.

---

## Provenance

| File | Built | Brain branch | Status |
|---|---|---|---|
| `index.html` | 20 Jul 2026 | `4` ❌ | Superseded by `tools/legacy/public/index.html` |
| `spectator.html` | 20 Jul 2026 | `4` ❌ | No current equivalent |

For comparison, everything current says `branch:3`:

| File | Modified | Brain branch |
|---|---|---|
| `tools/legacy/v2_engine.js` | 27 Jul 2026 | `3` ✅ authoritative rules source |
| `tools/legacy/v2_ui.html` | 27 Jul 2026 | `3` ✅ (three brain coordinates) |
| `tools/legacy/public/index.html` | 4 Aug 2026 | `3` ✅ current LAN build |
| `tools/legacy/public/solo.html` | 4 Aug 2026 | `3` ✅ |
| `tools/legacy/immunity-wars-v2.html` | 4 Aug 2026 | `3` ✅ delivered playable build |
| `tools/legacy/ImmunityWars-SinglePlayer.html` | 4 Aug 2026 | `3` ✅ |

## Where to look instead

- **The rules:** `tools/legacy/v2_engine.js` — the authoritative source. During Phase 1 this
  is being ported to `packages/engine/`, which then becomes authoritative.
- **A playable build:** `tools/legacy/immunity-wars-v2.html` — open it directly in a browser.
- **The LAN client:** `tools/legacy/public/index.html`.

---

## Why they are kept rather than deleted

Two reasons.

First, they are the only surviving artefact of the pre-27-July game. The balance simulation
was never re-run after the Brain change, so the historical win rates (Training 79 / Normal 51
/ Hard 19) describe the game *these files* implement, not the game we have now. If we ever
need to reproduce those numbers to understand the delta, this is the only record of what was
actually measured.

Second, deleting evidence of a drift is how the same drift happens again.

See `docs/PHASE1_BRIEF.md` §4 and the "Known issues" section of `CLAUDE.md`.
