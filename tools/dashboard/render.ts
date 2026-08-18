/**
 * THE RENDERER — and every caveat it is not allowed to omit.
 *
 * Static HTML, inline CSS, inline SVG. No client JavaScript and no external requests: this is
 * opened on a phone, and it must render instantly.
 *
 * WHAT IS BUILT IN RATHER THAN APPENDED, and why each one:
 *
 *   1. THE RECONCILIATION SENTENCE, VERBATIM. Rendered from the manifest constant, never
 *      paraphrased. It is the most important thing a reader needs in order to interpret every
 *      green tick below it, and it is the sentence most likely to be softened by someone who
 *      mistakes it for criticism.
 *   2. THE PER-PUSH MEANING, GENERATED. Built from the manifest's own tier scales, so it cannot
 *      drift from what actually ran.
 *   3. SIZE FIGURES CARRY THEIR CENSORING ROW. A state-size number without "the bot died at turn
 *      8.6 of 45" is not a floor, it is an estimate — and it is not an estimate.
 *   4. A MISSING RESULT IS RED, NEVER OMITTED. A suite that silently stopped running must look
 *      worse than one that failed.
 *   5. NO TREND LINE BELOW THREE POINTS. One dot joined to nothing reads as a trend.
 *   6. THE WORST ROW SETS THE HEADLINE. Not the newest, not the last successful.
 *   7. STALENESS IS ALWAYS VISIBLE. Data with no age reads as current.
 *
 * Each has a control in `render.test.ts` that removes it and requires the check to fire.
 */

import { RECONCILIATION, type Manifest } from '@immunity-wars/manifest/schema';
import { perPushMeaning } from '@immunity-wars/ci/matrix';

import { qualifier, type Reported } from './reported.js';

export type SuiteStatus = 'pass' | 'fail' | 'missing';

export interface SuiteRow {
  readonly id: string;
  readonly title: string;
  readonly status: SuiteStatus;
  readonly detail: string;
  /** What this suite does NOT prove. Rendered with the row, never in a footnote. */
  readonly doesNotProve: string;
  readonly ranAt: string | null;
}

export interface SizeFigure {
  readonly label: string;
  readonly value: Reported<string>;
  /**
   * The censoring row, REQUIRED. Every state-size figure in this project is a floor because the
   * reference bot dies long before the game gets big, and a size number rendered without that fact
   * is a number a reader will take as typical. `docs/TASK_E_CLOSEOUT.md` opens with it for the
   * same reason.
   */
  readonly censoring: string;
}

export interface TrendPoint {
  readonly at: string;
  readonly value: number;
}

export interface Trend {
  readonly label: string;
  readonly points: readonly TrendPoint[];
  readonly qualifierLine: string;
}

export interface DashboardInput {
  readonly manifest: Manifest;
  readonly commit: string;
  readonly builtAt: string;
  readonly perPush: { readonly status: SuiteStatus; readonly at: string | null };
  readonly nightly: { readonly status: SuiteStatus; readonly at: string | null };
  readonly rows: readonly SuiteRow[];
  readonly coverage: Reported<string> | null;
  readonly sizes: readonly SizeFigure[];
  readonly trends: readonly Trend[];
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Hours since an ISO timestamp, or `null` when there is none. */
export function ageHours(at: string | null, now: Date): number | null {
  if (!at) return null;
  const t = Date.parse(at);
  if (Number.isNaN(t)) return null;
  return (now.getTime() - t) / 3_600_000;
}

/**
 * The headline is the WORST row, never the newest and never the last successful.
 *
 * A dashboard that shows the most recent green while an older red is still unfixed is not
 * reporting, it is reassuring.
 */
export function headlineStatus(rows: readonly SuiteRow[]): SuiteStatus {
  if (rows.some((r) => r.status === 'missing')) return 'missing';
  if (rows.some((r) => r.status === 'fail')) return 'fail';
  return 'pass';
}

/** A trend needs three points. Two joined by a line is a slope invented from noise. */
export const MIN_TREND_POINTS = 3;

export function renderTrend(trend: Trend): string {
  if (trend.points.length < MIN_TREND_POINTS) {
    return (
      `<div class="trend"><h3>${esc(trend.label)}</h3>` +
      `<p class="insufficient">Insufficient history — ${trend.points.length} point` +
      `${trend.points.length === 1 ? '' : 's'} recorded. A line needs at least ${MIN_TREND_POINTS}; ` +
      `fewer would draw a slope out of noise.</p>` +
      `<p class="qual">${esc(trend.qualifierLine)}</p></div>`
    );
  }
  const vals = trend.points.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const pts = trend.points
    .map((p, i) => {
      const x = (i / (trend.points.length - 1)) * 280 + 10;
      const y = 60 - ((p.value - lo) / span) * 50;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    `<div class="trend"><h3>${esc(trend.label)}</h3>` +
    `<svg viewBox="0 0 300 70" role="img" aria-label="${esc(trend.label)} over time">` +
    `<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/></svg>` +
    `<p class="range">${lo} … ${hi} over ${trend.points.length} runs</p>` +
    `<p class="qual">${esc(trend.qualifierLine)}</p></div>`
  );
}

function statusChip(s: SuiteStatus): string {
  const label = s === 'pass' ? 'PASS' : s === 'fail' ? 'FAIL' : 'NO RESULT';
  return `<span class="chip ${s}">${label}</span>`;
}

function renderRow(row: SuiteRow): string {
  // A missing result is rendered as a RED row, never omitted. A suite that silently stopped
  // running must look worse than one that failed, because failure at least tells you it ran.
  const detail =
    row.status === 'missing'
      ? 'No result was published for this suite. That is not a pass — it means the job did not ' +
        'run, or ran and produced nothing. Treat it as red until you know which.'
      : row.detail;
  return (
    `<tr class="${row.status}"><td>${statusChip(row.status)}</td>` +
    `<td><strong>${esc(row.title)}</strong><br/><span class="detail">${esc(detail)}</span>` +
    `<br/><span class="notprove"><em>Does not prove:</em> ${esc(row.doesNotProve)}</span></td>` +
    `<td class="when">${row.ranAt ? esc(row.ranAt) : '—'}</td></tr>`
  );
}

function renderSize(fig: SizeFigure): string {
  // The censoring row is rendered ADJACENT, in the same block. Not a footnote, not a tooltip:
  // a floor separated from the reason it is a floor becomes an estimate in the reader's head.
  return (
    `<div class="size"><h3>${esc(fig.label)}</h3>` +
    `<p class="figure">${esc(fig.value.value)}</p>` +
    `<p class="censor"><strong>This is a floor, not an estimate.</strong> ${esc(fig.censoring)}</p>` +
    `<p class="qual">${esc(qualifier(fig.value.provenance))}</p></div>`
  );
}

const STYLE = `
:root{--bg:#fff;--fg:#1a1a1a;--mut:#5a5a5a;--pass:#0a7a34;--fail:#b3261e;--miss:#8a5a00;--line:#e2e2e2}
@media(prefers-color-scheme:dark){:root{--bg:#141414;--fg:#ececec;--mut:#a8a8a8;--pass:#4ac97e;--fail:#ff6b5e;--miss:#e0a33a;--line:#333}}
*{box-sizing:border-box}body{margin:0;padding:1rem;background:var(--bg);color:var(--fg);
font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:52rem;margin-inline:auto}
h1{font-size:1.4rem;margin:0 0 .25rem}h2{font-size:1.05rem;margin:2rem 0 .5rem}h3{font-size:.95rem;margin:0 0 .35rem}
.sub{color:var(--mut);font-size:.85rem;margin:0 0 1rem}
.banner{border-left:4px solid;padding:.75rem 1rem;margin:1rem 0;background:rgba(127,127,127,.07)}
.banner.pass{border-color:var(--pass)}.banner.fail{border-color:var(--fail)}.banner.missing{border-color:var(--miss)}
.recon{border:2px solid var(--line);padding:1rem;margin:1rem 0;font-size:.95rem}
.recon strong{display:block;margin-bottom:.4rem}
table{width:100%;border-collapse:collapse;font-size:.9rem}
td{border-top:1px solid var(--line);padding:.6rem .4rem;vertical-align:top}
.chip{font-size:.7rem;font-weight:700;padding:.15rem .4rem;border-radius:3px;white-space:nowrap}
.chip.pass{background:var(--pass);color:#fff}.chip.fail{background:var(--fail);color:#fff}
.chip.missing{background:var(--miss);color:#fff}
.detail{color:var(--mut);font-size:.85rem}.notprove{color:var(--mut);font-size:.8rem}
.when{color:var(--mut);font-size:.78rem;white-space:nowrap}
.size,.trend{border:1px solid var(--line);padding:.75rem;margin:.5rem 0}
.figure{font-size:1.3rem;font-weight:600;margin:.2rem 0}
.censor{font-size:.8rem;margin:.3rem 0}.qual{color:var(--mut);font-size:.75rem;margin:.3rem 0 0}
.insufficient{font-size:.85rem;color:var(--mut)}.range{font-size:.8rem;color:var(--mut);margin:.2rem 0}
.stale{color:var(--miss);font-weight:600}
ul{padding-left:1.2rem;margin:.4rem 0}li{font-size:.85rem;margin:.2rem 0}
footer{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--mut);font-size:.78rem}
svg{width:100%;height:auto;color:var(--fg)}
`;

export function renderDashboard(input: DashboardInput, now: Date): string {
  const headline = headlineStatus(input.rows);
  const meaning = perPushMeaning(input.manifest);

  const nightlyAge = ageHours(input.nightly.at, now);
  // Staleness is always shown. Data with no age on it reads as current, and a dashboard whose
  // nightly job died three weeks ago looks exactly like one that ran an hour ago.
  const staleness =
    nightlyAge === null
      ? '<span class="stale">The nightly tier has never reported.</span>'
      : nightlyAge > 168
        ? `<span class="stale">The nightly tier last ran ${Math.floor(nightlyAge / 24)} days ago — treat everything from it as stale.</span>`
        : nightlyAge > 48
          ? `<span class="stale">The nightly tier last ran ${Math.floor(nightlyAge)} hours ago.</span>`
          : `The nightly tier ran ${Math.floor(nightlyAge)} hours ago.`;

  const rowsHtml = input.rows.map(renderRow).join('');
  const sizesHtml = input.sizes.map(renderSize).join('');
  const trendsHtml = input.trends.map(renderTrend).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>The Immunity Wars — build status</title>
<style>${STYLE}</style></head><body>
<h1>The Immunity Wars — build status</h1>
<p class="sub">main @ ${esc(input.commit)} · built ${esc(input.builtAt)}</p>

<div class="banner ${headline}">
  <strong>${headline === 'pass' ? 'Green' : headline === 'fail' ? 'RED' : 'INCOMPLETE'}</strong>
  — ${esc(meaning.headline)}
  <ul>${input.rows
    .filter((r) => r.status === 'pass')
    .map((r) => {
      const m = meaning.ran.find((x) => x.title === r.title);
      return m
        ? `<li>${esc(m.title)} — ${esc(m.scale)}${m.ofNightly ? ` <em>(of ${esc(m.ofNightly)} nightly)</em>` : ''}</li>`
        : `<li>${esc(r.title)}</li>`;
    })
    .join('')}</ul>
  <p>${esc(meaning.doesNotProve)}</p>
  <p>${staleness}</p>
</div>

<div class="recon">
  <strong>What is and is not proven here</strong>
  ${esc(RECONCILIATION)}
</div>

<h2>Suites</h2>
<table><tbody>${rowsHtml}</tbody></table>

${input.coverage ? `<h2>Coverage</h2><div class="size"><p class="figure">${esc(input.coverage.value)}</p><p class="qual">${esc(qualifier(input.coverage.provenance))}</p></div>` : ''}

${sizesHtml ? `<h2>Serialised state size</h2>${sizesHtml}` : ''}

${trendsHtml ? `<h2>Over time</h2>${trendsHtml}` : ''}

<footer>
  Every figure on this page is conditional on the generator named beside it. Nothing here measures
  difficulty: the reference bot plays about six of the game&rsquo;s fourteen seats and wins roughly
  0% on Normal, where the people who designed it win essentially every game.
</footer>
</body></html>`;
}
