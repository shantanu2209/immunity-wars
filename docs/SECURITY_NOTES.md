# Security notes

**Recorded 19 August 2026.** Why this repository's Dependabot page shows critical vulnerabilities,
and why we have accepted them rather than upgraded.

This is a public repository. Anyone can see the alert count, and a count is not a finding. This
document is the finding.

> **Updated later the same day, at P2.2 commit 1: the vitest trigger fired, deliberately early.**
> vitest moved `2 → 4.1.11` — not `2 → 3` as §"The trigger" anticipated, because 3.2.7 (the
> final 3.x) carries an unfixable run-level false-red of its own (`FINDINGS.md` #43, #44). The
> upgrade landed *before* any server exists, alone, so a runner break could be attributed to the
> runner. **`pnpm audit` now reports zero advisories and zero unmet peers.** The final one —
> esbuild ≤0.24.2, via `tools/legacy-harness`'s directly pinned esbuild for `build:single` — was
> cleared by ruling in its own commit: pin moved to ^0.28 (also what vite 8 wants as a peer),
> verified by rebuilding `build:single` and **playing** both output artifacts in a browser
> through a full turn, not by the build exiting zero. A `pnpm` override also pins transitive
> `nanoid >= 3.3.18` (GHSA-2v37-7h3g-55p8), which the lockfile's stale in-range resolution would
> otherwise keep vulnerable. The counts and tables below are the 19 Aug 2026 *morning* state,
> kept as the record this acceptance was argued from.

---

## Re-argued 4 September 2026: the structural sentence is FALSE, and the property survives on a different basis

**Why this section exists.** GitHub showed seven high alerts on `main` while `CLAUDE.md` said
`pnpm audit` was clean — a documented-but-false claim in the file every session reads first.
And the acceptance below rests on *"this repository never starts a long-running server"*, which
stopped being true at P2.2 commit 2: there is a Vite dev server (`pnpm --filter
@immunity-wars/app dev`), and since the S25 touch passes there is `vite preview --host`, which
serves the built app on the local network to a phone. Shantanu's ruling: the acceptance cannot
be *assumed* to still hold; re-argue it per advisory. This is that argument. **Nothing has been
upgraded on the strength of it; report first.**

### What listens now, and what it loads

Two things listen, both started deliberately by a developer, never by a player, never by CI:

| Process | When | Listens on | Serves |
|---|---|---|---|
| Vite dev server | `pnpm --filter @immunity-wars/app dev` | `localhost:5173` | the workspace's own source, transformed |
| Vite preview | `vite preview --host` for the phone check | the LAN, for the duration of the check | the built `dist/` — static files |

Both are **vite 8.2.1**, which has **no open advisory**, and vite's resolved dependency tree
contains **none** of the three packages below (checked with `pnpm ls vite --depth 6`). So the
structural fact that replaces the old sentence is:

> ### No open advisory is in a process that listens. Every open advisory is in a one-shot tool the maintainer runs on inputs the maintainer chose.

That is weaker than the old sentence and it is the true one. It has to be re-checked whenever
a listening process gains a dependency, or an advisory lands on vite itself — the automatic
answer the old sentence gave is gone.

### The seven alerts are five advisories

GitHub counts one alert per (advisory × manifest): `sharp` appears twice (its declaring
manifest and the lockfile), and four separate advisories name `fast-uri`.

#### HIGH — `sharp` <0.35.0, libvips CVEs inherited (crafted-image parsing)

[GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) · installed
**0.33.5** · devDependency of `tools/art-pipeline` only · patched in **0.35.0**

**Not reachable by anyone but the maintainer, on inputs the maintainer chose.** `pnpm
art:build` decodes the raw PNGs committed under the art pipeline — the assets Shantanu generated
in Google Flow, downloaded, judged and committed. The vulnerable code path is *decoding a crafted
image*; the images decoded are ours. One-shot; not in any server; not shipped (the app ships the
pipeline's WebP output, not `sharp`). **Cost of upgrading anyway:** a libvips change can move
WebP encoder bytes, and the pipeline's determinism is asserted byte-for-byte (`--verify`) —
so the bump means regenerating the outputs, re-running the contrast gate, and re-verifying,
not just bumping a version. Worth doing at a quiet moment; not a reason to stop.

#### HIGH ×4 — `fast-uri` <3.1.6, SSRF / host confusion in URI normalisation

[GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp),
[GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc),
[GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf),
[GHSA-5jgf-p345-68v8](https://github.com/advisories/GHSA-5jgf-p345-68v8) · installed
**3.1.5** · transitive, `dependency-cruiser → ajv → fast-uri` · patched in **3.1.6**

**Not reachable.** Every one of the four is a URI-normalisation flaw that matters when
*untrusted* URIs are normalised and then used to make requests. Here `fast-uri` is loaded by
`ajv` to resolve `$ref`s while validating dependency-cruiser's configuration
(`.dependency-cruiser.cjs`, ours) during `pnpm boundaries`. No network request is ever made
from that URI; the process exits. **Cost of fixing:** a one-line `pnpm.overrides` entry to
`>=3.1.6` — cheap, but the same caveat as before applies: an override outlives its reason.

#### HIGH — `extract-zip` ≤2.0.1, symlink path traversal on extraction — NO PATCH

[GHSA-jmr9-qjv8-65gv](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) · installed
**2.0.1** · transitive, `puppeteer-core → @puppeteer/browsers → extract-zip` · **no patched
version exists**

**Not reachable.** The vulnerable path runs when puppeteer *downloads and unpacks a browser*.
`tools/perf/measure.ts` uses `puppeteer-core` with `executablePath` pointing at the system
Chrome and never calls the install API; no archive is ever extracted. There is nothing to
upgrade to; the only removal would be dropping puppeteer, which is the perf instrument.

### Verdict

**The acceptance stands, on the restated basis above, for all five.** Fixes are not required
by it. Two are cheap and one is impossible; whether to take the cheap ones is a ruling, not a
consequence of this document. `CLAUDE.md` is corrected the same day to say what is true.

---

## The one thing to read

> ### Every advisory currently open requires a long-running server accepting requests. This repository never starts one.

That is a single structural fact and it settles all six at once. It is also the reason the
acceptance is not a per-advisory judgement that has to be re-argued each time a version moves —
the condition is about **what we run**, not about which release we are pinned to.

Every test command in this repository is one-shot and exits:

```
vitest run                                  the fast tier
vitest run --config vitest.coverage.config.ts --coverage
npx tsx tests/equivalence/full-corpus.ts    2,000 games, then exits
npx tsx tests/property/full-run.ts          10,002 games, then exits
```

No `--ui`. No `--watch`. No `--api`. No dev server, no preview server, no `esbuild --serve`.

**And nothing here ships.** The only third-party runtime dependency in anything installable is
**`zod`**, in `packages/content`. `packages/engine` depends on `content` and nothing else. Every
package named below is a devDependency — build and test tooling that no player ever executes.
(`tools/legacy` declares `qrcode` and `ws`, but it is deliberately excluded from the pnpm
workspace, so they are never installed.)

---

## Why GitHub says 12 and `pnpm audit` says 6

| | critical | high | moderate | total |
|---|---|---|---|---|
| GitHub Dependabot | 8 | 1 | 3 | **12** |
| `pnpm audit` | 1 | 2 | 3 | **6** |

**The critical gap is fully explained.** GitHub raises one alert per *(advisory × manifest)*.
Exactly **eight manifests** declare the affected package — seven declaring `vitest`, plus the root
declaring `@vitest/coverage-v8`:

```
package.json                    tests/manifest/package.json
tests/balance/package.json      tests/property/package.json
tests/equivalence/package.json  tools/ci/package.json
                                tools/dashboard/package.json
```

One advisory, eight alerts. `pnpm audit` deduplicates per advisory. **There are not eight critical
problems; there is one, counted eight times.**

**The high/moderate split — 1+3 against 2+3 — I could not reconcile without the alerts page, and I
have not invented a reason for it.** The likely cause is a difference in how the two sources
severity-rate the same transitive advisories, but that is a guess and is labelled as one. If it
matters later, the alerts page is the authority and this line should be replaced by what it says.

---

## The six, individually

### CRITICAL — `vitest` <3.2.6, arbitrary file read/execute when the UI server is listening

[GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp) · CWE-22, CWE-862 ·
installed **2.1.9** · **direct** dependency in 7 manifests

**Not reachable.** The advisory is explicitly conditioned on the Vitest UI server listening. That
requires `vitest --ui`, which requires the `@vitest/ui` package — **not declared anywhere in this
repository** — and the flag is never passed.

**Fix requires `>=3.2.6`. There is no 2.x backport.**

### HIGH — `vite` <=6.4.2, `server.fs.deny` bypass on Windows alternate paths

[GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) · installed **5.4.21** ·
transitive, via `vitest`

**Not reachable.** Requires the Vite dev server serving HTTP. `vitest run` uses Vite in middleware
mode for module transformation and does not listen on a port without `--api`.

### HIGH — `nanoid` <3.3.18, custom generators can loop indefinitely when size is zero

[GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) · installed **3.3.16** ·
transitive, via `vitest → vite → postcss`

**Not reachable.** Requires calling `nanoid` with `size: 0`; postcss calls it with the default size
for source-map identifiers. Denial of service only, in a process that already exits on its own.

This is the **only** advisory here fixable independently, via a `pnpm.overrides` entry. We have not
added one: it is a patch bump that changes nothing reachable, and an override is a permanent piece
of configuration that outlives the reason it was added.

### MODERATE — `esbuild` <=0.24.2, dev server responds to any website

[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) · installed **0.21.5**
(via `vite` 5) · transitive

**Not reachable.** Requires `esbuild --serve`. Never invoked. A second, already-patched esbuild
(**0.28.1**, via `tsx`) is also present; that one is not affected.

### MODERATE — `vite` <=6.4.1, path traversal in optimized-deps `.map` handling

[GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) · installed **5.4.21** ·
transitive

**Not reachable.** Dev-server HTTP path.

### MODERATE — `vite` <=6.4.2, launch-editor NTLMv2 hash disclosure via UNC paths on Windows

[GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3) · installed **5.4.21** ·
transitive

**Not reachable.** Requires the dev server's error overlay and its "open in editor" action.

---

## Why we did not simply upgrade

Five of the six are locked behind one upgrade:

```
vitest 2.1.9 → >=3.2.6        major, 2 → 3, across 7 manifests
  └─ brings vite 5 → 6        clears three of the four remaining
      └─ brings esbuild >=0.24.3
```

`vitest 2` requires `vite ^5`, and the vite fixes need `>=6.4.3`, so vite cannot move without
vitest. **There is no patch-level escape for any of them.**

Clearing the page therefore costs a **major test-framework upgrade underneath all 511 tests** —
including the equivalence corpus, which is this project's oracle for the Task B port. Buying a
green Dependabot badge with an unreviewed jump of that size is the same trade this project has
refused everywhere else: a number that looks better, bought with a check nobody made.

**So the upgrade is scheduled on its own merits rather than performed as a security response.**
[`ROADMAP.md`](../ROADMAP.md) records it after Task G, where the corpus and the full test suite are
the check that it landed correctly.

---

## ⚠️ What would change this conclusion

**The acceptance rests entirely on "we never start a server".** That is true today and Phase 2 is
quite likely to want one — a Vite dev server is the ordinary way to build a React UI.

> **TRIGGER: if anything in this repository starts a long-running server, this document is void
> and `vitest 3` becomes urgent rather than scheduled.**

Concretely, any of these ends the reasoning above:

- adding `@vitest/ui`, or passing `--ui` / `--api` / `--watch` to vitest;
- running a **Vite dev server or preview server** for the Phase 2 React work;
- `esbuild --serve`, or any other tool that listens on a port during development;
- publishing anything that executes these dependencies on a user's machine.

The first two are Phase 2 work and are more likely than not. **Whoever adds a dev server owns
re-reading this file**, and the honest expectation is that they will find it no longer applies.

Nothing here is a reason to avoid a dev server. It is a reason to upgrade vitest in the same change
that introduces one.

> ⚠️ **Sequenced 19 Aug 2026, at the close of P2.1. "Same change" means two commits, in this
> order:**
>
> 1. **`vitest 2 → 3`, alone.** Every suite green under it, every `pnpm ci:selftest` control still
>    behaving. **Nothing listens on a port yet, so the acceptance above still holds while this
>    lands** — the reasoning is repaired *before* it is needed rather than at the moment it
>    collapses.
> 2. **The dev server.** This is what pulls the trigger, and by then the runner is known good.
>
> **Why not one commit.** `vitest` is the instrument every suite in this repository runs on, so a
> break there is stop-the-line under the instrument-versus-product rule in
> [`CLAUDE.md`](../CLAUDE.md) — and bundling it with the first UI code means a red suite cannot be
> attributed to the runner or to the new code. Two commits cost nothing and make the bisect
> trivial. Plan: [`P2_2_PLAN.md`](P2_2_PLAN.md) §0.

---

## Repository settings

Secret scanning, push protection, Dependabot alerts and Dependabot security updates are enabled —
see [`CI_SETUP.md`](CI_SETUP.md) steps 2 and 3. Dependency update pull requests are grouped weekly
so a two-person project is not buried in them.

**This pipeline uses no repository secrets at all.** If a step ever appears to need one, that is a
design change to discuss, not a value to paste in.
