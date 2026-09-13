/**
 * MEDICAL REVIEW COMPILATION — every FACTUAL claim the app makes, for review by a clinician.
 *
 * SCOPE, ruled by Shantanu 9 September 2026, and it is narrower than this tool's first version:
 * **only what the app asserts as fact.** Game mechanics are out — they are design decisions and
 * they are ours to make. So the tropism table, the antigen-class assignments, the entry routes,
 * hit points, movement speeds and the four stat bars are all EXCLUDED, even though the app
 * displays some of them, because "this disease can reach the heart in this game" is a statement
 * about the game and not about medicine. Asking a clinician to validate our design would spend
 * their attention on the one thing we do not need checked.
 *
 * ONE EXCEPTION, ruled 13 September 2026: the card's "Can infect" line IS included, marked as a
 * game simplification rather than a medical claim. It is the one mechanic the card shows in the
 * form of a fact, and leaving it out would mean the review could never catch the case where the
 * simplification is actually wrong — an organ listed that the disease does not affect, or one
 * that matters left off. Its label and the Part 1 introduction both say it is a design decision,
 * so a reviewer is not led to read "Lungs" as a claim that tuberculosis affects nothing else.
 *
 * WHAT IS IN, therefore: the disease cards' written text, what the app says about the pathogen
 * types, the cell cards, the antigen classes, the organs, the reason given for each event, the
 * fifteen "why it works this way" boxes, and any other shown sentence that asserts something
 * about biology.
 *
 * ONE THING IS NOT STRIPPED, deliberately. Several cell-card fields mix biology and game in one
 * paragraph ("Made in the marrow... In the game it starts in the Bloodstream"). The text is
 * emitted AS SHOWN rather than edited down, because a player reads the whole paragraph and the
 * biological half is still a claim; rewriting it here would send the reviewer text that is not
 * in the app. The guide tells the reviewer to ignore the game sentences.
 *
 * WHY THIS IS GENERATED. A hand-compiled list is wrong the day a disease entry changes, and the
 * failure is silent: the reviewer signs off on a document that no longer matches the app.
 * `docs/FINDINGS.md` #65 applies to the output — a hand edit inside it is deleted by the next
 * run — so verdicts live in `docs/MEDICAL_REVIEW_GUIDE.md`, which this tool never touches.
 *
 * Emits the markdown compilation and a JSON of the same claims, which the .docx sent to the
 * reviewer is built from.
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
const families = read('rules/families.json');
const events = read('rules/events.json');
const ui = read('i18n/en/ui.json');
const pack = read('rules/pack.json');

type Dict<T> = Record<string, T>;
const asDict = <T>(v: unknown): Dict<T> => v as Dict<T>;

/** One reviewable statement of fact, as the app shows it. */
interface Claim {
  id: string;
  subject: string;
  label: string;
  text: string;
}
interface Part {
  key: string;
  title: string;
  blurb: string;
  claims: Claim[];
}
const parts: Part[] = [];
const part = (key: string, title: string, blurb: string): Claim[] => {
  const p: Part = { key, title, blurb, claims: [] };
  parts.push(p);
  return p.claims;
};

// ─── 1. The disease cards ──────────────────────────────────────────────────────────────────
const DZINFO = asDict<Dict<string>>(diseases['DZINFO']);
const FACT = asDict<string>(diseases['FACT']);
const INFO_FIELD: [string, string][] = [
  ['d', 'Discovered'],
  ['c', 'Causes'],
  ['w', 'Found'],
  ['p', 'Prevent'],
  ['r', 'Treat'],
];

const dz = part(
  'diseases',
  'Part 1 — The disease cards',
  'Every word of text the app shows on a disease card. **The two fields to check first are ' +
    'Prevent and Treat**: they are the only place the app comes close to saying what a person ' +
    'should do, they are read by children, and a wrong one is the only kind of error here that ' +
    'could matter outside the game. **The last row of each card is different in kind.** ' +
    '"Can infect" lists the organs the GAME lets that disease damage. It is a design ' +
    'simplification, not a claim that the disease affects nothing else. Please flag it only ' +
    'where an organ we list is wrong for that disease, or where an organ that matters for it is ' +
    'missing.',
);
const TROPISM = asDict<string[] | 'any'>(read('rules/tropism.json')['TROPISM']);
const ORGAN_NAME = asDict<Dict<unknown>>(read('rules/board.json')['ORGANS']);
/** The organs the game lets a disease damage, in the words the card uses. */
const canInfect = (disease: string): string | null => {
  const v = TROPISM[disease];
  if (v === undefined) return null;
  if (v === 'any') return 'In the game, this disease can damage any organ.';
  const names = v.map((k) => String(ORGAN_NAME[k]?.['name'] ?? k));
  return `In the game, this disease can damage only: ${names.join(', ')}.`;
};
for (const name of Object.keys(DZINFO)) {
  const info = DZINFO[name] ?? {};
  for (const [f, label] of INFO_FIELD) {
    const v = info[f];
    if (typeof v === 'string' && v.length > 0) {
      dz.push({ id: `DISEASE/${name}/${label}`, subject: name, label, text: v });
    }
  }
  const fact = FACT[name];
  if (fact) {
    dz.push({ id: `DISEASE/${name}/Fact`, subject: name, label: 'Card fact', text: fact });
  }
  const organs = canInfect(name);
  if (organs) {
    dz.push({
      id: `DISEASE/${name}/CanInfect`,
      subject: name,
      label: 'Can infect (game simplification)',
      text: organs,
    });
  }
}

// ─── 2. The pathogen types ─────────────────────────────────────────────────────────────────
const UI_ = asDict<Dict<string>>(labels['UI_']);
const BEAT = asDict<string>(labels['BEAT_BY_TYPE']);

const ty = part(
  'types',
  'Part 2 — The pathogen types',
  'What the app tells a player about each kind of invader, and how it is beaten. These ' +
    'sentences name our playing pieces (Monocyte, Killer T-Cell) but they are making a claim ' +
    'about immunology, not about the rules.',
);
const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 ? v : null;

for (const key of Object.keys(UI_)) {
  const label = UI_[key]?.['n'] ?? key;
  const beat = str(BEAT[key]);
  if (beat) {
    ty.push({ id: `TYPE/${key}/beat`, subject: label, label: 'How it is beaten', text: beat });
  }
  // The same subject is described again in How to play, in two halves. Both are shown text.
  for (const half of ['hint', 'rest']) {
    const v = str(ui[`help.invader.${key}.${half}`]);
    if (v) {
      ty.push({ id: `TYPE/${key}/${half}`, subject: label, label: 'In How to play', text: v });
    }
  }
}

// ─── 3. The cells ──────────────────────────────────────────────────────────────────────────
const CELL_CARDS = asDict<Dict<string>>(cells['CELL_CARDS']);
const UM = asDict<Dict<string>>(labels['UM']);
const RESIDENT_NAME = asDict<string>(board['RESIDENT_NAME']);
const ORGANS = asDict<Dict<unknown>>(board['ORGANS']);
const CELL_FIELD: [string, string][] = [
  ['role', 'What it does'],
  ['home', 'Where it comes from'],
  ['bestAgainst', 'What it is best against'],
  ['deficiency', 'What happens without it'],
  ['fact', 'Card fact'],
];

const ce = part(
  'cells',
  'Part 3 — The cells',
  'Seven cells a player commands, each with a card, and seven resident macrophages named for ' +
    'the tissue they live in. **Fourteen named cell types in total.** A cell name is repeated ' +
    'more often than any sentence in the app, because it is what the player calls the piece ' +
    'for the whole game, so a wrong name is the most-repeated error available to us.',
);
for (const key of Object.keys(CELL_CARDS)) {
  const card = CELL_CARDS[key] ?? {};
  const shown = UM[key]?.['n'] ?? key;
  ce.push({
    id: `CELL/${key}/Name`,
    subject: shown,
    label: 'The name we use',
    text: `The app calls this piece the ${shown}, for the real-world ${key}.`,
  });
  for (const [f, label] of CELL_FIELD) {
    const v = card[f];
    if (typeof v === 'string' && v.length > 0) {
      ce.push({ id: `CELL/${key}/${f}`, subject: shown, label, text: v });
    }
  }
  for (const half of ['hint', 'rest']) {
    const v = str(ui[`help.cell.${key}.${half}`]);
    if (v) {
      ce.push({ id: `CELL/${key}/${half}`, subject: shown, label: 'In How to play', text: v });
    }
  }
}
for (const half of ['hint', 'rest']) {
  const v = str(ui[`help.cell.resident.text.${half}`]);
  if (v) {
    ce.push({
      id: `CELL/resident/${half}`,
      subject: 'The resident macrophages',
      label: 'In How to play',
      text: v,
    });
  }
}
for (const organ of Object.keys(RESIDENT_NAME)) {
  const nm = RESIDENT_NAME[organ] ?? '';
  const organName = String(ORGANS[organ]?.['name'] ?? organ);
  ce.push({
    id: `CELL/resident/${organ}`,
    subject: nm,
    label: 'The name we use',
    text: `The macrophage that lives in the ${organName} is called the ${nm}.`,
  });
}

// ─── 4. The antigen classes ────────────────────────────────────────────────────────────────
const FAMILIES = asDict<Dict<string>>(families['FAMILIES']);
const cl = part(
  'classes',
  'Part 4 — The antigen classes',
  'The app groups pathogens into six classes by what an antibody actually binds to, and shows ' +
    'this description of each. Which disease we put in which class is a game decision and is ' +
    'not included; whether the description of the class is true is not.',
);
for (const key of Object.keys(FAMILIES)) {
  const fam = FAMILIES[key] ?? {};
  const bio = fam['bio'];
  if (typeof bio === 'string' && bio.length > 0) {
    cl.push({
      id: `CLASS/${key}`,
      subject: String(fam['name'] ?? key),
      label: 'What it is',
      text: bio,
    });
  }
}

// ─── 5. The organs ─────────────────────────────────────────────────────────────────────────
const og = part(
  'organs',
  'Part 5 — The organs',
  'What the app says about how infection reaches each organ. The damage each organ takes ' +
    'before it is lost is a game number and is not included.',
);
for (const key of Object.keys(ORGANS)) {
  const o = ORGANS[key] ?? {};
  const bio = o['bio'];
  if (typeof bio === 'string' && bio.length > 0) {
    og.push({
      id: `ORGAN/${key}`,
      subject: String(o['name'] ?? key),
      label: 'How infection reaches it',
      text: bio,
    });
  }
}

// ─── 6. Why each event happens ─────────────────────────────────────────────────────────────
const EVENTS = asDict<Dict<unknown>>(events['EVENTS']);
const RARE = asDict<Dict<unknown>>(events['RARE']);
const ev = part(
  'events',
  'Part 6 — Why each event happens',
  'Things that happen to the body during a game. Each carries a one-sentence reason, which is ' +
    'the app explaining pathophysiology in the smallest space it ever uses, and therefore where ' +
    'a compression error is most likely. What the event does in the game is not included.',
);
for (const src of [EVENTS, RARE]) {
  for (const key of Object.keys(src)) {
    const e = src[key] ?? {};
    const reason = e['why'];
    if (typeof reason === 'string' && reason.length > 0) {
      ev.push({
        id: `EVENT/${key}`,
        subject: String(e['name'] ?? key),
        label: 'The reason given',
        text: reason,
      });
    }
  }
}

// ─── 7. Why it works this way ──────────────────────────────────────────────────────────────
const WHY = why['WHY'] as { key: string; help: string; text: string }[];
const wb = part(
  'why',
  'Part 7 — "Why it works this way"',
  'Fifteen passages that explain how immunity works in general, rather than describing one ' +
    'disease. These are the ones most likely to be quoted at a science fair or read aloud by a ' +
    'teacher, and they make the broadest claims in the app.',
);
for (const w of WHY) {
  const title = ui[`library.why.${w.key}.title`];
  wb.push({
    id: `WHY/${w.key}`,
    subject: typeof title === 'string' ? title : w.key,
    label: 'The passage',
    text: w.text,
  });
}

// ─── 8. Everything else the app states as fact ─────────────────────────────────────────────
const BIO_WORDS =
  /antibod|antigen|immun|infect|patho|bacteri|virus|viral|macrophage|neutrophil|lymph|marrow|spleen|fever|vaccin|toxin|venom|worm|malaria|complement|phagocyt|inflamm|nerve|mucos|spike|protozoa|fung|parasit|strain|clone|plasma|receptor|memory cell|T-Cell|B-Cell|NK Cell|eosinophil/i;
/** Sentences whose subject is the RULES, not the body. Excluded by the ruling on scope. */
const GAME_ONLY =
  /Action Point|\bAP\b|\bTap\b|\btap\b|button|the app|the board|the game|Training|Normal|Hard|per turn|this turn|next turn|each turn|\bturns?\b|\bsteps?\b|\bspaces?\b|\bdie\b|dice|\broll\b|\brange\b|\bcapped?\b|\bstore\b|Undo|saved game|\bcard\b|\bdeck\b|\bpanel\b|in reach|\bstock\b/i;
/**
 * Only How to play is swept. Everything else shown during a game is a status message about the
 * rules ("No antibody you hold matches a virus in reach"), and the biology inside those lines is
 * already carried by the cell and pathogen entries in Parts 2 and 3.
 */
const ELSEWHERE_ONLY = /^help\./;
/** Titles, labels and section names assert nothing. */
const NOT_PROSE = /\.(title|name|lead|number|back|next|stop|toIndex|whyLink)$/;

const el = part(
  'elsewhere',
  'Part 8 — General statements about how the body works',
  'Sentences from How to play that explain immunology in general rather than describing one ' +
    'disease, cell or pathogen. Rules text is filtered out aggressively, so this part is short ' +
    'by design: most of what How to play says about a particular cell or invader has already ' +
    'appeared under that subject in Parts 2 and 3.',
);
const seen = new Set(dz.concat(ty, ce, cl, og, ev, wb).map((c) => c.text));
for (const k of Object.keys(ui)) {
  if (!ELSEWHERE_ONLY.test(k) || NOT_PROSE.test(k)) continue;
  const v = ui[k];
  if (typeof v !== 'string' || v.length < 45) continue;
  if (!BIO_WORDS.test(v) || GAME_ONLY.test(v)) continue;
  if (seen.has(v)) continue;
  seen.add(v);
  el.push({
    id: `TEXT/${k}`,
    subject: 'How to play',
    label: k.slice(5),
    text: v,
  });
}

// ─── Output ────────────────────────────────────────────────────────────────────────────────
const total = parts.reduce((s, p) => s + p.claims.length, 0);
const today = new Date().toISOString().slice(0, 10);

const md: string[] = [];
md.push(`# The Immunity Wars — every factual claim the app makes

**GENERATED FILE — do not edit by hand.** Regenerate with \`pnpm medical:review\`. A hand edit
here is deleted by the next run, silently ([\`FINDINGS.md\`](FINDINGS.md) #65). **Reviewer notes
and verdicts belong in [\`MEDICAL_REVIEW_GUIDE.md\`](MEDICAL_REVIEW_GUIDE.md)**, which is written
by hand and which the generator never touches. What a reviewer receives is the .docx built from
this same data.

Generated ${today} from \`packages/content/src\` — pack \`${String(pack['packId'])}\`, content \`${String(pack['packVersion'])}\`, rules \`${String(pack['rulesVersion'])}\`.

**${String(total)} claims.** Game mechanics are deliberately excluded: how a disease behaves on
the board, how many hits it takes, its antigen class, its entry route and the four stat bars are
design decisions rather than medical claims, and are not here to be reviewed. **One exception:**
each card's "Can infect" line is included, labelled as a game simplification, so that a case
where the simplification is actually wrong can still be caught.

Every claim carries a stable id such as \`DISEASE/Rabies/Treat\`. Quoting the id is enough for a
correction to be found and applied.

---
`);
for (const p of parts) {
  md.push(`\n## ${p.title}\n\n${p.blurb}\n`);
  let subject = '';
  for (const c of p.claims) {
    if (c.subject !== subject) {
      subject = c.subject;
      md.push(`\n### ${subject}\n`);
      md.push('| Claim id | Field | What the app says |');
      md.push('|---|---|---|');
    }
    md.push(`| \`${c.id}\` | ${c.label} | ${c.text.replace(/\|/g, '\\|')} |`);
  }
}
md.push(
  `\n---\n\n*${String(total)} claims: ` +
    parts.map((p) => `${String(p.claims.length)} ${p.key}`).join(', ') +
    '.*\n',
);

writeFileSync(resolve(ROOT, 'docs/MEDICAL_REVIEW.md'), md.join('\n'), 'utf8');
writeFileSync(
  resolve(ROOT, 'docs/medical-review-claims.json'),
  `${JSON.stringify({ generated: today, pack, total, parts }, null, 2)}\n`,
  'utf8',
);
console.log(
  `medical:review — ${String(total)} factual claims ` +
    `(${parts.map((p) => `${p.key} ${String(p.claims.length)}`).join(', ')})`,
);
