/**
 * MEDICAL REVIEW COMPILATION — every scientific claim the app makes, in one document, for
 * review by a clinician.
 *
 * WHY THIS IS GENERATED AND NOT WRITTEN. There are over a thousand reviewable claims and they
 * live in nine files. A hand-compiled list would be wrong the day a disease entry changed, and
 * the failure would be silent: the reviewer would sign off on a document that no longer matches
 * the app. Generating it means the compilation cannot drift from the pack, and means it can be
 * re-run after corrections land so the second review reads the corrected text.
 *
 * `docs/FINDINGS.md` #65 applies to the output: **it is generated, so a hand edit inside it is
 * deleted by the next run, silently.** The reviewer's verdicts therefore do NOT go in the
 * generated file — they go in `docs/MEDICAL_REVIEW_GUIDE.md`, which is written by hand and
 * which this tool never touches.
 *
 * WHAT COUNTS AS A CLAIM. Two kinds, and the second is the one a prose-only compilation would
 * miss entirely:
 *
 *   PROSE   — a sentence asserting something about biology or medicine. "Rabies creeps inside
 *             nerves where antibodies can't follow."
 *   TABLE   — a claim the RULES make by working a particular way. `TROPISM.Rabies = ["brain"]`
 *             asserts that rabies is neurotropic and does not, say, attack the liver. Nobody
 *             wrote that as a sentence; the game states it every time it is played.
 *
 * Both are emitted, each with a stable id so a reviewer can write "DISEASE/Rabies/treat is
 * wrong" and the correction lands in one known place.
 *
 * Run: pnpm medical:review
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SRC = resolve(ROOT, 'packages/content/src');

const read = (p: string): Record<string, unknown> =>
  JSON.parse(readFileSync(resolve(SRC, p), 'utf8')) as Record<string, unknown>;

const diseases = read('diseases/diseases.json');
const why = read('diseases/why.json');
const cells = read('labels/cells.json');
const labels = read('labels/labels.json');
const board = read('rules/board.json');
const deck = read('rules/deck.json');
const families = read('rules/families.json');
const events = read('rules/events.json');
const invaders = read('rules/invaders.json');
const derived = read('rules/derived.json');
const tropism = read('rules/tropism.json');
const tuning = read('rules/tuning.json');
const ui = read('i18n/en/ui.json');

type Dict<T> = Record<string, T>;
const asDict = <T>(v: unknown): Dict<T> => v as Dict<T>;

const out: string[] = [];
let n = 0;
const rows: string[] = [];

/** One reviewable claim. `kind` is PROSE or TABLE; `where` is the file it lives in. */
function claim(id: string, kind: 'PROSE' | 'TABLE', where: string, text: string): void {
  n += 1;
  rows.push(`| ${n} | \`${id}\` | ${kind} | ${text.replace(/\|/g, '\\|')} | ${where} |`);
}

function section(title: string, blurb: string): void {
  // Flush the PREVIOUS section's rows before anything else: pushing a blank line first put it
  // between a table's header and its body, which ends the table in every markdown renderer.
  flush();
  out.push(`\n## ${title}\n\n${blurb}\n`);
  out.push('| # | Claim id | Kind | The claim | Lives in |');
  out.push('|---|---|---|---|---|');
}

function flush(): void {
  if (rows.length) {
    out.push(...rows);
    rows.length = 0;
  }
}

// ─── A. The seven cells ────────────────────────────────────────────────────────────────────
const CELL_CARDS = asDict<Dict<string>>(cells['CELL_CARDS']);
const CNAME = asDict<string>(tuning['CNAME']);
const UM = asDict<Dict<string>>(labels['UM']);
const SPEED = asDict<number>(tuning['SPEED']);
const FIELD_MEANING: Dict<string> = {
  role: 'what it does',
  home: 'where it comes from and lives',
  bestAgainst: 'what it is good against',
  deficiency: 'what happens without it',
  fact: 'the card fact',
};

section(
  'A. The seven immune cells',
  'Each cell card carries five prose fields. The display name is what a player calls the piece ' +
    'all game, so a wrong name is repeated more often than any sentence. `speed` is how many ' +
    'board steps it moves per action.',
);
for (const key of Object.keys(CELL_CARDS)) {
  const card = CELL_CARDS[key] ?? {};
  const shown = CNAME[key] ?? UM[key]?.['n'] ?? key;
  claim(
    `CELL/${key}/name`,
    'TABLE',
    'labels/labels.json, rules/tuning.json',
    `The piece named **${shown}** in the app is the real-world **${key}**.`,
  );
  claim(
    `CELL/${key}/speed`,
    'TABLE',
    'rules/tuning.json',
    `**${shown}** moves ${String(SPEED[key] ?? '?')} step(s) per move action.`,
  );
  for (const f of ['role', 'home', 'bestAgainst', 'deficiency', 'fact']) {
    const v = card[f];
    if (typeof v === 'string' && v.length > 0) {
      claim(
        `CELL/${key}/${f}`,
        'PROSE',
        'labels/cells.json',
        `**${shown}**, ${FIELD_MEANING[f]}: ${v}`,
      );
    }
  }
}

// ─── B. Pathogen types ─────────────────────────────────────────────────────────────────────
const UI_ = asDict<Dict<string>>(labels['UI_']);
const BEAT = asDict<string>(labels['BEAT_BY_TYPE']);
const INV_HP = asDict<number>(invaders['INV_HP']);
const INV_SPEED = asDict<number>(invaders['INV_SPEED']);
const NOT_ALIVE = invaders['NOT_ALIVE'] as string[];

section(
  'B. The nine pathogen types',
  'The type decides how a pathogen behaves for the whole game: how much killing it takes ' +
    '(`hp`), how fast it advances, and what can beat it. "Not alive" is a real biological ' +
    'claim about toxins and venoms and it changes which cells can act on them.',
);
for (const key of Object.keys(UI_)) {
  const label = UI_[key]?.['n'] ?? key;
  claim(
    `TYPE/${key}/beat`,
    'PROSE',
    'labels/labels.json',
    `**${label}** — how it is beaten: ${BEAT[key] ?? '(none)'}`,
  );
  claim(
    `TYPE/${key}/hp`,
    'TABLE',
    'rules/invaders.json',
    `A **${label}** takes ${String(INV_HP[key] ?? '?')} hit(s) to kill and advances ` +
      `${String(INV_SPEED[key] ?? '?')} step(s) per spread.`,
  );
}
claim(
  'TYPE/notAlive',
  'TABLE',
  'rules/invaders.json',
  `These are treated as **not living organisms**: ${NOT_ALIVE.join(', ')}. ` +
    'They cannot be killed, only neutralised or removed.',
);

// ─── C. Antigen classes ────────────────────────────────────────────────────────────────────
const FAMILIES = asDict<Dict<string>>(families['FAMILIES']);
const FAMILY = asDict<string>(families['FAMILY']);

section(
  'C. The six antigen classes',
  'Antibodies in this game are made against a CLASS, not against one disease, and the class is ' +
    'what makes an antibody work on a pathogen the player has not met. Two questions: is the ' +
    "class description right, and is each disease's class assignment right?",
);
for (const key of Object.keys(FAMILIES)) {
  const fam = FAMILIES[key] ?? {};
  claim(
    `CLASS/${key}/bio`,
    'PROSE',
    'rules/families.json',
    `**${fam['name'] ?? key}** (${key}): ${fam['bio'] ?? ''}`,
  );
  const members = Object.keys(FAMILY).filter((d) => FAMILY[d] === key);
  claim(
    `CLASS/${key}/members`,
    'TABLE',
    'rules/families.json',
    `Assigned to **${fam['name'] ?? key}** (${String(members.length)}): ${members.join(', ')}`,
  );
}

// ─── D. Organs ─────────────────────────────────────────────────────────────────────────────
const ORGANS = asDict<Dict<unknown>>(board['ORGANS']);
const RESIDENT_NAME = asDict<string>(board['RESIDENT_NAME']);

section(
  'D. The seven organs',
  'Each organ carries a prose note on how infection reaches it, a resident macrophage with a ' +
    'real name, and an `effect` — what the body loses when that organ is damaged. The effect is ' +
    'a physiological claim stated as a game penalty.',
);
for (const key of Object.keys(ORGANS)) {
  const o = ORGANS[key] ?? {};
  claim(
    `ORGAN/${key}/bio`,
    'PROSE',
    'rules/board.json',
    `**${o['name'] ?? key}**: ${o['bio'] ?? ''}`,
  );
  claim(
    `ORGAN/${key}/effect`,
    'PROSE',
    'rules/board.json',
    `When the **${o['name'] ?? key}** is damaged, the body suffers: ${o['effect'] ?? ''}`,
  );
  claim(
    `ORGAN/${key}/resident`,
    'TABLE',
    'rules/board.json',
    `The resident macrophage of the **${o['name'] ?? key}** is called the ` +
      `**${RESIDENT_NAME[key] ?? '?'}**, and it can take ${String(o['integrity'] ?? '?')} ` +
      `damage before the organ is lost.`,
  );
}

// ─── E. Transmission routes ────────────────────────────────────────────────────────────────
const ROUTES = asDict<Dict<unknown>>(board['ROUTES']);
const LYMPH_GROUP = asDict<string | null>(board['LYMPH_GROUP']);
const DECK_MASTER = deck['DECK_MASTER'] as { dz: string; type: string; lane: string }[];

section(
  'E. The six routes of entry',
  'The route is where a pathogen starts on the board, so it is the claim "this is how this ' +
    'disease gets into a person". The lymph group decides which routes drain to a shared lymph ' +
    'node, which is an anatomical claim about lymphatic drainage.',
);
for (const key of Object.keys(ROUTES)) {
  const r = ROUTES[key] ?? {};
  const via = Object.keys(LYMPH_GROUP)
    .filter((k) => LYMPH_GROUP[k] === LYMPH_GROUP[key] && k !== key && LYMPH_GROUP[key] !== null)
    .join(', ');
  claim(
    `ROUTE/${key}/lymph`,
    'TABLE',
    'rules/board.json',
    `The **${r['name'] ?? key}** route is ${String(r['len'] ?? '?')} steps from the ` +
      `bloodstream, and drains to the **${LYMPH_GROUP[key] ?? 'no'}** lymph group` +
      (via ? `, shared with: ${via}.` : '.'),
  );
  const carried = DECK_MASTER.filter((c) => c.lane === key).map((c) => c.dz);
  claim(
    `ROUTE/${key}/diseases`,
    'TABLE',
    'rules/deck.json',
    `Enters by **${r['name'] ?? key}** (${String(carried.length)}): ${carried.join(', ')}`,
  );
}

// ─── F. The diseases ───────────────────────────────────────────────────────────────────────
const DZINFO = asDict<Dict<string>>(diseases['DZINFO']);
const DZSTATS = asDict<[number, number, number, number, string]>(diseases['DZSTATS']);
const FACT = asDict<string>(diseases['FACT']);
const TROPISM = asDict<string[] | 'any'>(tropism['TROPISM']);
/** Three diseases carry the string 'any' rather than a list: they can seed ANY organ. */
const organsOf = (dz: string): string => {
  const v = TROPISM[dz];
  return v === undefined ? '(not listed)' : v === 'any' ? 'ANY organ' : v.join(', ');
};
const FAST = asDict<number>(invaders['FAST_DISEASE']);
const TOXIN_MAKERS = asDict<string>(invaders['TOXIN_MAKERS']);
const DERIVED = asDict<Dict<string>>(derived['DERIVED']);
const INFO_FIELD: Dict<string> = {
  d: 'Discovered',
  c: 'Causes',
  w: 'Found',
  p: 'Prevent',
  r: 'Treat',
};

flush();
out.push(`\n## F. The ${String(Object.keys(DZINFO).length)} diseases\n`);
out.push(
  '**This is the largest section and it carries the highest-risk claims in the app.** The two ' +
    'fields to read first on every card are **Prevent** and **Treat**: they are the only place ' +
    'the app comes close to saying what a person should do, they are read by children, and a ' +
    'wrong one is the only kind of error here that could do harm outside the game.\n',
);
out.push(
  'Each disease is one block. `Causes`, `Prevent` and `Treat` are prose. `Infects`, `Class`, ' +
    '`Type` and `Route` are claims the rules make. The four stat bars are 1 to 5.\n',
);

const statNames = ['Contagion', 'Severity', 'Speed', 'Cunning'];
/** Type keys are internal ('hidden'); a reviewer needs the name the app shows. */
const typeName = (k: string): string => UI_[k]?.['n'] ?? k;
for (const dz of Object.keys(DZINFO)) {
  const info = DZINFO[dz] ?? {};
  const st = DZSTATS[dz];
  const card = DECK_MASTER.find((c) => c.dz === dz);
  const der = DERIVED[dz];
  out.push(`\n### ${dz}\n`);
  const meta: string[] = [];
  meta.push(
    `**Type** ${card ? typeName(card.type) : der ? typeName(String(der['type'])) : '(not in the deck)'}`,
  );
  if (card) meta.push(`**Route** ${String(ROUTES[card.lane]?.['name'] ?? card.lane)}`);
  meta.push(`**Class** ${FAMILY[dz] ?? '(none)'}`);
  meta.push(`**Infects** ${organsOf(dz)}`);
  if (st) {
    meta.push(
      ...statNames.map((s, i) => `**${s}** ${String(st[i as 0 | 1 | 2 | 3])}/5`),
      `**Tier** ${st[4]}`,
    );
  }
  if (FAST[dz]) meta.push(`**Moves fast**: ${String(FAST[dz])} steps per spread`);
  if (TOXIN_MAKERS[dz]) meta.push(`**Produces** ${TOXIN_MAKERS[dz]}`);
  if (der) meta.push(`**Arises from** ${String(der['from'])} via ${String(der['via'])}`);
  out.push(meta.join(' · ') + '\n');
  out.push('| Claim id | Kind | The claim |');
  out.push('|---|---|---|');
  for (const f of ['d', 'c', 'w', 'p', 'r']) {
    const v = info[f];
    if (typeof v === 'string' && v.length > 0) {
      n += 1;
      out.push(`| \`DISEASE/${dz}/${INFO_FIELD[f] ?? f}\` | PROSE | **${INFO_FIELD[f]}**: ${v} |`);
    }
  }
  if (FACT[dz]) {
    n += 1;
    out.push(`| \`DISEASE/${dz}/fact\` | PROSE | **Card fact**: ${FACT[dz]} |`);
  }
  n += 1;
  out.push(
    `| \`DISEASE/${dz}/tropism\` | TABLE | It can infect: **${organsOf(dz)}**${TROPISM[dz] === 'any' ? '.' : ', and no other organ.'} |`,
  );
  n += 1;
  out.push(
    `| \`DISEASE/${dz}/class\` | TABLE | Its antigen class is **${FAMILY[dz] ?? '(none)'}**, so an antibody raised against that class works on it. |`,
  );
  if (card) {
    n += 1;
    out.push(
      `| \`DISEASE/${dz}/route\` | TABLE | It enters the body by the **${String(ROUTES[card.lane]?.['name'] ?? card.lane)}**, and is a **${typeName(card.type)}**. |`,
    );
  }
  if (st) {
    n += 1;
    out.push(
      `| \`DISEASE/${dz}/stats\` | TABLE | Contagion ${String(st[0])}/5, severity ${String(st[1])}/5, speed ${String(st[2])}/5, cunning ${String(st[3])}/5; tier ${st[4]}. |`,
    );
  }
}

// ─── G. Events ─────────────────────────────────────────────────────────────────────────────
const EVENTS = asDict<Dict<unknown>>(events['EVENTS']);
const RARE = asDict<Dict<unknown>>(events['RARE']);

section(
  'G. Crisis and rare events',
  'Every event carries a `why` — the biological reason the game gives for it happening. These ' +
    'are short and they are the app explaining pathophysiology in one sentence, which is where ' +
    'a compression error is most likely.',
);
for (const key of Object.keys(EVENTS)) {
  const ev = EVENTS[key] ?? {};
  claim(
    `EVENT/${key}/why`,
    'PROSE',
    'rules/events.json',
    `**${String(ev['name'] ?? key)}**: ${String(ev['why'] ?? '')} (in game: ${String(ev['tell'] ?? '')})`,
  );
}
for (const key of Object.keys(RARE)) {
  const ev = RARE[key] ?? {};
  claim(
    `RARE/${key}/why`,
    'PROSE',
    'rules/events.json',
    `**${String(ev['name'] ?? key)}**: ${String(ev['why'] ?? '')}`,
  );
}

// ─── H. Why it works this way ──────────────────────────────────────────────────────────────
const WHY = why['WHY'] as { key: string; help: string; text: string }[];
section(
  'H. The fifteen "why it works this way" boxes',
  "These are the game's own defence of its design: each explains why a rule is shaped the way " +
    'it is. They are the passages most likely to be quoted at a science fair, and they make ' +
    'general claims about how immunity works rather than claims about one disease.',
);
for (const w of WHY) {
  const title = ui[`library.why.${w.key}.title`];
  claim(
    `WHY/${w.key}`,
    'PROSE',
    'diseases/why.json',
    `**${typeof title === 'string' ? title : w.key}**: ${w.text}`,
  );
}

// ─── I. How to play ────────────────────────────────────────────────────────────────────────
section(
  'I. How to play — the in-app explanation',
  'The ten sections a newcomer reads. Mechanical instructions are not medical claims, so this ' +
    'section is filtered to the entries that assert something about biology; the filter is ' +
    'keyword-based and deliberately generous, so some pure game text appears here too.',
);
const BIO_WORDS =
  /antibod|antigen|immun|infect|patho|bacteri|virus|viral|cell|macrophage|neutrophil|lymph|marrow|spleen|organ|fever|vaccin|memory|toxin|venom|worm|malaria|complement|phagocyt|inflamm|blood|tissue|nerve|mucos|spike|protozoa|fungus|fungal|parasit|host|strain|clone|plasma|receptor/i;
for (const k of Object.keys(ui)) {
  if (!k.startsWith('help.')) continue;
  const v = ui[k];
  if (typeof v !== 'string' || v.length < 40) continue;
  if (!BIO_WORDS.test(v)) continue;
  claim(`HELP/${k.slice(5)}`, 'PROSE', 'i18n/en/ui.json', v);
}

// ─── J. In-play text ───────────────────────────────────────────────────────────────────────
section(
  'J. Text shown during play',
  'Selection hints, inspect panels, effects and action descriptions — the sentences a player ' +
    'reads most often, because they appear every turn rather than once in a help screen. ' +
    'Filtered the same way as section I.',
);
for (const k of Object.keys(ui)) {
  if (k.startsWith('help.') || k.startsWith('about.') || k.startsWith('settings.')) continue;
  const v = ui[k];
  if (typeof v !== 'string' || v.length < 40) continue;
  if (!BIO_WORDS.test(v)) continue;
  claim(`PLAY/${k}`, 'PROSE', 'i18n/en/ui.json', v);
}

flush();

// ─── The document ──────────────────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const header = `# The Immunity Wars — every scientific claim the app makes

**GENERATED FILE — do not edit by hand.** Regenerate with \`pnpm medical:review\`. A hand edit
here is deleted by the next run, silently ([\`FINDINGS.md\`](FINDINGS.md) #65). **Reviewer notes
and verdicts belong in [\`MEDICAL_REVIEW_GUIDE.md\`](MEDICAL_REVIEW_GUIDE.md)**, which is written
by hand and which the generator never touches.

Generated ${today} from \`packages/content/src\`, pack \`${String((read('rules/pack.json')['packId'] as string) ?? '?')}\`,
content version \`${String((read('rules/pack.json')['packVersion'] as string) ?? '?')}\`, rules version
\`${String((read('rules/pack.json')['rulesVersion'] as string) ?? '?')}\`.

**How to read a row.** Every claim has a stable id like \`DISEASE/Rabies/Treat\`. Quoting the id
is enough for a correction to be found and applied; no file paths or line numbers are needed.

**Two kinds of claim, and the second is the one that is easy to miss:**

- **PROSE** — a sentence that asserts something. It can be read and judged directly.
- **TABLE** — a claim the RULES make by working a particular way. Nobody wrote
  "rabies is neurotropic" as a sentence, but the game asserts it every time it is played,
  because rabies can only be sent to the brain. A TABLE claim is as reviewable as a
  sentence and is stated here in words so that it can be reviewed.

**What we are asking.** Not whether a simplification is complete — everything here is
compressed for a 13-year-old, and "incomplete" is expected. The question is whether a claim is
**wrong**, or **misleading in a way that would matter**. A separate and more important question
is flagged in the guide: whether anything here could lead a young reader to act badly on real
health information.

---
`;

const toc = `## Contents

| Section | What is in it |
|---|---|
| A | The seven immune cells |
| B | The nine pathogen types |
| C | The six antigen classes |
| D | The seven organs |
| E | The six routes of entry |
| F | **The ${String(Object.keys(DZINFO).length)} diseases — the largest section, and the highest-risk claims** |
| G | Crisis and rare events |
| H | The fifteen "why it works this way" boxes |
| I | How to play — the in-app explanation |
| J | Text shown during play |
`;

const doc = `${header}\n${toc}\n${out.join('\n')}\n\n---\n\n*${String(n)} claims compiled from ${String(Object.keys(DZINFO).length)} diseases, ${String(Object.keys(CELL_CARDS).length)} cells, ${String(Object.keys(ORGANS).length)} organs, ${String(Object.keys(FAMILIES).length)} antigen classes, ${String(Object.keys(ROUTES).length)} routes and ${String(Object.keys(EVENTS).length + Object.keys(RARE).length)} events.*\n`;

writeFileSync(resolve(ROOT, 'docs/MEDICAL_REVIEW.md'), doc, 'utf8');
console.log(`medical:review — ${String(n)} claims written to docs/MEDICAL_REVIEW.md`);
