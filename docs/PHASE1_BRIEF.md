# The Immunity Wars — App Rebuild, Phase 1 Brief

**Version:** 1.3 · Drafted 4 August 2026 · Revised after code audit and Task A review
**Owner:** Shantanu (build & direction) / Kartik (design)
**Status:** Approved to start. Hand this document to Claude Code as the Phase 1 spec.

---

## 0. Orientation

We are rebuilding *The Immunity Wars* digital game as a proper application: a mobile-responsive
web app, packaged to Android and iOS via Capacitor from a single codebase.

The existing browser game works and is played. **Phase 1 does not change what the player sees.**
It replaces the foundations underneath, so that Phases 2–6 are cheap instead of painful.

### Locked decisions (do not relitigate in Phase 1)

| # | Decision | Rationale |
|---|---|---|
| 1 | Hybrid via **Capacitor**, not React Native | One codebase → web + Android + iOS. Web must stay first-class: schools open it without installing. |
| 2 | **No strangers, no matchmaking in v1** | Under-18 users + open comms = DPDP/COPPA scope, moderation burden, grooming risk. Private code-joined rooms only. |
| 3 | Eight extension **seams** so v2 is additive | Listed in §6. Interfaces now, one implementation each. No speculative machinery. |
| 4 | AI tutor **deferred**, tiered behind `HelpProvider` | Curated retrieval first (accurate, offline, free). On-device / cloud LLM later, optionally paid. |
| 5 | **Rewrite the render layer** (~1,000 lines) | Keeps engine, CSS design language, art, content tables. |
| 6 | **TypeScript** everywhere | Compiler-enforced single source of truth for rules. |
| 7 | **SVG geometry + raster illustration** | Geometry generated from existing coordinate tables. Illustrations stay as-is. Nobody has to draw. |
| 8 | **Public repo, Apache 2.0** | Nothing secret here; unblocks free GitHub Pages for the dashboard; better grant and sustainability story. |

### Still open (explicitly out of scope for Phase 1)

Hosting platform · relay vs LAN for private rooms · monetisation principle ·
grant telemetry approach · low-end device performance budget.

**Resolved 4 Aug:** the repository is **public**, code under **Apache 2.0**. Game content
(board art, cards, rulebook) is intended for **CC BY-SA 4.0**, pending a check that the terms
of the AI tool used to generate the art permit redistribution under that licence. Until that
check is done, do not publish artwork or declare a content licence.

None of these block Phase 1. Two of them (hosting, relay) are deliberately waiting on a
measurement produced *during* Phase 1 — see §5, Task E.

---

## 1. Phase 1 objective

> Stand up the repository, toolchain, test infrastructure and live results dashboard,
> and port the rules engine to TypeScript with full test coverage — **with zero new
> gameplay features and zero visual change.**

The point is to prove the pipeline before building on it. If CI, tests and the dashboard
are not trustworthy at the end of Phase 1, everything after it is guesswork.

### Non-goals

- No UI rewrite (Phase 2)
- No new server (Phase 3)
- No Capacitor packaging (Phase 4)
- No new game rules, balance changes or content — **no exceptions.** (v1.0 carved out the
  brain-branch correction; that change was already applied in July, so there is nothing left
  to except. §4 is now about measuring its unvalidated effect, not making a change.)

---

## 2. Repository layout

Monorepo, **pnpm workspaces + Turborepo**.

```
immunity-wars/
├─ packages/
│  ├─ engine/          # v2_engine.js → TypeScript. Pure, DOM-free, no I/O.
│  ├─ content/         # Content packs as validated data (see §3)
│  ├─ protocol/        # Shared client↔server message types + Zod schemas
│  ├─ ui/              # React components (EMPTY in Phase 1 — scaffold only)
│  ├─ app/             # Vite app shell (EMPTY in Phase 1 — scaffold only)
│  └─ server/          # Relay (EMPTY in Phase 1 — scaffold only)
├─ tools/
│  ├─ art-pipeline/    # Deterministic icon normalisation → WebP (Phase 2)
│  ├─ balance-sim/     # EMPTY. See the correction below
│  └─ legacy/          # Current .js/.html files, read-only reference during migration
├─ tests/
│  ├─ property/        # fast-check invariant tests
│  ├─ balance/         # The metric panel — NOT win-rate bands. See §4 and the correction below
│  └─ e2e/             # Playwright (Phase 2+)
└─ .github/workflows/
```

> ⚠️ **Corrected 12 Aug 2026, at Task E.** v1.3 described `tools/balance-sim/` as the "existing
> simulation harness, promoted to a test". **There is no such harness and never was**
> ([`FINDINGS.md`](FINDINGS.md) #6): the simulator is `simulate()` inside the engine, with its
> decision bot inlined in the same function body, and the directory has been empty since Task A.
> `simulate()` cannot be promoted, either — it returns seven aggregates, exposes no per-game
> figures, and extending it would be an engine change that breaks the B6 equivalence check.
>
> The harness is therefore **built at Task E, in `tests/balance/`**, driving the engine from
> outside through the `engine` parameter the property runner already uses. `tools/balance-sim/`
> stays empty.
>
> `tests/balance/` also does not hold "win-rate regression with tolerance bands". §4 already
> forbids gating on a win rate; what lives there is the metric panel.
>
> This would have been the tenth documented-but-false claim in this project had it been left
> standing. The response is the same as the other nine: make it true or make it accurate.

**Dependency rule, enforced in CI:** *content contains no logic, engine contains no data.*
`engine` → `content` is intended and unrestricted; `content` → anything is forbidden.
`engine` must never import `ui`, `app`, `server`, or any DOM/Node API.
`dependency-cruiser` fails the build on the import-graph half; `exports.test.ts` fails it on the
half a graph cannot see — a data table re-declared *inside* `engine` imports nothing.

> ⚠️ **Corrected 6 Aug 2026, at Task C1.** v1.3 said `engine` may import `content` **types only**,
> and that CI enforced it. **Neither was true.** No such rule existed in `.dependency-cruiser.cjs`
> — the claim was vacuously satisfied only because `engine` imported nothing from `content` at
> all — and the rule is unsatisfiable as written: §5 makes legacy's 67 exports the contract, and
> 22 of those 67 **are data tables**. An engine restricted to content's types would have to stop
> publishing `ORGANS`, `DECK_MASTER` and `TROPISM`, breaking the very surface Task B proved.
>
> This is the ninth documented-but-unenforced claim found in this project. The response each
> time is the same: make it true or make it accurate, never leave it standing.

---

## 3. Content extraction

A large share of what currently looks like UI code is actually **data**. It moves to
`packages/content/` unchanged in value, gaining a Zod schema and a version stamp.

Extract from `v2_ui.html`:

| Source | Lines | Becomes |
|---|---|---|
| `ORGAN_POS`, `CHIP_POS`, `BRANCH`, `ROUTE`, `ENTRY`, `HUB`, `VW`/`VH` | ~551 | `content/board/geometry.json` |
| `REGIONS`, `REGION_BOX`, `REGION_LABEL` | ~563 | `content/board/regions.json` |
| `FACT`, `DZINFO`, `S` → `DZSTATS` | — | `content/diseases/*.json` |
| `UM`, `UI_`, `RNAME`, `RGLYPH`, `ORGAN_ART` | — | `content/labels/*.json` |

Extract from `v2_engine.js`: `ORGANS`, `ORGAN_SETS`, `ROUTES`, `TROPISM`, `DIFF`,
`DECK_MASTER`, `FAMILIES`, `EVENTS`, `RARE` → `content/rules/*.json`.

⚠️ **Line numbers are indicative only — locate every table by NAME.** The v1.0 brief was written
against an older snapshot and its line references were wrong.

**Every pack carries `{ packId, packVersion, rulesVersion }` and is validated by Zod on load.**

**Why this matters:** `content/board/geometry.json` becomes the single source for the on-screen
SVG board *and* the printed A2 artwork. That structurally eliminates the class of drift
described in §4, rather than relying on someone remembering.

**All player-visible strings must be extracted to i18n message catalogues in this phase.**
Retrofitting is expensive and the Hindi edition is a committed grant milestone.
Use i18next with ICU message format — Hindi plural and gender rules need real ICU.

Because the UI is not rewritten until Phase 2, nothing running will consume these catalogues
yet, so they can silently drift from the legacy HTML they came from. **Add a test asserting the
catalogue still matches the legacy source strings.** Cheap insurance.

---

## 4. ⚠️ The balance baseline is unvalidated

**The v1.0 brief was wrong about this and the correction matters.**

v1.0 said the engine still had `brain: branch:4` and prescribed: port with 4 → measure baseline
→ change to 3 → measure the delta. **The engine already says `branch:3`** (`v2_engine.js:27`).
Shantanu applied the fix himself around 27 July, in both the physical board and the engine.

The real problem is the one that sequence was designed to prevent, and it has already happened
unmeasured. The Brain went from hardest-to-reach organ to as reachable as every other, and it
has only 2 integrity, so brain infections now land sooner. **There is no record that the balance
simulation was re-run after that change.**

Therefore:

- Training 79 / Normal 51 / Hard 19 are **historical figures describing a pre-27-July game.**
  They are not targets and must not be used as such.
- **Task E measures the current win rates.** That measurement establishes the baseline.
- CI tolerance bands are derived from the measurement, never from the historical numbers.
- If the measured numbers are poor game design, that is a design conversation with Shantanu and
  Kartik. **It is not resolved by tuning knobs until a familiar number appears.**

Report what you measure, including if it is uncomfortable.

### Stale builds

`index.html` and `spectator.html` predate the fix and still contain `branch:4`. Move them to
`tools/legacy/stale/` with a README. Do not delete them; do not build from them; do not cite
their behaviour as current.

## 5. Task order

**Task A — Scaffold.** pnpm workspaces, Turborepo, TypeScript strict mode, Vite, Vitest,
ESLint + Prettier, dependency-boundary enforcement. Empty packages compile and lint clean.

Also in Task A, because the repo is public from the first push:
- `LICENSE` — Apache License 2.0, full text
- `.gitignore` — Node/TypeScript (must cover `node_modules`, `dist`, `.env*`, `.turbo`, editor files)
- `LICENSES.md` — **stub only**: state Apache 2.0 for code, and mark the game-content licence
  as pending an assets-provenance check. Do not assert a licence over the artwork yet.
- `docs/ASSETS.md` — stub for recording which tool generated which asset, and when.

**Pin the toolchain in Task A.** Add a `packageManager` field (exact pnpm version), an `engines`
field (Node >=22), and an `.nvmrc`. CI must use the same versions. Without this, "works locally,
fails in CI" becomes a recurring tax that is tedious to diagnose later.

⚠️ **Public repo hygiene.** Never commit secrets, tokens, `.env` files, personal contact details,
photographs, or school/location information about either contributor. Enable GitHub secret
scanning and Dependabot. **Configure git identity per-repository with a GitHub no-reply email** —
commit metadata is permanent and routinely scraped.

**Task B — Engine port.** `v2_engine.js` → `packages/engine/`, TypeScript, `strict: true`.
Preserve behaviour exactly. The public API is the contract: **67 exports at `v2_engine.js:1767`**
(v1.0 said 39 — wrong; the surface is ~70% larger than budgeted, so plan for more sessions).
The 14 existing legacy test suites are an additional equivalence oracle — run them against the
ported engine where feasible.
Type the game state properly — `Record<OrganKey, OrganDef>`, discriminated unions on invader type.
Keep types boring: no clever generics, `unknown` at every trust boundary.

**Task C — Content extraction.** Per §3, with Zod schemas and a loader.

**Task D — Test suites.** Per §7.

**Task E — Measurements.** Two numbers that unblock deferred decisions:
- `JSON.stringify(viewState(g)).length` on a representative mid-game state.
  **This determines whether the server can keep broadcasting full state or must send deltas,
  and it drives the hosting choice.** Report it explicitly.
- Baseline balance win rates, for §4.

> ⚠️ **Corrected 12 Aug 2026, at Task E planning. The first bullet specifies the wrong
> measurement — one frame of a burst.**
>
> `endCommand` does not return a state. It returns a `Frame[]`, and **each frame carries a full
> `viewState(g)`** — `resolveSpread` has 20 `snap()` sites (`packages/engine/src/spread.ts`,
> returned at `actions.ts:170`). The frames exist so a UI can animate the spread step by step, so
> they are not obviously droppable.
>
> **The quantity the full-state-vs-deltas decision turns on is `frames.length × stateSize`**, not
> one state. Task E reports the brief's number exactly as specified *and* the frame burst, and the
> burst is the one the Phase 3 decision is made on.
>
> Two further departures from the bullet as written, both in [`TASK_E_PLAN.md`](TASK_E_PLAN.md):
> a single "representative" state is replaced by the full distribution with percentile ranks, and
> **every figure is a floor** — the reference bot dies at turn 8.8 of a 45-turn Hard game, so the
> corpus contains almost no late-game states, which is where the state is largest.
>
> The second bullet stands only in the sense §4 already narrows it: the baseline is the metric
> panel. A win rate is reported, never gated, and never without its generator.

**Task F — CI and dashboard.** Per §8.

**Task G — Single-file harness.** `vite-plugin-singlefile` to emit a self-contained HTML build,
preserving the double-click-to-play test loop that exists today. Non-negotiable — **double-click
to play, no server, no dev command, no toolchain.**

> ⚠️ **Corrected 19 Aug 2026, at Task G planning.** This said "it is how Shantanu tests on iPad".
> That was his own wording and it hardened a habit into a requirement. **Testing happens on the
> Windows PC** — two browser windows side by side, a developer console so a JS error is visible
> rather than presenting as "the button did nothing", the file already local, no `file://`
> restrictions, and a rebuild-retest loop of seconds. What the single-file requirement protects is
> the *no-toolchain double-click*, not the device. Mobile testing belongs in Phase 2, where there
> is a mobile UI worth testing. See [`TASK_G_PLAN.md`](TASK_G_PLAN.md) §1.

**Resolves an apparent contradiction in v1.0:** §2 keeps `packages/app` empty, yet §9 requires a
playable single-file build. Both hold, because the harness stitches the **new TypeScript engine**
into the **legacy `v2_ui.html`**. If that plays identically to today, the port is proven end-to-end
by a human at a keyboard, not only by automated diffs. `packages/app` stays empty; the harness is a
build tool, not an app.

---

## 6. The eight seams

Define the interface, implement exactly one implementation. **Do not build the v2 implementations.**

| # | Seam | Phase 1 implementation | Later |
|---|---|---|---|
| 1 | `Session` — `createGame`, `sendAction`, `onStateChange` | `LocalSession` (in-process) | `RelaySession`, `MatchmadeSession` |
| 2 | Room entry — code only | Typed code | Matchmaker supplies the code |
| 3 | `IdentityProvider` → opaque `PlayerRef`, no PII | Device-local generated | Account-backed |
| 4 | `CommsPolicy: 'free' \| 'phrases' \| 'off'` | `free` (private rooms only) | `phrases` for strangers |
| 5 | `HelpProvider.ask()` | Local retrieval over curated corpus | On-device Gemma / cloud |
| 6 | `Entitlements` object | Hardcoded | Fetched |
| 7 | Content packs + `rulesVersion` on every state and message | Bundled packs | Downloadable packs |

> **Seam 7, note added at Task C2 — the pack version check is DEFERRED, not forgotten.**
>
> `packages/content/src/schema.ts` validates the pack stamp `{ packId, packVersion, rulesVersion }`
> for **shape only**. It deliberately does **not** check `rulesVersion` against an expected value.
>
> The bundled pack ships in the same commit as the engine that reads it, so such a check would
> compare a constant against a constant — a guard against a state this repository cannot produce,
> which is exactly the pattern [`FINDINGS.md`](FINDINGS.md) #22 names and #21 and #13 are
> instances of. Adding one during the schema work that exists to *find* that pattern would have
> been perverse, and it would have been an untestable branch arm besides.
>
> **Whoever builds the downloadable-pack loader owns this check.** That is the first point at
> which a pack can genuinely disagree with the engine reading it — a pack fetched at runtime, a
> cached pack from an older app version, a pack authored against different rules. At that point
> the check is real, testable, and necessary. Until then it is theatre.
>
> The same reasoning applies to any other "does the pack match the app" validation: it belongs
> where the two can actually differ.
| 8 | `Storage` and `Telemetry` ports | IndexedDB; telemetry no-op with real call sites | Cloud sync; anonymous aggregate |

**Seam 1 is load-bearing: single-player must go through it too.** One code path, not a fork.
This is what makes multiplayer additive later instead of a rewrite.

---

## 7. Test suites

| Suite | Tool | What it proves |
|---|---|---|
| Unit | Vitest | Each engine rule in isolation |
| **Property / invariant** | **fast-check** | Thousands of random *legal* games; invariants never break |
| Balance regression | Existing sim, promoted | Bands derived from the Task E measurement — see §4. **Do not copy historical figures into a build gate.** |
| Negative | Vitest | Illegal actions rejected, malformed input, out-of-turn, duplicate messages |
| Schema | Zod | Every content pack validates; bad packs fail loudly |
| Boundary | dependency-cruiser | Engine imports no DOM/Node/UI |
| Serialisation | Vitest | Every reachable state round-trips identically |

**Invariants for the property suite** (start here, extend as found):
- AP is never negative
- No invader occupies two locations
- Antibodies never exceed the per-family cap
- Cells are never both dead and acting
- Every state reached by legal actions serialises and reloads identically
- Turn number never decreases
- Killing the last invader of a disease always records memory, exactly once

**The property suite is the upgrade the project does not currently have.** It catches rule
bugs no hand-written test will, and a rules engine is exactly the right shape for it.

Retire in Phase 1: `parity_check.js` (obsolete once there is one build).
Keep as reference until Phase 3: `e2e_server_test.js`.

---

## 8. CI and the results dashboard

GitHub Actions on every push and PR:

1. Install → typecheck → lint → dependency-boundary check
2. Unit + property + negative + schema + serialisation suites
3. Balance regression (nightly, or on `engine`/`content` changes — it is slow)
4. Build all targets, including the single-file harness
5. Publish HTML report to **GitHub Pages**

The repo is public, so Pages is available on the free plan. No blocker.

**The dashboard is a requirement, not a nicety.** It must show, at a stable URL:
current pass/fail per suite, coverage, the balance win-rate trend over time, and
serialised state size over time.

Merges blocked on red. Balance drift outside tolerance fails the build.

---

## 9. Definition of done

- [ ] Monorepo builds clean; TypeScript `strict: true`; zero `any` in `engine`
- [ ] Engine ported; all existing behaviour preserved; public API unchanged
- [ ] Content extracted, Zod-validated, `rulesVersion` stamped
- [ ] All player-visible strings in i18n catalogues
- [ ] Seven test suites green; property suite runs ≥10,000 games without invariant violation
- [ ] CI green; dashboard live at a public URL
- [ ] Single-file harness (new engine + legacy UI) plays identically to today, opened by
      double-clicking on Shantanu's Windows PC — no server, no toolchain
- [ ] **Reported:** serialised state size, and the current balance baseline (post-brain-fix)
- [ ] Eight seam interfaces defined, one implementation each
- [ ] Legacy files retained read-only under `tools/legacy/`

---

## 10. Working notes for Claude Code

- **Simulate before building.** Standalone models validated before production code touches anything.
- **One strong idea at a time.** Discuss significant changes before rewriting.
- **Scientific accuracy is a hard constraint.** No mechanic ships that Kartik cannot defend to a scientist.
- **Behaviour preservation is testable, so test it.** Where feasible, run old and new engines on
  identical action sequences and diff the resulting states. Do not assert equivalence — demonstrate it.
- **Flag uncertainty honestly.** A surprising measurement is a finding, not something to smooth over.
- **Ship runnable output** to a path Shantanu can open on his own device; the in-chat viewer is flaky.

---

*Phase 2 preview: UI rewrite in React, SVG board generated from `content/board/geometry.json`,
art pipeline, WebView performance spike on low-end Android. The spike decides whether
Capacitor holds or React Native becomes necessary — it is the one measurement that could
reopen a locked decision.*
