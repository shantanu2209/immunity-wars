/**
 * THE MEDICAL REVIEW AS A .docx, so a clinician can work in Word with track changes.
 *
 * Built from `docs/medical-review-claims.json`, which `pnpm medical:review` writes. Run that
 * first; this tool only formats.
 *
 * NO DEPENDENCY, and that is deliberate rather than stubborn. A .docx is a ZIP of XML, and this
 * repository already reads one that way — `tests/equivalence/src/why-boxes.test.ts` carries a
 * hand-written ZIP reader over `node:zlib` to pin the fifteen why boxes to the rulebook. Writing
 * one is the same trick in reverse. The alternative was a new package in a repository that keeps
 * `pnpm audit` clean on purpose and has an open advisory policy (`docs/SECURITY_NOTES.md`), for
 * a tool that formats a table.
 *
 * WHAT THE REVIEWER GETS: one row per claim, with the claim's id, which field it is, what the
 * app says, and an EMPTY "Reviewer notes" column. They can type in the notes column, or edit the
 * text column with track changes on, or ignore both and send an email quoting claim ids. All
 * three work, and the document says so on its first page.
 *
 * Run: pnpm medical:review:docx
 */
import { deflateRawSync, crc32 } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

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
interface Data {
  generated: string;
  pack: Record<string, string>;
  total: number;
  parts: Part[];
}

const data = JSON.parse(
  readFileSync(resolve(ROOT, 'docs/medical-review-claims.json'), 'utf8'),
) as Data;

// ─── A minimal ZIP writer ──────────────────────────────────────────────────────────────────

interface Entry {
  name: string;
  body: Buffer;
}
const u16 = (n: number): Buffer => {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
};
const u32 = (n: number): Buffer => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0);
  return b;
};

/** A stored-nothing, deflate-everything ZIP. Fixed timestamp so the output is reproducible. */
function zip(entries: Entry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const deflated = deflateRawSync(e.body);
    const sum = crc32(e.body);
    const common = Buffer.concat([
      u16(20), // version needed
      u16(0), // flags
      u16(8), // deflate
      u16(0), // mod time
      u16(0x21), // mod date: 1 Jan 1980
      u32(sum),
      u32(deflated.length),
      u32(e.body.length),
      u16(name.length),
    ]);
    const local = Buffer.concat([u32(0x04034b50), common, u16(0), name, deflated]);
    locals.push(local);
    centrals.push(
      Buffer.concat([
        u32(0x02014b50),
        u16(20), // version made by
        common,
        u16(0), // extra length
        u16(0), // comment length
        u16(0), // disk number
        u16(0), // internal attrs
        u32(0), // external attrs
        u32(offset),
        name,
      ]),
    );
    offset += local.length;
  }
  const cd = Buffer.concat(centrals);
  return Buffer.concat([
    Buffer.concat(locals),
    cd,
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(cd.length),
    u32(offset),
    u16(0),
  ]);
}

// ─── WordprocessingML ──────────────────────────────────────────────────────────────────────

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Control characters are not legal in XML and would make Word refuse the file.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** Markdown emphasis is used in the blurbs; Word has no use for the asterisks. */
const plain = (s: string): string => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1');

const run = (text: string, opts: { b?: boolean; i?: boolean; mono?: boolean } = {}): string => {
  const props =
    (opts.b ? '<w:b/>' : '') +
    (opts.i ? '<w:i/>' : '') +
    (opts.mono ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="16"/>' : '');
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
};

const para = (text: string, style?: string, opts?: { b?: boolean; i?: boolean }): string =>
  `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${text ? run(text, opts) : ''}</w:p>`;

const COLS = [1750, 1250, 4360, 2000];
const cell = (inner: string, w: number): string =>
  `<w:tc><w:tcPr><w:tcW w:w="${String(w)}" w:type="dxa"/></w:tcPr>${inner}</w:tc>`;

function table(rows: string[][], header = true): string {
  const grid = COLS.map((w) => `<w:gridCol w:w="${String(w)}"/>`).join('');
  const body = rows
    .map((cells, i) => {
      const isHead = header && i === 0;
      const tcs = cells
        .map((c, j) => {
          const w = COLS[j] ?? 2000;
          const mono = j === 0 && !isHead;
          const p = c ? `<w:p>${run(c, { b: isHead, mono })}</w:p>` : '<w:p/>';
          return cell(p, w);
        })
        .join('');
      const trPr = isHead ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
      return `<w:tr>${trPr}${tcs}</w:tr>`;
    })
    .join('');
  const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((s) => `<w:${s} w:val="single" w:sz="4" w:color="BFBFBF"/>`)
    .join('');
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders>` +
    `<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/>` +
    `<w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr>` +
    `<w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>`
  );
}

const body: string[] = [];

body.push(para('The Immunity Wars — the claims we make, for review', 'Title'));
body.push(
  para(
    `${String(data.total)} claims, generated ${data.generated} from the game's content pack ` +
      `(version ${String(data.pack['packVersion'])}).`,
    undefined,
    { i: true },
  ),
);
body.push(para('What we are asking', 'Heading1'));
body.push(
  para(
    'The Immunity Wars is a cooperative board game that teaches immunology, designed by a ' +
      '13-year-old and now built as an app for schools. Everything in this document is text the ' +
      'app shows to a player. Nobody with medical training has read any of it, and we would ' +
      'rather find out now than after it is in a classroom.',
  ),
);
body.push(
  para('The question is simple: is any of this wrong, or misleading in a way that would matter?'),
);
body.push(
  para('Three things we are NOT asking, because saying so saves you time:', undefined, { b: true }),
);
body.push(
  para(
    '1. Not whether a simplification is incomplete. Every line is compressed for a 13-year-old, ' +
      'and "there is far more to it than this" is expected everywhere.',
  ),
);
body.push(
  para(
    '2. Not whether the game is a faithful model of immunology. It is a board game. Only what ' +
      'it SAYS needs to be true.',
  ),
);
body.push(
  para(
    '3. Not style or reading level. Ours to fix. Some sentences also mention game rules ' +
      '(Action Points, turns, spaces) mixed in with the biology; please ignore those parts.',
  ),
);
body.push(para('Where to start, if you have an hour rather than ten', 'Heading1'));
body.push(
  para(
    'Part 1, and within it the Prevent and Treat lines. Those 212 rows are the only place this ' +
      'app comes close to telling a child what a person should do, and they are the only claims ' +
      'here that could matter outside the game. Everything else can wait.',
  ),
);
body.push(
  para(
    'Four questions worth holding while you read them: is any prevention advice wrong; is any treatment advice wrong or out of date; does anything read as reassuring about a condition that needs a doctor; and is anything regionally wrong for India, which is where this will be played.',
  ),
);
body.push(para('How to mark it up', 'Heading1'));
body.push(
  para(
    'However you like. Type into the Reviewer notes column; or turn on track changes and edit ' +
      'the text itself; or just email us the claim ids. Every row has an id like ' +
      'DISEASE/Rabies/Treat, and quoting it is enough for us to find and fix the exact line.',
  ),
);
body.push(
  para(
    '"I am not sure" is a useful answer. A flagged doubt costs us a look; a wrong claim left in costs us the accuracy of the whole thing. Please flag rather than resolve.',
  ),
);

for (const p of data.parts) {
  body.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);
  body.push(para(plain(p.title), 'Heading1'));
  body.push(para(plain(p.blurb), undefined, { i: true }));
  let subject = '';
  let rows: string[][] = [];
  const flushRows = (): void => {
    if (rows.length > 1) body.push(table(rows));
    rows = [];
  };
  for (const c of p.claims) {
    if (c.subject !== subject) {
      flushRows();
      subject = c.subject;
      body.push(para(subject, 'Heading2'));
      rows = [['Claim id', 'Field', 'What the app says', 'Reviewer notes']];
    }
    rows.push([c.id, c.label, c.text, '']);
  }
  flushRows();
}

// A table may not be the last block in the body: Word requires a paragraph after it.
body.push('<w:p/>');

const sectPr =
  '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>' +
  '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';

const documentXml =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  `<w:body>${body.join('')}${sectPr}</w:body></w:document>`;

const style = (id: string, name: string, size: number, colour: string, bold: boolean): string =>
  `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/>` +
  '<w:basedOn w:val="Normal"/><w:qFormat/>' +
  `<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="${id === 'Title' ? '0' : id === 'Heading1' ? '0' : '1'}"/></w:pPr>` +
  `<w:rPr>${bold ? '<w:b/>' : ''}<w:color w:val="${colour}"/><w:sz w:val="${String(size)}"/></w:rPr></w:style>`;

const stylesXml =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:docDefaults><w:rPrDefault><w:rPr>' +
  '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="20"/>' +
  '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>' +
  '<w:spacing w:after="120" w:line="240" w:lineRule="auto"/>' +
  '</w:pPr></w:pPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
  style('Title', 'Title', 40, '1F3864', true) +
  style('Heading1', 'heading 1', 30, '1F3864', true) +
  style('Heading2', 'heading 2', 24, '2E2A28', true) +
  '</w:styles>';

const contentTypes =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  '</Types>';

const rootRels =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '</Relationships>';

const docRels =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>';

const buf = (s: string): Buffer => Buffer.from(s, 'utf8');
const out = zip([
  { name: '[Content_Types].xml', body: buf(contentTypes) },
  { name: '_rels/.rels', body: buf(rootRels) },
  { name: 'word/document.xml', body: buf(documentXml) },
  { name: 'word/_rels/document.xml.rels', body: buf(docRels) },
  { name: 'word/styles.xml', body: buf(stylesXml) },
]);

const dest = resolve(ROOT, 'docs/Immunity_Wars_Medical_Review.docx');
writeFileSync(dest, out);
console.log(
  `medical:review:docx — ${String(data.total)} claims, ${String(Math.round(out.length / 1024))} KB → docs/Immunity_Wars_Medical_Review.docx`,
);
