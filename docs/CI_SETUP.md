# Repository settings, in the order to do them

Everything in `.github/` is code and is already committed. These seven cannot be set from a file —
they are GitHub UI settings, and only the repository owner can change them.

**The order matters.** Each step depends on the one before, and **branch protection goes last**,
because a required check that has never run cannot be selected in the UI, and naming a check that
never arrives blocks every merge including the one that would fix it.

Throughout: `https://github.com/shantanu2209/immunity-wars` → **Settings**.

---

## 1. Actions permissions — make the default read-only

**Settings → Actions → General → Workflow permissions**

- Select **Read repository contents and packages permissions**.
- **Uncheck** "Allow GitHub Actions to create and approve pull requests".

Do this first, before any workflow runs. Both workflows declare `permissions: contents: read` at
the top and elevate per-job, so this changes nothing about how they behave — it means a *future*
workflow added without a `permissions:` block starts read-only instead of with write access to the
whole repository.

---

## 2. Secret scanning and push protection

**Settings → Code security → Secret protection**

- Enable **Secret scanning**.
- Enable **Push protection** (blocks a commit containing a recognised credential *before* it
  lands, rather than alerting after).

`.github/dependabot.yml` has always noted this half is manual. There are no secrets in this
repository and the pipeline needs none — this is insurance against a future mistake, and push
protection is the half that prevents rather than reports.

---

## 3. Dependabot alerts

**Settings → Code security → Dependabot**

- Enable **Dependabot alerts**.
- Enable **Dependabot security updates**.

The version-update config is already committed (grouped weekly for npm, monthly for actions, so a
two-person project is not buried in single-dependency pull requests).

---

## 4. Pages — set the source to Actions

**Settings → Pages → Build and deployment → Source: GitHub Actions**

Not "Deploy from a branch". The nightly workflow uploads the site as an artifact and deploys it
with `actions/deploy-pages`; with the branch source selected, the deploy step fails with a
permissions error that reads as though the token is wrong.

The repository is public, so Pages is available on the free plan.

---

## 5. Run the nightly once, by hand

**Actions → Nightly → Run workflow**

This is a step, not a check. It:

- creates the orphan `results-data` branch (the first run has nothing to fetch, and the workflow
  handles that — but it is better to see it happen than to discover it at 02:00),
- produces the first history record,
- publishes the dashboard, so there is a URL before anything depends on one.

**Expect the trends to say "Insufficient history — 1 point recorded."** That is correct and
deliberate: a line needs three points, and one dot joined to nothing reads as a trend.

The URL will be `https://shantanu2209.github.io/immunity-wars/`.

---

## 6. Push a branch and open a pull request, to make the checks appear

Branch protection can only require checks GitHub has seen. Push any branch and open a pull request
against `main` — a README typo is enough — and let CI finish.

You should see: `plan`, `static`, `suites (test)`, `suites (test-balance)`, `coverage`, `ci-green`.

**Read the wall-clock time of each job and tell me.** The per-push tier is budgeted under five
minutes and that budget is projected from a 20-core machine, not measured on a 4-core runner.
`coverage` is the one at risk. If it is consistently over, it moves to nightly — and that fact goes
on the dashboard, not into a document.

---

## 7. Branch protection — LAST

**Settings → Branches → Add branch ruleset** (or Add rule) for `main`:

- **Require a pull request before merging** — 1 approval, or 0 if you would rather merge your own
  after review; the check requirement is what matters here.
- **Require status checks to pass before merging**, and select **`ci-green` and nothing else.**
- **Require branches to be up to date before merging.**
- Leave "Include administrators" **off** for now: if a workflow bug ever blocks every merge, you
  need a way in.

### Why only `ci-green`

Every other job feeds it, and it fails when any expected job failed, was cancelled, was **skipped**,
or never reported at all. Selecting the individual jobs instead would look more thorough and be
weaker: GitHub treats a skipped required check as satisfied, so a path filter or a cancelled run
would turn the merge button green having verified nothing.

That specific trap — a green build because a needed job was skipped — is why the decision lives in
`tools/ci/aggregate.ts` rather than in a YAML expression, and why `aggregate.test.ts` hands it a
skipped job and requires exit 1.

---

## Afterwards

Optional and quick:

- **README badge** — `![CI](https://github.com/shantanu2209/immunity-wars/actions/workflows/ci.yml/badge.svg)`
- **Watch → Custom → Actions** if you want an email when the nightly fails. GitHub already emails
  the scheduled workflow's actor on failure, so this is only if you want it elsewhere too.

Nothing here needs a repository secret. If a future step appears to, that is a design change worth
discussing rather than a value to paste in — this repository is public and its logs are public.
