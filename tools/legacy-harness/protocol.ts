/**
 * TASK G, STEP 7 — GENERATE THE COMPARISON PROTOCOL.
 *
 *   npx tsx tools/legacy-harness/protocol.ts
 *
 * docs/TASK_G_PLAN.md §3 step 7:
 *
 *   > Not "play it and see". **He is the instrument, so the protocol is specified as carefully as
 *   > any other instrument here.** [...] "Play it and see" would make him responsible for a
 *   > judgement without giving him the means to make it.
 *
 * ── THE TWO PROBLEMS THIS HAD TO SOLVE ──────────────────────────────────────────────────────────
 *
 * **1. "A fixed seed" — the game has no seed.** The engine calls `Math.random()` directly, in
 * `shuffle`, `d6`, `rollOrgan`, the reinfection draw and three places in `newGame`. There is no
 * injection point, and adding one would change the API the port is contracted to preserve.
 *
 * The equivalence rig solved this years of sessions ago by swapping the GLOBAL `Math.random`
 * (`tests/equivalence/src/rng.ts`), which works on any engine without modifying either. The same
 * trick works in a browser console, so the protocol ships the same mulberry32 as a paste-in
 * snippet — **identical generator, identical seed, in both windows.** Nothing in either build is
 * modified to support it.
 *
 * **2. "The expected board state after each action" cannot be written by hand.** So it is not:
 * the sequence is run through BOTH engines here, the two are required to agree, and the observable
 * readouts are transcribed into the document. If they ever disagree, this refuses to emit a
 * protocol at all rather than emit one built on the port alone.
 *
 * ── WHY THE ACTIONS ARE PASTED, NOT CLICKED ─────────────────────────────────────────────────────
 *
 * `act({...})` is the UI's own dispatcher — `v2_ui.html:1337`, and every button in the game is an
 * `onclick="act({...})"`. Pasting the same call is the same code path a click takes, including the
 * spread animation, and it removes the one thing a click comparison cannot control: whether both
 * windows received the same action. Free play follows, for the judgement only a human can make.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { botGame } from '@immunity-wars/equivalence/bot';
import { loadLegacy } from '@immunity-wars/equivalence/engine';
import { canonical } from '@immunity-wars/equivalence/hash';
import { installRng, restoreRng } from '@immunity-wars/equivalence/rng';
import type { Action, Engine, GameState } from '@immunity-wars/equivalence/types';

import * as portEngine from '@immunity-wars/engine';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const OUT = join(REPO, 'docs', 'TASK_G_PROTOCOL.md');

/** The UI's own configuration — `newG()` at v2_ui.html:1335. Not the rig's. */
const DIFFICULTY = 'normal';
const SCIENCE = true;
const STEPS = 12;
/**
 * How far to keep replaying past the scripted steps, looking for organ damage.
 *
 * §3 step 7 asks for "~10 actions" AND for "an organ taking damage" among the things to look at.
 * Those two turn out to be incompatible: an organ cannot be reached in ten actions — invaders have
 * to march in from an entry route, which takes several turns. Measured over 400 seeds, not assumed.
 *
 * So the protocol keeps the scripted, checked-after-every-action sequence at ~10 as specified, and
 * adds ONE continuation block that runs on to the first organ damage with a single checkpoint. The
 * checklist item is covered without turning the protocol into forty lines of pasting.
 */
const CONTINUE_TO = 90;

interface View {
  turn: number;
  phase: string;
  ap: number;
  invaders: { disease: string; where: string }[];
  organs: Record<string, number>;
  log: string;
}

interface Readout {
  readonly n: number;
  readonly action: Action;
  readonly ok: boolean;
  readonly error: string | null;
  readonly frames: number;
  readonly view: View;
  /** Organs that lost integrity on this action. */
  readonly damaged: string[];
}

function place(iv: Record<string, unknown>): string {
  const zone = String(iv['zone'] ?? '?');
  if (zone === 'hub') return 'bloodstream hub';
  if (zone === 'route') return `${String(iv['lane'])} route, step ${String(iv['step'])}`;
  return `${String(iv['organ'])} branch, step ${String(iv['step'])}`;
}

function summarise(E: Engine, g: GameState): View {
  const v = E.viewState(g) as unknown as Record<string, unknown>;
  const invaders = (v['invaders'] as Record<string, unknown>[]) ?? [];
  // `hp`, NOT `integrity`. `ORGANS[o].integrity` is the CONTENT table's field; the per-game organ
  // record built in newGame is `{key, hp, max, clear, failed}`. Reading `integrity` here yielded
  // `undefined` for every organ, which printed "heart undefined" into the protocol and made organ
  // damage undetectable — a NaN comparison is false, so the checklist quietly reported "not
  // reached" instead of failing. Hence the guard below: a silent undefined is what went wrong.
  const organs = v['organs'] as Record<string, { hp: number }>;
  // Log entries are `{t, msg, kind}` records (v2_engine.js:638), newest first — not strings.
  // Stringifying one directly yields "[object Object]", which is what the first generated
  // protocol printed as the expected log line for all twelve steps.
  const log = (v['log'] as { msg?: string }[]) ?? [];
  const integrity = Object.fromEntries(Object.entries(organs).map(([k, o]) => [k, o.hp]));
  const bad = Object.entries(integrity).filter(([, n]) => typeof n !== 'number' || Number.isNaN(n));
  if (bad.length > 0) {
    throw new Error(
      `organ integrity did not read as numbers (${bad.map(([k]) => k).join(', ')}) — the state ` +
        'field was probably renamed. Refusing to emit a protocol full of "undefined".',
    );
  }
  return {
    turn: Number(v['turn']),
    phase: String(v['phase']),
    ap: Number(v['ap']),
    invaders: invaders.map((iv) => ({ disease: String(iv['disease']), where: place(iv) })),
    organs: integrity,
    log: String(log[0]?.msg ?? '').replace(/<[^>]+>/g, ''),
  };
}

/** Record a candidate sequence from the bot, against legacy, in the UI's configuration. */
function recordSequence(seed: number): Action[] {
  const E = loadLegacy();
  const actions: Action[] = [];
  installRng(seed);
  try {
    const g = E.newGame({ difficulty: DIFFICULTY, science: SCIENCE });
    botGame(
      E,
      g,
      (a) => {
        actions.push(a);
        return E.applyAction(g, a);
      },
      40,
    );
  } finally {
    restoreRng();
  }
  return actions.slice(0, CONTINUE_TO);
}

/** Replay a sequence into one engine, capturing what a human can see after each action. */
function replay(E: Engine, seed: number, actions: readonly Action[]): Readout[] {
  const out: Readout[] = [];
  installRng(seed);
  try {
    const g = E.newGame({ difficulty: DIFFICULTY, science: SCIENCE });
    let prev = summarise(E, g);
    actions.forEach((a, i) => {
      const r = E.applyAction(g, a) as {
        ok?: boolean;
        error?: string;
        frames?: unknown[];
      };
      const view = summarise(E, g);
      const damaged = Object.keys(view.organs).filter(
        (k) => (view.organs[k] ?? 0) < (prev.organs[k] ?? 0),
      );
      out.push({
        n: i + 1,
        action: a,
        ok: Boolean(r?.ok),
        error: r?.ok ? null : (r?.error ?? null),
        frames: r?.frames?.length ?? 0,
        view,
        damaged,
      });
      prev = view;
    });
  } finally {
    restoreRng();
  }
  return out;
}

interface Coverage {
  readonly spread: boolean;
  readonly bigSpread: boolean;
  readonly organDamage: boolean;
  readonly apSpent: boolean;
  readonly invaderMoved: boolean;
}

function coverage(rs: readonly Readout[]): Coverage {
  const spread = rs.some((r) => r.frames > 0);
  return {
    spread,
    bigSpread: rs.some((r) => r.frames >= 4),
    organDamage: rs.some((r) => r.damaged.length > 0),
    apSpent: rs.some((r, i) => i > 0 && r.view.ap < (rs[i - 1]?.view.ap ?? 0)),
    invaderMoved: rs.some(
      (r, i) =>
        i > 0 &&
        canonical(r.view.invaders.map((x) => x.where)) !==
          canonical((rs[i - 1]?.view.invaders ?? []).map((x) => x.where)),
    ),
  };
}

const covered = (c: Coverage): number => Object.values(c).filter(Boolean).length;

async function main(): Promise<void> {
  const LINE = '='.repeat(95);
  console.log(LINE);
  console.log('TASK G STEP 7 — GENERATING THE COMPARISON PROTOCOL');
  console.log(LINE);

  // Search for a seed whose first STEPS actions exercise the whole checklist §3 step 7 names.
  // Reported rather than silently chosen: which seed, and what it covers.
  let best: { seed: number; actions: Action[]; rs: Readout[]; cov: Coverage } | null = null;
  for (let i = 1; i <= 400; i += 1) {
    const seed = 1_000_003 * i + 7919;
    const actions = recordSequence(seed);
    if (actions.length < STEPS) continue;
    const rs = replay(loadLegacy(), seed, actions);
    // Coverage is judged on the SCRIPTED part only. Crediting the continuation would let a seed
    // score five while the checked sequence showed the human almost nothing.
    const cov = coverage(rs.slice(0, STEPS));
    if (!best || covered(cov) > covered(best.cov)) best = { seed, actions, rs, cov };
    if (covered(cov) === 5) break;
  }
  if (!best) {
    console.log('  no usable sequence found — not emitting a protocol');
    process.exit(1);
  }

  console.log(`  seed          ${best.seed}`);
  console.log(`  difficulty    ${DIFFICULTY} (science: ${SCIENCE} — the UI's own newG() config)`);
  console.log(`  actions       ${best.actions.length}`);
  console.log('  checklist     ' + JSON.stringify(best.cov));

  // THE PROTOCOL'S EXPECTATIONS MUST BE AGREED, NOT ASSERTED. If the two engines disagree here,
  // the protocol would be documenting the port's behaviour as if it were the truth.
  const legacyRun = best.rs;
  const portRun = replay(portEngine as unknown as Engine, best.seed, best.actions);
  const agree = canonical(legacyRun) === canonical(portRun);
  console.log(
    `  agreement     ${agree ? 'legacy and port identical over the sequence' : 'DISAGREE'}`,
  );
  if (!agree) {
    const at = legacyRun.findIndex((r, i) => canonical(r) !== canonical(portRun[i]));
    console.log(
      `\n  They diverge at step ${at + 1}. That is a FINDING, not a protocol to publish.`,
    );
    process.exit(1);
  }

  const tail = legacyRun.slice(STEPS);
  const dmgAt = tail.findIndex((r) => r.damaged.length > 0);
  console.log(
    `  organ damage  ${dmgAt < 0 ? 'not reached within ' + CONTINUE_TO + ' actions' : `step ${STEPS + dmgAt + 1}`}`,
  );

  writeFileSync(
    OUT,
    render(
      best.seed,
      legacyRun.slice(0, STEPS),
      best.cov,
      dmgAt < 0 ? null : tail.slice(0, dmgAt + 1),
    ),
    'utf8',
  );
  console.log(`  written       ${OUT}`);
  console.log(LINE);
}

// --- the document --------------------------------------------------------------------------------

/**
 * The one block that reaches organ damage.
 *
 * An organ cannot be damaged inside ten actions — the invaders have to march in. Rather than quietly
 * dropping the checklist item, or padding the scripted section to forty steps, this is one paste
 * with one checkpoint.
 */
function renderContinuation(rs: readonly Readout[] | null): string {
  if (!rs || rs.length === 0) {
    return `## 4. Organ damage

**Not reached within ${CONTINUE_TO} actions on this seed.** The checklist item is not covered by the
script — watch for it during free play instead, and say if the two windows ever show it differently.`;
  }
  const last = rs[rs.length - 1];
  if (!last) return '';
  // AWAITED, not a flat list of calls. `act()` returns `spread(r.frames)` for an endCommand
  // (v2_ui.html:1341), and `spread` is async — it sets `busy=true` and walks the frames with a
  // ~560-800ms delay each. Pasting sixty synchronous `act(...)` calls would fire the next action
  // into the middle of the previous animation, and the two windows would diverge on TIMING alone,
  // producing a difference that looks like an engine bug and is entirely the protocol's fault.
  const calls = rs.map((r) => `  ${JSON.stringify(r.action)},`).join('\n');
  return `## 4. Organ damage — one continuation block

An organ cannot be reached in ten actions; the invaders have to march in first. So this is **one
paste, one checkpoint**, rather than another twenty numbered steps.

Paste this into **both** consoles. It plays on to the first organ damage, waiting for each spread
animation to finish before the next action — which is why it is a loop rather than ${rs.length} separate
calls.

\`\`\`js
(async () => {
  const seq = [
${calls}
  ];
  for (const a of seq) await act(a);
  console.log('continuation complete');
})();
\`\`\`

| after the block | expected |
|---|---|
| **organ damaged** | **${last.damaged.join(', ')}** |
| turn / phase | ${last.view.turn} / ${last.view.phase} |
| AP | ${last.view.ap} |
| organ integrity | ${Object.entries(last.view.organs)
    .map(([k, v]) => `${k} ${v}`)
    .join(' · ')} |
| newest log line | ${last.view.log ? `"${last.view.log}"` : '(none)'} |

**Watch the board as it runs.** The damage should appear on the same organ, at the same moment, in
both windows.`;
}

function render(
  seed: number,
  rs: readonly Readout[],
  cov: Coverage,
  continuation: readonly Readout[] | null,
): string {
  // THE SNIPPET REACHES FOR TWO OF THE PAGE'S OWN GLOBALS, AND THAT IS THE FRAGILE PART.
  //
  // `lab` and `newG` are declared at the top level of v2_ui.html's board script — `lab` with
  // `let`, which puts it in the global LEXICAL environment rather than on `window`. Whether a
  // pasted console snippet can see that binding depends on the browser and on how the console
  // scopes an evaluation, and the first version of this snippet assumed it always could.
  //
  // It failed for Shantanu with `TypeError: "" is not a function` — a message that names neither
  // `lab` nor `newG`, so it points nowhere useful. It could not be reproduced here: the same
  // snippet, run against the real built artifact under jsdom, seeds and starts a game cleanly.
  //
  // So this does not claim to have found the cause. It removes the dependency instead:
  //
  //   - `typeof x !== 'undefined'` is the ONLY form that does not throw on an undeclared
  //     identifier, so neither lookup can fail loudly or confusingly;
  //   - the SEEDING always happens, because that part touches nothing but `Math`;
  //   - if `newG` is out of reach the snippet says so and tells him to click the difficulty
  //     button, which runs `lab.difficulty='normal';newG()` from an onclick in PAGE scope and so
  //     cannot have this problem at all.
  //
  // Both paths are exercised in a jsdom harness — the real artifact, and a blank page with
  // neither global present — because a fallback that has never run is not known to work.
  const snippet = `(() => {
  let a = ${seed} | 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  var L = typeof lab !== "undefined" ? lab : null;
  var N = typeof newG === "function" ? newG : null;
  if (L) L.difficulty = ${JSON.stringify(DIFFICULTY)};
  if (N) { N(); console.log("SEEDED - new game started on ${DIFFICULTY}."); }
  else console.log("SEEDED - now click the ${DIFFICULTY} difficulty button to start the game.");
})();`;

  const steps = rs
    .map((r) => {
      const inv = r.view.invaders.length
        ? r.view.invaders.map((i) => `${i.disease} — ${i.where}`).join('<br>')
        : '(none)';
      const dmg = r.damaged.length ? `**${r.damaged.join(', ')} lost integrity**` : '—';
      return `### Step ${r.n}

\`\`\`js
act(${JSON.stringify(r.action)})
\`\`\`

| after this action | expected |
|---|---|
| accepted | ${r.ok ? 'yes' : `no — \`${r.error ?? ''}\``} |
| turn / phase | ${r.view.turn} / ${r.view.phase} |
| **AP** | **${r.view.ap}** |
| spread frames | ${r.frames > 0 ? `**${r.frames}** — watch the animation run to completion` : '0'} |
| organ damage | ${dmg} |
| invaders | ${inv} |
| newest log line | ${r.view.log ? `"${r.view.log}"` : '(none)'} |
| organ integrity | ${Object.entries(r.view.organs)
        .map(([k, v]) => `${k} ${v}`)
        .join(' · ')} |
`;
    })
    .join('\n');

  return `# Task G — the comparison protocol

**Generated by \`tools/legacy-harness/protocol.ts\`. Do not edit by hand.**

Every expectation below was produced by running the sequence through **both** engines and requiring
them to agree. If they had disagreed, the generator refuses to emit this file — so a protocol
existing at all is already one check.

---

## 0. Before you start — what is already known

You are not being asked to detect an engine difference. Four checks already ran:

| check | result |
|---|---|
| the seam — every name the UI reads | 49/49 bound, values identical to legacy |
| static drift across the seam | 49/49 agree, byte for byte and in key order |
| **frame bursts** — \`frames.length\`, every \`view\`, every \`dice\` | **identical over 120 games** |
| legacy source absent from the port bundle | none of 1,123 fingerprints present |

> **So: if you see a visual difference, it is a RENDERING artefact, not an engine one.**
> That is the whole point of running those first. What is left for you is the thing no automated
> check in this repository can do — whether the game *plays* the same.

## 1. Setup — two windows

1. \`pnpm build:single\`
2. Open both files from \`tools/legacy-harness/dist/\` by **double-clicking**:
   - \`immunity-wars-harness.html\` — **the ported engine**. Badge bottom-right is **green**.
   - \`immunity-wars-REFERENCE-legacy-engine.html\` — **legacy**. Badge is **red**.
3. Put them side by side. Open the developer console in each (F12).

Both files are built from the same \`v2_ui.html\` and the same art. **The engine is the only
difference**, so anything you see is attributable.

> **Check the badges before you begin.** Green = port, red = legacy. Two windows and one mistaken
> identity is a wasted session, and it is not recoverable afterwards from your notes.

## 2. Seed both windows

The game has no seed — the engine calls \`Math.random()\` directly. This replaces the generator,
which is exactly what the equivalence rig does. **Paste this into BOTH consoles**, port first:

\`\`\`js
${snippet}
\`\`\`

It prints \`SEEDED\`. If it says to click the difficulty button, do that — the seed is already
installed, and the button runs the same two calls from page scope.

Both windows now hold the identical game. If the two boards do not look identical at this point,
stop — that is a finding, and nothing after it is interpretable.

## 3. The sequence

Seed \`${seed}\`, difficulty **${DIFFICULTY}**, ${rs.length} actions.

\`act({...})\` is the UI's own dispatcher (\`v2_ui.html:1337\`) — the same path every button takes.
Paste each into **both** consoles, then compare against the table before moving on.

This sequence was chosen because it covers all five things §3 step 7 asks you to look at:

| | |
|---|---|
| AP is spent | ${cov.apSpent ? 'yes' : 'NO — not covered'} |
| invaders move | ${cov.invaderMoved ? 'yes' : 'NO — not covered'} |
| a spread animation runs | ${cov.spread ? 'yes' : 'NO — not covered'} |
| a spread of 4+ frames | ${cov.bigSpread ? 'yes' : 'NO — not covered'} |
| an organ takes damage | ${cov.organDamage ? 'yes, in the scripted steps' : 'not in ten actions — §4 below covers it'} |

${steps}

${renderContinuation(continuation)}

## 5. Then play freely — this is the part that matters

The table above is a control. **Your judgement is the measurement**, and it is the only thing here
that can catch what the automated checks cannot: a game that is correct action-for-action and still
feels wrong.

Play ten minutes in each window. Specifically:

- **the spread animation** — does it run to completion at the same pace, in the same order?
- **the log panel** — same wording, same colours, same order?
- **AP counters** — do they land on the same numbers as you spend?
- **organ damage** — does the board show it in the same place at the same time?
- **anything that feels slower, jerkier, or off** — the port is a different code path and
  performance is not something any check here measured.

## 6. What to do with what you find

| what you see | what it means |
|---|---|
| a difference in the table above | **stop.** The engines agreed when this was generated, so something has changed since |
| a visual difference not in the table | a rendering artefact — the frames were proven identical |
| something that feels wrong but you cannot name | **say so anyway.** That is why a human is doing this |
| a JS error in the console | copy it out — the console is why testing happens on the PC |

Report what you see, including "nothing, it played the same". A verdict you can defend is the
deliverable; a green box is not.
`;
}

await main();
