/**
 * THE "WHY IT WORKS THIS WAY" BOXES ARE KARTIK'S WORDS, PINNED TO THE RULEBOOK DOCUMENT.
 *
 * Shantanu's condition for the library (8 September 2026): the boxes are content to present,
 * not prose to rewrite, and repunctuating a dash away is the only change allowed. So each box
 * in the content pack's `why.json` must be, word for word, one box of `docs/Immunity_Wars_Rulebook_v3_1.docx`,
 * in the rulebook's order: the document is read here (a .docx is a zip of XML, and the
 * paragraphs opening "WHY IT WORKS THIS WAY" are the boxes) and compared as a sequence of
 * words, punctuation and case set aside. No copy of the rulebook's text exists anywhere to
 * drift from; the document in the repository is the oracle. This lives in the equivalence suite
 * rather than the content package because the content package's test program carries no Node
 * types on purpose, and reading a .docx needs the file system and zlib.
 *
 * Both ways: a changed WORD in a box must fail (fires); a changed PUNCTUATION MARK must not
 * (passes), since that is exactly the change the ruling permits.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { WHY } from '@immunity-wars/content';

const DOCX = fileURLToPath(
  new URL('../../../docs/Immunity_Wars_Rulebook_v3_1.docx', import.meta.url),
);

/** The one entry of a zip archive, by name: end-of-central-directory, central directory,
 *  local header, then stored or deflated bytes. Enough of the format for a .docx. */
function zipEntry(buf: Buffer, wanted: string): Buffer {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not a zip: no end-of-central-directory record');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('not a zip: bad central directory');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (name === wanted) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + compSize);
      return method === 8 ? inflateRawSync(data) : Buffer.from(data);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${wanted} is not in the archive`);
}

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** The runs of one paragraph, read from the capture rather than by stripping tags off a match.
 *  `[^<]*` cannot span a tag, so the captured text carries no markup by construction: there is
 *  nothing left to sanitise, which is the point. A tag-stripping regex here is what CodeQL
 *  rejected on PR #63, in a different file, for the same reason. */
function runTexts(paragraph: string): string[] {
  const re = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  const out: string[] = [];
  for (let m = re.exec(paragraph); m !== null; m = re.exec(paragraph)) out.push(m[1] ?? '');
  return out;
}

/** The rulebook's boxes, in order: every paragraph whose text opens with the box heading. */
function rulebookBoxes(): string[] {
  const xml = zipEntry(readFileSync(DOCX), 'word/document.xml').toString('utf8');
  const paras = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? [];
  const out: string[] = [];
  for (const p of paras) {
    const text = unescapeXml(runTexts(p).join(''));
    const m = /^\s*WHY IT WORKS THIS WAY\s*(.*)$/s.exec(text);
    if (m && m[1]) out.push(m[1].trim());
  }
  return out;
}

/** Words only: case folded, every punctuation mark and dash a separator, apostrophes kept so
 *  "person's" stays one word. This is what the ruling holds constant. */
const words = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, ' ')
    .replace(/(^|\s)'+|'+(\s|$)/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const boxes = rulebookBoxes();

describe("the why boxes are the rulebook's, word for word", () => {
  it('the document yields the boxes, and the pack carries exactly as many, in order', () => {
    expect(boxes.length).toBeGreaterThanOrEqual(10);
    expect(WHY.length).toBe(boxes.length);
  });

  it.each(WHY.map((w, i) => [w.key, i] as const))(
    '%s matches rulebook box %d word for word',
    (_key, i) => {
      expect(words(WHY[i]?.text ?? '')).toBe(words(boxes[i] ?? ''));
    },
  );

  it('no box carries a dash, since none of this is allowed in player text', () => {
    for (const w of WHY) expect(w.text).not.toMatch(/[—–]| - /);
  });

  it('every key is unique and every help section named is one of the ten', () => {
    expect(new Set(WHY.map((w) => w.key)).size).toBe(WHY.length);
    for (const w of WHY) expect(w.help).toMatch(/^s([1-9]|10)$/);
  });

  it('CONTROL fires: a changed word in a box is caught', () => {
    const first = WHY[0]?.text ?? '';
    const changed = first.replace(/\bnot\b/, 'never');
    expect(changed).not.toBe(first);
    expect(words(changed)).not.toBe(words(boxes[0] ?? ''));
  });

  it('CONTROL passes: a changed punctuation mark in a box is not caught', () => {
    const first = WHY[0]?.text ?? '';
    const repunctuated = first.replace(/\./, ';').replace(/,/, ':');
    expect(repunctuated).not.toBe(first);
    expect(words(repunctuated)).toBe(words(boxes[0] ?? ''));
  });

  it('CONTROL of the reader: a paragraph that is not a box is not read as one', () => {
    expect(boxes.every((b) => !b.startsWith('WHY IT WORKS'))).toBe(true);
    expect(boxes.every((b) => b.length > 40)).toBe(true);
  });
});
